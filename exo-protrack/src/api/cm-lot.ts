import { supabase, supabaseFetch, PaginationParams, buildPaginationQuery } from './supabase';
import { Database } from '../types/database';

// Types
type CmLot = Database['public']['Tables']['cm_lot']['Row'];
type CmLotInsert = Database['public']['Tables']['cm_lot']['Insert'];
type CmLotUpdate = Database['public']['Tables']['cm_lot']['Update'];

interface CmLotWithDetails extends CmLot {
  container?: {
    container_id: string;
    nominal_volume_ml: number;
    current_volume_ml: number;
  };
  product?: {
    product_code: string;
    product_name: string;
    frozen_spec: any;
  };
  culture?: {
    culture_id: string;
    cell_type_code: string;
  };
}

interface CmLotFilters {
  status?: string;
  productCode?: string;
  search?: string;
}

// Query builders
export async function getCmLots(
  filters?: CmLotFilters,
  pagination?: PaginationParams
) {
  let query = supabase
    .from('cm_lot')
    .select(`
      *,
      product:product!cm_lot_base_product_code_fkey(
        product_code,
        product_name
      ),
      container:container!container_owner_id_cm_lot_fkey(
        container_id,
        nominal_volume_ml,
        current_volume_ml
      )
    `, { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.productCode) {
    query = query.eq('base_product_code', filters.productCode);
  }

  if (filters?.search) {
    query = query.or(`cm_lot_id.ilike.%${filters.search}%,product.product_name.ilike.%${filters.search}%`);
  }

  // Ordering
  query = query.order('created_at', { ascending: false });

  // Pagination
  if (pagination) {
    buildPaginationQuery(query, pagination);
  }

  return supabaseFetch(query);
}

export async function getCmLot(id: string) {
  const query = supabase
    .from('cm_lot')
    .select(`
      *,
      product:product!cm_lot_base_product_code_fkey(*),
      frozen_spec,
      container:container!container_owner_id_cm_lot_fkey(*),
      request_line:request_line!cm_lot_request_line_id_fkey(*)
    `)
    .eq('cm_lot_id', id)
    .single();

  return supabaseFetch<CmLotWithDetails>(query);
}

export async function createCmLot(data: CmLotInsert) {
  const query = supabase
    .from('cm_lot')
    .insert(data)
    .select()
    .single();

  return supabaseFetch<CmLot>(query);
}

export async function updateCmLot(id: string, data: CmLotUpdate) {
  const query = supabase
    .from('cm_lot')
    .update(data)
    .eq('cm_lot_id', id)
    .select()
    .single();

  return supabaseFetch<CmLot>(query);
}

export async function deleteCmLot(id: string) {
  const query = supabase
    .from('cm_lot')
    .delete()
    .eq('cm_lot_id', id);

  return supabaseFetch(query);
}

export async function getCmLotStatus(id: string) {
  const query = supabase
    .from('cm_lot')
    .select('status, collection_end_at')
    .eq('cm_lot_id', id)
    .single();

  return supabaseFetch<{ status: string; collection_end_at: string | null }>(query);
}

export async function updateCmLotStatus(id: string, status: string, additionalData?: Partial<CmLotUpdate>) {
  const data: CmLotUpdate = {
    status,
    ...additionalData,
  };

  if (status === 'Closed_Collected' && !additionalData?.collection_end_at) {
    data.collection_end_at = new Date().toISOString();
  }

  return updateCmLot(id, data);
}

// Statistics queries
export async function getCmLotStats() {
  const query = supabase
    .from('cm_lot')
    .select('status', { count: 'exact' })
    .in('status', ['Open', 'Closed_Collected', 'In_Processing', 'QC_Pending', 'Approved']);

  return supabaseFetch<{ status: string; count: number }[]>(query);
}

export async function getCmLotsForFEFO() {
  const query = supabase
    .from('cm_lot')
    .select(`
      cm_lot_id,
      status,
      base_product_code,
      container:container!container_owner_id_cm_lot_fkey(
        container_id,
        nominal_volume_ml,
        current_volume_ml
      ),
      cm_qa_release_decision!inner(
        expiry_date
      )
    `)
    .eq('status', 'Approved')
    .gte('cm_qa_release_decision.expiry_date', new Date().toISOString())
    .order('cm_qa_release_decision.expiry_date', { ascending: true });

  return supabaseFetch(query);
}

// Collection events
export async function getCollectionEvents(cmLotId: string) {
  const query = supabase
    .from('collection_event')
    .select(`
      *,
      culture:culture!collection_event_culture_id_fkey(
        culture_id,
        cell_type_code,
        donor_ref
      )
    `)
    .eq('cm_lot_id', cmLotId)
    .order('collected_at', { ascending: false });

  return supabaseFetch(query);
}

export async function createCollectionEvent(data: any) {
  const query = supabase
    .from('collection_event')
    .insert(data)
    .select()
    .single();

  return supabaseFetch(query);
}

// Processing steps
export async function getProcessingSteps(cmLotId: string) {
  const query = supabase
    .from('processing_step')
    .select(`
      *,
      method:cm_process_method!processing_step_method_id_fkey(
        method_id,
        name,
        method_type
      )
    `)
    .eq('cm_lot_id', cmLotId)
    .order('started_at', { ascending: true });

  return supabaseFetch(query);
}

export async function createProcessingStep(data: any) {
  const query = supabase
    .from('processing_step')
    .insert(data)
    .select()
    .single();

  return supabaseFetch(query);
}

export async function updateProcessingStep(id: string, data: any) {
  const query = supabase
    .from('processing_step')
    .update(data)
    .eq('processing_step_id', id)
    .select()
    .single();

  return supabaseFetch(query);
}

// QC Requests
export async function getQcRequests(cmLotId: string) {
  const query = supabase
    .from('cm_qc_request')
    .select(`
      *,
      results:cm_qc_result!cm_qc_request_qc_request_id_fkey(*)
    `)
    .eq('cm_lot_id', cmLotId)
    .order('created_at', { ascending: false });

  return supabaseFetch(query);
}

export async function createQcRequest(data: any) {
  const query = supabase
    .from('cm_qc_request')
    .insert(data)
    .select()
    .single();

  return supabaseFetch(query);
}

export async function createQcResult(data: any) {
  const query = supabase
    .from('cm_qc_result')
    .insert(data)
    .select()
    .single();

  return supabaseFetch(query);
}

// QA Decisions
export async function getQaDecisions(cmLotId: string) {
  const query = supabase
    .from('cm_qa_release_decision')
    .select('*')
    .eq('cm_lot_id', cmLotId)
    .order('decided_at', { ascending: false });

  return supabaseFetch(query);
}

export async function createQaDecision(data: any) {
  const query = supabase
    .from('cm_qa_release_decision')
    .insert(data)
    .select()
    .single();

  return supabaseFetch(query);
}

// Exports
export type {
  CmLot,
  CmLotInsert,
  CmLotUpdate,
  CmLotWithDetails,
  CmLotFilters,
};
