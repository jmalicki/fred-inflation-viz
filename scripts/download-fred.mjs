#!/usr/bin/env node
/**
 * Downloads FRED series/observations JSON for the three inflation series used by the app.
 * Uses FRED_API_KEY from process.env or from a .env file (project root by default).
 *
 * Usage:
 *   npm run fred:download
 *   FRED_API_KEY=... npm run fred:download
 *   node scripts/download-fred.mjs --env-file /path/to/.env
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SERIES = [
  { id: 'CPIAUCSL', name: 'CPI (all urban consumers)' },
  { id: 'CPILFESL', name: 'Core CPI' },
  { id: 'PCEPI', name: 'PCE price index' },
]

function parseArgs(argv) {
  let envFile = path.join(root, '.env')
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--env-file' && argv[i + 1]) {
      envFile = path.resolve(argv[++i])
    }
  }
  return { envFile }
}

function loadKeyFromFile(envFile) {
  if (!fs.existsSync(envFile)) return
  const text = fs.readFileSync(envFile, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^FRED_API_KEY\s*=\s*(.*)$/)
    if (m) {
      let v = m[1].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      process.env.FRED_API_KEY = v
      return
    }
  }
}

async function fetchSeries(apiKey, seriesId) {
  const u = new URL('https://api.stlouisfed.org/fred/series/observations')
  u.searchParams.set('series_id', seriesId)
  u.searchParams.set('api_key', apiKey)
  u.searchParams.set('file_type', 'json')
  u.searchParams.set('observation_start', '1970-01-01')
  const res = await fetch(u)
  const body = await res.json()
  if (!res.ok) {
    const msg = body.error_message || res.statusText
    throw new Error(`${seriesId}: ${msg}`)
  }
  return body
}

async function main() {
  const { envFile } = parseArgs(process.argv)
  if (!process.env.FRED_API_KEY) loadKeyFromFile(envFile)

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    console.error(
      'Missing FRED_API_KEY. Either:\n' +
        `  • Create ${path.join(root, '.env')} with FRED_API_KEY=...\n` +
        '  • Or: FRED_API_KEY=... npm run fred:download\n' +
        '  • Or: node scripts/download-fred.mjs --env-file /path/to/.env',
    )
    process.exit(1)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = path.join(root, 'data', 'fred', 'snapshots', stamp)
  fs.mkdirSync(outDir, { recursive: true })

  const manifest = {
    fetchedAt: new Date().toISOString(),
    series: SERIES.map((s) => s.id),
    source: 'https://api.stlouisfed.org/fred/series/observations',
  }

  for (const s of SERIES) {
    process.stderr.write(`Fetching ${s.id}… `)
    const data = await fetchSeries(apiKey, s.id)
    const file = path.join(outDir, `${s.id}.json`)
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
    const n = data.observations?.length ?? 0
    process.stderr.write(`${n} observations → ${path.relative(root, file)}\n`)
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`\nSaved under: ${path.relative(root, outDir)}/`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
