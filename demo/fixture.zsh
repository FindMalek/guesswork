# Shared fabricated-environment builder for demo/make-demo.sh and
# demo/make-launch-demo.sh. Sourced, not executed directly.
#
# build_demo_fixture <demo-dir> <repo-root> writes a throwaway git repo and a
# made-up shell history under <demo-dir>, then a setup.zsh that both tapes
# source before recording. Nothing here ever touches your real history or
# any real repo.

build_demo_fixture() {
  local demo=$1
  local root=$2

  rm -rf "$demo" && mkdir -p "$demo/project/src"
  (
    cd "$demo/project"
    git init -q
    printf '# demo\n\nA tiny demo project.\n' > README.md
    git add .
    git -c user.name=demo -c user.email=demo@example.com commit -qm "initial commit"

    printf 'export function add(a, b) {\n  // TODO: validate inputs\n  return a + b;\n}\n' > src/index.js
    git add .
    git -c user.name=demo -c user.email=demo@example.com commit -qm "add: add() helper"

    printf '{\n  "name": "demo",\n  "version": "0.1.0",\n  "scripts": {\n    "test": "echo ok"\n  }\n}\n' > package.json
    git add .
    git -c user.name=demo -c user.email=demo@example.com commit -qm "chore: add package.json"

    printf 'node_modules/\n' > .gitignore
    git add .
    git -c user.name=demo -c user.email=demo@example.com commit -qm "chore: add .gitignore"

    printf 'export function subtract(a, b) {\n  return a - b;\n}\n' >> src/index.js
    git add .
    git -c user.name=demo -c user.email=demo@example.com commit -qm "add: subtract() helper"
  )

  # git/docker/kubectl-style entries an engineer's real history tends to
  # accumulate — "git status" and "git log --oneline -5" are here on purpose:
  # beat 1 (prefix mode) needs "git status" reachable from "git st", and beat
  # 2 (fuzzy mode) needs a real "last N commits" candidate, which now also
  # has 5 real commits behind it so the accepted command's actual output
  # looks like a genuine answer instead of a single line.
  local -a fake_history=(
    'brew upgrade'
    'ssh staging-web-01'
    'vim README.md'
    'docker compose up -d'
    'docker compose logs -f api'
    'kubectl get pods -n staging'
    'git stash list'
    'python3 -m http.server 8080'
    'curl -s localhost:3000/health | jq .'
    'make lint'
    'npm run build'
    'cargo test --workspace'
    'tail -f /var/log/nginx/error.log'
    'git log --oneline -5'
    'rg TODO src/'
    'npm test'
    'ls -la'
    'git status'
  )
  : > "$demo/history"
  local i=0
  for cmd in $fake_history; do
    i=$(( i + 1 ))
    printf ': %d:0;%s\n' $(( 1700000000 + i * 60 )) "$cmd" >> "$demo/history"
  done

  cat > "$demo/setup.zsh" <<EOF
cd $demo/project
HISTFILE=$demo/history
PROMPT='%F{blue}demo%f %F{magenta}❯%f '
bindkey -e
bindkey '^E' end-of-line
GUESSWORK_SHOW_SCORE=1
source $root/zsh/guesswork.plugin.zsh
EOF
}
