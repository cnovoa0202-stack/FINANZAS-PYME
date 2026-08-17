import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);

const DNI_RUC_DOMAIN = "finanzaspyme.internal";

export function dniRucToAuthEmail(dniRuc) {
  return `${dniRuc.trim()}@${DNI_RUC_DOMAIN}`;
}
