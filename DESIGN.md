---
name: "CommandCode Quota Board"
description: "A compact, evidence-led fleet usage ledger for live CommandCode capacity."
colors:
  black-canvas: "#000000"
  charcoal-surface: "#101111"
  charcoal-raised: "#181919"
  charcoal-hover: "#1d1f1e"
  soft-white: "#f3f5f3"
  pure-white: "#ffffff"
  steel-muted: "#969b97"
  dim-muted: "#676c68"
  graphite-line: "#292c2a"
  soft-graphite-line: "#202321"
  action-mint: "#75e2ba"
  action-ink: "#041610"
  token-cyan: "#66c7f0"
  token-violet: "#a78bfa"
  warning-amber: "#e8bc68"
  danger-coral: "#f07676"
  paper-canvas: "#f7f7f5"
  white-surface: "#ffffff"
  pale-hover: "#f0f2ef"
  charcoal-ink: "#202020"
  near-black-ink: "#050505"
  warm-muted: "#71716c"
  pale-muted: "#a2a29d"
  light-graphite-line: "#d8dcd8"
  light-soft-line: "#e7eae7"
  forest-action: "#116e54"
  light-action-ink: "#ffffff"
  light-token-cyan: "#1677a0"
  light-token-violet: "#7250b5"
  light-capacity-green: "#168464"
  light-warning-amber: "#a16713"
  light-danger-red: "#b93939"
typography:
  display:
    fontFamily: "Instrument Sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.05em"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
rounded:
  xs: "3px"
  sm: "4px"
  field: "5px"
  control: "6px"
  brand: "8px"
  account: "9px"
  metric: "10px"
  panel: "13px"
  pill: "99px"
  circle: "50%"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  panel: "18px"
  lg: "24px"
  xl: "36px"
components:
  button-primary:
    backgroundColor: "{colors.action-mint}"
    textColor: "{colors.action-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.charcoal-surface}"
    textColor: "{colors.soft-white}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  navigation-active:
    backgroundColor: "{colors.charcoal-hover}"
    textColor: "{colors.pure-white}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "38px"
  panel:
    backgroundColor: "{colors.charcoal-surface}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.panel}"
    padding: "18px"
  usage-metric:
    backgroundColor: "{colors.charcoal-raised}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.metric}"
    padding: "16px"
  text-input:
    backgroundColor: "{colors.black-canvas}"
    textColor: "{colors.soft-white}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "0 10px"
    height: "37px"
  range-active:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.black-canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "25px"
  account-avatar:
    backgroundColor: "{colors.charcoal-hover}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.account}"
    size: "34px"
---

# Design System: CommandCode Quota Board

## Overview

**Creative North Star: "The Quiet Fleet Ledger"**

The system treats account capacity like an operational ledger: exact, compact, and calm enough to remain open all day. True black gives the dark theme an unambiguous foundation, layered charcoal separates working regions, and mint is reserved for capacity and decisive action. The official CommandCode symbol is the identity anchor; the interface does not add a competing visual persona.

Information density is earned through alignment, quiet dividers, restrained type, and tabular numeric rhythm rather than decorative dashboards. The usage overview and account ledger are visually primary, while charts appear only when the product has observed data. Light mode preserves the same hierarchy with paper-white surfaces and darker semantic colors rather than becoming a washed-out inversion.

**Key Characteristics:**

- True-black dark canvas with compact charcoal working surfaces.
- Mint capacity signals, amber exceptions, and restrained token-series color.
- Instrument Sans for interface language and IBM Plex Mono for measured values.
- Thin borders and tonal layers at rest; elevation is reserved for overlays.
- Official CommandCode identity, neutral account monograms, and no decorative portraits.
- Responsive ledger behavior from wide desktop to the 320px minimum viewport.

## Colors

The palette is mostly neutral and operational; color is evidence, state, or action—not atmosphere.

### Primary

- **Action Mint:** The dark-theme primary action, active icon, focus ring, healthy state, and capacity fill. Its light-theme counterpart is Forest Action, which is dark enough to remain legible on paper surfaces.

### Secondary

- **Token Cyan:** Input-token composition and the optional coverage series.
- **Token Violet:** Output-token composition and the second observed-data series.

### Tertiary

- **Warning Amber:** Near-limit states and cache-write data, used only when those meanings are supported by live values.
- **Danger Coral:** Over-limit, failed, destructive, and error states.

