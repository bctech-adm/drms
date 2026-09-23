import { inflateSync } from 'node:zlib'

/**
 * Minimal text extraction for PDFs written by pdfkit (react-pdf) with the standard fonts:
 * content streams (FlateDecode) hold text as `[<hex> kern <hex> …] TJ` / `<hex> Tj` in WinAnsi
 * encoding. Returns one string per BT…ET block (a laid-out text run). Test-only helper — no
 * dependency on a PDF parser library.
 */
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ',
  0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›',
  0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
}

function decodeHex(hex: string): string {
  let out = ''
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const c = Number.parseInt(hex.slice(i, i + 2), 16)
    out += WIN_ANSI_HIGH[c] ?? String.fromCharCode(c)
  }
  return out
}

function decodeLiteral(lit: string): string {
  return lit.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e: string) => {
    if (/^[0-7]+$/.test(e)) return String.fromCharCode(Number.parseInt(e, 8))
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[e] ?? e
  })
}

type Run = { x: number; y: number; w: number; text: string }
type M = [number, number, number, number, number, number]
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
]

function streams(pdf: Buffer): string[] {
  const src = pdf.toString('latin1')
  const out: string[] = []
  const re = /<<([^]*?)>>\s*stream\r?\n/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length
    const end = src.indexOf('endstream', start)
    if (end < 0) break
    let raw = pdf.subarray(start, end)
    if (/\/FlateDecode/.test(m[1] ?? '')) {
      try {
        raw = inflateSync(raw)
      } catch {
        continue
      }
    }
    const c = raw.toString('latin1')
    if (/\bBT\b/.test(c)) out.push(c)
  }
  return out
}

/** Text runs of one content stream with their device position (tracks q/Q/cm/Tm). */
function runsOf(content: string): Run[] {
  const tok = /\[((?:<[0-9a-fA-F]*>|\((?:\\.|[^\\)])*\)|[^\]])*)\]|<([0-9a-fA-F]*)>|\(((?:\\.|[^\\)])*)\)|(-?\d*\.?\d+)|([A-Za-z*'"]+)/g
  const stack: M[] = []
  let ctm: M = [1, 0, 0, 1, 0, 0]
  let tm: M = [1, 0, 0, 1, 0, 0]
  let size = 10
  const nums: number[] = []
  let pending: string | null = null
  const runs: Run[] = []
  let t: RegExpExecArray | null
  while ((t = tok.exec(content))) {
    if (t[4] !== undefined) {
      nums.push(Number(t[4]))
      continue
    }
    if (t[1] !== undefined) {
      let text = ''
      const parts = /<([0-9a-fA-F]*)>|\(((?:\\.|[^\\)])*)\)/g
      let p: RegExpExecArray | null
      while ((p = parts.exec(t[1]))) text += p[1] !== undefined ? decodeHex(p[1]) : decodeLiteral(p[2] ?? '')
      pending = text
      continue
    }
    if (t[2] !== undefined) {
      pending = decodeHex(t[2])
      continue
    }
    if (t[3] !== undefined) {
      pending = decodeLiteral(t[3])
      continue
    }
    const op = t[5]
    const a = nums.splice(0)
    if (op === 'q') stack.push(ctm)
    else if (op === 'Q') ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]
    else if (op === 'cm' && a.length >= 6) ctm = mul(a.slice(-6) as M, ctm)
    else if (op === 'BT') tm = [1, 0, 0, 1, 0, 0]
    else if (op === 'Tm' && a.length >= 6) tm = a.slice(-6) as M
    else if (op === 'Tf' && a.length >= 1) size = a[a.length - 1]!
    else if ((op === 'TJ' || op === 'Tj') && pending !== null) {
      const m = mul(tm, ctm)
      runs.push({ x: m[4], y: m[5], w: pending.length * size * 0.5, text: pending })
      pending = null
    }
  }
  return runs
}

/** One string per visual line (runs on the same baseline joined), top to bottom, per page. */
export function pdfTextRuns(pdf: Buffer): string[] {
  const lines: string[] = []
  for (const c of streams(pdf)) {
    const runs = runsOf(c)
    const rows = new Map<number, Run[]>()
    for (const r of runs) {
      const key = Math.round(r.y)
      const k = [...rows.keys()].find((y) => Math.abs(y - key) <= 1) ?? key
      rows.set(k, [...(rows.get(k) ?? []), r])
    }
    const ys = [...rows.keys()].sort((a, b) => b - a)
    for (const y of ys) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x)
      let line = ''
      let lastEnd = -Infinity
      for (const r of row) {
        const gap = r.x - lastEnd
        if (line && gap > 12 && !line.endsWith(' ')) line += ' '
        line += r.text
        lastEnd = r.x + r.w
      }
      if (line.trim()) lines.push(line.trim())
    }
  }
  return lines
}

export function pdfText(pdf: Buffer): string {
  return pdfTextRuns(pdf).join('\n')
}

export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length
}

/** All runs joined with single spaces (line wraps become spaces) — for phrase assertions. */
export function pdfFlatText(pdf: Buffer): string {
  return pdfTextRuns(pdf).join(' ').replace(/\s+/g, ' ')
}
