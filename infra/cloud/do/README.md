# Doikayt wiki — cloud deployment (DigitalOcean)

Run all Terraform commands from this directory (`infra/cloud/do/`).

This is the DigitalOcean-specific half of the cloud deployment; the
provider-agnostic half (the actual wiki application) lives in `infra/`
one level up and is identical whether it's running on your laptop or a
droplet. If another cloud provider is ever added, it would live as a
sibling directory (`infra/cloud/<provider>/`) reusing that same `infra/`
stack — DigitalOcean is the default and, for now, the only one.

Why the split holds up across providers: `cloud-init.yaml.tpl` isn't a
DigitalOcean thing. `cloud-init` is a standard first-boot tool that
ships pre-installed on almost every cloud provider's Linux images (AWS,
Azure, GCP, DigitalOcean, etc.) — whoever creates the instance hands it
a block of config text (`user_data`), and an OS-level service already
running on the machine reads and executes that config once, on first
boot. Only the Terraform *resource* that creates the droplet/instance
and attaches `user_data` to it is DigitalOcean-specific (that's what
lives in `main.tf`). So a future `infra/cloud/aws/` would need its own
`main.tf` (different resource types, different variable names) but
could likely reuse `cloud-init.yaml.tpl` almost as-is, since the
install-Docker/clone-repo/run-bootstrap steps inside it don't care which
cloud they're running on.

## Architecture

```
You, manually: terraform init / plan / apply
  |             (run from a terminal in this directory -- nothing here
  |              is automated or wired into CI; you invoke each step)
  v
Terraform (this directory)
  |
  |-- provisions: droplet, firewall (22/80/443 only), reserved IP
  |-- injects via cloud-init: packages, `dev` user, GitHub read token
  v
cloud-init (automatic, first boot only -- see below)
  |
  |-- installs Docker, Node.js, ufw, swap
  |-- clones https://github.com/doikayt/qwiki.git as `dev`
  |-- adds a `reload` shell alias
  |-- runs infra/scripts/launch-in-cloud.sh once
  v
infra/ (provider-agnostic, same on laptop and droplet)
  |
  |-- docker-compose.yml       -- mediawiki + mariadb (always)
  |-- docker-compose.prod.yml  -- + Caddy (droplet only, auto-detected)
  |-- Caddyfile                -- TLS + reverse proxy for wiki.doikayt.org
  |-- LocalSettings.php        -- $wgServer reads WIKI_SERVER_URL env var
  |-- scripts/launch-docker.sh -- picks the right compose files for the
  |                               environment (probes DO's metadata
  |                               service to tell droplet from laptop)
  |-- scripts/launch-in-cloud.sh -- first-time bootstrap (wipes+installs
  |                                  MediaWiki fresh, then deploys content)
  |-- scripts/lightweight-reload.sh -- day-2 updates: git pull + redeploy
  |                                     content, never touches the DB
```

Two different mechanisms exist on purpose, so they can't be confused:
**`launch-in-cloud.sh`** installs MediaWiki from scratch (wipes the DB) and
runs once, either by hand or via cloud-init on first boot.
**`lightweight-reload.sh`** (the `reload` alias) is the routine "I pushed a
change, deploy it" path —
it checks the wiki is actually up first and bails if not, then pulls,
reinstalls npm deps, and redeploys content. It never wipes anything.

### How each stage actually gets triggered

