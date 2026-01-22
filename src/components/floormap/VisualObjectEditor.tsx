/**
 * VISUAL OBJECT EDITOR
 * 
 * Grafiskt redigeringsverktyg för att rita och justera arkitektoniska objekt.
 * Användaren kan se objektet live och använda ritverktyg för att ändra det.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Rect, Ellipse, Group, Transformer, Text } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Minus,
  Circle as CircleIcon,
  Square,
  Disc,
  Move,
  Trash2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ObjectShape, ObjectDefinition } from './objectLibraryDefinitions';
import Konva from 'konva';
import { toast } from 'sonner';

interface VisualObjectEditorProps {
  definition: ObjectDefinition;
  onShapesChange: (shapes: ObjectShape[]) => void;
}

type Tool = 'select' | 'line' | 'circle' | 'rect' | 'ellipse';

interface DrawingState {
  tool: Tool;
  isDrawing: boolean;
  startPos?: { x: number; y: number };
  currentShape?: ObjectShape;
}

export const VisualObjectEditor: React.FC<VisualObjectEditorProps> = ({
  definition,
  onShapesChange,
}) => {
  const [shapes, setShapes] = useState<ObjectShape[]>(definition.shapes || []);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [drawing, setDrawing] = useState<DrawingState>({
    tool: 'select',
    isDrawing: false,
  });
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<ObjectShape[][]>([shapes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const canvasWidth = 800;
  const canvasHeight = 600;
  const gridSize = 50; // 50mm grid

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in input
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isTyping) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
        e.preventDefault();
      } else if (e.key === 'l' || e.key === 'L') {
        setTool('line');
        e.preventDefault();
      } else if (e.key === 'c' || e.key === 'C') {
        setTool('circle');
        e.preventDefault();
      } else if (e.key === 'r' || e.key === 'R') {
        setTool('rect');
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        setTool('ellipse');
        e.preventDefault();
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeIndex !== null) {
          handleDeleteShape();
          e.preventDefault();
        }
      }

      // Undo/Redo
      if (modKey && e.key === 'z' && !e.shiftKey) {
        handleUndo();
        e.preventDefault();
      } else if (modKey && e.shiftKey && e.key === 'z') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeIndex, historyIndex, history]);

  // Update shapes when definition changes externally
  useEffect(() => {
    setShapes(definition.shapes || []);
  }, [definition.shapes]);

  // Notify parent when shapes change
  useEffect(() => {
    onShapesChange(shapes);
  }, [shapes, onShapesChange]);

  // Save to history
  const saveToHistory = (newShapes: ObjectShape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setShapes(JSON.parse(JSON.stringify(history[newIndex])));
      setHistoryIndex(newIndex);
      toast.success('Ångrad');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setShapes(JSON.parse(JSON.stringify(history[newIndex])));
      setHistoryIndex(newIndex);
      toast.success('Gjort om');
    }
  };

  // Handle mouse down (start drawing)
  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      // Check if clicked on a shape
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedShapeIndex(null);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const scale = zoom;
    const x = pos.x / scale;
    const y = pos.y / scale;

    setDrawing({
      tool,
      isDrawing: true,
      startPos: { x, y },
    });
  };

  // Handle mouse move (drawing preview)
  const handleMouseMove = (e: any) => {
    if (!drawing.isDrawing || !drawing.startPos) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const scale = zoom;
    const x = pos.x / scale;
    const y = pos.y / scale;

    const { startPos } = drawing;

    let previewShape: ObjectShape | undefined;

    switch (tool) {
      case 'line':
        previewShape = {
          type: 'line',
          points: [startPos.x, startPos.y, x, y],
          stroke: '#000000',
          strokeWidth: 2,
        };
        break;

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
        );
        previewShape = {
          type: 'circle',
          x: startPos.x,
          y: startPos.y,
          radius: radius,
          stroke: '#000000',
          strokeWidth: 2,
          fill: 'transparent',
        };
        break;

      case 'rect':
        previewShape = {
          type: 'rect',
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(x - startPos.x),
          height: Math.abs(y - startPos.y),
          stroke: '#000000',
          strokeWidth: 2,
          fill: 'transparent',
        };
        break;

      case 'ellipse':
        previewShape = {
          type: 'ellipse',
          x: startPos.x,
          y: startPos.y,
          radiusX: Math.abs(x - startPos.x),
          radiusY: Math.abs(y - startPos.y),
          stroke: '#000000',
          strokeWidth: 2,
          fill: 'transparent',
        };
        break;
    }

    setDrawing({ ...drawing, currentShape: previewShape });
  };

  // Handle mouse up (complete drawing)
  const handleMouseUp = (e: any) => {
    if (!drawing.isDrawing || !drawing.currentShape) {
      setDrawing({ tool, isDrawing: false });
      return;
    }

    const newShapes = [...shapes, drawing.currentShape];
    setShapes(newShapes);
    saveToHistory(newShapes);
    setDrawing({ tool, isDrawing: false });
    toast.success('Form tillagd');
  };

  // Delete selected shape
  const handleDeleteShape = () => {
    if (selectedShapeIndex === null) return;

    const newShapes = shapes.filter((_, i) => i !== selectedShapeIndex);
    setShapes(newShapes);
    saveToHistory(newShapes);
    setSelectedShapeIndex(null);
    toast.success('Form raderad');
  };

  // Update shape properties
  const handleUpdateShape = (index: number, updates: Partial<ObjectShape>) => {
    const newShapes = [...shapes];
    newShapes[index] = { ...newShapes[index], ...updates };
    setShapes(newShapes);
    saveToHistory(newShapes);
  };

  // Render a single shape
  const renderShape = (shape: ObjectShape, index: number, isPreview = false) => {
    const key = isPreview ? 'preview' : `shape-${index}`;
    const isSelected = index === selectedShapeIndex && !isPreview;
    const stroke = isPreview ? '#666666' : shape.stroke || '#000000';
    const strokeWidth = (shape.strokeWidth || 2) * (isSelected ? 1.5 : 1);
    const fill = shape.fill || 'transparent';
    const opacity = isPreview ? 0.5 : shape.opacity !== undefined ? shape.opacity : 1;

    const commonProps = {
      onClick: () => !isPreview && setSelectedShapeIndex(index),
      onTap: () => !isPreview && setSelectedShapeIndex(index),
      draggable: !isPreview && tool === 'select',
      onDragEnd: (e: any) => {
        if (isPreview) return;
        const node = e.target;
        const newShape = { ...shape };

        if (shape.type === 'circle' || shape.type === 'ellipse') {
          newShape.x = node.x();
          newShape.y = node.y();
        } else if (shape.type === 'rect') {
          newShape.x = node.x();
          newShape.y = node.y();
        } else if (shape.type === 'line' && shape.points) {
          const deltaX = node.x();
          const deltaY = node.y();
          newShape.points = shape.points.map((p, i) =>
            i % 2 === 0 ? p + deltaX : p + deltaY
          );
          node.x(0);
          node.y(0);
        }

        handleUpdateShape(index, newShape);
      },
    };

    switch (shape.type) {
      case 'line':
        if (!shape.points || shape.points.length < 4) return null;
        return (
          <Line
            key={key}
            points={shape.points}
            stroke={stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            dash={shape.dash}
            opacity={opacity}
            {...commonProps}
          />
        );

      case 'circle':
        if (shape.x === undefined || shape.y === undefined || !shape.radius) return null;
        return (
          <Circle
            key={key}
            x={shape.x}
            y={shape.y}
            radius={shape.radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill}
            opacity={opacity}
            {...commonProps}
          />
        );

      case 'rect':
        if (
          shape.x === undefined ||
          shape.y === undefined ||
          !shape.width ||
          !shape.height
        )
          return null;
        return (
          <Rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill}
            opacity={opacity}
            {...commonProps}
          />
        );

      case 'ellipse':
        if (
          shape.x === undefined ||
          shape.y === undefined ||
          !shape.radiusX ||
          !shape.radiusY
        )
          return null;
        return (
          <Ellipse
            key={key}
            x={shape.x}
            y={shape.y}
            radiusX={shape.radiusX}
            radiusY={shape.radiusY}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill}
            opacity={opacity}
            {...commonProps}
          />
        );

      default:
        return null;
    }
  };

  // Clear all shapes
  const handleClear = () => {
    if (confirm('Är du säker på att du vill rensa alla former?')) {
      setShapes([]);
      saveToHistory([]);
      setSelectedShapeIndex(null);
      toast.success('Alla former rensade');
    }
  };

  const selectedShape = selectedShapeIndex !== null ? shapes[selectedShapeIndex] : null;

  return (
    <div className="flex flex-col" style={{ height: '500px' }}>
      {/* Toolbar */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Drawing tools */}
          <div className="flex gap-1">
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('select')}
              title="Markera (V)"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('line')}
              title="Linje (L)"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('circle')}
              title="Cirkel (C)"
            >
              <CircleIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'rect' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('rect')}
              title="Rektangel (R)"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'ellipse' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('ellipse')}
              title="Ellips (E)"
            >
              <Disc className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Ångra (Cmd+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              title="Gör om (Cmd+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteShape}
              disabled={selectedShapeIndex === null}
              title="Radera (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Zoom */}
          <div className="flex gap-1 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              title="Zooma ut"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              title="Zooma in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(1)}
              title="Återställ zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Clear */}
          <Button variant="outline" size="sm" onClick={handleClear}>
            Rensa alla
          </Button>

          <div className="flex-1" />

          {/* Info */}
          <Badge variant="secondary">
            {shapes.length} {shapes.length === 1 ? 'form' : 'former'}
          </Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden">
          {/* Instructions overlay */}
          {shapes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg text-center max-w-md">
                <h3 className="font-semibold text-lg mb-2">Välkommen till Visual Editor!</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Linje:</strong> Klicka och dra för att rita en linje</p>
                  <p><strong>Cirkel:</strong> Klicka centrum, dra för radie</p>
                  <p><strong>Rektangel/Ellips:</strong> Klicka och dra</p>
                  <p><strong>Markera:</strong> Klicka på form för att flytta/redigera</p>
                </div>
              </div>
            </div>
          )}

          {/* Konva Stage */}
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            scaleX={zoom}
            scaleY={zoom}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          >
            <Layer>
              {/* Grid */}
              {[...Array(Math.ceil(canvasWidth / gridSize / zoom) + 1)].map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * gridSize, 0, i * gridSize, canvasHeight / zoom]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5 / zoom}
                />
              ))}
              {[...Array(Math.ceil(canvasHeight / gridSize / zoom) + 1)].map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * gridSize, canvasWidth / zoom, i * gridSize]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5 / zoom}
                />
              ))}

              {/* Origin marker */}
              <Circle x={0} y={0} radius={3 / zoom} fill="red" />
              <Text
                x={5 / zoom}
                y={5 / zoom}
                text="0,0"
                fontSize={10 / zoom}
                fill="red"
              />

              {/* Object bounds outline */}
              <Rect
                x={0}
                y={0}
                width={definition.defaultWidth}
                height={definition.defaultHeight}
                stroke="#3b82f6"
                strokeWidth={2 / zoom}
                dash={[5 / zoom, 5 / zoom]}
                listening={false}
              />

              {/* Drawn shapes */}
              {shapes.map((shape, index) => renderShape(shape, index))}

              {/* Preview shape (while drawing) */}
              {drawing.currentShape && renderShape(drawing.currentShape, -1, true)}

              {/* Transformer for selected shape */}
              {selectedShapeIndex !== null && (
                <Transformer
                  ref={transformerRef}
                  nodes={[]}
                  keepRatio={false}
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                />
              )}
            </Layer>
          </Stage>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Origo (0,0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed border-blue-500" />
              <span>
                Objektgränser ({definition.defaultWidth}×{definition.defaultHeight}mm)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-300" />
              <span>Grid: {gridSize}mm</span>
            </div>
          </div>
        </div>

        {/* Properties panel */}
        {selectedShape && (
          <div className="w-64 border-l bg-background">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Formegenskaper</h3>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-4 space-y-4">
                <div>
                  <Label>Typ</Label>
                  <Badge variant="secondary" className="mt-1">
                    {selectedShape.type}
                  </Badge>
                </div>

                <Separator />

                {/* Type-specific properties */}
                {selectedShape.type === 'line' && selectedShape.points && (
                  <div className="space-y-2">
                    <Label>Punkter ({selectedShape.points.length / 2})</Label>
                    <div className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-auto">
                      {selectedShape.points
                        .reduce<number[][]>((acc, val, i) => {
                          if (i % 2 === 0) acc.push([val]);
                          else acc[acc.length - 1].push(val);
                          return acc;
                        }, [])
                        .map(([x, y], i) => (
                          <div key={i}>
                            P{i + 1}: ({Math.round(x)}, {Math.round(y)})
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {(selectedShape.type === 'circle' || selectedShape.type === 'ellipse') && (
                  <>
                    <div>
                      <Label>Center X (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.x || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            x: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Center Y (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.y || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            y: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {selectedShape.type === 'circle' && (
                  <div>
                    <Label>Radie (mm)</Label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 border rounded mt-1"
                      value={Math.round(selectedShape.radius || 0)}
                      onChange={(e) =>
                        handleUpdateShape(selectedShapeIndex!, {
                          radius: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                )}

                {selectedShape.type === 'ellipse' && (
                  <>
                    <div>
                      <Label>Radie X (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.radiusX || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            radiusX: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Radie Y (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.radiusY || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            radiusY: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {selectedShape.type === 'rect' && (
                  <>
                    <div>
                      <Label>X (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.x || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            x: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Y (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.y || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            y: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Bredd (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.width || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            width: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Höjd (mm)</Label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 border rounded mt-1"
                        value={Math.round(selectedShape.height || 0)}
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            height: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </>
                )}

                <Separator />

                {/* Styling */}
                <div>
                  <Label>Linjefärg</Label>
                  <input
                    type="color"
                    className="w-full h-10 border rounded mt-1 cursor-pointer"
                    value={selectedShape.stroke || '#000000'}
                    onChange={(e) =>
                      handleUpdateShape(selectedShapeIndex!, {
                        stroke: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Linjetjocklek (px)</Label>
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    className="w-full px-2 py-1 border rounded mt-1"
                    value={selectedShape.strokeWidth || 2}
                    onChange={(e) =>
                      handleUpdateShape(selectedShapeIndex!, {
                        strokeWidth: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                {(selectedShape.type === 'circle' ||
                  selectedShape.type === 'rect' ||
                  selectedShape.type === 'ellipse') && (
                  <div>
                    <Label>Fyllnadsfärg</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        className="flex-1 h-10 border rounded cursor-pointer"
                        value={
                          selectedShape.fill === 'transparent' ? '#ffffff' : selectedShape.fill || '#ffffff'
                        }
                        onChange={(e) =>
                          handleUpdateShape(selectedShapeIndex!, {
                            fill: e.target.value,
                          })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateShape(selectedShapeIndex!, {
                            fill: 'transparent',
                          })
                        }
                      >
                        Tom
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Genomskinlighet</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full mt-1"
                    value={selectedShape.opacity !== undefined ? selectedShape.opacity : 1}
                    onChange={(e) =>
                      handleUpdateShape(selectedShapeIndex!, {
                        opacity: parseFloat(e.target.value),
                      })
                    }
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(
                      (selectedShape.opacity !== undefined ? selectedShape.opacity : 1) * 100
                    )}
                    %
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Help footer */}
      <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span><strong>V:</strong> Markera</span>
          <span><strong>L:</strong> Linje</span>
          <span><strong>C:</strong> Cirkel</span>
          <span><strong>R:</strong> Rektangel</span>
          <span><strong>E:</strong> Ellips</span>
          <span><strong>Delete:</strong> Radera</span>
          <span><strong>Cmd+Z:</strong> Ångra</span>
        </div>
      </div>
    </div>
  );
};
