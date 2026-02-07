import { getApiUrl } from '@/app/config/api';
import { webSocketService } from '@/app/services/websocket';
import { simpleUUID } from '@/app/utils/simple-uuid';

export type AudioSoundName = 'ui_click' | 'startup_bg' | 'drone_detected_alarm' | 'test_buzzer';

type CommandAck = {
  ok: boolean;
  err?: string;
  req_id?: string;
  cmd?: string;
  [key: string]: any;
};

const assetStatus: Record<AudioSoundName, 'unknown' | 'ok' | 'missing'> = {
  ui_click: 'unknown',
  startup_bg: 'unknown',
  drone_detected_alarm: 'unknown',
  test_buzzer: 'unknown',
};

let audioContext: AudioContext | null = null;
let uiClickBuffer: AudioBuffer | null = null;
let uiClickLoading: Promise<void> | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  return audioContext;
};

const getAudioAssetUrl = (name: AudioSoundName) => {
  return getApiUrl(`/api/v1/audio/asset/${encodeURIComponent(name)}`);
};

const getAudioWavUrl = (name: AudioSoundName) => {
  return getApiUrl(`/api/v1/audio/asset_wav/${encodeURIComponent(name)}`);
};

const preloadAssetMetadata = async (name: AudioSoundName) => {
  try {
    const wavRes = await fetch(getAudioWavUrl(name), { method: 'HEAD' });
    if (wavRes.ok) {
      assetStatus[name] = 'ok';
      return;
    }
    const res = await fetch(getAudioAssetUrl(name), { method: 'HEAD' });
    assetStatus[name] = res.ok ? 'ok' : 'missing';
  } catch {
    assetStatus[name] = 'missing';
  }
};

const loadUiClickBuffer = async () => {
  if (uiClickBuffer || uiClickLoading) {
    return uiClickLoading;
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  uiClickLoading = (async () => {
    try {
      let res = await fetch(getAudioWavUrl('ui_click'));
      if (!res.ok) {
        res = await fetch(getAudioAssetUrl('ui_click'));
      }
      if (!res.ok) {
        assetStatus.ui_click = 'missing';
        return;
      }
      const data = await res.arrayBuffer();
      uiClickBuffer = await ctx.decodeAudioData(data);
      assetStatus.ui_click = 'ok';
    } catch {
      assetStatus.ui_click = 'missing';
    }
  })();
  return uiClickLoading;
};

export async function preloadAudioAssets() {
  await Promise.all([
    preloadAssetMetadata('startup_bg'),
    preloadAssetMetadata('drone_detected_alarm'),
    preloadAssetMetadata('test_buzzer'),
  ]);
  await loadUiClickBuffer();
  return Boolean(uiClickBuffer);
}

export function resumeAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return true;
}

const playFallbackClick = () => {
  const ctx = getAudioContext();
  if (!ctx) return false;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1200;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.01);
  return true;
};

export function playUiClick() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (!uiClickBuffer) {
    loadUiClickBuffer();
    return playFallbackClick();
  }
  const src = ctx.createBufferSource();
  src.buffer = uiClickBuffer;
  src.connect(ctx.destination);
  src.start(0);
  return true;
}

const sendCommandWithAck = (cmd: string, data: Record<string, any> = {}, timeoutMs = 1500): Promise<CommandAck> => {
  if (!webSocketService.isConnected) {
    return Promise.resolve({ ok: false, err: 'ws_disconnected', cmd });
  }

  const req_id = data.req_id || simpleUUID();
  const envelope = {
    type: 'COMMAND',
    timestamp: Date.now(),
    source: 'ui',
    data: {
      target: 'backend',
      req_id,
      cmd,
      ...data,
    },
  };

  return new Promise((resolve) => {
    let settled = false;
    const handler = (payload: any) => {
      if (payload?.req_id !== req_id) return;
      settled = true;
      webSocketService.off('COMMAND_ACK', handler);
      resolve(payload as CommandAck);
    };
    webSocketService.on('COMMAND_ACK', handler);
    webSocketService.send(envelope);
    window.setTimeout(() => {
      if (settled) return;
      webSocketService.off('COMMAND_ACK', handler);
      resolve({ ok: false, err: 'timeout', req_id, cmd });
    }, timeoutMs);
  });
};

export function playSound(name: AudioSoundName, reqId?: string) {
  const req_id = reqId || simpleUUID();
  if (name === 'ui_click') {
    playUiClick();
    return req_id;
  }

  const msg = {
    type: 'COMMAND',
    timestamp: Date.now(),
    source: 'ui',
    data: {
      target: 'backend',
      req_id,
      cmd: 'PLAY_SOUND',
      name,
    },
  };

  webSocketService.send(msg);
  return req_id;
}

export function sendVolumeCommand(value: number) {
  return sendCommandWithAck('SET_VOLUME', { value });
}

export function testSpeakerCommand(duration_ms = 1000) {
  return sendCommandWithAck('TEST_SPEAKER', { duration_ms });
}

export function testBuzzerCommand(duration_ms = 1000) {
  return sendCommandWithAck('TEST_BUZZER', { duration_ms });
}
