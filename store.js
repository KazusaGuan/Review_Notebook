/**
 * Review-notes storage: one JSON state document plus one file per pasted image.
 *
 * The browser half owns the document model; this module owns durability and the
 * limits the HTTP routes enforce. State writes are serialized and replace
 * review-notes.json atomically, so an interrupted write never leaves a half
 * document.
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

/** Default directory holding the review-notes document. */
export const DEFAULT_DATA_DIR = 'D:/文档/电路理论'
/** Stored document version. */
export const STATE_VERSION = 1
/** Largest accepted image upload. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
/** Largest accepted state document. */
export const MAX_STATE_BYTES = 2 * 1024 * 1024
/** The only accepted stored image file names. */
export const IMAGE_NAME_PATTERN = /^[A-Za-z0-9-]+\.(?:png|jpg|jpeg|webp|gif)$/

const MAX_NOTEBOOKS = 200
const MAX_PAGES = 200
const MAX_CARDS = 100
const MAX_NAME_LENGTH = 60
const MAX_TITLE_LENGTH = 60
const MAX_SUMMARY_LENGTH = 300
const ORPHAN_IMAGE_AGE_MS = 10 * 60 * 1000
const MIME_BY_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}
const EXTENSION_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** Rejection with a stable code, a user-readable message, and an HTTP status. */
export class StoreError extends Error {
  /**
   * @param {string} code - machine-readable reason.
   * @param {string} message - text the browser may show directly.
   * @param {number} status - HTTP status for the route response.
   */
  constructor(code, message, status = 400) {
    super(message)
    this.name = 'StoreError'
    this.code = code
    this.status = status
  }
}

/** The document a first run starts from. */
export function emptyState() {
  return { version: STATE_VERSION, notebooks: [] }
}

/**
 * Resolve the directory the host reads and writes. The config row supplies
 * `dataDir`; without one the plugin uses the documented default.
 * @param {unknown} config - the loader row's config object.
 * @returns {string} absolute directory path.
 */
export function resolveDataDir(config) {
  let configured = DEFAULT_DATA_DIR
  if (config !== null && typeof config === 'object' && 'dataDir' in config) {
    if (typeof config.dataDir !== 'string' || config.dataDir.trim() === '') {
      throw new StoreError('invalid-config', 'dataDir 必须是非空字符串')
    }
    configured = config.dataDir.trim()
  }
  if (!isAbsolute(configured)) {
    throw new StoreError('invalid-config', `dataDir 必须是绝对路径：${configured}`)
  }
  return resolve(configured)
}

function fail(code, message, status = 400) {
  throw new StoreError(code, message, status)
}

function requireText(value, field, maxLength) {
  if (typeof value !== 'string') fail('invalid-state', `${field} 必须是文本`)
  const trimmed = value.trim()
  if (!trimmed) fail('invalid-state', `${field} 不能为空`)
  if (trimmed.length > maxLength) fail('invalid-state', `${field} 不能超过 ${maxLength} 个字`)
  return trimmed
}

function requireId(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) {
    fail('invalid-state', `${field} 不合法`)
  }
  return value
}

function requireArray(value, field, maxLength) {
  if (!Array.isArray(value)) fail('invalid-state', `${field} 必须是数组`)
  if (value.length > maxLength) fail('invalid-state', `${field} 超过 ${maxLength} 条上限`)
  return value
}

function requireTimestamp(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function requireImageName(value) {
  if (typeof value !== 'string' || !IMAGE_NAME_PATTERN.test(value)) {
    fail('invalid-state', '笔记引用的图片名不合法')
  }
  return value
}

/**
 * Validate and canonicalize a browser-supplied document, dropping unknown
 * fields so only the documented model reaches disk.
 * @param {unknown} raw - parsed state.json or request body.
 * @param {number} [now] - fallback timestamp for missing createdAt values.
 * @returns {{version: number, notebooks: object[]}} normalized document.
 */
export function normalizeState(raw, now = Date.now()) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('invalid-state', '笔记数据结构不合法')
  }
  const timestamp = (value) => requireTimestamp(value, now)
  const notebooks = requireArray(raw.notebooks, '笔记本列表', MAX_NOTEBOOKS).map((notebook) => {
    if (notebook === null || typeof notebook !== 'object' || Array.isArray(notebook)) {
      fail('invalid-state', '笔记本条目不合法')
    }
    const pages = requireArray(notebook.pages, '页列表', MAX_PAGES).map((page) => {
      if (page === null || typeof page !== 'object' || Array.isArray(page)) {
        fail('invalid-state', '页条目不合法')
      }
      const cards = requireArray(page.cards, '笔记列表', MAX_CARDS).map((card) => {
        if (card === null || typeof card !== 'object' || Array.isArray(card)) {
          fail('invalid-state', '笔记条目不合法')
        }
        const width = Number.isFinite(card.width) && card.width > 0 ? Math.round(card.width) : 0
        const height = Number.isFinite(card.height) && card.height > 0 ? Math.round(card.height) : 0
        return {
          id: requireId(card.id, '笔记 id'),
          summary: requireText(card.summary, '一句话总结', MAX_SUMMARY_LENGTH),
          image: requireImageName(card.image),
          width,
          height,
          createdAt: timestamp(card.createdAt),
        }
      })
      return {
        id: requireId(page.id, '页 id'),
        title: requireText(page.title, '页标题', MAX_TITLE_LENGTH),
        createdAt: timestamp(page.createdAt),
        cards,
      }
    })
    return {
      id: requireId(notebook.id, '笔记本 id'),
      name: requireText(notebook.name, '笔记本名称', MAX_NAME_LENGTH),
      createdAt: timestamp(notebook.createdAt),
      pages,
    }
  })
  // Distinct ids keep later lookups by id unambiguous.
  const seen = new Set()
  for (const notebook of notebooks) {
    for (const id of [notebook.id, ...notebook.pages.map((page) => page.id)]) {
      if (seen.has(id)) fail('invalid-state', '存在重复的 id')
      seen.add(id)
    }
    for (const page of notebook.pages) {
      for (const card of page.cards) {
        if (seen.has(card.id)) fail('invalid-state', '存在重复的 id')
        seen.add(card.id)
      }
    }
  }
  return { version: STATE_VERSION, notebooks }
}

