import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import {
  DEFAULT_DATA_DIR,
  MAX_IMAGE_BYTES,
  ReviewNotesStore,
  StoreError,
  emptyState,
  imageExtension,
  normalizeState,
  resolveDataDir,
} from '../store.js'

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const ABSOLUTE_DIR = process.platform === 'win32' ? 'D:/notes' : '/tmp/notes'

let root

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'review-notes-test-'))
})

after(async () => {
  await rm(root, { recursive: true, force: true })
})

function documentFixture(overrides = {}) {
  return {
    version: 1,
    notebooks: [
      {
        id: 'notebook-1',
        name: '线性代数',
        createdAt: 1700000000000,
        pages: [
          {
            id: 'page-1',
            title: '第 1 页',
            createdAt: 1700000000001,
            cards: [
              {
                id: 'card-1',
                summary: '矩阵乘法的定义：行乘列再求和。',
                image: 'image-1.png',
                width: 1280,
                height: 720,
                createdAt: 1700000000004,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

test('normalizeState trims text and drops unknown fields', () => {
  const raw = documentFixture()
  raw.extra = 'ignored'
  raw.notebooks[0].name = '  线性代数  '
  raw.notebooks[0].pages[0].cards[0].summary = '  行乘列再求和  '
  raw.notebooks[0].pages[0].cards[0].unknown = true
  const state = normalizeState(raw, 1700000000009)
  assert.equal(state.version, 1)
  assert.equal(state.notebooks[0].name, '线性代数')
  assert.equal(state.notebooks[0].pages[0].cards[0].summary, '行乘列再求和')
  assert.equal(state.notebooks[0].pages[0].cards[0].unknown, undefined)
  assert.equal(state.notebooks[0].pages[0].cards[0].width, 1280)
  assert.equal(state.notebooks[0].pages[0].createdAt, 1700000000001)
})

test('normalizeState fills missing timestamps', () => {
  const raw = documentFixture()
  delete raw.notebooks[0].createdAt
  const state = normalizeState(raw, 1700000000009)
  assert.equal(state.notebooks[0].createdAt, 1700000000009)
})

test('normalizeState rejects malformed structures and text', () => {
  assert.throws(() => normalizeState(null), StoreError)
  assert.throws(() => normalizeState({ notebooks: 'nope' }), StoreError)
  assert.throws(() => normalizeState({ notebooks: [documentFixture().notebooks[0], documentFixture().notebooks[0]] }), StoreError)
  const longName = documentFixture()
  longName.notebooks[0].name = 'x'.repeat(61)
  assert.throws(() => normalizeState(longName), /不能超过 60 个字/)
  const emptySummary = documentFixture()
  emptySummary.notebooks[0].pages[0].cards[0].summary = '   '
  assert.throws(() => normalizeState(emptySummary), /不能为空/)
  const badImage = documentFixture()
  badImage.notebooks[0].pages[0].cards[0].image = '../secrets.png'
  assert.throws(() => normalizeState(badImage), /图片名不合法/)
  const badId = documentFixture()
  badId.notebooks[0].pages[0].cards[0].id = 'id with spaces'
  assert.throws(() => normalizeState(badId), /id 不合法/)
  const tooManyCards = documentFixture()
  const page = tooManyCards.notebooks[0].pages[0]
  page.cards = Array.from({ length: 101 }, (_, index) => ({
    id: `card-${index}`,
    summary: '总结',
    image: 'image-1.png',
    createdAt: 1,
  }))
  assert.throws(() => normalizeState(tooManyCards), /超过 100 条上限/)
})

test('imageExtension validates the declared media type against the bytes', () => {
  assert.equal(imageExtension(PNG_HEADER, 'image/png'), 'png')
  assert.equal(imageExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'image/jpeg'), 'jpg')
  assert.equal(imageExtension(Buffer.from('GIF89a...'), 'image/gif'), 'gif')
  assert.equal(imageExtension(Buffer.from('RIFF0000WEBP'), 'image/webp'), 'webp')
  assert.throws(() => imageExtension(PNG_HEADER, 'image/webp'), /格式不一致/)
  assert.throws(() => imageExtension(Buffer.from('not an image'), 'image/png'), /无法识别/)
  assert.throws(() => imageExtension(PNG_HEADER, 'application/octet-stream'), /只支持/)
})

test('resolveDataDir honors the configured directory and rejects bad values', () => {
  assert.equal(resolveDataDir({}), resolve(DEFAULT_DATA_DIR))
  assert.equal(resolveDataDir({ dataDir: ABSOLUTE_DIR }), resolve(ABSOLUTE_DIR))
  assert.equal(resolveDataDir({ dataDir: `  ${ABSOLUTE_DIR}  ` }), resolve(ABSOLUTE_DIR))
  assert.throws(() => resolveDataDir({ dataDir: '' }), /dataDir 必须是非空字符串/)
  assert.throws(() => resolveDataDir({ dataDir: 42 }), /dataDir 必须是非空字符串/)
  assert.throws(() => resolveDataDir({ dataDir: 'relative/notes' }), /dataDir 必须是绝对路径/)
})

test('store starts empty and round-trips a state document', async () => {
  const store = new ReviewNotesStore(join(root, 'roundtrip'))
  assert.deepEqual(await store.load(), emptyState())
  const saved = await store.write(documentFixture())
  assert.equal(saved.notebooks[0].name, '线性代数')
  assert.deepEqual(await store.load(), saved)
  const onDisk = JSON.parse(await readFile(join(root, 'roundtrip', 'review-notes.json'), 'utf8'))
  assert.equal(onDisk.notebooks[0].pages[0].cards[0].summary, '矩阵乘法的定义：行乘列再求和。')
})

test('store reports a corrupt state file with its path', async () => {
  const corruptRoot = join(root, 'corrupt')
  await import('node:fs/promises').then(({ mkdir }) => mkdir(corruptRoot, { recursive: true }))
  await writeFile(join(corruptRoot, 'review-notes.json'), '{ not json')
  const store = new ReviewNotesStore(corruptRoot)
  await assert.rejects(store.load(), /无法解析/)
})

test('store saves and serves images, rejecting traversal and non-images', async () => {
  const store = new ReviewNotesStore(join(root, 'images'))
  const name = await store.saveImage(PNG_HEADER, 'image/png')
  assert.match(name, /^[a-f0-9-]+\.png$/)
  const image = await store.readImage(name)
  assert.equal(image.mime, 'image/png')
  assert.deepEqual(image.data, PNG_HEADER)
  await assert.rejects(store.readImage('../review-notes.json'), /图片不存在/)
  await assert.rejects(store.readImage('missing.png'), /图片不存在/)
  await assert.rejects(store.saveImage(Buffer.alloc(0), 'image/png'), /没有收到图片内容/)
  await assert.rejects(store.saveImage(PNG_HEADER, 'image/gif'), /格式不一致/)
  const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1)
  oversized[0] = 0x89
  oversized[1] = 0x50
  oversized[2] = 0x4e
  oversized[3] = 0x47
  oversized[4] = 0x0d
  oversized[5] = 0x0a
  oversized[6] = 0x1a
  oversized[7] = 0x0a
  await assert.rejects(store.saveImage(oversized, 'image/png'), /超过 20 MB/)
})

test('store prunes unreferenced images only after the grace period', async () => {
  const pruneRoot = join(root, 'prune')
  const store = new ReviewNotesStore(pruneRoot)
  const kept = await store.saveImage(PNG_HEADER, 'image/png')
  const orphan = await store.saveImage(PNG_HEADER, 'image/png')
  const state = documentFixture()
  state.notebooks[0].pages[0].cards[0].image = kept
  await store.write(state)
  const fresh = await store.readImage(orphan)
  assert.ok(fresh.data.length > 0, 'fresh orphan survives the grace period')
  const old = new Date(Date.now() - 60 * 60 * 1000)
  await utimes(join(pruneRoot, 'review-notes-images', orphan), old, old)
  await store.write(state)
  await assert.rejects(store.readImage(orphan), /图片不存在/)
  const stillThere = await store.readImage(kept)
  assert.deepEqual(stillThere.data, PNG_HEADER)
})
