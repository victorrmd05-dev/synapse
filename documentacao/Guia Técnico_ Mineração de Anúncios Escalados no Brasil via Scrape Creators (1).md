# Guia Técnico: Mineração de Anúncios Escalados no Brasil via Scrape Creators

> **Projeto:** Alavanca AI Core  
> **Agente responsável:** Minerador (`agent://minerador`)  
> **Última atualização:** Junho/2026  
> **Fonte oficial:** https://docs.scrapecreators.com

---

## 1. Visão Geral do Fluxo de Mineração

A mineração de anúncios escalados baseia-se em dois pilares: **Volume de Impressões** e **Collation Count** (contagem de duplicações). Anúncios com alto investimento tendem a ter múltiplas versões rodando simultaneamente para testar públicos ou manter o alcance.

### Fluxo do Minerador

```
[Minerador] → API ScrapeCreators (busca por keyword)
     ↓
Filtra por collation_count > 10 + is_active = true
     ↓
Mapeia JSON → Colunas do Supabase
     ↓
Upsert na tabela `ads_minerados`
     ↓
Calcula score_escala e categoria_ia
     ↓
Notifica Alavanca CEO via Supabase
```

---

## 2. Endpoints da API

### 2.1 Busca por Keyword (endpoint principal)

```
GET /v1/facebook/adLibrary/search/ads
```

**Autenticação:** Header `x-api-key: SUA_API_KEY`

**Custo:** 1 crédito por requisição (retorna ~30 resultados por página)

**Limite:** Máximo ~1.500 resultados via GET. Para mais, usar POST com params no body.

#### Parâmetros

| Parâmetro | Tipo | Obrigatório | Valores | Descrição |
|:---|:---|:---|:---|:---|
| `query` | string | ✅ Sim | — | Keyword de busca (ex: "oferta", "frete grátis") |
| `country` | string | Não | Código 2 letras, ex: `BR` | País. Default: `ALL` |
| `sort_by` | string | Não | `total_impressions`, `relevancy_monthly_grouped` | Ordenação. Default: `total_impressions` |
| `status` | string | Não | `ALL`, `ACTIVE`, `INACTIVE` | Filtro de status. Default: `ACTIVE` |
| `media_type` | string | Não | `ALL`, `IMAGE`, `VIDEO`, `MEME`, `IMAGE_AND_MEME`, `NONE` | Tipo de mídia. Default: `ALL` |
| `search_type` | string | Não | `keyword_unordered`, `keyword_exact_phrase` | Busca exata ou não |
| `ad_type` | string | Não | `all`, `political_and_issue_ads` | Tipo de anúncio |
| `start_date` | string | Não | `YYYY-MM-DD` | Data inicial de impressões |
| `end_date` | string | Não | `YYYY-MM-DD` | Data final de impressões |
| `cursor` | string | Não | — | Para paginação |
| `trim` | boolean | Não | `true`/`false` | Resposta reduzida |

#### Exemplo de Chamada (cURL)

```bash
curl "https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=oferta&country=BR&sort_by=total_impressions&status=ACTIVE" \
  -H "x-api-key: SUA_API_KEY"
```

#### Exemplo de Chamada (Python)

```python
import requests

response = requests.get(
    "https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads",
    headers={"x-api-key": "SUA_API_KEY"},
    params={
        "query": "oferta",
        "country": "BR",
        "sort_by": "total_impressions",
        "status": "ACTIVE",
        "media_type": "ALL"
    }
)
data = response.json()
ads = data["searchResults"]
next_cursor = data.get("cursor")
total = data.get("searchResultsCount")
```

---

### 2.2 Detalhes de um Anúncio por ID

```
GET /v1/facebook/adLibrary/ad
```

**Custo:** 1 crédito por requisição

