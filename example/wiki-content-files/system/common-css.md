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
  color: #0645ad;
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
  color: #cc0000;
  padding: 4px 8px;
  font-size: 0.9em;
  border-top: 1px solid #e8a0a0;
}

/* CategoryTree sidebar: match nav link size and prevent wrapping */
.CategoryTreeItem bdi a {
  font-size: 12px !important;
  white-space: nowrap !important;
}
