# Reference inputs (client-provided)

The original client inputs cited throughout `docs/proyekkas/` are **not** stored in this
repository because they contain personal data (names, signatures, bank account and receipt
details):

- `proyekkas-kebutuhan-pengembangan.md` — requirements v1.0
- `prompt-lead-proyekkas.md` — original lead prompt ("Temuan tambahan dari form asli klien" 1–10)
- `contoh-form-pengajuan-biaya-drms.jpg` — the client's paper form `228/PB-DRMS/20/IX/2026`

They are held by the project Lead. Ask the Lead if you need them.

All person names, the bank account number, receipt/transaction numbers, the vehicle plate and the
food vendor name that appear in the docs, seed data and tests of this repository are **fictional
pseudonyms** of the values on that form. Amounts, dates, the document number and the business
analysis are unchanged, so the worked examples (e.g. grand total Rp 1.447.500) remain valid.

The seed can load the real master data from an untracked JSON file at deploy time
(`SEED_DATA_FILE`, see `apps/web/src/seed/data.ts`); that file is never committed.
