/**
 * Pinterest Connect Button Component
 *
 * Handles OAuth connection flow with Pinterest
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  isPinterestConnected,
  isPinterestConfigured,
  getPinterestAuthUrl,
  getPinterestTokens,
  disconnectPinterest,
} from "@/services/pinterest";

// Pinterest brand color
const PINTEREST_RED = "#E60023";

// Pinterest Logo SVG
const PinterestLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

interface PinterestConnectProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
  compact?: boolean;
}

export function PinterestConnect({
  onConnected,
  onDisconnected,
  compact = false,
}: PinterestConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  // Listen for OAuth callback message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PINTEREST_AUTH_SUCCESS') {
        setIsConnected(true);
        setUsername(event.data.username || null);
        onConnected?.();
        toast.success("Pinterest kopplat!");
      } else if (event.data?.type === 'PINTEREST_AUTH_ERROR') {
        toast.error("Kunde inte ansluta till Pinterest");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnected]);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await isPinterestConnected();
      setIsConnected(connected);

      if (connected) {
        const tokens = await getPinterestTokens();
        setUsername(tokens?.pinterest_username || null);
      }
    } catch (error) {
      console.error("Error checking Pinterest connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!isPinterestConfigured()) {
      toast.error("Pinterest är inte konfigurerat. Kontakta administratören.");
      return;
    }

    // Open Pinterest OAuth in a popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authUrl = getPinterestAuthUrl();
    const popup = window.open(
      authUrl,
      'pinterest-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    // Check if popup was blocked
    if (!popup) {
      toast.error("Popup blockerad. Tillåt popups för denna sida.");
      return;
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Är du säker på att du vill koppla bort Pinterest?")) return;

    setIsLoading(true);
    try {
      const success = await disconnectPinterest();
      if (success) {
        setIsConnected(false);
        setUsername(null);
        onDisconnected?.();
        toast.success("Pinterest bortkopplat");
      } else {
        toast.error("Kunde inte koppla bort Pinterest");
      }
    } catch (error) {
      console.error("Error disconnecting Pinterest:", error);
      toast.error("Ett fel uppstod");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={compact ? "h-9" : ""}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {!compact && "Laddar..."}
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <PinterestLogo className="h-4 w-4" style={{ color: PINTEREST_RED }} />
          <span className="text-sm text-green-700">
            {username ? `@${username}` : "Kopplad"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-gray-500 hover:text-red-500"
        >
          Koppla bort
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleConnect}
      className={`gap-2 ${compact ? "h-9" : ""}`}
      style={{
        borderColor: PINTEREST_RED,
        color: PINTEREST_RED,
      }}
    >
      <PinterestLogo className="h-4 w-4" />
      {!compact && "Koppla Pinterest"}
    </Button>
  );
}

export default PinterestConnect;
