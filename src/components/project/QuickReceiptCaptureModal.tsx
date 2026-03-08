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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  Camera,
  Upload,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  Receipt,
  FileText,
  Link2,
} from "lucide-react";
import {
  analyzeDocument,
  generateDocumentFilename,
  type DocumentAnalysisResult,
} from "@/services/receiptAnalysisService";
import { DatePicker } from "@/components/ui/date-picker";
import { formatLocalDate } from "@/lib/dateUtils";
import {
  SearchableEntityPicker,
  type SelectedEntity,
} from "@/components/shared/SearchableEntityPicker";

interface QuickReceiptCaptureModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currency?: string | null;
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
const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> => {
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
            resolve(
              new File(
                [blob],
                file.name.replace(/\.(heic|heif)$/i, ".jpg"),
                { type: "image/jpeg", lastModified: Date.now() }
              )
            );
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

type LinkOption = "new" | "link";

export function QuickReceiptCaptureModal({
  projectId,
  open,
  onOpenChange,
  onSuccess,
  currency,
}: QuickReceiptCaptureModalProps) {
  const { t } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<DocumentAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState(false);

  // Form state
  const [vendorName, setVendorName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined);
  const [roomId, setRoomId] = useState<string>("none");

  // Invoice-specific fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [ocrNumber, setOcrNumber] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Linking state
  const [linkOption, setLinkOption] = useState<LinkOption>("new");
  const [linkedEntity, setLinkedEntity] = useState<SelectedEntity | null>(null);

  // Task picker state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Array<{id: string; title: string; budget: number | null; material_estimate: number | null; plannedMaterials: Array<{id: string; name: string; amount: number}>; is_ata: boolean; materialSpent: number}>>([]);

  // Data state
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Derived state
  const documentType = analysisResult?.document_type || "receipt";

  // Fetch rooms when modal opens
  useEffect(() => {
    if (open) {
      fetchRooms();
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
    setInvoiceNumber("");
    setOcrNumber("");
    setDueDate(undefined);
    setLinkOption("new");
    setLinkedEntity(null);
    setSelectedTaskId(null);
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name");
    setRooms(data || []);
  };

  // Fetch tasks + their linked material spend when modal opens
  useEffect(() => {
    if (!open || !projectId) return;
    const fetchTasks = async () => {
      const [tasksRes, materialsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, budget, material_estimate, is_ata")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("materials")
          .select("id, name, task_id, price_total, status, quantity, price_per_unit")
          .eq("project_id", projectId)
          .eq("exclude_from_budget", false)
          .not("task_id", "is", null),
      ]);
      const spendMap = new Map<string, number>();
      const plannedMap = new Map<string, Array<{id: string; name: string; amount: number}>>();
      (materialsRes.data || []).forEach(m => {
        if (m.task_id) {
          const cost = m.price_total ?? ((m.quantity || 0) * (m.price_per_unit || 0));
          if (m.status === "planned") {
            const items = plannedMap.get(m.task_id) || [];
            items.push({ id: m.id, name: m.name, amount: cost });
            plannedMap.set(m.task_id, items);
          } else {
            spendMap.set(m.task_id, (spendMap.get(m.task_id) || 0) + cost);
          }
        }
      });
      setTasks((tasksRes.data || []).map(t => ({
        ...t,
        is_ata: t.is_ata ?? false,
        materialSpent: spendMap.get(t.id) || 0,
        plannedMaterials: plannedMap.get(t.id) || [],
      })));
    };
    fetchTasks();
  }, [open, projectId]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    setInvoiceNumber("");
    setOcrNumber("");
    setDueDate(undefined);
    setLinkOption("new");
    setLinkedEntity(null);
    setSelectedTaskId(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisError(false);

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await analyzeDocument(base64);

      setAnalysisResult(result);

      // Populate form with extracted values
      if (result.vendor_name) setVendorName(result.vendor_name);
      if (result.total_amount) setTotalAmount(result.total_amount.toString());
      if (result.vat_amount) setVatAmount(result.vat_amount.toString());
      if (result.purchase_date) {
        setPurchaseDate(new Date(result.purchase_date));
      }

      // Invoice-specific fields
      if (result.invoice_number) setInvoiceNumber(result.invoice_number);
      if (result.ocr_number) setOcrNumber(result.ocr_number);
      if (result.due_date) {
        setDueDate(new Date(result.due_date));
      }

      // Track successful document analysis
      analytics.capture(AnalyticsEvents.RECEIPT_ANALYZED, {
        document_type: result.document_type,
        has_vendor: Boolean(result.vendor_name),
        has_amount: Boolean(result.total_amount),
        has_vat: Boolean(result.vat_amount),
        has_date: Boolean(result.purchase_date),
        has_invoice_number: Boolean(result.invoice_number),
        confidence: result.confidence,
      });

      toast.success(t("document.analysisComplete"));
    } catch (error) {
      console.error("Document analysis failed:", error);
      setAnalysisError(true);
      toast.error(t("document.analysisError"));
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const amount = parseFloat(totalAmount) || 0;
      const dateStr = purchaseDate
        ? formatLocalDate(purchaseDate)
        : formatLocalDate(new Date());

      // Generate filename
      const filename = generateDocumentFilename(
        documentType,
        vendorName,
        dateStr,
        amount,
        invoiceNumber
      );

      // Determine storage folder based on document type
      const folder = documentType === "invoice" ? "Fakturor" : "Kvitton";
      const storagePath = `projects/${projectId}/${folder}/${filename}`;

      let entityId: string | null = null;
      let entityType: "task" | "material" = "material";

      if (linkOption === "link" && linkedEntity) {
        // Link to existing entity
        entityId = linkedEntity.id;
        entityType = linkedEntity.type;
      } else if (linkOption === "new") {
        if (documentType === "invoice") {
          // Create new task for invoice
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              project_id: projectId,
              title: `${t("document.typeInvoice")} - ${vendorName}`,
              description: `${t("document.invoiceNumber")}: ${invoiceNumber || "-"}\n${t("document.ocrNumber")}: ${ocrNumber || "-"}`,
              status: "to_do",
              priority: "medium",
              budget: amount,
              room_id: roomId !== "none" ? roomId : null,
              invoice_number: invoiceNumber || null,
              ocr_number: ocrNumber || null,
              invoice_due_date: dueDate
                ? formatLocalDate(dueDate)
                : null,
            })
            .select("id")
            .single();

          if (taskError) throw taskError;
          entityId = task.id;
          entityType = "task";
        } else {
          // Create new material for receipt
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
              task_id: selectedTaskId || null,
            })
            .select("id")
            .single();

          if (materialError) throw materialError;
          entityId = material.id;
          entityType = "material";
        }
      }

      // Upload document image
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(storagePath, selectedFile, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(t("receipt.uploadError"));
      } else if (entityId) {
        // Create task_file_links record
        const linkData: Record<string, unknown> = {
          project_id: projectId,
          file_path: storagePath,
          file_name: filename,
          file_type: documentType,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          linked_by_user_id: profile.id,
        };

        if (entityType === "task") {
          linkData.task_id = entityId;
        } else {
          linkData.material_id = entityId;
        }

        if (roomId !== "none") {
          linkData.room_id = roomId;
        }

        await supabase.from("task_file_links").insert(linkData);

        // Also create photo record for visual display
        const {
          data: { publicUrl },
        } = supabase.storage.from("project-files").getPublicUrl(storagePath);

        await supabase.from("photos").insert({
          linked_to_type: entityType,
          linked_to_id: entityId,
          url: publicUrl,
          caption: filename,
          uploaded_by_user_id: profile.id,
        });
      }

      // Track document saved
      analytics.capture(AnalyticsEvents.RECEIPT_CAPTURED, {
        document_type: documentType,
        link_option: linkOption,
        has_room: roomId !== "none",
        amount,
        was_ai_analyzed: Boolean(analysisResult),
      });

      // Show success message
      if (linkOption === "link") {
        toast.success(t("document.documentLinked"), {
          description: t("document.documentLinkedDescription"),
        });
      } else if (documentType === "invoice") {
        toast.success(t("document.invoiceCreated"), {
          description: t("document.invoiceCreatedDescription"),
        });
      } else {
        toast.success(t("document.receiptCreated"), {
          description: t("document.receiptCreatedDescription"),
        });
      }

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
    setLinkOption("new");
    setLinkedEntity(null);
    setSelectedTaskId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t("document.title")}</DialogTitle>
          <DialogDescription>{t("document.description")}</DialogDescription>
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
                  alt="Document preview"
                  className="w-full max-h-40 object-contain rounded-lg border"
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
                      {t("document.analyzing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t("document.analyzeDocument")}
                    </>
                  )}
                </Button>
              )}

              {/* Analysis error warning */}
              {analysisError && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{t("document.analysisError")}</span>
                </div>
              )}

              {/* Document type indicator */}
              {analysisResult && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {documentType === "invoice" ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Receipt className="h-5 w-5 text-emerald-600" />
                  )}
                  <span className="text-sm font-medium">
                    {t("document.detectedType")}:
                  </span>
                  <Badge
                    variant={
                      documentType === "invoice" ? "default" : "secondary"
                    }
                  >
                    {documentType === "invoice"
                      ? t("document.typeInvoice")
                      : t("document.typeReceipt")}
                  </Badge>
                </div>
              )}

              {/* Form fields - show after analysis or if user wants to fill manually */}
              {(analysisResult || analysisError) && (
                <div className="space-y-4">
                  {/* Link option selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      {t("document.chooseAction")}
                    </Label>
                    <RadioGroup
                      value={linkOption}
                      onValueChange={(v) => {
                        setLinkOption(v as LinkOption);
                        if (v === "new") setLinkedEntity(null);
                      }}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="new" />
                        <Label htmlFor="new" className="cursor-pointer">
                          {documentType === "invoice"
                            ? t("document.createNewTask")
                            : t("document.createNewPurchase")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="link" id="link" />
                        <Label
                          htmlFor="link"
                          className="cursor-pointer flex items-center gap-1.5"
                        >
                          <Link2 className="h-4 w-4" />
                          {t("document.linkToExisting")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Entity picker for linking */}
                  {linkOption === "link" && (
                    <SearchableEntityPicker
                      projectId={projectId}
                      documentType={documentType}
                      currency={currency}
                      selectedEntity={linkedEntity}
                      onSelect={setLinkedEntity}
                    />
                  )}

                  {/* Task picker for new receipts */}
                  {linkOption === "new" && documentType !== "invoice" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t("document.linkToTask")}</Label>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {tasks.map(task => (
                          <div key={task.id} className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition-colors",
                                selectedTaskId === task.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/30 hover:bg-accent/50"
                              )}
                            >
                              <span className="truncate font-medium flex items-center gap-1.5">
                                {task.title}
                                {task.is_ata && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-300 shrink-0">ÄTA</Badge>
                                )}
                              </span>
                              {(() => {
                                const denom = (task.material_estimate && task.material_estimate > 0)
                                  ? task.material_estimate : task.budget;
                                if (!denom || denom <= 0) return null;
                                const ratio = task.materialSpent / denom;
                                const color = ratio >= 1 ? "text-destructive" : ratio >= 0.8 ? "text-amber-600" : "text-emerald-600";
                                const bar = ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";
                                return (
                                  <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                                    <span className={cn("text-xs", color)}>
                                      {formatCurrency(task.materialSpent, currency)} / {formatCurrency(denom, currency)}
                                    </span>
                                    <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                                      <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </button>
                            {selectedTaskId === task.id && task.plannedMaterials.length > 0 && (
                              <div className="ml-4 pl-3 border-l-2 border-muted space-y-1 py-1">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {t("costBreakdown.plannedMaterials")}
                                </span>
                                {task.plannedMaterials.map((item) => (
                                  <div key={item.id} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span>{formatCurrency(item.amount, currency)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(null)}
                          className={cn(
                            "flex items-center p-2.5 rounded-lg border text-left text-sm transition-colors border-dashed",
                            selectedTaskId === null
                              ? "border-primary bg-primary/5"
                              : "border-muted-foreground/30 hover:border-primary/30"
                          )}
                        >
                          <span className="text-muted-foreground">{t("document.noTaskLink")}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Common fields */}
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

                  {/* Invoice-specific fields */}
                  {documentType === "invoice" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>{t("document.invoiceNumber")}</Label>
                          <Input
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("document.ocrNumber")}</Label>
                          <Input
                            value={ocrNumber}
                            onChange={(e) => setOcrNumber(e.target.value)}
                            placeholder="1234567890"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("document.dueDate")}</Label>
                        <DatePicker
                          date={dueDate}
                          onDateChange={setDueDate}
                          placeholder={t("receipt.selectDate")}
                        />
                      </div>
                    </>
                  )}

                  {/* Room selection - only for new entities */}
                  {linkOption === "new" && (
                    <div className="space-y-2">
                      <Label>{t("receipt.linkToRoom")}</Label>
                      <Select value={roomId} onValueChange={setRoomId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("receipt.selectRoom")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("receipt.noRoom")}
                          </SelectItem>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
              disabled={
                saving ||
                !vendorName.trim() ||
                (linkOption === "link" && !linkedEntity)
              }
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("receipt.saving")}
                </>
              ) : documentType === "invoice" ? (
                t("document.saveInvoice")
              ) : (
                t("document.saveReceipt")
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Export alias for backwards compatibility
export { QuickReceiptCaptureModal as DocumentCaptureModal };
