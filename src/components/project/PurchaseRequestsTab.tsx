import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Loader2,
  Plus,
  Pencil,
  ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

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
  creator?: {
    name: string;
  };
  assigned_to?: {
    name: string;
  };
  task?: {
    title: string;
  };
  room?: {
    name: string;
  };
}

interface PurchaseRequestsTabProps {
  projectId: string;
  openEntityId?: string | null;
  onEntityOpened?: () => void;
}

const PurchaseRequestsTab = ({ projectId, openEntityId, onEntityOpened }: PurchaseRequestsTabProps) => {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isProjectOwner, setIsProjectOwner] = useState<boolean>(false);
  const [userPurchasesAccess, setUserPurchasesAccess] = useState<string>('none');
  const [userPurchasesScope, setUserPurchasesScope] = useState<string>('assigned');

  const [quickMode, setQuickMode] = useState(true);

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    description: "",
    quantity: "",
    unit: "",
    price_per_unit: "",
    vendor_name: "",
    vendor_link: "",
    exclude_from_budget: false,
    room_id: "none",
    task_id: "none",
    assigned_to_user_id: "none",
  });

  const { toast } = useToast();

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

  // Fetch materials when profileId is available (for proper filtering)
  useEffect(() => {
    if (currentProfileId !== null) {
      fetchMaterials();
    }
  }, [currentProfileId, projectId, isProjectOwner]);

  // Auto-open a specific material from notification deep link or feed navigation
  useEffect(() => {
    if (!openEntityId || materials.length === 0) return;
    const material = materials.find((m) => m.id === openEntityId);
    if (material) {
      setEditingMaterial(material);
      setEditDialogOpen(true);
      onEntityOpened?.();
    }
    // Don't clear openEntityId if not found — materials may still be loading with different scope
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
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setCurrentProfileId(profile.id);

      // Check if user is owner
      const { data: project } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .single();

      if (project?.owner_id === profile.id) {
        // Owner has full access
        setIsProjectOwner(true);
        setUserPurchasesAccess('edit');
        setUserPurchasesScope('all');
        return;
      }

      setIsProjectOwner(false);

      // Check project_shares for permissions
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
    } catch (error: unknown) {
      console.error("Error fetching user permissions:", error);
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
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("project_id", projectId)
        .order("title");

      if (error) throw error;
      setTasks(data || []);
    } catch (error: unknown) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // Get project owner
      const { data: projectData } = await supabase
        .from("projects")
        .select(`
          owner_id,
          profiles!projects_owner_id_fkey(id, name)
        `)
        .eq("id", projectId)
        .single();

      // Get shared users
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
          creator:profiles!materials_created_by_user_id_fkey(name),
          assigned_to:profiles!materials_assigned_to_user_id_fkey(name),
          task:tasks(title),
          room:rooms(name)
        `)
        .eq("project_id", projectId);

      // Filter at DB level when scope is 'assigned' and user is not owner
      if (!isProjectOwner && userPurchasesScope === 'assigned' && currentProfileId) {
        query = query.or(`created_by_user_id.eq.${currentProfileId},assigned_to_user_id.eq.${currentProfileId}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setMaterials(data || []);
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
        exclude_from_budget: newMaterial.exclude_from_budget,
        room_id: (newMaterial.room_id && newMaterial.room_id !== "none") ? newMaterial.room_id : null,
        task_id: (newMaterial.task_id && newMaterial.task_id !== "none") ? newMaterial.task_id : null,
        assigned_to_user_id: (newMaterial.assigned_to_user_id && newMaterial.assigned_to_user_id !== "none") ? newMaterial.assigned_to_user_id : null,
        created_by_user_id: profile.id,
        status: "submitted",
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
        unit: "",
        price_per_unit: "",
        vendor_name: "",
        vendor_link: "",
        exclude_from_budget: false,
        room_id: "none",
        task_id: "none",
        assigned_to_user_id: "none",
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

  const canEditMaterial = (material: Material): boolean => {
    // Project owner can edit everything
    if (isProjectOwner) return true;

    if (!currentProfileId) return false;

    // Full edit access
    if (userPurchasesAccess === 'edit') {
      if (userPurchasesScope === 'all') return true;
      // Assigned/created scope - check if user created it OR is assigned to it
      return material.created_by_user_id === currentProfileId ||
             material.assigned_to_user_id === currentProfileId;
    }

    // Create access - can edit own created orders OR assigned orders
    if (userPurchasesAccess === 'create') {
      return material.created_by_user_id === currentProfileId ||
             material.assigned_to_user_id === currentProfileId;
    }

    // View access - can edit if assigned to them (even with view access)
    if (userPurchasesAccess === 'view') {
      return material.assigned_to_user_id === currentProfileId;
    }

    return false;
  };

  const handleStatusChange = async (materialId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("materials")
        .update({ status: newStatus })
        .eq("id", materialId);

      if (error) throw error;

      toast({
        title: t('purchases.statusUpdated'),
        description: t('purchases.statusChangedTo', { status: newStatus }),
      });

      fetchMaterials();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('purchases.title')} ({materials.length})
              </CardTitle>
              <CardDescription>
                {t('purchases.description')}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('purchases.addOrder')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
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
                      <div className="grid grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_per_unit">{t('purchases.pricePerUnit')} ({t('common.optional')})</Label>
                    <Input
                      id="price_per_unit"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newMaterial.price_per_unit}
                      onChange={(e) => setNewMaterial({ ...newMaterial, price_per_unit: e.target.value })}
                    />
                    {newMaterial.quantity && newMaterial.price_per_unit && (
                      <p className="text-sm text-muted-foreground">
                        {t('purchases.priceTotal')}: ${(parseFloat(newMaterial.quantity) * parseFloat(newMaterial.price_per_unit)).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor-name">{t('purchases.vendorName')} ({t('common.optional')})</Label>
                    <Input
                      id="vendor-name"
                      placeholder="Home Depot, Lowe's, etc."
                      value={newMaterial.vendor_name}
                      onChange={(e) => setNewMaterial({ ...newMaterial, vendor_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor-link">{t('purchases.vendorLink')} ({t('common.optional')})</Label>
                    <Input
                      id="vendor-link"
                      type="url"
                      placeholder="https://..."
                      value={newMaterial.vendor_link}
                      onChange={(e) => setNewMaterial({ ...newMaterial, vendor_link: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room">{t('purchases.room')} ({t('common.optional')})</Label>
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
                    <Label htmlFor="task">{t('purchases.linkToTask')} ({t('common.optional')})</Label>
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
                    <Label htmlFor="assigned-to">{t('purchases.assignTo')} ({t('common.optional')})</Label>
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
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('purchases.noPurchaseOrders')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('purchases.noPurchaseOrdersDescription')}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('purchases.materialName')}</TableHead>
                    <TableHead>{t('common.quantity')}</TableHead>
                    <TableHead>{t('purchases.pricePerUnit')}</TableHead>
                    <TableHead>{t('purchases.priceTotal')}</TableHead>
                    <TableHead>{t('purchases.vendor')}</TableHead>
                    <TableHead>{t('purchases.room')}</TableHead>
                    <TableHead>{t('purchases.task')}</TableHead>
                    <TableHead>{t('purchases.assignedTo')}</TableHead>
                    <TableHead>{t('purchases.addedBy')}</TableHead>
                    <TableHead>{t('purchases.addedDate')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow
                      key={material.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingMaterial({
                          ...material,
                          description: material.description || null,
                          status: material.status || "submitted",
                          room_id: material.room_id || "none",
                          task_id: material.task_id || "none",
                          assigned_to_user_id: material.assigned_to_user_id || "none"
                        });
                        setEditDialogOpen(true);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={material.status || "submitted"}
                          onValueChange={(value) => handleStatusChange(material.id, value)}
                          disabled={userPurchasesAccess !== 'edit' && !isProjectOwner}
                        >
                          <SelectTrigger className="w-[110px]">
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
                      </TableCell>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>
                        {material.quantity} {material.unit}
                      </TableCell>
                      <TableCell>
                        {material.price_per_unit ? `$${material.price_per_unit.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {material.price_total ? `$${material.price_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {material.vendor_name ? (
                          material.vendor_link ? (
                            <a
                              href={material.vendor_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {material.vendor_name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            material.vendor_name
                          )
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {material.room?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {material.task?.title || "-"}
                      </TableCell>
                      <TableCell>
                        {material.assigned_to?.name || "-"}
                      </TableCell>
                      <TableCell>{material.creator?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {new Date(material.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canEditMaterial(material) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Ensure all fields are properly set
                              setEditingMaterial({
                                ...material,
                                description: material.description || null,
                                status: material.status || "submitted",
                                room_id: material.room_id || "none",
                                task_id: material.task_id || "none",
                                assigned_to_user_id: material.assigned_to_user_id || "none"
                              });
                              setEditDialogOpen(true);
                            }}
                            title={t('purchases.editOrder')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
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
              <div className="grid grid-cols-2 gap-4">
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
                {editingMaterial.quantity && editingMaterial.price_per_unit && (
                  <p className="text-sm text-muted-foreground">
                    {t('purchases.priceTotal')}: ${(editingMaterial.quantity * editingMaterial.price_per_unit).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ordered-amount">{t('purchases.orderedAmount')}</Label>
                  <Input
                    id="edit-ordered-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingMaterial.ordered_amount?.toString() || ""}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, ordered_amount: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paid-amount">{t('purchases.paidAmount')}</Label>
                  <Input
                    id="edit-paid-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingMaterial.paid_amount?.toString() || ""}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, paid_amount: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>
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

              {/* Photos */}
              <Separator className="my-4" />
              <EntityPhotoGallery entityId={editingMaterial.id} entityType="material" />

              {/* Comments Section */}
              <Separator className="my-4" />
              <CommentsSection materialId={editingMaterial.id} projectId={projectId} />
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