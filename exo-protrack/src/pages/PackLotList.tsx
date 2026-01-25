import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, Clock, CheckCircle, AlertTriangle, Droplets } from 'lucide-react';
import { supabase, PackLot } from '../lib/supabase';

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

const STATUS_COLORS: Record<string, string> = {
  'Planned': 'bg-slate-100 text-slate-700',
  'Filling': 'bg-blue-100 text-blue-800',
  'Filled': 'bg-cyan-100 text-cyan-800',
  'QC_Pending': 'bg-yellow-100 text-yellow-800',
  'QC_Completed': 'bg-emerald-100 text-emerald-800',
  'QA_Pending': 'bg-orange-100 text-orange-800',
  'Released': 'bg-green-100 text-green-800',
  'Shipped': 'bg-purple-100 text-purple-800',
  'Rejected': 'bg-red-100 text-red-800',
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
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Готовая продукция</h1>
          <p className="text-slate-500">Управление партиями продукции (Pack Lots)</p>
        </div>
        <Link
          to="/requests"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Package size={18} />
          Создать заявку
        </Link>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { status: 'Filling', icon: Droplets, color: 'blue' },
          { status: 'QC_Pending', icon: Clock, color: 'yellow' },
          { status: 'QC_Completed', icon: CheckCircle, color: 'emerald' },
          { status: 'Released', icon: Package, color: 'green' },
          { status: 'Rejected', icon: AlertTriangle, color: 'red' },
        ].map(({ status, icon: Icon, color }) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === status 
                ? `bg-${color}-100 border-${color}-300` 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon size={18} className={`text-${color}-600`} />
              <span className="text-2xl font-bold">{statusCounts[status] || 0}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{STATUS_LABELS[status]}</p>
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по ID, продукту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Pack Lots table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Pack Lot ID</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Продукт</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Источник CM</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Кол-во</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Заявка</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Статус</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Создан</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLots.map((lot) => (
              <tr key={lot.pack_lot_id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link 
                    to={`/packlot/${lot.pack_lot_id}`}
                    className="font-mono text-blue-600 hover:underline font-medium"
                  >
                    {lot.pack_lot_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  {(lot.request_line as any)?.finished_product_code || '-'}
                  {(lot.pack_format as any)?.name && (
                    <span className="text-slate-400 ml-1">
                      ({(lot.pack_format as any).name})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link 
                    to={`/cm/${lot.source_cm_lot_id}`}
                    className="font-mono text-sm text-slate-600 hover:text-blue-600"
                  >
                    {lot.source_cm_lot_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-medium">{lot.qty_produced || 0}</span>
                  <span className="text-slate-400">/{lot.qty_planned}</span>
                  <span className="text-xs text-slate-400 ml-1">шт</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {(lot.request_line as any)?.request_id ? (
                    <Link 
                      to={`/requests/${(lot.request_line as any).request_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {(lot.request_line as any).request_id}
                    </Link>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[lot.status] || lot.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {lot.created_at ? new Date(lot.created_at).toLocaleDateString('ru-RU') : '-'}
                </td>
              </tr>
            ))}
            {filteredLots.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Нет данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
