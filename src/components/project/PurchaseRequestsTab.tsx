import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Loader2,
  Plus,
  Filter,
  ChevronDown,
  Store,
  Image,
  MessageSquare,
  Link2,
  LayoutGrid,
  Table as TableIcon,
  Columns3,
  Rows3,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { EntityPhotoGallery } from "@/components/shared/EntityPhotoGallery";
import { TaskFilesList } from "./TaskFilesList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { getStatusBadgeColor } from "@/lib/statusColors";
import { ProjectLockBanner } from "./ProjectLockBanner";
import { useProjectLock } from "@/hooks/useProjectLock";
import { PUBLIC_DEMO_PROJECT_ID } from "@/constants/publicDemo";
import { PurchasesTableView } from "./purchases/PurchasesTableView";
import { PurchasesKanbanView } from "./purchases/PurchasesKanbanView";
import { usePurchasesTableView } from "./purchases/usePurchasesTableView";
import { EXTRA_COLUMN_KEYS as PURCHASE_EXTRA_COLUMN_KEYS } from "./purchases/purchasesTypes";

interface Material {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number | null;
  price_total: number | null;
  ordered_amount: number | null;
  paid_amount: number | null;
  vendor_name: string | null;
  vendor_link: string | null;
  status: string;
  exclude_from_budget: boolean;
  created_at: string;
  task_id: string | null;
  room_id: string | null;
  created_by_user_id: string | null;
  assigned_to_user_id: string | null;
  source_material_id?: string | null;
  rot_amount?: number | null;
  paid_date?: string | null;
  creator?: {
    name: string;
  } | null;
  assigned_to?: {
    name: string;
  } | null;
  task?: {
    title: string;
  } | null;
  room?: {
    name: string;
  } | null;
  hasAttachment?: boolean;
  attachmentCount?: number;
}

interface PurchaseRequestsTabProps {
  projectId: string;
  openEntityId?: string | null;
  onEntityOpened?: () => void;
  currency?: string | null;
}

