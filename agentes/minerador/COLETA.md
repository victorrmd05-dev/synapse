# COLETA — como buscar anúncios (armadilhas reais)

> **Este arquivo NÃO entra em prompt nenhum.** O `syncAgents` só lê `AGENTS.md`,
> `SOUL.md`, `TOOLS.md`, `SKILL.md`, `HEARTBEAT.md` e `TEMPLATE.md`. Documentação
> aqui custa zero token. É memória de erro — leia antes de minerar na mão.

Registrado em 28/07/2026, depois de errar as três coisas abaixo numa sessão só.

---

## 1. Use ScrapeCreators, NÃO a API da Biblioteca de Anúncios do Meta

A API oficial (`ads_library_search`) devolve só metadado: id, página, título do link e
data. **Não devolve imagem, vídeo nem o corpo da copy.** Anúncio minerado por ela entra
no banco sem miniatura e o card do dashboard aparece quebrado.

O caminho certo é o mesmo que `/api/mineracao/run` usa:

```
GET https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads
    ?query=<termo>&country=BR&status=ACTIVE&trim=false
Header: x-api-key: $SCRAPE_CREATORS_API_KEY
```

## 2. ⚠️ O campo da resposta é `searchResults` — não `results`

Este endpoint responde `HTTP 200`, `success: true`, cobra o crédito e devolve:

```json
{ "success": true, "credits_remaining": 7037, "searchResults": [ … ] }
```

Ler `data.results` devolve `undefined` → array vazio → **"0 anúncios" sem erro nenhum**.
Parece que a API quebrou ou que a busca não achou nada. Não é: é o nome do campo.

O endpoint de empresa é **diferente** e usa `results`:

```
GET .../v1/facebook/adLibrary/company/ads?pageId=<id>&trim=false   → data.results
```

Ou seja: **os dois endpoints usam nomes de campo diferentes.** Confira qual você está
chamando.

### O `page_id` tem que vir do ScrapeCreators, não do Meta

`company/ads` devolveu `results: []` para 5 páginas seguidas — mas o problema não era o
endpoint: eu estava passando `page_id` obtido da **API da Biblioteca do Meta**, que não
casa com o que o ScrapeCreators indexa. Com o `page_id` que veio do próprio
`search/ads`, o mesmo endpoint devolveu de 3 a 30 anúncios por página, normalmente.

**Regra:** o `page_id` gravado em `ads_minerados` só serve para a autópsia se tiver sido
coletado pelo ScrapeCreators. Anúncio inserido à mão a partir da API do Meta tem
`page_id` inútil para o `/api/autopsia/criar`.

## 3. A mídia mora em `snapshot.cards[]`, não em `snapshot.images`

A maioria dos anúncios é carrossel. Use os helpers de `src/lib/minerador-media.ts`
(`pickThumbnail`, `pickVideos`, `pickImages`), que olham `images`, `extra_images`,
`videos`, `extra_videos` **e** `cards`. Campos: `original_image_url`,
`resized_image_url`, `video_hd_url`, `video_sd_url`, `video_preview_image_url`.

---

## 4. Ordenar só por tempo no ar traz comércio local

Foi o que aconteceu: o topo do ranking veio com pizzaria, lavanderia, doceria e clínica
— todos com 500+ dias no ar. Negócio local anuncia para sempre e nunca desliga, então
longevidade sozinha **não** separa oferta escalável de padaria da esquina.

Filtre por destino antes de ranquear por tempo:
- checkout digital: `hotmart|kiwify|monetizze|ticto|braip|cakto|kirvano|perfectpay|eduzz|greenn|lastlink|pepper`
- loja física: URL com `/product/` ou `/products/`
- descarte: link para perfil do Instagram, telefone/WhatsApp local, "faça seu orçamento"

## 5. Queries genéricas trazem lixo

`"curso"`, `"manual"`, `"guia passo a passo"` devolveram quase nada de útil. O que
funcionou foi **nome do produto no nicho**: `receitas de bolo no pote`,
`salgados para vender`, `croche passo a passo`, `adestramento em casa`,
`marmita fit congelada`, `acesso vitalicio`.

Rode 5–6 queries de nicho, junte tudo, deduplique por página e só então ranqueie.
