import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Clock, CheckCircle, AlertTriangle, Droplets } from 'lucide-react';
import { supabase, PackLot } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { StatusBadge } from '../components/ui/status-badge';
import { SkeletonTable } from '../components/ui/skeleton';

const STATUS_LABELS: Record<string, string> = {
  'Planned': 'Запланирован',
  'Filling': 'Розлив',
  'Filled': 'Разлит',
  'QC_Pending': 'Ожидает QC',
  'QC_Completed': 'QC завершён',
  'QA_Pending': 'Ожидает QA',
  'Released': 'Выпущен',
  'Shipped': 'Отгружен',
  'Rejected': 'Брак',
};

// Explicit class lookup for status filter cards (template literals don't work with Tailwind JIT)
const STATUS_CARD_STYLES: Record<string, { active: string; icon: string }> = {
  Filling:      { active: 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700', icon: 'text-blue-600 dark:text-blue-400' },
  QC_Pending:   { active: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700', icon: 'text-yellow-600 dark:text-yellow-400' },
  QC_Completed: { active: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700', icon: 'text-emerald-600 dark:text-emerald-400' },
  Released:     { active: 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700', icon: 'text-green-600 dark:text-green-400' },
  Rejected:     { active: 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700', icon: 'text-red-600 dark:text-red-400' },
};

interface PackLotWithDetails extends PackLot {
  cm_lot?: { cm_lot_id: string; base_product_code: string };
  request_line?: {
    request_id: string;
    finished_product_code: string;
    request?: { customer_ref: string };
  };
  pack_format?: { name: string; nominal_fill_volume_ml: number };
}

export default function PackLotList() {
  const [packLots, setPackLots] = useState<PackLotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from('pack_lot')
        .select(`
          *,
          cm_lot:source_cm_lot_id(cm_lot_id, base_product_code),
          request_line:request_line_id(request_id, finished_product_code, request:request_id(customer_ref)),
          pack_format:pack_format_code(name, nominal_fill_volume_ml)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackLots((data || []) as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredLots = packLots.filter(lot => {
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    const matchesSearch = !searchQuery ||
      lot.pack_lot_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.source_cm_lot_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lot.request_line as any)?.finished_product_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Группировка по статусам для статистики
  const statusCounts = packLots.reduce((acc, lot) => {
    acc[lot.status] = (acc[lot.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Готовая продукция</h1>
            <p className="text-muted-foreground">Управление партиями продукции (Pack Lots)</p>
          </div>
        </div>
        <SkeletonTable rows={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Готовая продукция</h1>
          <p className="text-muted-foreground">Управление партиями продукции (Pack Lots)</p>
        </div>
        <Button asChild>
          <Link to="/requests" className="flex items-center gap-2">
            <Package size={18} />
            Создать заявку
          </Link>
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { status: 'Filling', icon: Droplets },
          { status: 'QC_Pending', icon: Clock },
          { status: 'QC_Completed', icon: CheckCircle },
          { status: 'Released', icon: Package },
          { status: 'Rejected', icon: AlertTriangle },
        ].map(({ status, icon: Icon }) => {
          const isActive = statusFilter === status;
          const styles = STATUS_CARD_STYLES[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? styles.active
                  : 'bg-card border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className={styles.icon} />
                <span className="text-2xl font-bold text-foreground">{statusCounts[status] || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{STATUS_LABELS[status]}</p>
            </button>
          );
        })}
      </div>

      {/* Search and filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск по ID, продукту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
        >
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Pack Lots table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Pack Lot ID</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Продукт</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Источник CM</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Кол-во</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Заявка</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Статус</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Создан</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLots.map((lot) => (
              <tr key={lot.pack_lot_id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    to={`/packlot/${lot.pack_lot_id}`}
                    className="font-mono text-primary hover:underline font-medium"
                  >
                    {lot.pack_lot_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  {(lot.request_line as any)?.finished_product_code || '-'}
                  {(lot.pack_format as any)?.name && (
                    <span className="text-muted-foreground ml-1">
                      ({(lot.pack_format as any).name})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/cm/${lot.source_cm_lot_id}`}
                    className="font-mono text-sm text-muted-foreground hover:text-primary"
                  >
                    {lot.source_cm_lot_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium">{lot.qty_produced || 0}</span>
                  <span className="text-muted-foreground">/{lot.qty_planned}</span>
                  <span className="text-xs text-muted-foreground ml-1">шт</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {(lot.request_line as any)?.request_id ? (
                    <Link
                      to={`/requests/${(lot.request_line as any).request_id}`}
                      className="text-primary hover:underline"
                    >
                      {(lot.request_line as any).request_id}
                    </Link>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lot.status} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {lot.created_at ? new Date(lot.created_at).toLocaleDateString('ru-RU') : '-'}
                </td>
              </tr>
            ))}
            {filteredLots.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
