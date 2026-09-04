---
version: 1
slug: "quota-board-src-app-tsx"
primary_target: "quota-board/src/App.tsx"
related_targets: ["quota-board/src/components/Pages.tsx","quota-board/src/components/Charts.tsx","quota-board/src/styles.css"]
---

# CommandCode Quota Board overview

- Scope: `quota-board/src/App.tsx` and overview components; Operate mode.
- Audience and job: operators managing many CommandCode API accounts who need capacity and account health in seconds.
- Primary task: compare monthly, 5-hour, and weekly capacity, then open the account requiring action.
- Required proof: live account identity, real quota values and reset times, provider token/request/cost totals, and honest unavailable telemetry states.
- Constraints: official CommandCode mark, true black and light themes, no raw credentials in presentation or Git, no fabricated model/cache history, responsive to 320px.
- Direction: a compact operational usage ledger inspired by the user-supplied Higgsfield Usage History screen, with one layered overview module followed immediately by a dense account table.
- Memorable moment: a single segmented token band makes the provider workload legible without claiming historical data.
- Unresolved: none for this redesign.

## Final implementation contract

- Status: ship; concept seed `33ce19f8` was resolved through the final desktop, 739px, 320px, and light-theme captures in `../review/`.
- The first desktop viewport contains the full usage overview and both connected accounts. No promotional or decorative module separates them.
- Wide layout: 212px sticky sidebar, fluid content capped at 1420px, optional 340px account detail rail.
- At 1180px the sidebar becomes a 64px icon rail; at 960px the overview becomes two columns and account detail overlays; at 760px navigation becomes a drawer and account rows become stacked quota summaries.
- The 739px and 320px layouts retain identity, status, 5-hour, weekly, and monthly capacity while removing secondary plan/token/cache columns from the row presentation.
- Dark mode uses a true-black canvas and charcoal layers; light mode keeps identical information hierarchy with paper and white surfaces.

## Data and identity truth

- Every usage number, state, reset label, and account identity is supplied by live or persisted application data. Missing model/cache/history fields use explicit unavailable states.
- Raw API keys never enter browser responses, screenshots, examples, or documentation. A fingerprint may appear only where the product already exposes the safe fingerprint field.
- Account imagery uses deterministically assigned CC0 illustrations as decorative markers, with no claim that they represent the account owner. The official asset at `../../quota-board/public/commandcode-symbol.svg` is the only CommandCode brand mark used by the shell.

## Intentional differences from the generated concept and references

- The approved image established the fleet-ledger composition and density, not literal identity. The final build replaces its generated turquoise concept mark with the official black-and-white CommandCode symbol.
- The final surface removes the concept's atmospheric glow and oversized title treatment in favor of flat true black, quieter one-pixel dividers, and a compact sticky top bar.
- Real reset timing, plan, cache visibility, status, and error/empty semantics take precedence over the concept's illustrative values and column order.
- The final table uses bundled CC0 illustration avatars as user-requested account markers and reserves amber for verified near-limit state.
- The top-bar eyebrow was removed, supporting microtype was raised where it affected legibility, and narrow status/disclosure controls were separated after finish review.
- Higgsfield and Mobbin remain behavioral references for compact usage history and professional operational hierarchy; their branding, visual effects, and data are not copied.
