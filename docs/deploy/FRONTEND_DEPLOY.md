# Frontend deployment — ARCH-OS staging

How `arch-frontend-v2` gets from a merge on `main` to
`https://arch-os-server.tailf7bd4c.ts.net/app/`, how to undo it, and what has to
exist on the server first.

**Nothing in this document has been executed against the server** — it was
written while the box was offline for relocation. Section 8 lists every fact it
assumes, with the command that confirms each one. Work through that list on
deployment day before the first run.

| | |
|---|---|
| Repository | `Arjeeah/arch-frontend-v2` (personal account — **not** the GDG org) |
| Workflow | `.github/workflows/deploy-staging.yml` |
| Trigger | push to `main`, or **Run workflow** (`workflow_dispatch`) |
| Builds on | GitHub-hosted `ubuntu-latest` |
| Publishes from | self-hosted runner labelled `[self-hosted, arch-frontend]` |
| Release root | `/var/www/arch-frontend` |
| Public URL | `https://arch-os-server.tailf7bd4c.ts.net/app/` |
| API base URL | `/api` — same origin, no CORS |

---

## 1. The runner problem, and what we decided

The self-hosted runner already on the server is registered to
**`GDG-OnCampus-LIMU/arch-backend`**. A repository-scoped runner only ever takes
jobs from the repository it was registered to, and this repository has a
different owner entirely. That runner **cannot** deploy this repository. Four
ways out:

| | Option | Cost | Verdict |
|---|---|---|---|
| **a** | Register a **second runner** on the same server, scoped to `Arjeeah/arch-frontend-v2` | One `./config.sh` run, one extra systemd service, ~200 MB of disk | **Chosen** |
| b | Move this repo into `GDG-OnCampus-LIMU` and use an **org-level runner** shared by both | Repo transfer (URL change, everyone re-points their remote, org-admin rights), org runner-group policy | Right answer eventually, too heavy now |
| c | Build on GitHub-hosted, ship `dist/` over **SSH/rsync** | The box has no conventional public SSH. Funnel publishes HTTPS on 443/8443/10000, not SSH. You would need a Tailscale OAuth client or ephemeral auth key plus `tailscale/github-action` on every run, an SSH deploy key, tailnet ACLs, and a device slot per run | Most moving parts, most secrets |
| d | Fire a **`repository_dispatch`** at `arch-backend` and let its runner do the work | A long-lived cross-repo PAT stored as a secret, frontend deploys showing up in the backend's Actions tab, the backend runner checking out a repo it has no credentials for | Worst audit trail of the four |

### Why (a)

* It is the only option that changes nothing outside this repository and the
  server. No repo transfer, no org policy, no cross-repo token.
* Two runners coexist cleanly: each gets its own directory, its own `_work`,
  and its own systemd unit (`actions.runner.<owner>-<repo>.<name>.service`), so
  the names cannot collide.
* Registration is a single one-time `./config.sh` with a token that this
  repository's own settings page hands you.
* The label `arch-frontend` (rather than reusing `staging`) makes the intent
  obvious in the workflow file, even though runner label sets are already
  scoped per repository and could not collide anyway.

**Security note.** A self-hosted runner must never take jobs from untrusted
forks: a `pull_request` job from a fork would execute attacker-controlled code
on the server. This workflow triggers only on `push` to `main` and on manual
dispatch — never on `pull_request`. Keep it that way, and keep the repository
private. `ci.yml` runs on GitHub-hosted runners and is unaffected.

### What (a) does *not* solve

If the runner is offline or its labels do not match, GitHub does not fail the
job — it leaves it **Queued**, for up to 24 hours. So:

* the `build` job writes a note into the run summary saying exactly that;
* the `publish` job's first step is a preflight that refuses to continue unless
  the server is already prepared, and it runs **before** anything is copied, so
  an unprepared server fails clean instead of half-deployed;
* section 6 explains how to deploy by hand while the runner is down.

