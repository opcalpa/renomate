/**
 * Hook for loading and caching object sprite images
 */

import { useState, useEffect } from 'react';
import { loadImage, getLoadedImage, isImageCached } from '../utils/imageLoader';

interface UseObjectImageResult {
  image: HTMLImageElement | null;
  loading: boolean;
  error: boolean;
}

/**
 * Hook to load an object sprite image with caching
 */
export function useObjectImage(url: string | undefined | null): UseObjectImageResult {
  const [image, setImage] = useState<HTMLImageElement | null>(() =>
    url ? getLoadedImage(url) : null
  );
  const [loading, setLoading] = useState<boolean>(() =>
    url ? !isImageCached(url) : false
  );
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!url) {
      setImage(null);
      setLoading(false);
      setError(false);
      return;
    }

    // Check if already cached
    const cached = getLoadedImage(url);
    if (cached) {
      setImage(cached);
      setLoading(false);
      setError(false);
      return;
    }

    // Load the image
    setLoading(true);
    setError(false);

    loadImage(url)
      .then((img) => {
        setImage(img);
        setLoading(false);
      })
      .catch(() => {
        setImage(null);
        setLoading(false);
        setError(true);
      });
  }, [url]);

  return { image, loading, error };
}

export default useObjectImage;
