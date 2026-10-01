import { open, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const categories = [
  { id: 'documentary', en: 'Documentary', zh: '纪实' },
  { id: 'landscape', en: 'Landscape', zh: '风光' },
  { id: 'wildlife', en: 'Wildlife', zh: '野生动物' },
  { id: 'film', en: 'Film', zh: '胶片' },
]
const fixtureIds = new Map([
  ['documentary/07-documentary-train-cab.jpg', 'train-cab'],
  ['landscape/01-sunset-acacia.jpg', 'sunset-acacia'],
  ['wildlife/02-oryx.jpg', 'oryx'],
  ['wildlife/03-lioness.jpg', 'lioness'],
  ['wildlife/04-giraffes.jpg', 'giraffes'],
  ['wildlife/05-kingfisher.jpg', 'kingfisher'],
  ['wildlife/06-gazelle.jpg', 'gazelle'],
  ['film/08-film-pigeons.jpg', 'pigeons'],
])
const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

async function readBytes(file, length, position) {
  const buffer = Buffer.alloc(length)
  let offset = 0
  while (offset < length) {
    const { bytesRead } = await file.read(buffer, offset, length - offset, position + offset)
    if (bytesRead === 0) throw new Error('Unexpected end of JPEG header')
    offset += bytesRead
  }
  return buffer
}

// Read segment headers only, without loading or decoding the photograph.
async function jpegDimensions(path) {
  const file = await open(path, 'r')
  try {
    const size = (await file.stat()).size
    if ((await readBytes(file, 2, 0)).readUInt16BE(0) !== 0xffd8) {
      throw new Error('Expected a JPEG SOI marker')
    }
    let position = 2
    while (position < size) {
      let marker = await readBytes(file, 2, position)
      if (marker[0] !== 0xff) throw new Error('Invalid JPEG segment marker')
      while (marker[1] === 0xff) {
        position += 1
        marker = await readBytes(file, 2, position)
      }
      position += 2
      const code = marker[1]
      if (code === 0xda || code === 0xd9) break
      if (code === 0x01 || (code >= 0xd0 && code <= 0xd8)) continue
      const length = (await readBytes(file, 2, position)).readUInt16BE(0)
      if (length < 2 || position + length > size) throw new Error('Invalid JPEG segment length')
      if (frameMarkers.has(code)) {
        if (length < 7) throw new Error('Invalid JPEG frame header')
        const frame = await readBytes(file, 5, position + 2)
        const height = frame.readUInt16BE(1)
        const width = frame.readUInt16BE(3)
        if (width === 0 || height === 0) throw new Error('Invalid JPEG dimensions')
        return { width, height }
      }
      position += length
    }
    throw new Error('JPEG dimensions were not found before image data')
  } finally {
    await file.close()
  }
}

export async function generatePhotoCatalog(projectRoot) {
  const curation = JSON.parse(await readFile(join(projectRoot, 'src', 'photo-curation.json'), 'utf8'))
  const assignments = new Set()
  const seriesIds = new Set()
  const validPath = (path) => typeof path === 'string'
    && /^(documentary|landscape|wildlife|film)\/[^/\\]+\.jpe?g$/i.test(path)

  for (const category of categories) {
    const series = curation.categories[category.id]
    if (!Array.isArray(series) || series.length === 0) throw new Error(`Missing series: ${category.id}`)
    for (const item of series) {
      if (!/^[a-z0-9-]+$/.test(item.id) || seriesIds.has(item.id)) throw new Error(`Invalid or repeated series: ${item.id}`)
      seriesIds.add(item.id)
      if (!item.title?.en || !item.title?.zh || !['left', 'right', 'center'].includes(item.align)) {
        throw new Error(`Missing title or alignment: ${item.id}`)
      }
      if (!Array.isArray(item.photos) || item.photos.length === 0) throw new Error(`Empty series: ${item.id}`)
      for (const path of item.photos) {
        if (!validPath(path) || assignments.has(path)) throw new Error(`Invalid or repeated photograph: ${path}`)
        assignments.add(path)
      }
      for (const [path, layout] of Object.entries(item.layout ?? {})) {
        if (!item.photos.includes(path) || !['left', 'right', 'center'].includes(layout.align)
          || !['large', 'medium', 'small'].includes(layout.size)
          || !['outer', 'middle', 'inner'].includes(layout.inset)) {
          throw new Error(`Invalid photograph layout: ${path}`)
        }
      }
    }
  }
  const excluded = new Set()
  for (const item of curation.excluded) {
    if (!validPath(item.source) || excluded.has(item.source) || assignments.has(item.source)
      || !assignments.has(item.duplicateOf)) throw new Error(`Invalid duplicate exclusion: ${item.source}`)
    excluded.add(item.source)
  }

  const available = new Map()
  for (const category of categories) {
    const directory = join(projectRoot, 'public', 'photos', category.id)
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      entries = []
    }
    for (const entry of entries.filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))) {
      const path = `${category.id}/${entry.name}`
      if (!assignments.has(path) && !excluded.has(path)) {
        throw new Error(`Add photos/${path} to src/photo-curation.json before displaying it`)
      }
      available.set(path, { file: join(directory, entry.name), src: `/photos/${category.id}/${encodeURIComponent(entry.name)}` })
    }
  }
  // A clean checkout retains the eight small development samples. Production
  // copies replace them without introducing a second display entry.
  for (const path of fixtureIds.keys()) {
    if (!available.has(path)) {
      const filename = path.split('/')[1]
      available.set(path, { file: join(projectRoot, 'public', 'photos', filename), src: `/photos/${filename}` })
    }
  }
  for (const item of curation.excluded) {
    if (available.has(item.source) && !available.has(item.duplicateOf)) {
      throw new Error(`Duplicate representative is missing: photos/${item.duplicateOf}`)
    }
  }

  const catalog = {}
  const seriesCatalog = {}
  const coverOverrides = {}
  for (const category of categories) {
    catalog[category.id] = []
    seriesCatalog[category.id] = []
    for (const series of curation.categories[category.id]) {
      const present = series.photos.filter((path) => available.has(path))
      if (present.length === 0) continue
      seriesCatalog[category.id].push({ id: series.id, title: series.title })
      for (const [index, path] of present.entries()) {
        const { file, src } = available.get(path)
        let dimensions
        try {
          dimensions = await jpegDimensions(file)
        } catch (error) {
          throw new Error(`Cannot read photos/${path}: ${error.message}`)
        }
        const fixtureId = fixtureIds.get(path)
        if (fixtureId) coverOverrides[fixtureId] = { src, ...dimensions }
        const [sourceCategory, filename] = path.split('/')
        const layout = series.layout?.[path]
        catalog[category.id].push({
          id: fixtureId ?? `${sourceCategory}-${encodeURIComponent(filename)}`,
          src,
          alt: { en: `${series.title.en}, photograph ${index + 1}`, zh: `${series.title.zh}，摄影作品 ${index + 1}` },
          focal: '50% 50%',
          wide: dimensions.width > dimensions.height,
          ...dimensions,
          seriesId: series.id,
          placement: layout?.align ?? series.align,
          plateSize: layout?.size ?? 'medium',
          plateInset: layout?.inset ?? 'middle',
        })
      }
    }
  }
  const source = `// Generated locally by scripts/generate-photo-catalog.mjs. Do not commit.\nimport type { Category, Photo, PhotoSeries } from './photos.ts'\n\nexport const coverOverrides: Partial<Record<string, Pick<Photo, 'src' | 'width' | 'height'>>> = ${JSON.stringify(coverOverrides, null, 2)}\n\nexport const photoCatalog = ${JSON.stringify(catalog, null, 2)} as const satisfies Record<Category['id'], readonly Photo[]>\n\nexport const seriesCatalog = ${JSON.stringify(seriesCatalog, null, 2)} as const satisfies Record<Category['id'], readonly PhotoSeries[]>\n`
  await writeFile(join(projectRoot, 'src', 'photo-catalog.generated.ts'), source)
  return { catalog, seriesCatalog, coverOverrides }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { catalog } = await generatePhotoCatalog(fileURLToPath(new URL('../', import.meta.url)))
  console.log(`Curated photo catalog: ${categories.map(({ id }) => `${id} ${catalog[id].length}`).join(', ')}`)
}
