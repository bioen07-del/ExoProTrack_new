import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react';
const ReactECharts = ReactEChartsCore as any;
import { Plus, AlertTriangle, Clock, Package, Beaker, CheckCircle, Box } from 'lucide-react';
import { supabase, CmLot, PackLot, StockMovement, Container, RequestLine } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SkeletonDashboard } from '../components/ui/skeleton';

interface MtoRequest {
  request_line_id: string;
  request_id: string;
  finished_product_code: string;
  pack_format_code: string;
  qty_units: number;
  due_date?: string;
  created_at?: string;
  days_left?: number;
  is_overdue?: boolean;
  is_urgent?: boolean;
}

interface FefoItem {
  cm_lot_id: string;
  base_product_code: string;
  expiry_date: string | null;
  volume_ml: number;
  days_to_expiry: number | null;
}

interface DashboardStats {
  cmLotsByStatus: Record<string, number>;
  packLotsByStatus: Record<string, number>;
  expiryAlerts: CmLot[];
  stockMovements: StockMovement[];
  requestStats: { new: number; inWork: number; overdue: number };
  cmLotsApproved: number;
  packLotsReleased: number;
  totalRawVolume: number;
  totalFinishedVolume: number;
  dailyVolumeFlow: Record<string, { collected: number; processed: number }>;
  packLotReleasesByDay: Record<string, number>;
  mtoRequests: MtoRequest[];
  fefoList: FefoItem[];
}

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
  Planned: 'Запланировано',
  Filling: 'Розлив',
  Lyophilizing: 'Лиофилизация',
  Packed: 'Упаковано',
  Additional_QC_Pending: 'Ожидает доп. QC',
  Released: 'Отпущен',
  Shipped: 'Отгружено',
};

const STATUS_COLORS: Record<string, string> = {
  Open: '#3b82f6',
  Closed_Collected: '#8b5cf6',
  In_Processing: '#f59e0b',
  QC_Pending: '#eab308',
  QC_Completed: '#22c55e',
  Approved: '#10b981',
  Rejected: '#ef4444',
  OnHold: '#f97316',
  Consumed: '#6b7280',
  Planned: '#94a3b8',
  Filling: '#3b82f6',
  Released: '#10b981',
  Shipped: '#059669',
};

