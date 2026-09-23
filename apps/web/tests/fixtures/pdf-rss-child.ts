/**
 * Child process for the PDF RAM measurement (ADR 0008 §7 "measured peak RSS of one render with 3
 * receipt images"): bundled by the golden test with esbuild and run with the staging web heap cap
 * (--max-old-space-size=256). Reads a serialized PdfData, renders it once, prints RSS figures.
 */
import { readFileSync, writeFileSync } from 'node:fs'

import type { PdfData } from '@/pdf/PengajuanBiaya'
import { renderPengajuanBiaya } from '@/pdf/render'

type Json = Record<string, unknown>
const revive = (_k: string, v: unknown) => (v && typeof v === 'object' && (v as Json).__b64 ? Buffer.from((v as { __b64: string }).__b64, 'base64') : v)

const [, , input, output] = process.argv
const data = JSON.parse(readFileSync(input!, 'utf8'), revive) as PdfData
const mb = (n: number) => Math.round((n / 1024 / 1024) * 10) / 10
const before = process.memoryUsage()
const t0 = Date.now()
const pdf = await renderPengajuanBiaya(data)
const ms = Date.now() - t0
const after = process.memoryUsage()
writeFileSync(output!, pdf)
console.log(
  JSON.stringify({
    rssBeforeMiB: mb(before.rss),
    rssAfterMiB: mb(after.rss),
    peakRssMiB: Math.round((process.resourceUsage().maxRSS / 1024) * 10) / 10,
    heapUsedAfterMiB: mb(after.heapUsed),
    renderMs: ms,
    pdfBytes: pdf.length,
  }),
)
