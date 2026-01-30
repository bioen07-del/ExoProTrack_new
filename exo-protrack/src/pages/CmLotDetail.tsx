import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ReactEChartsCore from 'echarts-for-react';
const ReactECharts = ReactEChartsCore as any;
import { 
  FlaskConical, Beaker, Cog, ClipboardCheck, ShieldCheck, FileText,
  Plus, Printer, AlertTriangle, CheckCircle, XCircle, Clock, Package, Info,
  Droplets, TestTube2, Truck, ArrowRight
} from 'lucide-react';

// Компонент подсказки
function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1">
      <Info size={14} className="text-muted-foreground cursor-help inline" />
      <span className="absolute z-50 invisible group-hover:visible bg-popover text-popover-foreground text-xs rounded py-1 px-2 -top-8 left-0 whitespace-nowrap max-w-xs shadow-md border border-border">
        {text}
      </span>
    </span>
  );
}
import { supabase, CmLot, Container, CollectionEvent, ProcessingStep, 
  CmQcRequest, CmQcResult, CmQaReleaseDecision, Culture, MediaCompatibilitySpec } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MediaFormulaDisplay from '../components/MediaFormulaDisplay';
import ProductRequirementsCard from '../components/ProductRequirementsCard';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { StatusBadge } from '../components/ui/status-badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { showError, showSuccess, showConfirm } from '../lib/toast';

const TABS = [
  { id: 'summary', label: 'Обзор', icon: FlaskConical },
  { id: 'collections', label: 'Сборы', icon: Beaker },
  { id: 'processing', label: 'Процессинг', icon: Cog },
  { id: 'qc', label: 'QC Сырья', icon: ClipboardCheck },
  { id: 'qa', label: 'QA', icon: ShieldCheck },
  { id: 'usage', label: 'Склад и движение', icon: Package },
  { id: 'documents', label: 'Документы', icon: FileText },
];

const STATUS_LABELS: Record<string, string> = {
  Open: 'Открыт',
  Closed_Collected: 'Сбор завершен',
  In_Processing: 'В обработке',
  QC_Pending: 'Ожидает QC',
  QC_Completed: 'QC завершен',
  Approved: 'QA одобрен',
  Rejected: 'Брак',
  OnHold: 'На удержании',
  Consumed: 'Израсходовано',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-800',
  Closed_Collected: 'bg-purple-100 text-purple-800',
  In_Processing: 'bg-amber-100 text-amber-800',
  QC_Pending: 'bg-yellow-100 text-yellow-800',
  QC_Completed: 'bg-green-100 text-green-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
  OnHold: 'bg-orange-100 text-orange-800',
};

