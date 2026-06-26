# Kickoff — Trocar Anthropic SDK por OpenCode Zen (DeepSeek V4 Flash Free)

Contexto: descobrimos que não há ANTHROPIC_API_KEY configurada no projeto.
Vamos usar o OpenCode Zen (provedor que expõe modelos via API compatível
com OpenAI) em vez disso, especificamente o modelo gratuito "DeepSeek V4
Flash Free".

## Passo 1 — Instalar o SDK da OpenAI
Rode: `npm install openai`
(O SDK da OpenAI funciona com qualquer endpoint compatível, incluindo o
OpenCode Zen — não precisamos de um SDK específico do OpenCode.)

## Passo 2 — Adicionar a variável de ambiente
No `.env.local`, adicione uma nova seção:
```
# ============================================================
# OPENCODE ZEN CONFIGURATION
# ============================================================
OPENCODE_API_KEY=sk-PMv0...59Fs
```
(Vou colar o valor completo da chave separadamente — é a chave nomeada
"alavancaai_synapse" no painel do OpenCode.)

## Passo 3 — Substituir o conteúdo da API
Substitua TODO o conteúdo de `src/app/api/copywriting/generate/route.ts`
pelo código que vou colar a seguir nesta mensagem. Esse código:
- Usa o SDK `openai` em vez de `@anthropic-ai/sdk`
- Aponta para `baseURL: 'https://opencode.ai/zen/v1'`
- Usa o modelo `opencode/deepseek-v4-flash-free`
- Mantém toda a lógica de negócio igual (busca campanha + produto em
  queries separadas, monta prompt via buildSystemPrompt, salva resultado)

IMPORTANTE: confirme o nome exato do modelo e o path correto do baseURL
consultando a documentação ou o painel do OpenCode antes de assumir que
os valores que colei estão 100% corretos — eles foram baseados em
documentação pública e podem precisar de ajuste fino (ex: o id exato do
modelo pode ter um prefixo diferente, tipo "opencode-go/deepseek-v4-flash"
em vez de "opencode/deepseek-v4-flash-free", dependendo de qual plano/tier
a chave está vinculada).

## Passo 4 — Testar
Rode `npm run type-check`. Se passar, reinicie o servidor (`npm run dev`)
e me avise para testarmos via curl novamente com a mesma campanha de teste
que já existe no banco (id: 4660b368-e3b8-4cef-b16f-ac22753d8ed2).

Não tente testar sozinho ainda — pare aqui e me avise o resultado do
type-check.
