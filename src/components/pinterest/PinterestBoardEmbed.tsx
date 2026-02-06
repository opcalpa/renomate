import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pinterest Logo SVG
const PinterestLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

interface PinterestBoardEmbedProps {
  boardUrl: string;
  onRemove?: () => void;
  editable?: boolean;
}

/**
 * Extracts username and board name from various Pinterest board URL formats
 */
function parsePinterestBoardUrl(url: string): { username: string; boardName: string } | null {
  try {
    // Handle various URL formats
    // https://pinterest.com/username/boardname/
    // https://www.pinterest.com/username/boardname/
    // https://pinterest.se/username/boardname/
    // pinterest.com/username/boardname

    let cleanUrl = url.trim();

    // Add protocol if missing
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const urlObj = new URL(cleanUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Need at least username and board name
    if (pathParts.length >= 2) {
      return {
        username: pathParts[0],
        boardName: pathParts[1],
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function PinterestBoardEmbed({ boardUrl, onRemove, editable = true }: PinterestBoardEmbedProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsed = parsePinterestBoardUrl(boardUrl);

  useEffect(() => {
    if (!parsed) {
      setError(t('pinterest.invalidUrl'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Load Pinterest SDK if not already loaded
    const loadPinterestSDK = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if already loaded
        if ((window as any).PinUtils) {
          resolve();
          return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="pinit.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Pinterest SDK')));
          return;
        }

        // Load the script
        const script = document.createElement('script');
        script.src = 'https://assets.pinterest.com/js/pinit.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          // Give Pinterest SDK time to initialize
          setTimeout(() => resolve(), 100);
        };
        script.onerror = () => reject(new Error('Failed to load Pinterest SDK'));
        document.body.appendChild(script);
      });
    };

    const initEmbed = async () => {
      try {
        await loadPinterestSDK();

        // Build the embed widget after SDK loads
        if (containerRef.current && (window as any).PinUtils) {
          (window as any).PinUtils.build();
        }

        setLoading(false);
      } catch (err) {
        console.error('Pinterest SDK error:', err);
        setError(t('pinterest.loadError'));
        setLoading(false);
      }
    };

    initEmbed();
  }, [boardUrl, parsed?.username, parsed?.boardName]);

  if (!parsed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{t('pinterest.invalidUrl')}</p>
        <p className="text-xs text-red-500 mt-1">{boardUrl}</p>
        {editable && onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="mt-2">
            {t('common.remove')}
          </Button>
        )}
      </div>
    );
  }

  const fullUrl = `https://www.pinterest.com/${parsed.username}/${parsed.boardName}/`;

  return (
    <div className="relative rounded-lg border border-[#E60023]/20 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <PinterestLogo className="h-4 w-4 text-[#E60023]" />
          <span className="text-sm font-medium text-gray-700">{t('pinterest.inspiration')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-gray-500 hover:text-gray-700"
            onClick={() => window.open(fullUrl, '_blank')}
            title={t('pinterest.openOnPinterest')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          {editable && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-500 hover:text-red-600"
              onClick={onRemove}
              title={t('pinterest.removeBoard')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Embed Container */}
      <div ref={containerRef} className="p-3 min-h-[200px] max-h-[400px] overflow-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <span className="text-sm">{t('pinterest.loading')}</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <PinterestLogo className="h-8 w-8 text-gray-300 mb-2" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Pinterest Widget - hidden until loaded */}
        <a
          data-pin-do="embedBoard"
          data-pin-board-width="100%"
          data-pin-scale-height="200"
          data-pin-scale-width="80"
          href={fullUrl}
          style={{ display: loading ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}

export { parsePinterestBoardUrl };
