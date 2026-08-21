# Canonical Test ID Registry (`TESTIDS.md`)

> **StickHRPG: Degenerate Horizon**
> Standardized `data-testid` mapping across all views and interactive components for Vitest (React Testing Library) and Playwright E2E suites.

---

## 1. App Shell & Navigation
- `hrpg-root`: Root container for the game viewport
- `hrpg-header`: Top navigation and world clock HUD
- `hrpg-nav-dex`: Tab / button switching to Dex view (`1`)
- `hrpg-nav-arena`: Tab / button switching to Arena view (`2`)
- `hrpg-nav-oracle`: Tab / button switching to Oracle view (`3`)
- `hrpg-nav-forge`: Tab / button switching to Forge view (`4`)
- `hrpg-btn-sleep`: Rest / Sleep action button (`R`)
- `hrpg-btn-a11y`: Accessibility settings toggle

---

## 2. Views
- `hrpg-view-dex`: Wardrobe & Companion Archive container
- `hrpg-view-arena`: Career shifts & Fight Arena container
- `hrpg-view-oracle`: Gacha banners & Tarot divination container
- `hrpg-view-forge`: Gym workouts & Synthesizer container

---

## 3. HUD Stat Bar (`StatBar`)
- `hrpg-stat-cash`: Liquid cash amount display
- `hrpg-stat-energy`: Current energy level meter
- `hrpg-stat-str`: Strength level & progress bar
- `hrpg-stat-int`: Intelligence level & progress bar
- `hrpg-stat-chm`: Charm level & progress bar
- `hrpg-stat-krm`: Karma alignment score
- `hrpg-stat-dgn`: Degen score & fever indicator
- `hrpg-world-clock`: Current game day and 24h clock

---

## 4. Arena & Job Board
- `hrpg-job-card-<job_id>`: Individual career shift card
- `hrpg-job-clockin-<job_id>`: Clock-in action trigger
- `hrpg-job-promo-badge`: Promotion readiness indicator

---

## 5. Oracle & Gacha Divination
- `hrpg-gacha-pull-1`: Single pull button
- `hrpg-gacha-pull-10`: 10-pull crate button
- `hrpg-gacha-pity-counter`: Pity counter display
- `hrpg-tarot-draw-btn`: Daily 3-card spread draw button
- `hrpg-tarot-card-<card_id>`: Rendered tarot buff card

---

## 6. Casino & Edging Mini-Game
- `hrpg-casino-bet-input`: Betting wager input
- `hrpg-casino-spin-btn`: Gamble / Spin action button
- `hrpg-casino-cashout-btn`: Cashout banked pot button
- `hrpg-casino-pot-value`: Current pot display
- `hrpg-casino-edging-meter`: Multiplier cascade gauge
