import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { generatePhotoCatalog } from './generate-photo-catalog.mjs'

const curation = JSON.parse(await readFile(new URL('../src/photo-curation.json', import.meta.url), 'utf8'))
const covers = {
  documentary: 'documentary/07-documentary-train-cab.jpg',
  landscape: 'landscape/01-sunset-acacia.jpg',
  wildlife: 'wildlife/02-oryx.jpg',
  film: 'film/08-film-pigeons.jpg',
}
const samples = [...Object.values(covers), ...['03-lioness.jpg', '04-giraffes.jpg', '05-kingfisher.jpg', '06-gazelle.jpg'].map((name) => `wildlife/${name}`)]

// Synthetic frame headers exercise dimension parsing without using private photographs.
function jpegHeader(width, height) {
  const header = Buffer.from('ffd8ffc00011080000000003011100021101031101ffd9', 'hex')
  header.writeUInt16BE(height, 7)
  header.writeUInt16BE(width, 9)
  return header
}

async function putPhoto(root, path, width = 1800, height = 1200) {
  const file = join(root, 'public', 'photos', path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, jpegHeader(width, height))
}

async function fixture(t, metadata = curation) {
  const root = await mkdtemp(join(tmpdir(), 'gallery-catalog-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src'))
  await writeFile(join(root, 'src', 'photo-curation.json'), JSON.stringify(metadata))
  for (const path of samples) await putPhoto(root, path.split('/')[1])
  return root
}

test('curation retains the approved covers, duplicates and category migrations', () => {
  const assigned = Object.fromEntries(Object.entries(curation.categories).map(([id, series]) => [id, series.flatMap((item) => item.photos)]))
  assert.deepEqual(Object.fromEntries(Object.entries(assigned).map(([id, paths]) => [id, paths.length])), {
    documentary: 96, landscape: 45, wildlife: 74, film: 43,
  })
  const all = Object.values(assigned).flat()
  assert.equal(new Set(all).size, 258)
  for (const [category, path] of Object.entries(covers)) assert.equal(assigned[category][0], path)
  assert.equal(curation.excluded.length, 16)
  for (const { source, duplicateOf } of curation.excluded) {
    assert(!all.includes(source))
    assert(all.includes(duplicateOf))
  }
  for (const filename of ['DSC00326.jpg', 'DSC08137-2.jpg', 'DSC08215-2.jpg', 'DSC09228.jpg', 'DSC09736.JPG', 'DSC09740.JPG']) {
    assert(assigned.documentary.includes(`landscape/${filename}`))
  }
  assert(assigned.wildlife.includes('landscape/DSC05373.jpg'))
})

test('a clean checkout displays all eight tracked samples in curated order', async (t) => {
  const root = await fixture(t)
  const { catalog, seriesCatalog } = await generatePhotoCatalog(root)
  assert.deepEqual(Object.fromEntries(Object.entries(catalog).map(([id, photos]) => [id, photos.length])), {
    documentary: 1, landscape: 1, wildlife: 5, film: 1,
  })
  assert.deepEqual(catalog.wildlife.map((photo) => photo.id), ['oryx', 'gazelle', 'giraffes', 'lioness', 'kingfisher'])
  for (const [id, photos] of Object.entries(catalog)) {
    for (const photo of photos) {
      assert.equal(photo.src.split('/').length, 3)
      assert.equal(photo.width, 1800)
      assert.equal(photo.height, 1200)
      assert(seriesCatalog[id].some((series) => series.id === photo.seriesId))
    }
  }
})

test('each cover begins a coherent first series with explicit continuation', () => {
  const openings = {
    documentary: ['documentary/07-documentary-train-cab.jpg', 'documentary/DSC04898.jpg'],
    landscape: ['landscape/01-sunset-acacia.jpg', 'landscape/DSC07506.jpg', 'landscape/DSC07465.jpg'],
    wildlife: ['wildlife/02-oryx.jpg', 'wildlife/DSC03262-2.jpg', 'wildlife/DSC04728.JPG', 'wildlife/DSC03444-2.jpg'],
    film: ['film/08-film-pigeons.jpg', 'film/000046190019.jpg'],
  }
  for (const [category, paths] of Object.entries(openings)) {
    assert.deepEqual(curation.categories[category][0].photos, paths)
  }
})

test('production copies and migrated photos retain source paths and full dimensions', async (t) => {
  const root = await fixture(t)
  await putPhoto(root, covers.documentary, 4500, 3000)
  await putPhoto(root, 'landscape/DSC00326.jpg', 1600, 2400)
  await putPhoto(root, 'landscape/DSC05373.jpg', 6000, 2553)
  await putPhoto(root, 'documentary/DSC04898.jpg', 2000, 1400)
  const { catalog } = await generatePhotoCatalog(root)
  const train = catalog.documentary[0]
  assert.equal(train.src, '/photos/documentary/07-documentary-train-cab.jpg')
  assert.equal(train.width, 4500)
  assert.equal(catalog.documentary.filter((photo) => photo.id === 'train-cab').length, 1)
  const motorcycle = catalog.documentary.find((photo) => photo.id === 'landscape-DSC00326.jpg')
  assert.equal(motorcycle.src, '/photos/landscape/DSC00326.jpg')
  assert.equal(motorcycle.seriesId, 'roadside-markets')
  assert.equal(motorcycle.wide, false)
  const oryx = catalog.wildlife.find((photo) => photo.id === 'landscape-DSC05373.jpg')
  assert.equal(oryx.width, 6000)
  assert.equal(oryx.height, 2553)
  assert.equal(oryx.wide, true)
  // An ordinary 10:7 horizontal image must also be large; no every-third rule.
  assert.equal(catalog.documentary[1].wide, true)
})

test('duplicates are hidden without changing their source files', async (t) => {
  const root = await fixture(t)
  await putPhoto(root, 'documentary/DSC03079.jpg')
  await putPhoto(root, 'documentary/DSC03079 2.jpg')
  const source = join(root, 'public/photos/documentary/DSC03079 2.jpg')
  const before = await readFile(source)
  const { catalog } = await generatePhotoCatalog(root)
  assert(!catalog.documentary.some((photo) => photo.id.includes('DSC03079%202.jpg')))
  assert.deepEqual(await readFile(source), before)
})

test('unassigned files and missing duplicate representatives fail visibly', async (t) => {
  const root = await fixture(t)
  await putPhoto(root, 'film/new-photo.jpg')
  await assert.rejects(generatePhotoCatalog(root), /Add photos\/film\/new-photo.jpg to src\/photo-curation.json/)
  await rm(join(root, 'public/photos/film/new-photo.jpg'))
  await putPhoto(root, 'documentary/DSC03079 2.jpg')
  await assert.rejects(generatePhotoCatalog(root), /Duplicate representative is missing/)
})

test('repeated assignments are rejected before generating a catalog', async (t) => {
  const metadata = structuredClone(curation)
  metadata.categories.film[0].photos.push(covers.documentary)
  const root = await fixture(t, metadata)
  await assert.rejects(generatePhotoCatalog(root), /Invalid or repeated photograph/)
})
