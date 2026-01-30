import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, CmLot, PackLot, Container, StockMovement, Reservation } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { showError } from '../lib/toast';

export default function Warehouse() {
  const { user, hasRole } = useAuth();
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
      <h1 className="text-2xl font-bold text-foreground">Склад</h1>

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
      <Tabs defaultValue="raw">
        <TabsList>
          <TabsTrigger value="raw" className="gap-2">
            <Package size={18} />
            Сырье (CM) ({cmLots.length})
          </TabsTrigger>
          <TabsTrigger value="finished" className="gap-2">
            <Truck size={18} />
            Готовая продукция ({packLots.length})
          </TabsTrigger>
          <TabsTrigger value="movements">
            Движения
          </TabsTrigger>
        </TabsList>

        {/* Raw Materials */}
        <TabsContent value="raw">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CM Lot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Продукт</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Объем (мл)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Резерв (мл)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Доступно (мл)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Годен до</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cmLots.map((lot) => {
                    const isExpiringSoon = lot.expiry_date && new Date(lot.expiry_date) <= thirtyDaysFromNow;
                    return (
                      <tr key={lot.cm_lot_id} className={`hover:bg-muted/50 ${isExpiringSoon ? 'bg-amber-50' : ''}`}>
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
                <p className="text-center py-8 text-muted-foreground">Нет сырья на складе</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finished Products */}
        <TabsContent value="finished">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pack Lot</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Формат</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Количество</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Источник CM</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Упаковано</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {packLots.map((pack) => (
                    <tr key={pack.pack_lot_id} className="hover:bg-muted/50">
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
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {pack.packed_at ? new Date(pack.packed_at).toLocaleDateString('ru-RU') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {hasRole(['Manager', 'Admin']) && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setSelectedPackLot(pack);
                              setShipQty(pack.qty_produced || pack.qty_planned);
                              setShowShipmentModal(true);
                            }}
                          >
                            Отгрузить
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {packLots.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">Нет готовой продукции на складе</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements */}
        <TabsContent value="movements">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Тип</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Направление</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Кол-во</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Причина</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map((m) => (
                    <tr key={m.movement_id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {m.moved_at ? new Date(m.moved_at).toLocaleString('ru-RU') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">{m.item_type}</td>
                      <td className="px-4 py-3">
                        {m.direction === 'In' ? (
                          <Badge variant="success">Приход</Badge>
                        ) : m.direction === 'Out' ? (
                          <Badge variant="destructive">Расход</Badge>
                        ) : (
                          <Badge variant="muted">Корректировка</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{m.qty}</td>
                      <td className="px-4 py-3 text-sm">{m.reason_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shipment Modal */}
      <Dialog open={showShipmentModal} onOpenChange={setShowShipmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать отгрузку</DialogTitle>
          </DialogHeader>

          {selectedPackLot && (
            <>
              <p className="text-sm text-muted-foreground">
                Продукт: <span className="font-mono">{selectedPackLot.pack_lot_id}</span><br/>
                Доступно: {selectedPackLot.qty_produced || selectedPackLot.qty_planned} шт
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Количество к отгрузке</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedPackLot.qty_produced || selectedPackLot.qty_planned}
                  value={shipQty}
                  onChange={(e) => setShipQty(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowShipmentModal(false)}
                >
                  Отмена
                </Button>
                <Button
                  variant="success"
                  className="flex-1"
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
                      showError('Ошибка', err.message);
                    }
                  }}
                >
                  Создать отгрузку
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
