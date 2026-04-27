/**
 * Cloudflare Worker — FTC Events API CORS proxy
 *
 * Forwards requests to ftc-api.firstinspires.org, injects Basic auth
 * from Worker secrets, and adds CORS headers so browsers can call it.
 *
 * Secrets to configure (run once via Wrangler):
 *   wrangler secret put FTC_API_USERNAME
 *   wrangler secret put FTC_API_SECRET
 */

const UPSTREAM = 'https://ftc-api.firstinspires.org'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS })
    }

    // Build upstream URL: strip the worker origin, keep path + query
    const incoming = new URL(request.url)
    const upstreamUrl = `${UPSTREAM}${incoming.pathname}${incoming.search}`

    const token = btoa(`${env.FTC_API_USERNAME}:${env.FTC_API_SECRET}`)

    let upstream
    try {
      upstream = await fetch(upstreamUrl, {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: 'application/json',
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Stream response body through, adding CORS headers
    const body = await upstream.arrayBuffer()
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        ...CORS_HEADERS,
      },
    })
  },
}
