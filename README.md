# KUBO Skate Co. — Interactive hero

A skate-inspired landing page prototype featuring a pre-rendered 3D character that follows the mouse. The animation uses a WebP image sequence rendered on a 2D canvas rather than a real-time 3D engine.

## Getting started

Requires Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+).

```bash
npm ci
npm run dev
```

Open the local URL printed in the terminal. Move the mouse across the hero to control the character, and select a skate style to change the displayed description.

```bash
npm run lint     # Check source code
npm run build    # Type-check and build to dist/
npm run preview  # Preview the production build locally
```

## How it works

- Vite resolves the WebP frames in `src/assets/frames/` at build time.
- `src/App.tsx` preloads the images and draws the selected frame on a canvas. Mouse position determines the target frame; interpolation smooths the transition.
- Canvas edge slices extend the rendered scene across the viewport, with device pixel ratio capped for performance.
- The style selector changes the displayed text; it does not change the character or product.

The original technical notes are available in [guia_hero_interactivo_3d.md](guia_hero_interactivo_3d.md).

## Project structure

```text
src/
  App.tsx          Hero, animation and controls
  global.css       Tailwind CSS entry point
  assets/frames/   Pre-rendered WebP sequence
```

Built with React, TypeScript, Vite, Tailwind CSS and the Canvas API.

## Current limitations and possible improvements

- Load frames progressively and prioritize the initial frame to reduce initial network and memory usage.
- Provide a static fallback and respect reduced-motion preferences; add a meaningful interaction for touch and keyboard users.
- Connect the menu and “Explorar tablas” button to real destinations; add product and contact information when available.
- Improve loading and image-error handling, and verify the layout and contrast on mobile devices.
- Add automated interaction and accessibility tests, and measure real-world performance.
- Replace demonstration product specifications with verified business information and confirm rights to the visual assets before commercial use.

## Deployment

Run `npm run build` and publish the generated `dist/` directory to a static hosting provider. For hosting under a subpath such as GitHub Pages for a project repository, configure Vite's `base` to match that subpath before building.
