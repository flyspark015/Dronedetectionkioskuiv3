#!/usr/bin/env python3
import json
import os
import signal
import subprocess
import threading
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from scapy.all import sniff, Dot11, Dot11Elt

try:
    import dtpyodid
except Exception:
    dtpyodid = None

ODID_OUI = bytes.fromhex("FA0BBC")
ODID_VTYPE = 0x0D
MSG_LEN = 25

DEFAULT_CHANNELS = "1,6,11,36,44,149"


def utc_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_ts() -> float:
    return time.time()


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def _parse_iw_ifaces() -> Dict[str, str]:
    # Returns iface -> type
    out: Dict[str, str] = {}
    res = _run(["iw", "dev"])
    if res.returncode != 0:
        return out
    cur_iface = None
    for line in (res.stdout or "").splitlines():
        line = line.strip()
        if line.startswith("Interface "):
            cur_iface = line.split("Interface", 1)[1].strip()
            out[cur_iface] = "unknown"
            continue
        if cur_iface and line.startswith("type "):
            out[cur_iface] = line.split("type", 1)[1].strip()
    return out


def _ensure_iface_up(iface: str) -> None:
    _run(["ip", "link", "set", iface, "up"])


def _ensure_monitor(parent: str, mon: str, emit) -> bool:
    ifaces = _parse_iw_ifaces()
    if mon in ifaces:
        _ensure_iface_up(mon)
        return True

    if parent not in ifaces:
        emit({"type": "error", "msg": "parent_iface_missing", "iface": parent})
        return False

    res = _run(["iw", "dev", parent, "interface", "add", mon, "type", "monitor"])
    if res.returncode != 0:
        emit({"type": "error", "msg": "mon_create_failed", "iface": mon, "stderr": res.stderr.strip()})
        return False

    _ensure_iface_up(mon)
    return True


