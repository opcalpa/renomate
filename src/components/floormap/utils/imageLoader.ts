/**
 * Image loader and cache for sprite-based 2D rendering
 *
 * Provides efficient loading and caching of object sprite images
 */

// Image cache to avoid redundant loading
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

/**
 * Load an image from URL and cache it
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  // Return cached image if available
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Return existing loading promise if in progress
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Create new loading promise
  const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(url, img);
      loadingPromises.delete(url);
      resolve(img);
    };

    img.onerror = (err) => {
      loadingPromises.delete(url);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });

  loadingPromises.set(url, loadPromise);
  return loadPromise;
}

/**
 * Get a cached image (synchronous, returns null if not loaded)
 */
export function getLoadedImage(url: string): HTMLImageElement | null {
  return imageCache.get(url) || null;
}

/**
 * Check if an image is cached
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(url => loadImage(url).catch(() => null)));
}

/**
 * Preload object sprites for a list of object IDs
 */
export async function preloadObjectSprites(objectIds: string[]): Promise<void> {
  // Import the object definitions to get sprite URLs
  const { getObjectDefinition } = await import('../objectLibraryDefinitions');

  const urls: string[] = [];
  for (const id of objectIds) {
    const def = getObjectDefinition(id);
    if (def?.assets?.sprite2D) {
      urls.push(def.assets.sprite2D);
    }
    if (def?.assets?.thumbnail) {
      urls.push(def.assets.thumbnail);
    }
  }

  await preloadImages(urls);
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): { size: number; loading: number } {
  return {
    size: imageCache.size,
    loading: loadingPromises.size,
  };
}
