"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calculateFlatRate, EMPTY_FORM, formatMoney, formatPercent, type FlatRateForm } from "@/lib/calculator";
import { trackToolComplete } from "@/lib/analytics";
import { DRAFT_STORAGE_KEY, parseDraft, serializeDraft } from "@/lib/draft";

const inputClass = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const buttonClass = "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-blue-100";
const linkClass = "font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4";

const faqItems = [
  { question: "What is an HVAC flat-rate repair price?", answer: "It is a reusable price-book amount for completing one defined repair task. It is built from book time, internal labor cost, parts, allocated overhead, callback risk, and a pricing target. It is separate from a trip, diagnostic, or minimum service-call charge." },
  { question: "What is the HVAC flat-rate formula?", answer: "Calculate internal job cost, convert parts cost to the selected parts selling amount, then apply either the target-margin formula or a markup to the price-book basis. This calculator shows the actual profit, margin, and markup produced by the result." },
  { question: "Should book time use average time or best-case time?", answer: "Use a defensible standard time for a trained technician working under normal conditions. Review completed jobs and update the book time when actual performance consistently differs." },
  { question: "Should a diagnostic fee be included in a flat-rate repair price?", answer: "Usually it is clearer to keep the trip, diagnostic, and minimum call policy separate. This tool prices the repair task itself; use the HVAC Service Call Price Calculator for the call-level fee." },
  { question: "How should I account for callbacks and warranties?", answer: "Add a fixed reserve or a percentage of labor, parts, and overhead. The reserve is an allowance for expected risk, not a promise that every repair will have that exact warranty cost." },
  { question: "How do member discounts affect margin?", answer: "A member discount lowers the selling price without lowering internal cost. The calculator shows the member price, while standard gross profit and margin remain tied to the standard price-book amount." },
] as const;

const howToSteps = [
  ["Set the task’s book time", "Use a repeatable standard time for the individual repair, not total time for travel, diagnosis, or unrelated work."],
  ["Calculate internal labor and parts cost", "Multiply task hours by loaded technician cost or your shop labor cost basis, then add the actual parts and material cost."],
  ["Allocate overhead and callback risk", "Add a fixed amount or a percentage so the task carries its share of business overhead and expected warranty exposure."],
  ["Choose the parts selling logic", "Apply a parts markup or enter the direct price-book selling amount for the task’s parts and materials."],
  ["Apply margin or markup", "Use price = pricing basis ÷ (1 − target margin), or price = pricing basis × (1 + markup), then review the actual result."],
] as const;

const jsonLd = [
  {
    "@context": "https://schema.org", "@type": "WebApplication",
    name: "HVAC Flat Rate Repair Pricing Calculator",
    description: "Calculate a reusable flat-rate price-book amount for an individual HVAC repair task from book time, labor cost, parts, overhead, callback reserve, and pricing targets.",
    url: "https://hvac-flat-rate.jakegenerates.com/", applicationCategory: "BusinessApplication", operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript enabled.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "JakeGenerates", item: "https://jakegenerates.com/" },
    { "@type": "ListItem", position: 2, name: "HVAC tools", item: "https://jakegenerates.com/professions/hvac" },
    { "@type": "ListItem", position: 3, name: "HVAC Flat Rate Repair Pricing Calculator", item: "https://hvac-flat-rate.jakegenerates.com/" },
  ] },
  {
    "@context": "https://schema.org", "@type": "HowTo", name: "How to calculate an HVAC flat-rate repair price",
    description: "A five-step method for building a reusable price-book amount for one HVAC repair task.",
    step: howToSteps.map(([name, text], index) => ({ "@type": "HowToStep", position: index + 1, name, text })),
  },
];

type StringKey = keyof FlatRateForm;

