/** Detect embedded / in-app browsers where Google OAuth is blocked (403 disallowed_useragent). */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";
  const uaLower = ua.toLowerCase();

  const inAppPatterns = [
    /fbav|fban|fb_iab/i, // Facebook
    /instagram/i,
    /twitter/i,
    /linkedinapp/i,
    /snapchat/i,
    /tiktok/i,
    /bytedance/i,
    /line\//i,
    /gsa\//i, // Google Search App (sometimes restricted)
    /wv\)/i, // Android WebView marker
    /; wv;/i,
  ];

  if (inAppPatterns.some((pattern) => pattern.test(ua))) return true;

  // iOS: Safari has "Safari" in UA; many in-app browsers omit it on iPhone/iPad.
  const isIos = /iphone|ipad|ipod/i.test(uaLower);
  const isSafari = /safari/i.test(uaLower);
  if (isIos && !isSafari && !/crios|fxios|edgios/i.test(uaLower)) return true;

  return false;
}

export function openInSystemBrowserHint(): string {
  if (typeof navigator === "undefined") {
    return "Open this page in Safari or Chrome, then try again.";
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "Tap the menu (⋯) at the top or bottom of the screen and choose “Open in Safari” or “Open in Browser”.";
  }
  if (/android/.test(ua)) {
    return "Tap the menu (⋮) and choose “Open in Chrome” or “Open in browser”.";
  }
  return "Open this page in Safari or Chrome (not inside Instagram, Facebook, or another app’s browser), then try again.";
}
