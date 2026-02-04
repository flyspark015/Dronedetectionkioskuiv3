#!/usr/bin/env python3
from scapy.all import RadioTap, Dot11, Dot11Beacon, Dot11Elt, wrpcap
import os, random

ODID_PREFIX = bytes.fromhex("FA0BBC0D")  # OUI(3) + vtype(1)
MSG_LEN = 25

def rand_mac():
    return "02:%02x:%02x:%02x:%02x:%02x" % tuple(random.randint(0,255) for _ in range(5))

def mk_beacon(ssid: str, bssid: str, ch: int, payload: bytes):
    # Radiotap + 802.11 beacon
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap="ESS+privacy")
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b"\x82\x84\x8b\x96")  # basic rates
    ds = Dot11Elt(ID="DSset", info=bytes([ch]))            # channel
    vendor = Dot11Elt(ID=221, info=ODID_PREFIX + payload)  # vendor IE

    return RadioTap()/dot11/beacon/essid/rates/ds/vendor

def main():
    out = "/opt/ndefender/remoteid/testdata/odid_test.pcap"
    pkts = []
    # generate frames across common channels
    channels = [1, 6, 11, 36, 44, 149]
    for i in range(60):
        ch = channels[i % len(channels)]
        bssid = rand_mac()
        # 25B payload (TEST vector). Not pretending to be DJI / real drone.
        # Keep deterministic-ish pattern so you can debug parsing.
        payload = (b"TEST_ODID_" + bytes([i % 256]) + os.urandom(MSG_LEN - 10))[:MSG_LEN]
        pkts.append(mk_beacon(ssid="ODID_TEST", bssid=bssid, ch=ch, payload=payload))

    wrpcap(out, pkts)
    print("Wrote:", out, "packets:", len(pkts))

if __name__ == "__main__":
    main()
