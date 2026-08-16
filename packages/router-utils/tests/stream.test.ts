import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { stream } from '../src/index.js'
import {
  blob as directBlob,
  buffer as directBuffer,
  file as directFile,
  pipe as directPipe,
} from '../src/stream.js'

describe('stream export', () => {
  it('streams file contents via stream.file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taser-stream-file-'))
    const path = join(dir, 'sample.json')
    await writeFile(path, '{"hello":"world"}')

    const response = stream.file(path)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.json()).toEqual({ hello: 'world' })
  })

  it('streams file with custom status and content-type', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taser-stream-file-custom-'))
    const path = join(dir, 'sample.custom')
    await writeFile(path, 'custom data')

    const response = stream.file(path, {
      status: 201,
      contentType: 'text/custom',
      headers: { 'x-test': 'value' },
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('text/custom')
    expect(response.headers.get('x-test')).toBe('value')
    expect(await response.text()).toBe('custom data')
  })

  it('rejects path traversal in stream.file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taser-stream-traversal-'))
    expect(() => stream.file('../../etc/passwd')).toThrow('Invalid file path')
    expect(() => stream.file('..', { root: dir })).toThrow('Invalid file path')
    expect(() => stream.file('nested.txt')).toThrow('requires init.root')
  })

  it('allows files under root in stream.file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taser-stream-root-'))
    const path = join(dir, 'safe.txt')
    await writeFile(path, 'safe stream')

    const response = stream.file('safe.txt', { root: dir })
    expect(response.headers.get('content-type')).toBe('text/plain')
    expect(await response.text()).toBe('safe stream')
  })

  it('pipes web streams via stream.pipe', async () => {
    const response = stream.pipe(
      Readable.toWeb(Readable.from([Buffer.from('chunk-1'), Buffer.from('chunk-2')])) as ReadableStream,
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('chunk-1chunk-2')
  })

  it('pipes node readable streams via stream.pipe with custom headers', async () => {
    const response = stream.pipe(Readable.from([Buffer.from('node-data')]), {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain')
    expect(await response.text()).toBe('node-data')
  })

  it('builds buffer responses via stream.buffer', async () => {
    const data = Buffer.from('hello buffer')
    const response = stream.buffer(data)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/octet-stream')
    expect(Buffer.from(await response.arrayBuffer())).toEqual(data)
  })

  it('builds blob responses via stream.blob', async () => {
    const blobData = new Blob(['blob stream content'], { type: 'text/html' })
    const response = stream.blob(blobData)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html')
    expect(await response.text()).toBe('blob stream content')
  })

  it('exports individual functions from stream subpath', async () => {
    expect(typeof directFile).toBe('function')
    expect(typeof directPipe).toBe('function')
    expect(typeof directBuffer).toBe('function')
    expect(typeof directBlob).toBe('function')
  })
})
