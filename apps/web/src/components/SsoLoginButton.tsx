import React from 'react'

type Props = { searchParams?: Record<string, string | string[] | undefined> }

/** Injected via admin.components.beforeLogin (Login view hides LoginForm with disableLocalStrategy). */
export function SsoLoginButton({ searchParams }: Props) {
  const redirect = typeof searchParams?.redirect === 'string' ? searchParams.redirect : '/admin'
  const href = `/auth/login?returnTo=${encodeURIComponent(redirect)}`
  return (
    <div className="pk-sso">
      <a className="btn btn--style-primary btn--size-large" href={href} id="pk-sso-login">
        Masuk dengan akun DRMS (SSO)
      </a>
    </div>
  )
}

export default SsoLoginButton
