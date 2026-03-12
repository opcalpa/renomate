/**
 * Guest Mode Context
 * Provides guest mode state and actions throughout the app
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import {
  getGuestModeState,
  enterGuestMode as enterGuestModeStorage,
  exitGuestMode as exitGuestModeStorage,
  getStorageUsage,
  clearAllGuestData,
} from '@/services/guestStorageService';
import { supabase } from '@/integrations/supabase/client';
import type { GuestStorageUsage } from '@/types/guest.types';

export interface GuestContextType {
  isGuest: boolean;
  guestId: string | null;
  storageUsage: GuestStorageUsage;
  enterGuestMode: () => void;
  exitGuestMode: (clearData?: boolean) => void;
  refreshStorageUsage: () => void;
}

export const GuestContext = createContext<GuestContextType | null>(null);

interface GuestProviderProps {
  children: ReactNode;
}

export function GuestProvider({ children }: GuestProviderProps) {
  // Initialize synchronously from localStorage to avoid race conditions
  const [isGuest, setIsGuest] = useState(() => getGuestModeState().isGuest);
  const [guestId, setGuestId] = useState<string | null>(() => getGuestModeState().guestId);
  const [storageUsage, setStorageUsage] = useState<GuestStorageUsage>(() => {
    const state = getGuestModeState();
    return state.isGuest ? getStorageUsage() : { used: 0, limit: 5 * 1024 * 1024, percentage: 0 };
  });

  const enterGuestMode = useCallback(() => {
    const newGuestId = enterGuestModeStorage();
    setIsGuest(true);
    setGuestId(newGuestId);
    setStorageUsage(getStorageUsage());
  }, []);

  const exitGuestMode = useCallback((clearData = false) => {
    if (clearData) {
      clearAllGuestData();
    }
    exitGuestModeStorage();
    setIsGuest(false);
    setGuestId(null);
    setStorageUsage({ used: 0, limit: 5 * 1024 * 1024, percentage: 0 });
  }, []);

  const refreshStorageUsage = useCallback(() => {
    setStorageUsage(getStorageUsage());
  }, []);

  // Auto-exit guest mode when user signs in via OAuth or other auth method
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && isGuest) {
        exitGuestModeStorage();
        setIsGuest(false);
        setGuestId(null);
        setStorageUsage({ used: 0, limit: 5 * 1024 * 1024, percentage: 0 });
      }
    });

    return () => subscription.unsubscribe();
  }, [isGuest]);

  return (
    <GuestContext.Provider
      value={{
        isGuest,
        guestId,
        storageUsage,
        enterGuestMode,
        exitGuestMode,
        refreshStorageUsage,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}
