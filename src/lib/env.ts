type PublicEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

// Fonte 1: build-time (Vite)
const viteUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL ?? '';
const viteAnon = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ?? '';

// Fonte 2: runtime (fallback)
const rt = (globalThis as any)?.window?.__ENV__ ?? {};
const rtUrl = rt.VITE_SUPABASE_URL ?? '';
const rtAnon = rt.VITE_SUPABASE_ANON_KEY ?? '';

export const env: PublicEnv = {
  SUPABASE_URL: viteUrl || rtUrl,
  SUPABASE_ANON_KEY: viteAnon || rtAnon,
};

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.error('[env] Variáveis ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  if (import.meta.env?.MODE !== 'production') {
    throw new Error('[env] Configuração inválida: faltam variáveis públicas do Supabase');
  }
} else {
  console.log('[env] Variáveis carregadas');
}