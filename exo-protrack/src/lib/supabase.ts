import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://swlzoqemroxdoenqxhnx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHpvcWVtcm94ZG9lbnF4aG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDM0NTMsImV4cCI6MjA4NDM3OTQ1M30.ejcUFp6wAwcOETXyu1aeFc5eQquZzBRXRsG-BFdYYxw';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
