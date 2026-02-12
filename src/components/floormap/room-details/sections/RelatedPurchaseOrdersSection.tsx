import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MaterialDetailDialog from "@/components/project/MaterialDetailDialog";

interface Material {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  status: string;
  vendor_name: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "submitted":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "declined":
      return "bg-red-100 text-red-700 border-red-200";
    case "billed":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "paid":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "paused":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

interface RelatedPurchaseOrdersSectionProps {
  roomId: string;
  projectId: string;
}

export function RelatedPurchaseOrdersSection({ roomId, projectId }: RelatedPurchaseOrdersSectionProps) {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Material detail dialog state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Purchase Order form state
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [poName, setPoName] = useState("");
  const [poQuantity, setPoQuantity] = useState("1");
  const [poUnit, setPoUnit] = useState("pcs");
  const [poPricePerUnit, setPoPricePerUnit] = useState("");

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("id, name, quantity, unit, status, vendor_name")
      .eq("room_id", roomId);

    if (error) {
      console.error("Failed to load materials:", error);
    } else {
      setMaterials((data as Material[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, [roomId]);

  const handleCreatePurchaseOrder = async () => {
    if (!poName.trim()) {
      toast.error(t('taskPanel.materialNameRequired', 'Material name is required'));
      return;
    }

    setCreatingPO(true);
    try {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not find user profile");

      const materialData = {
        name: poName.trim(),
        quantity: parseFloat(poQuantity) || 1,
        unit: poUnit,
        price_per_unit: poPricePerUnit ? parseFloat(poPricePerUnit) : null,
        status: "submitted",
        room_id: roomId,
        project_id: projectId,
        created_by_user_id: profile.id,
      };

      const { error } = await supabase
        .from("materials")
        .insert(materialData);

      if (error) throw error;

      toast.success(t('rooms.poCreatedForRoom', 'Purchase order created and linked to room'));

      // Reset form
      setPoName("");
      setPoQuantity("1");
      setPoUnit("pcs");
      setPoPricePerUnit("");
      setPoDialogOpen(false);

      // Refresh materials list
      await fetchMaterials();
    } catch (error: unknown) {
      console.error("Error creating purchase order:", error);
      toast.error(error instanceof Error ? error.message : t('taskPanel.failedToCreatePO', 'Failed to create purchase order'));
    } finally {
      setCreatingPO(false);
    }
  };

  const handleMaterialClick = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{t('rooms.loadingPurchaseOrders')}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header with Create button */}
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPoDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('common.create')}
          </Button>
        </div>

        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t('rooms.noPOsForRoom')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 transition-colors"
                onClick={() => handleMaterialClick(m.id)}
              >
                <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(m.status)}`}>
                  {t(`materialStatuses.${m.status}`)}
                </Badge>
                <span className="truncate font-medium">{m.name}</span>
                {m.quantity != null && (
                  <span className="text-muted-foreground text-xs shrink-0">
                    {m.quantity} {m.unit ?? t('rooms.pieces')}
                  </span>
                )}
                {m.vendor_name && (
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">
                    {m.vendor_name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Material Detail Dialog */}
      <MaterialDetailDialog
        materialId={selectedMaterialId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      {/* Create Purchase Order Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('rooms.createPOForRoom', 'Create Purchase Order')}</DialogTitle>
            <DialogDescription>
              {t('rooms.poWillBeLinkedToRoom', 'The purchase order will be linked to this room')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="po-name">{t('purchases.materialName')} *</Label>
              <Input
                id="po-name"
                value={poName}
                onChange={(e) => setPoName(e.target.value)}
                placeholder={t('rooms.poNamePlaceholder', 'e.g. Floor tiles, Paint')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po-quantity">{t('common.quantity')}</Label>
                <Input
                  id="po-quantity"
                  type="number"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="po-unit">{t('common.unit')}</Label>
                <Select value={poUnit} onValueChange={setPoUnit}>
                  <SelectTrigger id="po-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">{t('taskPanel.pieces', 'pcs')}</SelectItem>
                    <SelectItem value="sqm">{t('taskPanel.squareMeters', 'm²')}</SelectItem>
                    <SelectItem value="m">{t('taskPanel.meters', 'm')}</SelectItem>
                    <SelectItem value="kg">{t('taskPanel.kilograms', 'kg')}</SelectItem>
                    <SelectItem value="liters">{t('taskPanel.liters', 'liters')}</SelectItem>
                    <SelectItem value="hours">{t('taskPanel.hours', 'hours')}</SelectItem>
                    <SelectItem value="days">{t('taskPanel.days', 'days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="po-price-per-unit">{t('purchases.pricePerUnit')} ({t('common.optional')})</Label>
              <Input
                id="po-price-per-unit"
                type="number"
                value={poPricePerUnit}
                onChange={(e) => setPoPricePerUnit(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {poQuantity && poPricePerUnit && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('purchases.priceTotal')}: {(parseFloat(poQuantity) * parseFloat(poPricePerUnit)).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreatePurchaseOrder}
                disabled={creatingPO || !poName.trim()}
                className="flex-1"
              >
                {creatingPO ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('purchases.creating', 'Creating...')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchases.createOrder', 'Create Order')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPoDialogOpen(false)}
                disabled={creatingPO}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
