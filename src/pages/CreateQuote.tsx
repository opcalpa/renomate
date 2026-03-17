import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Maximize2, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AppHeader } from "@/components/AppHeader";
import { QuoteItemRow, type QuoteItem } from "@/components/quotes/QuoteItemRow";
import { QuoteSummary } from "@/components/quotes/QuoteSummary";
import { QuotePreview } from "@/components/quotes/QuotePreview";
import { QuoteDocument } from "@/components/quotes/QuoteDocument";
import { ImportRoomDialog } from "@/components/quotes/ImportRoomDialog";
import { CreateClientDialog, type Client } from "@/components/quotes/CreateClientDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuote, addQuoteItem, updateQuoteDraft, replaceQuoteItems, generateQuoteNumber, recalculateQuoteTotals, calculateRotDeduction } from "@/services/quoteService";

interface SimpleProject {
  id: string;
  name: string;
}

function newItem(): QuoteItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "st",
    unitPrice: 0,
    isRotEligible: false,
    comment: "",
    discountPercent: 0,
  };
}

export default function CreateQuote() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuthSession();

  // Read URL params
  const urlProjectId = searchParams.get("projectId");
  const editQuoteId = searchParams.get("editQuoteId");
  const urlClientId = searchParams.get("clientId");
  const shouldPrepopulate = searchParams.get("prepopulate") === "true";
  const fromQuickQuote = searchParams.get("fromQuickQuote") === "true";
  const fromIntake = searchParams.get("fromIntake") === "true";
  const isAta = searchParams.get("is_ata") === "true";
  const taskIds = searchParams.get("taskIds")?.split(",").filter(Boolean) || [];
  const materialIds = searchParams.get("materialIds")?.split(",").filter(Boolean) || [];
  const groupByType = searchParams.get("groupByType") || "grouped";
  const pricingFormat = searchParams.get("pricingFormat") || "fixed";
  const applyRot = searchParams.get("applyRot") !== "false"; // default true

  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([newItem()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importRoomItemId, setImportRoomItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | undefined>();
  const [companyInfo, setCompanyInfo] = useState<{
    address?: string;
    postalCode?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    orgNumber?: string;
    bankgiro?: string;
  }>({});
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [previewScale, setPreviewScale] = useState(0.75);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const fitToWidth = useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    // A4 width = 210mm. The QuoteDocument renders at max-w-[210mm] ≈ 794px.
    const containerWidth = container.clientWidth - 32; // subtract padding (p-4 = 16px * 2)
    const a4Width = 794;
    const scale = Math.min(containerWidth / a4Width, 1);
    setPreviewScale(Math.round(scale * 100) / 100);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("id, name")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
      });
    supabase
      .from("profiles")
      .select("id, name, company_name, avatar_url, company_logo_url, company_address, company_postal_code, company_city, phone, email, company_website, bankgiro")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name ?? undefined);
          setCompanyLogoUrl((data as Record<string, unknown>).company_logo_url as string | undefined);
          setUserName(data.name ?? undefined);
          setAvatarUrl(data.avatar_url ?? undefined);
          setProfileId(data.id);
          // Generate next quote number (editable by user)
          if (!editQuoteId) {
            generateQuoteNumber(data.id).then((num) => setQuoteNumber(num));
          }
          setCompanyInfo({
            address: data.company_address ?? undefined,
            postalCode: data.company_postal_code ?? undefined,
            city: data.company_city ?? undefined,
            phone: data.phone ?? undefined,
            email: data.email ?? undefined,
            website: data.company_website ?? undefined,
            bankgiro: data.bankgiro ?? undefined,
          });
          supabase
            .from("clients")
            .select("*")
            .eq("owner_id", data.id)
            .order("name")
            .then(({ data: clientData }) => {
              if (clientData) setClients(clientData as Client[]);
            });
        }
      });
    setUserEmail(user.email);
  }, [user]);

  // Handle URL params for projectId and prepopulation
  useEffect(() => {
    if (urlProjectId && !projectId) {
      setProjectId(urlProjectId);
    }
  }, [urlProjectId, projectId]);

  // Handle URL param for clientId
  useEffect(() => {
    if (urlClientId && !clientId) {
      setClientId(urlClientId);
    }
  }, [urlClientId, clientId]);

  // Load existing quote for editing
  useEffect(() => {
    if (!editQuoteId) return;

    const loadQuote = async () => {
      const [quoteRes, itemsRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("title, free_text, client_id_ref, project_id, quote_number")
          .eq("id", editQuoteId)
          .single(),
        supabase
          .from("quote_items")
          .select("*")
          .eq("quote_id", editQuoteId)
          .order("sort_order", { ascending: true }),
      ]);

      if (quoteRes.data) {
        setFreeText(quoteRes.data.free_text || "");
        if (quoteRes.data.client_id_ref) setClientId(quoteRes.data.client_id_ref);
        if (quoteRes.data.project_id) setProjectId(quoteRes.data.project_id);
        const qn = (quoteRes.data as Record<string, unknown>).quote_number as string | null;
        if (qn) setQuoteNumber(qn);
      }

      if (itemsRes.data && itemsRes.data.length > 0) {
        setItems(
          itemsRes.data.map((item) => ({
            id: item.id,
            description: item.description || "",
            quantity: item.quantity ?? 1,
            unit: item.unit || "st",
            unitPrice: item.unit_price ?? 0,
            isRotEligible: item.is_rot_eligible ?? false,
            roomId: item.room_id ?? undefined,
            comment: item.comment || "",
            discountPercent: item.discount_percent ?? 0,
            sourceTaskId: (item as Record<string, unknown>).source_task_id as string | undefined,
            source: (item as Record<string, unknown>).source_type as QuoteItem["source"],
          }))
        );
      }
    };

    loadQuote();
  }, [editQuoteId]);

  // Handle AI-generated items from QuickQuote
  useEffect(() => {
    if (!fromQuickQuote) return;

    const storedItems = sessionStorage.getItem("quickQuoteItems");
    if (storedItems) {
      try {
        const aiItems = JSON.parse(storedItems);
        if (Array.isArray(aiItems) && aiItems.length > 0) {
          const quoteItems: QuoteItem[] = aiItems.map((item: {
            description: string;
            quantity: number;
            unit: string;
            estimatedPrice: number | null;
            isLabor: boolean;
          }) => ({
            id: crypto.randomUUID(),
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "st",
            unitPrice: item.estimatedPrice || 0,
            isRotEligible: item.isLabor === true, // ROT only for labor
          }));
          setItems(quoteItems);
        }
      } catch (e) {
        console.error("Failed to parse quickQuoteItems:", e);
      }
      // Clear the stored items after reading
      sessionStorage.removeItem("quickQuoteItems");
    }
  }, [fromQuickQuote]);

  // Handle items from intake conversion
  useEffect(() => {
    if (!fromIntake) return;

    const storedItems = sessionStorage.getItem("intakeQuoteItems");
    if (storedItems) {
      try {
        const intakeItems = JSON.parse(storedItems);
        if (Array.isArray(intakeItems) && intakeItems.length > 0) {
          const quoteItems: QuoteItem[] = intakeItems.map((item: {
            description: string;
            quantity: number;
            unit: string;
            estimatedPrice: number | null;
            isLabor: boolean;
          }) => ({
            id: crypto.randomUUID(),
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "st",
            unitPrice: item.estimatedPrice || 0,
            isRotEligible: item.isLabor === true, // Labor items are ROT-eligible
          }));
          setItems(quoteItems);
          toast.success(t("quotes.itemsImported", { count: quoteItems.length }));
        }
      } catch (e) {
        console.error("Failed to parse intakeQuoteItems:", e);
      }
      // Clear the stored items after reading
      sessionStorage.removeItem("intakeQuoteItems");
    }
  }, [fromIntake, t]);

  // Pre-populate items from project tasks and materials
  useEffect(() => {
    if (!shouldPrepopulate || !urlProjectId) return;
    if (taskIds.length === 0 && materialIds.length === 0) return;

    const fetchProjectData = async () => {
      const taskItems: (QuoteItem & { roomName: string | null })[] = [];
      const materialItems: (QuoteItem & { roomName: string | null })[] = [];

      // Fetch and convert selected tasks to labor items
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, description, budget, room_id, rooms(name), task_cost_type, estimated_hours, hourly_rate, subcontractor_cost, markup_percent, material_estimate")
          .in("id", taskIds)
          .order("created_at");

        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            const roomName = (task.rooms as { name: string } | null)?.name || null;

            if (pricingFormat === "detailed") {
              const hasOwnLabor = !!(task.estimated_hours && task.hourly_rate);
              const hasSub = !!(task.subcontractor_cost && task.subcontractor_cost > 0);
              const hasMaterial = !!(task.material_estimate && task.material_estimate > 0);
              const hasAnyDetail = hasOwnLabor || hasSub || hasMaterial;

              // Own labor row — carries task description as comment
              if (hasOwnLabor) {
                taskItems.push({
                  id: crypto.randomUUID(),
                  description: task.title,
                  quantity: task.estimated_hours,
                  unit: "h",
                  unitPrice: task.hourly_rate,
                  isRotEligible: applyRot,
                  roomId: task.room_id || undefined,
                  roomName,
                  source: "hours",
                  sourceTaskId: task.id,
                  comment: task.description || "",
                });
              }

              // Subcontractor row (incl. markup, without revealing breakdown)
              if (hasSub) {
                const markup = task.markup_percent || 0;
                const adjustedPrice = task.subcontractor_cost * (1 + markup / 100);
                taskItems.push({
                  id: crypto.randomUUID(),
                  description: hasOwnLabor ? `${task.title} — UE` : task.title,
                  quantity: 1,
                  unit: "st",
                  unitPrice: Math.round(adjustedPrice * 100) / 100,
                  isRotEligible: applyRot,
                  roomId: task.room_id || undefined,
                  roomName,
                  source: "subcontractor",
                  sourceTaskId: task.id,
                });
              }

              // Material row
              if (hasMaterial) {
                taskItems.push({
                  id: crypto.randomUUID(),
                  description: `${task.title} — material`,
                  quantity: 1,
                  unit: "st",
                  unitPrice: task.material_estimate,
                  isRotEligible: false,
                  roomId: task.room_id || undefined,
                  roomName,
                  source: "material",
                  sourceTaskId: task.id,
                });
              }

              // Fallback: budget only or no data
              if (!hasAnyDetail) {
                if (task.budget && task.budget > 0) {
                  taskItems.push({
                    id: crypto.randomUUID(),
                    description: task.title,
                    quantity: 1,
                    unit: "st",
                    unitPrice: task.budget,
                    isRotEligible: applyRot,
                    roomId: task.room_id || undefined,
                    roomName,
                    source: "fixed",
                    sourceTaskId: task.id,
                    comment: task.description || "",
                  });
                } else {
                  taskItems.push({
                    id: crypto.randomUUID(),
                    description: task.title,
                    quantity: 1,
                    unit: "st",
                    unitPrice: 0,
                    isRotEligible: applyRot,
                    roomId: task.room_id || undefined,
                    roomName,
                    source: "missing",
                    sourceTaskId: task.id,
                    comment: task.description || "",
                  });
                }
              }
            } else {
              // Fixed price: lump sum per task
              taskItems.push({
                id: crypto.randomUUID(),
                description: task.title,
                quantity: 1,
                unit: "st",
                unitPrice: task.budget || 0,
                isRotEligible: applyRot,
                roomId: task.room_id || undefined,
                roomName,
                source: "fixed",
                sourceTaskId: task.id,
                comment: task.description || "",
              });
            }
          }
        }
      }

      // Fetch and convert selected materials
      if (materialIds.length > 0) {
        const { data: materials } = await supabase
          .from("materials")
          .select("id, name, quantity, unit, price_per_unit, price_total, room_id, rooms(name)")
          .in("id", materialIds)
          .order("created_at");

        if (materials && materials.length > 0) {
          for (const material of materials) {
            const roomName = (material.rooms as { name: string } | null)?.name || null;
            materialItems.push({
              id: crypto.randomUUID(),
              description: material.name,
              quantity: material.quantity || 1,
              unit: material.unit || "st",
              unitPrice: material.price_per_unit || 0,
              isRotEligible: false,
              roomId: material.room_id || undefined,
              roomName,
              source: "material",
            });
          }
        }
      }

      // Combine items based on grouping preference
      let newItems: QuoteItem[];

      if (groupByType === "byRoom") {
        // Group by room: collect all items by room, then flatten
        const roomMap = new Map<string, (QuoteItem & { roomName: string | null })[]>();
        const noRoom: (QuoteItem & { roomName: string | null })[] = [];

        for (const item of [...taskItems, ...materialItems]) {
          if (item.roomId) {
            const existing = roomMap.get(item.roomId) || [];
            existing.push(item);
            roomMap.set(item.roomId, existing);
          } else {
            noRoom.push(item);
          }
        }

        // Build items with room headers in description
        newItems = [];
        for (const [, roomItems] of roomMap) {
          const roomName = roomItems[0]?.roomName || t("quotes.noRoom");
          for (const item of roomItems) {
            newItems.push({
              ...item,
              description: `${item.description} (${roomName})`,
            });
          }
        }
        // Add items without room at the end
        for (const item of noRoom) {
          newItems.push(item);
        }
      } else if (groupByType === "grouped") {
        // Labor first, then materials
        newItems = [...taskItems, ...materialItems].map((item) => ({
          ...item,
          description: item.roomName ? `${item.description} (${item.roomName})` : item.description,
        }));
      } else {
        // Mixed - interleave by creation order
        const allItems = [];
        let ti = 0, mi = 0;
        while (ti < taskItems.length || mi < materialItems.length) {
          if (ti < taskItems.length) allItems.push(taskItems[ti++]);
          if (mi < materialItems.length) allItems.push(materialItems[mi++]);
        }
        newItems = allItems.map((item) => ({
          ...item,
          description: item.roomName ? `${item.description} (${item.roomName})` : item.description,
        }));
      }

      if (newItems.length > 0) {
        setItems(newItems);
        toast.success(t("quotes.itemsImported", { count: newItems.length }));
      }
    };

    fetchProjectData();
  }, [shouldPrepopulate, urlProjectId, taskIds.join(","), materialIds.join(","), groupByType, pricingFormat, applyRot, t]);

  const handleChange = useCallback((id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      return next.length === 0 ? [newItem()] : next;
    });
  }, []);

  const handleImportRoom = useCallback((itemId: string) => {
    if (!projectId) {
      toast.error(t("quotes.selectProject"));
      return;
    }
    setImportRoomItemId(itemId);
  }, [projectId, t]);

  const handleRoomSelect = useCallback((roomId: string, areaSqm: number) => {
    if (!importRoomItemId) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === importRoomItemId ? { ...i, quantity: areaSqm, unit: "m2", roomId } : i
      )
    );
    setImportRoomItemId(null);
  }, [importRoomItemId]);

  const handleSaveDraft = async () => {
    if (!user) return;
    if (!projectId) {
      toast.error(t("quotes.selectProject"));
      return;
    }
    setSaving(true);

    const itemPayloads = items
      .filter((item) => item.description || item.unitPrice > 0)
      .map((item, idx) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit: item.unit,
        is_rot_eligible: item.isRotEligible,
        room_id: item.roomId,
        sort_order: idx,
        comment: item.comment || null,
        discount_percent: item.discountPercent || null,
        source_task_id: item.sourceTaskId || null,
        source_type: item.source || null,
      }));

    const titlePrefix = isAta
      ? t("quotes.changeOrderLabel", "Tillägg")
      : t("quotes.quoteLabel", "Offert");
    const autoTitle = `${titlePrefix} — ${projectName || t("quotes.newQuote")}`;

    if (editQuoteId) {
      // Update existing quote
      const updated = await updateQuoteDraft(editQuoteId, {
        title: autoTitle,
        free_text: freeText.trim() || null,
        client_id_ref: clientId || null,
      });
      if (!updated) {
        setSaving(false);
        return;
      }
      const ok = await replaceQuoteItems(editQuoteId, itemPayloads);
      if (!ok) {
        setSaving(false);
        return;
      }
      setSaving(false);
      toast.success(t("quotes.saveDraft"));
      const returnTo = projectId ? `?returnTo=${encodeURIComponent(`/projects/${projectId}`)}` : "";
      navigate(`/quotes/${editQuoteId}${returnTo}`);
    } else {
      // Create new quote
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) {
        toast.error("Profile not found");
        setSaving(false);
        return;
      }
      const quote = await createQuote(projectId, autoTitle, profile.id, clientId || undefined, freeText.trim() || undefined, quoteNumber || undefined, isAta || undefined);
      if (!quote) {
        setSaving(false);
        return;
      }
      for (const item of itemPayloads) {
        await addQuoteItem(quote.id, item);
      }
      // Recalculate and persist quote totals
      const computedItems = itemPayloads.map((item) => {
        const total_price = item.quantity * item.unit_price * (1 - (item.discount_percent ?? 0) / 100);
        return {
          total_price,
          is_rot_eligible: item.is_rot_eligible ?? false,
          rot_deduction: calculateRotDeduction(total_price, item.is_rot_eligible ?? false),
        };
      });
      const totals = recalculateQuoteTotals(computedItems);
      await supabase.from("quotes").update(totals).eq("id", quote.id);
      setSaving(false);
      toast.success(t("quotes.saveDraft"));
      const returnTo = projectId ? `?returnTo=${encodeURIComponent(`/projects/${projectId}`)}` : "";
      navigate(`/quotes/${quote.id}${returnTo}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (authLoading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const projectName = projects.find((p) => p.id === projectId)?.name ?? "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-6 lg:px-0 lg:py-0 lg:h-[calc(100vh-4rem)] lg:max-w-none">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={42} minSize={25} maxSize={70} className="lg:!overflow-auto">
          {/* ── Left column: form fields ── */}
          <div className="max-w-2xl lg:max-w-none space-y-4 mx-auto lg:mx-0 lg:px-6 lg:py-6">
            {urlProjectId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/projects/${urlProjectId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("quotes.backToPlanning")}
              </Button>
            )}
            <h1 className="text-2xl font-bold">{t("quotes.newQuote")}</h1>

            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder={t("quotes.selectProject")} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={clientId}
              onValueChange={(val) => {
                if (val === "__new__") {
                  setCreateClientOpen(true);
                } else {
                  setClientId(val);
                }
              }}
            >
              <SelectTrigger className="min-h-[48px]">
                <SelectValue placeholder={t("quotes.selectRecipient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value="__new__">{t("quotes.createNewClient")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">{t("quotes.quoteNumberLabel", "Offertnr")}</Label>
              <Input
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                placeholder="OFF-2026-001"
                className="min-h-[48px]"
              />
            </div>

            <Textarea
              placeholder={t("quotes.freeTextPlaceholder")}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              className="min-h-[80px]"
            />

            <div className="space-y-3">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("quotes.noItems")}</p>
              )}
              {items.map((item) => (
                <QuoteItemRow
                  key={item.id}
                  item={item}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onImportRoom={handleImportRoom}
                />
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full min-h-[48px]"
              onClick={() => setItems((prev) => [...prev, newItem()])}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("quotes.addItem")}
            </Button>

            <QuoteSummary items={items} />

            <div className="flex gap-2 pb-8">
              {/* Preview button only on mobile — desktop has live preview */}
              <Button
                variant="outline"
                className="flex-1 min-h-[48px] lg:hidden"
                onClick={() => setPreviewOpen(true)}
              >
                {t("quotes.preview")}
              </Button>
              <Button
                className="flex-1 min-h-[48px]"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? t("common.saving") : t("quotes.saveDraft")}
              </Button>
            </div>
          </div>

          </ResizablePanel>

          <ResizableHandle withHandle className="hidden lg:flex" />

          <ResizablePanel defaultSize={58} minSize={30} maxSize={75}>
          {/* ── Right column: live preview (desktop only) ── */}
          <div
            ref={previewContainerRef}
            className="hidden lg:flex lg:flex-col h-full bg-neutral-100 dark:bg-neutral-900"
          >
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b bg-background/60 backdrop-blur-sm rounded-t-lg flex-shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground mr-auto">
                {t("quotes.livePreview", "Förhandsgranskning")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewScale((s) => Math.max(0.3, Math.round((s - 0.1) * 100) / 100))}
                title={t("common.zoomOut", "Zoom out")}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground w-10 text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewScale((s) => Math.min(1.5, Math.round((s + 0.1) * 100) / 100))}
                title={t("common.zoomIn", "Zoom in")}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fitToWidth}
                title={t("quotes.fitPage", "Fyll sida")}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable preview area */}
            <div className="flex-1 overflow-auto p-4">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: `${100 / previewScale}%`,
                }}
              >
                <QuoteDocument
                  projectName={projectName}
                  items={items}
                  freeText={freeText}
                  company={{
                    name: companyName,
                    logoUrl: companyLogoUrl,
                    ...companyInfo,
                  }}
                  clientName={clients.find((c) => c.id === clientId)?.name}
                  quoteNumber={quoteNumber}
                />
              </div>
            </div>
          </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <QuotePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        projectName={projectName}
        items={items}
        freeText={freeText}
        company={{
          name: companyName,
          logoUrl: companyLogoUrl,
          ...companyInfo,
        }}
        clientName={clients.find((c) => c.id === clientId)?.name}
        quoteNumber={quoteNumber}
      />

      <ImportRoomDialog
        open={importRoomItemId !== null}
        onClose={() => setImportRoomItemId(null)}
        projectId={projectId || null}
        onSelect={handleRoomSelect}
      />

      {profileId && (
        <CreateClientDialog
          open={createClientOpen}
          onClose={() => setCreateClientOpen(false)}
          onSaved={(client) => {
            setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
            setClientId(client.id);
          }}
          ownerId={profileId}
        />
      )}
    </div>
  );
}
