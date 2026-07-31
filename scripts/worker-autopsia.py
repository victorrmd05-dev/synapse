# scripts/worker-autopsia.py
#
# WORKER DA AUTOPSIA — consome a fila autopsia_jobs.
#
# POR QUE UM WORKER, E NAO UMA ROTA: transcrever um video com faster-whisper
# leva minutos de CPU. Uma autopsia de 8 videos passa de 20 minutos, e o teto
# de uma rota Next e maxDuration=300s (5 min) — limite de plataforma, nao
# escolha. Nao adianta otimizar: e categoria errada de lugar.
#
# A FILA e o contrato que protege o futuro: trocar transcricao local por API
# (Groq/Deepgram) e escrever outro consumidor desta mesma tabela.
#
# Rodar (na raiz do projeto):  py -3 scripts/worker-autopsia.py
# Parar: Ctrl+C
#
# Dependencias: Python 3.13, ffmpeg no PATH, faster-whisper (ja instalados).
# Fala com o Supabase por REST + urllib (stdlib) para nao exigir supabase-py.

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "criativos"
INTERVALO_OCIOSO = 5      # segundos entre varreduras quando nao ha job
MAX_TENTATIVAS = 3

FB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://www.facebook.com/",   # sem isso o FB CDN devolve 403
    "Accept": "*/*",
}


def carregar_env():
    """Le .env.local da raiz. Mesmo formato que scripts/_env.mjs."""
    caminho = os.path.join(ROOT, ".env.local")
    if not os.path.exists(caminho):
        sys.exit(".env.local nao encontrado na raiz do projeto.")
    env = {}
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", linha)
            if not m:
                continue
            v = m.group(2).strip()
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            env[m.group(1)] = v
    return env


ENV = carregar_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SERVICE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]


def rest(metodo, caminho, corpo=None, params=None, prefer=None):
    """Chamada REST no PostgREST do Supabase com a service_role."""
    url = f"{SUPABASE_URL}/rest/v1/{caminho}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(url, data=dados, method=metodo)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    with urllib.request.urlopen(req, timeout=60) as r:
        txt = r.read().decode()
        return json.loads(txt) if txt.strip() else None


