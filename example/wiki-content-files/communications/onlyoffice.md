---
title: "OnlyOffice - self-hosted office suite with real-time editing"
tagline: "self-hosted office suite with real-time editing"
categories:
redirect_from:
  - OnlyOffice
  - ONLYOFFICE
raw: true
---
{{Tool
|company=OnlyOffice
|protocol=https
|url=onlyoffice.com
|pricing=free
|amount=Cloud DocSpace Business $20/admin/mo; self-hosted Enterprise license from $1,500 (50 connections)
|source_license=open
|hosting=hybrid
|description=Word/Excel/PowerPoint-compatible document, spreadsheet, and presentation
editors with real-time co-editing. The self-hosted Community Edition (Docker, AGPLv3)
is free for up to 20 simultaneous connections; DocSpace Cloud offers a free Startup
tier plus paid Business and Enterprise tiers for larger or managed deployments.
|usage_notes=Community Edition is a good fit for shoestring-budget self-hosting --
one Docker container gets a full editing server running. Upgrading is typically
driven by needing more than 20 concurrent connections, mobile web editors, or
vendor support rather than missing features.

Caveat: hosted plans sit on EU servers (Frankfurt) -- 90-180ms latency for US
users, plus DSA-mandated content takedowns with no due process.

Mitigation (alternative): self-host the free edition on a US server -- free
apart from VM hosting cost; avoids both the latency and the censorship exposure.
|rejected_alternatives=
|category=Office Suite
}}
