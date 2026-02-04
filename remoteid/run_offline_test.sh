#!/bin/bash
set -e
PCAP="${1:-/opt/ndefender/remoteid/testdata/odid_test.pcap}"
OUT="${2:-/opt/ndefender/logs/remoteid.jsonl}"

echo "[*] Offline decode: $PCAP -> $OUT"
 /opt/ndefender/remoteid/venv/bin/python -u /opt/ndefender/remoteid/rid_offline_decode.py \
  --pcap "$PCAP" \
  --out "$OUT"
