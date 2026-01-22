import { useState, useCallback, useRef } from 'react';
import { FloorMapShape } from '../types';

interface HistoryState {
  shapes: FloorMapShape[];
  timestamp: number;
}

const MAX_HISTORY_SIZE = 50;

export const useUndoRedo = (initialShapes: FloorMapShape[]) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { shapes: initialShapes, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  const pushToHistory = useCallback((shapes: FloorMapShape[]) => {
    // Don't add to history if this is an undo/redo action
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory((prev) => {
      // Remove any "future" states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push({ shapes: JSON.parse(JSON.stringify(shapes)), timestamp: Date.now() });
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [currentIndex]);

  const undo = useCallback((): FloorMapShape[] | null => {
    if (currentIndex <= 0) return null;
    
    isUndoRedoAction.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].shapes));
  }, [currentIndex, history]);

  const redo = useCallback((): FloorMapShape[] | null => {
    if (currentIndex >= history.length - 1) return null;
    
    isUndoRedoAction.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return JSON.parse(JSON.stringify(history[newIndex].shapes));
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const reset = useCallback((shapes: FloorMapShape[]) => {
    setHistory([{ shapes: JSON.parse(JSON.stringify(shapes)), timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, []);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
};
