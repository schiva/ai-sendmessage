# Claude Code 플러그인으로 설치하기

- 문서 상태: v0.1 (2026-10-16)
- 위치: `plugin/agentlink/`(플러그인), `.claude-plugin/marketplace.json`(마켓플레이스), 빌드: `scripts/build-plugin.mjs`
- 검증: `claude plugin validate`, `src/test/p5-plugin.test.ts`(단독 실행 증명), `npm run e2e:plugin`(실제 세션)

## 1. 플러그인이 하는 일

설치하면 설정 파일을 손으로 고치지 않아도 Claude Code 세션이 AgentLink에 참여한다.

| 구성 | 내용 |
|---|---|
| hooks | `SessionStart`(등록과 안내), `UserPromptSubmit`(busy 표시, 대기 메시지 주입), `PostToolUse`(작업 중 도착한 메시지 주입), `Stop`(대기 메시지가 있으면 이어 가기, 없으면 idle), `SessionEnd`(등록 해제). 모두 `node`를 exec 형식으로 실행한다. |
| MCP 서버 | `agentlink`: `send_message`, `list_agents`, `read_inbox`, `ack_messages`. 도구 이름은 `mcp__plugin_agentlink_agentlink__*`. |
| `bin/agentctl` | 플러그인이 켜져 있으면 Claude의 Bash 도구 PATH에 올라간다. `agentctl list`, `agentctl peers`처럼 바로 쓸 수 있다. |

**데몬(`agentd`)은 PC마다 하나**이고 플러그인은 그것을 필요 시 자동으로 띄운다. 플러그인에 번들된 `dist/agentd.mjs`가 실행되므로 저장소를 따로 설치할 필요가 없다.

## 2. 왜 번들(`dist/`)인가

플러그인은 설치할 때 캐시 폴더로 복사되고, 그 폴더에서 `npm install`을 하지 않으며, 플러그인 폴더 밖의 파일은 쓸 수 없다. 그래서 어댑터, 데몬, CLI를 의존성(MCP SDK, `ws`, `selfsigned`)까지 포함해 `esbuild`로 파일 4개로 묶어 넣었다.

| 파일 | 크기 | 용도 |
|---|---|---|
| `dist/hook.mjs` | 약 11 KiB | 모든 hook(도구 호출마다 실행되므로 작게 유지) |
| `dist/mcp-server.mjs` | 약 600 KiB | MCP 서버 |
| `dist/agentd.mjs` | 약 920 KiB | 데몬(LAN 계층 포함) |
| `dist/agentctl.mjs` | 약 13 KiB | CLI |

- 소스를 고친 뒤에는 `npm run build:plugin`으로 다시 만든다. `npm test`는 시작 전에 자동으로 다시 빌드하고, 커밋된 번들이 소스와 같은지 검사한다.
- 요구 사항: Node.js 22.13 이상(데몬이 내장 `node:sqlite`를 쓴다). `node`가 PATH에 있어야 한다.
- 번들에 포함된 제3자 패키지 28개의 라이선스는 `dist/THIRD-PARTY-NOTICES.txt`에 있다(빌드가 자동으로 만든다).
- 번들은 생성물이지만 GitHub에서 바로 설치되도록 저장소에 커밋한다. 소스를 바꿀 때마다 다시 빌드해 함께 커밋해야 하며(`npm test`가 최신 여부를 검사한다), 그만큼 저장소 기록이 커진다.

## 3. 설치

설치는 사용자 설정(`~/.claude`)을 바꾸므로 직접 실행한다. 이 저장소가 곧 마켓플레이스다(`.claude-plugin/marketplace.json`). 번들(`dist/`)이 저장소에 커밋되어 있어 따로 빌드할 필요가 없다.

```
claude plugin marketplace add schiva/ai-sendmessage
claude plugin install agentlink@agentlink-marketplace
```

저장소를 이미 받아 두었다면 GitHub 대신 경로를 줄 수 있다: `claude plugin marketplace add <저장소 경로>`.

- `--scope`를 생략하면 `user`(이 PC의 모든 프로젝트)다. 한 프로젝트에서만 쓰려면 `--scope project`(그 프로젝트의 `.claude/settings.json`에 기록되어 팀과 공유됨) 또는 `--scope local`을 쓴다.
- 새 세션부터 적용된다. 이미 열린 세션에서는 `/reload-plugins`.
- 확인: `claude plugin list`에 `agentlink@agentlink-marketplace`가 보이고, 세션 시작 직후 `agentctl list`(또는 `/mcp`)로 연결을 볼 수 있다.
- 제거: `claude plugin uninstall agentlink@agentlink-marketplace`. 실행 중인 데몬은 남으므로 `agentctl stop`으로 끈다.

설치 없이 한 세션에서만 시험하려면:

```
claude --plugin-dir <저장소 경로>/plugin/agentlink
```

## 4. 설정

| 하고 싶은 일 | 방법 |
|---|---|
| 세션 이름 정하기 | 환경변수 `AGENTLINK_NAME`. 없으면 `<폴더명>-<세션 ID 앞 4자>`. |
| 다른 PC와 연결하기 | [LAN.md](LAN.md)의 `peers.json`. 플러그인과 같은 데몬을 쓰므로 그대로 적용된다. |
| 누가 누구에게 보낼 수 있는지 제한하기 | [ACL.md](ACL.md)의 `acl.json`. |
| 데이터 위치 바꾸기 | `AGENTLINK_HOME`(기본 `%LOCALAPPDATA%\AgentLink`). |

## 5. 알아둘 점

- **hook이 도구 호출마다 실행된다.** `PostToolUse` hook은 호출마다 작은 Node 프로세스를 띄운다(번들 11 KiB). 지연을 수치로 측정하지는 않았다.
- **업데이트 후 데몬 재시작.** 데몬은 플러그인 캐시의 `dist/agentd.mjs`로 떠 있으므로, 플러그인을 업데이트하면 실행 중인 데몬은 이전 버전이다. `agentctl stop` 후 다시 쓰면 새 버전이 뜬다.
- **같은 이름의 에이전트.** 세션 이름이 겹치면 `name@host [ref]`로 구분한다.
- **사용자 설정 방식과 중복하지 않기.** `npm run claude:config`로 만든 수동 설정(hooks와 `.mcp.json`)과 플러그인을 함께 켜면 hook이 두 번 실행된다. 플러그인을 쓸 때는 수동 설정을 빼는 것이 좋다.
- **다른 AI 도구.** 이 플러그인은 Claude Code 전용이다. 다른 도구는 [SDK.md](SDK.md)의 MCP 어댑터나 SDK로 붙인다.
