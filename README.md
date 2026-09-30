# Junguang Jia Gallery

A minimal photography portfolio built with React, TypeScript, and Vite.

The homepage has four handwritten category titles: Documentary, Landscape,
Wildlife, and Film. Landscape contains one sunset photograph; Wildlife contains
five animal photographs. Documentary and Film each contain one demo photograph.

English is the default. The header and mobile menu provide a Chinese language
switch. Photograph series scroll vertically and display the full images.

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

The production build is written to `dist/`; the preview uses the same port.
When hosting the site, configure SPA fallback to `index.html` for category paths.

## Routes

- `/` — galleries and handwritten title interactions.
- `/landscape` — one landscape photograph.
- `/wildlife` — five wildlife photographs.
- `/documentary` — one documentary demo photograph.
- `/film` — one film demo photograph.
- `/information` — an introduction to the portfolio.

## Assets and privacy

`src/photos.ts` defines the categories and display photographs in `public/photos`.
The repository includes the portfolio's displayed name, signature, and
display images. Image metadata has been removed from published JPEG and PNG
assets. Private originals in `seed/`, local environment files, credentials,
dependencies, and generated build output are excluded from version control.

The site runs without a backend, account system, or analytics integration.

## License

Code is licensed under the [MIT License](LICENSE). Photographs, the signature,
and handwritten title artwork retain their separate copyright; see
[ASSETS-LICENSE.md](ASSETS-LICENSE.md). Bundled fonts retain their respective
SIL Open Font License notices in `public/fonts/licenses/`.
