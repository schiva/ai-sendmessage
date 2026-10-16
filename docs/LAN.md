# LAN 연결 가이드 (P3)

- 문서 상태: v0.2 (2026-10-16)
- 검증 범위: 한 PC에서 포트를 달리한 데몬 여러 개(`src/test/p3.test.ts`, `src/test/pair.test.ts`)와, 2026-10-16 실제 두 PC(같은 서브넷, 수신 쪽에 방화벽 허용 규칙 있음). 실제 두 PC에서 확인한 것:
  - 링크 up과 양방향 메시지 왕복
  - 토큰 불일치 거부: 한쪽 `peers.json`의 토큰을 잠깐 틀리게 하자 상대의 접속이 거부되고(수신 쪽 로그 `rejected inbound peer ...: bad token`, 접속 간격 1·2·4·8·16·30초, 접속 쪽은 `UNAUTHORIZED`), 복원하자 다시 연결됐다.
  - 지문 불일치 거부: 틀린 지문을 고정한 임시 데몬이 TLS 직후 연결을 끊었고 오류에 상대의 실제 지문이 찍혔다. 토큰은 전송되지 않는다.
  - 오프라인 큐: 링크가 끊긴 동안 보낸 메시지는 `queued_remote`로 쌓였다가 링크가 돌아온 직후 정확히 1번 전달됐다(중복 없음).
  - 쉬는 세션 깨우기(`agentctl wake`)가 양방향으로 동작했다.
  - `agentctl pair`: 데스크톱의 실제 데몬이 코드를 만들고(이미 수신 중인 7420 포트와 기존 방화벽 규칙 사용), 노트북의 별도 임시 데몬(다른 호스트 이름, HOME, 파이프)이 코드를 입력했다. 양쪽이 서로를 등록하고(수신 쪽은 `dial: false`, 기존 피어 항목은 그대로) 링크가 `up`이 됐으며, 메시지가 양방향으로 전달됐다. 같은 코드를 다시 쓰면 `the other PC refused the code`로 거부됐다. 시험 뒤 두 쪽 모두 원래 상태로 되돌렸다.
- 실제 PC에서 확인하지 않은 것: 방화벽 규칙이 없을 때의 동작(`pair`가 막혔을 때의 안내 포함), 코드 만료, 큐 24시간 만료와 `delivery_notice`, 세 대 이상의 구성.

## 1. 동작 방식

- 각 PC의 `agentd`는 `peers.json`에 적힌 PC와만 통신한다. 목록에 없는 호스트는 연결 자체가 거부된다(S-01).
- 링크는 TLS(자체 서명 인증서) 위의 WebSocket이다.
  - **접속하는 쪽**은 상대 인증서의 SHA-256 지문을 `peers.json`의 값과 비교한다. 다르면 토큰을 보내기 전에 끊는다(S-02).
  - **접속받는 쪽**은 공유 토큰과 호스트 이름으로 상대를 인증한다.
- 두 PC가 서로 접속을 시도하면 이름이 사전순으로 작은 호스트가 연 링크 하나만 남긴다.
- 주소는 `이름@호스트`다. 호스트는 그 PC의 컴퓨터 이름(소문자)이다. 예: `reviewer@pc-b`.
- 보낸 메시지는 먼저 송신 PC 디스크의 outbox에 저장되고, 상대가 ack할 때까지 재전송된다(at-least-once). 수신 PC는 메시지 `id`로 중복을 걸러 낸다.
- `send`는 상대가 2초 안에 ack하면 `stored`, 링크가 없거나 늦으면 `queued_remote`를 돌려준다. 상대가 거부하면(없는 에이전트, 이름 모호 등) 그 오류가 그대로 온다. 큐에 들어간 뒤 늦게 거부되면 보낸 에이전트의 inbox에 `delivery_notice` 메시지가 온다.
- 큐 보관 기간은 24시간이다. 넘으면 버리고 알림을 남긴다.
- 상대가 속도 제한이나 가득 찬 inbox(`RATE_LIMITED`)로 잠깐 거부한 메시지는 지워지지 않는다. 2초부터 두 배씩(최대 1분) 다시 보내고, 호출자는 `queued_remote`를 받는다. 8번 거부되면 포기하고 보낸 에이전트에게 알린다. 다른 오류(없는 에이전트, 이름 모호, 너무 큼 등)는 바로 최종이다.
- 수신 포트를 열지 못하면(포트가 사용 중, `listen.host`의 IP가 없음) 데몬은 계속 뜬 채로 15초마다 다시 연다. `agentctl peers`의 `listening` 줄에 오류와 "trying again in Ns"가 보인다. DHCP로 IP가 바뀌었다면 `peers.json`의 `listen.host`를 새 IP로 고치고 `peers reload`한다.
- 다른 PC에는 에이전트의 작업 폴더 전체 경로가 아니라 폴더 이름만 알린다(같은 PC에서는 전체 경로). 전체 경로를 알리려면 환경 변수 `AGENTLINK_SHARE_FULL_CWD=1`.

## 2. 가장 쉬운 방법: `agentctl pair`

