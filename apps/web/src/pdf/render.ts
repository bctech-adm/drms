import { Font, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

import { PengajuanBiaya, type PdfData } from './PengajuanBiaya'

/**
 * Single-document render in the web process (ADR 0008 §2): in-process semaphore, max 2 concurrent
 * renders; a third request waits up to 10 s, then `PdfBusyError` (endpoint → 503 + Retry-After).
 * Hyphenation disabled: react-pdf's default English hyphenation splits Indonesian words wrongly.
 */
let hyphenationSet = false
function setup() {
  if (hyphenationSet) return
  Font.registerHyphenationCallback((word) => [word])
  hyphenationSet = true
}

export class PdfBusyError extends Error {
  constructor() {
    super('PDF renderer busy')
  }
}

const MAX_CONCURRENT = 2
const WAIT_MS = 10_000
let active = 0
const waiters: Array<() => void> = []

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return
  }
  await new Promise<void>((resolve, reject) => {
    const grant = () => {
      clearTimeout(timer)
      active++
      resolve()
    }
    const timer = setTimeout(() => {
      const i = waiters.indexOf(grant)
      if (i >= 0) waiters.splice(i, 1)
      reject(new PdfBusyError())
    }, WAIT_MS)
    waiters.push(grant)
  })
}

function release(): void {
  active--
  const next = waiters.shift()
  if (next) next()
}

export async function renderPengajuanBiaya(data: PdfData): Promise<Buffer> {
  setup()
  await acquire()
  try {
    return await renderToBuffer(React.createElement(PengajuanBiaya, { d: data }) as Parameters<typeof renderToBuffer>[0])
  } finally {
    release()
  }
}
