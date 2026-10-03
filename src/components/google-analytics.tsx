"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, initializeAnalytics, trackToolVisit } from "@/lib/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    initializeAnalytics();
    if (pathname === "/" && previousPath.current !== "/") trackToolVisit();
    previousPath.current = pathname;
  }, [pathname]);

  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />;
}

