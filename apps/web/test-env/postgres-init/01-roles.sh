#!/bin/bash
# Throwaway test DB mirroring ADR 0006 §1 + the live provisioning (runbook step 1):
# owner (DDL, migrations), app (DML only), ro (SELECT only). Role names deliberately differ from
# pk_drms_* to prove the migrations derive role names from current_user (<prefix>_owner).
set -euo pipefail
psql -v ON_ERROR_STOP=1 --username postgres \
  -v owner_pw="$PK_OWNER_PASSWORD" -v app_pw="$PK_APP_PASSWORD" -v ro_pw="$PK_RO_PASSWORD" <<'SQL'
CREATE ROLE pk_test_owner LOGIN PASSWORD :'owner_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
CREATE ROLE pk_test_app   LOGIN PASSWORD :'app_pw'   NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 30;
CREATE ROLE pk_test_ro    LOGIN PASSWORD :'ro_pw'    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3;
CREATE DATABASE pk_test OWNER pk_test_owner;
REVOKE ALL ON DATABASE pk_test FROM PUBLIC;
GRANT CONNECT ON DATABASE pk_test TO pk_test_app, pk_test_ro;
\connect pk_test
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO pk_test_owner;
GRANT USAGE ON SCHEMA public TO pk_test_app, pk_test_ro;
SQL
