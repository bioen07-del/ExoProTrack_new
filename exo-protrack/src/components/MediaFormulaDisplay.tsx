import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface BaseMedia {
  base_media_id: string;
  code: string;
  name: string;
  phenol_red_flag: boolean;
}

interface MediaAdditive {
  additive_id: string;
  code: string;
  name: string;
  unit: string;
}

interface MediaSpecAdditive {
  media_spec_id: string;
  additive_id: string;
  concentration: number | null;
}

interface Props {
  mediaSpecId: string | null | undefined;
  compact?: boolean;
}

export default function MediaFormulaDisplay({ mediaSpecId, compact = false }: Props) {
  const [formula, setFormula] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mediaSpecId) {
      setFormula('');
      return;
    }
    loadFormula();
  }, [mediaSpecId]);

  async function loadFormula() {
    setLoading(true);
    try {
      // Load media spec - prefer display_name if available
      const { data: spec } = await (supabase.from as any)('media_compatibility_spec')
        .select('*')
        .eq('media_spec_id', mediaSpecId)
        .single();

      if (!spec) {
        setFormula('-');
        return;
      }

      // Use display_name if available (pre-computed formula)
      if (spec.display_name) {
        setFormula(spec.display_name);
        return;
      }

      // Fallback: build formula dynamically
      let parts: string[] = [];

      // Get base media name
      if (spec.base_media_id) {
        const { data: baseMedia } = await (supabase.from as any)('base_media')
          .select('*')
          .eq('base_media_id', spec.base_media_id)
          .single();
        if (baseMedia) {
          parts.push(baseMedia.name);
        }
      } else if (spec.base_medium_code) {
        parts.push(spec.base_medium_code);
      }

      // Get additives
      const { data: specAdditives } = await (supabase.from as any)('media_spec_additives')
        .select('*')
        .eq('media_spec_id', mediaSpecId);

      if (specAdditives && specAdditives.length > 0) {
        const { data: additives } = await (supabase.from as any)('media_additive').select('*');
        const additiveMap = new Map<string, MediaAdditive>((additives || []).map((a: MediaAdditive) => [a.additive_id, a]));

        for (const sa of specAdditives as MediaSpecAdditive[]) {
          const additive = additiveMap.get(sa.additive_id);
          if (additive) {
            const concStr = sa.concentration !== null ? ` ${sa.concentration}${additive.unit}` : '';
            parts.push(`${additive.name}${concStr}`);
          }
        }
      }

      setFormula(parts.join(' + ') || spec.base_medium_code || '-');
    } catch (err) {
      console.error('Error loading media formula:', err);
      setFormula('-');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <span className="text-muted-foreground text-sm">...</span>;
  }

  if (!formula) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (compact) {
    return <span className="text-sm text-foreground">{formula}</span>;
  }

  return (
    <div className="text-sm">
      <span className="font-medium text-foreground">{formula}</span>
    </div>
  );
}
