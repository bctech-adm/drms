import * as migration_20260923_103218_initial from './20260923_103218_initial';
import * as migration_20260923_103219_security from './20260923_103219_security';
import * as migration_20260923_122029_email from './20260923_122029_email';
import * as migration_20260923_133049_f2a_flow from './20260923_133049_f2a_flow';
import * as migration_20260923_133050_f2a_security from './20260923_133050_f2a_security';
import * as migration_20260923_161853_f2b_lpj_notifications from './20260923_161853_f2b_lpj_notifications';
import * as migration_20260923_161854_f2b_security from './20260923_161854_f2b_security';

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
  {
    up: migration_20260923_133049_f2a_flow.up,
    down: migration_20260923_133049_f2a_flow.down,
    name: '20260923_133049_f2a_flow',
  },
  {
    up: migration_20260923_133050_f2a_security.up,
    down: migration_20260923_133050_f2a_security.down,
    name: '20260923_133050_f2a_security',
  },
  {
    up: migration_20260923_161853_f2b_lpj_notifications.up,
    down: migration_20260923_161853_f2b_lpj_notifications.down,
    name: '20260923_161853_f2b_lpj_notifications',
  },
  {
    up: migration_20260923_161854_f2b_security.up,
    down: migration_20260923_161854_f2b_security.down,
    name: '20260923_161854_f2b_security',
  },
];
