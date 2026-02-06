import { useRef, useState, useCallback, useEffect } from "react";
import { addDays, differenceInDays } from "date-fns";

interface UseTimelineGesturesOptions {
  minDays?: number;
  maxDays?: number;
  initialDays?: number;
  initialCenterDate?: Date;
  onViewChange?: (centerDate: Date, daysVisible: number) => void;
}

export function useTimelineGestures(options: UseTimelineGesturesOptions = {}) {
  const {
    minDays = 7,
    maxDays = 365,
    initialDays = 30,
    initialCenterDate = new Date(),
    onViewChange,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerMounted, setContainerMounted] = useState(false);

  const [daysVisible, setDaysVisible] = useState(initialDays);
  const [centerDate, setCenterDate] = useState(initialCenterDate);

  // Keep refs for latest values to avoid stale closures in event handlers
  const daysVisibleRef = useRef(initialDays);
  const centerDateRef = useRef(initialCenterDate);

  // Sync refs with state
  useEffect(() => {
    daysVisibleRef.current = daysVisible;
  }, [daysVisible]);

  useEffect(() => {
    centerDateRef.current = centerDate;
  }, [centerDate]);

  // Track when container is mounted/unmounted
  useEffect(() => {
    const checkContainer = () => {
      if (containerRef.current && !containerMounted) {
        setContainerMounted(true);
      }
    };
    // Check immediately and on next frame (for conditional renders)
    checkContainer();
    const frameId = requestAnimationFrame(checkContainer);
    const intervalId = setInterval(checkContainer, 100);

    // Stop checking after container is found
    if (containerMounted) {
      clearInterval(intervalId);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(intervalId);
    };
  }, [containerMounted]);

  // Gesture state refs (avoid re-renders during gestures)
  const gestureState = useRef({
    // Touch state
    isPanning: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    startCenterDate: initialCenterDate,
    initialPinchDistance: 0,
    initialDaysVisible: initialDays,
    lastTouchCount: 0,
    velocity: 0,
    lastMoveTime: 0,
    lastMoveX: 0,
    // Mouse drag state
    isMouseDragging: false,
    // Vertical scroll state
    startScrollTop: 0,
    lastMoveY: 0,
    dragDirection: null as 'horizontal' | 'vertical' | null,
  });

  // Momentum animation ref
  const momentumRef = useRef<number | null>(null);

  // Track if we're currently dragging (for cursor style)
  const [isDragging, setIsDragging] = useState(false);

  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clampDays = useCallback((days: number) => {
    return Math.min(maxDays, Math.max(minDays, Math.round(days)));
  }, [minDays, maxDays]);

  // Convert pixel movement to days based on current zoom level
  // Uses ref to always get latest daysVisible value
  const pixelsToDays = useCallback((pixels: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return 0;
    // How many days per pixel - use ref for latest value
    const daysPerPixel = daysVisibleRef.current / containerWidth;
    return pixels * daysPerPixel;
  }, []);

  // Notify parent of view changes
  useEffect(() => {
    onViewChange?.(centerDate, daysVisible);
  }, [centerDate, daysVisible, onViewChange]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Cancel any ongoing momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const touches = e.touches;
    gestureState.current.lastTouchCount = touches.length;
    gestureState.current.velocity = 0;

    if (touches.length === 2) {
      // Pinch start
      e.preventDefault();
      gestureState.current.isPinching = true;
      gestureState.current.isPanning = false;
      gestureState.current.initialPinchDistance = getDistance(touches[0], touches[1]);
      gestureState.current.initialDaysVisible = daysVisibleRef.current;
    } else if (touches.length === 1) {
      // Single finger - prepare for pan
      gestureState.current.startX = touches[0].clientX;
      gestureState.current.startY = touches[0].clientY;
      gestureState.current.startCenterDate = centerDateRef.current;
      gestureState.current.lastMoveTime = Date.now();
      gestureState.current.lastMoveX = touches[0].clientX;
      gestureState.current.isPanning = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && gestureState.current.isPinching) {
      // Pinch zoom - changes days visible
      e.preventDefault();

      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = gestureState.current.initialPinchDistance / currentDistance;
      const newDays = clampDays(gestureState.current.initialDaysVisible * scale);

      setDaysVisible(newDays);
    } else if (touches.length === 1 && gestureState.current.isPanning) {
      // Horizontal pan - moves through time
      e.preventDefault();
      const deltaX = touches[0].clientX - gestureState.current.startX;
      const deltaDays = pixelsToDays(deltaX);

      // Moving right (positive deltaX) should go back in time (subtract days)
      const newCenterDate = addDays(gestureState.current.startCenterDate, -deltaDays);
      setCenterDate(newCenterDate);

      // Track velocity for momentum
      const now = Date.now();
      const dt = now - gestureState.current.lastMoveTime;
      if (dt > 0) {
        const dx = touches[0].clientX - gestureState.current.lastMoveX;
        gestureState.current.velocity = dx / dt; // pixels per ms
      }
      gestureState.current.lastMoveTime = now;
      gestureState.current.lastMoveX = touches[0].clientX;
    }
  }, [clampDays, pixelsToDays]);

  const applyMomentum = useCallback(() => {
    const friction = 0.95;
    const minVelocity = 0.1;

    const animate = () => {
      if (Math.abs(gestureState.current.velocity) < minVelocity) {
        momentumRef.current = null;
        return;
      }

      // Apply velocity
      const deltaDays = pixelsToDays(gestureState.current.velocity * 16); // ~16ms per frame
      setCenterDate(prev => addDays(prev, -deltaDays));

      // Apply friction
      gestureState.current.velocity *= friction;

      momentumRef.current = requestAnimationFrame(animate);
    };

    momentumRef.current = requestAnimationFrame(animate);
  }, [pixelsToDays]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touches = e.touches;

    if (touches.length < 2) {
      gestureState.current.isPinching = false;
    }

    if (touches.length === 0 && gestureState.current.isPanning) {
      gestureState.current.isPanning = false;
      // Apply momentum scrolling
      if (Math.abs(gestureState.current.velocity) > 0.5) {
        applyMomentum();
      }
    }

    // If transitioning from 2 fingers to 1, reset pan start
    if (touches.length === 1 && gestureState.current.lastTouchCount === 2) {
      gestureState.current.startX = touches[0].clientX;
      gestureState.current.startCenterDate = centerDateRef.current;
      gestureState.current.velocity = 0;
    }

    gestureState.current.lastTouchCount = touches.length;
  }, [applyMomentum]);

  // Mouse drag handlers for desktop - supports both horizontal (date pan) and vertical (scroll) dragging
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicking on interactive elements (tasks, buttons, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [draggable="true"], .task-bar, [data-clickable]')) {
      return;
    }

    // Cancel any ongoing momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const container = containerRef.current;

    gestureState.current.isMouseDragging = true;
    gestureState.current.startX = e.clientX;
    gestureState.current.startY = e.clientY;
    gestureState.current.startCenterDate = centerDateRef.current;
    gestureState.current.startScrollTop = container?.scrollTop ?? 0;
    gestureState.current.lastMoveTime = Date.now();
    gestureState.current.lastMoveX = e.clientX;
    gestureState.current.lastMoveY = e.clientY;
    gestureState.current.velocity = 0;
    gestureState.current.dragDirection = null; // Reset direction detection
    setIsDragging(true);

    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!gestureState.current.isMouseDragging) return;

    const deltaX = e.clientX - gestureState.current.startX;
    const deltaY = e.clientY - gestureState.current.startY;
    const container = containerRef.current;

    // Determine drag direction if not yet set (after a small threshold)
    if (!gestureState.current.dragDirection && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      gestureState.current.dragDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    // Handle based on drag direction
    if (gestureState.current.dragDirection === 'vertical' && container) {
      // Vertical scroll - scroll the container
      const newScrollTop = gestureState.current.startScrollTop - deltaY;
      container.scrollTop = Math.max(0, newScrollTop);
    } else if (gestureState.current.dragDirection === 'horizontal' || !gestureState.current.dragDirection) {
      // Horizontal pan - change dates (default behavior)
      const deltaDays = pixelsToDays(deltaX);
      const newCenterDate = addDays(gestureState.current.startCenterDate, -deltaDays);
      setCenterDate(newCenterDate);

      // Track velocity for momentum
      const now = Date.now();
      const dt = now - gestureState.current.lastMoveTime;
      if (dt > 0) {
        const dx = e.clientX - gestureState.current.lastMoveX;
        gestureState.current.velocity = dx / dt; // pixels per ms
      }
      gestureState.current.lastMoveTime = now;
      gestureState.current.lastMoveX = e.clientX;
    }

    gestureState.current.lastMoveY = e.clientY;
  }, [pixelsToDays]);

  const handleMouseUp = useCallback(() => {
    if (!gestureState.current.isMouseDragging) return;

    const wasHorizontal = gestureState.current.dragDirection === 'horizontal';

    gestureState.current.isMouseDragging = false;
    gestureState.current.dragDirection = null;
    setIsDragging(false);

    // Apply momentum scrolling only for horizontal panning
    if (wasHorizontal && Math.abs(gestureState.current.velocity) > 0.3) {
      applyMomentum();
    }
  }, [applyMomentum]);

  // Mouse wheel/trackpad handling
  const handleWheel = useCallback((e: WheelEvent) => {
    // Cancel momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const container = containerRef.current;

    // Pinch gesture on trackpad (ctrlKey is true)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      // Zoom: deltaY > 0 means zoom out (more days), deltaY < 0 means zoom in (fewer days)
      const zoomFactor = 1 + (e.deltaY * 0.01);
      const newDays = clampDays(daysVisibleRef.current * zoomFactor);
      setDaysVisible(newDays);
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal scroll (shift+scroll or explicit horizontal scroll) - pan through time
      e.preventDefault();
      const deltaPixels = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const deltaDays = pixelsToDays(deltaPixels);
      setCenterDate(prev => addDays(prev, deltaDays));
    } else if (container) {
      // Vertical scroll - let it scroll the container naturally
      // Don't prevent default, let the browser handle it
      // But we can enhance smoothness if needed
    }
  }, [clampDays, pixelsToDays]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch handlers
    const touchStartHandler = (e: TouchEvent) => handleTouchStart(e);
    const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e);
    const touchEndHandler = (e: TouchEvent) => handleTouchEnd(e);
    const wheelHandler = (e: WheelEvent) => handleWheel(e);

    // Mouse handlers
    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e);
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e);
    const mouseUpHandler = () => handleMouseUp();
    const mouseLeaveHandler = () => handleMouseUp();

    container.addEventListener("touchstart", touchStartHandler, { passive: false });
    container.addEventListener("touchmove", touchMoveHandler, { passive: false });
    container.addEventListener("touchend", touchEndHandler, { passive: true });
    container.addEventListener("wheel", wheelHandler, { passive: false });

    container.addEventListener("mousedown", mouseDownHandler);
    window.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("mouseup", mouseUpHandler);
    container.addEventListener("mouseleave", mouseLeaveHandler);

    return () => {
      container.removeEventListener("touchstart", touchStartHandler);
      container.removeEventListener("touchmove", touchMoveHandler);
      container.removeEventListener("touchend", touchEndHandler);
      container.removeEventListener("wheel", wheelHandler);
      container.removeEventListener("mousedown", mouseDownHandler);
      window.removeEventListener("mousemove", mouseMoveHandler);
      window.removeEventListener("mouseup", mouseUpHandler);
      container.removeEventListener("mouseleave", mouseLeaveHandler);
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, containerMounted]);

  // Programmatic controls
  const setDaysVisibleClamped = useCallback((days: number) => {
    setDaysVisible(clampDays(days));
  }, [clampDays]);

  const zoomIn = useCallback(() => {
    setDaysVisible(prev => clampDays(prev * 0.7));
  }, [clampDays]);

  const zoomOut = useCallback(() => {
    setDaysVisible(prev => clampDays(prev * 1.4));
  }, [clampDays]);

  const goToToday = useCallback(() => {
    setCenterDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCenterDate(date);
  }, []);

  const panByDays = useCallback((days: number) => {
    setCenterDate(prev => addDays(prev, days));
  }, []);

  // Computed date range
  const startDate = addDays(centerDate, -Math.floor(daysVisible / 2));
  const endDate = addDays(centerDate, Math.ceil(daysVisible / 2));

  return {
    containerRef,
    daysVisible,
    centerDate,
    startDate,
    endDate,
    setDaysVisible: setDaysVisibleClamped,
    setCenterDate,
    zoomIn,
    zoomOut,
    goToToday,
    goToDate,
    panByDays,
    minDays,
    maxDays,
    isDragging,
  };
}
