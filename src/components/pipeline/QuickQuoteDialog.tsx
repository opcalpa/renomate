import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Zap, Sparkles, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AIQuoteItem {
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number | null;
  isLabor: boolean;
}

export function QuickQuoteDialog({ open, onOpenChange }: QuickQuoteDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!customerName.trim()) {
      toast.error(t("pipeline.quickQuote.customerNameRequired"));
      return;
    }

    setCreating(true);

    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // If AI is enabled and we have a description, generate quote items
      let aiItems: AIQuoteItem[] = [];
      if (useAI && description.trim().length >= 20) {
        toast.loading(t("pipeline.quickQuote.generatingItems"), { id: "ai-gen" });

        try {
          const { data, error } = await supabase.functions.invoke("generate-quote-items", {
            body: { description: description.trim() },
          });

          if (error) {
            console.error("AI generation error:", error);
            toast.dismiss("ai-gen");
            // Continue without AI items if it fails
          } else if (data?.items?.length > 0) {
            aiItems = data.items;
            toast.dismiss("ai-gen");
            toast.success(t("pipeline.quickQuote.itemsGenerated", { count: aiItems.length }));
          } else {
            toast.dismiss("ai-gen");
          }
        } catch (aiError) {
          console.error("AI generation failed:", aiError);
          toast.dismiss("ai-gen");
          // Continue without AI items
        }
      }

      // Create a "lead" project with minimal info
      const projectName = address.trim()
        ? `${customerName.trim()} - ${address.trim()}`
        : `${customerName.trim()} - ${t("pipeline.quickQuote.newLead")}`;

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: description.trim() || null,
          owner_id: profile.id,
          address: address.trim() || null,
          project_type: "lead",
          status: "lead",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create a client record for this customer
      const { data: client } = await supabase
        .from("clients")
        .insert({
          owner_id: profile.id,
          name: customerName.trim(),
          address: address.trim() || null,
        })
        .select("id")
        .single();

      // Link client to project if created successfully
      if (client) {
        await supabase
          .from("projects")
          .update({ client_id: client.id })
          .eq("id", project.id);
      }

      toast.success(t("pipeline.quickQuote.created"));

      // Store AI items in sessionStorage if we have any
      if (aiItems.length > 0) {
        sessionStorage.setItem("quickQuoteItems", JSON.stringify(aiItems));
      }

      // Close dialog and navigate to quote creation
      onOpenChange(false);
      resetForm();

      // Navigate to CreateQuote with the new project
      const params = new URLSearchParams({ projectId: project.id });
      if (client) {
        params.set("clientId", client.id);
      }
      if (aiItems.length > 0) {
        params.set("fromQuickQuote", "true");
      }
      navigate(`/quotes/new?${params.toString()}`);

    } catch (error) {
      console.error("Failed to create quick quote:", error);
      toast.error(t("common.error"));
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setAddress("");
    setDescription("");
    setUseAI(true);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("pipeline.quickQuote.fileTooLarge"));
      return;
    }

    setUploadedFile(file);
    setExtracting(true);

    try {
      // For text files, read directly
      if (file.type === "text/plain") {
        const text = await file.text();
        setDescription((prev) => prev ? `${prev}\n\n${text}` : text);
        toast.success(t("pipeline.quickQuote.textExtracted"));
      }
      // For PDFs and images, use edge function to extract text
      else if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        toast.loading(t("pipeline.quickQuote.extractingText"), { id: "extract" });

        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // Remove data:... prefix
          };
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke("extract-document-text", {
          body: {
            fileBase64: base64,
            mimeType: file.type,
            fileName: file.name,
          },
        });

        toast.dismiss("extract");

        if (error) {
          console.error("Text extraction error:", error);
          toast.error(t("pipeline.quickQuote.extractionFailed"));
        } else if (data?.text) {
          setDescription((prev) => prev ? `${prev}\n\n${data.text}` : data.text);
          toast.success(t("pipeline.quickQuote.textExtracted"));
        } else {
          toast.error(t("pipeline.quickQuote.noTextFound"));
        }
      } else {
        toast.error(t("pipeline.quickQuote.unsupportedFileType"));
        setUploadedFile(null);
      }
    } catch (err) {
      console.error("File processing error:", err);
      toast.error(t("pipeline.quickQuote.extractionFailed"));
    } finally {
      setExtracting(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const hasEnoughTextForAI = description.trim().length >= 20;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {t("pipeline.quickQuote.title")}
          </DialogTitle>
          <DialogDescription>
            {t("pipeline.quickQuote.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">
              {t("pipeline.quickQuote.customerName")} *
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("pipeline.quickQuote.customerNamePlaceholder")}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              {t("pipeline.quickQuote.address")} ({t("common.optional")})
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("pipeline.quickQuote.addressPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("pipeline.quickQuote.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("pipeline.quickQuote.notesPlaceholder")}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {t("pipeline.quickQuote.notesHint")}
            </p>

            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{uploadedFile.name}</span>
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("pipeline.quickQuote.uploadDocument")}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {t("pipeline.quickQuote.uploadHint")}
            </p>
          </div>

          {/* AI Generation Toggle */}
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="useAI"
              checked={useAI}
              onCheckedChange={(checked) => setUseAI(checked === true)}
              disabled={!hasEnoughTextForAI}
            />
            <div className="space-y-1">
              <Label
                htmlFor="useAI"
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t("pipeline.quickQuote.useAI")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {hasEnoughTextForAI
                  ? t("pipeline.quickQuote.useAIHint")
                  : t("pipeline.quickQuote.useAIMinChars")}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={creating || !customerName.trim()}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                {useAI && hasEnoughTextForAI ? (
                  <Sparkles className="h-4 w-4 mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {t("pipeline.quickQuote.createQuote")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
