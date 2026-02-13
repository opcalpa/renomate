/**
 * useGuestMode Hook
 * Provides access to guest mode context throughout the app
 */

import { useContext } from 'react';
import { GuestContext, GuestContextType } from '@/contexts/GuestContext';

export function useGuestMode(): GuestContextType {
  const context = useContext(GuestContext);

  if (!context) {
    throw new Error('useGuestMode must be used within a GuestProvider');
  }

  return context;
}
