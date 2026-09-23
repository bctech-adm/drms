// CI equivalent of postgres-init/01-roles.sh for a GitHub Actions postgres service container:
// owner / app / ro roles + pk_test database (ADR 0006 §1 role model). THROWAWAY DB ONLY.
// Env: PG_SUPERUSER_URL, PK_F1_OWNER_PASSWORD, PK_F1_APP_PASSWORD, PK_F1_RO_PASSWORD.
import pg from 'pg'

const su = process.env.PG_SUPERUSER_URL
if (!su) throw new Error('PG_SUPERUSER_URL required')
const lit = (v) => pg.escapeLiteral(v ?? '')

const c = new pg.Client({ connectionString: su })
await c.connect()
await c.query(`CREATE ROLE pk_test_owner LOGIN PASSWORD ${lit(process.env.PK_F1_OWNER_PASSWORD)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4`)
await c.query(`CREATE ROLE pk_test_app LOGIN PASSWORD ${lit(process.env.PK_F1_APP_PASSWORD)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 30`)
await c.query(`CREATE ROLE pk_test_ro LOGIN PASSWORD ${lit(process.env.PK_F1_RO_PASSWORD)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3`)
await c.query('CREATE DATABASE pk_test OWNER pk_test_owner')
await c.query('REVOKE ALL ON DATABASE pk_test FROM PUBLIC')
await c.query('GRANT CONNECT ON DATABASE pk_test TO pk_test_app, pk_test_ro')
await c.end()

const url = new URL(su)
url.pathname = '/pk_test'
const d = new pg.Client({ connectionString: url.toString() })
await d.connect()
await d.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
await d.query('ALTER SCHEMA public OWNER TO pk_test_owner')
await d.query('GRANT USAGE ON SCHEMA public TO pk_test_app, pk_test_ro')
await d.end()
console.log('pk_test ready')