const PurchaseRequestsTab = ({ projectId, openEntityId, onEntityOpened, currency }: PurchaseRequestsTabProps) => {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string; budget: number | null; material_estimate: number | null; is_ata: boolean; materialSpent: number }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isProjectOwner, setIsProjectOwner] = useState<boolean>(false);
  const [userPurchasesAccess, setUserPurchasesAccess] = useState<string>('none');
  const [userPurchasesScope, setUserPurchasesScope] = useState<string>('assigned');
  const [permissionsResolved, setPermissionsResolved] = useState(false);

  const [quickMode, setQuickMode] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');

  // Table view state (lifted so toolbar renders in parent row)
  const purchaseTableViewState = usePurchasesTableView(projectId);

  // Filter state (multi-select sets)
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterRooms, setFilterRooms] = useState<Set<string>>(new Set());
  const [filterTasks, setFilterTasks] = useState<Set<string>>(new Set());
  const [filterCreatedBy, setFilterCreatedBy] = useState<Set<string>>(new Set());
  const [filterAttachment, setFilterAttachment] = useState<Set<string>>(new Set());

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    quantity: "",
    unit: "st",
    price_per_unit: "",
    vendor_name: "",
    vendor_link: "",
    exclude_from_budget: false,
    outside_budget: false,
    source_material_id: "none",
    room_id: "none",
    task_id: "none",
    assigned_to_user_id: "none",
    rot_amount: "",
    paid_date: "",
  });

  const { toast } = useToast();
  const { lockStatus } = useProjectLock(projectId);

  useEffect(() => {
    fetchUserPermissions();
    fetchRooms();
    fetchTasks();
    fetchTeamMembers();

    const channel = supabase
      .channel('purchase_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials'
        },
        () => {
          fetchMaterials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Fetch materials when permissions are resolved
  useEffect(() => {
    if (currentProfileId !== null || permissionsResolved) {
      fetchMaterials();
    }
  }, [currentProfileId, projectId, isProjectOwner, permissionsResolved]);

  // Auto-open a specific material from notification deep link
  useEffect(() => {
    if (!openEntityId || materials.length === 0) return;
    const material = materials.find((m) => m.id === openEntityId);
    if (material) {
      openEditDialog(material);
      onEntityOpened?.();
    }
  }, [openEntityId, materials]);

  // Safety timeout: clear openEntityId after 5s if material was never found
  useEffect(() => {
    if (!openEntityId) return;
    const timer = setTimeout(() => {
      onEntityOpened?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [openEntityId]);

  const fetchUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissionsResolved(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setPermissionsResolved(true);
        return;
      }
      setCurrentProfileId(profile.id);

      const { data: project } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .single();

      if (project?.owner_id === profile.id) {
        setIsProjectOwner(true);
        setUserPurchasesAccess('edit');
        setUserPurchasesScope('all');
        setPermissionsResolved(true);
        return;
      }

      setIsProjectOwner(false);

      const { data: share } = await supabase
        .from("project_shares")
        .select("purchases_access, purchases_scope")
        .eq("project_id", projectId)
        .eq("shared_with_user_id", profile.id)
        .maybeSingle();

      if (share) {
        setUserPurchasesAccess(share.purchases_access || 'none');
        setUserPurchasesScope(share.purchases_scope || 'assigned');
      }
      setPermissionsResolved(true);
    } catch (error: unknown) {
      console.error("Error fetching user permissions:", error);
      setPermissionsResolved(true);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error: unknown) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const [tasksRes, materialsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, budget, material_estimate, is_ata")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("materials")
          .select("task_id, price_total")
          .eq("project_id", projectId)
          .eq("exclude_from_budget", false)
          .not("task_id", "is", null),
      ]);

      if (tasksRes.error) throw tasksRes.error;

      const spendMap = new Map<string, number>();
      (materialsRes.data || []).forEach(m => {
        if (m.task_id) {
          spendMap.set(m.task_id, (spendMap.get(m.task_id) || 0) + (m.price_total || 0));
        }
      });

      setTasks((tasksRes.data || []).map(task => ({
        ...task,
        is_ata: task.is_ata ?? false,
        materialSpent: spendMap.get(task.id) || 0,
      })));
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: projectData } = await supabase
        .from("projects")
        .select(`
          owner_id,
          profiles!projects_owner_id_fkey(id, name)
        `)
        .eq("id", projectId)
        .single();

      const { data: sharesData } = await supabase
        .from("project_shares")
        .select(`
          shared_with_user_id,
          profiles!project_shares_shared_with_user_id_fkey(id, name)
        `)
        .eq("project_id", projectId);

      const members: { id: string; name: string }[] = [];

      if (projectData?.profiles) {
        const profile: unknown = projectData.profiles;
        members.push({ id: (profile as { id: string; name: string }).id, name: (profile as { id: string; name: string }).name || "Owner" });
      }

      if (sharesData) {
        const existingIds = new Set(members.map(m => m.id));
        sharesData.forEach((share: unknown) => {
          const s = share as { profiles?: { id: string; name: string } };
          if (s.profiles && !existingIds.has(s.profiles.id)) {
            existingIds.add(s.profiles.id);
            members.push({
              id: s.profiles.id,
              name: s.profiles.name || "Team Member"
            });
          }
        });
      }

      setTeamMembers(members);
    } catch (error: unknown) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchMaterials = async () => {
    try {
      let query = supabase
        .from("materials")
        .select(`
          *,
          task:tasks(title),
          room:rooms(name)
        `)
        .eq("project_id", projectId);

      const isPublicDemo = projectId === PUBLIC_DEMO_PROJECT_ID;
      if (!isPublicDemo && !isProjectOwner && userPurchasesScope === 'assigned' && currentProfileId) {
        query = query.eq("created_by_user_id", currentProfileId);
      }

      const [materialsRes, docsRes] = await Promise.all([
        query.order("created_at", { ascending: false }),
        supabase
          .from("task_file_links")
          .select("material_id, file_type")
          .eq("project_id", projectId)
          .not("material_id", "is", null),
      ]);

      if (materialsRes.error) throw materialsRes.error;

      const docCounts = new Map<string, number>();
      const fileCatMap = new Map<string, Set<string>>();
      if (!docsRes.error) {
        (docsRes.data || []).forEach((d: { material_id: string | null; file_type: string }) => {
          if (d.material_id) {
            docCounts.set(d.material_id, (docCounts.get(d.material_id) || 0) + 1);
            if (!fileCatMap.has(d.material_id)) fileCatMap.set(d.material_id, new Set());
            fileCatMap.get(d.material_id)!.add(d.file_type);
          }
        });
      }

      const creatorIds = [...new Set(
        (materialsRes.data || [])
          .map(m => m.created_by_user_id)
          .filter((id): id is string => id !== null)
      )];

      const creatorMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", creatorIds);

        (profiles || []).forEach(p => {
          if (p.name) creatorMap.set(p.id, p.name);
        });
      }

      // Batch fetch assigned-to profiles
      const assignedIds = [...new Set(
        (materialsRes.data || [])
          .map(m => m.assigned_to_user_id)
          .filter((id): id is string => id !== null)
      )];

      const assignedMap = new Map<string, string>();
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", assignedIds);

        (profiles || []).forEach(p => {
          if (p.name) assignedMap.set(p.id, p.name);
        });
      }

      const materialsWithNames = (materialsRes.data || []).map((material) => {
        const creatorName = material.created_by_user_id
          ? creatorMap.get(material.created_by_user_id)
          : null;
        const assignedName = material.assigned_to_user_id
          ? assignedMap.get(material.assigned_to_user_id)
          : null;
        const attachmentCount = docCounts.get(material.id) || 0;
        return {
          ...material,
          creator: creatorName ? { name: creatorName } : null,
          assigned_to: assignedName ? { name: assignedName } : null,
          hasAttachment: attachmentCount > 0,
          attachmentCount,
          fileCategories: fileCatMap.has(material.id) ? [...fileCatMap.get(material.id)!] : [],
        };
      });

      setMaterials(materialsWithNames);
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase.from("materials").insert({
        project_id: projectId,
        name: newMaterial.name,
        description: newMaterial.description || null,
        quantity: newMaterial.quantity ? parseFloat(newMaterial.quantity) : null,
        unit: newMaterial.unit,
        price_per_unit: newMaterial.price_per_unit ? parseFloat(newMaterial.price_per_unit) : null,
        vendor_name: newMaterial.vendor_name,
        vendor_link: newMaterial.vendor_link,
        exclude_from_budget: newMaterial.exclude_from_budget || newMaterial.outside_budget,
        source_material_id: (newMaterial.source_material_id && newMaterial.source_material_id !== "none") ? newMaterial.source_material_id : null,
        room_id: (newMaterial.room_id && newMaterial.room_id !== "none") ? newMaterial.room_id : null,
        task_id: (newMaterial.task_id && newMaterial.task_id !== "none") ? newMaterial.task_id : null,
        assigned_to_user_id: (newMaterial.assigned_to_user_id && newMaterial.assigned_to_user_id !== "none") ? newMaterial.assigned_to_user_id : null,
        created_by_user_id: profile.id,
        status: "submitted",
        rot_amount: newMaterial.rot_amount ? parseFloat(newMaterial.rot_amount) : null,
        paid_date: newMaterial.paid_date || null,
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('purchases.orderAddedSuccess'),
      });

      setDialogOpen(false);
      setNewMaterial({
        name: "",
        description: "",
        quantity: "",
        unit: "st",
        price_per_unit: "",
        vendor_name: "",
        vendor_link: "",
        exclude_from_budget: false,
        outside_budget: false,
        source_material_id: "none",
        room_id: "none",
        task_id: "none",
        assigned_to_user_id: "none",
        rot_amount: "",
        paid_date: "",
      });
      fetchMaterials();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message || t('purchases.addOrderFailed'),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from("materials")
        .update({
          name: editingMaterial.name,
          description: editingMaterial.description || null,
          quantity: editingMaterial.quantity,
          unit: editingMaterial.unit,
          price_per_unit: editingMaterial.price_per_unit,
          status: editingMaterial.status || "submitted",
          vendor_name: editingMaterial.vendor_name,
          vendor_link: editingMaterial.vendor_link,
          exclude_from_budget: editingMaterial.exclude_from_budget,
          ordered_amount: editingMaterial.ordered_amount || null,
          paid_amount: editingMaterial.paid_amount || null,
          room_id: editingMaterial.room_id === "none" ? null : editingMaterial.room_id,
          task_id: editingMaterial.task_id === "none" ? null : editingMaterial.task_id,
          assigned_to_user_id: editingMaterial.assigned_to_user_id === "none" ? null : editingMaterial.assigned_to_user_id,
          rot_amount: editingMaterial.rot_amount || null,
          paid_date: editingMaterial.paid_date || null,
        })
        .eq("id", editingMaterial.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('purchases.orderUpdatedSuccess'),
      });

      setEditDialogOpen(false);
      setEditingMaterial(null);
      fetchMaterials();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message || t('purchases.updateOrderFailed'),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const canEditMaterial = useCallback((material: Material): boolean => {
    if (isProjectOwner) return true;
    if (!currentProfileId) return false;

    if (userPurchasesAccess === 'edit') {
      if (userPurchasesScope === 'all') return true;
      return material.created_by_user_id === currentProfileId ||
             material.assigned_to_user_id === currentProfileId;
    }

    if (userPurchasesAccess === 'create') {
      return material.created_by_user_id === currentProfileId ||
             material.assigned_to_user_id === currentProfileId;
    }

    if (userPurchasesAccess === 'view') {
      return material.assigned_to_user_id === currentProfileId;
    }

    return false;
  }, [isProjectOwner, currentProfileId, userPurchasesAccess, userPurchasesScope]);

  const getStatusColor = useCallback((status: string) => getStatusBadgeColor(status), []);

  const createOrderFromPlanned = useCallback(async (planned: Material) => {
    if (!currentProfileId) return;
    const { error } = await supabase.from("materials").insert({
      project_id: projectId,
      task_id: planned.task_id,
      room_id: planned.room_id,
      name: planned.name,
      quantity: planned.quantity,
      unit: planned.unit,
      price_per_unit: planned.price_per_unit,
      price_total: planned.price_total,
      status: "to_order",
      source_material_id: planned.id,
      created_by_user_id: currentProfileId,
    });
    if (error) {
      toast({ variant: "destructive", description: t("purchases.createOrderFailed", "Kunde inte skapa inköpsorder") });
    } else {
      toast({ description: t("purchases.orderCreatedFromPlan", "Inköpsorder skapad från offertrad") });
      fetchMaterials();
    }
  }, [currentProfileId, projectId, fetchMaterials, t]);

  const openEditDialog = useCallback((material: Material) => {
    setEditingMaterial({
      ...material,
      description: material.description || null,
      status: material.status || "submitted",
      room_id: material.room_id || "none",
      task_id: material.task_id || "none",
      assigned_to_user_id: material.assigned_to_user_id || "none"
    });
    setEditDialogOpen(true);
  }, []);

  // Filter helpers
  const toggleFilterValue = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const totalFilterCount = filterStatuses.size + filterRooms.size + filterTasks.size + filterCreatedBy.size + filterAttachment.size;

  const clearAllFilters = () => {
    setFilterStatuses(new Set());
    setFilterRooms(new Set());
    setFilterTasks(new Set());
    setFilterCreatedBy(new Set());
    setFilterAttachment(new Set());
  };

  // Split planned (budget references) from real orders
  const plannedMaterials = materials.filter(m => m.status === "planned");
  const orderMaterials = materials.filter(m => m.status !== "planned");

  // Paid per planned row: only counts when purchase order status = "paid"
  const paidByPlannedId = new Map<string, number>();
  // Ordered (not yet paid) per planned row: to_order + ordered statuses
  const orderedByPlannedId = new Map<string, number>();
  for (const m of orderMaterials) {
    if (!m.source_material_id) continue;
    if (m.status === "paid") {
      paidByPlannedId.set(m.source_material_id,
        (paidByPlannedId.get(m.source_material_id) || 0) + (m.price_total || 0));
    } else {
      orderedByPlannedId.set(m.source_material_id,
        (orderedByPlannedId.get(m.source_material_id) || 0) + (m.price_total || 0));
    }
  }

  // Filter real orders only
  const filteredMaterials = orderMaterials.filter((material) => {
    if (filterStatuses.size > 0 && !filterStatuses.has(material.status)) return false;
    if (filterRooms.size > 0) {
      const roomMatch = material.room_id ? filterRooms.has(material.room_id) : filterRooms.has("none");
      if (!roomMatch) return false;
    }
    if (filterTasks.size > 0) {
      const taskMatch = material.task_id ? filterTasks.has(material.task_id) : filterTasks.has("none");
      if (!taskMatch) return false;
    }
    if (filterCreatedBy.size > 0 && material.created_by_user_id && !filterCreatedBy.has(material.created_by_user_id)) return false;
    if (filterAttachment.size > 0) {
      if (filterAttachment.has("has") && !material.hasAttachment) return false;
      if (filterAttachment.has("missing") && material.hasAttachment) return false;
    }
    return true;
  });

  // Count helpers for filter popover (based on real orders only)
  const getStatusCount = (status: string) => orderMaterials.filter(m => m.status === status).length;
  const getRoomCount = (id: string) => orderMaterials.filter(m => id === "none" ? !m.room_id : m.room_id === id).length;
  const getTaskCount = (id: string) => orderMaterials.filter(m => id === "none" ? !m.task_id : m.task_id === id).length;
  const getCreatorCount = (id: string) => orderMaterials.filter(m => m.created_by_user_id === id).length;

  // Get unique creators (from real orders)
  const uniqueCreators = Array.from(
    new Map(
      orderMaterials
        .filter((m) => m.created_by_user_id && m.creator?.name)
        .map((m) => [m.created_by_user_id, { id: m.created_by_user_id!, name: m.creator!.name }])
    ).values()
  );

  const statusOptions = [
    { value: "submitted", labelKey: "materialStatuses.submitted" },
    { value: "approved", labelKey: "materialStatuses.approved" },
    { value: "billed", labelKey: "materialStatuses.billed" },
    { value: "paid", labelKey: "materialStatuses.paid" },
    { value: "paused", labelKey: "materialStatuses.paused" },
    { value: "declined", labelKey: "materialStatuses.declined" },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectLockBanner lockStatus={lockStatus} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('purchases.title')} ({materials.length})
              </CardTitle>
              <CardDescription>
                {t('purchases.description')}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('purchases.addOrder')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl lg:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <DialogTitle>
                      {quickMode ? t('purchases.quickOrder') : t('purchases.newOrder')}
                    </DialogTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setQuickMode(!quickMode)}
                    >
                      {quickMode ? t('purchases.showAllFields') : t('purchases.quickMode')}
                    </Button>
                  </div>
                  <DialogDescription>
                    {t('purchases.addOrderDescription')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMaterial} className="flex flex-col flex-1 overflow-hidden">
                  {quickMode ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t('purchases.materialName')} *</Label>
                        <Input
                          placeholder={t('purchases.quickNamePlaceholder')}
                          value={newMaterial.name}
                          onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>{t('common.quantity')} *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={newMaterial.quantity}
                            onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('common.unit')} *</Label>
                          <Select
                            value={newMaterial.unit}
                            onValueChange={(v) => setNewMaterial({ ...newMaterial, unit: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('purchases.selectUnit')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="st">{t('purchases.units.pieces')}</SelectItem>
                              <SelectItem value="m²">{t('purchases.units.sqm')}</SelectItem>
                              <SelectItem value="m">{t('purchases.units.meters')}</SelectItem>
                              <SelectItem value="kg">{t('purchases.units.kg')}</SelectItem>
                              <SelectItem value="liter">{t('purchases.units.liters')}</SelectItem>
                              <SelectItem value="förp">{t('purchases.units.packages')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('purchases.pricePerUnit')}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newMaterial.price_per_unit}
                            onChange={(e) => setNewMaterial({ ...newMaterial, price_per_unit: e.target.value })}
                          />
                        </div>
                      </div>
                      {newMaterial.quantity && newMaterial.price_per_unit && (
                        <p className="text-sm text-muted-foreground">
                          {t('purchases.priceTotal')}: {formatCurrency(parseFloat(newMaterial.quantity) * parseFloat(newMaterial.price_per_unit), currency, { decimals: 2 })}
                        </p>
                      )}
                      {/* Budgetpost */}
                      {plannedMaterials.length > 0 && (
                        <div className="space-y-2">
                          <Label>{t('purchases.budgetPost', 'Budgetpost')}</Label>
                          <Select
                            value={newMaterial.source_material_id}
                            onValueChange={(v) => setNewMaterial({ ...newMaterial, source_material_id: v, outside_budget: v !== "none" ? false : newMaterial.outside_budget })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('purchases.selectBudgetPost', 'Välj budgetpost...')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('purchases.noBudgetPost', 'Ingen budgetpost')}</SelectItem>
                              {plannedMaterials.map((pm) => (
                                <SelectItem key={pm.id} value={pm.id}>
                                  {pm.name}{pm.price_total ? ` — ${formatCurrency(pm.price_total, currency)}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newMaterial.source_material_id === "none" && !newMaterial.outside_budget && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              <span className="mt-0.5">⚠</span>
                              <div>
                                {t('purchases.noBudgetPostWarning', 'Den här ordern räknas inte mot någon budgetpost.')}
                                <button
                                  type="button"
                                  className="ml-1 underline hover:no-underline"
                                  onClick={() => setNewMaterial({ ...newMaterial, outside_budget: true })}
                                >
                                  {t('purchases.markOutsideBudget', 'Markera som utanför budget')}
                                </button>
                              </div>
                            </div>
                          )}
                          {newMaterial.outside_budget && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              ✓ {t('purchases.markedOutsideBudget', 'Markerad som utanför budget')}
                              <button type="button" className="underline hover:no-underline" onClick={() => setNewMaterial({ ...newMaterial, outside_budget: false })}>
                                {t('common.undo', 'Ångra')}
                              </button>
                            </p>
                          )}
                        </div>
                      )}
                      {/* Koppling (Connections) */}
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                          <Link2 className="h-4 w-4" />
                          {t('purchases.connections', 'Connections')}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-3">
                          <div className="space-y-2">
                            <Label>{t('purchases.linkToTask')}</Label>
                            <Select
                              value={newMaterial.task_id || "none"}
                              onValueChange={(v) => setNewMaterial({ ...newMaterial, task_id: v === "none" ? "" : v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('purchases.selectTask')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('purchases.noTask')}</SelectItem>
                                {tasks.map((task) => (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('purchases.room')}</Label>
                            <Select
                              value={newMaterial.room_id || "none"}
                              onValueChange={(v) => setNewMaterial({ ...newMaterial, room_id: v === "none" ? "" : v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('purchases.selectRoom')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('purchases.noRoom')}</SelectItem>
                                {rooms.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{t('purchases.assignTo')}</Label>
                            <Select
                              value={newMaterial.assigned_to_user_id || "none"}
                              onValueChange={(v) => setNewMaterial({ ...newMaterial, assigned_to_user_id: v === "none" ? "" : v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('purchases.selectTeamMember')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('common.unassigned')}</SelectItem>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="quick-exclude-from-budget"
                          checked={newMaterial.exclude_from_budget}
                          onChange={(e) => setNewMaterial({ ...newMaterial, exclude_from_budget: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="quick-exclude-from-budget" className="text-sm font-normal cursor-pointer">
                          {t('purchases.excludeFromBudget')}
                        </Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={creating}>
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('purchases.sendOrder')}
                      </Button>
                    </div>
                  ) : (
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="material-name">{t('purchases.materialName')}*</Label>
                    <Input
                      id="material-name"
                      placeholder="e.g., Paint, Wood, Tiles"
                      value={newMaterial.name}
                      onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('common.description')} ({t('common.optional')})</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional details..."
                      value={newMaterial.description}
                      onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">{t('common.quantity')}*</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        placeholder="10"
                        value={newMaterial.quantity}
                        onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">{t('common.unit')}*</Label>
                      <Input
                        id="unit"
                        placeholder="e.g., gallons, sqft"
                        value={newMaterial.unit}
                        onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price_per_unit">{t('purchases.pricePerUnit')}</Label>
                      <Input
                        id="price_per_unit"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newMaterial.price_per_unit}
                        onChange={(e) => setNewMaterial({ ...newMaterial, price_per_unit: e.target.value })}
                      />
                    </div>
                  </div>
                  {newMaterial.quantity && newMaterial.price_per_unit && (
                    <p className="text-sm text-muted-foreground">
                      {t('purchases.priceTotal')}: {formatCurrency(parseFloat(newMaterial.quantity) * parseFloat(newMaterial.price_per_unit), currency, { decimals: 2 })}
                    </p>
                  )}

                  {/* Budgetpost */}
                  {plannedMaterials.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t('purchases.budgetPost', 'Budgetpost')}</Label>
                      <Select
                        value={newMaterial.source_material_id}
                        onValueChange={(v) => setNewMaterial({ ...newMaterial, source_material_id: v, outside_budget: v !== "none" ? false : newMaterial.outside_budget })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('purchases.selectBudgetPost', 'Välj budgetpost...')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('purchases.noBudgetPost', 'Ingen budgetpost')}</SelectItem>
                          {plannedMaterials.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.name}{pm.price_total ? ` — ${formatCurrency(pm.price_total, currency)}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newMaterial.source_material_id === "none" && !newMaterial.outside_budget && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <span className="mt-0.5">⚠</span>
                          <div>
                            {t('purchases.noBudgetPostWarning', 'Den här ordern räknas inte mot någon budgetpost.')}
                            <button
                              type="button"
                              className="ml-1 underline hover:no-underline"
                              onClick={() => setNewMaterial({ ...newMaterial, outside_budget: true })}
                            >
                              {t('purchases.markOutsideBudget', 'Markera som utanför budget')}
                            </button>
                          </div>
                        </div>
                      )}
                      {newMaterial.outside_budget && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          ✓ {t('purchases.markedOutsideBudget', 'Markerad som utanför budget')}
                          <button type="button" className="underline hover:no-underline" onClick={() => setNewMaterial({ ...newMaterial, outside_budget: false })}>
                            {t('common.undo', 'Ångra')}
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Leverantör */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                      <Store className="h-4 w-4" />
                      {t('purchases.vendorName')}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="vendor-name">{t('purchases.vendorName')}</Label>
                        <Input
                          id="vendor-name"
                          placeholder="Home Depot, Lowe's, etc."
                          value={newMaterial.vendor_name}
                          onChange={(e) => setNewMaterial({ ...newMaterial, vendor_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendor-link">{t('purchases.vendorLink')}</Label>
                        <Input
                          id="vendor-link"
                          type="url"
                          placeholder="https://..."
                          value={newMaterial.vendor_link}
                          onChange={(e) => setNewMaterial({ ...newMaterial, vendor_link: e.target.value })}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Koppling */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                      <Link2 className="h-4 w-4" />
                      {t('purchases.connections', 'Connections')}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="task">{t('purchases.linkToTask')}</Label>
                        <Select
                          value={newMaterial.task_id || "none"}
                          onValueChange={(value) => setNewMaterial({ ...newMaterial, task_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchases.selectTask')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('purchases.noTask')}</SelectItem>
                            {tasks.map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room">{t('purchases.room')}</Label>
                        <Select
                          value={newMaterial.room_id || "none"}
                          onValueChange={(value) => setNewMaterial({ ...newMaterial, room_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchases.selectRoom')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('purchases.noRoom')}</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assigned-to">{t('purchases.assignTo')}</Label>
                        <Select
                          value={newMaterial.assigned_to_user_id || "none"}
                          onValueChange={(value) => setNewMaterial({ ...newMaterial, assigned_to_user_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchases.selectTeamMember')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('common.unassigned')}</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="exclude-from-budget"
                      checked={newMaterial.exclude_from_budget}
                      onChange={(e) => setNewMaterial({ ...newMaterial, exclude_from_budget: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="exclude-from-budget" className="text-sm font-normal cursor-pointer">
                      {t('purchases.excludeFromBudget')}
                    </Label>
                  </div>
                  </div>
                  )}

                  {/* Fixed Save Button - only show for advanced mode */}
                  {!quickMode && (
                  <div className="flex-shrink-0 pt-4 border-t mt-4 bg-background sticky bottom-0">
                    <Button type="submit" className="w-full" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('purchases.creating')}
                        </>
                      ) : (
                        t('purchases.createOrder')
                      )}
                    </Button>
                  </div>
                  )}
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('purchases.noPurchaseOrders')}</h3>
              <p className="text-muted-foreground mb-2">
                {t('purchases.noPurchaseOrdersDescription')}</p>
              <p className="text-xs text-muted-foreground">
                {t('purchases.emptyStateTip', 'Tip: Link purchases to tasks to track costs per work item')}
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar: View Toggle + Filter + Results count */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                {/* View Toggle */}
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'kanban' | 'table')}>
                  <ToggleGroupItem value="kanban" aria-label="Kanban view">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <TableIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Filter Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 relative" title={t('purchases.filters', 'Filter')}>
                      <Filter className="h-4 w-4" />
                      {totalFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                          {totalFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <div className="max-h-[70vh] overflow-y-auto">
                      {/* Status */}
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('common.status')}</p>
                      </div>
                      <div className="px-1 pb-2">
                        {statusOptions.map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={filterStatuses.has(opt.value)}
                              onCheckedChange={() => toggleFilterValue(setFilterStatuses, opt.value)}
                            />
                            <span className="flex-1">{t(opt.labelKey)}</span>
                            <span className="text-xs text-muted-foreground">{getStatusCount(opt.value)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="border-t" />

                      {/* Room */}
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('purchases.room')}</p>
                      </div>
                      <div className="px-1 pb-2">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={filterRooms.has("none")}
                            onCheckedChange={() => toggleFilterValue(setFilterRooms, "none")}
                          />
                          <span className="flex-1">{t('purchasesTable.noRoom')}</span>
                          <span className="text-xs text-muted-foreground">{getRoomCount("none")}</span>
                        </label>
                        {rooms.map(room => (
                          <label key={room.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={filterRooms.has(room.id)}
                              onCheckedChange={() => toggleFilterValue(setFilterRooms, room.id)}
                            />
                            <span className="flex-1">{room.name}</span>
                            <span className="text-xs text-muted-foreground">{getRoomCount(room.id)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="border-t" />

                      {/* Task */}
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('purchases.task')}</p>
                      </div>
                      <div className="px-1 pb-2">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={filterTasks.has("none")}
                            onCheckedChange={() => toggleFilterValue(setFilterTasks, "none")}
                          />
                          <span className="flex-1">{t('purchasesTable.noTask')}</span>
                          <span className="text-xs text-muted-foreground">{getTaskCount("none")}</span>
                        </label>
                        {tasks.map(task => (
                          <label key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={filterTasks.has(task.id)}
                              onCheckedChange={() => toggleFilterValue(setFilterTasks, task.id)}
                            />
                            <span className="flex-1 truncate">{task.title}</span>
                            <span className="text-xs text-muted-foreground">{getTaskCount(task.id)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="border-t" />

                      {/* Created by */}
                      {uniqueCreators.length > 0 && (
                        <>
                          <div className="px-3 pt-3 pb-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('purchases.addedBy')}</p>
                          </div>
                          <div className="px-1 pb-2">
                            {uniqueCreators.map(creator => (
                              <label key={creator.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                                <Checkbox
                                  checked={filterCreatedBy.has(creator.id)}
                                  onCheckedChange={() => toggleFilterValue(setFilterCreatedBy, creator.id)}
                                />
                                <span className="flex-1">{creator.name}</span>
                                <span className="text-xs text-muted-foreground">{getCreatorCount(creator.id)}</span>
                              </label>
                            ))}
                          </div>
                          <div className="border-t" />
                        </>
                      )}

                      {/* Attachment */}
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('purchasesTable.attachment')}</p>
                      </div>
                      <div className="px-1 pb-2">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={filterAttachment.has("has")}
                            onCheckedChange={() => toggleFilterValue(setFilterAttachment, "has")}
                          />
                          <span className="flex-1">{t('budget.hasAttachment')}</span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={filterAttachment.has("missing")}
                            onCheckedChange={() => toggleFilterValue(setFilterAttachment, "missing")}
                          />
                          <span className="flex-1">{t('budget.missingAttachment')}</span>
                        </label>
                      </div>

                      {/* Clear all */}
                      {totalFilterCount > 0 && (
                        <>
                          <div className="border-t" />
                          <div className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={clearAllFilters}
                            >
                              {t('purchases.clearFilters', 'Clear filters')}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Table view toolbar items (inline) */}
                {viewMode === 'table' && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" title={t("purchasesTable.columns")}>
                          <Columns3 className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52" align="start">
                        <div className="space-y-2">
                          <p className="text-sm font-medium mb-2">{t("purchasesTable.extraColumns")}</p>
                          {PURCHASE_EXTRA_COLUMN_KEYS.map((key) => {
                            const col = purchaseTableViewState.ALL_COLUMNS.find((c) => c.key === key);
                            return (
                              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={purchaseTableViewState.visibleExtras.has(key)}
                                  onCheckedChange={() => purchaseTableViewState.toggleExtraColumn(key)}
                                />
                                {col?.label}
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant={purchaseTableViewState.compactRows ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => purchaseTableViewState.setCompactRows(!purchaseTableViewState.compactRows)}
                      title={t("purchasesTable.compactRows")}
                    >
                      <Rows3 className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Active filter count summary */}
                {totalFilterCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {t('purchases.showingResults', 'Showing {{count}} of {{total}} orders', {
                      count: filteredMaterials.length,
                      total: orderMaterials.length,
                    })}
                  </span>
                )}
              </div>

              {/* Materialposter från offert */}
              {plannedMaterials.length > 0 && (
                <Collapsible defaultOpen className="mb-4">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full mb-2 group">
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
                      {t("purchases.materialBudget", "Materialbudget")}
                      <span className="ml-1 text-xs bg-muted rounded-full px-2 py-0.5">{plannedMaterials.length}</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-lg border overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("purchases.materialName")}</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("purchases.task")}</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("purchases.quoteBudget", "Budget")}</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("purchases.ordered", "Beställt")}</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("purchases.paid", "Betalt")}</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">{t("purchases.remaining", "Kvar")}</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {plannedMaterials.map((m) => {
                            const paid = paidByPlannedId.get(m.id) || 0;
                            const ordered = orderedByPlannedId.get(m.id) || 0;
                            const budget = m.price_total || 0;
                            const remaining = budget - paid;
                            return (
                              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                                <td className="px-4 py-2.5 text-muted-foreground">{m.task?.title || "—"}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(budget, currency)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">
                                  {ordered > 0 ? formatCurrency(ordered, currency) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                                  {paid > 0 ? formatCurrency(paid, currency) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${remaining < 0 ? "text-destructive" : remaining === 0 && paid > 0 ? "text-muted-foreground" : ""}`}>
                                  {formatCurrency(remaining, currency)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => createOrderFromPlanned(m)}
                                  >
                                    {t("purchases.createOrder", "Skapa order")}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Views */}
              {viewMode === 'kanban' ? (
                <PurchasesKanbanView
                  materials={filteredMaterials}
                  projectId={projectId}
                  currency={currency}
                  isReadOnly={lockStatus.isLocked || (userPurchasesAccess !== 'edit' && !isProjectOwner)}
                  onMaterialClick={openEditDialog}
                  onMaterialUpdated={fetchMaterials}
                  getStatusColor={getStatusColor}
                />
              ) : (
                <PurchasesTableView
                  materials={filteredMaterials}
                  projectId={projectId}
                  rooms={rooms}
                  tasks={tasks}
                  teamMembers={teamMembers}
                  currency={currency}
                  isReadOnly={lockStatus.isLocked || (userPurchasesAccess !== 'edit' && !isProjectOwner)}
                  onMaterialClick={openEditDialog}
                  onMaterialUpdated={fetchMaterials}
                  canEditMaterial={canEditMaterial}
                  getStatusColor={getStatusColor}
                  tableViewState={purchaseTableViewState}
                  hideToolbar
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl lg:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('purchases.editOrder')}</DialogTitle>
            <DialogDescription>
              {t('purchases.editOrderDescription')}
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <form onSubmit={handleEditMaterial} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-status">{t('common.status')}</Label>
                <Select
                  value={editingMaterial.status || "submitted"}
                  onValueChange={(value) => setEditingMaterial({ ...editingMaterial, status: value })}
                  disabled={userPurchasesAccess !== 'edit' && !isProjectOwner}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">{t('materialStatuses.submitted')}</SelectItem>
                    <SelectItem value="declined">{t('materialStatuses.declined')}</SelectItem>
                    <SelectItem value="approved">{t('materialStatuses.approved')}</SelectItem>
                    <SelectItem value="billed">{t('materialStatuses.billed')}</SelectItem>
                    <SelectItem value="paid">{t('materialStatuses.paid')}</SelectItem>
                    <SelectItem value="paused">{t('materialStatuses.paused')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-name">{t('purchases.materialName')}*</Label>
                <Input
                  id="edit-material-name"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('common.description')}</Label>
                <Textarea
                  id="edit-description"
                  value={editingMaterial.description || ""}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">{t('common.quantity')}*</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    step="0.01"
                    value={editingMaterial.quantity}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, quantity: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">{t('common.unit')}*</Label>
                  <Input
                    id="edit-unit"
                    value={editingMaterial.unit}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-per-unit">{t('purchases.pricePerUnit')}</Label>
                  <Input
                    id="edit-price-per-unit"
                    type="number"
                    step="0.01"
                    value={editingMaterial.price_per_unit || ""}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, price_per_unit: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>
              {editingMaterial.quantity && editingMaterial.price_per_unit && (
                <p className="text-sm text-muted-foreground">
                  {t('purchases.priceTotal')}: {formatCurrency(editingMaterial.quantity * editingMaterial.price_per_unit, currency, { decimals: 2 })}
                </p>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-exclude-from-budget"
                  checked={editingMaterial.exclude_from_budget}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, exclude_from_budget: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-exclude-from-budget" className="text-sm font-normal cursor-pointer">
                  {t('purchases.excludeFromBudget')}
                </Label>
              </div>

              {/* ROT + Betaldat */}
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-rot-amount">{t("files.rotAmount", "ROT-avdrag")}</Label>
                  <Input
                    id="edit-rot-amount"
                    type="number"
                    value={editingMaterial.rot_amount ?? ""}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, rot_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paid-date">{t("common.paidDate", "Betaldat")}</Label>
                  <Input
                    id="edit-paid-date"
                    type="date"
                    value={editingMaterial.paid_date ?? ""}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, paid_date: e.target.value || null })}
                  />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Leverantör */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <Store className="h-4 w-4" />
                  {t('purchases.vendorName')}
                  {(editingMaterial.vendor_name || editingMaterial.vendor_link) && (
                    <Badge variant="secondary" className="ml-auto text-xs">{editingMaterial.vendor_name || "1"}</Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-name">{t('purchases.vendorName')}</Label>
                    <Input
                      id="edit-vendor-name"
                      value={editingMaterial.vendor_name || ""}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, vendor_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-vendor-link">{t('purchases.vendorLink')}</Label>
                    <Input
                      id="edit-vendor-link"
                      type="url"
                      value={editingMaterial.vendor_link || ""}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, vendor_link: e.target.value })}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Kopplingar */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <Link2 className="h-4 w-4" />
                  {t('purchases.connections', 'Connections')}
                  {(editingMaterial.task_id || editingMaterial.room_id || editingMaterial.assigned_to_user_id) && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {[editingMaterial.task_id, editingMaterial.room_id, editingMaterial.assigned_to_user_id].filter(Boolean).length}
                    </Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task">{t('purchases.linkToTask')} ({t('common.optional')})</Label>
                    <Select
                      value={editingMaterial.task_id || "none"}
                      onValueChange={(value) => setEditingMaterial({ ...editingMaterial, task_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('purchases.selectTask')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('purchases.noTask')}</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-assigned-to">{t('purchases.assignTo')} ({t('common.optional')})</Label>
                    <Select
                      value={editingMaterial.assigned_to_user_id || "none"}
                      onValueChange={(value) => setEditingMaterial({ ...editingMaterial, assigned_to_user_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('purchases.selectTeamMember')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('common.unassigned')}</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-room">{t('purchases.room')} ({t('common.optional')})</Label>
                    <Select
                      value={editingMaterial.room_id || "none"}
                      onValueChange={(value) => setEditingMaterial({ ...editingMaterial, room_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('purchases.selectRoom')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('purchases.noRoom')}</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Bilder */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <Image className="h-4 w-4" />
                  {t('purchases.photos', 'Photos')}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <EntityPhotoGallery entityId={editingMaterial.id} entityType="material" projectId={projectId} />
                  <div className="mt-3">
                    <TaskFilesList materialId={editingMaterial.id} projectId={projectId} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Kommentarer */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <MessageSquare className="h-4 w-4" />
                  {t('purchases.comments', 'Comments')}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <CommentsSection materialId={editingMaterial.id} projectId={projectId} />
                </CollapsibleContent>
              </Collapsible>
              </div>

              {/* Fixed Save Button */}
              <div className="flex-shrink-0 pt-4 border-t mt-4 bg-background sticky bottom-0">
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('purchases.updating')}
                    </>
                  ) : (
                    t('purchases.updateOrder')
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequestsTab;
