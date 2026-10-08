# glitch-islands (dex tool)

Copy-transplant kit from `dev-master` (`dex/06-tools/glitch-islands/`). Media cards + once-pulse RGB split. Not the CRT terminal extract.

Cockpit consumes the CSS (`.glitch-rgb`), the custom element, and the site-relative path sanitizer. PR/lane/action cards use JSON Schema 2020-12 under `schemas/` instead of the kit's Zod media schema.

## Pixel 4 budget

- Compositor-only motion (`transform`, `opacity`).
- `prefers-reduced-motion: reduce` → no tilt, no RGB pulse (static cyan on `:focus-visible`).
- Hydrate the token-gated board with `client:only="react"` (needs `sessionStorage`). Static chrome stays SSG.