function NumericField({ id, label, field, value, onChange, error, prefix, suffix, hint, optional = false }: {
  id: string; label: string; field: StringKey; value: string; onChange: (field: StringKey, value: string) => void;
  error?: string; prefix?: string; suffix?: string; hint?: string; optional?: boolean;
}) {
  return <label htmlFor={id} className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700">
    <span>{label}{optional && <span className="font-normal text-slate-500"> (optional)</span>}</span>
    <span className="relative block">
      {prefix && <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-500">{prefix}</span>}
      <input id={id} className={`${inputClass} ${prefix ? "pl-8" : ""} ${suffix ? "pr-14" : ""} ${error ? "border-red-500" : ""}`}
        type="text" inputMode="decimal" autoComplete="off" maxLength={18} value={value}
        onChange={(event) => onChange(field, event.target.value)} aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-help` : undefined} />
      {suffix && <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-normal text-slate-500">{suffix}</span>}
    </span>
    {(error || hint) && <span id={`${id}-help`} className={`text-xs font-normal leading-5 ${error ? "text-red-700" : "text-slate-500"}`}>{error || hint}</span>}
  </label>;
}

function Segment({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
    <div className="grid grid-cols-2 gap-2">{options.map(([option, text]) => <label key={option} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue-100 ${value === option ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
      <input className="sr-only" type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />{text}
    </label>)}</div>
  </fieldset>;
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <h2 className="text-xl font-bold">{title}</h2><p className="mb-5 mt-1 text-sm leading-6 text-slate-500">{description}</p>{children}
  </section>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid min-w-0 gap-4 sm:grid-cols-2">{children}</div>; }
function Metric({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return <div className={`min-w-0 rounded-xl border p-4 ${featured ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`${featured ? "text-2xl" : "text-xl"} mt-2 break-words font-bold tabular-nums text-slate-900`}>{value}</dd></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2 text-sm"><dt className="text-slate-600">{label}</dt><dd className="max-w-[13rem] break-words text-right font-semibold tabular-nums text-slate-900">{value}</dd></div>;
}
function availableStorage() {
  try { const store = localStorage; const key = "hvac-flat-rate-repair-calculator:storage-test"; store.setItem(key, "1"); store.removeItem(key); return store; } catch { return null; }
}

export default function Home() {
  const [form, setForm] = useState<FlatRateForm>(EMPTY_FORM);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const storageRef = useRef<Storage | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const result = useMemo(() => calculateFlatRate(form), [form]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const store = availableStorage(); storageRef.current = store; setStorageAvailable(Boolean(store));
      if (store) {
        try {
          const raw = store.getItem(DRAFT_STORAGE_KEY); const draft = raw ? parseDraft(raw) : null;
          if (draft) { setForm(draft.form); setDirty(true); setRestored(true); } else if (raw) store.removeItem(DRAFT_STORAGE_KEY);
        } catch { storageRef.current = null; setStorageAvailable(false); }
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !storageRef.current) return;
    const store = storageRef.current;
    const save = () => { try { if (dirty) store.setItem(DRAFT_STORAGE_KEY, serializeDraft(form)); else store.removeItem(DRAFT_STORAGE_KEY); } catch { storageRef.current = null; setStorageAvailable(false); } };
    const timer = setTimeout(save, 400); addEventListener("pagehide", save);
    return () => { clearTimeout(timer); removeEventListener("pagehide", save); };
  }, [dirty, form, ready]);

  function update(field: StringKey, value: string) {
    if (value !== "" && !/^\d*(?:\.\d{0,6})?$/.test(value)) return;
    setForm((current) => ({ ...current, [field]: value })); setDirty(true); setRestored(false);
  }
  function setMode<K extends "laborBasis" | "partsMode" | "overheadMode" | "reserveMode" | "pricingMode">(field: K, value: FlatRateForm[K]) {
    setForm((current) => ({ ...current, [field]: value })); setDirty(true); setRestored(false);
  }
  function reset() {
    if (!confirm("Clear every calculator field and the saved local draft?")) return;
    storageRef.current?.removeItem(DRAFT_STORAGE_KEY); setForm(EMPTY_FORM); setDirty(false); setRestored(false);
  }
  function complete() {
    if (!result.valid) { document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(); return; }
    trackToolComplete(form.pricingMode); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const props = (field: StringKey) => ({ field, value: form[field], onChange: update, error: result.errors[field] });

  return <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 sm:py-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 px-1"><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-blue-700">HVAC price-book tool</p>
        <h1 className="max-w-5xl text-3xl font-bold tracking-tight sm:text-4xl">HVAC Flat Rate Repair Pricing Calculator</h1>
        <p className="mt-3 max-w-5xl text-base leading-7 text-slate-600"><strong>Set a reusable flat-rate price-book amount for one HVAC repair task.</strong> Enter task hours, internal labor basis, parts, overhead, callback reserve, and a margin or markup target. This calculator prices the repair itself—not the trip, diagnostic, or minimum service-call fee.</p>
      </header>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p role="status">{storageAvailable === false ? <strong className="text-amber-800">Browser storage is unavailable. Calculations still work, but changes will not persist.</strong> : restored ? <strong className="text-emerald-800">Draft restored from this browser.</strong> : "Your inputs stay on this device and are saved in this browser."}</p>
        <button type="button" className={`${buttonClass} border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50`} disabled={!ready} onClick={reset}>Reset calculator</button>
      </div>

      <form className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)]" onSubmit={(event) => { event.preventDefault(); complete(); }} noValidate>
        <div className="grid min-w-0 gap-6">
          <Card title="Task time & labor basis" description="Book time is the standard time for this repair task. Do not add the trip or diagnostic fee here.">
            <Grid>
              <NumericField id="task-hours" label="Book time / task hours" {...props("taskHours")} suffix="hours" />
              <div><Segment label="Internal labor basis" name="labor-basis" value={form.laborBasis} options={[["burdened", "Burdened technician cost"], ["shop", "Shop labor cost basis"]]} onChange={(value) => setMode("laborBasis", value as FlatRateForm["laborBasis"])} /></div>
              <NumericField id="labor-rate" label={form.laborBasis === "burdened" ? "Burdened technician cost per hour" : "Shop labor cost basis per hour"} {...props("laborRate")} prefix="$" suffix="/ hr" hint="Use an internal cost basis, not the customer-facing labor rate." />
            </Grid>
          </Card>

          <Card title="Parts & materials" description="Keep actual internal cost separate from how parts appear in the price-book calculation.">
            <Grid>
              <NumericField id="parts-cost" label="Parts / material cost" {...props("partsCost")} prefix="$" />
              <div><Segment label="Parts pricing logic" name="parts-mode" value={form.partsMode} options={[["markup", "Markup on cost"], ["sellPrice", "Direct sell price"]]} onChange={(value) => setMode("partsMode", value as FlatRateForm["partsMode"])} /></div>
              {form.partsMode === "markup"
                ? <NumericField id="parts-markup" label="Parts markup" {...props("partsMarkupPercent")} suffix="%" />
                : <NumericField id="parts-sell-price" label="Parts direct selling price" {...props("partsSellPrice")} prefix="$" />}
            </Grid>
          </Card>

          <Card title="Overhead allocation" description="Assign this task a fixed amount or a percentage of its labor and parts cost.">
            <Segment label="Overhead method" name="overhead-mode" value={form.overheadMode} options={[["fixed", "Fixed amount"], ["percent", "% of direct cost"]]} onChange={(value) => setMode("overheadMode", value as FlatRateForm["overheadMode"])} />
            <div className="mt-4 max-w-sm">{form.overheadMode === "fixed"
              ? <NumericField id="fixed-overhead" label="Fixed overhead allocation" {...props("fixedOverhead")} prefix="$" />
              : <NumericField id="overhead-percent" label="Overhead allocation" {...props("overheadPercent")} suffix="%" />}</div>
          </Card>

          <Card title="Warranty / callback reserve" description="Add expected repair risk as a fixed allowance or percentage of labor, parts, and overhead.">
            <Segment label="Reserve method" name="reserve-mode" value={form.reserveMode} options={[["fixed", "Fixed amount"], ["percent", "% of cost before reserve"]]} onChange={(value) => setMode("reserveMode", value as FlatRateForm["reserveMode"])} />
            <div className="mt-4 max-w-sm">{form.reserveMode === "fixed"
              ? <NumericField id="fixed-reserve" label="Fixed callback reserve" {...props("fixedReserve")} prefix="$" />
              : <NumericField id="reserve-percent" label="Callback reserve" {...props("reservePercent")} suffix="%" />}</div>
          </Card>

          <Card title="Price-book target" description="Target margin divides the pricing basis by one minus the target. Markup multiplies the pricing basis.">
            <Segment label="Pricing method" name="pricing-mode" value={form.pricingMode} options={[["margin", "Target gross margin"], ["markup", "Markup on pricing basis"]]} onChange={(value) => setMode("pricingMode", value as FlatRateForm["pricingMode"])} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {form.pricingMode === "margin"
                ? <NumericField id="target-margin" label="Target gross margin" {...props("targetMarginPercent")} suffix="%" />
                : <NumericField id="pricing-markup" label="Pricing markup" {...props("markupPercent")} suffix="%" />}
              <NumericField id="member-discount" label="Maintenance-member discount" {...props("memberDiscountPercent")} suffix="%" optional />
              <NumericField id="after-hours" label="After-hours surcharge" {...props("afterHoursSurchargePercent")} suffix="%" optional />
            </div>
            <button type="submit" className={`${buttonClass} mt-5 w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto`}>Calculate flat-rate price</button>
          </Card>
        </div>

        <aside ref={resultsRef} className="min-w-0 scroll-mt-20 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-20" aria-labelledby="results-heading">
          <div className="bg-[#0f2b45] p-5 text-white sm:p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">Price-book result</p><h2 id="results-heading" className="mt-1 text-2xl font-bold">Repair task pricing</h2><p className="mt-2 text-sm text-slate-300">Reusable task price; call-level fees stay separate.</p></div>
          <div className="p-5 sm:p-6" aria-live="polite">
            {!result.valid && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Complete the highlighted fields to calculate the flat-rate price.</div>}
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Metric featured label="Standard flat-rate price" value={formatMoney(result.standardPriceCents)} />
              <Metric featured label="Full internal job cost" value={formatMoney(result.fullInternalCostCents)} />
              <Metric label="Member price" value={formatMoney(result.memberPriceCents)} />
              <Metric label="After-hours price" value={formatMoney(result.afterHoursPriceCents)} />
              <Metric label="Gross profit" value={formatMoney(result.grossProfitCents)} />
              <Metric label="Gross margin" value={formatPercent(result.grossMarginPercent)} />
              <Metric label="Markup on internal cost" value={formatPercent(result.markupPercent)} />
            </dl>
            <h3 className="mt-6 font-bold">Cost & pricing breakdown</h3>
            <dl className="mt-2 divide-y divide-slate-200">
              <Row label="Internal labor cost" value={formatMoney(result.laborCostCents)} />
              <Row label="Parts / material cost" value={formatMoney(result.partsCostCents)} />
              <Row label="Overhead allocation" value={formatMoney(result.overheadCents)} />
              <Row label="Warranty / callback reserve" value={formatMoney(result.reserveCents)} />
              <Row label="Selected parts selling amount" value={formatMoney(result.partsSellPriceCents)} />
              <Row label="Price-book basis" value={formatMoney(result.pricingBasisCents)} />
            </dl>
          </div>
        </aside>
      </form>

      <article className="mt-8 space-y-6 text-base leading-7 text-slate-700">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Distinct pricing intent</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Flat-rate repair pricing is not a service-call fee</h2>
          <p className="mt-3 max-w-4xl">Use this HVAC repair pricing calculator to create a reusable price-book amount for a specific task such as replacing a contactor, capacitor, blower motor, or drain pump. Use the <a className={linkClass} href="https://hvac-service-call.jakegenerates.com/">HVAC Service Call Price Calculator</a> for the trip, diagnosis, minimum charge, or call-level after-hours policy. A contractor may charge both, but they answer different pricing questions.</p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8" aria-labelledby="five-steps">
          <h2 id="five-steps" className="text-2xl font-bold tracking-tight text-slate-950">How to build an HVAC flat-rate repair price</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">{howToSteps.map(([title, description], index) => <li className="rounded-xl border border-slate-200 bg-slate-50 p-5" key={title}><span className="text-sm font-bold text-blue-700">Step {index + 1}</span><h3 className="mt-1 font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6">{description}</p></li>)}</ol>
          <p className="mt-5">Need the internal hourly basis first? Use the <a className={linkClass} href="https://labor-rate.jakegenerates.com/">Labor Rate Calculator</a>. For a focused parts-and-labor comparison, use the <a className={linkClass} href="https://markup.jakegenerates.com/">Parts &amp; Labor Markup Calculator</a>.</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#0f2b45] p-6 text-slate-100 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">HVAC flat-rate formula</h2>
            <div className="mt-5 space-y-3 text-sm leading-6">
              <p className="rounded-xl bg-white/10 p-4"><strong className="text-white">Internal labor cost</strong><br />= book time × burdened technician cost or shop labor cost basis</p>
              <p className="rounded-xl bg-white/10 p-4"><strong className="text-white">Full internal job cost</strong><br />= labor cost + parts cost + overhead allocation + callback reserve</p>
              <p className="rounded-xl bg-white/10 p-4"><strong className="text-white">Price-book basis</strong><br />= non-parts internal cost + selected parts selling amount</p>
              <p className="rounded-xl bg-white/10 p-4"><strong className="text-white">Margin price</strong><br />= price-book basis ÷ (1 − target margin)</p>
              <p className="rounded-xl bg-white/10 p-4"><strong className="text-white">Markup price</strong><br />= price-book basis × (1 + markup)</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Worked HVAC repair example</h2>
            <p className="mt-3">A repair has 1.5 book hours at $45 per hour, $80 in parts, $25 of allocated overhead, and a 5% reserve. Parts use a 50% markup, and the price-book target is a 40% margin.</p>
            <ul className="mt-4 space-y-2">
              <li>Labor cost: 1.5 × $45 = <strong>$67.50</strong></li>
              <li>Cost before reserve: $67.50 + $80 + $25 = <strong>$172.50</strong></li>
              <li>Reserve: $172.50 × 5% = <strong>$8.63</strong></li>
              <li>Parts selling amount: $80 × 1.50 = <strong>$120</strong></li>
              <li>Price-book basis: $67.50 + $25 + $8.63 + $120 = <strong>$221.13</strong></li>
              <li>Standard flat rate: $221.13 ÷ 0.60 = <strong>$368.55</strong></li>
            </ul>
            <p className="mt-4 text-sm">Internal job cost is $181.13, so actual gross profit is $187.42, actual gross margin is 50.9%, and actual markup is 103.5%. The actual margin exceeds 40% because the parts markup is built into the price-book basis before the margin formula.</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Common flat-rate pricing mistakes</h2>
          <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
            <div><h3 className="font-bold text-slate-950">Mixing diagnosis into every repair</h3><p className="mt-1 text-sm leading-6">It hides the difference between getting to the call and completing the defined task.</p></div>
            <div><h3 className="font-bold text-slate-950">Using wage instead of burdened labor</h3><p className="mt-1 text-sm leading-6">Payroll taxes, benefits, workers’ compensation, and paid nonproductive time still affect repair cost.</p></div>
            <div><h3 className="font-bold text-slate-950">Ignoring overhead and callbacks</h3><p className="mt-1 text-sm leading-6">A task can look profitable before software, vehicles, management, and warranty risk are allocated.</p></div>
            <div><h3 className="font-bold text-slate-950">Confusing margin and markup</h3><p className="mt-1 text-sm leading-6">A 40% markup is only a 28.6% margin; a 40% margin requires dividing the basis by 0.60.</p></div>
            <div><h3 className="font-bold text-slate-950">Discounting without rechecking profit</h3><p className="mt-1 text-sm leading-6">Member discounts reduce selling price while internal task cost stays the same.</p></div>
            <div><h3 className="font-bold text-slate-950">Never updating book time</h3><p className="mt-1 text-sm leading-6">Compare actual completed work in the <a className={linkClass} href="https://job-profit.jakegenerates.com/">Job Profit Calculator</a> and revise outdated assumptions.</p></div>
          </div>
          <p className="mt-5">When the task and customer scope are ready, create a customer-facing document with the <a className={linkClass} href="https://service-quotes.jakegenerates.com/">Service Quote Generator</a>, or browse the complete <a className={linkClass} href="https://jakegenerates.com/professions/hvac">HVAC tools hub</a>.</p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">HVAC flat-rate pricing FAQs</h2>
          <div className="mt-5 divide-y divide-slate-200">{faqItems.map((item) => <details className="group py-4" key={item.question}><summary className="cursor-pointer list-none pr-8 font-bold text-slate-950 marker:content-none">{item.question}</summary><p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{item.answer}</p></details>)}</div>
        </section>

        <section className="rounded-2xl bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="font-bold text-slate-900">Pricing only</h2>
          <p className="mt-2">This calculator prices one individual repair task at a time. It does not set trip or diagnostic fees, maintain a multi-item price book, provide regional prices, collect customer data, create invoices, manage inventory, or perform HVAC engineering calculations.</p>
          <p className="mt-2 text-xs text-slate-500">Results are estimates based on your inputs. Money is converted to integer cents; each multiplication, division, percentage, discount, and surcharge rounds deterministically to the nearest cent. Inputs remain in your browser and are not included in the anonymous tool_visit or tool_complete events.</p>
        </section>
      </article>
    </div>
  </main>;
}

