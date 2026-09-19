#!/usr/bin/env zsh
# Records demo/launch.mp4 and demo/launch.gif — the longer, slower-paced cut
# for the launch video (issue #20), as opposed to demo/make-demo.sh's quick
# inline README clip. Same fabricated environment, different tape
# (demo/launch.tape), paced for a first impression rather than speed.
#
# This only covers the beats that are pure zsh + the real plugin (prefix-mode
# suggestion, fuzzy-mode suggestion, clean closing prompt) — see the comment
# at the top of demo/launch.tape for the two beats (the install one-liner and
# the setup wizard) that are deliberately left out and need to be recorded by
# hand with real credentials.
#
# Everything shown is fabricated: a throwaway git repo and a made-up history
# file under /tmp/guesswork-demo. Your real ~/.zsh_history is never read.
#
# Needs: vhs, ffmpeg, and TYPESAFE_API_KEY in the environment (inherited by the
# recorded shell; it never appears on screen).
set -euo pipefail

root=${0:A:h:h}
demo=/tmp/guesswork-demo

[[ -n ${TYPESAFE_API_KEY:-} ]] || { print -u2 "TYPESAFE_API_KEY is not set"; exit 2 }

source "$root/demo/fixture.zsh"
source "$root/demo/assemble.zsh"

build_demo_fixture "$demo" "$root"

# --- record -------------------------------------------------------------------
cd "$root"
rm -rf demo/frames
vhs demo/launch.tape

# --- assemble (vhs 0.12.0 does not render its outputs, see vhs#787) ------------
assemble_demo_video "$root" launch
