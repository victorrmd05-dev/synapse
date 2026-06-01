# Alavanca AI Core (Paperclip as Code)

Este repositório serve como o "cérebro" e a infraestrutura como código (Infrastructure as Code) para a agência **Alavanca AI**, operando dentro do ecossistema do Paperclip.

## 🧠 Filosofia Principal
- **Paperclip as Code:** O GitHub é a fonte da verdade. Todas as lógicas, prompts e conexões entre agentes nascem aqui e são sincronizadas para o Paperclip.
- **Protocolo Interno (`agent://`):** Para que um agente invoque ou delegue tarefas a outro nativamente no Paperclip, utilizamos **sempre** o formato markdown `[@Nome do Agente](agent://nome-da-pasta)`. Nunca usar URLs absolutas (`https://...`).
- **Padrão de Idioma:** Os arquivos técnicos lidos pela IA (`agent.md` e `SKILL.md`) são escritos estritamente em **Inglês** para máxima performance. Documentações, discussões e planejamentos para humanos são mantidos em **Português (PT-BR)**.

---

## ⚙️ Fluxo de Trabalho e Arquitetura (MVP Foco em Tráfego Direto)

Para acelerar a geração de caixa com infoprodutos e dropshipping, a equipe de agentes atua em um funil sequencial com pausas estratégicas de "Human-in-the-loop" (Aprovação Humana).

### 1. Interface e Orquestração
- **[@CEO](agent://ceo):** O único ponto de contato externo. Recebe ordens do usuário via **Hermes Agent (Telegram)** e devolve os relatórios e pedidos de aprovação por lá.
- **[@Alavanca CEO](agent://alavanca-ceo):** O gerente de operações. Pega as ordens do CEO, gerencia a equipe tática abaixo e impõe as "travas" de aprovação.

### 2. Mineração e Dados
- **[@Minerador](agent://minerador):** Acessa a **ScrapeCreators API** para vasculhar a Meta Ad Library e varrer ofertas validadas. Em seguida, salva os links e dados brutos no **Supabase**.
- 🛑 **Trava de Aprovação 1:** O Alavanca CEO envia as ofertas ao CEO (Telegram) e a operação **pausa** até o usuário escolher e aprovar uma oferta.

### 3. Persuasão e Revisão
- **[@Copywriting](agent://copywriting):** Baseado na oferta escolhida, escreve a página de vendas, os roteiros de VSL e os textos dos anúncios. Foco brutal em engajamento emocional.
- **[@Revisor](agent://revisor):** Analisa a copy buscando erros e garantindo que não haverá bloqueios (ban) nas políticas do Meta Ads.
- 🛑 **Trava de Aprovação 2:** A copy revisada vai pro Telegram. A operação **pausa** até o usuário aprovar o texto final.

### 4. Criação de Ativos
- **[@Video-Maker](agent://video-maker):** Com a copy aprovada, utiliza a **Higgsfield API** para gerar os vídeos persuasivos para os anúncios.
- **[@Designer-Webmaster](agent://designer-webmaster):** Constrói a página de vendas real otimizada para conversão e mobile.

### 5. Distribuição e Tráfego
- **[@Gestor-Meta-Ads](agent://gestor-meta-ads):** Pega os vídeos criados, a copy aprovada e o link da página, enviando tudo diretamente para o gerenciador de anúncios através da **Meta Business API**.

---

## 🗂️ Estrutura de Diretórios
```
alavanca-ai-core/
├── agents/            # Contém os arquivos agent.md de cada membro da equipe
│   ├── ceo/
│   ├── alavanca-ceo/
│   ├── minerador/
│   ├── copywriting/
│   ├── revisor/
│   ├── designer-webmaster/
│   ├── video-maker/
│   └── gestor-meta-ads/
├── skills/            # Funcionalidades e APIs complementares
│   ├── minerador-skill/
│   └── video-maker-skill/
├── claude.md          # Regras operacionais do assistente de IA local
└── README.md          # Documentação central do projeto
```

> **Nota Histórica:** Inicialmente havia um agente de SEO, mas ele foi removido do MVP para garantir foco absoluto em escala via Tráfego Pago e automação de anúncios.
