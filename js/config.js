// ============================================
// CONFIGURAÇÃO DO SUPABASE
// Preencha com os dados do SEU projeto Supabase
// (Project Settings > API no painel do Supabase)
// ============================================

const SUPABASE_URL = "https://zztpglobfibhuhrgbpzh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_B-ZOlPYKzmzzKIZW14NO-Q_qKUhi1CK";

// Cria o cliente do Supabase (usado em todas as páginas).
// Chamamos de "sb" para não confundir com a variável global "supabase"
// que vem do script carregado no <head> de cada página.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
