import React from 'react';
import { ArrowUp, ArrowDown, CheckSquare, Square } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  // Selection Props
  selectedRowIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAllRows?: (ids: string[]) => void;
  // Sorting Props
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  // Column Visibility
  hiddenColumns?: string[];
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Nenhum registro encontrado.',
  isLoading = false,
  selectedRowIds = [],
  onSelectRow,
  onSelectAllRows,
  sortBy,
  sortDirection,
  onSort,
  hiddenColumns = [],
}: TableProps<T>) {
  const visibleColumns = columns.filter((col) => !col.accessorKey || !hiddenColumns.includes(col.accessorKey as string));
  const isAllSelected = data.length > 0 && selectedRowIds.length === data.length;

  const getKey = (row: T, idx: number): string => {
    if (keyExtractor) return keyExtractor(row);
    const r = row as Record<string, unknown>;
    if (r.id) return String(r.id);
    if (r.hash) return String(r.hash);
    return `row_${idx}`;
  };

  const handleSelectAll = () => {
    if (!onSelectAllRows) return;
    if (isAllSelected) {
      onSelectAllRows([]);
    } else {
      const allIds = data.map((r, i) => getKey(r, i));
      onSelectAllRows(allIds);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium animate-pulse text-xs">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
      <table className="w-full min-w-full min-w-max text-left text-xs border-collapse">
        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
          <tr>
            {onSelectRow && (
              <th className="px-4 py-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </th>
            )}
            {visibleColumns.map((col, idx) => {
              const colKey = String(col.accessorKey || idx);
              const isSorted = sortBy === colKey;

              return (
                <th
                  key={colKey}
                  className={`px-4 py-3 ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''
                  }`}
                  onClick={() => col.sortable && onSort && onSort(colKey)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && isSorted && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length + (onSelectRow ? 1 : 0)}
                className="px-4 py-8 text-center text-slate-500 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const rowId = getKey(row, idx);
              const isSelected = selectedRowIds.includes(rowId);

              return (
                <tr
                  key={rowId}
                  className={`hover:bg-slate-900/50 transition-colors ${
                    isSelected ? 'bg-indigo-600/10' : ''
                  }`}
                >
                  {onSelectRow && (
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectRow(rowId)}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>
                  )}
                  {visibleColumns.map((col, cIdx) => {
                    const colKey = String(col.accessorKey || cIdx);
                    const cellVal = col.accessorKey
                      ? (row as Record<string, unknown>)[String(col.accessorKey)]
                      : null;

                    return (
                      <td key={colKey} className={`px-4 py-3 ${col.className || ''}`}>
                        {col.cell ? col.cell(row) : (cellVal as React.ReactNode) ?? '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
