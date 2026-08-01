-- supabase/migrations/20260731120200_create_video_jobs.sql

-- Fila de video. Dois tipos com ciclos de vida OPOSTOS dividem a tabela:
--
--   tipo='gerar'  -> WaveSpeed. Nasce em 'processando' porque a rota JA submeteu
--                    e JA pagou. O worker so consulta.
--   tipo='compor' -> Remotion (P3, ainda nao implementado). Nasce em 'pendente'
--                    e o worker pega da fila. Comecar e gratis.
--
-- RLS com policy publica e Realtime: convencao do projeto enquanto nao ha auth.

create table if not exists video_jobs (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references campanhas_producao(id) on delete cascade,
  tipo text not null,                        -- gerar | compor
  status text not null default 'pendente',   -- pendente|processando|concluido|erro

  -- so para tipo='gerar'
  wavespeed_task_id text,
  modelo text,
  prompt text,
  image_url text,                            -- presente = image-to-video
  duracao_s int,
  custo_estimado_usd numeric(10,4),

  -- resultado
  url_saida text,                            -- caminho no STORAGE, nunca a URL da WaveSpeed
  tentativas int not null default 0,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,

  -- A TRAVA DE CUSTO, e a decisao central deste modulo.
  -- Uma linha 'gerar' nao existe sem tarefa ja submetida, entao nao sobra nada
  -- para um worker "iniciar" — e iniciar, aqui, significaria COBRAR DE NOVO.
  -- Motivo concreto: o pegar_job() do worker da autopsia incrementa `tentativas`
  -- e reprocessa job travado. Retry automatico nao pode conviver com cobranca.
  constraint gerar_exige_task_id
    check (tipo <> 'gerar' or wavespeed_task_id is not null)
);

create index if not exists idx_video_jobs_fila on video_jobs (status, criado_em);
create index if not exists idx_video_jobs_campanha on video_jobs (campanha_id);

alter table video_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'video_jobs' and policyname = 'video_jobs_publico') then
    create policy video_jobs_publico on video_jobs for all using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'video_jobs') then
    alter publication supabase_realtime add table video_jobs;
  end if;
end $$;
