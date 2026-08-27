#!/usr/bin/env bash
#
# Point the live SPA back at the previous release (or at any release still on
# disk). The flip is the same atomic rename(2) the deploy uses, so it takes
# effect on the next request with no nginx reload and no downtime.
#
# `current` and `previous` are swapped, so running this twice returns you to
# where you started.
#
# Usage:
#   arch-frontend-rollback                    # back to `previous`
#   arch-frontend-rollback --list             # what is on disk
#   arch-frontend-rollback --release <ID>     # to a specific release
#   arch-frontend-rollback --check-url URL    # curl URL afterwards, fail if not 2xx
#
# Options:
#   --root DIR        release root (default /var/www/arch-frontend)
#   --reason TEXT     recorded in the log line, for the operator's benefit
#
# Requires GNU coreutils (`mv -T`). Run it as the user that owns the release
# root — the runner user — not as root, or the next deploy will hit files it
# cannot replace.
#
# See docs/deploy/FRONTEND_DEPLOY.md §5.

set -euo pipefail

ROOT="/var/www/arch-frontend"
RELEASE=""
REASON=""
CHECK_URL=""
LIST_ONLY=0

die() { echo "ERROR: $*" >&2; exit 1; }
note() { echo "==> $*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --root)      ROOT="${2:?--root needs a value}"; shift 2 ;;
    --release)   RELEASE="${2:?--release needs a value}"; shift 2 ;;
    --reason)    REASON="${2:?--reason needs a value}"; shift 2 ;;
    --check-url) CHECK_URL="${2:?--check-url needs a value}"; shift 2 ;;
    --list)      LIST_ONLY=1; shift ;;
    -h|--help)   sed -n '2,/^set -euo/p' "$0" | sed -e 's/^# \{0,1\}//' -e '$d'; exit 0 ;;
    *)           die "unknown argument: $1 (try --help)" ;;
  esac
done

[ -d "$ROOT/releases" ] || die "'$ROOT/releases' does not exist — nothing to roll back to"

CURRENT=""
[ -L "$ROOT/current" ] && CURRENT="$(readlink "$ROOT/current")"

if [ "$LIST_ONLY" -eq 1 ]; then
  echo "Releases in $ROOT/releases (newest first):"
  find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
    | LC_ALL=C sort -r \
    | while IFS= read -r name; do
        marker=""
        [ "releases/$name" = "$CURRENT" ] && marker="   <- current"
        [ -L "$ROOT/previous" ] && [ "releases/$name" = "$(readlink "$ROOT/previous")" ] && marker="   <- previous"
        printf '  %s%s\n' "$name" "$marker"
      done
  exit 0
fi

mv --version >/dev/null 2>&1 || die "GNU coreutils required (this script needs 'mv -T')"
[ -w "$ROOT" ] || die "'$ROOT' is not writable by '$(id -un)' — run this as the user that owns the release root"
if [ -e "$ROOT/current" ] && [ ! -L "$ROOT/current" ]; then
  die "'$ROOT/current' exists and is not a symlink; refusing to touch it"
fi

# ── Work out where we are going ──────────────────────────────────────────────
if [ -n "$RELEASE" ]; then
  case "$RELEASE" in
    */*|.*) die "--release must be a plain release id (got '$RELEASE')" ;;
  esac
  TARGET="releases/$RELEASE"
else
  [ -L "$ROOT/previous" ] || die "no 'previous' symlink in '$ROOT' — there is no earlier release to fall back to. Use --list and then --release <ID>."
  TARGET="$(readlink "$ROOT/previous")"
fi

[ -d "$ROOT/$TARGET" ] || die "'$ROOT/$TARGET' does not exist (pruned?). Use --list to see what is still on disk."
[ -n "$CURRENT" ] || die "'$ROOT/current' is not a symlink yet — nothing has ever been deployed here"
[ "$TARGET" != "$CURRENT" ] || die "'$TARGET' is already the live release; nothing to do"

note "rolling back: $CURRENT -> $TARGET${REASON:+ ($REASON)}"

# Swap, so a second run undoes this one.
ln -sfn "$TARGET" "$ROOT/.current.tmp"
mv -Tf "$ROOT/.current.tmp" "$ROOT/current"
ln -sfn "$CURRENT" "$ROOT/.previous.tmp"
mv -Tf "$ROOT/.previous.tmp" "$ROOT/previous"

note "current  -> $TARGET"
note "previous -> $CURRENT"

if [ -n "$CHECK_URL" ]; then
  note "checking $CHECK_URL"
  curl --fail --silent --show-error --max-time 20 --output /dev/null "$CHECK_URL" \
    || die "rollback flipped the symlink but '$CHECK_URL' still does not answer 2xx — nginx itself may be down (sudo nginx -t && sudo systemctl status nginx)"
  note "site responded 2xx"
fi

note "done"