(A workflow step *could* ask the API whether a matching runner is online, but
`GET /repos/{owner}/{repo}/actions/runners` needs administration rights, which
the built-in `GITHUB_TOKEN` cannot be granted. It would need a PAT stored as a
secret purely to produce a nicer error message. Not worth it.)

---

## 2. One origin, not two — and what that means for CORS

**Decision: the SPA is served from the same origin as the API, mounted at the
subpath `/app/`.**

Tailscale Funnel is what makes this a decision rather than a preference:

* Funnel publishes **one** hostname for this node,
  `arch-os-server.tailf7bd4c.ts.net`, and the certificate it provisions covers
  only that name. Name-based virtual hosting needs a second publicly resolvable
  name with its own certificate — this machine has neither a public IP nor
  public DNS beyond the Funnel name, so a second `server_name` is unreachable
  from outside the tailnet.
* The only "separate origin" actually available is a **different port** (Funnel
  can publish 443, 8443 and 10000). A different port is a different origin as
  far as the browser is concerned, so it buys all the cost of cross-origin with
  none of the benefit.

| | Subpath `/app/` (chosen) | Separate origin (`:8443`) |
|---|---|---|
| CORS | None. Same scheme, host and port. | Backend must allow `https://arch-os-server.tailf7bd4c.ts.net:8443` in `config/cors.php`; every non-simple request pays an `OPTIONS` preflight |
| API base URL | `/api` — root-relative | Must be absolute; hard-codes the hostname into the bundle |
| TLS | One Funnel cert, already working | A second Funnel port to publish and keep published |
| Config to maintain | One nginx snippet in this repo | nginx server block **plus** an allow-list in the backend repo, kept in sync |
| Failure mode | 404 if the location is missing — loud and local | Silent CORS errors in the browser console, invisible to `curl` |

Because the two share an origin, the app is built with
**`VITE_API_BASE_URL=/api`** — root-relative, with the leading slash. Axios
(`src/app/plugins/axios.ts`) resolves it against the page origin, so
`https://…/app/students/12` calls `https://…/api/v1/students/12`. The leading
slash matters: `api` without it would resolve relative to `/app/` and hit
`/app/api/…`.

`src/app/config/env.ts` already handles this correctly — it falls back to the
absolute staging URL only when the variable is blank, and `/api` is not blank.
The absolute default keeps working too; the relative form is preferred because
it survives the hostname changing and works over any tunnel.

Vite is built with `--base=/app/`, which does two things at once: it prefixes
every asset URL, and it sets `import.meta.env.BASE_URL`, which
`src/app/router/index.ts` passes to `createWebHistory()`. So the router's base,
the asset URLs and the nginx location are all the same string, set in one place
— `APP_BASE` at the top of the workflow. Changing it means changing the nginx
snippet too (see section 10).

---

## 3. One-time server setup

Everything here is done once, as a human, on the box. Nothing in it is
automated, because all of it needs `sudo` and the pipeline deliberately needs
none.

Throughout, `RUNNER_USER` is the OS user the GitHub Actions runner runs as —
**use the same user as the existing backend runner**. Find it with:

```bash
systemctl show -p User --value "$(systemctl list-units --type=service --no-legend 'actions.runner.*' | awk '{print $1}' | head -1)"
```

### 3.1 Directories and permissions

```bash
sudo install -d -o "$RUNNER_USER" -g www-data -m 2755 /var/www/arch-frontend
sudo install -d -o "$RUNNER_USER" -g www-data -m 2755 /var/www/arch-frontend/releases
```

The runner user owns the tree (it creates and deletes releases and rewrites the
symlinks); `www-data` — nginx — only needs to read, which `755` plus the
`chmod -R u=rwX,go=rX` the publish script applies to each release provides. The
setgid bit (`2755`) makes every release directory inherit the `www-data` group,
so a release is readable by nginx even if the runner's umask changes.
`current` and `previous` are created by the first deploy; do not create them by
hand, and never replace `current` with a real directory (the atomic flip uses
`rename(2)`, which cannot replace a directory).

