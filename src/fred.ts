export type FredObservation = { date: string; value: number | null }

export type InflationPoint = { date: Date; value: number }

export const INFLATION_SERIES = [
  {
    id: 'CPIAUCSL',
    label: 'CPI (all urban consumers)',
    subtitle: 'Year-over-year % change',
    yoyMonths: 12,
  },
  {
    id: 'CPILFESL',
    label: 'Core CPI (less food & energy)',
    subtitle: 'Year-over-year % change',
    yoyMonths: 12,
  },
  {
    id: 'PCEPI',
    label: 'PCE price index',
    subtitle: 'Year-over-year % change',
    yoyMonths: 12,
  },
] as const

export type InflationSeriesId = (typeof INFLATION_SERIES)[number]['id']

export type DataSource = 'fred' | 'demo'

type DemoRow = { date: string; value: number }

async function fetchDemoSeries(seriesId: InflationSeriesId): Promise<InflationPoint[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}demo/${seriesId}.json`)
  if (!res.ok) throw new Error(`Demo bundle missing (${res.status})`)
  const rows = (await res.json()) as DemoRow[]
  return rows.map((r) => ({
    date: new Date(r.date + 'T12:00:00'),
    value: r.value,
  }))
}

/** Live FRED when the dev/preview proxy works; otherwise static demo JSON shipped with the app. */
export async function loadInflationSeries(
  seriesId: InflationSeriesId,
): Promise<{ points: InflationPoint[]; source: DataSource }> {
  const cfg = INFLATION_SERIES.find((s) => s.id === seriesId)!
  try {
    const obs = await fetchFredObservations(seriesId)
    const points = observationsToYoY(obs, cfg.yoyMonths)
    return { points, source: 'fred' }
  } catch {
    const points = await fetchDemoSeries(seriesId)
    return { points, source: 'demo' }
  }
}

type FredObservationsResponse = {
  observations?: { date: string; value: string }[]
  error_message?: string
}

/** Same-origin path: Vite proxies `/fred-proxy` → `api.stlouisfed.org` (see vite.config.ts). */
export async function fetchFredObservations(seriesId: string): Promise<FredObservation[]> {
  const params = new URLSearchParams({
    series_id: seriesId,
    file_type: 'json',
    observation_start: '1970-01-01',
  })
  const res = await fetch(`/fred-proxy/fred/series/observations?${params}`)
  const body = (await res.json()) as FredObservationsResponse

  if (!res.ok) {
    const msg = body.error_message ?? res.statusText
    throw new Error(msg || `FRED request failed (${res.status})`)
  }

  const rows = body.observations ?? []
  const out: FredObservation[] = []
  for (const row of rows) {
    const v = row.value
    if (v === '.' || v === '') {
      out.push({ date: row.date, value: null })
      continue
    }
    const n = Number.parseFloat(v)
    if (!Number.isFinite(n)) {
      out.push({ date: row.date, value: null })
      continue
    }
    out.push({ date: row.date, value: n })
  }
  return out
}

export function observationsToYoY(
  obs: FredObservation[],
  lagMonths: number,
): InflationPoint[] {
  const valid = obs.filter((o): o is { date: string; value: number } => o.value !== null)
  const result: InflationPoint[] = []
  for (let i = lagMonths; i < valid.length; i++) {
    const cur = valid[i].value
    const prev = valid[i - lagMonths].value
    if (prev <= 0 || cur <= 0) continue
    result.push({
      date: new Date(valid[i].date + 'T12:00:00'),
      value: (cur / prev - 1) * 100,
    })
  }
  return result
}
