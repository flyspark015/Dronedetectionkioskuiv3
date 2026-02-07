#!/usr/bin/env python3
import json, os, time, threading, socket, subprocess, math, shutil, re, urllib.request, urllib.error, hashlib, struct
from pathlib import Path
import serial
from typing import Any, Dict, Optional, Set, List, Tuple
from collections import deque

from flask import send_from_directory, send_file, Flask, jsonify, request
from flask_sock import Sock

APP_PORT = 8000
STATE_DIR = "/opt/ndefender/backend/state"
REMOTEID_STATE_FILE = os.path.join(STATE_DIR, "remoteid_state.json")
GPS_STATE_FILE = os.path.join(STATE_DIR, "gps_state.json")
UI_SETTINGS_FILE = os.path.join(STATE_DIR, "ui_settings.json")
AUDIO_SETTINGS_FILE = os.path.join(STATE_DIR, "audio_settings.json")
MAPS_SETTINGS_FILE = os.path.join(STATE_DIR, "maps_settings.json")
ALERTS_SETTINGS_FILE = os.path.join(STATE_DIR, "alerts_settings.json")
try:
    AUDIO_ALSA_CARD = int(os.environ.get("NDEFENDER_AUDIO_CARD", "2") or 2)
except Exception:
    AUDIO_ALSA_CARD = 2
AUDIO_ALSA_DEVICE = os.environ.get("NDEFENDER_AUDIO_DEVICE") or f"hw:{AUDIO_ALSA_CARD},0"
AUDIO_ALSA_CONTROL = os.environ.get("NDEFENDER_AUDIO_CONTROL") or "Speaker"
AUDIO_MAP_FILE = "/opt/ndefender/system/audio_map.json"
AUDIO_WAV_DIR = "/opt/ndefender/assets/audio_wav"
DEFAULT_AUDIO_MAP = {
    "ui_click": "/opt/ndefender/assets/audio/ui_click.mp3",
    "startup_bg": "/opt/ndefender/assets/audio/startup_bg.mp3",
    "drone_detected_alarm": "/opt/ndefender/assets/audio/drone_detected_alarm.mp3",
    "test_buzzer": "/opt/ndefender/assets/audio/test_buzzer.mp3",
}
_AUDIO_MAP_CACHE: Optional[Dict[str, str]] = None
_AUDIO_ASSETS_STATUS = {
    "ok_keys": [],
    "missing_keys": [],
    "empty_keys": [],
}
MAPS_PACKS_STATE_FILE = os.path.join(STATE_DIR, "map_packs.json")
MAPS_PACKS_DIR = os.environ.get("NDEFENDER_MAPS_PACKS_DIR", "/opt/ndefender/maps/packs")
MAPS_TILE_URL_TEMPLATE = os.environ.get("NDEFENDER_GOOGLE_TILE_URL_TEMPLATE") or ""
MAPS_TILE_API_KEY = os.environ.get("NDEFENDER_GOOGLE_TILE_API_KEY") or ""
MAPS_TILE_SLEEP_S = float(os.environ.get("NDEFENDER_GOOGLE_TILE_SLEEP", "0.05") or 0.05)
MAPS_TILE_TIMEOUT_S = float(os.environ.get("NDEFENDER_GOOGLE_TILE_TIMEOUT", "8") or 8)
MAPS_TILE_FAIL_LIMIT = int(os.environ.get("NDEFENDER_GOOGLE_TILE_FAIL_LIMIT", "50") or 50)
PMTILES_ROOT = os.environ.get("NDEFENDER_PMTILES_DIR", "/opt/ndefender/maps/pmtiles")
PMTILES_PACKS_DIR = os.path.join(PMTILES_ROOT, "packs")

RAW_JSONL_PATH = "/opt/ndefender/logs/remoteid_replay.jsonl"
EK_JSONL_PATH  = "/opt/ndefender/logs/odid_wifi_sample.ek.jsonl"
REMOTEID_LIVE_JSONL_PATH = os.environ.get("NDEFENDER_REMOTEID_LIVE_JSONL", "/opt/ndefender/logs/remoteid_decoded.jsonl")
REMOTEID_MODE = (os.environ.get("NDEFENDER_REMOTEID_MODE") or "live").strip().lower()
REMOTEID_REPLAY_FILE = os.environ.get("NDEFENDER_REMOTEID_REPLAY_FILE") or "/opt/ndefender/remoteid/testdata/odid_wifi_sample.pcap"
REMOTEID_REPLAY_LOOP = (os.environ.get("NDEFENDER_REMOTEID_REPLAY_LOOP", "0") == "1")
REMOTEID_REPLAY_INTERVAL = float(os.environ.get("NDEFENDER_REMOTEID_REPLAY_INTERVAL", "0") or 0.0)
REMOTEID_REPLAY_JSONL_PATH = os.environ.get("NDEFENDER_REMOTEID_REPLAY_JSONL", REMOTEID_LIVE_JSONL_PATH)
REMOTEID_STREAM_JSONL_PATH = REMOTEID_REPLAY_JSONL_PATH if REMOTEID_MODE == "replay" else REMOTEID_LIVE_JSONL_PATH
REMOTEID_SERVICE_NAME = os.environ.get("NDEFENDER_REMOTEID_SERVICE") or ("ndefender-remoteid-replay" if REMOTEID_MODE == "replay" else "ndefender-remoteid-live")
REMOTEID_OK_MS = int(os.environ.get("NDEFENDER_REMOTEID_OK_MS") or "3000")
REMOTEID_DEGRADED_MS = int(os.environ.get("NDEFENDER_REMOTEID_DEGRADED_MS") or "15000")
RF_SENSOR_JSONL_PATH = "/opt/ndefender/logs/antsdr_scan.jsonl"
RF_SENSOR_ENDPOINT = "ip:192.168.10.2"
RF_SENSOR_OK_MS = 3000
RF_SENSOR_DEGRADED_MS = 15000
RF_SENSOR_ACTIVE_MS = 2000
RF_CONTACT_TTL_MS = 7000

STYLE_SAVE_FILE = os.path.join(STATE_DIR, "style_saved.json")

# Phase-1.1 replay-only
RID_TTL_S = 15.0
RID_REPLAY_LOOP = (os.environ.get("NDEFENDER_REPLAY_LOOP","0") == "1")  # 1=loop, 0=one-shot
RID_REPLAY_SLEEP_S = 0.01
RID_STATS_PERIOD_S = 1.0

app = Flask(__name__, static_folder='/opt/ndefender/backend/static/ui', static_url_path='')

UI_DEBUG_MAPLIBRE = deque(maxlen=50)
UI_DEBUG_SETTINGS = deque(maxlen=50)


# ---- UI STATIC SERVE (SPA) ----
# Serves built UI from /opt/ndefender/backend/static/ui
# Keeps API at /api/v1/* untouched.
@app.get("/")
def ui_index():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/<path:path>")
def ui_assets(path):
    # If asset exists, serve it; otherwise SPA fallback to index.html
    full = Path(app.static_folder) / path
    if full.exists() and full.is_file():
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

@app.get("/map.html")
def map_debug_page():
    return send_from_directory(app.static_folder, "map.html")
# ---- END UI STATIC SERVE ----

@app.post("/api/v1/ui/debug/maplibre")
def api_ui_debug_maplibre_post():
    payload = request.get_json(silent=True) or {}
    if "ts" not in payload:
        payload["ts"] = time.time()
    UI_DEBUG_MAPLIBRE.append(payload)
    return jsonify({"ok": True})

@app.get("/api/v1/ui/debug/maplibre")
def api_ui_debug_maplibre_get():
    return jsonify({"ok": True, "events": list(UI_DEBUG_MAPLIBRE)})

@app.post("/api/v1/ui/debug/settings")
def api_ui_debug_settings_post():
    payload = request.get_json(silent=True) or {}
    if "ts" not in payload:
        payload["ts"] = time.time()
    UI_DEBUG_SETTINGS.append(payload)
    return jsonify({"ok": True})

@app.get("/api/v1/ui/debug/settings")
def api_ui_debug_settings_get():
    return jsonify({"ok": True, "events": list(UI_DEBUG_SETTINGS)})

@app.post("/api/v1/style/save")
def api_style_save():
    data = request.get_data(cache=False, as_text=True) or ""
    if len(data) > 5_000_000:
        return jsonify({"ok": False, "error": "style too large"}), 413
    try:
        obj = json.loads(data) if data else (request.get_json(silent=True) or {})
    except Exception as e:
        return jsonify({"ok": False, "error": f"invalid json: {e}"}), 400
    os.makedirs(STATE_DIR, exist_ok=True)
    pretty = json.dumps(obj, ensure_ascii=True, indent=2)
    with open(STYLE_SAVE_FILE, "w", encoding="utf-8") as f:
        f.write(pretty)
    return jsonify({"ok": True, "bytes": len(pretty)})

