# Arquitetura de Comunicação: Painel vs Paperclip (VPS)

**Data de Registro:** 04 de Junho de 2026
**Contexto:** Como o painel de controle (Next.js) se comunica com os agentes do Paperclip hospedados em uma VPS na Hostinger.

## O Modelo Event-Driven (Orientado a Eventos via Supabase)

O Paperclip e o Painel de Controle são dois sistemas fisicamente separados, mas eles compartilham o mesmo banco de dados: o **Supabase**. Essa é a ponte de comunicação entre eles.

Em vez de enviarmos comandos diretos via terminal para a VPS, utilizamos uma arquitetura orientada a eventos. O fluxo funciona da seguinte maneira:

1. **Gatilho (No Painel):** O usuário aprova um produto ou inicia uma ação no dashboard. O painel cria ou atualiza um registro em uma tabela de workflow no Supabase (ex: insere um registro na `workflow_copywriting`).
2. **Armazenamento (Na Nuvem):** O Supabase recebe e guarda essa informação instantaneamente.
3. **Escuta (Na VPS Hostinger):** A plataforma Paperclip, que roda 24/7 na VPS, fica "escutando" as alterações no banco de dados. Ao detectar um novo registro pendente, ela acorda o agente correspondente (ex: Agente 04 - Copywriting).
4. **Execução (Na VPS Hostinger):** O agente processa a tarefa (ex: escreve a copy) localmente na VPS.
5. **Devolução (Na Nuvem):** O agente finaliza o trabalho e atualiza a linha no Supabase (ex: preenche a coluna `conteudo_texto` e muda o status, se aplicável).
6. **Atualização Visual (No Painel):** O nosso painel, que também monitora o Supabase em tempo real, detecta a mudança e atualiza a interface para o usuário (ex: exibe a copy pronta para o Revisor dar o "ok").

## Vantagens dessa Arquitetura
* **Segurança:** Não é necessário expor APIs na VPS ou abrir portas SSH para o painel.
* **Resiliência:** Se o painel cair, o Paperclip continua trabalhando. Se o Paperclip cair, o trabalho fica na fila do Supabase até ele voltar.
* **Escalabilidade:** O Supabase lida perfeitamente com a concorrência e o tempo real.

**Ação de Correção em Caso de Erro:**
Se houver falha de comunicação, verifique:
- Se as chaves do Supabase no `.env` do Paperclip (na VPS) e no `.env` do painel são as mesmas.
- Se os agentes do Paperclip estão configurados para monitorar a tabela exata e as colunas exatas que o painel está modificando.
