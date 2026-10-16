# RFP: AgentLink — 에이전트 중립 메시징 프레임워크 (같은 PC + LAN)

- 문서 상태: 초안 (v0.2)
- 작성일: 2026-10-16
- 변경 이력: v0.1(2026-10-16)은 Claude Code 채널과 inbox 파이프에 의존하는 설계였다. v0.2는 Claude 전용 설계를 폐기하고 에이전트 중립 프레임워크로 바꾼다(12.1의 D-06 참고).

## 1. 목적

1. 같은 PC와 같은 LAN의 다른 PC에서 실행되는 AI 에이전트들이 서로 메시지를 주고받는 독립 프레임워크를 만든다.
2. 통신 의미는 Claude Code의 `SendMessage`/`ListAgents`를 참고한다. 이름 주소, 답장, 큐 적재, 전달 확인, 상태 조회, idle 알림이 그 요소다.
3. Claude Code는 어댑터 중 하나로 지원한다. 다른 에이전트(Codex CLI, Gemini CLI 등 MCP나 셸을 쓸 수 있는 에이전트, SDK로 만든 자체 에이전트)도 같은 프레임워크에 붙일 수 있어야 한다.
4. Claude Code의 비공개 내부 프로토콜(inbox 파이프 프레임 등)이나 연구 프리뷰 기능에 의존하지 않는다.

## 2. 설계 원칙

| 원칙 | 내용 |
|---|---|
| 코어는 에이전트를 모른다 | 코어는 "이름이 있고 메시지를 받을 수 있는 참여자"만 안다. 에이전트별 차이는 어댑터가 흡수한다. |
| 저장 후 전달 | 모든 메시지는 수신자의 영속 inbox에 먼저 적재된다. 수신자가 꺼져 있어도 유실되지 않는다. |
| 당기기(pull)가 기본, 밀기(push)는 선택 | 모든 에이전트가 쓸 수 있는 공통분모는 "도구 호출로 inbox 읽기"다. 주입(push)이 가능한 에이전트만 어댑터가 추가로 지원한다. |
| 메시지는 권한이 아니다 | 수신 메시지는 항상 신뢰할 수 없는 입력이다. 메시지가 권한 승인이나 설정 변경의 근거가 될 수 없다. |
| 평문 중심 | 본문은 UTF-8 평문이다. 파일과 바이너리는 범위 밖이다. |

## 3. 범위

### 3.1 범위 안
- 머신당 1개의 데몬 `agentd`(레지스트리, inbox, 라우터, 피어 연결)
- 로컬 에이전트용 API(명명된 파이프)와 CLI `agentctl`
- 어댑터: MCP 서버, Claude Code(hooks), CLI, HTTP/WebSocket API
- LAN 피어 연결(TLS, 정적 `peers.json`, 최대 5대)
- 인증, 허용 목록, ACL, 감사 로그

### 3.2 범위 밖
- 인터넷 경유 통신(NAT 통과, 릴레이 서버)
- WSL, Linux, macOS 지원(D-01)
- 파일, 이미지, 명령 실행 전달
- Claude Code 내장 `SendMessage`의 수정이나 가로채기. 내장 기능과 공존하며, 내장은 같은 PC 내 Claude 세션 간 용도로 계속 쓸 수 있다.

## 4. 시스템 구성

```
PC-A                                              PC-B
┌───────────────────────────────────┐             ┌───────────────────────────────────┐
│ Claude 세션 ─ [Claude 어댑터]──┐  │             │  ┌──[MCP 어댑터]─ Codex CLI       │
│ Gemini CLI ─ [MCP 어댑터]──────┤  │             │  ├──[CLI 어댑터]─ 임의 에이전트   │
│ 자체 에이전트 ─ [HTTP/SDK]─────┤  │             │  └──[HTTP/SDK]── 자체 에이전트    │
│                  명명된 파이프  │  │             │       명명된 파이프               │
│            ┌─────────▼────────┐ │  TLS+토큰    │  ┌────────▼─────────┐              │
│            │      agentd      │◄┼──────────────┼─►│      agentd      │              │
│            │ 레지스트리·inbox │ │  WebSocket   │  │ 레지스트리·inbox │              │
│            │ 라우터·피어링    │ │  :7420       │  │ 라우터·피어링    │              │
│            └──────────────────┘ │             │  └──────────────────┘              │
└───────────────────────────────────┘             └───────────────────────────────────┘
```

