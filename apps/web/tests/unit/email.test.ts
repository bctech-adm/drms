import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { EmailAdapter, SendEmailOptions } from 'payload'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { guardAdapter, recipientCount, smtpTransportOptions } from '@/email/adapter'
import { EmailRateLimitedError, MAIL_BURST, MAIL_PER_HOUR, takeMailTokens } from '@/email/rate-guard'
import { parseEnv, parseSmtpEnv, type SmtpConfig } from '@/lib/env'

const baseEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://u:p@db:5432/pk',
  PAYLOAD_SECRET: 'x'.repeat(40),
  APP_URL: 'https://drms-kas.example.test',
  OIDC_ISSUER: 'https://auth.example.test/realms/drms',
  OIDC_WEB_CLIENT_ID: 'proyekkas-web',
  OIDC_WEB_CLIENT_SECRET: 's'.repeat(20),
  OIDC_MOBILE_CLIENT_ID: 'proyekkas-mobile',
}
const PASSWORD = 'smtp-unit-test-password-0123456789'
const smtpEnv = {
  SMTP_HOST: 'mail.example.test',
  SMTP_PORT: '587',
  SMTP_USER: 'no-reply@example.test',
  SMTP_PASSWORD: PASSWORD,
  SMTP_FROM_ADDRESS: 'no-reply@example.test',
  SMTP_FROM_NAME: 'ProyekKas',
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'pk-smtp-unit-'))
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

describe('SMTP env (all-or-nothing)', () => {
  it('no SMTP_* → valid env and no adapter (console)', () => {
    expect(parseEnv(baseEnv).SMTP_HOST).toBeUndefined()
    expect(parseSmtpEnv({})).toBeNull()
    // empty values from compose defaults count as unset
    expect(parseSmtpEnv({ SMTP_HOST: '', SMTP_PORT: '', SMTP_FROM_NAME: '' })).toBeNull()
  })

  it('complete settings are accepted (full env and SMTP subset)', () => {
    expect(parseEnv({ ...baseEnv, ...smtpEnv }).SMTP_PORT).toBe(587)
    expect(parseSmtpEnv(smtpEnv)).toEqual({
      host: 'mail.example.test',
      port: 587,
      user: 'no-reply@example.test',
      password: PASSWORD,
      fromAddress: 'no-reply@example.test',
      fromName: 'ProyekKas',
    })
  })

  it('SMTP_HOST alone → every other SMTP_* is required', () => {
    let msg = ''
    try {
      parseSmtpEnv({ SMTP_HOST: 'mail.example.test' })
    } catch (e) {
      msg = (e as Error).message
    }
    for (const k of ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_ADDRESS', 'SMTP_FROM_NAME']) expect(msg).toContain(k)
    expect(() => parseEnv({ ...baseEnv, SMTP_HOST: 'mail.example.test' })).toThrow(/SMTP_USER/)
  })

  it('any SMTP_* without SMTP_HOST is rejected too', () => {
    const { SMTP_HOST: _h, ...noHost } = smtpEnv
    expect(() => parseSmtpEnv(noHost)).toThrow(/SMTP_HOST: required/)
    expect(() => parseEnv({ ...baseEnv, SMTP_FROM_NAME: 'ProyekKas' })).toThrow(/SMTP_HOST/)
  })

  it('From address different from SMTP_USER is rejected (case-insensitive equal is fine)', () => {
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_FROM_ADDRESS: 'info@example.test' })).toThrow(/SMTP_FROM_ADDRESS: must equal SMTP_USER/)
    expect(() => parseEnv({ ...baseEnv, ...smtpEnv, SMTP_FROM_ADDRESS: 'info@example.test' })).toThrow(/SMTP_FROM_ADDRESS/)
    expect(parseSmtpEnv({ ...smtpEnv, SMTP_FROM_ADDRESS: 'No-Reply@Example.test' })?.fromAddress).toBe('No-Reply@Example.test')
  })

  it('rejects header injection in the display name, bad host/port/emails', () => {
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_FROM_NAME: 'X\r\nBcc: a@b.c' })).toThrow(/SMTP_FROM_NAME/)
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_FROM_NAME: 'Evil <x@y.z>' })).toThrow(/SMTP_FROM_NAME/)
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_HOST: 'smtp://mail' })).toThrow(/SMTP_HOST/)
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_PORT: '0' })).toThrow(/SMTP_PORT/)
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_USER: 'no-reply', SMTP_FROM_ADDRESS: 'no-reply' })).toThrow(/SMTP_USER/)
  })

  it('reads the password from SMTP_PASSWORD_FILE (trailing newline stripped), never echoes it', () => {
    const file = path.join(tmp, 'smtp_password')
    writeFileSync(file, `${PASSWORD}\n`)
    const { SMTP_PASSWORD: _p, ...noPw } = smtpEnv
    expect(parseSmtpEnv({ ...noPw, SMTP_PASSWORD_FILE: file })?.password).toBe(PASSWORD)
    expect(parseEnv({ ...baseEnv, ...noPw, SMTP_PASSWORD_FILE: file }).SMTP_PASSWORD).toBe(PASSWORD)
    expect(() => parseSmtpEnv({ ...smtpEnv, SMTP_PASSWORD_FILE: file })).toThrow(/both SMTP_PASSWORD and SMTP_PASSWORD_FILE/)
    expect(() => parseSmtpEnv({ ...noPw, SMTP_PASSWORD_FILE: path.join(tmp, 'missing') })).toThrow(/SMTP_PASSWORD_FILE is not readable/)
    writeFileSync(file, 'short')
    let msg = ''
    try {
      parseSmtpEnv({ ...noPw, SMTP_PASSWORD_FILE: file })
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('SMTP_PASSWORD')
    expect(msg).not.toContain('short')
  })
})

