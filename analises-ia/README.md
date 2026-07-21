# analises-ia/

Análises de IA salvas pelo botão **"Salvar análise"** na página de campanhas do Gestor Meta Ads.

- `diagnosticos.json` — todas as análises (upsert por campanha).
- `<campanha>_<meta_id>.md` — a análise **completa** e legível de cada campanha
  (métricas + funil 80×10×10 + diagnóstico IA + Análise Profunda + media buyer + plano),
  pronta para arrastar para o chat.

> Os arquivos de dados reais de cliente são ignorados pelo git (`analises-ia/*`),
> exceto este README. A gravação em arquivo funciona em dev/local; em serverless
> (Vercel) o caminho de persistência é o Supabase.
