#!/usr/bin/env python3
import argparse, json
from datetime import datetime, timezone
from scapy.all import rdpcap, Dot11Elt

ODID_PREFIX = bytes.fromhex("FA0BBC0D")  # OUI+type

def utc_ts():
    return datetime.now(timezone.utc).isoformat()

def iter_ies(pkt):
    e = pkt.getlayer(Dot11Elt)
    while e is not None:
        yield e
        e = e.payload.getlayer(Dot11Elt)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pcap", required=True)
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    out = open(args.out, "a", buffering=1) if args.out else None

    frames_total = 0
    vendor_ie_hits = 0
    odid_candidates = 0

    pkts = rdpcap(args.pcap)
    for p in pkts:
        frames_total += 1
        for ie in iter_ies(p):
            if getattr(ie, "ID", None) != 221:
                continue
            vendor_ie_hits += 1
            info = bytes(getattr(ie, "info", b"") or b"")
            if info.startswith(ODID_PREFIX) and len(info) >= len(ODID_PREFIX) + 1:
                odid_candidates += 1
                payload = info[len(ODID_PREFIX):]
                ev = {
                    "ts": utc_ts(),
                    "type": "rid_wifi_odid",
                    "pcap": args.pcap,
                    "len": len(payload),
                    "payload_hex": payload.hex(),
                }
                line = json.dumps(ev, separators=(",", ":"))
                print(line, flush=True)
                if out:
                    out.write(line + "\n")

    stats = {
        "ts": utc_ts(),
        "type": "stats_offline",
        "pcap": args.pcap,
        "frames_total": frames_total,
        "vendor_ie_hits": vendor_ie_hits,
        "odid_candidates": odid_candidates,
    }
    print(json.dumps(stats, separators=(",", ":")), flush=True)
    if out:
        out.write(json.dumps(stats, separators=(",", ":")) + "\n")
        out.close()

if __name__ == "__main__":
    main()
