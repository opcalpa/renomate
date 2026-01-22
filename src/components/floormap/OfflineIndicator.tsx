import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Your changes will now sync.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline. Changes will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Badge
      variant="outline"
      className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur border-warning text-warning px-3 py-2 animate-fade-in"
    >
      <WifiOff className="h-4 w-4 mr-2" />
      Offline Mode - Changes saved locally
    </Badge>
  );
};
