"use client";

import { useEffect } from "react";

const GA_ID = "G-CLEY1YQ80S";
const SCRIPT_ID = "deferred-google-analytics";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

export default function DeferredGoogleAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const loadAnalytics = () => {
      if (document.getElementById(SCRIPT_ID)) return;

      const win = window as AnalyticsWindow;
      win.dataLayer = win.dataLayer || [];
      win.gtag = function gtag() {
        win.dataLayer?.push(arguments as never);
      };

      win.gtag("js", new Date());
      win.gtag("config", GA_ID);

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
    };

    const timeout = window.setTimeout(loadAnalytics, 8000);
    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