def subir_storage(caminho_arquivo, destino, content_type):
    """Sobe um arquivo para o Storage e devolve a URL publica."""
    with open(caminho_arquivo, "rb") as f:
        dados = f.read()
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(destino)}"
    req = urllib.request.Request(url, data=dados, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", content_type)
    req.add_header("x-upsert", "true")
    try:
        urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode()[:300]
        raise RuntimeError(f"upload falhou ({e.code}): {detalhe}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(destino)}"


def pegar_job():
    """Pega o job pendente mais antigo e marca como processando (lock)."""
    pendentes = rest(
        "GET", "autopsia_jobs",
        params={"status": "eq.pendente", "order": "criado_em.asc", "limit": "1", "select": "*"},
    )
    if not pendentes:
        return None
    job = pendentes[0]
    # Lock: so pega se AINDA estiver pendente (protege contra dois workers).
    atualizado = rest(
        "PATCH", "autopsia_jobs",
        corpo={"status": "processando", "iniciado_em": "now()", "tentativas": job["tentativas"] + 1},
        params={"id": f"eq.{job['id']}", "status": "eq.pendente"},
        prefer="return=representation",
    )
    return job if atualizado else None


def concluir_job(job_id, erro=None, tentativas=0):
    if erro is None:
        rest("PATCH", "autopsia_jobs",
             corpo={"status": "concluido", "concluido_em": "now()", "erro": None},
             params={"id": f"eq.{job_id}"})
    else:
        # Volta para a fila ate MAX_TENTATIVAS; depois desiste com o motivo.
        final = "erro" if tentativas >= MAX_TENTATIVAS else "pendente"
        rest("PATCH", "autopsia_jobs",
             corpo={"status": final, "erro": str(erro)[:500]},
             params={"id": f"eq.{job_id}"})


def atualizar_progresso(autopsia_id):
    jobs = rest("GET", "autopsia_jobs",
                params={"autopsia_id": f"eq.{autopsia_id}", "select": "status"})
    total = len(jobs)
    prontos = sum(1 for j in jobs if j["status"] in ("concluido", "erro"))
    progresso = int(prontos * 100 / total) if total else 0

    criativos = rest("GET", "autopsia_criativos",
                     params={"autopsia_id": f"eq.{autopsia_id}", "select": "transcricao"})
    transcritos = sum(1 for c in criativos if c.get("transcricao"))

    corpo = {"progresso": progresso, "total_transcritos": transcritos}
    if prontos == total and total > 0:
        corpo["status"] = "montando"
    rest("PATCH", "autopsias", corpo=corpo, params={"id": f"eq.{autopsia_id}"})


def buscar_criativo(criativo_id):
    r = rest("GET", "autopsia_criativos", params={"id": f"eq.{criativo_id}", "select": "*"})
    return r[0] if r else None


def job_download(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    url = criativo.get("url_origem")
    if not url:
        raise RuntimeError("criativo sem url_origem")

    ext = ".mp4" if criativo["tipo"] == "video" else ".jpg"
    destino_local = os.path.join(tempfile.gettempdir(), f"autopsia_{criativo['id']}{ext}")

    req = urllib.request.Request(url, headers=FB_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=300) as r, open(destino_local, "wb") as o:
            o.write(r.read())
    except urllib.error.HTTPError as e:
        if e.code in (403, 410):
            raise RuntimeError(f"URL do CDN expirada (HTTP {e.code}) — recoletar o anunciante")
        raise

    tamanho = os.path.getsize(destino_local)
    if tamanho < 10000:
        raise RuntimeError(f"arquivo suspeito: {tamanho} bytes")

    content_type = "video/mp4" if ext == ".mp4" else "image/jpeg"
    publica = subir_storage(destino_local,
                            f"autopsia/{job['autopsia_id']}/{criativo['id']}{ext}",
                            content_type)

    rest("PATCH", "autopsia_criativos",
         corpo={"storage_path": publica}, params={"id": f"eq.{criativo['id']}"})
    print(f"  baixado {tamanho/1e6:.1f} MB -> {publica.rsplit('/', 1)[-1]}")

    # Encadeia o resto do trabalho: so agora o arquivo existe.
    if criativo["tipo"] == "video":
        rest("POST", "autopsia_jobs", corpo=[
            {"autopsia_id": job["autopsia_id"], "criativo_id": criativo["id"], "tipo": "frames", "status": "pendente"},
            {"autopsia_id": job["autopsia_id"], "criativo_id": criativo["id"], "tipo": "transcrever", "status": "pendente"},
        ])

    try:
        os.remove(destino_local)
    except OSError:
        pass


def duracao_video(caminho):
    """Duracao real em segundos via ffprobe (o efg da URL pode estar ausente)."""
    saida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", caminho],
        capture_output=True, text=True, check=True,
    )
    return float(saida.stdout.strip())


def baixar_do_storage(url, destino):
    """Baixa de volta o arquivo que ja subimos (o worker nao guarda estado em disco)."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=300) as r, open(destino, "wb") as o:
        o.write(r.read())


def gerar_grade(video, inicio, duracao, destino):
    """
    Monta uma grade 3x3 com 9 frames igualmente espacados no trecho.

    -ss ANTES do -i faz seek rapido (por keyframe). fps=9/duracao pega 9
    quadros no trecho; tile=3x3 monta a grade num PNG unico.

    LIMITACAO CONHECIDA (27/07): isto e amostragem em intervalo FIXO, 27 frames
    por video. Em criativo de anuncio com corte rapido ela perde corte curto e
    superamostra tela parada. O low-ticket migrou para o CLI `crv`
    (claude-real-video, MIT, local) e so ai apareceu que os criativos do
    Alimento Sagrado tem DUAS faixas de legenda -- a narracao deles e, no
    rodape, a legenda queimada do video de terceiro que eles nao limparam.
    Com 27 frames isso passa batido.
    Trocar aqui e contido, mas NAO foi decidido: ver §3.1 do
    PLANO-AUTOPSIA-CONCORRENTE.md, inclusive o custo de storage.
    """
    if duracao <= 0:
        raise RuntimeError("trecho de duracao zero")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-ss", f"{inicio:.2f}", "-t", f"{duracao:.2f}", "-i", video,
         "-vf", f"fps=9/{duracao:.2f},scale=320:-1,tile=3x3",
         "-frames:v", "1", destino],
        check=True, capture_output=True,
    )


def job_frames(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    if not criativo.get("storage_path"):
        raise RuntimeError("criativo ainda sem storage_path — o download nao concluiu")

    local = os.path.join(tempfile.gettempdir(), f"autopsia_frames_{criativo['id']}.mp4")
    baixar_do_storage(criativo["storage_path"], local)

    try:
        total = duracao_video(local)
        terco = total / 3.0
        grades = [
            ("grid-hooks", 0.0, terco),
            ("grid-meio", terco, terco),
            ("grid-cta", terco * 2, terco),
        ]
        urls = []
        for nome, inicio, dur in grades:
            png = os.path.join(tempfile.gettempdir(), f"autopsia_{criativo['id']}_{nome}.png")
            gerar_grade(local, inicio, dur, png)
            urls.append(subir_storage(
                png, f"autopsia/{job['autopsia_id']}/{criativo['id']}_{nome}.png", "image/png"
            ))
            try:
                os.remove(png)
            except OSError:
                pass

        rest("PATCH", "autopsia_criativos",
             corpo={"frames_paths": urls, "duracao_s": int(round(total))},
             params={"id": f"eq.{criativo['id']}"})
        print(f"  3 grades geradas ({total:.0f}s de video)")
    finally:
        try:
            os.remove(local)
        except OSError:
            pass


_MODELO = None


def modelo_whisper():
    """
    Carrega o faster-whisper uma vez por processo (leva ~30s no primeiro job).

    Parametros identicos aos validados no transcrever.py do low-ticket:
    medium/cpu/int8, pt, vad_filter e condition_on_previous_text=False (sem
    isso o modelo repete a frase anterior quando o audio tem musica alta).
    """
    global _MODELO
    if _MODELO is None:
        from faster_whisper import WhisperModel
        print("  carregando modelo whisper medium (primeira vez, ~30s)...")
        _MODELO = WhisperModel("medium", device="cpu", compute_type="int8")
    return _MODELO


def formatar_tempo_srt(segundos):
    horas = int(segundos // 3600)
    minutos = int((segundos % 3600) // 60)
    seg = segundos % 60
    return f"{horas:02d}:{minutos:02d}:{seg:06.3f}".replace(".", ",")


def job_transcrever(job):
    criativo = buscar_criativo(job["criativo_id"])
    if not criativo:
        raise RuntimeError("criativo nao encontrado")
    if not criativo.get("storage_path"):
        raise RuntimeError("criativo ainda sem storage_path — o download nao concluiu")

    local = os.path.join(tempfile.gettempdir(), f"autopsia_transc_{criativo['id']}.mp4")
    baixar_do_storage(criativo["storage_path"], local)

    try:
        modelo = modelo_whisper()
        segmentos, _info = modelo.transcribe(
            local, language="pt", beam_size=5, vad_filter=True,
            condition_on_previous_text=False,
        )

        linhas_srt = []
        texto = []
        for i, s in enumerate(segmentos, start=1):
            trecho = s.text.strip()
            if not trecho:
                continue
            texto.append(trecho)
            linhas_srt.append(
                f"{i}\n{formatar_tempo_srt(s.start)} --> {formatar_tempo_srt(s.end)}\n{trecho}\n"
            )

        corrido = " ".join(texto)
        rest("PATCH", "autopsia_criativos",
             corpo={"transcricao": corrido, "transcricao_srt": "\n".join(linhas_srt)},
             params={"id": f"eq.{criativo['id']}"})
        print(f"  transcrito: {len(corrido)} caracteres, {len(linhas_srt)} segmentos")
    finally:
        try:
            os.remove(local)
        except OSError:
            pass


HANDLERS = {
    "download": job_download,
    "frames": job_frames,
    "transcrever": job_transcrever,
}


def checar_dependencias():
    """Falha AGORA se faltar algo, em vez de no meio da fila.

    Motivo (28/07/2026): o worker rodou com o Python do venv, que nao tem
    faster-whisper. Os 20 downloads passaram (so usam a stdlib) e a quebra so
    apareceu ~40 min depois, no primeiro job de transcricao. Barato de checar,
    caro de descobrir tarde.
    """
    faltando = []
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        faltando.append(
            f"faster-whisper AUSENTE neste Python ({sys.executable}).\n"
            f"      Use o Python global (C:\\Python313\\python.exe), NAO o venv do projeto,\n"
            f"      ou instale com: {sys.executable} -m pip install faster-whisper"
        )
    for exe in ("ffmpeg", "ffprobe"):
        if shutil.which(exe) is None:
            faltando.append(f"{exe} nao esta no PATH (necessario para frames e duracao)")
    if faltando:
        print("ERRO: dependencias faltando — o worker nao vai conseguir concluir a fila:")
        for f in faltando:
            print(f"  - {f}")
        sys.exit(1)


def main():
    checar_dependencias()
    print("worker-autopsia iniciado. Ctrl+C para parar.")
    print(f"Python:   {sys.executable}")
    print(f"Supabase: {SUPABASE_URL}")
    while True:
        try:
            job = pegar_job()
            if not job:
                time.sleep(INTERVALO_OCIOSO)
                continue
            print(f"[{job['tipo']}] job {job['id'][:8]} (tentativa {job['tentativas'] + 1})")
            handler = HANDLERS.get(job["tipo"])
            if not handler:
                concluir_job(job["id"], f"tipo desconhecido: {job['tipo']}", MAX_TENTATIVAS)
                continue
            try:
                handler(job)
                concluir_job(job["id"])
            except Exception as e:
                print(f"  FALHOU: {e}")
                concluir_job(job["id"], e, job["tentativas"] + 1)
            atualizar_progresso(job["autopsia_id"])
        except KeyboardInterrupt:
            print("\nencerrado.")
            return
        except Exception as e:
            print(f"erro no loop: {e}")
            time.sleep(INTERVALO_OCIOSO)


if __name__ == "__main__":
    main()
