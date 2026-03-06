import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DemoViewRole } from "@/hooks/useDemoPreferences";

const SESSION_KEY = "demo-page-guide-seen";

function getSeenPages(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(key: string) {
  const seen = getSeenPages();
  seen.add(key);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen]));
}

interface DemoPageGuideProps {
  pageKey: string;
  role: DemoViewRole | null;
}

export function DemoPageGuide({ pageKey, role }: DemoPageGuideProps) {
  const { t } = useTranslation();
  const compositeKey = `${role}-${pageKey}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!role) return;
    const seen = getSeenPages();
    if (!seen.has(compositeKey)) {
      setOpen(true);
    }
  }, [compositeKey, role]);

  if (!role || !open) return null;

  const titleKey = `demoGuide.${role}.${pageKey}.title`;
  const bodyKey = `demoGuide.${role}.${pageKey}.body`;
  const tipKey = `demoGuide.${role}.${pageKey}.tip`;

  const title = t(titleKey, "");
  const body = t(bodyKey, "");
  const tip = t(tipKey, "");

  // No guide configured for this page/role
  if (!body) return null;

  const handleDismiss = () => {
    markSeen(compositeKey);
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          <AlertDialogDescription className="text-sm leading-relaxed whitespace-pre-line">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {tip && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
            {tip}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss}>
            {t("common.ok", "OK")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
