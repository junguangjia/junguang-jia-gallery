import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, open, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CATEGORIES = ['documentary', 'landscape', 'wildlife', 'film']
const MANIFEST_FILE = fileURLToPath(new URL('./pages-photos.json', import.meta.url))
const PHOTOS_DIRECTORY = fileURLToPath(new URL('../public/photos/', import.meta.url))
export const PHOTO_SOURCES = [
  'https://photo.junguangjia.workers.dev/photos/',
  'https://junguangjia.github.io/junguang-jia-gallery/photos/',
]

export function validatePhotoPath(path) {
  if (typeof path !== 'string') throw new Error('Photo path must be a string')
  const parts = path.split('/')
  const name = parts[1] ?? ''
  if (
    parts.length !== 2 || !CATEGORIES.includes(parts[0]) ||
    !/^[^/\\]+\.jpe?g$/i.test(name) ||
    [...name].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    name === '.' || name === '..'
  ) {
    throw new Error(`Invalid photo path: ${JSON.stringify(path)}`)
  }
  return path
}

export function validateManifest(manifest) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.photos) || !manifest.photos.length) {
    throw new Error('Photo manifest must contain a nonempty version 1 photo list')
  }
  const seen = new Set()
  let totalBytes = 0
  for (const photo of manifest.photos) {
    validatePhotoPath(photo?.path)
    if (seen.has(photo.path)) throw new Error(`Duplicate photo path: ${photo.path}`)
    seen.add(photo.path)
    if (!Number.isSafeInteger(photo.bytes) || photo.bytes < 3 || !/^[a-f0-9]{64}$/.test(photo.sha256)) {
      throw new Error(`Invalid photo integrity metadata: ${photo.path}`)
    }
    totalBytes += photo.bytes
  }
  if (
    !Number.isSafeInteger(totalBytes) || manifest.totalPhotos !== manifest.photos.length ||
    manifest.totalBytes !== totalBytes
  ) {
    throw new Error('Photo manifest totals do not match its entries')
  }
  return manifest
}

async function requireDirectory(path, create = false) {
  if (create) await mkdir(path, { recursive: true })
  const stat = await lstat(path)
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Photo directory must be a real directory')
}

async function fileIntegrity(path) {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const chunk of createReadStream(path)) {
    bytes += chunk.length
    hash.update(chunk)
  }
  return { bytes, sha256: hash.digest('hex') }
}

