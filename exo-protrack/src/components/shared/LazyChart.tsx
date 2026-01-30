import { Suspense, lazy, memo } from 'react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';

// Lazy-load echarts-for-react
const ReactECharts = lazy(() => import('echarts-for-react'));

interface LazyChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  showLoading?: boolean;
}

function ChartFallback({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <div
      style={style}
      className={cn('flex items-center justify-center bg-muted/30 rounded-lg animate-pulse', className)}
    >
      <span className="text-sm text-muted-foreground">Загрузка графика...</span>
    </div>
  );
}

function LazyChartInner({ option, style, className, theme, notMerge, lazyUpdate, showLoading }: LazyChartProps) {
  return (
    <Suspense fallback={<ChartFallback style={style} className={className} />}>
      <ReactECharts
        option={option}
        style={style}
        className={className}
        theme={theme}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
        showLoading={showLoading}
      />
    </Suspense>
  );
}

export const LazyChart = memo(LazyChartInner);
