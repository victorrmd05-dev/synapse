"use client";

// Modo do pixel: TESTE ou PRODUÇÃO — visível na tela principal do /tracking.
//
// POR QUE EXISTE (29/07/2026): "estou em teste ou em produção?" é a pergunta que
// causa erro de verdade no tracking, e a resposta estava escondida atrás do
// botão "Pixels & Tokens", como a palavra "teste" em 11px dentro de um painel
// fechado por padrão. Dá para rodar uma semana achando que está em produção.
//
// Dois fatos tornam isto rotina, não exceção:
//  1. O Meta gera um `test_event_code` NOVO a cada sessão da aba "Eventos de
//     teste". Código velho = eventos de servidor somem da aba, e parece que o
//     tracking quebrou.
//  2. Ir para produção é só limpar o campo — **não precisa republicar a página**.
//     O código vive no banco e o relay CAPI lê a cada requisição.

import React, { useState } from 'react';
import { FlaskConical, Radio, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { setTestEventCode, type TrackingPixelSafe } from '../../app/actions/tracking';

export default function ModoDoPixel({
  pixel,
  onChange,
}: {
  pixel: TrackingPixelSafe;
  onChange: () => void | Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState(pixel.test_event_code ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emTeste = !!pixel.test_event_code;

  async function aplicar(valor: string | null) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await setTestEventCode(pixel.id, valor);
      setEditando(false);
      await onChange();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'falhou');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 ${
        emTeste
          ? 'bg-status-yellow/10 border-status-yellow/30'
          : 'bg-status-green/10 border-status-green/30'
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {emTeste ? (
          <FlaskConical size={18} className="text-status-yellow shrink-0" />
        ) : (
          <Radio size={18} className="text-status-green shrink-0" />
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                emTeste ? 'text-status-yellow' : 'text-status-green'
              }`}
            >
              {emTeste ? 'Em teste' : 'Em produção'}
            </span>
            <span className="text-xs text-secondary">·</span>
            <span className="text-sm text-white font-semibold truncate">{pixel.nome}</span>
            {emTeste && (
              <code className="text-[11px] bg-[#0f0f16] border border-surface-elevated rounded px-1.5 py-0.5 text-status-yellow">
                {pixel.test_event_code}
              </code>
            )}
          </div>
          <p className="text-[11px] text-secondary mt-0.5">
            {emTeste
              ? 'Os eventos de SERVIDOR vão para "Eventos de teste" do Meta, não para o conjunto real. O Meta troca este código a cada sessão da aba — se os eventos sumirem de lá, é ele que envelheceu.'
              : 'Os eventos contam no conjunto real. Para testar sem sujar os dados, cole o código da aba "Eventos de teste".'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {editando ? (
            <>
              <input
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') aplicar(codigo);
                  if (e.key === 'Escape') setEditando(false);
                }}
                placeholder="TEST12345"
                className="w-36 bg-[#0f0f16] border border-surface-elevated rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-secondary/40 focus:outline-none focus:border-primary/40"
              />
              <button
                onClick={() => aplicar(codigo)}
                disabled={salvando || !codigo.trim()}
                title="Aplicar"
                className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                onClick={() => { setEditando(false); setCodigo(pixel.test_event_code ?? ''); }}
                title="Cancelar"
                className="p-1.5 rounded-lg text-secondary hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setCodigo(pixel.test_event_code ?? ''); setEditando(true); }}
                className="px-3 py-1.5 rounded-lg border border-surface-elevated text-xs font-bold text-white hover:bg-surface cursor-pointer whitespace-nowrap"
              >
                {emTeste ? 'Trocar código' : 'Colar código de teste'}
              </button>
              {emTeste && (
                <button
                  onClick={() => {
                    if (confirm(
                      'Encerrar o teste e ir para PRODUÇÃO?\n\n' +
                      'A partir do próximo evento, os dados contam no conjunto real do Meta.\n' +
                      'Não é preciso republicar a página. Para voltar, é só colar um código de novo.'
                    )) aplicar(null);
                  }}
                  disabled={salvando}
                  className="px-3 py-1.5 rounded-lg bg-status-green/20 hover:bg-status-green/30 border border-status-green/30 text-xs font-bold text-status-green disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : 'Encerrar teste → produção'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {erro && (
        <div className="mt-2 flex items-center gap-2 text-xs text-status-red">
          <AlertTriangle size={13} /> {erro}
        </div>
      )}
    </div>
  );
}
