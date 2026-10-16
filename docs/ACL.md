# ACL: 누가 누구에게 보낼 수 있는가 (F-14)

- 문서 상태: v1.0 (2026-10-16)
- 구현: `src/agentd/acl.ts`, 테스트: `src/test/p4.test.ts`

## 1. 규칙 파일

각 PC의 데이터 폴더(`%LOCALAPPDATA%\AgentLink`)에 `acl.json`을 둔다. 파일이 없으면 모두 허용한다.

```json
{
  "default": "allow",
  "rules": [
    { "from": "mallory@pc-c", "to": "*",          "action": "deny"  },
    { "from": "alice@pc-a",   "to": "secret@pc-b", "action": "deny"  },
    { "from": "*@pc-a",       "to": "bob@pc-b",    "action": "allow" }
  ]
}
```

- 패턴은 `이름@호스트`다. 이름과 호스트 각각 `*`를 쓸 수 있고, `*` 하나는 모든 에이전트다.
- 이름만 쓰면 `이름@이 PC`로 해석한다. 호스트는 대소문자를 구분하지 않는다.
- **위에서부터 처음 맞는 규칙이 결정한다.** 맞는 규칙이 없으면 `default`(생략하면 `allow`)를 따른다.
- 허용 목록 방식으로 쓰려면 `"default": "deny"`로 두고 `allow` 규칙만 적는다. 아래 "시작 파일 만들기"가 그 초안을 만들어 준다.

## 2. 어디서 검사하는가

| 상황 | 검사 위치 | 거부되면 |
|---|---|---|
| 같은 PC의 에이전트 간 `send` | 이 PC | 보낸 쪽이 `FORBIDDEN` 오류를 받는다. |
| 다른 PC로 `send` | **보내는 PC(미리)** 와 **받는 PC(최종)** | 보내는 PC가 거부하면 메시지는 PC를 떠나지 않는다. 받는 PC가 거부하면 `FORBIDDEN (reported by <host>)`가 돌아온다. 큐에 들어간 뒤 늦게 거부되면 보낸 에이전트의 inbox에 `delivery_notice`가 온다. |
| 다른 PC에서 온 메시지 | 받는 PC | 발신자는 인증된 링크의 호스트와 `from`의 이름으로 판단한다. 송신 PC의 ACL은 신뢰하지 않는다. |
| `notify_when_idle` (같은 PC와 다른 PC) | 같은 방식 | 상태를 엿보는 것도 `보내기`와 같은 권한으로 본다. |

시스템 메시지(idle 알림, 전달 실패 알림)는 ACL을 거치지 않는다. 받는 PC가 텍스트를 직접 만들어 넣기 때문이다.

## 3. 파일이 잘못되었을 때

ACL은 보안 설정이므로 읽을 수 없는 규칙을 조용히 무시하지 않는다.

| 상황 | 동작 |
|---|---|
| 데몬 시작 시 파일이 깨졌거나 규칙에 오류가 있음 | **모든 `send`와 `notify_when_idle`을 막는다**(fail closed). 오류 이유가 거부 메시지에 담긴다. 파일을 고치고 `acl reload`하면 풀린다. |
| `acl reload` 중 파일이 깨짐 | **이전 규칙을 유지**하고 오류를 보고한다. |
| 파일 없음 | 모두 허용. |

규칙 하나가 이해되지 않으면(예: `action`이 `maybe`) 그 규칙이 deny였을 수 있으므로 파일 전체를 쓸 수 없는 것으로 본다.

## 4. 명령

```
npm run agentctl -- acl                         # 현재 규칙과 오류 보기
npm run agentctl -- acl reload                  # acl.json 다시 읽기
npm run agentctl -- acl check alice@pc-a bob@pc-b   # 허용 여부와 근거 규칙 확인(허용이면 종료 코드 0, 거부면 1)
```

### 시작 파일 만들기: `acl init`

`acl.json`이 없으면 모두 허용이다. PC가 둘이면 괜찮지만 셋 이상이거나 PC마다 쓰는 사람이 다르면 느슨하다. 기본을 거부로 바꾼 초안을 만들려면:

```
agentctl acl init --print   # 만들 내용만 보기(아무것도 쓰지 않음)
agentctl acl init           # acl.json을 쓰고 바로 다시 읽기
agentctl acl init --force   # 이미 있는 acl.json을 바꾸기(옛 파일은 acl.json.bak으로 남는다)
```

`peers.json`에 있는 호스트가 `pc-b`이고 이 PC가 `pc-a`라면 만들어지는 파일은 다음과 같다.

```json
{
  "default": "deny",
  "rules": [
    { "from": "*@pc-a", "to": "*@pc-a", "action": "allow" },
    { "from": "*@pc-b", "to": "*@pc-a", "action": "allow" },
    { "from": "*@pc-a", "to": "*@pc-b", "action": "allow" }
  ]
}
```

- 이 PC의 에이전트끼리, 그리고 `peers.json`의 각 호스트와 양방향만 허용한다. 목록에 없는 호스트와 두 피어 사이는 거부한다.
- **나중에 `agentctl pair`로 PC를 더하면 그 PC는 규칙이 없어서 거부된다.** `acl init --force`를 다시 실행하거나 규칙을 직접 더하고 `acl reload`한다.
- 이미 있는 `acl.json`은 `--force` 없이는 바꾸지 않는다.
- 이 초안은 사람 단위나 에이전트 이름 단위로 나누지 않는다. 더 좁히려면 `*` 대신 이름을 쓴다.

## 5. 한계

- ACL은 **누가 보낼 수 있는지**만 정한다. 받은 메시지의 내용은 여전히 신뢰할 수 없는 입력이다(S-04, S-05).
- 같은 PC에서는 같은 사용자의 모든 프로세스를 신뢰한다. 에이전트 이름은 등록할 때 정하는 것이어서, 같은 PC의 다른 프로세스가 같은 이름으로 등록해 규칙을 우회할 수 있다. ACL은 PC 사이와 의도하지 않은 전송을 막는 용도이며, 같은 사용자의 악의적인 프로세스를 막는 장치가 아니다.
- 다른 PC의 에이전트 이름은 그 PC가 주장하는 값이다. PC 단위 신뢰가 먼저고, ACL은 그 위의 세분화다.
