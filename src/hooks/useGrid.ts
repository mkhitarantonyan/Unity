import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

export interface Unit {
  id: number;
  x: number;
  y: number;
  owner_id: string | null;
  current_price: number;
  sale_price: number;
  metadata: any;
}

// Подключаемся к нашему WebSocket серверу
// Транспорт websocket делает связь мгновенной
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
        sale_price: 5.0, // <-- Та самая цена 5$, которую мы исправили!
        metadata: {}
      }));

      // 2. Скачиваем с сервера только купленные пиксели
      const response = await fetch('/api/grid');
      if (!response.ok) throw new Error('Failed to fetch grid');
      const data = await response.json();

      // 3. Накладываем купленные пиксели поверх пустой сетки
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

    // ----------------------------------------------------
    // МАГИЯ WEBSOCKET: Слушаем обновления в прямом эфире
    // ----------------------------------------------------
    socket.on('grid_update', (updatedUnits: Unit[]) => {
      console.log('Live update received:', updatedUnits);
      
      setUnits(prevUnits => {
        const nextUnits = [...prevUnits];
        updatedUnits.forEach(u => {
          if (u) { // Защита от пустых данных
            // Мгновенно обновляем конкретные ячейки на холсте
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