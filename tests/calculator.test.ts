import assert from "node:assert/strict";
import test from "node:test";
import { calculateFlatRate, EMPTY_FORM, moneyToCents, type FlatRateForm } from "../src/lib/calculator.ts";
import { parseDraft, serializeDraft } from "../src/lib/draft.ts";

const form = (overrides: Partial<FlatRateForm> = {}): FlatRateForm => ({
  ...EMPTY_FORM,
  taskHours: "1.5",
  laborRate: "45",
  partsCost: "80",
  partsMarkupPercent: "50",
  fixedOverhead: "25",
  reservePercent: "5",
  targetMarginPercent: "40",
  ...overrides,
});

test("matches the published worked example cent for cent", () => {
  const result = calculateFlatRate(form());
  assert.equal(result.laborCostCents, 6_750);
  assert.equal(result.partsCostCents, 8_000);
  assert.equal(result.overheadCents, 2_500);
  assert.equal(result.reserveCents, 863);
  assert.equal(result.fullInternalCostCents, 18_113);
  assert.equal(result.partsSellPriceCents, 12_000);
  assert.equal(result.pricingBasisCents, 22_113);
  assert.equal(result.standardPriceCents, 36_855);
  assert.equal(result.grossProfitCents, 18_742);
  assert.ok(Math.abs((result.grossMarginPercent ?? 0) - 50.8533) < 0.001);
  assert.ok(Math.abs((result.markupPercent ?? 0) - 103.4726) < 0.001);
});

test("calculates optional member and after-hours prices independently", () => {
  const result = calculateFlatRate(form({ memberDiscountPercent: "10", afterHoursSurchargePercent: "25" }));
  assert.equal(result.memberPriceCents, 33_170);
  assert.equal(result.afterHoursPriceCents, 46_069);
});

test("supports a direct parts selling amount", () => {
  const result = calculateFlatRate(form({ partsMode: "sellPrice", partsSellPrice: "150" }));
  assert.equal(result.partsSellPriceCents, 15_000);
  assert.equal(result.pricingBasisCents, 25_113);
  assert.equal(result.standardPriceCents, 41_855);
});

test("supports percentage overhead and fixed callback reserve", () => {
  const result = calculateFlatRate(form({ overheadMode: "percent", overheadPercent: "10", reserveMode: "fixed", fixedReserve: "12.34" }));
  assert.equal(result.directCostCents, 14_750);
  assert.equal(result.overheadCents, 1_475);
  assert.equal(result.reserveCents, 1_234);
  assert.equal(result.fullInternalCostCents, 17_459);
});

test("supports markup pricing and reports the actual internal-cost result", () => {
  const result = calculateFlatRate(form({ pricingMode: "markup", markupPercent: "25" }));
  assert.equal(result.standardPriceCents, 27_641);
  assert.equal(result.grossProfitCents, 9_528);
  assert.ok((result.grossMarginPercent ?? 0) > 34);
  assert.ok((result.markupPercent ?? 0) > 52);
});

test("uses deterministic cents for decimal hours and rates", () => {
  const result = calculateFlatRate(form({ taskHours: "1.333333", laborRate: "47.89" }));
  assert.equal(result.laborCostCents, 6_385);
});

test("parses ordinary money inputs to cents", () => {
  assert.equal(moneyToCents("19.99"), 1_999);
  assert.equal(moneyToCents("0.005"), 1);
  assert.equal(moneyToCents(""), 0);
});

test("rejects missing book time and target margin at 100 percent", () => {
  const missing = calculateFlatRate(form({ taskHours: "" }));
  assert.equal(missing.valid, false);
  assert.match(missing.errors.taskHours, /greater than 0/);
  const invalidMargin = calculateFlatRate(form({ targetMarginPercent: "100" }));
  assert.equal(invalidMargin.valid, false);
  assert.match(invalidMargin.errors.targetMarginPercent, /less than 100/);
});

test("rejects member discounts above 100 percent", () => {
  const result = calculateFlatRate(form({ memberDiscountPercent: "100.01" }));
  assert.equal(result.valid, false);
  assert.match(result.errors.memberDiscountPercent, /cannot exceed 100/);
});

test("serializes and restores a versioned local draft", () => {
  const input = form({ laborBasis: "shop", partsMode: "sellPrice", partsSellPrice: "130" });
  assert.deepEqual(parseDraft(serializeDraft(input)), { form: input });
});

test("rejects malformed, stale, and incomplete drafts", () => {
  assert.equal(parseDraft("not-json"), null);
  assert.equal(parseDraft(JSON.stringify({ version: 99, form: EMPTY_FORM })), null);
  assert.equal(parseDraft(JSON.stringify({ version: 1, form: { taskHours: "1" } })), null);
});

