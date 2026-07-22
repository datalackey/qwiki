---
title: "Nextcloud - self-hosted groupware with built-in office editing"
tagline: "self-hosted groupware with built-in office editing"
categories:
redirect_from:
  - Nextcloud
raw: true
---
{{Tool
|company=Nextcloud
|protocol=https
|url=nextcloud.com
|pricing=free
|amount=Self-hosted is free, no user limit. Enterprise support from EUR 67.89/user/yr
(100-user minimum). Nextcloud One managed hosting ~EUR 13-15/user/mo.
|source_license=open
|hosting=hybrid
|description=Primarily a self-hosted file sync and groupware platform (files, calendar,
chat/Talk); the built-in Nextcloud Office app (Collabora- or OnlyOffice-based) adds
real-time collaborative document, spreadsheet, and presentation editing on top of
that storage layer. AGPLv3, no user cap on the free self-hosted edition.
|usage_notes=Free self-hosted tier has no user limit, which matters since Enterprise
subscriptions only start at 100 seats -- not a realistic tier for small orgs. One
Docker/Snap deployment covers files + office editing + calendar together rather than
running separate tools.

Caveat: hosted plans sit on EU servers (Frankfurt) -- 90-180ms latency for US
users, plus DSA-mandated content takedowns with no due process.

Mitigation (alternative): self-host the free edition on a US server -- free
apart from VM hosting cost; avoids both the latency and the censorship exposure.
|rejected_alternatives=
|category=Office Suite
}}
