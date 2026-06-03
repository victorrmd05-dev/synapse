# Bug do Paperclip com Skills do GitHub (Arquivos `.py` não carregam)

## O Problema
Ao importar skills complexas via URL do GitHub (como a `minerador-skill` que possui uma pasta `scripts/` com arquivos `.py`), o Paperclip apresenta um bug onde não consegue mapear ou ler os arquivos secundários e subpastas corretamente. 

Como consequência, o agente só consegue ler o arquivo principal (`SKILL.md`) e não tem acesso ao script Python real. Isso faz com que a etapa onde a IA avalia o anúncio seja pulada, deixando os campos de pontuação no Supabase (`score_escala`, `categoria_ia`, `notas_ia`) vazios (nulos).

## Soluções

### Solução 1: Caminho Local na VPS (Recomendado)
Em vez de usar a URL do GitHub no painel do Paperclip, adicione a skill apontando para o caminho físico absoluto onde o repositório foi clonado na máquina ou VPS que está rodando o Paperclip.
- **Exemplo:** `/root/alavanca-ai-core/skills/minerador-skill` ou `/home/ubuntu/alavanca-ai-core/skills/minerador-skill`
Dessa forma, o Paperclip lê o diretório diretamente do sistema de arquivos e o Agente consegue enxergar a pasta inteira e os scripts sem problemas.

### Solução 2: Embutir o Código no SKILL.md (Fallback)
Se for estritamente necessário usar a URL do GitHub para sincronização remota e o bug persistir:
1. Edite o arquivo `SKILL.md` da skill no repositório.
2. Copie o conteúdo inteiro do script Python (ex: `process_and_save_offer.py`) e cole dentro do próprio `SKILL.md` dentro de um bloco de código.
3. Adicione uma nova instrução na skill para o Agente: *"Crie este script Python em um arquivo temporário na máquina local e depois o execute"*.
Dessa forma, o Paperclip fará o download de apenas um único arquivo via GitHub, mas o Agente terá todo o código fonte de que precisa para escrever e executar o script com sucesso na VPS.
