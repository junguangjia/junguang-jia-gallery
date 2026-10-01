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
    infoQuoteAuthor: 'Bruno Barbey',
    infoBody:
      'I don’t believe in a decisive moment. Time cannot be reclaimed, and every moment preserved in a photograph is equally precious.',
    infoPurpose:
      'In the pursuit of artistry and technique, we often lose sight of photography’s simplest and most essential purpose: to record.',
    photoCount: (count: number) => `${count} ${count === 1 ? 'photograph' : 'photographs'}.`,
    endLine: 'The series ends here.',
    backGalleries: 'Back to galleries',
    openGallery: (category: string) => `Open ${category} gallery`,
    notFound: 'This page could not be found.',
    pageTitle: (page: string) => `${page} — Junguang Jia`,
  },
  zh: {
    siteTitle: '贾俊廣',
    galleries: '相册',
    information: '信息',
    close: '关闭',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    language: 'EN',
    languageLabel: '切换到英文',
    infoQuote: '摄影是唯一一种在世界各地都能被理解的语言。',
    infoQuoteAuthor: '布鲁诺·巴贝',
    infoBody:
      '我不认为有什么决定性的瞬间，时间每一分钟的流逝都是不可挽回的，因此对我们来说，摄影留下的每一个过去的瞬间都同等珍贵。',
    infoPurpose:
      '追求艺术和技术的路上，我们往往最容易忘记摄影那个最肤浅却又最本质的东西——记录。',
    photoCount: (count: number) => `${count} 张照片。`,
    endLine: '这一组到这里。',
    backGalleries: '返回相册',
    openGallery: (category: string) => `进入 ${category} 画廊`,
    notFound: '页面不存在。',
    pageTitle: (page: string) => `${page} — 贾俊廣`,
  },
} as const

export type Copy = (typeof copy)[Locale]
