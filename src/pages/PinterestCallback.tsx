/**
 * Pinterest OAuth Callback Page
 *
 * Handles the OAuth redirect from Pinterest and exchanges the code for tokens
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  exchangeCodeForTokens,
  storePinterestTokens,
  getPinterestUser,
} from "@/services/pinterest";

export default function PinterestCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Ansluter till Pinterest...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Pinterest
    if (error) {
      setStatus('error');
      setMessage(errorDescription || 'Pinterest nekade åtkomst');
      notifyOpener('error', errorDescription);
      return;
    }

    // Check for authorization code
    if (!code) {
      setStatus('error');
      setMessage('Ingen auktoriseringskod mottagen');
      notifyOpener('error', 'Ingen auktoriseringskod');
      return;
    }

    try {
      // Exchange code for tokens
      setMessage('Utbyter auktoriseringskod...');
      const tokens = await exchangeCodeForTokens(code);

      if (!tokens) {
        throw new Error('Kunde inte utbyta kod för tokens');
      }

      // Get Pinterest user info
      setMessage('Hämtar användarinfo...');

      // Store tokens first (with temporary user info)
      const stored = await storePinterestTokens(tokens);

      if (!stored) {
        throw new Error('Kunde inte spara tokens');
      }

      // Try to get user info (this requires the token to be stored first)
      let username: string | undefined;
      try {
        const user = await getPinterestUser();
        if (user) {
          username = user.username;
          // Update tokens with username
          await storePinterestTokens(tokens, undefined, username);
        }
      } catch (userError) {
        console.warn('Could not fetch Pinterest user info:', userError);
      }

      setStatus('success');
      setMessage('Pinterest kopplat!');
      notifyOpener('success', username);

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (error: any) {
      console.error('Pinterest OAuth error:', error);
      setStatus('error');
      setMessage(error.message || 'Ett fel uppstod');
      notifyOpener('error', error.message);
    }
  };

  const notifyOpener = (type: 'success' | 'error', data?: string) => {
    if (window.opener) {
      window.opener.postMessage({
        type: type === 'success' ? 'PINTEREST_AUTH_SUCCESS' : 'PINTEREST_AUTH_ERROR',
        username: type === 'success' ? data : undefined,
        error: type === 'error' ? data : undefined,
      }, window.location.origin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#E60023] mx-auto mb-4" />
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-600 font-medium">{message}</p>
            <p className="text-gray-500 text-sm mt-2">Detta fönster stängs automatiskt...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Stäng fönster
            </button>
          </>
        )}
      </div>
    </div>
  );
}
