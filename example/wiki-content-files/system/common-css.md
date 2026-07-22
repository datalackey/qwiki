---
title: "MediaWiki:Common.css"
categories:
redirect_from: []
raw: true
---
/* Classic Vector sidebar width */
#mw-panel {
  width: 16em !important;
}
#content,
#footer {
  margin-left: 17em !important;
}
#left-navigation,
#mw-head-base {
  margin-left: 16em !important;
}

/* Field help tooltip: ? superscript trigger + floating popup */
.pf-tip {
  font-size: 0.6em;
  cursor: pointer;
  color: #37723a;
  vertical-align: super;
  margin-left: 3px;
  user-select: none;
}
.pf-tip-popup {
  position: absolute;
  left: 0;
  top: 100%;
  background: #fff;
  border: 1px solid #aaa;
  border-radius: 3px;
  padding: 8px 12px;
  min-width: 220px;
  max-width: 320px;
  z-index: 999;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.25);
  font-weight: normal;
  white-space: normal;
  line-height: 1.4;
}
.pf-tip-popup p { margin: 0; }

/* Hide the default OOUI tooltip button; replaced by the custom .pf-tip trigger */
.oo-ui-popupButtonWidget { display: none !important; }

/* Double the default 100px height of the category tree picker */
.pfTreeInput { height: 200px !important; }

/* Validation error row inserted below failing field */
.pf-error-row td {
  background: #fff0f0;
  color: #c5171a;
  padding: 4px 8px;
  font-size: 0.9em;
  border-top: 1px solid #e8a0a0;
}

/* CategoryTree sidebar: match nav link size, prevent wrapping, allow h-scroll */
.CategoryTreeItem bdi a {
  font-size: 12px !important;
  white-space: nowrap !important;
}
#mw-panel .portal .body {
  overflow-x: auto;
}

/* ── Doikayt watermelon theme: white bg, black text, badge green + red ── */
/* Colors sampled from the badge: green #37723a, red #c5171a.             */
/* Green = navigation/actions; red = emphasis/alerts.                     */
/* Remove this block to revert to default MediaWiki styling.              */
body { background: #fff; color: #111; }

#content { background: #fff; color: #111; border-color: #37723a; }
#content h1, #content h2, #content h3, #content h4, #content h5 {
  color: #111; border-color: #37723a !important;
}

a, a:visited { color: #37723a; }
a:hover { color: #c5171a; }

/* wikitable */
.wikitable th { background: #37723a; color: #fff; border-color: #2b5a2e; }
.wikitable td { background: #fff; color: #111; border-color: #ccc; }

/* Sidebar */
#mw-panel { background: #fff; }
#mw-panel a { color: #37723a; }
#mw-panel .portal h3 { color: #c5171a; }

/* Logo area */
#p-logo, #mw-page-base { background: #fff !important; }
#p-logo a, #p-logo a:hover { background-color: #fff !important; }

/* Header / tab bar */
#mw-head, #mw-head-base { background: #fff !important; }
#p-namespaces, #p-namespaces li, #p-views, #p-views li,
.vector-menu-tabs, .vector-menu-tabs li { background: #fff !important; }
#p-namespaces li a, #p-views li a,
.vector-menu-tabs li a { color: #37723a !important; border-color: #ddd !important; }
li.selected a, .selected a {
  background: #fff !important;
  color: #111 !important;
  box-shadow: inset 0 -3px 0 #c5171a;
}

/* TOC */
.toc, #toc { background: #f6f8f6 !important; border-color: #37723a !important; }
.toctitle h2 { color: #111 !important; }

/* Footer */
#footer { background: #fff !important; color: #111 !important; border-color: #ddd !important; }
#footer a, #footer-places a { color: #37723a !important; }
#footer-info li, #footer-places li { color: #111 !important; }
#footer-poweredbyico { display: none !important; }

/* Continue / forminput submit button: green = primary action, red on hover */
.pfCreateOrEditButton .oo-ui-buttonElement-button {
  background: #37723a !important;
  color: #fff !important;
  border-color: #2b5a2e !important;
}
.pfCreateOrEditButton .oo-ui-buttonElement-button:hover {
  background: #2b5a2e !important;
  border-color: #c5171a !important;
}

/* Text selection */
::selection { background: #37723a; color: #fff; }

/* Form inputs */
input[type="text"], input[type="search"], input[type="url"],
input[type="email"], textarea, select {
  background: #fff !important; color: #111 !important;
  border: 1px solid #999 !important;
}
input[type="text"]:focus, input[type="search"]:focus, input[type="url"]:focus,
input[type="email"]:focus, textarea:focus, select:focus {
  border-color: #37723a !important;
  outline: 1px solid #37723a !important;
}

/* Search and generic input placeholders */
#searchInput::placeholder, input[type="search"]::placeholder,
input[type="text"]::placeholder {
  color: #999 !important;
}