// Компонент легенды цветов
function ColorLegend() {
  const items = [
    { variant: 'destructive' as const, label: 'Просрочено / Брак' },
    { variant: 'warning' as const, label: 'Срочно / Внимание' },
    { variant: 'success' as const, label: 'В норме / Одобрено' },
  ];
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted rounded-lg border border-border">
      <span className="text-sm font-medium text-muted-foreground">Легенда:</span>
      {items.map(item => (
        <Badge key={item.label} variant={item.variant} className="text-xs">
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [cmLotsRes, packLotsRes, movementsRes, requestsRes, containersRes, collectionsRes] = await Promise.all([
        supabase.from('cm_lot').select('*'),
        supabase.from('pack_lot').select('*'),
        supabase.from('stock_movement').select('*').order('moved_at', { ascending: false }).limit(50),
        supabase.from('request').select('*'),
        supabase.from('container').select('*'),
        supabase.from('collection_event').select('collected_at, volume_ml').order('collected_at', { ascending: false }).limit(100),
      ]);

      const cmLots = cmLotsRes.data || [];
      const packLots = packLotsRes.data || [];
      const containers = containersRes.data || [];
      const collections = collectionsRes.data || [];

      const cmLotsByStatus: Record<string, number> = {};
      cmLots.forEach(lot => {
        cmLotsByStatus[lot.status] = (cmLotsByStatus[lot.status] || 0) + 1;
      });

      const packLotsByStatus: Record<string, number> = {};
      packLots.forEach(lot => {
        packLotsByStatus[lot.status] = (packLotsByStatus[lot.status] || 0) + 1;
      });

      // Calculate summary stats
      const cmLotsApproved = cmLots.filter(l => l.status === 'Approved').length;
      const packLotsReleased = packLots.filter(l => l.status === 'Released').length;

      // Total raw volume from containers (DB uses 'CM_Lot')
      const rawContainers = containers.filter(c => c.owner_entity_type === 'CM_Lot' || c.owner_entity_type === 'CmLot');
      const totalRawVolume = rawContainers.reduce((sum, c) => sum + (c.current_volume_ml || 0), 0);

      // Total finished volume from pack lots
      const totalFinishedVolume = packLots
        .filter(p => p.status === 'Released')
        .reduce((sum, p) => sum + (p.total_filled_volume_ml || 0), 0);

      // Expiry alerts - CM lots with expiry within 30 days
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: decisionsWithExpiry } = await supabase
        .from('cm_qa_release_decision')
        .select('*')
        .eq('decision', 'Approved')
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]);

      const expiryLotIds = decisionsWithExpiry?.map(d => d.cm_lot_id) || [];
      const expiryAlerts = cmLots.filter(lot =>
        expiryLotIds.includes(lot.cm_lot_id) && lot.status === 'Approved'
      );

      const requests = requestsRes.data || [];
      const requestStats = {
        new: requests.filter(r => r.status === 'New').length,
        inWork: requests.filter(r => r.status === 'InProgress').length,
        overdue: requests.filter(r => {
          if (!r.due_date) return false;
          return new Date(r.due_date) < now && r.status !== 'Completed';
        }).length,
      };

      // Daily volume flow from collections
      const dailyVolumeFlow: Record<string, { collected: number; processed: number }> = {};
      collections.forEach(c => {
        const day = c.collected_at?.split('T')[0] || 'unknown';
        if (!dailyVolumeFlow[day]) dailyVolumeFlow[day] = { collected: 0, processed: 0 };
        dailyVolumeFlow[day].collected += c.volume_ml || 0;
      });

      // PackLot releases by day
      const packLotReleasesByDay: Record<string, number> = {};
      packLots.filter(p => p.status === 'Released').forEach(p => {
        const day = p.packed_at?.split('T')[0] || p.created_at?.split('T')[0] || 'unknown';
        packLotReleasesByDay[day] = (packLotReleasesByDay[day] || 0) + (p.qty_produced || p.qty_planned || 1);
      });

      // MTO requests - lines with NewProduction/new_batch source_type and no CM_Lot created yet
      const { data: mtoLines } = await supabase
        .from('request_line')
        .select('*, request:request_id(status, due_date, created_at)')
        .or('source_type.eq.NewProduction,source_type.eq.new_batch');

      const existingMtoCmLots = cmLots.filter((l: any) => l.request_line_id).map((l: any) => l.request_line_id);
      const mtoRequests = (mtoLines || [])
        .filter((line: any) => !existingMtoCmLots.includes(line.request_line_id) && line.request?.status !== 'Completed')
        .map((line: any) => {
          const dueDate = line.request?.due_date;
          const createdAt = line.request?.created_at;
          const daysLeft = dueDate ? Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;
          const isOverdue = daysLeft !== null && daysLeft < 0;
          const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 3;
          return {
            request_line_id: line.request_line_id,
            request_id: line.request_id,
            finished_product_code: line.finished_product_code,
            pack_format_code: line.pack_format_code,
            qty_units: line.qty_units,
            due_date: dueDate,
            created_at: createdAt,
            days_left: daysLeft,
            is_overdue: isOverdue,
            is_urgent: isUrgent,
          };
        })
        .sort((a: any, b: any) => {
          // Sort by urgency: overdue first, then urgent, then by due_date (FEFO)
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;
          if (a.is_urgent && !b.is_urgent) return -1;
          if (!a.is_urgent && b.is_urgent) return 1;
          if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          return 0;
        });

      // FEFO list - ALL Approved CM lots, sorted by expiry date (null first)
      const { data: allDecisions } = await supabase
        .from('cm_qa_release_decision')
        .select('*')
        .eq('decision', 'Approved');

      const fefoList: FefoItem[] = [];
      for (const lot of cmLots.filter(l => l.status === 'Approved')) {
        const decision = allDecisions?.find(d => d.cm_lot_id === lot.cm_lot_id);
        const container = containers.find(c => c.owner_id === lot.cm_lot_id);
        const expiryDate = decision?.expiry_date || null;
        const daysToExpiry = expiryDate
          ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        fefoList.push({
          cm_lot_id: lot.cm_lot_id,
          base_product_code: lot.base_product_code,
          expiry_date: expiryDate,
          volume_ml: container?.current_volume_ml || 0,
          days_to_expiry: daysToExpiry,
        });
      }
      // Sort: null expiry first, then by expiry_date ascending
      fefoList.sort((a, b) => {
        if (a.expiry_date === null && b.expiry_date !== null) return -1;
        if (a.expiry_date !== null && b.expiry_date === null) return 1;
        if (a.expiry_date && b.expiry_date) return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        return 0;
      });

      setStats({
        cmLotsByStatus,
        packLotsByStatus,
        expiryAlerts,
        stockMovements: movementsRes.data || [],
        requestStats,
        cmLotsApproved,
        packLotsReleased,
        totalRawVolume,
        totalFinishedVolume,
        dailyVolumeFlow,
        packLotReleasesByDay,
        mtoRequests,
        fefoList,
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const cmPieOption = stats ? {
    title: { text: 'CM Лоты по статусам', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(stats.cmLotsByStatus).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        itemStyle: { color: STATUS_COLORS[status] || '#6b7280' }
      })),
      label: { show: true, formatter: '{b}: {c}' }
    }]
  } : {};

  const packPieOption = stats ? {
    title: { text: 'Продукт по статусам', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: Object.entries(stats.packLotsByStatus).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        itemStyle: { color: STATUS_COLORS[status] || '#6b7280' }
      })),
      label: { show: true, formatter: '{b}: {c}' }
    }]
  } : {};

  // Stock movements chart - group by day
  const movementsByDay = stats?.stockMovements.reduce((acc, m) => {
    const day = m.moved_at?.split('T')[0] || 'unknown';
    if (!acc[day]) acc[day] = { in: 0, out: 0 };
    if (m.direction === 'In') acc[day].in += m.qty;
    else if (m.direction === 'Out') acc[day].out += m.qty;
    return acc;
  }, {} as Record<string, { in: number; out: number }>) || {};

  const movementDays = Object.keys(movementsByDay).sort().slice(-14);
  const stockLineOption = {
    title: { text: 'Приход/Расход сырья (мл)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['Приход', 'Расход'], bottom: 0 },
    xAxis: { type: 'category', data: movementDays },
    yAxis: { type: 'value', name: 'мл' },
    series: [
      { name: 'Приход', type: 'bar', data: movementDays.map(d => movementsByDay[d]?.in || 0), color: '#10b981' },
      { name: 'Расход', type: 'bar', data: movementDays.map(d => movementsByDay[d]?.out || 0), color: '#ef4444' },
    ]
  };

  // Daily collection volume chart
  const collectionDays = Object.keys(stats?.dailyVolumeFlow || {}).sort().slice(-14);
  const dailyCollectionOption = {
    title: { text: 'Ежедневный сбор CM (мл)', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: collectionDays },
    yAxis: { type: 'value', name: 'мл' },
    series: [
      {
        name: 'Собрано',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: collectionDays.map(d => stats?.dailyVolumeFlow[d]?.collected || 0),
        color: '#3b82f6'
      },
    ]
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Дашборд</h1>
          <ColorLegend />
        </div>
        <div className="flex gap-2">
          {hasRole(['Production']) && (
            <Button asChild>
              <Link to="/cm/new" className="flex items-center gap-2">
                <Plus size={20} />
                Создать CM Лот
              </Link>
            </Button>
          )}
          {hasRole(['Manager', 'Admin']) && (
            <Button
              variant="success"
              onClick={() => navigate('/requests?create=true')}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              Создать заявку
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats - 4 new widgets */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Beaker size={24} />
              </div>
              <div>
                <p className="text-sm text-blue-100">CM на хранении</p>
                <p className="text-3xl font-bold">{stats?.cmLotsApproved || 0}</p>
                <p className="text-xs text-blue-200">лотов (Approved)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Box size={24} />
              </div>
              <div>
                <p className="text-sm text-emerald-100">Готовая продукция</p>
                <p className="text-3xl font-bold">{stats?.packLotsReleased || 0}</p>
                <p className="text-xs text-emerald-200">лотов (Released)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package size={24} />
              </div>
              <div>
                <p className="text-sm text-purple-100">Объём сырья</p>
                <p className="text-3xl font-bold">{((stats?.totalRawVolume || 0) / 1000).toFixed(1)}</p>
                <p className="text-xs text-purple-200">литров</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white">
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-amber-100">Объём ГП</p>
                <p className="text-3xl font-bold">{((stats?.totalFinishedVolume || 0) / 1000).toFixed(1)}</p>
                <p className="text-xs text-amber-200">литров</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Новые заявки</p>
                <p className="text-2xl font-bold">{stats?.requestStats.new || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Package className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">В работе</p>
                <p className="text-2xl font-bold">{stats?.requestStats.inWork || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Просроченные</p>
                <p className="text-2xl font-bold text-red-600">{stats?.requestStats.overdue || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 pt-4">
            <ReactECharts option={cmPieOption} style={{ height: 300 }} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-4">
            <ReactECharts option={packPieOption} style={{ height: 300 }} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 pt-4">
            <ReactECharts option={stockLineOption} style={{ height: 280 }} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 pt-4">
            <ReactECharts option={dailyCollectionOption} style={{ height: 280 }} />
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      {stats && stats.expiryAlerts.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 pt-4">
            <h3 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
              <AlertTriangle size={20} />
              Скоро истекает срок годности ({stats.expiryAlerts.length})
            </h3>
            <div className="space-y-2">
              {stats.expiryAlerts.slice(0, 5).map(lot => (
                <Link
                  key={lot.cm_lot_id}
                  to={`/cm/${lot.cm_lot_id}`}
                  className="block p-2 bg-card rounded border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <span className="font-mono text-sm">{lot.cm_lot_id}</span>
                  <span className="text-muted-foreground ml-2">{lot.base_product_code}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FEFO Table - CM Lots on Stock */}
      {stats && (
        <Card>
          <CardContent className="p-4 pt-4">
            <h3 className="font-semibold text-foreground mb-3">CM на складе (FEFO)</h3>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">CM Lot</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Продукт</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Объем</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Годен до</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Дней</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.fefoList.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">Нет CM на складе (Approved)</td></tr>
                ) : stats.fefoList.slice(0, 10).map(item => (
                  <tr key={item.cm_lot_id} className={item.days_to_expiry !== null && item.days_to_expiry <= 30 ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <td className="px-3 py-2">
                      <Link to={`/cm/${item.cm_lot_id}`} className="font-mono text-blue-600 dark:text-blue-400 hover:underline">
                        {item.cm_lot_id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item.base_product_code}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.volume_ml.toFixed(1)} мл</td>
                    <td className="px-3 py-2">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('ru-RU') : <span className="text-muted-foreground">Не указана</span>}</td>
                    <td className={`px-3 py-2 text-right font-bold ${item.days_to_expiry !== null && item.days_to_expiry <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {item.days_to_expiry !== null ? item.days_to_expiry : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* MTO Production Requests - Only for Production role */}
      {hasRole(['Production']) && stats && (
        <Card>
          <CardContent className="p-4 pt-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <Beaker size={20} />
              Заявки на производство (MTO/FEFO) ({stats.mtoRequests.length})
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Номер</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Продукт</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Создана</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Срок</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Осталось</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.mtoRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Нет заявок на производство MTO</td></tr>
                ) : stats.mtoRequests.map(req => (
                  <tr key={req.request_line_id} className={
                    req.is_overdue ? 'bg-red-50 dark:bg-red-950/20' : req.is_urgent ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                  }>
                    <td className="px-3 py-2">
                      <Link to={`/requests/${req.request_id}`} className="font-mono text-blue-600 dark:text-blue-400 hover:underline">
                        {req.request_id}
                      </Link>
                      {req.is_overdue && <Badge variant="destructive" className="ml-2">ПРОСРОЧЕНО</Badge>}
                      {req.is_urgent && <Badge variant="warning" className="ml-2">СРОЧНО</Badge>}
                    </td>
                    <td className="px-3 py-2">{req.finished_product_code} x{req.qty_units}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {req.due_date ? new Date(req.due_date).toLocaleDateString('ru-RU') : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${
                      req.is_overdue ? 'text-red-600' : req.is_urgent ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {req.days_left !== null && req.days_left !== undefined ? `${req.days_left} дн.` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" asChild>
                        <Link to={`/cm/new?mto=${req.request_line_id}`}>
                          Стартовать CM
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
