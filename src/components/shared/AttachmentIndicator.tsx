import { useTranslation } from "react-i18next";
import { Paperclip } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AttachmentIndicatorProps {
  hasAttachment: boolean;
  count?: number;
  size?: "sm" | "md";
}

export function AttachmentIndicator({
  hasAttachment,
  count = 1,
  size = "sm",
}: AttachmentIndicatorProps) {
  const { t } = useTranslation();

  if (!hasAttachment) return null;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5 text-emerald-600">
            <Paperclip className={iconSize} />
            {count > 1 && <span className={textSize}>{count}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("common.hasAttachment", { count })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
