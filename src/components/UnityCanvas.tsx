import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';

interface Unit {
  id: number;
  x: number;
  y: number;
  owner_id: string | null;
  current_price: number;
  sale_price: number;
  metadata: {
    title?: string;
    image_url?: string;
    link?: string;
    group?: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
}

interface UnityCanvasProps {
  units: Unit[];
  selectedUnitIds: number[];
  pendingImage: string | null;
  isSelectionMode?: boolean;
  focusUnitId?: number | null;
  showGuides?: boolean;
  viewportDataRef?: React.MutableRefObject<{ x: number, y: number, w: number, h: number }>;
  onUnitClick: (unit: Unit, shiftKey: boolean, position?: { x: number, y: number }) => void;
  onUnitHover: (unit: Unit | null) => void;
  onUnitsSelect?: (ids: number[]) => void;
  onInteraction?: () => void;
}

const GRID_SIZE = 100;
const UNIT_SIZE = 10;
const CANVAS_SIZE = GRID_SIZE * UNIT_SIZE;

export const UnityCanvas: React.FC<UnityCanvasProps> = ({ 
  units, selectedUnitIds, pendingImage, isSelectionMode, focusUnitId, viewportDataRef,
  showGuides,
  onUnitClick, onUnitHover, onUnitsSelect, onInteraction 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<PIXI.Container | null>(null);
  const gridGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const unitsContainerRef = useRef<PIXI.Container | null>(null);
  const selectionGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const marqueeGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const previewSpriteRef = useRef<PIXI.Sprite | null>(null);
  
  const unitsRef = useRef(units);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  const isMouseDownRef = useRef(false);
  const dragStartWorldPosRef = useRef<PIXI.PointData | null>(null);
  const isShiftDownRef = useRef(false);
  const isSelectionModeRef = useRef(!!isSelectionMode);

  useEffect(() => {
    isSelectionModeRef.current = !!isSelectionMode;
  }, [isSelectionMode]);

  const drawGrid = useCallback((g: PIXI.Graphics, guides: boolean) => {
    g.clear();
    g.setStrokeStyle({ width: 1, color: 0x262626 });
    for (let i = 0; i <= GRID_SIZE; i++) {
      g.moveTo(i * UNIT_SIZE, 0); g.lineTo(i * UNIT_SIZE, CANVAS_SIZE);
      g.moveTo(0, i * UNIT_SIZE); g.lineTo(CANVAS_SIZE, i * UNIT_SIZE);
    }
    g.stroke();

    if (guides) {
      g.setStrokeStyle({ width: 1, color: 0x444444, alpha: 0.8 });
      for (let i = 0; i <= GRID_SIZE; i += 10) {
        g.moveTo(i * UNIT_SIZE, 0); g.lineTo(i * UNIT_SIZE, CANVAS_SIZE);
        g.moveTo(0, i * UNIT_SIZE); g.lineTo(CANVAS_SIZE, i * UNIT_SIZE);
      }
      g.stroke();
    }
  }, []);

  useEffect(() => {
    let app: PIXI.Application | null = null;
    let isMounted = true;

    const initApp = async () => {
      PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

      const newApp = new PIXI.Application();
      try {
        await newApp.init({
          resizeTo: containerRef.current || undefined, 
          backgroundColor: 0x0A0A0A,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true, 
        });

        if (!isMounted || !containerRef.current) {
          newApp.destroy(true, { children: true, texture: true });
          return;
        }

        app = newApp;
        containerRef.current.appendChild(app.canvas);
        appRef.current = app;

        const viewport = new PIXI.Container();
        viewport.x = app.screen.width / 2;
        viewport.y = app.screen.height / 2;
        viewport.pivot.set(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        app.stage.addChild(viewport);
        viewportRef.current = viewport;

        const gridGraphics = new PIXI.Graphics();
        viewport.addChild(gridGraphics);
        gridGraphicsRef.current = gridGraphics;

        const hitArea = new PIXI.Graphics();
        hitArea.rect(0, 0, GRID_SIZE * UNIT_SIZE, GRID_SIZE * UNIT_SIZE);
        hitArea.fill({ color: 0x000000, alpha: 0 });
        viewport.addChild(hitArea);

        const unitsContainer = new PIXI.Container();
        viewport.addChild(unitsContainer);
        unitsContainerRef.current = unitsContainer;

        const selectionGraphics = new PIXI.Graphics();
        viewport.addChild(selectionGraphics);
        selectionGraphicsRef.current = selectionGraphics;

        const marqueeGraphics = new PIXI.Graphics();
        viewport.addChild(marqueeGraphics);
        marqueeGraphicsRef.current = marqueeGraphics;

        const previewSprite = new PIXI.Sprite();
        viewport.addChild(previewSprite);
        previewSpriteRef.current = previewSprite;

        drawGrid(gridGraphics, !!showGuides);

        // --- ЛОГИКА ТАЧ-СОБЫТИЙ (Pinch to Zoom) ---
        let lastPinchDist = 0;
        const activePointers = new Map<number, { x: number, y: number }>();

        const getDist = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
          return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        };

        const getGlobalPos = (clientX: number, clientY: number) => {
          const rect = app!.canvas.getBoundingClientRect();
          return {
            x: (clientX - rect.left) * (app!.screen.width / rect.width),
            y: (clientY - rect.top) * (app!.screen.height / rect.height)
          };
        };

        const onPointerDown = (e: PointerEvent) => {
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          
          if (activePointers.size === 1) {
            isMouseDownRef.current = true;
            lastPos = { x: e.clientX, y: e.clientY };
            if (e.shiftKey || isSelectionModeRef.current) {
              dragStartWorldPosRef.current = viewport.toLocal(getGlobalPos(e.clientX, e.clientY));
            }
          } else if (activePointers.size === 2) {
            // Начало щипка (зума)
            const pts = Array.from(activePointers.values());
            lastPinchDist = getDist(pts, pts);
            dragStartWorldPosRef.current = null; // Отменяем выделение при зуме
          }
          if (onInteraction) onInteraction();
        };

    const onPointerMove = (e: PointerEvent) => {
          if (!activePointers.has(e.pointerId)) return;
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            const dist = getDist(pts, pts);

            // ЗАЩИТА №1: Если пальцы слишком близко или расстояние не изменилось - ничего не делаем
            if (lastPinchDist <= 0 || Math.abs(dist - lastPinchDist) < 1) {
              lastPinchDist = dist;
              return;
            }

            const zoomFactor = dist / lastPinchDist;
            lastPinchDist = dist;

            const midX = (pts.x + pts.x) / 2;
            const midY = (pts.y + pts.y) / 2;
            const globalMid = getGlobalPos(midX, midY);
            
            // ЗАЩИТА №2: Проверяем, что координаты корректны перед применением
            if (isNaN(globalMid.x) || isNaN(globalMid.y)) return;

            const worldMid = viewport.toLocal(globalMid);
            const newScale = Math.max(0.2, Math.min(8, viewport.scale.x * zoomFactor));
            
            viewport.scale.set(newScale);
            
            const newGlobalMid = viewport.toGlobal(worldMid);
            
            // ЗАЩИТА №3: Плавное смещение без рывков
            viewport.x += globalMid.x - newGlobalMid.x;
            viewport.y += globalMid.y - newGlobalMid.y;
            
            // Важно обновить lastPos для плавного перехода на один палец
            lastPos = { x: midX, y: midY };

          } else if (activePointers.size === 1 && isMouseDownRef.current) {
            // ... тут твой старый код для перемещения одним пальцем ...

        const onPointerUp = (e: PointerEvent) => {
          if (activePointers.size === 1 && (e.shiftKey || isSelectionModeRef.current) && dragStartWorldPosRef.current && onUnitsSelect) {
            const currentWorldPos = viewport.toLocal(getGlobalPos(e.clientX, e.clientY));
            const minX = Math.floor(Math.min(dragStartWorldPosRef.current.x, currentWorldPos.x) / UNIT_SIZE);
            const minY = Math.floor(Math.min(dragStartWorldPosRef.current.y, currentWorldPos.y) / UNIT_SIZE);
            const maxX = Math.floor(Math.max(dragStartWorldPosRef.current.x, currentWorldPos.x) / UNIT_SIZE);
            const maxY = Math.floor(Math.max(dragStartWorldPosRef.current.y, currentWorldPos.y) / UNIT_SIZE);
            
            const newSelectedIds: number[] = [];
            for (let y = Math.max(0, minY); y <= Math.min(GRID_SIZE - 1, maxY); y++) {
              for (let x = Math.max(0, minX); x <= Math.min(GRID_SIZE - 1, maxX); x++) {
                newSelectedIds.push(y * GRID_SIZE + x);
              }
            }
            if (newSelectedIds.length > 0) onUnitsSelect(newSelectedIds);
          }

          activePointers.delete(e.pointerId);
          if (activePointers.size < 2) lastPinchDist = 0;
          if (activePointers.size === 0) {
            isMouseDownRef.current = false;
            dragStartWorldPosRef.current = null;
            if (marqueeGraphicsRef.current) marqueeGraphicsRef.current.clear();
          }
        };

        let lastPos = { x: 0, y: 0 };

        // Колесико мыши для десктопа
        const onWheel = (e: any) => {
          e.preventDefault();
          const zoomFactor = 1.1;
          const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
          const newScale = Math.max(0.1, Math.min(10, viewport.scale.x * direction));
          const mousePos = app!.renderer.events.pointer.global;
          const worldPos = viewport.toLocal(mousePos);
          viewport.scale.set(newScale);
          const newMousePos = viewport.toGlobal(worldPos);
          viewport.x += mousePos.x - newMousePos.x;
          viewport.y += mousePos.y - newMousePos.y;
          if (onInteraction) onInteraction();
        };

        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftDownRef.current = true; };
        const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftDownRef.current = false; };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // Переходим на Pointer events для универсальности (мышь + тач)
        app.canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        app.canvas.addEventListener('wheel', onWheel, { passive: false });

        app.ticker.add(() => {
          if (viewportDataRef && viewportRef.current) {
            const vp = viewportRef.current;
            const topLeft = vp.toLocal({ x: 0, y: 0 });
            const bottomRight = vp.toLocal({ x: app!.screen.width, y: app!.screen.height });
            viewportDataRef.current = {
              x: topLeft.x / UNIT_SIZE,
              y: topLeft.y / UNIT_SIZE,
              w: (bottomRight.x - topLeft.x) / UNIT_SIZE,
              h: (bottomRight.y - topLeft.y) / UNIT_SIZE
            };
          }
        });

        (app as any)._unityCleanup = () => {
          if (app?.canvas) {
            app.canvas.removeEventListener('pointerdown', onPointerDown);
            app.canvas.removeEventListener('wheel', onWheel);
          }
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        };
      } catch (error) {
        console.error('PixiJS initialization failed:', error);
      }
    };

    initApp();

    return () => {
      isMounted = false;
      if (app) {
        if ((app as any)._unityCleanup) (app as any)._unityCleanup();
        try { app.destroy(true, { children: true, texture: true }); } 
        catch (e) { console.warn('PixiJS destroy warning:', e); }
        appRef.current = null;
      }
    };
  },[]);

  useEffect(() => {
    if (gridGraphicsRef.current) drawGrid(gridGraphicsRef.current, !!showGuides);
  }, [showGuides, drawGrid]);

  const spritesRef = useRef<Map<number, PIXI.Sprite | PIXI.Graphics>>(new Map());
  const textureCacheRef = useRef<Map<string, Promise<PIXI.Texture>>>(new Map());

  const getTexture = (url: string): Promise<PIXI.Texture> => {
    if (textureCacheRef.current.has(url)) return textureCacheRef.current.get(url)!;
    const promise = PIXI.Assets.load(url);
    textureCacheRef.current.set(url, promise);
    return promise;
  };

  const renderUnits = useCallback((container: PIXI.Container, unitsData: Unit[]) => {
    if (!container) return;
    const currentIds = new Set(unitsData.filter(u => u.owner_id).map(u => u.id));
    for (const [id, sprite] of spritesRef.current.entries()) {
      if (!currentIds.has(id)) {
        container.removeChild(sprite);
        sprite.destroy({ children: true, texture: true });
        spritesRef.current.delete(id);
      }
    }
    const ownedUnits = unitsData.filter(u => u.owner_id);
    for (let i = 0; i < ownedUnits.length; i++) {
      const unit = ownedUnits[i];
      const x = unit.x * UNIT_SIZE;
      const y = unit.y * UNIT_SIZE;
      let sprite = spritesRef.current.get(unit.id);
      if (sprite) {
        const isCurrentlySprite = sprite instanceof PIXI.Sprite;
        const shouldBeSprite = !!(unit.metadata.image_url);
        if (isCurrentlySprite !== shouldBeSprite) {
          container.removeChild(sprite);
          sprite.destroy({ children: true, texture: true });
          sprite = undefined;
          spritesRef.current.delete(unit.id);
        }
      }
      if (!sprite) {
        if (unit.metadata.image_url && typeof unit.metadata.image_url === 'string' && unit.metadata.image_url.trim() !== '') {
          const imageUrl = unit.metadata.image_url;
          const newSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
          newSprite.width = UNIT_SIZE;
          newSprite.height = UNIT_SIZE;
          newSprite.x = x;
          newSprite.y = y;
          newSprite.alpha = 0;
          const animateAlpha = () => {
            if (newSprite.alpha < 1) {
              newSprite.alpha = Math.min(1, newSprite.alpha + 0.05);
              requestAnimationFrame(animateAlpha);
            }
          };
          animateAlpha();
          getTexture(imageUrl).then((baseTexture) => {
            if (!spritesRef.current.has(unit.id) || spritesRef.current.get(unit.id) !== newSprite) return;
            if (baseTexture.source) baseTexture.source.scaleMode = 'nearest';
            if (unit.metadata.group) {
              const { minX, minY, maxX, maxY } = unit.metadata.group;
              const groupW = maxX - minX + 1;
              const groupH = maxY - minY + 1;
              const localX = unit.x - minX;
              const localY = unit.y - minY;
              const updateFrame = () => {
                const source = baseTexture?.source;
                if (source && source.width > 0 && source.height > 0) {
                  const frameW = source.width / groupW;
                  const frameH = source.height / groupH;
                  newSprite.texture = new PIXI.Texture({
                    source: source,
                    frame: new PIXI.Rectangle(localX * frameW, localY * frameH, frameW, frameH)
                  });
                }
              };
              if (baseTexture.source) {
                baseTexture.source.on('update', updateFrame);
                if (baseTexture.source.width > 0) updateFrame();
              }
            } else {
              newSprite.texture = baseTexture;
            }
          }).catch(err => console.error('Failed to load unit texture:', err));
          container.addChild(newSprite);
          spritesRef.current.set(unit.id, newSprite);
        } else {
          const rect = new PIXI.Graphics();
          rect.rect(x, y, UNIT_SIZE, UNIT_SIZE);
          rect.fill(0xFF5733);
          rect.alpha = 0;
          const animateAlpha = () => {
            if (rect.alpha < 1) {
              rect.alpha = Math.min(1, rect.alpha + 0.05);
              requestAnimationFrame(animateAlpha);
            }
          };
          animateAlpha();
          container.addChild(rect);
          spritesRef.current.set(unit.id, rect);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (unitsContainerRef.current && units.length > 0) renderUnits(unitsContainerRef.current, units);
  }, [units, renderUnits]);

  useEffect(() => {
    const app = appRef.current;
    const viewport = viewportRef.current;
    if (!app || !viewport) return;
    const getUnitAt = (globalPos: PIXI.PointData) => {
      const localPos = viewport.toLocal(globalPos);
      const gridX = Math.floor(localPos.x / UNIT_SIZE);
      const gridY = Math.floor(localPos.y / UNIT_SIZE);
      if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return null;
      return unitsRef.current[gridY * GRID_SIZE + gridX] || null;
    };
    const handlePointerMove = (e: PIXI.FederatedPointerEvent) => onUnitHover(getUnitAt(e.global));
    const handlePointerTap = (e: PIXI.FederatedPointerEvent) => {
      const unit = getUnitAt(e.global);
      if (unit) onUnitClick(unit, e.shiftKey || isSelectionModeRef.current, { x: e.global.x, y: e.global.y });
    };
    const handlePointerOut = () => onUnitHover(null);
    viewport.interactive = true;
    viewport.on('pointermove', handlePointerMove);
    viewport.on('pointertap', handlePointerTap);
    viewport.on('pointerout', handlePointerOut);
    return () => {
      viewport.off('pointermove', handlePointerMove);
      viewport.off('pointertap', handlePointerTap);
      viewport.off('pointerout', handlePointerOut);
    };
  }, [onUnitHover, onUnitClick]);

  useEffect(() => {
    if (!selectionGraphicsRef.current || !previewSpriteRef.current) return;
    const g = selectionGraphicsRef.current;
    const p = previewSpriteRef.current;
    const app = appRef.current; 
    let elapsed = 0;
    const pulse = (ticker: PIXI.Ticker) => {
      elapsed += ticker.deltaTime;
      g.alpha = 0.6 + Math.sin(elapsed * 0.1) * 0.4;
    };
    if (app && selectedUnitIds.length > 0) app.ticker.add(pulse);
    g.clear();
    p.visible = false;
    if (selectedUnitIds.length === 0) {
      if (app) app.ticker.remove(pulse); 
      return;
    }
    const selectedSet = new Set(selectedUnitIds);
    const selectedUnitsData = units.filter(u => selectedSet.has(u.id));
    g.setStrokeStyle({ width: 2, color: 0xFFFFFF });
    selectedUnitsData.forEach(unit => {
      const x = unit.x * UNIT_SIZE;
      const y = unit.y * UNIT_SIZE;
      const hasLeft = selectedUnitsData.some(u => u.x === unit.x - 1 && u.y === unit.y);
      const hasRight = selectedUnitsData.some(u => u.x === unit.x + 1 && u.y === unit.y);
      const hasTop = selectedUnitsData.some(u => u.x === unit.x && u.y === unit.y - 1);
      const hasBottom = selectedUnitsData.some(u => u.x === unit.x && u.y === unit.y + 1);
      if (!hasLeft) { g.moveTo(x, y); g.lineTo(x, y + UNIT_SIZE); }
      if (!hasRight) { g.moveTo(x + UNIT_SIZE, y); g.lineTo(x + UNIT_SIZE, y + UNIT_SIZE); }
      if (!hasTop) { g.moveTo(x, y); g.lineTo(x + UNIT_SIZE, y); }
      if (!hasBottom) { g.moveTo(x, y + UNIT_SIZE); g.lineTo(x + UNIT_SIZE, y + UNIT_SIZE); }
    });
    g.stroke();
    let isCurrent = true;
    if (pendingImage && pendingImage.trim() !== '') {
      const minX = Math.min(...selectedUnitsData.map(u => u.x));
      const minY = Math.min(...selectedUnitsData.map(u => u.y));
      const maxX = Math.max(...selectedUnitsData.map(u => u.x));
      const maxY = Math.max(...selectedUnitsData.map(u => u.y));
      const loadPreview = async () => {
        try {
          const texture = await PIXI.Assets.load(pendingImage);
          if (!isCurrent || !p) return;
          p.texture = texture;
          p.x = minX * UNIT_SIZE; p.y = minY * UNIT_SIZE;
          p.width = (maxX - minX + 1) * UNIT_SIZE; p.height = (maxY - minY + 1) * UNIT_SIZE;
          p.alpha = 0.7; p.visible = true;
        } catch (e) { console.error('Failed to load preview texture:', e); }
      };
      loadPreview();
    }
    return () => {
      if (app) app.ticker.remove(pulse); 
      isCurrent = false;
    };
  }, [selectedUnitIds, units, pendingImage]);

  useEffect(() => {
    const app = appRef.current;
    const viewport = viewportRef.current;
    if (!app || !viewport || focusUnitId === null || focusUnitId === undefined) return;
    const unit = unitsRef.current[focusUnitId];
    if (!unit) return;
    const targetX = (app.screen.width / 2) - (unit.x * UNIT_SIZE * viewport.scale.x) - ((UNIT_SIZE * viewport.scale.x) / 2);
    const targetY = (app.screen.height / 2) - (unit.y * UNIT_SIZE * viewport.scale.y) - ((UNIT_SIZE * viewport.scale.y) / 2);
    const ticker = app.ticker;
    const animatePan = () => {
      const dx = targetX - viewport.x;
      const dy = targetY - viewport.y;
      viewport.x += dx * 0.1; viewport.y += dy * 0.1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) ticker.remove(animatePan);
    };
    ticker.add(animatePan);
    return () => ticker.remove(animatePan);
  }, [focusUnitId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-crosshair overflow-hidden bg-[#0A0A0A] touch-none"
      style={{ touchAction: 'none' }}
    />
  );
};