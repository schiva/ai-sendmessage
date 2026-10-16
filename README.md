# AI_SendMessage (AgentLink)

같은 PC와 LAN의 다른 PC에서 실행되는 AI 에이전트들이 서로 메시지를 주고받는, 에이전트 중립 메시징 프레임워크입니다.

## AI 에이전트에게 설치를 맡기기

Claude Code에 이렇게 말하면 저장소만 보고 플러그인을 설치합니다(설정을 바꾸기 전에 사용자에게 먼저 묻도록 되어 있습니다).

> https://github.com/schiva/ai-sendmessage 의 INSTALL.md를 읽고 AgentLink 플러그인을 설치해 줘. 설정을 바꾸기 전에 나에게 먼저 물어봐.

사람이 직접 하려면 [INSTALL.md](INSTALL.md)를 보거나 저장소를 받아 `node scripts/install.mjs`(계획만 출력)와 `node scripts/install.mjs --yes`(설치)를 실행하면 됩니다. 이미 설치되어 있어도 안전하고, 제거는 `--uninstall --yes`입니다.

## 목적

1. **에이전트 간 메시징**: Claude Code의 `SendMessage`/`ListAgents` 의미 체계(이름 주소, 답장, 큐, 전달 확인, 상태 조회, idle 알림)를 참고해, 같은 PC와 LAN(Windows 11, 최대 5대)에서 동작하는 독립 프레임워크를 만듭니다.
2. **에이전트 중립**: 머신당 데몬 `agentd`가 레지스트리, 영속 inbox, 라우팅, 피어 연결을 맡고, 에이전트별 차이는 어댑터(MCP, Claude Code hooks, CLI, HTTP/SDK)가 흡수합니다. Claude Code는 어댑터 중 하나이며, 이후 다른 AI 에이전트를 붙일 수 있습니다.
3. **비공개 기능에 의존하지 않음**: Claude Code의 내부 프로토콜이나 연구 프리뷰 기능을 기본 경로로 쓰지 않습니다. 내장 `SendMessage`와는 공존합니다.

## 현재 상태

설계 단계입니다(RFP v0.2). 확정된 전제는 Windows 11 최대 5대, 정적 `peers.json`, 로컬 명명된 파이프, 에이전트 중립 구조입니다.

- **P0** (Claude 채널 주입 스파이크): 서버 쪽 테스트는 통과했지만, 이 계정에서는 채널이 조직 정책으로 막혀 세션 주입을 확인하지 못했습니다. 채널은 선택 어댑터로 내렸습니다. 자세한 내용은 [docs/P0.md](docs/P0.md).
- **P1** (agentd 코어와 `agentctl`): 완료. 같은 PC에서 에이전트 등록, 이름 주소 전송, 영속 inbox, ack, idle 알림, 자동 기동이 동작하고 테스트 20개가 통과합니다.
- **P2** (MCP 어댑터와 Claude Code hooks 어댑터): 완료. hook과 MCP 서버가 `CLAUDE_CODE_SESSION_ID`로 같은 세션을 식별합니다([docs/P2-SPIKE.md](docs/P2-SPIKE.md)). 테스트 38개, 실제 `claude -p` 세션 종단 테스트(`npm run e2e:claude`, 약 0.15달러), 대화형 두 세션 종단 테스트(`npm run e2e:interactive`, 가상 터미널로 TUI 구동, 약 0.5달러)가 통과했습니다. 대화형 테스트는 양방향 왕복, 쉬는 세션의 지연 전달, `/exit`와 `--resume` 복원까지 확인합니다.
- **P3** (LAN 피어링): 구현 완료. TLS WebSocket 링크, 인증서 지문 고정과 공유 토큰 인증, `peers.json` 허용 목록, 오프라인 큐(디스크 보존, 재전송, 중복 제거), 원격 에이전트 목록을 갖췄습니다. 한 PC에서 포트를 달리한 데몬 여러 개로 검증했고(테스트 16개, 전체 54개 통과), **실제 두 번째 PC와 방화벽을 거친 검증은 아직 하지 않았습니다**. 절차는 [docs/LAN.md](docs/LAN.md).
- **P4** (ACL, 원격 idle 알림, 다른 종류의 에이전트): 구현 완료. `acl.json`으로 누가 누구에게 보낼 수 있는지 정하고([docs/ACL.md](docs/ACL.md)), 다른 PC의 에이전트가 idle이 되면 알림을 받을 수 있으며, Claude가 아닌 에이전트를 SDK나 MCP 어댑터로 붙일 수 있습니다([docs/SDK.md](docs/SDK.md)). 테스트 70개와 실제 Claude 세션 종단 테스트가 통과했습니다.
- **플러그인**: Claude Code 어댑터를 플러그인으로 포장했습니다(`plugin/agentlink/`). 설치하면 hooks, MCP 서버, `agentctl`이 한 번에 들어옵니다. 번들이라 저장소나 `npm install`이 없어도 동작합니다. 자세한 내용은 [docs/PLUGIN.md](docs/PLUGIN.md). 테스트 79개와 실제 세션 종단 테스트(`npm run e2e:plugin`)가 통과했습니다.
- **다음**: 실제 두 PC 검증, 외부 AI 도구(Codex CLI, Gemini CLI 등)와의 실제 연동 시험, P5(5대 구성 점검, 운영 문서).

