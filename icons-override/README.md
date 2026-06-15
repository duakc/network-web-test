# Icon overrides

Drop a `<id>.png` (or `<id>.svg`) here to override the auto-fetched icon for
that site (`<id>` is the target's `id` in `src/config/targets.ts`, e.g.
`bing.png`, `x.png`, `jd.svg`).

Files here take **priority** over `public/icons/` (the auto-fetched icons):
`pnpm sync-icons` (run automatically before `dev`/`build`) copies everything
here into `public/icons/`, overwriting the auto version. `pnpm fetch-icons`
never touches files that already exist, so your overrides survive re-fetches.

## Prefer SVG for low-res / blurry icons

Many favicons only come in at 16–32px. Upscaling a tiny raster can't add detail
— it stays jagged or leaves a gray halo / non-transparent edges. So for those,
drop a **vector** `<id>.svg` here instead (official logo from vectorlogo.zone /
simpleicons.org, or hand-drawn). The browser renders SVG crisply at any size,
so there's nothing to rasterize.

`sync-icons` records every non-png override in the generated
`src/config/icon-overrides.ts`, which `targets.ts` reads — so `<id>.svg` is
served directly as `/icons/<id>.svg`. It also removes a stale same-id raster
(e.g. an old auto-fetched `<id>.png`) so each icon resolves to one file.