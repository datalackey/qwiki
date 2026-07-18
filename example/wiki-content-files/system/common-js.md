---
title: "MediaWiki:Common.js"
categories:
redirect_from: []
raw: true
---

/* Point the site logo at the Doikayt Mobilization Labs homepage, opening
   in a new tab so the wiki stays open in the background. */
( function () {
	'use strict';

	$( '#p-logo a' ).attr( {
		href: 'https://www.doikayt.org',
		target: '_blank',
		rel: 'noopener'
	} );
}() );

/* Replace PageForms OOUI tooltip buttons with a plain <sup>?</sup> trigger
   that shows the help text in a lightweight floating div on click. */
( function () {
	'use strict';

	mw.hook( 'pf.formSetupAfter' ).add( function () {
		$( 'th[data-tooltip]' ).each( function () {
			var $th  = $( this );
			var safe = $( '<div>' ).text( $th.attr( 'data-tooltip' ) ).html();

			var $trigger = $( '<sup class="pf-tip">?</sup>' );
			var $popup   = $( '<div class="pf-tip-popup"></div>' )
			                   .html( '<p>' + safe + '</p>' )
			                   .hide();

			$trigger.on( 'click', function ( e ) {
				e.stopPropagation();
				$( '.pf-tip-popup' ).not( $popup ).hide();
				$popup.toggle();
			} );

			$th.css( 'position', 'relative' ).append( $trigger ).append( $popup );
		} );

		$( document ).on( 'click.pf-tip', function () {
			$( '.pf-tip-popup' ).hide();
		} );
	} );
}() );

/* Probe the URL field on the Tool form for reachability on blur.
   Uses no-cors so any server response (any status code) counts as reachable;
   only genuine network failure (DNS, TLS, timeout) is flagged as unreachable. */
( function () {
	'use strict';

	// null = not yet checked, true = reachable, false = unreachable
	var probeResult = null;
	var probedUrl   = '';

	function getFullUrl() {
		var $protocol = $( 'select[name="Tool[protocol]"]' );
		var protocol  = $protocol.length ? $protocol.val().trim() : 'https';
		var domain    = $( 'input[name="Tool[url]"]' ).val().trim();
		return domain ? protocol + '://' + domain : '';
	}

	function showStatus( msg, color ) {
		$( '#pf-url-status' ).text( msg ).css( 'color', color );
	}

	function probe( url ) {
		if ( !url || url === probedUrl ) { return; }
		probedUrl   = url;
		probeResult = null;
		showStatus( 'Checking…', 'gray' );

		var timeout = new Promise( function ( _, reject ) {
			setTimeout( function () { reject( new Error( 'timeout' ) ); }, 8000 );
		} );

		Promise.race( [
			fetch( url, { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' } ),
			timeout
		] ).then( function () {
			if ( url !== probedUrl ) { return; }
			probeResult = true;
			showStatus( '✓ Reachable', 'green' );
		} ).catch( function () {
			if ( url !== probedUrl ) { return; }
			probeResult = false;
			showStatus( '✗ Not reachable', 'red' );
		} );
	}

	$( function () {
		var $url = $( 'input[name="Tool[url]"]' );
		if ( !$url.length ) { return; }

		$url.closest( 'td' ).append(
			$( '<span>' ).attr( 'id', 'pf-url-status' ).css( { marginLeft: '8px', fontSize: '0.9em' } )
		);

		$url.on( 'blur', function () {
			probe( getFullUrl() );
		} );
	} );

	// Clear previous error rows before each validation run
	mw.hook( 'pf.formValidation' ).add( function () {
		$( '.pf-error-row' ).remove();
	} );

	mw.hook( 'pf.formValidation' ).add( function ( args ) {
		var $url = $( 'input[name="Tool[url]"]' );
		if ( !$url.length ) { return; }

		var domain = $url.val().trim();
		var msg = null;

		if ( !domain ) {
			msg = 'URL is required.';
		} else {
			var url = getFullUrl();
			if ( probeResult === false ) {
				msg = 'URL is not reachable. Please verify the address.';
			} else if ( probeResult === null ) {
				showStatus( 'Checking…', 'gray' );
				probe( url );
				msg = 'Verifying URL reachability — please try saving again in a moment.';
			}
		}

		if ( msg ) {
			args.numErrors++;
			$( '<tr class="pf-error-row"><td colspan="2"></td></tr>' )
				.find( 'td' ).text( msg ).end()
				.insertAfter( $url.closest( 'tr' ) );
			setTimeout( function () {
				var $e = $( '.pf-error-row' ).first();
				if ( $e.length ) { $e[ 0 ].scrollIntoView( { behavior: 'smooth', block: 'nearest' } ); }
			}, 0 );
		}
		// probeResult === true: allow through
	} );
}() );

/* Require at least one category before the Tool form can be submitted. */
( function () {
	'use strict';

	mw.hook( 'pf.formValidation' ).add( function ( args ) {
		var $category = $( '[name="Tool[category]"]' );
		if ( !$category.length ) { return; }
		if ( !( $category.val() || '' ).trim() ) {
			args.numErrors++;
			$( '<tr class="pf-error-row"><td colspan="2">Please select a category.</td></tr>' )
				.insertAfter( $category.closest( 'tr' ) );
			setTimeout( function () {
				var $e = $( '.pf-error-row' ).first();
				if ( $e.length ) { $e[ 0 ].scrollIntoView( { behavior: 'smooth', block: 'nearest' } ); }
			}, 0 );
		}
	} );
}() );

/* Amount / pricing cross-validation. Two rules:
   1. pricing=free + non-zero amount → error (amount must be blank for free tools)
   2. pricing!=free + blank or zero amount → error (amount is required) */
( function () {
	'use strict';

	mw.hook( 'pf.formValidation' ).add( function ( args ) {
		var $pricing = $( '[name="Tool[pricing]"]' );
		var $amount  = $( '[name="Tool[amount]"]' );
		if ( !$pricing.length || !$amount.length ) { return; }

		var pricing = $pricing.val().trim();
		var amount  = ( $amount.val() || '' ).trim();
		var numericAmount = parseFloat( amount );

		if ( pricing === 'free' && amount && numericAmount > 0 ) {
			args.numErrors++;
			$( '<tr class="pf-error-row"><td colspan="2">Free tools must have a blank amount.</td></tr>' )
				.insertAfter( $amount.closest( 'tr' ) );
			setTimeout( function () {
				var $e = $( '.pf-error-row' ).first();
				if ( $e.length ) { $e[ 0 ].scrollIntoView( { behavior: 'smooth', block: 'nearest' } ); }
			}, 0 );
		}

		if ( pricing !== 'free' && ( !amount || numericAmount === 0 ) ) {
			args.numErrors++;
			$( '<tr class="pf-error-row"><td colspan="2">Amount is required when pricing is not free.</td></tr>' )
				.insertAfter( $amount.closest( 'tr' ) );
			setTimeout( function () {
				var $e = $( '.pf-error-row' ).first();
				if ( $e.length ) { $e[ 0 ].scrollIntoView( { behavior: 'smooth', block: 'nearest' } ); }
			}, 0 );
		}
	} );
}() );
