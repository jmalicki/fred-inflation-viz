import { useCallback, useEffect, useMemo, useState } from 'react'
import { InflationChart } from './components/InflationChart'
import { INFLATION_SERIES, loadInflationSeries, type InflationPoint, type InflationSeriesId } from './fred'
import './App.css'

export default function App() {
  const [seriesId, setSeriesId] = useState<InflationSeriesId>('CPIAUCSL')
  const [points, setPoints] = useState<InflationPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingDemo, setUsingDemo] = useState(false)

  const meta = useMemo(() => INFLATION_SERIES.find((s) => s.id === seriesId)!, [seriesId])

  const load = useCallback(async (id: InflationSeriesId) => {
    setLoading(true)
    setError(null)
    setUsingDemo(false)
    try {
      const { points: next, source } = await loadInflationSeries(id)
      setPoints(next)
      setUsingDemo(source === 'demo')
    } catch (e) {
      setPoints([])
      setError(e instanceof Error ? e.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(seriesId)
  }, [seriesId, load])

  const ariaLabel = `${meta.label}, ${meta.subtitle}. Drag the brush on the lower mini-chart to zoom the time range. Hover for values.`

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <h1>U.S. inflation from FRED</h1>
          <p className="lede">
            Interactive React + D3 chart. With a local API key, data loads from the{' '}
            <a href="https://fred.stlouisfed.org/" target="_blank" rel="noreferrer">
              St. Louis Fed FRED® API
            </a>
            ; on static hosts (for example GitHub Pages) you still get an interactive chart from bundled sample
            series. Brush the mini-chart below to zoom; hover the main chart for values.
          </p>
        </div>
      </header>

      <section className="controls" aria-label="Series">
        {INFLATION_SERIES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === seriesId ? 'pill pill-active' : 'pill'}
            onClick={() => setSeriesId(s.id)}
          >
            <span className="pill-title">{s.label}</span>
            <span className="pill-sub">{s.subtitle}</span>
          </button>
        ))}
      </section>

      {usingDemo && !error && (
        <div className="banner banner-demo" role="status">
          <strong>Sample data.</strong> FRED is not reachable from this static host (or the proxy is unavailable), so
          the chart uses bundled placeholder YoY series for each tab. Run <code>npm run dev</code> with{' '}
          <code>FRED_API_KEY</code> in <code>.env</code> for live St. Louis Fed figures.
        </div>
      )}

      {error && (
        <div className="banner banner-error" role="alert">
          <strong>Data unavailable.</strong> {error}
          <p className="banner-hint">
            Create a free API key at{' '}
            <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noreferrer">
              fred.stlouisfed.org/docs/api/api_key.html
            </a>
            , then add <code>FRED_API_KEY=your_key</code> to a <code>.env</code> file in this project and restart{' '}
            <code>npm run dev</code> (or <code>npm run preview</code>). The dev server proxies FRED so your browser never hits their CORS wall.
          </p>
        </div>
      )}

      {loading && !error && <p className="status">Loading series…</p>}

      {!loading && !error && points.length > 0 && (
        <figure className="figure">
          <figcaption className="figcaption">
            <span className="figcaption-title">{meta.label}</span>
            <span className="figcaption-sub">{meta.subtitle}</span>
          </figcaption>
          <InflationChart data={points} ariaLabel={ariaLabel} />
        </figure>
      )}

      <footer className="footer">
        <span>
          {usingDemo
            ? 'Sample series for layout and interaction; not official FRED releases.'
            : 'Source: Federal Reserve Economic Data (FRED). YoY % is computed from the published index (12-month change).'}
        </span>
      </footer>
    </div>
  )
}
