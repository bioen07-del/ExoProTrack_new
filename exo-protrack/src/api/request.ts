import { supabase, supabaseFetch, PaginationParams, buildPaginationQuery } from './supabase';
import { Database } from '../types/database';

// Types
type Request = Database['public']['Tables']['request']['Row'];
type RequestInsert = Database['public']['Tables']['request']['Insert'];
type RequestUpdate = Database['public']['Tables']['request']['Update'];

type RequestLine = Database['public']['Tables']['request_line']['Row'];
type RequestLineInsert = Database['public']['Tables']['request_line']['Insert'];

interface RequestWithDetails extends Request {
  lines?: RequestLine[];
  product?: {
    product_code: string;
    product_name: string;
    frozen_spec: any;
  };
  reserved_cm_lot?: {
    cm_lot_id: string;
    base_product_code: string;
  };
}

interface RequestFilters {
  status?: string;
  productCode?: string;
  customer?: string;
  search?: string;
  showCompleted?: boolean;
}

// Query builders
export async function getRequests(
  filters?: RequestFilters,
  pagination?: PaginationParams
) {
  let query = supabase
    .from('request')
    .select(`
      *,
      product:product!request_product_code_fkey(
        product_code,
        product_name
      ),
      lines:request_line!request_request_id_fkey(*)
    `, { count: 'exact' });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.productCode) {
    query = query.eq('product_code', filters.productCode);
  }

  if (filters?.customer) {
    query = query.ilike('customer_ref', `%${filters.customer}%`);
  }

  if (filters?.search) {
    query = query.or(`request_id.ilike.%${filters.search}%,customer_ref.ilike.%${filters.search}%`);
  }

  // By default hide completed/cancelled
  if (!filters?.showCompleted) {
    query = query.not('status', 'in', '("Completed","Cancelled")');
  }

  // Ordering
  query = query.order('created_at', { ascending: false });

  // Pagination
  if (pagination) {
    buildPaginationQuery(query, pagination);
  }

  return supabaseFetch(query);
}

export async function getRequest(id: string) {
  const query = supabase
    .from('request')
    .select(`
      *,
      product:product!request_product_code_fkey(*),
      frozen_spec,
      lines:request_line!request_request_id_fkey(*),
      reserved_cm_lot:cm_lot!request_reserved_cm_lot_id_fkey(
        cm_lot_id,
        base_product_code,
        status
      )
    `)
    .eq('request_id', id)
    .single();

  return supabaseFetch<RequestWithDetails>(query);
}

export async function createRequest(data: RequestInsert) {
  const query = supabase
    .from('request')
    .insert(data)
    .select()
    .single();

  return supabaseFetch<Request>(query);
}

export async function updateRequest(id: string, data: RequestUpdate) {
  const query = supabase
    .from('request')
    .update(data)
    .eq('request_id', id)
    .select()
    .single();

  return supabaseFetch<Request>(query);
}

export async function deleteRequest(id: string) {
  const query = supabase
    .from('request')
    .delete()
    .eq('request_id', id);

  return supabaseFetch(query);
}

// Request Lines
export async function getRequestLines(requestId: string) {
  const query = supabase
    .from('request_line')
    .select(`
      *,
      reservations:reservation!reservation_request_line_id_fkey(
        reservation_id,
        cm_lot_id,
        reserved_volume_ml,
        status
      ),
      pack_lots:pack_lot!pack_lot_request_line_id_fkey(
        pack_lot_id,
        status,
        qty_produced
      )
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  return supabaseFetch<RequestLine[]>(query);
}

export async function createRequestLine(data: RequestLineInsert) {
  const query = supabase
    .from('request_line')
    .insert(data)
    .select()
    .single();

  return supabaseFetch<RequestLine>(query);
}

export async function updateRequestLine(id: string, data: Partial<RequestLine>) {
  const query = supabase
    .from('request_line')
    .update(data)
    .eq('request_line_id', id)
    .select()
    .single();

  return supabaseFetch<RequestLine>(query);
}

export async function deleteRequestLine(id: string) {
  const query = supabase
    .from('request_line')
    .delete()
    .eq('request_line_id', id);

  return supabaseFetch(query);
}

// Reservations
export async function getReservations(cmLotId?: string, requestLineId?: string) {
  let query = supabase
    .from('reservation')
    .select(`
      *,
      cm_lot:cm_lot!reservation_cm_lot_id_fkey(
        cm_lot_id,
        base_product_code,
        status
      ),
      request_line:request_line!reservation_request_line_id_fkey(
        request_line_id,
        finished_product_code,
        qty_units
      )
    `);

  if (cmLotId) {
    query = query.eq('cm_lot_id', cmLotId);
  }

  if (requestLineId) {
    query = query.eq('request_line_id', requestLineId);
  }

  query = query.order('reserved_at', { ascending: false });

  return supabaseFetch(query);
}

export async function createReservation(data: {
  cm_lot_id: string;
  request_line_id: string;
  reserved_volume_ml: number;
  reserved_by?: string;
  status?: 'Active' | 'Consumed' | 'Cancelled';
}) {
  const query = supabase
    .from('reservation')
    .insert({
      ...data,
      reserved_at: new Date().toISOString(),
      status: data.status || 'Active',
    })
    .select()
    .single();

  return supabaseFetch(query);
}

export async function updateReservation(id: string, data: Partial<{
  reserved_volume_ml: number;
  status: string;
  notes: string;
}>) {
  const query = supabase
    .from('reservation')
    .update(data)
    .eq('reservation_id', id)
    .select()
    .single();

  return supabaseFetch(query);
}

export async function cancelReservation(id: string) {
  return updateReservation(id, { status: 'Cancelled' });
}

export async function consumeReservation(id: string) {
  return updateReservation(id, { status: 'Consumed' });
}

// Available CM lots for reservation
export async function getAvailableCmLots(requiredVolume?: number) {
  let query = supabase
    .from('cm_lot')
    .select(`
      cm_lot_id,
      base_product_code,
      status,
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
    .gte('cm_qa_release_decision.expiry_date', new Date().toISOString());

  const { data: lots } = await query;

  if (!lots) return [];

  // Calculate available volume
  const { data: reservations } = await supabase
    .from('reservation')
    .select('cm_lot_id, reserved_volume_ml')
    .eq('status', 'Active');

  return lots.map(lot => {
    const lotReservations = reservations?.filter(r => r.cm_lot_id === lot.cm_lot_id) || [];
    const reserved = lotReservations.reduce((sum, r) => sum + r.reserved_volume_ml, 0);
    const available = (lot.container?.current_volume_ml || 0) - reserved;

    return {
      ...lot,
      available_ml: Math.max(0, available),
      isAvailable: !requiredVolume || available >= requiredVolume,
    };
  }).filter(lot => lot.available_ml > 0);
}

// Statistics
export async function getRequestStats() {
  const { data } = await supabase
    .from('request')
    .select('status', { count: 'exact' });

  return data?.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
}

// Exports
export type {
  Request,
  RequestInsert,
  RequestUpdate,
  RequestLine,
  RequestLineInsert,
  RequestWithDetails,
  RequestFilters,
};