Confirm nginx can traverse the path:

```bash
sudo -u www-data test -x /var/www/arch-frontend && echo traversable
```

### 3.2 Install the helper scripts for humans

The pipeline runs the copies from its own checkout, so they always match the
commit being deployed. These copies are for you, at 2 a.m., when the pipeline is
not the thing you want to be using:

```bash
sudo install -m 755 deploy/scripts/rollback.sh        /usr/local/bin/arch-frontend-rollback
sudo install -m 755 deploy/scripts/publish-release.sh /usr/local/bin/arch-frontend-publish
```

Refresh them whenever those scripts change in the repo.

### 3.3 nginx

`deploy/nginx/arch-frontend.conf` is a **location snippet**, not a server block.
Install it and include it from the existing backend vhost:

```bash
sudo install -d -m 755 /etc/nginx/snippets
sudo install -m 644 deploy/nginx/arch-frontend.conf /etc/nginx/snippets/arch-frontend.conf

# Find the backend vhost:
grep -Rl 'arch-os' /etc/nginx/sites-enabled/
```

Add one line inside that `server { … }` block, at the same level as its
`location` blocks:

```nginx
include /etc/nginx/snippets/arch-frontend.conf;
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**The pipeline never touches nginx.** It has no `sudo`, and a deploy is only a
symlink flip. If `deploy/nginx/arch-frontend.conf` changes in the repo, the copy
in `/etc/nginx/snippets/` stays as it is until someone repeats the two commands
above — a deploy will appear to succeed while serving the old rules, and the
post-deploy checks in section 7 are what catches it.

Check the vhost for anything that would fight the snippet:

* an `open_file_cache` directive — it caches the path behind `current` and would
  keep serving a pruned release. Remove it, or scope it away from `/app/`.
* a server-level `add_header` — nginx does not merge `add_header` across levels,
  so any header set on the server block is dropped for `/app/` responses. Repeat
  the ones you need inside the snippet's blocks.
* a regex location (`location ~ …`) that could match `/app/…`. The snippet uses
  `^~` prefixes specifically to stop regex evaluation, so this should be
  harmless, but confirm.

After the first deploy, `/app/` serves the SPA and everything else in that
server block — `/api`, `/up`, `/storage` — behaves exactly as before.

### 3.4 Register the second runner

Get a registration token from **this repository**:
`https://github.com/Arjeeah/arch-frontend-v2` → **Settings → Actions → Runners →
New self-hosted runner → Linux x64**. That page prints the current runner
version, the exact download URL and a token that **expires in one hour**. Use
the URL it gives you rather than a version copied from here.

```bash
sudo install -d -o "$RUNNER_USER" -g "$RUNNER_USER" /opt/actions-runner-frontend
sudo -u "$RUNNER_USER" -H bash
cd /opt/actions-runner-frontend

# URL and filename come from the "New self-hosted runner" page:
curl -o actions-runner-linux-x64.tar.gz -L "<URL FROM THE PAGE>"
tar xzf actions-runner-linux-x64.tar.gz

./config.sh \
  --url https://github.com/Arjeeah/arch-frontend-v2 \
  --token "<TOKEN FROM THE PAGE>" \
  --name arch-os-frontend \
  --labels arch-frontend \
  --work _work \
  --unattended --replace
exit

cd /opt/actions-runner-frontend
sudo ./svc.sh install "$RUNNER_USER"
sudo ./svc.sh start
sudo ./svc.sh status
```

Notes:

* `self-hosted` is applied automatically; only `arch-frontend` needs declaring.
  The workflow asks for `[self-hosted, arch-frontend]`.
* A separate directory is required — two runners cannot share one installation
  or one `_work`.
* `svc.sh install` names the unit after owner, repo and runner name, so it
  cannot collide with the backend runner's unit.
