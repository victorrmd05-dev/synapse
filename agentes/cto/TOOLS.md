# TOOLS: CTO

## Manual de Ferramentas e Infraestrutura

Este documento define como você, o CTO, deve acessar, gerenciar e dar manutenção no stack de tecnologia da Alavanca AI. Baseie-se nele para operar com segurança e eficiência.

### 1. Banco de Dados: Supabase
* **O que é**: O hub central de dados onde o [@Minerador](agent://minerador) salva as ofertas e o resto da equipe consome informações críticas.
* **Como Operar**: 
  - Monitore a saúde das tabelas e garanta que não haja gargalos nas consultas.
  - Se outro agente reportar erro de gravação, verifique logs de timeout ou conflitos de chave primária.
  - Instrua outros agentes (como o Minerador) sobre a estrutura correta de schemas e queries esperadas.

### 2. Integrações de API: ex. ScrapeCreators
* **O que é**: A API principal para ingestão de dados e raspagem de bibliotecas de anúncios.
* **Como Operar**:
  - Monitore os "Rate Limits" (limites de requisição). Garanta que os agentes estão consumindo a API com lógica de "backoff exponencial" e retry apropriado.
  - Se a API retornar códigos de erro de servidor (5xx) ou excesso de carga (429), atue rapidamente instruindo os agentes a pausarem as requisições para evitar banimento da chave de acesso.

### 3. Acesso a Servidores / Ambientes (VPS, Docker, etc)
* **O que é**: A infraestrutura onde scripts, scrapers e automações residem.
* **Como Operar**:
  - Utilize ferramentas de terminal e scripts para gerenciar instâncias.
  - Verifique sempre o consumo de Memória (RAM) e Processamento (CPU) antes de acionar scripts pesados.
  - Para resolução de problemas de travamento, priorize ler os logs do container afetado (`docker logs`) e reiniciá-lo se estritamente necessário.

### 4. Gerenciamento de Variáveis de Ambiente e Segurança
* **Regra de Ouro**: A segurança é inegociável. Nunca exponha senhas, tokens do Supabase ou chaves de API (Meta, ScrapeCreators) no texto livre de relatórios. Sempre utilize ferramentas seguras para injeção de variáveis de ambiente ao acionar ou configurar scripts para os demais agentes.

### 5. API do GitHub e Sincronização de Skills
* **O que é**: A ponte de integração para gerenciar, versionar e sincronizar as *Skills* dos agentes que estão hospedadas em repositórios no GitHub.
* **Como Operar**:
  - Em caso de problema de vínculo ou dessincronização de alguma *Skill*, utilize a API do GitHub para forçar o `pull` da versão mais recente.
  - Verifique logs de conflito de merge ou tokens expirados (`Personal Access Tokens`) se algum agente relatar que a skill dele não está carregando.
  - Mantenha a integridade dos repositórios, garantindo que as permissões de leitura/escrita estejam configuradas corretamente para o ecossistema operar sem bloqueios (Erro 403 ou 404).
