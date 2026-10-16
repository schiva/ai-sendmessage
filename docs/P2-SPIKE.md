# P2 스파이크: Claude 세션 식별

- 실행일: 2026-10-16
- 질문: hook(일회성 프로세스)과 MCP 서버(상주 프로세스)가 같은 Claude 세션을 같은 에이전트로 인식할 수 있는가? (RFP 12.2, LOCAL-API 5.3)
- 결론: **가능하다.** 두 프로세스 모두 `CLAUDE_CODE_SESSION_ID` 환경변수를 받고, 이 값이 hook의 stdin `session_id`와 같다.

## 방법

`claude -p`로 새 세션을 띄워(모델 호출 1회, 약 0.08달러) 다음을 기록했다.

- hook 3개(`SessionStart`, `UserPromptSubmit`, `Stop`)와 MCP 서버 1개가 각각 받는 환경변수, stdin, 프로세스 조상 체인
- 프로브: `src/p2/spike/probe-hook.ts`, `probe-mcp.ts`, `probe-common.ts`(비밀 값은 기록 전에 가린다)
- 격리: 새 세션이 이 세션의 메시징 환경변수를 상속하지 않도록 `CLAUDECODE`, `CLAUDE_CODE_MESSAGING_*`를 제거하고 실행했고, `--strict-mcp-config`로 다른 MCP 서버를 막았다.

## 관찰 결과

| 항목 | hook | MCP 서버 |
|---|---|---|
| `CLAUDE_CODE_SESSION_ID` | 있음 (`34357419-…`) | 있음 (같은 값) |
| stdin | JSON: `session_id`, `transcript_path`, `cwd`, `hook_event_name` 등 | (MCP 프로토콜) |
| `CLAUDE_CODE_MESSAGING_SOCKET` | 있음 | 있음 (같은 값) |
| `CLAUDE_CODE_MESSAGING_TOKEN` | 있음 | **있음** (길이 32) |
| `CLAUDE_PROJECT_DIR` | 있음 | 있음 |
| 부모 프로세스 | `bash.exe`(2단계) → `claude.exe`(PID 9988) | `claude.exe`(PID 9988) 직접 |
| `clientInfo` | - | `claude-code` 2.1.301 |
| `CLAUDE_PID` | 9988 (정확) | **5148 (부정확)**: 이 스파이크를 실행한 바깥 세션의 값이 상속된 것으로 보인다. |

### 해석
- 세션 식별에는 `CLAUDE_CODE_SESSION_ID`를 쓴다. 두 프로세스가 같은 값을 받고, hook stdin의 `session_id`와도 일치한다.
- `CLAUDE_PID`는 쓰지 않는다. MCP 서버에서는 바깥 세션의 값이 남아 있었다.
- 부모 프로세스 체인은 hook이 셸을 두 단계 거쳐 `claude.exe`에 닿는 반면 MCP는 직접 닿는다. 따라서 PID 기반 식별(LOCAL-API 5.3의 후보 A)은 불안정하다.
- 세션 이름은 어디에도 전달되지 않는다(`/rename`, `--name` 값 없음). 이름은 별도 규칙으로 정해야 한다.
- MCP 서버가 `CLAUDE_CODE_MESSAGING_TOKEN`까지 상속하는 것은 문서에 없던 사실이다. 이 값은 사용하지 않는다(D-05). 어댑터와 로그는 이 값을 읽거나 기록하지 않는다.

## 결정 (D-11)

- 에이전트 `key`는 `claude:<CLAUDE_CODE_SESSION_ID>`다. hook과 MCP 서버가 같은 `register(key=…)` 호출로 같은 `agent`를 얻는다.
- 에이전트 `name` 규칙(두 어댑터가 같은 함수를 공유한다):
  1. `AGENTLINK_NAME` 환경변수가 있으면 그 값(설정의 `env` 블록이나 MCP 서버 `env`로 지정)
  2. 없으면 `<작업 디렉터리 이름>-<세션 ID 앞 4자>` (이름 규칙에 맞게 정리)
- 같은 `key`로 다시 등록하면 이름이 갱신되므로, 두 어댑터는 이름 계산 입력(`CLAUDE_PROJECT_DIR`과 `AGENTLINK_NAME`)을 같게 유지해야 한다.

## 남은 확인 사항

- 이 스파이크는 `claude -p`(비대화형)에서 했다. 대화형 세션에서도 같은지는 P2 통합 테스트에서 확인한다.
- `claude --resume`이나 `--continue` 뒤에도 `CLAUDE_CODE_SESSION_ID`가 유지되는지(유지되면 같은 inbox가 복원된다). P2에서 확인한다.
- 서브에이전트와 팀원은 같은 세션 ID를 쓸 가능성이 있다. 이 경우 하나의 에이전트로 보인다.
