import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COUNTRY_CACHE_KEY,
  COUNTRY_CACHE_TTL_MS,
  LOCALE_CHOICE_KEY,
  TRACE_ENDPOINT,
  createDefaultLocaleController,
  parseTraceCountry,
} from '../src/default-locale.ts'

const NOW = 1_000_000
function storage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}
function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
const response = (country) => new Response(`fl=test\nip=192.0.2.1\nloc=${country}\nts=123\n`)
const tick = () => new Promise((done) => setImmediate(done))
const setup = (options = {}) => {
  const local = storage()
  const session = storage()
  return {
    local, session,
    controller: createDefaultLocaleController({ localStorage: () => local, sessionStorage: () => session, now: () => NOW, ...options }),
  }
}

for (const [country, expected] of [['CN', 'zh'], ['US', 'en'], ['HK', 'en'], ['TW', 'en']]) {
  test(`${country} supplies the expected default without storing IP or marking it as manual`, async () => {
    const calls = []
    const { controller, local, session } = setup({ fetch: async (url, init) => {
      calls.push({ url, init })
      return response(country)
    } })
    const changes = []
    await controller.start((locale) => changes.push(locale)).settled
    assert.equal(controller.getLocale(), expected)
    assert.equal(changes.at(-1), expected)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, TRACE_ENDPOINT)
    assert.equal(calls[0].init.credentials, 'omit')
    assert.equal(calls[0].init.referrerPolicy, 'no-referrer')
    assert.equal(calls[0].init.cache, 'no-store')
    assert.equal(local.getItem(LOCALE_CHOICE_KEY), null)
    assert.deepEqual(JSON.parse(session.getItem(COUNTRY_CACHE_KEY)), { country, at: NOW })
    assert.equal(session.getItem(COUNTRY_CACHE_KEY).includes('192.0.2.1'), false)
    await controller.start(() => {}).settled
    assert.equal(calls.length, 1, 'rerendering or visiting another SPA page must not look up again')
  })
}

test('legacy automatic en is not an explicit choice and allows a CN default', async () => {
  const local = storage({ 'jj-locale': 'en' })
  const { controller } = setup({ localStorage: () => local, fetch: async () => response('CN') })
  assert.equal(controller.getLocale(), 'en')
  await controller.start(() => {}).settled
  assert.equal(controller.getLocale(), 'zh')
  assert.equal(local.getItem(LOCALE_CHOICE_KEY), null)
})

test('legacy zh is retained and migrated without looking up the country', async () => {
  const local = storage({ 'jj-locale': 'zh' })
  let calls = 0
  const { controller } = setup({ localStorage: () => local, fetch: async () => { calls++; return response('US') } })
  assert.equal(controller.getLocale(), 'zh')
  await controller.start(() => {}).settled
  assert.equal(calls, 0)
  assert.equal(local.getItem(LOCALE_CHOICE_KEY), 'zh')
})

test('a new explicit English choice outranks legacy Chinese and cached CN', async () => {
  const local = storage({ 'jj-locale': 'zh', [LOCALE_CHOICE_KEY]: 'en' })
  const session = storage({ [COUNTRY_CACHE_KEY]: JSON.stringify({ country: 'CN', at: NOW }) })
  const { controller } = setup({ localStorage: () => local, sessionStorage: () => session, fetch: async () => { throw new Error('must not fetch') } })
  await controller.start(() => {}).settled
  assert.equal(controller.getLocale(), 'en')
})

test('manual selection aborts immediately and a late CN response cannot overwrite or cache it', async () => {
  const pending = deferred()
  let signal
  const { controller, local, session } = setup({ fetch: async (_url, init) => { signal = init.signal; return pending.promise } })
  const changes = []
  const run = controller.start((locale) => changes.push(locale))
  controller.choose('zh')
  controller.choose('en')
  assert.equal(signal.aborted, true)
  assert.equal(controller.getLocale(), 'en')
  assert.equal(local.getItem(LOCALE_CHOICE_KEY), 'en')
  await run.settled
  pending.resolve(response('CN'))
  await tick()
  assert.deepEqual(changes, ['en', 'zh', 'en'])
  assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
})

