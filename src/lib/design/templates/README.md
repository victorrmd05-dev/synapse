# Templates de Landing Page — referência para o agente Designer-Webmaster

HTMLs de páginas **reais, validadas e publicadas** que servem de referência de
estrutura/CSS para o motor de geração (`src/app/api/design/generate/route.ts`).
São consultados como exemplo de layout, copy e seções — **não** são copiados
literalmente; aqui guardamos só o HTML. Os `assets/` (imagens) e a versão
publicável completa ficam na pasta-fonte na raiz do projeto (ex:
`capa_iphone_aluminio/`), usada para republicar a página.

| Arquivo | Produto | Status | URL pública |
|---------|---------|--------|-------------|
| `capa-iphone-aluminio.html` | Capa ArmorGlass de alumínio aeronáutico p/ iPhone 17 | No ar (Cloudflare Pages) | https://capa-iphone-aluminio.pages.dev |

## Notas de uso
- Os `<img src="assets/...">` são relativos: ao reaproveitar a estrutura, troque
  pelos assets reais do novo produto (mesma pasta `assets/` no deploy).
- Estrutura de seções desta página (ordem que converteu bem): nav fixa → hero com
  GIF do produto + CTA → benefícios → anatomia/especificações → prova/segurança →
  carrossel lifestyle → bloco de oferta (seleção de modelo/cor + preço + checkout)
  → FAQ → CTA final → footer.
- O checkout é um placeholder (`triggerCheckout()`); o link real do gateway é
  injetado por campanha antes de subir tráfego.