### 4.1 agentd (머신당 1개)
- 레지스트리: 로컬 에이전트의 이름, 종류(kind), 작업 디렉터리, 상태(busy/idle), 마지막 활동 시각
- inbox 저장소: 에이전트별 영속 큐(SQLite). 적재, 열람, 확인(ack) 상태를 가진다.
- 라우터: 수신자가 로컬이면 inbox에 적재하고, 다른 PC이면 해당 피어 링크로 전달한다.
- 피어링: 정적 목록의 다른 agentd와 TLS WebSocket으로 연결한다. 최대 5대이므로 전체 연결(최대 10개 링크)이다.
- 정책: 허용 목록, 에이전트 간 ACL, 속도 제한, 루프 방지, 감사 로그
- 로컬 API는 Windows 명명된 파이프로 연다(D-04). LAN 포트(기본 7420)는 agentd만 연다.

### 4.2 어댑터 계층
어댑터는 에이전트가 코어의 로컬 API를 쓰도록 이어 주는 얇은 층이다. 코어에는 에이전트별 코드가 없다.

| 어댑터 | 대상 | 수신 방식 | 비고 |
|---|---|---|---|
| MCP 어댑터(`agentd-mcp`) | MCP를 지원하는 모든 에이전트(Claude Code 포함) | pull: `read_inbox` 도구 | 가장 범용적인 기본 어댑터. 도구는 `send_message`, `list_agents`, `read_inbox`, `ack`. |
| Claude Code 어댑터 | Claude Code | pull + 준-push | MCP 어댑터에 hooks를 더한다. SessionStart에서 등록하고, UserPromptSubmit/PostToolUse에서 미확인 메시지를 컨텍스트에 주입한다. Stop hook으로 idle일 때 새 메시지가 있으면 대화를 이어 간다. |
| CLI 어댑터(`agentctl`) | 셸을 쓸 수 있는 모든 에이전트와 사람 | pull | `agentctl send/list/inbox/ack`. |
| HTTP/SDK 어댑터 | 프로그램으로 만든 에이전트 | push(스트림) | 로컬 API를 WebSocket/스트림으로 감싼다. |
| (선택) 채널 어댑터 | 채널이 허용된 Claude Code 환경 | push | P0 코드를 재사용한다. 현재 계정에서는 막혀 있어 기본 경로가 아니다. |
| (선택) PTY 래퍼 | hooks와 MCP가 없는 CLI 에이전트 | push | 에이전트를 가상 터미널로 감싸 idle일 때 입력을 주입한다. 취약하므로 후순위. |

## 5. 주소와 의미 체계 (SendMessage 대응)

| SendMessage 개념 | AgentLink 대응 |
|---|---|
| `to`: 이름 | `name`(로컬) 또는 `name@host`(원격). 같은 이름이 둘 이상이면 `name@host [ref]`로 구분한다. |
| `ListAgents` | `list_agents`: 에이전트, kind, 상태, 호스트, 작업 디렉터리 |
| `message`, `summary` | `message`(첫 줄은 한 줄 요약), `summary`(발신자 기록용, 전송하지 않음) |
| 답장은 `from`을 `to`에 복사 | 수신 메시지의 `from`(`name@host`)을 그대로 `to`에 쓴다. |
| 큐 적재, 다음 도구 라운드에 수신 | inbox 적재. 수신자가 `read_inbox`를 부르거나, 어댑터가 hooks로 주입할 때 전달된다. |
| 성공 = 세션에 도달 | ack = inbox 적재 완료. 읽었음이나 동의를 뜻하지 않는다. |
| `notify_when_idle` | `notify_when_idle`: 상대 에이전트가 idle이 될 때 1회 알림(어댑터가 상태를 보고하는 경우) |
| 전체 방송 없음 | 1차 범위에서 방송은 제공하지 않는다. |

