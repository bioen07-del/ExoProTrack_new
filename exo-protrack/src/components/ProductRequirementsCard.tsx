import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardCheck, Cog, FlaskConical, AlertTriangle } from 'lucide-react';

interface ProductRequirements {
  product_code: string;
  product_name: string;
  product_type: string;
  media_spec_id?: string;
  default_primary_qc?: any[];
  default_product_qc?: any[];
  default_raw_processing?: any[];
  default_postprocess_methods?: any[];
  shelf_life_days_default?: number;
}

interface Props {
  productCode?: string;
  frozenSpec?: any; // frozen_spec из request/cm_lot — если передан, не загружаем из БД
  compact?: boolean;
  showTitle?: boolean;
}

export default function ProductRequirementsCard({ productCode, frozenSpec, compact = false, showTitle = true }: Props) {
  const [product, setProduct] = useState<ProductRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [processMethods, setProcessMethods] = useState<any[]>([]);

  useEffect(() => {
    // Если передан frozenSpec, не загружаем из БД
    if (frozenSpec) {
      setLoading(false);
      return;
    }
    if (productCode) loadProduct();
  }, [productCode, frozenSpec]);

  async function loadProduct() {
    try {
      const [prodRes, methodsRes] = await Promise.all([
        supabase.from('product').select('*').eq('product_code', productCode).single(),
        supabase.from('cm_process_method').select('*'),
      ]);
      setProduct(prodRes.data as any);
      setProcessMethods(methodsRes.data || []);
    } catch (err) {
      console.error('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  }

  const getMethodName = (methodId: string) => {
    const method = processMethods.find(m => m.method_id === methodId);
    return method?.name || methodId;
  };

  // Если передан frozenSpec — используем его
  if (frozenSpec) {
    const fs = frozenSpec;
    const primaryQc = fs.qc?.raw || [];
    const productQc = fs.qc?.product || [];
    const rawProcessing = fs.processing?.raw || [];
    const postprocessing = fs.processing?.post || [];

    if (compact) {
      return (
        <div className="text-xs space-y-1">
          {primaryQc.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-blue-600 font-medium">QC сырья:</span>
              {primaryQc.map((t: any) => (
                <span key={t.code} className="px-1 py-0.5 bg-blue-50 rounded">{t.name || t.code}</span>
              ))}
            </div>
          )}
          {productQc.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-green-600 font-medium">QC продукта:</span>
              {productQc.map((t: any) => (
                <span key={t.code} className="px-1 py-0.5 bg-green-50 rounded">{t.name || t.code}</span>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Требования: {fs.product_code}
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">frozen</span>
            </h4>
            <span className="text-xs text-slate-500">{fs.product_name}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 text-sm flex items-center gap-1 mb-2">
              <ClipboardCheck size={14} /> QC на сырьё ({primaryQc.length})
            </h5>
            {primaryQc.length > 0 ? (
              <div className="space-y-1">
                {primaryQc.map((test: any) => (
                  <div key={test.code} className="text-xs p-1.5 bg-white rounded">{test.name || test.code}</div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Нет тестов</p>}
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h5 className="font-medium text-purple-800 text-sm flex items-center gap-1 mb-2">
              <Cog size={14} /> Процессинг ({rawProcessing.length + postprocessing.length})
            </h5>
            {(rawProcessing.length > 0 || postprocessing.length > 0) ? (
              <div className="space-y-1">
                {[...rawProcessing, ...postprocessing].map((m: any, idx: number) => (
                  <div key={idx} className="text-xs p-1.5 bg-white rounded">{m.name || m.method_id}</div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Нет методов</p>}
          </div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg col-span-2">
            <h5 className="font-medium text-green-800 text-sm flex items-center gap-1 mb-2">
              <ClipboardCheck size={14} /> QC на продукт ({productQc.length})
            </h5>
            {productQc.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {productQc.map((test: any) => (
                  <span key={test.code} className="text-xs px-2 py-1 bg-white rounded">{test.name || test.code}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Нет тестов</p>}
          </div>
        </div>
        {fs.shelf_life_days && (
          <div className="text-xs text-slate-600 border-t pt-2">
            <span className="font-medium">Срок годности:</span> {fs.shelf_life_days} дней
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-400">Загрузка требований...</div>;
  }

  if (!product) {
    return <div className="text-sm text-red-500">Продукт не найден: {productCode}</div>;
  }

  const primaryQc = product.default_primary_qc || [];
  const productQc = product.default_product_qc || [];
  const rawProcessing = product.default_raw_processing || [];
  const postprocessing = product.default_postprocess_methods || [];

  if (compact) {
    return (
      <div className="text-xs space-y-1">
        {primaryQc.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-blue-600 font-medium">QC сырья:</span>
            {primaryQc.map((t: any) => (
              <span key={t.code} className="px-1 py-0.5 bg-blue-50 rounded">{t.name || t.code}</span>
            ))}
          </div>
        )}
        {productQc.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-green-600 font-medium">QC продукта:</span>
            {productQc.map((t: any) => (
              <span key={t.code} className="px-1 py-0.5 bg-green-50 rounded">{t.name || t.code}</span>
            ))}
          </div>
        )}
        {rawProcessing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-purple-600 font-medium">Процессинг:</span>
            {rawProcessing.map((m: any, i: number) => (
              <span key={i} className="px-1 py-0.5 bg-purple-50 rounded">{getMethodName(m.method_id)} x{m.cycles || 1}</span>
            ))}
          </div>
        )}
        {postprocessing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-amber-600 font-medium">Постпроц:</span>
            {postprocessing.map((m: any, i: number) => (
              <span key={i} className="px-1 py-0.5 bg-amber-50 rounded">{getMethodName(m.method_id)} x{m.cycles || 1}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Требования к продукту: {product.product_code}
          </h4>
          <span className="text-xs text-slate-500">{product.product_name}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* QC Первичный */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-800 text-sm flex items-center gap-1 mb-2">
            <ClipboardCheck size={14} />
            QC на сырьё ({primaryQc.length})
          </h5>
          {primaryQc.length > 0 ? (
            <div className="space-y-1">
              {primaryQc.sort((a: any, b: any) => (a.name || a.code).localeCompare(b.name || b.code, 'ru')).map((test: any) => (
                <div key={test.code} className="text-xs flex justify-between items-center p-1.5 bg-white rounded">
                  <span className="font-medium">{test.name || test.code}</span>
                  <span className="text-slate-500">
                    {test.norm_min !== undefined && test.norm_max !== undefined 
                      ? `${test.norm_min}–${test.norm_max} ${test.unit || ''}`
                      : test.unit || ''
                    }
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Нет тестов</p>
          )}
        </div>

        {/* Процессинг сырья */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 className="font-medium text-purple-800 text-sm flex items-center gap-1 mb-2">
            <Cog size={14} />
            Процессинг сырья ({rawProcessing.length})
          </h5>
          {rawProcessing.length > 0 ? (
            <div className="space-y-1">
              {rawProcessing.map((method: any, idx: number) => (
                <div key={idx} className="text-xs flex justify-between items-center p-1.5 bg-white rounded">
                  <span>
                    <span className="text-purple-600 font-medium mr-1">{idx + 1}.</span>
                    {getMethodName(method.method_id)}
                  </span>
                  <span className="text-slate-500">×{method.cycles || 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Нет методов</p>
          )}
        </div>

        {/* Постпроцессинг */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h5 className="font-medium text-amber-800 text-sm flex items-center gap-1 mb-2">
            <Cog size={14} />
            Постпроцессинг ({postprocessing.length})
          </h5>
          {postprocessing.length > 0 ? (
            <div className="space-y-1">
              {postprocessing.map((method: any, idx: number) => (
                <div key={idx} className="text-xs flex justify-between items-center p-1.5 bg-white rounded">
                  <span>
                    <span className="text-amber-600 font-medium mr-1">{idx + 1}.</span>
                    {getMethodName(method.method_id)}
                  </span>
                  <span className="text-slate-500">×{method.cycles || 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Нет методов</p>
          )}
        </div>

        {/* QC Продукта */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h5 className="font-medium text-green-800 text-sm flex items-center gap-1 mb-2">
            <ClipboardCheck size={14} />
            QC на продукт ({productQc.length})
          </h5>
          {productQc.length > 0 ? (
            <div className="space-y-1">
              {productQc.sort((a: any, b: any) => (a.name || a.code).localeCompare(b.name || b.code, 'ru')).map((test: any) => (
                <div key={test.code} className="text-xs flex justify-between items-center p-1.5 bg-white rounded">
                  <span className="font-medium">{test.name || test.code}</span>
                  <span className="text-slate-500">
                    {test.sample_volume_ml ? `${test.sample_volume_ml} мл` : ''}
                    {test.norm_min !== undefined && test.norm_max !== undefined 
                      ? ` ${test.norm_min}–${test.norm_max} ${test.unit || ''}`
                      : ''
                    }
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Нет тестов</p>
          )}
        </div>
      </div>

      {product.shelf_life_days_default && (
        <div className="text-xs text-slate-600 border-t pt-2">
          <span className="font-medium">Срок годности по умолчанию:</span> {product.shelf_life_days_default} дней
        </div>
      )}
    </div>
  );
}
