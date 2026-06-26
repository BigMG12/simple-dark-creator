/**
 * Client-side notification store for completed imports.
 * Tracks "viewed" state in localStorage so the nav dot disappears once the user
 * opens the imports dashboard.
 */

const STORAGE_KEY = "bigspeaking.imports.lastViewedAt";

/**
 * Returns count of unviewed completed imports.
 * Note: This is a placeholder that returns 0. In a real implementation,
 * this would need to be called from a React component that uses useChannelImports()
 * to get the actual import data.
 */
export function getUnviewedCompleteCount(): number {
  // Placeholder - actual implementation would require React context
  // to access useChannelImports() hook data
  return 0;
}

export function markImportsViewed() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  window.dispatchEvent(new Event("imports-viewed"));
}

export function subscribeImportsViewed(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("imports-viewed", cb);
  return () => window.removeEventListener("imports-viewed", cb);
}
