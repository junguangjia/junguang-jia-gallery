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
    infoLead: 'Independent photography.',
    infoBody:
      'Landscape is one photograph: acacia trees at sunset, with an antelope in the grass. Wildlife is five photographs: two oryx, a lioness, giraffes, a kingfisher, and a gazelle. Documentary and Film have no photographs yet.',
    infoHow:
      'The galleries rest as four letters. Hover or focus a letter and the word opens; the other letters move aside.',
    landscapeLine: 'One photograph: acacia trees at sunset, with an antelope in the grass.',
    wildlifeCount: 'Five photographs.',
    emptyDocumentary:
      'There are no photographs in Documentary yet. The six pictures on this site are one sunset landscape and five wildlife frames.',
    emptyFilm: 'There are no photographs in Film yet. None of the six pictures were set aside as a film frame.',
    endLine: 'The series ends here.',
    backGalleries: 'Back to galleries',
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
    infoLead: '独立摄影。',
    infoBody:
      'Landscape 有一张照片：日落时的金合欢，草地上有一只羚羊。Wildlife 有五张：两只长角羚、母狮、长颈鹿、翠鸟和羚羊。Documentary 和 Film 还没有照片。',
    infoHow: '相册先显示四个首字母。光标停上去，或用键盘聚焦，单词才展开，旁边的字母让开位置。',
    landscapeLine: '只有一张照片：日落时的金合欢，草地上有一只羚羊。',
    wildlifeCount: '五张照片。',
    emptyDocumentary: 'Documentary 这里还没有照片。现有的六张是一张日落风景和五张动物。',
    emptyFilm: 'Film 这里还没有照片。现有的六张都没有归入这一组。',
    endLine: '这一组到这里。',
    backGalleries: '返回相册',
    notFound: '页面不存在。',
    pageTitle: (page: string) => `${page} — Junguang Jia`,
  },
} as const

export type Copy = (typeof copy)[Locale]