## 6. 메시지 프로토콜

```json
{ "v": 1, "id": "uuid", "from": "a@pc-a", "to": "b@pc-b",
  "kind": "message", "summary": "…", "message": "첫 줄은 한 줄 요약",
  "ts": 1760000000, "ttl": 3, "reply_to": "uuid|null" }
```

- `kind`: `message`, `ack`, `idle_notice`
- 피어 간 전송: TLS WebSocket. 수신 agentd가 inbox 적재 후 `ack{id}`를 돌려준다.
- 신뢰성: at-least-once, 수신 측 `id` 중복 제거, 송신 측 오프라인 큐(TTL).
- 수신자에게 전달될 때는 출처가 드러나는 래퍼로 감싼다.
  ```
  <agentlink-message from="b@pc-b" id="…" trust="untrusted">
  …본문…
  </agentlink-message>
  ```
- 로컬 API: 파이프 위의 JSON Lines 요청/응답. 메서드는 `register`, `heartbeat`(상태), `send`, `list`, `inbox`(읽기, 스트림 포함), `ack`, `subscribe_idle`이다.

## 7. 기능 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| F-01 | 에이전트가 이름으로 등록하고 상태(busy/idle)를 갱신할 수 있다. | 필수 |
| F-02 | `name` 또는 `name@host`로 메시지를 보낼 수 있다. 중복 이름은 `[ref]`로 구분한다. | 필수 |
| F-03 | 메시지는 수신자의 영속 inbox에 적재되고, 수신자가 꺼져 있어도 보관된다. | 필수 |
| F-04 | `list_agents`가 로컬과 원격 에이전트 목록과 상태를 반환한다. | 필수 |
| F-05 | ack는 inbox 적재를 뜻하며 읽음이 아니다. 읽음/확인 상태는 별도로 조회할 수 있다. | 필수 |
| F-06 | 상대 PC가 오프라인이면 송신 측 큐에 TTL을 두고 보관한 뒤 재연결 시 전달한다. | 필수 |
| F-07 | `id` 중복 제거와 `ttl` 홉 제한으로 루프를 막는다. | 필수 |
| F-08 | 크기 상한과 발신자별 속도 제한을 둔다. | 필수 |
| F-09 | 본문의 `@경로`나 `@server:resource`를 첨부로 처리하지 않고 문자 그대로 전달한다. | 필수 |
| F-10 | MCP 어댑터가 `send_message`, `list_agents`, `read_inbox`, `ack`를 제공한다. | 필수 |
| F-11 | Claude Code 어댑터가 hooks로 등록, 주입, idle 시 이어 가기를 지원한다. | 필수 |
| F-12 | 코어 변경 없이 새 어댑터를 추가할 수 있다. 로컬 API 문서와 어댑터 예제를 제공한다. | 필수 |
| F-13 | 상대가 idle이 될 때 1회 알림을 받는다(`notify_when_idle`). | 선택 |
| F-14 | 에이전트 간 ACL(누가 누구에게 보낼 수 있는가)을 설정할 수 있다. | 선택 |
| F-15 | mDNS 자동 피어 탐색. | 보류(D-03) |

## 8. 보안 요구사항

LAN에서 오는 텍스트는 곧 프롬프트이므로, 열린 포트와 inbox는 프롬프트 인젝션 경로가 된다.

| ID | 요구사항 |
|---|---|
| S-01 | 허용된 호스트와 발신자만 수신한다. 허용 목록이 비어 있으면 모두 거부한다. |
| S-02 | 호스트 쌍마다 사전 공유 토큰으로 인증하고, 가능하면 mTLS를 적용한다. |
| S-03 | `0.0.0.0`이 아니라 지정한 LAN 인터페이스에만 바인딩한다. 방화벽은 피어 IP만 허용한다. |
| S-04 | 메시지는 권한 승인이나 설정 변경의 근거가 될 수 없다. 거부된 작업을 피어에게 대신 시키는 요청(권한 우회)을 금지한다. 어댑터 지침에 이를 명시한다. |
| S-05 | 수신 메시지는 출처 래퍼로 감싸 `trust="untrusted"`로 표시한다. |
| S-06 | 로컬 파이프는 ACL로 현재 사용자만 접근하게 한다. |
| S-07 | 전달, 거부, 인증 실패, 정책 위반을 감사 로그로 남긴다. |
| S-08 | inbox와 로그에는 비밀 값(토큰)을 기록하지 않는다. |

