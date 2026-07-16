---
title: "Form:Tool"
categories:
redirect_from: []
raw: true
---
<noinclude>
This is the "Tool" form for adding a recommended tool or service.
</noinclude><includeonly>
{{{for template|Tool|display=table}}}
{{{field|company|label=Company}}}
{{{field|protocol|label=URL|input type=dropdown|values=https,http|default=https}}}
{{{field|url|label=|placeholder=google.com|tooltip=Enter domain only, no protocol prefix (e.g. google.com).}}}
{{{field|pricing|label=Pricing|input type=dropdown|values=free,recurring/mo,recurring/yr,one time,varies|default=free}}}
{{{field|amount|label=Amount|input type=regexp|regexp=/^$|^\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/|message=Enter a dollar amount (e.g. 7 or $1,234.56)|placeholder=e.g. $1,234.56}}}
{{{field|source_license|label=Source license|input type=dropdown|values=open,closed|default=open|tooltip=Source code publicly viewable = open, even if licensing is restrictive or aspects are closed (e.g. non-open-weight AI models).}}}
{{{field|hosting|label=Hosting|input type=dropdown|values=self,cloud,hybrid,N/A|default=self|tooltip=Select hybrid if the hosting model can be a mix of cloud and on-premises.}}}
{{{field|description|label=Description|input type=textarea|tooltip=1–2 sentence overview of how the product/service meets the needs of the operational area.}}}
{{{field|usage_notes|label=Usage notes|input type=textarea|tooltip=Key workflows relevant to this operational (sub)area that may not be clear from the documentation.}}}
{{{field|rejected_alternatives|label=Rejected alternatives|input type=textarea|tooltip=Pros and cons of this product/service versus rejected alternatives.}}}
{{{field|category|label=Category|input type=tree|top category=Domains|list}}}
{{{end template}}}
</includeonly>
