/**
 * Pinterest API Integration Service
 *
 * Handles OAuth flow, token management, and API calls to Pinterest v5 API
 * Documentation: https://developers.pinterest.com/docs/api/v5/
 */

import { supabase } from "@/integrations/supabase/client";

// Pinterest API Configuration
// These should be set in environment variables
const PINTEREST_CLIENT_ID = import.meta.env.VITE_PINTEREST_CLIENT_ID || '';
const PINTEREST_CLIENT_SECRET = import.meta.env.VITE_PINTEREST_CLIENT_SECRET || '';
const PINTEREST_REDIRECT_URI = import.meta.env.VITE_PINTEREST_REDIRECT_URI || `${window.location.origin}/pinterest/callback`;

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const PINTEREST_AUTH_URL = 'https://www.pinterest.com/oauth/';

// Scopes we need for reading boards and pins
const PINTEREST_SCOPES = [
  'boards:read',
  'pins:read',
  'user_accounts:read'
].join(',');

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  follower_count: number;
  image_cover_url?: string;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  media: {
    media_type: 'image' | 'video';
    images?: {
      '150x150'?: { url: string };
      '400x300'?: { url: string };
      '600x'?: { url: string };
      '1200x'?: { url: string };
      original?: { url: string; width: number; height: number };
    };
  };
  board_id: string;
  created_at: string;
}

export interface PinterestUser {
  username: string;
  account_type: string;
  profile_image?: string;
  website_url?: string;
}

export interface PinterestTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Generate the Pinterest OAuth authorization URL
 */
export function getPinterestAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: PINTEREST_CLIENT_ID,
    redirect_uri: PINTEREST_REDIRECT_URI,
    response_type: 'code',
    scope: PINTEREST_SCOPES,
    state: state || generateState(),
  });

  return `${PINTEREST_AUTH_URL}?${params.toString()}`;
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<PinterestTokens | null> {
  try {
    const response = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: PINTEREST_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Pinterest token exchange error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Pinterest token exchange failed:', error);
    return null;
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<PinterestTokens | null> {
  try {
    const response = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Pinterest token refresh error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Pinterest token refresh failed:', error);
    return null;
  }
}

/**
 * Store Pinterest tokens in Supabase
 */
export async function storePinterestTokens(
  tokens: PinterestTokens,
  pinterestUserId?: string,
  pinterestUsername?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error } = await supabase
      .from('pinterest_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        pinterest_user_id: pinterestUserId,
        pinterest_username: pinterestUsername,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error storing Pinterest tokens:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to store Pinterest tokens:', error);
    return false;
  }
}

/**
 * Get stored Pinterest tokens for the current user
 */
export async function getPinterestTokens(): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: string;
  pinterest_username?: string;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('pinterest_tokens')
      .select('access_token, refresh_token, expires_at, pinterest_username')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(data.expires_at);
    if (expiresAt <= new Date()) {
      const newTokens = await refreshAccessToken(data.refresh_token);
      if (newTokens) {
        await storePinterestTokens(newTokens);
        return {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          pinterest_username: data.pinterest_username,
        };
      }
      return null; // Token refresh failed
    }

    return data;
  } catch (error) {
    console.error('Failed to get Pinterest tokens:', error);
    return null;
  }
}

/**
 * Check if user is connected to Pinterest
 */
export async function isPinterestConnected(): Promise<boolean> {
  const tokens = await getPinterestTokens();
  return tokens !== null;
}

/**
 * Disconnect Pinterest (remove stored tokens)
 */
export async function disconnectPinterest(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('pinterest_tokens')
      .delete()
      .eq('user_id', user.id);

    return !error;
  } catch (error) {
    console.error('Failed to disconnect Pinterest:', error);
    return false;
  }
}

/**
 * Make an authenticated request to Pinterest API
 */
async function pinterestApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const tokens = await getPinterestTokens();
  if (!tokens) return null;

  try {
    const response = await fetch(`${PINTEREST_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Pinterest API error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Pinterest API request failed:', error);
    return null;
  }
}

/**
 * Get current Pinterest user info
 */
export async function getPinterestUser(): Promise<PinterestUser | null> {
  const result = await pinterestApiRequest<PinterestUser>('/user_account');
  return result;
}

/**
 * Get user's Pinterest boards
 */
export async function getPinterestBoards(pageSize = 25, bookmark?: string): Promise<{
  items: PinterestBoard[];
  bookmark?: string;
} | null> {
  const params = new URLSearchParams({
    page_size: pageSize.toString(),
    privacy: 'ALL', // Get all boards including secret
  });

  if (bookmark) {
    params.set('bookmark', bookmark);
  }

  const result = await pinterestApiRequest<{
    items: PinterestBoard[];
    bookmark?: string;
  }>(`/boards?${params.toString()}`);

  return result;
}

/**
 * Get pins from a specific board
 */
export async function getBoardPins(boardId: string, pageSize = 25, bookmark?: string): Promise<{
  items: PinterestPin[];
  bookmark?: string;
} | null> {
  const params = new URLSearchParams({
    page_size: pageSize.toString(),
  });

  if (bookmark) {
    params.set('bookmark', bookmark);
  }

  const result = await pinterestApiRequest<{
    items: PinterestPin[];
    bookmark?: string;
  }>(`/boards/${boardId}/pins?${params.toString()}`);

  return result;
}

/**
 * Get a single pin by ID
 */
export async function getPin(pinId: string): Promise<PinterestPin | null> {
  const result = await pinterestApiRequest<PinterestPin>(`/pins/${pinId}`);
  return result;
}

/**
 * Get user's saved pins (not on any specific board)
 */
export async function getUserPins(pageSize = 25, bookmark?: string): Promise<{
  items: PinterestPin[];
  bookmark?: string;
} | null> {
  const params = new URLSearchParams({
    page_size: pageSize.toString(),
  });

  if (bookmark) {
    params.set('bookmark', bookmark);
  }

  const result = await pinterestApiRequest<{
    items: PinterestPin[];
    bookmark?: string;
  }>(`/pins?${params.toString()}`);

  return result;
}

/**
 * Get the best available image URL from a pin
 */
export function getPinImageUrl(pin: PinterestPin, preferredSize: 'small' | 'medium' | 'large' | 'original' = 'large'): string | null {
  const images = pin.media?.images;
  if (!images) return null;

  switch (preferredSize) {
    case 'original':
      return images.original?.url || images['1200x']?.url || images['600x']?.url || null;
    case 'large':
      return images['1200x']?.url || images.original?.url || images['600x']?.url || null;
    case 'medium':
      return images['600x']?.url || images['400x300']?.url || images['1200x']?.url || null;
    case 'small':
      return images['400x300']?.url || images['150x150']?.url || images['600x']?.url || null;
    default:
      return images['600x']?.url || images.original?.url || null;
  }
}

/**
 * Check if Pinterest credentials are configured
 */
export function isPinterestConfigured(): boolean {
  return !!(PINTEREST_CLIENT_ID && PINTEREST_CLIENT_SECRET);
}