## 9. 제약과 위험

| 항목 | 내용 | 대응 |
|---|---|---|
| 에이전트별 push 불가 | 대부분의 에이전트는 외부 입력을 세션에 직접 주입받지 못한다. | pull을 기본으로 하고, 어댑터가 가능한 만큼 push를 흉내 낸다. 전달 시점은 에이전트가 도구를 호출하거나 hook이 실행될 때다. |
| 에이전트가 inbox를 읽지 않음 | pull만으로는 에이전트가 새 메시지를 모를 수 있다. | 어댑터 지침과 hooks 주입으로 새 메시지 알림을 보강한다. 미확인 개수를 `list_agents`에도 보인다. |
| hooks 의존 | Claude Code hooks의 동작과 스키마가 바뀔 수 있다. | Claude 어댑터를 한 모듈에 격리하고, MCP 경로를 항상 폴백으로 유지한다. |
| 연구 프리뷰 채널 | 이 계정에서 `blocked by org policy`(docs/P0.md). | 채널은 선택 어댑터로만 둔다. |
| 데몬 수명 | 데몬이 꺼지면 로컬 통신이 멈춘다. | 첫 클라이언트가 필요 시 데몬을 띄우는 방식을 우선 검토한다(12.2). |
| 신뢰 경계 | 같은 PC 사용자 권한이면 누구나 파이프에 접근한다. | 파이프 ACL, 에이전트별 등록 토큰, 감사 로그. |

## 10. 기술 스택 (제안)

- TypeScript/Node.js 22 이상(Windows 11 네이티브)
- 영속 저장: `node:sqlite` 또는 SQLite 바인딩, 대안은 JSONL
- 로컬 API: 명명된 파이프 + JSON Lines
- 피어 링크: `ws`(TLS), 인증서는 자체 서명 + 지문 고정
- MCP 어댑터: `@modelcontextprotocol/sdk`

## 11. 단계별 계획

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| P0 | (종료) Claude 채널 주입 스파이크 | 서버 쪽 통과, 세션 주입은 계정 정책으로 차단. 선택 어댑터로 보존 |
| P1 | agentd 코어(레지스트리, inbox, 라우팅, 로컬 API)와 `agentctl` | 셸 두 개가 에이전트처럼 등록하고 메시지를 주고받는다. 재시작 후에도 inbox가 보존된다. **완료(2026-10-16)** |
| P2 | MCP 어댑터와 Claude Code 어댑터(hooks) | 같은 PC의 Claude 세션 두 개가 AgentLink로 왕복한다. 채널이나 내부 프로토콜 없이 동작한다. **완료(2026-10-16)**: 테스트 38개 통과, 실제 `claude -p` 세션 종단 테스트 통과(Claude→agent 전송, 작업 중 도착한 메시지의 PostToolUse 주입). Claude 세션 둘의 직접 왕복은 아래 12.2 참고. |
| P3 | LAN 피어링(TLS, `peers.json`, 인증, 오프라인 큐, 중복 제거) | 두 PC의 에이전트가 왕복하고, 오프라인이던 피어가 복귀하면 중복 없이 한 번 전달된다. **구현 완료(2026-10-16), 한 PC의 다중 데몬으로 검증**(테스트 16개). 실제 두 번째 PC와 방화벽을 거친 검증은 대기 중(12.2 참고). |
| P4 | 두 번째 에이전트 종류 연동(F-12 증명), idle 알림, ACL | Claude와 비(非)Claude 에이전트가 서로 메시지를 주고받는다. **구현 완료(2026-10-16)**: ACL(F-14), 다른 PC에 대한 idle 알림(F-13), SDK와 에코 에이전트(F-12). 테스트 70개와 실제 Claude 세션 종단 테스트 3개 시나리오 통과. 외부 AI 도구(Codex CLI, Gemini CLI 등)와의 실제 연동은 대기 중(12.2). |
| P5 | 5대 구성 점검, 감사 로그, 운영 문서, (선택) PTY 래퍼 | 5대 전체 연결에서 안정 동작한다. |