### 다른 PC와 연결하기

`%LOCALAPPDATA%AgentLinkpeers.json`에 상대 PC의 이름, IP, 공유 토큰, 인증서 지문을 적고 `npm run agentctl -- peers reload`를 실행합니다. 이후 `bob@pc-b`처럼 호스트를 붙여 보내면 됩니다. 자세한 절차와 방화벽 설정은 [docs/LAN.md](docs/LAN.md)를 보세요.

### Claude Code에 플러그인으로 설치하기 (권장)

```
claude plugin marketplace add schiva/ai-sendmessage
claude plugin install agentlink@agentlink-marketplace
```

저장소를 이미 받아 두었다면 `claude plugin marketplace add <저장소 경로>`로도 됩니다. 설치 없이 한 세션에서만 시험하려면 `claude --plugin-dir <저장소 경로>/plugin/agentlink`. 자세한 내용(범위, 제거, 업데이트, 주의점)은 [docs/PLUGIN.md](docs/PLUGIN.md). 소스를 고친 뒤에는 `npm run build:plugin`으로 번들을 다시 만듭니다(`npm test`가 자동으로 합니다).

### Claude Code에 수동으로 연결하기 (플러그인을 쓰지 않을 때)

```
npm run claude:config
```

출력된 `hooks` 설정을 `~/.claude/settings.json`(또는 프로젝트의 `.claude/settings.json`)에 합치고, `mcpServers` 항목을 프로젝트 `.mcp.json`에 추가하세요. 세션 이름은 환경변수 `AGENTLINK_NAME`으로 정할 수 있고, 없으면 `<폴더명>-<세션ID 앞 4자>`가 됩니다. 도착한 메시지는 다음 프롬프트, 도구 호출 직후, 응답이 끝나는 시점에 세션에 주입됩니다. 세션이 완전히 쉬고 있을 때 도착한 메시지는 다음 입력 때까지 전달되지 않습니다(RFP D-09).

### 빠른 시작

```
npm install
npm test

# 데몬은 처음 접속할 때 자동으로 뜹니다
npm run agentctl -- --as alice register
npm run agentctl -- --as bob register
npm run agentctl -- --as alice send bob "안녕"
npm run agentctl -- --as bob inbox
npm run agentctl -- stop
```

`agentctl --help`로 전체 명령을 볼 수 있습니다. 데이터는 `%LOCALAPPDATA%\AgentLink`(DB, 토큰, 로그)에 저장됩니다.

## 문서 시스템

