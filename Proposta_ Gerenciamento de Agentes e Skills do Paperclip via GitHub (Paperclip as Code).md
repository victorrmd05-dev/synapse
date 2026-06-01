# Proposta: Gerenciamento de Agentes e Skills do Paperclip via GitHub (Paperclip as Code)

## Introdução
Gerenciar agentes e skills do Paperclip através de um repositório centralizado no GitHub, seguindo o conceito de "Paperclip as Code", oferece vantagens significativas em termos de versionamento, colaboração, automação e portabilidade. Esta abordagem permite que você edite as definições de agentes e skills usando suas ferramentas de desenvolvimento preferidas (IDEs, IAs) e sincronize essas mudanças automaticamente com sua instância do Paperclip.

## Estrutura de Repositório GitHub Recomendada
Para uma organização eficiente e escalável, sugiro a seguinte estrutura de diretórios no seu repositório GitHub:

```text
/alavanca-ai-config/
├── agents/                   # Contém as definições dos agentes (agents.md ou similar)
│   ├── minerador/            # Pasta para o agente Minerador
│   │   └── agent.md          # O arquivo agents.md específico para o Minerador
│   ├── copywriting/          # Pasta para o agente Copywriting
│   │   └── agent.md
│   └── ...
├── skills/                   # Contém as definições das skills (SKILL.md e scripts)
│   ├── minerador-skill/      # Pasta para a skill do Minerador
│   │   ├── SKILL.md          # O arquivo SKILL.md da skill
│   │   └── scripts/          # Scripts auxiliares da skill
│   │       ├── scrape_meta_ads.py
│   │       └── process_and_save_offer.py
│   ├── common-tools-skill/   # Exemplo de skill de ferramentas comuns
│   │   └── SKILL.md
│   └── ...
├── workflows/                # (Opcional) Scripts de automação ou CI/CD
│   └── sync-paperclip.sh
└── README.md                 # Descrição geral do repositório
```

### Explicação da Estrutura:
*   **`alavanca-ai-config/`**: O diretório raiz do seu repositório. O nome deve ser descritivo para o propósito de configuração da sua "empresa AI".
*   **`agents/`**: Cada subpasta dentro de `agents/` representa um agente específico. O arquivo `agent.md` (ou outro nome de sua escolha, como `instructions.md`) conterá o perfil e as instruções detalhadas para aquele agente.
*   **`skills/`**: Cada subpasta aqui é uma skill individual, contendo seu `SKILL.md` e, se necessário, uma pasta `scripts/` com os arquivos de código associados.
*   **`workflows/`**: Esta pasta é opcional, mas altamente recomendada para scripts de automação que farão a ponte entre o GitHub e sua instância do Paperclip.

## Fluxo de Trabalho para Agentes e Skills

### 1. Gerenciamento de Skills
Conforme já fizemos com o Minerador, as skills são importadas no Paperclip apontando para a URL do repositório GitHub (ex: `https://github.com/seu-usuario/alavanca-ai-config/tree/main/skills/minerador-skill`). O Paperclip reconhecerá automaticamente o `SKILL.md` e a pasta `scripts/`.

### 2. Gerenciamento de Agentes (`agent.md`)
O Paperclip permite que você defina as instruções de um agente de duas maneiras principais:
*   **Diretamente na UI**: Você cola o texto do `agent.md` no campo de instruções do agente na interface do Paperclip.
*   **Via `instructionsFilePath`**: Para uma sincronização mais robusta, o Paperclip suporta a configuração de um `instructionsFilePath` para cada agente. Este caminho deve apontar para o arquivo `agent.md` (ou similar) no sistema de arquivos da sua VPS onde o repositório GitHub foi clonado.

## Mecanismo de Sincronização (CI/CD Simplificado)
Para que as edições feitas no GitHub sejam refletidas automaticamente na sua instância do Paperclip (hospedada no Coolify), você pode implementar um fluxo de CI/CD simplificado:

1.  **Clonar o Repositório na VPS**: O repositório `alavanca-ai-config` deve ser clonado em um local acessível na sua VPS (ex: `/opt/paperclip-config/`).

    ```bash
    git clone https://github.com/seu-usuario/alavanca-ai-config.git /opt/paperclip-config
    ```

2.  **Configurar Webhook do GitHub**: Configure um webhook no seu repositório GitHub para disparar um evento (ex: `push`) para um endpoint na sua VPS. Este endpoint pode ser um script simples que executa um `git pull`.

    ```bash
    # Exemplo de script (sync-paperclip.sh)
    #!/bin/bash
    cd /opt/paperclip-config
    git pull origin main

    # (Opcional) Se o Paperclip CLI suportar, atualizar as instruções do agente
    # paperclipai agent update --id <agent-id> --instructions-file /opt/paperclip-config/agents/minerador/agent.md
    ```

3.  **Atualização de Agentes**: Para os agentes, você pode:
    *   **Manual**: Copiar e colar o conteúdo do `agent.md` atualizado para a UI do Paperclip (menos ideal para automação).
    *   **`instructionsFilePath`**: Configurar cada agente no Paperclip para usar o `instructionsFilePath` apontando para o arquivo `agent.md` clonado na VPS (ex: `/opt/paperclip-config/agents/minerador/agent.md`). Desta forma, um `git pull` já atualiza as instruções.
    *   **Paperclip CLI (Futuro/Avançado)**: Se o `paperclipai cli` evoluir para permitir a atualização de instruções de agentes a partir de um arquivo local via linha de comando, você pode incluir esse comando no seu script de sincronização (`sync-paperclip.sh`).

## Benefícios Desta Abordagem
*   **Controle de Versão**: Todas as alterações nas definições de agentes e skills são rastreadas pelo Git, permitindo reverter para versões anteriores se necessário.
*   **Colaboração**: Múltiplos membros da equipe podem trabalhar nas definições de agentes e skills, usando o fluxo de trabalho padrão do Git (branches, pull requests, reviews).
*   **Edição Flexível**: Use qualquer IDE ou ferramenta de IA para editar os arquivos Markdown e Python, aproveitando recursos como realce de sintaxe e autocompletar.
*   **Automação**: Reduz a necessidade de intervenção manual para atualizar as configurações no Paperclip.
*   **Backup e Recuperação**: Seu repositório GitHub serve como um backup centralizado de todas as suas configurações de agentes e skills.
*   **Portabilidade**: Facilita a migração de suas configurações para novas instâncias do Paperclip ou ambientes de desenvolvimento.

## Considerações e Limitações
*   **`instructionsFilePath`**: Embora seja a melhor opção para agentes, verifique se sua versão do Paperclip suporta essa funcionalidade e como configurá-la via UI ou CLI.
*   **Webhooks**: A configuração de webhooks e scripts na VPS requer conhecimento de administração de sistemas.
*   **Credenciais**: Certifique-se de que as chaves de API (Scrape Creators, Supabase) sejam gerenciadas de forma segura como variáveis de ambiente na sua instância do Paperclip, e não diretamente nos arquivos do repositório.

Esta abordagem de "Paperclip as Code" é uma excelente maneira de profissionalizar o gerenciamento da sua "empresa AI" e garantir que suas operações sejam robustas e escaláveis. O que você acha desta proposta?