| Parâmetro | Tipo | Descrição |
|:---|:---|:---|
| `id` | string | ID do anúncio (ad_archive_id) |
| `url` | string | URL da Ad Library (alternativa ao id) |
| `trim` | boolean | Resposta reduzida |

```bash
curl "https://api.scrapecreators.com/v1/facebook/adLibrary/ad?id=702369045530963" \
  -H "x-api-key: SUA_API_KEY"
```

---

## 3. Estrutura da Resposta JSON

### 3.1 Resposta do `/search/ads`

```json
{
  "searchResults": [
    {
      "ad_archive_id": "1378176106734781",
      "end_date": 1747638000,
      "is_aaa_eligible": false,
      "is_active": true,
      "page_id": "119749581219299",
      "page_name": "Makhumalo",
      "political_countries": [],
      "reach_estimate": null,
      "total_active_time": null,
      "spend": null,
      "start_date": 1747638000,
      "publisher_platform": ["FACEBOOK"],
      "url": "https://www.facebook.com/ads/library?id=1378176106734781",
      "start_date_string": "2025-05-19T07:00:00.000Z",
      "end_date_string": "2025-05-19T07:00:00.000Z",
      "snapshot": {
        "body": {
          "text": "This is my second pair..."
        },
        "caption": "ghemshop.com",
        "cta_text": "Shop now",
        "cta_type": "SHOP_NOW",
        "display_format": "IMAGE",
        "title": "🔥Best Seller-Last Day Sale 60% OFF🔥",
        "link_description": "🔥Best Seller-Last Day Sale 60% OFF🔥",
        "link_url": "https://www.ghemshop.com/products/buckled-square",
        "images": [
          {
            "original_image_url": "https://scontent-...",
            "resized_image_url": "https://scontent-...",
            "watermarked_resized_image_url": "",
            "image_crops": []
          }
        ],
        "videos": [],
        "cards": [],
        "extra_images": [],
        "extra_links": [],
        "extra_texts": [],
        "extra_videos": [],
        "page_id": "119749581219299",
        "page_name": "Makhumalo",
        "page_profile_picture_url": "https://scontent-...",
        "page_profile_uri": "https://www.facebook.com/61550737114480/",
        "page_categories": ["Musician"],
        "page_entity_type": "PERSON_PROFILE",
        "page_like_count": 7,
        "page_is_deleted": false,
        "page_is_profile_page": false,
        "is_reshared": false,
        "branded_content": null,
        "brazil_tax_id": null,
        "country_iso_code": null,
        "current_page_name": "Makhumalo",
        "additional_info": null,
        "ec_certificates": [],
        "root_reshared_post": null,
        "byline": null,
        "disclaimer_label": null
      }
    }
  ],
  "searchResultsCount": 50001,
  "cursor": "AQHRLKHyzb3Z..."
}
```

### 3.2 Resposta do `/ad` (Detalhes)

A resposta tem a mesma estrutura, mas com campos extras e **nomenclatura camelCase**:

| Campo `/search/ads` | Campo `/ad` | Diferença |
|:---|:---|:---|
| `ad_archive_id` | `adArchiveID` | camelCase |
| `is_active` | `isActive` | camelCase |
| `page_id` | `pageID` | camelCase |
| `start_date` | `startDate` | camelCase |
| `publisher_platform` | `publisherPlatform` | camelCase |
| — | `totalActiveTime` | Exclusivo (segundos ativo) |
| `snapshot.body.text` | `snapshot.body` (string) | ⚠️ Tipo diferente! |
| — | `snapshot.ad_creative_id` | Exclusivo |
| — | `snapshot.creation_time` | Exclusivo (timestamp) |
| — | `snapshot.instagram_actor_name` | Exclusivo |
| — | `snapshot.instagram_profile_pic_url` | Exclusivo |

> ⚠️ **CUIDADO:** No `/search/ads` o campo `body` é um **objeto** `{"text": "..."}`, mas no `/ad` é uma **string** direta. O código do Minerador DEVE tratar ambos os formatos.

