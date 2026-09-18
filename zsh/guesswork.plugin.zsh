# guesswork: Fish-style autosuggestions for zsh, ranked by TypeSafe's Jev model.
#
# As you type, the last GUESSWORK_HISTORY_LIMIT distinct history entries are
# sent to Jev, which picks the one you are most likely typing. The suggestion
# is shown after the cursor in grey. Press → (or End / ^E) at the end of the
# line to accept it.
#
#   source /path/to/guesswork/zsh/guesswork.plugin.zsh
#
# Requires zsh 5.9+, node 22+, and TYPESAFE_API_KEY in the environment.

0="${${ZERO:-${0:#$ZSH_ARGZERO}}:-${(%):-%N}}"
typeset -g GUESSWORK_PLUGIN_DIR="${0:A:h:h}"

: ${GUESSWORK_HISTORY_LIMIT:=100}   # recent distinct commands to consider
: ${GUESSWORK_MIN_CHARS:=2}         # do nothing until this many characters are typed
: ${GUESSWORK_THRESHOLD:=0.5}       # fuzzy mode: min probability that *some* command completes the input
: ${GUESSWORK_MIN_SCORE:=0.3}       # fuzzy mode: min probability of the top candidate
: ${GUESSWORK_STRONG_SCORE:=0.9}    # fuzzy mode: a top score this high overrides GUESSWORK_THRESHOLD
: ${GUESSWORK_HIGHLIGHT:='fg=8'}    # zle highlight spec for the suggestion text
: ${GUESSWORK_SHOW_SCORE:=1}        # append the score, e.g. "git status  [0.87]"
: ${GUESSWORK_NODE:=node}
: ${GUESSWORK_MODEL:=}              # empty = SDK default (jev-latest)
: ${GUESSWORK_DEBUG_LOG:=}          # path; when set, each response is appended there

typeset -g _GW_FD= _GW_PID= _GW_REQUEST_BUFFER=
typeset -g _GW_SUGGESTION= _GW_KIND= _GW_SCORE= _GW_LAST_BUFFER=

zmodload zsh/system
autoload -Uz add-zle-hook-widget

# ---------------------------------------------------------------- display --

_gw_clear() {
  _GW_SUGGESTION= _GW_KIND= _GW_SCORE=
  POSTDISPLAY=
  region_highlight=("${(@)region_highlight:#*memo=guesswork}")
}

_gw_show() {
  local text
  # $_GW_KIND is one of prefix/replace/script (src/cli.ts formatForShell()).
  # "script" (a package.json/Makefile command the user has never actually
  # run) currently renders the same as "replace"; it's a distinct value so a
  # future revision can style it differently without changing this contract.
  if [[ $_GW_KIND == prefix ]]; then
    text="${_GW_SUGGESTION#"$BUFFER"}"
  else
    text="  ⇢ ${_GW_SUGGESTION}"
  fi
  (( GUESSWORK_SHOW_SCORE )) && text+="  [${_GW_SCORE}]"
  POSTDISPLAY="$text"
  region_highlight=("${(@)region_highlight:#*memo=guesswork}")
  region_highlight+=("$#BUFFER $(( $#BUFFER + $#POSTDISPLAY )) $GUESSWORK_HIGHLIGHT memo=guesswork")
}

# ------------------------------------------------------------------ async --

_gw_cancel() {
  if [[ -n $_GW_FD ]]; then
    zle -F $_GW_FD 2>/dev/null
    exec {_GW_FD}<&-
    _GW_FD=
  fi
  if [[ -n $_GW_PID ]]; then
    kill -TERM $_GW_PID 2>/dev/null
    _GW_PID=
  fi
  _GW_REQUEST_BUFFER=
}

