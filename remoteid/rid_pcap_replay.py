#!/usr/bin/env python3
import argparse, json, time
from datetime import datetime, timezone

from scapy.all import PcapReader, Dot11Elt

ODID_PREFIX = bytes.fromhex("FA0BBC0D")  # OUI(FA0BBC) + vendor type(0D)

def utc_ts():
    return datetime.now(timezone.utc).isoformat()

def iso_from_epoch(t):
    try:
        return datetime.fromtimestamp(float(t), tz=timezone.utc).isoformat()
    except Exception:
        return None

def iter_elts(pkt):
    e = pkt.getlayer(Dot11Elt)
    while e is not None:
        yield e
        e = e.payload.getlayer(Dot11Elt)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pcap", required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--speed", type=float, default=1.0, help="1.0=real-time, 2.0=2x faster")
    ap.add_argument("--loop", action="store_true", help="loop forever")
    ap.add_argument("--interval", type=float, default=0.0, help="fixed seconds between emits (overrides pcap timing)")
    ap.add_argument("--max-sleep", type=float, default=1.0, help="cap long gaps (seconds)")
    args = ap.parse_args()

    out = open(args.out, "a", buffering=1) if args.out else None

    def emit(ev):
        ev["ts"] = utc_ts()
        line = json.dumps(ev, separators=(",", ":"))
        print(line, flush=True)
        if out:
            out.write(line + "\n")

    while True:
        frames_total = 0
        vendor_ie_hits = 0
        odid_candidates = 0

        prev_t = None
        with PcapReader(args.pcap) as pr:
            for pkt in pr:
                frames_total += 1
                pkt_t = getattr(pkt, "time", None)

                # pacing
                if args.interval > 0:
                    time.sleep(args.interval)
                else:
                    if prev_t is not None and pkt_t is not None:
                        dt = float(pkt_t) - float(prev_t)
                        if dt < 0:
                            dt = 0
                        dt = dt / max(args.speed, 1e-6)
                        if args.max_sleep > 0:
                            dt = min(dt, args.max_sleep)
                        if dt > 0:
                            time.sleep(dt)
                    prev_t = pkt_t

                # parse vendor IEs
                for e in iter_elts(pkt):
                    if getattr(e, "ID", None) != 221:
                        continue
                    vendor_ie_hits += 1
                    info = bytes(getattr(e, "info", b"") or b"")
                    if info.startswith(ODID_PREFIX) and len(info) >= 4 + 25:
                        odid_candidates += 1
                        payload = info[4:4+25]
                        emit({
                            "type": "rid_wifi_odid",
                            "source": "replay",
                            "pcap": args.pcap,
                            "pcap_ts": iso_from_epoch(pkt_t),
                            "len": len(payload),
                            "payload_hex": payload.hex(),
                        })

        emit({
            "type": "stats_replay",
            "source": "replay",
            "pcap": args.pcap,
            "frames_total": frames_total,
            "vendor_ie_hits": vendor_ie_hits,
            "odid_candidates": odid_candidates,
            "speed": args.speed,
            "interval": args.interval,
        })

        if not args.loop:
            break

    if out:
        out.close()

if __name__ == "__main__":
    main()
