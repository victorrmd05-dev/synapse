-- supabase/migrations/20260731120300_add_tentativas_download_video_jobs.sql

-- `tentativas` conta falhas de CONSULTA (sem teto: a tarefa segue viva na WaveSpeed
-- e ja foi paga). Falha de DOWNLOAD e outra natureza — tem teto, porque a URL de
-- saida da WaveSpeed e temporaria e insistir para sempre nao recupera nada.
--
-- Dividir a mesma coluna fazia as duas contagens se contaminarem: 4 falhas de rede
-- na consulta faziam a PRIMEIRA falha de download estourar o teto, descartando um
-- video ja pago e reportando "o download falhou 5x" quando falhou 1.
alter table video_jobs add column if not exists tentativas_download int not null default 0;
