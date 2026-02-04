import { useCallback, useEffect, useRef, useState } from 'react';
import { sendEsp32Command } from '@/app/services/esp32Commands';
import { webSocketService } from '@/app/services/websocket';

interface Esp32DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  statusSnapshot: any | null;
  wsConnected: boolean;
}

type LogEntry = {
  id: string;
  ts: number;
  kind: 'sent' | 'ack';
  req_id?: string;
  cmd?: string;
  args?: Record<string, any> | null;
  ok?: boolean;
  err?: any;
  resp?: any;
};

const MAX_LOG = 50;

const bandOptions = ['5.8G', '3.3G', '1.2G'] as const;
const thresholdOptions = ['Sensitive', 'Balanced', 'Strict'] as const;

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

function formatJson(value: any) {
  if (value == null) return '';
  try {
    const text = JSON.stringify(value);
    return text === '{}' ? '' : text;
  } catch {
    return String(value);
  }
}

export function Esp32DebugPanel({ isOpen, onClose, statusSnapshot, wsConnected }: Esp32DebugPanelProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const nextIdRef = useRef(0);

  const [tuneVrxId, setTuneVrxId] = useState('1');
  const [tuneFreqMHz, setTuneFreqMHz] = useState('5800');
  const [tuneIndex, setTuneIndex] = useState('0');
  const [bandProfile, setBandProfile] = useState<(typeof bandOptions)[number]>('5.8G');
  const [thresholdProfile, setThresholdProfile] = useState<(typeof thresholdOptions)[number]>('Balanced');

  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, MAX_LOG);
    });
  }, []);

  const handleSend = useCallback(
    (cmd: string, args: Record<string, any> = {}) => {
      const req_id = sendEsp32Command(cmd as any, args);
      appendLog({
        id: `sent-${nextIdRef.current++}`,
        ts: Date.now(),
        kind: 'sent',
        req_id,
        cmd,
        args
      });
    },
    [appendLog]
  );

  useEffect(() => {
    const onAck = (data: any) => {
      if (data?.target && String(data.target).toLowerCase() !== 'esp32') return;
      appendLog({
        id: `ack-${nextIdRef.current++}`,
        ts: Date.now(),
        kind: 'ack',
        req_id: data?.req_id,
        cmd: data?.cmd,
        ok: data?.ok,
        err: data?.err,
        resp: data?.resp
      });
    };

    webSocketService.on('COMMAND_ACK', onAck);
    return () => {
      webSocketService.off('COMMAND_ACK', onAck);
    };
  }, [appendLog]);

  const tuneVrxIdNum = Number.parseInt(tuneVrxId, 10);
  const tuneFreqNum = Number.parseFloat(tuneFreqMHz);
  const tuneIndexNum = Number.parseInt(tuneIndex, 10);

  const canTuneFreq = Number.isFinite(tuneVrxIdNum) && Number.isFinite(tuneFreqNum);
  const canTuneIndex = Number.isFinite(tuneVrxIdNum) && Number.isFinite(tuneIndexNum);
  const buttonClass = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed right-4 top-[60px] z-50 w-[420px] max-w-[92vw] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="text-[14px] font-semibold text-slate-100">Controller Debug Panel</div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Quick Commands</div>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} onClick={() => handleSend('TEST_BEEP', { timeout_s: 3 })}>TEST_BEEP</button>
              <button className={buttonClass} onClick={() => handleSend('MUTE_SET', { mute: 1, timeout_s: 3 })}>MUTE=1</button>
              <button className={buttonClass} onClick={() => handleSend('MUTE_SET', { mute: 0, timeout_s: 3 })}>MUTE=0</button>
              <button className={buttonClass} onClick={() => handleSend('FPV_HOLD_SET', { hold: 1, timeout_s: 3 })}>HOLD=1</button>
              <button className={buttonClass} onClick={() => handleSend('FPV_HOLD_SET', { hold: 0, timeout_s: 3 })}>HOLD=0</button>
              <button className={buttonClass} onClick={() => handleSend('FPV_SCAN_STOP', { timeout_s: 3 })}>FPV_SCAN_STOP</button>
              <button className={buttonClass} onClick={() => handleSend('FPV_LOCK_STRONGEST', { timeout_s: 3 })}>FPV_LOCK_STRONGEST</button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Video Select</div>
            <div className="flex gap-2">
              <button className={buttonClass} onClick={() => handleSend('VIDEO_SELECT', { sel: 1, timeout_s: 3 })}>SEL=1</button>
              <button className={buttonClass} onClick={() => handleSend('VIDEO_SELECT', { sel: 2, timeout_s: 3 })}>SEL=2</button>
              <button className={buttonClass} onClick={() => handleSend('VIDEO_SELECT', { sel: 3, timeout_s: 3 })}>SEL=3</button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Tune Frequency</div>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-[12px] text-slate-400">
                VRX ID
                <input
                  type="number"
                  value={tuneVrxId}
                  onChange={(e) => setTuneVrxId(e.target.value)}
                  className="mt-1 w-20 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-[12px] text-slate-400">
                Freq MHz
                <input
                  type="number"
                  value={tuneFreqMHz}
                  onChange={(e) => setTuneFreqMHz(e.target.value)}
                  className="mt-1 w-28 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
                />
              </label>
              <button
                className={buttonClass}
                disabled={!canTuneFreq}
                onClick={() => handleSend('FPV_TUNE_FREQ', { vrx_id: tuneVrxIdNum, freq_mhz: tuneFreqNum, timeout_s: 3 })}
              >
                FPV_TUNE_FREQ
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Tune Index</div>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-[12px] text-slate-400">
                VRX ID
                <input
                  type="number"
                  value={tuneVrxId}
                  onChange={(e) => setTuneVrxId(e.target.value)}
                  className="mt-1 w-20 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-[12px] text-slate-400">
                Index
                <input
                  type="number"
                  value={tuneIndex}
                  onChange={(e) => setTuneIndex(e.target.value)}
                  className="mt-1 w-20 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
                />
              </label>
              <button
                className={buttonClass}
                disabled={!canTuneIndex}
                onClick={() => handleSend('FPV_TUNE_INDEX', { vrx_id: tuneVrxIdNum, idx: tuneIndexNum, timeout_s: 3 })}
              >
                FPV_TUNE_INDEX
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Band Profile</div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={bandProfile}
                onChange={(e) => setBandProfile(e.target.value as (typeof bandOptions)[number])}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
              >
                {bandOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button className={buttonClass} onClick={() => handleSend('FPV_SET_BAND_PROFILE', { profile: bandProfile, timeout_s: 3 })}>
                SET BAND
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Threshold Profile</div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={thresholdProfile}
                onChange={(e) => setThresholdProfile(e.target.value as (typeof thresholdOptions)[number])}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100"
              >
                {thresholdOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button className={buttonClass} onClick={() => handleSend('FPV_SET_THRESHOLD_PROFILE', { profile: thresholdProfile, timeout_s: 3 })}>
                SET THRESHOLD
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Status Snapshot</div>
            <div className="text-[12px] text-slate-300">WS: {wsConnected ? 'connected' : 'disconnected'}</div>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
{JSON.stringify({
  esp32: statusSnapshot?.esp32 ?? null,
  fpv: statusSnapshot?.fpv ?? null
}, null, 2)}
            </pre>
          </section>

          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Command Log (last {MAX_LOG})</div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 max-h-56 overflow-y-auto">
              {log.length === 0 && (
                <div className="text-[11px] text-slate-500 font-mono">No commands yet.</div>
              )}
              {log.map((entry) => (
                <div key={entry.id} className="text-[11px] font-mono text-slate-300 mb-1">
                  <span className="text-slate-500">[{formatTime(entry.ts)}]</span>{' '}
                  <span className={entry.kind === 'sent' ? 'text-blue-300' : entry.ok ? 'text-emerald-300' : 'text-red-300'}>
                    {entry.kind.toUpperCase()}
                  </span>{' '}
                  {entry.req_id && <span className="text-slate-400">{entry.req_id}</span>}{' '}
                  {entry.cmd && <span className="text-slate-100">{entry.cmd}</span>}
                  {entry.kind === 'sent' && formatJson(entry.args) && (
                    <span className="text-slate-400"> {' '}args={formatJson(entry.args)}</span>
                  )}
                  {entry.kind === 'ack' && (
                    <span className="text-slate-400"> {' '}ok={String(entry.ok)} err={formatJson(entry.err)}</span>
                  )}
                  {entry.kind === 'ack' && formatJson(entry.resp) && (
                    <div className="text-slate-500">resp={formatJson(entry.resp)}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
