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
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<GuestStorageUsage>({
    used: 0,
    limit: 5 * 1024 * 1024,
    percentage: 0,
  });

  // Initialize from localStorage on mount
  useEffect(() => {
    const state = getGuestModeState();
    setIsGuest(state.isGuest);
    setGuestId(state.guestId);
    if (state.isGuest) {
      setStorageUsage(getStorageUsage());
    }
  }, []);

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
