/**
 * Pinterest oEmbed Service
 * Fetches pin data via Supabase Edge Function (to avoid CORS)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ParsedPinData {
  pinId: string;
  title: string;
  imageUrl: string;
  authorName: string;
  authorUrl: string;
  sourceUrl: string;
  width: number;
  height: number;
}

/**
 * Validates and normalizes a Pinterest pin URL
 */
export function parsePinterestPinUrl(url: string): string | null {
  try {
    let cleanUrl = url.trim();

    // Add protocol if missing
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const urlObj = new URL(cleanUrl);

    // Check if it's a Pinterest domain
    if (!urlObj.hostname.includes('pinterest')) {
      return null;
    }

    // Check for pin URL patterns:
    // pinterest.com/pin/123456/
    // pinterest.se/pin/123456/
    // www.pinterest.com/pin/123456/
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'pin' && pathParts[1]) {
      // Valid pin URL
      return `https://www.pinterest.com/pin/${pathParts[1]}/`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches pin data via Supabase Edge Function (avoids CORS issues)
 */
export async function fetchPinterestPin(pinUrl: string): Promise<ParsedPinData> {
  const normalizedUrl = parsePinterestPinUrl(pinUrl);

  if (!normalizedUrl) {
    throw new Error('Ogiltig Pinterest pin URL. Använd format: pinterest.com/pin/123456789/');
  }

  try {
    const { data, error } = await supabase.functions.invoke('pinterest-oembed', {
      body: { pinUrl: normalizedUrl },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error('Kunde inte hämta pin-data. Försök igen senare.');
    }

    if (data.error) {
      if (data.error === 'Pin not found') {
        throw new Error('Pin hittades inte. Kontrollera att URL:en är korrekt.');
      }
      throw new Error(data.error);
    }

    return {
      pinId: data.pinId,
      title: data.title || 'Pinterest pin',
      imageUrl: data.imageUrl,
      authorName: data.authorName || '',
      authorUrl: data.authorUrl || '',
      sourceUrl: normalizedUrl,
      width: data.width || 0,
      height: data.height || 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Ett oväntat fel uppstod vid hämtning av pin.');
  }
}

/**
 * Fetches multiple pins
 */
export async function fetchMultiplePins(pinUrls: string[]): Promise<ParsedPinData[]> {
  const results: ParsedPinData[] = [];

  for (const url of pinUrls) {
    try {
      const pinData = await fetchPinterestPin(url);
      results.push(pinData);
    } catch (error) {
      console.error(`Failed to fetch pin ${url}:`, error);
      // Continue with other pins
    }
  }

  return results;
}