* The runner needs outbound HTTPS to `github.com` and
  `*.actions.githubusercontent.com` (it already does, for the backend runner)
  and nothing inbound.
* Confirm it appears as **Idle** on the Runners page before the first deploy.

### 3.5 Repository variable

**Settings → Secrets and variables → Actions → Variables → New repository
variable**: `VITE_API_BASE_URL` = `/api`.

It is a *variable*, not a secret — it is compiled into the bundle and visible to
anyone who opens devtools, so a secret would be false comfort. If it is unset
the workflow defaults to `/api` anyway; setting it explicitly makes the value
discoverable without reading the workflow. The workflow rejects anything that is
not root-relative or `https://` (plain `http://` is blocked by the browser as
mixed content on an HTTPS page).

### 3.6 TLS and Funnel

Nothing to do, as long as the SPA stays on the shared origin: Funnel already
terminates TLS for `arch-os-server.tailf7bd4c.ts.net` and forwards to nginx, and
`/app/` is just another path on that same server block. Confirm the mapping
before the first deploy:

```bash
sudo tailscale funnel status
```

The post-deploy checks talk to `http://127.0.0.1` with an explicit
`Host: arch-os-server.tailf7bd4c.ts.net` header, which is what a Funnel-proxied
request looks like to nginx. If Funnel forwards to a port other than 80, the
checks in the workflow need that port added — see section 8.

---

## 4. How the pipeline works

Two jobs, and the split is the point.

### `build` — GitHub-hosted `ubuntu-latest`

1. `npm ci` (not `npm install`: a deploy honours the lockfile exactly).
2. The same four gates `ci.yml` runs, in the same order: `lint:check`,
   `prettier --check src/`, `type-check`, the generator smoke test. **A build
   that fails a gate is never published.**
3. Resolve `VITE_API_BASE_URL`: dispatch input → repository variable → `/api`,
   rejecting `http://` and protocol-relative values.
4. `vite build --base=/app/`.
5. Assert the output: `dist/index.html` exists, `dist/assets/` exists, and the
   index actually references `/app/assets/…` (i.e. `--base` took effect — miss
   this and every asset 404s behind nginx).
6. Write `RELEASE.txt` (commit, ref, run id, build time, API base URL) *outside*
   `dist/`, so it never becomes web-reachable.
7. Upload `dist/` + `RELEASE.txt` as the `spa-dist` artifact.

The server therefore needs no Node.js, no npm registry access and no build
cache, and the gates run on a clean machine every time.

### `publish` — self-hosted `[self-hosted, arch-frontend]`

1. **Preflight.** Release root and `releases/` exist and are writable by the
   runner user; `current` is a symlink or absent; GNU coreutils and `curl` are
   present; ≥256 MB free; nginx appears to reference the release root
   (advisory — `/etc/nginx` may not be readable). Any hard failure exits with
   the exact command to fix it, **before anything is copied**.
2. Sparse-checkout of `deploy/` only — the scripts that run are the ones from
   the commit being deployed.
3. Download the `spa-dist` artifact.
4. `deploy/scripts/publish-release.sh` — the atomic part, below.
5. Verify (section 7).
6. On failure after the flip: roll back automatically.

### The atomic release

```
/var/www/arch-frontend/
├── releases/
│   ├── 20260826-141530-a1b2c3d/     ← this deploy
│   │   ├── RELEASE.txt              ← not under the web root
│   │   └── app/                     ← nginx root + /app/ = here
│   │       ├── index.html
│   │       └── assets/index-<hash>.js
│   └── 20260826-120411-9f8e7d6/     ← the one before
├── current  -> releases/20260826-141530-a1b2c3d
└── previous -> releases/20260826-120411-9f8e7d6
```

Two `rename(2)` calls do all the work:

1. The release is assembled in `releases/.incoming-<id>/`, permissions are set,
   `index.html` is confirmed present — and only then is it `mv -T`'d to its real
   name. A release directory is never observed half-written.
