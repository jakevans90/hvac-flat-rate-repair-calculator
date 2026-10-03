export const GA_MEASUREMENT_ID = "G-DW36H2JDZ2";
export const TOOL_NAME = "HVAC Flat Rate Repair Pricing Calculator";
export const VISITOR_STORAGE_KEY = `jakegenerates:visited:${TOOL_NAME}`;

type PricingMode = "margin" | "markup";
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    __jakeGeneratesGaInitialized?: boolean;
  }
}

let visitorType: "new" | "returning" | "unknown" | undefined;

export function initializeAnalytics(): Gtag | undefined {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    if (!window.__jakeGeneratesGaInitialized) {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID);
      window.__jakeGeneratesGaInitialized = true;
    }
    return window.gtag;
  } catch {
    return;
  }
}

function getVisitorType() {
  if (visitorType) return visitorType;
  visitorType = "unknown";
  try {
    visitorType = window.localStorage.getItem(VISITOR_STORAGE_KEY) ? "returning" : "new";
    window.localStorage.setItem(VISITOR_STORAGE_KEY, "1");
  } catch {
    visitorType = "unknown";
  }
  return visitorType;
}

function track(name: "tool_visit" | "tool_complete", pricingMode?: PricingMode) {
  try {
    const gtag = initializeAnalytics();
    if (!gtag) return false;
    gtag("event", name, {
      send_to: GA_MEASUREMENT_ID,
      tool_name: TOOL_NAME,
      tool_category: "calculator",
      visitor_type: getVisitorType(),
      ...(pricingMode ? { pricing_mode: pricingMode } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

export const trackToolVisit = () => track("tool_visit");
export const trackToolComplete = (pricingMode: PricingMode) => track("tool_complete", pricingMode);

