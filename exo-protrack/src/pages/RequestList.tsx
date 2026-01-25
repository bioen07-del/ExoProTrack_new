import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, X, Trash2, AlertTriangle, CheckCircle, Package, Beaker, FlaskConical, ClipboardCheck, Cog } from 'lucide-react';
import { supabase, Request, RequestLine, PackFormat, Product, MediaCompatibilitySpec, CmLot, Container } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  New: 'Новая',
  InProgress: 'В работе',
  Completed: 'Завершена',
  PartiallyFulfilled: 'Частично выполнена',
  Cancelled: 'Отменена',
};

interface CmLotWithVolume {
  cm_lot_id: string;
  media_spec_id: string | null;
  available_ml: number;
  expiry_date?: string;
  days_to_expiry?: number;
}

interface ExtraRequirement {
  type: 'qc_raw' | 'qc_product' | 'process_raw' | 'pre_process' | 'post_process';
  code: string;
  name: string;
}

export default function RequestList() {
  const { user, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<(Request & { type?: string; reserved_cm_lot_id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(searchParams.get('create') === 'true');
  const [showPreview, setShowPreview] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [packFormats, setPackFormats] = useState<PackFormat[]>([]);
  const [mediaSpecs, setMediaSpecs] = useState<MediaCompatibilitySpec[]>([]);
  const [availableCmLots, setAvailableCmLots] = useState<CmLotWithVolume[]>([]);
  const [processMethods, setProcessMethods] = useState<any[]>([]);
  const [qcTestTypes, setQcTestTypes] = useState<any[]>([]);
  
  // Filter and search states
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'request_id' | 'created_at' | 'due_date' | 'status'>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [showQcRawModal, setShowQcRawModal] = useState(false);
  const [showQcProductModal, setShowQcProductModal] = useState(false);
  const [showProcessRawModal, setShowProcessRawModal] = useState(false);
  const [showProcessProductModal, setShowProcessProductModal] = useState(false);
  const [showPostProcessProductModal, setShowPostProcessProductModal] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_ref: '',
    due_date: '',
    product_code: '',
    pack_format_code: '',
    qty_units: 1,
    reserved_cm_lot_id: '',
    extra_raw_qc: [] as ExtraRequirement[],
    extra_raw_process: [] as ExtraRequirement[],
    extra_product_qc: [] as ExtraRequirement[],
    extra_pre_process: [] as ExtraRequirement[],
    extra_post_process: [] as ExtraRequirement[],
  });

  const [productSpec, setProductSpec] = useState<Product | null>(null);
  const [mediaSpec, setMediaSpec] = useState<MediaCompatibilitySpec | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reqRes, prodRes, formatRes, linesRes, mediaRes, cmLotsRes, containersRes, reservationsRes, qaDecisionsRes, methodsRes] = await Promise.all([
        supabase.from('request').select('*').order('due_date', { ascending: true, nullsFirst: false }),
        supabase.from('product').select('*').eq('is_active', true),
        supabase.from('pack_format').select('*').eq('is_active', true),
        supabase.from('request_line').select('request_id, source_type'),
        supabase.from('media_compatibility_spec').select('*'),
        supabase.from('cm_lot').select('*').eq('status', 'Approved'),
        supabase.from('container').select('*').eq('owner_entity_type', 'CM_Lot'),
        supabase.from('reservation').select('*').eq('status', 'Active'),
        supabase.from('cm_qa_release_decision').select('*').eq('decision', 'Approved'),
        supabase.from('cm_process_method').select('*').eq('is_active', true),
      ]);
      const qcTestsRes = await supabase.from('qc_test_type').select('*').eq('is_active', true);
      setQcTestTypes(qcTestsRes.data || []);
      
      const linesByRequest: Record<string, string[]> = {};
      (linesRes.data || []).forEach((line: any) => {
        if (!linesByRequest[line.request_id]) linesByRequest[line.request_id] = [];
        linesByRequest[line.request_id].push(line.source_type);
      });

      const requestsWithType = (reqRes.data || []).map(req => {
        const types = linesByRequest[req.request_id] || [];
        const hasMTO = types.some(t => t === 'NewProduction' || t === 'new_batch');
        return { ...req, type: hasMTO ? 'MTO' : 'MTS' };
      });

      requestsWithType.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      setRequests(requestsWithType);
      setProducts(prodRes.data || []);
      setPackFormats(formatRes.data || []);
      setMediaSpecs(mediaRes.data || []);
      setProcessMethods(methodsRes.data || []);

      const cmLots = cmLotsRes.data || [];
      const containers = containersRes.data || [];
      const reservations = reservationsRes.data || [];
      const qaDecisions = qaDecisionsRes.data || [];

      const lotsWithVolume: CmLotWithVolume[] = cmLots.map(lot => {
        const container = containers.find((c: Container) => c.owner_id === lot.cm_lot_id);
        const lotReservations = reservations.filter((r: any) => r.cm_lot_id === lot.cm_lot_id);
        const reserved = lotReservations.reduce((sum: number, r: any) => sum + r.reserved_volume_ml, 0);
        const available = (container?.current_volume_ml || 0) - reserved;
        const decision = qaDecisions.find((d: any) => d.cm_lot_id === lot.cm_lot_id);
        const expiryDate = decision?.expiry_date;
        const daysToExpiry = expiryDate 
          ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : undefined;
        return { 
          ...lot, 
          available_ml: Math.max(0, available),
          expiry_date: expiryDate,
          days_to_expiry: daysToExpiry,
        };
      }).filter(l => l.available_ml > 0);

      lotsWithVolume.sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });

      setAvailableCmLots(lotsWithVolume);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleProductSelect(productCode: string) {
    const product = products.find(p => p.product_code === productCode);
    if (product) {
      setProductSpec(product);
      const media = mediaSpecs.find(m => m.media_spec_id === product.media_spec_id);
      setMediaSpec(media || null);
      
      const packFormat = (product as any).default_pack_format_code || '';
      
      setFormData({
        ...formData,
        product_code: productCode,
        pack_format_code: packFormat,
        reserved_cm_lot_id: '',
        extra_raw_qc: [],
        extra_raw_process: [],
        extra_product_qc: [],
        extra_pre_process: [],
        extra_post_process: [],
      });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    
    if (!formData.due_date) {
      alert('Срок исполнения обязателен!');
      return;
    }
    
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('request')
        .select('*', { count: 'exact', head: true })
        .like('request_id', `REQ-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const requestId = `REQ-${dateStr}-${seqNum}`;

      const extraPrimaryQc = formData.extra_raw_qc.map(r => r.code);
      const postprocessQc = formData.extra_product_qc.map(r => r.code);
      const postprocessMethods = [
        ...formData.extra_raw_process.map(r => ({ method_id: r.code, name: r.name })),
        ...formData.extra_post_process.map(r => ({ method_id: r.code, name: r.name })),
      ];

      const sourceType = formData.reserved_cm_lot_id ? 'FromStock' : 'NewProduction';

      // Строим frozen_spec с учётом дополнительных требований из формы
      let frozenSpec = productSpec ? JSON.parse(JSON.stringify((productSpec as any).frozen_spec || {})) : {};
      
      // Добавляем дополнительные QC тесты сырья
      if (formData.extra_raw_qc.length > 0) {
        const existingRawQc = frozenSpec.qc?.raw || [];
        const extraRawQcFull = formData.extra_raw_qc.map(r => 
          qcTestTypes.find(t => t.code === r.code) || { code: r.code, name: r.name }
        );
        frozenSpec.qc = { ...frozenSpec.qc, raw: [...existingRawQc, ...extraRawQcFull] };
      }
      
      // Добавляем дополнительные QC тесты продукта
      if (formData.extra_product_qc.length > 0) {
        const existingProdQc = frozenSpec.qc?.product || [];
        const extraProdQcFull = formData.extra_product_qc.map(r => 
          qcTestTypes.find(t => t.code === r.code) || { code: r.code, name: r.name }
        );
        frozenSpec.qc = { ...frozenSpec.qc, product: [...existingProdQc, ...extraProdQcFull] };
      }
      
      // Добавляем дополнительные методы процессинга сырья
      if (formData.extra_raw_process.length > 0) {
        const existingRawProc = frozenSpec.processing?.raw || [];
        const extraRawProcFull = formData.extra_raw_process.map(r => 
          processMethods.find(m => m.method_id === r.code) || { method_id: r.code, name: r.name }
        );
        frozenSpec.processing = { ...frozenSpec.processing, raw: [...existingRawProc, ...extraRawProcFull] };
      }
      
      // Добавляем дополнительные методы процессинга продукта (до розлива)
      if (formData.extra_pre_process.length > 0) {
        const existingPreProc = frozenSpec.processing?.pre || [];
        const extraPreProcFull = formData.extra_pre_process.map(r => 
          processMethods.find(m => m.method_id === r.code) || { method_id: r.code, name: r.name }
        );
        frozenSpec.processing = { ...frozenSpec.processing, pre: [...existingPreProc, ...extraPreProcFull] };
      }

      // Добавляем дополнительные методы постпроцессинга (после розлива)
      if (formData.extra_post_process.length > 0) {
        const existingPostProc = frozenSpec.processing?.post || [];
        const extraPostProcFull = formData.extra_post_process.map(r => 
          processMethods.find(m => m.method_id === r.code) || { method_id: r.code, name: r.name }
        );
        frozenSpec.processing = { ...frozenSpec.processing, post: [...existingPostProc, ...extraPostProcFull] };
      }

      const { error: reqError } = await supabase.from('request').insert({
        request_id: requestId,
        customer_ref: formData.customer_ref || null,
        due_date: formData.due_date,
        status: formData.reserved_cm_lot_id ? 'InProgress' : 'New',
        created_by: user?.user_id,
        product_code: formData.product_code || null,
        reserved_cm_lot_id: formData.reserved_cm_lot_id || null,
        extra_primary_qc: extraPrimaryQc.length > 0 ? extraPrimaryQc : null,
        postprocess_qc: postprocessQc.length > 0 ? postprocessQc : null,
        postprocess_methods: postprocessMethods.length > 0 ? postprocessMethods : null,
        frozen_spec: frozenSpec,
      });

      if (reqError) throw reqError;

      let createdLineId: string | null = null;
      
      if (formData.product_code && formData.pack_format_code) {
        const { data: lineData, error: lineError } = await supabase.from('request_line').insert({
          request_id: requestId,
          finished_product_code: formData.product_code,
          pack_format_code: formData.pack_format_code,
          qty_units: formData.qty_units,
          additional_qc_required: false,
          source_type: sourceType,
        }).select('request_line_id').single();
        
        if (lineError) throw lineError;
        createdLineId = lineData?.request_line_id || null;
      }

      // Create reservation and PackLot if CM lot selected (FromStock)
      if (formData.reserved_cm_lot_id && formData.pack_format_code) {
        const format = packFormats.find(f => f.pack_format_code === formData.pack_format_code);
        const requiredVolume = formData.qty_units * (format?.nominal_fill_volume_ml || 0);
        
        await supabase.from('reservation').insert({
          cm_lot_id: formData.reserved_cm_lot_id,
          request_line_id: createdLineId,
          reserved_volume_ml: requiredVolume,
          reserved_at: new Date().toISOString(),
          reserved_by: user?.user_id,
          status: 'Active',
        });

        // Auto-create PackLot for FromStock (raw material is ready)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const { count } = await supabase
          .from('pack_lot')
          .select('*', { count: 'exact', head: true })
          .like('pack_lot_id', `PK-${dateStr}-%`);
        
        const seqNum = String((count || 0) + 1).padStart(4, '0');
        const packLotId = `PK-${dateStr}-${seqNum}`;

        // Get processing methods from frozenSpec
        const preProcessMethods = frozenSpec.processing?.pre || [];
        const postProcessMethods = frozenSpec.processing?.post || [];
        const hasPreProcessing = preProcessMethods.length > 0;
        const hasPostProcessing = postProcessMethods.length > 0;
        
        // Determine initial status based on BP requirements
        let initialStatus = 'Filling';
        if (hasPreProcessing) {
          initialStatus = 'Planned'; // Will start with pre-processing
        }
        
        await supabase.from('pack_lot').insert({
          pack_lot_id: packLotId,
          request_line_id: createdLineId,
          source_cm_lot_id: formData.reserved_cm_lot_id,
          pack_format_code: formData.pack_format_code,
          qty_planned: formData.qty_units,
          has_lyophilization: hasPostProcessing,
          status: initialStatus,
          created_by: user?.user_id,
        });
        
        // Create pre-processing steps
        if (hasPreProcessing) {
          for (let i = 0; i < preProcessMethods.length; i++) {
            const m = preProcessMethods[i];
            await (supabase.from as any)('pack_processing_step').insert({
              pack_lot_id: packLotId,
              method_id: m.method_id || m.code,
              method_name: m.name,
              step_order: i + 1,
              status: 'Pending',
              processing_stage: 'pre_filling',
              unit: 'ml',
            });
          }
        }
        
        // Create post-processing steps
        if (hasPostProcessing) {
          for (let i = 0; i < postProcessMethods.length; i++) {
            const m = postProcessMethods[i];
            await (supabase.from as any)('pack_processing_step').insert({
              pack_lot_id: packLotId,
              method_id: m.method_id || m.code,
              method_name: m.name,
              step_order: i + 1,
              status: 'Pending',
              processing_stage: 'post_filling',
              unit: 'pcs',
            });
          }
        }

        await supabase.from('container').insert({
          owner_entity_type: 'PackLot',
          owner_id: packLotId,
          container_type: format?.container_type || 'Vial4',
          current_qty: 0,
          status: 'Quarantine',
        });
      }

      setShowForm(false);
      setShowPreview(false);
      setSearchParams({});
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRequest(requestId: string) {
    if (!confirm(`Удалить заявку ${requestId}?`)) return;
    try {
      const { data: lines } = await supabase.from('request_line').select('request_line_id').eq('request_id', requestId);
      if (lines && lines.length > 0) {
        const lineIds = lines.map(l => l.request_line_id);
        await supabase.from('reservation').delete().in('request_line_id', lineIds);
        await supabase.from('pack_lot').delete().in('request_line_id', lineIds);
      }
      await supabase.from('request_line').delete().eq('request_id', requestId);
      await supabase.from('request').delete().eq('request_id', requestId);
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  function resetForm() {
    setFormData({
      customer_ref: '',
      due_date: '',
      product_code: '',
      pack_format_code: '',
      qty_units: 1,
      reserved_cm_lot_id: '',
      extra_raw_qc: [],
      extra_raw_process: [],
      extra_product_qc: [],
      extra_pre_process: [],
      extra_post_process: [],
    });
    setProductSpec(null);
    setMediaSpec(null);
  }

  function addExtraRequirement(type: ExtraRequirement['type'], code: string, name: string) {
    const req: ExtraRequirement = { type, code, name };
    if (type === 'qc_raw') {
      if (!formData.extra_raw_qc.some(r => r.code === code)) {
        setFormData({ ...formData, extra_raw_qc: [...formData.extra_raw_qc, req] });
      }
    } else if (type === 'qc_product') {
      if (!formData.extra_product_qc.some(r => r.code === code)) {
        setFormData({ ...formData, extra_product_qc: [...formData.extra_product_qc, req] });
      }
    } else if (type === 'process_raw') {
      if (!formData.extra_raw_process.some(r => r.code === code)) {
        setFormData({ ...formData, extra_raw_process: [...formData.extra_raw_process, req] });
      }
    } else if (type === 'pre_process') {
      if (!formData.extra_pre_process.some(r => r.code === code)) {
        setFormData({ ...formData, extra_pre_process: [...formData.extra_pre_process, req] });
      }
    } else if (type === 'post_process') {
      if (!formData.extra_post_process.some(r => r.code === code)) {
        setFormData({ ...formData, extra_post_process: [...formData.extra_post_process, req] });
      }
    }
  }

  function removeExtraRequirement(type: ExtraRequirement['type'], code: string) {
    if (type === 'qc_raw') {
      setFormData({ ...formData, extra_raw_qc: formData.extra_raw_qc.filter(r => r.code !== code) });
    } else if (type === 'qc_product') {
      setFormData({ ...formData, extra_product_qc: formData.extra_product_qc.filter(r => r.code !== code) });
    } else if (type === 'process_raw') {
      setFormData({ ...formData, extra_raw_process: formData.extra_raw_process.filter(r => r.code !== code) });
    } else if (type === 'pre_process') {
      setFormData({ ...formData, extra_pre_process: formData.extra_pre_process.filter(r => r.code !== code) });
    } else if (type === 'post_process') {
      setFormData({ ...formData, extra_post_process: formData.extra_post_process.filter(r => r.code !== code) });
    }
  }

  // Parsed specs from product
  const defaultRawQc = Array.isArray(productSpec?.default_primary_qc) 
    ? (productSpec?.default_primary_qc as any[]).map(t => typeof t === 'object' ? t.name || t.code : t) 
    : [];
  const defaultProductQc = Array.isArray(productSpec?.default_product_qc) 
    ? (productSpec?.default_product_qc as any[]).map(t => typeof t === 'object' ? t.name || t.code : t) 
    : [];
  const defaultProcessMethods = Array.isArray(productSpec?.default_postprocess_methods) 
    ? (productSpec?.default_postprocess_methods as any[]).map(m => m.name || m.code) 
    : [];

  // Calculate volumes
  const selectedPackFormat = packFormats.find(f => f.pack_format_code === formData.pack_format_code);
  const unitVolume = selectedPackFormat?.nominal_fill_volume_ml || 0;
  const requiredVolume = formData.qty_units * unitVolume;

  // Filter available CM lots by matching media_spec_id
  const matchingCmLots = productSpec?.media_spec_id 
    ? availableCmLots.filter(lot => lot.media_spec_id === productSpec.media_spec_id)
    : [];
  const hasMatchingCmLots = matchingCmLots.length > 0;
  const selectedCmLot = matchingCmLots.find(l => l.cm_lot_id === formData.reserved_cm_lot_id);
  const volumeShortage = selectedCmLot && requiredVolume > selectedCmLot.available_ml;

  // Filter pack formats for product only
  const productPackFormats = packFormats.filter(pf => (pf as any).purpose === 'product' || !(pf as any).purpose);

  // Parse additives from media spec
  const additives = mediaSpec && (mediaSpec as any).additives_json 
    ? (() => { try { return JSON.parse((mediaSpec as any).additives_json); } catch { return []; } })()
    : [];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Заявки</h1>
        {hasRole(['Manager', 'Admin']) && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Создать заявку
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && !showPreview && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Новая заявка</h3>
            <button onClick={() => { setShowForm(false); resetForm(); setSearchParams({}); }} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Продукт *</label>
            <select
              value={formData.product_code}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Выберите продукт</option>
              {products.map(p => (
                <option key={p.product_code} value={p.product_code}>{p.product_name} ({p.product_code})</option>
              ))}
            </select>
          </div>

          {/* Product Spec Card - читаем из frozen_spec */}
          {productSpec && (
            <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Package size={18} />
                Спецификация продукта
                {(productSpec as any).frozen_spec && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ frozen</span>
                )}
              </h4>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Среда - из frozen_spec.media */}
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-center gap-1 text-teal-700 font-medium text-sm mb-1">
                    <Beaker size={14} />
                    СРЕДА
                  </div>
                  {(() => {
                    const fs = (productSpec as any).frozen_spec;
                    const media = fs?.media;
                    if (media) {
                      return (
                        <div className="text-sm space-y-0.5">
                          <p className="font-semibold">{media.base_media?.code || media.name || '—'}</p>
                          <p>{media.serum_class || '—'}</p>
                          <p>{media.base_media?.phenol_red ? '🔴 PR+' : '⚪ PR-'} | Glu {media.l_glutamine_mm || 0}mM</p>
                          {media.additives?.length > 0 && (
                            <p className="text-xs text-teal-600">
                              + {media.additives.map((a: any) => `${a.name || a.code} ${a.concentration || ''}${a.unit || ''}`).join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    }
                    // Fallback на старый способ если frozen_spec нет
                    if (mediaSpec) {
                      return (
                        <div className="text-sm space-y-0.5">
                          <p className="font-semibold">{mediaSpec.base_medium_code}</p>
                          <p>{mediaSpec.serum_class}</p>
                          <p>{mediaSpec.phenol_red_flag ? '🔴 PR+' : '⚪ PR-'} | Glu {(mediaSpec as any).l_glutamine_mm || 0}mM</p>
                        </div>
                      );
                    }
                    return <span className="text-amber-600 text-sm">Не указана</span>;
                  })()}
                </div>

                {/* Фасовка - из frozen_spec.pack_format */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-700 font-medium text-sm mb-1">
                    <Package size={14} />
                    ФАСОВКА
                  </div>
                  <div className="text-sm">
                    {(() => {
                      const fs = (productSpec as any).frozen_spec;
                      const pack = fs?.pack_format;
                      if (pack) {
                        return (
                          <>
                            <p className="font-semibold">{pack.name || pack.code}</p>
                            <p>{pack.volume_ml} мл</p>
                          </>
                        );
                      }
                      if (selectedPackFormat) {
                        return (
                          <>
                            <p className="font-semibold">{selectedPackFormat.name}</p>
                            <p>{selectedPackFormat.nominal_fill_volume_ml} мл</p>
                          </>
                        );
                      }
                      return <span className="text-amber-600">Выберите</span>;
                    })()}
                  </div>
                </div>

                {/* Процессинг - из frozen_spec.processing */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-1 text-purple-700 font-medium text-sm mb-1">
                    <Cog size={14} />
                    ПРОЦЕССИНГ
                  </div>
                  <div className="text-sm">
                    {(() => {
                      const fs = (productSpec as any).frozen_spec;
                      const rawProc = fs?.processing?.raw || [];
                      const postProc = fs?.processing?.post || [];
                      const allProc = [...rawProc, ...postProc];
                      if (allProc.length > 0) {
                        return allProc.map((m: any, i: number) => <p key={i}>{m.name || m.method_id}</p>);
                      }
                      if (defaultProcessMethods.length > 0) {
                        return defaultProcessMethods.map((m, i) => <p key={i}>{m}</p>);
                      }
                      return <span className="text-slate-400">Не указан</span>;
                    })()}
                  </div>
                </div>

                {/* QC - из frozen_spec.qc */}
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-1 text-emerald-700 font-medium text-sm mb-1">
                    <ClipboardCheck size={14} />
                    QC
                  </div>
                  <div className="text-xs space-y-1">
                    {(() => {
                      const fs = (productSpec as any).frozen_spec;
                      const rawQc = fs?.qc?.raw || [];
                      const prodQc = fs?.qc?.product || [];
                      return (
                        <>
                          <div>
                            <span className="text-slate-500">Сырьё:</span>{' '}
                            {rawQc.length > 0 ? rawQc.map((t: any) => t.name || t.code).join(', ') : (defaultRawQc.length > 0 ? defaultRawQc.join(', ') : '—')}
                          </div>
                          <div>
                            <span className="text-slate-500">Продукт:</span>{' '}
                            {prodQc.length > 0 ? prodQc.map((t: any) => t.name || t.code).join(', ') : (defaultProductQc.length > 0 ? defaultProductQc.join(', ') : '—')}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CM Availability Check */}
          {productSpec && (
            <div className={`p-4 rounded-lg border ${hasMatchingCmLots ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-2">
                {hasMatchingCmLots ? (
                  <CheckCircle className="text-green-600 mt-0.5" size={20} />
                ) : (
                  <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <h4 className={`font-medium ${hasMatchingCmLots ? 'text-green-800' : 'text-amber-800'}`}>
                    {hasMatchingCmLots ? 'Есть CM на складе' : 'Нет готового CM на складе'}
                  </h4>
                  {hasMatchingCmLots ? (
                    <div className="mt-2">
                      <select
                        value={formData.reserved_cm_lot_id}
                        onChange={(e) => setFormData({ ...formData, reserved_cm_lot_id: e.target.value, extra_raw_qc: [], extra_raw_process: [] })}
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="">Не резервировать (MTO)</option>
                        {matchingCmLots.map(lot => {
                          const possibleUnits = unitVolume > 0 ? Math.floor(lot.available_ml / unitVolume) : 0;
                          return (
                            <option key={lot.cm_lot_id} value={lot.cm_lot_id}>
                              {lot.cm_lot_id} — {lot.available_ml.toFixed(0)} мл (~{possibleUnits} фл.)
                              {lot.expiry_date && ` (годен до ${new Date(lot.expiry_date).toLocaleDateString('ru-RU')})`}
                            </option>
                          );
                        })}
                      </select>
                      {volumeShortage && (
                        <p className="text-amber-600 text-sm mt-1">
                          ⚠️ Недостаточно объёма ({selectedCmLot?.available_ml.toFixed(0)} мл). 
                          Рекомендуется зарезервировать доступное и создать новую заявку на остаток.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700 mt-1">
                      Заявка будет направлена в производство (MTO)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extra Requirements */}
          {productSpec && (
            <>
              <div className={`p-4 rounded-lg border ${formData.reserved_cm_lot_id ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className={`font-medium ${formData.reserved_cm_lot_id ? 'text-slate-500' : 'text-blue-800'}`}>
                    Доп. требования к СЫРЬЮ
                    {formData.reserved_cm_lot_id && (
                      <span className="ml-2 text-xs font-normal text-slate-400">(сырьё уже готово)</span>
                    )}
                  </h4>
                  {!formData.reserved_cm_lot_id && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowQcRawModal(true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        + QC
                      </button>
                      <button type="button" onClick={() => setShowProcessRawModal(true)}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                        + Процессинг
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.reserved_cm_lot_id ? (
                    <span className="text-slate-400 text-sm italic">Сырьё со склада — QC и процессинг уже пройдены</span>
                  ) : (
                    <>
                      {formData.extra_raw_qc.map(req => (
                        <span key={req.code} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {req.name}
                          <button onClick={() => removeExtraRequirement('qc_raw', req.code)}><X size={14} /></button>
                        </span>
                      ))}
                      {formData.extra_raw_process.map(req => (
                        <span key={req.code} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                          {req.name}
                          <button onClick={() => removeExtraRequirement('process_raw', req.code)}><X size={14} /></button>
                        </span>
                      ))}
                      {formData.extra_raw_qc.length === 0 && formData.extra_raw_process.length === 0 && (
                        <span className="text-slate-400 text-sm">Нет дополнительных</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-emerald-800">Доп. требования к ПРОДУКТУ</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowQcProductModal(true)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">
                      + QC
                    </button>
                    <button type="button" onClick={() => setShowProcessProductModal(true)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                      + Процессинг
                    </button>
                    <button type="button" onClick={() => setShowPostProcessProductModal(true)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                      + Постпроцессинг
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.extra_product_qc.map(req => (
                    <span key={req.code} className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-sm">
                      QC: {req.name}
                      <button onClick={() => removeExtraRequirement('qc_product', req.code)}><X size={14} /></button>
                    </span>
                  ))}
                  {formData.extra_pre_process.map(req => (
                    <span key={req.code} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                      Проц: {req.name}
                      <button onClick={() => removeExtraRequirement('pre_process', req.code)}><X size={14} /></button>
                    </span>
                  ))}
                  {formData.extra_post_process.map(req => (
                    <span key={req.code} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm">
                      Пост: {req.name}
                      <button onClick={() => removeExtraRequirement('post_process', req.code)}><X size={14} /></button>
                    </span>
                  ))}
                  {formData.extra_product_qc.length === 0 && formData.extra_pre_process.length === 0 && formData.extra_post_process.length === 0 && (
                    <span className="text-slate-400 text-sm">Нет дополнительных</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Pack Format (if not set in product) */}
          {productSpec && !(productSpec as any).default_pack_format_code && (
            <div>
              <label className="block text-sm font-medium mb-1">Формат упаковки (для продукта) *</label>
              <select
                value={formData.pack_format_code}
                onChange={(e) => setFormData({ ...formData, pack_format_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Выберите</option>
                {productPackFormats.map(pf => (
                  <option key={pf.pack_format_code} value={pf.pack_format_code}>
                    {pf.name} ({pf.nominal_fill_volume_ml} мл)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity + Volume Calculation */}
          {productSpec && (
            <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border-2 border-blue-400">
              <div className="flex justify-between items-center mb-2">
                <label className="text-lg font-bold text-blue-800">КОЛИЧЕСТВО</label>
                {selectedCmLot && unitVolume > 0 && (
                  <span className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                    Макс. доступно: {Math.floor(selectedCmLot.available_ml / unitVolume)} шт
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max={selectedCmLot && unitVolume > 0 ? Math.floor(selectedCmLot.available_ml / unitVolume) : undefined}
                  value={formData.qty_units}
                  onChange={(e) => setFormData({ ...formData, qty_units: Number(e.target.value) })}
                  className="w-32 px-4 py-3 border-2 border-blue-500 rounded-lg text-2xl font-bold text-center bg-white"
                  required
                />
                <div className="text-lg">
                  <span className="text-slate-600">×</span>{' '}
                  <span className="font-semibold">{unitVolume} мл</span>{' '}
                  <span className="text-slate-600">=</span>{' '}
                  <span className="font-bold text-blue-800">{requiredVolume.toLocaleString()} мл</span>
                </div>
              </div>
            </div>
          )}

          {/* Due Date + Customer Ref */}
          {productSpec && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ссылка заказчика</label>
                <input
                  type="text"
                  value={formData.customer_ref}
                  onChange={(e) => setFormData({ ...formData, customer_ref: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-red-600">Срок исполнения *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:border-red-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); setSearchParams({}); }} className="px-4 py-2 border rounded-lg">
              Отмена
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!formData.product_code || !formData.pack_format_code || formData.qty_units < 1 || !formData.due_date}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Создать заявку
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Превью заявки</h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Main Info */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Продукт:</span>
                <strong>{formData.product_code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Количество:</span>
                <strong className="text-xl text-blue-600">{formData.qty_units} ед. = {requiredVolume.toLocaleString()} мл</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Упаковка:</span>
                <span>{selectedPackFormat?.name} ({unitVolume} мл)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Срок:</span>
                <strong className="text-red-600">{new Date(formData.due_date).toLocaleDateString('ru-RU')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Тип:</span>
                <span className={`px-2 py-0.5 rounded text-sm font-medium ${formData.reserved_cm_lot_id ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {formData.reserved_cm_lot_id ? 'MTS (со склада)' : 'MTO (производство)'}
                </span>
              </div>
            </div>

            {/* Media Spec */}
            {mediaSpec && (
              <div className="p-3 bg-teal-50 rounded-lg text-sm">
                <span className="font-medium text-teal-800">Среда:</span>{' '}
                {mediaSpec.base_medium_code} | {mediaSpec.serum_class} | 
                {mediaSpec.phenol_red_flag ? ' 🔴 PR+' : ' ⚪ PR-'} | Glu {(mediaSpec as any).l_glutamine_mm || 0}mM
              </div>
            )}

            {/* Reserved CM */}
            {formData.reserved_cm_lot_id && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <span className="font-medium text-green-800">Резерв CM:</span>{' '}
                {formData.reserved_cm_lot_id}
              </div>
            )}

            {/* Extra Requirements */}
            {(formData.extra_raw_qc.length > 0 || formData.extra_raw_process.length > 0) && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <span className="font-medium text-blue-800">Доп. требования к сырью:</span>{' '}
                {[...formData.extra_raw_qc, ...formData.extra_raw_process].map(r => r.name).join(', ')}
              </div>
            )}
            {(formData.extra_product_qc.length > 0 || formData.extra_pre_process.length > 0 || formData.extra_post_process.length > 0) && (
              <div className="p-3 bg-emerald-50 rounded-lg text-sm">
                <span className="font-medium text-emerald-800">Доп. требования к продукту:</span>{' '}
                {[...formData.extra_product_qc, ...formData.extra_pre_process, ...formData.extra_post_process].map(r => r.name).join(', ')}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 border rounded-lg">
                Редактировать
              </button>
              <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for QC/Process */}
      {showQcRawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить QC сырья</h3>
              <button onClick={() => setShowQcRawModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {qcTestTypes.map(test => (
                <button key={test.code} onClick={() => { addExtraRequirement('qc_raw', test.code, test.name); setShowQcRawModal(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded border">
                  {test.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQcProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить QC продукта</h3>
              <button onClick={() => setShowQcProductModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {qcTestTypes.map(test => (
                <button key={test.code} onClick={() => { addExtraRequirement('qc_product', test.code, test.name); setShowQcProductModal(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 rounded border">
                  {test.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showProcessRawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить процессинг сырья</h3>
              <button onClick={() => setShowProcessRawModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {processMethods.map(method => (
                <button key={method.method_id} onClick={() => { addExtraRequirement('process_raw', method.method_id, method.name); setShowProcessRawModal(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded border">
                  {method.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showProcessProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить процессинг (до розлива)</h3>
              <button onClick={() => setShowProcessProductModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {processMethods.filter((m: any) => m.stage === 'pre_filling').map(method => (
                <button key={method.method_id} onClick={() => { addExtraRequirement('pre_process', method.method_id, method.name); setShowProcessProductModal(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded border">
                  {method.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPostProcessProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Добавить постпроцессинг (после розлива)</h3>
              <button onClick={() => setShowPostProcessProductModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {processMethods.filter((m: any) => m.stage === 'post_filling').map(method => (
                <button key={method.method_id} onClick={() => { addExtraRequirement('post_process', method.method_id, method.name); setShowPostProcessProductModal(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded border">
                  {method.name}
                </button>
              ))}
              {processMethods.filter((m: any) => m.stage === 'post_filling').length === 0 && (
                <p className="text-slate-400 text-sm">Нет доступных методов постпроцессинга</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Поиск по номеру, продукту..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={e => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            Показать завершённые
          </label>
          <select
            value={`${sortField}-${sortDir}`}
            onChange={e => {
              const [field, dir] = e.target.value.split('-');
              setSortField(field as any);
              setSortDir(dir as any);
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="due_date-asc">Срок ↑</option>
            <option value="due_date-desc">Срок ↓</option>
            <option value="created_at-desc">Дата создания ↓</option>
            <option value="created_at-asc">Дата создания ↑</option>
            <option value="request_id-desc">Номер ↓</option>
            <option value="request_id-asc">Номер ↑</option>
            <option value="status-asc">Статус A-Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Номер</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Создана</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Срок</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Осталось</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Тип</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">CM Lot</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Статус</th>
              {hasRole(['Admin']) && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests
              .filter(req => {
                // Hide completed unless showCompleted is true
                if (!showCompleted && (req.status === 'Completed' || req.status === 'Cancelled')) return false;
                // Search filter
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  return req.request_id.toLowerCase().includes(q) ||
                    (req.product_code || '').toLowerCase().includes(q) ||
                    (req.customer_ref || '').toLowerCase().includes(q) ||
                    (req.status || '').toLowerCase().includes(q);
                }
                return true;
              })
              .sort((a, b) => {
                const aVal = (a as any)[sortField] || '';
                const bVal = (b as any)[sortField] || '';
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return sortDir === 'asc' ? cmp : -cmp;
              })
              .map((req) => {
              const hoursLeft = req.due_date ? (new Date(req.due_date).getTime() - Date.now()) / (60 * 60 * 1000) : null;
              const isOverdue = hoursLeft !== null && hoursLeft < 0;
              const isUrgent24h = hoursLeft !== null && hoursLeft >= 0 && hoursLeft < 24;
              const isUrgent72h = hoursLeft !== null && hoursLeft >= 24 && hoursLeft < 72;
              const daysLeft = hoursLeft !== null ? Math.ceil(hoursLeft / 24) : null;
              
              return (
                <tr key={req.request_id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : isUrgent24h ? 'bg-red-50' : isUrgent72h ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Link to={`/requests/${req.request_id}`} className="font-mono text-blue-600 hover:underline">
                      {req.request_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {req.created_at ? new Date(req.created_at).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {req.due_date ? new Date(req.due_date).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-bold ${
                    isOverdue || isUrgent24h ? 'text-red-600' : isUrgent72h ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {daysLeft !== null ? `${daysLeft} дн.` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      (req as any).type === 'MTO' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(req as any).type || 'MTS'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {req.reserved_cm_lot_id ? (
                      <Link to={`/cm/${req.reserved_cm_lot_id}`} className="font-mono text-blue-600 hover:underline">
                        {req.reserved_cm_lot_id}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      req.status === 'New' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'InProgress' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </td>
                  {hasRole(['Admin']) && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteRequest(req.request_id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
