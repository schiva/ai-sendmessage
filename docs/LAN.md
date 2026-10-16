# LAN 연결 가이드 (P3)

- 문서 상태: v0.1 (2026-10-16)
- 검증 범위: **한 PC에서 포트를 달리한 데몬 여러 개**로 검증했다(`src/test/p3.test.ts`). 실제 두 번째 PC와 Windows 방화벽을 거친 검증은 아직 하지 않았다. 아래 절차는 그 검증의 출발점이다.

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

## 2. 설정 절차 (PC-A와 PC-B)

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
5. 방화벽에서 수신 포트를 상대 IP에게만 연다(관리자 PowerShell). PC-A 예시:
   ```
   New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort 7420 -RemoteAddress 192.168.0.12 -Action Allow
   ```
6. 각 PC에서 `npm run agentctl -- peers reload`를 실행하고, `npm run agentctl -- peers`에서 상대가 `up`인지 확인한다.
7. 시험: PC-A에서 `npm run agentctl -- --as alice register`, PC-B에서 `npm run agentctl -- --as bob register` 후
   `npm run agentctl -- --as alice send bob@pc-b "안녕"`, PC-B에서 `npm run agentctl -- --as bob inbox`.

`peers.json`을 고치면 `peers reload`로 다시 읽는다(데몬 재시작은 필요 없다).

## 3. peers.json 필드

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

## 4. 문제 해결

| 증상 | 원인과 조치 |
|---|---|
| `peers`에서 상대가 `down`, 오류가 `certificate fingerprint mismatch` | `peers.json`의 지문이 상대 인증서와 다르다. 상대 PC에서 `peers`로 지문을 다시 확인한다. 인증서를 다시 만들었다면(`%LOCALAPPDATA%\AgentLink\tls` 삭제) 양쪽 지문을 갱신한다. |
| `down`, 오류가 `ECONNREFUSED`/`ETIMEDOUT` | 상대 데몬이 안 떠 있거나, 상대 `listen.host`가 `127.0.0.1`이거나, 방화벽이 막고 있다. |
| `down`, 오류가 `peer refused the connection: UNAUTHORIZED` | 토큰이 다르거나, 상대의 `peers.json`에 이 PC의 호스트 이름이 없다(호스트 이름은 대소문자만 무시하고 정확히 같아야 한다). |
| 데몬이 안 뜬 PC로 보낸 메시지 | `queued_remote`로 보관되고 상대가 돌아오면 전달된다. 상대 PC는 에이전트가 한 번은 떠서 데몬이 기동돼야 한다(D-08). |
| `UNKNOWN_HOST: host ... is not in peers.json` | 주소의 호스트 이름이 `peers[].name`과 다르다. `agentctl peers`로 목록을 확인한다. |

## 5. 신뢰 경계와 한계

- 인증된 PC는 **그 PC의 어떤 에이전트 이름으로든** 메시지를 보낼 수 있다. 수신 PC는 `from`의 호스트 부분이 인증된 링크의 호스트와 같은지만 검사한다(다른 호스트를 사칭하는 주소는 `FORBIDDEN`). 즉 PC 단위로 신뢰한다. 에이전트 단위 ACL(F-14)은 아직 없다.
- 수신한 메시지는 어댑터가 `trust="untrusted"` 래퍼로 감싼다. 같은 LAN, 같은 사용자라도 메시지는 지시가 아니라 입력이다(S-04, S-05).
- 상대 PC가 idle이 될 때의 알림(`notify_when_idle`)은 같은 PC의 에이전트에만 동작한다.
- mTLS는 쓰지 않는다. 대신 지문 고정(접속하는 쪽 인증)과 토큰(접속받는 쪽 인증)을 쓴다.
- 토큰은 `peers.json`에 평문으로 저장된다. 파일은 사용자 프로필 아래에 있어 같은 사용자만 읽는다.