## 12. 결정 사항과 미결 사항

### 12.1 확정
- D-01 (2026-10-16): 대상 PC는 최대 5대, OS는 전부 Windows 11(네이티브)이다. WSL, Linux, macOS는 지원하지 않는다.
  - 영향: 로컬 IPC는 명명된 파이프. 최대 5대이므로 전체 연결(최대 10개 링크)이 가능하다.
- D-02 (2026-10-16): 사용자는 모든 PC가 같은 개인 claude.ai 계정이라고 답했으나, 실제 세션에서 조직 정책으로 채널이 막혔다(docs/P0.md). 계정 유형은 새 설계에서 필수 전제가 아니다.
  - 영향: 코어와 MCP/CLI 어댑터는 계정 유형과 무관하게 동작한다. 선택 어댑터(채널)만 계정 조건을 탄다.
- D-03 (2026-10-16): 피어 탐색은 정적 `peers.json`(이름, IP, 토큰)으로 한다. mDNS는 1차 범위에서 제외한다.
  - 영향: 피어 PC는 고정 IP 또는 DHCP 예약이 필요하다.
- D-04 (2026-10-16): 같은 PC 안의 로컬 통신(에이전트와 agentd 사이)은 Windows 명명된 파이프로 한다.
  - 영향: 로컬에서 네트워크 포트를 열지 않고, 파이프 ACL로 현재 사용자만 접근하게 한다.
- D-05 (2026-10-16, 폐기): 채널 대신 Claude의 inbox 파이프에 직접 쓰는 방안은 폐기한다. 인증 이후 프레임 형식이 비공개이고, LAN 텍스트가 자기 자식 프로세스 메시지로 취급되어 높은 신뢰로 전달될 수 있기 때문이다.
- D-06 (2026-10-16): 이 프로젝트는 Claude 전용 확장이 아니라 에이전트 중립 메시징 프레임워크다. SendMessage는 의미 체계의 참고 대상이며, Claude Code는 어댑터 중 하나다. 이후 다른 AI 에이전트가 같은 코어에 붙을 수 있어야 한다.
  - 영향: 코어(agentd)와 어댑터를 분리하고, 기본 수신 방식은 pull로 한다.

- D-07 (2026-10-16): 첫 구현은 Claude CLI로 구동되는 에이전트에 집중한다. 두 번째 에이전트 종류는 정하지 않았고 P4 시작 전에 정한다.
  - 영향: P1~P3의 검증은 Claude Code 세션 기준으로 한다. 코어는 에이전트 중립 구조를 유지하고, 중립성은 P1에서 일반 MCP 클라이언트와 CLI 스크립트로 계속 확인한다(F-12).

- D-08 (2026-10-16): agentd는 필요 시 자동 기동한다. 에이전트나 `agentctl`이 처음 접속할 때 데몬이 없으면 백그라운드로 띄운다. 설치나 Windows 시작 항목은 두지 않는다.
  - 영향: 다른 PC의 메시지를 받으려면 그 PC에서 에이전트가 한 번은 떠 있어야 한다. 데몬이 없는 동안 오는 메시지는 송신 측 큐(F-06)에 TTL로 보관된다. 중복 기동을 막기 위해 파이프 이름과 단일 인스턴스 잠금을 쓴다.

- D-09 (2026-10-16): Claude CLI 수신 강도는 "MCP 도구 + 어댑터 지침 + hooks 주입"까지로 한다. PTY 래퍼는 1차 범위에서 제외한다(P5 선택 항목으로만 남긴다).
  - 영향: 세션이 idle이고 Stop hook이 이미 지나간 뒤 도착한 메시지는, 사용자가 입력하거나 다른 이벤트가 있을 때까지 전달되지 않는다. 이 한계를 문서화하고 `list_agents`의 미확인 개수로 드러낸다.