_gw_request() {
  _gw_cancel
  _GW_REQUEST_BUFFER="$BUFFER"

  local -a args=(--history "${HISTFILE:-$HOME/.zsh_history}"
                 --limit "$GUESSWORK_HISTORY_LIMIT" --min-chars "$GUESSWORK_MIN_CHARS"
                 --threshold "$GUESSWORK_THRESHOLD" --min-score "$GUESSWORK_MIN_SCORE"
                 --strong-score "$GUESSWORK_STRONG_SCORE")
  [[ -n $GUESSWORK_MODEL ]] && args+=(--model "$GUESSWORK_MODEL")

  local errlog="${GUESSWORK_DEBUG_LOG:-/dev/null}"
  exec {_GW_FD}< <(
    echo $sysparams[pid]
    exec $GUESSWORK_NODE "$GUESSWORK_PLUGIN_DIR/src/cli.ts" --buffer "$BUFFER" "${args[@]}" 2>>| "$errlog"
  )
  read -u $_GW_FD _GW_PID
  zle -F -w $_GW_FD _gw_response
}

zle -N _gw_response
_gw_response() {
  local fd=$1 output header body
  IFS= read -r -d '' -u $fd output
  zle -F $fd 2>/dev/null
  exec {fd}<&-
  [[ $fd == $_GW_FD ]] && _GW_FD= _GW_PID=

  [[ -n $GUESSWORK_DEBUG_LOG ]] && print -r -- "buffer=${(q)_GW_REQUEST_BUFFER} output=${(q)output}" >>| "$GUESSWORK_DEBUG_LOG"

  # Only apply the answer if the line is still what we asked about.
  if [[ -n $output && $BUFFER == $_GW_REQUEST_BUFFER ]]; then
    header="${output%%$'\n'*}"
    body="${output#*$'\n'}"
    local -a fields=(${=header})
    _GW_SCORE="${fields[1]}"
    _GW_KIND="${fields[3]}"
    _GW_SUGGESTION="$body"
    _gw_show
  fi
  _GW_REQUEST_BUFFER=
  zle -R
}

# ------------------------------------------------------------------ hooks --

_gw_pre_redraw() {
  [[ $BUFFER == $_GW_LAST_BUFFER ]] && return 0
  _GW_LAST_BUFFER="$BUFFER"

  # Typing along an existing prefix suggestion keeps it without a new request.
  if [[ $_GW_KIND == prefix && -n $BUFFER && $_GW_SUGGESTION == "$BUFFER"?* ]]; then
    _gw_show
    return 0
  fi

  _gw_clear
  local trimmed="${${BUFFER##[[:space:]]#}%%[[:space:]]#}"
  if [[ $#trimmed -ge $GUESSWORK_MIN_CHARS && $CURSOR -eq $#BUFFER ]]; then
    _gw_request
  else
    _gw_cancel
  fi
}

_gw_line_init() {
  _GW_LAST_BUFFER=
  _gw_clear
}

_gw_line_finish() {
  _gw_cancel
  _gw_clear
}

add-zle-hook-widget line-pre-redraw _gw_pre_redraw
add-zle-hook-widget line-init _gw_line_init
add-zle-hook-widget line-finish _gw_line_finish

# ----------------------------------------------------------------- accept --

guesswork-accept-suggestion() {
  if [[ -n $_GW_SUGGESTION ]]; then
    BUFFER="$_GW_SUGGESTION"
    CURSOR=$#BUFFER
    _gw_clear
    _GW_LAST_BUFFER="$BUFFER"
    return 0
  fi
  return 1
}
zle -N guesswork-accept-suggestion

# At the end of the line, movement-right / end-of-line widgets accept the
# suggestion; elsewhere they behave as normal.
_gw_wrap_accepting_widget() {
  local widget=$1
  eval "
    _gw_wrapped_$widget() {
      if [[ -n \$_GW_SUGGESTION && \$CURSOR -eq \$#BUFFER ]]; then
        zle guesswork-accept-suggestion
      else
        zle .$widget -- \"\$@\"
      fi
    }
  "
  zle -N "$widget" "_gw_wrapped_$widget"
}
for _gw_w in forward-char vi-forward-char end-of-line vi-end-of-line; do
  _gw_wrap_accepting_widget $_gw_w
done
unset _gw_w
