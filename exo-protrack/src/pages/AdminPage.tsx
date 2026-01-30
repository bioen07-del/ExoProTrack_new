import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, Users, Info, GripVertical, FileText, Beaker, FlaskConical, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { showError, showConfirm } from '../lib/toast';

// Типы для сортировки
type SortDirection = 'asc' | 'desc' | null;
interface SortState { field: string; direction: SortDirection; }

// Компонент заголовка с сортировкой
function SortableHeader({ label, field, sort, onSort, className = '' }: { 
  label: string; field: string; sort: SortState; onSort: (field: string) => void; className?: string;
}) {
  const isActive = sort.field === field;
  return (
    <th 
      className={`px-4 py-2 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-muted select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (sort.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : <ChevronsUpDown size={14} className="opacity-30"/>}
      </div>
    </th>
  );
}

// Хелпер сортировки
function sortData<T>(data: T[], sort: SortState, getField: (item: T, field: string) => any): T[] {
  if (!sort.field || !sort.direction) return data;
  return [...data].sort((a, b) => {
    const aVal = getField(a, sort.field);
    const bVal = getField(b, sort.field);
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal, 'ru') : (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
    return sort.direction === 'asc' ? cmp : -cmp;
  });
}

// Хук для управления сортировкой
function useSort(defaultField = ''): [SortState, (field: string) => void] {
  const [sort, setSort] = useState<SortState>({ field: defaultField, direction: defaultField ? 'asc' : null });
  const toggle = (field: string) => {
    setSort(prev => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: '', direction: null };
    });
  };
  return [sort, toggle];
}
import { supabase, CellType, Product, PackFormat, MediaCompatibilitySpec } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface BaseMedia {
  base_media_id: string;
  code: string;
  name: string;
  phenol_red_flag: boolean;
  description: string | null;
  is_active: boolean;
  sds_component_id?: string | null;
}

interface MediaAdditive {
  additive_id: string;
  code: string;
  name: string;
  default_concentration: number | null;
  unit: string;
  additive_type: string | null;
  description: string | null;
  is_active: boolean;
  sds_component_id?: string | null;
}

interface MediaSpecAdditive {
  id: string;
  media_spec_id: string;
  additive_id: string;
  concentration: number | null;
}

// Компонент отображения полной формулы среды
export function MediaFormulaDisplay({ 
  mediaSpec, 
  baseMediaList, 
  additivesList, 
  specAdditives 
}: { 
  mediaSpec: MediaCompatibilitySpec & { base_media_id?: string };
  baseMediaList: BaseMedia[];
  additivesList: MediaAdditive[];
  specAdditives: MediaSpecAdditive[];
}) {
  const baseMedia = baseMediaList.find(b => b.base_media_id === mediaSpec.base_media_id);
  const linkedAdditives = specAdditives
    .filter(sa => sa.media_spec_id === mediaSpec.media_spec_id)
    .map(sa => {
      const additive = additivesList.find(a => a.additive_id === sa.additive_id);
      return additive ? { ...additive, concentration: sa.concentration } : null;
    })
    .filter(Boolean) as (MediaAdditive & { concentration: number | null })[];

  // Сортировка добавок по алфавиту
  linkedAdditives.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));

  if (!baseMedia && linkedAdditives.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="text-sm">
      {baseMedia && (
        <span className="font-medium text-foreground">{baseMedia.name}</span>
      )}
      {linkedAdditives.length > 0 && (
        <span className="text-muted-foreground">
          {baseMedia ? ' + ' : ''}
          {linkedAdditives.map((a, i) => (
            <span key={a.additive_id}>
              {i > 0 && ' + '}
              {a.name} {a.concentration !== null ? `${a.concentration}${a.unit}` : ''}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

async function generateSDSPdf(product: Product, mediaSpecs: MediaCompatibilitySpec[], sdsComponents: any[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const mediaSpec = mediaSpecs.find(m => m.media_spec_id === product.media_spec_id);
  // Get SDS components linked to this media spec
  const linkedComponents = sdsComponents.filter((c: any) => c.media_spec_id === product.media_spec_id);
  
  // Title
  doc.setFontSize(16);
  doc.text('SAFETY DATA SHEET (SDS)', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Product: ${product.product_name} (${product.product_code})`, 20, 25);
  doc.text(`Revision Date: ${new Date().toLocaleDateString('ru-RU')}`, 20, 31);
  
  // Get data from linked components or use defaults
  const getFromComponents = (field: string, defaultVal: string) => {
    const comp = linkedComponents.find((c: any) => c[field]);
    return comp?.[field] || defaultVal;
  };
  
  // Component names list
  const componentsList = linkedComponents.length > 0 
    ? linkedComponents.map((c: any) => `${c.component_name}${c.cas_number ? ` (CAS: ${c.cas_number})` : ''}`).join('\n')
    : 'No components defined';
  
  let y = 42;
  const sections = [
    { num: 1, title: 'IDENTIFICATION', content: `Product: ${product.product_name}\nCode: ${product.product_code}\nType: ${product.product_type}\nSupplier: ${getFromComponents('supplier_details', 'EXo ProTrack')}` },
    { num: 2, title: 'HAZARD IDENTIFICATION', content: getFromComponents('hazard_classification', 'Classification: Not classified as hazardous\nBiological material - handle with appropriate precautions') },
    { num: 3, title: 'COMPOSITION/INFORMATION', content: `Base Medium: ${mediaSpec?.base_medium_code || 'N/A'}\nSerum Class: ${mediaSpec?.serum_class || 'N/A'}\nPhenol Red: ${mediaSpec?.phenol_red_flag ? 'Yes' : 'No'}\n\nComponents:\n${componentsList}` },
    { num: 4, title: 'FIRST AID MEASURES', content: getFromComponents('first_aid_measures', 'Eye contact: Rinse with water\nSkin contact: Wash with soap and water\nIngestion: Seek medical advice') },
    { num: 5, title: 'FIREFIGHTING MEASURES', content: getFromComponents('extinguishing_media', 'Use water spray, CO2, or foam extinguisher\nNo special hazards') },
    { num: 6, title: 'ACCIDENTAL RELEASE', content: getFromComponents('cleanup_methods', 'Absorb with inert material\nDispose according to regulations') },
    { num: 7, title: 'HANDLING AND STORAGE', content: getFromComponents('storage_conditions', 'Store at 2-8C\nHandle aseptically\nProtect from light') },
    { num: 8, title: 'EXPOSURE CONTROLS/PPE', content: getFromComponents('personal_protection', 'Use lab coat, gloves, and eye protection\nWork in biosafety cabinet when required') },
    { num: 9, title: 'PHYSICAL/CHEMICAL PROPERTIES', content: `Appearance: Liquid\nColor: Variable\npH: 7.0-7.4` },
    { num: 10, title: 'STABILITY AND REACTIVITY', content: getFromComponents('stability_info', 'Stable under normal conditions\nAvoid contamination') },
    { num: 11, title: 'TOXICOLOGICAL INFORMATION', content: getFromComponents('toxicological_info', 'No known toxic effects\nBiological origin - test for pathogens') },
    { num: 12, title: 'ECOLOGICAL INFORMATION', content: getFromComponents('ecological_info', 'Biodegradable\nNo environmental hazard expected') },
    { num: 13, title: 'DISPOSAL CONSIDERATIONS', content: getFromComponents('disposal_methods', 'Autoclave before disposal\nFollow local biohazard regulations') },
    { num: 14, title: 'TRANSPORT INFORMATION', content: getFromComponents('transport_info', 'UN Number: Not regulated\nShip on dry ice or cold packs') },
    { num: 15, title: 'REGULATORY INFORMATION', content: getFromComponents('regulatory_info', 'For research/manufacturing use only\nNot for human therapeutic use without processing') },
    { num: 16, title: 'OTHER INFORMATION', content: `Generated: ${new Date().toISOString()}\nLinked components: ${linkedComponents.length}\nThis SDS is provided for informational purposes` },
  ];
  
  doc.setFontSize(9);
  for (const sec of sections) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text(`${sec.num}. ${sec.title}`, 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = sec.content.split('\n');
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 25, y);
      y += 4;
    }
    y += 3;
  }
  
  doc.save(`SDS_${product.product_code}.pdf`);
}

type Tab = 'users' | 'cellTypes' | 'products' | 'packFormats' | 'mediaManagement' | 'processMethods' | 'qcTests' | 'infections' | 'dataCleanup';
type MediaSubTab = 'baseMedia' | 'additives' | 'specs';

interface SdsModalState {
  open: boolean;
  entityType: 'base_media' | 'additive' | null;
  entityId: string | null;
  entityName: string;
  sdsData: any;
}

interface AppUser {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface QcTestType {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  norm_min: number | null;
  norm_max: number | null;
  norm_text?: string | null;
  method: string | null;
  is_active: boolean | null;
}

interface ProcessMethod {
  method_id: string;
  code: string | null;
  name: string;
  method_type: string;
  description: string | null;
  is_active: boolean | null;
  requires_time_tracking?: boolean | null;
  // Modification type fields
  steps_count?: number | null;
  step_definitions?: { step_number: number; description: string; expected_results: string }[] | null;
  applicability?: 'product' | 'raw' | 'both' | null;
  trigger_stage?: string | null;
}

interface InfectionType {
  infection_type_id: string;
  code: string;
  name: string;
  description: string | null;
  test_method: string | null;
  is_active: boolean | null;
}

interface SdsComponent {
  sds_component_id: string;
  component_name: string;
  cas_number: string | null;
  product_identifier: string | null;
  supplier_details: string | null;
  // ... other fields
}

// Локализация типов продукта
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  BaseBulk: 'Сток',
  Finished: 'Продукт',
};

// Компонент Tooltip
function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <Info size={14} className="text-muted-foreground cursor-help" />
      <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        {text}
      </div>
    </div>
  );
}

// Компонент FormField с label и tooltip
function FormField({ label, tooltip, children, required }: { label: string; tooltip?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="flex items-center text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {children}
    </div>
  );
}