- **Terraform (`init`/`plan`/`apply`/`destroy`) is entirely manual.**
  There's no automation, no CI job, no schedule — you type these
  commands yourself from a terminal in this directory (see "First-time
  setup" below). Terraform's only job is to talk to the DigitalOcean API
  and hand the droplet a block of text called `user_data`, which in our
  case is the rendered `cloud-init.yaml.tpl`.
- **cloud-init runs itself, automatically, exactly once.** Ubuntu's
  DigitalOcean image ships with `cloud-init` pre-installed as a systemd
  service. On a droplet's very first boot, that service reads the
  `user_data` Terraform provided (via DigitalOcean's metadata service,
  not anything Terraform pushes over SSH) and executes the `write_files`
  and `runcmd` steps in it. This is why `launch-in-cloud.sh` runs without
  anyone SSHing in: cloud-init itself invokes it, as the last `runcmd`
  step, once Docker/Node/the GitHub read token/the git clone are all in place.
  Cloud-init tracks that it already ran (`cloud-init status`) and will
  **not** re-run on subsequent reboots — only a fresh droplet (e.g.
  after `terraform apply` forces a replace) triggers it again.
- You can watch it happen after `terraform apply` by SSHing in and
  running `cloud-init status --wait`, which blocks until the whole
  `runcmd` sequence (including the wiki bootstrap) finishes.

## Network

- **Firewall** (`main.tf`): 80 and 443 are open to the internet; 22
  (SSH) is restricted to the operator's own IP(s) -- not `0.0.0.0/0` --
  to keep internet-wide SSH scanner background noise from eating into
  `sshd`'s `MaxStartups` budget (observed live: enough concurrent
  scanner connections can get real connection attempts randomly
  dropped). IPv4 is auto-detected at apply time via
  `data.http.my_public_ipv4`, so a full teardown/rebuild always picks
  up whatever IP is current; IPv6 is a manually-set `/64` ISP prefix
  (`ssh_allowed_source_ipv6_cidr`) rather than an exact address, since
  privacy-extension addresses rotate the host portion periodically but
  the ISP-assigned prefix stays stable. MediaWiki's container still
  publishes host port 8080 (see `infra/docker-compose.yml`), but that's
  for reaching it directly over SSH/localhost during setup and
  debugging -- the firewall makes it unreachable from the public
  internet regardless of what's published.
- **Reserved IP**: a droplet's own public IP changes if it's ever
  destroyed and recreated (e.g. after a `user_data`/cloud-init change,
  which forces replacement). `digitalocean_reserved_ip.wiki` is a
  separate, stable IP attached to the droplet, protected with
  `lifecycle { prevent_destroy = true }` so `terraform destroy` can't
  drop it by accident. **Point your DNS at the reserved IP, not the
  droplet's own `droplet_ip` output.**
- **DNS**: an A record for `wiki.doikayt.org` -> the reserved IP,
  managed in Porkbun (see "DNS setup" below). DNS records only carry a
  hostname -> IP mapping, never a port.
- **TLS**: Caddy (`infra/docker-compose.prod.yml` + `infra/Caddyfile`)
  terminates HTTPS on 443 and reverse-proxies to the `mediawiki`
  container, requesting a Let's Encrypt certificate automatically the
  first time it sees a real request for `wiki.doikayt.org`. This only
  works once the A record actually resolves to this droplet -- Let's
  Encrypt's HTTP-01 challenge needs to reach port 80 here.

## Prerequisites

- Terraform installed (`terraform -version` to check)
- A DigitalOcean API token (generate at cloud.digitalocean.com/account/api/tokens)
- A dedicated SSH keypair for droplet login only -- **do not reuse your
  main personal SSH key** (e.g. the one tied to your everyday GitHub
  account):
  ```
  ssh-keygen -t ed25519 -f ~/.ssh/doikayt_do_login -N ""
  ```
  Public half -> registered with DigitalOcean (`ssh_public_key_path`) so
  you can `ssh dev@<ip>`. That's its only job -- it has nothing to do
  with GitHub or git access (see the project's SSH key break-out plan
  for why those are kept separate). Your everyday personal key (e.g.
  `~/.ssh/id_rsa`) is unrelated and should stay off this droplet entirely.
- A GitHub fine-grained personal access token (`doikayt-org-read-token`)
  for git clone/pull, kept out of `~/.ssh` entirely -- see "GitHub read
  token setup" below.

## GitHub read token setup

1. On GitHub: **Settings -> Developer settings -> Personal access tokens
   -> Fine-grained tokens -> New token**.
2. Name it `doikayt-org-read-token`. Resource owner: `doikayt`. Repository
   access: **All repositories** (covers current + future repos). Under
   **Repository permissions**, set **Contents: Read-only** -- leave
   everything else, including all of **Organization permissions**, untouched.
3. Generate, and copy the token value immediately -- GitHub won't show
   it again.
