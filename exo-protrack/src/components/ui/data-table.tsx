import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './card';
import { Input } from './input';
import { Button } from './button';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string | null;
  direction: SortDirection;
}

export function DataTable<T>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = 'Search...',
  pageSize = 20,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortState>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = React.useState(1);

  // Reset page when search or data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, data]);

  // Filter data by search
  const filteredData = React.useMemo(() => {
    if (!search.trim()) return data;

    const query = search.toLowerCase();
    return data.filter((item) =>
      columns.some((col) => {
        const rendered = col.render(item);
        if (typeof rendered === 'string') {
          return rendered.toLowerCase().includes(query);
        }
        if (typeof rendered === 'number') {
          return String(rendered).toLowerCase().includes(query);
        }
        return false;
      })
    );
  }, [data, search, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData;

    const column = columns.find((col) => col.key === sort.key);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = column.render(a);
      const bVal = column.render(b);

      let comparison = 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, sort, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedData.length);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sort.key !== key || !sort.direction) {
      return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    if (sort.direction === 'asc') {
      return <ChevronUp className="ml-1 h-3.5 w-3.5 text-foreground" />;
    }
    return <ChevronDown className="ml-1 h-3.5 w-3.5 text-foreground" />;
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (safeCurrentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Card className="overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={startIndex + index}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-foreground',
                        col.className
                      )}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {sortedData.length}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Previous page"
              >
                <ChevronUp className="h-4 w-4 -rotate-90" />
              </Button>

              {getPageNumbers().map((page, idx) =>
                page === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === safeCurrentPage ? 'outline' : 'ghost'}
                    size="icon-sm"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={page === safeCurrentPage ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
