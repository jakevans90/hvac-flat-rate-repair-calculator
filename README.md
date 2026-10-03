# HVAC Flat Rate Repair Pricing Calculator

A free, browser-local JakeGenerates calculator for setting a reusable flat-rate price-book amount for one HVAC repair task. It intentionally excludes trip, diagnostic, and minimum service-call fees.

## Formula

- Internal labor cost = book time × burdened technician cost or shop labor cost basis
- Direct cost = internal labor cost + parts/material cost
- Full internal job cost = direct cost + overhead allocation + warranty/callback reserve
- Parts selling amount = parts cost × (1 + parts markup), or a directly entered selling price
- Price-book basis = non-parts internal cost + selected parts selling amount
- Target-margin price = price-book basis ÷ (1 − target margin)
- Markup price = price-book basis × (1 + pricing markup)
- Member price = standard price × (1 − member discount)
- After-hours price = standard price × (1 + after-hours surcharge)

Money inputs are converted to integer cents. Each multiplication, division, discount, and surcharge rounds deterministically to the nearest cent.

## Privacy and analytics

One versioned draft is saved in browser localStorage. Inputs are not sent to a JakeGenerates server or included in analytics. GA4 receives only tool_visit and tool_complete events with categorical tool context.

## Development

```bash
npm ci
npm test
npm run lint
npm run build
```

