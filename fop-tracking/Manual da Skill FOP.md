MISSÃO CLAUDE TRACKING · MATERIAL DO ALUNO

# Manual da Skill FOP

Funil de Otimização de Pixel. Instale no Claude Code, chame por comando e traqueie qualquer página com Pixel + CAPI — do jeito que roda em produção.

① Instalar ② Invocar ③ Traquear uma página

Lucio Artes
Framework FOP · validado em mct.lucioartes.com v1 · 2026

---

MANUAL DA SKILL FOP PARTE 1 — INSTALAR

## ANTES DE TUDO

O que é uma “skill” do Claude Code?
Uma skill é uma pasta com instruções que ensina o Claude a fazer uma tarefa do seu jeito. Você cola a pasta uma vez — e o Claude passa a saber implementar tracking FOP sozinho, sempre igual.

A ideia em uma frase
Você coloca a pasta fop-tracking dentro de `~/.claude/skills/`. Pronto: toda vez que você falar de pixel, tracking ou CAPI, o Claude carrega a metodologia e executa.

## PASSO A PASSO

Instalar em 4 passos

1. Instale o Claude Code
É o programa que roda no seu terminal. Precisa do Node.js instalado antes (node.js.org → versão LTS).

    🖊️ O que digitar `npm install -g @anthropic-ai/claude-code`

    ✅ Resultado O comando `claude` passa a existir no terminal.

2. Baixe e descompacte a skill
Baixe o arquivo `fop-tracking-skill.zip` aqui na área de membros e descompacte. Vai aparecer uma pasta `fop-tracking`.

    🖱️ O que você faz Duplo-clique no .zip → surge a pasta `fop-tracking/`.

    📁 Conteúdo `SKILL.md` + pasta `reference/` + `LEIA-ME.md`

---

MANUAL DA SKILL FOP PARTE 1 — INSTALAR

## CONTINUANDO

Instalar — passos 3 e 4