두 PC에 AgentLink를 설치한 뒤, 코드 한 줄이면 된다. 지문과 토큰을 손으로 옮기지 않는다. 단, 아래 방화벽 규칙은 직접 만들어야 한다.

### 방화벽 규칙 (수신하는 PC에 필수)

Windows 방화벽은 들어오는 연결을 기본으로 막는다. 상대 PC가 접속해 오는 포트(기본 TCP 7420)를 여는 PC에는 허용 규칙이 있어야 한다. 규칙이 없으면 상대의 접속이 막혀 연결되지 않는다. 이 프로그램은 방화벽 설정을 대신 바꾸지 않는다.

- **어느 PC에 필요한가:** `agentctl pair`에서는 코드를 만든 PC, 수동 설정에서는 `listen`으로 포트를 여는 모든 PC. 접속하는 쪽(`dial: true`)은 나가는 연결이라 규칙이 필요 없다.
- **만들기** (관리자 PowerShell, 포트마다 한 번):
  ```
  New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort 7420 -RemoteAddress <상대 PC의 IP> -Action Allow
  ```
  상대가 여러 대이거나 IP가 바뀌면 `-RemoteAddress LocalSubnet`(같은 서브넷 전체)을 쓴다. `--port`나 `listen.port`로 7420이 아닌 포트를 쓰면 그 포트로 규칙을 만든다.
- **확인하기:** `Get-NetFirewallRule -DisplayName "AgentLink*" | Get-NetFirewallPortFilter`
- **지우기:** `Remove-NetFirewallRule -DisplayName "AgentLink"`
- `agentctl pair`는 이름이 `AgentLink`로 시작하는 규칙이 하나도 없으면 위 명령(`LocalSubnet` 형태)을 출력한다. 규칙의 존재만 보고, 포트와 허용 주소가 맞는지는 검사하지 않는다.
- 상대 IP 하나만 허용한 규칙으로 실제 두 PC 검증을 했다. 규칙이 없을 때의 정확한 증상은 실제 PC에서 확인하지 않았다(예상: 시간 초과나 `ECONNREFUSED`, 문제 해결 표 참고).

### 순서

1. PC-A에서 `agentctl pair`를 실행한다. 코드(`AL1-…`)와 이 PC의 주소가 출력되고, 상대를 기다린다(기본 10분).
2. PC-B에서 `agentctl pair AL1-…`를 실행한다. 몇 초 안에 `Connected to <PC-A>`가 나온다.
3. 끝이다. 두 PC의 `peers.json`이 자동으로 만들어졌고, 에이전트는 `이름@상대호스트`로 서로 보인다.

- 코드에는 PC-A의 주소, 인증서 지문, 1회용 비밀이 들어 있다. PC-B는 코드의 지문으로 PC-A의 인증서를 고정하고(S-02), 비밀을 아는 것을 증명한 뒤에야 등록된다. 링크 토큰은 이 비밀에서 파생되며 비밀 자체는 저장되지 않는다.
- 코드는 한 번만 쓸 수 있다. 시간이 지나거나, 틀린 시도가 5번 쌓이거나, `Ctrl+C`로 취소하면 닫힌다. 그동안만 PC-A의 LAN 포트가 열려 있다.
- 접속은 PC-B가 PC-A로 건다(PC-A 쪽 항목은 `dial: false`). 그래서 PC-A의 방화벽만 열면 된다(위 "방화벽 규칙").
- PC에 IP가 여러 개이면 `--address <IP>`로 상대가 쓸 주소를 고른다. `--port`, `--ttl`도 있다.
- 세 대 이상은 같은 방식으로 한 쌍씩 맺는다(`peers.json`에 항목이 추가된다).
- `peers.json`이 손상된 JSON이면 건드리지 않고 오류를 낸다. 고치거나 지운 뒤 다시 한다.

수동 설정은 아래 3절부터다. 주소를 직접 정하고 싶거나 세밀하게 제어할 때 쓴다.

## 3. 수동 설정 절차 (PC-A와 PC-B)

1. 두 PC에서 이 저장소를 준비하고 `npm install`을 한다.
2. 각 PC에서 `npm run agentctl -- peers`를 실행한다. 데몬이 뜨고 다음이 출력된다.
   - `host:` 이 PC의 호스트 이름(상대 PC의 `peers.json`에 `name`으로 적는 값)
   - `fingerprint:` 이 PC의 인증서 지문(상대 PC의 `peers.json`에 적는 값)
