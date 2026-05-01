import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Proxies FRED (no browser CORS) and injects `FRED_API_KEY` from `.env` when missing. */
function fredProxyConfig(env: Record<string, string>) {
  return {
    target: 'https://api.stlouisfed.org',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/fred-proxy/, ''),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configure(proxy: any) {
      proxy.on('proxyReq', (proxyReq: { path?: string }, req: { url?: string }) => {
        const key = env.FRED_API_KEY
        if (!key) return
        const url = req.url ?? ''
        if (url.includes('api_key=')) return
        const sep = url.includes('?') ? '&' : '?'
        proxyReq.path = url + sep + 'api_key=' + encodeURIComponent(key)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fred = fredProxyConfig(env)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/fred-proxy': fred,
      },
    },
    preview: {
      proxy: {
        '/fred-proxy': fred,
      },
    },
  }
})