4. Store it in Bitwarden as its own item (Secure Note or Login, either
   works) named `doikayt-org-read-token` -- this repo's convention is one
   vault item per secret, named identically to the credential's name on
   its origin platform. Do not put it in `~/.bashrc` or any plaintext file.
5. `direnv allow` in this directory (once, or whenever `.envrc` changes).
   `.envrc` here pulls the token straight from that Bitwarden item and
   exports it as `TF_VAR_github_read_token` -- you shouldn't need to set
   it by hand. It'll prompt for your Bitwarden master password to unlock
   the vault whenever `BW_SESSION` isn't already set in your shell.

This token is what cloud-init copies onto the droplet (as
`~/.git-credentials`, via a `git config --global credential.helper store`)
so it can `git clone`/`pull` over HTTPS -- it has nothing to do with SSH
or the `doikayt_do_login` keypair above.

## First-time setup

1. None of the required variables need setting by hand -- `.envrc` in
   this directory pulls all three secrets from Bitwarden automatically
   and exports them as `TF_VAR_*`:
   - `do_token` <- Secure Note `doikayt-do-api-token`
   - `github_read_token` <- Secure Note `doikayt-org-read-token`
     (see "GitHub read token setup" above)
   - `wiki_admin_password` <- Login item `doikayt-wiki-admin-password`

   `direnv allow` once in this directory and all three are handled every
   time you `cd` in. (`ssh_public_key_path` already defaults to
   `~/.ssh/doikayt_do_login.pub` -- only override it if you generated
   the key somewhere else. `terraform.tfvars`/`terraform.tfvars.example`
   are only there as a fallback if you ever want to skip Bitwarden for
   one of these.)

2. Initialize the provider:

   ```
   terraform init
   ```

3. Review the plan:

   ```
   terraform plan
   ```

4. Apply:

   ```
   terraform apply
   ```

   This creates: an SSH key resource (reusing your local public key),
   the droplet itself (Ubuntu 24.04, size from `terraform.tfvars`), a
   firewall allowing only 22/80/443 inbound, and a reserved IP attached
   to the droplet.

5. Terraform prints `droplet_ip` and `reserved_ip` when done. Cloud-init
   then runs automatically on first boot (usually a few minutes):
   installs Docker/Node, creates the `dev` user, installs the GitHub
   read token, clones the repo, and runs
   `infra/scripts/launch-in-cloud.sh` -- which installs MediaWiki fresh
   and deploys the wiki content. SSH in once it's done:

   ```
   ssh dev@<reserved_ip>
   cloud-init status --wait
   ```

   The wiki should now answer at `http://<reserved_ip>:8080` (from
   inside an SSH session/tunnel -- see Network above for why it's not
   reachable that way from outside).

## DNS setup (Porkbun)

Once you have the `reserved_ip` output:

1. Log into Porkbun -> Domain Management -> `doikayt.org` -> DNS Records.
2. Add a record: Type `A`, Host `wiki`, Answer `<reserved_ip>`, default TTL.
3. Confirm propagation: `dig +short wiki.doikayt.org` should print the
   reserved IP.

## Caddy / TLS cutover

Once DNS resolves, redeploy the droplet's containers so Caddy picks up
`infra/docker-compose.prod.yml` (this happens automatically —
`infra/scripts/launch-docker.sh` detects it's running on a droplet via
DigitalOcean's metadata service and adds the override file). Running
`reload` (or manually `bash infra/scripts/launch-docker.sh up -d`) is
enough to bring Caddy up once the compose override has been pulled.
After that, `https://wiki.doikayt.org` should work with no port in the URL.

## Day-to-day updates

After the first bootstrap, pushing a content or code change just means,
on the droplet:

```
reload
```

which runs `infra/scripts/lightweight-reload.sh`: checks the wiki is up, `git pull`s,
`npm ci`, and redeploys content — never touches the database.

## Tearing down

```
terraform destroy
```

Deletes the droplet and firewall. The reserved IP is protected by
`prevent_destroy` and will **not** be deleted — Terraform will refuse
and you'll need to explicitly remove the `lifecycle` block (or the
resource from state) if you really want to release it. Nothing inside
DigitalOcean Spaces is touched if backups were pushed there separately.
