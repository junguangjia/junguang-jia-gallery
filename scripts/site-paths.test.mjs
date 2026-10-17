import test from 'node:test'
import assert from 'node:assert/strict'
import { sitePath, siteUrl } from '../src/paths.ts'

test('project routes and runtime assets stay inside the project site', () => {
  const base = '/junguang-jia-gallery/'
  assert.equal(siteUrl('/', base), base)
  assert.equal(siteUrl('/information', base), `${base}information`)
  assert.equal(siteUrl('/photos/film/DSC%2001.jpg', base), `${base}photos/film/DSC%2001.jpg`)
  assert.equal(sitePath(base, base), '/')
  assert.equal(sitePath('/junguang-jia-gallery', base), '/')
  assert.equal(sitePath(`${base}landscape/`, base), '/landscape')
})

test('root-hosted routes and photos retain the original Cloudflare URLs', () => {
  assert.equal(siteUrl('/landscape', '/'), '/landscape')
  assert.equal(siteUrl('/photos/wildlife/oryx.jpg', '/'), '/photos/wildlife/oryx.jpg')
  assert.equal(sitePath('/landscape/', '/'), '/landscape')
  assert.equal(sitePath('/', '/'), '/')
})

test('similarly named directories are not mistaken for the site base', () => {
  assert.equal(sitePath('/gallery-old/film/', '/gallery/'), '/gallery-old/film')
})
