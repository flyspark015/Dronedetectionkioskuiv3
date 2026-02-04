import { webSocketService } from '@/app/services/websocket';
import { simpleUUID } from '@/app/utils/simple-uuid';

export type Esp32Command =
  | 'TEST_BEEP'
  | 'FPV_SCAN_START'
  | 'FPV_SCAN_STOP'
  | 'FPV_HOLD_SET'
  | 'FPV_LOCK_STRONGEST'
  | 'FPV_UNLOCK'
  | 'FPV_TUNE_FREQ'
  | 'FPV_TUNE_INDEX'
  | 'FPV_SET_BAND_PROFILE'
  | 'FPV_SET_THRESHOLD_PROFILE'
  | 'VIDEO_SELECT'
  | 'MUTE_SET';

export function sendEsp32Command(cmd: Esp32Command, args: Record<string, any> = {}, reqId?: string) {
  const req_id = reqId || simpleUUID();

  const msg = {
    type: 'COMMAND',
    timestamp: Date.now(),
    source: 'ui',
    data: {
      target: 'esp32',
      req_id,
      cmd,
      ...args,
    },
  };

  console.log('[CTRL_CMD]', msg);
  webSocketService.send(msg);
  return req_id;
}
