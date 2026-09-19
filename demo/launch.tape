# VHS tape (https://github.com/charmbracelet/vhs) for the longer launch
# video (see issue #20). Run via demo/make-launch-demo.sh: it builds the
# same fabricated history and throwaway repo demo/make-demo.sh does, in
# /tmp/guesswork-demo (nothing personal is recorded), then assembles the
# MP4/GIF from the frames with ffmpeg (vhs 0.12.0 fails to render on its
# own, see vhs#787).
#
# Custom "guesswork" theme, not a stock VHS one -- same exact hex values as
# demo.tape (from site/src/app/globals.css), so the README GIF and this
# launch video read as the same product.
#
# This tape deliberately covers only the beats that are pure zsh + the real
# plugin, with no live network call beyond the one request the plugin
# already makes per keystroke:
#   1. fuzzy-mode suggestion ("gst" -> "git status", the flagship
#      abbreviation from the README's own pitch)
#   2. fuzzy-mode suggestion ("last 5 commits" -> "git log --oneline -5")
#   3. fuzzy-mode suggestion ("kgp" -> "kubectl get pods -n staging")
#   4. a clean closing prompt
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
Set Theme {"name":"guesswork","black":"#4e4e4e","red":"#d15955","green":"#48a964","yellow":"#dca842","blue":"#ff8001","magenta":"#ffb56c","cyan":"#9f9f9f","white":"#f9f8f7","brightBlack":"#787878","brightRed":"#d15955","brightGreen":"#48a964","brightYellow":"#dca842","brightBlue":"#ff8001","brightMagenta":"#ffb56c","brightCyan":"#cecece","brightWhite":"#ffffff","background":"#161616","foreground":"#f9f8f7","selection":"#4e4e4e","cursor":"#ff8001"}
Set TypingSpeed 120ms

Hide
Type "source /tmp/guesswork-demo/setup.zsh && clear"
Enter
Sleep 1s
Show

Sleep 2s

# 1. fuzzy mode, the flagship abbreviation from the README's own pitch: "gst"
# isn't a literal prefix of anything in history, so the model has to pick
# "git status" over the other "g-s-t"-shaped candidate, "git stash list"
Type "gst"
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

# 3. fuzzy mode again: a longer command collapsed from three letters
Type "kgp"
Sleep 3500ms
Right
Sleep 1500ms
Enter
Sleep 3s

# 4. clean prompt, cursor blinking — closing shot
Sleep 3s