class RIDLiveCapture:
    def __init__(self, parent_iface: str, mon_iface: str, channels: list[int], dwell_s: float,
                 raw_path: str, decoded_path: str, log_stdout: bool = False):
        self.parent_iface = parent_iface
        self.mon_iface = mon_iface
        self.channels = channels
        self.dwell_s = max(0.1, float(dwell_s))
        self.raw_path = raw_path
        self.decoded_path = decoded_path
        self.log_stdout = log_stdout

        self.stop = threading.Event()
        self.frames_total = 0
        self.vendor_ie_hits = 0
        self.odid_messages = 0
        self.oui_counter = Counter()

        self.current_channel = None
        self.channel_lock = threading.Lock()

        self.basic_id_by_mac: Dict[str, str] = {}

        os.makedirs(os.path.dirname(self.raw_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.decoded_path), exist_ok=True)

        self.raw = open(self.raw_path, "a", buffering=1, encoding="utf-8")
        self.decoded = open(self.decoded_path, "a", buffering=1, encoding="utf-8")

    def emit_raw(self, obj: Dict[str, Any]) -> None:
        obj.setdefault("ts", utc_ts())
        line = json.dumps(obj, separators=(",", ":"))
        self.raw.write(line + "\n")
        if self.log_stdout:
            print(line, flush=True)

    def emit_decoded(self, obj: Dict[str, Any]) -> None:
        obj.setdefault("ts", now_ts())
        line = json.dumps(obj, separators=(",", ":"))
        self.decoded.write(line + "\n")
        if self.log_stdout:
            print(line, flush=True)

    def set_channel(self, ch: int) -> None:
        res = _run(["iw", "dev", self.parent_iface, "set", "channel", str(ch)])
        if res.returncode != 0:
            self.emit_raw({
                "type": "warn",
                "src": "chanhop",
                "channel": ch,
                "stderr": res.stderr.strip(),
            })
            return
        with self.channel_lock:
            self.current_channel = ch

    def chanhop_thread(self) -> None:
        if not self.channels:
            return
        self.emit_raw({"type": "status", "msg": "channel_hop_start", "iface": self.parent_iface, "channels": self.channels})
        while not self.stop.is_set():
            for ch in self.channels:
                if self.stop.is_set():
                    break
                self.set_channel(ch)
                time.sleep(self.dwell_s)

    def _iter_ies(self, pkt):
        elt = pkt.getlayer(Dot11Elt)
        while elt is not None:
            yield elt
            elt = elt.payload.getlayer(Dot11Elt)

    def _decode_block(self, block: bytes, mac: Optional[str]) -> Optional[Dict[str, Any]]:
        if dtpyodid is None:
            return None
        try:
            msg = dtpyodid.parse(block)
        except Exception:
            return None

        msg_name = msg.__class__.__name__
        msg_type = {
            "BasicID": "basic_id",
            "Location": "location",
            "OperatorID": "operator_id",
            "SelfID": "self_id",
            "System": "system",
            "Auth": "auth",
        }.get(msg_name, msg_name.lower())

        ev: Dict[str, Any] = {
            "source": "rid_live",
            "msg_type": msg_type,
        }

        if mac:
            ev["mac"] = mac

        if msg_name == "BasicID":
            uas_id = getattr(msg, "uas_id", None)
            if isinstance(uas_id, str):
                uas_id = uas_id.strip("\x00").strip()
            if uas_id:
                ev["basic_id"] = uas_id
        elif msg_name == "OperatorID":
            op_id = getattr(msg, "operator_id", None)
            if isinstance(op_id, str):
                op_id = op_id.strip("\x00").strip()
            if op_id:
                ev["operator_id"] = op_id
        elif msg_name == "Location":
            lat = getattr(msg, "latitude", None)
            lon = getattr(msg, "longitude", None)
            alt = getattr(msg, "altitude_geodetic", None)
            if lat is not None and lon is not None:
                ev["lat"] = float(lat)
                ev["lon"] = float(lon)
            if alt is not None:
                ev["alt_m"] = float(alt)
        elif msg_name == "System":
            # System message includes operator location; keep separate keys (not used in UI mapping yet).
            lat = getattr(msg, "latitude", None)
            lon = getattr(msg, "longitude", None)
            if lat is not None and lon is not None:
                ev["operator_lat"] = float(lat)
                ev["operator_lon"] = float(lon)

        return ev

    def handle_pkt(self, pkt) -> None:
        if not pkt.haslayer(Dot11):
            return

        d = pkt.getlayer(Dot11)
        if d.type != 0:
            return

        self.frames_total += 1
        tx_mac = d.addr2 or d.addr3 or d.addr1

        for ie in self._iter_ies(pkt):
            if getattr(ie, "ID", None) != 221:
                continue
            self.vendor_ie_hits += 1
            info = bytes(getattr(ie, "info", b"") or b"")
            if len(info) < 4:
                continue
            if info[0:3] != ODID_OUI or info[3] != ODID_VTYPE:
                continue

            payload = info[4:]
            if len(payload) < 4:
                continue

            msg_counter = payload[0]
            pack_hdr = payload[1:4].hex()
            blocks = payload[4:]

            seen_blocks = set()
            for i in range(0, len(blocks), MSG_LEN):
                block = blocks[i:i + MSG_LEN]
                if len(block) != MSG_LEN:
                    break
                if block in seen_blocks:
                    continue
                seen_blocks.add(block)

                ev = self._decode_block(block, tx_mac)
                if not ev:
                    continue

                if tx_mac and ev.get("basic_id"):
                    self.basic_id_by_mac[tx_mac] = ev["basic_id"]
                if (not ev.get("basic_id")) and tx_mac in self.basic_id_by_mac:
                    ev["basic_id"] = self.basic_id_by_mac[tx_mac]

                with self.channel_lock:
                    if self.current_channel is not None:
                        ev["channel"] = self.current_channel

                ev["msg_counter"] = msg_counter
                ev["pack_hdr"] = pack_hdr

                self.odid_messages += 1
                self.emit_decoded(ev)

    def sniff_thread(self) -> None:
        self.emit_raw({"type": "status", "msg": "sniffer_start", "iface": self.mon_iface})
        while not self.stop.is_set():
            sniff(iface=self.mon_iface, store=False, prn=self.handle_pkt, timeout=1)

    def stats_thread(self) -> None:
        last = time.time()
        while not self.stop.is_set():
            time.sleep(2)
            now = time.time()
            if now - last >= 2:
                self.emit_raw({
                    "type": "stats",
                    "frames_total": self.frames_total,
                    "vendor_ie_hits": self.vendor_ie_hits,
                    "odid_messages": self.odid_messages,
                })
                last = now

    def run(self) -> None:
        if dtpyodid is None:
            self.emit_raw({"type": "error", "msg": "decoder_missing"})
            return

        _ensure_iface_up(self.parent_iface)
        if not _ensure_monitor(self.parent_iface, self.mon_iface, self.emit_raw):
            return

        threads = [
            threading.Thread(target=self.sniff_thread, daemon=True),
            threading.Thread(target=self.stats_thread, daemon=True),
        ]
        if self.channels:
            threads.append(threading.Thread(target=self.chanhop_thread, daemon=True))

        for t in threads:
            t.start()

        try:
            while not self.stop.is_set():
                time.sleep(0.5)
        finally:
            self.stop.set()
            try:
                self.raw.close()
            except Exception:
                pass
            try:
                self.decoded.close()
            except Exception:
                pass


def main() -> None:
    parent = os.environ.get("NDEFENDER_RID_PARENT_IFACE", "wlan1")
    mon = os.environ.get("NDEFENDER_RID_MON_IFACE", "mon0")
    channels_raw = os.environ.get("NDEFENDER_RID_CHANNELS", DEFAULT_CHANNELS)
    dwell_s = float(os.environ.get("NDEFENDER_RID_DWELL_S", "0.7"))
    raw_path = os.environ.get("NDEFENDER_RID_RAW_JSONL", "/opt/ndefender/logs/remoteid_live.jsonl")
    decoded_path = os.environ.get("NDEFENDER_RID_DEC_JSONL", "/opt/ndefender/logs/remoteid_decoded.jsonl")
    log_stdout = os.environ.get("NDEFENDER_RID_STDOUT", "0") == "1"

    channels = []
    for part in (channels_raw or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            channels.append(int(part))
        except Exception:
            continue

    cap = RIDLiveCapture(parent, mon, channels, dwell_s, raw_path, decoded_path, log_stdout)

    def _handle_sig(*_):
        cap.stop.set()

    signal.signal(signal.SIGTERM, _handle_sig)
    signal.signal(signal.SIGINT, _handle_sig)

    cap.run()


if __name__ == "__main__":
    main()