export default function CmLotDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  const [lot, setLot] = useState<CmLot | null>(null);
  const [container, setContainer] = useState<Container | null>(null);
  const [collections, setCollections] = useState<CollectionEvent[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [qcRequests, setQcRequests] = useState<CmQcRequest[]>([]);
  const [qcResults, setQcResults] = useState<CmQcResult[]>([]);
  const [qaDecisions, setQaDecisions] = useState<CmQaReleaseDecision[]>([]);
  const [mediaSpecs, setMediaSpecs] = useState<MediaCompatibilitySpec[]>([]);
  const [requestLine, setRequestLine] = useState<any>(null);
  const [packLots, setPackLots] = useState<any[]>([]);
  const [infectionTypes, setInfectionTypes] = useState<any[]>([]);
  const [infectionResults, setInfectionResults] = useState<any[]>([]);
  const [showInfectionForm, setShowInfectionForm] = useState(false);
  const [infectionForm, setInfectionForm] = useState({ culture_id: '', infection_type_id: '', result: 'negative', test_date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(true);
  const [productSpecs, setProductSpecs] = useState<any>(null);
  const [processMethods, setProcessMethods] = useState<any[]>([]);

  // Forms state
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showProcessingForm, setShowProcessingForm] = useState(false);
  const [showQcForm, setShowQcForm] = useState(false);
  const [showQaForm, setShowQaForm] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // Автопереход на вкладку QC для пользователей с ролью QC
  useEffect(() => {
    if (lot && hasRole(['QC']) && !hasRole(['Admin', 'Production'])) {
      if (['QC_Pending', 'QC_Completed'].includes(lot.status)) {
        setActiveTab('qc');
      }
    }
  }, [lot?.status]);

  async function loadData() {
    try {
      const [lotRes, containerRes, collectionsRes, stepsRes, qcReqRes, qcResRes, qaRes, mediaRes, packLotsRes] = await Promise.all([
        supabase.from('cm_lot').select('*').eq('cm_lot_id', id).single(),
        supabase.from('container').select('*').eq('owner_id', id).eq('owner_entity_type', 'CM_Lot').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('collection_event').select('*').eq('cm_lot_id', id).order('collected_at', { ascending: false }),
        supabase.from('processing_step').select('*').eq('cm_lot_id', id).order('started_at'),
        supabase.from('cm_qc_request').select('*').eq('cm_lot_id', id),
        supabase.from('cm_qc_result').select('*'),
        supabase.from('cm_qa_release_decision').select('*').eq('cm_lot_id', id).order('decided_at', { ascending: false }),
        supabase.from('media_compatibility_spec').select('*'),
        supabase.from('pack_lot').select('*').eq('source_cm_lot_id', id),
      ]);

      setLot(lotRes.data);
      setContainer(containerRes.data);
      setCollections(collectionsRes.data || []);
      setProcessingSteps(stepsRes.data || []);
      setQcRequests(qcReqRes.data || []);
      setMediaSpecs(mediaRes.data || []);
      setQaDecisions(qaRes.data || []);
      setPackLots(packLotsRes.data || []);

      // Filter QC results for this lot's requests
      const requestIds = (qcReqRes.data || []).map(r => r.qc_request_id);
      const filteredResults = (qcResRes.data || []).filter(r => requestIds.includes(r.qc_request_id));
      setQcResults(filteredResults);

      // Load request_line if CM is linked
      if (lotRes.data?.request_line_id) {
        const { data: lineData } = await supabase
          .from('request_line')
          .select('*')
          .eq('request_line_id', lotRes.data.request_line_id)
          .single();
        setRequestLine(lineData);
      } else {
        setRequestLine(null);
      }

      // Load product specs for requirements
      if (lotRes.data?.base_product_code) {
        const [prodRes, methodsRes] = await Promise.all([
          supabase.from('product').select('*').eq('product_code', lotRes.data.base_product_code).single(),
          (supabase.from as any)('cm_process_method').select('*'),
        ]);
        setProductSpecs(prodRes.data);
        setProcessMethods(methodsRes.data || []);
      }
      
      // Load infection types and results (by cultures used in this lot)
      const infTypesRes = await (supabase.from as any)('infection_type').select('*').order('name');
      setInfectionTypes(infTypesRes.data || []);
      
      // Get unique culture IDs from collections
      const cultureIds = [...new Set((collectionsRes.data || []).map((c: any) => c.culture_id))];
      if (cultureIds.length > 0) {
        const infResultsRes = await (supabase.from as any)('infection_test_result')
          .select('*')
          .eq('entity_type', 'Culture')
          .in('entity_id', cultureIds);
        setInfectionResults(infResultsRes.data || []);
      } else {
        setInfectionResults([]);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleAddInfectionResult() {
    if (!infectionForm.culture_id) {
      showError('Ошибка', 'Выберите культуру');
      return;
    }
    if (!infectionForm.infection_type_id) {
      showError('Ошибка', 'Выберите тип инфекции');
      return;
    }
    try {
      await (supabase.from as any)('infection_test_result').insert({
        result_id: crypto.randomUUID(),
        entity_type: 'Culture',
        entity_id: infectionForm.culture_id,
        infection_type_id: infectionForm.infection_type_id,
        result: infectionForm.result,
        test_date: infectionForm.test_date
      });
      setShowInfectionForm(false);
      setInfectionForm({ culture_id: '', infection_type_id: '', result: 'negative', test_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }
  
  async function handleDeleteInfectionResult(resultId: string) {
    const ok = await showConfirm('Удалить результат?', { description: 'Это действие нельзя отменить' });
    if (!ok) return;
    await (supabase.from as any)('infection_test_result').delete().eq('result_id', resultId);
    loadData();
  }

  async function handleStatusChange(newStatus: string) {
    if (!lot) return;

    // Validation rules
    if (newStatus === 'Closed_Collected' && collections.length === 0) {
      showError('Ошибка', 'Невозможно закрыть сбор без событий сбора');
      return;
    }

    if (newStatus === 'Closed_Collected') {
      const ok = await showConfirm('Закрыть сбор?', { description: 'После выполнения этой операции продолжить сбор не получится.' });
      if (!ok) return;
    }

    const { error } = await supabase
      .from('cm_lot')
      .update({
        status: newStatus,
        collection_end_at: newStatus === 'Closed_Collected' ? new Date().toISOString() : lot.collection_end_at
      })
      .eq('cm_lot_id', lot.cm_lot_id);

    if (error) {
      showError('Ошибка', error.message);
    } else {
      // Автоматическое создание QC запроса при переходе в QC_Pending
      if (newStatus === 'QC_Pending') {
        const { error: qcError } = await supabase.from('cm_qc_request').insert({
          cm_lot_id: lot.cm_lot_id,
          checkpoint_code: 'QC_RAW',
          requested_by: user?.user_id,
          status: 'Opened',
          qc_type: 'Raw',
        });
        if (qcError) {
          console.error('Ошибка создания QC запроса:', qcError);
          showError('Ошибка', 'Ошибка автоматического создания QC запроса: ' + qcError.message);
        }
      }
      loadData();
    }
  }

  // Workflow advancement with validation
  function getNextWorkflowStep(): { nextStatus: string; nextTab: string; label: string } | null {
    const workflow: Record<string, { nextStatus: string; nextTab: string; label: string }> = {
      'Open': { nextStatus: 'Closed_Collected', nextTab: 'processing', label: 'Закрыть сбор' },
      'Closed_Collected': { nextStatus: 'In_Processing', nextTab: 'qc', label: 'Начать обработку' },
      'In_Processing': { nextStatus: 'QC_Pending', nextTab: 'qc', label: 'Передать на QC' },
      'QC_Pending': { nextStatus: 'QC_Completed', nextTab: 'qa', label: 'Завершить QC' },
      'QC_Completed': { nextStatus: 'Approved', nextTab: 'usage', label: 'Одобрить сырьё' },
    };
    return workflow[lot?.status || ''] || null;
  }

  function canAdvanceWorkflow(): boolean {
    if (!lot) return false;
    if (lot.status === 'Open' && collections.length === 0) return false;
    if (lot.status === 'Closed_Collected' && processingSteps.length === 0) return false;
    if (lot.status === 'QC_Pending') {
      const requiredTests: string[] = (lot as any).frozen_spec?.qc?.raw?.map((t: any) => t.code) || [];
      const allQcDone = requiredTests.length > 0 && requiredTests.every(code => 
        qcResults.some(r => r.test_code === code)
      );
      if (!allQcDone) return false;
    }
    if (lot.status === 'QC_Completed' && qaDecisions.length === 0) return false;
    if (lot.status === 'Approved' && packLots.length === 0) return false;
    return true;
  }

  async function advanceWorkflow() {
    if (!lot) return;
    const next = getNextWorkflowStep();
    if (!next) return;

    // Validation: check if current step is completed
    if (lot.status === 'Open' && collections.length === 0) {
      showError('Нельзя перейти', 'Сначала добавьте хотя бы одно событие сбора');
      setActiveTab('collections');
      return;
    }
    if (lot.status === 'Closed_Collected' && processingSteps.length === 0) {
      showError('Нельзя перейти', 'Сначала выполните шаги обработки');
      setActiveTab('processing');
      return;
    }
    // QC_Pending: все тесты должны быть выполнены
    if (lot.status === 'QC_Pending') {
      const requiredTests: string[] = (lot as any).frozen_spec?.qc?.raw?.map((t: any) => t.code) || [];
      const allQcDone = requiredTests.length > 0 && requiredTests.every(code =>
        qcResults.some(r => r.test_code === code)
      );
      if (!allQcDone) {
        showError('Нельзя перейти', 'Сначала завершите все тесты QC');
        setActiveTab('qc');
        return;
      }
    }
    // QC_Completed: решение QA должно быть принято
    if (lot.status === 'QC_Completed') {
      if (qaDecisions.length === 0) {
        showError('Нельзя перейти', 'Сначала примите решение QA');
        setActiveTab('qa');
        return;
      }
    }
    // Approved: должен быть хотя бы один розлив (packLot)
    if (lot.status === 'Approved') {
      if (packLots.length === 0) {
        showError('Нельзя перейти', 'Сначала начните розлив по заявкам');
        setActiveTab('filling');
        return;
      }
    }

    if (lot.status === 'Open') {
      const ok = await showConfirm('Закрыть сбор?', { description: 'Закрыть сбор и перейти к обработке?' });
      if (!ok) return;
    }

    await handleStatusChange(next.nextStatus);
    setActiveTab(next.nextTab);
  }

  async function printLabel() {
    if (!lot) return;
    
    // Log print action
    await supabase.from('label_print_log').insert({
      entity_type: 'CM_Lot',
      entity_id: lot.cm_lot_id,
      label_format: '5x7',
      qty_printed: 1,
      printed_at: new Date().toISOString(),
      printed_by: user?.user_id,
    });

    // Update container print timestamp
    if (container) {
      await supabase.from('container')
        .update({ label_printed_at: new Date().toISOString() })
        .eq('container_id', container.container_id);
    }

    // Open print dialog
    window.print();
    showSuccess('Успешно', 'Печать QR-этикетки зафиксирована');
  }

  const latestDecision = qaDecisions[0];
  const mediaSpec = mediaSpecs.find(m => m.media_spec_id === lot?.media_spec_id);

  // Get latest QC results by test code
  const latestQcByTest: Record<string, CmQcResult> = {};
  qcResults.forEach(r => {
    if (!latestQcByTest[r.test_code] || 
        new Date(r.tested_at || r.created_at || 0) > new Date(latestQcByTest[r.test_code].tested_at || latestQcByTest[r.test_code].created_at || 0)) {
      latestQcByTest[r.test_code] = r;
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  if (!lot) {
    return <div className="text-center py-8 text-red-500">CM Лот не найден</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground font-mono">{lot.cm_lot_id}</h1>
            <StatusBadge status={lot.status} />
            {requestLine?.additional_qc_required && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle size={14} />
                Требуется доп. QC
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{lot.base_product_code} | Режим: {lot.mode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printLabel}>
            <Printer size={20} className="mr-2" />
            Печать QR
          </Button>
        </div>
      </div>

      {/* Workflow Progress Indicator */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          {[
            { statuses: ['Open'], label: 'Сбор', icon: Beaker, tab: 'collections' },
            { statuses: ['Closed_Collected', 'In_Processing'], label: 'Обработка', icon: Cog, tab: 'processing' },
            { statuses: ['QC_Pending'], label: 'QC Сырья', icon: ClipboardCheck, tab: 'qc' },
            { statuses: ['QC_Completed'], label: 'QA', icon: ShieldCheck, tab: 'qa' },
            { statuses: ['Approved'], label: 'Одобрено', icon: Package, tab: 'usage' },
          ].map((step, idx, arr) => {
            const statusOrder = ['Open', 'Closed_Collected', 'In_Processing', 'QC_Pending', 'QC_Completed', 'Approved'];
            const currentIdx = statusOrder.indexOf(lot.status);
            const stepMinIdx = Math.min(...step.statuses.map(s => statusOrder.indexOf(s)).filter(i => i >= 0));
            const stepMaxIdx = Math.max(...step.statuses.map(s => statusOrder.indexOf(s)).filter(i => i >= 0));
            const isCompleted = stepMaxIdx < currentIdx;
            const isCurrent = step.statuses.includes(lot.status);
            const isNext = !isCurrent && !isCompleted && stepMinIdx === currentIdx + 1;
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <button
                  onClick={() => setActiveTab(step.tab)}
                  className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-muted-foreground/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : isCurrent ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-muted'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.label}</span>
                </button>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    isCompleted ? 'bg-green-400' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Tabs + Workflow Button */}
      <div className="border-b border-border overflow-hidden">
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 overflow-x-auto flex-1 min-w-0">
            {TABS.filter(tab => {
              // Для QC роли (без Admin/Production) показываем только Обзор и QC
              const isQcOnlyRole = hasRole(['QC']) && !hasRole(['Admin', 'Production']);
              if (isQcOnlyRole) {
                return ['summary', 'qc'].includes(tab.id);
              }
              return true;
            }).map((tab) => {
              const statusToNextTab: Record<string, string> = {
                'Open': 'collections',
                'Closed_Collected': 'processing',
                'In_Processing': 'qc',
                'QC_Pending': 'qc',
                'QC_Completed': 'qa',
                'Approved': 'filling',
                'Filling': 'qc_product',
              };
              const nextTab = statusToNextTab[lot.status];
              const isNextStep = tab.id === nextTab && activeTab !== tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : isNextStep
                      ? 'border-amber-300 text-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {isNextStep && <span className="ml-1 text-xs">→</span>}
                </button>
              );
            })}
          </nav>

          {/* Workflow Advance Button - скрыт для QC роли */}
          {getNextWorkflowStep() && !( hasRole(['QC']) && !hasRole(['Admin', 'Production']) ) && (
            <Button
              variant={canAdvanceWorkflow() ? 'success' : 'secondary'}
              size="sm"
              onClick={advanceWorkflow}
              disabled={!canAdvanceWorkflow()}
              className="flex-shrink-0"
            >
              <ArrowRight size={16} className="mr-1" />
              {getNextWorkflowStep()?.label}
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <Card><CardContent className="p-6">
        {activeTab === 'summary' && (
          <SummaryTab 
            lot={lot} 
            container={container} 
            collections={collections}
            latestQcByTest={latestQcByTest}
            latestDecision={latestDecision}
            mediaSpec={mediaSpec}
            productSpecs={productSpecs}
          />
        )}
        {activeTab === 'collections' && (
          <CollectionsTab 
            lot={lot}
            collections={collections}
            container={container}
            mediaSpecs={mediaSpecs}
            onRefresh={loadData}
            showForm={showCollectionForm}
            setShowForm={setShowCollectionForm}
          />
        )}
        {activeTab === 'processing' && (
          <ProcessingTab 
            lot={lot}
            steps={processingSteps}
            onRefresh={loadData}
            productSpecs={productSpecs}
            processMethods={processMethods}
          />
        )}
        {activeTab === 'qc' && (
          <QcTab 
            lot={lot}
            qcRequests={qcRequests}
            qcResults={qcResults}
            latestQcByTest={latestQcByTest}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'infections' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Инфекционный статус культур</h3>
              <p className="text-sm text-muted-foreground">Результаты тестов вносятся в карточке культуры</p>
            </div>
            
            {infectionResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Нет результатов инфекционных тестов для культур данного лота</p>
            ) : (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Культура</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Инфекция</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Результат</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {infectionResults.map((res: any) => {
                    const infType = infectionTypes.find((t: any) => t.infection_type_id === res.infection_type_id);
                    return (
                      <tr key={res.result_id}>
                        <td className="px-4 py-2">
                          <Link to={`/culture/${res.entity_id}`} className="font-mono text-sm text-blue-600 hover:underline">{res.entity_id}</Link>
                        </td>
                        <td className="px-4 py-2">{infType?.name || res.infection_type_id}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${res.result === 'negative' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {res.result === 'negative' ? 'Отрицательный' : 'Положительный'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">{res.test_date ? new Date(res.test_date).toLocaleDateString('ru-RU') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'qa' && (
          <QaTab 
            lot={lot}
            container={container}
            qaDecisions={qaDecisions}
            latestQcByTest={latestQcByTest}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'usage' && (
          <UsageTab lot={lot} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab lot={lot} />
        )}
      </CardContent></Card>
    </div>
  );
}

// Summary Tab
function SummaryTab({ lot, container, collections, latestQcByTest, latestDecision, mediaSpec, productSpecs }: any) {
  const totalCollected = collections.reduce((sum: number, c: CollectionEvent) => sum + c.volume_ml, 0);
  const [reservations, setReservations] = useState<any[]>([]);
  const [requestLines, setRequestLines] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);

  useEffect(() => {
    loadReservations();
  }, [lot.cm_lot_id]);

  async function loadReservations() {
    const { data: resData } = await supabase
      .from('reservation')
      .select('*')
      .eq('cm_lot_id', lot.cm_lot_id)
      .eq('status', 'Active');
    setReservations(resData || []);
    
    if (resData && resData.length > 0) {
      const lineIds = resData.map(r => r.request_line_id).filter(Boolean);
      if (lineIds.length > 0) {
        const { data: linesData } = await supabase
          .from('request_line')
          .select('*, request:request_id(request_id, customer_ref, due_date)')
          .in('request_line_id', lineIds);
        setRequestLines(linesData || []);
        
        // Load finished products for display
        const productCodes = linesData?.map(l => l.finished_product_code).filter(Boolean) || [];
        if (productCodes.length > 0) {
          const { data: prodsData } = await supabase.from('product').select('*').in('product_code', productCodes);
          setFinishedProducts(prodsData || []);
        }
      }
    }
  }

  const reserved_ml = reservations.reduce((sum, r) => sum + (r.reserved_volume_ml || 0), 0);
  const available_ml = Math.max(0, (container?.current_volume_ml || 0) - reserved_ml);
  
  // Метрики сбора
  const collectionsCount = collections.length;
  const culturesCount = new Set(collections.map((c: any) => c.culture_id)).size;
  const avgVolumePerCollection = collectionsCount > 0 ? totalCollected / collectionsCount : 0;
  const avgConfluence = collections.length > 0 
    ? collections.reduce((sum: number, c: any) => sum + (c.confluence_end_percent || 0), 0) / collections.filter((c: any) => c.confluence_end_percent).length || 0
    : 0;
  const passages = collections.map((c: any) => c.passage_no).filter(Boolean);
  const avgPassage = passages.length > 0 ? passages.reduce((a: number, b: number) => a + b, 0) / passages.length : 0;
  
  // Морфология для диаграммы
  const morphologyCounts: Record<string, number> = {};
  collections.forEach((c: any) => {
    if (c.morphology) {
      morphologyCounts[c.morphology] = (morphologyCounts[c.morphology] || 0) + 1;
    }
  });
  
  const morphologyChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(morphologyCounts).map(m => m === 'Excellent' ? 'Отлично' : m === 'Standard' ? 'Стандарт' : m === 'Deviations' ? 'Отклонения' : m === 'Atypical' ? 'Атипичная' : m) },
    yAxis: { type: 'value', name: 'Кол-во сборов' },
    series: [{ type: 'bar', data: Object.values(morphologyCounts), itemStyle: { color: '#3b82f6' } }],
  };
  
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* QR Code */}
      <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
        <QRCodeSVG value={lot.cm_lot_id} size={120} />
        <p className="mt-2 font-mono text-sm text-foreground">{lot.cm_lot_id}</p>
      </div>

      {/* Status & Info */}
      <div className="col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Продукт</p>
            <p className="font-medium text-foreground">{lot.base_product_code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Режим</p>
            <p className="font-medium text-foreground">{lot.mode}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Спецификация среды</p>
            {lot?.media_spec_id ? (
              <MediaFormulaDisplay mediaSpecId={lot.media_spec_id} />
            ) : (
              <p className="font-medium text-muted-foreground">Не определена</p>
            )}
            {mediaSpec && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${mediaSpec.phenol_red_flag ? 'bg-pink-100 text-pink-700' : 'bg-muted text-muted-foreground'}`}>
                Феноловый красный: {mediaSpec.phenol_red_flag ? 'Да' : 'Нет'}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Начало сбора</p>
            <p className="font-medium text-foreground">
              {lot.collection_start_at ? new Date(lot.collection_start_at).toLocaleString('ru-RU') : '-'}
            </p>
          </div>
        </div>

        {/* Volume Info */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 mb-2">Объем контейнера</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold text-blue-900">
                {container?.current_volume_ml?.toFixed(1) || 0}
              </p>
              <p className="text-sm text-blue-600">
                из {container?.nominal_volume_ml || 0} мл
              </p>
            </div>
            <div className="flex-1 h-4 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${Math.min(100, ((container?.current_volume_ml || 0) / (container?.nominal_volume_ml || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* QC Status */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Статус QC</p>
          <div className="flex gap-4">
            {['Sterility', 'LAL', 'DLS'].map(test => {
              const result = latestQcByTest[test];
              return (
                <div key={test} className="flex items-center gap-2">
                  {result ? (
                    result.pass_fail === 'Pass' ? (
                      <CheckCircle className="text-green-500" size={18} />
                    ) : result.pass_fail === 'Fail' ? (
                      <XCircle className="text-red-500" size={18} />
                    ) : (
                      <Clock className="text-gray-400" size={18} />
                    )
                  ) : (
                    <Clock className="text-gray-300" size={18} />
                  )}
                  <span className="text-sm">{test}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* QA Decision */}
        {latestDecision && (
          <div className={`p-4 rounded-lg ${
            latestDecision.decision === 'Approved' ? 'bg-emerald-50' :
            latestDecision.decision === 'Rejected' ? 'bg-red-50' : 'bg-orange-50'
          }`}>
            <p className="text-sm mb-1">Решение QA</p>
            <p className="font-bold">
              {latestDecision.decision === 'Approved' ? 'QA одобрен' :
               latestDecision.decision === 'Rejected' ? 'Брак' : 'На удержании'}
            </p>
            {latestDecision.expiry_date && (
              <p className="text-sm mt-1">
                Срок годности: {new Date(latestDecision.expiry_date).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        )}

        {/* Резервации и остаток */}
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-600 mb-2">Резервации и остаток</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-purple-900">{reserved_ml.toFixed(1)} мл</p>
              <p className="text-sm text-purple-600">Зарезервировано</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{available_ml.toFixed(1)} мл</p>
              <p className="text-sm text-emerald-600">Доступно</p>
            </div>
          </div>
          {reservations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs font-medium text-purple-700 mb-2">Активные резервации:</p>
              {reservations.map(r => {
                const line = requestLines.find(l => l.request_line_id === r.request_line_id);
                const prod = finishedProducts.find(p => p.product_code === line?.finished_product_code);
                return (
                  <div key={r.reservation_id} className="flex justify-between items-center text-sm py-1">
                    <div>
                      <Link to={`/requests/${line?.request?.request_id}`} className="text-blue-600 hover:underline">
                        {line?.request?.request_id || 'Заявка'}
                      </Link>
                      <span className="text-muted-foreground ml-2">
                        {prod?.name || line?.finished_product_code} x {line?.qty_units || 1}
                      </span>
                      <span className="text-muted-foreground/70 ml-1">({r.reserved_volume_ml?.toFixed(1)} мл)</span>
                    </div>
                    {line?.request?.due_date && (
                      <span className="text-xs text-purple-600">
                        до {new Date(line.request.due_date).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Метрики сбора */}
        {collections.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-3 font-medium">Метрики сбора</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Количество сборов:</span>
                <span className="font-medium">{collectionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Количество культур:</span>
                <span className="font-medium">{culturesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Средний объем на сбор:</span>
                <span className="font-medium">{avgVolumePerCollection.toFixed(1)} мл</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Средняя конфлюэнтность:</span>
                <span className="font-medium">{avgConfluence.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Средний пассаж:</span>
                <span className="font-medium">{avgPassage.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Диаграмма морфологий */}
        {Object.keys(morphologyCounts).length > 0 && (
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Морфология по сборам</p>
            <ReactECharts option={morphologyChartOption} style={{ height: 180 }} />
          </div>
        )}

        {/* Требования к продукту - используем frozenSpec если есть */}
        {productSpecs && (
          <div className="col-span-3 mt-4">
            <ProductRequirementsCard 
              productCode={lot.base_product_code} 
              frozenSpec={(lot as any).frozen_spec}
              showTitle={true} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Collections Tab
function CollectionsTab({ lot, collections, container, mediaSpecs, onRefresh, showForm, setShowForm }: any) {
  const { user } = useAuth();
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [cellTypes, setCellTypes] = useState<any[]>([]);
  const [packFormats, setPackFormats] = useState<any[]>([]);
  const [showCultureModal, setShowCultureModal] = useState(false);
  const [newCulture, setNewCulture] = useState({
    culture_id: '',
    cell_type_code: '',
    donor_ref: '',
    culture_journal_ref: '',
    notes: '',
  });
  const [cultureInfections, setCultureInfections] = useState<any[]>([]);
  const [infectionTypes, setInfectionTypes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    culture_id: '',
    media_spec_id: lot.media_spec_id || '',
    passage_no: 1,
    volume_ml: 0,
    morphology: '',
    confluence_start_percent: '',
    confluence_end_percent: '',
    enrichment_start_date: '',
    enrichment_end_date: '',
    media_prep_journal_no: '',
    media_prep_journal_date: new Date().toISOString().split('T')[0],
    notes: '',
    vessel_format_id: '',
  });

  useEffect(() => {
    loadCultures();
    loadCellTypes();
    loadPackFormats();
    loadInfectionTypes();
  }, []);

  async function loadInfectionTypes() {
    const { data } = await (supabase.from as any)('infection_type').select('*');
    if (data) setInfectionTypes(data);
  }

  async function loadCultureInfections(cultureId: string) {
    if (!cultureId) { setCultureInfections([]); return; }
    const { data } = await (supabase.from as any)('infection_test_result')
      .select('*')
      .eq('entity_type', 'culture')
      .eq('entity_id', cultureId);
    setCultureInfections(data || []);
  }

  async function loadCultures() {
    const { data } = await supabase.from('culture').select('*').eq('status', 'InWork');
    if (data) setCultures(data);
  }

  async function loadCellTypes() {
    const { data } = await supabase.from('cell_type').select('*').eq('is_active', true);
    if (data) setCellTypes(data);
  }

  async function loadPackFormats() {
    const { data } = await supabase.from('pack_format').select('*').eq('is_active', true);
    if (data) setPackFormats(data);
  }

  async function handleCreateCulture(e: React.FormEvent) {
    e.preventDefault();
    if (!newCulture.culture_id || !newCulture.cell_type_code) {
      showError('Ошибка', 'Заполните обязательные поля');
      return;
    }
    try {
      const { error } = await supabase.from('culture').insert({
        culture_id: newCulture.culture_id,
        cell_type_code: newCulture.cell_type_code,
        donor_ref: newCulture.donor_ref || null,
        culture_journal_ref: newCulture.culture_journal_ref || null,
        notes: newCulture.notes || null,
        status: 'InWork',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      await loadCultures();
      setFormData({ ...formData, culture_id: newCulture.culture_id });
      setShowCultureModal(false);
      setNewCulture({ culture_id: '', cell_type_code: '', donor_ref: '', culture_journal_ref: '', notes: '' });
    } catch (error: any) {
      showError('Ошибка', error.message);
    }
  }

  async function handleAddCollection(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate media_spec_id
    if (lot.media_spec_id && formData.media_spec_id !== lot.media_spec_id) {
      showError('Ошибка', 'Спецификация среды должна совпадать с ранее зафиксированной');
      return;
    }

    // Check culture cell_type
    const selectedCulture = cultures.find(c => c.culture_id === formData.culture_id);
    if (!selectedCulture) {
      showError('Ошибка', 'Выберите культуру');
      return;
    }

    // Check cell type compatibility
    if (collections.length > 0) {
      const firstCulture = cultures.find(c => c.culture_id === collections[0].culture_id);
      if (firstCulture && selectedCulture.cell_type_code !== firstCulture.cell_type_code) {
        showError('Ошибка', 'Запрещено смешивать разные типы клеток в одном CM Lot');
        return;
      }
    }

    // Check container overflow
    const newTotal = (container?.current_volume_ml || 0) + formData.volume_ml;
    if (newTotal > (container?.nominal_volume_ml || 0)) {
      showError('Переполнение контейнера', `Максимум ${container?.nominal_volume_ml} мл. Создайте новый CM Lot.`);
      return;
    }

    try {
      // Insert collection
      const { error: collError } = await supabase.from('collection_event').insert({
        cm_lot_id: lot.cm_lot_id,
        culture_id: formData.culture_id,
        media_spec_id: formData.media_spec_id,
        target_container_id: container.container_id,
        passage_no: formData.passage_no,
        volume_ml: formData.volume_ml,
        morphology: formData.morphology || null,
        confluence_start_percent: formData.confluence_start_percent ? Number(formData.confluence_start_percent) : null,
        confluence_end_percent: formData.confluence_end_percent ? Number(formData.confluence_end_percent) : null,
        enrichment_start_date: formData.enrichment_start_date || null,
        enrichment_end_date: formData.enrichment_end_date || null,
        media_prep_journal_no: formData.media_prep_journal_no,
        media_prep_journal_date: formData.media_prep_journal_date,
        collected_at: new Date().toISOString(),
        operator_user_id: user?.user_id,
        notes: formData.notes || null,
        vessel_format_id: formData.vessel_format_id || null,
      });

      if (collError) throw collError;

      // Update container volume
      await supabase.from('container')
        .update({ current_volume_ml: newTotal })
        .eq('container_id', container.container_id);

      // Fix media_spec_id in lot if first collection
      if (!lot.media_spec_id) {
        await supabase.from('cm_lot')
          .update({ media_spec_id: formData.media_spec_id })
          .eq('cm_lot_id', lot.cm_lot_id);
      }

      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      showError('Ошибка', error.message);
    }
  }

  const canAddCollection = lot.status === 'Open';

  // Статистика сборов
  const totalVolume = collections.reduce((sum: number, c: any) => sum + (c.volume_ml || 0), 0);
  const culturesUsed = new Set(collections.map((c: any) => c.culture_id)).size;
  const avgVolume = collections.length > 0 ? totalVolume / collections.length : 0;
  const passages = collections.map((c: any) => c.passage_no).filter(Boolean);
  const avgPassage = passages.length > 0 ? passages.reduce((a: number, b: number) => a + b, 0) / passages.length : 0;
  const confluences = collections.map((c: any) => c.confluence_end_percent).filter(Boolean);
  const avgConfluence = confluences.length > 0 ? confluences.reduce((a: number, b: number) => a + b, 0) / confluences.length : 0;
  
  // Морфология
  const morphCounts: Record<string, number> = {};
  collections.forEach((c: any) => { if (c.morphology) morphCounts[c.morphology] = (morphCounts[c.morphology] || 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Статистика сборов */}
      {collections.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-3">Статистика сборов</h4>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{collections.length}</p>
              <p className="text-xs text-blue-600">Сборов</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{culturesUsed}</p>
              <p className="text-xs text-blue-600">Культур</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{totalVolume.toFixed(0)}</p>
              <p className="text-xs text-blue-600">Общий объем (мл)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{avgVolume.toFixed(1)}</p>
              <p className="text-xs text-blue-600">Ср. объем/сбор</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{avgPassage.toFixed(1)}</p>
              <p className="text-xs text-blue-600">Ср. пассаж</p>
            </div>
          </div>
          {Object.keys(morphCounts).length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200 flex gap-2 flex-wrap">
              <span className="text-xs text-blue-600">Морфология:</span>
              {Object.entries(morphCounts).map(([m, c]) => (
                <span key={m} className="px-2 py-0.5 bg-card rounded text-xs">{m}: {c}</span>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">События сбора ({collections.length})</h3>
        {canAddCollection && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} className="mr-2" />
            Добавить сбор
          </Button>
        )}
      </div>

      {/* Create Culture Modal */}
      <Dialog open={showCultureModal} onOpenChange={setShowCultureModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать культуру</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCulture} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID культуры *</label>
              <Input
                type="text"
                value={newCulture.culture_id}
                onChange={(e) => setNewCulture({ ...newCulture, culture_id: e.target.value })}
                placeholder="Например: MSC-2024-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Тип клеток *</label>
              <select
                value={newCulture.cell_type_code}
                onChange={(e) => setNewCulture({ ...newCulture, cell_type_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                required
              >
                <option value="">Выберите</option>
                {cellTypes.map(ct => (
                  <option key={ct.cell_type_code} value={ct.cell_type_code}>
                    {ct.name} ({ct.cell_type_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ссылка на донора</label>
              <Input
                type="text"
                value={newCulture.donor_ref}
                onChange={(e) => setNewCulture({ ...newCulture, donor_ref: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ссылка на журнал</label>
              <Input
                type="text"
                value={newCulture.culture_journal_ref}
                onChange={(e) => setNewCulture({ ...newCulture, culture_journal_ref: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Примечания</label>
              <textarea
                value={newCulture.notes}
                onChange={(e) => setNewCulture({ ...newCulture, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCultureModal(false)}>
                Отмена
              </Button>
              <Button type="submit" variant="success">
                Создать
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showForm && (
        <form onSubmit={handleAddCollection} className="p-4 bg-muted rounded-lg space-y-6">
          {/* Group 1: Culture & Volume */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Культура и объем</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Культура *<Tip text="Выберите культуру клеток для сбора CM" /></label>
                <div className="flex gap-2">
                  <select
                    value={formData.culture_id}
                    onChange={(e) => { setFormData({ ...formData, culture_id: e.target.value }); loadCultureInfections(e.target.value); }}
                    className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                    required
                  >
                    <option value="">Выберите</option>
                    {cultures.map(c => (
                      <option key={c.culture_id} value={c.culture_id}>
                        {c.culture_id} ({c.cell_type_code})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => setShowCultureModal(true)}
                  >
                    + Создать
                  </Button>
                </div>
                {formData.culture_id && (
                  <div className="mt-2 p-2 rounded text-xs">
                    {cultureInfections.length === 0 ? (
                      <span className="text-orange-600">⚠️ Нет данных инфекционного скрининга</span>
                    ) : cultureInfections.some(i => i.result === 'positive') ? (
                      <span className="text-red-600">🔴 Есть положительные результаты!</span>
                    ) : (
                      <span className="text-green-600">✅ Все тесты отрицательные ({cultureInfections.length})</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Объем (мл) *<Tip text="Объем собранной кондиционированной среды" /></label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.volume_ml}
                  onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Текущий: {container?.current_volume_ml?.toFixed(1) || 0} / {container?.nominal_volume_ml || 0} мл
                </p>
              </div>
              </div>
          </div>

          {/* Group 2: Passage & Morphology */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Пассаж и морфология</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Пассаж *<Tip text="Номер пассажа клеточной культуры" /></label>
                <Input
                  type="number"
                  value={formData.passage_no}
                  onChange={(e) => setFormData({ ...formData, passage_no: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Морфология<Tip text="Оценка морфологии клеток при сборе" /></label>
                <select
                  value={formData.morphology}
                  onChange={(e) => setFormData({ ...formData, morphology: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                >
                  <option value="">-</option>
                  <option value="Excellent">Отлично</option>
                  <option value="Standard">Стандарт</option>
                  <option value="Deviations">Отклонения</option>
                  <option value="Atypical">Атипичная</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Конфлюэнтность начало (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.confluence_start_percent}
                  onChange={(e) => setFormData({ ...formData, confluence_start_percent: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Конфлюэнтность конец (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.confluence_end_percent}
                  onChange={(e) => setFormData({ ...formData, confluence_end_percent: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Group 3: Dates (Enrichment) */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Даты обогащения</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Начало обогащения</label>
                <Input
                  type="date"
                  value={formData.enrichment_start_date}
                  onChange={(e) => setFormData({ ...formData, enrichment_start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Окончание обогащения</label>
                <Input
                  type="date"
                  value={formData.enrichment_end_date}
                  onChange={(e) => setFormData({ ...formData, enrichment_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Group 4: Media */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Среда</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Спецификация среды *</label>
                <select
                  value={formData.media_spec_id}
                  onChange={(e) => setFormData({ ...formData, media_spec_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                  required
                  disabled={!!lot.media_spec_id}
                >
                  <option value="">Выберите среду</option>
                  {mediaSpecs.map((m: MediaCompatibilitySpec) => (
                      <option key={m.media_spec_id} value={m.media_spec_id}>
                        {(m as any).display_name || m.name || m.serum_class || '-'}
                      </option>
                  ))}
                </select>
                {lot.media_spec_id && <p className="text-xs text-amber-600 mt-1">Зафиксировано по первому сбору</p>}
                {formData.media_spec_id && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <MediaFormulaDisplay mediaSpecId={formData.media_spec_id} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Журнал приготовления *</label>
                <Input
                  type="text"
                  value={formData.media_prep_journal_no}
                  onChange={(e) => setFormData({ ...formData, media_prep_journal_no: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Дата записи *</label>
                <Input
                  type="date"
                  value={formData.media_prep_journal_date}
                  onChange={(e) => setFormData({ ...formData, media_prep_journal_date: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Примечания</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
            <Button type="submit">
              Сохранить
            </Button>
          </div>
        </form>
      )}

      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Культура</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Пассаж</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Объем (мл)</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Посуда</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Морфология</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {collections.map((c: CollectionEvent) => {
            const vesselFormat = packFormats.find(pf => pf.pack_format_code === (c as any).vessel_format_id);
            return (
              <tr key={c.collection_id}>
                <td className="px-4 py-2 text-sm">
                  {c.collected_at ? new Date(c.collected_at).toLocaleString('ru-RU') : '-'}
                </td>
                <td className="px-4 py-2 text-sm font-mono">{c.culture_id}</td>
                <td className="px-4 py-2 text-sm">{c.passage_no}</td>
                <td className="px-4 py-2 text-sm text-right font-mono">{c.volume_ml.toFixed(1)}</td>
                <td className="px-4 py-2 text-sm">{vesselFormat?.name || '-'}</td>
                <td className="px-4 py-2 text-sm">{c.morphology || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Processing Tab
function ProcessingTab({ lot, steps, onRefresh, productSpecs, processMethods: passedMethods }: any) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [container, setContainer] = useState<Container | null>(null);
  // Состояние для каждого шага: { [methodId_cycleNo]: { input_volume_ml, output_volume_ml, started_at, ended_at, notes } }
  const [stepForms, setStepForms] = useState<Record<string, any>>({});

  useEffect(() => {
    loadMethods();
    loadContainer();
  }, [lot.frozen_spec]);

  async function loadMethods() {
    const frozenSpec = lot.frozen_spec;
    if (frozenSpec?.processing?.raw && Array.isArray(frozenSpec.processing.raw) && frozenSpec.processing.raw.length > 0) {
      setMethods(frozenSpec.processing.raw);
      return;
    }
    const { data } = await supabase.from('cm_process_method').select('*').eq('is_active', true);
    if (data) setMethods(data);
  }

  async function loadContainer() {
    const { data } = await supabase.from('container').select('*').eq('owner_id', lot.cm_lot_id).eq('owner_entity_type', 'CM_Lot').single();
    if (data) setContainer(data);
  }

  const getCurrentVolume = () => {
    if (steps.length > 0) {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].output_volume_ml != null) return steps[i].output_volume_ml;
      }
    }
    return container?.current_volume_ml || 0;
  };
  const currentVolume = getCurrentVolume();

  const canEdit = ['In_Processing', 'Closed_Collected'].includes(lot.status);
  const requiredMethods = lot.frozen_spec?.processing?.raw || [];
  
  const getMethodName = (methodId: string) => {
    const m = (passedMethods || methods).find((pm: any) => pm.method_id === methodId);
    return m?.name || methodId;
  };

  // Генерация списка всех требуемых шагов (метод + цикл)
  const allRequiredSteps: { method_id: string; cycle_no: number; name: string }[] = [];
  requiredMethods.forEach((req: any) => {
    const cycles = req.cycles || 1;
    for (let c = 1; c <= cycles; c++) {
      allRequiredSteps.push({ method_id: req.method_id, cycle_no: c, name: getMethodName(req.method_id) });
    }
  });

  // Проверка выполнен ли шаг
  const isStepCompleted = (methodId: string, cycleNo: number) => {
    return steps.some((s: any) => s.method_id === methodId && s.cycle_no === cycleNo);
  };

  const getStepData = (methodId: string, cycleNo: number) => {
    return steps.find((s: any) => s.method_id === methodId && s.cycle_no === cycleNo);
  };

  // Обработка сохранения шага
  async function handleSaveStep(methodId: string, cycleNo: number) {
    const key = `${methodId}_${cycleNo}`;
    const form = stepForms[key] || {};
    
    const inputVol = form.input_volume_ml ? Number(form.input_volume_ml) : null;
    if (inputVol != null && inputVol > currentVolume) {
      showError('Ошибка', `Входной объем (${inputVol} мл) превышает текущий (${currentVolume.toFixed(1)} мл)`);
      return;
    }

    try {
      await supabase.from('processing_step').insert({
        cm_lot_id: lot.cm_lot_id,
        method_id: methodId,
        cycle_no: cycleNo,
        input_volume_ml: inputVol,
        output_volume_ml: form.output_volume_ml ? Number(form.output_volume_ml) : null,
        started_at: form.started_at || new Date().toISOString(),
        ended_at: form.ended_at || null,
        operator_user_id: user?.user_id,
        notes: form.notes || null,
      });

      if (form.output_volume_ml && container) {
        await supabase.from('container')
          .update({ current_volume_ml: Number(form.output_volume_ml) })
          .eq('container_id', container.container_id);
      }

      // Очистка формы
      setStepForms(prev => { const n = {...prev}; delete n[key]; return n; });
      onRefresh();
    } catch (error: any) {
      showError('Ошибка', error.message);
    }
  }

  const updateStepForm = (key: string, field: string, value: any) => {
    setStepForms(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  // Все ли шаги выполнены?
  const allCompleted = allRequiredSteps.every(rs => isStepCompleted(rs.method_id, rs.cycle_no));

  return (
    <div className="space-y-4">
      {/* Заголовок с текущим объемом */}
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold">Процессинг сырья</h3>
        <span className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium">
          Текущий объем: {currentVolume.toFixed(1)} мл
        </span>
      </div>

      {allRequiredSteps.length === 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          Нет требований к процессингу в спецификации продукта
        </div>
      ) : (
        <div className="space-y-3">
          {allRequiredSteps.map((rs, idx) => {
            const key = `${rs.method_id}_${rs.cycle_no}`;
            const completed = isStepCompleted(rs.method_id, rs.cycle_no);
            const stepData = getStepData(rs.method_id, rs.cycle_no);
            const form = stepForms[key] || {};

            return (
              <div key={key} className={`p-4 rounded-lg border-2 ${completed ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${completed ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{rs.name}</p>
                      <p className="text-sm text-muted-foreground">Цикл {rs.cycle_no}</p>
                    </div>
                  </div>
                  {completed && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle size={20} /> Выполнено
                    </span>
                  )}
                </div>

                {completed ? (
                  <div className="grid grid-cols-4 gap-4 text-sm bg-green-100 p-3 rounded">
                    <div><span className="text-muted-foreground">Вход:</span> {stepData?.input_volume_ml?.toFixed(1) || '-'} мл</div>
                    <div><span className="text-muted-foreground">Выход:</span> {stepData?.output_volume_ml?.toFixed(1) || '-'} мл</div>
                    <div><span className="text-muted-foreground">Начало:</span> {stepData?.started_at ? new Date(stepData.started_at).toLocaleString('ru-RU') : '-'}</div>
                    <div><span className="text-muted-foreground">Окончание:</span> {stepData?.ended_at ? new Date(stepData.ended_at).toLocaleString('ru-RU') : '-'}</div>
                  </div>
                ) : canEdit ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Входной объем (мл) <span className="text-muted-foreground">(макс: {currentVolume.toFixed(1)})</span></label>
                        <Input
                          type="number" step="0.1" max={currentVolume}
                          value={form.input_volume_ml || ''}
                          onChange={(e) => updateStepForm(key, 'input_volume_ml', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Выходной объем (мл)</label>
                        <Input
                          type="number" step="0.1"
                          value={form.output_volume_ml || ''}
                          onChange={(e) => updateStepForm(key, 'output_volume_ml', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Начало</label>
                        <Input
                          type="datetime-local"
                          value={form.started_at || new Date().toISOString().slice(0, 16)}
                          onChange={(e) => updateStepForm(key, 'started_at', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Окончание</label>
                        <Input
                          type="datetime-local"
                          value={form.ended_at || ''}
                          onChange={(e) => updateStepForm(key, 'ended_at', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleSaveStep(rs.method_id, rs.cycle_no)}
                    >
                      Сохранить шаг
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Ожидает выполнения</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allCompleted && allRequiredSteps.length > 0 && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
          <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
          <p className="font-medium text-green-800">Все шаги процессинга выполнены!</p>
          <p className="text-sm text-green-600">Можно переходить к следующему этапу БП</p>
        </div>
      )}
    </div>
  );
}

// QC Tab
function QcTab({ lot, qcRequests, qcResults, latestQcByTest, onRefresh }: any) {
  const { user, hasRole } = useAuth();
  const [qcTestTypes, setQcTestTypes] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  // Состояние формы для каждого теста: { [test_code]: { result_value, pass_fail, tested_at } }
  const [testForms, setTestForms] = useState<Record<string, any>>({});

  useEffect(() => {
    loadQcTestTypes();
  }, [lot.frozen_spec]);

  async function loadQcTestTypes() {
    const frozenSpec = lot.frozen_spec;
    if (frozenSpec?.qc?.raw && Array.isArray(frozenSpec.qc.raw) && frozenSpec.qc.raw.length > 0) {
      setQcTestTypes(frozenSpec.qc.raw);
      return;
    }
    const { data: allTests } = await supabase.from('qc_test_type').select('*').eq('is_active', true).order('name');
    setQcTestTypes(allTests || []);
  }

  const canAddResult = hasRole(['QC', 'Admin']);
  const activeRequest = qcRequests.find((r: any) => r.qc_type === 'Raw' && r.status !== 'Completed');

  const updateTestForm = (testCode: string, field: string, value: any, test?: any) => {
    setTestForms(prev => {
      const updated = { ...prev, [testCode]: { ...prev[testCode], [field]: value } };
      // Автопроверка референсов при вводе результата
      if (field === 'result_value' && test && value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && test.norm_min != null && test.norm_max != null) {
          const inRange = numValue >= parseFloat(test.norm_min) && numValue <= parseFloat(test.norm_max);
          updated[testCode].pass_fail = inRange ? 'Pass' : 'Fail';
        } else if (!isNaN(numValue) && test.norm_min != null) {
          updated[testCode].pass_fail = numValue >= parseFloat(test.norm_min) ? 'Pass' : 'Fail';
        } else if (!isNaN(numValue) && test.norm_max != null) {
          updated[testCode].pass_fail = numValue <= parseFloat(test.norm_max) ? 'Pass' : 'Fail';
        }
      }
      return updated;
    });
  };

  async function saveTestResult(test: any) {
    if (!activeRequest) {
      showError('Ошибка', 'Нет активного QC запроса. Обновите страницу.');
      return;
    }
    const form = testForms[test.code] || {};
    if (!form.pass_fail) {
      showError('Ошибка', 'Выберите Pass/Fail');
      return;
    }
    setSaving(test.code);
    try {
      const { error } = await supabase.from('cm_qc_result').insert({
        qc_request_id: activeRequest.qc_request_id,
        test_code: test.code,
        result_value: form.result_value || null,
        pass_fail: form.pass_fail,
        tested_at: form.tested_at ? new Date(form.tested_at).toISOString() : new Date().toISOString(),
      });
      if (error) throw error;
      // Очистка формы
      setTestForms(prev => { const n = {...prev}; delete n[test.code]; return n; });
      
      // Проверка: все ли тесты теперь выполнены (включая только что добавленный)
      const completedTests = new Set(Object.keys(latestQcByTest));
      completedTests.add(test.code);
      const allDone = qcTestTypes.length > 0 && qcTestTypes.every(t => completedTests.has(t.code));
      
      // Автоматический переход в QC_Completed если все тесты сданы
      if (allDone && lot.status === 'QC_Pending') {
        await supabase.from('cm_lot').update({ status: 'QC_Completed' }).eq('cm_lot_id', lot.cm_lot_id);
        if (activeRequest) {
          await supabase.from('cm_qc_request').update({ status: 'Completed' }).eq('qc_request_id', activeRequest.qc_request_id);
        }
      }
      
      onRefresh();
    } catch (error: any) {
      showError('Ошибка сохранения', error.message);
    } finally {
      setSaving(null);
    }
  }

  // Проверка: все ли тесты выполнены
  const allTestsCompleted = qcTestTypes.length > 0 && qcTestTypes.every(t => latestQcByTest[t.code]);

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold">QC Сырья — Контроль качества</h3>
        {allTestsCompleted && (
          <span className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full font-medium">
            <CheckCircle size={18} /> Все тесты выполнены
          </span>
        )}
      </div>

      {!activeRequest && qcRequests.length === 0 && lot.status === 'QC_Pending' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          ⚠️ QC запрос не найден. Обновите страницу.
        </div>
      )}

      {qcTestTypes.length === 0 ? (
        <div className="p-4 bg-muted rounded-lg text-muted-foreground">
          Нет требуемых тестов в спецификации продукта
        </div>
      ) : (
        <div className="space-y-4">
          {qcTestTypes.map((test, idx) => {
            const existingResult = latestQcByTest[test.code];
            const form = testForms[test.code] || {};
            const isSaving = saving === test.code;

            return (
              <div key={test.code} className={`p-4 rounded-lg border-2 ${existingResult ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border-border'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${existingResult ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-lg text-foreground">{test.name}</p>
                      <p className="text-sm text-muted-foreground">{test.code}</p>
                    </div>
                  </div>
                  {existingResult && (
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${existingResult.pass_fail === 'Pass' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {existingResult.pass_fail === 'Pass' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {existingResult.pass_fail}
                    </span>
                  )}
                </div>

                {/* Референсы и подсказки */}
                <div className="mb-3 p-3 bg-muted rounded text-sm">
                  <div className="grid grid-cols-3 gap-4">
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
                      <span className="ml-2 font-medium text-blue-600">{test.method || '-'}</span>
                    </div>
                  </div>
                  {test.description && (
                    <p className="mt-2 text-muted-foreground italic">{test.description}</p>
                  )}
                </div>

                {existingResult ? (
                  <div className="grid grid-cols-3 gap-4 text-sm bg-green-100 p-3 rounded">
                    <div><span className="text-muted-foreground">Результат:</span> <span className="font-mono">{existingResult.result_value || '-'}</span> {test.unit || ''}</div>
                    <div><span className="text-muted-foreground">Дата:</span> {existingResult.tested_at ? new Date(existingResult.tested_at).toLocaleDateString('ru-RU') : '-'}</div>
                    <div>
                      {existingResult.report_ref && (
                        <a href={existingResult.report_ref} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          📄 Протокол
                        </a>
                      )}
                    </div>
                  </div>
                ) : canAddResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Результат {test.unit ? `(${test.unit})` : ''}</label>
                        <Input
                          type="text"
                          placeholder={test.input_format || 'Введите значение...'}
                          value={form.result_value || ''}
                          onChange={(e) => updateTestForm(test.code, 'result_value', e.target.value, test)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pass / Fail *</label>
                        <select
                          value={form.pass_fail || ''}
                          onChange={(e) => updateTestForm(test.code, 'pass_fail', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                        >
                          <option value="">Выберите...</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="NA">N/A</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Дата теста</label>
                        <Input
                          type="date"
                          value={form.tested_at || new Date().toISOString().split('T')[0]}
                          onChange={(e) => updateTestForm(test.code, 'tested_at', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="success"
                      className="w-full"
                      onClick={() => saveTestResult(test)}
                      disabled={isSaving || !form.pass_fail}
                      loading={isSaving}
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить результат'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic p-3 bg-muted rounded">Ожидает ввода результатов QC специалистом</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allTestsCompleted && (
        <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
          <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
          <p className="font-medium text-green-800">Все тесты QC пройдены!</p>
          <p className="text-sm text-green-600">Материал готов к решению QA</p>
        </div>
      )}
    </div>
  );
}

// QA Tab
function QaTab({ lot, container, qaDecisions, latestQcByTest, onRefresh }: any) {
  const { user, hasRole } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    decision: 'Approved',
    shelf_life_days: 365,
    reason: '',
  });

  useEffect(() => {
    const userIds = qaDecisions.map((d: any) => d.decided_by).filter(Boolean);
    if (userIds.length > 0) {
      supabase.from('app_user').select('user_id, full_name').in('user_id', userIds).then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach(u => { map[u.user_id] = u.full_name; });
        setUsers(map);
      });
    }
  }, [qaDecisions]);

  // Check if QC is complete - dynamically from spec
  const requiredTests: string[] = lot.frozen_spec?.qc?.raw?.map((t: any) => t.code) || [];
  const hasAllQc = requiredTests.length > 0 && requiredTests.every(t => latestQcByTest[t]?.pass_fail === 'Pass');
  const allTestsDone = requiredTests.length > 0 && requiredTests.every(t => latestQcByTest[t]);
  const needsReason = formData.decision === 'Approved' && !hasAllQc;

  async function handleDecision(e: React.FormEvent) {
    e.preventDefault();
    
    if (needsReason && !formData.reason.trim()) {
      showError('Ошибка', 'При одобрении без полного QC обязателен комментарий');
      return;
    }

    try {
      const now = new Date();
      const qaReleaseDate = now.toISOString().split('T')[0];
      const expiryDate = new Date(now.getTime() + formData.shelf_life_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      await supabase.from('cm_qa_release_decision').insert({
        cm_lot_id: lot.cm_lot_id,
        decision: formData.decision,
        shelf_life_days: formData.shelf_life_days,
        reason: formData.reason || null,
        decided_at: now.toISOString(),
        decided_by: user?.user_id,
        qa_release_date: qaReleaseDate,
        expiry_date: expiryDate,
      });

      // Update lot status
      await supabase.from('cm_lot')
        .update({ status: formData.decision })
        .eq('cm_lot_id', lot.cm_lot_id);

      // If approved, update container and create stock movement
      if (formData.decision === 'Approved' && container) {
        await supabase.from('container')
          .update({ status: 'Approved' })
          .eq('container_id', container.container_id);

        await supabase.from('stock_movement').insert({
          item_type: 'Bulk',
          container_id: container.container_id,
          direction: 'In',
          qty: container.current_volume_ml || 0,
          reason_code: 'Release',
          moved_at: now.toISOString(),
          user_id: user?.user_id,
        });
      }

      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      showError('Ошибка', error.message);
    }
  }

  const canDecide = hasRole(['QA', 'Production', 'Admin']) && ['QC_Completed', 'QC_Pending'].includes(lot.status);

  return (
    <div className="space-y-6">
      {/* QC Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2 text-foreground">Сводка QC для решения</h4>
        <div className="flex flex-wrap gap-4">
          {(lot.frozen_spec?.qc?.raw || []).map((test: any) => {
            const result = latestQcByTest[test.code];
            return (
              <div key={test.code} className="flex items-center gap-2">
                {result?.pass_fail === 'Pass' ? (
                  <CheckCircle className="text-green-500" size={18} />
                ) : result?.pass_fail === 'Fail' ? (
                  <XCircle className="text-red-500" size={18} />
                ) : (
                  <AlertTriangle className="text-amber-500" size={18} />
                )}
                <span>{test.name || test.code}: {result?.pass_fail || 'Нет данных'}</span>
              </div>
            );
          })}
        </div>
        {!hasAllQc && (
          <p className="mt-2 text-amber-600 text-sm flex items-center gap-1">
            <AlertTriangle size={16} />
            QC не полный. При одобрении требуется обоснование.
          </p>
        )}
      </div>

      {/* Decision Form */}
      {canDecide && (
        <div>
          {!showForm ? (
            <Button variant="success" onClick={() => setShowForm(true)}>
              Принять решение QA
            </Button>
          ) : (
            <form onSubmit={handleDecision} className="p-4 bg-emerald-50 rounded-lg space-y-4">
              <h4 className="font-medium">Решение QA</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Решение *</label>
                  <select
                    value={formData.decision}
                    onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                  >
                    <option value="Approved">QA одобрено</option>
                    <option value="Rejected">Брак</option>
                    <option value="OnHold">На удержании</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Срок годности (дней) *</label>
                  <Input
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Обоснование {needsReason && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                    rows={3}
                    required={needsReason}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Отмена
                </Button>
                <Button type="submit" variant="success">
                  Подтвердить решение
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Decision History */}
      <div>
        <h4 className="font-medium mb-3">История решений</h4>
        {qaDecisions.length === 0 ? (
          <p className="text-muted-foreground">Нет решений</p>
        ) : (
          <div className="space-y-2">
            {qaDecisions.map((d: CmQaReleaseDecision) => (
              <div key={d.decision_id} className={`p-3 rounded-lg ${
                d.decision === 'Approved' ? 'bg-emerald-50' :
                d.decision === 'Rejected' ? 'bg-red-50' : 'bg-orange-50'
              }`}>
                <div className="flex justify-between">
                  <span className="font-medium">
                    {d.decision === 'Approved' ? 'QA одобрено' :
                     d.decision === 'Rejected' ? 'Брак' : 'На удержании'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {d.decided_at ? new Date(d.decided_at).toLocaleString('ru-RU') : '-'}
                  </span>
                </div>
                {d.decided_by && (
                  <p className="text-sm text-muted-foreground">
                    Кем: <span className="font-medium">{users[d.decided_by] || d.decided_by}</span>
                  </p>
                )}
                <p className="text-sm">Срок годности: {d.shelf_life_days} дней</p>
                {d.expiry_date && (
                  <p className="text-sm">Годен до: {new Date(d.expiry_date).toLocaleDateString('ru-RU')}</p>
                )}
                {d.reason && <p className="text-sm text-muted-foreground mt-1">Примечание: {d.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Documents Tab
function DocumentsTab({ lot }: any) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [qcResults, setQcResults] = useState<any[]>([]);
  const [infectionResults, setInfectionResults] = useState<any[]>([]);
  const [infectionTypes, setInfectionTypes] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    loadDocuments();
    loadDataForCOA();
  }, []);

  async function loadDocuments() {
    const { data } = await supabase
      .from('generated_document')
      .select('*')
      .eq('entity_id', lot.cm_lot_id)
      .eq('entity_type', 'CM_Lot')
      .order('generated_at', { ascending: false });
    if (data) setDocuments(data);
  }
  
  async function loadDataForCOA() {
    // Load QC results
    const { data: qcReqData } = await supabase.from('cm_qc_request').select('*').eq('cm_lot_id', lot.cm_lot_id);
    if (qcReqData && qcReqData.length > 0) {
      const reqIds = qcReqData.map(r => r.qc_request_id);
      const { data: resData } = await supabase.from('cm_qc_result').select('*').in('qc_request_id', reqIds);
      setQcResults(resData || []);
    }
    // Load infection results (by cultures used in this lot)
    const { data: collectionsData } = await supabase.from('collection_event').select('culture_id').eq('cm_lot_id', lot.cm_lot_id);
    const cultureIds = [...new Set((collectionsData || []).map((c: any) => c.culture_id))];
    if (cultureIds.length > 0) {
      const infRes = await (supabase.from as any)('infection_test_result')
        .select('*')
        .eq('entity_type', 'Culture')
        .in('entity_id', cultureIds);
      setInfectionResults(infRes.data || []);
    } else {
      setInfectionResults([]);
    }
    const infTypesRes = await (supabase.from as any)('infection_type').select('*');
    setInfectionTypes(infTypesRes.data || []);
    // Load product
    if (lot.base_product_code) {
      const { data: prodData } = await supabase.from('product').select('*').eq('product_code', lot.base_product_code).single();
      setProduct(prodData);
    }
  }

  async function generateCOAPdf() {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text('CERTIFICATE OF ANALYSIS (COA)', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Lot: ${lot.cm_lot_id}`, 20, 40);
      doc.text(`Product: ${lot.base_product_code}`, 20, 48);
      doc.text(`Status: ${lot.status}`, 20, 56);
      doc.text(`Date: ${new Date().toLocaleDateString('ru-RU')}`, 20, 64);
      
      // QC Results
      doc.setFontSize(14);
      doc.text('QC Test Results', 20, 80);
      doc.setFontSize(10);
      let y = 88;
      if (qcResults.length > 0) {
        qcResults.forEach((res: any) => {
          doc.text(`${res.test_code}: ${res.result_value} ${res.unit || ''} - ${res.pass_fail === 'Pass' ? 'PASS' : 'FAIL'}`, 25, y);
          y += 7;
        });
      } else {
        doc.text('No QC results available', 25, y);
        y += 7;
      }
      
      // Infection Results
      y += 10;
      doc.setFontSize(14);
      doc.text('Infection Test Results', 20, y);
      y += 8;
      doc.setFontSize(10);
      if (infectionResults.length > 0) {
        infectionResults.forEach((res: any) => {
          const infType = infectionTypes.find((t: any) => t.infection_type_id === res.infection_type_id);
          doc.text(`${infType?.name || res.infection_type_id}: ${res.result === 'negative' ? 'NEGATIVE' : 'POSITIVE'}`, 25, y);
          y += 7;
        });
      } else {
        doc.text('No infection test results', 25, y);
      }
      
      // Footer
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toISOString()}`, 20, 280);
      
      doc.save(`COA_${lot.cm_lot_id}.pdf`);
      
      // Save record
      await supabase.from('generated_document').insert({
        doc_type: 'COA',
        entity_type: 'CM_Lot',
        entity_id: lot.cm_lot_id,
        template_version: '1.0',
        snapshot_json: { lot, qcResults, infectionResults },
        generated_at: new Date().toISOString(),
        generated_by: user?.user_id,
      });
      loadDocuments();
    } catch (error: any) {
      showError('Ошибка', error.message);
    } finally {
      setGenerating(false);
    }
  }

  async function generateDocument(docType: string) {
    if (docType === 'COA') {
      return generateCOAPdf();
    }
    setGenerating(true);
    try {
      const snapshot = { lot, generated_at: new Date().toISOString() };
      await supabase.from('generated_document').insert({
        doc_type: docType,
        entity_type: 'CM_Lot',
        entity_id: lot.cm_lot_id,
        template_version: '1.0',
        snapshot_json: snapshot,
        generated_at: new Date().toISOString(),
        generated_by: user?.user_id,
      });
      loadDocuments();
    } catch (error: any) {
      showError('Ошибка', error.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => generateDocument('COA')} disabled={generating} loading={generating}>
          Генерировать COA
        </Button>
        <Button onClick={() => generateDocument('SDS')} disabled={generating} loading={generating}>
          Генерировать SDS
        </Button>
        <Button onClick={() => generateDocument('Micro')} disabled={generating} loading={generating}>
          Микробиологический отчет
        </Button>
      </div>

      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Тип</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Версия</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc) => (
            <tr key={doc.doc_id}>
              <td className="px-4 py-2">{doc.doc_type}</td>
              <td className="px-4 py-2 text-sm">
                {doc.generated_at ? new Date(doc.generated_at).toLocaleString('ru-RU') : '-'}
              </td>
              <td className="px-4 py-2 text-sm">{doc.template_version}</td>
              <td className="px-4 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const content = JSON.stringify(doc.snapshot_json || {}, null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${doc.doc_type}_${lot.cm_lot_id}_${doc.doc_id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Скачать
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Postprocessing Tab - PackLot creation and workflow
function PostprocessingTab({ lot, container, latestDecision, requestLine: propRequestLine }: any) {
  const { user, hasRole } = useAuth();
  const [postprocessSteps, setPostprocessSteps] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    method_id: '',
    started_at: new Date().toISOString().slice(0, 16),
    ended_at: '',
    notes: '',
  });

  // Требуемые постпроцессинг-методы из frozen_spec
  const requiredMethods = lot.frozen_spec?.processing?.post || [];

  useEffect(() => {
    loadSteps();
  }, []);

  async function loadSteps() {
    // @ts-ignore
    const res: any = await supabase
      .from('processing_step')
      .select('*')
      .eq('cm_lot_id', lot.cm_lot_id)
      .eq('step_type', 'postprocess')
      .order('started_at');
    setPostprocessSteps(res.data || []);
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    try {
      await supabase.from('processing_step').insert({
        cm_lot_id: lot.cm_lot_id,
        method_id: formData.method_id,
        step_type: 'postprocess',
        started_at: formData.started_at,
        ended_at: formData.ended_at || null,
        operator_user_id: user?.user_id,
        notes: formData.notes || null,
      });
      setShowForm(false);
      setFormData({ method_id: '', started_at: new Date().toISOString().slice(0, 16), ended_at: '', notes: '' });
      loadSteps();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  const checkRequirementMet = (reqMethod: any) => {
    return postprocessSteps.some((s: any) => s.method_id === reqMethod.method_id);
  };

  const canEdit = lot.status === 'Approved' && hasRole(['Production', 'Admin']);
  const allCompleted = requiredMethods.length > 0 && requiredMethods.every(checkRequirementMet);

  return (
    <div className="space-y-6">
      {/* Workflow Info */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
        <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <Package size={20} />
          Постпроцессинг
        </h4>
        <p className="text-sm text-orange-700">
          Дополнительная обработка сырья перед розливом (из требований заявки или продукта).
        </p>
      </div>

      {/* Status check */}
      {lot.status !== 'Approved' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800">
            Постпроцессинг доступен только после QA одобрено. Текущий статус: {STATUS_LABELS[lot.status] || lot.status}
          </p>
        </div>
      )}

      {/* Required postprocessing methods */}
      {requiredMethods.length > 0 ? (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
            <Cog size={16} />
            Требуемые постпроцессинг-обработки
          </h4>
          <div className="space-y-2">
            {requiredMethods.map((req: any, idx: number) => {
              const isMet = checkRequirementMet(req);
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded ${isMet ? 'bg-green-100 border border-green-300 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border border-orange-200 dark:border-orange-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600 font-medium">{idx + 1}.</span>
                    <span className={isMet ? 'text-green-800' : ''}>{req.name || req.method_id}</span>
                  </div>
                  {isMet ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle size={16} /> Выполнено
                    </span>
                  ) : (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, method_id: req.method_id });
                        setShowForm(true);
                      }}
                      disabled={!canEdit}
                    >
                      <Plus size={14} className="mr-1" /> Выполнить
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {allCompleted && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-center">
              <CheckCircle className="inline mr-2 text-green-600" size={20} />
              <span className="text-green-800 font-medium">Все постпроцессинг-обработки выполнены. Переходите к розливу.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-muted border border-border rounded-lg text-center text-muted-foreground">
          Нет требований к постпроцессингу. Переходите сразу к розливу.
        </div>
      )}

      {/* Add step form */}
      {showForm && canEdit && (
        <form onSubmit={handleAddStep} className="p-4 bg-muted rounded-lg space-y-4">
          <h4 className="font-medium text-foreground">Зафиксировать обработку</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Метод</label>
              <select
                value={formData.method_id}
                onChange={(e) => setFormData({ ...formData, method_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                required
              >
                <option value="">Выберите</option>
                {requiredMethods.map((m: any) => (
                  <option key={m.method_id} value={m.method_id}>{m.name || m.method_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Дата выполнения</label>
              <Input
                type="datetime-local"
                value={formData.started_at}
                onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Примечания</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button type="submit" variant="warning">Сохранить</Button>
          </div>
        </form>
      )}

      {/* Completed steps */}
      {postprocessSteps.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Выполненные обработки ({postprocessSteps.length})</h4>
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Метод</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Примечания</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {postprocessSteps.map((step: any) => {
                const method = requiredMethods.find((m: any) => m.method_id === step.method_id);
                return (
                  <tr key={step.step_id}>
                    <td className="px-4 py-2 text-sm">{method?.name || step.method_id}</td>
                    <td className="px-4 py-2 text-sm">{step.started_at ? new Date(step.started_at).toLocaleString('ru-RU') : '-'}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{step.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// Filling Tab - Product Filling from Request
function FillingTab({ lot, container, requestLine, onRefresh, onNavigate }: any) {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [packFormats, setPackFormats] = useState<any[]>([]);
  const [packLots, setPackLots] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [allRequestLines, setAllRequestLines] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    pack_format_code: '',
    qty_planned: 1,
    request_line_id: '',
  });
  
  // Состояния для модального окна завершения розлива
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeData, setCompleteData] = useState<{
    packLotId: string;
    qtyPlanned: number;
    qtyProduced: number;
    requestLineId: string;
    line: any;
  } | null>(null);
  const [showMismatchChoice, setShowMismatchChoice] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [formatsRes, packLotsRes, reservationsRes] = await Promise.all([
      supabase.from('pack_format').select('*').eq('is_active', true),
      supabase.from('pack_lot').select('*').eq('source_cm_lot_id', lot.cm_lot_id).order('created_at', { ascending: false }),
      supabase.from('reservation').select('*').eq('cm_lot_id', lot.cm_lot_id).eq('status', 'Active'),
    ]);
    setPackFormats(formatsRes.data || []);
    setPackLots(packLotsRes.data || []);
    setAllReservations(reservationsRes.data || []);

    // Собираем все связанные request_line_id
    const lineIdsFromReservations = (reservationsRes.data || []).map((r: any) => r.request_line_id).filter(Boolean);
    const lineIdsSet = new Set(lineIdsFromReservations);
    
    // Добавляем request_line_id из самого лота (для MTO)
    if (lot.request_line_id) {
      lineIdsSet.add(lot.request_line_id);
    }
    
    // Также проверяем пропс requestLine
    if (requestLine?.request_line_id) {
      lineIdsSet.add(requestLine.request_line_id);
    }
    
    const lineIds = Array.from(lineIdsSet);
    
    if (lineIds.length > 0) {
      // Загружаем request_line с вложенным request
      const { data: linesData, error: linesError } = await supabase
        .from('request_line')
        .select('*, request:request_id(request_id, customer_ref, due_date, status)')
        .in('request_line_id', lineIds);
      
      if (linesError) {
        console.error('Error loading request_lines:', linesError);
        // Fallback: загружаем без вложенных данных
        const { data: fallbackLines } = await supabase
          .from('request_line')
          .select('*')
          .in('request_line_id', lineIds);
        
        // Загружаем request отдельно
        if (fallbackLines && fallbackLines.length > 0) {
          const requestIds = [...new Set(fallbackLines.map(l => l.request_id))];
          const { data: requests } = await supabase
            .from('request')
            .select('*')
            .in('request_id', requestIds);
          
          // Объединяем данные вручную
          const enrichedLines = fallbackLines.map(line => ({
            ...line,
            request: requests?.find(r => r.request_id === line.request_id) || null
          }));
          setAllRequestLines(enrichedLines);
        }
      } else {
        setAllRequestLines(linesData || []);
      }
    } else if (requestLine) {
      // Fallback: используем переданный requestLine напрямую
      setAllRequestLines([requestLine]);
    }
  }

  async function startFilling(line: any) {
    const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);
    
    try {
      // Generate PackLot ID
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase
        .from('pack_lot')
        .select('*', { count: 'exact', head: true })
        .like('pack_lot_id', `PL-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const packLotId = `PL-${dateStr}-${seqNum}`;

      const requiredVolume = (format?.nominal_fill_volume_ml || 1) * line.qty_units;

      // Create PackLot with Filling status
      const { error: plError } = await supabase.from('pack_lot').insert({
        pack_lot_id: packLotId,
        source_cm_lot_id: lot.cm_lot_id,
        pack_format_code: line.pack_format_code,
        qty_planned: line.qty_units,
        qty_produced: 0,
        status: 'Filling',
        request_line_id: line.request_line_id,
        filling_started_at: new Date().toISOString(),
      });

      if (plError) throw plError;

      // Create container for PackLot
      await supabase.from('container').insert({
        owner_entity_type: 'PackLot',
        owner_id: packLotId,
        container_type: format?.container_type || 'Vial',
        current_qty: 0,
        status: 'Quarantine',
      });

      // Update CM lot status to Filling
      await supabase.from('cm_lot').update({ status: 'Filling' }).eq('cm_lot_id', lot.cm_lot_id);

      loadData();
      onRefresh();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  function openCompleteModal(packLot: any, line: any) {
    setCompleteData({
      packLotId: packLot.pack_lot_id,
      qtyPlanned: line.qty_units,
      qtyProduced: line.qty_units, // По умолчанию = план
      requestLineId: line.request_line_id,
      line: line,
    });
    setShowCompleteModal(true);
    setShowMismatchChoice(false);
  }

  function handleQtyChange(qty: number) {
    if (!completeData) return;
    setCompleteData({ ...completeData, qtyProduced: qty });
  }

  function handleConfirmQty() {
    if (!completeData) return;
    if (completeData.qtyProduced < completeData.qtyPlanned) {
      // Показываем выбор действия при несоответствии
      setShowMismatchChoice(true);
    } else {
      // Количество совпадает или больше - сразу завершаем
      finalizeFilling(true);
    }
  }

  async function finalizeFilling(closeTask: boolean) {
    if (!completeData) return;
    try {
      if (closeTask) {
        // Закрываем задачу и передаём на QC
        await supabase.from('pack_lot').update({
          qty_produced: completeData.qtyProduced,
          status: 'QC_Pending',
          filling_completed_at: new Date().toISOString(),
        }).eq('pack_lot_id', completeData.packLotId);

        // Обновляем qty_fulfilled в request_line
        const currentFulfilled = completeData.line.qty_fulfilled || 0;
        const newFulfilled = currentFulfilled + completeData.qtyProduced;
        const partialStatus = newFulfilled >= completeData.qtyPlanned ? 'complete' : 'partial';
        
        await supabase.from('request_line').update({
          qty_fulfilled: newFulfilled,
          partial_status: partialStatus,
        }).eq('request_line_id', completeData.requestLineId);

        // Create QC request for product (pack_qc_request table)
        await supabase.from('pack_qc_request').insert({
          pack_lot_id: completeData.packLotId,
          checkpoint_code: 'QC_PRODUCT',
          requested_by: user?.user_id,
          requested_at: new Date().toISOString(),
          status: 'Opened',
          qc_type: 'Product',
        });

        // Проверяем, есть ли ещё pack_lots в статусе Filling для этого CM лота
        const { data: remainingFilling } = await supabase
          .from('pack_lot')
          .select('pack_lot_id')
          .eq('source_cm_lot_id', lot.cm_lot_id)
          .eq('status', 'Filling');
        
        // Если все pack_lots завершены (не в Filling), обновляем статус CM лота
        if (!remainingFilling || remainingFilling.length === 0) {
          await supabase.from('cm_lot')
            .update({ status: 'Filled' })
            .eq('cm_lot_id', lot.cm_lot_id);
        }

        setShowCompleteModal(false);
        setCompleteData(null);
        loadData();
        onRefresh();
        
        // Автопереключение на QC Продукта
        if (onNavigate) {
          setTimeout(() => onNavigate('qc_product'), 500);
        }
      } else {
        // Оставляем открытым для продолжения
        await supabase.from('pack_lot').update({
          qty_produced: completeData.qtyProduced,
          // status остаётся 'Filling'
        }).eq('pack_lot_id', completeData.packLotId);

        setShowCompleteModal(false);
        setCompleteData(null);
        loadData();
        showSuccess('Успешно', 'Розлив сохранён. Вы можете продолжить позже.');
      }
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  const canFill = lot.status === 'Approved' && hasRole(['Production', 'Admin']);
  const availableVolume = container?.current_volume_ml || 0;

  return (
    <div className="space-y-6">
      {/* Workflow Info */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Droplets size={20} />
          Розлив продукции
        </h4>
        <p className="text-sm text-blue-700">
          Розлив выполняется по заявкам. Выберите заявку и начните розлив указанного количества флаконов.
        </p>
      </div>

      {/* Available volume */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-600">Доступный объем для розлива</p>
        <p className="text-2xl font-bold text-blue-900">{availableVolume.toFixed(1)} мл</p>
      </div>

      {/* Pending requests for filling */}
      {allRequestLines.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Заявки на розлив</h4>
          {allRequestLines.map((line: any) => {
            const format = packFormats.find(f => f.pack_format_code === line.pack_format_code);
            const existingPL = packLots.find(pl => pl.request_line_id === line.request_line_id);
            const requiredVolume = (format?.nominal_fill_volume_ml || 0) * line.qty_units;
            const possibleUnits = format?.nominal_fill_volume_ml ? Math.floor(availableVolume / format.nominal_fill_volume_ml) : 0;
            
            return (
              <div key={line.request_line_id} className={`p-4 rounded-lg border ${existingPL ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-card border-border'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{line.finished_product_code}</p>
                    <p className="text-sm text-muted-foreground">
                      Заказано: <span className="font-bold">{line.qty_units}</span> фл. × {format?.nominal_fill_volume_ml || '?'} мл = {requiredVolume.toFixed(0)} мл
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Доступно для розлива: ~{possibleUnits} фл.
                      {line.request?.due_date && ` | Срок: ${new Date(line.request.due_date).toLocaleDateString('ru-RU')}`}
                    </p>
                  </div>
                  <div>
                    {existingPL ? (
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          existingPL.status === 'Filling' ? 'bg-blue-100 text-blue-800' :
                          existingPL.status === 'QC_Pending' ? 'bg-yellow-100 text-yellow-800' :
                          existingPL.status === 'Released' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100'
                        }`}>{existingPL.status}</span>
                        {existingPL.status === 'Filling' && (
                          <Button
                            variant="success"
                            size="sm"
                            className="mt-2"
                            onClick={() => openCompleteModal(existingPL, line)}
                          >
                            Завершить розлив
                          </Button>
                        )}
                        {existingPL.qty_produced > 0 && existingPL.status === 'Filling' && (
                          <p className="text-xs text-blue-600 mt-1">Разлито: {existingPL.qty_produced} фл.</p>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => startFilling(line)}
                        disabled={!canFill || requiredVolume > availableVolume}
                      >
                        Начать розлив ({line.qty_units} фл.)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allRequestLines.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800">Нет заявок для розлива. Сначала создайте резерв на заявку.</p>
        </div>
      )}

      {/* Модальное окно завершения розлива */}
      <Dialog open={showCompleteModal && !!completeData} onOpenChange={(open) => { if (!open) { setShowCompleteModal(false); setCompleteData(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Завершение розлива</DialogTitle>
          </DialogHeader>
          {completeData && (
            <>
            {!showMismatchChoice ? (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Заказано по заявке:</p>
                  <p className="text-2xl font-bold text-blue-800">{completeData.qtyPlanned} фл.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Фактически разлито:</label>
                  <Input
                    type="number"
                    min={1}
                    max={completeData.qtyPlanned * 2}
                    value={completeData.qtyProduced}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    className="text-2xl font-bold text-center border-2 border-blue-500"
                  />
                </div>

                {completeData.qtyProduced !== completeData.qtyPlanned && (
                  <div className={`p-3 rounded-lg ${completeData.qtyProduced < completeData.qtyPlanned ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`text-sm ${completeData.qtyProduced < completeData.qtyPlanned ? 'text-amber-700' : 'text-green-700'}`}>
                      {completeData.qtyProduced < completeData.qtyPlanned 
                        ? `⚠️ Недостаток: ${completeData.qtyPlanned - completeData.qtyProduced} фл.`
                        : `✓ Излишек: ${completeData.qtyProduced - completeData.qtyPlanned} фл.`
                      }
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowCompleteModal(false); setCompleteData(null); }}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={handleConfirmQty}
                    disabled={completeData.qtyProduced < 1}
                  >
                    Подтвердить
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-medium text-amber-800 mb-2">Количество меньше заказанного!</p>
                  <p className="text-sm text-amber-700">
                    Заказано: {completeData.qtyPlanned} фл. | Разлито: {completeData.qtyProduced} фл.
                  </p>
                  <p className="text-sm text-amber-700 font-medium mt-1">
                    Недостаёт: {completeData.qtyPlanned - completeData.qtyProduced} фл.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">Выберите действие:</p>

                <div className="space-y-2">
                  <button
                    onClick={() => finalizeFilling(true)}
                    className="w-full p-4 text-left border-2 border-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 transition"
                  >
                    <p className="font-medium text-green-800">Закрыть с тем, что есть</p>
                    <p className="text-sm text-green-600">Передать {completeData.qtyProduced} фл. на QC/QA продукта</p>
                  </button>

                  <button
                    onClick={() => finalizeFilling(false)}
                    className="w-full p-4 text-left border-2 border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
                  >
                    <p className="font-medium text-blue-800">Продолжить позже</p>
                    <p className="text-sm text-blue-600">Сохранить прогресс и вернуться к розливу</p>
                  </button>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMismatchChoice(false)}
                >
                  Назад
                </Button>
              </>
            )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// QC Product Tab - Quality Control for finished products
function QcProductTab({ lot, requestLine, onRefresh, onNavigate }: any) {
  const { user, hasRole } = useAuth();
  const [qcRequests, setQcRequests] = useState<any[]>([]);
  const [qcResults, setQcResults] = useState<any[]>([]);
  const [packLots, setPackLots] = useState<any[]>([]);
  const [showResultForm, setShowResultForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [resultData, setResultData] = useState({
    test_code: '',
    result_value: '',
    pass_fail: 'Pass',
    tested_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [reqRes, resultsRes, plRes] = await Promise.all([
      supabase.from('cm_qc_request').select('*').eq('cm_lot_id', lot.cm_lot_id).eq('qc_type', 'Product'),
      supabase.from('cm_qc_result').select('*'),
      supabase.from('pack_lot').select('*').eq('source_cm_lot_id', lot.cm_lot_id),
    ]);
    setQcRequests(reqRes.data || []);
    setPackLots(plRes.data || []);
    
    const requestIds = (reqRes.data || []).map(r => r.qc_request_id);
    const filteredResults = (resultsRes.data || []).filter(r => requestIds.includes(r.qc_request_id));
    setQcResults(filteredResults);
  }

  // Get product QC tests from frozen_spec
  const productQcTests = lot.frozen_spec?.qc?.product || [];

  async function addResult(e: React.FormEvent) {
    e.preventDefault();
    try {
      await supabase.from('cm_qc_result').insert({
        qc_request_id: selectedRequest,
        test_code: resultData.test_code,
        result_value: resultData.result_value || null,
        pass_fail: resultData.pass_fail,
        tested_at: new Date(resultData.tested_at).toISOString(),
      });
      setShowResultForm(false);
      setResultData({ test_code: '', result_value: '', pass_fail: 'Pass', tested_at: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  async function completeQc(requestId: string, packLotId: string) {
    try {
      await supabase.from('cm_qc_request').update({ status: 'Completed' }).eq('qc_request_id', requestId);
      await supabase.from('pack_lot').update({ status: 'QC_Completed' }).eq('pack_lot_id', packLotId);
      loadData();
      onRefresh();
      // Автопереключение на Отгрузку
      if (onNavigate) {
        setTimeout(() => onNavigate('shipping'), 500);
      }
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  const canAddResult = hasRole(['QC', 'Admin']);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
          <TestTube2 size={20} />
          QC Продукта
        </h4>
        <p className="text-sm text-purple-700">
          Контроль качества готового продукта. Выполняется после розлива.
        </p>
      </div>

      {/* Required tests from frozen_spec */}
      {productQcTests.length > 0 && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="text-sm font-medium text-purple-800 mb-3">Требуемые тесты продукта</h4>
          <div className="grid grid-cols-3 gap-2">
            {productQcTests.map((test: any, idx: number) => (
              <div key={idx} className="p-2 bg-card rounded border border-border text-sm">
                {test.name || test.code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QC Requests for products */}
      {qcRequests.length > 0 ? (
        <div className="space-y-4">
          {qcRequests.map((req: any) => {
            const pl = packLots.find(p => p.pack_lot_id === req.pack_lot_id);
            const results = qcResults.filter(r => r.qc_request_id === req.qc_request_id);
            return (
              <div key={req.qc_request_id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-medium">QC Продукта — {pl?.pack_lot_id || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">Статус: {req.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {canAddResult && req.status !== 'Completed' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => { setSelectedRequest(req.qc_request_id); setShowResultForm(true); }}
                      >
                        + Результат
                      </Button>
                    )}
                    {req.status !== 'Completed' && results.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => completeQc(req.qc_request_id, req.pack_lot_id)}
                      >
                        Завершить QC
                      </Button>
                    )}
                  </div>
                </div>
                {results.length > 0 && (
                  <div className="space-y-1">
                    {results.map((r: any) => (
                      <div key={r.qc_result_id} className="p-2 bg-muted rounded text-sm flex justify-between">
                        <span>{r.test_code}: {r.result_value || '-'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${r.pass_fail === 'Pass' ? 'bg-green-200' : 'bg-red-200'}`}>
                          {r.pass_fail}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
          Нет запросов QC продукта. Запрос создаётся автоматически после завершения розлива.
        </div>
      )}

      {/* Result form */}
      {showResultForm && (
        <form onSubmit={addResult} className="p-4 bg-muted rounded-lg space-y-4">
          <h4 className="font-medium text-foreground">Добавить результат QC</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Тест</label>
              <select
                value={resultData.test_code}
                onChange={(e) => setResultData({ ...resultData, test_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
                required
              >
                <option value="">Выберите</option>
                {productQcTests.map((t: any) => (
                  <option key={t.code} value={t.code}>{t.name || t.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Результат</label>
              <Input
                type="text"
                value={resultData.result_value}
                onChange={(e) => setResultData({ ...resultData, result_value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Статус</label>
              <select
                value={resultData.pass_fail}
                onChange={(e) => setResultData({ ...resultData, pass_fail: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-input"
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowResultForm(false)}>Отмена</Button>
            <Button type="submit" variant="success">Сохранить</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Shipping Tab - Labels and release to warehouse
function ShippingTab({ lot, onRefresh, onNavigate }: any) {
  const { user, hasRole } = useAuth();
  const [packLots, setPackLots] = useState<any[]>([]);
  const [packFormats, setPackFormats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [plRes, pfRes] = await Promise.all([
      supabase.from('pack_lot').select('*').eq('source_cm_lot_id', lot.cm_lot_id),
      supabase.from('pack_format').select('*'),
    ]);
    setPackLots(plRes.data || []);
    setPackFormats(pfRes.data || []);
  }

  async function releaseToWarehouse(packLotId: string) {
    try {
      await supabase.from('pack_lot').update({
        status: 'Released',
        released_at: new Date().toISOString(),
        released_by: user?.user_id,
      }).eq('pack_lot_id', packLotId);

      // Log label print
      await supabase.from('label_print_log').insert({
        entity_type: 'PackLot',
        entity_id: packLotId,
        label_format: '5x7',
        qty_printed: 1,
        printed_at: new Date().toISOString(),
        printed_by: user?.user_id,
      });

      loadData();
      onRefresh();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  async function printVialLabels(packLotId: string, qty: number) {
    await supabase.from('label_print_log').insert({
      entity_type: 'PackLot_Vials',
      entity_id: packLotId,
      label_format: '1x1_round',
      qty_printed: qty,
      printed_at: new Date().toISOString(),
      printed_by: user?.user_id,
    });
    showSuccess('Печать', `Печать ${qty} круглых этикеток 1x1 на флаконы`);
    window.print();
  }

  const readyForShipping = packLots.filter(pl => pl.status === 'QC_Completed');
  const shipped = packLots.filter(pl => pl.status === 'Released');

  const canShip = hasRole(['Production', 'Admin']);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
        <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <Truck size={20} />
          Отгрузка на склад
        </h4>
        <p className="text-sm text-emerald-700">
          После QC продукта — печать этикеток и перевод на склад готовой продукции.
        </p>
      </div>

      {/* Ready for shipping */}
      {readyForShipping.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-green-800">Готово к отгрузке ({readyForShipping.length})</h4>
          {readyForShipping.map((pl: any) => {
            const format = packFormats.find(f => f.pack_format_code === pl.pack_format_code);
            return (
              <div key={pl.pack_lot_id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{pl.pack_lot_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {format?.name || pl.pack_format_code} × {pl.qty_produced || pl.qty_planned} фл.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printVialLabels(pl.pack_lot_id, pl.qty_produced || pl.qty_planned)}
                    >
                      <Printer size={16} className="mr-1" />
                      Этикетки 1x1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} className="mr-1" />
                      Этикетка 5x7
                    </Button>
                    {canShip && (
                      <Button
                        variant="success"
                        onClick={() => releaseToWarehouse(pl.pack_lot_id)}
                      >
                        <Truck size={16} className="mr-2" />
                        На склад
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Already shipped */}
      {shipped.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-muted-foreground">Отгружено ({shipped.length})</h4>
          {shipped.map((pl: any) => {
            const format = packFormats.find(f => f.pack_format_code === pl.pack_format_code);
            return (
              <div key={pl.pack_lot_id} className="p-3 bg-muted border border-border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-foreground">{pl.pack_lot_id}</p>
                  <p className="text-sm text-muted-foreground">{format?.name} × {pl.qty_produced || pl.qty_planned} фл.</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Released</span>
              </div>
            );
          })}
        </div>
      )}

      {readyForShipping.length === 0 && shipped.length === 0 && (
        <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
          Нет продуктов для отгрузки. Сначала завершите розлив и QC продукта.
        </div>
      )}
    </div>
  );
}


// Usage Tab - склад и движение сырья
function UsageTab({ lot }: { lot: CmLot }) {
  const [packLots, setPackLots] = useState<any[]>([]);
  const [container, setContainer] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [lot.cm_lot_id]);

  async function loadData() {
    const [packRes, containerRes] = await Promise.all([
      supabase.from('pack_lot').select(`
        *, request_line:request_line_id(finished_product_code, request:request_id(customer_ref)),
        pack_format:pack_format_code(name)
      `).eq('source_cm_lot_id', lot.cm_lot_id).order('created_at', { ascending: false }),
      supabase.from('container').select('*').eq('owner_id', lot.cm_lot_id).eq('owner_entity_type', 'CM_Lot').single()
    ]);
    
    setPackLots(packRes.data || []);
    setContainer(containerRes.data);
    
    if (containerRes.data) {
      const { data: movData } = await supabase.from('stock_movement')
        .select('*').eq('container_id', containerRes.data.container_id)
        .order('moved_at', { ascending: false }).limit(20);
      setMovements(movData || []);
    }
    setLoading(false);
  }

  const statusLabels: Record<string, string> = {
    Planned: 'Запланирован', Filling: 'Розлив', Processing: 'Процессинг',
    QC_Pending: 'Ожидает QC', Released: 'Выпущен', Shipped: 'Отгружен'
  };
  const statusColors: Record<string, string> = {
    Planned: 'bg-muted text-muted-foreground', Filling: 'bg-blue-100 text-blue-700',
    Processing: 'bg-purple-100 text-purple-700', QC_Pending: 'bg-yellow-100 text-yellow-700',
    Released: 'bg-green-100 text-green-700', Shipped: 'bg-emerald-100 text-emerald-700'
  };

  const totalUsed = packLots.reduce((sum, pl) => sum + (pl.total_filled_volume_ml || 0), 0);

  if (loading) return <div className="p-4">Загрузка...</div>;

  return (
    <div className="space-y-6">
      {/* Остаток сырья */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-3">Остаток сырья</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{container?.current_volume_ml?.toFixed(1) || 0} мл</p>
              <p className="text-xs text-muted-foreground">Текущий остаток</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{totalUsed.toFixed(1)} мл</p>
              <p className="text-xs text-muted-foreground">Использовано</p>
            </div>
            <div className="text-center p-3 bg-muted rounded">
              <p className="text-2xl font-bold text-foreground">{packLots.length}</p>
              <p className="text-xs text-muted-foreground">Партий продукта</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Продукты */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-3">Продукты из этого сырья</h3>
          {packLots.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Продукты ещё не созданы</p>
          ) : (
            <div className="space-y-2">
              {packLots.map((pl: any) => (
                <Link key={pl.pack_lot_id} to={`/packlot/${pl.pack_lot_id}`}
                  className="flex items-center justify-between p-3 bg-muted rounded hover:bg-muted/80">
                  <div>
                    <p className="font-mono text-sm font-medium">{pl.pack_lot_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {(pl.pack_format as any)?.name} • {pl.qty_produced || pl.qty_planned} шт • {pl.total_filled_volume_ml?.toFixed(1) || 0} мл
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${statusColors[pl.status] || 'bg-gray-100'}`}>
                    {statusLabels[pl.status] || pl.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* История движений */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-3">История движений</h3>
          {movements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Нет записей</p>
          ) : (
            <div className="space-y-1 text-sm">
              {movements.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className={m.direction === 'In' ? 'text-green-600' : 'text-red-600'}>
                    {m.direction === 'In' ? '+' : '-'}{m.qty} {m.item_type === 'Bulk' ? 'мл' : 'шт'}
                  </span>
                  <span className="text-muted-foreground">{m.reason_code}</span>
                  <span className="text-muted-foreground/70">{new Date(m.moved_at).toLocaleDateString('ru')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
