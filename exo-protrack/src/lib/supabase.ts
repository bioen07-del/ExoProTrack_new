import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Tables = Database['public']['Tables'];
export type CmLot = Tables['cm_lot']['Row'];
export type Culture = Tables['culture']['Row'];
export type Container = Tables['container']['Row'];
export type CollectionEvent = Tables['collection_event']['Row'];
export type ProcessingStep = Tables['processing_step']['Row'];
export type CmQcRequest = Tables['cm_qc_request']['Row'];
export type CmQcResult = Tables['cm_qc_result']['Row'];
export type CmQaReleaseDecision = Tables['cm_qa_release_decision']['Row'];
export type Request = Tables['request']['Row'];
export type RequestLine = Tables['request_line']['Row'];
export type PackLot = Tables['pack_lot']['Row'];
export type Reservation = Tables['reservation']['Row'];
export type StockMovement = Tables['stock_movement']['Row'];
export type MediaCompatibilitySpec = Tables['media_compatibility_spec']['Row'];
export type Product = Tables['product']['Row'];
export type PackFormat = Tables['pack_format']['Row'];
export type CellType = Tables['cell_type']['Row'];
