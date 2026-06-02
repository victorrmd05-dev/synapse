# Alavanca AI Core (Paperclip as Code)

Este repositório serve como o "cérebro" e a infraestrutura como código (Infrastructure as Code) para a agência **Alavanca AI**, operando dentro do ecossistema do Paperclip.

## 🧠 Filosofia Principal
- **Paperclip as Code:** O GitHub é a fonte da verdade. Todas as lógicas, prompts e conexões entre agentes nascem aqui e são sincronizadas para o Paperclip.
- **Protocolo Interno (`agent://`):** Para que um agente invoque ou delegue tarefas a outro nativamente no Paperclip, utilizamos **sempre** o formato markdown `[@Nome do Agente](agent://nome-da-pasta)`. Nunca usar URLs absolutas (`https://...`).
- **Modularidade (Fim do foco apenas em VSL):** O sistema agora é preparado para lidar com múltiplos formatos (Advertoriais, Landing Pages, Shorts, Imagens, Vídeos Longos), orquestrados através de um robusto banco de dados relacional.

---

## ⚙️ Fluxo de Trabalho e Arquitetura (Integração Supabase)

O coração do Alavanca AI roda 100% integrado ao Supabase. Todo o processo criativo flui através de 5 tabelas centrais (`setup_supabase_workflow.sql`):

1. **`ads_minerados` e `campanhas_producao`:** 
   O **[@Minerador](agent://minerador)** busca anúncios validados na ScrapeCreators API, pontua a qualidade com IA e salva em `ads_minerados`. Quando aprovado pelo usuário, ele ganha uma linha na tabela-mestre `campanhas_producao`.
2. **`workflow_copywriting`:** 
   O **[@Copywriting](agent://copywriting)** escreve roteiros e textos e submete para avaliação. O **[@Revisor](agent://revisor)** audita e marca `revisor_ok = true`.
3. **`workflow_design` e `workflow_video`:** 
   O **[@Designer-Webmaster](agent://designer-webmaster)** e o **[@Video-Maker](agent://video-maker)** geram as mídias finais usando as copys aprovadas. O Revisor faz o pente fino e aprova as URLs finais para uso.
4. **`workflow_relatorios_trafego` (Auto-Evolução):** 
   O **[@Gestor-Meta-Ads](agent://gestor-meta-ads)** sobe as campanhas no Meta e, posteriormente, injeta relatórios de performance (JSONB) no banco. A IA lê esses dados para extrair insights reais e ficar mais inteligente a cada campanha.

---

## 🗂️ Estrutura de Diretórios
```
alavanca-ai-core/
├── agents/             # Arquivos agent.md de cada membro da equipe
├── skills/             # Funcionalidades, integrações e scripts (Minerador, Vídeo, etc.)
├── banco_de_dados/     # Scripts .sql para recriar as tabelas e políticas do Supabase
├── documentacao/       # Notas de design, manuais técnicos e log de resolução de bugs
├── claude.md           # Regras operacionais rígidas e core do assistente de IA local
└── README.md           # Documentação central do projeto
```

## 🔒 Segurança e Versionamento
O projeto possui um `.gitignore` em formato de *allow-list*. 
**Apenas as pastas `agents/`, `skills/` e arquivos estritamente de documentação sobem para o repositório público/privado.** Tokens de API, chaves do Supabase (`.mcp.json`) e outras informações sensíveis da máquina do usuário são rigorosamente ignoradas para evitar vazamento de dados.
