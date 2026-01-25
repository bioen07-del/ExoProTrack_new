import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, XCircle, Plus, ChevronDown, ChevronUp, FlaskConical, Package, Eye, EyeOff, Search } from 'lucide-react';

type QcRequestItem = {
  id: string;
  lot_id: string;
  lot_type: 'CM' | 'Pack';
  status: string;
  requested_at: string;
  frozen_spec?: any;
  lot_status?: string;
};

type QcResultItem = {
  id: string;
  request_id: string;
  test_code: string;
  result_value?: string;
  pass_fail: string;
  report_ref?: string;
  tested_at?: string;
};

export default function QcPage() {
  const { hasRole } = useAuth();
  const [qcRequests, setQcRequests] = useState<QcRequestItem[]>([]);
  const [qcResults, setQcResults] = useState<QcResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  // Filters
  const [showCompleted, setShowCompleted] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'cm' | 'pack'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'name'>('date_asc');

  const [showResultForm, setShowResultForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<QcRequestItem | null>(null);
  const [resultData, setResultData] = useState({
    test_code: '',
    result_value: '',
    pass_fail: 'Pass',
    report_ref: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: cmRequests } = await supabase
        .from('cm_qc_request')
        .select('*')
        .order('requested_at', { ascending: false });
      
      const cmLotIds = (cmRequests || []).map(r => r.cm_lot_id);
      let cmLots: any[] = [];
      if (cmLotIds.length > 0) {
        const { data } = await supabase.from('cm_lot').select('*').in('cm_lot_id', cmLotIds);
        cmLots = data || [];
      }

      const { data: packRequests } = await (supabase.from as any)('pack_qc_request')
        .select('*')
        .order('requested_at', { ascending: false });

      const packLotIds = (packRequests || []).map((r: any) => r.pack_lot_id);
      let packLots: any[] = [];
      let packFrozenSpecs: Record<string, any> = {};
      if (packLotIds.length > 0) {
        const { data } = await supabase.from('pack_lot').select('*').in('pack_lot_id', packLotIds);
        packLots = data || [];
        
        // Get frozen_spec from request via request_line
        const requestLineIds = packLots.map(l => l.request_line_id).filter(Boolean);
        if (requestLineIds.length > 0) {
          const { data: lines } = await supabase.from('request_line').select('*').in('request_line_id', requestLineIds);
          const requestIds = (lines || []).map(l => l.request_id).filter(Boolean);
          if (requestIds.length > 0) {
            const { data: requests } = await supabase.from('request').select('request_id, frozen_spec').in('request_id', requestIds);
            // Map pack_lot_id -> frozen_spec
            for (const lot of packLots) {
              const line = (lines || []).find(l => l.request_line_id === lot.request_line_id);
              const req = line ? (requests || []).find(r => r.request_id === line.request_id) : null;
              packFrozenSpecs[lot.pack_lot_id] = req?.frozen_spec || null;
            }
          }
        }
      }

      const { data: cmResults } = await supabase
        .from('cm_qc_result')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: packResults } = await (supabase.from as any)('pack_qc_result')
        .select('*')
        .order('created_at', { ascending: false });

      const normalizedCm: QcRequestItem[] = (cmRequests || []).map(r => {
        const lot = cmLots.find(l => l.cm_lot_id === r.cm_lot_id);
        return {
          id: r.qc_request_id,
          lot_id: r.cm_lot_id,
          lot_type: 'CM' as const,
          status: r.status,
          requested_at: r.requested_at,
          frozen_spec: lot?.frozen_spec,
          lot_status: lot?.status,
        };
      });

      const normalizedPack: QcRequestItem[] = (packRequests || []).map((r: any) => {
        const lot = packLots.find((l: any) => l.pack_lot_id === r.pack_lot_id);
        return {
          id: r.qc_request_id,
          lot_id: r.pack_lot_id,
          lot_type: 'Pack' as const,
          status: r.status,
          requested_at: r.requested_at,
          frozen_spec: packFrozenSpecs[r.pack_lot_id] || null,
          lot_status: lot?.status,
        };
      });

      const normalizedCmResults: QcResultItem[] = (cmResults || []).map(r => ({
        id: r.qc_result_id,
        request_id: r.qc_request_id,
        test_code: r.test_code,
        result_value: r.result_value,
        pass_fail: r.pass_fail,
        report_ref: r.report_ref,
        tested_at: r.tested_at,
      }));

      const normalizedPackResults: QcResultItem[] = (packResults || []).map((r: any) => ({
        id: r.qc_result_id,
        request_id: r.qc_request_id,
        test_code: r.test_code,
        result_value: r.result_value,
        pass_fail: r.pass_fail,
        report_ref: r.report_ref,
        tested_at: r.tested_at,
      }));

      setQcRequests([...normalizedCm, ...normalizedPack]);
      setQcResults([...normalizedCmResults, ...normalizedPackResults]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered and sorted requests
  const filteredRequests = useMemo(() => {
    let result = [...qcRequests];

    // Hide completed by default
    if (!showCompleted) {
      result = result.filter(r => r.status !== 'Completed');
    }

    // Type filter
    if (typeFilter === 'cm') {
      result = result.filter(r => r.lot_type === 'CM');
    } else if (typeFilter === 'pack') {
      result = result.filter(r => r.lot_type === 'Pack');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.lot_id.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.lot_id.localeCompare(b.lot_id);
      } else if (sortBy === 'date_desc') {
        return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
      } else {
        // date_asc - FEFO: oldest first, pending first
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      }
    });

    return result;
  }, [qcRequests, showCompleted, typeFilter, searchQuery, sortBy]);

  // Counts
  const pendingCount = qcRequests.filter(r => r.status !== 'Completed').length;
  const completedCount = qcRequests.filter(r => r.status === 'Completed').length;

  function getTestsForRequest(req: QcRequestItem): { code: string; name: string; unit?: string }[] {
    if (req.lot_type === 'CM') {
      if (req.frozen_spec?.qc?.raw && Array.isArray(req.frozen_spec.qc.raw)) {
        return req.frozen_spec.qc.raw;
      }
    } else {
      if (req.frozen_spec?.qc?.product && Array.isArray(req.frozen_spec.qc.product)) {
        return req.frozen_spec.qc.product;
      }
    }
    // No hardcoded fallback - return empty if no spec found
    return [];
  }

  async function addResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      if (selectedRequest.lot_type === 'CM') {
        await supabase.from('cm_qc_result').insert({
          qc_request_id: selectedRequest.id,
          test_code: resultData.test_code,
          result_value: resultData.result_value || null,
          pass_fail: resultData.pass_fail,
          report_ref: resultData.report_ref || null,
          tested_at: new Date().toISOString(),
        });

        await supabase.from('cm_qc_request')
          .update({ status: 'InProgress' })
          .eq('qc_request_id', selectedRequest.id);
      } else {
        await (supabase.from as any)('pack_qc_result').insert({
          qc_request_id: selectedRequest.id,
          test_code: resultData.test_code,
          result_value: resultData.result_value || null,
          pass_fail: resultData.pass_fail,
          report_ref: resultData.report_ref || null,
          tested_at: new Date().toISOString(),
        });

        await (supabase.from as any)('pack_qc_request')
          .update({ status: 'InProgress' })
          .eq('qc_request_id', selectedRequest.id);
      }

      setShowResultForm(false);
      setResultData({ test_code: '', result_value: '', pass_fail: 'Pass', report_ref: '' });
      loadData();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  async function completeRequest(req: QcRequestItem) {
    if (req.lot_type === 'CM') {
      await supabase.from('cm_qc_request')
        .update({ status: 'Completed' })
        .eq('qc_request_id', req.id);

      await supabase.from('cm_lot')
        .update({ status: 'QC_Completed' })
        .eq('cm_lot_id', req.lot_id);
    } else {
      await (supabase.from as any)('pack_qc_request')
        .update({ status: 'Completed' })
        .eq('qc_request_id', req.id);

      await supabase.from('pack_lot')
        .update({ status: 'Released' })
        .eq('pack_lot_id', req.lot_id);
    }

    loadData();
  }

  function openResultForm(req: QcRequestItem) {
    setSelectedRequest(req);
    const tests = getTestsForRequest(req);
    setResultData({ ...resultData, test_code: tests[0]?.code || '' });
    setShowResultForm(true);
  }

  const canAddResult = hasRole(['QC', 'Admin']);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  const testsForForm = selectedRequest ? getTestsForRequest(selectedRequest) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Контроль качества (QC)</h1>
        <div className="text-sm text-slate-500">
          В очереди: <span className="font-semibold text-amber-600">{pendingCount}</span>
          {completedCount > 0 && <span className="ml-2">| Завершено: <span className="font-semibold text-green-600">{completedCount}</span></span>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Поиск по номеру лота..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">Все типы</option>
            <option value="cm">🧪 Сырьё (CM)</option>
            <option value="pack">📦 Продукция</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="date_asc">По дате (FEFO)</option>
            <option value="date_desc">По дате (новые)</option>
            <option value="name">По названию</option>
          </select>

          {/* Show Completed Toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
              showCompleted ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-300 text-slate-600'
            }`}
          >
            {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
            {showCompleted ? 'Скрыть завершённые' : 'Показать завершённые'}
          </button>
        </div>
      </div>

      {/* Result Form Modal */}
      {showResultForm && selectedRequest && (
        <form onSubmit={addResult} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            {selectedRequest.lot_type === 'CM' ? <FlaskConical size={20} /> : <Package size={20} />}
            Добавить результат теста для {selectedRequest.lot_id}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Тест *</label>
              <select
                value={resultData.test_code}
                onChange={(e) => setResultData({ ...resultData, test_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Выберите тест...</option>
                {testsForForm.map(t => (
                  <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Результат</label>
              <input
                type="text"
                value={resultData.result_value}
                onChange={(e) => setResultData({ ...resultData, result_value: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pass/Fail *</label>
              <select
                value={resultData.pass_fail}
                onChange={(e) => setResultData({ ...resultData, pass_fail: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="NA">N/A</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ссылка на протокол</label>
              <input
                type="text"
                value={resultData.report_ref}
                onChange={(e) => setResultData({ ...resultData, report_ref: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowResultForm(false)} className="px-4 py-2 border rounded-lg">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">
              Сохранить
            </button>
          </div>
        </form>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const reqResults = qcResults.filter(r => r.request_id === req.id);
          const tests = getTestsForRequest(req);
          const isExpanded = expandedRequest === req.id;

          const getLatestResult = (testCode: string) => {
            const results = reqResults.filter(r => r.test_code === testCode);
            return results.sort((a, b) => 
              new Date(b.tested_at || 0).getTime() - new Date(a.tested_at || 0).getTime()
            )[0];
          };

          const completedTests = tests.filter(t => getLatestResult(t.code)?.pass_fail === 'Pass').length;
          const failedTests = tests.filter(t => getLatestResult(t.code)?.pass_fail === 'Fail').length;
          const allTestsDone = tests.every(t => {
            const r = getLatestResult(t.code);
            return r?.pass_fail === 'Pass' || r?.pass_fail === 'Fail' || r?.pass_fail === 'NA';
          });

          return (
            <div key={req.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
              req.status === 'Completed' ? 'opacity-75' : ''
            }`}>
              {/* Header */}
              <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
              >
                <div className="flex items-center gap-4">
                  <span className={`p-2 rounded-lg ${req.lot_type === 'CM' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {req.lot_type === 'CM' ? <FlaskConical size={20} /> : <Package size={20} />}
                  </span>
                  <Link 
                    to={req.lot_type === 'CM' ? `/cm/${req.lot_id}` : `/products/${req.lot_id}`}
                    className="font-mono text-blue-600 hover:underline text-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {req.lot_id}
                  </Link>
                  {req.status === 'Completed' ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle size={14} />
                      Завершён
                    </span>
                  ) : req.status === 'InProgress' ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      В работе
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Ожидает
                    </span>
                  )}
                  <span className="text-sm text-slate-500">
                    {completedTests}/{tests.length} тестов
                    {failedTests > 0 && <span className="text-red-600 ml-1">({failedTests} fail)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {req.requested_at ? new Date(req.requested_at).toLocaleDateString('ru-RU') : '-'}
                  </span>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t p-4 bg-slate-50">
                  {/* Tests Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {tests.map(test => {
                      const result = getLatestResult(test.code);
                      return (
                        <div key={test.code} className={`p-3 rounded-lg ${
                          result?.pass_fail === 'Pass' ? 'bg-green-100' :
                          result?.pass_fail === 'Fail' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{test.name}</span>
                            {result?.pass_fail === 'Pass' && <CheckCircle className="text-green-600" size={18} />}
                            {result?.pass_fail === 'Fail' && <XCircle className="text-red-600" size={18} />}
                            {!result && <Clock className="text-gray-400" size={18} />}
                          </div>
                          {result && (
                            <p className="text-xs text-slate-600 mt-1">
                              {result.result_value || '-'} {test.unit || ''}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {canAddResult && req.status !== 'Completed' && (
                      <button
                        onClick={() => openResultForm(req)}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        <Plus size={16} />
                        Добавить результат
                      </button>
                    )}
                    {req.status !== 'Completed' && canAddResult && allTestsDone && (
                      <button
                        onClick={() => completeRequest(req)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
                      >
                        Завершить QC
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredRequests.length === 0 && (
          <p className="text-center py-8 text-slate-500">
            {showCompleted ? 'Нет запросов QC' : 'Нет активных запросов QC'}
          </p>
        )}
      </div>
    </div>
  );
}
