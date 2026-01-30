import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, CmLot, CmQcRequest, CmQcResult, CmQaReleaseDecision, Container } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { Badge } from '../components/ui';
import { showError, showWarning } from '../lib/toast';

export default function QaPage() {
  const { user } = useAuth();
  const [pendingLots, setPendingLots] = useState<CmLot[]>([]);
  const [decisions, setDecisions] = useState<CmQaReleaseDecision[]>([]);
  const [qcData, setQcData] = useState<Record<string, Record<string, CmQcResult>>>({});
  const [loading, setLoading] = useState(true);

  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [selectedLot, setSelectedLot] = useState<CmLot | null>(null);
  const [formData, setFormData] = useState({
    decision: 'Approved',
    shelf_life_days: 365,
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [lotsRes, decisionsRes, requestsRes, resultsRes] = await Promise.all([
        supabase.from('cm_lot').select('*').in('status', ['QC_Completed', 'QC_Pending']).order('created_at', { ascending: false }),
        supabase.from('cm_qa_release_decision').select('*').order('decided_at', { ascending: false }),
        supabase.from('cm_qc_request').select('*'),
        supabase.from('cm_qc_result').select('*'),
      ]);

      setPendingLots(lotsRes.data || []);
      setDecisions(decisionsRes.data || []);

      // Build QC data map
      const requests = requestsRes.data || [];
      const results = resultsRes.data || [];
      const qcMap: Record<string, Record<string, CmQcResult>> = {};

      (lotsRes.data || []).forEach(lot => {
        const lotRequests = requests.filter(r => r.cm_lot_id === lot.cm_lot_id);
        const requestIds = lotRequests.map(r => r.qc_request_id);
        const lotResults = results.filter(r => requestIds.includes(r.qc_request_id));

        const latestByTest: Record<string, CmQcResult> = {};
        lotResults.forEach(r => {
          if (!latestByTest[r.test_code] ||
              new Date(r.tested_at || r.created_at || 0) > new Date(latestByTest[r.test_code].tested_at || latestByTest[r.test_code].created_at || 0)) {
            latestByTest[r.test_code] = r;
          }
        });

        qcMap[lot.cm_lot_id] = latestByTest;
      });

      setQcData(qcMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLot) return;

    const lotQc = qcData[selectedLot.cm_lot_id] || {};
    const hasAllQc = ['Sterility', 'LAL', 'DLS'].every(t => lotQc[t]?.pass_fail === 'Pass');
    const needsReason = formData.decision === 'Approved' && !hasAllQc;

    if (needsReason && !formData.reason.trim()) {
      showWarning('Обоснование обязательно', 'При одобрении без полного QC необходим комментарий');
      return;
    }

    try {
      const now = new Date();
      const qaReleaseDate = now.toISOString().split('T')[0];
      const expiryDate = new Date(now.getTime() + formData.shelf_life_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      await supabase.from('cm_qa_release_decision').insert({
        cm_lot_id: selectedLot.cm_lot_id,
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
        .eq('cm_lot_id', selectedLot.cm_lot_id);

      // If approved, update container and create stock movement
      if (formData.decision === 'Approved') {
        const { data: container } = await supabase
          .from('container')
          .select('*')
          .eq('owner_id', selectedLot.cm_lot_id)
          .eq('owner_entity_type', 'CM_Lot')
          .single();

        if (container) {
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
      }

      setShowDecisionForm(false);
      setSelectedLot(null);
      setFormData({ decision: 'Approved', shelf_life_days: 365, reason: '' });
      loadData();
    } catch (err: any) {
      showError('Ошибка', err.message);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Решения QA</h1>

      {/* Decision Form */}
      {showDecisionForm && selectedLot && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleDecision} className="space-y-4">
              <h3 className="font-semibold">Решение QA для {selectedLot.cm_lot_id}</h3>

              {/* QC Status */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Статус QC:</p>
                <div className="flex gap-4">
                  {['Sterility', 'LAL', 'DLS'].map(test => {
                    const result = qcData[selectedLot.cm_lot_id]?.[test];
                    return (
                      <div key={test} className="flex items-center gap-2">
                        {result?.pass_fail === 'Pass' ? (
                          <CheckCircle className="text-green-500" size={18} />
                        ) : result?.pass_fail === 'Fail' ? (
                          <XCircle className="text-red-500" size={18} />
                        ) : (
                          <AlertTriangle className="text-amber-500" size={18} />
                        )}
                        <span>{test}: {result?.pass_fail || 'Нет данных'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Решение *</label>
                  <select
                    value={formData.decision}
                    onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Approved">QA одобрено</option>
                    <option value="Rejected">Брак</option>
                    <option value="OnHold">На удержании</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Срок годности (дней) *</label>
                  <input
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Обоснование
                    {formData.decision === 'Approved' &&
                     !['Sterility', 'LAL', 'DLS'].every(t => qcData[selectedLot.cm_lot_id]?.[t]?.pass_fail === 'Pass') &&
                     <span className="text-red-500"> *</span>}
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowDecisionForm(false); setSelectedLot(null); }}>
                  Отмена
                </Button>
                <Button type="submit" variant="success">
                  Подтвердить решение
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Lots */}
      <Card>
        <CardHeader>
          <CardTitle>Ожидают решения QA ({pendingLots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">CM Lot</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Продукт</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">QC</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingLots.map((lot) => {
                const lotQc = qcData[lot.cm_lot_id] || {};
                const hasAllQc = ['Sterility', 'LAL', 'DLS'].every(t => lotQc[t]?.pass_fail === 'Pass');

                return (
                  <tr key={lot.cm_lot_id} className="hover:bg-muted">
                    <td className="px-4 py-2">
                      <Link to={`/cm/${lot.cm_lot_id}`} className="font-mono text-blue-600 hover:underline">
                        {lot.cm_lot_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm">{lot.base_product_code}</td>
                    <td className="px-4 py-2 text-sm">{lot.status}</td>
                    <td className="px-4 py-2 text-center">
                      {hasAllQc ? (
                        <CheckCircle className="text-green-500 inline" size={18} />
                      ) : (
                        <AlertTriangle className="text-amber-500 inline" size={18} />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => { setSelectedLot(lot); setShowDecisionForm(true); }}
                      >
                        Принять решение
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pendingLots.length === 0 && (
            <p className="text-center py-4 text-muted-foreground">Нет лотов, ожидающих решения</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Последние решения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {decisions.slice(0, 10).map((d) => (
              <div key={d.decision_id} className={`p-3 rounded-lg ${
                d.decision === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/30' :
                d.decision === 'Rejected' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-orange-50 dark:bg-orange-950/30'
              }`}>
                <div className="flex justify-between items-center">
                  <Link to={`/cm/${d.cm_lot_id}`} className="font-mono text-blue-600 hover:underline">
                    {d.cm_lot_id}
                  </Link>
                  {d.decision === 'Approved' ? (
                    <Badge variant="success">QA одобрено</Badge>
                  ) : d.decision === 'Rejected' ? (
                    <Badge variant="destructive">Брак</Badge>
                  ) : (
                    <Badge variant="warning">На удержании</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {d.decided_at ? new Date(d.decided_at).toLocaleString('ru-RU') : '-'} |
                  Годен до: {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('ru-RU') : '-'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
