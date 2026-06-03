# 🛰️ Documentação de Infraestrutura: Central de Alertas e Operações (Telegram)

## 📌 Contexto e Origem da Demanda
Durante a fase final de onboarding técnico e consolidação das chaves de API da **Alavanca AI**, o Diretor de Infraestrutura Técnica (**CTO**) sinalizou a necessidade de centralizar as variáveis de ambiente globais no cofre da plataforma (`Company Settings -> Secrets`). 

A principal pendência listada na issue **`ALA-9`** exigia o mapeamento e a configuração das chaves de notificações externas do Telegram, garantindo que a camada de agentes inteligentes (especificamente o **Minerador** e o próprio **CTO**) tivessem canais de saída funcionais para reportar o andamento da esteira de produtos e a integridade do ecossistema.

---

## 🎯 Finalidade Técnica e de Negócio
A implementação desta estrutura cumpre dois objetivos vitais para a operação de e-commerce da empresa:

1. **Notificação da Esteira de Mineração:** O agente `Minerador`, utilizando as APIs de raspagem (como ScrapeCreators), precisa de um canal dedicado para cantar alertas em tempo real sobre criativos encontrados e dados populados no Supabase.
2. **Infraestrutura para o Dashboard Customizado:** No futuro próximo, um painel/dashboard web conectado à tabela `campanhas_producao` do Supabase será o centro de tomada de decisão. Quando um produto minerado receber o "OK" de aprovação humana no painel, o sistema utilizará estas mesmas credenciais do Telegram para notificar o canal de operações de que o produto entrou oficialmente em fase de produção (copywriting, design, tráfego).

---

## 🔀 A Resolução da Encruzilhada: Separação de Fluxos (Hermes Agent vs. Alavanca Operations)

Um dos pontos críticos mapeados na arquitetura foi o risco de **loop e colisão de contexto** entre as IAs. 

### O Cenário Anterior (Controle Remoto Privado):
O bot **`@hermesclipbot`** (operando via terminal dedicado na VPS) foi programado como um **Controle Remoto de Entrada**. Ele escuta os comandos diretos do usuário, executa ações no CLI do Paperclip e retorna logs. O canal de identificação dele é o ID do usuário pessoal (`User ID: 6597697011`).

### O Risco de Misturar os Canais:
Se o robô de alertas automáticos cuspisse relatórios de mineração dentro do mesmo chat privado do Hermes, o interpretador da VPS leria o alerta como se fosse um comando humano. Isso geraria falhas de execução consecutivas no terminal e respostas desconexas da IA.

### A Solução Aplicada (Refatoração Limpa):
Para evitar alterações complexas ou poluição no arquivo mestre de prompts (`agents.md`), decidimos refatorar e isolar a **Saída de Dados** criando uma infraestrutura inédita e independente:

*   **Canal Privado Hermesclip:** Mantido puramente para comandos do terminal VPS ➡️ Paperclip (Entrada).
*   **Grupo Alavanca AI - Ops & Alertas:** Um novo grupo dedicado exclusivamente para recepção de notificações da empresa (Saída).
*   **Bot Alavanca Operations:** Um novo bot (`@alavanca_pipeline_bot`) criado exclusivamente para assinar e postar as atualizações dentro do grupo, atuando de forma passiva (sem ler ou responder mensagens).

---

## 🛠️ Detalhes da Configuração Técnica

O grupo privado foi mapeado através do protocolo HTTP da API do Telegram, convertendo o hash gerado na URL do navegador para a sintaxe oficial de supergrupos da API.

### 🔑 Variáveis Globais Cadastradas no Cofre (Secrets)

| Nome do Secret | Tipo | Descrição / Finalidade |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Secret | Token HTTP API gerado pelo BotFather para o bot **Alavanca Operations**. |
| `TELEGRAM_CHAT_ID` | Secret | ID convertido do grupo privado de alertas: **`-1005199123225`**. |

> ℹ️ *Nota de Engenharia:* O ID original extraído da URL web (`5199123225`) recebeu obrigatoriamente o prefixo `-100` para adequação às chamadas de métodos de envio de mensagens em canais/grupos privados da API do Telegram.

### 🤖 Agentes Vinculados

As variáveis foram injetadas de forma selada na aba de configuração dos seguintes agentes:
*   **`Minerador`**: Para o envio de relatórios e ofertas validadas no mercado.
*   **`CTO`**: Para logs de infraestrutura, relatórios de rotina (heartbeats) e alertas de erros técnicos do ecossistema.

---

## ✅ Status Atual do Sistema
Com a centralização dessas chaves no ambiente de produção:
*   A issue **`ALA-9`** foi marcada como **Concluída (Done)**.
*   O Onboarding técnico da infraestrutura inicial foi finalizado com sucesso.
*   Os agentes foram retirados do modo de pausa e encontram-se em status estável (`idle`), aguardando os próximos gatilhos de desenvolvimento do banco de dados e disparo do Minerador.