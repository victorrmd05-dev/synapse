-- supabase/migrations/20260801120100_add_compor_video_jobs.sql

-- Completa a tabela para o tipo='compor' (Remotion), que ja estava previsto no
-- desenho de 31/07 mas sem as colunas.

alter table video_jobs add column if not exists job_fonte_id uuid references video_jobs(id) on delete set null;
alter table video_jobs add column if not exists url_narracao text;
alter table video_jobs add column if not exists params_json jsonb;
alter table video_jobs add column if not exists duracao_render_s int;

comment on column video_jobs.job_fonte_id is 'qual job gerar e o clipe de fundo deste compor';
comment on column video_jobs.url_narracao is 'mp3 no Storage, JA pago pela rota antes do job existir';
comment on column video_jobs.params_json is 'gancho, cta, cor_faixa, legendas[] com timing, duracao_narracao_s, duracao_clipe_s';
comment on column video_jobs.duracao_render_s is 'quanto o render levou; alimenta a estimativa na tela';

-- A TRAVA. Irma da gerar_exige_task_id, mesmo motivo.
--
-- Quem chama a ElevenLabs e a ROTA, no clique do Fernando. O worker so
-- renderiza. Se o worker chamasse a ElevenLabs, um job travado no meio do
-- render (Chrome que morre, maquina que dorme) voltaria para a fila e gastaria
-- a cota de novo — a mesma armadilha que decidiu o modulo da WaveSpeed:
-- retry automatico e cobranca nao podem morar no mesmo lugar.
--
-- Com a narracao ja no Storage antes do job existir, o retry do compor fica
-- LIVRE: render e gratis.
alter table video_jobs
  add constraint compor_exige_narracao
    check (tipo <> 'compor' or url_narracao is not null);

-- Fecha o minor n1 do ledger de 31/07: `tipo` era text solto, entao
-- tipo='compour' com typo passava livre pela trava de custo do gerar.
alter table video_jobs
  add constraint video_jobs_tipo_valido
    check (tipo in ('gerar','compor'));
