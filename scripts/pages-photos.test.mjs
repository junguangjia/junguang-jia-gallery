import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildManifest, downloadPhotos, validateManifest, validatePhotoPath } from './pages-photos.mjs'

const jpeg = (text = 'photograph') => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(text), Buffer.from([0xff, 0xd9])])
const digest = (data) => createHash('sha256').update(data).digest('hex')
const photo = (path, data) => ({ path, bytes: data.length, sha256: digest(data) })
const manifest = (photos) => ({ version: 1, totalPhotos: photos.length, totalBytes: photos.reduce((sum, item) => sum + item.bytes, 0), photos })
const sources = ['https://primary.example/photos/', 'https://backup.example/gallery/photos/']

async function withDirectory(fn) {
  const directory = await mkdtemp(join(tmpdir(), 'gallery-pages-photos-'))
  try { await fn(directory) } finally { await rm(directory, { recursive: true, force: true }) }
}

test('accepts single JPEG names and rejects paths outside the four production categories', () => {
  for (const path of ['documentary/图片 1.JPG', 'film/a.jpeg', 'wildlife/photograph.jpg', 'landscape/panorama.jpg']) {
    assert.equal(validatePhotoPath(path), path)
  }
  for (const path of ['../secret.jpg', '/film/a.jpg', 'film/../a.jpg', 'film/nested/a.jpg', 'film\\a.jpg', 'other/a.jpg', 'film/a.png', 'film/a.jpg\u0000', 'film//a.jpg', 'Film/a.jpg', 'film/%2e%2e/a.jpg']) {
    assert.throws(() => validatePhotoPath(path), /Invalid photo path/)
  }
})

test('manifest detects truncation, duplicate entries and invalid integrity metadata', () => {
  const item = photo('film/a.jpg', jpeg())
  assert.throws(() => validateManifest({ ...manifest([item]), totalPhotos: 2 }), /totals/)
  assert.throws(() => validateManifest({ ...manifest([item]), totalBytes: item.bytes + 1 }), /totals/)
  assert.throws(() => validateManifest(manifest([item, item])), /Duplicate/)
  assert.throws(() => validateManifest(manifest([{ ...item, sha256: 'invalid' }])), /integrity/)
  assert.throws(() => validateManifest(manifest([])), /nonempty/)
})

test('checked-in manifest contains the complete 274-file production library', async () => {
  const checkedIn = validateManifest(JSON.parse(await readFile(new URL('./pages-photos.json', import.meta.url), 'utf8')))
  assert.equal(checkedIn.totalPhotos, 274)
  assert.deepEqual(Object.fromEntries(['documentary', 'landscape', 'wildlife', 'film'].map((category) => [category, checkedIn.photos.filter((item) => item.path.startsWith(`${category}/`)).length])), {
    documentary: 96, landscape: 60, wildlife: 75, film: 43,
  })
})

test('rebuilding a manifest hashes every production category and uses stable ordering', async () => {
  await withDirectory(async (directory) => {
    for (const category of ['documentary', 'landscape', 'wildlife', 'film']) {
      await mkdir(join(directory, category))
      await writeFile(join(directory, category, 'z.JPG'), jpeg(category))
      await writeFile(join(directory, category, 'a.jpg'), jpeg('first'))
    }
    await writeFile(join(directory, 'film', 'notes.txt'), 'not a photograph')
    const result = await buildManifest(directory)
    assert.equal(result.totalPhotos, 8)
    assert.deepEqual(result.photos.map((item) => item.path), [...result.photos.map((item) => item.path)].sort())
    assert.deepEqual(result.photos[0], photo('documentary/a.jpg', jpeg('first')))
    assert.deepEqual(await buildManifest(directory), result)
  })
})

test('HTML at the primary source falls back and URL-encodes each path segment', async () => {
  await withDirectory(async (directory) => {
    const data = jpeg('backup photograph')
    const item = photo('documentary/图片 1.JPG', data)
    const calls = []
    const fetchImpl = async (url) => {
      calls.push(url)
      return calls.length === 1
        ? new Response('<!doctype html><html>error</html>', { headers: { 'content-type': 'text/html' } })
        : new Response(data, { headers: { 'content-type': 'image/jpeg', 'content-length': String(data.length) } })
    }
    assert.deepEqual(await downloadPhotos(manifest([item]), { photosDirectory: directory, sources, fetchImpl }), { total: 1, downloaded: 1, skipped: 0 })
    assert.deepEqual(calls, sources.map((source) => `${source}documentary/${encodeURIComponent('图片 1.JPG')}`))
    assert.deepEqual(await readFile(join(directory, item.path)), data)
    assert.deepEqual(await readdir(join(directory, 'documentary')), ['图片 1.JPG'])
  })
})