2. The flip is `ln -s releases/<id> .current.tmp` followed by
   `mv -Tf .current.tmp current`. `rename(2)` over an existing symlink is
   atomic, so a request in flight resolves either entirely to the old release or
   entirely to the new one. There is no window in which `current` is missing,
   and no `cp` ever writes into a directory nginx is serving.

Both depend on staging and destination sharing a filesystem, which is why
everything lives under one root.

nginx needs no reload: it resolves the symlink per request (as long as
`open_file_cache` is off, see 3.3), so the flip is live immediately.

The outgoing release is recorded as `previous` before the flip. Releases are
pruned to the newest 5, and the targets of `current` and `previous` are never
pruned even if they fall outside that window.

Release ids are `<UTC yyyymmdd-HHMMSS>-<short sha>`, so they sort
chronologically and name the commit they came from.

---

## 5. Rolling back

One command, on the server, as the runner user:

```bash
arch-frontend-rollback
```

It flips `current` back to whatever `previous` points at, using the same atomic
rename, and **swaps** the two — so running it a second time returns you to where
you started. No nginx reload, no downtime, no rebuild.

```bash
arch-frontend-rollback --list                       # what is still on disk
arch-frontend-rollback --release 20260826-120411-9f8e7d6
arch-frontend-rollback --check-url http://127.0.0.1/app/   # verify afterwards
```

Run it as the owner of `/var/www/arch-frontend`, not as root — root-owned
symlinks would break the next deploy. If you are logged in as someone else:

```bash
sudo -u "$(stat -c %U /var/www/arch-frontend)" arch-frontend-rollback
```

The pipeline does this for you when its own verification fails after a flip, so
a bad deploy is undone before the run ends. It cannot help if the failure comes
*before* the flip — but in that case the live site was never touched.

Raw equivalent, if the script is missing:

```bash
cd /var/www/arch-frontend
ln -sfn "$(readlink previous)" .current.tmp && mv -Tf .current.tmp current
```

---

## 6. Deploying by hand when the runner is down

Build locally, copy over the tailnet, publish with the same script. The result
is byte-identical to what the pipeline produces.

```bash
# 1. On your machine, in a clean checkout of the commit you want live
npm ci
npm run lint:check && npx prettier --check src/ && npm run type-check
VITE_API_BASE_URL=/api npm run build-only -- --base=/app/
tar -czf /tmp/arch-frontend-dist.tgz -C dist .

# 2. Copy it over Tailscale (MagicDNS name; no public SSH is involved)
scp /tmp/arch-frontend-dist.tgz arch-os-server:/tmp/
#   or, with Tailscale SSH: tailscale file cp /tmp/arch-frontend-dist.tgz arch-os-server:

# 3. On the server, as the runner user
mkdir -p /tmp/arch-frontend-dist
tar -xzf /tmp/arch-frontend-dist.tgz -C /tmp/arch-frontend-dist
arch-frontend-publish \
  --root /var/www/arch-frontend \
  --source /tmp/arch-frontend-dist \
  --subdir app \
  --release-id "$(date -u +%Y%m%d-%H%M%S)-manual"

# 4. Verify (section 7), and clean up
rm -rf /tmp/arch-frontend-dist /tmp/arch-frontend-dist.tgz
```

`publish-release.sh` is deliberately CI-agnostic: it takes a source directory
and does the same staging, flip, `previous` bookkeeping and prune. Manual
releases are tagged `-manual` in their id so they are obvious in `--list`.

---

## 7. What gets verified, and how to check by hand

After the flip the pipeline runs four checks against the real nginx, over the
loopback with the public `Host` header:

1. `GET /app/` returns 2xx **and the served HTML names the hashed asset from the
   release just published** — proving nginx is serving the new release and not a
   cached or differently-rooted one.
2. `GET /app/` is served with `Cache-Control: no-store` — proving the
   never-cache-the-index rule is live. Without it, browsers pin themselves to a
   release that will be pruned.
