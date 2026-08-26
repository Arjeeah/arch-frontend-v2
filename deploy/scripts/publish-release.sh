#!/usr/bin/env bash
#
# Publish a built SPA (a Vite `dist/`) into a timestamped release directory and
# flip the `current` symlink atomically, keeping the outgoing release as
# `previous` for a one-command rollback.
#
# Layout it maintains under --root (default /var/www/arch-frontend):
#
#   releases/20260826-141530-a1b2c3d/       one immutable release
#     RELEASE.txt                           metadata, NOT under the web root
#     app/index.html                        <- --subdir, matches the nginx mount
#     app/assets/index-<hash>.js
#   current  -> releases/20260826-141530-a1b2c3d     (nginx `root`)
#   previous -> releases/20260826-120411-9f8e7d6     (rollback target)
#
# Two properties make this safe to run against a live site:
#   1. the release is assembled in a hidden `.incoming-*` directory and moved
#      into place with rename(2), so a release directory is never half-written;
#   2. the symlink flip is `ln -s` to a temp name + `mv -T`, which is also
#      rename(2) — a request either sees the whole old release or the whole new
#      one, never a mixture.
#
# Both properties need the staging directory and the final directory to be on
# the SAME filesystem, which is why everything lives under one root.
#
# Requires GNU coreutils (`mv -T`, `find -printf`) — i.e. run it on the Ubuntu
# server, not on macOS.
#
# Usage:
#   publish-release.sh --source dist [--root DIR] [--subdir app]
#                      [--release-id ID] [--meta FILE] [--keep 5]
#
# See docs/deploy/FRONTEND_DEPLOY.md.

set -euo pipefail

ROOT="/var/www/arch-frontend"
SOURCE=""
META=""
RELEASE_ID=""
SUBDIR="app"
KEEP="5"

die() { echo "ERROR: $*" >&2; exit 1; }
note() { echo "==> $*"; }

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed -e 's/^# \{0,1\}//' -e '$d'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --root)       ROOT="${2:?--root needs a value}"; shift 2 ;;
    --source)     SOURCE="${2:?--source needs a value}"; shift 2 ;;
    --meta)       META="${2:?--meta needs a value}"; shift 2 ;;
    --release-id) RELEASE_ID="${2:?--release-id needs a value}"; shift 2 ;;
    --subdir)     SUBDIR="${2?--subdir needs a value (may be empty)}"; shift 2 ;;
    --keep)       KEEP="${2:?--keep needs a value}"; shift 2 ;;
    -h|--help)    usage; exit 0 ;;
    *)            die "unknown argument: $1 (try --help)" ;;
  esac
done

# ── Validate the inputs ──────────────────────────────────────────────────────
[ -n "$SOURCE" ] || die "--source is required (the built dist/ directory)"
[ -d "$SOURCE" ] || die "--source '$SOURCE' is not a directory"
[ -f "$SOURCE/index.html" ] || die "'$SOURCE/index.html' is missing — that is not a Vite build"
[ -d "$SOURCE/assets" ] || die "'$SOURCE/assets' is missing — that is not a Vite build"

case "$KEEP" in ''|*[!0-9]*) die "--keep must be a number, got '$KEEP'" ;; esac

[ -n "$RELEASE_ID" ] || RELEASE_ID="$(date -u +%Y%m%d-%H%M%S)-manual"
case "$RELEASE_ID" in
  *[!A-Za-z0-9._-]*) die "--release-id may only contain A-Z a-z 0-9 . _ - (got '$RELEASE_ID')" ;;
  .*)                die "--release-id may not start with a dot (got '$RELEASE_ID')" ;;
esac

