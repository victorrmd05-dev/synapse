// src/lib/supabase-server.ts
//
// Client Supabase EXCLUSIVO para uso server-side (Route Handlers,
// Server Components, Server Actions). Usa a service_role key, que
// IGNORA todas as policies de RLS — por isso NUNCA deve ser importado
// em código que rode no navegador (componentes "use client").
//
// Para o client normal usado no browser, continue usando src/lib/supabase.ts
// (com a anon key, respeitando RLS).

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY não está definida no .env.local. ' +
    'Pegue essa chave em Project Settings > API no painel do Supabase.'
  );
}

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
