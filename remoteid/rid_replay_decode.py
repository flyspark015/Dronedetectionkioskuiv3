#!/usr/bin/env python3
import json
import os
import signal
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from scapy.all import PcapReader, Dot11, Dot11Elt

try:
    import dtpyodid
except Exception:
    dtpyodid = None

ODID_OUI = bytes.fromhex("FA0BBC")
ODID_VTYPE = 0x0D
MSG_LEN = 25


def utc_ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_ts() -> float:
    return time.time()


def iter_elts(pkt):
    e = pkt.getlayer(Dot11Elt)
    while e is not None:
        yield e
        e = e.payload.getlayer(Dot11Elt)


def decode_block(block: bytes, mac: Optional[str]) -> Optional[Dict[str, Any]]:
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
        "source": "replay",
        "msg_type": msg_type,
        "ts": now_ts(),
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
        lat = getattr(msg, "latitude", None)
        lon = getattr(msg, "longitude", None)
        if lat is not None and lon is not None:
            ev["operator_lat"] = float(lat)
            ev["operator_lon"] = float(lon)

    return ev


def main() -> None:
    pcap_path = os.environ.get("NDEFENDER_REMOTEID_REPLAY_FILE") or "/opt/ndefender/remoteid/testdata/odid_wifi_sample.pcap"
    loop = os.environ.get("NDEFENDER_REMOTEID_REPLAY_LOOP", "0") == "1"
    interval = float(os.environ.get("NDEFENDER_REMOTEID_REPLAY_INTERVAL", "0") or 0.0)
    max_sleep = float(os.environ.get("NDEFENDER_REMOTEID_REPLAY_MAX_SLEEP", "1.0") or 1.0)
    out_path = os.environ.get("NDEFENDER_REMOTEID_REPLAY_OUT") or "/opt/ndefender/logs/remoteid_decoded.jsonl"
    truncate = os.environ.get("NDEFENDER_REMOTEID_REPLAY_TRUNCATE", "1") == "1"

    if dtpyodid is None:
        raise SystemExit("dtpyodid missing in venv")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if truncate:
        with open(out_path, "w", encoding="utf-8"):
            pass

    stop = False

    def _handle_sig(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, _handle_sig)
    signal.signal(signal.SIGINT, _handle_sig)

    while True:
        frames_total = 0
        vendor_hits = 0
        odid_msgs = 0
        prev_t = None

        out = open(out_path, "a", encoding="utf-8", buffering=1)
        with PcapReader(pcap_path) as pr:
            for pkt in pr:
                if stop:
                    break
                frames_total += 1

                pkt_t = getattr(pkt, "time", None)
                if interval > 0:
                    time.sleep(interval)
                else:
                    if prev_t is not None and pkt_t is not None:
                        dt = float(pkt_t) - float(prev_t)
                        if dt < 0:
                            dt = 0
                        if max_sleep > 0:
                            dt = min(dt, max_sleep)
                        if dt > 0:
                            time.sleep(dt)
                    prev_t = pkt_t

                if not pkt.haslayer(Dot11):
                    continue

                d = pkt.getlayer(Dot11)
                if d.type != 0:
                    continue

                tx_mac = d.addr2 or d.addr3 or d.addr1

                for e in iter_elts(pkt):
                    if getattr(e, "ID", None) != 221:
                        continue
                    vendor_hits += 1
                    info = bytes(getattr(e, "info", b"") or b"")
                    if len(info) < 4:
                        continue
                    if info[0:3] != ODID_OUI or info[3] != ODID_VTYPE:
                        continue

                    payload = info[4:]
                    if len(payload) < 4:
                        continue

                    blocks = payload[4:]
                    seen = set()
                    for i in range(0, len(blocks), MSG_LEN):
                        block = blocks[i:i + MSG_LEN]
                        if len(block) != MSG_LEN:
                            break
                        if block in seen:
                            continue
                        seen.add(block)

                        ev = decode_block(block, tx_mac)
                        if not ev:
                            continue

                        odid_msgs += 1
                        out.write(json.dumps(ev, separators=(",", ":")) + "\n")
        out.close()

        stats = {
            "type": "stats_replay",
            "ts": utc_ts(),
            "pcap": pcap_path,
            "frames_total": frames_total,
            "vendor_ie_hits": vendor_hits,
            "odid_messages": odid_msgs,
        }
        with open(out_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(stats, separators=(",", ":")) + "\n")

        if stop or not loop:
            break


if __name__ == "__main__":
    main()
