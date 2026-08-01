# Achados da chamada real — WaveSpeed (31/07/2026)

> Task 1 do plano `2026-07-31-video-wavespeed.md`, executada pelo Fernando com
> crédito real. Estes números são a entrada obrigatória das Tasks 3, 4 e 5.

## Confirmado

| | |
|---|---|
| Caminho do modelo (text-to-video) | `openai/sora-2/text-to-video` |
| Tempo até `completed` | **135,8s** para um clipe de **4s** (~34× o tempo real) |
| Saldo depois | US$ 5,20 |

**Corpo que funcionou:**

```json
{
  "prompt": "golden retriever running on a beach at sunset, cinematic",
  "duration": 4
}
```

Ou seja: a chave de duração é `duration` — o palpite do plano estava certo.

## 🚨 O achado que muda o desenho: o MODO está no CAMINHO

O spec dizia que `image_url` opcional decidiria entre image-to-video e
text-to-video **no mesmo modelo**. Está errado. O caminho confirmado termina em
`/text-to-video` — image-to-video é **outro caminho** (`openai/sora-2/image-to-video`
ou similar), com corpo possivelmente diferente.

**Consequência para a implementação:** a rota não pode mandar `image` para o
endpoint de text-to-video e torcer. Ela tem que **escolher o caminho pelo modo**:

```
sem image_url → WAVESPEED_MODEL       (confirmado: openai/sora-2/text-to-video)
com image_url → WAVESPEED_MODEL_I2V   (NÃO CONFIRMADO — ver pendências)
```

E se `WAVESPEED_MODEL_I2V` não estiver configurado, **falhar com erro claro** em vez
de mandar para o endpoint errado. Silêncio aqui custaria uma geração paga jogada fora.

## Ainda NÃO confirmado

| O quê | Impacto | Como resolver |
|---|---|---|
| **Custo por clipe** | `estimarCustoUsd()` devolve `null` → a tela mostra "custo desconhecido" | falta o saldo **antes** (só temos o depois: US$ 5,20) |
| **Caminho do image-to-video** | o modo com imagem não funciona | conferir na página do modelo |
| **Chave da imagem no corpo** | idem | idem |
| **A URL de `outputs[0]` expira?** | se expirar rápido, o worker tem que ser mais agressivo | reabrir a URL daqui a algumas horas |

O código trata o custo desconhecido de propósito: `estimarCustoUsd` devolve `null`
e a tela escreve "custo desconhecido — modelo fora da tabela de preços". Mostrar
`US$ 0,0000` faria aprovar um gasto achando que é de graça.

## Observação sobre a escolha do modelo

**Sora 2 é premium.** O plano pedia "barato e rápido" para a validação, e o Sora é
provavelmente o mais caro da plataforma. Para validar o encanamento tanto faz — mas
com 3 prompts por campanha, a conta cresce rápido. Vale medir o custo real antes de
gerar em série, e considerar um modelo mais barato como padrão de trabalho,
deixando o Sora para o criativo que vai de fato subir.

**135,8s para 4s de vídeo** confirma a decisão de arquitetura: não cabe em route
handler. É fila + worker, como planejado. Intervalo de consulta de 15s dá ~9
consultas por clipe — folgado.
