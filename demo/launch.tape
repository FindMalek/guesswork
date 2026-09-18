# VHS tape (https://github.com/charmbracelet/vhs) for the longer launch
# video (see issue #20). Run via demo/make-launch-demo.sh: it builds the
# same fabricated history and throwaway repo demo/make-demo.sh does, in
# /tmp/guesswork-demo (nothing personal is recorded), then assembles the
# MP4/GIF from the frames with ffmpeg (vhs 0.12.0 fails to render on its
# own, see vhs#787).
#
# This tape deliberately covers only the beats that are pure zsh + the real
# plugin, with no live network call beyond the one request the plugin
# already makes per keystroke:
#   1. prefix-mode suggestion ("git st" -> "atus")
#   2. fuzzy-mode suggestion ("last 5 commits" -> "git log --oneline -5")
#   3. a clean closing prompt
#
# Two beats from the full launch script are intentionally NOT here:
#   - the `curl ... install.sh | bash` one-liner, which needs a real DNS/
#     network fetch mid-recording
#   - the `@clack/prompts` setup wizard, which needs real provider
#     credentials
# Both need to be recorded by hand, separately, by whoever has those
# credentials, then cut together with this tape's output.
#
# Paced noticeably slower than demo.tape (which is a quick inline README
# GIF) — this is meant to read clearly as a first impression, not to be
# fast.

Output demo/frames/

Set Shell zsh
Set FontSize 30
Set Width 1300
Set Height 500
Set Theme "Catppuccin Mocha"
Set TypingSpeed 120ms

Hide
Type "source /tmp/guesswork-demo/setup.zsh && clear"
Enter
Sleep 1s
Show

Sleep 2s

# 1. prefix mode: history has both "git status" and "git stash list", so
# the model has to pick between two "git st..." entries
Type "git st"
Sleep 3500ms
Right
Sleep 1500ms
Enter
Sleep 3s

# 2. fuzzy mode: describe what you want in plain words, the model finds the
# command — the fake project now has 5 real commits, so the accepted
# command's actual output reads like a genuine "last 5 commits" answer
# instead of a single line
Type "last 5 commits"
Sleep 3500ms
Ctrl+E
Sleep 1500ms
Enter
Sleep 3500ms

# 3. clean prompt, cursor blinking — closing shot
Sleep 3s
