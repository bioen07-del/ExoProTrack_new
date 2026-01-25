import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, QrCode, CheckCircle, XCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase, CmLot, Container, MediaCompatibilitySpec, CmQcResult, CmQaReleaseDecision } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
  Filling: 'Розлив',
  Released: 'Отпущен',
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
  Consumed: 'bg-gray-100 text-gray-800',
};

interface CmLotWithData extends CmLot {
  container?: Container;
  reserved_ml?: number;
  available_ml?: number;
  total_collected_ml?: number;
  media_spec_label?: string;
  qc_status?: Record<string, string | undefined>;
  qc_tests_spec?: string[];
  qa_status?: string;
  expiry_date?: string;
}

export default function CmLotList() {
  const { hasRole } = useAuth();
  const [lots, setLots] = useState<CmLotWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadLots();
  }, []);

  async function loadLots() {
    try {
      const [lotsRes, containersRes, reservationsRes, collectionsRes, mediaSpecsRes, qcResultsRes, qaDecisionsRes, qcRequestsRes] = await Promise.all([
        supabase.from('cm_lot').select('*').order('created_at', { ascending: false }),
        supabase.from('container').select('*').eq('owner_entity_type', 'CM_Lot'),
        supabase.from('reservation').select('*').eq('status', 'Active'),
        supabase.from('collection_event').select('cm_lot_id, volume_ml'),
        supabase.from('media_compatibility_spec').select('*'),
        supabase.from('cm_qc_result').select('*'),
        supabase.from('cm_qa_release_decision').select('*').order('decided_at', { ascending: false }),
        supabase.from('cm_qc_request').select('*'),
      ]);

      const lotsData = lotsRes.data || [];
      const containers = containersRes.data || [];
      const reservations = reservationsRes.data || [];
      const collections = collectionsRes.data || [];
      const mediaSpecs = mediaSpecsRes.data || [];
      const qcResults = qcResultsRes.data || [];
      const qaDecisions = qaDecisionsRes.data || [];
      const qcRequests = qcRequestsRes.data || [];

      const lotsWithData = lotsData.map(lot => {
        const container = containers.find(c => c.owner_id === lot.cm_lot_id);
        const lotReservations = reservations.filter(r => r.cm_lot_id === lot.cm_lot_id);
        const reserved_ml = lotReservations.reduce((sum, r) => sum + r.reserved_volume_ml, 0);
        const current_ml = container?.current_volume_ml || 0;
        
        // Total collected
        const lotCollections = collections.filter(c => c.cm_lot_id === lot.cm_lot_id);
        const total_collected_ml = lotCollections.reduce((sum, c) => sum + (c.volume_ml || 0), 0);
        
        // Media spec label - full name
        const mediaSpec = mediaSpecs.find(m => m.media_spec_id === lot.media_spec_id);
        const media_spec_label = mediaSpec ? `${mediaSpec.base_medium_code} (${mediaSpec.serum_class})` : '-';
        
        // QC status
        const lotQcRequests = qcRequests.filter(r => r.cm_lot_id === lot.cm_lot_id);
        const lotQcRequestIds = lotQcRequests.map(r => r.qc_request_id);
        const lotQcResults = qcResults.filter(r => lotQcRequestIds.includes(r.qc_request_id));
        
        const getLatestResult = (testCode: string) => {
          const results = lotQcResults.filter(r => r.test_code === testCode);
          if (results.length === 0) return undefined;
          return results.sort((a, b) => 
            new Date(b.tested_at || b.created_at || 0).getTime() - new Date(a.tested_at || a.created_at || 0).getTime()
          )[0]?.pass_fail;
        };
        
        // Динамические QC тесты из frozen_spec
        const frozenSpec = (lot as any).frozen_spec;
        const qcTestsFromSpec: string[] = frozenSpec?.qc?.raw?.map((t: any) => t.code || t.name) || ['sterility', 'lal', 'dls'];
        
        const qc_status: Record<string, string | undefined> = {};
        qcTestsFromSpec.forEach((testCode: string) => {
          qc_status[testCode.toLowerCase()] = getLatestResult(testCode);
        });
        
        // QA status & expiry
        const lotQaDecisions = qaDecisions.filter(d => d.cm_lot_id === lot.cm_lot_id);
        const latestQa = lotQaDecisions[0];
        const qa_status = latestQa?.decision;
        const expiry_date = latestQa?.expiry_date;
        
        return {
          ...lot,
          container,
          reserved_ml,
          available_ml: Math.max(0, current_ml - reserved_ml),
          total_collected_ml,
          media_spec_label,
          qc_status,
          qc_tests_spec: qcTestsFromSpec,
          qa_status,
          expiry_date,
        };
      });

      setLots(lotsWithData);
    } catch (error) {
      console.error('Load lots error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLot(cmLotId: string) {
    if (!confirm(`Удалить CM Lot ${cmLotId} и все связанные данные?`)) return;
    try {
      await supabase.from('collection_event').delete().eq('cm_lot_id', cmLotId);
      await supabase.from('processing_step').delete().eq('cm_lot_id', cmLotId);
      const { data: qcReqs } = await supabase.from('cm_qc_request').select('qc_request_id').eq('cm_lot_id', cmLotId);
      if (qcReqs && qcReqs.length > 0) {
        await supabase.from('cm_qc_result').delete().in('qc_request_id', qcReqs.map(r => r.qc_request_id));
      }
      await supabase.from('cm_qc_request').delete().eq('cm_lot_id', cmLotId);
      await supabase.from('cm_qa_release_decision').delete().eq('cm_lot_id', cmLotId);
      await supabase.from('reservation').delete().eq('cm_lot_id', cmLotId);
      await supabase.from('container').delete().eq('owner_id', cmLotId);
      await supabase.from('cm_lot').delete().eq('cm_lot_id', cmLotId);
      loadLots();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  }

  const filteredLots = lots.filter(lot => {
    const matchesSearch = lot.cm_lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.base_product_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || lot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">CM Лоты</h1>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-lg border text-xs">
            <span className="text-slate-500">Легенда:</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Брак</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Внимание</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Одобрено</span>
          </div>
        </div>
        {hasRole(['Production']) && (
          <Link
            to="/cm/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Создать CM Лот
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по ID или коду продукта..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">CM Lot ID</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">Режим</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Продукт</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Среда</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Статус</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Собрано</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">QC</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">QA</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">Срок годн.</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Объем</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Резерв</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 uppercase">Доступно</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">QR</th>
              {hasRole(['Admin']) && <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLots.map((lot) => {
              const isExpiringSoon = lot.expiry_date && 
                new Date(lot.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              
              return (
                <tr key={lot.cm_lot_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link to={`/cm/${lot.cm_lot_id}`} className="font-mono text-sm text-blue-600 hover:underline">
                      {lot.cm_lot_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      lot.mode === 'MTO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {lot.mode || 'MTS'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">{lot.base_product_code}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{lot.media_spec_label}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[lot.status] || lot.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {lot.total_collected_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {(() => {
                        const tests = lot.qc_tests_spec || ['sterility', 'lal', 'dls'];
                        // Если тестов больше 4, показываем одну иконку-сводку
                        if (tests.length > 4) {
                          const allPassed = tests.every(t => lot.qc_status?.[t.toLowerCase()] === 'Pass');
                          const anyFailed = tests.some(t => lot.qc_status?.[t.toLowerCase()] === 'Fail');
                          const completedCount = tests.filter(t => lot.qc_status?.[t.toLowerCase()]).length;
                          return (
                            <span title={`QC: ${completedCount}/${tests.length}`}>
                              {anyFailed ? (
                                <XCircle size={16} className="text-red-500" />
                              ) : allPassed ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : (
                                <Clock size={16} className="text-amber-400" />
                              )}
                            </span>
                          );
                        }
                        // Показываем отдельные иконки для каждого теста
                        return tests.map(test => {
                          const result = lot.qc_status?.[test.toLowerCase()];
                          return (
                            <span key={test} title={test.toUpperCase()}>
                              {result === 'Pass' ? (
                                <CheckCircle size={14} className="text-green-500" />
                              ) : result === 'Fail' ? (
                                <XCircle size={14} className="text-red-500" />
                              ) : (
                                <Clock size={14} className="text-gray-300" />
                              )}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lot.qa_status === 'Approved' ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">OK</span>
                    ) : lot.qa_status === 'Rejected' ? (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Брак</span>
                    ) : lot.qa_status === 'OnHold' ? (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Hold</span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {lot.expiry_date ? (
                      <span className={isExpiringSoon ? 'text-amber-600 flex items-center gap-1' : ''}>
                        {isExpiringSoon && <AlertTriangle size={12} />}
                        {new Date(lot.expiry_date).toLocaleDateString('ru-RU')}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {lot.container?.current_volume_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-amber-600">
                    {lot.reserved_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-emerald-600">
                    {lot.available_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => window.print()}
                      className="text-slate-400 hover:text-blue-600"
                      title="Печать QR"
                    >
                      <QrCode size={16} />
                    </button>
                  </td>
                  {hasRole(['Admin']) && (
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleDeleteLot(lot.cm_lot_id)} className="text-red-400 hover:text-red-600" title="Удалить">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredLots.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );
}
