import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xbokcnyhjfvvidtjkcdr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_THZ01UPsf-6YsMnIY-mMQg_Ck-FZ2rX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
