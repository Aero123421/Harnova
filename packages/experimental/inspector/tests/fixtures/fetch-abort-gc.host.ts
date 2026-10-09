/** Real fetch cancellation after the observer's intermediate Request can be collected. */

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { installFetchObserver } from '../../src/host/inspection/network.ts'
import type { InspectorJsonValue } from '../../src/shared/json.ts'

const gc = globalThis.gc
if (gc === undefined) throw new Error('fetch abort fixture requires --expose-gc')
const mode = process.argv[2] ?? 'streaming'
let chunkReceived!: () => void
const firstChunk = new Promise<void>((resolve) => { chunkReceived = resolve })
let captureFinished!: (payload: InspectorJsonValue) => void
const capture = new Promise<InspectorJsonValue>((resolve) => { captureFinished = resolve })
const observer = installFetchObserver({
  publish(topic, payload) {
    if (topic === 'fetch/response-body-chunk') chunkReceived()
    if (topic === 'fetch/end') captureFinished(payload)
  },
}, { maxRequestBodyBytes: 1_024, maxResponseBodyBytes: mode === 'streaming' ? 1_024 : 4, maxChunkBytes: 1_024 })
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  response.write('data: first\n\n')
})
const abort = new AbortController()
let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
let responseRef: WeakRef<Response> | undefined
try {
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('fixture has no TCP address')
  // Return only the reader so the Response itself can be collected.
  reader = await (async () => {
    const response = await fetch(`http://127.0.0.1:${String(address.port)}/events`, { signal: abort.signal })
    responseRef = new WeakRef(response)
    return response.body?.getReader()
  })()
  if (reader === undefined) throw new Error('fixture response has no body')
  assert.equal(Buffer.from((await reader.read()).value ?? []).toString('utf8'), 'data: first\n\n')
  await firstChunk
  if (mode !== 'streaming') await capture
  if (mode === 'stopped') await observer.stop()
  // Each collection occurs in a fresh turn, after weak references from the
  // preceding fetch and capture callbacks no longer have turn-local liveness.
  for (let index = 0; index < 3; index++) {
    await new Promise<void>((resolve) => { setImmediate(resolve) })
    gc()
  }
  assert.equal(responseRef?.deref(), undefined, 'Response must be collected while its reader remains live')
  abort.abort()
  await assert.rejects(reader.read(), { name: 'AbortError' })
  assert.deepEqual(await capture, {
    requestId: 'fetch-1',
    capturedBytes: mode === 'streaming' ? Buffer.byteLength('data: first\n\n') : 4,
    responseBodyTruncated: true,
    ...(mode === 'streaming' ? { responseCaptureError: 'AbortError: This operation was aborted' } : {}),
  })
  process.stdout.write('caller abort and capture settled after GC\n')
} finally {
  abort.abort()
  const closed = new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  server.closeAllConnections()
  await closed
  await observer.stop()
  reader?.releaseLock()
}
