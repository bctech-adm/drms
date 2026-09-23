import * as migration_20260923_103218_initial from './20260923_103218_initial'
import * as migration_20260923_103219_security from './20260923_103219_security'
import * as migration_20260923_122029_email from './20260923_122029_email'

export const migrations = [
  {
    up: migration_20260923_103218_initial.up,
    down: migration_20260923_103218_initial.down,
    name: '20260923_103218_initial',
  },
  {
    up: migration_20260923_103219_security.up,
    down: migration_20260923_103219_security.down,
    name: '20260923_103219_security',
  },
  {
    up: migration_20260923_122029_email.up,
    down: migration_20260923_122029_email.down,
    name: '20260923_122029_email',
  },
]
