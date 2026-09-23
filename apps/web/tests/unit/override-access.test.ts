import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * ADR 0001 §8: `overrideAccess: true` is allowed only for reviewed system reads/writes, marked on
 * the same line with SYSTEM-READ or SYSTEM-WRITE (the Semgrep rule .semgrep/proyekkas.yml catches
 * calls that omit overrideAccess altogether).
 */
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

describe('overrideAccess: true is always annotated', () => {
  it('every occurrence in src/ carries SYSTEM-READ or SYSTEM-WRITE on the same line', () => {
    const offenders: string[] = []
    let count = 0
    for (const f of files(src)) {
      if (f.includes(`${path.sep}migrations${path.sep}`) || f.endsWith('payload-types.ts')) continue
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/overrideAccess:\s*true/.test(line)) {
            count++
            if (!/SYSTEM-(READ|WRITE)/.test(line)) offenders.push(`${path.relative(src, f)}:${i + 1}`)
          }
        })
    }
    expect(count).toBeGreaterThan(10)
    expect(offenders).toEqual([])
  })
})
