import { Trash2, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const UNITS = ["st", "m2", "m", "h", "kg"];

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isRotEligible: boolean;
  roomId?: string;
}

interface QuoteItemRowProps {
  item: QuoteItem;
  onChange: (id: string, updates: Partial<QuoteItem>) => void;
  onDelete: (id: string) => void;
  onImportRoom: (id: string) => void;
}

export function QuoteItemRow({ item, onChange, onDelete, onImportRoom }: QuoteItemRowProps) {
  const { t } = useTranslation();
  const lineTotal = item.quantity * item.unitPrice;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Input
        placeholder={t("quotes.description")}
        value={item.description}
        onChange={(e) => onChange(item.id, { description: e.target.value })}
        className="min-h-[48px]"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="number"
          placeholder={t("quotes.quantity")}
          value={item.quantity || ""}
          onChange={(e) => onChange(item.id, { quantity: parseFloat(e.target.value) || 0 })}
          className="min-h-[48px] sm:w-24"
          min={0}
          step="any"
        />
        <Select value={item.unit} onValueChange={(v) => onChange(item.id, { unit: v })}>
          <SelectTrigger className="min-h-[48px] sm:w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder={t("quotes.unitPrice")}
          value={item.unitPrice || ""}
          onChange={(e) => onChange(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
          className="min-h-[48px] sm:flex-1"
          min={0}
          step="any"
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 min-h-[48px]">
            <Checkbox
              checked={item.isRotEligible}
              onCheckedChange={(checked) => onChange(item.id, { isRotEligible: !!checked })}
            />
            <span className="text-sm">{t("quotes.rotEligible")}</span>
          </label>
          <span className="text-sm font-medium">
            {lineTotal.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px]" onClick={() => onImportRoom(item.id)}>
            <Ruler className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px] text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
