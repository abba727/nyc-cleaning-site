import { useEffect } from "react";

type TrackingConfiguration = {
  googleAnalyticsMeasurementId?: string | null;
  googleTagManagerContainerId?: string | null;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = /^G-[A-Z0-9-]+$/;
const GTM_CONTAINER_ID = /^GTM-[A-Z0-9-]+$/;

function appendScript(source: string, marker: string) {
  if (document.querySelector(`script[data-nyc-tracking="${marker}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = source;
  script.dataset.nycTracking = marker;
  document.head.appendChild(script);
}

function initializeTagManager(containerId: string) {
  if (!GTM_CONTAINER_ID.test(containerId)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  appendScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`, `gtm-${containerId}`);
}

function initializeGoogleAnalytics(measurementId: string) {
  if (!GA4_MEASUREMENT_ID.test(measurementId)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
  appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, `ga-${measurementId}`);
}

/**
 * Loads the configured public tracking after the browser has had an opportunity
 * to render the primary content. GTM takes precedence over a direct GA4 tag so
 * page views cannot be double-counted when both fields are configured in CMS.
 */
export function TrackingInitializer() {
  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;
    let idleHandle: number | undefined;

    const initialize = async () => {
      try {
        const response = await fetch("/api/tracking-config", { credentials: "same-origin" });
        if (!response.ok || cancelled) return;
        const config = await response.json() as TrackingConfiguration;
        if (cancelled) return;

        const containerId = config.googleTagManagerContainerId?.trim().toUpperCase() || "";
        const measurementId = config.googleAnalyticsMeasurementId?.trim().toUpperCase() || "";
        if (GTM_CONTAINER_ID.test(containerId)) initializeTagManager(containerId);
        else if (GA4_MEASUREMENT_ID.test(measurementId)) initializeGoogleAnalytics(measurementId);
      } catch {
        // Tracking must never affect the public page if the optional configuration
        // request is unavailable.
      }
    };

    if (window.requestIdleCallback) {
      idleHandle = window.requestIdleCallback(() => void initialize(), { timeout: 1800 });
    } else {
      fallbackTimer = window.setTimeout(() => void initialize(), 900);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
