# Regras de Interação e Diretrizes (Claude)

Este documento define as regras fundamentais de comportamento e operação para o assistente de IA ao atuar no repositório e ambiente do `alavanca-ai-core`.

## 1. Regras de Idioma (CRÍTICO)
*   **Comunicação no Chat e Planos:** Toda conversa, explicação, dúvidas e **qualquer Plano de Implementação (Implementation Plan) ou relatórios gerados para o usuário** devem ser escritos **sempre em Português do Brasil (pt-BR)**. O usuário precisa entender perfeitamente o que está sendo planejado e discutido.
*   **Criação de Arquivos do Paperclip (Paperclip as Code):** APENAS os arquivos que serão lidos pela IA do Paperclip, ou seja, as configurações de agentes (`agent.md`), instruções de habilidades (`SKILL.md`) e prompts internos, devem ser gerados **estritamente em Inglês**. Isso garante a máxima performance dos modelos de linguagem.

## 2. Arquitetura e Padrões (Alavanca AI Blueprint)
*   **Protocolo de Agentes:** Ao escrever instruções que envolvam comunicação ou delegação entre agentes, utilize sempre o protocolo interno de links no formato markdown: `[@Nome do Agente](agent://nome-da-pasta)`.
*   **Respeito à Hierarquia:** Mantenha as responsabilidades isoladas. Exemplo: O `ceo` orquestra via Telegram, o `minerador` coleta dados com APIs, e o `copywriting` escreve. Não misture as funções ao criar ou atualizar seus respectivos `agent.md` ou `SKILL.md`.
*   **Formatos Padronizados:** 
    *   Arquivos de agente sempre se chamam `agent.md`.
    *   Arquivos de skill sempre se chamam `SKILL.md` e devem iniciar com Frontmatter YAML contendo `name` e `description`.

## 3. Foco do Negócio
*   **Objetivo Principal:** A Alavanca AI busca geração de caixa rápido no Brasil via infoprodutos, VSLs e dropshipping de alta performance. Todo código gerado, integrações sugeridas (Supabase, Scrape Creators API, Higgsfield, Meta Ads) e processos desenhados devem focar na escala, conversão e automação.
*   **Qualidade:** Operações de cópia e design devem embutir gatilhos de conversão e respeitar políticas de conformidade (evitar bloqueios no Meta/Google Ads).
