"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadScript(siteKey: string): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve();
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA could not be loaded."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Returns a fresh reCAPTCHA v3 token for `action`, or null if
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY isn't configured — callers should treat a
 * null token the same as "not configured", not as a hard failure (the
 * server-side verifyRecaptcha() also passes everything through when its
 * secret key isn't set, so the two stay in sync).
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;
  try {
    await loadScript(siteKey);
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(siteKey, { action }).then(resolve).catch(reject);
      });
    });
  } catch {
    return null;
  }
}
