"use client";

// Imagens da landing page — upload e listagem.
//
// POR QUE ISSO EXISTE: o /api/deploy sobe UM único arquivo HTML para o Cloudflare,
// sem bundle de assets. Então toda imagem da LP precisa ser URL absoluta e pública.
// O bucket `criativos` do Supabase já é público — é lá que elas moram.
//
// A PASTA É A FONTE DA VERDADE: `criativos/lp/<campanha_id>/`. Não existe tabela de
// imagens. O casamento com a copy é PELO NOME DO ARQUIVO — a copy traz
// `[IMAGEM 1 · hero.png — …]` e a pasta precisa ter `hero.png`. Por isso o caminho
// fica visível e copiável aqui: dá para subir por este botão OU direto pelo painel
// do Supabase, e os dois caminhos chegam no mesmo lugar.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  ImageOff,
} from 'lucide-react';

type ImagemLP = { nome: string; url: string; tamanho: number | null };
type FalhaLP = { nome: string; motivo: string };

function formatarTamanho(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImagensLP({ campanhaId }: { campanhaId: string | null }) {
  const [imagens, setImagens] = useState<ImagemLP[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<FalhaLP[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pasta = campanhaId ? `criativos/lp/${campanhaId}` : null;

  const carregar = useCallback(async () => {
    if (!campanhaId) {
      setImagens([]);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/design/imagens?campanha_id=${encodeURIComponent(campanhaId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.detalhe || data.error || 'Falha ao listar as imagens.');
        return;
      }
      setImagens(data.imagens ?? []);
    } catch {
      setErro('Erro de rede ao listar as imagens.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function subir(arquivos: FileList | File[]) {
    if (!campanhaId || subindo) return;
    const lista = Array.from(arquivos);
    if (lista.length === 0) return;

    setSubindo(true);
    setErro(null);
    setFalhas([]);
    try {
      const form = new FormData();
      form.append('campanha_id', campanhaId);
      lista.forEach((f) => form.append('files', f));

      const res = await fetch('/api/design/imagens', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));

      // A rota devolve 502 quando NADA subiu, e 200 com `falhas` quando subiu em
      // parte. Nos dois casos as falhas por arquivo importam mais que o status.
      if (!res.ok && !Array.isArray(data.enviadas)) {
        setErro(data.detalhe || data.error || 'Falha ao subir as imagens.');
      }
      setFalhas(Array.isArray(data.falhas) ? data.falhas : []);
      await carregar();
    } catch {
      setErro('Erro de rede ao subir as imagens.');
    } finally {
      setSubindo(false);
      // Sem isso, escolher o MESMO arquivo de novo (depois de corrigir) não
      // dispara o onChange e parece que o botão travou.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function copiarCaminho() {
    if (!pasta) return;
    try {
      await navigator.clipboard.writeText(pasta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setErro('O navegador bloqueou a cópia. Selecione o caminho à mão.');
    }
  }

  if (!campanhaId) {
    return (
      <div className="mb-8">
        <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">
          Imagens da LP
        </h3>
        <p className="text-xs text-secondary">
          Esta landing page não está ligada a uma campanha, então não há pasta de imagens.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
          Imagens da LP
        </h3>
        <button
          onClick={carregar}
          disabled={carregando}
          title="Recarregar a lista"
          className="text-secondary hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Caminho da pasta — para subir à mão pelo painel do Supabase */}
      <div className="bg-[#0F0F13] border border-surface-elevated rounded-lg p-3 mb-3">
        <p className="text-[10px] text-secondary uppercase tracking-wider mb-1.5">
          Pasta no Storage
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] text-text-primary break-all leading-relaxed">
            {pasta}
          </code>
          <button
            onClick={copiarCaminho}
            title="Copiar caminho"
            className="shrink-0 text-secondary hover:text-white transition-colors cursor-pointer"
          >
            {copiado ? <Check size={13} className="text-status-green" /> : <Copy size={13} />}
          </button>
        </div>
        <p className="text-[10px] text-secondary mt-2 leading-relaxed">
          O nome do arquivo é o que casa com a copy — <code>[IMAGEM 1 · hero.png]</code>{' '}
          exige um <code>hero.png</code> aqui dentro.
        </p>
      </div>

      {/* Área de upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          subir(e.dataTransfer.files);
        }}
        className={`border border-dashed rounded-lg p-4 text-center transition-colors ${
          arrastando ? 'border-primary bg-primary/10' : 'border-surface-elevated bg-[#0F0F13]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files && subir(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={subindo}
          className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {subindo ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Subindo…
            </>
          ) : (
            <>
              <Upload size={14} /> Subir imagens
            </>
          )}
        </button>
        <p className="text-[10px] text-secondary mt-2">
          ou arraste os arquivos aqui · PNG, JPG, WEBP ou AVIF · até 8 MB cada
        </p>
      </div>

      {erro && (
        <div className="mt-3 flex items-start gap-2 text-xs text-status-red">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {falhas.length > 0 && (
        <div className="mt-3 bg-status-red/10 border border-status-red/30 rounded-lg p-3">
          <p className="text-[10px] font-bold text-status-red uppercase tracking-wider mb-1.5">
            {falhas.length} arquivo(s) não subiram
          </p>
          <ul className="space-y-1">
            {falhas.map((f) => (
              <li key={f.nome} className="text-[11px] text-secondary">
                <span className="text-text-primary">{f.nome}</span> — {f.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* O que já está na pasta */}
      <div className="mt-4">
        {imagens.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-secondary">
            <ImageOff size={13} /> Nenhuma imagem na pasta ainda.
          </div>
        ) : (
          <>
            <p className="text-[10px] text-secondary uppercase tracking-wider mb-2">
              {imagens.length} na pasta
            </p>
            <div className="space-y-2">
              {imagens.map((img) => (
                <a
                  key={img.nome}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-[#0F0F13] border border-surface-elevated hover:border-primary/50 rounded-lg p-2 transition-colors group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.nome}
                    className="w-10 h-10 rounded object-cover bg-surface-elevated shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary truncate">{img.nome}</p>
                    <p className="text-[10px] text-secondary">{formatarTamanho(img.tamanho)}</p>
                  </div>
                  <ExternalLink
                    size={13}
                    className="shrink-0 text-secondary group-hover:text-primary transition-colors"
                  />
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