| 문서 | 내용 | 상태 |
|---|---|---|
| [docs/RFP.md](docs/RFP.md) | 목적, 범위, 구성, 기능/보안 요구사항, 프로토콜, 위험, 단계별 계획, 인수 기준 | 초안 v0.2 |
| [docs/LOCAL-API.md](docs/LOCAL-API.md) | agentd와 어댑터 사이의 로컬 API(메서드, 오류 코드, 어댑터 매핑, 한도, P1 확정 세부) | 확정 v1.0 |
| [INSTALL.md](INSTALL.md) | AI 에이전트(와 사람)를 위한 플러그인 설치 안내: 준비물, 계획 확인, 동의, 설치, 검증, 제거, 문제 해결 | v1.0, 격리 환경에서 검증 |
| [AGENTS.md](AGENTS.md) | 이 저장소에서 일하는 AI 에이전트를 위한 규칙(설치 안내 링크, 코드 변경 규칙) | v1.0 |
| [docs/PLUGIN.md](docs/PLUGIN.md) | Claude Code 플러그인: 구성, 번들링 이유, 설치, 설정, 주의점 | v0.1, 실제 세션으로 검증 |
| [docs/ACL.md](docs/ACL.md) | acl.json 규칙, 검사 위치, 파일이 잘못됐을 때의 동작, 한계 | v1.0 |
| [docs/SDK.md](docs/SDK.md) | 새로운 종류의 에이전트 붙이기(MCP, SDK, CLI, 로컬 API), 보안 규칙 | v1.0 |
| [docs/LAN.md](docs/LAN.md) | LAN 연결 방식, 두 PC 설정 절차, peers.json, 문제 해결, 신뢰 경계 | v0.1, 단일 PC 다중 데몬으로 검증 |
| [docs/P0.md](docs/P0.md) | P0 채널 스파이크의 구성과 검증 결과 | 종료(선택 어댑터로 보존) |
| [docs/P2-SPIKE.md](docs/P2-SPIKE.md) | Claude 세션 식별 스파이크(hook과 MCP 서버의 환경, 결론) | 완료 |

### 문서 규칙

- 모든 설계 문서는 `docs/` 아래에 둡니다.
- 요구사항은 RFP의 ID(F-xx 기능, S-xx 보안)로 참조합니다.
- RFP의 미결 사항(12절)이 결정되면 RFP를 먼저 갱신하고, 그 뒤에 구현이나 하위 문서에 반영합니다.
- 이후 문서(아키텍처, 프로토콜 명세, 운영 가이드 등)가 생기면 위 표에 추가합니다.

## 디렉터리

```
AI_SendMessage/
├─ README.md      프로젝트 개요와 문서 색인
├─ package.json
├─ src/
│  ├─ agentd/     데몬 코어(config, protocol, store, core, server, main)와 LAN 계층(peers, peers-config, tls, remote)
│  ├─ client/     클라이언트 라이브러리와 agentctl
│  ├─ sdk/        AgentLinkAgent: 직접 만든 에이전트용 SDK
│  ├─ agents/     참조 에이전트(echo-agent)
│  ├─ adapters/   common(신원, 메시지 형식, 세션), mcp(MCP 서버), claude(hooks, 설정 생성)
│  ├─ test/       P1~P4 테스트와 실제 Claude 종단 테스트(e2e-claude.ts, e2e-interactive.ts)
│  └─ p0/         P0 채널 MCP 서버와 자체 테스트(선택 어댑터)
├─ INSTALL.md     AI 에이전트용 설치 안내
├─ AGENTS.md, CLAUDE.md  저장소 작업 규칙(CLAUDE.md는 AGENTS.md를 가져옴)
├─ plugin/agentlink/  Claude Code 플러그인(매니페스트, bin, 번들 dist)
├─ .claude-plugin/    플러그인 마켓플레이스 정의
├─ scripts/           build-plugin.mjs(번들 빌드), install.mjs(플러그인 설치 스크립트)
└─ docs/
   ├─ RFP.md        요구사항 정의서
   ├─ LOCAL-API.md  로컬 API 명세
   ├─ LAN.md        LAN 연결 가이드
   ├─ PLUGIN.md     플러그인 설치
   ├─ ACL.md        ACL 규칙
   ├─ SDK.md        SDK와 새 에이전트 붙이기
   └─ P0.md         P0 검증 결과
```
"# ai-sendmessage" 
