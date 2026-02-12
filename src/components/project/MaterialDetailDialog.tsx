import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Package, ExternalLink, User, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";

interface MaterialDetailDialogProps {
  materialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  currency?: string | null;
}

interface MaterialDetail {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  price_total: number | null;
  vendor_name: string | null;
  vendor_link: string | null;
  status: string;
  exclude_from_budget: boolean;
  notes: string | null;
  created_at: string;
  room?: { name: string } | null;
  task?: { title: string } | null;
  creator?: { name: string } | null;
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
    case "ordered":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "delivered":
      return "bg-teal-100 text-teal-700 border-teal-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const MaterialDetailDialog = ({
  materialId,
  open,
  onOpenChange,
  onEdit,
  currency,
}: MaterialDetailDialogProps) => {
  const { t } = useTranslation();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (materialId && open) {
      fetchMaterialDetails();
    }
  }, [materialId, open]);

  const fetchMaterialDetails = async () => {
    if (!materialId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          *,
          room:rooms(name),
          task:tasks(title),
          creator:profiles!materials_created_by_user_id_fkey(name)
        `)
        .eq("id", materialId)
        .single();

      if (error) throw error;
      setMaterial(data);
    } catch (error) {
      console.error("Error fetching material details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!material) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-lg max-h-screen md:max-h-[85vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl pr-8">{material.name}</DialogTitle>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            {t('purchases.title')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getStatusColor(material.status)}>
                {t(`materialStatuses.${material.status}`)}
              </Badge>
              {material.exclude_from_budget && (
                <Badge variant="secondary" className="text-xs">
                  {t('purchases.excludedFromBudget', 'Excluded from budget')}
                </Badge>
              )}
            </div>

            {/* Quantity and Price */}
            <div className="flex items-start gap-2">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">{t('common.quantity')}</h3>
                <p className="text-sm text-muted-foreground">
                  {material.quantity ?? '-'} {material.unit ?? ''}
                </p>
              </div>
            </div>

            {/* Price Info */}
            {(material.price_per_unit || material.price_total) && (
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                {material.price_per_unit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('purchases.pricePerUnit')}</span>
                    <span>{formatCurrency(material.price_per_unit, currency)}</span>
                  </div>
                )}
                {material.price_total && (
                  <div className="flex justify-between text-sm font-medium">
                    <span>{t('purchases.priceTotal')}</span>
                    <span>{formatCurrency(material.price_total, currency)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Vendor */}
            {material.vendor_name && (
              <div>
                <h3 className="font-medium mb-1">{t('purchases.vendor')}</h3>
                {material.vendor_link ? (
                  <a
                    href={material.vendor_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {material.vendor_name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">{material.vendor_name}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {material.notes && (
              <div>
                <h3 className="font-medium mb-1">{t('common.notes')}</h3>
                <p className="text-sm text-muted-foreground">{material.notes}</p>
              </div>
            )}

            {/* Linked Room/Task */}
            {(material.room || material.task) && (
              <div className="border-t pt-3">
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">{t('purchases.linkedTo', 'Linked to')}</h3>
                <div className="space-y-1 text-sm">
                  {material.room && (
                    <p>{t('common.room')}: {material.room.name}</p>
                  )}
                  {material.task && (
                    <p>{t('common.task')}: {material.task.title}</p>
                  )}
                </div>
              </div>
            )}

            {/* Creator */}
            {material.creator?.name && (
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">{t('purchases.addedBy')}</h3>
                  <p className="text-sm text-muted-foreground">{material.creator.name}</p>
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="text-xs text-muted-foreground pt-4 border-t">
              {t('common.created')} {format(parseISO(material.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MaterialDetailDialog;
