import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, Product, RequestLine } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MediaFormulaDisplay from '../components/MediaFormulaDisplay';

// Справочник посуды загружается из pack_format с purpose='для сырья'

interface MtoRequestOption {
  request_line_id: string;
  request_id: string;
  finished_product_code: string;
  pack_format_code: string;
  qty_units: number;
  due_date?: string;
  days_left?: number;
  is_overdue?: boolean;
  is_urgent?: boolean;
  required_volume_ml?: number;
  pack_format_name?: string;
}

export default function CmLotCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mtoLineId = searchParams.get('mto');
  const { user, authUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [mtoLine, setMtoLine] = useState<(RequestLine & { request_id: string }) | null>(null);
  const [mtoRequests, setMtoRequests] = useState<MtoRequestOption[]>([]);
  
  const [rawMaterialContainers, setRawMaterialContainers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    mode: 'MTS',
    base_product_code: '',
    raw_container_code: '',
    nominal_volume_ml: 0,
    notes: '',
    media_spec_id: '',
    request_line_id: '',
  });

  useEffect(() => {
    loadProducts();
    loadMtoRequests();
    loadRawContainers();
    if (mtoLineId) loadMtoLine();
  }, [mtoLineId]);

  async function loadRawContainers() {
    const { data } = await (supabase
      .from('pack_format')
      .select('*') as any)
      .eq('purpose', 'raw')
      .eq('is_active', true);
    if (data) setRawMaterialContainers(data);
  }

  async function loadMtoRequests() {
    const now = new Date();
    const { data: cmLots } = await supabase.from('cm_lot').select('request_line_id').not('request_line_id', 'is', null);
    const existingLineIds = (cmLots || []).map((l: any) => l.request_line_id);

    const { data: packFormats } = await supabase.from('pack_format').select('*');
    const packFormatMap = new Map((packFormats || []).map((pf: any) => [pf.pack_format_code, pf]));

    const { data: lines } = await supabase
      .from('request_line')
      .select('*, request:request_id(status, due_date, created_at)')
      .or('source_type.eq.NewProduction,source_type.eq.new_batch');

    const filtered = (lines || [])
      .filter((line: any) => !existingLineIds.includes(line.request_line_id) && line.request?.status !== 'Completed')
      .map((line: any) => {
        const dueDate = line.request?.due_date;
        const daysLeft = dueDate ? Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
        const pf = packFormatMap.get(line.pack_format_code);
        const volumePerUnit = pf?.nominal_fill_volume_ml || 0;
        return {
          request_line_id: line.request_line_id,
          request_id: line.request_id,
          finished_product_code: line.finished_product_code,
          pack_format_code: line.pack_format_code,
          qty_units: line.qty_units,
          due_date: dueDate,
          days_left: daysLeft,
          is_overdue: daysLeft !== null && daysLeft < 0,
          is_urgent: daysLeft !== null && daysLeft >= 0 && daysLeft < 3,
          required_volume_ml: volumePerUnit * line.qty_units,
          pack_format_name: pf?.name || line.pack_format_code,
        };
      })
      .sort((a: any, b: any) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        return 0;
      });

    setMtoRequests(filtered);
  }

  async function loadMtoLine() {
    const { data } = await supabase
      .from('request_line')
      .select('*')
      .eq('request_line_id', mtoLineId)
      .single();
    if (data) {
      setMtoLine(data as any);
      // Find finished product and get its base product / media spec
      const { data: finishedProd } = await supabase
        .from('product')
        .select('*')
        .eq('product_code', data.finished_product_code)
        .single();
      
      setFormData(prev => ({ 
        ...prev, 
        mode: 'MTO',
        base_product_code: data.finished_product_code || '',
        media_spec_id: finishedProd?.media_spec_id || '',
      }));
    }
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('product')
      .select('*')
      .eq('product_type', 'BaseBulk')
      .eq('is_active', true);
    if (data) setProducts(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.base_product_code) {
      alert('Выберите продукт');
      return;
    }
    if (!formData.raw_container_code || formData.nominal_volume_ml <= 0) {
      alert('Выберите посуду для сырья');
      return;
    }

    setLoading(true);
    try {
      // Generate CM Lot ID: CM-YYYYMMDD-####
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      
      // Get count of lots created today
      const { count } = await supabase
        .from('cm_lot')
        .select('*', { count: 'exact', head: true })
        .like('cm_lot_id', `CM-${dateStr}-%`);
      
      const seqNum = String((count || 0) + 1).padStart(4, '0');
      const cmLotId = `CM-${dateStr}-${seqNum}`;

      // MTO: media_spec_id НЕ фиксируется при создании - выбирается при первом сборе
      // MTS: берём media_spec_id из продукта
      const selectedProduct = products.find(p => p.product_code === formData.base_product_code);
      let mediaSpecId: string | null = null;
      if (formData.mode === 'MTS') {
        mediaSpecId = formData.media_spec_id || null;
        if (!mediaSpecId && selectedProduct) {
          mediaSpecId = selectedProduct?.media_spec_id || null;
        }
      }

      // Копируем frozen_spec в зависимости от режима:
      // MTS: из product.frozen_spec
      // MTO: из request.frozen_spec (содержит базовые + дополнительные QC)
      let frozenSpec: any = null;
      if (formData.mode === 'MTO' && mtoLineId) {
        // Для MTO получаем frozen_spec из заявки
        const { data: requestLine } = await supabase
          .from('request_line')
          .select('request_id')
          .eq('request_line_id', mtoLineId)
          .single();
        if (requestLine) {
          const { data: request } = await supabase
            .from('request')
            .select('frozen_spec')
            .eq('request_id', requestLine.request_id)
            .single();
          frozenSpec = (request as any)?.frozen_spec || null;
        }
      }
      // Fallback на product.frozen_spec для MTS или если MTO без frozen_spec
      if (!frozenSpec && selectedProduct) {
        frozenSpec = (selectedProduct as any).frozen_spec || null;
      }

      // Create CM Lot
      const { error: lotError } = await supabase.from('cm_lot').insert({
        cm_lot_id: cmLotId,
        mode: formData.mode,
        base_product_code: formData.base_product_code,
        status: 'Open',
        collection_start_at: new Date().toISOString(),
        created_by: authUserId,
        notes: formData.notes || null,
        request_line_id: mtoLineId || formData.request_line_id || null,
        media_spec_id: mediaSpecId,
        frozen_spec: frozenSpec,
      });

      if (lotError) throw lotError;

      // Create container
      const { error: containerError } = await supabase.from('container').insert({
        owner_entity_type: 'CM_Lot',
        owner_id: cmLotId,
        container_type: 'Bottle',
        nominal_volume_ml: formData.nominal_volume_ml,
        current_volume_ml: 0,
        status: 'Quarantine',
      });

      if (containerError) throw containerError;

      navigate(`/cm/${cmLotId}`);
    } catch (error: any) {
      console.error('Create error:', error);
      alert('Ошибка создания: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Создание CM Лота</h1>
      
      {mtoLine && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>MTO заявка:</strong>{' '}
            <Link to={`/requests/${mtoLine.request_id}`} className="underline">{mtoLine.request_id}</Link>
            {' — '}{mtoLine.finished_product_code}, {mtoLine.qty_units} шт
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Режим производства</label>
          <select
            value={formData.mode}
            onChange={(e) => setFormData({ ...formData, mode: e.target.value, request_line_id: '' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="MTS">MTS (на склад)</option>
            <option value="MTO">MTO (под заказ)</option>
          </select>
        </div>

        {/* MTO: Список заявок для выбора */}
        {formData.mode === 'MTO' && !mtoLineId && mtoRequests.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <strong>Нет открытых заявок MTO.</strong> Все заявки уже привязаны к CM лотам или отсутствуют заявки с типом "Новое производство".
          </div>
        )}
        {formData.mode === 'MTO' && !mtoLineId && mtoRequests.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Выберите заявку (FEFO)</label>
            <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg">
              {mtoRequests.map(req => (
                <label
                  key={req.request_line_id}
                  className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 ${
                    formData.request_line_id === req.request_line_id ? 'bg-blue-50' : ''
                  } ${req.is_overdue ? 'bg-red-50' : req.is_urgent ? 'bg-amber-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="mto_request"
                      checked={formData.request_line_id === req.request_line_id}
                      onChange={async () => {
                        const { data: prod } = await supabase.from('product').select('*').eq('product_code', req.finished_product_code).single();
                        setFormData({
                          ...formData,
                          request_line_id: req.request_line_id,
                          base_product_code: req.finished_product_code,
                          media_spec_id: prod?.media_spec_id || '',
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <div>
                      <span className="font-mono text-sm">{req.request_id}</span>
                      <span className="text-slate-500 ml-2">{req.finished_product_code}</span>
                      <span className="text-slate-400 ml-2">x{req.qty_units}</span>
                      <span className="text-blue-600 ml-2 font-medium">({req.required_volume_ml?.toLocaleString()} мл)</span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {req.is_overdue && <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs mr-2">ПРОСРОЧЕНО</span>}
                    {req.is_urgent && <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-xs mr-2">СРОЧНО</span>}
                    {req.due_date && (
                      <span className={`${req.is_overdue ? 'text-red-600' : req.is_urgent ? 'text-amber-600' : 'text-slate-500'}`}>
                        {new Date(req.due_date).toLocaleDateString('ru-RU')}
                        {req.days_left !== null && ` (${req.days_left} дн.)`}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Продукт: только для MTS или когда есть mtoLineId */}
        {(formData.mode === 'MTS' || mtoLineId) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Продукт (сырье) *</label>
            <select
              value={formData.base_product_code}
              onChange={(e) => setFormData({ ...formData, base_product_code: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!mtoLineId}
            >
              <option value="">Выберите продукт</option>
              {products.map(p => (
                <option key={p.product_code} value={p.product_code}>
                  {p.product_code} - {p.product_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* MTO: Показываем информацию о выбранной заявке */}
        {formData.mode === 'MTO' && formData.request_line_id && !mtoLineId && (() => {
          const selectedReq = mtoRequests.find(r => r.request_line_id === formData.request_line_id);
          if (!selectedReq) return null;
          return (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Выбранная заявка:</span>
                <span className="font-mono text-sm">{selectedReq.request_id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Продукт:</span> <strong>{selectedReq.finished_product_code}</strong></div>
                <div><span className="text-slate-500">Формат:</span> <strong>{selectedReq.pack_format_name}</strong></div>
                <div><span className="text-slate-500">Количество:</span> <strong>{selectedReq.qty_units} шт</strong></div>
                <div><span className="text-slate-500">Требуется:</span> <strong className="text-blue-700">{selectedReq.required_volume_ml?.toLocaleString()} мл</strong></div>
              </div>
              {selectedReq.due_date && (
                <div className="text-xs text-slate-600">
                  Срок: {new Date(selectedReq.due_date).toLocaleDateString('ru-RU')}
                  {selectedReq.days_left !== null && ` (осталось ${selectedReq.days_left} дн.)`}
                </div>
              )}
            </div>
          );
        })()}

        {/* Отображение спецификации среды */}
        {formData.media_spec_id && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <label className="block text-xs font-medium text-teal-700 mb-1">Спецификация среды</label>
            <MediaFormulaDisplay mediaSpecId={formData.media_spec_id} />
          </div>
        )}

        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
          <label className="block text-sm font-bold text-amber-800 mb-2">Посуда для сырья (target volume) *</label>
          <select
            value={formData.raw_container_code}
            onChange={(e) => {
              const container = rawMaterialContainers.find(c => c.pack_format_code === e.target.value);
              setFormData({ 
                ...formData, 
                raw_container_code: e.target.value,
                nominal_volume_ml: container?.nominal_fill_volume_ml || 0 
              });
            }}
            className="w-full px-3 py-2 border-2 border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
            required
          >
            <option value="">Выберите посуду</option>
            {rawMaterialContainers.map(c => (
              <option key={c.pack_format_code} value={c.pack_format_code}>
                {c.name} — {c.nominal_fill_volume_ml} мл
              </option>
            ))}
          </select>
          {formData.raw_container_code && (
            <p className="mt-2 text-amber-700 font-semibold">
              Target Volume: {formData.nominal_volume_ml.toLocaleString()} мл
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Примечания</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* MTO validation error */}
        {formData.mode === 'MTO' && !mtoLineId && !formData.request_line_id && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Для режима MTO необходимо выбрать заявку из списка
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/cm')}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading || !formData.raw_container_code || (formData.mode === 'MTO' && !mtoLineId && !formData.request_line_id)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать CM Лот'}
          </button>
        </div>
      </form>
    </div>
  );
}