---

## 4. Identificando a "Escala" nos Resultados

Ao processar o JSON de resposta, o Minerador deve focar em:

### 4.1 Critérios de Classificação

| Indicador | Campo | Regra | Classificação |
|:---|:---|:---|:---|
| Duplicações | `collation_count` | > 50 | 🔴 Altamente escalado |
| Duplicações | `collation_count` | 15–50 | 🟠 Escalado |
| Duplicações | `collation_count` | 10–15 | 🟡 Em crescimento |
| Duplicações | `collation_count` | < 10 | 🟢 Normal |
| Tempo ativo | `start_date` | > 7 dias ativo | Vencedor validado |
| Status | `is_active` | `true` | Ainda investindo |

### 4.2 Lógica de Score

```python
def calcular_score_escala(ad):
    score = 0
    
    # Collation count (peso 60%)
    cc = ad.get("collation_count", 1)
    if cc > 50:
        score += 60
    elif cc > 15:
        score += 45
    elif cc > 10:
        score += 30
    elif cc > 5:
        score += 15
    
    # Tempo ativo (peso 25%)
    if ad.get("start_date"):
        dias_ativo = (time.time() - ad["start_date"]) / 86400
        if dias_ativo > 30:
            score += 25
        elif dias_ativo > 14:
            score += 20
        elif dias_ativo > 7:
            score += 15
        elif dias_ativo > 3:
            score += 10
    
    # Formato criativo (peso 15%)
    fmt = ad.get("snapshot", {}).get("display_format", "")
    if fmt == "VIDEO":
        score += 15  # Vídeos indicam maior investimento
    elif fmt == "IMAGE":
        score += 10
    
    return min(score, 100)
```

### 4.3 Estrutura de Decisão para a IA

```python
if score_escala >= 70 and is_active:
    status = "ALTAMENTE ESCALADO"
    action = "EXTRAIR CRIATIVO + LINK → ENVIAR PARA CEO"
elif score_escala >= 40 and is_active:
    status = "ESCALADO"
    action = "SALVAR E MONITORAR"
else:
    status = "OBSERVAÇÃO"
    action = "SALVAR PARA ANÁLISE FUTURA"
```

---

## 5. Mapeamento API → Supabase

### 5.1 Função de Mapeamento (Python)

```python
from datetime import datetime, timezone

def map_search_result_to_row(ad, query_used):
    """Mapeia um resultado da API /search/ads para uma row do Supabase."""
    snapshot = ad.get("snapshot", {})
    
    # body pode ser objeto {"text": "..."} (search) ou string (ad detail)
    body = snapshot.get("body", "")
    if isinstance(body, dict):
        ad_copy = body.get("text", "")
    else:
        ad_copy = str(body) if body else ""
    
    # Primeira imagem
    images = snapshot.get("images", [])
    image_url = images[0]["original_image_url"] if images else None
    image_resized = images[0]["resized_image_url"] if images else None
    
    # Vídeos
    videos = snapshot.get("videos", [])
    video_urls = []
    for v in videos:
        url = v.get("video_url") or v.get("video_sd_url") or v.get("video_hd_url")
        if url:
            video_urls.append(url)
    
    # page_categories: array (search) ou dict (ad detail)
    cats = snapshot.get("page_categories")
    if isinstance(cats, dict):
        page_categories = list(cats.values())
    elif isinstance(cats, list):
        page_categories = cats
    else:
        page_categories = None
    
    # Extra images
    extra_imgs = snapshot.get("extra_images", [])
    extra_image_urls = [
        e.get("original_image_handle") or e.get("original_image_url")
        for e in extra_imgs if e
    ] or None
    
    # Timestamps: Unix → ISO string para Supabase
    start_ts = ad.get("start_date")
    end_ts = ad.get("end_date")
    
    return {
        "ad_archive_id": str(ad["ad_archive_id"]),
        "page_id": str(ad.get("page_id", "")),
        "page_name": ad.get("page_name") or snapshot.get("page_name"),
        "is_active": ad.get("is_active", True),
        "start_date": datetime.fromtimestamp(start_ts, tz=timezone.utc).isoformat() if start_ts else None,
        "end_date": datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat() if end_ts else None,
        "collation_count": ad.get("collation_count", 1),
        "publisher_platform": ad.get("publisher_platform", []),
        "ad_library_url": ad.get("url"),
        "ad_title": snapshot.get("title"),
        "ad_copy": ad_copy,
        "caption": snapshot.get("caption"),
        "link_description": snapshot.get("link_description"),
        "cta_text": snapshot.get("cta_text"),
        "cta_type": snapshot.get("cta_type"),
        "display_format": snapshot.get("display_format"),
        "link_url": snapshot.get("link_url"),
        "image_url": image_url,
        "image_resized_url": image_resized,
        "video_urls": video_urls or None,
        "extra_image_urls": extra_image_urls,
        "cards_json": snapshot.get("cards") if snapshot.get("cards") else None,
        "page_profile_pic_url": snapshot.get("page_profile_picture_url"),
        "page_like_count": snapshot.get("page_like_count"),
        "page_categories": page_categories,
        "brazil_tax_id": snapshot.get("brazil_tax_id"),
        "pais_codigo": "BR",
        "query_busca": query_used,
        "raw_json": ad,
    }
```

