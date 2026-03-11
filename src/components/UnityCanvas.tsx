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
        hitArea.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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

        // --- МОБИЛЬНАЯ ЛОГИКА ---
        let lastPinchDist = 0;
        let lastPos = { x: 0, y: 0 };
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
            const pts = Array.from(activePointers.values());
            lastPinchDist = getDist(pts, pts);
            dragStartWorldPosRef.current = null;
            if (marqueeGraphicsRef.current) marqueeGraphicsRef.current.clear();
          }
          if (onInteraction) onInteraction();
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!activePointers.has(e.pointerId)) return;
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            const dist = getDist(pts, pts);
            if (lastPinchDist > 0) {
              const zoomFactor = dist / lastPinchDist;
              lastPinchDist = dist;
              const midX = (pts.x + pts.x) / 2;
              const midY = (pts.y + pts.y) / 2;
              const globalMid = getGlobalPos(midX, midY);
              if (isNaN(globalMid.x) || isNaN(globalMid.y)) return;
              const worldMid = viewport.toLocal(globalMid);
              const newScale = Math.max(0.15, Math.min(10, viewport.scale.x * zoomFactor));
              viewport.scale.set(newScale);
              const newGlobalMid = viewport.toGlobal(worldMid);
              viewport.x += globalMid.x - newGlobalMid.x;
              viewport.y += globalMid.y - newGlobalMid.y;
              lastPos = { x: midX, y: midY };
            }
          } else if (activePointers.size === 1 && isMouseDownRef.current) {
            if (e.shiftKey || isSelectionModeRef.current) {
              if (dragStartWorldPosRef.current && marqueeGraphicsRef.current) {
                const currentWorldPos = viewport.toLocal(getGlobalPos(e.clientX, e.clientY));
                const mg = marqueeGraphicsRef.current;
                mg.clear().setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: 0.8 })
                  .rect(Math.min(dragStartWorldPosRef.current.x, currentWorldPos.x),
                        Math.min(dragStartWorldPosRef.current.y, currentWorldPos.y),
                        Math.abs(currentWorldPos.x - dragStartWorldPosRef.current.x),
                        Math.abs(currentWorldPos.y - dragStartWorldPosRef.current.y))
                  .fill({ color: 0xFFFFFF, alpha: 0.1 }).stroke();
              }
            } else {
              viewport.x += e.clientX - lastPos.x;
              viewport.y += e.clientY - lastPos.y;
              lastPos = { x: e.clientX, y: e.clientY };
            }
          }
          if (onInteraction) onInteraction();
        };

        const onPointerUp = (e: PointerEvent) => {
          if (activePointers.size === 1 && (e.shiftKey || isSelectionModeRef.current) && dragStartWorldPosRef.current && onUnitsSelect) {
            const currentWorldPos = viewport.toLocal(getGlobalPos(e.clientX, e.clientY));
            const minX = Math.floor(Math.min(dragStartWorldPosRef.current.x, currentWorldPos.x) / UNIT_SIZE);
            const minY = Math.floor(Math.min(dragStartWorldPosRef.current.y, currentWorldPos.y) / UNIT_SIZE);
            const maxX = Math.floor(Math.max(dragStartWorldPosRef.current.x, currentWorldPos.x) / UNIT_SIZE);
            const maxY = Math.floor(Math.max(dragStartWorldPosRef.current.y, currentWorldPos.y) / UNIT_SIZE);
            const ids: number[] = [];
            for (let y = Math.max(0, minY); y <= Math.min(GRID_SIZE - 1, maxY); y++) {
              for (let x = Math.max(0, minX); x <= Math.min(GRID_SIZE - 1, maxX); x++) ids.push(y * GRID_SIZE + x);
            }
            if (ids.length > 0) onUnitsSelect(ids);
          }
          activePointers.delete(e.pointerId);
          if (activePointers.size < 2) lastPinchDist = 0;
          if (activePointers.size === 1) {
            const rem = activePointers.values().next().value;
            lastPos = { x: rem.x, y: rem.y };
          } else if (activePointers.size === 0) {
            isMouseDownRef.current = false;
            dragStartWorldPosRef.current = null;
            marqueeGraphicsRef.current?.clear();
          }
        };

        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          const worldPos = viewport.toLocal(app!.renderer.events.pointer.global);
          viewport.scale.set(Math.max(0.1, Math.min(10, viewport.scale.x * factor)));
          const newGlobal = viewport.toGlobal(worldPos);
          viewport.x += app!.renderer.events.pointer.global.x - newGlobal.x;
          viewport.y += app!.renderer.events.pointer.global.y - newGlobal.y;
          if (onInteraction) onInteraction();
        };

        app.canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        app.canvas.addEventListener('wheel', onWheel, { passive: false });

        app.ticker.add(() => {
          if (viewportDataRef?.current && viewportRef.current) {
            const vp = viewportRef.current;
            const tl = vp.toLocal({ x: 0, y: 0 });
            const br = vp.toLocal({ x: app!.screen.width, y: app!.screen.height });
            viewportDataRef.current = { x: tl.x / UNIT_SIZE, y: tl.y / UNIT_SIZE, w: (br.x - tl.x) / UNIT_SIZE, h: (br.y - tl.y) / UNIT_SIZE };
          }
        });

        (app as any)._unityCleanup = () => {
          app?.canvas.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          app?.canvas.removeEventListener('wheel', onWheel);
        };
      } catch (err) {
        console.error('PixiJS initialization failed:', err);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftDownRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') isShiftDownRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    initApp();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (app) {
        if ((app as any)._unityCleanup) (app as any)._unityCleanup();
        app.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gridGraphicsRef.current) drawGrid(gridGraphicsRef.current, !!showGuides);
  }, [showGuides, drawGrid]);

  const spritesRef = useRef<Map<number, PIXI.Sprite | PIXI.Graphics>>(new Map());
  const textureCacheRef = useRef<Map<string, Promise<PIXI.Texture>>>(new Map());

  const getTexture = (url: string): Promise<PIXI.Texture> => {
    if (textureCacheRef.current.has(url)) return textureCacheRef.current.get(url)!;
    const p = PIXI.Assets.load(url);
    textureCacheRef.current.set(url, p);
    return p;
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
    const owned = unitsData.filter(u => u.owner_id);
    for (let unit of owned) {
      let sprite = spritesRef.current.get(unit.id);
      if (!sprite) {
        if (unit.metadata.image_url) {
          const s = new PIXI.Sprite(PIXI.Texture.WHITE);
          s.width = s.height = UNIT_SIZE;
          s.x = unit.x * UNIT_SIZE; s.y = unit.y * UNIT_SIZE;
          getTexture(unit.metadata.image_url).then(tex => {
            if (tex.source) tex.source.scaleMode = 'nearest';
            if (unit.metadata.group) {
              const { minX, minY, maxX, maxY } = unit.metadata.group;
              const frameW = tex.source.width / (maxX - minX + 1);
              const frameH = tex.source.height / (maxY - minY + 1);
              s.texture = new PIXI.Texture({ source: tex.source, frame: new PIXI.Rectangle((unit.x - minX) * frameW, (unit.y - minY) * frameH, frameW, frameH) });
            } else s.texture = tex;
          });
          container.addChild(s);
          spritesRef.current.set(unit.id, s);
        } else {
          const g = new PIXI.Graphics().rect(unit.x * UNIT_SIZE, unit.y * UNIT_SIZE, UNIT_SIZE, UNIT_SIZE).fill(0xFF5733);
          container.addChild(g);
          spritesRef.current.set(unit.id, g);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (unitsContainerRef.current && units.length > 0) renderUnits(unitsContainerRef.current, units);
  }, [units, renderUnits]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const getAt = (global: PIXI.PointData) => {
      const lp = viewport.toLocal(global);
      const gx = Math.floor(lp.x / UNIT_SIZE), gy = Math.floor(lp.y / UNIT_SIZE);
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return null;
      return unitsRef.current[gy * GRID_SIZE + gx] || null;
    };
    const onMove = (e: PIXI.FederatedPointerEvent) => onUnitHover(getAt(e.global));
    const onTap = (e: PIXI.FederatedPointerEvent) => {
      const u = getAt(e.global);
      if (u) onUnitClick(u, e.shiftKey || isSelectionModeRef.current, { x: e.global.x, y: e.global.y });
    };
    viewport.interactive = true;
    viewport.on('pointermove', onMove).on('pointertap', onTap).on('pointerout', () => onUnitHover(null));
    return () => { viewport.off('pointermove', onMove).off('pointertap', onTap).off('pointerout'); };
  }, [onUnitHover, onUnitClick]);

  useEffect(() => {
    if (!selectionGraphicsRef.current || !previewSpriteRef.current) return;
    const g = selectionGraphicsRef.current, p = previewSpriteRef.current, app = appRef.current;
    let elapsed = 0;
    const pulse = (t: PIXI.Ticker) => { elapsed += t.deltaTime; g.alpha = 0.6 + Math.sin(elapsed * 0.1) * 0.4; };
    if (app && selectedUnitIds.length > 0) app.ticker.add(pulse);
    g.clear(); p.visible = false;
    if (selectedUnitIds.length === 0) { if (app) app.ticker.remove(pulse); return; }
    const sel = units.filter(u => selectedUnitIds.includes(u.id));
    g.setStrokeStyle({ width: 2, color: 0xFFFFFF });
    sel.forEach(u => {
      const x = u.x * UNIT_SIZE, y = u.y * UNIT_SIZE;
      if (!sel.some(s => s.x === u.x - 1 && s.y === u.y)) { g.moveTo(x, y); g.lineTo(x, y + UNIT_SIZE); }
      if (!sel.some(s => s.x === u.x + 1 && s.y === u.y)) { g.moveTo(x + UNIT_SIZE, y); g.lineTo(x + UNIT_SIZE, y + UNIT_SIZE); }
      if (!sel.some(s => s.x === u.x && s.y === u.y - 1)) { g.moveTo(x, y); g.lineTo(x + UNIT_SIZE, y); }
      if (!sel.some(s => s.x === u.x && s.y === u.y + 1)) { g.moveTo(x, y + UNIT_SIZE); g.lineTo(x + UNIT_SIZE, y + UNIT_SIZE); }
    });
    g.stroke();
    if (pendingImage) {
      const minX = Math.min(...sel.map(u => u.x)), minY = Math.min(...sel.map(u => u.y)), maxX = Math.max(...sel.map(u => u.x)), maxY = Math.max(...sel.map(u => u.y));
      PIXI.Assets.load(pendingImage).then(tex => {
        p.texture = tex; p.x = minX * UNIT_SIZE; p.y = minY * UNIT_SIZE;
        p.width = (maxX - minX + 1) * UNIT_SIZE; p.height = (maxY - minY + 1) * UNIT_SIZE;
        p.alpha = 0.7; p.visible = true;
      });
    }
    return () => { if (app) app.ticker.remove(pulse); };
  }, [selectedUnitIds, units, pendingImage]);

  useEffect(() => {
    const app = appRef.current, vp = viewportRef.current;
    if (!app || !vp || focusUnitId == null) return;
    const u = unitsRef.current[focusUnitId]; if (!u) return;
    const tx = (app.screen.width/2) - (u.x * UNIT_SIZE * vp.scale.x) - ((UNIT_SIZE * vp.scale.x)/2);
    const ty = (app.screen.height/2) - (u.y * UNIT_SIZE * vp.scale.y) - ((UNIT_SIZE * vp.scale.y)/2);
    const pan = () => {
      const dx = tx - vp.x, dy = ty - vp.y; vp.x += dx * 0.1; vp.y += dy * 0.1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) app.ticker.remove(pan);
    };
    app.ticker.add(pan);
    return () => app.ticker.remove(pan);
  }, [focusUnitId]);

  return <div ref={containerRef} className="w-full h-full cursor-crosshair overflow-hidden bg-[#0A0A0A] touch-none" style={{ touchAction: 'none' }} />;
};