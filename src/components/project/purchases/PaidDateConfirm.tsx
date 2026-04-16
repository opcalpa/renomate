import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck } from "lucide-react";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface PaidDateConfirmProps {
  open: boolean;
  materialName: string;
  onConfirm: (paidDate: string) => void;
  onCancel: () => void;
}

export function PaidDateConfirm({
  open,
  materialName,
  onConfirm,
  onCancel,
}: PaidDateConfirmProps) {
  const { t } = useTranslation();
  const [paidDate, setPaidDate] = useState(formatLocalDate(new Date()));

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            {t("purchases.confirmPaidDate", "Bekräfta betalningsdatum")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            <span className="font-medium text-foreground">{materialName}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.cancel", "Avbryt")}
          </AlertDialogCancel>
          <Button
            onClick={() => onConfirm(paidDate)}
            className="bg-green-600 hover:bg-green-700"
          >
            {t("purchases.markAsPaid", "Markera som betald")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
