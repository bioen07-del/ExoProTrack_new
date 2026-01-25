import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { supabase, Culture, CellType } from '../lib/supabase';

export default function CultureList() {
  const navigate = useNavigate();
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [cellTypes, setCellTypes] = useState<CellType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    culture_id: '',
    cell_type_code: '',
    donor_ref: '',
    culture_journal_ref: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [culturesRes, cellTypesRes] = await Promise.all([
        supabase.from('culture').select('*').order('created_at', { ascending: false }),
        supabase.from('cell_type').select('*').eq('is_active', true),
      ]);
      setCultures(culturesRes.data || []);
      setCellTypes(cellTypesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Check uniqueness
    const { data: existing } = await supabase
      .from('culture')
      .select('culture_id')
      .eq('culture_id', formData.culture_id)
      .single();

    if (existing) {
      setError('Культура с таким ID уже существует');
      return;
    }

    try {
      const { error: insertError } = await supabase.from('culture').insert({
        culture_id: formData.culture_id,
        cell_type_code: formData.cell_type_code,
        donor_ref: formData.donor_ref || null,
        culture_journal_ref: formData.culture_journal_ref || null,
        status: 'InWork',
      });

      if (insertError) throw insertError;

      setShowForm(false);
      setFormData({ culture_id: '', cell_type_code: '', donor_ref: '', culture_journal_ref: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleStatus(culture: Culture) {
    const newStatus = culture.status === 'InWork' ? 'Archived' : 'InWork';
    await supabase.from('culture')
      .update({ status: newStatus })
      .eq('culture_id', culture.culture_id);
    loadData();
  }

  const filteredCultures = cultures.filter(c =>
    c.culture_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cell_type_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Каталог культур</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Создать культуру
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 className="text-lg font-semibold">Новая культура</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID культуры *</label>
              <input
                type="text"
                value={formData.culture_id}
                onChange={(e) => setFormData({ ...formData, culture_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Тип клеток *</label>
              <select
                value={formData.cell_type_code}
                onChange={(e) => setFormData({ ...formData, cell_type_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Выберите</option>
                {cellTypes.map(ct => (
                  <option key={ct.cell_type_code} value={ct.cell_type_code}>
                    {ct.name} ({ct.cell_type_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ссылка на донора</label>
              <input
                type="text"
                value={formData.donor_ref}
                onChange={(e) => setFormData({ ...formData, donor_ref: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ссылка на журнал культуры</label>
              <input
                type="text"
                value={formData.culture_journal_ref}
                onChange={(e) => setFormData({ ...formData, culture_journal_ref: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Создать
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID культуры</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Тип клеток</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Донор</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Создана</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCultures.map((culture) => (
              <tr 
                  key={culture.culture_id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/culture/${culture.culture_id}`)}
                >
                <td className="px-4 py-3 font-mono text-blue-600">{culture.culture_id}</td>
                <td className="px-4 py-3">{culture.cell_type_code}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{culture.donor_ref || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    culture.status === 'InWork' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {culture.status === 'InWork' ? 'В работе' : 'Архив'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {culture.created_at ? new Date(culture.created_at).toLocaleDateString('ru-RU') : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleStatus(culture)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {culture.status === 'InWork' ? 'В архив' : 'Восстановить'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
