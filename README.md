# U.S. inflation (FRED + React + D3)

Interactive charts for CPI, core CPI, and PCE year-over-year inflation using the [FRED® API](https://fred.stlouisfed.org/docs/api/fred/).

## Setup

1. Copy `.env.example` to `.env` and set `FRED_API_KEY` ([get a key](https://fred.stlouisfed.org/docs/api/api_key.html)).
2. `npm install` then `npm run dev`.

The Vite dev server proxies `/fred-proxy` to `api.stlouisfed.org` so the browser avoids FRED CORS limits. Use `npm run preview` after `npm run build` for the same proxy locally.

## Stack

Vite, React, TypeScript, D3.