test('matching existing files skip the network while same-size corrupt files are replaced', async () => {
  await withDirectory(async (directory) => {
    const data = jpeg('correct')
    const items = [photo('film/good.jpg', data), photo('film/corrupt.jpg', data)]
    await mkdir(join(directory, 'film'))
    await writeFile(join(directory, items[0].path), data)
    await writeFile(join(directory, items[1].path), jpeg('CORRUPT'))
    const calls = []
    const fetchImpl = async (url) => { calls.push(url); return new Response(data) }
    assert.deepEqual(await downloadPhotos(manifest(items), { photosDirectory: directory, sources, fetchImpl }), { total: 2, downloaded: 1, skipped: 1 })
    assert.equal(calls.length, 1)
    assert.ok(calls[0].endsWith('/film/corrupt.jpg'))
    assert.deepEqual(await readFile(join(directory, items[1].path)), data)
  })
})

test('truncation and SHA256 failures reject the collection and leave no partial image', async () => {
  await withDirectory(async (directory) => {
    const data = jpeg('correct')
    const item = photo('film/a.jpg', data)
    let calls = 0
    const fetchImpl = async () => new Response(++calls === 1 ? data.subarray(0, data.length - 1) : jpeg('CORRUPT'))
    await assert.rejects(downloadPhotos(manifest([item]), { photosDirectory: directory, sources, fetchImpl }), /Photo collection is incomplete.*length.*SHA256/)
    assert.equal(calls, 2)
    assert.deepEqual(await readdir(join(directory, 'film')), [])
  })
})

test('a disguised HTML body fails even when its manifest hash matches', async () => {
  await withDirectory(async (directory) => {
    const data = Buffer.from('<html>not an image</html>')
    await assert.rejects(downloadPhotos(manifest([photo('film/error.jpg', data)]), {
      photosDirectory: directory, sources, fetchImpl: async () => new Response(data),
    }), /Response is not a JPEG/)
    assert.deepEqual(await readdir(join(directory, 'film')), [])
  })
})

test('timed-out primary requests abort before trying the backup', async () => {
  await withDirectory(async (directory) => {
    const data = jpeg()
    let aborted = false
    let calls = 0
    const fetchImpl = async (_url, { signal }) => {
      if (++calls === 2) return new Response(data)
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => {
        aborted = true
        reject(new Error('aborted'))
      }, { once: true }))
    }
    await downloadPhotos(manifest([photo('film/a.jpg', data)]), { photosDirectory: directory, sources, fetchImpl, timeoutMs: 25 })
    assert.equal(aborted, true)
    assert.equal(calls, 2)
  })
})

test('invalid paths and destination symlinks fail before a network request', async () => {
  await withDirectory(async (directory) => {
    let calls = 0
    const fetchImpl = async () => { calls++; return new Response(jpeg()) }
    await assert.rejects(downloadPhotos(manifest([photo('film/../../escape.jpg', jpeg())]), { photosDirectory: directory, fetchImpl }), /Invalid photo path/)
    await mkdir(join(directory, 'outside'))
    await symlink(join(directory, 'outside'), join(directory, 'film'))
    await assert.rejects(downloadPhotos(manifest([photo('film/a.jpg', jpeg())]), { photosDirectory: directory, fetchImpl }), /real directory/)
    assert.equal(calls, 0)
    assert.deepEqual(await readdir(join(directory, 'outside')), [])
  })
})

test('default download pool never exceeds six simultaneous requests', async () => {
  await withDirectory(async (directory) => {
    const data = jpeg()
    const items = Array.from({ length: 13 }, (_, index) => photo(`film/${index}.jpg`, data))
    let active = 0
    let maximum = 0
    const fetchImpl = async () => {
      maximum = Math.max(maximum, ++active)
      await new Promise((done) => setTimeout(done, 10))
      active--
      return new Response(data)
    }
    const result = await downloadPhotos(manifest(items), { photosDirectory: directory, sources, fetchImpl })
    assert.equal(maximum, 6)
    assert.equal(result.downloaded, 13)
  })
})