3. Cole a pasta em `~/.claude/skills/`
É a “estante de skills” do Claude. Se a pasta skills não existir, crie.

    Terminal — colar a skill

    ```bash
    # cria a estante (se ainda não existir)
    ➜ mkdir -p ~/.claude/skills

    # move a pasta baixada para dentro dela
    ➜ mv ~/Downloads/fop-tracking ~/.claude/skills/
    ✓ skill instalada em ~/.claude/skills/fop-tracking
    ```

    Windows: a estante fica em `C:\Users\SEU_USUARIO\.claude\skills\` — basta arrastar a pasta `fop-tracking` para lá.

4. Confirme que o Claude enxerga
Abra o Claude Code numa pasta de projeto e pergunte se a skill está disponível.

    🖊️ O que digitar “Você tem a skill fop-tracking disponível?”

    ✅ Resultado O Claude confirma que encontrou a skill `fop-tracking`.

---

MANUAL DA SKILL FOP PARTE 2 — INVOCAR

## COMO CHAMAR

Você não “roda” a skill — você só pede
A fop-tracking ativa sozinha quando você menciona o assunto. Não precisa decorar comando: fale naturalmente o que quer, e o Claude carrega a metodologia.

Palavras que ligam a skill
“Implementa o tracking FOP nesta landing.”

`pixel` `tracking` `CAPI` `EMQ`
`FOP on` `advanced matching` `hierarquia de eventos`
`auditar pixel` `landing page`

3 exemplos de pedido que funcionam

*   Criar do zero → “Implemente o tracking FOP completo nesta página de vendas: Pixel + Advanced Matching + CAPI, com a hierarquia de eventos certa.”

*   Auditar → “Audita o pixel deste site pelo Framework FOP e me diz o que está faltando pra subir o EMQ.”

*   Propor → “Monta a hierarquia de eventos pra um funil de WhatsApp Direct.”

Sempre confirme antes de subir. O Claude vai te mostrar a hierarquia de eventos antes de codar. Aprove (ou ajuste) — só então ele implementa e faz o deploy.

---

MANUAL DA SKILL FOP PARTE 3 — TRAQUEAR

## MÃO NA MASSA

Traqueando sua primeira página
A skill segue sempre o mesmo ritual de 4 fases. Você acompanha; o Claude executa.

| Diagnóstico | Implementação |
| :---------- | :------------ |
| 1 Que funil é? Tem popup? Qual checkout (Ticto, Hotmart…)? | 3 Pixel + Advanced Matching no navegador e CAPI no servidor. |
| Hierarquia | Validação |
| 2 O Claude monta a escada de eventos e te mostra antes de codar. | 4 Test Events: cada evento chega 2× e é deduplicado. EMQ ≥ 8. |

A escada de eventos (LP com popup)
Cada degrau é um sinal que calibra a entrega do Meta. Quanto mais sinais qualificados, mais precisa a mira.

1 · PageView
2 · ViewContent
3 · AddToWishlist
4 · Lead · 5 · Contact
6 · AddToCart
7 · InitiateCheckout
8 AddPaymentInfo → 9 PURCHASE

Os passos 8 e 9 geralmente vêm da própria plataforma de checkout (Ticto, Hotmart, Kiwify). Os passos 1 a 7 são os que a skill implementa na sua página.

---

MANUAL DA SKILL FOP PARTE 3 — TRAQUEAR

## O SEGREDO TÉCNICO

Dois disparos, um evento só
Cada evento sai duas vezes: pelo navegador (Pixel) e pelo servidor (CAPI). Ambos levam o mesmo `event_id` — então o Meta entende que é o mesmo evento e não conta dobrado. Isso é o que faz o EMQ subir.

🌐 Navegador `fbq('track',{eventID})`

`mesmo event_id` `1 evento deduplicado`

🖥️ Servidor (CAPI) `/events {event_id}`

As 4 regras que nunca podem faltar

| 🆔 event_id | Único por evento eidênticono navegador e no servidor. |
| :---------- | :---------------------------------------------------- |
| 👤 Advanced Matching | Email, telefone e external_id no init — sempre com hash SHA256. |
| 💾 Persistência | Cookie + localStorage: o lead que volta re-hidrata o matching. |
| 💰 value + currency | Em todo evento que tem valor (AddToCart, Checkout, Purchase). |

Nunca ative o pixel dentro do player de vídeo (Vturb) e nunca mande parâmetro-lixo (`device_*`, `event_day`, `tracked_by`). Eles poluem os dados e derrubam o EMQ.

---

MANUAL DA SKILL FOP REFERÊNCIA

## COLA DE BOLSO

Referência rápida
Para consultar enquanto trabalha. A skill conhece tudo isso — aqui é só pra você acompanhar.

Templates por tipo de campanha

| FUNIL | EVENTOS |
| :---- | :------ |
| LP com popup | PageView → ViewContent → AddToWishlist → Lead → Contact → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase |
| LP sem popup | PageView → ViewContent → AddToWishlist → Lead → InitiateCheckout → AddPaymentInfo → Purchase |
| WhatsApp Direct | PageView → ViewContent → Lead → Contact → Purchase |
| Instagram Direct | PageView → Lead → Contact → Purchase |
| E-commerce | PageView → ViewContent → AddToWishlist → AddToCart → InitiateCheckout → AddPaymentInfo → Purchase |

✅ Parâmetros que ENVIAM valor 🚫 Lixo que polui (nunca)

| | |
| :------------------- | :----------------- |
| `content_name` | `device_*` |
| `content_ids` | `event_day` |
| `content_type` | `event_month` |
| `value` | `tracked_by` |
| `currency` | |
| `event_id` | |

---

MANUAL DA SKILL FOP REFERÊNCIA

## COLA DE BOLSO

Metas & checklist final
Metas de qualidade (FOP)

| ≥ 8.0 EMQ por evento | > 80% Connect Rate | > 10% Qualify Rate | > 3% Close Rate |
| :------------------- | :----------------- | :----------------- | :-------------- |

Checklist antes de dizer “tá pronto”

*   Hierarquia de eventos definida e aprovada por você.
*   Cada evento chega 2× (navegador + servidor) e é deduplicado no Events Manager.
*   Advanced Matching populado (email, telefone, external_id, geo).
*   EMQ por evento ≥ 6.0 (meta 8.0) e sem parâmetro-lixo.
*   Test Event Code removido → modo produção.

É isso, senhor 😉
Skill instalada, evento deduplicado, EMQ no verde. Qualquer dúvida, peça ao próprio Claude: “me explique a hierarquia FOP pra esta página”.
