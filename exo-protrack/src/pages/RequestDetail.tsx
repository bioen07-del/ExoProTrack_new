import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Play, ChevronDown, ChevronUp, CheckCircle, Clock, Circle } from 'lucide-react';
import { supabase, Request, RequestLine, Reservation, PackLot, CmLot, Container, PackFormat, Product } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ProductRequirementsCard from '../components/ProductRequirementsCard';

// Production status steps - расширенный прогресс с розливом
const PRODUCTION_STEPS = [
  { key: 'collection', label: 'Сбор', cmStatuses: ['Open'], packStatuses: [] },
  { key: 'processing', label: 'Обработка', cmStatuses: ['Closed_Collected', 'In_Processing'], packStatuses: [] },
  { key: 'qc_raw', label: 'QC сырья', cmStatuses: ['QC_Pending', 'QC_Completed'], packStatuses: [] },
  { key: 'qa', label: 'QA', cmStatuses: ['Approved'], packStatuses: [] },
  { key: 'filling', label: 'Розлив', cmStatuses: [], packStatuses: ['Processing', 'Filling', 'Filled'] },
  { key: 'released', label: 'Готово', cmStatuses: [], packStatuses: ['QC_Pending', 'QC_Completed', 'QA_Pending', 'Released'] },
];

function getProductionProgress(cmStatus: string, packStatus?: string): { currentStep: number; progress: number; label: string } {
  const totalSteps = PRODUCTION_STEPS.length;
  
  // Check pack_lot status first (higher priority for later stages)
  if (packStatus) {
    for (let i = totalSteps - 1; i >= 0; i--) {
      if (PRODUCTION_STEPS[i].packStatuses.includes(packStatus)) {
        const progress = Math.round(((i + 1) / totalSteps) * 100);
        return { currentStep: i + 1, progress, label: PRODUCTION_STEPS[i].label };
      }
    }
  }
  
  // Fall back to CM lot status
  if (cmStatus) {
    for (let i = 0; i < totalSteps; i++) {
      if (PRODUCTION_STEPS[i].cmStatuses.includes(cmStatus)) {
        const progress = Math.round(((i + 1) / totalSteps) * 100);
        return { currentStep: i + 1, progress, label: PRODUCTION_STEPS[i].label };
      }
    }
  }
  
  return { currentStep: 0, progress: 0, label: cmStatus || 'Не начато' };
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);
  const [lines, setLines] = useState<RequestLine[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [packLots, setPackLots] = useState<PackLot[]>([]);
  const [availableCmLots, setAvailableCmLots] = useState<(CmLot & { container?: Container })[]>([]);
  const [packFormats, setPackFormats] = useState<PackFormat[]>([]);
  const [linkedCmLot, setLinkedCmLot] = useState<CmLot | null>(null);
  const [productSpec, setProductSpec] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Reservation modal state
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState<RequestLine | null>(null);
  const [selectedCmLot, setSelectedCmLot] = useState<string>('');
  const [reserveVolume, setReserveVolume] = useState<number>(0);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  
  // Draft request completion state
  const [draftSourceType, setDraftSourceType] = useState<'FromStock' | 'NewProduction' | ''>('');
  const [draftCmLotId, setDraftCmLotId] = useState<string>('');
  const [draftQty, setDraftQty] = useState<number>(0);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const [reqRes, linesRes, reservationsRes, packLotsRes, cmLotsRes, containersRes, formatsRes] = await Promise.all([
        supabase.from('request').select('*').eq('request_id', id).single(),
        supabase.from('request_line').select('*').eq('request_id', id),
        supabase.from('reservation').select('*'),
        supabase.from('pack_lot').select('*'),
        supabase.from('cm_lot').select('*').eq('status', 'Approved'),
        supabase.from('container').select('*').eq('owner_entity_type', 'CM_Lot').eq('status', 'Approved'),
        supabase.from('pack_format').select('*'),
      ]);

      setRequest(reqRes.data);
      setLines(linesRes.data || []);
      setReservations(reservationsRes.data || []);
      setPackLots(packLotsRes.data || []);
      setPackFormats(formatsRes.data || []);

      // Load linked CM Lot if exists
      if (reqRes.data?.reserved_cm_lot_id) {
        const { data: cmLot } = await supabase
          .from('cm_lot')
          .select('*')
          .eq('cm_lot_id', reqRes.data.reserved_cm_lot_id)
          .single();
        setLinkedCmLot(cmLot);
      } else {
        // Check if there's an MTO CM lot linked via request_line
        const lineIds = (linesRes.data || []).map((l: any) => l.request_line_id);
        if (lineIds.length > 0) {
          const { data: mtoCmLot } = await supabase
            .from('cm_lot')
            .select('*')
            .in('request_line_id', lineIds)
            .single();
          if (mtoCmLot) setLinkedCmLot(mtoCmLot);
        }
      }

      // Load product spec for QC info
      const productCode = reqRes.data?.product_code || linesRes.data?.[0]?.finished_product_code;
      if (productCode) {
        const { data: product } = await supabase
          .from('product')
          .select('*')
          .eq('product_code', productCode)
          .single();
        setProductSpec(product);
      }

      // Calculate available volumes for CM lots
      const cmLots = cmLotsRes.data || [];
      const containers = containersRes.data || [];
      const activeReservations = (reservationsRes.data || []).filter(r => r.status === 'Active');

      const lotsWithAvailable = cmLots.map(lot => {
        const container = containers.find(c => c.owner_id === lot.cm_lot_id);
        const lotReservations = activeReservations.filter(r => r.cm_lot_id === lot.cm_lot_id);
        const reserved = lotReservations.reduce((sum, r) => sum + r.reserved_volume_ml, 0);
        const available = (container?.current_volume_ml || 0) - reserved;
        return { ...lot, container, available_ml: Math.max(0, available) };
      });

      setAvailableCmLots(lotsWithAvailable.filter(l => (l as any).available_ml > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openReserveModal(line: RequestLine) {
    const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);
    const requiredVolume = line.qty_units * (format?.nominal_fill_volume_ml || 0);
    
    setSelectedLine(line);
    setReserveVolume(requiredVolume);
    setShowReserveModal(true);
  }

  async function handleReserve() {
    if (!selectedLine || !selectedCmLot) return;

    const selectedLot = availableCmLots.find(l => l.cm_lot_id === selectedCmLot);
    const availableVolume = (selectedLot as any)?.available_ml || 0;

    if (reserveVolume > availableVolume) {
      if (!confirm(`Доступно только ${availableVolume.toFixed(1)} мл. Зарезервировать доступный объем и создать новую заявку на остаток?`)) {
        return;
      }
      setReserveVolume(availableVolume);
    }

    try {
      await supabase.from('reservation').insert({
        cm_lot_id: selectedCmLot,
        request_line_id: selectedLine.request_line_id,
        reserved_volume_ml: Math.min(reserveVolume, availableVolume),
        reserved_at: new Date().toISOString(),
        reserved_by: user?.user_id,
        status: 'Active',
      });

      await supabase.from('request')
        .update({ status: 'InProgress' })
        .eq('request_id', id);

      setShowReserveModal(false);
      setSelectedLine(null);
      setSelectedCmLot('');
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function handleStartCmFromMto(line: RequestLine) {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('cm_lot')
        .select('*', { count: 'exact', head: true })
        .like('cm_lot_id', `CM-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const cmLotId = `CM-${dateStr}-${seqNum}`;

      const { data: product } = await supabase
        .from('product')
        .select('*')
        .eq('product_code', line.finished_product_code)
        .single();

      const { error: lotError } = await supabase.from('cm_lot').insert({
        cm_lot_id: cmLotId,
        mode: 'MTO',
        base_product_code: line.finished_product_code,
        status: 'Open',
        collection_start_at: new Date().toISOString(),
        created_by: user?.user_id,
        request_line_id: line.request_line_id,
        media_spec_id: product?.media_spec_id || null,
      });

      if (lotError) throw lotError;

      await supabase.from('container').insert({
        owner_entity_type: 'CmLot',
        owner_id: cmLotId,
        container_type: 'Bag250',
        current_volume_ml: 0,
        status: 'InProcess',
      });

      await supabase.from('reservation').insert({
        cm_lot_id: cmLotId,
        request_line_id: line.request_line_id,
        reserved_volume_ml: 0,
        reserved_at: new Date().toISOString(),
        reserved_by: user?.user_id,
        status: 'Active',
      });

      await supabase.from('request')
        .update({ status: 'InProgress' })
        .eq('request_id', id);

      navigate(`/cm/${cmLotId}`);
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function handleCompleteDraftRequest(line: RequestLine) {
    if (!draftSourceType) {
      alert('Выберите источник сырья');
      return;
    }
    
    try {
      const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);
      
      // Update request line with source type
      await supabase.from('request_line')
        .update({ source_type: draftSourceType, qty_units: draftQty || line.qty_units })
        .eq('request_line_id', line.request_line_id);
      
      if (draftSourceType === 'FromStock' && draftCmLotId) {
        // Create reservation and pack lot for FromStock
        const requiredVolume = (draftQty || line.qty_units) * (format?.nominal_fill_volume_ml || 0);
        
        // Create pack lot
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const { count } = await supabase
          .from('pack_lot')
          .select('*', { count: 'exact', head: true })
          .like('pack_lot_id', `PK-${dateStr}-%`);
        
        const seqNum = String((count || 0) + 1).padStart(4, '0');
        const packLotId = `PK-${dateStr}-${seqNum}`;
        
        await supabase.from('reservation').insert({
          cm_lot_id: draftCmLotId,
          request_line_id: line.request_line_id,
          reserved_volume_ml: requiredVolume,
          reserved_at: new Date().toISOString(),
          reserved_by: user?.user_id,
          status: 'Active',
        });
        
        // Check if product has processing methods
        const processingMethods = Array.isArray(productSpec?.default_postprocess_methods) 
          ? productSpec.default_postprocess_methods as any[] 
          : [];
        const hasProcessing = processingMethods.length > 0;
        
        await supabase.from('pack_lot').insert({
          pack_lot_id: packLotId,
          request_line_id: line.request_line_id,
          source_cm_lot_id: draftCmLotId,
          pack_format_code: line.pack_format_code,
          qty_planned: draftQty || line.qty_units,
          status: hasProcessing ? 'Processing' : 'Filling',
          created_by: user?.user_id,
        });
        
        // Create processing steps if product has processing methods
        if (hasProcessing) {
          for (let i = 0; i < processingMethods.length; i++) {
            const m = processingMethods[i];
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
        
        await supabase.from('container').insert({
          owner_entity_type: 'PackLot',
          owner_id: packLotId,
          container_type: format?.container_type || 'Vial4',
          current_qty: 0,
          status: 'Quarantine',
        });
        
        // Update request and request line
        await supabase.from('request')
          .update({ 
            status: 'InProgress',
            reserved_cm_lot_id: draftCmLotId
          })
          .eq('request_id', id);
        
        navigate(`/packlot/${packLotId}`);
      } else {
        // NewProduction (MTO) - create CM lot
        await handleStartCmFromMto(line);
      }
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function handleClosePartialLine(line: RequestLine) {
    if (!confirm(`Закрыть строку как выполненную с ${(line as any).qty_fulfilled} из ${line.qty_units} шт?`)) return;
    try {
      await supabase.from('request_line')
        .update({ status: 'Completed' })
        .eq('request_line_id', line.request_line_id);
      
      // Check if all lines are completed
      const allCompleted = lines.every(l => 
        l.request_line_id === line.request_line_id || (l as any).status === 'Completed'
      );
      if (allCompleted) {
        await supabase.from('request')
          .update({ status: 'Completed' })
          .eq('request_id', id);
      }
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function handleCreateRemainderRequest(line: RequestLine) {
    const remainder = line.qty_units - ((line as any).qty_fulfilled || 0);
    if (!confirm(`Создать новую заявку на ${remainder} шт?`)) return;
    
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('request')
        .select('*', { count: 'exact', head: true })
        .like('request_id', `REQ-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const newReqId = `REQ-${dateStr}-${seqNum}`;

      // Create new request
      await supabase.from('request').insert({
        request_id: newReqId,
        customer_ref: request?.customer_ref,
        product_code: request?.product_code,
        status: 'New',
        created_by: user?.user_id,
        parent_request_id: id,
      });

      // Create request line for remainder
      await supabase.from('request_line').insert({
        request_id: newReqId,
        finished_product_code: line.finished_product_code,
        pack_format_code: line.pack_format_code,
        qty_units: remainder,
        source_type: (line as any).source_type,
      });

      // Mark original line as completed
      await supabase.from('request_line')
        .update({ status: 'Completed' })
        .eq('request_line_id', line.request_line_id);

      alert(`Создана заявка ${newReqId} на ${remainder} шт`);
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function createPackLot(line: RequestLine) {
    const lineReservations = reservations.filter(r => 
      r.request_line_id === line.request_line_id && r.status === 'Active'
    );

    if (lineReservations.length === 0) {
      alert('Нет активных резервов для этой строки');
      return;
    }

    const reservation = lineReservations[0];

    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('pack_lot')
        .select('*', { count: 'exact', head: true })
        .like('pack_lot_id', `PK-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const packLotId = `PK-${dateStr}-${seqNum}`;

      const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);

      await supabase.from('pack_lot').insert({
        pack_lot_id: packLotId,
        request_line_id: line.request_line_id,
        source_cm_lot_id: reservation.cm_lot_id,
        pack_format_code: line.pack_format_code,
        qty_planned: line.qty_units,
        has_lyophilization: false,
        status: 'Planned',
        created_by: user?.user_id,
      });

      await supabase.from('container').insert({
        owner_entity_type: 'PackLot',
        owner_id: packLotId,
        container_type: format?.container_type || 'Vial4',
        current_qty: 0,
        status: 'Quarantine',
      });

      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  // Determine if this is an MTO request
  const isMTO = lines.some(l => (l as any).source_type === 'NewProduction' || (l as any).source_type === 'new_batch');

  // Parse QC arrays from product spec
  const rawQcTests = Array.isArray(productSpec?.default_primary_qc) 
    ? (productSpec?.default_primary_qc as any[]).map(t => typeof t === 'object' ? t.name || t.code : t) 
    : [];
  const productQcTests = Array.isArray(productSpec?.default_product_qc) 
    ? (productSpec?.default_product_qc as any[]).map(t => typeof t === 'object' ? t.name || t.code : t) 
    : [];
  
  // Add extra QC from request
  const extraPrimaryQc = Array.isArray((request as any)?.extra_primary_qc) ? (request as any).extra_primary_qc : [];
  const extraProductQc = Array.isArray((request as any)?.postprocess_qc) ? (request as any).postprocess_qc : [];

  const allRawQc = [...rawQcTests, ...extraPrimaryQc];
  const allProductQc = [...productQcTests, ...extraProductQc];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  if (!request) {
    return <div className="text-center py-8 text-red-500">Заявка не найдена</div>;
  }

  // Get the most advanced pack_lot status for progress calculation
const relatedPackLots = packLots.filter(p => 
  lines.some(l => l.request_line_id === p.request_line_id)
);
const packStatusPriority = ['Released', 'QA_Pending', 'QC_Completed', 'QC_Pending', 'Filled', 'Filling', 'Processing'];
const bestPackStatus = relatedPackLots.length > 0 
  ? packStatusPriority.find(s => relatedPackLots.some(p => p.status === s)) 
  : undefined;
const productionStatus = linkedCmLot ? getProductionProgress(linkedCmLot.status, bestPackStatus) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-mono">{request.request_id}</h1>
          <p className="text-slate-500">
            {request.customer_ref && `Заказчик: ${request.customer_ref} | `}
            Создана: {(request as any).created_at ? new Date((request as any).created_at).toLocaleDateString('ru-RU') : '-'} | 
            Срок: {request.due_date ? new Date(request.due_date).toLocaleDateString('ru-RU') : 'Не указан'}
            {request.due_date && (() => {
              const daysLeft = Math.ceil((new Date(request.due_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
              const color = daysLeft < 0 ? 'text-red-600' : daysLeft < 3 ? 'text-amber-600' : 'text-green-600';
              return <span className={`ml-2 font-semibold ${color}`}>({daysLeft} дн.)</span>;
            })()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          request.status === 'New' ? 'bg-blue-100 text-blue-800' :
          request.status === 'InProgress' ? 'bg-amber-100 text-amber-800' :
          request.status === 'Completed' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {request.status === 'New' ? 'Открыт' : 
           request.status === 'InProgress' ? 'В работе' :
           request.status === 'Completed' ? 'Завершен' : request.status}
        </span>
      </div>

      {/* Production Status Visualizer */}
      {linkedCmLot && productionStatus && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-900">Статус производства CM</h3>
            <Link to={`/cm/${linkedCmLot.cm_lot_id}`} className="text-blue-600 hover:underline text-sm font-mono">
              {linkedCmLot.cm_lot_id}
            </Link>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-2">
            {PRODUCTION_STEPS.map((step, idx) => {
              const isCompleted = productionStatus.currentStep > idx + 1;
              const isCurrent = productionStatus.currentStep === idx + 1;
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isCompleted ? 'bg-green-100 text-green-800' :
                    isCurrent ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {isCompleted ? <CheckCircle size={14} /> : isCurrent ? <Clock size={14} /> : <Circle size={14} />}
                    {step.label}
                  </div>
                  {idx < PRODUCTION_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-green-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${productionStatus.progress}%` }}
              />
            </div>
            <span className="font-medium">{productionStatus.progress}%</span>
            <span className="text-slate-400">|</span>
            <span>{productionStatus.label}</span>
          </div>
        </div>
      )}

      {/* QC Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* QC сырья */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h4 className="font-medium text-slate-700 mb-3">QC сырья</h4>
          <div className="flex flex-wrap gap-2">
            {allRawQc.length > 0 ? allRawQc.map((test, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm border border-blue-200">
                {test}
              </span>
            )) : (
              <span className="text-slate-400 text-sm">Не указано</span>
            )}
          </div>
        </div>
        
        {/* QC продукта */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h4 className="font-medium text-slate-700 mb-3">QC продукта</h4>
          <div className="flex flex-wrap gap-2">
            {allProductQc.length > 0 ? allProductQc.map((test, idx) => (
              <span key={idx} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm border border-emerald-200">
                {test}
              </span>
            )) : (
              <span className="text-slate-400 text-sm">Не указано</span>
            )}
          </div>
        </div>
      </div>

      {/* Draft Request Completion Form */}
      {request.status === 'New' && lines.length > 0 && !lines[0].source_type && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-600" size={24} />
            <h3 className="text-lg font-semibold text-amber-800">Завершите оформление заявки</h3>
          </div>
          
          <p className="text-sm text-amber-700 mb-4">
            Эта заявка создана как дозаказ. Выберите источник сырья и подтвердите количество.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Продукт</label>
              <p className="px-3 py-2 bg-white rounded border text-slate-800">{lines[0].finished_product_code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Количество (шт)</label>
              <input
                type="number"
                min="1"
                value={draftQty || lines[0].qty_units}
                onChange={(e) => setDraftQty(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Источник сырья</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  value="FromStock"
                  checked={draftSourceType === 'FromStock'}
                  onChange={() => setDraftSourceType('FromStock')}
                  className="w-4 h-4"
                />
                <span className="text-slate-700">Со склада (готовое)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  value="NewProduction"
                  checked={draftSourceType === 'NewProduction'}
                  onChange={() => setDraftSourceType('NewProduction')}
                  className="w-4 h-4"
                />
                <span className="text-slate-700">Новое производство (MTO)</span>
              </label>
            </div>
          </div>
          
          {draftSourceType === 'FromStock' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Выберите партию сырья</label>
              <select
                value={draftCmLotId}
                onChange={(e) => setDraftCmLotId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Выберите --</option>
                {availableCmLots.map(lot => (
                  <option key={lot.cm_lot_id} value={lot.cm_lot_id}>
                    {lot.cm_lot_id} - {((lot.container as any)?.current_volume_ml || 0).toFixed(0)} мл
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={() => handleCompleteDraftRequest(lines[0])}
            disabled={!draftSourceType || (draftSourceType === 'FromStock' && !draftCmLotId)}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Подтвердить и продолжить
          </button>
        </div>
      )}

      {/* Lines */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Строки заявки</h3>
        <div className="space-y-4">
          {lines.map((line) => {
            const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);
            const lineReservations = reservations.filter(r => 
              r.request_line_id === line.request_line_id && r.status === 'Active'
            );
            const linePacks = packLots.filter(p => p.request_line_id === line.request_line_id);
            const hasReservation = lineReservations.length > 0;
            const requiredVolume = line.qty_units * (format?.nominal_fill_volume_ml || 0);
            const isLineMTO = (line as any).source_type === 'NewProduction' || (line as any).source_type === 'new_batch';

            const isExpanded = expandedLines.has(line.request_line_id);
            const toggleExpand = () => {
              const newSet = new Set(expandedLines);
              if (isExpanded) newSet.delete(line.request_line_id);
              else newSet.add(line.request_line_id);
              setExpandedLines(newSet);
            };

            return (
              <div key={line.request_line_id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{line.finished_product_code}</p>
                      <button 
                        onClick={toggleExpand}
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Скрыть требования' : 'Показать требования'}
                      </button>
                    </div>
                    <p className="text-sm text-slate-500">
                      Формат: {format?.name || line.pack_format_code} | 
                      Количество: {line.qty_units} шт 
                      {(line as any).qty_fulfilled > 0 && (
                        <span className={`font-medium ${(line as any).qty_fulfilled < line.qty_units ? 'text-amber-600' : 'text-green-600'}`}>
                          (выполнено: {(line as any).qty_fulfilled} шт)
                        </span>
                      )}
                      | Требуется: {requiredVolume.toFixed(1)} мл |
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                        isLineMTO 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isLineMTO ? 'Новая партия' : 'Из склада'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* Hide Reserve button for MTO requests */}
                    {!isMTO && !hasReservation && hasRole(['Manager', 'Admin']) && (
                      <button
                        onClick={() => openReserveModal(line)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                      >
                        Резервировать
                      </button>
                    )}
                    {hasReservation && linePacks.length === 0 && hasRole(['Manager', 'Admin', 'Production']) && (
                      <button
                        onClick={() => createPackLot(line)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
                      >
                        Создать продукт
                      </button>
                    )}
                    {isLineMTO && !hasReservation && hasRole(['Production']) && (
                      <button
                        onClick={() => handleStartCmFromMto(line)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        <Play size={14} />
                        Стартовать CM
                      </button>
                    )}
                  </div>
                </div>

                {/* Reservations */}
                {lineReservations.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <p className="font-medium text-blue-800">Резервы:</p>
                    {lineReservations.map(r => (
                      <p key={r.reservation_id}>
                        CM Lot: <Link to={`/cm/${r.cm_lot_id}`} className="text-blue-600 hover:underline">{r.cm_lot_id}</Link> - 
                        {r.reserved_volume_ml.toFixed(1)} мл
                      </p>
                    ))}
                  </div>
                )}

                {/* Partial Fulfillment Warning */}
                {(line as any).qty_fulfilled > 0 && (line as any).qty_fulfilled < line.qty_units && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                    <p className="font-medium text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Частичное исполнение: {(line as any).qty_fulfilled} из {line.qty_units} шт
                    </p>
                    <p className="text-amber-700 mt-1">Не хватает: {line.qty_units - (line as any).qty_fulfilled} шт</p>
                    {hasRole(['Manager', 'Admin']) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleClosePartialLine(line)}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                        >
                          Закрыть как выполнено
                        </button>
                        <button
                          onClick={() => handleCreateRemainderRequest(line)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Создать заявку на остаток
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pack Lots - prominent display with link to continue work */}
                {linePacks.length > 0 && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="font-medium text-emerald-800 mb-2">Продукт создан:</p>
                    {linePacks.map(p => (
                      <div key={p.pack_lot_id} className="flex justify-between items-center bg-white p-2 rounded">
                        <div>
                          <Link to={`/packlot/${p.pack_lot_id}`} className="font-mono font-bold text-emerald-700 hover:underline">
                            {p.pack_lot_id}
                          </Link>
                          <p className="text-xs text-slate-500">Продолжить работу на странице продукта →</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.status === 'Released' ? 'bg-green-200 text-green-800' :
                            p.status === 'Filling' ? 'bg-blue-200 text-blue-800' :
                            p.status === 'Processing' ? 'bg-purple-200 text-purple-800' :
                            p.status === 'QC_Pending' ? 'bg-yellow-200 text-yellow-800' :
                            p.status === 'QA_Pending' ? 'bg-orange-200 text-orange-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {p.status === 'Released' ? 'Выпущен' : 
                             p.status === 'Filling' ? 'Розлив' :
                             p.status === 'Processing' ? 'Процессинг' :
                             p.status === 'QC_Pending' ? 'Ожидает QC' :
                             p.status === 'QA_Pending' ? 'Ожидает QA' : p.status}
                          </span>
                          <Link 
                            to={`/packlot/${p.pack_lot_id}`}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                          >
                            Перейти →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Product Requirements - expandable */}
                {isExpanded && (
                  <div className="mt-3">
                    <ProductRequirementsCard 
                      productCode={line.finished_product_code} 
                      frozenSpec={(request as any)?.frozen_spec}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reserve Modal */}
      {showReserveModal && selectedLine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Резервирование сырья</h3>
            
            <p className="text-sm text-slate-500 mb-4">
              Требуется: {reserveVolume.toFixed(1)} мл для {selectedLine.qty_units} шт.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Выберите CM Lot (QA одобрено)</label>
                <select
                  value={selectedCmLot}
                  onChange={(e) => setSelectedCmLot(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Выберите</option>
                  {availableCmLots
                    .map(lot => (
                      <option key={lot.cm_lot_id} value={lot.cm_lot_id}>
                        {lot.cm_lot_id} - Доступно: {(lot as any).available_ml?.toFixed(1)} мл
                      </option>
                    ))}
                </select>
              </div>

              {selectedCmLot && (
                <div>
                  <label className="block text-sm font-medium mb-1">Объем резерва (мл)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={reserveVolume}
                    onChange={(e) => setReserveVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {reserveVolume > ((availableCmLots.find(l => l.cm_lot_id === selectedCmLot) as any)?.available_ml || 0) && (
                    <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
                      <AlertTriangle size={16} />
                      Недостаточно объема. Рекомендуется создать дополнительную заявку.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowReserveModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleReserve}
                disabled={!selectedCmLot}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Зарезервировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
