# DigitalOcean droplet metadata service -- shared constant + explanation.
#
# 169.254.169.254 is NOT an IP allocated to this droplet, and has nothing
# to do with any Reserved IP created via Terraform. It's a reserved
# "link-local" address (RFC 3927) that the hypervisor intercepts and
# serves locally -- identical on every DigitalOcean droplet, and the same
# convention (same address, different URL scheme) used by AWS, GCP, and
# Azure for their own instance metadata services. It answers only to the
# instance itself; nothing outside the droplet can reach it, and it can't
# resolve to any third party's server. No auth is required, and it never
# exposes secrets (droplet id/hostname/region/ips/tags/your SSH *public*
# keys only). Docs: https://docs.digitalocean.com/products/droplets/how-to/access-metadata/
#
# NOTE: DO_METADATA_PUBLIC_IPV4 below returns the droplet's own EPHEMERAL
# public IP, not the stable Reserved IP (still called "floating_ip" in
# this API, separate from "interfaces/public/.../address"). Fine for now
# since no Reserved IP exists yet -- revisit once the Caddy/DNS cutover
# lands, since WIKI_SERVER_URL derived from this could then diverge from
# whatever the Reserved IP + wiki.doikayt.org actually points to.
DO_METADATA_BASE_URL="http://169.254.169.254/metadata/v1"
DO_METADATA_PUBLIC_IPV4="$DO_METADATA_BASE_URL/interfaces/public/0/ipv4/address"
DO_METADATA_ID="$DO_METADATA_BASE_URL/id"
