export function isNativeAppPlatform() {
  if (typeof window === "undefined") return false;

  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; isNative?: boolean } }).Capacitor;
  if (typeof capacitor?.isNativePlatform === "function") {
    try {
      return capacitor.isNativePlatform();
    } catch {
      // Fall through to additional heuristics below.
    }
  }

  if (capacitor?.isNative) return true;

  const protocol = window.location.protocol;
  if (protocol === "capacitor:" || protocol === "ionic:") return true;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("capacitor");
}
