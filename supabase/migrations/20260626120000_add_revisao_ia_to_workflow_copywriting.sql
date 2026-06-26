-- Adiciona o estado da revisão da IA na esteira de copywriting.
--
-- Fluxo de status de um registro em workflow_copywriting:
--   'gerando'                -> placeholder enquanto o Copywriter escreve
--   'aguardando_revisao_ia'  -> copy pronta, IA revisora ainda não analisou
--   'revisado_ia'            -> IA deu parecer+score, aguardando decisão humana
--   'aprovado'               -> humano aprovou (revisor_ok=true, data_aprovacao setada)
--   'rejeitado'             -> humano rejeitou; uma nova geração foi disparada
--
-- revisao_ia_score: nota 0-100 que a IA revisora atribuiu à copy.
-- revisao_ia_parecer: texto do parecer da IA (pontos fortes/fracos + recomendação).

ALTER TABLE workflow_copywriting
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'aguardando_revisao_ia',
  ADD COLUMN IF NOT EXISTS revisao_ia_score integer,
  ADD COLUMN IF NOT EXISTS revisao_ia_parecer text;
