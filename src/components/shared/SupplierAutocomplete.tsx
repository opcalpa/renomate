import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  profileId: string | null;
  suppliers: { id: string; name: string }[];
  value: string;
  onChange: (supplierId: string | null, supplierName: string) => void;
  onCreated?: () => void;
  className?: string;
  placeholder?: string;
  compact?: boolean;
}

export function SupplierAutocomplete({
  profileId,
  suppliers,
  value,
  onChange,
  onCreated,
  className,
  placeholder,
  compact,
}: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  const filtered = input.trim()
    ? suppliers.filter(s => s.name.toLowerCase().includes(input.trim().toLowerCase()))
    : suppliers;

  const exactMatch = suppliers.find(s => s.name.toLowerCase() === input.trim().toLowerCase());

  const handleSelect = (supplier: { id: string; name: string }) => {
    setInput(supplier.name);
    setOpen(false);
    onChange(supplier.id, supplier.name);
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    setOpen(false);
    if (!trimmed) {
      onChange(null, "");
      return;
    }
    if (exactMatch) {
      onChange(exactMatch.id, exactMatch.name);
      return;
    }
    // Create new supplier
    if (!profileId) return;
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ profile_id: profileId, name: trimmed })
      .select("id")
      .single();
    if (!error && data) {
      onChange(data.id, trimmed);
      onCreated?.();
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Input
        type="text"
        className={cn(compact ? "h-7 text-xs" : "h-9", "w-full")}
        placeholder={placeholder || t("budget.supplierPlaceholder", "Skriv leverantörsnamn...")}
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => { setTimeout(() => { setOpen(false); handleSubmit(); }, 150); }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-full bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto mt-1">
          {filtered.map(s => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted truncate"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              {s.name}
            </button>
          ))}
          {input.trim() && !exactMatch && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t">
              Enter → {t("budget.createNewSupplier", "skapa ny")} &ldquo;{input.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
