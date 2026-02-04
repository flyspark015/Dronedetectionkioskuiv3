#!/usr/bin/env python3
import argparse, json, subprocess, sys, time, threading
from datetime import datetime, timezone
from collections import Counter

from scapy.all import sniff, Dot11, Dot11Elt

try:
    from bleak import BleakScanner
except Exception:
    BleakScanner = None

ODID_OUI = bytes.fromhex("FA0BBC")
ODID_VTYPE = 0x0D
MSG_LEN = 25

def utc_ts():
    return datetime.now(timezone.utc).isoformat()

class RIDReceiver:
    def __init__(self, iface, hop, dwell, out_path, no_wifi, no_ble, debug_ouis):
        self.iface = iface
        self.hop = hop
        self.dwell = dwell
        self.no_wifi = no_wifi
        self.no_ble = no_ble
        self.debug_ouis = debug_ouis

        self.stop = threading.Event()
        self.frames_total = 0
        self.beacons = 0
        self.probe_resp = 0
        self.vendor_ie_hits = 0
        self.odid_candidates = 0

        self.oui_counter = Counter()   # key: (oui3, vtype) -> count

        self.out = open(out_path, "a", buffering=1) if out_path else None

    def emit(self, obj):
        obj["ts"] = utc_ts()
        line = json.dumps(obj, separators=(",", ":"))
        print(line, flush=True)
        if self.out:
            self.out.write(line + "\n")

    def set_channel(self, ch):
        # wlan0 MUST be in monitor mode, then this works reliably.
        cmd = ["iw", "dev", self.iface, "set", "channel", str(ch)]
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode != 0:
            self.emit({"type":"warn","src":"chanhop","channel":ch,"stderr":p.stderr.strip(),"stdout":p.stdout.strip()})

    def chanhop_thread(self):
        if not self.hop:
            return
        self.emit({"type":"status","msg":f"Channel hop on {self.iface}: {self.hop} dwell={self.dwell}s"})
        while not self.stop.is_set():
            for ch in self.hop:
                if self.stop.is_set():
                    break
                self.set_channel(ch)
                time.sleep(self.dwell)

    def parse_vendor_ie(self, info_bytes):
        # vendor IE payload: OUI(3) + vendor_type(1) + vendor_data...
        if len(info_bytes) < 4:
            return None
        oui = info_bytes[:3]
        vtype = info_bytes[3]
        self.oui_counter[(oui, vtype)] += 1

        if oui == ODID_OUI and vtype == ODID_VTYPE:
            # Likely OpenDroneID Wi-Fi beacon IE
            data = info_bytes[4:]
            # Format (common): [msg_counter(1)] + [pack_hdr(3)] + N*25 bytes blocks
            msg_counter = data[0] if len(data) >= 1 else None
            pack_hdr = data[1:4].hex() if len(data) >= 4 else None
            blocks = []
            if len(data) > 4:
                blob = data[4:]
                for i in range(0, len(blob), MSG_LEN):
                    b = blob[i:i+MSG_LEN]
                    if len(b) == MSG_LEN:
                        blocks.append(b.hex())
            return {
                "msg_counter": msg_counter,
                "pack_hdr": pack_hdr,
                "blocks_n": len(blocks),
                "blocks_hex": blocks[:8],  # cap spam
                "raw_len": len(info_bytes),
            }
        return None

    def handle_pkt(self, pkt):
        if not pkt.haslayer(Dot11):
            return

        d = pkt.getlayer(Dot11)
        if d.type == 0:  # mgmt
            self.frames_total += 1
            if d.subtype == 8:
                self.beacons += 1
            elif d.subtype == 5:
                self.probe_resp += 1

            # Walk Dot11Elt chain
            elt = pkt.getlayer(Dot11Elt)
            while elt is not None:
                if elt.ID == 221:  # vendor specific
                    self.vendor_ie_hits += 1
                    hit = self.parse_vendor_ie(bytes(elt.info))
                    if hit:
                        self.odid_candidates += 1
                        self.emit({
                            "type": "rid_wifi_odid_candidate",
                            "iface": self.iface,
                            **hit
                        })
                elt = elt.payload.getlayer(Dot11Elt)

    def wifi_sniff_thread(self):
        self.emit({"type":"status","msg":f"Wi-Fi sniffer starting on {self.iface}"})
        # Loop with timeout so Ctrl+C stops quickly
        while not self.stop.is_set():
            sniff(iface=self.iface, store=False, prn=self.handle_pkt, timeout=1)

    async def ble_task(self):
        if BleakScanner is None:
            self.emit({"type":"warn","src":"ble","msg":"bleak not installed; BLE disabled"})
            return

        ODID_UUID = "0000fffa-0000-1000-8000-00805f9b34fb"
        self.emit({"type":"status","msg":"BLE scanner starting (bleak)"})

        def cb(device, adv):
            # adv: AdvertisementData
            rssi = getattr(adv, "rssi", None)
            mfg = {str(k): bytes(v).hex() for k, v in (adv.manufacturer_data or {}).items()}
            svc = {str(k): bytes(v).hex() for k, v in (adv.service_data or {}).items()}

            # Only flag ODID-like packets (service data UUID or mfg id 0xFFFA)
            is_odid = (ODID_UUID in (adv.service_data or {})) or (0xFFFA in (adv.manufacturer_data or {}))
            out = {
                "type": "rid_ble_adv",
                "addr": device.address,
                "name": device.name,
                "rssi": rssi,
                "mfg": mfg,
                "svc": svc,
                "odid_candidate": bool(is_odid),
            }
            self.emit(out)

        scanner = BleakScanner(cb)
        await scanner.start()
        try:
            while not self.stop.is_set():
                await asyncio.sleep(0.5)
        finally:
            await scanner.stop()

    def stats_loop(self):
        last = time.time()
        while not self.stop.is_set():
            time.sleep(2)
            now = time.time()
            if now - last >= 2:
                s = {
                    "type":"stats",
                    "frames_total": self.frames_total,
                    "beacons": self.beacons,
                    "probe_resp": self.probe_resp,
                    "vendor_ie_hits": self.vendor_ie_hits,
                    "odid_candidates": self.odid_candidates,
                }
                if self.debug_ouis:
                    top = self.oui_counter.most_common(8)
                    s["top_vendor_ouis"] = [
                        {"oui": k[0].hex().upper(), "vtype": k[1], "count": v}
                        for (k, v) in top
                    ]
                self.emit(s)
                last = now

    def run(self):
        th = []
        if not self.no_wifi:
            th.append(threading.Thread(target=self.wifi_sniff_thread, daemon=True))
            if self.hop:
                th.append(threading.Thread(target=self.chanhop_thread, daemon=True))
        th.append(threading.Thread(target=self.stats_loop, daemon=True))

        for t in th: t.start()

        try:
            while True:
                time.sleep(0.5)
        except KeyboardInterrupt:
            self.emit({"type":"status","msg":"Stopping..."})
        finally:
            self.stop.set()
            if self.out:
                self.out.close()

def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--iface", default="wlan0")
    ap.add_argument("--hop", default="1,6,11,36,44,149")
    ap.add_argument("--dwell", type=float, default=0.8)
    ap.add_argument("--out", default="/opt/ndefender/logs/remoteid.jsonl")
    ap.add_argument("--no-wifi", action="store_true")
    ap.add_argument("--no-ble", action="store_true")
    ap.add_argument("--debug-ouis", action="store_true")
    return ap.parse_args()

if __name__ == "__main__":
    import asyncio
    a = parse_args()
    hop = [int(x) for x in a.hop.split(",") if x.strip()] if a.hop else []
    r = RIDReceiver(a.iface, hop, a.dwell, a.out, a.no_wifi, a.no_ble, a.debug_ouis)
    r.run()
