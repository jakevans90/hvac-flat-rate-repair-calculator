import { EMPTY_FORM, type FlatRateForm } from "./calculator.ts";

export const DRAFT_STORAGE_KEY = "hvac-flat-rate-repair-calculator:draft:v1";
const VERSION = 1;

export const serializeDraft = (form: FlatRateForm) => JSON.stringify({ version: VERSION, form });

export function parseDraft(raw: string): { form: FlatRateForm } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== VERSION || !record.form || typeof record.form !== "object") return null;
    const form = record.form as Record<string, unknown>;
    for (const [key, value] of Object.entries(EMPTY_FORM)) {
      if (typeof form[key] !== typeof value) return null;
    }
    if (!["burdened", "shop"].includes(form.laborBasis as string)) return null;
    if (!["markup", "sellPrice"].includes(form.partsMode as string)) return null;
    if (!["fixed", "percent"].includes(form.overheadMode as string)) return null;
    if (!["fixed", "percent"].includes(form.reserveMode as string)) return null;
    if (!["margin", "markup"].includes(form.pricingMode as string)) return null;
    return { form: form as FlatRateForm };
  } catch {
    return null;
  }
}

