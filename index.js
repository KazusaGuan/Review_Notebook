/**
 * Review-notes host half: same-origin HTTP routes for the browser half's
 * notebooks, pages, and pasted images. Durability lives in the configured
 * directory (review-notes.json plus review-notes-images/), so notes survive
 * browser profile changes and app restarts.
 */
import { MAX_IMAGE_BYTES, MAX_STATE_BYTES, ReviewNotesStore, StoreError, resolveDataDir } from './store.js'

const STATE_ROUTE = '/review-notes/api/state'
const STATUS_ROUTE = '/review-notes/api/status'
const IMAGE_ROUTE = '/review-notes/api/image'
const IMAGE_PREFIX = '/review-notes/images/'

function sendJson(res, status, payload) {
  if (res.writableEnded) return
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendError(res, err) {
  const status = err instanceof StoreError && err.status ? err.status : 500
  const code = err instanceof StoreError ? err.code : 'internal-error'
  const message = err instanceof Error ? err.message : '未知错误'
  if (status >= 500) console.warn('[review-notes]', code, message)
  sendJson(res, status, { ok: false, error: { code, message } })
}

function handle(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => sendError(res, err))
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new StoreError('body-too-large', '上传内容超过大小限制', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function methodNotAllowed(res, allow) {
  const body = JSON.stringify({ ok: false, error: { code: 'method-not-allowed', message: '请求方法不支持' } })
  res.writeHead(405, {
    allow,
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function statusRoute(store, req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, 'GET')
    return
  }
  sendJson(res, 200, { ok: true, dataDir: store.root, stateFile: store.statePath })
}

async function stateRoute(store, req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, { ok: true, state: await store.load() })
    return
  }
  if (req.method !== 'PUT') {
    methodNotAllowed(res, 'GET, PUT')
    return
  }
  const body = await readBody(req, MAX_STATE_BYTES)
  let parsed
  try {
    parsed = JSON.parse(body.toString('utf8'))
  } catch {
    throw new StoreError('invalid-json', '请求内容不是合法的 JSON')
  }
  const state = await store.write(parsed)
  sendJson(res, 200, { ok: true, state })
}

async function imageUploadRoute(store, req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST')
    return
  }
  const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  const body = await readBody(req, MAX_IMAGE_BYTES)
  const image = await store.saveImage(body, mime)
  sendJson(res, 200, { ok: true, image })
}

async function imageFileRoute(store, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    methodNotAllowed(res, 'GET, HEAD')
    return
  }
  const raw = (req.url || '').split('?')[0]
  if (!raw.startsWith(IMAGE_PREFIX)) {
    throw new StoreError('image-not-found', '图片不存在', 404)
  }
  let name
  try {
    name = decodeURIComponent(raw.slice(IMAGE_PREFIX.length))
  } catch {
    throw new StoreError('image-not-found', '图片不存在', 404)
  }
  const { data, mime } = await store.readImage(name)
  res.writeHead(200, {
    'content-type': mime,
    'content-length': data.length,
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  })
  if (req.method === 'HEAD') res.end()
  else res.end(data)
}

/**
 * Mount the review-notes routes on the dsh web server. Without a web server
 * (headless assemblies) the plugin contributes nothing.
 * @param {object} ctx - cordis context of this Loader entry.
 * @param {unknown} config - row config; `dataDir` overrides the default folder.
 */
export function apply(ctx, config) {
  const web = ctx.get('webServer')
  if (!web) return
  const store = new ReviewNotesStore(resolveDataDir(config))
  ctx.effect(() => web.register({
    kind: 'exact',
    path: STATUS_ROUTE,
    handler: handle((req, res) => statusRoute(store, req, res)),
  }))
  ctx.effect(() => web.register({
    kind: 'exact',
    path: STATE_ROUTE,
    handler: handle((req, res) => stateRoute(store, req, res)),
  }))
  ctx.effect(() => web.register({
    kind: 'exact',
    path: IMAGE_ROUTE,
    handler: handle((req, res) => imageUploadRoute(store, req, res)),
  }))
  ctx.effect(() => web.register({
    kind: 'prefix',
    path: IMAGE_PREFIX.slice(0, -1),
    handler: handle((req, res) => imageFileRoute(store, req, res)),
  }))
}
