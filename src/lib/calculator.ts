export type LaborBasis = "burdened" | "shop";
export type PartsMode = "markup" | "sellPrice";
export type AllocationMode = "fixed" | "percent";
export type PricingMode = "margin" | "markup";

export type FlatRateForm = {
  taskHours: string;
  laborBasis: LaborBasis;
  laborRate: string;
  partsCost: string;
  partsMode: PartsMode;
  partsMarkupPercent: string;
  partsSellPrice: string;
  overheadMode: AllocationMode;
  fixedOverhead: string;
  overheadPercent: string;
  reserveMode: AllocationMode;
  fixedReserve: string;
  reservePercent: string;
  pricingMode: PricingMode;
  targetMarginPercent: string;
  markupPercent: string;
  memberDiscountPercent: string;
  afterHoursSurchargePercent: string;
};

export const EMPTY_FORM: FlatRateForm = {
  taskHours: "",
  laborBasis: "burdened",
  laborRate: "",
  partsCost: "",
  partsMode: "markup",
  partsMarkupPercent: "",
  partsSellPrice: "",
  overheadMode: "fixed",
  fixedOverhead: "",
  overheadPercent: "",
  reserveMode: "percent",
  fixedReserve: "",
  reservePercent: "",
  pricingMode: "margin",
  targetMarginPercent: "",
  markupPercent: "",
  memberDiscountPercent: "",
  afterHoursSurchargePercent: "",
};

export const LIMITS = { money: 10_000_000, hours: 10_000, percent: 10_000 };

export type FlatRateResult = {
  valid: boolean;
  errors: Record<string, string>;
  laborCostCents: number;
  partsCostCents: number;
  directCostCents: number;
  overheadCents: number;
  reserveCents: number;
  fullInternalCostCents: number;
  partsSellPriceCents: number;
  pricingBasisCents: number;
  standardPriceCents: number | null;
  memberPriceCents: number | null;
  afterHoursPriceCents: number | null;
  grossProfitCents: number | null;
  grossMarginPercent: number | null;
  markupPercent: number | null;
};

