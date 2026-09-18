# Shared frame-assembly step for demo/make-demo.sh and
# demo/make-launch-demo.sh. Sourced, not executed directly.
#
# assemble_demo_video <root> <name> renders demo/frames/ (written by a
# preceding `vhs demo/<name>.tape` run) into demo/<name>.mp4 and
# demo/<name>.gif, then removes the frames.

assemble_demo_video() {
  local root=$1
  local name=$2

  # vhs captures 50 fps as separate text and cursor layers. The terminal
  # canvas is centred on a fixed 16:9 1280x720 background (Catppuccin Mocha
  # base, matching the tapes' theme), an aspect ratio X/Twitter is happy
  # with.
  local pad='pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x1e1e2e'
  local -a inputs=(-y -r 50 -start_number 1 -i "$root/demo/frames/frame-text-%05d.png"
                   -r 50 -start_number 1 -i "$root/demo/frames/frame-cursor-%05d.png")
  ffmpeg -loglevel error $inputs \
    -filter_complex "[0][1]overlay,$pad,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -vcodec libx264 -pix_fmt yuv420p -crf 20 -an "$root/demo/$name.mp4"
  ffmpeg -loglevel error $inputs \
    -filter_complex "[0][1]overlay,$pad,fps=20,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" \
    "$root/demo/$name.gif"

  rm -rf "$root/demo/frames"
  ls -la "$root/demo/$name.mp4" "$root/demo/$name.gif"
}