### Neutral

- **Black Canvas:** The true-black dark application background and sidebar field.
- **Charcoal Surface:** The primary dark panel and control surface.
- **Charcoal Raised:** Nested dark metrics and modal interiors.
- **Soft White / Pure White:** Main dark-theme text and its strongest emphasis.
- **Steel Muted / Dim Muted:** Supporting copy, timestamps, and placeholders.
- **Graphite Line / Soft Graphite Line:** Structural and nested dividers.
- **Paper Canvas / White Surface:** The light-theme application field and panels.
- **Charcoal Ink / Near-black Ink:** Main light-theme text and strongest emphasis.
- **Warm Muted / Pale Muted:** Light-theme supporting copy and placeholders.
- **Light Graphite Line / Light Soft Line:** Light-theme structural and nested dividers.

**The Evidence Color Rule.** Mint, amber, coral, cyan, and violet must correspond to an action, a state, or observed telemetry; never use them as decorative fill.

**The Theme Parity Rule.** Dark and light themes preserve role and hierarchy even when their exact semantic colors differ.

## Typography

**Display Font:** Instrument Sans (with system sans-serif fallbacks)

**Body Font:** Instrument Sans (with system sans-serif fallbacks)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Instrument Sans keeps the dense interface neutral and highly scannable. IBM Plex Mono gives quotas, credits, tokens, percentages, timestamps, endpoint paths, and fingerprints a measured ledger cadence.

### Hierarchy

- **Display** (600, 20px, 1.15): Page-level section titles on desktop; it compresses to 17px below the mobile breakpoint.
- **Headline** (600, 15px, 1.2): The usage-overview title and modal-level headings.
- **Title** (600, 12px, 1.2): Panel headings and compact shell titles.
- **Body** (400, 11px, 1.6): Explanations and longer operational notes.
- **Label** (400, 10px, 0.05em): Table headings, range controls, metadata, and mobile quota labels; uppercase is reserved for table-like labels.
- **Data** (500, 20px, 1.1): Primary measured values. Smaller mono values retain the same medium weight in dense rows.

Seven- and eight-pixel text is limited to secondary percentages or detail notes in already-labeled compact modules. General labels and actions remain at 9–11px or larger.

**The Number Voice Rule.** Measured values use IBM Plex Mono; navigation and explanatory language use Instrument Sans.

## Layout

The desktop shell uses a sticky 212px sidebar, a fluid main column, and an optional 340px account-detail rail. Main content is centered within a 1420px maximum and uses 24px page gutters. The overview is one vertically ordered ledger: a single usage panel, followed immediately by the account panel, so fleet capacity and both live accounts remain in the first desktop viewport.

Inside the usage panel, four equal metric cells sit above one segmented token band and a four-column operational facts band. Repeated modules use an 8–18px internal rhythm; major shell gutters use 24px. The account table is a nine-column grid on wide screens and retains horizontal integrity until it deliberately changes form.

At 1180px the sidebar collapses to a 64px icon rail. At 960px, usage and analytics grids move from four columns to two, page grids become single-column, and account detail becomes a right-side overlay. At 760px and below, navigation becomes an off-canvas drawer, the top bar becomes 56px tall, page gutters reduce to 14px, desktop-only refresh text is removed, and the account table becomes stacked three-column account rows with identity and status pinned above the quota cells. The composition remains usable at 320px without hiding the quota measures required to make a decision.

**The First-Viewport Rule.** On the overview surface, do not insert decorative modules between fleet usage and the account ledger.

## Elevation & Depth

The system is flat by default. Depth comes from tonal stepping—canvas, surface, raised surface—and one-pixel borders, not from ambient card shadows. The sticky top bar uses a restrained 12px backdrop blur to preserve context while scrolling. Shadows are reserved for layers that physically cover other content: the account-detail sheet, mobile navigation drawer, and modal.

### Shadow Vocabulary

- **Modal Lift** (`0 24px 80px rgba(0,0,0,.38)`): The add-account dialog above its dark scrim.
- **Detail Sheet** (`-18px 0 60px rgba(0,0,0,.35)`): The account detail overlay below 960px.
- **Navigation Drawer** (`20px 0 80px rgba(0,0,0,.45)`): The off-canvas navigation below 760px.