const numeric = (value: string) => {
  if (value.trim() === "") return 0;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const moneyToCents = (value: string) => {
  const number = numeric(value);
  if (number === null || number > LIMITS.money) return null;
  return Math.round((number + Number.EPSILON) * 100);
};

const toMicros = (value: string, limit: number) => {
  const number = numeric(value);
  if (number === null || number > limit) return null;
  return Math.round(number * 1_000_000);
};

const roundedMultiply = (a: number, b: number, divisor: number) =>
  Number((BigInt(a) * BigInt(b) + BigInt(divisor) / 2n) / BigInt(divisor));

const cents = (value: string) => moneyToCents(value) ?? 0;
const micros = (value: string, limit: number) => toMicros(value, limit) ?? 0;

function validate(form: FlatRateForm) {
  const errors: Record<string, string> = {};
  for (const field of ["laborRate", "partsCost", "partsSellPrice", "fixedOverhead", "fixedReserve"] as const) {
    if (moneyToCents(form[field]) === null) errors[field] = `Enter an amount from $0 to $${LIMITS.money.toLocaleString()}.`;
  }
  if (toMicros(form.taskHours, LIMITS.hours) === null) errors.taskHours = `Enter hours from 0 to ${LIMITS.hours.toLocaleString()}.`;
  else if (!form.taskHours.trim() || Number(form.taskHours) <= 0) errors.taskHours = "Enter book time greater than 0 hours.";

  const percentFields = ["partsMarkupPercent", "overheadPercent", "reservePercent", "markupPercent", "memberDiscountPercent", "afterHoursSurchargePercent"] as const;
  for (const field of percentFields) {
    const value = numeric(form[field]);
    if (value === null || value > LIMITS.percent) errors[field] = `Enter 0% to ${LIMITS.percent.toLocaleString()}%.`;
  }
  if (form.partsMode === "markup" && !form.partsMarkupPercent.trim()) errors.partsMarkupPercent = "Enter a parts markup, or use 0%.";
  if (form.partsMode === "sellPrice" && !form.partsSellPrice.trim()) errors.partsSellPrice = "Enter the direct parts selling price.";
  if (form.overheadMode === "percent" && !form.overheadPercent.trim()) errors.overheadPercent = "Enter an overhead allocation percentage, or use 0%.";
  if (form.reserveMode === "percent" && !form.reservePercent.trim()) errors.reservePercent = "Enter a callback reserve percentage, or use 0%.";
  if (form.pricingMode === "margin") {
    const margin = numeric(form.targetMarginPercent);
    if (!form.targetMarginPercent.trim()) errors.targetMarginPercent = "Enter a target gross margin.";
    else if (margin === null || margin >= 100) errors.targetMarginPercent = "Target margin must be from 0% to less than 100%.";
  } else if (!form.markupPercent.trim()) {
    errors.markupPercent = "Enter a pricing markup, or use 0%.";
  }
  const discount = numeric(form.memberDiscountPercent);
  if (discount !== null && discount > 100) errors.memberDiscountPercent = "Member discount cannot exceed 100%.";
  return errors;
}

export function calculateFlatRate(form: FlatRateForm): FlatRateResult {
  const errors = validate(form);
  const laborCostCents = roundedMultiply(cents(form.laborRate), micros(form.taskHours, LIMITS.hours), 1_000_000);
  const partsCostCents = cents(form.partsCost);
  const directCostCents = laborCostCents + partsCostCents;
  const overheadCents = form.overheadMode === "fixed"
    ? cents(form.fixedOverhead)
    : roundedMultiply(directCostCents, micros(form.overheadPercent, LIMITS.percent), 100_000_000);
  const costBeforeReserve = directCostCents + overheadCents;
  const reserveCents = form.reserveMode === "fixed"
    ? cents(form.fixedReserve)
    : roundedMultiply(costBeforeReserve, micros(form.reservePercent, LIMITS.percent), 100_000_000);
  const fullInternalCostCents = costBeforeReserve + reserveCents;
  const partsSellPriceCents = form.partsMode === "sellPrice"
    ? cents(form.partsSellPrice)
    : roundedMultiply(partsCostCents, 100_000_000 + micros(form.partsMarkupPercent, LIMITS.percent), 100_000_000);
  const nonPartsCostCents = fullInternalCostCents - partsCostCents;
  const pricingBasisCents = nonPartsCostCents + partsSellPriceCents;
  const valid = Object.keys(errors).length === 0;
  let standardPriceCents: number | null = null;
  if (valid) {
    standardPriceCents = form.pricingMode === "margin"
      ? roundedMultiply(pricingBasisCents, 100_000_000, 100_000_000 - micros(form.targetMarginPercent, 100))
      : roundedMultiply(pricingBasisCents, 100_000_000 + micros(form.markupPercent, LIMITS.percent), 100_000_000);
  }
  const memberPriceCents = standardPriceCents === null ? null
    : roundedMultiply(standardPriceCents, 100_000_000 - micros(form.memberDiscountPercent, 100), 100_000_000);
  const afterHoursPriceCents = standardPriceCents === null ? null
    : roundedMultiply(standardPriceCents, 100_000_000 + micros(form.afterHoursSurchargePercent, LIMITS.percent), 100_000_000);
  const grossProfitCents = standardPriceCents === null ? null : standardPriceCents - fullInternalCostCents;
  const grossMarginPercent = standardPriceCents && grossProfitCents !== null ? grossProfitCents / standardPriceCents * 100 : grossProfitCents === 0 ? 0 : null;
  const markupPercent = fullInternalCostCents && grossProfitCents !== null ? grossProfitCents / fullInternalCostCents * 100 : grossProfitCents === 0 ? 0 : null;
  return {
    valid, errors, laborCostCents, partsCostCents, directCostCents, overheadCents, reserveCents,
    fullInternalCostCents, partsSellPriceCents, pricingBasisCents, standardPriceCents, memberPriceCents,
    afterHoursPriceCents, grossProfitCents, grossMarginPercent, markupPercent,
  };
}

export const formatMoney = (value: number | null) => value === null
  ? "Not available"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

export const formatPercent = (value: number | null) => value === null || !Number.isFinite(value)
  ? "Not available"
  : `${value.toFixed(1)}%`;