### 5.2 Upsert no Supabase

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def salvar_anuncio(row_data):
    """Salva ou atualiza um anúncio no Supabase (upsert por ad_archive_id)."""
    result = supabase.table("ads_minerados").upsert(
        row_data,
        on_conflict="ad_archive_id"
    ).execute()
    return result
```

---

## 6. Paginação e Volume

A API retorna cerca de 30 resultados por chamada.

```python
def minerar_todos(query, country="BR", max_pages=10):
    """Mineração paginada com cursor."""
    cursor = None
    total_salvos = 0
    
    for page in range(max_pages):
        params = {
            "query": query,
            "country": country,
            "sort_by": "total_impressions",
            "status": "ACTIVE",
        }
        if cursor:
            params["cursor"] = cursor
        
        response = requests.get(
            "https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads",
            headers={"x-api-key": API_KEY},
            params=params
        )
        data = response.json()
        
        ads = data.get("searchResults", [])
        cursor = data.get("cursor")
        
        for ad in ads:
            row = map_search_result_to_row(ad, query)
            row["score_escala"] = calcular_score_escala(ad)
            salvar_anuncio(row)
            total_salvos += 1
        
        if not cursor or not ads:
            break  # Não há mais páginas
    
    return total_salvos
```

> **Custo estimado:** 10 páginas × 1 crédito = 10 créditos para minerar ~300 anúncios por keyword.

---

## 7. Tabela Supabase: `ads_minerados`

A tabela completa está definida em `setup_supabase_ads.sql`. Resumo das colunas:

| Grupo | Colunas | Origem |
|:---|:---|:---|
| Identificação | `ad_archive_id`, `page_id`, `page_name`, `is_active`, `start_date`, `end_date`, `collation_count`, `publisher_platform`, `ad_library_url` | Raiz do JSON |
| Conteúdo | `ad_title`, `ad_copy`, `caption`, `link_description`, `cta_text`, `cta_type`, `display_format` | `snapshot.*` |
| Mídia | `link_url`, `image_url`, `image_resized_url`, `video_urls`, `extra_image_urls`, `cards_json` | `snapshot.*` |
| Página | `page_profile_pic_url`, `page_like_count`, `page_categories`, `brazil_tax_id` | `snapshot.*` |
| Mineração | `pais_codigo`, `query_busca`, `data_mineracao`, `raw_json` | Nossos campos |
| IA | `categoria_ia`, `score_escala`, `notas_ia` | Calculados pelo Minerador |

---

## 8. Boas Práticas de Mineração

### 8.1 Keywords Recomendadas para Brasil

```python
KEYWORDS_BR = [
    "frete grátis", "oferta", "50% OFF", "promoção",
    "desconto", "compre agora", "últimas unidades",
    "lançamento", "kit", "combo", "black friday"
]
```

### 8.2 Frequência e Economia de Créditos

- **Frequência:** Buscas diárias. Produtos escalados no BR têm ciclos de 15–45 dias de pico.
- **Deduplicação:** Sempre usar `ad_archive_id` como UNIQUE para evitar duplicatas.
- **Upsert:** Usar `on_conflict="ad_archive_id"` para atualizar anúncios já existentes.
- **Paginação inteligente:** Parar quando `collation_count` cair abaixo de 5 nas últimas páginas.

### 8.3 Análise de Domínio

Extrair o `link_url` e usar ferramentas de análise de tráfego para confirmar se o domínio está recebendo picos de visitas.

### 8.4 Armadilhas a Evitar

1. **`body` inconsistente:** No `/search/ads` é `{"text": "..."}`, no `/ad` é string direta. Sempre testar `isinstance(body, dict)`.
2. **`page_categories` inconsistente:** No `/search/ads` é array `["Musician"]`, no `/ad` é dict `{"id": "Sportswear"}`.
3. **Timestamps:** `start_date` e `end_date` vêm como **Unix timestamp** (integer). Converter para ISO antes de salvar no Supabase.
4. **Cursor grande:** Acima de ~1.500 resultados o cursor fica muito grande para GET. Mudar para POST.

---

## 9. Referência Rápida dos Campos da API

### Campos no nível raiz (fora do snapshot)

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `ad_archive_id` | string | ID único do anúncio |
| `is_active` | boolean | Se está ativo |
| `page_id` | string | ID da página |
| `page_name` | string | Nome da página |
| `start_date` | integer | Unix timestamp do início |
| `end_date` | integer | Unix timestamp do fim |
| `collation_count` | integer | Número de duplicações |
| `publisher_platform` | string[] | `["FACEBOOK"]`, `["INSTAGRAM"]`, etc |
| `url` | string | Link na Ad Library |
| `reach_estimate` | object/null | Estimativa de alcance |
| `spend` | object/null | Estimativa de gasto |
| `total_active_time` | integer/null | Segundos ativo (mais preciso no `/ad`) |

### Campos dentro de `snapshot`

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `body` / `body.text` | object/string | Texto do anúncio (⚠️ tipo varia) |
| `title` | string | Headline/título |
| `caption` | string | Domínio exibido (ex: "ghemshop.com") |
| `link_description` | string | Descrição abaixo do título |
| `cta_text` | string | Texto do botão ("Shop now") |
| `cta_type` | string | Tipo do CTA ("SHOP_NOW", "LEARN_MORE") |
| `display_format` | string | "IMAGE", "VIDEO", "image" (varia case) |
| `link_url` | string | URL de destino |
| `images` | array | Lista de objetos com `original_image_url`, `resized_image_url` |
| `videos` | array | Lista de objetos com URLs do vídeo |
| `cards` | array | Cards para carrossel / múltiplas versões |
| `extra_images` | array | Imagens adicionais |
| `extra_links` | array | Links adicionais |
| `extra_videos` | array | Vídeos adicionais |
| `page_profile_picture_url` | string | Foto da página |
| `page_like_count` | integer | Curtidas da página |
| `page_categories` | array/dict | Categorias (⚠️ tipo varia) |
| `brazil_tax_id` | string/null | CNPJ/CPF (anúncios BR) |

---

*Documentação gerada e validada contra a API real do ScrapeCreators — Junho de 2026*
*Projeto Alavanca AI Core — Minerador de Anúncios Escalados*
