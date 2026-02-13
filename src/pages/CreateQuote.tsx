import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AppHeader } from "@/components/AppHeader";
import { QuoteItemRow, type QuoteItem } from "@/components/quotes/QuoteItemRow";
import { QuoteSummary } from "@/components/quotes/QuoteSummary";
import { QuotePreview } from "@/components/quotes/QuotePreview";
import { ImportRoomDialog } from "@/components/quotes/ImportRoomDialog";
import { CreateClientDialog, type Client } from "@/components/quotes/CreateClientDialog";
import { createQuote, addQuoteItem } from "@/services/quoteService";

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
  };
}

export default function CreateQuote() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuthSession();

  // Read URL params
  const urlProjectId = searchParams.get("projectId");
  const urlClientId = searchParams.get("clientId");
  const shouldPrepopulate = searchParams.get("prepopulate") === "true";
  const fromQuickQuote = searchParams.get("fromQuickQuote") === "true";
  const fromIntake = searchParams.get("fromIntake") === "true";
  const taskIds = searchParams.get("taskIds")?.split(",").filter(Boolean) || [];
  const materialIds = searchParams.get("materialIds")?.split(",").filter(Boolean) || [];
  const groupByType = searchParams.get("groupByType") || "grouped";
  const applyRot = searchParams.get("applyRot") !== "false"; // default true

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([newItem()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importRoomItemId, setImportRoomItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [freeText, setFreeText] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("id, name")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
      });
    supabase
      .from("profiles")
      .select("id, name, company_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name ?? undefined);
          setUserName(data.name ?? undefined);
          setAvatarUrl(data.avatar_url ?? undefined);
          setProfileId(data.id);
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
      interface TaskWithRoom {
        id: string;
        title: string;
        budget: number | null;
        room_id: string | null;
        roomName: string | null;
      }
      interface MaterialWithRoom {
        id: string;
        name: string;
        quantity: number | null;
        unit: string | null;
        price_per_unit: number | null;
        room_id: string | null;
        roomName: string | null;
      }

      const taskItems: (QuoteItem & { roomName: string | null })[] = [];
      const materialItems: (QuoteItem & { roomName: string | null })[] = [];

      // Fetch and convert selected tasks to labor items
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, budget, room_id, rooms(name)")
          .in("id", taskIds)
          .order("created_at");

        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            const roomName = (task.rooms as { name: string } | null)?.name || null;
            taskItems.push({
              id: crypto.randomUUID(),
              description: task.title,
              quantity: 1,
              unit: "st",
              unitPrice: task.budget || 0,
              isRotEligible: applyRot, // ROT only applies to labor
              roomId: task.room_id || undefined,
              roomName,
            });
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
              isRotEligible: false, // ROT never applies to materials
              roomId: material.room_id || undefined,
              roomName,
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
  }, [shouldPrepopulate, urlProjectId, taskIds.join(","), materialIds.join(","), groupByType, applyRot, t]);

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
    const quote = await createQuote(projectId, title || t("quotes.newQuote"), profile.id, clientId || undefined, freeText.trim() || undefined);
    if (!quote) {
      setSaving(false);
      return;
    }
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.description && item.unitPrice === 0) continue;
      await addQuoteItem(quote.id, {
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        unit: item.unit,
        is_rot_eligible: item.isRotEligible,
        room_id: item.roomId,
        sort_order: idx,
      });
    }
    setSaving(false);
    toast.success(t("quotes.saveDraft"));
    navigate("/quotes/" + quote.id);
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

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">{t("quotes.newQuote")}</h1>

        <Input
          placeholder={t("quotes.title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-[48px]"
        />

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

        <Textarea
          placeholder={t("quotes.freeTextPlaceholder")}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          className="min-h-[80px]"
        />

        <QuoteSummary items={items} />

        <div className="flex gap-2 pb-8">
          <Button
            variant="outline"
            className="flex-1 min-h-[48px]"
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
      </main>

      <QuotePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title || t("quotes.newQuote")}
        projectName={projectName}
        items={items}
        companyName={companyName}
        freeText={freeText}
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