3. 두 PC가 공유할 토큰을 만든다(16자 이상, 한 번만 만들어 양쪽에 같은 값을 쓴다).
   ```
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
4. 각 PC의 `%LOCALAPPDATA%\AgentLink\peers.json`을 만든다. PC-A(192.168.0.11) 예시:
   ```json
   {
     "listen": { "host": "192.168.0.11", "port": 7420 },
     "peers": [
       {
         "name": "pc-b",
         "address": "192.168.0.12",
         "port": 7420,
         "token": "<위에서 만든 토큰>",
         "fingerprint": "sha256:<PC-B의 fingerprint>"
       }
     ]
   }
   ```
   PC-B에는 `listen.host`를 자기 IP로, `name`을 `pc-a`로, `address`를 PC-A의 IP로, `fingerprint`를 PC-A의 값으로 바꿔 만든다.
5. 방화벽에서 수신 포트를 상대 IP에게만 연다(2절의 "방화벽 규칙"과 같다, 관리자 PowerShell). PC-A 예시:
   ```
   New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort 7420 -RemoteAddress 192.168.0.12 -Action Allow
   ```
6. 각 PC에서 `npm run agentctl -- peers reload`를 실행하고, `npm run agentctl -- peers`에서 상대가 `up`인지 확인한다.
7. 시험: PC-A에서 `npm run agentctl -- --as alice register`, PC-B에서 `npm run agentctl -- --as bob register` 후
   `npm run agentctl -- --as alice send bob@pc-b "안녕"`, PC-B에서 `npm run agentctl -- --as bob inbox`.

`peers.json`을 고치면 `peers reload`로 다시 읽는다(데몬 재시작은 필요 없다).

## 4. peers.json 필드

| 필드 | 설명 |
|---|---|
| `listen.host` | 수신 포트를 열 인터페이스 IP. 생략하면 `127.0.0.1`(같은 PC에서만 접속 가능). 다른 PC와 통신하려면 LAN IP를 적는다(S-03). `0.0.0.0`은 피하는 것을 권한다. |
| `listen.port` | 수신 포트(기본 7420). |
| `peers[].name` | 상대 PC의 호스트 이름(대소문자 무시). 자기 자신은 쓸 수 없다. |
| `peers[].address`, `port` | 상대 PC의 IP(또는 이름)와 포트. `dial: false`이면 생략한다. |
| `peers[].token` | 공유 토큰. 16자 이상. |
| `peers[].fingerprint` | 상대 인증서의 SHA-256 지문. 접속하는 쪽에 필수. `dial: false`이면 생략한다. |
| `peers[].dial` | `false`이면 이 PC는 상대에게 접속하지 않고 상대의 접속만 받는다. |

- `peers`가 비어 있으면 수신 포트를 열지 않는다(LAN 비활성화).
- 잘못된 항목은 건너뛰고 이유를 `agentctl peers`와 `agentd.log`에 남긴다.

## 5. 문제 해결

| 증상 | 원인과 조치 |
|---|---|
| `peers`에서 상대가 `down`, 오류가 `certificate fingerprint mismatch` | `peers.json`의 지문이 상대 인증서와 다르다. 상대 PC에서 `peers`로 지문을 다시 확인한다. 인증서를 다시 만들었다면(`%LOCALAPPDATA%\AgentLink\tls` 삭제) 양쪽 지문을 갱신한다. |
| `down`, 오류가 `ECONNREFUSED`/`ETIMEDOUT` | 상대 데몬이 안 떠 있거나, 상대 `listen.host`가 `127.0.0.1`이거나, 방화벽이 막고 있다. |
| `down`, 오류가 `peer refused the connection: UNAUTHORIZED` | 토큰이 다르거나, 상대의 `peers.json`에 이 PC의 호스트 이름이 없다(호스트 이름은 대소문자만 무시하고 정확히 같아야 한다). |
| 데몬이 안 뜬 PC로 보낸 메시지 | `queued_remote`로 보관되고 상대가 돌아오면 전달된다. 상대 PC는 에이전트가 한 번은 떠서 데몬이 기동돼야 한다(D-08). |
| `agentctl peers`의 `listening: no (error: EADDRINUSE …; trying again in Ns)` 또는 `EADDRNOTAVAIL` | 포트를 다른 프로그램이 쓰고 있거나(`EADDRINUSE`) `listen.host`의 IP가 이 PC에 없다(`EADDRNOTAVAIL`, IP가 바뀜). 데몬은 죽지 않고 다시 시도한다. 원인을 없애거나 `peers.json`을 고치고 `peers reload`한다. |
| `UNKNOWN_HOST: host ... is not in peers.json` | 주소의 호스트 이름이 `peers[].name`과 다르다. `agentctl peers`로 목록을 확인한다. |

## 6. 신뢰 경계와 한계

- 인증된 PC는 **그 PC의 어떤 에이전트 이름으로든** 메시지를 보낼 수 있다. 수신 PC는 `from`의 호스트 부분이 인증된 링크의 호스트와 같은지만 검사한다(다른 호스트를 사칭하는 주소는 `FORBIDDEN`). 즉 PC 단위로 신뢰한다. 에이전트 단위 ACL(F-14)은 아직 없다.
- 수신한 메시지는 어댑터가 `trust="untrusted"` 래퍼로 감싼다. 같은 LAN, 같은 사용자라도 메시지는 지시가 아니라 입력이다(S-04, S-05).
- 상대 PC가 idle이 될 때의 알림(`notify_when_idle`)은 같은 PC의 에이전트에만 동작한다.
- mTLS는 쓰지 않는다. 대신 지문 고정(접속하는 쪽 인증)과 토큰(접속받는 쪽 인증)을 쓴다.
- 토큰은 `peers.json`에 평문으로 저장된다. 파일은 사용자 프로필 아래에 있어 같은 사용자만 읽는다.
