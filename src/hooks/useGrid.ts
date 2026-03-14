import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Unit } from '../types';

export type { Unit };

const socket = io('/', { transports: ['websocket', 'polling'] });

export function useGrid() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrid = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Сначала рисуем 10 000 пустых ячеек с базовой ценой 5$
      const grid: Unit[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        x: i % 100,
        y: Math.floor(i / 100),
        owner_id: null,
        current_price: 0,
        sale_price: 10.0,
        metadata: {}
      }));

      const response = await fetch('/api/grid');
      if (!response.ok) throw new Error('Failed to fetch grid');
      const data = await response.json();

      const mergedGrid = [...grid];
      data.forEach((u: Unit) => {
        mergedGrid[u.id] = { ...mergedGrid[u.id], ...u };
      });

      setUnits(mergedGrid);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrid();

    socket.on('grid_update', (updatedUnits: Unit[]) => {
      if (import.meta.env.DEV) console.log('Live update received:', updatedUnits);

      setUnits(prevUnits => {
        const nextUnits = [...prevUnits];
        updatedUnits.forEach(u => {
          if (u && Number.isInteger(u.id) && u.id >= 0 && u.id < prevUnits.length) {
            nextUnits[u.id] = { ...nextUnits[u.id], ...u };
          }
        });
        return nextUnits;
      });
    });

    // Отключаем слушателя, если компонент удаляется
    return () => {
      socket.off('grid_update');
    };
  }, [fetchGrid]);

  return { units, isLoading, error, refresh: fetchGrid };
}