import assert from 'node:assert/strict'
import { copyFile, mkdir, readdir, stat, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePhotoCatalog } from './generate-photo-catalog.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
const { catalog } = await generatePhotoCatalog(root)
const curation = JSON.parse(await readFile(join(root, 'src/photo-curation.json'), 'utf8'))

for (const [category, photos] of Object.entries(catalog)) {
  const expected = curation.categories[category].flatMap(series => series.photos).length
  assert.equal(photos.length, expected, `Pages must include every curated ${category} photograph`)
  for (const photo of photos) {
    await stat(join(dist, decodeURIComponent(photo.src.slice(1))))
  }
}

// Real directory entries give shared album URLs a successful HTTP response on refresh.
for (const route of [...Object.keys(catalog), 'information']) {
  await mkdir(join(dist, route), { recursive: true })
  await copyFile(join(dist, 'index.html'), join(dist, route, 'index.html'))
}
await copyFile(join(dist, 'index.html'), join(dist, '404.html'))
await writeFile(join(dist, '.nojekyll'), '')

async function totalSize(directory) {
  let bytes = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    assert(!entry.isSymbolicLink(), 'Pages artifacts must not contain symbolic links')
    bytes += entry.isDirectory() ? await totalSize(path) : (await stat(path)).size
  }
  return bytes
}
const bytes = await totalSize(dist)
assert(bytes < 1_000_000_000, `Pages site is over the 1 GB publishing limit: ${bytes} bytes`)
console.log(`Complete Pages mirror: ${Object.values(catalog).flat().length} photographs, ${bytes} bytes`)