- D-10 (2026-10-16): 로컬 API를 [docs/LOCAL-API.md](LOCAL-API.md) v1.0으로 확정했다. P1 구현에서 파이프 ACL 대신 토큰 인증을 쓰기로 했고(S-06 보완), 세부 변경은 같은 문서 7절에 있다.
  - 상태: P1(agentd 코어, `agentctl`, 자동 기동) 구현과 테스트 20개 통과. 같은 PC에서 셸 두 개가 에이전트로 등록해 왕복하고 재시작 후에도 inbox가 보존됨을 확인했다.

- D-11 (2026-10-16): Claude 세션 식별은 `CLAUDE_CODE_SESSION_ID`로 한다. 스파이크(`claude -p`)에서 hook과 MCP 서버가 같은 값을 받음을 확인했다. 에이전트 `key`는 `claude:<세션ID>`이고, 이름은 `AGENTLINK_NAME` 또는 `<폴더명>-<세션ID 앞 4자>`다. PID 기반 식별은 쓰지 않는다. 자세한 내용은 [docs/P2-SPIKE.md](P2-SPIKE.md).
  - 영향: 어댑터는 `CLAUDE_CODE_MESSAGING_TOKEN`을 읽지 않는다. MCP 서버도 이 값을 상속하지만 사용하지 않는다(D-05).

- D-12 (2026-10-16): P2 구현 결과. 어댑터는 `src/adapters/`(common, mcp, claude)에 있다.
  - MCP 어댑터: `send_message`, `list_agents`, `read_inbox`, `ack_messages`. 세션을 자동 등록하고 임대를 하트비트로 유지하며, 데몬이 재시작되면 다시 등록한다.
  - Claude hooks 어댑터: SessionStart(등록과 안내), UserPromptSubmit(busy 표시와 메시지 주입), PostToolUse(작업 중 도착한 메시지 주입), Stop(대기 메시지가 있으면 이어 가기, 연속 5회 상한 후 idle), SessionEnd(등록 해제). 주입한 메시지는 즉시 ack한다.
  - 모든 수신 메시지는 `<agentlink-message … trust="untrusted">` 래퍼로 감싸고, 본문이 래퍼를 닫거나 속성을 위조하지 못하게 막는다(S-04, S-05).
  - hook은 어떤 실패에도 exit 0으로 끝나 세션을 깨지 않는다. 설정은 `npm run claude:config`로 출력한다.
  - 구현 중 발견한 데몬 버그: 같은 `key`로 재등록하면 busy 상태가 idle로 초기화됐다(hook은 매번 `register`를 부른다). 살아 있는 에이전트의 상태를 유지하도록 고쳤고 회귀 테스트를 추가했다.

- D-13 (2026-10-16): 대화형 Claude 세션 종단 검증을 마쳤다(`npm run e2e:interactive`, 가상 터미널로 `claude` TUI 두 개를 동시에 구동, 모델 호출 비용 약 0.5달러 안팎). 확인된 사항:
  - 두 세션이 SessionStart hook으로 등록되고, 작업 중인 세션은 busy로 표시된다.
  - ann이 MCP 도구로 보낸 메시지가 ben의 PostToolUse hook으로 주입되고, ben이 MCP 도구로 ann에게 답한다(양방향 왕복).
  - 쉬고 있는 세션에는 메시지가 밀려 들어오지 않고 inbox에 대기하며(D-09 한계 확인), 다음 프롬프트에서 UserPromptSubmit hook이 모아서 주입한다.
  - `/exit`로 SessionEnd hook이 동작해 오프라인이 되고, 그동안 온 메시지는 보관된다. `--resume`으로 같은 세션 ID, 같은 에이전트(같은 ref), 같은 inbox가 복원되어 보관된 메시지가 전달된다.
  - 이 검증은 조직(Team) 계정에서 수행했고, 채널 없이 동작한다.

