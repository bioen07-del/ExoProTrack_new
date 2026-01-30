import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Package, Droplets, Cog, ClipboardCheck, ShieldCheck, FileText,
  Printer, CheckCircle, XCircle, Clock, AlertTriangle, Info, Play, ArrowRight, Truck, Plus, Snowflake
} from 'lucide-react';
import { supabase, PackLot, Container, PackFormat, Reservation, RequestLine } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/ui/status-badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { showError, showSuccess } from '../lib/toast';

// Tooltip component
function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1">
      <Info size={14} className="text-muted-foreground cursor-help inline" />
      <span className="absolute z-50 invisible group-hover:visible bg-slate-800 text-white text-xs rounded py-1 px-2 -top-8 left-0 whitespace-nowrap max-w-xs">
        {text}
      </span>
    </span>
  );
}

const TABS = [
  { id: 'summary', label: 'Обзор', icon: Package },
  { id: 'processing', label: 'Процессинг', icon: Cog },
  { id: 'filling', label: 'Розлив', icon: Droplets },
  { id: 'lyophilization', label: 'Лиофилизация', icon: Snowflake },
  { id: 'qc', label: 'QC Продукта', icon: ClipboardCheck },
  { id: 'qa', label: 'QA', icon: ShieldCheck },
  { id: 'shipments', label: 'Отгрузки', icon: Truck },
  { id: 'documents', label: 'Документы', icon: FileText },
];

const STATUS_LABELS: Record<string, string> = {
  Planned: 'Запланировано',
  // Pre-filling stage
  Processing: 'Процессинг',
  PreFill_QC_Pending: 'QC (до розлива)',
  PreFill_QC_Completed: 'QC завершен',
  PreFill_QA_Pending: 'QA (до розлива)',
  // Filling stage
  Filling: 'Розлив',
  Filled: 'Разлит',
  // Post-filling stage
  PostProcessing: 'Постпроцессинг',
  PostFill_QC_Pending: 'QC (после розлива)',
  PostFill_QC_Completed: 'QC завершен',
  PostFill_QA_Pending: 'QA (после розлива)',
  // Legacy statuses (for backward compatibility)
  QC_Pending: 'Ожидает QC',
  QC_Completed: 'QC завершен',
  QA_Pending: 'Ожидает QA',
  // Final stages
  Released: 'Выпущено',
  Shipped: 'Отгружено',
  Rejected: 'Брак',
};

const STATUS_COLORS: Record<string, string> = {
  Planned: 'tag-slate',
  Processing: 'tag-purple',
  PreFill_QC_Pending: 'tag-yellow',
  PreFill_QC_Completed: 'tag-emerald',
  PreFill_QA_Pending: 'tag-orange',
  Filling: 'tag-blue',
  Filled: 'tag-cyan',
  PostProcessing: 'tag-violet',
  PostFill_QC_Pending: 'tag-amber',
  PostFill_QC_Completed: 'tag-teal',
  PostFill_QA_Pending: 'tag-rose',
  QC_Pending: 'tag-yellow',
  QC_Completed: 'tag-emerald',
  QA_Pending: 'tag-orange',
  Released: 'tag-green',
  Shipped: 'tag-indigo',
  Rejected: 'tag-red',
};

// Dynamic BP step generator based on product requirements
interface BpStep {
  key: string;
  label: string;
  statuses: string[];
  tab: string;
}

function generateDynamicBpSteps(
  hasPreProcessing: boolean,
  hasPreFillQc: boolean,
  hasPostProcessing: boolean,
  hasPostFillQc: boolean
): BpStep[] {
  const steps: BpStep[] = [];
  
  // Pre-filling processing (before filling)
  if (hasPreProcessing) {
    steps.push({ key: 'processing', label: 'Процессинг', statuses: ['Planned', 'Processing'], tab: 'processing' });
    if (hasPreFillQc) {
      steps.push({ key: 'prefill_qc', label: 'QC', statuses: ['PreFill_QC_Pending', 'PreFill_QC_Completed'], tab: 'qc' });
      steps.push({ key: 'prefill_qa', label: 'QA', statuses: ['PreFill_QA_Pending'], tab: 'qa' });
    }
  }
  
  // Filling (always present if no pre-processing, or after pre-processing)
  steps.push({ key: 'filling', label: 'Розлив', statuses: hasPreProcessing ? ['Filling', 'Filled'] : ['Planned', 'Filling', 'Filled'], tab: 'filling' });
  
  // Post-filling processing (after filling)
  if (hasPostProcessing) {
    steps.push({ key: 'postprocessing', label: 'Постпроцессинг', statuses: ['PostProcessing'], tab: 'processing' });
    if (hasPostFillQc) {
      steps.push({ key: 'postfill_qc', label: 'QC', statuses: ['PostFill_QC_Pending', 'PostFill_QC_Completed', 'QC_Pending', 'QC_Completed'], tab: 'qc' });
      steps.push({ key: 'postfill_qa', label: 'QA', statuses: ['PostFill_QA_Pending', 'QA_Pending'], tab: 'qa' });
    }
  }
  
  // Final stage
  steps.push({ key: 'released', label: 'Выпуск', statuses: ['Released', 'Shipped'], tab: 'shipments' });
  
  return steps;
}

function getBpProgress(
  status: string,
  hasPreProcessing: boolean,
  hasPreFillQc: boolean,
  hasPostProcessing: boolean,
  hasPostFillQc: boolean
) {
  const steps = generateDynamicBpSteps(hasPreProcessing, hasPreFillQc, hasPostProcessing, hasPostFillQc);
  
  let currentIdx = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statuses.includes(status)) {
      currentIdx = i;
      break;
    }
    if (i === steps.length - 1) currentIdx = i;
  }
  
  const progress = Math.round(((currentIdx + 1) / steps.length) * 100);
  return { steps, currentIdx, progress };
}