export async function buildManifest(photosDirectory) {
  await requireDirectory(photosDirectory)
  const photos = []
  for (const category of CATEGORIES) {
    const directory = join(photosDirectory, category)
    await requireDirectory(directory)
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!/\.jpe?g$/i.test(entry.name)) continue
      const path = validatePhotoPath(`${category}/${entry.name}`)
      if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Photo must be a regular file: ${path}`)
      photos.push({ path, ...await fileIntegrity(join(directory, entry.name)) })
    }
  }
  photos.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  return validateManifest({
    version: 1,
    totalPhotos: photos.length,
    totalBytes: photos.reduce((sum, photo) => sum + photo.bytes, 0),
    photos,
  })
}

function sourceUrl(source, path) {
  const url = new URL(source)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Photo source must be an HTTPS directory URL without credentials or query parameters')
  }
  return `${url.href.replace(/\/?$/, '/')}${path.split('/').map(encodeURIComponent).join('/')}`
}

async function existingMatches(destination, photo) {
  try {
    const stat = await lstat(destination)
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Photo destination is not a regular file: ${photo.path}`)
    if (stat.size !== photo.bytes) return false
    const integrity = await fileIntegrity(destination)
    return integrity.bytes === photo.bytes && integrity.sha256 === photo.sha256
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function downloadAttempt(photo, destination, url, fetchImpl, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const temporary = `${destination}.download-${randomUUID()}`
  let handle
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { 'accept-encoding': 'identity' },
      credentials: 'omit',
    })
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
    if (/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') ?? '')) {
      throw new Error('HTML response instead of a JPEG')
    }
    if (!response.body) throw new Error('Empty response body')
    const length = response.headers.get('content-length')
    const encoding = response.headers.get('content-encoding')
    if (length !== null && (!encoding || encoding === 'identity')) {
      if (!/^\d+$/.test(length) || Number(length) !== photo.bytes) throw new Error('Content-Length mismatch')
    }
    handle = await open(temporary, 'wx', 0o644)
    const hash = createHash('sha256')
    let bytes = 0
    let prefix = Buffer.alloc(0)
    for await (const value of response.body) {
      if (controller.signal.aborted) throw new Error('Download timed out')
      const chunk = Buffer.from(value)
      bytes += chunk.length
      if (bytes > photo.bytes) throw new Error('Downloaded length exceeds manifest')
      if (prefix.length < 3) {
        prefix = Buffer.concat([prefix, chunk.subarray(0, 3 - prefix.length)])
        if (prefix.length === 3 && !prefix.equals(Buffer.from([0xff, 0xd8, 0xff]))) {
          throw new Error('Response is not a JPEG')
        }
      }
      hash.update(chunk)
      let offset = 0
      while (offset < chunk.length) {
        const result = await handle.write(chunk, offset, chunk.length - offset, null)
        if (!result.bytesWritten) throw new Error('Could not write downloaded photo')
        offset += result.bytesWritten
      }
    }
    if (controller.signal.aborted) throw new Error('Download timed out')
    if (bytes !== photo.bytes) throw new Error('Downloaded length does not match manifest')
    if (hash.digest('hex') !== photo.sha256) throw new Error('SHA256 mismatch')
    await handle.close()
    handle = undefined
    await rename(temporary, destination)
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Download timed out')
    throw error
  } finally {
    clearTimeout(timer)
    controller.abort()
    await handle?.close()
    await rm(temporary, { force: true })
  }
}

export async function downloadPhotos(manifest, {
  photosDirectory = PHOTOS_DIRECTORY,
  sources = PHOTO_SOURCES,
  fetchImpl = globalThis.fetch,
  concurrency = 6,
  timeoutMs = 20_000,
} = {}) {
  validateManifest(manifest)
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new Error('Concurrency must be between 1 and 6')
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 20_000) throw new Error('Timeout must be at most 20 seconds')
  if (!sources.length) throw new Error('At least one photo source is required')
  for (const source of sources) sourceUrl(source, manifest.photos[0].path)
  await requireDirectory(photosDirectory, true)
  for (const category of CATEGORIES) await requireDirectory(join(photosDirectory, category), true)
  let next = 0
  let failure
  let downloaded = 0
  let skipped = 0
  const worker = async () => {
    while (!failure) {
      const photo = manifest.photos[next++]
      if (!photo) return
      try {
        const destination = join(photosDirectory, ...photo.path.split('/'))
        if (await existingMatches(destination, photo)) {
          skipped++
          continue
        }
        const errors = []
        let complete = false
        for (const source of sources) {
          try {
            await downloadAttempt(photo, destination, sourceUrl(source, photo.path), fetchImpl, timeoutMs)
            complete = true
            break
          } catch (error) {
            errors.push(error.message)
          }
        }
        if (!complete) throw new Error(`${photo.path}: all photo sources failed (${errors.join('; ')})`)
        downloaded++
      } catch (error) {
        failure ??= error
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, manifest.photos.length) }, worker))
  if (failure) throw new Error(`Photo collection is incomplete: ${failure.message}`)
  return { total: manifest.photos.length, downloaded, skipped }
}

async function main(args) {
  if (args.length === 2 && args[0] === '--manifest-from') {
    const manifest = await buildManifest(resolve(args[1]))
    await writeFile(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`Photo manifest: ${manifest.totalPhotos} photos, ${manifest.totalBytes} bytes`)
    return
  }
  if (args.length) throw new Error('Usage: node scripts/pages-photos.mjs [--manifest-from <photos-directory>]')
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, 'utf8'))
  const result = await downloadPhotos(manifest)
  console.log(`Photo collection verified: ${result.total} photos (${result.downloaded} downloaded, ${result.skipped} already present)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