- D-14 (2026-10-16): P3의 LAN 통신은 한 PC에서 포트와 데이터 폴더, 호스트 이름이 다른 데몬 여러 개로 먼저 검증하기로 했다. 구현과 결과는 [docs/LAN.md](LAN.md)와 `src/test/p3.test.ts`에 있다.
  - 구현: 링크는 TLS WebSocket(자체 서명 인증서). 접속하는 쪽은 인증서 지문을 고정하고(S-02), 접속받는 쪽은 `peers.json` 허용 목록과 공유 토큰으로 인증한다(S-01, S-02). 수신 포트는 `peers.json`에 피어가 있을 때만 열고 기본은 `127.0.0.1`이다(S-03).
  - 검증된 것: 링크 형성과 단일 링크 유지, 원격 에이전트 목록, 양방향 메시지와 답장, 원격 오류 전달(`UNKNOWN_AGENT`, `AMBIGUOUS_NAME`, `TOO_LARGE`), 미등록 호스트와 틀린 토큰과 남의 토큰 거부, 다른 호스트 사칭 거부(`FORBIDDEN`), 잘못된 프레임 처리, 재전송 중복 제거(F-07), 피어별 속도 제한(F-08), 인증서 지문 불일치 거부, 상대 다운 중 큐 적재와 복귀 후 정확히 한 번 전달(F-06), 큐가 송신 PC 재시작 후에도 유지됨, 큐 처리 중 늦게 거부된 메시지의 `delivery_notice`.
  - 구현 방식이 RFP 초안과 달라진 점: 주소의 호스트는 컴퓨터 이름이고, 인증은 mTLS 대신 지문 고정과 토큰이다. 인증된 PC는 그 PC의 어떤 에이전트 이름으로도 보낼 수 있다(PC 단위 신뢰, F-14는 아직 없음).

- D-15 (2026-10-16): P4 구현 결과.
  - **ACL(F-14)**: `acl.json`의 `name@host` 규칙(첫 일치 우선, `*` 와일드카드, 기본값 설정). 보내는 PC와 받는 PC 양쪽에서 검사하고(받는 PC가 최종), `notify_when_idle`도 같은 권한으로 본다. 시작 시 파일이 깨졌으면 모두 막고(fail closed), 재로드 중 깨지면 이전 규칙을 유지한다. 자세한 내용은 [docs/ACL.md](ACL.md).
  - **원격 idle 알림(F-13)**: `notify_when_idle`에 `name@host`를 쓸 수 있다. `watch`/`notice` 프레임으로 구현했고 outbox로 보관되며, 알림 문구는 받는 PC가 직접 만들고 요청자와 대상의 주소가 링크의 호스트에 속하는지 검사한다(S-05).
  - **SDK와 참조 에이전트(F-12)**: `src/sdk/agentlink.ts`는 등록, 하트비트, push 수신, ack, busy/idle 보고, 재접속을 처리하고, `src/agents/echo-agent.ts`는 AI 도구가 아닌 에이전트의 예다. 코어 변경 없이 새 종류의 에이전트가 붙는다는 것을 한 PC의 다중 데몬 환경에서 SDK 에이전트, MCP 어댑터 에이전트, 일반 클라이언트가 서로 주고받는 테스트로, 그리고 실제 Claude 세션이 SDK 에이전트와 주고받는 종단 테스트로 확인했다. 자세한 내용은 [docs/SDK.md](SDK.md).
  - **구현 중 고친 데몬 버그**: `shutdown` 핸들러가 LAN 초기화(TLS와 peers) 뒤에 등록되어, 시작 직후(부하가 높을 때) 보낸 종료 요청이 무시되었다. 핸들러를 파이프 바인딩 직후로 옮기고, 종료 시 파이프를 먼저 닫으며, 2초 안에 프로세스가 끝나도록 워치독을 넣었다. 회귀 테스트를 추가했다(전체 테스트를 12회 반복해 실패 0 확인).

