#!/usr/bin/env bash
set -e
CARD=2

# Unmute + max speaker stage
amixer -c $CARD set Speaker 100% unmute >/dev/null
amixer -c $CARD set Playback 100% unmute >/dev/null

# Critical routing to speaker amp
amixer -c $CARD set 'Left Output Mixer PCM' on >/dev/null
amixer -c $CARD set 'Right Output Mixer PCM' on >/dev/null
amixer -c $CARD set 'Mono Output Mixer Left' on >/dev/null || true
amixer -c $CARD set 'Mono Output Mixer Right' on >/dev/null || true

# Optional: reduce pops/clicks
amixer -c $CARD set 'Speaker Playback ZC' on >/dev/null || true
amixer -c $CARD set 'Headphone Playback ZC' on >/dev/null || true
