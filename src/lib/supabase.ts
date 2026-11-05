import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://edynelqtxccksillyfbc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wVNaLOQgNr7cYE4leW8GjA_FQh9Sl5s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DiagramRecord {
  id: string;
  user_id: string;
  title: string;
  sheets: any;
  active_sheet_id: string;
  created_at: string;
  updated_at: string;
}