- D-16 (2026-10-16): Claude Code 어댑터를 **플러그인**으로 포장했다(`plugin/agentlink/`, 마켓플레이스 `.claude-plugin/marketplace.json`). 자세한 내용은 [docs/PLUGIN.md](PLUGIN.md).
  - 구성: hooks 5개(exec 형식, `${CLAUDE_PLUGIN_ROOT}`), MCP 서버 `agentlink`, `bin/agentctl`. 공식 문서의 plugin 스펙(매니페스트, 경로 변수, exec 형식 hook, 마켓플레이스 형식)을 확인하고 `claude plugin validate`로 플러그인과 마켓플레이스 둘 다 통과시켰다.
  - **번들링**: 플러그인은 캐시로 복사되고 `npm install`이 실행되지 않으므로 어댑터, 데몬, CLI를 의존성까지 `esbuild`로 묶어 `dist/`에 넣었다(`npm run build:plugin`). `npm test`가 시작 전에 다시 빌드하고, 커밋된 번들이 소스와 같은지 검사한다. 클라이언트는 번들 안에서 형제 파일 `agentd.mjs`를 데몬으로 띄운다.
  - 검증: 테스트 9개(매니페스트, 마켓플레이스, 번들 최신 여부, `node_modules`와 소스가 없는 임시 폴더에서 CLI, 데몬, LAN 계층의 TLS와 수신, hook, MCP 서버가 단독으로 동작), 실제 세션 종단 테스트(`npm run e2e:plugin`, `--plugin-dir`만 사용, 설정 파일과 `--mcp-config` 없음): MCP 도구로 전송, 작업 중 도착한 메시지의 hook 주입, Bash PATH의 `agentctl`. 플러그인 MCP 도구 이름은 `mcp__plugin_agentlink_agentlink__*`다.
  - 제약: 설치는 사용자 설정(`~/.claude`)을 바꾸므로 직접 설치하지 않았다(설치 명령은 PLUGIN.md 3절). 마켓플레이스 설치(`claude plugin marketplace add`와 `install`) 경로 자체는 실행해 보지 않았고, `--plugin-dir`와 `validate`로 검증했다. 플러그인 업데이트 후 실행 중인 데몬은 이전 버전이므로 `agentctl stop`이 필요하다.

### 12.2 미결
1. **실제 두 번째 PC에서의 검증**: 방화벽, 실제 IP, 서로 다른 PC 사이의 TLS와 재연결을 확인해야 한다. 절차는 [docs/LAN.md](LAN.md) 2절.
2. (해결, D-15) 에이전트 단위 ACL과 원격 idle 알림은 P4에서 구현했다.
3. **플러그인의 실제 설치 경로**: `claude plugin marketplace add`와 `claude plugin install`을 직접 실행해 보는 확인(사용자 설정을 바꾸므로 사용자가 직접 한다). 이후 두 번째 PC 배포 절차에 포함한다.
4. **외부 AI 도구와의 실제 연동**(2026-10-16에 보류하기로 함): 이 PC에는 Codex CLI, Gemini CLI, opencode가 설치되어 있다. 계정과 사용량이 걸려 있어 지금은 시험하지 않기로 했다. 필요해지면 도구 하나를 골라 MCP 서버 등록 방식과 비대화형 실행을 확인한 뒤 Claude와 서로 메시지를 주고받는 시험을 한다. MCP 어댑터는 도구에 독립적으로 만들고 일반 MCP 클라이언트로 검증했지만, 각 도구에서의 동작은 확인하지 않았다.
5. PostToolUse hook이 도구 호출마다 Node 프로세스를 띄우는 비용을 정량 측정하지 않았다. 종단 테스트에서 눈에 띄는 지연은 없었지만 수치는 없다.
6. 서브에이전트와 팀원이 부모와 같은 세션 ID를 쓰는지(쓰면 하나의 에이전트로 보인다) 확인하지 않았다.
7. 두 PC 사이의 Claude 세션 종단 테스트(대화형 두 세션이 서로 다른 PC에서 왕복)는 1번 이후에 한다.

## 13. 참고 문서

- https://code.claude.com/docs/en/cross-session-messaging.md (SendMessage 의미 체계의 참고 대상)
- https://code.claude.com/docs/en/agent-teams.md
- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/hooks.md (Claude 어댑터)
- https://code.claude.com/docs/en/mcp.md (MCP 어댑터)
- https://code.claude.com/docs/en/channels.md, https://code.claude.com/docs/en/channels-reference.md (선택 어댑터, P0)
- https://code.claude.com/docs/en/tools-reference.md