3. The hashed asset itself returns 2xx with an `immutable` `Cache-Control`.
4. `GET /app/students/1` returns the same entry document — proving the
   `try_files` history fallback works, so deep links and refreshes do not 404.

Any failure rolls the release back. The same checks by hand:

```bash
H='Host: arch-os-server.tailf7bd4c.ts.net'
ASSET=$(grep -o 'src="[^"]*/assets/[^"]*\.js"' /var/www/arch-frontend/current/app/index.html \
        | head -1 | sed -e 's/^src="//' -e 's/"$//')
curl -sS -H "$H" http://127.0.0.1/app/ | grep -F "$ASSET"          # new release live
curl -sSI -H "$H" http://127.0.0.1/app/ | grep -i cache-control     # no-store
curl -sSI -H "$H" "http://127.0.0.1$ASSET" | grep -i cache-control  # immutable
curl -sS  -H "$H" http://127.0.0.1/app/students/1 | grep -F "$ASSET" # history fallback
cat /var/www/arch-frontend/current/RELEASE.txt                       # what is live
```

And from a browser on the public URL, once: the favicon loads
(`/app/favicon.ico`), a hard refresh on a deep link works, and the network tab
shows API calls going to `/api/v1/…` on the same origin.

---

## 8. Assumptions to confirm on deployment day

None of this could be tested — the server was offline. Confirm each row before
or during the first deploy.

| # | Assumption | Confirm with | If wrong |
|---|---|---|---|
| 1 | The runner OS user can write `/var/www/arch-frontend` | `sudo -u "$RUNNER_USER" touch /var/www/arch-frontend/.probe && rm /var/www/arch-frontend/.probe` | Preflight fails with the `chown` command to run |
| 2 | The backend vhost file, and its name | `grep -Rl 'arch-os' /etc/nginx/sites-enabled/` | 3.3 assumes one vhost owns the Funnel hostname |
| 3 | nginx answers the backend on **port 80** of the loopback | `curl -sSI -H 'Host: arch-os-server.tailf7bd4c.ts.net' http://127.0.0.1/up` | Add the port to `ORIGIN` in the workflow's verify step and to section 7 |
| 4 | Funnel forwards the public hostname to that nginx | `sudo tailscale funnel status` | Re-point Funnel, or adjust the verify step |
| 5 | No `open_file_cache` in that vhost or in `nginx.conf` | `grep -R open_file_cache /etc/nginx/` | Deploys appear to succeed but serve the old release |
| 6 | No server-level `add_header` that must survive into `/app/` | `grep -n add_header <vhost>` | Repeat those headers inside the snippet |
| 7 | No regex `location` that could capture `/app/…` | `grep -n 'location ~' <vhost>` | `^~` should already win; verify with `curl` |
| 8 | nginx runs as `www-data` | `ps -o user= -C nginx \| sort -u` | Adjust the group in 3.1 |
| 9 | Runner version supports `actions/upload-artifact@v4` (≥ 2.316) | `/opt/actions-runner-frontend/config.sh --version` | Update the runner (`svc.sh stop`, re-extract, `svc.sh start`) |
| 10 | Outbound HTTPS to github.com from the server | the backend runner already works, so yes | Artifact download fails |
| 11 | The API really is at `/api` on that origin | `curl -sS -H 'Host: …' http://127.0.0.1/api/v1/… ` | Change `VITE_API_BASE_URL` |
| 12 | ≥ 256 MB free under `/var/www` (5 releases × build size) | `df -h /var/www` | Preflight fails; lower `KEEP_RELEASES` |
| 13 | `/var/www/arch-frontend` is one filesystem (no bind-mount inside it) | `df /var/www/arch-frontend /var/www/arch-frontend/releases` | The atomic renames stop being atomic |
| 14 | GNU coreutils and GNU `find` (`mv -T`, `find -printf`) | `mv --version` | Preflight fails; the scripts are Linux-only by design |
| 15 | Actions is enabled for this repo and self-hosted runners are permitted | Settings → Actions → General | Registration in 3.4 will say so |
| 16 | The server's clock is roughly correct (release ids are UTC timestamps) | `timedatectl` | Release ids sort wrongly; pruning could drop the wrong one |
| 17 | Vite rewrites `/favicon.ico` in `index.html` to `/app/favicon.ico` | `grep favicon /var/www/arch-frontend/current/app/index.html` | Only the favicon 404s; harmless, fix by moving the reference |

