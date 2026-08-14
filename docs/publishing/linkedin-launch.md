# LinkedIn launch material

The public release URL is included below. Do not change the verified metrics without rerunning
validation.

## Portuguese launch post

Agentes de IA não apenas respondem perguntas: eles leem arquivos, chamam ferramentas e atravessam
limites de confiança. Como testar essas permissões de forma reproduzível?

Criei o **Hermes Agent Security Lab**, um laboratório local em TypeScript para avaliar esse tipo de
comportamento com cenários YAML, políticas deny-by-default, evidências com SHA-256 e relatórios
determinísticos.

Na primeira release:

- 3 cenários sintéticos: instrução indireta, uso indevido de ferramenta e path boundary;
- 42 testes automatizados;
- relatórios JSON e Markdown;
- CI sem chave ou consumo de API;
- adaptador OrcaRouter limitado por orçamento e smoke test explicitamente opt-in;
- demo local com zero chamadas de modelo e custo estimado de US$0.

Uma decisão importante: o modelo pode explicar o resultado, mas não decide sozinho se o teste
passou. O evaluator usa expectativas objetivas e evidências verificáveis.

Código e release: https://github.com/guuszz/hermes-agent-security-lab/releases/tag/v0.1.0

Limitação atual: o MVP ainda não orquestra uma conversa completa com um agente ao executar os
cenários. Esse é um dos próximos passos, junto com cenários MCP e exportação SARIF.

#AISecurity #CyberSecurity #RedTeam #AppSec #TypeScript #OWASP

## Short English version

I built **Hermes Agent Security Lab**, a local TypeScript lab for testing tool-using AI agents with
declarative scenarios, deny-by-default policies, hashed evidence, and deterministic reports.

The v0.1.0 release includes three synthetic scenarios, 42 automated tests, zero-API CI, a bounded
OpenAI-compatible provider adapter, and a fully local demo. Models may explain outcomes, but
objective evaluators decide pass or fail.

Release: https://github.com/guuszz/hermes-agent-security-lab/releases/tag/v0.1.0

Current limitation: scenario runs do not yet orchestrate a complete live-agent conversation.

#AISecurity #CyberSecurity #RedTeam #AppSec #OWASP

## Demo script — up to 45 seconds

1. **0–5s:** title and one-line problem statement.
2. **5–12s:** show strict YAML validation.
3. **12–22s:** run the synthetic tool-misuse scenario.
4. **22–30s:** highlight `shell.execute → DENY`.
5. **30–38s:** show deterministic `PASS`, 2/2 expectations, zero model calls.
6. **38–45s:** show repository name and `npm run demo`.

## Alt text

Animated dark terminal preview of Hermes Agent Security Lab. It validates a synthetic tool-misuse
scenario, denies a shell.execute request under a deny-by-default policy, verifies two deterministic
expectations, and finishes with PASS, zero model calls, and zero estimated provider cost.

## Suggested cadence

1. Release day: problem, architecture, verified result, and repository link.
2. Day 3: technical deep dive into deny-by-default policy decisions.
3. Day 7: evidence hashing and deterministic evaluation.
4. Day 14: retrospective with real GitHub traffic metrics; do not estimate them beforehand.