**The Flat-at-Rest Rule.** Ordinary panels and metrics use borders and tonal contrast; shadows only communicate a covering layer.

## Shapes

The form language is gently rounded and compact. Major panels use 13px corners, nested metrics use 10px, account marks and modals use 9px, brand and icon wells use 8px, and interactive controls use 4–6px. Progress tracks use a full pill radius, while status dots and the operator badge are circular. One-pixel borders stay visible in both themes and are never replaced by soft glow.

**The Nested Radius Rule.** Smaller elements inside a surface always use a tighter radius than their container.

## Components

### Buttons

- **Shape:** Compact rounded controls (6px) with a 32px height and 7px icon gap.
- **Primary:** Mint fill with dark action ink in dark mode; forest fill with white ink in light mode. Use for the single highest-priority local action, such as adding or verifying an account.
- **Hover / Focus:** Hover mixes the surface toward its stronger state; keyboard focus uses a 2px semantic action outline with a 2px offset. Disabled controls reduce opacity and keep a not-allowed cursor.
- **Secondary / Ghost:** Secondary controls retain a line and surface; text and icon buttons may be transparent but acquire the hover surface.

### Chips

- **Style:** The range selector is a bordered, 6px segmented control with 4px inner segments.
- **State:** Only the active range receives a high-contrast inversion. Inactive ranges remain muted and transparent.

### Cards / Containers

- **Corner Style:** 13px major panels and 10px nested metric cards.
- **Background:** Charcoal Surface contains Charcoal Raised in dark mode; White Surface contains White Surface with line separation in light mode.
- **Shadow Strategy:** Flat at rest; see Elevation & Depth for overlays.
- **Border:** One-pixel semantic line, with the softer line used for nested modules.
- **Internal Padding:** 18px on the overview panel, 16px on most metric cells, and 12–14px on compact mobile modules.

### Inputs / Fields

- **Style:** A 37px field with a 5px radius, one-pixel semantic border, canvas background, and 10px inline padding.
- **Focus:** The same 2px action-color outline used across all interactive elements.
- **Error / Disabled:** Errors use the danger color with a lightly tinted surface; placeholders use the palest muted role. Secret fields use IBM Plex Mono and keep the visibility action inside the field.

### Navigation

Sidebar items are 38px tall with a 6px radius. Resting items are muted, hover and active states use the hover surface, and only the active icon receives mint. At medium widths the rail keeps icons and removes labels; below 760px the full labeled navigation returns inside an off-canvas drawer.

### Usage Overview

Four capacity metrics, one token-composition band, and four operational facts form one bounded module. Values come from connected account data, and reset context remains visibly attached to the heading. Token segments use cyan, violet, mint, and amber only for input, output, cache read, and cache write respectively.

### Account Ledger

Desktop rows align identity, plan, three quota windows, token/cache evidence, status, and disclosure action in one line. Mobile rows become stacked quota summaries without losing identity, state, or the three decision-critical capacity measures. Account marks are deterministic neutral monograms, never generated faces or decorative avatars.

### Status, Progress, and Empty States

Healthy, warning, error, and pending states use both a text label and a dot; color never carries the state alone. Progress bars are 3px pill tracks. Missing telemetry renders an explicit empty explanation or “Not observed,” never a synthetic chart or inferred percentage.

## Do's and Don'ts

### Do:

- **Do** keep the official CommandCode symbol and product name as the only brand identity in the shell.
- **Do** make remaining capacity, reset timing, and account state readable before secondary analytics.
- **Do** use neutral monograms derived from account labels for private, stable account recognition.
- **Do** preserve full dark/light semantic parity and keyboard-visible focus.
- **Do** use “Not observed,” an em dash, or an explanatory empty state when provider data is absent.
- **Do** preserve the overview-to-account-ledger sequence and the 320px operating floor.

### Don't:

- **Don't** fabricate model, cache, request, cost, success, or historical usage values to fill visual space.
- **Don't** expose raw API keys, credentials, or local-vault contents in visual examples or interface copy.
- **Don't** add decorative gradients, glow, glass cards, or generic dashboard acreage to the true-black ledger.
- **Don't** use generated human faces for accounts or replace the official CommandCode symbol with a concept mark.
- **Don't** let microtype, status actions, or disclosure controls collide at narrow widths.
- **Don't** add an eyebrow or slogan above the compact top-bar title.
