# U.S. inflation (FRED + React + D3)

Interactive charts for CPI, core CPI, and PCE year-over-year inflation using the [FRED® API](https://fred.stlouisfed.org/docs/api/fred/).

## Setup

1. Copy `.env.example` to `.env` and set `FRED_API_KEY` ([get a key](https://fred.stlouisfed.org/docs/api/api_key.html)).
2. `npm install` then `npm run dev`.

The Vite dev server proxies `/fred-proxy` to `api.stlouisfed.org` so the browser avoids FRED CORS limits. Use `npm run preview` after `npm run build` for the same proxy locally.

## Stack

Vite, React, TypeScript, D3.

## Live demo (GitHub Pages)

If this repo lives at `github.com/jmalicki/fred-inflation-viz` with **Settings → Pages → Source: GitHub Actions**, the workflow publishes:

**https://jmalicki.github.io/fred-inflation-viz/**

That build sets `VITE_PAGES_BASE=/fred-inflation-viz/` so assets resolve under the project URL. The site uses **bundled sample JSON** for the three tabs (FRED’s API is not callable from the browser on static hosting); local `npm run dev` with `FRED_API_KEY` loads live FRED data.