The pipeline needs **no `sudo`** on the server. Only section 3 does. If a
deploy ever seems to need root, something in section 3 was skipped.

---

## 9. Troubleshooting

**The `publish` job sits at "Queued".**
No runner in *this* repository matches `[self-hosted, arch-frontend]`. Check
Settings → Actions → Runners: the runner should be **Idle**, not Offline, and
its labels must include `arch-frontend`. `sudo ./svc.sh status` in
`/opt/actions-runner-frontend`. GitHub will not fail the job for 24 hours.
Remember the backend's runner cannot take this job, however healthy it looks.

**Preflight fails with "release root does not exist".**
Section 3.1 was never run, or was run on a different path. The error message
carries the exact `install` command.

**Deep links 404, but `/app/` works.**
The `location ^~ /app/` block, or its `try_files … /app/index.html`, is missing
from the included snippet. `sudo nginx -T | grep -A5 'location ^~ /app/'`.

**Everything 403s.**
`www-data` cannot traverse or read the release. Check that every directory from
`/var/www` down is `o+x` and that files are `o+r`:
`namei -l /var/www/arch-frontend/current/app/index.html`.

**The site shows the old build after a successful deploy.**
Either `open_file_cache` is on (assumption 5), or your browser cached
`index.html` — confirm with `curl -sSI` that `Cache-Control: no-store` is being
sent, then hard-reload.

**Blank page, console full of 404s for `/assets/…` (no `/app` prefix).**
The build did not get `--base=/app/`. The build job's "Verify build output" step
should have caught it; if it did not, the mount point and `APP_BASE` disagree.

**Browser console: "Mixed Content" or CORS errors on API calls.**
`VITE_API_BASE_URL` was built as `http://…` or as an absolute URL on a different
origin. It should be `/api`. Rebuild — the value is baked into the bundle, so
nothing on the server can fix it.

**Disk filling up under `/var/www`.**
Pruning keeps 5 releases plus whatever `current`/`previous` point at. Lower
`KEEP_RELEASES` in the workflow, or remove old release directories by hand —
never the ones those two symlinks reference.

---

## 10. Later: promoting the SPA to the origin root

If the SPA should live at `https://arch-os-server.tailf7bd4c.ts.net/` rather
than `/app/`, three things change together and must change together:

1. `APP_BASE: /` in the workflow. `SUBDIR` then computes to empty and the
   publish script puts the build at the release root instead of in `app/`.
2. nginx: the backend vhost's `location /` has to stop being Laravel's
   catch-all. Give Laravel explicit prefixes (`/api`, `/up`, `/storage`,
   `/sanctum`) and let the SPA own `/` with `try_files $uri $uri/ /index.html`
   and `root /var/www/arch-frontend/current`. This is the risky edit — it
   changes how every existing backend URL is routed, so do it with
   `nginx -t`, a rehearsal on a copy of the vhost, and the backend's `/up`
   endpoint in front of you.
3. The verify step's paths (`/`, `/students/1`) and section 7's commands.
4. `RELEASE.txt` stops being safely out of reach. With `SUBDIR` empty the
   release root *is* the web root, so add
   `location = /RELEASE.txt { deny all; }` — see the standalone example config,
   which already carries that block.

`VITE_API_BASE_URL` does **not** change: `/api` is root-relative and stays
correct either way. Neither does the rollback mechanism.

Until there is a reason to take that risk, `/app/` costs one path segment and
nothing else.