const cfg: SmtpConfig = {
  host: 'mail.example.test',
  port: 587,
  user: 'no-reply@example.test',
  password: PASSWORD,
  fromAddress: 'no-reply@example.test',
  fromName: 'ProyekKas',
}

describe('SMTP transport options', () => {
  it('587: STARTTLS required before AUTH, certificate verification ON', () => {
    const o = smtpTransportOptions(cfg)
    expect(o).toMatchObject({ host: 'mail.example.test', port: 587, secure: false, requireTLS: true })
    expect(o.tls).toMatchObject({ rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: 'mail.example.test' })
    expect(o.auth).toEqual({ user: 'no-reply@example.test', pass: PASSWORD })
    expect(o.name).toBeUndefined()
    expect(parseSmtpEnv({ ...smtpEnv, APP_URL: 'https://drms-kas.example.test' })?.ehloName).toBe('drms-kas.example.test')
    expect(smtpTransportOptions({ ...cfg, ehloName: 'drms-kas.example.test' }).name).toBe('drms-kas.example.test')
  })
  it('465: implicit TLS, verification ON', () => {
    const o = smtpTransportOptions({ ...cfg, port: 465 })
    expect(o).toMatchObject({ secure: true, requireTLS: false })
    expect(o.tls?.rejectUnauthorized).toBe(true)
  })
})

describe('guarded adapter', () => {
  const inner = () => {
    const sendEmail = vi.fn(async (m: SendEmailOptions) => ({ messageId: 'x', m }))
    return { adapter: { name: 'nodemailer', defaultFromAddress: 'a@b.c', defaultFromName: 'n', sendEmail } as ReturnType<EmailAdapter>, sendEmail }
  }

  it('forces From = SMTP_FROM_NAME <SMTP_FROM_ADDRESS> and drops sender/envelope overrides', async () => {
    const { adapter, sendEmail } = inner()
    const guard = vi.fn(async () => true)
    const a = guardAdapter(adapter, cfg, guard)
    expect(a.defaultFromAddress).toBe('no-reply@example.test')
    await a.sendEmail({
      to: 'u@example.test',
      subject: 's',
      text: 't',
      from: 'ceo@evil.test',
      sender: 'x@evil.test',
      envelope: { from: 'bounce@evil.test', to: 'u@example.test' },
    } as SendEmailOptions)
    const sent = sendEmail.mock.calls[0]![0] as Record<string, unknown>
    expect(sent.from).toEqual({ name: 'ProyekKas', address: 'no-reply@example.test' })
    expect(sent).not.toHaveProperty('sender')
    expect(sent).not.toHaveProperty('envelope')
    expect(guard).toHaveBeenCalledWith('no-reply@example.test', 1)
  })

  it('one token per recipient; refused by the guard → EmailRateLimitedError, nothing sent', async () => {
    const { adapter, sendEmail } = inner()
    const guard = vi.fn(async () => false)
    const a = guardAdapter(adapter, cfg, guard)
    await expect(a.sendEmail({ to: ['a@x.test', { address: 'b@x.test' }], cc: 'c@x.test, d@x.test', bcc: 'e@x.test', subject: 's' })).rejects.toBeInstanceOf(
      EmailRateLimitedError,
    )
    expect(guard).toHaveBeenCalledWith('no-reply@example.test', 5)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recipientCount({ subject: 'no recipients' })).toBe(0)
  })
})

describe('mailbox rate guard', () => {
  it('budget stays below the mailbox limit (30/h, burst 10) in any rolling hour', () => {
    expect(MAIL_BURST).toBeLessThanOrEqual(10)
    expect(MAIL_BURST + MAIL_PER_HOUR).toBeLessThan(30)
  })
  it('refuses n < 1, non-integers and n > burst without touching the DB', async () => {
    const execute = vi.fn()
    for (const n of [0, -1, 1.5, MAIL_BURST + 1]) expect(await takeMailTokens({ execute }, 'm@x.test', n)).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })
  it('granted iff the upsert returns a row', async () => {
    expect(await takeMailTokens({ execute: async () => ({ rows: [{ tokens: 4 }] }) }, 'M@X.test')).toBe(true)
    expect(await takeMailTokens({ execute: async () => ({ rows: [] }) }, 'm@x.test')).toBe(false)
  })
})
