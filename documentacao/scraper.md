Sim, é totalmente possível! O Scrape Creators tem um endpoint de busca (/v1/facebook/adLibrary/search/ads) que é perfeito para minerar anúncios escalados no Brasil, independente da loja.
Aqui está como você (ou sua IA) deve configurar a busca para encontrar o que está "bombando":

1. Filtros Estratégicos
country: Defina como BR (Brasil).
sort_by: Defina como total_impressions. Isso vai ordenar os resultados dos anúncios que tiveram mais visualizações para os que tiveram menos.
status: Defina como ACTIVE para pegar o que está rodando agora.
query: Aqui você pode usar palavras-chave de nicho (ex: "frete grátis", "oferta", "desconto") para filtrar anúncios de vendas.

2. Como identificar o "Escalado"?
Além da ordenação por impressões, o Scrape Creators retorna um campo chamado collation_count.
O que é: É o número de variações/cópias desse mesmo anúncio rodando.
Dica de Mineração: Se um anúncio tem um collation_count alto (ex: 20, 50, 100), significa que o anunciante está investindo pesado e duplicando o conjunto de anúncios. Isso é o sinal definitivo de um produto ou oferta escalada.

Exemplo de Requisição para sua IA:
GET https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=promoção&country=BR&sort_by=total_impressions&status=ACTIVE

Resumo: Você consegue buscar por palavra-chave em todo o Brasil, ordenar pelos que têm mais impressões e filtrar pelos que têm maior "collation count" para achar os vencedores do mercado em tempo real. Cada busca dessas custa apenas 1 crédito.

