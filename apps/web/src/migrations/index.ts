import * as migration_20260923_103218_initial from './20260923_103218_initial'
import * as migration_20260923_103219_security from './20260923_103219_security'

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
]