// Компонент управления данными - удаление с каскадом
function DataCleanupTab() {
  const [dataType, setDataType] = useState<'requests' | 'cmLots'>('requests');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{open: boolean; item: any; relations: any[]; deleting: boolean}>({open: false, item: null, relations: [], deleting: false});

  const loadItems = async () => {
    setLoading(true);
    try {
      if (dataType === 'requests') {
        const { data } = await supabase.from('request').select('*').order('created_at', { ascending: false });
        setItems(data || []);
      } else if (dataType === 'cmLots') {
        const { data } = await supabase.from('cm_lot').select('*').order('created_at', { ascending: false });
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [dataType]);

  const findRelations = async (item: any) => {
    const relations: any[] = [];
    
    if (dataType === 'requests') {
      const reqId = item.request_id;
      const [lines, packLots] = await Promise.all([
        supabase.from('request_line').select('request_line_id').eq('request_id', reqId),
        supabase.from('pack_lot').select('pack_lot_id, request_line_id'),
      ]);
      const lineIds = lines.data?.map(l => l.request_line_id) || [];
      const relatedPackLots = (packLots.data || []).filter((p: any) => lineIds.includes(p.request_line_id));
      if (lines.data?.length) relations.push({ type: 'request_line', count: lines.data.length, label: 'Строки заявки', ids: lineIds });
      if (relatedPackLots.length) relations.push({ type: 'pack_lot', count: relatedPackLots.length, label: 'Партии продукта', ids: relatedPackLots.map((p: any) => p.pack_lot_id) });
    } else if (dataType === 'cmLots') {
      const cmId = item.cm_lot_id;
      const [containers, collections, processing, qcReq, packLots, reservations] = await Promise.all([
        supabase.from('container').select('container_id').eq('owner_id', cmId),
        supabase.from('collection_event').select('collection_id').eq('cm_lot_id', cmId),
        supabase.from('processing_step').select('processing_step_id').eq('cm_lot_id', cmId),
        supabase.from('cm_qc_request').select('qc_request_id').eq('cm_lot_id', cmId),
        supabase.from('pack_lot').select('pack_lot_id').eq('source_cm_lot_id', cmId),
        supabase.from('reservation').select('reservation_id').eq('cm_lot_id', cmId),
      ]);
      if (containers.data?.length) relations.push({ type: 'container', count: containers.data.length, label: 'Контейнеры', ids: containers.data.map(r => r.container_id) });
      if (collections.data?.length) relations.push({ type: 'collection_event', count: collections.data.length, label: 'События сбора', ids: collections.data.map(r => r.collection_id) });
      if (processing.data?.length) relations.push({ type: 'processing_step', count: processing.data.length, label: 'Шаги обработки', ids: processing.data.map(r => r.processing_step_id) });
      if (qcReq.data?.length) relations.push({ type: 'cm_qc_request', count: qcReq.data.length, label: 'QC запросы', ids: qcReq.data.map(r => r.qc_request_id) });
      if (packLots.data?.length) relations.push({ type: 'pack_lot', count: packLots.data.length, label: 'Партии продукта', ids: packLots.data.map(r => r.pack_lot_id) });
      if (reservations.data?.length) relations.push({ type: 'reservation', count: reservations.data.length, label: 'Резервы', ids: reservations.data.map(r => r.reservation_id) });
    }
    return relations;
  };

  const handleDeleteClick = async (item: any) => {
    const relations = await findRelations(item);
    setDeleteModal({ open: true, item, relations, deleting: false });
  };

  const confirmDelete = async (deleteRelated: boolean) => {
    setDeleteModal(prev => ({ ...prev, deleting: true }));
    try {
      // Helper to delete pack_lot and its children
      const deletePackLot = async (packLotId: string) => {
        await (supabase.from as any)('pack_processing_step').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('pack_qc_request').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('pack_qc_result').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('qa_decision').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('lyophilization_event').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('shipment_item').delete().eq('pack_lot_id', packLotId);
        await (supabase.from as any)('container').delete().eq('owner_id', packLotId);
        await (supabase.from as any)('pack_lot').delete().eq('pack_lot_id', packLotId);
      };

      if (deleteRelated) {
        for (const rel of deleteModal.relations) {
          if (rel.type === 'pack_lot') {
            for (const id of rel.ids) {
              await deletePackLot(id);
            }
          } else {
            const idField = rel.type === 'request_line' ? 'request_line_id' : rel.type === 'cm_lot' ? 'cm_lot_id' : rel.type === 'container' ? 'container_id' : rel.type === 'collection_event' ? 'collection_id' : rel.type === 'processing_step' ? 'processing_step_id' : rel.type === 'cm_qc_request' ? 'qc_request_id' : rel.type === 'reservation' ? 'reservation_id' : 'id';
            for (const id of rel.ids) {
              await supabase.from(rel.type as any).delete().eq(idField, id);
            }
          }
        }
      }
      
      if (dataType === 'requests') {
        // Delete pack_lots first (with children)
        const packLotRel = deleteModal.relations.find(r => r.type === 'pack_lot');
        if (packLotRel) {
          for (const id of packLotRel.ids) {
            await deletePackLot(id);
          }
        }
        await supabase.from('request_line').delete().eq('request_id', deleteModal.item.request_id);
        await supabase.from('request').delete().eq('request_id', deleteModal.item.request_id);
      } else if (dataType === 'cmLots') {
        await supabase.from('cm_lot').delete().eq('cm_lot_id', deleteModal.item.cm_lot_id);
      }
      
      setDeleteModal({ open: false, item: null, relations: [], deleting: false });
      loadItems();
    } catch (err: any) {
      showError('Ошибка удаления', err.message);
      setDeleteModal(prev => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-800 font-medium">⚠️ Внимание! Удаление данных необратимо.</p>
        <p className="text-amber-700 text-sm">При удалении записей связанные данные (включая статистику дашбордов) также могут быть удалены.</p>
      </div>
      
      <div className="flex gap-2">
        {[
          { id: 'requests', label: 'Заявки' },
          { id: 'cmLots', label: 'Сырьё (CM)' },
        ].map(t => (
          <button key={t.id} onClick={() => setDataType(t.id as any)} className={`px-4 py-2 rounded-lg ${dataType === t.id ? 'bg-red-600 text-white' : 'bg-muted hover:bg-muted'}`}>{t.label}</button>
        ))}
      </div>

      <Card><CardContent className="p-6">
        <h3 className="font-semibold mb-4">
          {dataType === 'requests' && `Заявки (${items.length})`}
          {dataType === 'cmLots' && `Партии сырья (${items.length})`}
        </h3>

        {loading ? <p className="text-muted-foreground">Загрузка...</p> : (
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {dataType === 'requests' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ID</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Продукт</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Статус</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Создана</th></>}
                {dataType === 'cmLots' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ID</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Продукт</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Статус</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Создана</th></>}
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Удалить</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/50">
                  {dataType === 'requests' && <><td className="px-4 py-2 font-mono">{item.request_id}</td><td className="px-4 py-2">{item.product_code || '-'}</td><td className="px-4 py-2"><Badge variant={item.status === 'Completed' ? 'success' : 'muted'}>{item.status}</Badge></td><td className="px-4 py-2 text-sm">{item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '-'}</td></>}
                  {dataType === 'cmLots' && <><td className="px-4 py-2 font-mono">{item.cm_lot_id}</td><td className="px-4 py-2">{item.base_product_code}</td><td className="px-4 py-2"><Badge variant={item.status === 'Approved' ? 'success' : 'muted'}>{item.status}</Badge></td><td className="px-4 py-2 text-sm">{item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '-'}</td></>}
                  <td className="px-4 py-2 text-center">
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteClick(item)}><Trash2 size={18}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => { if (!open) setDeleteModal({ open: false, item: null, relations: [], deleting: false }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Подтверждение удаления</DialogTitle>
          </DialogHeader>
            <p className="mb-4">Вы собираетесь удалить: <strong className="font-mono">{(dataType as any) === 'products' ? deleteModal.item?.product_code : dataType === 'requests' ? deleteModal.item?.request_id : deleteModal.item?.cm_lot_id}</strong></p>

            {deleteModal.relations.length > 0 ? (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-800 mb-2">Найдены связанные записи:</p>
                <ul className="space-y-1 text-sm">
                  {deleteModal.relations.map((rel, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{rel.label}</span>
                      <span className="font-mono font-bold">{rel.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-4 text-green-600">✓ Связанных записей не найдено.</p>
            )}

          <DialogFooter className="flex gap-2">
              {deleteModal.relations.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmDelete(true)} disabled={deleteModal.deleting}>
                  {deleteModal.deleting ? 'Удаление...' : 'Удалить всё'}
                </Button>
              )}
              <Button variant="warning" size="sm" onClick={() => confirmDelete(false)} disabled={deleteModal.deleting}>
                {deleteModal.deleting ? 'Удаление...' : deleteModal.relations.length > 0 ? 'Только эту запись' : 'Удалить'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, item: null, relations: [], deleting: false })}>
                Отмена
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [mediaSubTab, setMediaSubTab] = useState<MediaSubTab>('baseMedia');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [cellTypes, setCellTypes] = useState<CellType[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [packFormats, setPackFormats] = useState<PackFormat[]>([]);
  const [mediaSpecs, setMediaSpecs] = useState<MediaCompatibilitySpec[]>([]);
  const [processMethods, setProcessMethods] = useState<ProcessMethod[]>([]);
  const [qcTestTypes, setQcTestTypes] = useState<QcTestType[]>([]);
  const [infectionTypes, setInfectionTypes] = useState<InfectionType[]>([]);
  const [sdsComponents, setSdsComponents] = useState<SdsComponent[]>([]);
  const [sdsModal, setSdsModal] = useState<SdsModalState>({ open: false, entityType: null, entityId: null, entityName: '', sdsData: {} });
  const [baseMediaList, setBaseMediaList] = useState<BaseMedia[]>([]);
  const [mediaAdditives, setMediaAdditives] = useState<MediaAdditive[]>([]);
  const [specAdditives, setSpecAdditives] = useState<MediaSpecAdditive[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Archive view states
  const [showArchivedProducts, setShowArchivedProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // Sort states для всех таблиц
  const [sortUsers, toggleSortUsers] = useSort('email');
  const [sortCellTypes, toggleSortCellTypes] = useSort('cell_type_code');
  const [sortProducts, toggleSortProducts] = useSort('product_code');
  const [sortPackFormats, toggleSortPackFormats] = useSort('pack_format_code');
  const [sortBaseMedia, toggleSortBaseMedia] = useSort('code');
  const [sortAdditives, toggleSortAdditives] = useSort('code');
  const [sortMediaSpecs, toggleSortMediaSpecs] = useSort('name');
  const [sortProcessMethods, toggleSortProcessMethods] = useSort('code');
  const [sortQcTests, toggleSortQcTests] = useSort('code');
  const [sortInfections, toggleSortInfections] = useSort('code');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRes, ctRes, prodRes, pfRes, msRes, pmRes, qcRes] = await Promise.all([
        supabase.from('app_user').select('*').order('email'),
        supabase.from('cell_type').select('*').order('cell_type_code'),
        supabase.from('product').select('*').order('product_code'),
        supabase.from('pack_format').select('*').order('pack_format_code'),
        supabase.from('media_compatibility_spec').select('*').order('base_medium_code'),
        supabase.from('cm_process_method').select('*').order('name'),
        supabase.from('qc_test_type').select('*').eq('is_active', true).order('name'),
      ]);
      const infRes = await (supabase.from as any)('infection_type').select('*').order('name');
      const sdsRes = await (supabase.from as any)('sds_component').select('*').order('component_name');
      const baseMediaRes = await (supabase.from as any)('base_media').select('*').order('name');
      const additivesRes = await (supabase.from as any)('media_additive').select('*').order('name');
      const specAddRes = await (supabase.from as any)('media_spec_additives').select('*');
      setInfectionTypes(infRes.data || []);
      setSdsComponents(sdsRes.data || []);
      setBaseMediaList(baseMediaRes.data || []);
      setMediaAdditives(additivesRes.data || []);
      setSpecAdditives(specAddRes.data || []);
      
      setUsers(usersRes.data || []);
      setCellTypes(ctRes.data || []);
      setProducts(prodRes.data as any || []);
      setPackFormats(pfRes.data || []);
      setMediaSpecs(msRes.data || []);
      setProcessMethods(pmRes.data as any || []);
      setQcTestTypes(qcRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    await supabase.from('app_user').update({ role: newRole }).eq('user_id', userId);
    loadData();
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    await supabase.from('app_user').update({ is_active: !isActive }).eq('user_id', userId);
    loadData();
  }

  // Функция для формирования frozen_spec продукта
  function buildFrozenSpec(productData: any): any {
    const mediaSpecId = productData.media_spec_id;
    const mediaSpec = mediaSpecs.find(ms => ms.media_spec_id === mediaSpecId);
    const packFormatCode = productData.default_pack_format_code;
    const packFormat = packFormats.find(pf => pf.pack_format_code === packFormatCode);
    
    // Собираем данные о среде
    let mediaData: any = null;
    if (mediaSpec) {
      const baseMedia = baseMediaList.find(b => b.base_media_id === (mediaSpec as any).base_media_id);
      const linkedAdditives = specAdditives
        .filter(sa => sa.media_spec_id === mediaSpec.media_spec_id)
        .map(sa => {
          const additive = mediaAdditives.find(a => a.additive_id === sa.additive_id);
          return additive ? {
            code: additive.code,
            name: additive.name,
            concentration: sa.concentration ?? additive.default_concentration,
            unit: additive.unit,
            type: additive.additive_type,
          } : null;
        })
        .filter(Boolean);
      
      mediaData = {
        media_spec_id: mediaSpec.media_spec_id,
        name: (mediaSpec as any).name,
        base_media: baseMedia ? {
          code: baseMedia.code,
          name: baseMedia.name,
          phenol_red: baseMedia.phenol_red_flag,
        } : null,
        serum_class: mediaSpec.serum_class,
        l_glutamine_mm: (mediaSpec as any).l_glutamine_mm,
        additives: linkedAdditives,
      };
    }
    
    // Собираем данные о упаковке
    let packData: any = null;
    if (packFormat) {
      packData = {
        code: packFormat.pack_format_code,
        name: packFormat.name,
        volume_ml: packFormat.nominal_fill_volume_ml,
        purpose: (packFormat as any).purpose,
      };
    }
    
    // Обогащаем QC-тесты полной информацией из справочника
    const enrichQcTests = (codes: any[]): any[] => {
      if (!codes || !Array.isArray(codes)) return [];
      return codes.map(item => {
        const code = typeof item === 'string' ? item : (item.code || item.test_type);
        const testType = qcTestTypes.find(t => t.code === code);
        return testType ? {
          code: testType.code,
          name: testType.name,
          unit: testType.unit,
          norm_min: testType.norm_min,
          norm_max: testType.norm_max,
          method: testType.method,
        } : { code };
      });
    };
    
    // Обогащаем методы процессинга полной информацией из справочника
    const enrichProcessMethods = (codes: any[]): any[] => {
      if (!codes || !Array.isArray(codes)) return [];
      return codes.map((item, idx) => {
        const code = typeof item === 'string' ? item : (item.code || item.method_id);
        const method = processMethods.find(m => m.code === code || m.method_id === code);
        return method ? {
          method_id: method.method_id,
          code: method.code,
          name: method.name,
          method_type: method.method_type,
          sequence: idx + 1,
        } : { code, sequence: idx + 1 };
      });
    };
    
    return {
      product_code: productData.product_code,
      product_name: productData.product_name,
      product_type: productData.product_type,
      media: mediaData,
      pack_format: packData,
      processing: {
        raw: enrichProcessMethods(productData.default_raw_processing || []),
        pre: enrichProcessMethods(productData.default_pre_methods || []),
        post: enrichProcessMethods(productData.default_postprocess_methods || []),
      },
      qc: {
        raw: enrichQcTests(productData.default_primary_qc || []),
        product: enrichQcTests(productData.default_product_qc || []),
      },
      shelf_life_days: productData.shelf_life_days_default,
      frozen_at: new Date().toISOString(),
    };
  }

  async function handleSave(table: string, pkField: string, pkValue: string, data: any) {
    // Очистка пустых строк в UUID-полях (заменяем на null)
    const cleanedData = { ...data };
    const uuidFields = ['media_spec_id', 'cell_type_id', 'base_media_id', 'additive_id', 'method_id', 'infection_type_id', 'sds_component_id'];
    uuidFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null;
      }
    });
    
    // Формирование frozen_spec для продукта
    if (table === 'product') {
      cleanedData.frozen_spec = buildFrozenSpec(cleanedData);
    }
    
    // Автоматическое создание SDS для base_media и media_additive
    if (!editingId && (table === 'base_media' || table === 'media_additive') && !cleanedData.sds_component_id) {
      const { data: sdsData, error: sdsError } = await supabase.from('sds_component').insert({
        component_name: cleanedData.name || cleanedData.code,
        cas_number: 'N/A',
        physical_state: table === 'base_media' ? 'Liquid' : 'Solution',
        storage_conditions: 'Store at 2-8°C',
        safe_handling: 'Handle with standard laboratory precautions. For laboratory use only.',
        hazard_classification: 'Not classified as hazardous'
      }).select('sds_component_id').single();
      
      if (!sdsError && sdsData) {
        cleanedData.sds_component_id = sdsData.sds_component_id;
      }
    }
    
    if (editingId) {
      await (supabase.from(table as any) as any).update(cleanedData).eq(pkField, pkValue);
    } else {
      await (supabase.from(table as any) as any).insert({ ...cleanedData, [pkField]: pkValue });
    }
    setEditingId(null);
    setShowAddForm(false);
    setFormData({});
    loadData();
  }

  async function handleDelete(table: string, pkField: string, pkValue: string) {
    const ok = await showConfirm('Архивировать запись?', { description: 'Запись можно будет восстановить из архива.' }); if (!ok) return;
    // Soft-delete: set archived_at instead of deleting
    await (supabase.from(table as any) as any).update({ archived_at: new Date().toISOString() }).eq(pkField, pkValue);
    loadData();
  }
  
  async function handleRestore(table: string, pkField: string, pkValue: string) {
    await (supabase.from(table as any) as any).update({ archived_at: null }).eq(pkField, pkValue);
    loadData();
  }

  // Drag and drop для методов препроцессинга (до розлива)
  function movePreMethod(index: number, direction: 'up' | 'down') {
    const arr = [...(formData.default_pre_methods || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arr.length) return;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    arr.forEach((m, i) => m.order = i + 1);
    setFormData({ ...formData, default_pre_methods: arr });
  }

  // Drag and drop для методов постпроцессинга (после розлива)
  function moveMethod(index: number, direction: 'up' | 'down') {
    const arr = [...(formData.default_postprocess_methods || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arr.length) return;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    arr.forEach((m, i) => m.order = i + 1);
    setFormData({ ...formData, default_postprocess_methods: arr });
  }

  // Drag and drop для методов процессинга сырья
  function moveRawMethod(index: number, direction: 'up' | 'down') {
    const arr = [...(formData.default_raw_processing || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arr.length) return;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    arr.forEach((m, i) => m.order = i + 1);
    setFormData({ ...formData, default_raw_processing: arr });
  }

  if (!hasRole(['Admin'])) {
    return <div className="text-center py-8 text-red-500">Доступ запрещен</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Администрирование</h1>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Tab); setShowAddForm(false); setEditingId(null); }}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="cellTypes">Типы клеток</TabsTrigger>
          <TabsTrigger value="products">Продукты</TabsTrigger>
          <TabsTrigger value="packFormats">Форматы упаковки</TabsTrigger>
          <TabsTrigger value="mediaManagement">Управление средами</TabsTrigger>
          <TabsTrigger value="processMethods">Методы обработки</TabsTrigger>
          <TabsTrigger value="qcTests">QC тесты</TabsTrigger>
          <TabsTrigger value="infections">Инфекции</TabsTrigger>
          <TabsTrigger value="dataCleanup">Управление данными</TabsTrigger>
        </TabsList>

      {/* Users Tab */}
      <TabsContent value="users">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={20} />
              Пользователи ({users.length})
            </h3>
          </div>
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Email" field="email" sort={sortUsers} onSort={toggleSortUsers} className="text-left" />
                <SortableHeader label="ФИО" field="full_name" sort={sortUsers} onSort={toggleSortUsers} className="text-left" />
                <SortableHeader label="Роль" field="role" sort={sortUsers} onSort={toggleSortUsers} className="text-left" />
                <SortableHeader label="Активен" field="is_active" sort={sortUsers} onSort={toggleSortUsers} className="text-center" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(users, sortUsers, (u, f) => (u as any)[f]).map((u) => (
                <tr key={u.user_id}>
                  <td className="px-4 py-2 font-mono text-sm">{u.email}</td>
                  <td className="px-4 py-2">{u.full_name || '-'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.user_id, e.target.value)}
                      className="px-2 py-1 border border-input bg-background text-foreground rounded text-sm"
                    >
                      {['Production', 'QC', 'QA', 'Manager', 'Admin'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Badge variant={u.is_active ? 'success' : 'destructive'}>
                      {u.is_active ? 'Да' : 'Нет'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button variant="link" size="sm"
                      onClick={() => toggleUserActive(u.user_id, u.is_active || false)}
                    >
                      {u.is_active ? 'Деактивировать' : 'Активировать'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Cell Types */}
      <TabsContent value="cellTypes">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Типы клеток ({cellTypes.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setFormData({ cell_type_code: '', name: '', description: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormField label="Код" required tooltip="Уникальный код типа клеток (например, MSC, Fibroblast)">
                  <Input value={formData.cell_type_code || ''} onChange={e => setFormData({...formData, cell_type_code: e.target.value})} />
                </FormField>
                <FormField label="Название" required tooltip="Полное наименование типа клеток">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Описание" tooltip="Дополнительная информация о типе клеток">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('cell_type', 'cell_type_code', formData.cell_type_code, formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="cell_type_code" sort={sortCellTypes} onSort={toggleSortCellTypes} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortCellTypes} onSort={toggleSortCellTypes} className="text-left" />
                <SortableHeader label="Описание" field="description" sort={sortCellTypes} onSort={toggleSortCellTypes} className="text-left" />
                <SortableHeader label="Активен" field="is_active" sort={sortCellTypes} onSort={toggleSortCellTypes} className="text-center" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(cellTypes, sortCellTypes, (ct, f) => (ct as any)[f]).map((ct) => (
                <tr key={ct.cell_type_code}>
                  <td className="px-4 py-2 font-mono">{ct.cell_type_code}</td>
                  <td className="px-4 py-2">{ct.name}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{ct.description || '-'}</td>
                  <td className="px-4 py-2 text-center">{ct.is_active ? 'Да' : '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(ct.cell_type_code); setShowAddForm(true); setFormData({ ...ct }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('cell_type', 'cell_type_code', ct.cell_type_code)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Products - Enhanced Form */}
      <TabsContent value="products">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold">Продукты ({products.filter(p => showArchivedProducts || !p.archived_at).length})</h3>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={showArchivedProducts} onChange={e => setShowArchivedProducts(e.target.checked)} className="rounded" />
                Показать архив
              </label>
            </div>
            <Button variant="default" size="sm" onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setFormData({
                product_code: '',
                product_name: '',
                product_type: 'BaseBulk',
                shelf_life_days_default: 365,
                media_spec_id: '',
                default_primary_qc: [],
                default_raw_processing: [],
                default_postprocess_methods: [],
                default_product_qc: [],
                is_active: true
              });
            }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-6">
              {/* Основные поля */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <FormField label="Код продукта" required tooltip="Уникальный код для идентификации продукта">
                  <Input
                    value={formData.product_code || ''}
                    onChange={e => setFormData({...formData, product_code: e.target.value})}
                    disabled={!!editingId}
                  />
                </FormField>
                <FormField label="Название" required tooltip="Полное наименование продукта">
                  <Input value={formData.product_name || ''} onChange={e => setFormData({...formData, product_name: e.target.value})} />
                </FormField>
                <FormField label="Тип" required tooltip="Сток - промежуточное сырье, Продукт - готовая продукция">
                  <select value={formData.product_type || 'BaseBulk'} onChange={e => setFormData({...formData, product_type: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="BaseBulk">Сток</option>
                    <option value="Finished">Продукт</option>
                  </select>
                </FormField>
                <FormField label="Срок годности (дней)" tooltip="Стандартный срок годности после QA одобрения">
                  <Input type="number" value={formData.shelf_life_days_default || ''} onChange={e => setFormData({...formData, shelf_life_days_default: Number(e.target.value)})} />
                </FormField>
                <FormField label="Спецификация среды" tooltip="Требования к культуральной среде">
                  <select value={formData.media_spec_id || ''} onChange={e => setFormData({...formData, media_spec_id: e.target.value || null})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="">Не выбрана</option>
                    {mediaSpecs.map(ms => (
                        <option key={ms.media_spec_id} value={ms.media_spec_id}>
                          {(ms as any).display_name || ms.name || '-'}
                        </option>
                    ))}
                  </select>
                  {formData.media_spec_id && (() => {
                    const selectedSpec = mediaSpecs.find(m => m.media_spec_id === formData.media_spec_id);
                    if (!selectedSpec) return null;
                    const bm = baseMediaList.find(b => b.base_media_id === selectedSpec.base_media_id);
                    const linkedAdditives = specAdditives
                      .filter(sa => sa.media_spec_id === selectedSpec.media_spec_id)
                      .map(sa => {
                        const additive = mediaAdditives.find(a => a.additive_id === sa.additive_id);
                        return additive ? `${additive.name} ${sa.concentration || ''}${additive.unit || ''}` : null;
                      })
                      .filter(Boolean);
                    return (
                      <div className="mt-2 p-3 bg-muted rounded border text-xs space-y-1">
                        <div className="font-medium text-foreground">📋 Детали спецификации:</div>
                        <div><span className="text-muted-foreground">Базовая среда:</span> {bm?.name || bm?.code || '-'}</div>
                        <div><span className="text-muted-foreground">Класс сыворотки:</span> {selectedSpec.serum_class}</div>
                        <div><span className="text-muted-foreground">Феноловый красный:</span> {selectedSpec.phenol_red_flag ? '✅ Да' : '❌ Нет'}</div>
                        {linkedAdditives.length > 0 && (
                          <div><span className="text-muted-foreground">Добавки:</span> {linkedAdditives.join(', ')}</div>
                        )}
                        {selectedSpec.notes && <div><span className="text-muted-foreground">Примечания:</span> {selectedSpec.notes}</div>}
                      </div>
                    );
                  })()}
                </FormField>
              </div>
              
              {/* Дополнительные поля */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Формат упаковки по умолчанию" tooltip="Если выбран - фиксируется на всех циклах">
                  <select value={formData.default_pack_format_code || ''} onChange={e => setFormData({...formData, default_pack_format_code: e.target.value || null})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="">Не выбран (менеджер выбирает)</option>
                    {packFormats.map(pf => (
                      <option key={pf.pack_format_code} value={pf.pack_format_code}>{pf.name} ({pf.nominal_fill_volume_ml} мл)</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Описание" tooltip="Краткое описание продукта">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
                <FormField label="Механизм действия" tooltip="Описание механизма действия продукта">
                  <Input value={formData.mechanism_of_action || ''} onChange={e => setFormData({...formData, mechanism_of_action: e.target.value})} />
                </FormField>
              </div>
              
              {/* Группа 1: Сырьё (QC первичный + Процессинг сырья) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* QC первичный - из справочника */}
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  QC первичный (для CM Lot)
                  <Tooltip text="Тесты контроля качества, применяемые к промежуточному продукту CM" />
                </h4>
                <div className="space-y-2">
                  {qcTestTypes.map(test => {
                    const isSelected = (formData.default_primary_qc || []).some((t: any) => t.code === test.code);
                    const selectedTest = (formData.default_primary_qc || []).find((t: any) => t.code === test.code);
                    return (
                      <div key={test.code} className={`p-3 rounded border ${isSelected ? 'bg-card border-blue-300' : 'bg-muted border-border'}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const arr = formData.default_primary_qc || [];
                              if (e.target.checked) {
                                setFormData({...formData, default_primary_qc: [...arr, { 
                                  code: test.code, 
                                  name: test.name,
                                  unit: test.unit,
                                  norm_min: test.norm_min,
                                  norm_max: test.norm_max,
                                  method: test.method
                                }]});
                              } else {
                                setFormData({...formData, default_primary_qc: arr.filter((t: any) => t.code !== test.code)});
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{test.name}</span>
                              <span className="text-xs text-muted-foreground">({test.code})</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <span>Ед.: <strong>{test.unit || '-'}</strong></span>
                              <span>Мин: <strong>{test.norm_min || '-'}</strong></span>
                              <span>Макс: <strong>{test.norm_max || '-'}</strong></span>
                              <span>Метод: <strong>{test.method || '-'}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Процессинг сырья - с порядком и drag-drop */}
              <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                  Процессинг сырья
                  <Tooltip text="Методы обработки сырья в порядке выполнения до основного процессинга" />
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-purple-700 mb-2">Доступные методы:</p>
                    <div className="space-y-1">
                      {processMethods.filter(pm => pm.is_active && !(formData.default_raw_processing || []).some((m: any) => m.method_id === pm.method_id)).map(pm => (
                        <button
                          key={pm.method_id}
                          onClick={() => {
                            const arr = formData.default_raw_processing || [];
                            setFormData({...formData, default_raw_processing: [...arr, { 
                              method_id: pm.method_id, 
                              name: pm.name, 
                              cycles: 1,
                              order: arr.length + 1
                            }]});
                          }}
                          className="w-full text-left px-3 py-2 bg-card border rounded hover:bg-purple-100 text-sm flex items-center justify-between"
                        >
                          <span>{pm.name}</span>
                          <Plus size={14} className="text-purple-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 mb-2">Выбранные (в порядке выполнения):</p>
                    <div className="space-y-1">
                      {(formData.default_raw_processing || []).map((m: any, i: number) => (
                        <div key={m.method_id} className="flex items-center gap-2 px-3 py-2 bg-card border rounded">
                          <div className="flex flex-col">
                            <button 
                              onClick={() => moveRawMethod(i, 'up')} 
                              disabled={i === 0}
                              className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            >
                              <GripVertical size={12} />
                            </button>
                            <button 
                              onClick={() => moveRawMethod(i, 'down')} 
                              disabled={i === (formData.default_raw_processing || []).length - 1}
                              className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            >
                              <GripVertical size={12} />
                            </button>
                          </div>
                          <span className="text-sm font-medium w-6 text-purple-600">{i + 1}.</span>
                          <span className="flex-1 text-sm">{m.name}</span>
                          <input
                            type="number"
                            min="1"
                            value={m.cycles || 1}
                            onChange={e => {
                              const arr = [...formData.default_raw_processing];
                              arr[i] = { ...arr[i], cycles: Number(e.target.value) };
                              setFormData({...formData, default_raw_processing: arr});
                            }}
                            className="w-12 px-1 py-0.5 border border-input bg-background text-foreground rounded text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">цикл.</span>
                          <button
                            onClick={() => {
                              const arr = formData.default_raw_processing.filter((_: any, idx: number) => idx !== i);
                              arr.forEach((m: any, idx: number) => m.order = idx + 1);
                              setFormData({...formData, default_raw_processing: arr});
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(formData.default_raw_processing || []).length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Нет выбранных методов</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Группа 2: Продукт (Постпроцессинг + QC продукта) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Постпроцессинг - с порядком и drag-drop */}
              <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                <h4 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                  Методы постпроцессинга
                  <Tooltip text="Методы обработки CM в порядке выполнения. Перетаскивайте для изменения порядка" />
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Доступные методы */}
                  <div>
                    <p className="text-sm text-amber-700 mb-2">Доступные методы:</p>
                    <div className="space-y-1">
                      {processMethods.filter(pm => pm.is_active && !(formData.default_postprocess_methods || []).some((m: any) => m.method_id === pm.method_id)).map(pm => (
                        <button
                          key={pm.method_id}
                          onClick={() => {
                            const arr = formData.default_postprocess_methods || [];
                            setFormData({...formData, default_postprocess_methods: [...arr, { 
                              method_id: pm.method_id, 
                              name: pm.name, 
                              cycles: 1,
                              order: arr.length + 1
                            }]});
                          }}
                          className="w-full text-left px-3 py-2 bg-card border rounded hover:bg-amber-100 text-sm flex items-center justify-between"
                        >
                          <span>{pm.name}</span>
                          <Plus size={14} className="text-amber-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Выбранные методы с порядком */}
                  <div>
                    <p className="text-sm text-amber-700 mb-2">Выбранные (в порядке выполнения):</p>
                    <div className="space-y-1">
                      {(formData.default_postprocess_methods || []).map((m: any, i: number) => (
                        <div key={m.method_id} className="flex items-center gap-2 px-3 py-2 bg-card border rounded">
                          <div className="flex flex-col">
                            <button 
                              onClick={() => moveMethod(i, 'up')} 
                              disabled={i === 0}
                              className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            >
                              <GripVertical size={12} />
                            </button>
                            <button 
                              onClick={() => moveMethod(i, 'down')} 
                              disabled={i === (formData.default_postprocess_methods || []).length - 1}
                              className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            >
                              <GripVertical size={12} />
                            </button>
                          </div>
                          <span className="text-sm font-medium w-6 text-amber-600">{i + 1}.</span>
                          <span className="flex-1 text-sm">{m.name}</span>
                          <input
                            type="number"
                            min="1"
                            value={m.cycles || 1}
                            onChange={e => {
                              const arr = [...formData.default_postprocess_methods];
                              arr[i] = { ...arr[i], cycles: Number(e.target.value) };
                              setFormData({...formData, default_postprocess_methods: arr});
                            }}
                            className="w-12 px-1 py-0.5 border border-input bg-background text-foreground rounded text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">цикл.</span>
                          <button
                            onClick={() => {
                              const arr = formData.default_postprocess_methods.filter((_: any, idx: number) => idx !== i);
                              arr.forEach((m: any, idx: number) => m.order = idx + 1);
                              setFormData({...formData, default_postprocess_methods: arr});
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(formData.default_postprocess_methods || []).length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Нет выбранных методов</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* QC на продукт - из справочника + количество на тестирование */}
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                  QC на готовый продукт
                  <Tooltip text="Тесты для готовой продукции. Укажите количество (мл) для отбора на тестирование" />
                </h4>
                <div className="space-y-2">
                  {qcTestTypes.map(test => {
                    const isSelected = (formData.default_product_qc || []).some((t: any) => t.code === test.code);
                    const selectedTest = (formData.default_product_qc || []).find((t: any) => t.code === test.code);
                    return (
                      <div key={test.code} className={`p-3 rounded border ${isSelected ? 'bg-card border-green-300' : 'bg-muted border-border'}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const arr = formData.default_product_qc || [];
                              if (e.target.checked) {
                                setFormData({...formData, default_product_qc: [...arr, { 
                                  code: test.code, 
                                  name: test.name,
                                  unit: test.unit,
                                  norm_min: test.norm_min,
                                  norm_max: test.norm_max,
                                  method: test.method,
                                  sample_volume_ml: 1
                                }]});
                              } else {
                                setFormData({...formData, default_product_qc: arr.filter((t: any) => t.code !== test.code)});
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{test.name}</span>
                              <span className="text-xs text-muted-foreground">({test.code})</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <span>Ед.: <strong>{test.unit || '-'}</strong></span>
                              <span>Мин: <strong>{test.norm_min || '-'}</strong></span>
                              <span>Макс: <strong>{test.norm_max || '-'}</strong></span>
                              <span>Метод: <strong>{test.method || '-'}</strong></span>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-green-700">Кол-во на тест (мл):</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={selectedTest?.sample_volume_ml || 1}
                                  onChange={e => {
                                    const arr = [...(formData.default_product_qc || [])];
                                    const idx = arr.findIndex((t: any) => t.code === test.code);
                                    if (idx >= 0) {
                                      arr[idx] = { ...arr[idx], sample_volume_ml: Number(e.target.value) };
                                      setFormData({...formData, default_product_qc: arr});
                                    }
                                  }}
                                  className="w-20 px-2 py-1 border border-input bg-background text-foreground rounded text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>

              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => { handleSave('product', 'product_code', formData.product_code, formData); }}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="product_code" sort={sortProducts} onSort={toggleSortProducts} className="text-left" />
                <SortableHeader label="Название" field="product_name" sort={sortProducts} onSort={toggleSortProducts} className="text-left" />
                <SortableHeader label="Тип" field="product_type" sort={sortProducts} onSort={toggleSortProducts} className="text-left" />
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Спец. среды</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">QC первичн.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Проц. сырья</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Постпроц.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">QC продукт</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(products.filter(p => showArchivedProducts || !p.archived_at), sortProducts, (p, f) => (p as any)[f]).map((p) => (
                <tr key={p.product_code}>
                  <td className="px-4 py-2 font-mono">{p.product_code}</td>
                  <td className="px-4 py-2">{p.product_name}</td>
                  <td className="px-4 py-2 text-sm">
                    <Badge variant={p.product_type === 'BaseBulk' ? 'info' : 'success'}>
                      {PRODUCT_TYPE_LABELS[p.product_type] || p.product_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {p.media_spec_id ? (mediaSpecs.find(m => m.media_spec_id === p.media_spec_id)?.name || '-') : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {Array.isArray(p.default_primary_qc) && p.default_primary_qc.length > 0 
                      ? [...(p.default_primary_qc as any[])].sort((a, b) => ((typeof a === 'string' ? a : a.name || a.code) || '').localeCompare((typeof b === 'string' ? b : b.name || b.code) || '', 'ru')).map(t => typeof t === 'string' ? t : t.name || t.code).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {Array.isArray(p.default_raw_processing) && p.default_raw_processing.length > 0 
                      ? (p.default_raw_processing as any[]).map((m, i) => `${i+1}.${m.name}`).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {Array.isArray(p.default_postprocess_methods) && p.default_postprocess_methods.length > 0 
                      ? (p.default_postprocess_methods as any[]).map((m, i) => `${i+1}.${m.name}`).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {Array.isArray(p.default_product_qc) && p.default_product_qc.length > 0 
                      ? [...(p.default_product_qc as any[])].sort((a, b) => ((typeof a === 'string' ? a : a.name || a.code) || '').localeCompare((typeof b === 'string' ? b : b.name || b.code) || '', 'ru')).map(t => typeof t === 'string' ? t : t.name || t.code).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon"
                      onClick={() => {
                        setEditingId(p.product_code);
                        setShowAddForm(true);
                        setFormData({
                          ...p,
                          default_primary_qc: p.default_primary_qc || [],
                          default_raw_processing: (p as any).default_raw_processing || [],
                          default_postprocess_methods: p.default_postprocess_methods || [],
                          default_product_qc: p.default_product_qc || []
                        });
                      }}
                      title="Редактировать"
                    >
                      <Edit2 size={16}/>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-800"
                      onClick={() => generateSDSPdf(p, mediaSpecs, sdsComponents)}
                      title="Скачать SDS"
                    >
                      <FileText size={16}/>
                    </Button>
                    {p.archived_at ? (
                      <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-800" onClick={() => handleRestore('product', 'product_code', p.product_code)} title="Восстановить">Восстановить</Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('product', 'product_code', p.product_code)} title="Архивировать"><Trash2 size={16}/></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Pack Formats */}
      <TabsContent value="packFormats">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Форматы упаковки ({packFormats.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setFormData({ pack_format_code: '', name: '', nominal_fill_volume_ml: 1, container_type: 'Vial', purpose: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Код" required tooltip="Уникальный код формата (например, V4, V10, B250)">
                  <Input value={formData.pack_format_code || ''} onChange={e => setFormData({...formData, pack_format_code: e.target.value})} />
                </FormField>
                <FormField label="Название" required tooltip="Описательное название формата">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Объем (мл)" required tooltip="Номинальный объем заполнения">
                  <Input type="number" step="0.1" value={formData.nominal_fill_volume_ml || ''} onChange={e => setFormData({...formData, nominal_fill_volume_ml: Number(e.target.value)})} />
                </FormField>
                <FormField label="Тип контейнера" tooltip="Тип физического контейнера">
                  <Input value={formData.container_type || ''} onChange={e => setFormData({...formData, container_type: e.target.value})} />
                </FormField>
                <FormField label="Назначение" required tooltip="Сырьё / Продукт">
                  <select value={formData.purpose || ''} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="">Выберите</option>
                    <option value="raw">Сырьё</option>
                    <option value="product">Продукт</option>
                  </select>
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('pack_format', 'pack_format_code', formData.pack_format_code, formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="pack_format_code" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-left" />
                <SortableHeader label="Объем (мл)" field="nominal_fill_volume_ml" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-right" />
                <SortableHeader label="Тип контейнера" field="container_type" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-left" />
                <SortableHeader label="Назначение" field="purpose" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-left" />
                <SortableHeader label="Активен" field="is_active" sort={sortPackFormats} onSort={toggleSortPackFormats} className="text-center" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(packFormats, sortPackFormats, (pf, f) => (pf as any)[f]).map((pf) => (
                <tr key={pf.pack_format_code}>
                  <td className="px-4 py-2 font-mono">{pf.pack_format_code}</td>
                  <td className="px-4 py-2">{pf.name}</td>
                  <td className="px-4 py-2 text-right">{pf.nominal_fill_volume_ml}</td>
                  <td className="px-4 py-2 text-sm">{pf.container_type || '-'}</td>
                  <td className="px-4 py-2 text-sm">{(pf as any).purpose === 'raw' ? 'Сырьё' : (pf as any).purpose === 'product' ? 'Продукт' : '-'}</td>
                  <td className="px-4 py-2 text-center">{pf.is_active ? 'Да' : '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(pf.pack_format_code); setShowAddForm(true); setFormData({ ...pf }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('pack_format', 'pack_format_code', pf.pack_format_code)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Media Management Section */}
      <TabsContent value="mediaManagement">
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 border-b pb-2">
            {[
              { id: 'baseMedia', label: 'Базовые среды' },
              { id: 'additives', label: 'Добавки' },
              { id: 'specs', label: 'Спецификации' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => { setMediaSubTab(st.id as MediaSubTab); setShowAddForm(false); setEditingId(null); }}
                className={`px-4 py-2 text-sm rounded-t ${
                  mediaSubTab === st.id ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Base Media Sub-tab */}
          {mediaSubTab === 'baseMedia' && (
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Beaker size={20} />
              Базовые среды ({baseMediaList.length})
            </h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ code: '', name: '', phenol_red_flag: true, description: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Код" required tooltip="Уникальный код среды (DMEM-HG, RPMI, etc.)">
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingId} />
                </FormField>
                <FormField label="Название" required tooltip="Полное название среды">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Фенол. красный" tooltip="Содержит ли среда индикатор pH">
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input type="checkbox" checked={formData.phenol_red_flag ?? true} onChange={e => setFormData({...formData, phenol_red_flag: e.target.checked})} />
                    Да
                  </label>
                </FormField>
                <FormField label="Описание" tooltip="Дополнительная информация">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('base_media', 'base_media_id', editingId || crypto.randomUUID(), formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="code" sort={sortBaseMedia} onSort={toggleSortBaseMedia} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortBaseMedia} onSort={toggleSortBaseMedia} className="text-left" />
                <SortableHeader label="Фенол. красный" field="phenol_red_flag" sort={sortBaseMedia} onSort={toggleSortBaseMedia} className="text-center" />
                <SortableHeader label="Описание" field="description" sort={sortBaseMedia} onSort={toggleSortBaseMedia} className="text-left" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(baseMediaList, sortBaseMedia, (bm, f) => (bm as any)[f]).map((bm) => (
                <tr key={bm.base_media_id}>
                  <td className="px-4 py-2 font-mono">{bm.code}</td>
                  <td className="px-4 py-2">{bm.name}</td>
                  <td className="px-4 py-2 text-center">{bm.phenol_red_flag ? 'Да' : 'Нет'}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{bm.description || '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" className="text-purple-600 hover:text-purple-800"
                      onClick={async () => {
                        const existingSds = sdsComponents.find((s: any) => s.sds_component_id === (bm as any).sds_component_id);
                        setSdsModal({
                          open: true,
                          entityType: 'base_media',
                          entityId: bm.base_media_id,
                          entityName: bm.name,
                          sdsData: existingSds || {}
                        });
                      }}
                      title="SDS"
                    >
                      <FileText size={16}/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(bm.base_media_id); setShowAddForm(true); setFormData({ ...bm }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('base_media', 'base_media_id', bm.base_media_id)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
          )}

          {/* Additives Sub-tab */}
          {mediaSubTab === 'additives' && (
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FlaskConical size={20} />
              Добавки к среде ({mediaAdditives.length})
            </h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ code: '', name: '', default_concentration: null, unit: '%', additive_type: 'supplement', description: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <FormField label="Код" required tooltip="Уникальный код добавки">
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingId} />
                </FormField>
                <FormField label="Название" required tooltip="Полное название добавки">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Концентр. по умолч." tooltip="Стандартная концентрация">
                  <Input type="number" step="0.01" value={formData.default_concentration ?? ''} onChange={e => setFormData({...formData, default_concentration: e.target.value ? Number(e.target.value) : null})} />
                </FormField>
                <FormField label="Ед. изм." tooltip="Единица измерения">
                  <select value={formData.unit || '%'} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="%">%</option>
                    <option value="mM">mM</option>
                    <option value="ug/mL">ug/mL</option>
                    <option value="U/mL">U/mL</option>
                  </select>
                </FormField>
                <FormField label="Тип" tooltip="Категория добавки">
                  <select value={formData.additive_type || 'supplement'} onChange={e => setFormData({...formData, additive_type: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="serum">Сыворотка</option>
                    <option value="supplement">Добавка</option>
                    <option value="antibiotic">Антибиотик</option>
                    <option value="growth_factor">Фактор роста</option>
                  </select>
                </FormField>
                <FormField label="Описание" tooltip="Дополнительная информация">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('media_additive', 'additive_id', editingId || crypto.randomUUID(), formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="code" sort={sortAdditives} onSort={toggleSortAdditives} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortAdditives} onSort={toggleSortAdditives} className="text-left" />
                <SortableHeader label="Концентр." field="default_concentration" sort={sortAdditives} onSort={toggleSortAdditives} className="text-right" />
                <SortableHeader label="Ед." field="unit" sort={sortAdditives} onSort={toggleSortAdditives} className="text-left" />
                <SortableHeader label="Тип" field="additive_type" sort={sortAdditives} onSort={toggleSortAdditives} className="text-left" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(mediaAdditives, sortAdditives, (ma, f) => (ma as any)[f]).map((ma) => (
                <tr key={ma.additive_id}>
                  <td className="px-4 py-2 font-mono">{ma.code}</td>
                  <td className="px-4 py-2">{ma.name}</td>
                  <td className="px-4 py-2 text-right">{ma.default_concentration ?? '-'}</td>
                  <td className="px-4 py-2 text-sm">{ma.unit}</td>
                  <td className="px-4 py-2 text-sm">
                    <Badge variant={
                      ma.additive_type === 'serum' ? 'warning' :
                      ma.additive_type === 'antibiotic' ? 'destructive' :
                      ma.additive_type === 'growth_factor' ? 'secondary' :
                      'info'
                    }>
                      {ma.additive_type === 'serum' ? 'Сыворотка' :
                       ma.additive_type === 'antibiotic' ? 'Антибиотик' :
                       ma.additive_type === 'growth_factor' ? 'Фактор роста' : 'Добавка'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" className="text-purple-600 hover:text-purple-800"
                      onClick={async () => {
                        const existingSds = sdsComponents.find((s: any) => s.sds_component_id === (ma as any).sds_component_id);
                        setSdsModal({
                          open: true,
                          entityType: 'additive',
                          entityId: ma.additive_id,
                          entityName: ma.name,
                          sdsData: existingSds || {}
                        });
                      }}
                      title="SDS"
                    >
                      <FileText size={16}/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(ma.additive_id); setShowAddForm(true); setFormData({ ...ma }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('media_additive', 'additive_id', ma.additive_id)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
          )}

          {/* Specs Sub-tab */}
          {mediaSubTab === 'specs' && (
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Спецификации среды ({mediaSpecs.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ name: '', description: '', serum_class: 'SerumFree', phenol_red_flag: false, notes: '', base_media_id: '', additives: [] }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Базовая среда" required tooltip="Выберите базовую культуральную среду">
                  <select 
                    value={formData.base_media_id || ''} 
                    onChange={e => {
                      const bm = baseMediaList.find(b => b.base_media_id === e.target.value);
                      setFormData({
                        ...formData, 
                        base_media_id: e.target.value,
                        phenol_red_flag: bm?.phenol_red_flag ?? formData.phenol_red_flag
                      });
                    }} 
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg"
                  >
                    <option value="">Выберите среду</option>
                    {baseMediaList.filter(b => b.is_active).map(bm => (
                      <option key={bm.base_media_id} value={bm.base_media_id}>{bm.name} ({bm.code})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Название" required tooltip="Название спецификации среды">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Например: DMEM + 10% FBS" />
                </FormField>
                <FormField label="Описание" tooltip="Краткое описание спецификации">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Описание назначения" />
                </FormField>
                <FormField label="Класс сыворотки" tooltip="Тип сыворотки в среде">
                  <select value={formData.serum_class || 'SerumFree'} onChange={e => setFormData({...formData, serum_class: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="SerumFree">SerumFree</option>
                    <option value="FBS">FBS</option>
                    <option value="PRP">PRP</option>
                  </select>
                </FormField>
                <FormField label="Примечания" tooltip="Дополнительная информация">
                  <Input value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </FormField>
              </div>

              {/* Добавки */}
              <div className="p-4 border border-teal-200 rounded-lg bg-teal-50">
                <h4 className="font-medium text-teal-800 mb-3 flex items-center gap-2">
                  <FlaskConical size={16} />
                  Добавки к среде
                  <Tooltip text="Выберите добавки и укажите концентрацию для каждой" />
                </h4>
                <div className="space-y-2">
                  {mediaAdditives.filter(a => a.is_active).map(additive => {
                    const selectedAdditive = (formData.additives || []).find((a: any) => a.additive_id === additive.additive_id);
                    const isSelected = !!selectedAdditive;
                    return (
                      <div key={additive.additive_id} className={`p-3 rounded border ${isSelected ? 'bg-card border-teal-300' : 'bg-muted border-border'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              const arr = formData.additives || [];
                              let newAdditives: any[];
                              if (e.target.checked) {
                                newAdditives = [...arr, { 
                                  additive_id: additive.additive_id, 
                                  name: additive.name,
                                  code: additive.code,
                                  concentration: additive.default_concentration,
                                  unit: additive.unit
                                }];
                              } else {
                                newAdditives = arr.filter((a: any) => a.additive_id !== additive.additive_id);
                              }
                              // Auto-detect serum class based on additives
                              const codes = newAdditives.map((a: any) => a.code?.toUpperCase() || '');
                              let serumClass = 'SerumFree';
                              if (codes.some((c: string) => c.includes('PRP'))) serumClass = 'PRP';
                              else if (codes.some((c: string) => c.includes('FBS'))) serumClass = 'FBS';
                              setFormData({...formData, additives: newAdditives, serum_class: serumClass});
                            }}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{additive.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({additive.code})</span>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={selectedAdditive?.concentration ?? ''}
                                onChange={e => {
                                  const arr = [...(formData.additives || [])];
                                  const idx = arr.findIndex((a: any) => a.additive_id === additive.additive_id);
                                  if (idx >= 0) {
                                    arr[idx] = { ...arr[idx], concentration: e.target.value ? Number(e.target.value) : null };
                                    setFormData({...formData, additives: arr});
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-input bg-background text-foreground rounded text-sm"
                                placeholder="Конц."
                              />
                              <span className="text-sm text-muted-foreground">{additive.unit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="success" size="sm"
                  onClick={async () => {
                    const specId = editingId || crypto.randomUUID();
                    // Save spec
                    const specData = {
                      name: formData.name,
                      description: formData.description || null,
                      serum_class: formData.serum_class,
                      phenol_red_flag: formData.phenol_red_flag,
                      notes: formData.notes,
                      base_media_id: formData.base_media_id || null,
                    };
                    if (editingId) {
                      await (supabase.from('media_compatibility_spec' as any) as any).update(specData).eq('media_spec_id', editingId);
                      // Delete old additives
                      await (supabase.from('media_spec_additives' as any) as any).delete().eq('media_spec_id', editingId);
                    } else {
                      await (supabase.from('media_compatibility_spec' as any) as any).insert({ ...specData, media_spec_id: specId });
                    }
                    // Insert new additives
                    if (formData.additives && formData.additives.length > 0) {
                      await (supabase.from('media_spec_additives' as any) as any).insert(
                        formData.additives.map((a: any) => ({
                          media_spec_id: editingId || specId,
                          additive_id: a.additive_id,
                          concentration: a.concentration,
                        }))
                      );
                    }
                    setEditingId(null);
                    setShowAddForm(false);
                    setFormData({});
                    loadData();
                  }}
                >
                  <Save size={14}/> Сохранить
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Название" field="name" sort={sortMediaSpecs} onSort={toggleSortMediaSpecs} className="text-left" />
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Формула среды</th>
                <SortableHeader label="Класс сыворотки" field="serum_class" sort={sortMediaSpecs} onSort={toggleSortMediaSpecs} className="text-left" />
                <SortableHeader label="Фенол" field="phenol_red_flag" sort={sortMediaSpecs} onSort={toggleSortMediaSpecs} className="text-center" />
                <SortableHeader label="Примечания" field="notes" sort={sortMediaSpecs} onSort={toggleSortMediaSpecs} className="text-left" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(mediaSpecs, sortMediaSpecs, (ms, f) => (ms as any)[f]).map((ms) => (
                <tr key={ms.media_spec_id}>
                  <td className="px-4 py-2 font-medium">{ms.name || '-'}</td>
                  <td className="px-4 py-2">
                    <MediaFormulaDisplay 
                      mediaSpec={ms as any} 
                      baseMediaList={baseMediaList} 
                      additivesList={mediaAdditives} 
                      specAdditives={specAdditives} 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={
                      ms.serum_class === 'PRP' ? 'secondary' :
                      ms.serum_class === 'FBS' ? 'warning' :
                      'success'
                    }>
                      {ms.serum_class}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">{ms.phenol_red_flag ? 'Да' : 'Нет'}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{ms.notes || '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon"
                      onClick={() => {
                        const linkedAdditives = specAdditives
                          .filter(sa => sa.media_spec_id === ms.media_spec_id)
                          .map(sa => {
                            const additive = mediaAdditives.find(a => a.additive_id === sa.additive_id);
                            return additive ? { additive_id: sa.additive_id, name: additive.name, concentration: sa.concentration, unit: additive.unit } : null;
                          })
                          .filter(Boolean);
                        setEditingId(ms.media_spec_id);
                        setShowAddForm(true);
                        setFormData({ ...ms, additives: linkedAdditives });
                      }}
                    >
                      <Edit2 size={16}/>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('media_compatibility_spec', 'media_spec_id', ms.media_spec_id)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
          )}
        </div>
      </TabsContent>

      {/* Process Methods */}
      <TabsContent value="processMethods">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Методы обработки CM ({processMethods.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ code: '', name: '', method_type: 'Filtration', description: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Код" required tooltip="Уникальный код метода">
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingId} />
                </FormField>
                <FormField label="Название" required tooltip="Название метода обработки">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Тип" required tooltip="Категория метода обработки">
                  <select value={formData.method_type || 'Filtration'} onChange={e => setFormData({...formData, method_type: e.target.value, steps_count: e.target.value === 'Modification' ? 1 : null, step_definitions: e.target.value === 'Modification' ? [{step_number: 1, description: '', expected_results: ''}] : null})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                    <option value="Filtration">Фильтрация</option>
                    <option value="TFF">TFF</option>
                    <option value="Diafiltration">Диафильтрация</option>
                    <option value="Precipitation">Преципитация</option>
                    <option value="Hold">Hold</option>
                    <option value="Modification">Модификация</option>
                    <option value="Other">Другое</option>
                  </select>
                </FormField>
                <FormField label="Описание" tooltip="Дополнительное описание метода">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="requires_time_tracking" checked={!!formData.requires_time_tracking} onChange={e => setFormData({...formData, requires_time_tracking: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="requires_time_tracking" className="text-sm text-foreground">Требуется фиксация времени процедуры</label>
              </div>
              
              {/* Modification type specific fields */}
              {formData.method_type === 'Modification' && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <h4 className="font-medium text-foreground">Настройки модификации</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <FormField label="Применимость" required tooltip="Где применяется метод">
                      <select value={formData.applicability || 'both'} onChange={e => setFormData({...formData, applicability: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                        <option value="product">Продукт</option>
                        <option value="raw">Сырьё</option>
                        <option value="both">Оба</option>
                      </select>
                    </FormField>
                    <FormField label="Этап вызова" required tooltip="На каком этапе БП вызывать форму">
                      <select value={formData.trigger_stage || 'Processing'} onChange={e => setFormData({...formData, trigger_stage: e.target.value})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg">
                        <option value="Processing">Процессинг</option>
                        <option value="PostProcessing">Пост-процессинг</option>
                        <option value="Filling">Розлив</option>
                        <option value="QC">QC</option>
                      </select>
                    </FormField>
                    <FormField label="Кол-во шагов" required tooltip="Сколько шагов в процессе">
                      <input type="number" min="1" max="10" value={formData.steps_count || 1} onChange={e => {
                        const count = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                        const currentSteps = formData.step_definitions || [];
                        const newSteps = Array.from({length: count}, (_, i) => currentSteps[i] || {step_number: i+1, description: '', expected_results: ''});
                        setFormData({...formData, steps_count: count, step_definitions: newSteps});
                      }} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg" />
                    </FormField>
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-muted-foreground">Описание шагов</h5>
                    {(formData.step_definitions || []).map((step: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-card rounded border">
                        <div className="col-span-1 text-center font-bold text-muted-foreground pt-2">{idx + 1}</div>
                        <div className="col-span-5">
                          <label className="text-xs text-muted-foreground">Описание шага</label>
                          <textarea value={step.description || ''} onChange={e => {
                            const newSteps = [...(formData.step_definitions || [])];
                            newSteps[idx] = {...newSteps[idx], description: e.target.value};
                            setFormData({...formData, step_definitions: newSteps});
                          }} className="w-full px-2 py-1 border border-input bg-background text-foreground rounded text-sm" rows={2} />
                        </div>
                        <div className="col-span-6">
                          <label className="text-xs text-muted-foreground">Ожидаемые результаты</label>
                          <textarea value={step.expected_results || ''} onChange={e => {
                            const newSteps = [...(formData.step_definitions || [])];
                            newSteps[idx] = {...newSteps[idx], expected_results: e.target.value};
                            setFormData({...formData, step_definitions: newSteps});
                          }} className="w-full px-2 py-1 border border-input bg-background text-foreground rounded text-sm" rows={2} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('cm_process_method', 'method_id', editingId || crypto.randomUUID(), formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="code" sort={sortProcessMethods} onSort={toggleSortProcessMethods} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortProcessMethods} onSort={toggleSortProcessMethods} className="text-left" />
                <SortableHeader label="Тип" field="method_type" sort={sortProcessMethods} onSort={toggleSortProcessMethods} className="text-left" />
                <SortableHeader label="Описание" field="description" sort={sortProcessMethods} onSort={toggleSortProcessMethods} className="text-left" />
                <SortableHeader label="Активен" field="is_active" sort={sortProcessMethods} onSort={toggleSortProcessMethods} className="text-center" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Время</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(processMethods, sortProcessMethods, (pm, f) => (pm as any)[f]).map((pm) => (
                <tr key={pm.method_id}>
                  <td className="px-4 py-2 font-mono text-sm">{pm.code || '-'}</td>
                  <td className="px-4 py-2">{pm.name}</td>
                  <td className="px-4 py-2 text-sm">{pm.method_type}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{pm.description || '-'}</td>
                  <td className="px-4 py-2 text-center">{pm.is_active ? 'Да' : '-'}</td>
                  <td className="px-4 py-2 text-center">{pm.requires_time_tracking ? '✓' : '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(pm.method_id); setShowAddForm(true); setFormData({ ...pm }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('cm_process_method', 'method_id', pm.method_id)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* QC Tests */}
      <TabsContent value="qcTests">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Справочник QC тестов ({qcTestTypes.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ code: '', name: '', description: '', unit: '', norm_min: '', norm_max: '', norm_text: '', method: '', is_active: true }); }}>
              <Plus size={16} /> Добавить тест
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Код" required tooltip="Уникальный код теста (например, Sterility, LAL)">
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingId} />
                </FormField>
                <FormField label="Название" required tooltip="Полное название теста">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Ед. изм." tooltip="Единица измерения результата">
                  <Input value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </FormField>
                <FormField label="Метод" tooltip="Метод проведения теста">
                  <Input value={formData.method || ''} onChange={e => setFormData({...formData, method: e.target.value})} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Норма мин" tooltip="Минимальное допустимое значение (число)">
                  <Input type="number" step="any" value={formData.norm_min || ''} onChange={e => setFormData({...formData, norm_min: e.target.value})} />
                </FormField>
                <FormField label="Норма макс" tooltip="Максимальное допустимое значение (число)">
                  <Input type="number" step="any" value={formData.norm_max || ''} onChange={e => setFormData({...formData, norm_max: e.target.value})} />
                </FormField>
                <FormField label="Норма (текст)" tooltip="Текстовая норма, напр. 'не обнаружено'">
                  <Input value={formData.norm_text || ''} onChange={e => setFormData({...formData, norm_text: e.target.value})} placeholder="не обнаружено" />
                </FormField>
                <FormField label="Описание" tooltip="Дополнительная информация о тесте">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('qc_test_type', 'code', formData.code, formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="code" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <SortableHeader label="Описание" field="description" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <SortableHeader label="Ед. изм." field="unit" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <SortableHeader label="Норма" field="norm_text" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <SortableHeader label="Метод" field="method" sort={sortQcTests} onSort={toggleSortQcTests} className="text-left" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(qcTestTypes, sortQcTests, (t, f) => (t as any)[f]).map((t) => (
                <tr key={t.code}>
                  <td className="px-4 py-2 font-mono">{t.code}</td>
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{t.description || '-'}</td>
                  <td className="px-4 py-2 text-sm">{t.unit || '-'}</td>
                  <td className="px-4 py-2 text-sm">{t.norm_text || (t.norm_min != null || t.norm_max != null ? `${t.norm_min ?? ''} - ${t.norm_max ?? ''}` : '-')}</td>
                  <td className="px-4 py-2 text-sm">{t.method || '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(t.code); setShowAddForm(true); setFormData({ ...t }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('qc_test_type', 'code', t.code)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Infections */}
      <TabsContent value="infections">
        <Card><CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Справочник инфекций ({infectionTypes.length})</h3>
            <Button variant="default" size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ code: '', name: '', description: '', test_method: '', is_active: true }); }}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Код" required tooltip="Уникальный код инфекции (например, HBsAg, HIV)">
                  <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingId} />
                </FormField>
                <FormField label="Название" required tooltip="Полное название инфекции">
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </FormField>
                <FormField label="Описание" tooltip="Дополнительная информация">
                  <Input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </FormField>
                <FormField label="Метод теста" tooltip="Метод лабораторного исследования">
                  <Input value={formData.test_method || ''} onChange={e => setFormData({...formData, test_method: e.target.value})} />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => handleSave('infection_type', 'infection_type_id', editingId || crypto.randomUUID(), formData)}><Save size={14}/> Сохранить</Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setFormData({}); setEditingId(null); }}>Отмена</Button>
              </div>
            </div>
          )}
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <SortableHeader label="Код" field="code" sort={sortInfections} onSort={toggleSortInfections} className="text-left" />
                <SortableHeader label="Название" field="name" sort={sortInfections} onSort={toggleSortInfections} className="text-left" />
                <SortableHeader label="Описание" field="description" sort={sortInfections} onSort={toggleSortInfections} className="text-left" />
                <SortableHeader label="Метод теста" field="test_method" sort={sortInfections} onSort={toggleSortInfections} className="text-left" />
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortData(infectionTypes, sortInfections, (inf, f) => (inf as any)[f]).map((inf) => (
                <tr key={inf.infection_type_id}>
                  <td className="px-4 py-2 font-mono">{inf.code}</td>
                  <td className="px-4 py-2 font-medium">{inf.name}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{inf.description || '-'}</td>
                  <td className="px-4 py-2 text-sm">{inf.test_method || '-'}</td>
                  <td className="px-4 py-2 text-center flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(inf.infection_type_id); setShowAddForm(true); setFormData({ ...inf }); }}><Edit2 size={16}/></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" onClick={() => handleDelete('infection_type', 'infection_type_id', inf.infection_type_id)}><Trash2 size={16}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </TabsContent>

      {/* Data Cleanup Tab */}
      <TabsContent value="dataCleanup">
        <DataCleanupTab />
      </TabsContent>

      </Tabs>

      {/* SDS Modal */}
      <Dialog open={sdsModal.open} onOpenChange={(open) => { if (!open) setSdsModal({ open: false, entityType: null, entityId: null, entityName: '', sdsData: {} }); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SDS: {sdsModal.entityName}</DialogTitle>
          </DialogHeader>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Название компонента">
                  <Input value={sdsModal.sdsData.component_name || sdsModal.entityName} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, component_name: e.target.value}})} />
                </FormField>
                <FormField label="CAS номер">
                  <Input value={sdsModal.sdsData.cas_number || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, cas_number: e.target.value}})} placeholder="например, 7732-18-5" />
                </FormField>
                <FormField label="Поставщик">
                  <textarea value={sdsModal.sdsData.supplier_details || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, supplier_details: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg" rows={2} />
                </FormField>
                <FormField label="Телефон экстренной связи">
                  <Input value={sdsModal.sdsData.emergency_phone || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, emergency_phone: e.target.value}})} />
                </FormField>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-foreground mb-2">Секции SDS</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="2. Классификация опасности">
                    <textarea value={sdsModal.sdsData.hazard_classification || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, hazard_classification: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                  <FormField label="3. Состав/информация">
                    <textarea value={sdsModal.sdsData.composition_info || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, composition_info: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                  <FormField label="4. Первая помощь">
                    <textarea value={sdsModal.sdsData.first_aid_measures || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, first_aid_measures: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                  <FormField label="7. Обращение и хранение">
                    <textarea value={sdsModal.sdsData.storage_conditions || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, storage_conditions: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                  <FormField label="8. Контроль воздействия/СИЗ">
                    <textarea value={sdsModal.sdsData.personal_protection || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, personal_protection: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                  <FormField label="13. Утилизация">
                    <textarea value={sdsModal.sdsData.disposal_methods || ''} onChange={e => setSdsModal({...sdsModal, sdsData: {...sdsModal.sdsData, disposal_methods: e.target.value}})} className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm" rows={2} />
                  </FormField>
                </div>
              </div>
            </div>
          <DialogFooter>
              <Button variant="success" size="sm"
                onClick={async () => {
                  const sdsId = sdsModal.sdsData.sds_component_id || crypto.randomUUID();
                  const sdsPayload = {
                    ...sdsModal.sdsData,
                    component_name: sdsModal.sdsData.component_name || sdsModal.entityName,
                  };

                  if (sdsModal.sdsData.sds_component_id) {
                    await (supabase.from('sds_component' as any) as any).update(sdsPayload).eq('sds_component_id', sdsId);
                  } else {
                    await (supabase.from('sds_component' as any) as any).insert({ ...sdsPayload, sds_component_id: sdsId });
                  }

                  // Link to entity
                  if (sdsModal.entityType === 'base_media') {
                    await (supabase.from('base_media' as any) as any).update({ sds_component_id: sdsId }).eq('base_media_id', sdsModal.entityId);
                  } else if (sdsModal.entityType === 'additive') {
                    await (supabase.from('media_additive' as any) as any).update({ sds_component_id: sdsId }).eq('additive_id', sdsModal.entityId);
                  }

                  setSdsModal({ open: false, entityType: null, entityId: null, entityName: '', sdsData: {} });
                  loadData();
                }}
              >
                <Save size={14}/> Сохранить SDS
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSdsModal({ open: false, entityType: null, entityId: null, entityName: '', sdsData: {} })}>Отмена</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
