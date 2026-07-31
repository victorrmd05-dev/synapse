# WORKER — como rodar a fila da autópsia (armadilhas reais)

> **Este arquivo NÃO entra em prompt nenhum.** O `syncAgents` só lê `AGENTS.md`,
> `SOUL.md`, `TOOLS.md`, `SKILL.md`, `HEARTBEAT.md` e `TEMPLATE.md`. Custo zero de token.

## O comando certo

```
cd "c:\Users\cerqu\Documents\Projetos_IDE\Alavanca _synapse"
C:\Python313\python.exe scripts\worker-autopsia.py
```

## ⚠️ NÃO use o venv do projeto

`venv\Scripts\python.exe` **não tem o `faster-whisper`**. O `faster_whisper 1.2.1`
está no Python **global**, `C:\Python313\python.exe`. Como `python` no PATH resolve
para o venv, digitar `python scripts/worker-autopsia.py` roda o interpretador errado.

**Por que isso enganou (28/07/2026):** os 20 downloads concluíram normalmente, porque
`job_download` só usa a biblioteca padrão. A quebra só apareceu ~40 minutos depois, no
primeiro job de transcrição: `No module named 'faster_whisper'`. Parecia que a
transcrição estava com problema — o problema era o interpretador desde o início.

Hoje o worker roda `checar_dependencias()` antes do loop e **falha na hora**, dizendo
qual Python está sendo usado e como corrigir. Se você vir essa mensagem, é isso.

## A rota só enfileira — nada acontece sem o worker

`POST /api/autopsia/criar` coleta e cria os jobs, e para. Se o worker não estiver
rodando, a fila fica intacta e a tela parece travada.

**Como diferenciar "parado" de "lento"** (a pergunta que sempre aparece):

```sql
select tipo, status, count(*), max(tentativas) from autopsia_jobs group by tipo, status;
```

`pegar_job()` incrementa `tentativas` no instante em que trava o job. Então:
- `tentativas = 0` e `iniciado_em` nulo em **todos** → ninguém consumiu. O worker não
  está rodando. Não é lentidão.
- `status = processando` com `iniciado_em` preenchido → está trabalhando de verdade.

## A ordem da fila: baixa TUDO primeiro, depois processa

`pegar_job()` pega o mais antigo (`criado_em.asc`). Os jobs de `download` nascem todos
juntos quando você aperta o botão; os de `frames` e `transcrever` só nascem quando cada
download termina, então têm `criado_em` posterior e **entram atrás de todos os downloads**.

Isso é proposital: as URLs do CDN do Facebook expiram (o código trata `403/410` com
"URL do CDN expirada — recoletar o anunciante"). Parar para transcrever no meio deixaria
os links restantes morrerem enquanto o Whisper trabalha.

## Tempo esperado (medido em 28/07/2026, 20 criativos)

- **Download:** ~28s por arquivo, variando de 4s a 91s conforme o tamanho. Serial.
- **Frames + Whisper:** a parte lenta de verdade, roda na CPU local.

O worker processa **um job por vez**. Como o download é limitado por rede (baixar do CDN
+ subir pro Storage), rodar 4–5 em paralelo cortaria essa fase para ~1/3. Não foi feito.

## Reprocessar jobs que falharam

Depois de corrigir a causa, devolva para a fila:

```sql
update autopsia_jobs
set status='pendente', tentativas=0, erro=null, iniciado_em=null
where status in ('erro','processando');
```

`MAX_TENTATIVAS = 3` — depois disso o job vai para `erro` e não volta sozinho.
