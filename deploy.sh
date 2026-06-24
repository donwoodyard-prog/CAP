#!/usr/bin/env bash
#
# Deploy the MAT app to the web host over SFTP using lftp (mirror).
#
# Setup (once):
#   1. brew install lftp
#   2. cp .deploy.env.example .deploy.env   and fill in your SFTP password etc.
#      (.deploy.env is git-ignored — never commit it.)
#
# Usage:
#   ./deploy.sh              # upload changed files to the server
#   DRY_RUN=1 ./deploy.sh    # show what WOULD upload, change nothing (do this first!)
#   DELETE=1   ./deploy.sh   # also delete remote files not present locally (careful)
#
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .deploy.env ]; then
  echo "Missing .deploy.env — copy .deploy.env.example to .deploy.env and fill it in." >&2
  exit 1
fi
set -a; . ./.deploy.env; set +a

: "${SFTP_HOST:?Set SFTP_HOST in .deploy.env}"
: "${SFTP_USER:?Set SFTP_USER in .deploy.env}"
: "${SFTP_PASS:?Set SFTP_PASS in .deploy.env}"
SFTP_PORT="${SFTP_PORT:-22}"
# Default to the SFTP login directory (webspace hosts usually drop you in the
# web root). Override in .deploy.env if your files must go in a subfolder.
REMOTE_DIR="${REMOTE_DIR:-.}"

if ! command -v lftp >/dev/null 2>&1; then
  echo "lftp is not installed. Install it with:  brew install lftp" >&2
  exit 1
fi

MIRROR_OPTS="-R --verbose --no-perms --parallel=3"
[ "${DELETE:-0}"  = "1" ] && MIRROR_OPTS="$MIRROR_OPTS --delete"
[ "${DRY_RUN:-0}" = "1" ] && MIRROR_OPTS="$MIRROR_OPTS --dry-run"

# Files/dirs that must NOT be uploaded (local-only, sensitive, or junk).
# NOTE: api/secrets.php is intentionally NOT excluded — the server needs it.
# lftp -x takes a REGEX (matched against the path). Avoid '|' (lftp treats it as
# a pipe) and spaces. "Logs/" also covers "Archived Logs/"; "\.env" covers
# .env and .deploy.env. api/secrets.php is intentionally NOT excluded.
EXCLUDES="-x \.git -x \.claude -x \.DS_Store -x node_modules/ -x \.env -x deploy\.sh -x Logs/ -x docs/ -x \.md -x test-.*\.js -x secrets\.example\.php -x scratchpad/ -x project-structure\.txt"

echo "Deploying to sftp://$SFTP_USER@$SFTP_HOST:$SFTP_PORT$REMOTE_DIR  (DRY_RUN=${DRY_RUN:-0}, DELETE=${DELETE:-0})"

# Pass the password via the environment (LFTP_PASSWORD + --env-password) so it
# never appears in argv (ps) or in echoed lftp output.
export LFTP_PASSWORD="$SFTP_PASS"
lftp -u "$SFTP_USER" --env-password "sftp://$SFTP_HOST:$SFTP_PORT" <<EOF
set sftp:auto-confirm yes
set net:max-retries 2
set net:timeout 20
mirror $MIRROR_OPTS $EXCLUDES ./ "$REMOTE_DIR"
bye
EOF
unset LFTP_PASSWORD

echo "Done."
