import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'buffer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ftcToken = Buffer.from(`${env.FTC_API_USERNAME}:${env.FTC_API_SECRET}`).toString('base64')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/ftc': {
          target: 'https://ftc-api.firstinspires.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ftc/, ''),
          headers: { Authorization: `Basic ${ftcToken}` },
        },
        '/api/graphql': {
          target: 'https://api.ftcscout.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/graphql/, '/graphql'),
        },
        '/api/tba': {
          target: 'https://www.thebluealliance.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tba/, ''),
          headers: { 'X-TBA-Auth-Key': env.TBA_API_SECRET },
        },
        '/api/statbotics': {
          target: 'https://api.statbotics.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/statbotics/, ''),
        },
      },
    },
  }
})