@app.get("/api/v1/style/saved")
def api_style_saved():
    if not os.path.exists(STYLE_SAVE_FILE):
        return jsonify({"ok": False, "error": "not found"}), 404
    with open(STYLE_SAVE_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    return app.response_class(content, mimetype="application/json")

sock = Sock(app)

_ws_clients_lock = threading.Lock()
_ws_clients: Set[Any] = set()
_stop = threading.Event()

# Global tracker ref for WS snapshots
_TRACKER = None

# UNKNOWN_RF contacts (RF Sensor)
_ANTS_LOCK = threading.Lock()
UNKNOWN_RF_CONTACTS: Dict[str, Dict[str, Any]] = {}
_RF_SENSOR_LOCK = threading.Lock()
RF_SENSOR_STATE = {
    "last_response_ts": None,
    "last_error": None,
    "scan_active": False,
    "service_state": "unknown",
}

# Replay runtime state (for /api/v1/status)
REPLAY_STATE = {"active": False, "last_change_ts": time.time()}

# Remote ID live status
_RID_LOCK = threading.Lock()
REMOTEID_STATE = {
    "last_response_ts": None,
    "last_error": None,
    "service_active": False,
    "service_state": "unknown",
    "source": REMOTEID_MODE,
}

# ---- Controller telemetry (live) ----
LEGACY_CTRL_ENV_PREFIX = "NDEFENDER_" + "ESP" + "32"
CTRL_DEV = os.environ.get("NDEFENDER_CTRL_DEV") or os.environ.get(f"{LEGACY_CTRL_ENV_PREFIX}_DEV") or "/dev/ndefender-controller"
CTRL_BAUD = int(os.environ.get("NDEFENDER_CTRL_BAUD") or os.environ.get(f"{LEGACY_CTRL_ENV_PREFIX}_BAUD") or "115200")
CTRL_STALE_MS = int(os.environ.get("NDEFENDER_CTRL_STALE_MS") or os.environ.get(f"{LEGACY_CTRL_ENV_PREFIX}_STALE_MS") or "3000")

_ctrl_lock = threading.Lock()
CTRL_STATE = {"status": "DISCONNECTED", "rssi_dbm": None, "uptime_seconds": None, "last_ts": None}
FPV_STATE   = {"scan_state": "idle", "locked_channels": [], "selected": None, "freq_hz": None, "rssi_raw": None, "vrx": []}
# ---- END Controller telemetry ----
_ctrl_ser = None
_ctrl_ser_lock = threading.Lock()

_pending_lock = threading.Lock()
_pending_cmd = {}  # req_id -> {"ev": threading.Event(), "resp": dict|None}



def now_ts() -> int:
    return int(time.time() * 1000)
def atomic_write_json(path: str, obj: Dict[str, Any]) -> None:
    # Safe atomic writer: unique tmp file avoids multi-thread collisions
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.tmp.{os.getpid()}.{threading.get_ident()}"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)



def safe_load(path: str, default: Dict[str, Any]) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

DEFAULT_UI_SETTINGS = {
    "brightness": 75,
    "glove_mode": False,
    "performance_mode": False,
}
DEFAULT_AUDIO_SETTINGS = {
    "volume": 80,
}
DEFAULT_MAPS_SETTINGS = {
    "mode": "offline",
    "offline_pack_id": "india",
}
DEFAULT_ALERTS_SETTINGS = {
    "preset": "Balanced",
}

def load_settings(path: str, default: Dict[str, Any]) -> Dict[str, Any]:
    data = safe_load(path, default)
    if not isinstance(data, dict):
        return default
    merged = default.copy()
    merged.update({k: v for k, v in data.items() if k in default})
    return merged

def save_settings(path: str, data: Dict[str, Any]) -> None:
    atomic_write_json(path, data)

# ---- Audio volume (system) ----
def _run_cmd(cmd: List[str], extra_env: Optional[Dict[str, str]] = None) -> Tuple[int, str]:
    try:
        env = os.environ.copy()
        if extra_env:
            env.update(extra_env)
        res = subprocess.run(cmd, capture_output=True, text=True, check=False, env=env)
        output = (res.stdout or "") + (res.stderr or "")
        return res.returncode, output.strip()
    except Exception as e:
        return 1, str(e)

def _pulse_env() -> Optional[Dict[str, str]]:
    runtime = os.environ.get("XDG_RUNTIME_DIR")
    if runtime and os.path.exists(os.path.join(runtime, "pulse", "native")):
        return {"XDG_RUNTIME_DIR": runtime, "PULSE_SERVER": f"unix:{runtime}/pulse/native"}
    try:
        for entry in os.listdir("/run/user"):
            if not entry.isdigit():
                continue
            candidate = f"/run/user/{entry}"
            if os.path.exists(os.path.join(candidate, "pulse", "native")):
                return {"XDG_RUNTIME_DIR": candidate, "PULSE_SERVER": f"unix:{candidate}/pulse/native"}
    except Exception:
        pass
    return None

def _detect_audio_backend() -> str:
    if shutil.which("amixer"):
        return "amixer"
    if shutil.which("wpctl"):
        code, _ = _run_cmd(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"])
        if code == 0:
            return "wpctl"
    return ""

def _parse_percent(text: str) -> Optional[int]:
    if not text:
        return None
    m = re.search(r"\[(\d{1,3})%\]", text)
    if not m:
        m = re.search(r"(\d{1,3})%", text)
    if not m:
        return None
    try:
        return max(0, min(100, int(m.group(1))))
    except Exception:
        return None

def _get_volume_percent() -> Tuple[Optional[int], Optional[str]]:
    if shutil.which("amixer"):
        code, out = _run_cmd(["amixer", "-c", str(AUDIO_ALSA_CARD), "get", "Playback"])
        if code == 0:
            val = _parse_percent(out)
            if val is not None:
                return val, None
        return None, "amixer_failed"

    backend = _detect_audio_backend()
    if backend == "wpctl":
        code, out = _run_cmd(["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"])
        if code == 0:
            m = re.search(r"([0-9]*\\.?[0-9]+)", out)
            if m:
                try:
                    val = int(round(float(m.group(1)) * 100))
                    return max(0, min(100, val)), None
                except Exception:
                    pass
        return None, "wpctl_failed"

    return None, "no_audio_backend"

def _set_volume_percent(percent: int) -> Tuple[bool, Optional[str], Dict[str, Any], int]:
    percent = max(0, min(100, int(percent)))
    applied = 0 if percent == 0 else max(10, percent)
    info = {
        "backend": "amixer" if shutil.which("amixer") else (_detect_audio_backend() or None),
        "speaker_control": "Speaker",
        "playback_control": "Playback",
        "alsa_card": AUDIO_ALSA_CARD,
        "requested_percent": percent,
        "applied_percent": applied,
    }
    if shutil.which("amixer") is None:
        return False, "amixer_not_found", info, applied

    code1, out1 = _run_cmd(["amixer", "-c", str(AUDIO_ALSA_CARD), "set", "Speaker", "100%", "unmute"])
    if applied <= 0:
        code2, out2 = _run_cmd(["amixer", "-c", str(AUDIO_ALSA_CARD), "set", "Playback", "0%", "mute"])
    else:
        code2, out2 = _run_cmd(["amixer", "-c", str(AUDIO_ALSA_CARD), "set", "Playback", f"{applied}%", "unmute"])

    ok = code1 == 0 and code2 == 0
    if ok:
        return True, None, info, applied
    err = (out2 or out1 or "amixer_failed").strip()
    return False, err, info, applied

_AUDIO_PROC_LOCK = threading.Lock()
_AUDIO_PROC: Optional[subprocess.Popen] = None
_MIXER_INIT_LOCK = threading.Lock()
_MIXER_INIT_DONE = False

def _load_audio_map(force: bool = False) -> Dict[str, str]:
    global _AUDIO_MAP_CACHE
    if _AUDIO_MAP_CACHE is not None and not force:
        return dict(_AUDIO_MAP_CACHE)
    data: Dict[str, str] = {}
    try:
        with open(AUDIO_MAP_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, dict):
            data = {str(k): str(v) for k, v in raw.items() if v}
    except Exception:
        data = {}
    if not data:
        data = dict(DEFAULT_AUDIO_MAP)
    _AUDIO_MAP_CACHE = dict(data)
    return dict(_AUDIO_MAP_CACHE)

def _preload_audio_assets() -> None:
    audio_map = _load_audio_map(force=True)
    ok_keys: List[str] = []
    missing_keys: List[str] = []
    empty_keys: List[str] = []
    for key, path in audio_map.items():
        if not path or not os.path.exists(path):
            missing_keys.append(key)
            continue
        try:
            if os.path.getsize(path) <= 0:
                empty_keys.append(key)
                continue
        except Exception:
            empty_keys.append(key)
            continue
        ok_keys.append(key)

    _AUDIO_ASSETS_STATUS["ok_keys"] = ok_keys
    _AUDIO_ASSETS_STATUS["missing_keys"] = missing_keys
    _AUDIO_ASSETS_STATUS["empty_keys"] = empty_keys

    try:
        print(
            f"AUDIO_ASSETS ok={len(ok_keys)} missing={missing_keys} empty={empty_keys}",
            flush=True,
        )
    except Exception:
        pass
    try:
        ws_broadcast(_ws_env("LOG_EVENT", "backend", {
            "category": "audio",
            "ok_keys": ok_keys,
            "missing_keys": missing_keys,
            "empty_keys": empty_keys,
        }))
    except Exception:
        pass

def _resolve_audio_path(name: str) -> Tuple[Optional[str], Optional[str]]:
    if not name:
        return None, "invalid_name"
    audio_map = _load_audio_map()
    path = audio_map.get(name)
    if not path:
        return None, "unknown_sound"
    if not os.path.exists(path):
        return path, "file_missing"
    try:
        if os.path.getsize(path) <= 0:
            return path, "file_empty"
    except Exception:
        pass
    return path, None

def _resolve_audio_wav_path(name: str) -> Tuple[Optional[str], Optional[str]]:
    if not name:
        return None, "invalid_name"
    path = os.path.join(AUDIO_WAV_DIR, f"{name}.wav")
    if not os.path.exists(path):
        return path, "file_missing"
    try:
        if os.path.getsize(path) <= 0:
            return path, "file_empty"
    except Exception:
        return path, "file_empty"
    return path, None

def _terminate_proc(proc: subprocess.Popen) -> None:
    try:
        if proc.poll() is not None:
            return
    except Exception:
        return
    try:
        proc.terminate()
        proc.wait(timeout=0.5)
        return
    except Exception:
        pass
    try:
        proc.kill()
    except Exception:
        pass

def _ensure_mixer_init() -> None:
    global _MIXER_INIT_DONE
    if _MIXER_INIT_DONE:
        return
    with _MIXER_INIT_LOCK:
        if _MIXER_INIT_DONE:
            return
        script = "/opt/ndefender/system/wm8960_mixer_init.sh"
        if os.path.exists(script) and os.access(script, os.X_OK):
            try:
                subprocess.run([script], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        _MIXER_INIT_DONE = True

def _start_audio_proc(cmd: List[str]) -> Tuple[Optional[subprocess.Popen], Optional[str]]:
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        return None, str(e)
    return proc, None

def _play_sound(sound_name: str, duration_ms: Optional[int] = None) -> Dict[str, Any]:
    pw_play = shutil.which("pw-play")
    path: Optional[str] = None
    cmd: Optional[List[str]] = None

    if pw_play:
        wav_path, wav_err = _resolve_audio_wav_path(sound_name)
        if wav_err or not wav_path:
            return {"ok": False, "err": wav_err or "resolve_failed", "sound_name": sound_name, "file_path": wav_path, "exit_code": -1}
        path = wav_path
        if sound_name == "test_buzzer":
            timeout_bin = shutil.which("timeout")
            if not timeout_bin:
                return {"ok": False, "err": "timeout_not_found", "sound_name": sound_name, "file_path": path, "exit_code": -1}
            cmd = [timeout_bin, "4s", pw_play, path]
        else:
            cmd = [pw_play, path]
    else:
        path, err = _resolve_audio_path(sound_name)
        if err or not path:
            return {"ok": False, "err": err or "resolve_failed", "sound_name": sound_name, "file_path": path, "exit_code": -1}
        if shutil.which("mpg123") is None:
            return {"ok": False, "err": "mpg123_not_found", "sound_name": sound_name, "file_path": path, "exit_code": -1}
        if sound_name == "test_buzzer":
            timeout_bin = shutil.which("timeout")
            if not timeout_bin:
                return {"ok": False, "err": "timeout_not_found", "sound_name": sound_name, "file_path": path, "exit_code": -1}
            cmd = [timeout_bin, "4s", "mpg123", "-q", "-a", AUDIO_ALSA_DEVICE, path]
        else:
            cmd = ["mpg123", "-q", "-a", AUDIO_ALSA_DEVICE, path]

    try:
        _ensure_mixer_init()
        if not cmd or not path:
            return {"ok": False, "err": "play_failed", "sound_name": sound_name, "file_path": path, "exit_code": -1}

        with _AUDIO_PROC_LOCK:
            global _AUDIO_PROC
            if _AUDIO_PROC is not None:
                _terminate_proc(_AUDIO_PROC)
                _AUDIO_PROC = None
            proc, start_err = _start_audio_proc(cmd)
            if proc is None:
                return {"ok": False, "err": start_err or "start_failed", "sound_name": sound_name, "file_path": path, "exit_code": -1}
            _AUDIO_PROC = proc

        exit_code = proc.wait()
        with _AUDIO_PROC_LOCK:
            if _AUDIO_PROC is proc:
                _AUDIO_PROC = None

        timed_out = sound_name == "test_buzzer" and exit_code == 124
        ok = exit_code == 0 or timed_out
        # Treat test_buzzer timeout as success for ACK exit_code consistency.
        exit_code_for_ack = 0 if timed_out else exit_code
        return {
            "ok": ok,
            "sound_name": sound_name,
            "file_path": path,
            "exit_code": int(exit_code_for_ack) if exit_code_for_ack is not None else None,
            "timed_out": timed_out,
            "duration_ms": duration_ms,
        }
    except Exception as e:
        return {"ok": False, "err": str(e), "sound_name": sound_name, "file_path": path, "exit_code": -1}

def _terminate_process(proc: subprocess.Popen, timeout_s: float) -> None:
    try:
        proc.wait(timeout=timeout_s)
        return
    except Exception:
        pass
    try:
        proc.terminate()
        proc.wait(timeout=0.5)
        return
    except Exception:
        pass
    try:
        proc.kill()
    except Exception:
        pass

def _start_speaker_test(duration_ms: int) -> Tuple[bool, Optional[str]]:
    if shutil.which("speaker-test") is None:
        return False, "speaker-test_not_found"
    cmd = ["speaker-test", "-D", AUDIO_ALSA_DEVICE, "-c", "2", "-t", "sine", "-f", "1000", "-l", "1"]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        return False, str(e)
    t = threading.Thread(target=_terminate_process, args=(proc, max(0.2, duration_ms / 1000.0)), daemon=True)
    t.start()
    return True, None

# ---- Offline Map Packs ----
_MAP_PACKS_LOCK = threading.Lock()
_MAP_DOWNLOADS: Dict[str, threading.Thread] = {}

def _ensure_maps_dir() -> None:
    try:
        os.makedirs(MAPS_PACKS_DIR, exist_ok=True)
    except Exception:
        pass

# ---- PMTiles Offline Pack (Single, Prebuilt) ----
PMTILES_PACK_ID = "india"
PMTILES_PACK_NAME = "India + neighbors"
PMTILES_PACK_PATH = os.path.join(PMTILES_PACKS_DIR, "india.pmtiles")

def _ensure_pmtiles_dir() -> None:
    try:
        os.makedirs(PMTILES_ROOT, exist_ok=True)
        os.makedirs(PMTILES_PACKS_DIR, exist_ok=True)
    except Exception:
        pass

def _pmtiles_pack_ready() -> bool:
    try:
        return os.path.isfile(PMTILES_PACK_PATH) and os.path.getsize(PMTILES_PACK_PATH) > 0
    except Exception:
        return False

def _pmtiles_pack_info() -> Tuple[bool, int, Optional[int]]:
    _ensure_pmtiles_dir()
    try:
        if os.path.isfile(PMTILES_PACK_PATH):
            size = int(os.path.getsize(PMTILES_PACK_PATH))
            updated_ts = int(os.path.getmtime(PMTILES_PACK_PATH) * 1000)
            return size > 0, size, updated_ts
    except Exception:
        pass
    return False, 0, None

def _load_map_packs() -> Dict[str, Any]:
    data = safe_load(MAPS_PACKS_STATE_FILE, {"packs": {}})
    if not isinstance(data, dict):
        data = {"packs": {}}
    packs = data.get("packs")
    if isinstance(packs, list):
        packs = {p.get("id"): p for p in packs if isinstance(p, dict) and p.get("id")}
    if not isinstance(packs, dict):
        packs = {}
    data["packs"] = packs
    return data

def _save_map_packs(data: Dict[str, Any]) -> None:
    atomic_write_json(MAPS_PACKS_STATE_FILE, data)

def _sanitize_pack_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    if not slug:
        slug = "pack"
    return f"{slug}-{int(time.time())}"

def _normalize_bbox(bbox: Any) -> Optional[Dict[str, float]]:
    if isinstance(bbox, dict):
        try:
            north = float(bbox.get("north", bbox.get("max_lat", bbox.get("lat_max"))))
            south = float(bbox.get("south", bbox.get("min_lat", bbox.get("lat_min"))))
            east = float(bbox.get("east", bbox.get("max_lon", bbox.get("lon_max"))))
            west = float(bbox.get("west", bbox.get("min_lon", bbox.get("lon_min"))))
            return {"north": north, "south": south, "east": east, "west": west}
        except Exception:
            return None
    if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        try:
            south = float(bbox[0])
            west = float(bbox[1])
            north = float(bbox[2])
            east = float(bbox[3])
            return {"north": north, "south": south, "east": east, "west": west}
        except Exception:
            return None
    return None

def _clamp_lat(lat: float) -> float:
    return max(-85.05112878, min(85.05112878, lat))

def _lonlat_to_tile(lon: float, lat: float, zoom: int) -> Tuple[int, int]:
    lat = _clamp_lat(lat)
    n = 2 ** zoom
    xtile = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    xtile = max(0, min(n - 1, xtile))
    ytile = max(0, min(n - 1, ytile))
    return xtile, ytile

def _tile_range_for_bbox(bbox: Dict[str, float], zoom: int) -> Tuple[int, int, int, int]:
    x1, y1 = _lonlat_to_tile(bbox["west"], bbox["north"], zoom)
    x2, y2 = _lonlat_to_tile(bbox["east"], bbox["south"], zoom)
    xmin, xmax = (x1, x2) if x1 <= x2 else (x2, x1)
    ymin, ymax = (y1, y2) if y1 <= y2 else (y2, y1)
    return xmin, xmax, ymin, ymax

def _map_pack_dir(pack_id: str) -> str:
    return os.path.join(MAPS_PACKS_DIR, pack_id)

def _map_tiles_dir(pack_id: str) -> str:
    return os.path.join(_map_pack_dir(pack_id), "tiles")

def _tile_path(pack_id: str, z: int, x: int, y: int) -> str:
    return os.path.join(_map_tiles_dir(pack_id), str(z), str(x), f"{y}.png")

def _build_tile_url(z: int, x: int, y: int) -> Optional[str]:
    if not MAPS_TILE_URL_TEMPLATE:
        return None
    return MAPS_TILE_URL_TEMPLATE.format(z=z, x=x, y=y, key=MAPS_TILE_API_KEY, api_key=MAPS_TILE_API_KEY)

def _update_pack(data: Dict[str, Any], pack_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    packs = data.get("packs", {})
    pack = packs.get(pack_id) or {}
    pack.update(patch)
    pack["id"] = pack_id
    packs[pack_id] = pack
    data["packs"] = packs
    return pack

def _download_pack(pack_id: str) -> None:
    _ensure_maps_dir()
    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        pack = data.get("packs", {}).get(pack_id)
        if not pack:
            return
        pack = _update_pack(data, pack_id, {
            "status": "downloading",
            "downloaded_tiles": 0,
            "failed_tiles": 0,
            "size_bytes": 0,
            "last_error": None,
            "started_ts": now_ts(),
            "updated_ts": now_ts(),
            "failures": [],
        })
        _save_map_packs(data)

    bbox = _normalize_bbox(pack.get("bbox") or {})
    zmin = int(pack.get("zmin", 0))
    zmax = int(pack.get("zmax", 0))
    if not bbox:
        with _MAP_PACKS_LOCK:
            data = _load_map_packs()
            _update_pack(data, pack_id, {
                "status": "error",
                "last_error": "invalid_bbox",
                "updated_ts": now_ts(),
            })
            _save_map_packs(data)
        return

    if zmin > zmax:
        zmin, zmax = zmax, zmin

    ranges = []
    total_tiles = 0
    for z in range(zmin, zmax + 1):
        xmin, xmax, ymin, ymax = _tile_range_for_bbox(bbox, z)
        ranges.append((z, xmin, xmax, ymin, ymax))
        total_tiles += (xmax - xmin + 1) * (ymax - ymin + 1)

    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        _update_pack(data, pack_id, {"total_tiles": total_tiles, "updated_ts": now_ts()})
        _save_map_packs(data)

    for z, xmin, xmax, ymin, ymax in ranges:
        for x in range(xmin, xmax + 1):
            for y in range(ymin, ymax + 1):
                tile_file = _tile_path(pack_id, z, x, y)
                if os.path.exists(tile_file):
                    with _MAP_PACKS_LOCK:
                        data = _load_map_packs()
                        current = (data.get("packs") or {}).get(pack_id) or {}
                        _update_pack(data, pack_id, {
                            "downloaded_tiles": int(current.get("downloaded_tiles", 0)) + 1,
                            "updated_ts": now_ts(),
                        })
                        _save_map_packs(data)
                    continue

                url = _build_tile_url(z, x, y)
                if not url:
                    with _MAP_PACKS_LOCK:
                        data = _load_map_packs()
                        _update_pack(data, pack_id, {
                            "status": "error",
                            "last_error": "tile_url_template_missing",
                            "updated_ts": now_ts(),
                        })
                        _save_map_packs(data)
                    return

                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "N-Defender/1.0"})
                    with urllib.request.urlopen(req, timeout=MAPS_TILE_TIMEOUT_S) as resp:
                        content = resp.read()
                    if not content:
                        raise RuntimeError("empty tile")

                    os.makedirs(os.path.dirname(tile_file), exist_ok=True)
                    with open(tile_file, "wb") as f:
                        f.write(content)
                    size_bytes = len(content)

                    with _MAP_PACKS_LOCK:
                        data = _load_map_packs()
                        pack = data.get("packs", {}).get(pack_id) or {}
                        pack_downloaded = int(pack.get("downloaded_tiles", 0)) + 1
                        pack_size = int(pack.get("size_bytes", 0)) + size_bytes
                        _update_pack(data, pack_id, {
                            "downloaded_tiles": pack_downloaded,
                            "size_bytes": pack_size,
                            "updated_ts": now_ts(),
                        })
                        _save_map_packs(data)
                except Exception as e:
                    with _MAP_PACKS_LOCK:
                        data = _load_map_packs()
                        pack = data.get("packs", {}).get(pack_id) or {}
                        fails = list(pack.get("failures") or [])
                        if len(fails) < MAPS_TILE_FAIL_LIMIT:
                            fails.append({"z": z, "x": x, "y": y, "error": str(e)})
                        _update_pack(data, pack_id, {
                            "failed_tiles": int(pack.get("failed_tiles", 0)) + 1,
                            "last_error": str(e),
                            "failures": fails,
                            "updated_ts": now_ts(),
                        })
                        _save_map_packs(data)

                if MAPS_TILE_SLEEP_S > 0:
                    time.sleep(MAPS_TILE_SLEEP_S)

    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        pack = data.get("packs", {}).get(pack_id) or {}
        _update_pack(data, pack_id, {
            "status": "done",
            "completed_ts": now_ts(),
            "updated_ts": now_ts(),
        })
        _save_map_packs(data)

    with _MAP_PACKS_LOCK:
        _MAP_DOWNLOADS.pop(pack_id, None)

def ws_broadcast(obj: Dict[str, Any]) -> None:
    # Contract-enforcing WS broadcaster:
    # Envelope: {type, timestamp(ms), source, data}
    # Allowed types: TELEMETRY_UPDATE, CONTACT_NEW/UPDATE/LOST, REPLAY_STATE, COMMAND_ACK, ALERT_*, LOG_EVENT
    disallowed = {"HELLO", "RID_DEDUPE", "RID_INPUT_COUNTS", "RID_STATS"}

    et = obj.get("type")
    if et in disallowed:
        return

    # Normalize legacy contact types if backend uses them
    et = {
        "RID_CONTACT_NEW": "CONTACT_NEW",
        "RID_CONTACT_UPDATE": "CONTACT_UPDATE",
        "RID_CONTACT_LOST": "CONTACT_LOST",
    }.get(et, et)

    # timestamp ms
    ts = obj.get("timestamp")
    if ts is None:
        ts = obj.get("ts")
    if ts is None:
        ts = now_ts()

    # Build envelope
    if isinstance(obj.get("data"), dict) and "timestamp" in obj and "source" in obj:
        env = obj
        env["type"] = et
        env["timestamp"] = ts
        env["source"] = env.get("source") or "backend"
        env["data"] = env.get("data") or {}
    else:
        data = obj.get("data")
        if data is None:
            data = {k: v for k, v in obj.items() if k not in ("type", "ts", "timestamp", "source")}
        env = {"type": et, "timestamp": ts, "source": obj.get("source") or "backend", "data": data}

    payload = json.dumps(env, separators=(",", ":"), ensure_ascii=False)

    dead: List[Any] = []
    with _ws_clients_lock:
        for ws in list(_ws_clients):
            try:
                ws.send(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _ws_clients.discard(ws)


def _float(v: Any) -> Optional[float]:
    try:
        if v is None:
            return None
        return float(v)
    except Exception:
        return None

def _str(v: Any) -> Optional[str]:
    if v is None:
        return None
    try:
        s = str(v)
        return s if s != "" else None
    except Exception:
        return None

def _get_any(d: Dict[str, Any], keys: List[str]) -> Any:
    for k in keys:
        if k in d:
            return d[k]
    return None

def parse_any_json_line(line: str) -> Optional[Dict[str, Any]]:
    line = line.strip()
    if not line:
        return None
    # ignore ES bulk index lines if present
    if line.startswith('{"index"'):
        return None
    try:
        return json.loads(line)
    except Exception:
        return None

def _set_rf_sensor_error(msg: Optional[str]) -> None:
    with _RF_SENSOR_LOCK:
        RF_SENSOR_STATE["last_error"] = msg

def _set_rf_scan_active(active: bool, service_state: Optional[str] = None) -> None:
    with _RF_SENSOR_LOCK:
        RF_SENSOR_STATE["scan_active"] = bool(active)
        if service_state is not None:
            RF_SENSOR_STATE["service_state"] = service_state

def _set_rid_error(msg: Optional[str]) -> None:
    with _RID_LOCK:
        REMOTEID_STATE["last_error"] = msg

def _set_rid_capture_active(active: bool, service_state: Optional[str] = None) -> None:
    with _RID_LOCK:
        REMOTEID_STATE["service_active"] = bool(active)
        if service_state is not None:
            REMOTEID_STATE["service_state"] = service_state

def remoteid_status_snapshot(tracker: Optional["ContactTracker"] = None) -> Dict[str, Any]:
    now = now_ms()
    with _RID_LOCK:
        last_ts = REMOTEID_STATE.get("last_response_ts")
        last_error = REMOTEID_STATE.get("last_error")
        service_active = bool(REMOTEID_STATE.get("service_active"))
        service_state = REMOTEID_STATE.get("service_state")
        source = REMOTEID_STATE.get("source") or REMOTEID_MODE

    try:
        last_ts = int(last_ts) if last_ts is not None else None
    except Exception:
        last_ts = None

    ago = None if last_ts is None else max(0, now - last_ts)

    if not service_active:
        if REMOTEID_MODE == "replay" and ago is not None:
            status = "degraded"
        else:
            status = "down"
    else:
        if ago is None:
            status = "degraded"
        elif ago <= REMOTEID_OK_MS:
            status = "ok"
        else:
            status = "degraded"

    if status == "ok":
        health_state = "CONNECTED"
    elif status == "degraded":
        health_state = "DEGRADED"
    else:
        health_state = "DISCONNECTED"

    if REMOTEID_MODE == "replay":
        capture_active = False
        replay_active = service_active
    else:
        capture_active = service_active
        replay_active = False

    stats = {"targets": 0, "msgs_60s": 0}
    if tracker is not None:
        try:
            stats = tracker.stats()
        except Exception:
            stats = {"targets": 0, "msgs_60s": 0}

    return {
        "status": status,
        "mode": REMOTEID_MODE,
        "health_state": health_state,
        "last_update_ts": last_ts,
        "last_response_ago_ms": ago,
        "capture_active": capture_active,
        "replay_active": replay_active,
        "last_error": last_error,
        "service_state": service_state,
        "source": source,
        "contacts": stats.get("targets", 0),
        "decode_rate_60s": stats.get("msgs_60s", 0),
    }

def _antsdr_contact_from_event(obj: Dict[str, Any]) -> Optional[Tuple[str, Dict[str, Any], int]]:
    evt = obj.get("type") or obj.get("event")
    if not isinstance(evt, str) or not evt.startswith("RF_CONTACT_"):
        return None

    data = obj.get("data") if isinstance(obj.get("data"), dict) else {}
    cid = _str(obj.get("id")) or _str(data.get("id"))
    center_hz = data.get("center_hz")
    if cid is None and center_hz is not None:
        try:
            cid = f"rf:{int(center_hz)}"
        except Exception:
            cid = None
    if cid is None:
        return None

    ts_ms = obj.get("ts_ms") or obj.get("timestamp") or obj.get("ts")
    try:
        ts_ms = int(ts_ms)
    except Exception:
        t = obj.get("t")
        try:
            ts_ms = int(float(t) * 1000.0) if t is not None else now_ms()
        except Exception:
            ts_ms = now_ms()

    contact = {
        "id": cid,
        "type": "UNKNOWN_RF",
        "last_seen_ts": int(ts_ms),
        "unknown_rf": {
            "center_hz": data.get("center_hz"),
            "snr_db": data.get("snr_db"),
            "peak_db": data.get("peak_db"),
            "bandwidth_class": data.get("bandwidth_class"),
            "family_hint": data.get("family_hint") or "unknown",
        },
    }
    return evt, contact, int(ts_ms)

def _handle_antsdr_event(obj: Dict[str, Any]) -> None:
    parsed = _antsdr_contact_from_event(obj)
    if not parsed:
        return
    evt, contact, ts_ms = parsed
    with _RF_SENSOR_LOCK:
        RF_SENSOR_STATE["last_response_ts"] = int(ts_ms)
        RF_SENSOR_STATE["last_error"] = None
    mapped = {
        "RF_CONTACT_NEW": "CONTACT_NEW",
        "RF_CONTACT_UPDATE": "CONTACT_UPDATE",
        "RF_CONTACT_LOST": "CONTACT_LOST",
    }.get(evt)
    if mapped is None:
        return

    with _ANTS_LOCK:
        if evt == "RF_CONTACT_LOST":
            UNKNOWN_RF_CONTACTS.pop(contact["id"], None)
        else:
            UNKNOWN_RF_CONTACTS[contact["id"]] = contact

    ws_broadcast({"type": mapped, "timestamp": ts_ms, "source": "rf_sensor", "data": contact})

def snapshot_unknown_rf_contacts() -> List[Dict[str, Any]]:
    _purge_unknown_rf_contacts()
    with _ANTS_LOCK:
        return sorted(UNKNOWN_RF_CONTACTS.values(), key=lambda x: x.get("last_seen_ts", 0), reverse=True)

def _purge_unknown_rf_contacts(now: Optional[int] = None) -> None:
    t = now_ms() if now is None else int(now)
    lost: List[Dict[str, Any]] = []
    with _ANTS_LOCK:
        for cid, c in list(UNKNOWN_RF_CONTACTS.items()):
            last_ts = c.get("last_seen_ts")
            try:
                last_ts = int(last_ts) if last_ts is not None else None
            except Exception:
                last_ts = None
            if last_ts is None:
                continue
            if (t - last_ts) > RF_CONTACT_TTL_MS:
                lost.append(c)
                del UNKNOWN_RF_CONTACTS[cid]
    for c in lost:
        ws_broadcast({"type": "CONTACT_LOST", "timestamp": t, "source": "rf_sensor", "data": c})

def rf_sensor_status_snapshot() -> Dict[str, Any]:
    now = now_ms()
    with _RF_SENSOR_LOCK:
        last_ts = RF_SENSOR_STATE.get("last_response_ts")
        last_error = RF_SENSOR_STATE.get("last_error")
        scan_active = bool(RF_SENSOR_STATE.get("scan_active"))

    try:
        last_ts = int(last_ts) if last_ts is not None else None
    except Exception:
        last_ts = None

    ago = None if last_ts is None else max(0, now - last_ts)

    if scan_active:
        link = "up"
        state = "degraded" if last_error else "ok"
    else:
        link = "down"
        state = "down"

    return {
        "state": state,
        "link": link,
        "endpoint": RF_SENSOR_ENDPOINT,
        "last_response_ts": last_ts,
        "last_response_ago_ms": ago,
        "scan_active": scan_active,
        "last_error": last_error,
    }

def antsdr_worker() -> None:
    fp = None
    inode = None
    pos = 0

    while not _stop.is_set():
        try:
            if fp is None:
                fp = open(RF_SENSOR_JSONL_PATH, "r", encoding="utf-8", errors="ignore")
                st = os.fstat(fp.fileno())
                inode = st.st_ino
                fp.seek(0, os.SEEK_END)
                pos = fp.tell()
                _set_rf_sensor_error(None)

            line = fp.readline()
            if not line:
                try:
                    st = os.stat(RF_SENSOR_JSONL_PATH)
                    if inode is not None and st.st_ino != inode:
                        fp.close()
                        fp = None
                        inode = None
                        pos = 0
                        continue
                    if st.st_size < pos:
                        fp.seek(0)
                        pos = 0
                except FileNotFoundError:
                    fp.close()
                    fp = None
                    inode = None
                    pos = 0
                    _set_rf_sensor_error("file_not_found")
                time.sleep(0.1)
                continue

            pos = fp.tell()
            obj = parse_any_json_line(line)
            if obj:
                _handle_antsdr_event(obj)
        except FileNotFoundError:
            if fp is not None:
                fp.close()
            fp = None
            inode = None
            pos = 0
            _set_rf_sensor_error("file_not_found")
            time.sleep(0.2)
        except Exception:
            _set_rf_sensor_error("read_error")
            time.sleep(0.1)

def unknown_rf_expire_worker() -> None:
    while not _stop.is_set():
        _purge_unknown_rf_contacts()
        time.sleep(0.5)

def rfscan_monitor_worker() -> None:
    while not _stop.is_set():
        try:
            res = subprocess.run(
                ["systemctl", "is-active", "ndefender-rfscan"],
                capture_output=True,
                text=True,
                timeout=1.0,
            )
            state = (res.stdout or "").strip()
            active = state in ("active", "activating")
            _set_rf_scan_active(active, state if state else "unknown")
            if active:
                with _RF_SENSOR_LOCK:
                    if RF_SENSOR_STATE.get("last_error") in ("service_inactive", "service_check_failed"):
                        RF_SENSOR_STATE["last_error"] = None
            else:
                _set_rf_sensor_error("service_inactive")
        except Exception:
            _set_rf_scan_active(False, "unknown")
            _set_rf_sensor_error("service_check_failed")
        time.sleep(1.0)


def deep_find(obj, key):
    """Recursively search dict/list structures and return first match for key, else None."""
    try:
        if isinstance(obj, dict):
            if key in obj:
                return obj.get(key)
            for v in obj.values():
                r = deep_find(v, key)
                if r is not None:
                    return r
        elif isinstance(obj, list):
            for it in obj:
                r = deep_find(it, key)
                if r is not None:
                    return r
    except Exception:
        return None
    return None

def normalize_event(obj: Dict[str, Any], source: str) -> Optional[Dict[str, Any]]:
    ts = _float(_get_any(obj, ["ts", "timestamp", "@timestamp"]))
    if ts is None:
        ts = _float(obj.get("timestamp"))
    if ts is None:
        ts = now_ts()

    layers = obj.get("layers") if isinstance(obj.get("layers"), dict) else None
    flat = layers if layers is not None else obj

    def pick(k: str) -> Any:
        v = flat.get(k)
        if isinstance(v, list) and v:
            return v[0]
        return v

    lon = None
    alt_m = None

    fn = pick("frame.frame_number") or pick("frame_frame_number") or obj.get("frame_frame_number")
    try:
        frame_no = int(fn) if fn is not None else None
    except Exception:
        frame_no = None

    msg_type    = _str(pick("OpenDroneID.msgType") or pick("opendroneid.msgType"))
    operator_id = _str(pick("OpenDroneID.operator_id") or pick("OpenDroneID.operatorId") or pick("opendroneid.operator_id"))
    # Deep-search EK nested structures for operator_id (layers.*) if still missing
    if not operator_id:
        operator_id = _str(deep_find(obj, "opendroneid_OpenDroneID_operator_id"))

    basic_id    = _str(pick("OpenDroneID.basicID_id_asc") or pick("OpenDroneID.basicid_id_asc") or pick("opendroneid.basicID_id_asc"))

    lat = _float(pick("OpenDroneID.loc_lat") or pick("opendroneid.loc_lat"))


    # Deep-search EK nested structures for location if still missing
    if lat is None:
        lat_raw2 = deep_find(obj, "opendroneid_OpenDroneID_loc_lat")
        try:
            if lat_raw2 is not None:
                lat = float(int(lat_raw2)) / 1e7
        except Exception:
            pass
    if lon is None:
        lon_raw2 = deep_find(obj, "opendroneid_OpenDroneID_loc_lon")
        try:
            if lon_raw2 is not None:
                lon = float(int(lon_raw2)) / 1e7
        except Exception:
            pass
    if alt_m is None:
        alt_raw2 = deep_find(obj, "opendroneid_OpenDroneID_loc_geoAlt")
        try:
            if alt_raw2 is not None:
                alt_m = float(int(alt_raw2)) / 10.0
        except Exception:
            pass

    mac = _str(pick("wlan.sa") or pick("wlan.ta") or pick("wlan.da") or pick("wlan.bssid") or pick("eth.src") or pick("btle.address") or pick("mac"))

    # EK (Wireshark Lua/OpenDroneID) keys sometimes appear as opendroneid_OpenDroneID_*
    # Location lat/lon are encoded as int32 scaled by 1e7 (degrees).
    def _odid_deg(v):
        try:
            if v is None:
                return None
            if isinstance(v, str) and v.strip() == "":
                return None
            iv = int(v)
            # OpenDroneID location uses 1e7 scaling
            return iv / 1e7
        except Exception:
            try:
                return float(v)
            except Exception:
                return None

    def _odid_alt_m(v):
        try:
            if v is None:
                return None
            iv = int(v)
            # geoAlt appears to be decimeters in EK dump (e.g. 2474 => 247.4 m)
            return iv / 10.0
        except Exception:
            try:
                return float(v)
            except Exception:
                return None

    # Prefer operator_id from EK keys if present
    operator_id = operator_id or _str(_get_any(obj, [
        "opendroneid_OpenDroneID_operator_id",
        "layers.opendroneid.0.opendroneid_message_pack.opendroneid_message_operatorid.opendroneid_OpenDroneID_operator_id",
    ]))

    # Prefer location from EK keys if present
    lat_raw = _get_any(obj, ["opendroneid_OpenDroneID_loc_lat"])
    lon_raw = _get_any(obj, ["opendroneid_OpenDroneID_loc_lon"])
    geo_alt = _get_any(obj, ["opendroneid_OpenDroneID_loc_geoAlt"])

    lat = lat or _odid_deg(lat_raw)
    lon = lon or _odid_deg(lon_raw)
    alt_m = alt_m or _odid_alt_m(geo_alt)

    # raw replay formats
    msg_type = msg_type or _str(_get_any(obj, ["msg_type", "type", "rid_type", "OpenDroneID.msgType"]))
    operator_id = operator_id or _str(_get_any(obj, ["operator_id", "OpenDroneID.operator_id"]))
    basic_id = basic_id or _str(_get_any(obj, ["basic_id", "id", "basicID_id_asc", "OpenDroneID.basicID_id_asc"]))
    lat = lat if lat is not None else _float(_get_any(obj, ["lat", "latitude"]))
    lon = lon if lon is not None else _float(_get_any(obj, ["lon", "longitude"]))
    alt_m = alt_m if alt_m is not None else _float(_get_any(obj, ["alt_m", "alt", "altitude_m"]))

    operator_lat = _float(_get_any(obj, ["operator_lat", "pilot_lat", "operator_latitude", "pilot_latitude"]))
    operator_lon = _float(_get_any(obj, ["operator_lon", "pilot_lon", "operator_longitude", "pilot_longitude"]))
    home_lat = _float(_get_any(obj, ["home_lat", "home_latitude"]))
    home_lon = _float(_get_any(obj, ["home_lon", "home_longitude"]))

    return {
        "ts": ts,
        "source": source,
        "msg_type": msg_type,
        "operator_id": operator_id,
        "basic_id": basic_id,
        "mac": mac,
        "lat": lat,
        "lon": lon,
        "alt_m": alt_m,
        "operator_lat": operator_lat,
        "operator_lon": operator_lon,
        "home_lat": home_lat,
        "home_lon": home_lon,
        "frame_no": frame_no,
        "raw": obj,
    }

def ek_dedupe_stream(events: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    out: List[Dict[str, Any]] = []
    before = len(events)
    current_frame = None
    seen: Set[Tuple[Any, Any, Any, Any, Any, Any]] = set()
    dupes = 0

    for e in events:
        fn = e.get("frame_no")
        if fn != current_frame:
            current_frame = fn
            seen.clear()

        key = (fn, e.get("msg_type"), e.get("operator_id"), e.get("basic_id"), e.get("lat"), e.get("lon"))
        if fn is not None and key in seen:
            dupes += 1
            continue
        if fn is not None:
            seen.add(key)
        out.append(e)

    after = len(out)
    return out, {"before": before, "after": after, "dupes": dupes}

def stable_contact_id(e: Dict[str, Any]) -> str:
    bid = e.get("basic_id")
    if bid:
        return f"rid:{bid}"

    mac = e.get("mac")
    if mac:
        return f"rid:mac:{str(mac).lower()}"

    op = e.get("operator_id")
    if op:
        return f"rid:op:{op}"

    lat = e.get("lat")
    lon = e.get("lon")
    if lat is not None and lon is not None:
        try:
            return f"rid:pos:{round(float(lat),4)}:{round(float(lon),4)}"
        except Exception:
            pass

    return "rid:unknown"


class ContactTracker:
    def __init__(self, ttl_s: float):
        self.ttl_ms = int(float(ttl_s) * 1000)
        self.contacts: Dict[str, Dict[str, Any]] = {}
        self.msg_ts_60s = deque()

    def _prune_60s(self, t: float) -> None:
        while self.msg_ts_60s and (t - self.msg_ts_60s[0]) > 60000.0:
            self.msg_ts_60s.popleft()

    def ingest(self, e: Dict[str, Any]) -> List[Dict[str, Any]]:
        # message counter uses wall clock
        self.msg_ts_60s.append(now_ts())
        self._prune_60s(now_ts())

        cid = stable_contact_id(e)

        if cid == "rid:unknown":
            return []
        prev = self.contacts.get(cid)

        payload = {
            "id": cid,
            "type": "REMOTE_ID",
            # TTL should be wall-clock based
            "last_ts": now_ts(),
            "source": e.get("source"),
            "msg_type": e.get("msg_type"),
            "operator_id": e.get("operator_id"),
            "basic_id": e.get("basic_id"),
            "mac": e.get("mac"),
            "lat": e.get("lat"),
            "lon": e.get("lon"),
            "alt_m": e.get("alt_m"),
            "operator_lat": e.get("operator_lat"),
            "operator_lon": e.get("operator_lon"),
            "home_lat": e.get("home_lat"),
            "home_lon": e.get("home_lon"),
        }

        if prev is None:
            self.contacts[cid] = payload
            return [{"type": "RID_CONTACT_NEW", "ts": now_ts(), "contact": payload}]
        else:
            # Preserve last known coordinates/ids when an update omits them
            for k in ["lat", "lon", "alt_m", "operator_lat", "operator_lon", "home_lat", "home_lon", "basic_id", "operator_id", "mac"]:
                if payload.get(k) is None and prev.get(k) is not None:
                    payload[k] = prev.get(k)

            changed = any(prev.get(k) != payload.get(k) for k in [
                "msg_type", "operator_id", "lat", "lon", "alt_m", "mac", "basic_id", "source",
                "operator_lat", "operator_lon", "home_lat", "home_lon"
            ])
            self.contacts[cid].update(payload)
            if changed:
                return [{"type": "RID_CONTACT_UPDATE", "ts": now_ts(), "contact": self.contacts[cid]}]
            return []

    def expire(self) -> List[Dict[str, Any]]:
        t = now_ts()
        lost: List[Dict[str, Any]] = []
        for cid, c in list(self.contacts.items()):
            if (t - float(c.get("last_ts", 0))) > self.ttl_ms:
                lost.append({"type": "RID_CONTACT_LOST", "ts": t, "id": cid})
                del self.contacts[cid]
        return lost

    def stats(self) -> Dict[str, Any]:
        t = now_ts()
        self._prune_60s(t)
        return {"targets": len(self.contacts), "msgs_60s": len(self.msg_ts_60s)}

    def snapshot_targets(self) -> List[Dict[str, Any]]:
        return sorted(self.contacts.values(), key=lambda x: x.get("last_ts", 0), reverse=True)

def load_jsonl(path: str, source: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                obj = parse_any_json_line(line)
                if not obj:
                    continue
                e = normalize_event(obj, source=source)
                if e:
                    out.append(e)
    except FileNotFoundError:
        return []
    except Exception:
        return out
    return out

def replay_worker(tracker: ContactTracker) -> None:
    while not _stop.is_set():
        REPLAY_STATE["active"] = True
        REPLAY_STATE["last_change_ts"] = time.time()
        raw_events = load_jsonl(RAW_JSONL_PATH, source="raw_replay")
        ek_events  = load_jsonl(EK_JSONL_PATH,  source="ek_replay")
        ek_events_dedup, dedupe_stats = ek_dedupe_stream(ek_events)

# DISABLED_NON_CONTRACT         ws_broadcast({"type": "RID_DEDUPE", "ts": now_ts(), "ek": dedupe_stats})

        # Filter RAW: ignore stats + ignore events without stable identity (basic_id/mac)
        raw_filtered = []  # UI integration: ignore RAW frames for contacts; EK is source of truth
        for e in raw_events:
            mt = (e.get("msg_type") or "").lower()
            if mt.startswith("stats_"):
                continue
            if e.get("basic_id") or e.get("mac"):
                raw_filtered.append(e)

        merged = raw_filtered + ek_events_dedup
        merged.sort(key=lambda e: float(e.get("ts", 0.0)))

# DISABLED_NON_CONTRACT         ws_broadcast({"type":"RID_INPUT_COUNTS","ts":now_ts(),"raw_before":len(raw_events),"raw_after":len(raw_filtered),"ek":len(ek_events_dedup)})

        if not merged:
            state = {
                "health": {"state": "DISCONNECTED", "source": "replay", "updated_ts": now_ts()},
                "counts": {"targets": 0, "msgs_60s": 0},
                "targets": [],
                "dedupe": {"ek": dedupe_stats},
            }
            atomic_write_json(REMOTEID_STATE_FILE, state)
            time.sleep(1.0)
            REPLAY_STATE["active"] = False
            REPLAY_STATE["last_change_ts"] = time.time()
            if not RID_REPLAY_LOOP:
                break
            continue

        last_state_write = 0.0
        last_stats_emit = 0.0

        for e in merged:
            if _stop.is_set():
                break

            for ev in tracker.ingest(e):
                ws_broadcast(ev)

            # expire may also be handled by expire_worker, but keep here too
            for ev in tracker.expire():
                ws_broadcast(ev)

            t = now_ts()
            if (t - last_stats_emit) >= RID_STATS_PERIOD_S:
                st = tracker.stats()
# DISABLED_NON_CONTRACT                 ws_broadcast({"type": "RID_STATS", "ts": t, "counts": st})
                last_stats_emit = t

            if (t - last_state_write) >= 0.5:
                st = tracker.stats()
                state = {
                    "health": {"state": "CONNECTED", "source": "replay", "updated_ts": t},
                    "counts": {"targets": st["targets"], "msgs_60s": st["msgs_60s"]},
                    "targets": tracker.snapshot_targets(),
                    "dedupe": {"ek": dedupe_stats},
                }
                atomic_write_json(REMOTEID_STATE_FILE, state)
                last_state_write = t

            time.sleep(RID_REPLAY_SLEEP_S)

        # After replay ends, mark DEGRADED (no new data)
        t = now_ts()
        st = tracker.stats()
        state = {
            "health": {"state": "DEGRADED", "source": "replay", "updated_ts": t},
            "counts": {"targets": st["targets"], "msgs_60s": st["msgs_60s"]},
            "targets": tracker.snapshot_targets(),
            "dedupe": {"ek": dedupe_stats},
        }
        atomic_write_json(REMOTEID_STATE_FILE, state)

        # replay finished (one-shot) -> mark inactive
        REPLAY_STATE["active"] = False
        REPLAY_STATE["last_change_ts"] = time.time()

        if not RID_REPLAY_LOOP:
            break

def remoteid_live_worker(tracker: ContactTracker) -> None:
    fp = None
    inode = None
    pos = 0

    while not _stop.is_set():
        try:
            if fp is None:
                fp = open(REMOTEID_STREAM_JSONL_PATH, "r", encoding="utf-8", errors="ignore")
                st = os.fstat(fp.fileno())
                inode = st.st_ino
                fp.seek(0, os.SEEK_END)
                pos = fp.tell()
                _set_rid_error(None)

            line = fp.readline()
            if not line:
                try:
                    st = os.stat(REMOTEID_STREAM_JSONL_PATH)
                    if inode is not None and st.st_ino != inode:
                        fp.close()
                        fp = None
                        inode = None
                        pos = 0
                        continue
                    if st.st_size < pos:
                        fp.seek(0)
                        pos = 0
                except FileNotFoundError:
                    fp.close()
                    fp = None
                    inode = None
                    pos = 0
                    _set_rid_error("file_not_found")
                time.sleep(0.1)
                continue

            pos = fp.tell()
            obj = parse_any_json_line(line)
            if not obj:
                continue

            if str(obj.get("type") or "").startswith("stats"):
                continue

            src = _str(obj.get("source")) or "live"
            e = normalize_event(obj, source=src)
            if not e:
                continue

            if not (e.get("basic_id") or e.get("operator_id") or e.get("mac") or (e.get("lat") is not None and e.get("lon") is not None)):
                continue

            t_ms = now_ms()
            with _RID_LOCK:
                REMOTEID_STATE["last_response_ts"] = t_ms
                REMOTEID_STATE["last_error"] = None

            for ev in tracker.ingest(e):
                ws_broadcast(ev)

            for ev in tracker.expire():
                ws_broadcast(ev)

        except FileNotFoundError:
            if fp is not None:
                fp.close()
            fp = None
            inode = None
            pos = 0
            _set_rid_error("file_not_found")
            time.sleep(0.2)
        except Exception:
            _set_rid_error("read_error")
            time.sleep(0.1)

def remoteid_state_writer_worker(tracker: ContactTracker) -> None:
    while not _stop.is_set():
        try:
            st = tracker.stats()
        except Exception:
            st = {"targets": 0, "msgs_60s": 0}

        snap = remoteid_status_snapshot(tracker)
        health_state = snap.get("health_state") or "DISCONNECTED"
        updated_ts = snap.get("last_update_ts") or now_ms()

        state = {
            "health": {"state": health_state, "source": REMOTEID_MODE, "updated_ts": updated_ts},
            "counts": {"targets": st.get("targets", 0), "msgs_60s": st.get("msgs_60s", 0)},
            "targets": tracker.snapshot_targets(),
        }
        atomic_write_json(REMOTEID_STATE_FILE, state)
        time.sleep(0.5)

def remoteid_service_monitor_worker() -> None:
    while not _stop.is_set():
        try:
            res = subprocess.run(
                ["systemctl", "is-active", REMOTEID_SERVICE_NAME],
                capture_output=True,
                text=True,
                timeout=1.0,
            )
            state = (res.stdout or "").strip()
            active = state in ("active", "activating")
            _set_rid_capture_active(active, state if state else "unknown")
            if REMOTEID_MODE == "replay":
                REPLAY_STATE["active"] = bool(active)
                REPLAY_STATE["last_change_ts"] = time.time()
            if active:
                with _RID_LOCK:
                    if REMOTEID_STATE.get("last_error") in ("service_inactive", "service_check_failed"):
                        REMOTEID_STATE["last_error"] = None
            else:
                _set_rid_error("service_inactive")
        except Exception:
            _set_rid_capture_active(False, "unknown")
            _set_rid_error("service_check_failed")
        time.sleep(1.0)

def expire_worker(tracker: ContactTracker, write_state: bool = True) -> None:
    # Periodically expire contacts even when replay is idle/stopped
    while not _stop.is_set():
        lost_events = tracker.expire()
        if lost_events:
            for ev in lost_events:
                ws_broadcast(ev)
            if write_state:
                st = tracker.stats()
                cur = safe_load(REMOTEID_STATE_FILE, {
                    "health": {"state":"DEGRADED","source":"replay","updated_ts":now_ts()},
                    "counts": {"targets":0,"msgs_60s":0},
                    "targets": [],
                })
                dedupe = cur.get("dedupe")
                health = cur.get("health") or {"state":"DEGRADED","source":"replay","updated_ts":now_ts()}
                health["updated_ts"] = now_ts()
                cur["health"] = health
                cur["counts"] = {"targets": st["targets"], "msgs_60s": st["msgs_60s"]}
                cur["targets"] = tracker.snapshot_targets()
                if dedupe is not None:
                    cur["dedupe"] = dedupe
                atomic_write_json(REMOTEID_STATE_FILE, cur)
        time.sleep(0.5)

def gpsd_worker() -> None:
    gps_state = {
        "mode": 0,
        "lat": None,
        "lon": None,
        "alt_m": None,
        "speed_mps": None,
        "track_deg": None,
        "sats": None,
        "last_ts": 0,
    }

    def write():
        atomic_write_json(GPS_STATE_FILE, gps_state)

    while not _stop.is_set():
        s = None
        try:
            s = socket.create_connection(("127.0.0.1", 2947), timeout=3)
            s.settimeout(3)
            s.sendall(b'?WATCH={"enable":true,"json":true}\n')
            buf = b""
            while not _stop.is_set():
                chunk = s.recv(4096)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        msg = json.loads(line.decode("utf-8", errors="ignore"))
                    except Exception:
                        continue

                    cls = msg.get("class")
                    if cls == "TPV":
                        gps_state["mode"] = int(msg.get("mode", 0) or 0)
                        gps_state["last_ts"] = now_ts()
                        gps_state["lat"] = msg.get("lat")
                        gps_state["lon"] = msg.get("lon")
                        gps_state["alt_m"] = msg.get("alt")
                        gps_state["speed_mps"] = msg.get("speed")
                        gps_state["track_deg"] = msg.get("track")
                        write()
                    elif cls == "SKY":
                        sats = msg.get("satellites", [])
                        used = 0
                        try:
                            for sat in sats:
                                if sat.get("used"):
                                    used += 1
                        except Exception:
                            used = None
                        gps_state["sats"] = used
                        gps_state["last_ts"] = now_ts()
                        write()

        except Exception:
            gps_state["last_ts"] = now_ts()
            write()
            time.sleep(1.0)
        finally:
            try:
                if s:
                    s.close()
            except Exception:
                pass
            time.sleep(0.5)


def _esp32_set_disconnected():
    with _ctrl_lock:
        CTRL_STATE["status"] = "DISCONNECTED"
        CTRL_STATE["rssi_dbm"] = None
        CTRL_STATE["uptime_seconds"] = None
        CTRL_STATE["last_ts"] = None
        FPV_STATE["scan_state"] = "idle"
        FPV_STATE["locked_channels"] = []
        FPV_STATE["selected"] = None
        FPV_STATE["freq_hz"] = None
        FPV_STATE["rssi_raw"] = None
        FPV_STATE["vrx"] = []

def esp32_worker():
    """
    Read newline-delimited JSON from the controller over USB serial and emit TELEMETRY_UPDATE.
    Device is auto-stable via /dev/ndefender-esp32 (udev).
    """
    while not _stop.is_set():
        # Wait for device node
        if not os.path.exists(CTRL_DEV):
            _esp32_set_disconnected()
            time.sleep(1.0)
            continue

        ser = None
        try:
            ser = serial.Serial(CTRL_DEV, CTRL_BAUD, timeout=1)
            with _ctrl_lock:
                CTRL_STATE["status"] = "CONNECTED"
            buf_fail = 0

            while not _stop.is_set():
                line = ser.readline()
                if not line:
                    # stale check
                    with _ctrl_lock:
                        last = CTRL_STATE.get("last_ts")
                    if last is not None and (now_ms() - int(last)) > CTRL_STALE_MS:
                        with _ctrl_lock:
                            CTRL_STATE["status"] = "DISCONNECTED"
                    continue

                try:
                    s = line.decode("utf-8", errors="ignore").strip()
                except Exception:
                    continue
                if not s or not s.startswith("{"):
                    continue

                try:
                    msg = json.loads(s)
                except Exception:
                    buf_fail += 1
                    if buf_fail > 50:
                        buf_fail = 0
                    continue

                mtype = msg.get("type")
                if mtype == "cmd_ack":
                    req_id = msg.get("req_id")
                    if req_id:
                        with _pending_lock:
                            slot = _pending_cmd.get(str(req_id))
                        if slot:
                            slot["resp"] = msg
                            slot["ev"].set()
                    continue
                if mtype not in ("telemetry", "scan_report"):
                    continue

                ts = now_ms()
                sel = msg.get("sel")
                vrx = msg.get("vrx") or []
                vrx_snapshot = []
                try:
                    for v in vrx:
                        if isinstance(v, dict):
                            vrx_snapshot.append({
                                "id": v.get("id"),
                                "r": v.get("r"),
                                "raw": v.get("raw"),
                                "f": v.get("f"),
                                "scan": v.get("scan"),
                                "lock": v.get("lock"),
                            })
                except Exception:
                    vrx_snapshot = []

                # pick selected receiver
                chosen = None
                try:
                    for v in vrx:
                        if v.get("id") == sel:
                            chosen = v
                            break
                except Exception:
                    chosen = None

                # derive scan_state
                ui = msg.get("ui") or {}
                hold = int(ui.get("hold") or 0)
                any_scan = False
                locked = []
                try:
                    for v in vrx:
                        if int(v.get("scan") or 0) == 1:
                            any_scan = True
                        if int(v.get("lock") or 0) == 1:
                            locked.append(int(v.get("id")))
                except Exception:
                    pass

                scan_state = "idle"
                if hold == 1:
                    scan_state = "hold"
                elif any_scan:
                    scan_state = "scanning"

                freq_hz = None
                rssi_raw = None
                if chosen is not None:
                    try:
                        f = chosen.get("f")
                        if f is not None:
                            freq_hz = int(f) * 1000000
                    except Exception:
                        freq_hz = None
                    try:
                        rssi_raw = int(chosen.get("r") if chosen.get("r") is not None else chosen.get("raw"))
                    except Exception:
                        rssi_raw = None

                # update shared state
                with _ctrl_lock:
                    CTRL_STATE["status"] = "CONNECTED"
                    CTRL_STATE["uptime_seconds"] = float(msg.get("esp_ms") or 0) / 1000.0
                    CTRL_STATE["last_ts"] = ts
                    # rssi_dbm unknown calibration -> keep None
                    CTRL_STATE["rssi_dbm"] = None

                    FPV_STATE["scan_state"] = scan_state
                    FPV_STATE["locked_channels"] = locked
                    FPV_STATE["selected"] = sel
                    FPV_STATE["freq_hz"] = freq_hz
                    FPV_STATE["rssi_raw"] = rssi_raw
                    FPV_STATE["vrx"] = vrx_snapshot

                # emit WS event
                ws_broadcast({
                    "type": "TELEMETRY_UPDATE",
                    "timestamp": ts,
                    "source": "esp32",
                    "data": {
                        "esp32": dict(CTRL_STATE),
                        "fpv": {
                            "scan_state": FPV_STATE.get("scan_state"),
                            "locked_channels": FPV_STATE.get("locked_channels") or [],
                            "selected": FPV_STATE.get("selected"),
                            "freq_hz": FPV_STATE.get("freq_hz"),
                            "rssi_raw": FPV_STATE.get("rssi_raw"),
                        }
                    }
                })

        except Exception:
            _esp32_set_disconnected()
            time.sleep(1.0)
        finally:
            try:
                if ser is not None:
                    ser.close()
            except Exception:
                pass




def esp32_send_cmd(cmd_obj: dict, timeout_s: float = 1.0) -> dict:
    """
    Send a JSON command to the controller over serial and wait for cmd_ack matching req_id.
    Returns dict: {"ok": bool, "resp": dict|None, "err": str|None}
    """
    req_id = str(cmd_obj.get("req_id") or "")
    if not req_id:
        return {"ok": False, "resp": None, "err": "missing_req_id"}

    slot = {"ev": threading.Event(), "resp": None}
    with _pending_lock:
        _pending_cmd[req_id] = slot

    try:
        line = (json.dumps(cmd_obj, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")

        # write
        with _ctrl_ser_lock:
            # open a dedicated serial writer each time (safe, simple)
            # (esp32_worker uses its own serial for reading)
            try:
                ser = serial.Serial(CTRL_DEV, CTRL_BAUD, timeout=1)
            except Exception as e:
                return {"ok": False, "resp": None, "err": f"open_failed:{e}"}
            try:
                ser.write(line)
                ser.flush()
            finally:
                try: ser.close()
                except Exception: pass

        # wait for ack
        if not slot["ev"].wait(timeout=timeout_s):
            return {"ok": False, "resp": None, "err": "timeout"}

        resp = slot["resp"]
        ok = bool(resp.get("ok")) if isinstance(resp, dict) else False
        err = resp.get("err") if isinstance(resp, dict) else "bad_resp"
        return {"ok": ok, "resp": resp, "err": err}

    finally:
        with _pending_lock:
            _pending_cmd.pop(req_id, None)


def _play_local_beep(duration_ms: int, freq_hz: int = 880, volume: float = 0.2) -> bool:
    """Best-effort local beep via aplay (fallback if ESP32 buzzer isn't audible)."""
    try:
        if duration_ms <= 0:
            return False
        if shutil.which("aplay") is None:
            return False
        rate = 44100
        frames = int(rate * (duration_ms / 1000.0))
        if frames <= 0:
            return False
        amp = int(32767 * max(0.0, min(volume, 1.0)))
        buf = bytearray()
        two_pi = 2.0 * math.pi
        for i in range(frames):
            sample = int(amp * math.sin(two_pi * freq_hz * i / rate))
            buf.extend(struct.pack("<h", sample))
        proc = subprocess.Popen(
            ["aplay", "-q", "-f", "S16_LE", "-r", str(rate), "-c", "1"],
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if proc.stdin:
            proc.stdin.write(buf)
            proc.stdin.close()
        return True
    except Exception:
        return False

def _run_buzzer_test(duration_ms: int, req_id: Optional[str] = None, timeout_s: float = 2.0) -> Dict[str, Any]:
    try:
        duration_ms = int(duration_ms)
    except Exception:
        duration_ms = 1000
    duration_ms = max(100, min(5000, duration_ms))

    if not req_id:
        req_id = f"buzz-{now_ms()}"

    cmd_obj = {
        "type": "cmd",
        "proto": 1,
        "req_id": req_id,
        "cmd": "TEST_BEEP",
        "ms": duration_ms,
        "duration_ms": duration_ms,
    }
    try:
        print(f"ESP32 buzzer_test send cmd=TEST_BEEP req_id={req_id} ms={duration_ms}", flush=True)
    except Exception:
        pass
    res = esp32_send_cmd(cmd_obj, timeout_s=timeout_s)
    try:
        print(f"ESP32 buzzer_test ack req_id={req_id} ok={res.get('ok')} err={res.get('err')}", flush=True)
    except Exception:
        pass

    ack = {
        "target": "esp32",
        "req_id": cmd_obj.get("req_id"),
        "cmd": cmd_obj.get("cmd"),
        "ok": bool(res.get("ok")),
        "err": res.get("err"),
    }
    if isinstance(res.get("resp"), dict):
        ack["resp"] = res["resp"]

    ws_broadcast(_ws_env("COMMAND_ACK", "esp32", ack))

    local_enabled = str(os.environ.get("NDEFENDER_LOCAL_BUZZER", "1")).lower() in ("1", "true", "yes", "on")
    local_ok = _play_local_beep(duration_ms) if local_enabled else None

    esp32_ok = bool(res.get("ok"))
    ok = esp32_ok or bool(local_ok)
    err = None if ok else (res.get("err") or "send_failed")

    return {
        "ok": ok,
        "err": err,
        "esp32_ok": esp32_ok,
        "local_ok": local_ok,
        "local_enabled": local_enabled,
        "req_id": req_id,
        "cmd": cmd_obj.get("cmd"),
        "duration_ms": duration_ms,
        "resp": res.get("resp") if isinstance(res.get("resp"), dict) else None,
    }

def _pick_strongest_vrx_id() -> Optional[int]:
    try:
        with _ctrl_lock:
            vrx = list(FPV_STATE.get("vrx") or [])
            selected = FPV_STATE.get("selected")
    except Exception:
        vrx = []
        selected = None

    best_id: Optional[int] = None
    best_r: Optional[int] = None
    for v in vrx:
        if not isinstance(v, dict):
            continue
        vid = v.get("id")
        if vid is None:
            continue
        try:
            vid_i = int(vid)
        except Exception:
            continue

        r = v.get("r")
        if r is None:
            r = v.get("raw")
        if r is None:
            if best_id is None:
                best_id = vid_i
            continue
        try:
            r_i = int(r)
        except Exception:
            continue

        if best_r is None or r_i > best_r:
            best_r = r_i
            best_id = vid_i

    if best_id is None and selected is not None:
        try:
            return int(selected)
        except Exception:
            return None
    return best_id

# ---- API v1 StatusSnapshot (contract) ----

def now_ms() -> int:
    return int(time.time() * 1000)

def _to_int(v: Any) -> Optional[int]:
    try:
        if v is None:
            return None
        return int(v)
    except Exception:
        return None

def _to_ms(v: Any) -> Optional[int]:
    # Convert seconds (float/int) -> unix ms
    try:
        if v is None:
            return None
        return int(float(v) * 1000)
    except Exception:
        return None

def get_uptime_seconds() -> Optional[float]:
    try:
        with open("/proc/uptime", "r", encoding="utf-8") as f:
            return float(f.read().split()[0])
    except Exception:
        return None

def get_cpu_temp_celsius() -> Optional[float]:
    # Raspberry Pi: thermal_zone0/temp is millideg C
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r", encoding="utf-8") as f:
            return float(f.read().strip()) / 1000.0
    except Exception:
        return None

def get_storage_gb(path: str = "/") -> Tuple[Optional[float], Optional[float]]:
    try:
        st = os.statvfs(path)
        total = (st.f_frsize * st.f_blocks) / (1024**3)
        free  = (st.f_frsize * st.f_bavail) / (1024**3)
        return free, total
    except Exception:
        return None, None

def build_status_v0() -> Dict[str, Any]:
    # Must match legacy /status payload keys (do not change)
    rid_tracker = _TRACKER
    if rid_tracker is not None:
        try:
            rid_stats = rid_tracker.stats()
            rid_targets = rid_tracker.snapshot_targets()
        except Exception:
            rid_stats = {"targets": 0, "msgs_60s": 0}
            rid_targets = []
    else:
        rid_stats = {"targets": 0, "msgs_60s": 0}
        rid_targets = []

    rid_status = remoteid_status_snapshot(rid_tracker)
    remoteid = {
        "health": {
            "state": rid_status.get("health_state") or "DISCONNECTED",
            "source": rid_status.get("source") or REMOTEID_MODE,
            "updated_ts": rid_status.get("last_update_ts"),
        },
        "counts": {"targets": rid_stats.get("targets", 0), "msgs_60s": rid_stats.get("msgs_60s", 0)},
        "targets": rid_targets,
    }
    gps = safe_load(GPS_STATE_FILE, {
        "mode":0,"lat":None,"lon":None,"alt_m":None,
        "speed_mps":None,"track_deg":None,"sats":None,"last_ts":0
    })
    return {"ok": True, "ts": now_ts(), "remoteid": remoteid, "gps": gps}

def to_status_snapshot_v1(v0: Dict[str, Any]) -> Dict[str, Any]:
    ts_ms = now_ms()
    free_gb, total_gb = get_storage_gb("/")
    remoteid = v0.get("remoteid") or {}
    gps = v0.get("gps") or {}

    rid_health = remoteid_status_snapshot(_TRACKER)
    rid_status = str(rid_health.get("status") or "down").lower()
    rid_last_ms = rid_health.get("last_update_ts")

    contacts = snapshot_unknown_rf_contacts()
    if _TRACKER is not None:
        try:
            contacts = contacts + _TRACKER.snapshot_targets()
        except Exception:
            pass

    snap = {
        "timestamp": ts_ms,
        "overall_ok": bool(v0.get("ok")),
        "system": {
            "hostname": socket.gethostname(),
            "version": os.environ.get("NDEFENDER_VERSION") or "dev",
            "uptime_seconds": get_uptime_seconds(),
            "cpu_temp_celsius": get_cpu_temp_celsius(),
            "storage_free_gb": free_gb,
            "storage_total_gb": total_gb,
        },
        "settings": {
            "ui": load_settings(UI_SETTINGS_FILE, DEFAULT_UI_SETTINGS),
            "audio": load_settings(AUDIO_SETTINGS_FILE, DEFAULT_AUDIO_SETTINGS),
            "maps": load_settings(MAPS_SETTINGS_FILE, DEFAULT_MAPS_SETTINGS),
            "alerts": load_settings(ALERTS_SETTINGS_FILE, DEFAULT_ALERTS_SETTINGS),
        },
        "esp32": (lambda: (CTRL_STATE.copy()) if "CTRL_STATE" in globals() else {"status":"DISCONNECTED","rssi_dbm":None,"uptime_seconds":None})(),
        "gps": {
            "mode": _to_int(gps.get("mode")) or 0,
            "fix_quality": min(max(_to_int(gps.get("mode")) or 0, 0), 3),
            "last_ts": _to_int(gps.get("last_ts")),

            "satellites": _to_int(gps.get("sats")),
            "hdop": _float(gps.get("hdop")),
            "latitude": _float(gps.get("lat")),
            "longitude": _float(gps.get("lon")),
            "altitude": _float(gps.get("alt_m")),
            "speed": _float(gps.get("speed_mps")),
            "heading": _float(gps.get("track_deg")),
        },
        "remote_id": {
            "status": rid_status,
            "mode": rid_health.get("mode") or REMOTEID_MODE,
            "last_update_ts": rid_last_ms,
            "last_response_ago_ms": rid_health.get("last_response_ago_ms"),
            "capture_active": bool(rid_health.get("capture_active")),
            "replay_active": bool(rid_health.get("replay_active")),
            "last_error": rid_health.get("last_error"),
            "source": rid_health.get("source"),
            "decode_rate_60s": rid_health.get("decode_rate_60s"),
            "health": {
                "state": rid_health.get("health_state") or "DISCONNECTED",
                "updated_ts": rid_last_ms,
                "last_response_ago_ms": rid_health.get("last_response_ago_ms"),
                "capture_active": bool(rid_health.get("capture_active")),
                "last_error": rid_health.get("last_error"),
            },
            "contacts": _to_int(rid_health.get("contacts")) or 0,
        },
        "rf_sensor": rf_sensor_status_snapshot(),
        "contacts": contacts,
        "fpv": (lambda: ({
            "scan_state": FPV_STATE.get("scan_state", "idle"),
            "locked_channels": FPV_STATE.get("locked_channels") or [],
            "selected": FPV_STATE.get("selected"),
            "freq_hz": FPV_STATE.get("freq_hz"),
            "rssi_raw": FPV_STATE.get("rssi_raw"),
        }) if "FPV_STATE" in globals() else {
            "scan_state": "idle",
            "locked_channels": [],
            "selected": None,
            "freq_hz": None,
            "rssi_raw": None,
        })(),
        "replay": {
            "active": bool(REPLAY_STATE.get("active")),
        },
    }
    return snap

@app.get("/api/v1/status")
def api_v1_status():
    v0 = build_status_v0()
    return jsonify(to_status_snapshot_v1(v0))

# ---- end API v1 StatusSnapshot ----

# ---- Settings + System API (v1) ----
def _json_body() -> Dict[str, Any]:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}

def _clamp_int(value: Any, lo: int, hi: int) -> Optional[int]:
    try:
        v = int(value)
    except Exception:
        return None
    return max(lo, min(hi, v))

def _parse_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("true", "1", "yes", "on"):
            return True
        if v in ("false", "0", "no", "off"):
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return None

def _not_supported(msg: str = "not supported in this build"):
    return jsonify({"ok": False, "error": msg}), 501

@app.route("/api/v1/settings/ui", methods=["PUT"])
def api_settings_ui():
    payload = _json_body()
    settings = load_settings(UI_SETTINGS_FILE, DEFAULT_UI_SETTINGS)

    if "brightness" in payload:
        v = _clamp_int(payload.get("brightness"), 0, 100)
        if v is None:
            return jsonify({"ok": False, "error": "invalid_brightness"}), 400
        settings["brightness"] = v
    if "glove_mode" in payload:
        v = _parse_bool(payload.get("glove_mode"))
        if v is None:
            return jsonify({"ok": False, "error": "invalid_glove_mode"}), 400
        settings["glove_mode"] = v
    if "performance_mode" in payload:
        v = _parse_bool(payload.get("performance_mode"))
        if v is None:
            return jsonify({"ok": False, "error": "invalid_performance_mode"}), 400
        settings["performance_mode"] = v

    save_settings(UI_SETTINGS_FILE, settings)
    return jsonify({"ok": True, "settings": settings})

@app.route("/api/v1/settings/audio", methods=["PUT"])
def api_settings_audio():
    payload = _json_body()
    settings = load_settings(AUDIO_SETTINGS_FILE, DEFAULT_AUDIO_SETTINGS)

    if "volume" in payload:
        v = _clamp_int(payload.get("volume"), 0, 100)
        if v is None:
            return jsonify({"ok": False, "error": "invalid_volume"}), 400
        settings["volume"] = v

    save_settings(AUDIO_SETTINGS_FILE, settings)
    return jsonify({"ok": True, "settings": settings})

@app.get("/api/v1/audio/volume")
def api_audio_volume_get():
    percent, err = _get_volume_percent()
    if percent is None:
        return jsonify({"ok": False, "error": err or "unavailable"}), 500
    return jsonify({"ok": True, "percent": percent})

@app.post("/api/v1/audio/volume")
def api_audio_volume_set():
    payload = _json_body()
    try:
        percent = int(payload.get("percent"))
    except Exception:
        return jsonify({"ok": False, "error": "invalid_percent"}), 400
    if percent < 0 or percent > 100:
        return jsonify({"ok": False, "error": "invalid_percent"}), 400
    ok, err, info, applied = _set_volume_percent(percent)
    if not ok:
        return jsonify({"ok": False, "error": err or "set_failed", "controls": info, "applied_percent": applied}), 500
    actual, _ = _get_volume_percent()
    return jsonify({"ok": True, "percent": actual if actual is not None else applied, "controls": info, "applied_percent": applied})

@app.post("/api/v1/audio/test_speaker")
def api_audio_test_speaker():
    payload = _json_body()
    duration_ms = payload.get("duration_ms") or payload.get("ms") or 1000
    try:
        duration_ms = int(duration_ms)
    except Exception:
        duration_ms = 1000
    duration_ms = max(200, min(2000, duration_ms))
    ok, err = _start_speaker_test(duration_ms)
    ack = {
        "target": "audio",
        "req_id": f"spk-{now_ms()}",
        "cmd": "TEST_SPEAKER",
        "ok": ok,
        "err": err,
        "duration_ms": duration_ms,
        "device": AUDIO_ALSA_DEVICE,
    }
    ws_broadcast(_ws_env("COMMAND_ACK", "backend", ack))
    if not ok:
        return jsonify({"ok": False, "error": err or "start_failed"}), 500
    return jsonify({"ok": True, "duration_ms": duration_ms, "device": AUDIO_ALSA_DEVICE})

@app.post("/api/v1/audio/play")
def api_audio_play():
    payload = _json_body()
    name = str(payload.get("name") or "").strip()
    duration_ms = payload.get("duration_ms")
    result = _play_sound(name, duration_ms=duration_ms)
    ack = {
        "target": "audio",
        "req_id": payload.get("req_id") or f"snd-{now_ms()}",
        "cmd": "PLAY_SOUND",
        "ok": bool(result.get("ok")),
        "sound_name": name,
        "file_path": result.get("file_path"),
    }
    if not result.get("ok"):
        ack["err"] = result.get("err")
        ack["exit_code"] = result.get("exit_code")
        ack["timed_out"] = result.get("timed_out")
        ws_broadcast(_ws_env("COMMAND_ACK", "backend", ack))
        return jsonify({"ok": False, "error": result.get("err") or "play_failed"}), 500
    ack["exit_code"] = result.get("exit_code")
    ack["timed_out"] = result.get("timed_out")
    ws_broadcast(_ws_env("COMMAND_ACK", "backend", ack))
    return jsonify({"ok": True, "sound_name": name, "file_path": result.get("file_path"), "exit_code": result.get("exit_code"), "timed_out": result.get("timed_out")})

@app.get("/api/v1/audio/asset/<name>")
def api_audio_asset(name: str):
    sound = str(name or "").strip()
    path, err = _resolve_audio_path(sound)
    if err or not path:
        return jsonify({"ok": False, "error": err or "not_found"}), 404
    try:
        if os.path.getsize(path) <= 0:
            return jsonify({"ok": False, "error": "file_empty"}), 404
    except Exception:
        return jsonify({"ok": False, "error": "stat_failed"}), 404
    return send_file(path, mimetype="audio/mpeg", conditional=True)

@app.get("/api/v1/audio/asset_wav/<name>")
def api_audio_asset_wav(name: str):
    sound = str(name or "").strip()
    path, err = _resolve_audio_wav_path(sound)
    if err or not path:
        return jsonify({"ok": False, "error": err or "not_found"}), 404
    try:
        if os.path.getsize(path) <= 0:
            return jsonify({"ok": False, "error": "file_empty"}), 404
    except Exception:
        return jsonify({"ok": False, "error": "stat_failed"}), 404
    return send_file(path, mimetype="audio/wav", conditional=True)

@app.route("/api/v1/settings/maps", methods=["PUT"])
def api_settings_maps():
    payload = _json_body()
    settings = load_settings(MAPS_SETTINGS_FILE, DEFAULT_MAPS_SETTINGS)
    mode = payload.get("mode")
    if mode is not None:
        mode = str(mode).lower()
        if mode not in ("online", "offline", "auto"):
            return jsonify({"ok": False, "error": "invalid_mode"}), 400
        settings["mode"] = mode
    if "offline_pack_id" in payload:
        val = payload.get("offline_pack_id")
        settings["offline_pack_id"] = (str(val).strip() or None) if val is not None else None
    save_settings(MAPS_SETTINGS_FILE, settings)
    return jsonify({"ok": True, "settings": settings})

@app.route("/api/v1/settings/alerts", methods=["PUT"])
def api_settings_alerts():
    payload = _json_body()
    settings = load_settings(ALERTS_SETTINGS_FILE, DEFAULT_ALERTS_SETTINGS)
    preset = payload.get("preset")
    if preset is not None:
        preset = str(preset)
        if preset not in ("Balanced", "Critical Focus", "Training"):
            return jsonify({"ok": False, "error": "invalid_preset"}), 400
        settings["preset"] = preset
    save_settings(ALERTS_SETTINGS_FILE, settings)
    return jsonify({"ok": True, "settings": settings})

@app.route("/api/v1/system/reboot_ui", methods=["POST"])
def api_reboot_ui():
    payload = _json_body()
    confirm = bool(payload.get("confirm"))
    dry_run = bool(payload.get("dry_run"))
    if not confirm:
        return jsonify({"ok": False, "error": "confirm_required"}), 400
    if dry_run:
        return jsonify({"ok": True, "dry_run": True})
    return _not_supported("reboot disabled in this build")

@app.route("/api/v1/system/reboot_device", methods=["POST"])
def api_reboot_device():
    payload = _json_body()
    confirm = bool(payload.get("confirm"))
    dry_run = bool(payload.get("dry_run"))
    if not confirm:
        return jsonify({"ok": False, "error": "confirm_required"}), 400
    if dry_run:
        return jsonify({"ok": True, "dry_run": True})
    return _not_supported("reboot disabled in this build")

@app.route("/api/v1/system/buzzer_test", methods=["POST"])
def api_buzzer_test():
    return api_esp32_buzzer_test()

@app.route("/api/v1/esp32/buzzer_test", methods=["POST"])
def api_esp32_buzzer_test():
    payload = _json_body()
    duration_ms = payload.get("duration_ms") or payload.get("ms") or 1000
    result = _run_buzzer_test(duration_ms, timeout_s=2.0)
    if not result.get("ok"):
        return jsonify({"ok": False, "error": result.get("err") or "send_failed"}), 500
    return jsonify({
        "ok": True,
        "esp32_ok": result.get("esp32_ok"),
        "local_ok": result.get("local_ok"),
        "local_enabled": result.get("local_enabled"),
        "duration_ms": result.get("duration_ms"),
        "req_id": result.get("req_id"),
    })

@app.route("/api/v1/maps/packs/download", methods=["POST"])
def api_maps_pack_download():
    payload = _json_body()
    name = str(payload.get("name") or "Offline Pack").strip()
    bbox = _normalize_bbox(payload.get("bbox"))
    if not bbox:
        return jsonify({"ok": False, "error": "invalid_bbox"}), 400
    try:
        zmin = int(payload.get("zmin", 12))
        zmax = int(payload.get("zmax", 13))
    except Exception:
        return jsonify({"ok": False, "error": "invalid_zoom"}), 400
    if zmin < 0 or zmax > 22:
        return jsonify({"ok": False, "error": "invalid_zoom_range"}), 400
    if not MAPS_TILE_URL_TEMPLATE:
        return jsonify({"ok": False, "error": "tile_url_template_missing"}), 400

    pack_id = str(payload.get("pack_id") or _sanitize_pack_id(name))
    _ensure_maps_dir()
    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        packs = data.get("packs", {})
        existing = packs.get(pack_id)
        if existing and existing.get("status") == "downloading":
            return jsonify({"ok": False, "error": "download_in_progress"}), 409
        pack = {
            "id": pack_id,
            "name": name,
            "bbox": bbox,
            "zmin": min(zmin, zmax),
            "zmax": max(zmin, zmax),
            "status": "queued",
            "downloaded_tiles": 0,
            "failed_tiles": 0,
            "total_tiles": 0,
            "size_bytes": 0,
            "created_ts": existing.get("created_ts") if existing else now_ts(),
            "updated_ts": now_ts(),
            "last_error": None,
        }
        packs[pack_id] = pack
        data["packs"] = packs
        _save_map_packs(data)

    t = threading.Thread(target=_download_pack, args=(pack_id,), daemon=True)
    with _MAP_PACKS_LOCK:
        _MAP_DOWNLOADS[pack_id] = t
    t.start()
    return jsonify({"ok": True, "pack_id": pack_id})

@app.get("/api/v1/maps/packs")
def api_maps_packs():
    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        packs = list((data.get("packs") or {}).values())
    for p in packs:
        total = int(p.get("total_tiles") or 0)
        done = int(p.get("downloaded_tiles") or 0)
        failed = int(p.get("failed_tiles") or 0)
        p["progress"] = (done + failed) / total if total > 0 else 0.0
    packs.sort(key=lambda x: x.get("updated_ts") or 0, reverse=True)
    active_pack_id = load_settings(MAPS_SETTINGS_FILE, DEFAULT_MAPS_SETTINGS).get("offline_pack_id")
    return jsonify({"ok": True, "packs": packs, "active_pack_id": active_pack_id})

@app.get("/api/v1/maps/packs/<pack_id>/status")
def api_maps_pack_status(pack_id: str):
    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        pack = (data.get("packs") or {}).get(pack_id)
    if not pack:
        return jsonify({"ok": False, "error": "not_found"}), 404
    total = int(pack.get("total_tiles") or 0)
    done = int(pack.get("downloaded_tiles") or 0)
    failed = int(pack.get("failed_tiles") or 0)
    pack["progress"] = (done + failed) / total if total > 0 else 0.0
    return jsonify({"ok": True, "pack": pack})

@app.get("/api/v1/maps/pmtiles/packs")
def api_pmtiles_packs():
    installed, total_bytes, updated_ts = _pmtiles_pack_info()
    packs = [{
        "id": PMTILES_PACK_ID,
        "name": PMTILES_PACK_NAME,
        "bytes": total_bytes,
        "updated_ts": updated_ts,
        "installed": installed,
    }]
    total_gb = round(total_bytes / (1024 ** 3), 3) if total_bytes else 0
    return jsonify({
        "ok": True,
        "packs": packs,
        "active_id": PMTILES_PACK_ID if installed else None,
        "total_bytes": total_bytes,
        "total_gb": total_gb,
    })

@app.get("/api/v1/maps/pmtiles/catalog")
def api_pmtiles_catalog():
    installed, installed_bytes, _updated_ts = _pmtiles_pack_info()
    bytes_hint = installed_bytes or 0
    entry = {
        "id": PMTILES_PACK_ID,
        "name": PMTILES_PACK_NAME,
        "bytes_hint": bytes_hint,
        "url_present": False,
        "installed": installed,
        "installed_bytes": installed_bytes,
        "active": installed,
    }
    return jsonify({"ok": True, "catalog": [entry]})

@app.post("/api/v1/maps/pmtiles/download/start")
def api_pmtiles_download_start():
    return jsonify({"ok": False, "error": "pmtiles_download_disabled"}), 400

@app.post("/api/v1/maps/pmtiles/select")
def api_pmtiles_select():
    return jsonify({"ok": False, "error": "not_supported"}), 400

@app.post("/api/v1/maps/pmtiles/delete")
def api_pmtiles_delete():
    return jsonify({"ok": False, "error": "not_supported"}), 400

@app.get("/api/v1/maps/pmtiles/jobs")
def api_pmtiles_jobs():
    installed, size, updated_ts = _pmtiles_pack_info()
    state = "done" if installed else "missing"
    bytes_downloaded = size if installed else 0
    bytes_total = size if installed else None
    return jsonify({
        "ok": True,
        "state": state,
        "bytes_downloaded": bytes_downloaded,
        "bytes_total": bytes_total,
        "updated_ts": updated_ts,
        "error": None if installed else "pmtiles_not_installed",
        "active_id": PMTILES_PACK_ID if installed else None,
        "installed": [{
            "id": PMTILES_PACK_ID,
            "name": PMTILES_PACK_NAME,
            "bytes": bytes_downloaded if state == "done" else 0,
            "installed": installed,
        }],
        "jobs": [],
    })

@app.get("/api/v1/maps/pmtiles/jobs/<job_id>")
def api_pmtiles_job(job_id: str):
    return jsonify({"ok": False, "error": "pmtiles_download_disabled"}), 400

@app.post("/api/v1/maps/pmtiles/jobs/start")
def api_pmtiles_jobs_start():
    return jsonify({"ok": False, "error": "pmtiles_download_disabled"}), 400

@app.post("/api/v1/maps/pmtiles/jobs/<job_id>/cancel")
def api_pmtiles_job_cancel(job_id: str):
    return jsonify({"ok": False, "error": "pmtiles_download_disabled"}), 400

@app.post("/api/v1/maps/pmtiles/jobs/<job_id>/redownload")
def api_pmtiles_job_redownload(job_id: str):
    return jsonify({"ok": False, "error": "pmtiles_download_disabled"}), 400

@app.get("/pmtiles/<pack_id>.pmtiles")
def api_pmtiles_serve(pack_id: str):
    if pack_id != PMTILES_PACK_ID:
        return jsonify({"ok": False, "error": "not_found"}), 404
    if not os.path.exists(PMTILES_PACK_PATH):
        return jsonify({"ok": False, "error": "not_found"}), 404
    return send_from_directory(PMTILES_PACKS_DIR, f"{PMTILES_PACK_ID}.pmtiles")

@app.route("/api/v1/maps/packs/<pack_id>/delete", methods=["POST"])
def api_maps_pack_delete(pack_id: str):
    with _MAP_PACKS_LOCK:
        data = _load_map_packs()
        packs = data.get("packs") or {}
        if pack_id not in packs:
            return jsonify({"ok": False, "error": "not_found"}), 404
        packs.pop(pack_id, None)
        data["packs"] = packs
        _save_map_packs(data)
    shutil.rmtree(_map_pack_dir(pack_id), ignore_errors=True)
    return jsonify({"ok": True})

@app.route("/api/v1/maps/packs/<pack_id>/redownload", methods=["POST"])
def api_maps_pack_redownload(pack_id: str):
    with _MAP_PACKS_LOCK:
        if pack_id in _MAP_DOWNLOADS:
            return jsonify({"ok": False, "error": "download_in_progress"}), 409
        data = _load_map_packs()
        pack = (data.get("packs") or {}).get(pack_id)
        if not pack:
            return jsonify({"ok": False, "error": "not_found"}), 404
        _update_pack(data, pack_id, {
            "status": "queued",
            "downloaded_tiles": 0,
            "failed_tiles": 0,
            "size_bytes": 0,
            "last_error": None,
            "updated_ts": now_ts(),
        })
        _save_map_packs(data)
    shutil.rmtree(_map_pack_dir(pack_id), ignore_errors=True)
    t = threading.Thread(target=_download_pack, args=(pack_id,), daemon=True)
    with _MAP_PACKS_LOCK:
        _MAP_DOWNLOADS[pack_id] = t
    t.start()
    return jsonify({"ok": True})

@app.get("/tiles/<pack_id>/<int:z>/<int:x>/<int:y>.png")
def api_map_tile(pack_id: str, z: int, x: int, y: int):
    tile_file = _tile_path(pack_id, z, x, y)
    if not os.path.exists(tile_file):
        return ("", 404)
    return send_from_directory(os.path.dirname(tile_file), os.path.basename(tile_file))

@app.route("/api/v1/video/capture", methods=["POST"])
def api_video_capture():
    return _not_supported()

@app.route("/api/v1/settings/rfscan/action", methods=["POST"])
def api_rfscan_action():
    return _not_supported()

# ---- end Settings + System API ----

@app.get("/status")
def status():
    remoteid = safe_load(REMOTEID_STATE_FILE, {
        "health": {"state":"DISCONNECTED","source":"replay","updated_ts":None},
        "counts": {"targets":0,"msgs_60s":0},
        "targets": [],
    })
    gps = safe_load(GPS_STATE_FILE, {
        "mode":0,"lat":None,"lon":None,"alt_m":None,
        "speed_mps":None,"track_deg":None,"sats":None,"last_ts":0
    })
    return jsonify({"ok": True, "ts": now_ts(), "remoteid": remoteid, "gps": gps, "api": {"v1_status": "/api/v1/status", "v1_ws": "/api/v1/ws"}})

def ws_session(ws):
    # On connect: send snapshot as CONTACT_NEW events (contract) and then join broadcast set.
    try:
        if _TRACKER is not None:
            for c in _TRACKER.snapshot_targets():
                # legacy tracker emits RID_CONTACT_*; normalize here
                ws.send(json.dumps(_ws_env("CONTACT_NEW", "backend", {"contact": c}), separators=(",",":")))
        for c in snapshot_unknown_rf_contacts():
            ws.send(json.dumps(_ws_env("CONTACT_NEW", "rf_sensor", c), separators=(",",":")))
    except Exception:
        # If snapshot fails, still allow the socket to join broadcasts
        pass

    with _ws_clients_lock:
        _ws_clients.add(ws)

    try:
        while True:
            msg = ws.receive()
            try:
                print('[WS_IN_V1]', msg, flush=True)
            except Exception:
                pass
            if msg is None:
                break
            # Optional: respond to keepalive/ping with contract COMMAND_ACK
            ws.send(json.dumps(_ws_env("COMMAND_ACK", "backend", {"ok": True}), separators=(",",":")))
    finally:
        with _ws_clients_lock:
            _ws_clients.discard(ws)




def _ws_env(msg_type: str, source: str, data: dict):
    # Canonical WS envelope: {type, timestamp(ms), source, data}
    return {
        "type": msg_type,
        "timestamp": int(time.time() * 1000),
        "source": source,
        "data": data,
    }

def ws_session_v1(ws):
    # WS v1: snapshot + COMMAND->controller bridge
    # Incoming UI command envelope:
    # {type:"COMMAND", data:{target:"esp32", req_id, cmd, args? and/or flat fields}}

    # snapshot (UI late-join safe)
    try:
        if _TRACKER is not None:
            for c in _TRACKER.snapshot_targets():
                ws.send(json.dumps(_ws_env("CONTACT_NEW", "remote_id", {"contact": c}), separators=(",",":")))
        for c in snapshot_unknown_rf_contacts():
            ws.send(json.dumps(_ws_env("CONTACT_NEW", "rf_sensor", c), separators=(",",":")))
    except Exception:
        pass

    with _ws_clients_lock:
        _ws_clients.add(ws)

    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break

            obj = None
            try:
                if isinstance(msg, str) and msg.strip().startswith("{"):
                    obj = json.loads(msg)
            except Exception:
                obj = None

            # COMMAND bridge
            if isinstance(obj, dict) and str(obj.get("type") or "").upper() == "COMMAND":
                data = obj.get("data") or {}
                if isinstance(data, dict):
                    req_id = data.get("req_id") or data.get("id") or f"t{now_ms()}"
                    cmd = data.get("cmd") or data.get("command")
                    orig_cmd = cmd
                    cmd_norm = str(cmd or "").upper()
                    target = str(data.get("target") or "").lower()

                    if cmd_norm in ("SET_VOLUME", "TEST_SPEAKER", "TEST_BUZZER", "PLAY_SOUND") and target != "esp32":
                        ack: Dict[str, Any] = {
                            "target": "audio" if cmd_norm in ("SET_VOLUME", "TEST_SPEAKER", "PLAY_SOUND") else "buzzer",
                            "req_id": req_id,
                            "cmd": cmd_norm,
                            "ok": False,
                        }
                        if cmd_norm == "SET_VOLUME":
                            value = _get_any(data, ["value", "percent", "volume", "level"])
                            v = _clamp_int(value, 0, 100)
                            if v is None:
                                ack["err"] = "invalid_value"
                            else:
                                ok, err, info, applied = _set_volume_percent(v)
                                actual, _ = _get_volume_percent()
                                ack.update({
                                    "ok": ok,
                                    "err": err,
                                    "value": v,
                                    "percent": actual if actual is not None else applied,
                                    "applied_percent": applied,
                                    "backend": info.get("backend") if isinstance(info, dict) else _detect_audio_backend(),
                                    "alsa_card": info.get("alsa_card") if isinstance(info, dict) else AUDIO_ALSA_CARD,
                                    "alsa_control": "Playback",
                                    "alsa_controls": info if isinstance(info, dict) else {"playback_control": "Playback", "speaker_control": "Speaker"},
                                })
                        elif cmd_norm == "TEST_SPEAKER":
                            duration_ms = data.get("duration_ms") or data.get("ms") or 1000
                            try:
                                duration_ms = int(duration_ms)
                            except Exception:
                                duration_ms = 1000
                            duration_ms = max(200, min(2000, duration_ms))
                            ok, err = _start_speaker_test(duration_ms)
                            ack.update({
                                "ok": ok,
                                "err": err,
                                "duration_ms": duration_ms,
                                "device": AUDIO_ALSA_DEVICE,
                            })
                        elif cmd_norm == "TEST_BUZZER":
                            duration_ms = data.get("duration_ms") or data.get("ms") or 1000
                            timeout_s = float(data.get("timeout_s") or 2.0)
                            result = _run_buzzer_test(duration_ms, req_id=req_id, timeout_s=timeout_s)
                            ack.update({
                                "ok": result.get("ok"),
                                "err": result.get("err"),
                                "duration_ms": result.get("duration_ms"),
                                "esp32_ok": result.get("esp32_ok"),
                                "local_ok": result.get("local_ok"),
                                "local_enabled": result.get("local_enabled"),
                            })
                            if isinstance(result.get("resp"), dict):
                                ack["resp"] = result["resp"]
                        elif cmd_norm == "PLAY_SOUND":
                            name = str(data.get("name") or data.get("sound") or "").strip()
                            duration_ms = data.get("duration_ms")
                            result = _play_sound(name, duration_ms=duration_ms)
                            ack.update({
                                "ok": result.get("ok"),
                                "err": result.get("err"),
                                "sound_name": name,
                                "file_path": result.get("file_path"),
                                "exit_code": result.get("exit_code"),
                                "timed_out": result.get("timed_out"),
                            })
                            app.logger.info(
                                "PLAY_SOUND req_id=%s sound_name=%s exit_code=%s timed_out=%s ok=%s",
                                req_id,
                                name,
                                result.get("exit_code"),
                                result.get("timed_out"),
                                result.get("ok"),
                            )
                            print(
                                f"PLAY_SOUND req_id={req_id} sound_name={name} "
                                f"exit_code={result.get('exit_code')} timed_out={result.get('timed_out')} ok={result.get('ok')}",
                                flush=True,
                            )

                        ws.send(json.dumps(_ws_env("COMMAND_ACK", "backend", ack), separators=(",",":")))
                        continue

                    if target == "esp32":
                        args = data.get("args") if isinstance(data.get("args"), dict) else {}

                        cmd_obj = {"type":"cmd","proto":1,"req_id":req_id,"cmd":cmd}

                        # flatten args into top-level (controller expects flat fields)
                        for k, v in (args or {}).items():
                            cmd_obj[k] = v

                        # also accept flat fields inside data
                        for k, v in data.items():
                            if k in ("target","req_id","id","cmd","command","args","timeout_s"):
                                continue
                            cmd_obj[k] = v

                        # Command aliases for controller firmware compatibility
                        if cmd_norm == "FPV_SCAN_STOP":
                            cmd_obj["cmd"] = "FPV_HOLD_SET"
                            cmd_obj["hold"] = 1
                        elif cmd_norm == "FPV_LOCK_STRONGEST":
                            sel = _pick_strongest_vrx_id()
                            if sel is None:
                                ack = {
                                    "target": "esp32",
                                    "req_id": req_id,
                                    "cmd": orig_cmd,
                                    "ok": False,
                                    "err": "no_vrx",
                                }
                                ws.send(json.dumps(_ws_env("COMMAND_ACK", "backend", ack), separators=(",",":")))
                                continue
                            cmd_obj["cmd"] = "VIDEO_SELECT"
                            cmd_obj["sel"] = int(sel)

                        res = esp32_send_cmd(cmd_obj, timeout_s=float(data.get("timeout_s") or 1.5))
                        ack = {
                            "target": "esp32",
                            "req_id": req_id,
                            "cmd": orig_cmd,
                            "ok": bool(res.get("ok")),
                            "err": res.get("err"),
                        }
                        if isinstance(res.get("resp"), dict):
                            ack["resp"] = res["resp"]

                        ws.send(json.dumps(_ws_env("COMMAND_ACK", "backend", ack), separators=(",",":")))
                        continue

            # default: keep tool ACK behavior
            ws.send(json.dumps(_ws_env("COMMAND_ACK", "backend", {"ok": True}), separators=(",",":")))

    finally:
        with _ws_clients_lock:
            _ws_clients.discard(ws)

@sock.route("/ws")
def ws_handler(ws):
    return ws_session(ws)

@sock.route("/api/v1/ws")
def ws_handler_v1(ws):
    return ws_session_v1(ws)
def main():
    os.makedirs(STATE_DIR, exist_ok=True)
    atomic_write_json(REMOTEID_STATE_FILE, {
        "health": {"state":"DISCONNECTED","source":REMOTEID_MODE,"updated_ts":now_ts()},
        "counts": {"targets":0,"msgs_60s":0},
        "targets": [],
    })
    atomic_write_json(GPS_STATE_FILE, {
        "mode":0,"lat":None,"lon":None,"alt_m":None,
        "speed_mps":None,"track_deg":None,"sats":None,"last_ts":0
    })

    tracker = ContactTracker(ttl_s=RID_TTL_S)
    global _TRACKER
    _TRACKER = tracker
    _preload_audio_assets()

    if REMOTEID_MODE in ("live", "replay"):
        threading.Thread(target=remoteid_live_worker, args=(tracker,), daemon=True).start()
        threading.Thread(target=remoteid_state_writer_worker, args=(tracker,), daemon=True).start()
        threading.Thread(target=remoteid_service_monitor_worker, daemon=True).start()
        threading.Thread(target=expire_worker, args=(tracker, False), daemon=True).start()
        if REMOTEID_MODE == "replay":
            REPLAY_STATE["active"] = False
            REPLAY_STATE["last_change_ts"] = time.time()
        else:
            REPLAY_STATE["active"] = False
            REPLAY_STATE["last_change_ts"] = time.time()
    else:
        threading.Thread(target=replay_worker, args=(tracker,), daemon=True).start()
        threading.Thread(target=expire_worker, args=(tracker, True), daemon=True).start()
    threading.Thread(target=antsdr_worker, daemon=True).start()
    threading.Thread(target=unknown_rf_expire_worker, daemon=True).start()
    threading.Thread(target=rfscan_monitor_worker, daemon=True).start()
    threading.Thread(target=gpsd_worker, daemon=True).start()
    threading.Thread(target=esp32_worker, daemon=True).start()
    app.run(host="0.0.0.0", port=APP_PORT, debug=False)

if __name__ == "__main__":
    main()
