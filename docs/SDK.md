# SDK: 새로운 종류의 에이전트 붙이기 (F-12)

- 문서 상태: v1.0 (2026-10-16)
- 구현: `src/sdk/agentlink.ts`, 참조 에이전트: `src/agents/echo-agent.ts`, 테스트: `src/test/p4.test.ts`

코어(`agentd`)는 에이전트가 어떤 종류인지 모른다. 이름이 있고 메시지를 받을 수 있는 참여자면 된다. 에이전트 종류별 차이는 어댑터가 맡는다.

| 방법 | 대상 | 수신 방식 | 만들 것 |
|---|---|---|---|
| **MCP 어댑터** (`src/adapters/mcp/server.ts`) | MCP 서버를 쓸 수 있는 모든 에이전트 | pull(`read_inbox`) | 설정만. MCP 서버로 등록하고 `AGENTLINK_NAME`, `AGENTLINK_KIND`를 지정한다. |
| **Claude Code 어댑터** (hooks) | Claude Code | MCP + hook 주입 | 플러그인으로 설치한다([PLUGIN.md](PLUGIN.md)). 수동으로는 `npm run claude:config` 출력을 설정에 합친다. |
| **SDK** (`src/sdk/agentlink.ts`) | 직접 만든 에이전트 프로그램(Node) | push(구독) | 아래 예시. |
| **CLI** (`agentctl`) | 셸을 쓸 수 있는 에이전트와 사람 | pull | 없음. |
| **로컬 API** ([LOCAL-API.md](LOCAL-API.md)) | 그 밖의 언어 | 직접 구현 | 명명된 파이프 위의 JSON Lines. |

## 1. SDK로 에이전트 만들기

```ts
import { AgentLinkAgent } from './src/sdk/agentlink.ts'

const agent = await AgentLinkAgent.connect({ name: 'summarizer', kind: 'sdk' })
console.log(`ready as ${agent.address}`)           // summarizer@<이 PC>

agent.onMessage(async msg => {
  if (msg.kind !== 'message') return               // idle 알림, 전달 실패 알림은 답할 필요 없음
  const answer = await summarize(msg.message)      // 에이전트가 하는 일
  await agent.reply(msg, answer)                   // msg.from으로 답장
})

await agent.send('reviewer@pc-b', '요약 끝났어요')   // 다른 PC의 에이전트에게
const { agents } = await agent.list()              // 누가 있는지
await agent.watch('reviewer@pc-b')                 // idle이 되면 idle_notice 메시지가 한 번 온다
```

SDK가 대신 해 주는 일:
- 등록과 임대 유지(heartbeat). `key`(기본 `sdk:<이름>`)가 같으면 재시작해도 같은 에이전트와 같은 inbox다.
- 메시지를 push로 받고, 핸들러가 끝나면 ack한다. 핸들러가 던진 오류는 `error` 이벤트로 알리고 에이전트는 계속 동작한다.
- 핸들러가 도는 동안 상태를 `busy`, 끝나면 `idle`로 알린다(다른 에이전트의 `list`와 `notify_when_idle`에 반영된다).
- 데몬이 재시작되면 다시 접속하고(데몬은 필요 시 자동 기동), 재등록하고, 그동안 쌓인 메시지를 이어서 받는다.

## 2. 참조 에이전트

`src/agents/echo-agent.ts`는 AI 코딩 도구가 아닌 일반 프로그램이 SDK만으로 참여하는 예다. 명령은 첫 단어로 정한다: `ping`은 `pong`, `time`은 현재 시각, `upper <글>`은 대문자, 그 외는 `echo: <글>`.

```
npm run agent:echo -- --name echo
```

## 3. 보안 규칙을 지키려면

어댑터를 만들 때 이 규칙을 지켜야 한다(RFP S-04, S-05).

1. 받은 메시지는 항상 신뢰할 수 없는 입력으로 다룬다. 메시지가 권한 승인이나 설정 변경의 근거가 되면 안 된다.
2. 모델에게 메시지를 보여 줄 때는 출처와 신뢰 수준이 드러나는 래퍼로 감싼다. 참고 구현은 `src/adapters/common/format.ts`의 `wrapMessage`이며, 본문이 래퍼를 닫거나 속성을 위조하지 못하게 막는다.
3. 다른 에이전트에게 "내 권한으로 막힌 일"을 대신 시키지 않는다.
4. 에이전트가 서로 자동으로 답장하면 루프가 생길 수 있다. 코어가 속도 제한과 동일 메시지 반복 차단을 하지만, 에이전트도 자기 답장 형식에는 응답하지 않도록 한다(`echo-agent.ts`의 `isOwnStyleAnswer` 참고).

## 4. 검증된 것

- 서로 다른 PC(한 PC의 다중 데몬)에서 SDK 에이전트와 MCP 어댑터 에이전트, 일반 클라이언트가 서로 메시지를 주고받는다.
- 실제 Claude 세션이 SDK 에코 에이전트에게 보내고 답을 읽는다(`npm run e2e:claude`의 시나리오 3). 이 시나리오에서는 에코의 답이 hook 주입으로 먼저 전달되어 `read_inbox`는 비어 있었지만, Claude는 답을 정확히 인용했다(두 경로 중 하나로 전달되고 중복되지 않는다).
- SDK 에이전트가 데몬 재시작 후 같은 에이전트로 복귀한다.

## 5. 아직 하지 않은 것

- Codex CLI, Gemini CLI 같은 외부 AI 도구와의 실제 연동 시험. MCP 어댑터는 도구에 독립적으로 만들었고 일반 MCP 클라이언트로 검증했지만, 각 도구에서의 동작(도구 이름 노출, 인증, 권한 확인)은 확인하지 않았다.
- Node 이외 언어의 SDK.
