# Alavanca AI Metascale (Paperclip as Code)
Sistema SaaS de análise de campanhas Meta Ads e Central de Operações de Agentes (Paperclip).

## 🚀 Diretrizes de Elite
- **Motor**: Next.js 14 App Router, Tailwind, Supabase (Banco de Dados + Realtime), Anthropic API.
- **Boil the Lake**: Completude absoluta, sem atalhos. Rigor em arquitetura e edge cases.
- **Segurança (CSO)**: Zero chaves hardcoded, `.env` blindado, atenção a Prompt Injections e manipulações.
- **Design (CEO)**: Padrão Elite UI. Cores restritas, foco utilitário, nada de AI Slop.
- **Skill Associada**: [[🧠 Skill_GStack_Executive_Suite]]

## 🏗️ Arquitetura e Estrutura (Monorepo)
- O repositório é um **monorepo único**. Todo o dashboard e arquivos de configuração vivem na raiz do projeto. Não recriar pastas isoladas como `workspace/metascale` ou subpastas `paperclip`.
- **Workflow**: A pipeline de aprovação e trânsito dos agentes é gerida via tabelas do Supabase (ex: `ads_minerados`), aproveitando o Realtime.

## 🤖 Paperclip as Code & Agentes
- **Regra de Formatação CRÍTICA**: Todo arquivo `agent.md` e `SKILL.md` **DEVE** começar estritamente com a linha literal ` ```markdown ` na primeira linha do arquivo. Isso é obrigatório para o parser.
- **Padrão de Referência de Agentes**: SEMPRE referencie outros agentes nos arquivos `agent.md` e `SKILL.md` usando a notação estrita `[@NomeDoAgente](agent://nome-do-agente)`. (Exemplo: `[@Minerador](agent://minerador)` ou `[@Alavanca CEO](agent://alavanca-ceo)`). NUNCA use caminhos locais de arquivo.
- **Supabase MCP**: O servidor exige que o arquivo `.mcp.json` fique estritamente **na raiz** do projeto.

## 📡 Integrações Ativas
- **Mineração**: API ScrapeCreators (Facebook Ad Library).
- **Notificações**: Alertas e operações são roteados para o CTO via Telegram (HermesClipBot), separando fluxos de contexto.

## 🛡️ Configuração do Repositório (Git)
- **Conta**: Thuglife22741 (fernandoborgescerqueira@gmail.com)
- **Repositório Exclusivo**: https://github.com/Thuglife22741/alavanca-ai-metascale
- **NUNCA suba para outro repositório.** O token do GitHub (GITHUB_TOKEN) está guardado de forma segura no `.env.local`.
