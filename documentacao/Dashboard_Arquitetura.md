# 📊 Arquitetura do Dashboard Central: Alavanca AI

## 🎯 Visão Geral
O Dashboard Central será a interface de comando e controle (C2) de toda a esteira de produção da Alavanca AI. Ele unificará o fluxo de trabalho dos agentes de inteligência artificial com a supervisão e aprovação humana, sincronizando em tempo real com o banco de dados **Supabase**. 

O objetivo é fundir o acompanhamento da esteira de produção de produtos (Mineração até Vídeo) com o painel de performance de tráfego pago (Gestor Meta Ads - *MetaScale Analytics*).

---

## 🏗️ Estrutura da Interface (Frontend)

O design visual será concebido inicialmente no Google Stitch, com foco em uma interface Dark Mode premium, similar ao *MetaScale Analytics*. A interface terá as seguintes áreas principais:

### 1. Sidebar de Navegação (Módulos da Esteira)
A navegação lateral refletirá o pipeline exato do Supabase. Cada módulo representará uma etapa da linha de produção:

*   **⛏️ Mineração:**
    *   *Visão:* Feed de produtos recém-raspados pelo agente Minerador.
    *   *Ação:* Aprovar produto para produção, rejeitar, ou ajustar dados base (preço, fornecedor).
*   **✍️ Copywriting:**
    *   *Visão:* Fila de produtos aguardando copy. Exibição das copies e roteiros gerados pela IA.
    *   *Ação:* Editar copy, aprovar e enviar para Design/Vídeo.
*   **🔎 Revisor (QA & Compliance):**
    *   *Visão:* Validação de promessas e conformidade de políticas do Meta Ads.
    *   *Ação:* Aprovação final de texto (Greenlight).
*   **🎨 Design / Webmaster:**
    *   *Visão:* Geração de landing pages (LPs), advertoriais, e imagens para ads.
    *   *Ação:* Visualizar protótipos, aprovar links finais e assets estáticos.
*   **🎬 Video Maker:**
    *   *Visão:* Fila de edição, assets de vídeo (VSLs, criativos para Reels/TikTok).
    *   *Ação:* Aprovar criativo em vídeo e empurrar para o status "Pronto para Tráfego".
*   **📈 Gestor Meta Ads (Integração MetaScale):**
    *   *Visão:* O dashboard de analytics avançado que você já possui.
    *   *Ação:* Simulador de escala, análise de ROAS, CPA, detalhamento de campanhas, monitoramento de hook rate e controle financeiro (70/20/10).

---

## ⚙️ Sincronização e Arquitetura de Dados (Supabase)

O frontend será conectado ao Supabase utilizando as seguintes estratégias para garantir fluidez e consistência:

1.  **Realtime Subscriptions:**
    *   Utilizaremos o cliente `@supabase/supabase-js` com canais *Realtime*. Quando o agente Minerador inserir um novo produto na tabela (ex: `produtos_minerados`), o dashboard atualizará na tela do gestor instantaneamente, sem reload.
2.  **Transição de Estados (Status Flow):**
    *   As tabelas trabalharão com estados de aprovação. Quando um card for aprovado na aba "Mineração", o status muda para `aguardando_copy`, e ele aparecerá automaticamente na tela do módulo de "Copywriting".
3.  **Integração do Dashboard Existente:**
    *   O painel do Gestor Meta Ads vai consumir tanto a API do Meta quanto as tabelas do Supabase (`campanhas_ativas`, `metricas_diarias`) para popular os simuladores e gráficos.

---

## 🚀 Próximos Passos (Plano de Ação Integrado)

1.  **Concepção no Google Stitch (Ação do Usuário):**
    *   Finalizar o design visual (UI/UX) do layout no Google Stitch, unindo a sidebar de etapas da IA com o layout do MetaScale.
    *   Exportar o design/código (React/Tailwind) ou capturar os prints para que a IA possa codificar.
2.  **Importação e Refatoração (Ação da IA):**
    *   Trazer os componentes gerados pelo Stitch para o repositório `paperclip`.
    *   Dividir o frontend em rotas modulares (ex: `/mineracao`, `/copy`, `/ads`).
3.  **Ligação (Wiring) com o Supabase:**
    *   Mapear as tabelas existentes ou criar as migrações (SQL) necessárias para a esteira.
    *   Criar os hooks de sincronização Realtime para as tabelas.
4.  **Fusão Final:**
    *   Integrar o código legado/atual do *MetaScale Analytics* dentro da rota do Gestor Meta Ads no novo projeto unificado.

> 💡 **Nota Estratégica:** Traga o design do Stitch ou os arquivos `.md` gerados por ele para cá. A partir disso, eu absorvo o design, estruturo os componentes frontend e faço a ligação ao vivo com o nosso banco Supabase!
