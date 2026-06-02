# Regras de Interação e Diretrizes (Claude)

Este documento define as regras fundamentais de comportamento e operação para o assistente de IA ao atuar no repositório e ambiente do `alavanca-ai-core`.

## 1. Regras de Idioma (CRÍTICO)
*   **Comunicação no Chat e Planos:** Toda conversa, explicação, dúvidas e **qualquer Plano de Implementação (Implementation Plan) ou relatórios gerados para o usuário** devem ser escritos **sempre em Português do Brasil (pt-BR)**. O usuário precisa entender perfeitamente o que está sendo planejado e discutido.
*   **Criação de Arquivos do Paperclip (Paperclip as Code):** APENAS os arquivos que serão lidos pela IA do Paperclip, ou seja, as configurações de agentes (`agent.md`), instruções de habilidades (`SKILL.md`) e prompts internos, devem ser gerados **estritamente em Inglês**. Isso garante a máxima performance dos modelos de linguagem.

## 2. Arquitetura e Padrões (Alavanca AI Blueprint)

### ⛔ REGRA OBRIGATÓRIA DE FORMATAÇÃO — NUNCA IGNORAR ⛔
**TODO arquivo `agent.md` e `SKILL.md` DEVE começar com a linha literal ` ```markdown ` na primeira linha do arquivo.** Isso é OBRIGATÓRIO para o Paperclip renderizar o conteúdo corretamente. Se você criar ou editar qualquer `agent.md` ou `SKILL.md` sem essa linha no topo, o arquivo vai quebrar na interface do Paperclip. **NUNCA remova essa linha. NUNCA esqueça de adicioná-la. Sem exceções.**

Exemplo correto (primeira linha do arquivo):
```
```markdown
# Nome do Agente
## Role
...
```

*   **Protocolo de Agentes:** Ao escrever instruções que envolvam comunicação ou delegação entre agentes, utilize sempre o protocolo interno de links no formato markdown: `[@Nome do Agente](agent://nome-da-pasta)`.
*   **Respeito à Hierarquia:** Mantenha as responsabilidades isoladas. Exemplo: O `ceo` orquestra via Telegram, o `minerador` coleta dados com APIs, e o `copywriting` escreve. Não misture as funções ao criar ou atualizar seus respectivos `agent.md` ou `SKILL.md`.
*   **Formatos Padronizados:** 
    *   Arquivos de agente sempre se chamam `agent.md` e DEVEM iniciar com ` ```markdown ` na primeira linha.
    *   Arquivos de skill sempre se chamam `SKILL.md` e DEVEM iniciar com ` ```markdown ` na primeira linha, seguido do Frontmatter YAML contendo `name` e `description`.

## 3. Foco do Negócio
*   **Objetivo Principal:** A Alavanca AI busca geração de caixa rápido no Brasil via infoprodutos, VSLs e dropshipping de alta performance. Todo código gerado, integrações sugeridas (Supabase, Scrape Creators API, Higgsfield, Meta Ads) e processos desenhados devem focar na escala, conversão e automação.
*   **Qualidade:** Operações de cópia e design devem embutir gatilhos de conversão e respeitar políticas de conformidade (evitar bloqueios no Meta).

## 4. Fluxo de Trabalho dos Agentes (Arquitetura Centrada no Supabase)
A comunicação da equipe funciona através de gatilhos do CEO e armazenamento central no Supabase:
1. **Telegram/Hermes**: O Usuário se comunica via Telegram, enviando a mensagem que aciona o **[@CEO](agent://ceo)**.
2. **Orquestração**: O **[@Alavanca CEO](agent://alavanca-ceo)** recebe a diretriz e aciona o **[@Minerador](agent://minerador)** para raspar as ofertas de produtos via API e salvar as informações.
3. **Escrita**: O **[@Copywriting](agent://copywriting)** recebe a oferta, escreve a copy da página de vendas e anúncios, e **salva no Supabase**.
4. **Revisão e Aprovação**: O **[@Revisor](agent://revisor)** recupera o texto do Supabase, revisa a persuasão/conformidade, e atualiza o status para 'Aprovado' no banco. O Alavanca CEO pede o "OK" final do Usuário.
5. **Produção (Paralela)**: Após o OK do usuário, o Alavanca CEO dispara o gatilho:
   - O **[@Designer-Webmaster](agent://designer-webmaster)** puxa a copy do Supabase, cria a página, publica e **salva a URL no Supabase**.
   - O **[@Video-Maker](agent://video-maker)** puxa a copy do Supabase, gera criativos via API do Higgsfield e **salva os links dos vídeos no Supabase**.
6. **Publicação do Anúncio**: Ao receber o gatilho, o **[@Gestor-Meta-Ads](agent://gestor-meta-ads)** recupera o pacote completo (Copy, URL da Landing Page e Vídeos) diretamente do Supabase e sobe as campanhas via Meta Business API.
