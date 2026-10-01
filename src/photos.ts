import { coverOverrides, photoCatalog, seriesCatalog } from './photo-catalog.generated.ts'

export type Photo = {
  id: string
  src: string
  alt: { en: string; zh: string }
  focal: string
  /** Horizontal photographs keep their full aspect ratio within the cover bounds. */
  wide: boolean
  /** Natural dimensions reserve the image's aspect ratio before it loads. */
  width?: number
  height?: number
  seriesId?: string
  placement?: 'left' | 'right' | 'center'
  plateSize?: 'large' | 'medium' | 'small'
  plateInset?: 'outer' | 'middle' | 'inner'
}

export type PhotoSeries = {
  id: string
  title: { en: string; zh: string }
}

const fixturePhotos: readonly Photo[] = [
  {
    id: 'sunset-acacia',
    src: '/photos/01-sunset-acacia.jpg',
    alt: {
      en: 'Acacia trees and an antelope at sunset',
      zh: '日落时的金合欢与羚羊',
    },
    focal: '50% 40%',
    wide: true,
  },
  {
    id: 'oryx',
    src: '/photos/02-oryx.jpg',
    alt: {
      en: 'Two oryx standing in dry grassland',
      zh: '两只长角羚站在干草原上',
    },
    focal: '62% 58%',
    wide: true,
  },
  {
    id: 'lioness',
    src: '/photos/03-lioness.jpg',
    alt: {
      en: 'Lioness looking toward the camera',
      zh: '看向镜头的母狮',
    },
    focal: '62% 60%',
    wide: false,
  },
  {
    id: 'giraffes',
    src: '/photos/04-giraffes.jpg',
    alt: {
      en: 'Giraffes on a grassy hillside',
      zh: '草坡上的长颈鹿',
    },
    focal: '50% 38%',
    wide: true,
  },
  {
    id: 'kingfisher',
    src: '/photos/05-kingfisher.jpg',
    alt: {
      en: 'Kingfisher perched on a bare branch',
      zh: '翠鸟停在枯枝上',
    },
    focal: '32% 58%',
    wide: false,
  },
  {
    id: 'gazelle',
    src: '/photos/06-gazelle.jpg',
    alt: {
      en: 'Gazelle standing in dry grassland',
      zh: '站在干草原上的羚羊',
    },
    focal: '50% 46%',
    wide: false,
  },
  {
    id: 'train-cab',
    src: '/photos/07-documentary-train-cab.jpg',
    alt: {
      en: 'A man seated at the controls in a sunlit train cab',
      zh: '阳光照进火车驾驶室，一名男子坐在操作台前',
    },
    focal: '50% 45%',
    wide: true,
  },
  {
    id: 'pigeons',
    src: '/photos/08-film-pigeons.jpg',
    alt: {
      en: 'Children, pedestrians, and pigeons in a black-and-white street scene',
      zh: '黑白街景中的孩子、行人与鸽子',
    },
    focal: '50% 50%',
    wide: true,
  },
]

// Production copies preserve the existing cover descriptions and focal points.
export const photos: readonly Photo[] = fixturePhotos.map((photo) => ({
  ...photo,
  ...coverOverrides[photo.id],
}))

export type Category = {
  id: 'documentary' | 'landscape' | 'wildlife' | 'film'
  path: string
  /** English word used for the home-page letter animation. */
  word: string
  /** Rest image left edge, as a fraction of the initial image width. */
  seamNum: number
  seamDen: number
  /** Shared pixel height of the initial and the rest of the word. */
  canvasH: number
  /** Pixel height of the initial's ink, used to keep cap heights even. */
  inkH: number
  /** Transparent pixels above the initial's visible ink. */
  inkTop: number
  letterW: number
  restW: number
  photos: readonly Photo[]
  series: readonly PhotoSeries[]
}

const photoById = Object.fromEntries(photos.map((photo) => [photo.id, photo])) as Record<string, Photo>
const curatedPhotos = (catalog: readonly Photo[]) => catalog.map((photo) => ({
  ...photo,
  ...(photoById[photo.id] ? { alt: photoById[photo.id].alt, focal: photoById[photo.id].focal } : {}),
}))

export const categories: readonly Category[] = [
  {
    id: 'documentary',
    path: '/documentary',
    word: 'Documentary',
    seamNum: 249,
    seamDen: 338,
    canvasH: 341,
    inkH: 217,
    inkTop: 36,
    letterW: 338,
    restW: 755,
    photos: curatedPhotos(photoCatalog.documentary),
    series: seriesCatalog.documentary,
  },
  {
    id: 'landscape',
    path: '/landscape',
    word: 'Landscape',
    seamNum: 19,
    seamDen: 37,
    canvasH: 342,
    inkH: 243,
    inkTop: 35,
    letterW: 370,
    restW: 732,
    photos: curatedPhotos(photoCatalog.landscape),
    series: seriesCatalog.landscape,
  },
  {
    id: 'wildlife',
    path: '/wildlife',
    word: 'Wildlife',
    seamNum: 73,
    seamDen: 101,
    canvasH: 328,
    inkH: 235,
    inkTop: 36,
    letterW: 404,
    restW: 519,
    photos: curatedPhotos(photoCatalog.wildlife),
    series: seriesCatalog.wildlife,
  },
  {
    id: 'film',
    path: '/film',
    word: 'Film',
    seamNum: 33,
    seamDen: 70,
    canvasH: 298,
    inkH: 226,
    inkTop: 36,
    letterW: 350,
    restW: 355,
    photos: curatedPhotos(photoCatalog.film),
    series: seriesCatalog.film,
  },
]

export function categoryFromPath(path: string) {
  return categories.find((category) => category.path === path)
}
