import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, QrCode, CheckCircle, XCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase, CmLot, Container, MediaCompatibilitySpec, CmQcResult, CmQaReleaseDecision } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { SkeletonTable } from '../components/ui/skeleton';
import { showConfirm, showError } from '../lib/toast';

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

const STATUS_BADGE_VARIANT: Record<string, 'info' | 'secondary' | 'warning' | 'success' | 'destructive' | 'muted'> = {
  Open: 'info',
  Closed_Collected: 'secondary',
  In_Processing: 'warning',
  QC_Pending: 'warning',
  QC_Completed: 'success',
  Approved: 'success',
  Rejected: 'destructive',
  OnHold: 'warning',
  Consumed: 'muted',
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
    const ok = await showConfirm(`Удалить CM Lot ${cmLotId} и все связанные данные?`);
    if (!ok) return;
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
      showError('Ошибка удаления', err.message);
    }
  }

  const filteredLots = lots.filter(lot => {
    const matchesSearch = lot.cm_lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.base_product_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || lot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <SkeletonTable rows={8} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">CM Лоты</h1>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs">
            <span className="text-muted-foreground">Легенда:</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Брак</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Внимание</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Одобрено</span>
          </div>
        </div>
        {hasRole(['Production']) && (
          <Button asChild>
            <Link to="/cm/new">
              <Plus size={20} />
              Создать CM Лот
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10" size={20} />
          <Input
            type="text"
            placeholder="Поиск по ID или коду продукта..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CM Lot ID</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Режим</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Продукт</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Среда</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Собрано</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase">QC</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase">QA</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Срок годн.</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Объем</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Резерв</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Доступно</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase">QR</th>
              {hasRole(['Admin']) && <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLots.map((lot) => {
              const isExpiringSoon = lot.expiry_date &&
                new Date(lot.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              return (
                <tr key={lot.cm_lot_id} className="hover:bg-muted">
                  <td className="px-3 py-2">
                    <Link to={`/cm/${lot.cm_lot_id}`} className="font-mono text-sm text-primary hover:underline">
                      {lot.cm_lot_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={lot.mode === 'MTO' ? 'info' : 'muted'}>
                      {lot.mode || 'MTS'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-sm">{lot.base_product_code}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{lot.media_spec_label}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_BADGE_VARIANT[lot.status] || 'muted'}>
                      {STATUS_LABELS[lot.status] || lot.status}
                    </Badge>
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
                                <Clock size={16} className="text-amber-400 dark:text-amber-300" />
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
                                <Clock size={14} className="text-muted-foreground/50" />
                              )}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lot.qa_status === 'Approved' ? (
                      <Badge variant="success">OK</Badge>
                    ) : lot.qa_status === 'Rejected' ? (
                      <Badge variant="destructive">Брак</Badge>
                    ) : lot.qa_status === 'OnHold' ? (
                      <Badge variant="warning">Hold</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {lot.expiry_date ? (
                      <span className={isExpiringSoon ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1' : ''}>
                        {isExpiringSoon && <AlertTriangle size={12} />}
                        {new Date(lot.expiry_date).toLocaleDateString('ru-RU')}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono">
                    {lot.container?.current_volume_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-amber-600 dark:text-amber-400">
                    {lot.reserved_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {lot.available_ml?.toFixed(1) || '0.0'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => window.print()}
                      title="Печать QR"
                    >
                      <QrCode size={16} />
                    </Button>
                  </td>
                  {hasRole(['Admin']) && (
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteLot(lot.cm_lot_id)}
                        title="Удалить"
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Нет данных для отображения
          </div>
        )}
      </Card>
    </div>
  );
}
