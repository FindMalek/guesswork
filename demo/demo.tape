# VHS tape (https://github.com/charmbracelet/vhs) for the README demo.
# Run via demo/make-demo.sh: it builds a fabricated history and throwaway repo
# in /tmp/guesswork-demo (nothing personal is recorded) and assembles the
# MP4/GIF from the frames with ffmpeg (vhs 0.12.0 fails to render on its own,
# see vhs#787).
#
# Custom "guesswork" theme, not a stock VHS one -- exact hex values from the
# site's own dark palette (site/src/app/globals.css) so the README GIF, the
# website, and the launch video all read as the same product.

Output demo/frames/

Set Shell zsh
Set FontSize 30
Set Width 1300
Set Height 500
Set Theme {"name":"guesswork","black":"#4e4e4e","red":"#d15955","green":"#48a964","yellow":"#dca842","blue":"#ff8001","magenta":"#ffb56c","cyan":"#9f9f9f","white":"#f9f8f7","brightBlack":"#787878","brightRed":"#d15955","brightGreen":"#48a964","brightYellow":"#dca842","brightBlue":"#ff8001","brightMagenta":"#ffb56c","brightCyan":"#cecece","brightWhite":"#ffffff","background":"#161616","foreground":"#f9f8f7","selection":"#4e4e4e","cursor":"#ff8001"}
Set TypingSpeed 90ms

Hide
Type "source /tmp/guesswork-demo/setup.zsh && clear"
Enter
Sleep 1s
Show

Sleep 1s

# 1. fuzzy mode, the flagship abbreviation from the README's own pitch: "gst"
# isn't a literal prefix of anything in history, so the model has to pick
# "git status" over the other "g-s-t"-shaped candidate, "git stash list"
Type "gst"
Sleep 2500ms
Right
Sleep 800ms
Enter
Sleep 2s

# 2. fuzzy mode: describe what you want, the model finds the command
Type "last 5 commits"
Sleep 2500ms
Ctrl+E
Sleep 800ms
Enter
Sleep 2500ms

# 3. nothing in history matches: no suggestion, no hallucination -- closing
# beat. ("kgp" -> "kubectl get pods -n staging" was tried here and cut: it
# didn't reliably clear the confidence gate in testing, and per this
# project's own stance, an unreliable example gets swapped for a safer one
# rather than forced -- see demo/launch.tape's comment for the same call.)
Type "xyzzy"
Sleep 2500ms
Ctrl+U
Sleep 1s
