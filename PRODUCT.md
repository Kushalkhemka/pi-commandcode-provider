# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Operators and developers managing multiple CommandCode API accounts, typically in a batch, research, or production environment. Their primary job is to see remaining capacity, identify accounts near a limit, and understand usage without opening each CommandCode account separately.

## Product Purpose

CommandCode Quota Board consolidates live account identity, rolling quota windows, monthly credits, request totals, token totals, and observed Pi telemetry across many API keys. Success means an operator can understand fleet capacity and choose the right account within seconds.

## Positioning

The board combines CommandCode account and billing endpoints with opt-in usage telemetry from the Pi provider, while keeping raw API keys out of browser responses and telemetry events.

## Operating Context

The board runs locally with a React and Vite frontend and a local server. Operators connect accounts, refresh one account or the fleet, compare 5-hour, weekly, and monthly limits, inspect account details, and optionally ingest Pi usage events.

## Capabilities and Constraints

- Show global and per-account 5-hour, weekly, and monthly utilization.
- Show account email, plan, quota reset timing, token totals, requests, cost, and success rate when exposed.
- Show model and cache analytics only when observed telemetry exists; never fabricate unavailable provider history.
- Support many accounts, duplicate-key handling, partial refresh failures, dark and light themes, desktop and mobile layouts.
- Store keys only in the server-side encrypted local vault and never commit local account data.

## Brand Commitments

Use the official CommandCode symbol and product name. The interface is unofficial and must remain accurate about data provenance. The primary visual references are the user-supplied Higgsfield Usage History screen and professional operational dashboards from Mobbin. Dark mode is true black; light mode remains fully supported.

## Evidence on Hand

- Official symbol: `quota-board/public/commandcode-symbol.svg`
- Working application: `quota-board/src/`
- Two live unique accounts are available in the ignored local vault for interface validation.
- The third supplied credential duplicates the second and must not appear as another account.

## Product Principles

- Capacity before decoration.
- Real provider data before inferred analytics.
- Dense enough for operators, calm enough for continuous use.
- Account-level action remains one click away.
- Credentials never become presentation data.

## Accessibility & Inclusion

Keyboard focus, readable contrast, reduced-motion support, and responsive operation down to a 320px viewport are required.