function sniffImageExtension(buffer) {
  if (buffer.length >= 8
    && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) return 'png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buffer.length >= 6) {
    const header = buffer.toString('ascii', 0, 6)
    if (header === 'GIF87a' || header === 'GIF89a') return 'gif'
  }
  return null
}

/**
 * Check that the declared media type matches the bytes, then return the stored
 * extension.
 * @param {Buffer} buffer - uploaded bytes.
 * @param {string} mime - declared content type, lower-case without parameters.
 * @returns {string} file extension used on disk.
 */
export function imageExtension(buffer, mime) {
  const expected = EXTENSION_BY_MIME[mime]
  if (!expected) fail('unsupported-image', '只支持 PNG、JPEG、WebP 或 GIF 图片', 415)
  const actual = sniffImageExtension(buffer)
  if (actual === null) fail('unsupported-image', '图片内容无法识别，只支持 PNG、JPEG、WebP 或 GIF', 415)
  const family = actual === 'jpeg' ? 'jpg' : actual
  if (family !== expected) fail('unsupported-image', '图片内容与声明的格式不一致', 415)
  return actual
}

/**
 * File-backed review-notes store rooted at one directory.
 */
export class ReviewNotesStore {
  /** @param {string} root - directory holding review-notes.json and review-notes-images/. */
  constructor(root) {
    this.root = root
    this.statePath = join(root, 'review-notes.json')
    this.imagesDir = join(root, 'review-notes-images')
    this.writeChain = Promise.resolve()
  }

  /**
   * Read the current document; a missing file is the empty document.
   * @returns {Promise<{version: number, notebooks: object[]}>} document.
   */
  async load() {
    let text
    try {
      text = await readFile(this.statePath, 'utf8')
    } catch (err) {
      if (err && err.code === 'ENOENT') return emptyState()
      throw err
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      fail('state-corrupt', `笔记数据文件无法解析：${this.statePath}`, 500)
    }
    return normalizeState(parsed)
  }

  /**
   * Validate and durably replace the document. Writes serialize; the returned
   * promise settles for the write this call enqueued.
   * @param {unknown} raw - browser-supplied document.
   * @returns {Promise<{version: number, notebooks: object[]}>} stored document.
   */
  async write(raw) {
    const state = normalizeState(raw)
    const run = this.writeChain.then(() => this.#writeState(state))
    this.writeChain = run.then(() => undefined, () => undefined)
    return run
  }

  async #writeState(state) {
    await mkdir(this.root, { recursive: true })
    const tempPath = join(this.root, `.state-${process.pid}-${Date.now()}.tmp`)
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.statePath)
    await this.#pruneOrphanImages(state).catch(() => {})
    return state
  }

  /**
   * Store one image file and return its name.
   * @param {Buffer} buffer - uploaded bytes.
   * @param {string} mime - declared content type.
   * @returns {Promise<string>} stored image file name.
   */
  async saveImage(buffer, mime) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) fail('empty-image', '没有收到图片内容')
    if (buffer.length > MAX_IMAGE_BYTES) fail('image-too-large', '图片超过 20 MB，请压缩后再试', 413)
    const extension = imageExtension(buffer, mime)
    await mkdir(this.imagesDir, { recursive: true })
    const name = `${randomUUID()}.${extension}`
    await writeFile(join(this.imagesDir, name), buffer)
    return name
  }

  /**
   * Read one stored image.
   * @param {string} name - stored file name.
   * @returns {Promise<{data: Buffer, mime: string}>} bytes and media type.
   */
  async readImage(name) {
    if (typeof name !== 'string' || !IMAGE_NAME_PATTERN.test(name)) {
      fail('image-not-found', '图片不存在', 404)
    }
    let data
    try {
      data = await readFile(join(this.imagesDir, name))
    } catch (err) {
      if (err && err.code === 'ENOENT') fail('image-not-found', '图片不存在', 404)
      throw err
    }
    const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
    return { data, mime: MIME_BY_EXTENSION[extension] ?? 'application/octet-stream' }
  }

  async #pruneOrphanImages(state) {
    const referenced = new Set()
    for (const notebook of state.notebooks) {
      for (const page of notebook.pages) {
        for (const card of page.cards) referenced.add(card.image)
      }
    }
    const entries = await readdir(this.imagesDir).catch(() => [])
    const cutoff = Date.now() - ORPHAN_IMAGE_AGE_MS
    for (const name of entries) {
      if (!IMAGE_NAME_PATTERN.test(name) || referenced.has(name)) continue
      const filePath = join(this.imagesDir, name)
      const info = await stat(filePath).catch(() => null)
      if (info && info.mtimeMs < cutoff) await unlink(filePath).catch(() => {})
    }
  }
}