test('StrictMode cleanup neither caches cancellation nor suppresses the second effect', async () => {
  const requests = [deferred(), deferred()]
  const signals = []
  let calls = 0
  const { controller, session } = setup({ fetch: async (_url, init) => {
    signals.push(init.signal)
    return requests[calls++].promise
  } })
  const first = controller.start(() => {})
  first.cancel()
  await first.settled
  assert.equal(signals[0].aborted, true)
  assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
  const changes = []
  const second = controller.start((locale) => changes.push(locale))
  requests[0].resolve(response('CN'))
  await tick()
  assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
  requests[1].resolve(response('US'))
  await second.settled
  assert.equal(calls, 2)
  assert.deepEqual(changes, ['en', 'en'])
  assert.deepEqual(JSON.parse(session.getItem(COUNTRY_CACHE_KEY)), { country: 'US', at: NOW })
})

test('a cancelled effect cannot update an unmounted provider', async () => {
  const pending = deferred()
  const { controller, session } = setup({ fetch: async () => pending.promise })
  const changes = []
  const run = controller.start((locale) => changes.push(locale))
  run.cancel()
  pending.resolve(response('CN'))
  await run.settled
  await tick()
  assert.deepEqual(changes, ['en'])
  assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
})

for (const phase of ['request', 'body']) {
  test(`the hard deadline bounds an uncooperative ${phase} and aborts without caching failure`, async () => {
    let signal
    let calls = 0
    const never = new Promise(() => {})
    const { controller, session } = setup({ timeoutMs: 25, fetch: async (_url, init) => {
      signal = init.signal
      calls++
      return phase === 'request' ? never : { ok: true, text: () => never }
    } })
    let guard
    try {
      await Promise.race([
        controller.start(() => {}).settled,
        new Promise((_resolve, reject) => { guard = setTimeout(() => reject(new Error('deadline did not settle')), 500) }),
      ])
    } finally { clearTimeout(guard) }
    assert.equal(signal.aborted, true)
    assert.equal(controller.getLocale(), 'en')
    assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
    await controller.start(() => {}).settled
    assert.equal(calls, 1, 'failed lookup must not repeat within the same provider')
  })
}

test('storage access denied still allows detection and manual switching in memory', async () => {
  const blocked = () => { throw new Error('storage denied') }
  const { controller } = setup({ localStorage: blocked, sessionStorage: blocked, fetch: async () => response('CN') })
  await controller.start(() => {}).settled
  assert.equal(controller.getLocale(), 'zh')
  controller.choose('en')
  assert.equal(controller.getLocale(), 'en')
})

test('storage write failures do not interrupt automatic or manual updates', async () => {
  const blocked = () => ({ getItem: () => null, setItem: () => { throw new Error('quota') } })
  const { controller } = setup({ localStorage: blocked, sessionStorage: blocked, fetch: async () => response('CN') })
  await controller.start(() => {}).settled
  assert.equal(controller.getLocale(), 'zh')
  controller.choose('en')
  assert.equal(controller.getLocale(), 'en')
})

test('fresh country cache is used while expired, future, or malformed cache is refreshed', async () => {
  for (const cached of [
    { country: 'CN', at: NOW },
    { country: 'TW', at: NOW },
    { country: 'US', at: NOW - COUNTRY_CACHE_TTL_MS },
    { country: 'CN', at: NOW + 1 },
    { country: 'invalid', at: NOW },
  ]) {
    const session = storage({ [COUNTRY_CACHE_KEY]: JSON.stringify(cached) })
    let calls = 0
    const { controller } = setup({ sessionStorage: () => session, fetch: async () => { calls++; return response('CN') } })
    await controller.start(() => {}).settled
    const fresh = cached.at === NOW && ['CN', 'TW'].includes(cached.country)
    assert.equal(calls, fresh ? 0 : 1)
    assert.equal(controller.getLocale(), fresh && cached.country === 'TW' ? 'en' : 'zh')
  }
})

test('malformed traces, HTTP failures, and network failures preserve the rendered default', async () => {
  for (const fetchImpl of [
    async () => new Response('ip=192.0.2.1\nloc=CNx\n'),
    async () => new Response('loc=CN\nloc=US\n'),
    async () => new Response('loc=CN\n', { status: 503 }),
    async () => { throw new Error('offline') },
  ]) {
    const { controller, session } = setup({ fetch: fetchImpl })
    await controller.start(() => {}).settled
    assert.equal(controller.getLocale(), 'en')
    assert.equal(session.getItem(COUNTRY_CACHE_KEY), null)
  }
  assert.equal(parseTraceCountry('loc=CN\r\n'), 'CN')
  for (const trace of ['loc=cn\n', 'loc=XX\n', 'loc=T1\n', '<html>error</html>', 'loc=CN\nloc=CN\n']) {
    assert.equal(parseTraceCountry(trace), null)
  }
})
