#cloud-config
package_update: true
package_upgrade: true

packages:
  - ca-certificates
  - curl
  - gnupg
  - ufw
  - git

write_files:
  - path: /etc/systemd/system/swap.service
    content: |
      [Unit]
      Description=Create swapfile
      DefaultDependencies=no
      Before=swap.target

      [Service]
      Type=oneshot
      ExecStart=/bin/bash -c 'fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab'
      RemainAfterExit=true

      [Install]
      WantedBy=swap.target

  - path: /root/.git-credentials
    permissions: '0600'
    content: |
      https://x-access-token:${github_read_token}@github.com

runcmd:
  # Swap
  - systemctl enable --now swap.service

  # UFW
  - ufw allow OpenSSH
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable

  # Docker (official repo, not Ubuntu-packaged docker.io)
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
  - apt-get update
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Node.js LTS + npm (NodeSource repo - apt's bundled nodejs is stale)
  - curl -fsSL https://deb.nodesource.com/setup_lts.x -o /tmp/nodesource_setup.sh
  - bash /tmp/nodesource_setup.sh
  - apt-get install -y nodejs

  # Non-root user for day-to-day ops (SSH key inherited via droplet ssh_keys)
  - useradd -m -s /bin/bash -G docker,sudo dev
  - mkdir -p /home/dev/.ssh
  - cp /root/.ssh/authorized_keys /home/dev/.ssh/authorized_keys
  - chown -R dev:dev /home/dev/.ssh
  - chmod 700 /home/dev/.ssh
  - chmod 600 /home/dev/.ssh/authorized_keys
  - echo "dev ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-dev-nopasswd
  - chmod 440 /etc/sudoers.d/90-dev-nopasswd

  # GitHub read-only access (doikayt-org-read-token, all doikayt repos) + repo checkout
  - cp /root/.git-credentials /home/dev/.git-credentials
  - chown dev:dev /home/dev/.git-credentials
  - chmod 600 /home/dev/.git-credentials
  - sudo -u dev git config --global credential.helper store
  - sudo -u dev git clone https://github.com/doikayt/qwiki.git /home/dev/qwiki

  # Convenience alias for redeploying content/code without touching the DB
  - echo "alias reload='bash ~/qwiki/infra/scripts/lightweight-reload.sh'" >> /home/dev/.bashrc

  # First-time bootstrap: installs MediaWiki fresh and deploys content
  - sudo -u dev -H bash -c "cd /home/dev/qwiki && WIKI_ADMIN_PASSWORD='${wiki_admin_password}' bash infra/scripts/launch-in-cloud.sh"

final_message: "Droplet ready. Docker, git, and Node.js/npm installed. Swap configured, firewall enabled. Wiki bootstrapped via launch-in-cloud.sh."
