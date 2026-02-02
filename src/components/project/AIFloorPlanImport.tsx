import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Ruler, 
  Sparkles, 
  Check, 
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { convertImageToBlueprint } from "@/services/aiVisionService";
import { useFloorMapStore } from "@/components/floormap/store";
import { useNavigate } from "react-router-dom";
import { createPlanInDB, saveShapesForPlan } from "@/components/floormap/utils/plans";
import { supabase } from "@/lib/supabaseClient";

interface AIFloorPlanImportProps {
  projectId: string;
  onImportComplete: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialImageUrl?: string;
  initialFileName?: string;
}

interface CalibrationLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export const AIFloorPlanImport = ({
  projectId,
  onImportComplete,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  initialImageUrl,
  initialFileName
}: AIFloorPlanImportProps) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalOnOpenChange || setInternalOpen;
  const [step, setStep] = useState<'upload' | 'calibrate' | 'processing' | 'complete'>(initialImageUrl ? 'calibrate' : 'upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [calibrationLine, setCalibrationLine] = useState<CalibrationLine | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [realWorldLength, setRealWorldLength] = useState<string>('1000'); // Default 1000mm (1m)
  const [pixelToMmRatio, setPixelToMmRatio] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [convertedShapeCount, setConvertedShapeCount] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Zustand store
  const { currentPlanId, addPlan, setCurrentPlanId, plans, setViewState } = useFloorMapStore();

  // Initialize with external image URL if provided
  useEffect(() => {
    if (initialImageUrl && isOpen) {
      setImageUrl(initialImageUrl);
      setStep('calibrate');
    }
  }, [initialImageUrl, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(initialImageUrl ? 'calibrate' : 'upload');
      if (!initialImageUrl) {
        setImageUrl('');
        setSelectedFile(null);
      }
      setCalibrationLine(null);
      setPixelToMmRatio(null);
      setImageZoom(1);
      setImageOffset({ x: 0, y: 0 });
    }
  }, [isOpen, initialImageUrl]);

  // Load image onto canvas
  useEffect(() => {
    if (imageUrl && canvasRef.current && step === 'calibrate') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        imageRef.current = img;
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Calculate initial zoom to fit canvas
        const maxWidth = 1200;
        const maxHeight = 800;
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const initialZoom = Math.min(scaleX, scaleY, 1);
        setImageZoom(initialZoom);
        
        drawCanvas();
      };
      
      img.src = imageUrl;
    }
  }, [imageUrl, step]);

  // Redraw canvas when calibration line, zoom, or offset changes
  useEffect(() => {
    if (step === 'calibrate') {
      drawCanvas();
    }
  }, [calibrationLine, imageZoom, imageOffset, step]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // Draw calibration line if exists
    if (calibrationLine) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3 / imageZoom;
      ctx.lineCap = 'round';
      
      // Draw line
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();
      
      // Draw endpoints
      const drawCircle = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 8 / imageZoom, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / imageZoom;
        ctx.stroke();
      };
      
      drawCircle(calibrationLine.start.x, calibrationLine.start.y);
      drawCircle(calibrationLine.end.x, calibrationLine.end.y);
      
      // Draw length label
      const midX = (calibrationLine.start.x + calibrationLine.end.x) / 2;
      const midY = (calibrationLine.start.y + calibrationLine.end.y) / 2;
      const pixelLength = Math.sqrt(
        Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
        Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
      );
      
      ctx.font = `${14 / imageZoom}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 / imageZoom;
      const text = `${Math.round(pixelLength)}px`;
      ctx.strokeText(text, midX, midY - 10 / imageZoom);
      ctx.fillText(text, midX, midY - 10 / imageZoom);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('aiFloorPlan.wrongFileType'),
        description: t('aiFloorPlan.selectImageFile'),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStep('calibrate');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageZoom;
    const y = (e.clientY - rect.top) / imageZoom;

    setCalibrationLine({
      start: { x, y },
      end: { x, y }
    });
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !calibrationLine) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageZoom;
    const y = (e.clientY - rect.top) / imageZoom;

    setCalibrationLine({
      ...calibrationLine,
      end: { x, y }
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const calculateRatio = () => {
    if (!calibrationLine || !realWorldLength) {
      toast({
        title: t('aiFloorPlan.missingInfo'),
        description: t('aiFloorPlan.drawLineAndEnterLength'),
        variant: "destructive",
      });
      return;
    }

    const pixelLength = Math.sqrt(
      Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
      Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
    );

    const realLength = parseFloat(realWorldLength);
    if (isNaN(realLength) || realLength <= 0) {
      toast({
        title: t('aiFloorPlan.invalidValue'),
        description: t('aiFloorPlan.enterValidLength'),
        variant: "destructive",
      });
      return;
    }

    const ratio = realLength / pixelLength; // mm per pixel
    setPixelToMmRatio(ratio);
    
    toast({
      title: t('aiFloorPlan.calibrationDone'),
      description: `Ratio: ${ratio.toFixed(3)} mm/pixel`,
    });
  };

  const handleProcessWithAI = async () => {
    if (!pixelToMmRatio || (!selectedFile && !imageUrl)) {
      toast({
        title: t('aiFloorPlan.calibrationRequired'),
        description: t('aiFloorPlan.completeCalibrationFirst'),
        variant: "destructive",
      });
      return;
    }

    setStep('processing');

    try {
      // If we have imageUrl but no selectedFile, fetch and create a File
      let fileToProcess = selectedFile;
      if (!fileToProcess && imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const fileName = initialFileName || 'floor-plan.png';
        fileToProcess = new File([blob], fileName, { type: blob.type });
      }

      if (!fileToProcess) {
        throw new Error('Ingen bild att processa');
      }

      // Create a new plan for AI-imported floor plan
      const timestamp = new Date().toISOString().split('T')[0];
      const existingAIPlans = plans.filter(p => p.name.startsWith('AI Import'));
      const planNumber = existingAIPlans.length + 1;
      const planName = `AI Import ${planNumber} (${timestamp})`;

      // Create plan in database
      const newPlan = await createPlanInDB(projectId, planName);

      if (!newPlan) {
        throw new Error('Kunde inte skapa nytt plan i databasen');
      }

      // Add plan to store (but don't switch to it yet)
      addPlan(newPlan);

      // Call AI service
      const shapes = await convertImageToBlueprint(
        fileToProcess,
        pixelToMmRatio,
        newPlan.id,
        imageDimensions?.width,
        imageDimensions?.height
      );

      // Save shapes to database FIRST (before switching plan)
      // This ensures that when setCurrentPlanId triggers the useEffect
      // in UnifiedKonvaCanvas that loads shapes from DB, the shapes are already there.
      const saveSuccess = await saveShapesForPlan(newPlan.id, shapes);

      if (!saveSuccess) {
        toast({
          title: "Varning",
          description: "Shapes kanske inte sparades korrekt. Försök 'Spara' manuellt.",
          variant: "destructive",
        });
      }

      // Create rooms in the DB for all room shapes so they have roomId
      const roomShapes = shapes.filter(s => s.type === 'room' && s.name);
      for (const roomShape of roomShapes) {
        const points = (roomShape.coordinates as { points: { x: number; y: number }[] })?.points || [];
        // Calculate area using shoelace formula
        let area = 0;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;
        // Convert mm² to m² (coordinates are in mm)
        const areaSqM = area / 1_000_000;

        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .insert({
            project_id: projectId,
            name: roomShape.name,
            dimensions: { area_sqm: parseFloat(areaSqM.toFixed(2)) },
            floor_plan_position: { points },
          })
          .select('id')
          .single();

        if (!roomError && roomData) {
          // Update the shape with the DB room ID so it's linked
          roomShape.roomId = roomData.id;
        }
      }

      // Re-save shapes with updated roomIds
      if (roomShapes.length > 0) {
        await saveShapesForPlan(newPlan.id, shapes);
      }

      // NOW switch to the new plan - this triggers loadShapesForPlan in UnifiedKonvaCanvas
      setCurrentPlanId(newPlan.id);

      // Calculate bounds of all shapes to center canvas
      const allCoords: { x: number; y: number }[] = [];
      shapes.forEach(shape => {
        if (shape.type === 'wall' && shape.coordinates) {
          const coords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };
          allCoords.push({ x: coords.x1, y: coords.y1 });
          allCoords.push({ x: coords.x2, y: coords.y2 });
        } else if (shape.coordinates && 'points' in shape.coordinates) {
          const points = shape.coordinates.points as { x: number; y: number }[];
          allCoords.push(...points);
        } else if (shape.coordinates && 'x' in shape.coordinates && 'y' in shape.coordinates) {
          allCoords.push({ x: shape.coordinates.x as number, y: shape.coordinates.y as number });
        }
      });

      if (allCoords.length > 0) {
        // Find center point
        const minX = Math.min(...allCoords.map(p => p.x));
        const maxX = Math.max(...allCoords.map(p => p.x));
        const minY = Math.min(...allCoords.map(p => p.y));
        const maxY = Math.max(...allCoords.map(p => p.y));
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Calculate zoom to fit all shapes (with some padding)
        const width = maxX - minX;
        const height = maxY - minY;
        const maxDimension = Math.max(width, height);
        
        // Assume canvas is roughly 800x600, zoom to fit with 20% padding
        const targetZoom = Math.min(1.5, (600 / maxDimension) * 0.8);

        // Set view to center on the shapes
        // Store this for when canvas loads
        (window as any).__aiImportCenterView = {
          zoom: targetZoom,
          panX: -centerX * targetZoom + 400, // Center horizontally (400 = half of ~800px canvas)
          panY: -centerY * targetZoom + 300, // Center vertically (300 = half of ~600px canvas)
        };
      }

      setConvertedShapeCount(shapes.length);
      setStep('complete');

      toast({
        title: t('aiFloorPlan.aiConversionDone'),
        description: `${shapes.length} objekt skapade i nytt plan: "${newPlan.name}"`,
      });

    } catch (error: any) {
      console.error('AI conversion error:', error);
      toast({
        title: t('aiFloorPlan.conversionError'),
        description: error.message || t('aiFloorPlan.couldNotConvert'),
        variant: "destructive",
      });
      setStep('calibrate');
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setSelectedFile(null);
    setImageUrl('');
    setCalibrationLine(null);
    setRealWorldLength('1000');
    setPixelToMmRatio(null);
    setImageZoom(1);
    setImageOffset({ x: 0, y: 0 });
    setConvertedShapeCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetDialog();
  };

  const handleViewCanvas = () => {
    // Trigger navigation callback
    onImportComplete();
    // Close dialog after navigation is triggered
    setTimeout(() => {
      setIsOpen(false);
      resetDialog();
    }, 600);
  };

  // Only show trigger button if not externally controlled
  const showTriggerButton = externalOpen === undefined;

  return (
    <>
      {showTriggerButton && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Import
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('aiFloorPlan.title')}
            </DialogTitle>
            <DialogDescription>
              {t('aiFloorPlan.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 pb-4 border-b">
              <Badge variant={step === 'upload' ? 'default' : 'secondary'}>
                <Upload className="h-3 w-3 mr-1" />
                {t('aiFloorPlan.stepUpload')}
              </Badge>
              <div className="h-px w-8 bg-border" />
              <Badge variant={step === 'calibrate' ? 'default' : 'secondary'}>
                <Ruler className="h-3 w-3 mr-1" />
                {t('aiFloorPlan.stepCalibrate')}
              </Badge>
              <div className="h-px w-8 bg-border" />
              <Badge variant={step === 'processing' ? 'default' : 'secondary'}>
                <Sparkles className="h-3 w-3 mr-1" />
                {t('aiFloorPlan.stepProcess')}
              </Badge>
              <div className="h-px w-8 bg-border" />
              <Badge variant={step === 'complete' ? 'default' : 'secondary'}>
                <Check className="h-3 w-3 mr-1" />
                {t('aiFloorPlan.stepDone')}
              </Badge>
            </div>

            {/* Step 1: Upload */}
            {step === 'upload' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('aiFloorPlan.uploadTitle')}</CardTitle>
                  <CardDescription>
                    {t('aiFloorPlan.uploadDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('aiFloorPlan.supportedFormats')}
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="ai-floor-plan-upload"
                    />
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('aiFloorPlan.chooseImage')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Calibrate */}
            {step === 'calibrate' && (
              <div className="space-y-4">
                {/* Instructions Card */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {t('aiFloorPlan.howItWorks')}
                        </p>
                        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                          <li>{t('aiFloorPlan.step1')}</li>
                          <li>{t('aiFloorPlan.step2')}</li>
                          <li>{t('aiFloorPlan.step3')}</li>
                          <li>{t('aiFloorPlan.step4')}</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zoom Controls - Always Visible */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t('aiFloorPlan.zoomNavigation')}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageZoom(Math.max(0.25, imageZoom - 0.25))}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <div className="px-3 py-1 bg-muted rounded-md min-w-[70px] text-center">
                          <span className="text-sm font-medium">
                            {Math.round(imageZoom * 100)}%
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setImageZoom(Math.min(4, imageZoom + 0.25))}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCalibrationLine(null);
                            setPixelToMmRatio(null);
                          }}
                          title={t('aiFloorPlan.clearLine')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Canvas - Fixed Height with Scroll */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('aiFloorPlan.drawReferenceLine')}</CardTitle>
                    <CardDescription>
                      {t('aiFloorPlan.drawReferenceDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative border-2 border-dashed rounded-lg overflow-auto bg-muted/30" style={{ height: '400px' }}>
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        className="cursor-crosshair"
                        style={{
                          transform: `scale(${imageZoom})`,
                          transformOrigin: 'top left',
                        }}
                      />
                    </div>
                    {calibrationLine && (
                      <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t('aiFloorPlan.lineDrawn')}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Input Fields - Always Accessible */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('aiFloorPlan.enterRealLength')}</CardTitle>
                    <CardDescription>
                      {t('aiFloorPlan.howLongIsLine')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="real-length" className="text-base">
                          {t('aiFloorPlan.lengthInMm')}
                        </Label>
                        <Input
                          id="real-length"
                          type="number"
                          value={realWorldLength}
                          onChange={(e) => setRealWorldLength(e.target.value)}
                          placeholder="t.ex. 1000"
                          className="text-lg h-12"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRealWorldLength('900')}
                          >
                            {t('aiFloorPlan.doorPreset')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRealWorldLength('1000')}
                          >
                            {t('aiFloorPlan.meterPreset')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRealWorldLength('2400')}
                          >
                            {t('aiFloorPlan.wallPreset')}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-base">{t('aiFloorPlan.calculatedScale')}</Label>
                        <div className="h-12 flex items-center justify-center px-3 bg-muted rounded-md border-2">
                          {pixelToMmRatio ? (
                            <span className="font-mono text-lg font-semibold text-green-600 dark:text-green-400">
                              {pixelToMmRatio.toFixed(3)} mm/px
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {t('aiFloorPlan.waitingForCalculation')}
                            </span>
                          )}
                        </div>
                        {pixelToMmRatio && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {t('aiFloorPlan.scaleCalculated')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={calculateRatio} 
                        disabled={!calibrationLine || !realWorldLength}
                        size="lg"
                        className="flex-1"
                      >
                        <Ruler className="h-4 w-4 mr-2" />
                        {t('aiFloorPlan.calculateScale')}
                      </Button>

                      <Button
                        onClick={handleProcessWithAI}
                        disabled={!pixelToMmRatio}
                        size="lg"
                        className="flex-1"
                      >
                        {t('aiFloorPlan.nextProcessAI')}
                        <Sparkles className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Processing */}
            {step === 'processing' && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h3 className="text-lg font-semibold">{t('aiFloorPlan.processing')}</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {t('aiFloorPlan.processingDescription')}
                      <br />
                      {t('aiFloorPlan.processingTime')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-semibold">{t('aiFloorPlan.importComplete')}</h3>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        {t('aiFloorPlan.objectsCreated', { count: convertedShapeCount })}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{t('aiFloorPlan.wallsLabel')}</span>
                        <span>{t('aiFloorPlan.doorsLabel')}</span>
                        <span>{t('aiFloorPlan.roomsLabel')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-md mt-4">
                      {t('aiFloorPlan.conversionDone')}
                      <br />
                      {t('aiFloorPlan.goToFloorPlan')}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={handleClose}>
                        {t('aiFloorPlan.close')}
                      </Button>
                      <Button onClick={handleViewCanvas} size="lg">
                        {t('aiFloorPlan.viewInFloorPlan')}
                        <Sparkles className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