case "$SUBDIR" in
  */*|.|..) die "--subdir must be a single directory name or empty (got '$SUBDIR')" ;;
esac

mv --version >/dev/null 2>&1 || die "GNU coreutils required (this script needs 'mv -T'); run it on the server"

# ── Validate the server layout ───────────────────────────────────────────────
[ -d "$ROOT" ] || die "release root '$ROOT' does not exist — see docs/deploy/FRONTEND_DEPLOY.md §3.1"
[ -d "$ROOT/releases" ] || die "'$ROOT/releases' does not exist — see docs/deploy/FRONTEND_DEPLOY.md §3.1"
[ -w "$ROOT" ] || die "'$ROOT' is not writable by '$(id -un)' (the current/previous symlinks live there)"
[ -w "$ROOT/releases" ] || die "'$ROOT/releases' is not writable by '$(id -un)'"
if [ -e "$ROOT/current" ] && [ ! -L "$ROOT/current" ]; then
  die "'$ROOT/current' exists and is not a symlink; the atomic flip cannot replace a real directory"
fi

NEW="$ROOT/releases/$RELEASE_ID"
STAGE="$ROOT/releases/.incoming-$RELEASE_ID"
[ -e "$NEW" ] && die "release '$RELEASE_ID' already exists at '$NEW'"

# The staging directory is disposable: if anything below fails, remove it and
# leave the live site exactly as it was.
cleanup() { rm -rf -- "$STAGE"; }
trap cleanup EXIT

# ── Assemble the release out of the way ──────────────────────────────────────
note "assembling release $RELEASE_ID"
rm -rf -- "$STAGE"
TARGET="$STAGE${SUBDIR:+/$SUBDIR}"
mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"

if [ -n "$META" ] && [ -f "$META" ]; then
  cp -a "$META" "$STAGE/RELEASE.txt"
fi
{
  echo "release_id=$RELEASE_ID"
  echo "published_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "published_by=$(id -un)@$(hostname)"
  echo "subdir=${SUBDIR:-<root>}"
} >> "$STAGE/RELEASE.txt"

# nginx runs as www-data and only needs to read; dirs must stay traversable.
chmod -R u=rwX,go=rX "$STAGE"

[ -f "$TARGET/index.html" ] || die "internal error: '$TARGET/index.html' missing after copy"

# rename(2): the release directory appears complete or not at all.
mv -T "$STAGE" "$NEW"
note "release staged at $NEW"

# ── Flip ─────────────────────────────────────────────────────────────────────
PREVIOUS=""
if [ -L "$ROOT/current" ]; then
  PREVIOUS="$(readlink "$ROOT/current")"
fi

# Relative link targets, so the whole tree can be moved or bind-mounted.
ln -sfn "releases/$RELEASE_ID" "$ROOT/.current.tmp"
mv -Tf "$ROOT/.current.tmp" "$ROOT/current"
note "current -> releases/$RELEASE_ID"

# IMMEDIATELY after the flip, and before anything else that can fail. This one
# line is what tells the workflow the live site changed; the workflow decides
# whether to roll back from it, and prints "the live site was not touched" when
# it is absent. Under `set -e` any failure between the flip and this write —
# a stale real directory at `previous`, ENOSPC — would kill the script with the
# new, unverified release already live and the workflow reporting the opposite.
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "flipped=1"
    echo "release_id=$RELEASE_ID"
  } >> "$GITHUB_OUTPUT"
fi

if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "releases/$RELEASE_ID" ]; then
  ln -sfn "$PREVIOUS" "$ROOT/.previous.tmp"
  mv -Tf "$ROOT/.previous.tmp" "$ROOT/previous"
  note "previous -> $PREVIOUS"
else
  note "no earlier release to record as 'previous'"
fi

# Bookkeeping only — a rollback reads the `previous` SYMLINK, not this output.
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "previous=$PREVIOUS" >> "$GITHUB_OUTPUT"
fi

# ── Prune ────────────────────────────────────────────────────────────────────
# Abandoned staging directories from a killed run (never web-reachable).
find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -name '.incoming-*' -mmin +120 \
  -exec rm -rf -- {} + 2>/dev/null || true

CUR_KEEP="$(basename "$(readlink "$ROOT/current" 2>/dev/null || echo '')")"
PREV_KEEP="$(basename "$(readlink "$ROOT/previous" 2>/dev/null || echo '')")"

seen=0
while IFS= read -r name; do
  [ -n "$name" ] || continue
  case "$name" in .*) continue ;; esac
  seen=$((seen + 1))
  [ "$seen" -le "$KEEP" ] && continue
  if [ "$name" = "$CUR_KEEP" ] || [ "$name" = "$PREV_KEEP" ]; then
    note "keeping $name (still referenced)"
    continue
  fi
  note "pruning old release $name"
  rm -rf -- "${ROOT:?}/releases/$name"
done <<EOF
$(find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | LC_ALL=C sort -r)
EOF

note "done — $RELEASE_ID is live"
