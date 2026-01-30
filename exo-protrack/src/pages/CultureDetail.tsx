import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Beaker, ShieldCheck, Check, X, AlertCircle } from 'lucide-react';
import { supabase, Culture, CellType, CollectionEvent } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

export default function CultureDetail() {
  const { id } = useParams<{ id: string }>();
  const [culture, setCulture] = useState<Culture | null>(null);
  const [cellType, setCellType] = useState<CellType | null>(null);
  const [collections, setCollections] = useState<CollectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [infectionTypes, setInfectionTypes] = useState<any[]>([]);
  const [infectionResults, setInfectionResults] = useState<any[]>([]);
  const [editingInfection, setEditingInfection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ result: 'negative', test_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
      const { data: cultureData } = await supabase
        .from('culture')
        .select('*')
        .eq('culture_id', id)
        .single();

      if (cultureData) {
        setCulture(cultureData);

        const { data: ctData } = await supabase
          .from('cell_type')
          .select('*')
          .eq('cell_type_code', cultureData.cell_type_code)
          .single();
        setCellType(ctData);

        const { data: collectionsData } = await supabase
          .from('collection_event')
          .select('*')
          .eq('culture_id', id)
          .order('collected_at', { ascending: false });
        setCollections(collectionsData || []);
      }

      // Load infection types
      const infTypesRes = await (supabase.from as any)('infection_type').select('*').eq('is_active', true).order('name');
      setInfectionTypes(infTypesRes.data || []);

      // Load infection results
      const infResultsRes = await (supabase.from as any)('infection_test_result')
        .select('*')
        .eq('entity_type', 'culture')
        .eq('entity_id', id);
      setInfectionResults(infResultsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInfection(infectionTypeId: string) {
    const existing = infectionResults.find(r => r.infection_type_id === infectionTypeId);

    if (existing) {
      // Update
      await (supabase.from as any)('infection_test_result')
        .update({ result: editForm.result, test_date: editForm.test_date })
        .eq('result_id', existing.result_id);
    } else {
      // Insert
      await (supabase.from as any)('infection_test_result').insert({
        result_id: crypto.randomUUID(),
        entity_type: 'culture',
        entity_id: id,
        infection_type_id: infectionTypeId,
        result: editForm.result,
        test_date: editForm.test_date
      });
    }

    setEditingInfection(null);
    loadData();
  }

  async function updateStatus(newStatus: string) {
    if (!culture) return;
    await supabase.from('culture')
      .update({ status: newStatus })
      .eq('culture_id', culture.culture_id);
    loadData();
  }

  function getInfectionStatus(infectionTypeId: string) {
    const result = infectionResults.find(r => r.infection_type_id === infectionTypeId);
    if (!result) return 'pending';
    return result.result;
  }

  function getInfectionResult(infectionTypeId: string) {
    return infectionResults.find(r => r.infection_type_id === infectionTypeId);
  }

  // Summary
  const testedCount = infectionResults.length;
  const totalTests = infectionTypes.length;
  const hasPositive = infectionResults.some(r => r.result === 'positive');

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  if (!culture) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Культура не найдена</p>
        <Link to="/culture" className="text-blue-600 hover:underline mt-2 inline-block">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/culture" className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Beaker className="text-emerald-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{culture.culture_id}</h1>
            <p className="text-sm text-muted-foreground">Культура клеток</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase">ID культуры</label>
                <p className="font-mono">{culture.culture_id}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Тип клеток</label>
                <p>{cellType?.name || culture.cell_type_code}</p>
                <p className="text-xs text-muted-foreground">{cellType?.description}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Ссылка на донора</label>
                <p>{culture.donor_ref || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Ссылка на журнал</label>
                <p>{culture.culture_journal_ref || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Дата создания</label>
                <p>{culture.created_at ? new Date(culture.created_at).toLocaleDateString('ru-RU') : '-'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase">Статус</label>
                <div className="mt-1">
                  <Badge variant={culture.status === 'InWork' ? 'success' : 'muted'}>
                    {culture.status === 'InWork' ? 'В работе' : 'Архив'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex gap-2">
              {culture.status === 'InWork' ? (
                <Button
                  variant="secondary"
                  onClick={() => updateStatus('Archived')}
                >
                  Отправить в архив
                </Button>
              ) : (
                <Button
                  variant="success"
                  onClick={() => updateStatus('InWork')}
                >
                  Восстановить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Статистика</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{collections.length}</p>
                <p className="text-sm text-blue-600">Сборов КС</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">
                  {collections.reduce((sum, c) => sum + (c.volume_ml || 0), 0).toFixed(1)} мл
                </p>
                <p className="text-sm text-emerald-600">Общий объём собрано</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Infections - Full List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-green-600" size={20} />
              <h3 className="text-lg font-semibold">Инфекционный скрининг</h3>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant={
                hasPositive ? 'destructive' :
                testedCount === totalTests ? 'success' :
                'warning'
              }>
                {hasPositive ? 'Есть положительные' :
                 testedCount === totalTests ? 'Все тесты пройдены' :
                 `${testedCount}/${totalTests} тестов`}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {infectionTypes.map((inf: any) => {
              const status = getInfectionStatus(inf.infection_type_id);
              const result = getInfectionResult(inf.infection_type_id);
              const isEditing = editingInfection === inf.infection_type_id;

              return (
                <div
                  key={inf.infection_type_id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    status === 'negative' ? 'bg-green-50 border-green-300 hover:border-green-400' :
                    status === 'positive' ? 'bg-red-50 border-red-300 hover:border-red-400' :
                    'bg-muted border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      setEditingInfection(inf.infection_type_id);
                      setEditForm({
                        result: result?.result || 'negative',
                        test_date: result?.test_date || new Date().toISOString().split('T')[0]
                      });
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{inf.code}</span>
                    {status === 'negative' && <Check size={16} className="text-green-600" />}
                    {status === 'positive' && <X size={16} className="text-red-600" />}
                    {status === 'pending' && <AlertCircle size={16} className="text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{inf.name}</p>
                  {result?.test_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(result.test_date).toLocaleDateString('ru-RU')}
                    </p>
                  )}

                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2" onClick={e => e.stopPropagation()}>
                      <select
                        value={editForm.result}
                        onChange={e => setEditForm({ ...editForm, result: e.target.value })}
                        className="w-full px-2 py-1 border border-input rounded text-sm bg-background text-foreground"
                      >
                        <option value="negative">Отрицательный</option>
                        <option value="positive">Положительный</option>
                      </select>
                      <Input
                        type="date"
                        value={editForm.test_date}
                        onChange={e => setEditForm({ ...editForm, test_date: e.target.value })}
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="success"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSaveInfection(inf.infection_type_id)}
                        >
                          Сохранить
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInfection(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {infectionTypes.length === 0 && (
            <p className="text-muted-foreground text-center py-4">Нет типов инфекций в справочнике</p>
          )}
        </CardContent>
      </Card>

      {/* Collections */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Связанные сборы КС ({collections.length})</h3>
          {collections.length === 0 ? (
            <p className="text-muted-foreground text-sm">Сборы не найдены</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">CM Лот</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Дата сбора</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Объём (мл)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Пассаж</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Морфология</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {collections.map((col) => (
                    <tr key={col.collection_id} className="hover:bg-muted">
                      <td className="px-4 py-2">
                        <Link to={`/cm/${col.cm_lot_id}`} className="font-mono text-blue-600 hover:underline">
                          {col.cm_lot_id}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {col.collected_at ? new Date(col.collected_at).toLocaleDateString('ru-RU') : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{col.volume_ml}</td>
                      <td className="px-4 py-2 text-sm">P{col.passage_no}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{col.morphology || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
