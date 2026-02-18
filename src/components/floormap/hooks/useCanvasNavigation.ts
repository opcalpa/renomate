/**
 * Canvas Navigation Hook
 *
 * Handles wheel zoom, touch pinch-zoom, and panning for the floor plan canvas.
 * Extracted from UnifiedKonvaCanvas for better maintainability.
 */

import { useCallback, useRef, useState } from 'react';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { MIN_ZOOM, MAX_ZOOM } from '../canvas/constants';
import { useFloorMapStore } from '../store';

interface UseCanvasNavigationProps {
  stageRef: React.RefObject<Konva.Stage>;
  canvasWidthMeters: number;
  canvasHeightMeters: number;
  pixelsPerMm: number;
}

interface UseCanvasNavigationReturn {
  // Touch state
  lastTouchDistance: number | null;
  lastTouchCenter: { x: number; y: number } | null;
  setLastTouchDistance: (d: number | null) => void;
  setLastTouchCenter: (c: { x: number; y: number } | null) => void;
  touchPanStartRef: React.MutableRefObject<{ x: number; y: number; panX: number; panY: number } | null>;

  // Handlers
  constrainPan: (panX: number, panY: number, zoom: number) => { panX: number; panY: number };
  handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
  handleTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchEnd: (e: KonvaEventObject<TouchEvent>) => void;

  // Touch helpers
  getTouchDistance: (touch1: Touch, touch2: Touch) => number;
  getTouchCenter: (touch1: Touch, touch2: Touch) => { x: number; y: number };
}

/**
 * Hook for canvas navigation (zoom, pan, touch gestures).
 */
export function useCanvasNavigation({
  stageRef,
  canvasWidthMeters,
  canvasHeightMeters,
  pixelsPerMm,
}: UseCanvasNavigationProps): UseCanvasNavigationReturn {
  // Get view state from store
  const viewState = useFloorMapStore(state => state.viewState);
  const setViewState = useFloorMapStore(state => state.setViewState);

  // Touch/pinch zoom state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);
  const touchPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  /**
   * Constrain pan values to keep canvas within viewport bounds.
   */
  const constrainPan = useCallback((panX: number, panY: number, zoom: number): { panX: number; panY: number } => {
    const canvasWidthPx = canvasWidthMeters * 1000 * pixelsPerMm;
    const canvasHeightPx = canvasHeightMeters * 1000 * pixelsPerMm;

    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;

    const scaledCanvasWidth = canvasWidthPx * zoom;
    const scaledCanvasHeight = canvasHeightPx * zoom;

    // Calculate bounds - canvas edges should not come inside viewport
    const minPanX = stageWidth - scaledCanvasWidth;
    const maxPanX = 0;
    const minPanY = stageHeight - scaledCanvasHeight;
    const maxPanY = 0;

    // If canvas is smaller than viewport, center it
    const constrainedPanX = scaledCanvasWidth < stageWidth
      ? (stageWidth - scaledCanvasWidth) / 2
      : Math.max(minPanX, Math.min(maxPanX, panX));

    const constrainedPanY = scaledCanvasHeight < stageHeight
      ? (stageHeight - scaledCanvasHeight) / 2
      : Math.max(minPanY, Math.min(maxPanY, panY));

    return { panX: constrainedPanX, panY: constrainedPanY };
  }, [canvasWidthMeters, canvasHeightMeters, pixelsPerMm]);

  /**
   * Calculate distance between two touch points.
   */
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Get center point between two touches.
   */
  const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  /**
   * Handle mouse wheel - zoom with Ctrl/Cmd, pan with two-finger scroll.
   */
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault(); // Prevent default scroll behavior

    const stage = stageRef.current;
    if (!stage) return;

    // Zoom with Ctrl/Cmd + scroll
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.zoom * zoomFactor));

      const mousePointTo = {
        x: (pointer.x - viewState.panX) / viewState.zoom,
        y: (pointer.y - viewState.panY) / viewState.zoom,
      };

      const unconstrained = {
        panX: pointer.x - mousePointTo.x * newZoom,
        panY: pointer.y - mousePointTo.y * newZoom,
      };

      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, newZoom);

      setViewState({
        zoom: newZoom,
        ...constrained,
      });
    } else {
      // Two-finger scroll (panning) - smooth and responsive in all directions
      const scrollSpeed = 1.2;

      const unconstrained = {
        panX: viewState.panX - e.evt.deltaX * scrollSpeed,
        panY: viewState.panY - e.evt.deltaY * scrollSpeed,
      };

      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, viewState.zoom);

      setViewState({
        ...constrained,
      });
    }
  }, [stageRef, viewState, setViewState, constrainPan]);

  /**
   * Handle touch start (for pinch zoom and single-finger pan).
   */
  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // Two-finger touch = prepare for pinch zoom
    if (touches.length === 2) {
      e.evt.preventDefault(); // Prevent browser zoom
      touchPanStartRef.current = null; // Cancel single-finger pan

      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);

      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }

    // Single-finger touch on empty canvas = pan
    if (touches.length === 1) {
      const target = e.target;
      const isEmptyCanvas = target === target.getStage();
      const { activeTool } = useFloorMapStore.getState();

      if (isEmptyCanvas && activeTool === 'select') {
        const { panX, panY } = useFloorMapStore.getState().viewState;
        touchPanStartRef.current = {
          x: touches[0].clientX,
          y: touches[0].clientY,
          panX,
          panY,
        };
      }
    }
  }, []);

  /**
   * Handle touch move (pinch zoom and single-finger pan).
   */
  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    // Single-finger pan
    if (touches.length === 1 && touchPanStartRef.current) {
      e.evt.preventDefault();
      const dx = touches[0].clientX - touchPanStartRef.current.x;
      const dy = touches[0].clientY - touchPanStartRef.current.y;
      const newPanX = touchPanStartRef.current.panX + dx;
      const newPanY = touchPanStartRef.current.panY + dy;
      const constrained = constrainPan(newPanX, newPanY, viewState.zoom);
      setViewState(constrained);
      return;
    }

    // Two-finger pinch zoom
    if (touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      e.evt.preventDefault(); // Prevent browser zoom

      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);

      // Calculate zoom change based on distance change
      const scale = currentDistance / lastTouchDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.zoom * scale));

      // Zoom towards the pinch center point
      const mousePointTo = {
        x: (lastTouchCenter.x - viewState.panX) / viewState.zoom,
        y: (lastTouchCenter.y - viewState.panY) / viewState.zoom,
      };

      const unconstrained = {
        panX: lastTouchCenter.x - mousePointTo.x * newZoom,
        panY: lastTouchCenter.y - mousePointTo.y * newZoom,
      };

      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, newZoom);

      setViewState({
        zoom: newZoom,
        ...constrained,
      });

      // Update for next frame
      setLastTouchDistance(currentDistance);
      setLastTouchCenter(currentCenter);
    }
  }, [stageRef, viewState, lastTouchDistance, lastTouchCenter, setViewState, constrainPan]);

  /**
   * Handle touch end (cleanup).
   */
  const handleTouchEnd = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // Reset single-finger pan
    if (touches.length === 0) {
      touchPanStartRef.current = null;
    }

    // Reset pinch zoom state when fingers are lifted
    if (touches.length < 2) {
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  }, []);

  return {
    // Touch state
    lastTouchDistance,
    lastTouchCenter,
    setLastTouchDistance,
    setLastTouchCenter,
    touchPanStartRef,

    // Handlers
    constrainPan,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Touch helpers
    getTouchDistance,
    getTouchCenter,
  };
}
