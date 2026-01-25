import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, AlertTriangle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, CmLot, PackLot, Container, StockMovement, Reservation } from '../lib/supabase';

type Tab = 'raw' | 'finished' | 'movements';

export default function Warehouse() {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('raw');
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedPackLot, setSelectedPackLot] = useState<PackLot | null>(null);
  const [shipQty, setShipQty] = useState(0);
  const [cmLots, setCmLots] = useState<(CmLot & { container?: Container; reserved_ml?: number; available_ml?: number; expiry_date?: string })[]>([]);
  const [packLots, setPackLots] = useState<(PackLot & { container?: Container })[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cmRes, packRes, containerRes, movementRes, reservationRes, decisionRes] = await Promise.all([
        supabase.from('cm_lot').select('*').eq('status', 'Approved'),
        supabase.from('pack_lot').select('*').eq('status', 'Released'),
        supabase.from('container').select('*'),
        supabase.from('stock_movement').select('*').order('moved_at', { ascending: false }).limit(100),
        supabase.from('reservation').select('*').eq('status', 'Active'),
        supabase.from('cm_qa_release_decision').select('*').eq('decision', 'Approved'),
      ]);

      const containers = containerRes.data || [];
      const reservations = reservationRes.data || [];
      const decisions = decisionRes.data || [];

      // Process CM Lots with volumes
      const processedCmLots = (cmRes.data || []).map(lot => {
        const container = containers.find(c => c.owner_id === lot.cm_lot_id && c.owner_entity_type === 'CM_Lot');
        const lotReservations = reservations.filter(r => r.cm_lot_id === lot.cm_lot_id);
        const reserved_ml = lotReservations.reduce((sum, r) => sum + r.reserved_volume_ml, 0);
        const current_ml = container?.current_volume_ml || 0;
        const decision = decisions.find(d => d.cm_lot_id === lot.cm_lot_id);
        
        return {
          ...lot,
          container,
          reserved_ml,
          available_ml: Math.max(0, current_ml - reserved_ml),
          expiry_date: decision?.expiry_date,
        };
      });

      // Process Pack Lots
      const processedPackLots = (packRes.data || []).map(pack => {
        const container = containers.find(c => c.owner_id === pack.pack_lot_id && c.owner_entity_type === 'PackLot');
        return { ...pack, container };
      });

      setCmLots(processedCmLots);
      setPackLots(processedPackLots);
      setMovements(movementRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  // Check for expiry alerts (within 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiryAlerts = cmLots.filter(lot => 
    lot.expiry_date && new Date(lot.expiry_date) <= thirtyDaysFromNow
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Склад</h1>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle size={20} />
            Скоро истекает срок годности ({expiryAlerts.length})
          </h3>
          <div className="mt-2 space-y-1">
            {expiryAlerts.slice(0, 5).map(lot => (
              <Link
                key={lot.cm_lot_id}
                to={`/cm/${lot.cm_lot_id}`}
                className="block text-sm text-amber-700 hover:underline"
              >
                {lot.cm_lot_id} - до {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString('ru-RU') : '-'}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'raw' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            <Package size={18} />
            Сырье (CM) ({cmLots.length})
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'finished' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            <Truck size={18} />
            Готовая продукция ({packLots.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'movements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Движения
          </button>
        </nav>
      </div>

      {/* Raw Materials */}
      {activeTab === 'raw' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">CM Lot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Продукт</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Объем (мл)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Резерв (мл)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Доступно (мл)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Годен до</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cmLots.map((lot) => {
                const isExpiringSoon = lot.expiry_date && new Date(lot.expiry_date) <= thirtyDaysFromNow;
                return (
                  <tr key={lot.cm_lot_id} className={`hover:bg-slate-50 ${isExpiringSoon ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link to={`/cm/${lot.cm_lot_id}`} className="font-mono text-blue-600 hover:underline">
                        {lot.cm_lot_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{lot.base_product_code}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {lot.container?.current_volume_ml?.toFixed(1) || '0.0'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-amber-600">
                      {lot.reserved_ml?.toFixed(1) || '0.0'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-emerald-600">
                      {lot.available_ml?.toFixed(1) || '0.0'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lot.expiry_date ? (
                        <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                          {new Date(lot.expiry_date).toLocaleDateString('ru-RU')}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {cmLots.length === 0 && (
            <p className="text-center py-8 text-slate-500">Нет сырья на складе</p>
          )}
        </div>
      )}

      {/* Finished Products */}
      {activeTab === 'finished' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pack Lot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Формат</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Количество</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Источник CM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Упаковано</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {packLots.map((pack) => (
                <tr key={pack.pack_lot_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/packlot/${pack.pack_lot_id}`} className="font-mono text-blue-600 hover:underline">
                      {pack.pack_lot_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{pack.pack_format_code}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {pack.qty_produced || pack.qty_planned}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/cm/${pack.source_cm_lot_id}`} className="text-blue-600 hover:underline">
                      {pack.source_cm_lot_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {pack.packed_at ? new Date(pack.packed_at).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {hasRole(['Manager', 'Admin']) && (
                      <button
                        onClick={() => {
                          setSelectedPackLot(pack);
                          setShipQty(pack.qty_produced || pack.qty_planned);
                          setShowShipmentModal(true);
                        }}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-xs"
                      >
                        Отгрузить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {packLots.length === 0 && (
            <p className="text-center py-8 text-slate-500">Нет готовой продукции на складе</p>
          )}
        </div>
      )}

      {/* Movements */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Направление</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Кол-во</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Причина</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movements.map((m) => (
                <tr key={m.movement_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    {m.moved_at ? new Date(m.moved_at).toLocaleString('ru-RU') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{m.item_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.direction === 'In' ? 'bg-green-100 text-green-800' :
                      m.direction === 'Out' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100'
                    }`}>
                      {m.direction === 'In' ? 'Приход' : m.direction === 'Out' ? 'Расход' : 'Корректировка'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{m.qty}</td>
                  <td className="px-4 py-3 text-sm">{m.reason_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shipment Modal */}
      {showShipmentModal && selectedPackLot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Создать отгрузку</h3>
            
            <p className="text-sm text-slate-500 mb-4">
              Продукт: <span className="font-mono">{selectedPackLot.pack_lot_id}</span><br/>
              Доступно: {selectedPackLot.qty_produced || selectedPackLot.qty_planned} шт
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Количество к отгрузке</label>
              <input
                type="number"
                min="1"
                max={selectedPackLot.qty_produced || selectedPackLot.qty_planned}
                value={shipQty}
                onChange={(e) => setShipQty(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShipmentModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!selectedPackLot) return;
                  try {
                    // Generate shipment ID
                    const today = new Date();
                    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
                    const shipmentId = `SHIP-${dateStr}-${Date.now().toString().slice(-4)}`;

                    // Create shipment
                    await supabase.from('shipment').insert({
                      shipment_id: shipmentId,
                      pack_lot_id: selectedPackLot.pack_lot_id,
                      qty_shipped: shipQty,
                      shipped_at: new Date().toISOString(),
                      shipped_by: user?.user_id,
                      status: 'Shipped',
                    });

                    // Update pack lot status
                    await supabase.from('pack_lot')
                      .update({ status: 'Shipped' })
                      .eq('pack_lot_id', selectedPackLot.pack_lot_id);

                    // Get container and create stock movement
                    const container = (selectedPackLot as any).container;
                    if (container) {
                      await supabase.from('stock_movement').insert({
                        item_type: 'Finished',
                        container_id: container.container_id,
                        direction: 'Out',
                        qty: shipQty,
                        reason_code: 'Ship',
                        moved_at: new Date().toISOString(),
                        user_id: user?.user_id,
                      });
                    }

                    setShowShipmentModal(false);
                    setSelectedPackLot(null);
                    loadData();
                  } catch (err: any) {
                    alert('Ошибка: ' + err.message);
                  }
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg"
              >
                Создать отгрузку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
