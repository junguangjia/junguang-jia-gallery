export type Locale = 'en' | 'zh'

export const copy = {
  en: {
    siteTitle: 'Junguang Jia',
    galleries: 'Galleries',
    information: 'Information',
    close: 'Close',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    language: '中文',
    languageLabel: '切换到中文',
    infoQuote: 'Photography is the only language that can be understood anywhere in the world.',
    infoBody:
      'I don’t believe in a decisive moment. Time cannot be reclaimed, and every moment preserved in a photograph is equally precious.',
    infoPurpose:
      'In the pursuit of artistry and technique, we often lose sight of photography’s simplest and most essential purpose: to record.',
    landscapeLine: 'One photograph: acacia trees at sunset, with an antelope in the grass.',
    wildlifeCount: 'Five photographs.',
    documentaryLine: 'One demo photograph.',
    filmLine: 'One demo photograph.',
    endLine: 'The series ends here.',
    backGalleries: 'Back to galleries',
    openGallery: (category: string) => `Open ${category} gallery`,
    notFound: 'This page could not be found.',
    pageTitle: (page: string) => `${page} — Junguang Jia`,
  },
  zh: {
    siteTitle: 'Junguang Jia',
    galleries: '相册',
    information: '信息',
    close: '关闭',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    language: 'EN',
    languageLabel: '切换到英文',
    infoQuote: 'Photography is the only language that can be understood anywhere in the world.',
    infoBody:
      '我不认为有什么决定性的瞬间，时间每一分钟的流逝都是不可挽回的，因此对我们来说，摄影留下的每一个过去的瞬间都同等珍贵。',
    infoPurpose:
      '追求艺术和技术的路上，我们往往最容易忘记摄影那个最肤浅却又最本质的东西——记录。',
    landscapeLine: '只有一张照片：日落时的金合欢，草地上有一只羚羊。',
    wildlifeCount: '五张照片。',
    documentaryLine: '一张 demo 照片。',
    filmLine: '一张 demo 照片。',
    endLine: '这一组到这里。',
    backGalleries: '返回相册',
    openGallery: (category: string) => `进入 ${category} 画廊`,
    notFound: '页面不存在。',
    pageTitle: (page: string) => `${page} — Junguang Jia`,
  },
} as const

export type Copy = (typeof copy)[Locale]
