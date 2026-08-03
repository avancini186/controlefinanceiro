import { useState, useEffect } from 'react';

export interface TablePreferences<TFilters = any> {
  searchQuery: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  hiddenColumns: string[];
  filters: TFilters;
}

export function useTablePreferences<TFilters>(
  storageKey: string,
  initialPreferences: TablePreferences<TFilters>
) {
  const [preferences, setPreferences] = useState<TablePreferences<TFilters>>(() => {
    try {
      const saved = localStorage.getItem(`fincontrol_pref_${storageKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Error loading preferences from localStorage:', err);
    }
    return initialPreferences;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`fincontrol_pref_${storageKey}`, JSON.stringify(preferences));
    } catch (err) {
      console.error('Error saving preferences to localStorage:', err);
    }
  }, [storageKey, preferences]);

  const setSearchQuery = (query: string) => {
    setPreferences((prev) => ({ ...prev, searchQuery: query }));
  };

  const setSort = (columnKey: string) => {
    setPreferences((prev) => {
      const isSameCol = prev.sortBy === columnKey;
      const newDir = isSameCol && prev.sortDirection === 'asc' ? 'desc' : 'asc';
      return { ...prev, sortBy: columnKey, sortDirection: newDir };
    });
  };

  const toggleColumnVisibility = (columnKey: string) => {
    setPreferences((prev) => {
      const isHidden = prev.hiddenColumns.includes(columnKey);
      const newHidden = isHidden
        ? prev.hiddenColumns.filter((c) => c !== columnKey)
        : [...prev.hiddenColumns, columnKey];
      return { ...prev, hiddenColumns: newHidden };
    });
  };

  const setFilters = (newFilters: Partial<TFilters>) => {
    setPreferences((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  };

  const resetPreferences = () => {
    setPreferences(initialPreferences);
  };

  return {
    preferences,
    setSearchQuery,
    setSort,
    toggleColumnVisibility,
    setFilters,
    resetPreferences,
  };
}
