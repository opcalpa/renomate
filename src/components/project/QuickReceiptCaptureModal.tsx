import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import heic2any from "heic2any";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Sparkles, X, AlertCircle } from "lucide-react";
import { analyzeReceipt, generateReceiptFilename, type ReceiptAnalysisResult } from "@/services/receiptAnalysisService";
import { DatePicker } from "@/components/ui/date-picker";

interface QuickReceiptCaptureModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Check if file is an image (including HEIC/HEIF)
const isImageFile = (file: File): boolean => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // Check MIME type
  if (type.startsWith("image/")) return true;

  // Check file extension for HEIC/HEIF (MIME type may be empty or wrong)
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;

  return false;
};

// Check if file is HEIC/HEIF format
const isHeicFile = (file: File): boolean => {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
};

// Convert HEIC to JPEG
const convertHeicToJpeg = async (file: File): Promise<File> => {
  try {
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });

    // heic2any can return a single blob or array of blobs
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");

    return new File([resultBlob], newFileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw new Error("Failed to convert HEIC image");
  }
};

// Image compression utility
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg", lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    // Handle image load errors (e.g., HEIC not supported)
    img.onerror = () => {
      // Return original file if we can't compress it
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/xxx;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function QuickReceiptCaptureModal({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: QuickReceiptCaptureModalProps) {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState(false);

  // Form state
  const [vendorName, setVendorName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined);
  const [roomId, setRoomId] = useState<string>("none");
  const [taskId, setTaskId] = useState<string>("none");

  // Data state
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch rooms and tasks when modal opens
  useEffect(() => {
    if (open) {
      fetchRooms();
      fetchTasks();
    }
  }, [open, projectId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError(false);
    setVendorName("");
    setTotalAmount("");
    setVatAmount("");
    setPurchaseDate(undefined);
    setRoomId("none");
    setTaskId("none");
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name");
    setRooms(data || []);
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("project_id", projectId)
      .order("title");
    setTasks(data || []);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear the input value so the same file can be selected again
    event.target.value = "";

    // Validate file type (including HEIC/HEIF)
    if (!isImageFile(file)) {
      toast.error(t("receipt.notAnImage"));
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("receipt.fileTooLarge"));
      return;
    }

    let processedFile = file;

    // Convert HEIC to JPEG if needed
    if (isHeicFile(file)) {
      try {
        toast.info(t("receipt.convertingImage"));
        processedFile = await convertHeicToJpeg(file);
      } catch {
        toast.error(t("receipt.conversionFailed"));
        return;
      }
    }

    // Compress image
    const compressed = await compressImage(processedFile);
    setSelectedFile(compressed);

    // Create preview
    const url = URL.createObjectURL(compressed);
    setPreviewUrl(url);

    // Reset form fields when new image is selected
    setAnalysisResult(null);
    setAnalysisError(false);
    setVendorName("");
    setTotalAmount("");
    setVatAmount("");
    setPurchaseDate(undefined);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisError(false);

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await analyzeReceipt(base64);

      setAnalysisResult(result);

      // Populate form with extracted values
      if (result.vendor_name) setVendorName(result.vendor_name);
      if (result.total_amount) setTotalAmount(result.total_amount.toString());
      if (result.vat_amount) setVatAmount(result.vat_amount.toString());
      if (result.purchase_date) {
        setPurchaseDate(new Date(result.purchase_date));
      }

      // Track successful receipt analysis
      analytics.capture(AnalyticsEvents.RECEIPT_ANALYZED, {
        has_vendor: Boolean(result.vendor_name),
        has_amount: Boolean(result.total_amount),
        has_vat: Boolean(result.vat_amount),
        has_date: Boolean(result.purchase_date),
        confidence: result.confidence,
      });

      toast.success(t("receipt.analysisComplete"));
    } catch (error) {
      console.error("Receipt analysis failed:", error);
      setAnalysisError(true);
      toast.error(t("receipt.analysisError"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !vendorName.trim()) {
      toast.error(t("receipt.vendorRequired"));
      return;
    }

    setSaving(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // 1. Create material/purchase order
      const amount = parseFloat(totalAmount) || 0;
      const vat = parseFloat(vatAmount) || null;

      const { data: material, error: materialError } = await supabase
        .from("materials")
        .insert({
          project_id: projectId,
          name: `${t("receipt.receiptPurchase")} - ${vendorName}`,
          vendor_name: vendorName,
          price_per_unit: amount,
          quantity: 1,
          unit: "st",
          status: "submitted",
          created_by_user_id: profile.id,
          room_id: roomId !== "none" ? roomId : null,
          task_id: taskId !== "none" ? taskId : null,
        })
        .select("id")
        .single();

      if (materialError) throw materialError;

      // 2. Upload receipt image to Kvitton folder
      const dateStr = purchaseDate
        ? purchaseDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const filename = generateReceiptFilename(vendorName, dateStr, amount);
      const storagePath = `projects/${projectId}/Kvitton/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, selectedFile, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Don't fail the whole operation if upload fails
        toast.error(t("receipt.uploadError"));
      } else {
        // 3. Get public URL and create photo record
        const { data: { publicUrl } } = supabase.storage
          .from("project-files")
          .getPublicUrl(storagePath);

        await supabase.from("photos").insert({
          linked_to_type: "material",
          linked_to_id: material.id,
          url: publicUrl,
          caption: filename,
          uploaded_by_user_id: profile.id,
        });
      }

      // Track receipt saved
      analytics.capture(AnalyticsEvents.RECEIPT_CAPTURED, {
        has_room: Boolean(selectedRoomId),
        has_task: Boolean(selectedTaskId),
        amount: parseFloat(totalAmount) || 0,
        was_ai_analyzed: Boolean(analysisResult),
      });

      toast.success(t("receipt.success"), {
        description: t("receipt.successDescription"),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("receipt.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setAnalysisError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("receipt.title")}</DialogTitle>
          <DialogDescription>{t("receipt.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Image capture section */}
          {!previewUrl ? (
            <div className="space-y-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2 h-16"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                  {t("receipt.takePhoto")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2 h-16"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5" />
                  {t("receipt.chooseFile")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Image preview */}
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Analyze button */}
              {!analysisResult && !analysisError && (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("receipt.analyzing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t("receipt.analyzeReceipt")}
                    </>
                  )}
                </Button>
              )}

              {/* Analysis error warning */}
              {analysisError && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{t("receipt.analysisError")}</span>
                </div>
              )}

              {/* Form fields - show after analysis or if user wants to fill manually */}
              {(analysisResult || analysisError) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("receipt.vendor")} *</Label>
                    <Input
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder={t("receipt.vendorPlaceholder")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("receipt.totalAmount")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("receipt.vatAmount")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={vatAmount}
                        onChange={(e) => setVatAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("receipt.purchaseDate")}</Label>
                    <DatePicker
                      date={purchaseDate}
                      onDateChange={setPurchaseDate}
                      placeholder={t("receipt.selectDate")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("receipt.linkToRoom")}</Label>
                    <Select value={roomId} onValueChange={setRoomId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("receipt.selectRoom")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("receipt.noRoom")}</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("receipt.linkToTask")}</Label>
                    <Select value={taskId} onValueChange={setTaskId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("receipt.selectTask")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("receipt.noTask")}</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Save button - only show when form is visible */}
        {(analysisResult || analysisError) && previewUrl && (
          <div className="flex-shrink-0 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !vendorName.trim()}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("receipt.saving")}
                </>
              ) : (
                t("receipt.save")
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
