# Junguang Jia Gallery

A minimal photography portfolio built with React, TypeScript, and Vite.

The homepage has four handwritten category titles: Documentary, Landscape,
Wildlife, and Film. Each category keeps its original cover and displays the local
production photo collection below it.

English is the default. The header and mobile menu provide a Chinese language
switch. Photograph series scroll vertically and display the full images.

On phones, tapping an initial opens its cover preview. Tap the cover or swipe up
to enter the gallery; the back arrow and browser Back restore the initials.
A small bottom-edge glow continuously suggests the upward gesture while the
preview is open. It waits for the cover to load, pauses behind the menu, and uses
a static glow when reduced motion is enabled. Short viewports omit the hint.
The mobile menu contains Galleries, Information, and a visible EN / 中文 switch.

## Development

Use Node.js 24 LTS and npm. Vite requires Node.js 20.19+ or 22.12+.

```bash
npm ci
npm run dev
```

With mise installed, run these commands through `mise exec --` from this project.
The development server listens on port **47331**:

```text
http://localhost:47331/
```

## Checks and production build

```bash
npm run lint
npm run build
npm run preview
```

The production build is written to `dist/`; the Vite preview uses the same port.

## Cloudflare Workers Static Assets

Wrangler serves the Vite build directly through Workers Static Assets. The
`single-page-application` fallback in `wrangler.jsonc` supports direct navigation
and refreshes on all category routes. No Worker entry point or storage service
is needed.

```bash
npm run cf:preview  # build, then preview Workers at http://127.0.0.1:8787
npx wrangler login # once, if this machine is not authenticated
npm run deploy     # build and deploy junguang-jia-gallery
```

Place web-ready JPEGs in `public/photos/documentary`, `landscape`, `wildlife`,
and `film`. `src/photo-curation.json` defines their display category, named series,
and explicit sequence. Paths describe the existing source location, so category
changes do not move files. Its duplicate exclusions hide display entries while
retaining every source file. Add future photographs to a series in this metadata;
unassigned files produce an actionable catalog error.

Each existing cover is the first photograph of its opening series. The openings
continue railway subjects, trees in warm light, grassland oryx, and the same
pigeon-feeding scene. Landscape's grouping follows a shared visual subject;
it does not assert a shared location or event.

Development and production builds automatically generate the local catalog,
including natural dimensions and URL-safe filenames. Run `npm run photos:catalog`
after changing photographs or curation during an existing development session.
Run `node --test scripts/generate-photo-catalog.test.mjs` for catalog checks.

The production directories and generated catalog are ignored by Git. A fresh
checkout uses the eight tracked development samples; production deployment must
run from a machine with the complete local photo collection. Optional files with
the same sample basenames in their respective category directories replace the
displayed samples with higher-resolution versions, preserving the four covers.
Horizontal photographs retain their full aspect ratio and never exceed the
fitted cover's width or height. Per-photo `layout` entries set left/right
placement and scale, giving portrait sequences more variation while preserving
the curated order. Left-aligned photographs share the cover's left edge, and
right-aligned photographs share its right edge, on desktop and mobile. Mobile
layouts keep milder horizontal size changes and retain the portrait staggering.

## Routes

- `/` — galleries and handwritten title interactions.
- `/landscape` — landscape photographs.
- `/wildlife` — wildlife photographs.
- `/documentary` — documentary photographs.
- `/film` — film photographs.
- `/information` — an introduction to the portfolio.

## Assets and privacy

`src/photos.ts` defines the categories and development samples in `public/photos`;
`scripts/generate-photo-catalog.mjs` indexes the local production directories.
The repository includes the portfolio's displayed name, signature, and
display images. Published photographs retain their color profiles while camera
and location metadata are removed. Private originals in `seed/`, local environment files, credentials,
dependencies, and generated build output are excluded from version control.

The site runs without a backend, account system, or analytics integration.

## License

Code is licensed under the [MIT License](LICENSE). Photographs, the signature,
and handwritten title artwork retain their separate copyright; see
[ASSETS-LICENSE.md](ASSETS-LICENSE.md). Bundled fonts retain their respective
SIL Open Font License notices in `public/fonts/licenses/`.