export default function PackLotDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  
  // Main data
  const [packLot, setPackLot] = useState<PackLot | null>(null);
  const [container, setContainer] = useState<Container | null>(null);
  const [packFormat, setPackFormat] = useState<PackFormat | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [requestLine, setRequestLine] = useState<RequestLine | null>(null);
  const [request, setRequest] = useState<any>(null);
  const [frozenSpec, setFrozenSpec] = useState<any>(null);
  const [sourceCmLot, setSourceCmLot] = useState<any>(null);
  
  // Processing data
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
  const [packProcessMethods, setPackProcessMethods] = useState<any[]>([]);
  const [cmProcessMethods, setCmProcessMethods] = useState<any[]>([]);
  
  // QC data
  const [qcRequests, setQcRequests] = useState<any[]>([]);
  const [qcResults, setQcResults] = useState<any[]>([]);
  
  // QA data
  const [qaDecisions, setQaDecisions] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [lyophilizationEvents, setLyophilizationEvents] = useState<any[]>([]);
  const [processingStepForms, setProcessingStepForms] = useState<Record<string, any>>({});
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [shipmentFormData, setShipmentFormData] = useState({
    qty_shipped: '',
    shipped_at: new Date().toISOString(),
    recipient_name: '',
    invoice_number: '',
    waybill_number: ''
  });
  const [shipmentSaving, setShipmentSaving] = useState(false);
  
  // Forms
  const [qtyProduced, setQtyProduced] = useState<number>(0);
  const [showQcForm, setShowQcForm] = useState(false);
  const [qcFormData, setQcFormData] = useState<Record<string, { value?: string; pass?: boolean }>>({});
  
  // Partial fill modal
  const [showPartialFillModal, setShowPartialFillModal] = useState(false);
  const [partialFillNextStatus, setPartialFillNextStatus] = useState<string>('');
  const [partialFillConsumedMl, setPartialFillConsumedMl] = useState<number>(0);
  const [partialFillQtyProduced, setPartialFillQtyProduced] = useState<number>(0);
  const [newRequestCreated, setNewRequestCreated] = useState<{ id: string; qty: number } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [qaComment, setQaComment] = useState('');
  
  // Lyophilization form state
  const [showLyoForm, setShowLyoForm] = useState(false);
  const [lyoFormData, setLyoFormData] = useState<Record<string, any>>({
    qty_input: '',
    qty_output: '',
    started_at: '',
    ended_at: '',
    notes: ''
  });
  const [lyoSaving, setLyoSaving] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const [packRes, containerRes, formatRes, reservationsRes, linesRes, requestsRes, 
             processingRes, qcReqRes, qcResRes, qaRes, methodsRes, shipmentsRes, lyoRes] = await Promise.all([
        supabase.from('pack_lot').select('*').eq('pack_lot_id', id).single(),
        supabase.from('container').select('*').eq('owner_id', id).eq('owner_entity_type', 'PackLot').maybeSingle(),
        supabase.from('pack_format').select('*'),
        supabase.from('reservation').select('*'),
        supabase.from('request_line').select('*'),
        supabase.from('request').select('*'),
        (supabase.from as any)('pack_processing_step').select('*').eq('pack_lot_id', id).order('step_order'),
        supabase.from('pack_qc_request').select('*').eq('pack_lot_id', id),
        supabase.from('pack_qc_result').select('*'),
        supabase.from('pack_qa_release_decision').select('*').eq('pack_lot_id', id).order('decided_at', { ascending: false }),
        supabase.from('pack_process_method').select('*'),
        supabase.from('cm_process_method').select('*'),
        supabase.from('shipment').select('*').eq('pack_lot_id', id).order('shipped_at', { ascending: false }),
        (supabase.from as any)('lyophilization_event').select('*').eq('pack_lot_id', id).order('created_at', { ascending: false }),
      ]);

      const pack = packRes.data;
      setPackLot(pack);
      setContainer(containerRes.data);
      setPackProcessMethods(methodsRes.data || []);
      const cmMethodsRes = await supabase.from('cm_process_method').select('*');
      setCmProcessMethods(cmMethodsRes.data || []);
      setProcessingSteps(processingRes.data || []);
      setQcRequests(qcReqRes.data || []);
      setQaDecisions(qaRes.data || []);
      setShipments(shipmentsRes.data || []);
      setLyophilizationEvents(lyoRes.data || []);
      
      if (pack) {
        setPackFormat((formatRes.data || []).find(f => f.pack_format_code === pack.pack_format_code) || null);
        setReservation((reservationsRes.data || []).find(r => r.request_line_id === pack.request_line_id && r.status === 'Active') || null);
        
        const line = (linesRes.data || []).find(l => l.request_line_id === pack.request_line_id);
        setRequestLine(line || null);
        
        if (line) {
          const req = (requestsRes.data || []).find(r => r.request_id === line.request_id);
          setRequest(req || null);
          setFrozenSpec(req?.frozen_spec || null);
        }
        
        setQtyProduced(pack.qty_produced || pack.qty_planned);
        
        // Load source CM lot
        if (pack.source_cm_lot_id) {
          const { data: cmLot } = await supabase.from('cm_lot').select('*').eq('cm_lot_id', pack.source_cm_lot_id).single();
          setSourceCmLot(cmLot);
        }
      }
      
      // Filter QC results
      const reqIds = (qcReqRes.data || []).map(r => r.qc_request_id);
      setQcResults((qcResRes.data || []).filter(r => reqIds.includes(r.qc_request_id)));
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Requirements from frozen_spec
  // Pre-fill processing (before filling) - from product spec
  const preFillMethods = frozenSpec?.processing?.pre || [];
  const preFillQcTests = frozenSpec?.qc?.preFill || [];
  // Post-fill processing (after filling) - from product spec + request
  const postFillMethods = frozenSpec?.processing?.post || [];
  const postFillQcTests = frozenSpec?.qc?.product || [];
  
  // Calculated flags
  const hasPreProcessing = preFillMethods.length > 0;
  const hasPreFillQc = preFillQcTests.length > 0;
  const hasPostProcessing = postFillMethods.length > 0;
  const hasPostFillQc = postFillQcTests.length > 0;
  
  // Legacy compatibility
  const hasProcessing = hasPreProcessing || hasPostProcessing;
  const hasQc = hasPreFillQc || hasPostFillQc;
  const hasQa = hasQc || (requestLine as any)?.additional_qc_required;
  const productQcTests = postFillQcTests; // For backward compatibility
  
  // Determine visible tabs
  const hasLyophilization = packLot?.has_lyophilization || false;
  const visibleTabs = TABS.filter(tab => {
    if (tab.id === 'processing' && !hasProcessing) return false;
    if (tab.id === 'lyophilization' && !hasLyophilization) return false;
    if (tab.id === 'qc' && !hasQc) return false;
    if (tab.id === 'qa' && !hasQa) return false;
    return true;
  });

  // Workflow mapping: status -> tab
  function getTabForStatus(status: string): string {
    const map: Record<string, string> = {
      'Planned': hasPreProcessing ? 'processing' : 'filling',
      'Processing': 'processing',
      'PreFill_QC_Pending': 'qc', 'PreFill_QC_Completed': 'qc',
      'PreFill_QA_Pending': 'qa',
      'Filling': 'filling', 'Filled': 'filling',
      'PostProcessing': 'processing',
      'PostFill_QC_Pending': 'qc', 'PostFill_QC_Completed': 'qc',
      'PostFill_QA_Pending': 'qa',
      'QC_Pending': 'qc', 'QC_Completed': 'qc',
      'QA_Pending': 'qa',
      'Released': 'summary', 'Shipped': 'shipments',
    };
    return map[status] || 'summary';
  }

  function getNextWorkflowStep(): { nextStatus: string; nextTab: string; label: string } | null {
    if (!packLot) return null;
    
    // Tab-based workflow: follows visible tabs order
    // Tab order: summary → processing (pre) → filling → lyophilization → processing (post) → qc → qa → shipments
    
    // From Planned
    if (packLot.status === 'Planned') {
      if (hasPreProcessing) {
        return { nextStatus: 'Processing', nextTab: 'processing', label: 'Следующий этап → Процессинг' };
      }
      return { nextStatus: 'Filling', nextTab: 'filling', label: 'Следующий этап → Розлив' };
    }
    
    // From Processing (pre-fill)
    if (packLot.status === 'Processing') {
      if (hasPreFillQc) {
        return { nextStatus: 'PreFill_QC_Pending', nextTab: 'qc', label: 'Следующий этап → QC' };
      }
      return { nextStatus: 'Filling', nextTab: 'filling', label: 'Следующий этап → Розлив' };
    }
    
    // From Pre-fill QC
    if (packLot.status === 'PreFill_QC_Pending' || packLot.status === 'PreFill_QC_Completed') {
      return { nextStatus: 'PreFill_QA_Pending', nextTab: 'qa', label: 'Следующий этап → QA' };
    }
    
    // From Pre-fill QA
    if (packLot.status === 'PreFill_QA_Pending') {
      return { nextStatus: 'Filling', nextTab: 'filling', label: 'Следующий этап → Розлив' };
    }
    
    // From Filling - follow visible tabs order
    if (packLot.status === 'Filling') {
      // After filling: lyophilization (if visible) → post-processing → QC → QA → Release
      if (hasLyophilization) {
        return { nextStatus: 'PostProcessing', nextTab: 'lyophilization', label: 'Следующий этап → Лиофилизация' };
      }
      if (hasPostProcessing) {
        return { nextStatus: 'PostProcessing', nextTab: 'processing', label: 'Следующий этап → Постпроцессинг' };
      }
      if (hasPostFillQc) {
        return { nextStatus: 'PostFill_QC_Pending', nextTab: 'qc', label: 'Следующий этап → QC' };
      }
      return { nextStatus: 'Released', nextTab: 'summary', label: 'Выпустить на склад' };
    }
    
    // From PostProcessing - check if lyophilization is pending first
    if (packLot.status === 'PostProcessing') {
      // Check if lyophilization step exists and is not completed
      const lyoStep = processingSteps.find(s => 
        s.processing_stage === 'post_filling' && s.method_name?.toLowerCase().includes('лиофил')
      );
      if (lyoStep && lyoStep.status !== 'Completed') {
        // Lyophilization in progress - point to lyophilization tab
        return { nextStatus: 'PostProcessing', nextTab: 'lyophilization', label: 'Выполнить лиофилизацию' };
      }
      // All post-processing done → go to QC or Release
      if (hasPostFillQc) {
        return { nextStatus: 'PostFill_QC_Pending', nextTab: 'qc', label: 'Следующий этап → QC' };
      }
      return { nextStatus: 'Released', nextTab: 'summary', label: 'Выпустить на склад' };
    }
    
    // From QC
    if (packLot.status === 'PostFill_QC_Pending' || packLot.status === 'QC_Pending') {
      return { nextStatus: 'PostFill_QA_Pending', nextTab: 'qa', label: 'Следующий этап → QA' };
    }
    
    // From QA → Release
    if (packLot.status === 'PostFill_QA_Pending' || packLot.status === 'QA_Pending') {
      return { nextStatus: 'Released', nextTab: 'summary', label: 'Выпустить на склад' };
    }
    
    // Legacy statuses
    if (packLot.status === 'QC_Completed') {
      return { nextStatus: hasQa ? 'QA_Pending' : 'Released', nextTab: hasQa ? 'qa' : 'summary', label: 'Следующий этап → QA' };
    }
    
    return null;
  }

  function canAdvanceWorkflow(): boolean {
    if (!packLot) return false;
    
    // Planned: can advance if pre-processing required
    if (packLot.status === 'Planned' && hasPreProcessing) return true;
    
    // Filling: can advance when qty is entered
    if (packLot.status === 'Filling') return qtyProduced > 0;
    
    // Processing / PostProcessing: all steps must be completed
    if (packLot.status === 'Processing' || packLot.status === 'PostProcessing') {
      const relevantSteps = processingSteps.filter(s => 
        packLot.status === 'Processing' 
          ? s.processing_stage === 'pre_filling' || !s.processing_stage
          : s.processing_stage === 'post_filling'
      );
      return relevantSteps.length > 0 && relevantSteps.every(s => s.status === 'Completed');
    }
    
    // QC statuses: all QC results must be submitted
    if (['QC_Pending', 'PreFill_QC_Pending', 'PostFill_QC_Pending'].includes(packLot.status)) {
      const qcTests = packLot.status === 'PreFill_QC_Pending' ? preFillQcTests : postFillQcTests;
      const required = qcTests.map((t: any) => t.code);
      return required.length > 0 && required.every((code: string) => qcResults.some(r => r.test_code === code));
    }
    
    // QA statuses: QA decision must exist
    if (['QA_Pending', 'PreFill_QA_Pending', 'PostFill_QA_Pending', 'QC_Completed'].includes(packLot.status)) {
      return qaDecisions.length > 0;
    }
    
    return true;
  }

  async function advanceWorkflow() {
    if (!packLot || !canAdvanceWorkflow()) return;
    
    const next = getNextWorkflowStep();
    if (!next) return;

    // Planned → Processing (pre-fill processing)
    if (packLot.status === 'Planned' && next.nextStatus === 'Processing') {
      // Create pre-fill processing steps if needed
      if (preFillMethods.length > 0 && processingSteps.filter(s => s.processing_stage === 'pre_filling').length === 0) {
        for (let i = 0; i < preFillMethods.length; i++) {
          const method = preFillMethods[i];
          await (supabase.from as any)('pack_processing_step').insert({
            pack_lot_id: packLot.pack_lot_id,
            method_id: method.method_id,
            method_name: method.name,
            step_order: i + 1,
            status: 'Pending',
            processing_stage: 'pre_filling',
            unit: 'ml',
          });
        }
      }
      await supabase.from('pack_lot').update({ status: next.nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
      setActiveTab(next.nextTab);
      loadData();
      return;
    }

    // Filling → next
    if (packLot.status === 'Filling') {
      await completeFilling();
      return;
    }

    // Processing → PreFill_QC_Pending or Filling
    if (packLot.status === 'Processing') {
      if (next.nextStatus === 'PreFill_QC_Pending') {
        await (supabase.from as any)('pack_qc_request').insert({
          pack_lot_id: packLot.pack_lot_id,
          qc_type: 'ProductQC',
          checkpoint_code: 'PRE_FILL_QC',
          requested_at: new Date().toISOString(),
          status: 'Pending',
        });
      }
      await supabase.from('pack_lot').update({ status: next.nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
      setActiveTab(next.nextTab);
      loadData();
      return;
    }

    // PostProcessing → PostFill_QC_Pending or Released
    if (packLot.status === 'PostProcessing') {
      if (next.nextStatus === 'PostFill_QC_Pending') {
        await (supabase.from as any)('pack_qc_request').insert({
          pack_lot_id: packLot.pack_lot_id,
          qc_type: 'ProductQC',
          checkpoint_code: 'POST_FILL_QC',
          requested_at: new Date().toISOString(),
          status: 'Pending',
        });
      }
      await supabase.from('pack_lot').update({ status: next.nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
      setActiveTab(next.nextTab);
      loadData();
      return;
    }

    // QC transitions
    if (['QC_Pending', 'PreFill_QC_Pending', 'PostFill_QC_Pending', 'QC_Completed'].includes(packLot.status)) {
      await supabase.from('pack_lot').update({ status: next.nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
      setActiveTab(next.nextTab);
      loadData();
      return;
    }

    // QA transitions are handled by QA form - skip direct advancement
    if (['QA_Pending', 'PreFill_QA_Pending', 'PostFill_QA_Pending'].includes(packLot.status)) {
      return;
    }

    // Default: just update status
    await supabase.from('pack_lot').update({ status: next.nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
    setActiveTab(next.nextTab);
    loadData();
  }

  function getWorkflowButtonLabel(): string {
    const next = getNextWorkflowStep();
    if (!next) return '';
    return next.label;
  }

  const currentTab = packLot ? getTabForStatus(packLot.status) : 'summary';
  const nextStep = getNextWorkflowStep();

  // ========== ACTIONS ==========
  
  async function startFilling() {
    if (!packLot) return;
    await supabase.from('pack_lot')
      .update({ status: 'Filling', filling_started_at: new Date().toISOString() })
      .eq('pack_lot_id', packLot.pack_lot_id);
    loadData();
  }

  async function completeFilling() {
    if (!packLot || !packFormat) return;
    
    const consumedMl = qtyProduced * packFormat.nominal_fill_volume_ml;
    
    // Determine next status after filling
    let nextStatus = 'Released';
    if (hasPostProcessing) nextStatus = 'PostProcessing';
    else if (hasPostFillQc) nextStatus = 'PostFill_QC_Pending';
    
    // Check for partial fill
    if (qtyProduced < packLot.qty_planned) {
      setPartialFillNextStatus(nextStatus);
      setPartialFillConsumedMl(consumedMl);
      setPartialFillQtyProduced(qtyProduced);
      setShowPartialFillModal(true);
      return;
    }
    
    // Full fill - continue normally
    await executeCompleteFilling(consumedMl, 'Completed');
  }

  async function executeCompleteFilling(consumedMl: number, requestStatus: 'Completed' | 'PartiallyFulfilled', producedQty?: number) {
    if (!packLot || !packFormat) {
      console.error('executeCompleteFilling: packLot or packFormat is null');
      return;
    }
    
    const actualQtyProduced = producedQty ?? qtyProduced;
    
    // Determine next status after filling (post-fill path)
    let nextStatus = 'Released';
    if (hasPostProcessing) {
      nextStatus = 'PostProcessing';
      // Check if post-fill steps already exist
      const { data: existingSteps } = await (supabase.from as any)('pack_processing_step')
        .select('processing_step_id')
        .eq('pack_lot_id', packLot.pack_lot_id)
        .eq('processing_stage', 'post_filling');
      
      if (!existingSteps || existingSteps.length === 0) {
        // Create post-fill processing steps from frozen_spec
        for (let i = 0; i < postFillMethods.length; i++) {
          const m = postFillMethods[i];
          await (supabase.from as any)('pack_processing_step').insert({
            pack_lot_id: packLot.pack_lot_id,
            method_id: m.method_id || m.code,
            method_name: m.name,
            step_order: i + 1,
            status: 'Pending',
            processing_stage: 'post_filling',
            unit: 'pcs',
          });
        }
      }
    } else if (hasPostFillQc) {
      nextStatus = 'PostFill_QC_Pending';
      // Check if QC request already exists
      const { data: existingQc } = await (supabase.from as any)('pack_qc_request')
        .select('qc_request_id')
        .eq('pack_lot_id', packLot.pack_lot_id)
        .eq('checkpoint_code', 'POST_FILL_QC');
      
      if (!existingQc || existingQc.length === 0) {
        await (supabase.from as any)('pack_qc_request').insert({
          pack_lot_id: packLot.pack_lot_id,
          qc_type: 'ProductQC',
          checkpoint_code: 'POST_FILL_QC',
          requested_at: new Date().toISOString(),
          status: 'Pending',
        });
      }
    }
    
    // Update pack lot
    const { error: updateError } = await supabase.from('pack_lot').update({
      qty_produced: actualQtyProduced,
      total_filled_volume_ml: consumedMl,
      status: nextStatus,
      filling_completed_at: new Date().toISOString(),
    }).eq('pack_lot_id', packLot.pack_lot_id);
    
    if (updateError) {
      console.error('Failed to update pack lot:', updateError);
      showError('Ошибка', updateError.message);
      return;
    }
    
    // Consume reservation
    if (reservation) {
      await supabase.from('reservation')
        .update({ status: 'Consumed' })
        .eq('reservation_id', reservation.reservation_id);
    }
    
    // Deduct from source CM
    if (packLot.source_cm_lot_id) {
      const { data: srcContainer } = await supabase
        .from('container')
        .select('*')
        .eq('owner_id', packLot.source_cm_lot_id)
        .eq('owner_entity_type', 'CM_Lot')
        .single();
      
      if (srcContainer) {
        const newVol = Math.max(0, (srcContainer.current_volume_ml || 0) - consumedMl);
        await supabase.from('container')
          .update({ current_volume_ml: newVol })
          .eq('container_id', srcContainer.container_id);
        
        await supabase.from('stock_movement').insert({
          item_type: 'Bulk',
          container_id: srcContainer.container_id,
          direction: 'Out',
          qty: consumedMl,
          reason_code: 'Fill',
          moved_at: new Date().toISOString(),
          user_id: user?.user_id,
        });
      }
    }
    
    // Update pack container
    if (container) {
      await supabase.from('container')
        .update({ current_qty: qtyProduced })
        .eq('container_id', container.container_id);
    }
    
    // Update request status
    if (request) {
      await supabase.from('request')
        .update({ status: requestStatus })
        .eq('request_id', request.request_id);
    }
    
    setShowPartialFillModal(false);
    
    // Switch to the next tab based on next status
    if (nextStatus === 'PostProcessing') {
      if (packLot.has_lyophilization) {
        setActiveTab('lyophilization');
      } else {
        setActiveTab('processing');
      }
    } else if (nextStatus === 'PostFill_QC_Pending') {
      setActiveTab('qc');
    } else {
      setActiveTab('summary');
    }
    
    loadData();
  }

  async function handlePartialFillOption(option: 'accept' | 'newRequest') {
    if (!packLot || !packFormat || !request || !requestLine) return;
    
    if (option === 'accept') {
      // Accept as-is: mark request as Completed
      await executeCompleteFilling(partialFillConsumedMl, 'Completed', partialFillQtyProduced);
    } else {
      // Generate new request ID
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('request')
        .select('*', { count: 'exact', head: true })
        .like('request_id', `REQ-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const newRequestId = `REQ-${dateStr}-${seqNum}`;
      const remainingQty = packLot.qty_planned - partialFillQtyProduced;
      
      // Create new request with remaining qty (status: New - needs user to complete)
      await supabase.from('request').insert({
        request_id: newRequestId,
        customer_ref: request.customer_ref ? `${request.customer_ref} (доп)` : null,
        due_date: request.due_date,
        status: 'New',
        created_by: user?.user_id,
        product_code: request.product_code,
        frozen_spec: request.frozen_spec,
        parent_request_id: request.request_id,
      });
      
      // Create request line WITHOUT source_type - user will choose later
      await supabase.from('request_line').insert({
        request_id: newRequestId,
        finished_product_code: requestLine.finished_product_code,
        pack_format_code: packLot.pack_format_code,
        qty_units: remainingQty,
        source_type: null, // User will select CM source when opening the request
      });
      
      // Complete current pack lot filling
      await executeCompleteFilling(partialFillConsumedMl, 'PartiallyFulfilled', partialFillQtyProduced);
      
      // Show success message with link
      setNewRequestCreated({ id: newRequestId, qty: remainingQty });
      loadData();
    }
  }

  async function completeProcessingStep(stepId: string) {
    await (supabase.from as any)('pack_processing_step')
      .update({ status: 'Completed', completed_at: new Date().toISOString(), performed_by: user?.user_id })
      .eq('processing_step_id', stepId);
    
    // Check if all steps completed
    const { data: steps } = await (supabase.from as any)('pack_processing_step')
      .select('*')
      .eq('pack_lot_id', packLot?.pack_lot_id);
    
    const allCompleted = (steps || []).every(s => s.status === 'Completed' || s.processing_step_id === stepId);
    
    if (allCompleted && packLot) {
      let nextStatus = 'Released';
      if (hasQc) {
        nextStatus = 'QC_Pending';
        await (supabase.from as any)('pack_qc_request').insert({
          pack_lot_id: packLot.pack_lot_id,
          qc_type: 'ProductQC',
          checkpoint_code: 'PRODUCT_QC',
          requested_at: new Date().toISOString(),
          status: 'Pending',
        });
      } else if (hasQa) {
        nextStatus = 'QA_Pending';
      }
      await supabase.from('pack_lot').update({ status: nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
    }
    
    loadData();
  }

  async function submitQcResults() {
    if (!packLot || qcRequests.length === 0) return;
    
    const qcRequest = qcRequests[0];
    
    for (const test of productQcTests) {
      const testCode = test.code || test.name;
      const formVal = qcFormData[testCode];
      if (formVal) {
        await supabase.from('pack_qc_result').insert({
          qc_request_id: qcRequest.qc_request_id,
          test_code: testCode,
          result_value: formVal.value,
          pass_fail: formVal.pass ? 'Pass' : 'Fail',
          tested_at: new Date().toISOString(),
        });
      }
    }
    
    // Check if all passed
    const allPassed = Object.values(qcFormData).every(v => v.pass);
    
    await supabase.from('pack_qc_request')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('qc_request_id', qcRequest.qc_request_id);
    
    let nextStatus = 'QC_Completed';
    if (hasQa) {
      nextStatus = 'QA_Pending';
    } else if (allPassed) {
      nextStatus = 'Released';
    }
    
    await supabase.from('pack_lot')
      .update({ status: nextStatus })
      .eq('pack_lot_id', packLot.pack_lot_id);
    
    setShowQcForm(false);
    loadData();
  }

  async function submitQaDecision(decision: 'Approved' | 'Rejected' | 'OnHold', comment: string) {
    if (!packLot) return;
    
    await supabase.from('pack_qa_release_decision').insert({
      pack_lot_id: packLot.pack_lot_id,
      decision,
      comment,
      decided_at: new Date().toISOString(),
      decided_by: user?.user_id,
    });
    
    if (decision === 'Approved') {
      await supabase.from('pack_lot').update({ status: 'Released' }).eq('pack_lot_id', packLot.pack_lot_id);
      if (container) {
        await supabase.from('container').update({ status: 'Approved' }).eq('container_id', container.container_id);
        await supabase.from('stock_movement').insert({
          item_type: 'Finished',
          container_id: container.container_id,
          direction: 'In',
          qty: packLot.qty_produced || packLot.qty_planned,
          reason_code: 'Release',
          moved_at: new Date().toISOString(),
          user_id: user?.user_id,
        });
      }
    } else if (decision === 'Rejected') {
      await supabase.from('pack_lot').update({ status: 'Rejected' }).eq('pack_lot_id', packLot.pack_lot_id);
    }
    
    loadData();
  }

  async function printLabel() {
    if (!packLot) return;
    await supabase.from('label_print_log').insert({
      entity_type: 'PackLot',
      entity_id: packLot.pack_lot_id,
      label_format: 'circle',
      qty_printed: 1,
      printed_at: new Date().toISOString(),
      printed_by: user?.user_id,
    });
    window.print();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  if (!packLot) {
    return <div className="text-center py-8 text-destructive">Продукт не найден</div>;
  }

  const bpProgress = getBpProgress(packLot.status, hasPreProcessing, hasPreFillQc, hasPostProcessing, hasPostFillQc);

  // ========== RENDER TABS ==========
  
  function renderSummary() {
    return (
      <div className="space-y-6">
        {/* BP Progress */}
        <Card>
          <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-4">Прогресс производства</h3>
          <div className="flex items-center gap-2">
            {bpProgress.steps.map((step, idx) => {
              const isCompleted = idx < bpProgress.currentIdx;
              const isCurrent = idx === bpProgress.currentIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                    isCompleted ? 'tag-green' :
                    isCurrent ? 'tag-blue' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle size={16} /> : isCurrent ? <Clock size={16} /> : <span className="w-4" />}
                    {step.label}
                  </div>
                  {idx < bpProgress.steps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${isCompleted ? 'bg-success' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${bpProgress.progress}%` }} />
            </div>
            <span className="font-medium text-sm">{bpProgress.progress}%</span>
          </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* QR Code */}
          <Card className="flex flex-col items-center">
            <CardContent className="p-6 flex flex-col items-center">
            <QRCodeSVG value={packLot.pack_lot_id} size={140} />
            <p className="mt-2 font-mono text-sm">{packLot.pack_lot_id}</p>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="col-span-2">
            <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Продукт</p>
                <p className="font-semibold">{(requestLine as any)?.finished_product_code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Формат</p>
                <p className="font-semibold">{packFormat?.name || packLot.pack_format_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">План / Факт</p>
                <p className="text-2xl font-bold">
                  {packLot.qty_planned} <span className="text-muted-foreground text-lg">/ {packLot.qty_produced ?? '-'}</span> шт
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Израсходовано</p>
                <p className="font-semibold">{packLot.total_filled_volume_ml?.toFixed(1) || '-'} мл</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Источник CM</p>
                <Link to={`/cm/${packLot.source_cm_lot_id}`} className="text-primary hover:underline font-mono">
                  {packLot.source_cm_lot_id}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Заявка</p>
                {request ? (
                  <Link to={`/requests/${request.request_id}`} className="text-primary hover:underline">
                    {request.request_id}
                  </Link>
                ) : '-'}
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements */}
        {frozenSpec && (
          <Card>
            <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Требования к продукту</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hasPreProcessing && (
                <div className="p-3 purple-box rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Процессинг до розлива ({preFillMethods.length})</h4>
                  <div className="space-y-1">
                    {preFillMethods.map((m: any, i: number) => (
                      <div key={i} className="text-xs bg-card p-1.5 rounded">{m.name || m.method_id}</div>
                    ))}
                  </div>
                </div>
              )}
              {hasPostProcessing && (
                <div className="p-3 purple-box rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Постпроцессинг ({postFillMethods.length})</h4>
                  <div className="space-y-1">
                    {postFillMethods.map((m: any, i: number) => (
                      <div key={i} className="text-xs bg-card p-1.5 rounded">{m.name || m.method_id}</div>
                    ))}
                  </div>
                </div>
              )}
              {hasQc && (
                <div className="p-3 teal-box rounded-lg">
                  <h4 className="font-medium text-sm mb-2">QC Продукта ({productQcTests.length})</h4>
                  <div className="space-y-1">
                    {productQcTests.map((t: any, i: number) => (
                      <div key={i} className="text-xs bg-card p-1.5 rounded">{t.name || t.code}</div>
                    ))}
                  </div>
                </div>
              )}
              {hasQa && (
                <div className="p-3 warning-box rounded-lg">
                  <h4 className="font-medium text-sm mb-2">QA</h4>
                  <p className="text-xs text-muted-foreground">Требуется финальное одобрение QA</p>
                </div>
              )}
              {!hasProcessing && !hasQc && !hasQa && (
                <p className="text-muted-foreground text-sm col-span-3">Нет дополнительных требований — продукт переходит сразу в Released</p>
              )}
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderFilling() {
    const canStart = packLot.status === 'Planned' && hasRole(['Production', 'Admin']);
    const canComplete = packLot.status === 'Filling' && hasRole(['Production', 'Admin']);
    const isCompleted = ['Filled', 'Processing', 'QC_Pending', 'QC_Completed', 'QA_Pending', 'Released', 'Shipped'].includes(packLot.status);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Розлив продукции</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Плановое количество</p>
              <p className="text-3xl font-bold">{packLot.qty_planned} шт</p>
              <p className="text-sm text-muted-foreground">× {packFormat?.nominal_fill_volume_ml || 0} мл = {(packLot.qty_planned * (packFormat?.nominal_fill_volume_ml || 0)).toFixed(1)} мл</p>
            </div>
            
            {canComplete && (
              <div>
                <label className="block text-sm font-medium mb-2">Фактическое количество</label>
                <Input
                  type="number"
                  min="1"
                  max={packLot.qty_planned}
                  value={qtyProduced}
                  onChange={(e) => setQtyProduced(Number(e.target.value))}
                  className="px-4 py-3 h-auto border-2 border-primary text-2xl font-bold text-center"
                />
                {qtyProduced < packLot.qty_planned && (
                  <p className="text-warning text-sm mt-1 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Частичный розлив: {packLot.qty_planned - qtyProduced} шт не будет произведено
                  </p>
                )}
              </div>
            )}
            
            {isCompleted && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Произведено</p>
                <p className="text-3xl font-bold text-success">{packLot.qty_produced} шт</p>
                <p className="text-sm text-muted-foreground">Израсходовано: {packLot.total_filled_volume_ml?.toFixed(1)} мл</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {canStart && (
              <Button onClick={startFilling} variant="default" size="lg" className="gap-2">
                <Play size={20} />
                Начать розлив
              </Button>
            )}
            {canComplete && (
              <Button onClick={completeFilling} variant="success" size="lg" className="gap-2">
                <CheckCircle size={20} />
                Завершить розлив
              </Button>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={20} />
                <span>Розлив завершен {packLot.filling_completed_at && new Date(packLot.filling_completed_at).toLocaleString('ru-RU')}</span>
              </div>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Source CM Info */}
        {sourceCmLot && (
          <Card className="bg-muted">
            <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">Источник сырья</h4>
            <div className="flex justify-between items-center">
              <Link to={`/cm/${sourceCmLot.cm_lot_id}`} className="text-primary hover:underline font-mono">
                {sourceCmLot.cm_lot_id}
              </Link>
              <StatusBadge status={sourceCmLot.status} />
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderProcessing() {
    // Show steps based on current status
    const isPostProcessing = packLot.status === 'PostProcessing';
    // Filter out lyophilization steps - they are handled in the Lyophilization tab
    const currentSteps = isPostProcessing 
      ? processingSteps.filter(s => s.processing_stage === 'post_filling' && !s.method_name?.toLowerCase().includes('лиофил'))
      : processingSteps.filter(s => s.processing_stage === 'pre_filling' || !s.processing_stage);
    const completedSteps = currentSteps.filter(s => s.status === 'Completed');
    const canProcess = hasRole(['Production', 'Admin']) && ['Planned', 'Processing', 'PostProcessing'].includes(packLot.status);
    const qtyPlanned = packLot.qty_planned || 0;
    const volumePerUnit = packFormat?.nominal_fill_volume_ml || 0;
    const totalVolumeMl = qtyPlanned * volumePerUnit;
    // Pre-filling uses volume (ml), post-filling uses pieces
    const expectedQty = isPostProcessing ? qtyPlanned : totalVolumeMl;
    const tabTitle = isPostProcessing ? 'Постпроцессинг' : 'Процессинг до розлива';

    const updateStepForm = (stepId: string, field: string, value: any) => {
      setProcessingStepForms(prev => ({
        ...prev,
        [stepId]: { ...prev[stepId], [field]: value }
      }));
    };

    const submitProcessingStep = async (stepId: string) => {
      const form = processingStepForms[stepId] || {};
      const qtyIn = parseInt(form.qty_input) || 0;
      const qtyOut = parseInt(form.qty_output) || qtyIn;
      
      if (!qtyIn) {
        showError('Ошибка', 'Укажите количество на входе');
        return;
      }

      // Calculate duration if time tracking data provided
      let durationMinutes: number | null = null;
      let startedAt = form.started_at ? new Date(form.started_at).toISOString() : null;
      let endedAt = form.ended_at ? new Date(form.ended_at).toISOString() : null;
      
      if (startedAt && endedAt) {
        durationMinutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
      }

      await supabase.from('pack_processing_step').update({
        qty_input: qtyIn,
        qty_output: qtyOut,
        notes: form.notes || null,
        started_at: startedAt || new Date().toISOString(),
        ended_at: endedAt,
        duration_minutes: durationMinutes,
        completed_at: new Date().toISOString(),
        performed_by: user?.user_id,
        status: 'Completed'
      }).eq('processing_step_id', stepId);

      // Check if current stage steps done -> advance workflow
      const { data: allSteps } = await (supabase.from as any)('pack_processing_step')
        .select('status, processing_stage, processing_step_id')
        .eq('pack_lot_id', packLot.pack_lot_id);
      
      if (isPostProcessing) {
        // Post-processing: check post_filling steps
        const postSteps = (allSteps || []).filter((s: any) => s.processing_stage === 'post_filling');
        const allDone = postSteps.length > 0 && postSteps.every((s: any) => s.status === 'Completed' || s.processing_step_id === stepId);
        if (allDone) {
          // Move to PostFill_QC_Pending if QC exists, otherwise Released
          const nextStatus = hasPostFillQc ? 'PostFill_QC_Pending' : 'Released';
          
          // Create QC request if transitioning to QC
          if (hasPostFillQc) {
            await (supabase.from as any)('pack_qc_request').insert({
              pack_lot_id: packLot.pack_lot_id,
              qc_type: 'ProductQC',
              checkpoint_code: 'POST_FILL_QC',
              requested_at: new Date().toISOString(),
              status: 'Pending',
            });
          }
          
          await supabase.from('pack_lot').update({ status: nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
          setActiveTab(hasPostFillQc ? 'qc' : 'summary');
        }
      } else {
        // Pre-processing: check pre_filling steps
        const preSteps = (allSteps || []).filter((s: any) => s.processing_stage === 'pre_filling' || !s.processing_stage);
        const allDone = preSteps.length > 0 && preSteps.every((s: any) => s.status === 'Completed' || s.processing_step_id === stepId);
        if (allDone) {
          await supabase.from('pack_lot').update({ status: 'Filling' }).eq('pack_lot_id', packLot.pack_lot_id);
          setActiveTab('filling');
        }
      }
      
      loadData();
    };
    
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">
            {tabTitle}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({completedSteps.length}/{currentSteps.length} выполнено)
            </span>
          </h3>
          
          <div className="space-y-4">
            {currentSteps.map((step, idx) => {
              const form = processingStepForms[step.processing_step_id] || {};
              const isCompleted = step.status === 'Completed';
              const cmMethod = cmProcessMethods.find(m => m.method_id === step.method_id || m.name === step.method_name);
              const requiresTimeTracking = cmMethod?.requires_time_tracking;
              const stepUnit = step.processing_stage === 'post_filling' ? 'шт' : 'мл';
              
              return (
                <div key={step.processing_step_id} className={`p-4 rounded-lg border ${
                  isCompleted ? 'success-box' : 'bg-card border-border'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isCompleted ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium">{step.method_name || step.method_id}</p>
                        {isCompleted && step.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Выполнено: {new Date(step.completed_at).toLocaleString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCompleted && <CheckCircle size={24} className="text-success" />}
                  </div>
                  
                  {isCompleted ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm success-box p-3 rounded">
                      <div><span className="text-muted-foreground">Вход:</span> {step.qty_input || '-'} {stepUnit}</div>
                      <div><span className="text-muted-foreground">Выход:</span> {step.qty_output || '-'} {stepUnit}</div>
                      <div><span className="text-muted-foreground">Примечания:</span> {step.notes || '-'}</div>
                      {step.started_at && step.ended_at && (
                        <>
                          <div><span className="text-muted-foreground">Начало:</span> {new Date(step.started_at).toLocaleString('ru-RU')}</div>
                          <div><span className="text-muted-foreground">Окончание:</span> {new Date(step.ended_at).toLocaleString('ru-RU')}</div>
                          <div><span className="text-muted-foreground">Длительность:</span> {step.duration_minutes || '-'} мин</div>
                        </>
                      )}
                    </div>
                  ) : canProcess && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Кол-во на входе ({stepUnit}) <span className="text-muted-foreground">(план: {expectedQty})</span></label>
                          <Input
                            type="number" min="1"
                            value={form.qty_input || ''}
                            onChange={(e) => updateStepForm(step.processing_step_id, 'qty_input', e.target.value)}
                            placeholder={String(expectedQty)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Кол-во на выходе ({stepUnit})</label>
                          <Input
                            type="number" min="0"
                            value={form.qty_output || ''}
                            onChange={(e) => updateStepForm(step.processing_step_id, 'qty_output', e.target.value)}
                            placeholder="Если не указано, равно входу"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Примечания</label>
                        <textarea
                          value={form.notes || ''}
                          onChange={(e) => updateStepForm(step.processing_step_id, 'notes', e.target.value)}
                          className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>
                      {requiresTimeTracking && (
                        <div className="grid grid-cols-2 gap-4 p-3 info-box rounded-lg">
                          <div>
                            <label className="block text-sm font-medium mb-1">Начало процедуры</label>
                            <Input
                              type="datetime-local"
                              value={form.started_at || ''}
                              onChange={(e) => updateStepForm(step.processing_step_id, 'started_at', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Окончание процедуры</label>
                            <Input
                              type="datetime-local"
                              value={form.ended_at || ''}
                              onChange={(e) => updateStepForm(step.processing_step_id, 'ended_at', e.target.value)}
                            />
                          </div>
                          {form.started_at && form.ended_at && (
                            <div className="col-span-2 text-sm text-primary">
                              Затраченное время: {Math.round((new Date(form.ended_at).getTime() - new Date(form.started_at).getTime()) / 60000)} мин
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        onClick={() => submitProcessingStep(step.processing_step_id)}
                        variant="default"
                        className=""
                      >
                        Завершить этап
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Start processing button when no steps exist yet */}
          {currentSteps.length === 0 && packLot.status === 'Planned' && hasPreProcessing && hasRole(['Production', 'Admin']) && (
            <div className="mt-6 p-4 info-box rounded-lg text-center">
              <p className="mb-3">Для начала процессинга нажмите кнопку ниже</p>
              <Button
                onClick={advanceWorkflow}
                variant="default"
                size="lg"
                className="gap-2 mx-auto"
              >
                <Play size={20} />
                Начать процессинг
              </Button>
            </div>
          )}
          
          {/* Completion button */}
          {currentSteps.length > 0 && completedSteps.length === currentSteps.length && hasRole(['Production', 'Admin']) && (
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                onClick={advanceWorkflow}
                variant="success"
                size="lg"
                className="gap-2"
              >
                <CheckCircle size={20} />
                Завершить и перейти к следующему этапу
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderQc() {
    const qcRequest = qcRequests[0];
    const isQcPending = ['QC_Pending', 'PreFill_QC_Pending', 'PostFill_QC_Pending'].includes(packLot.status);
    const canAddResult = hasRole(['QC', 'Admin']);
    const canSendToQc = hasRole(['Production', 'Admin']) && !qcRequest && 
      ['Filling', 'PostProcessing', 'Processing'].includes(packLot.status);
    
    // Send to QC function
    const sendToQc = async () => {
      const qcType = packLot.status === 'Processing' ? 'PreFillQC' : 'PostFillQC';
      const checkpoint = packLot.status === 'Processing' ? 'PRE_FILL_QC' : 'POST_FILL_QC';
      const nextStatus = packLot.status === 'Processing' ? 'PreFill_QC_Pending' : 'PostFill_QC_Pending';
      
      await (supabase.from as any)('pack_qc_request').insert({
        pack_lot_id: packLot.pack_lot_id,
        qc_type: qcType,
        checkpoint_code: checkpoint,
        requested_at: new Date().toISOString(),
        status: 'Pending',
      });
      await supabase.from('pack_lot').update({ status: nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
      loadData();
    };
    
    // Get latest result for each test
    const latestQcByTest: Record<string, any> = {};
    qcResults.forEach(r => {
      if (!latestQcByTest[r.test_code] || new Date(r.tested_at) > new Date(latestQcByTest[r.test_code].tested_at)) {
        latestQcByTest[r.test_code] = r;
      }
    });
    
    const allTestsCompleted = productQcTests.length > 0 && productQcTests.every((t: any) => latestQcByTest[t.code || t.name]);
    
    // Auto pass/fail based on reference values
    const updateQcFormWithAutoCheck = (testCode: string, field: string, value: any, test: any) => {
      const updated = { ...qcFormData, [testCode]: { ...qcFormData[testCode], [field]: value } };
      
      if (field === 'value' && value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && test.norm_min != null && test.norm_max != null) {
          const inRange = numValue >= parseFloat(test.norm_min) && numValue <= parseFloat(test.norm_max);
          updated[testCode].pass = inRange;
        } else if (!isNaN(numValue) && test.norm_min != null) {
          updated[testCode].pass = numValue >= parseFloat(test.norm_min);
        } else if (!isNaN(numValue) && test.norm_max != null) {
          updated[testCode].pass = numValue <= parseFloat(test.norm_max);
        }
      }
      setQcFormData(updated);
    };
    
    // Save individual test result
    const saveTestResult = async (test: any) => {
      if (!qcRequest) {
        showError('Ошибка', 'Нет активного QC запроса');
        return;
      }
      const testCode = test.code || test.name;
      const form = qcFormData[testCode] || {};
      if (form.pass === undefined) {
        showError('Ошибка', 'Укажите Pass/Fail');
        return;
      }
      
      try {
        await supabase.from('pack_qc_result').insert({
          qc_request_id: qcRequest.qc_request_id,
          test_code: testCode,
          result_value: form.value || null,
          pass_fail: form.pass ? 'Pass' : 'Fail',
          tested_at: new Date().toISOString(),
        });
        
        // Clear form for this test
        setQcFormData(prev => { const n = {...prev}; delete n[testCode]; return n; });
        loadData();
      } catch (err: any) {
        showError('Ошибка сохранения', err.message);
      }
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 info-box rounded-lg">
          <h3 className="text-lg font-semibold">QC Продукта — Контроль качества</h3>
          {allTestsCompleted && (
            <span className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-full font-medium">
              <CheckCircle size={18} /> Все тесты выполнены
            </span>
          )}
        </div>
        
        {/* Send to QC button */}
        {canSendToQc && (
          <div className="p-6 info-box rounded-lg text-center">
            <p className="mb-4">Для начала контроля качества необходимо передать задачу в QC отдел</p>
            <Button
              onClick={sendToQc}
              variant="default"
              size="lg"
              className="gap-2 mx-auto"
            >
              <ArrowRight size={20} />
              Передать задачу в QC
            </Button>
          </div>
        )}
        
        {!qcRequest && isQcPending && (
          <div className="p-4 warning-box rounded-lg">
            ⚠️ QC запрос не найден. Обновите страницу.
          </div>
        )}
        
        {productQcTests.length === 0 ? (
          <div className="p-4 bg-muted rounded-lg text-muted-foreground">
            Нет требуемых тестов в спецификации продукта
          </div>
        ) : (
          <div className="space-y-4">
            {productQcTests.map((test: any, idx: number) => {
              const testCode = test.code || test.name;
              const existingResult = latestQcByTest[testCode];
              const form = qcFormData[testCode] || {};
              
              return (
                <div key={testCode} className={`p-4 rounded-lg border-2 ${existingResult ? 'success-box' : 'bg-card border-border'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${existingResult ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-lg">{test.name || testCode}</p>
                        <p className="text-sm text-muted-foreground">{test.code}</p>
                      </div>
                    </div>
                    {existingResult && (
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${existingResult.pass_fail === 'Pass' ? 'tag-green' : 'tag-red'}`}>
                        {existingResult.pass_fail === 'Pass' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {existingResult.pass_fail}
                      </span>
                    )}
                  </div>
                  
                  {/* Reference values and hints */}
                  <div className="mb-3 p-3 bg-muted rounded text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <span className="text-muted-foreground">Референс:</span>
                        <span className="ml-2 font-medium">
                          {test.norm_min != null && test.norm_max != null 
                            ? `${test.norm_min} - ${test.norm_max}` 
                            : test.norm_min != null ? `≥ ${test.norm_min}` 
                            : test.norm_max != null ? `≤ ${test.norm_max}` 
                            : 'Не указан'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Единицы:</span>
                        <span className="ml-2 font-medium">{test.unit || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Метод:</span>
                        <span className="ml-2 font-medium text-primary">{test.method || '-'}</span>
                      </div>
                    </div>
                    {test.description && (
                      <p className="mt-2 text-muted-foreground italic">{test.description}</p>
                    )}
                  </div>
                  
                  {existingResult ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm success-box p-3 rounded">
                      <div><span className="text-muted-foreground">Результат:</span> <span className="font-mono">{existingResult.result_value || '-'}</span> {test.unit || ''}</div>
                      <div><span className="text-muted-foreground">Дата:</span> {existingResult.tested_at ? new Date(existingResult.tested_at).toLocaleDateString('ru-RU') : '-'}</div>
                      <div>
                        {existingResult.report_ref && (
                          <a href={existingResult.report_ref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            📄 Протокол
                          </a>
                        )}
                      </div>
                    </div>
                  ) : canAddResult && isQcPending ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Результат {test.unit ? `(${test.unit})` : ''}</label>
                          <Input
                            type="text"
                            placeholder={test.input_format || 'Введите значение...'}
                            value={form.value || ''}
                            onChange={(e) => updateQcFormWithAutoCheck(testCode, 'value', e.target.value, test)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Pass / Fail *</label>
                          <select
                            value={form.pass === true ? 'Pass' : form.pass === false ? 'Fail' : ''}
                            onChange={(e) => updateQcFormWithAutoCheck(testCode, 'pass', e.target.value === 'Pass', test)}
                            className="w-full h-10 rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm"
                          >
                            <option value="">Выберите...</option>
                            <option value="Pass">✅ Pass</option>
                            <option value="Fail">❌ Fail</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => saveTestResult(test)}
                            disabled={form.pass === undefined}
                            variant="success"
                            className="w-full"
                          >
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic p-3 bg-muted rounded">Ожидает ввода результатов QC специалистом</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {allTestsCompleted && isQcPending && canAddResult && (
          <div className="p-4 success-box rounded-lg text-center">
            <CheckCircle size={32} className="mx-auto text-success mb-2" />
            <p className="font-medium text-success">Все тесты QC пройдены!</p>
            <p className="text-sm text-success mb-4">Продукт готов к решению QA</p>
            <Button
              onClick={async () => {
                if (!qcRequest) return;
                try {
                  // Update QC request status
                  await supabase.from('pack_qc_request')
                    .update({ status: 'Completed', completed_at: new Date().toISOString() })
                    .eq('qc_request_id', qcRequest.qc_request_id);

                  // Check if all passed
                  const allPassed = Object.values(latestQcByTest).every((r: any) => r.pass_fail === 'Pass');

                  // Determine next status
                  let nextStatus = 'QC_Completed';
                  if (hasQa) {
                    nextStatus = 'QA_Pending';
                  } else if (allPassed) {
                    nextStatus = 'Released';
                  }

                  await supabase.from('pack_lot')
                    .update({ status: nextStatus })
                    .eq('pack_lot_id', packLot.pack_lot_id);

                  loadData();
                } catch (err: any) {
                  showError('Ошибка', err.message);
                }
              }}
              className="gap-2"
              variant="success"
              size="lg"
            >
              <CheckCircle size={20} />
              Завершить и перейти к следующему этапу
            </Button>
          </div>
        )}
        
        {allTestsCompleted && !isQcPending && (
          <div className="p-4 success-box rounded-lg text-center">
            <CheckCircle size={32} className="mx-auto text-success mb-2" />
            <p className="font-medium text-success">QC завершен</p>
          </div>
        )}
      </div>
    );
  }

  function renderQa() {
    const latestDecision = qaDecisions[0];
    const canDecide = packLot.status === 'QA_Pending' && hasRole(['QA', 'Admin', 'Production']);
    
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">QA Решение</h3>
          
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Произведено</p>
              <p className="text-xl font-bold">{packLot.qty_produced} шт</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Процессинг</p>
              <p className="text-xl font-bold">
                {hasProcessing ? `${processingSteps.filter(s => s.status === 'Completed').length}/${processingSteps.length}` : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">QC</p>
              <p className="text-xl font-bold">
                {hasQc ? (qcResults.every(r => r.pass_fail === 'Pass') ? '✓ Pass' : '✗ Fail') : 'N/A'}
              </p>
            </div>
          </div>
          
          {canDecide && (
            <div className="p-4 warning-box rounded-lg">
              <h4 className="font-medium mb-3">Принять решение</h4>
              <textarea
                placeholder="Комментарий QA (опционально)"
                className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm mb-3"
                rows={2}
                value={qaComment}
                onChange={(e) => setQaComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => submitQaDecision('Approved', qaComment)}
                  variant="success"
                  className="gap-2"
                >
                  <CheckCircle size={18} />
                  Одобрить → Выпуск
                </Button>
                <Button
                  onClick={() => submitQaDecision('OnHold', qaComment)}
                  variant="warning"
                >
                  На удержание
                </Button>
                <Button
                  onClick={() => submitQaDecision('Rejected', qaComment)}
                  variant="destructive"
                  className="gap-2"
                >
                  <XCircle size={18} />
                  Отклонить
                </Button>
              </div>
            </div>
          )}
          
          {latestDecision && (
            <div className={`mt-4 p-4 rounded-lg ${
              latestDecision.decision === 'Approved' ? 'success-box' :
              latestDecision.decision === 'Rejected' ? 'error-box' : 'warning-box'
            }`}>
              <p className="font-medium">
                Решение: {latestDecision.decision === 'Approved' ? 'Одобрено ✓' : 
                          latestDecision.decision === 'Rejected' ? 'Отклонено ✗' : 'На удержании'}
              </p>
              {latestDecision.comment && <p className="text-sm mt-1">{latestDecision.comment}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(latestDecision.decided_at).toLocaleString('ru-RU')}
              </p>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderDocuments() {
    const productionDate = packLot.created_at ? new Date(packLot.created_at).toLocaleDateString('ru-RU') : '-';
    const productCode = (requestLine as any)?.finished_product_code || 'N/A';
    
    // Generate round vial label (1x1 cm)
    const printVialLabel = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Этикетка флакона - ${packLot.pack_lot_id}</title>
          <style>
            @page { size: 10mm 10mm; margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
            .label { width: 10mm; height: 10mm; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: monospace; font-size: 3pt; border: 0.2mm solid #333; }
            .qr { width: 6mm; height: 6mm; }
            .lot { font-size: 2.5pt; font-weight: bold; margin-top: 0.5mm; }
          </style>
        </head>
        <body>
          <div class="label">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(packLot.pack_lot_id)}" />
            <div class="lot">${packLot.pack_lot_id.slice(-8)}</div>
          </div>
          <script>setTimeout(() => { window.print(); }, 300);</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    };

    // Generate thermal printer label (3.5x5.5 cm)
    const printThermalLabel = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Термоэтикетка - ${packLot.pack_lot_id}</title>
          <style>
            @page { size: 35mm 55mm; margin: 2mm; }
            body { margin: 0; padding: 2mm; font-family: Arial, sans-serif; }
            .label { width: 31mm; height: 51mm; display: flex; flex-direction: column; align-items: center; padding: 2mm; border: 0.3mm solid #000; }
            .qr { width: 25mm; height: 25mm; margin-bottom: 2mm; }
            .info { text-align: center; width: 100%; }
            .lot { font-size: 9pt; font-weight: bold; font-family: monospace; margin-bottom: 1mm; }
            .product { font-size: 7pt; margin-bottom: 1mm; }
            .date { font-size: 8pt; }
            .date-label { font-size: 6pt; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(packLot.pack_lot_id)}" />
            <div class="info">
              <div class="lot">${packLot.pack_lot_id}</div>
              <div class="product">${productCode}</div>
              <div class="date-label">Дата производства:</div>
              <div class="date">${productionDate}</div>
            </div>
          </div>
          <script>setTimeout(() => { window.print(); }, 300);</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    };

    // Generate COA
    const generateCOA = async () => {
      const { data: qcReqs } = await supabase.from('pack_qc_request').select('*').eq('pack_lot_id', packLot.pack_lot_id);
      const qcRequestIds = qcReqs?.map(r => r.qc_request_id) || [];
      const { data: qcRes } = await supabase.from('pack_qc_result').select('*').in('qc_request_id', qcRequestIds.length ? qcRequestIds : ['']);
      const qaDecision = qaDecisions[0];
      const expiryDate = (qaDecision as any)?.expiry_date ? new Date((qaDecision as any).expiry_date).toLocaleDateString('ru-RU') : 'Не определено';
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>COA - ${packLot.pack_lot_id}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 18pt; margin: 0; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; background: #f0f0f0; padding: 5px 10px; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .info-row { display: flex; }
          .info-label { font-weight: bold; width: 150px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
          th { background: #e0e0e0; }
          .pass { color: green; font-weight: bold; }
          .fail { color: red; font-weight: bold; }
          .footer { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature { border-top: 1px solid #000; padding-top: 5px; margin-top: 40px; }
        </style></head><body>
          <div class="header"><h1>CERTIFICATE OF ANALYSIS</h1><h2>Сертификат анализа</h2></div>
          <div class="section"><div class="section-title">Информация о продукте</div>
            <div class="info-grid">
              <div class="info-row"><span class="info-label">Номер лота:</span> ${packLot.pack_lot_id}</div>
              <div class="info-row"><span class="info-label">Код продукта:</span> ${productCode}</div>
              <div class="info-row"><span class="info-label">Формат:</span> ${packFormat?.name || packLot.pack_format_code}</div>
              <div class="info-row"><span class="info-label">Количество:</span> ${packLot.qty_produced || 0} шт</div>
              <div class="info-row"><span class="info-label">Дата производства:</span> ${productionDate}</div>
              <div class="info-row"><span class="info-label">Срок годности:</span> ${expiryDate}</div>
              <div class="info-row"><span class="info-label">Исходное сырьё:</span> ${packLot.source_cm_lot_id}</div>
              <div class="info-row"><span class="info-label">Статус:</span> ${STATUS_LABELS[packLot.status] || packLot.status}</div>
            </div>
          </div>
          <div class="section"><div class="section-title">Результаты контроля качества</div>
            <table><tr><th>Тест</th><th>Результат</th><th>Статус</th></tr>
              ${(qcRes || []).map((r: any) => `<tr><td>${r.test_code}</td><td>${r.result_value || '-'} ${r.unit || ''}</td><td class="${r.pass_fail === 'Pass' ? 'pass' : 'fail'}">${r.pass_fail === 'Pass' ? '✓ Соответствует' : '✗ Не соответствует'}</td></tr>`).join('') || '<tr><td colspan="3">Нет данных QC</td></tr>'}
            </table>
          </div>
          <div class="section"><div class="section-title">Заключение QA</div>
            <p><strong>Решение:</strong> ${qaDecision?.decision === 'Approved' ? '✓ ОДОБРЕНО' : qaDecision?.decision || 'Ожидает решения'}</p>
            ${qaDecision?.reason ? `<p><strong>Комментарий:</strong> ${qaDecision.reason}</p>` : ''}
          </div>
          <div class="footer"><div><div class="signature">Ответственный за качество</div></div>
            <div style="text-align:right"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(packLot.pack_lot_id)}" /></div>
          </div>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body></html>`);
      printWindow.document.close();
      await supabase.from('generated_document').insert({ entity_type: 'PackLot', entity_id: packLot.pack_lot_id, doc_type: 'COA', generated_at: new Date().toISOString(), generated_by: user?.email, snapshot_json: { qc_results: qcRes, qa_decision: qaDecision } });
    };

    // Generate SDS
    const generateSDS = async () => {
      const productRes = await supabase.from('product').select('*').eq('product_code', productCode).maybeSingle();
      const product = productRes.data;
      let sdsData: any = null;
      if (product?.media_spec_id) {
        const sdsRes = await supabase.from('sds_media').select('*').eq('media_spec_id', product.media_spec_id).maybeSingle();
        sdsData = sdsRes.data?.sds_data;
      }
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>SDS - ${productCode}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; }
          .header { background: #1a365d; color: white; padding: 15px; margin: -15mm -15mm 15px; }
          .header h1 { margin: 0; font-size: 16pt; }
          .header h2 { margin: 5px 0 0; font-size: 12pt; font-weight: normal; }
          .section { margin-bottom: 12px; }
          .section-title { font-weight: bold; font-size: 11pt; background: #e2e8f0; padding: 5px 10px; margin-bottom: 5px; border-left: 4px solid #1a365d; }
          .section-content { padding: 5px 10px; }
          .warning { background: #fef3c7; border: 1px solid #d97706; padding: 10px; margin: 10px 0; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-label { font-weight: bold; }
        </style></head><body>
          <div class="header"><h1>SAFETY DATA SHEET / ПАСПОРТ БЕЗОПАСНОСТИ</h1><h2>${productCode} - ${product?.product_name || 'Кондиционированная среда'}</h2></div>
          <div class="section"><div class="section-title">1. ИДЕНТИФИКАЦИЯ</div><div class="section-content grid-2">
            <div><span class="info-label">Код:</span> ${productCode}</div>
            <div><span class="info-label">Лот:</span> ${packLot.pack_lot_id}</div>
          </div></div>
          <div class="section"><div class="section-title">2. ОПАСНОСТЬ</div><div class="section-content">
            <div class="warning"><strong>⚠ ВНИМАНИЕ:</strong> Биологический материал. Только для исследовательских целей.</div>
            <p><strong>Классификация:</strong> ${sdsData?.hazard_classification || 'Не опасен по GHS'}</p>
          </div></div>
          <div class="section"><div class="section-title">3. СОСТАВ</div><div class="section-content"><p>${sdsData?.composition_info || 'Кондиционированная культуральная среда с биоактивными факторами.'}</p></div></div>
          <div class="section"><div class="section-title">4. ПЕРВАЯ ПОМОЩЬ</div><div class="section-content"><p>${sdsData?.first_aid_measures || 'При контакте промыть водой. При проглатывании — к врачу.'}</p></div></div>
          <div class="section"><div class="section-title">5. ПОЖАРОТУШЕНИЕ</div><div class="section-content"><p>${sdsData?.extinguishing_media || 'Вода, CO2, порошок. Продукт не горюч.'}</p></div></div>
          <div class="section"><div class="section-title">6. АВАРИЙНЫЙ ВЫБРОС</div><div class="section-content"><p>${sdsData?.personal_precautions || 'СИЗ, собрать абсорбентом, дезинфекция.'}</p></div></div>
          <div class="section"><div class="section-title">7. ХРАНЕНИЕ</div><div class="section-content"><p>${sdsData?.storage_conditions || 'Хранить при -20°C...-80°C. Не перезамораживать.'}</p></div></div>
          <div class="section"><div class="section-title">8. СИЗ</div><div class="section-content"><p>${sdsData?.personal_protection || 'Халат, перчатки, очки. Ламинарный бокс класса II.'}</p></div></div>
          <div class="section"><div class="section-title">9. ФИЗ-ХИМ СВОЙСТВА</div><div class="section-content grid-2">
            <div><span class="info-label">Состояние:</span> ${sdsData?.physical_state || 'Жидкость (заморож.)'}</div>
            <div><span class="info-label">pH:</span> ${sdsData?.ph || '7.2-7.4'}</div>
          </div></div>
          <div class="section"><div class="section-title">10-16. ДОПОЛНИТЕЛЬНО</div><div class="section-content">
            <p><strong>Утилизация:</strong> ${sdsData?.disposal_methods || 'Автоклав, биоотходы.'}</p>
          </div></div>
          <div style="margin-top:20px;font-size:9pt;color:#666;border-top:1px solid #ccc;padding-top:10px;">Дата: ${new Date().toLocaleDateString('ru-RU')}</div>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body></html>`);
      printWindow.document.close();
      await supabase.from('generated_document').insert({ entity_type: 'PackLot', entity_id: packLot.pack_lot_id, doc_type: 'SDS', generated_at: new Date().toISOString(), generated_by: user?.email, snapshot_json: { product, sds_data: sdsData } });
    };

    return (
      <div className="space-y-6">
        {/* QR Labels */}
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Printer size={20} />Этикетки с QR-кодом</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Круглая этикетка (1×1 см)</h4>
              <p className="text-sm text-muted-foreground mb-3">Для флаконов — микрокод + номер лота</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-border flex flex-col items-center justify-center bg-card">
                  <QRCodeSVG value={packLot.pack_lot_id} size={32} />
                  <span className="text-[6px] font-mono font-bold mt-0.5">{packLot.pack_lot_id.slice(-8)}</span>
                </div>
                <div className="text-sm text-muted-foreground"><p>10×10 мм, круглый</p></div>
              </div>
              <Button onClick={printVialLabel} variant="default" className="gap-2"><Printer size={18} />Печать этикетки флакона</Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Термоэтикетка (3.5×5.5 см)</h4>
              <p className="text-sm text-muted-foreground mb-3">Для термопринтера — QR + лот + дата</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-28 border-2 border-border flex flex-col items-center justify-center p-2 bg-card">
                  <QRCodeSVG value={packLot.pack_lot_id} size={48} />
                  <span className="text-[7px] font-mono font-bold mt-1">{packLot.pack_lot_id}</span>
                  <span className="text-[5px] text-muted-foreground">{productCode}</span>
                  <span className="text-[6px] mt-0.5">{productionDate}</span>
                </div>
                <div className="text-sm text-muted-foreground"><p>35×55 мм</p></div>
              </div>
              <Button onClick={printThermalLabel} variant="default" className="gap-2"><Printer size={18} />Печать термоэтикетки</Button>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><FileText size={20} />Сертификаты и документы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:border-success hover:bg-success/10 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 tag-green rounded-lg"><ClipboardCheck className="text-success" size={24} /></div>
                <div className="flex-1">
                  <h4 className="font-medium">Certificate of Analysis (COA)</h4>
                  <p className="text-sm text-muted-foreground mt-1">Сертификат анализа с результатами QC и решением QA</p>
                  <Button onClick={generateCOA} variant="success" size="sm" className="mt-3 gap-2"><FileText size={16} />Генерировать COA</Button>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg hover:border-warning hover:bg-warning/10 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 tag-amber rounded-lg"><ShieldCheck size={24} /></div>
                <div className="flex-1">
                  <h4 className="font-medium">Safety Data Sheet (SDS)</h4>
                  <p className="text-sm text-muted-foreground mt-1">Паспорт безопасности материала</p>
                  <Button onClick={generateSDS} variant="warning" size="sm" className="mt-3 gap-2"><FileText size={16} />Генерировать SDS</Button>
                </div>
              </div>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderLyophilization() {
    // Find lyophilization step and method
    const lyoStep = processingSteps.find(s => s.method_name?.toLowerCase().includes('лиофил'));
    const lyoMethod = cmProcessMethods.find(m => m.name?.toLowerCase().includes('лиофил'));
    const stepDefinitions = lyoMethod?.step_definitions || [];
    const canProcess = hasRole(['Production', 'Admin']) && ['PostProcessing', 'Filled'].includes(packLot.status);
    const isCompleted = lyoStep?.status === 'Completed';
    const qtyPlanned = packLot.qty_planned || 0;

    const updateLyoStepForm = (field: string, value: any) => {
      setLyoFormData(prev => ({ ...prev, [field]: value }));
    };

    const submitLyoStep = async () => {
      if (!lyoStep) return;
      setLyoSaving(true);
      try {
        const qtyIn = parseInt(lyoFormData.qty_input) || qtyPlanned;
        const qtyOut = parseInt(lyoFormData.qty_output) || qtyIn;
        
        let durationMinutes: number | null = null;
        let startedAt = lyoFormData.started_at ? new Date(lyoFormData.started_at).toISOString() : null;
        let endedAt = lyoFormData.ended_at ? new Date(lyoFormData.ended_at).toISOString() : null;
        
        if (startedAt && endedAt) {
          durationMinutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
        }

        await supabase.from('pack_processing_step').update({
          qty_input: qtyIn,
          qty_output: qtyOut,
          notes: lyoFormData.notes || null,
          started_at: startedAt || new Date().toISOString(),
          ended_at: endedAt,
          duration_minutes: durationMinutes,
          completed_at: new Date().toISOString(),
          performed_by: user?.user_id,
          status: 'Completed'
        }).eq('processing_step_id', lyoStep.processing_step_id);

        // Check if all post-processing steps completed
        const { data: allSteps } = await (supabase.from as any)('pack_processing_step')
          .select('status, processing_stage')
          .eq('pack_lot_id', packLot.pack_lot_id)
          .eq('processing_stage', 'post_filling');
        
        const allDone = (allSteps || []).every((s: any) => s.status === 'Completed');
        if (allDone) {
          const nextStatus = hasPostFillQc ? 'PostFill_QC_Pending' : 'Released';
          
          // Create QC request if transitioning to QC
          if (hasPostFillQc) {
            await (supabase.from as any)('pack_qc_request').insert({
              pack_lot_id: packLot.pack_lot_id,
              qc_type: 'ProductQC',
              checkpoint_code: 'POST_FILL_QC',
              requested_at: new Date().toISOString(),
              status: 'Pending',
            });
          }
          
          await supabase.from('pack_lot').update({ status: nextStatus }).eq('pack_lot_id', packLot.pack_lot_id);
          setActiveTab(hasPostFillQc ? 'qc' : 'summary');
        }
        
        loadData();
      } catch (err: any) {
        showError('Ошибка', err.message);
      } finally {
        setLyoSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Snowflake size={20} className="text-primary" />
            Лиофилизация
            {isCompleted && <span className="ml-2 px-2 py-1 tag-green text-sm rounded">Выполнено</span>}
          </h3>

          {/* Step definitions from reference */}
          {stepDefinitions.length > 0 && (
            <div className="mb-6 p-4 info-box rounded-lg">
              <h4 className="font-medium mb-3">Этапы процесса (из справочника)</h4>
              <div className="space-y-2">
                {stepDefinitions.map((step: any, idx: number) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 flex-shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium">
                      {step.step_number}
                    </span>
                    <div>
                      <p className="text-foreground">{step.description}</p>
                      {step.expected_results && (
                        <p className="text-muted-foreground text-xs">Ожидаемый результат: {step.expected_results}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed result */}
          {isCompleted && lyoStep && (
            <div className="p-4 success-box rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Вход:</span> {lyoStep.qty_input || '-'} шт</div>
                <div><span className="text-muted-foreground">Выход:</span> {lyoStep.qty_output || '-'} шт</div>
                <div><span className="text-muted-foreground">Примечания:</span> {lyoStep.notes || '-'}</div>
                {lyoStep.started_at && lyoStep.ended_at && (
                  <>
                    <div><span className="text-muted-foreground">Начало:</span> {new Date(lyoStep.started_at).toLocaleString('ru-RU')}</div>
                    <div><span className="text-muted-foreground">Окончание:</span> {new Date(lyoStep.ended_at).toLocaleString('ru-RU')}</div>
                    <div><span className="text-muted-foreground">Длительность:</span> {lyoStep.duration_minutes || '-'} мин</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Input form */}
          {!isCompleted && lyoStep && canProcess && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Кол-во на входе (шт) <span className="text-muted-foreground">(план: {qtyPlanned})</span></label>
                  <Input
                    type="number" min="1"
                    value={lyoFormData.qty_input || ''}
                    onChange={(e) => updateLyoStepForm('qty_input', e.target.value)}
                    placeholder={String(qtyPlanned)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Кол-во на выходе (шт)</label>
                  <Input
                    type="number" min="0"
                    value={lyoFormData.qty_output || ''}
                    onChange={(e) => updateLyoStepForm('qty_output', e.target.value)}
                    placeholder="Если не указано, равно входу"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 info-box rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Начало процедуры</label>
                  <Input
                    type="datetime-local"
                    value={lyoFormData.started_at || ''}
                    onChange={(e) => updateLyoStepForm('started_at', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Окончание процедуры</label>
                  <Input
                    type="datetime-local"
                    value={lyoFormData.ended_at || ''}
                    onChange={(e) => updateLyoStepForm('ended_at', e.target.value)}
                  />
                </div>
                {lyoFormData.started_at && lyoFormData.ended_at && (
                  <div className="col-span-2 text-sm text-primary">
                    Затраченное время: {Math.round((new Date(lyoFormData.ended_at).getTime() - new Date(lyoFormData.started_at).getTime()) / 60000)} мин
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Примечания</label>
                <textarea
                  value={lyoFormData.notes || ''}
                  onChange={(e) => updateLyoStepForm('notes', e.target.value)}
                  className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              
              <Button
                onClick={submitLyoStep}
                disabled={lyoSaving}
                loading={lyoSaving}
                variant="default"
              >
                {lyoSaving ? 'Сохранение...' : 'Завершить лиофилизацию'}
              </Button>
            </div>
          )}

          {/* No step yet */}
          {!lyoStep && (
            <div className="p-4 warning-box rounded-lg">
              Этап лиофилизации ещё не создан. Он будет доступен после перехода к постпроцессингу.
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderShipments() {
    const totalShipped = shipments.reduce((sum, s) => sum + (s.qty_shipped || 0), 0);
    const qtyAvailable = (packLot?.qty_produced || 0) - totalShipped;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!packLot) return;
      setShipmentSaving(true);
      try {
        const { error } = await supabase.from('shipment').insert({
          shipment_id: `SH-${Date.now()}`,
          pack_lot_id: packLot.pack_lot_id,
          qty_shipped: parseInt(shipmentFormData.qty_shipped),
          shipped_at: shipmentFormData.shipped_at,
          recipient_name: shipmentFormData.recipient_name,
          invoice_number: shipmentFormData.invoice_number,
          waybill_number: shipmentFormData.waybill_number,
          shipped_by: user?.email || 'system'
        });
        if (error) throw error;
        setShowShipmentForm(false);
        setShipmentFormData({ qty_shipped: '', shipped_at: new Date().toISOString(), recipient_name: '', invoice_number: '', waybill_number: '' });
        loadData();
      } catch (err: any) {
        showError('Ошибка сохранения', err.message);
      } finally {
        setShipmentSaving(false);
      }
    };

    const canShip = packLot?.status === 'Released' || packLot?.status === 'PartiallyShipped';

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 info-box rounded-lg">
            <p className="text-sm text-primary">Произведено</p>
            <p className="text-2xl font-bold">{packLot?.qty_produced || 0}</p>
          </div>
          <div className="p-4 success-box rounded-lg">
            <p className="text-sm text-success">Отгружено</p>
            <p className="text-2xl font-bold text-success">{totalShipped}</p>
          </div>
          <div className="p-4 warning-box rounded-lg">
            <p className="text-sm text-warning">На складе</p>
            <p className="text-2xl font-bold">{qtyAvailable}</p>
          </div>
        </div>

        {/* Add shipment button */}
        {canShip && qtyAvailable > 0 && !showShipmentForm && (
          <Button
            onClick={() => setShowShipmentForm(true)}
            variant="default"
            className="gap-2"
          >
            <Truck size={20} />
            Добавить отгрузку
          </Button>
        )}

        {/* Shipment form */}
        {showShipmentForm && (
          <form onSubmit={handleSubmit} className="p-4 border border-border rounded-lg bg-muted space-y-4">
            <h4 className="font-medium">Новая отгрузка</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Количество (макс. {qtyAvailable})</label>
                <Input
                  type="number"
                  min="1"
                  max={qtyAvailable}
                  value={shipmentFormData.qty_shipped}
                  onChange={e => setShipmentFormData({...shipmentFormData, qty_shipped: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Дата отгрузки</label>
                <Input
                  type="date"
                  value={shipmentFormData.shipped_at.split('T')[0]}
                  onChange={e => setShipmentFormData({...shipmentFormData, shipped_at: new Date(e.target.value).toISOString()})}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-muted-foreground mb-1">Получатель (ФИО / Название компании)</label>
                <Input
                  type="text"
                  value={shipmentFormData.recipient_name}
                  onChange={e => setShipmentFormData({...shipmentFormData, recipient_name: e.target.value})}
                  placeholder="ООО Ромашка или Иванов И.И."
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Номер счета</label>
                <Input
                  type="text"
                  value={shipmentFormData.invoice_number}
                  onChange={e => setShipmentFormData({...shipmentFormData, invoice_number: e.target.value})}
                  placeholder="СЧ-2026-001"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Номер накладной</label>
                <Input
                  type="text"
                  value={shipmentFormData.waybill_number}
                  onChange={e => setShipmentFormData({...shipmentFormData, waybill_number: e.target.value})}
                  placeholder="ТН-2026-001"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={shipmentSaving} loading={shipmentSaving} variant="success">
                {shipmentSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button type="button" onClick={() => setShowShipmentForm(false)} variant="outline">
                Отмена
              </Button>
            </div>
          </form>
        )}

        {/* Shipments list */}
        <div className="space-y-3">
          <h4 className="font-medium">История отгрузок</h4>
          {shipments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Отгрузок пока нет</p>
          ) : (
            <div className="divide-y border rounded-lg">
              {shipments.map((s: any) => (
                <div key={s.shipment_id} className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{s.qty_shipped} шт → {s.recipient_name || 'Не указан'}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.shipped_at ? new Date(s.shipped_at).toLocaleDateString('ru-RU') : '-'}
                      {s.invoice_number && ` | Счёт: ${s.invoice_number}`}
                      {s.waybill_number && ` | Накладная: ${s.waybill_number}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{packLot.pack_lot_id}</h1>
          <p className="text-muted-foreground">
            {(requestLine as any)?.finished_product_code || 'Продукт'} | 
            {packFormat?.name || packLot.pack_format_code} | 
            CM: <Link to={`/cm/${packLot.source_cm_lot_id}`} className="text-primary hover:underline">{packLot.source_cm_lot_id}</Link>
          </p>
        </div>

      </div>

      {/* Tabs - only highlight active workflow tabs */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between">
          <nav className="flex gap-1 -mb-px">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isCurrent = tab.id === currentTab;
              // Dim future tabs that are not yet reachable
              const isAvailable = isCurrent || ['summary', 'documents'].includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary bg-primary/10'
                      : isCurrent
                      ? 'border-success text-success bg-success/10'
                      : isAvailable
                      ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {isCurrent && <span className="ml-1 text-xs text-success">●</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'processing' && renderProcessing()}
        {activeTab === 'filling' && renderFilling()}
        {activeTab === 'lyophilization' && renderLyophilization()}
        {activeTab === 'qc' && renderQc()}
        {activeTab === 'qa' && renderQa()}
        {activeTab === 'shipments' && renderShipments()}
        {activeTab === 'documents' && renderDocuments()}
      </div>

      {/* New Request Created Banner */}
      {newRequestCreated && (
        <div className="fixed bottom-4 right-4 z-50 bg-success text-white rounded-lg shadow-lg p-4 max-w-sm animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} />
            <div>
              <p className="font-medium">Заявка создана!</p>
              <p className="text-sm opacity-90">
                {newRequestCreated.id} на {newRequestCreated.qty} шт
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Link
              to={`/requests/${newRequestCreated.id}`}
              className="flex-1 px-3 py-2 bg-card text-success rounded text-center text-sm font-medium hover:bg-success/10"
            >
              Перейти к заявке
            </Link>
            <Button
              onClick={() => setNewRequestCreated(null)}
              variant="ghost"
              size="sm"
              className="bg-success/80 hover:bg-success text-white"
            >
              Закрыть
            </Button>
          </div>
        </div>
      )}

      {/* Partial Fill Modal */}
      <Dialog open={showPartialFillModal && !!packLot} onOpenChange={(open) => !open && setShowPartialFillModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="text-warning" size={24} />
              Частичный розлив
            </DialogTitle>
          </DialogHeader>

          <div className="warning-box rounded-lg p-4">
            <p className="text-sm">
              Произведено <strong>{qtyProduced}</strong> из <strong>{packLot?.qty_planned}</strong> запланированных единиц.
            </p>
            <p className="text-sm text-warning mt-1">
              Недопроизведено: <strong>{(packLot?.qty_planned || 0) - qtyProduced}</strong> шт
            </p>
          </div>

          <p className="text-sm text-muted-foreground">Что сделать с заявкой?</p>

          <div className="space-y-3">
            <button
              onClick={() => handlePartialFillOption('newRequest')}
              className="w-full p-4 text-left border-2 border-primary/30 rounded-lg hover:border-primary hover:bg-primary/10 transition-all"
            >
              <p className="font-medium text-primary">Создать доп. заявку</p>
              <p className="text-sm text-muted-foreground mt-1">
                Текущая заявка → "Частично выполнена", новая заявка на {(packLot?.qty_planned || 0) - qtyProduced} шт
              </p>
            </button>

            <button
              onClick={() => handlePartialFillOption('accept')}
              className="w-full p-4 text-left border-2 border-border rounded-lg hover:border-muted-foreground hover:bg-muted transition-all"
            >
              <p className="font-medium text-foreground">Принять как есть</p>
              <p className="text-sm text-muted-foreground mt-1">
                Заявка → "Выполнена" (без дозаказа)
              </p>
            </button>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowPartialFillModal(false)}
              variant="outline"
              className="w-full"
            >
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
