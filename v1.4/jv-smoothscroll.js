/*
	JV Smooth Scroll ( JVSS ) v1.2
	A vanilla JS library for smooth scrolling anchor links.

	JVSmoothScroll( {
		container: 'html',
		selector: 'a[href*="#"]:not([href="#"])',
		animation: {
			tolerance: 0,
			duration: 800,
			easing: 'easeInOut', // 'easeIn', 'easeOut', 'easeInOut'
			callback: function () {},
		},
		header: {
			fixed: false,
			height: 0,
			selector: 'header'
		},
		offset: 0,
		ignoreNg: false,
		ngSelector: 'a[ng-href*="#"]:not([ng-href="#"])'
	} );
*/
( function () {
	'use strict';

	// Array.prototype.find polyfill
	if ( !Array.prototype.find ) {
		Array.prototype.find = function ( predicate ) {
			if ( this == null ) {
				throw new TypeError( 'Array.prototype.find called on null or undefined' );
			}
			if ( typeof predicate !== 'function' ) {
				throw new TypeError( 'predicate must be a function' );
			}
			var list = Object( this );
			var length = list.length >>> 0;
			var thisArg = arguments[ 1 ];
			var value;

			for ( var i = 0; i < length; i++ ) {
				value = list[ i ];
				if ( predicate.call( thisArg, value, i, list ) ) {
					return value;
				}
			}
			return undefined;
		};
	}

	// String.prototype.includes polyfill
	if ( !String.prototype.includes ) {
		String.prototype.includes = function ( search, start ) {
			'use strict';

			if ( search instanceof RegExp ) {
				throw TypeError( 'first argument must not be a RegExp' );
			}
			if ( start === undefined ) {
				start = 0;
			}
			return this.indexOf( search, start ) !== -1;
		};
	}

	var anchors = [];
	var defaultOptions = {
		container: 'html',
		selector: 'a[href*="#"]:not([href="#"]),a[href*="#["]',
		exclude: '',
		prevent: '',
		animation: {
			tolerance: 0,
			duration: 800,
			easing: 'easeOut', // any css easing function or one of your own
			callback: function () {},
		},
		header: {
			fixed: false,
			height: 0,
			selector: 'header'
		},
		offset: 0,
		ignoreNg: false,
		ngSelector: 'a[ng-href*="#"]:not([ng-href="#"])'
	};
	var links, preventLinks, options, timestamp;
	var browser = [ 'ms', 'moz', 'webkit', 'o' ];
	for ( let x = 0, length = browser.length; x < length && !window.requestAnimationFrame; x++ ) {
		window.requestAnimationFrame = window[ browser[ x ] + 'RequestAnimationFrame' ];
		window.cancelAnimationFrame = window[ browser[ x ] + 'CancelAnimationFrame' ] ||
			window[ browser[ x ] + 'CancelRequestAnimationFrame' ];
	}

	// * JVSmoothScroll constructor * //
	function JVSmoothScroll( opts=false ) {
		opts = opts ? opts : defaultOptions

		// Overwrite defaults
		if ( window.jvss ) {
			options = window.jvss = mergeDeep( defaultOptions, window.jvss );
		} else {
			options = window.jvss = mergeDeep( defaultOptions, opts );
		}
		options.animation.easing = window.jvss.animation.easing = isFunction( window.jvss.animation.easing ) ? window.jvss.animation.easing : easingFunctions[ window.jvss.animation.easing ];
		options.header.elem = window.jvss.header.elem = getElem( window.jvss.header.selector );
		options.header.height = window.jvss.header.height = window.jvss.header.fixed ? window.jvss.header.height ? window.jvss.header.height : getHeight( getElem( window.jvss.header.selector ) ) : 0;

		options.selector = options.container + ' ' + options.selector;
		if ( options.exclude ) options.selector = options.selector + ':not(' + options.exclude + ')';
		if ( options.ignoreNg ) options.selector = options.selector + ',' + options.container + ' ' + options.ngSelector;
		links = document.querySelectorAll( options.selector );
		preventLinks = document.querySelectorAll( options.prevent );

		if ( !!links ) getAnchors();

	}

	window.JVSmoothScroll = JVSmoothScroll;

	var getHeight = function ( elem ) {
		if ( !elem ) return 0;
		return parseInt( window.getComputedStyle( elem ).height );
	};

	var getElem = function ( selector ) {
		if ( selector === undefined ) return;
		if ( selector.includes( '##' ) ) return;
		else if ( typeof selector === HTMLElement ) return document.querySelector( selector );

		if ( selector.includes( '[' ) ) {
			return document.querySelector( selector.replace( '#', '' ).replace( '[', '' ).replace( ']', '' ) )
		} else if ( selector.lastIndexOf( '.' ) > 0 || selector.lastIndexOf( '#' ) > 0 ) {
			return document.querySelector( selector )
		} else if ( selector.lastIndexOf( '.' ) === 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByClassName( selector.substr( 1 ) )[ 0 ]
		} else if ( selector.lastIndexOf( '#' ) === 0 && selector.lastIndexOf( '.' ) < 0 ) {
			return document.getElementById( selector.substr( 1 ) )
		} else if ( selector.lastIndexOf( '.' ) < 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByTagName( selector )[ 0 ]
		}
	};

	var getEndLocation = function ( anchor ) {
		var anchorElem = typeof anchor === 'string' ? getElem( anchor ) : getElem( anchor.hash );
		var location = 0;
		if ( anchorElem && anchorElem.offsetParent ) {
			do {
				location += anchorElem.offsetTop;
				anchorElem = anchorElem.offsetParent;
			} while ( anchorElem );
		}
		location = Math.max( location - window.jvss.header.height - window.jvss.offset, 0 );
		return location;
	};

	var getAnchors = function () {
		if ( anchors.length > 0 ) { anchors = [] }
		for ( let i = 0; i < links.length; i++ ) {
			const link = links[ i ];
			link.classList.add( 'jvss-anchor-link' );
			const anchor = getElem( link.hash || link );

			if ( !!anchor ) anchor.classList.add( 'jvss-anchor' );

			// If the link points to the same base page
			let location_pathname = location.pathname.replace( /^\//, '' ),
				location_hostname = location.hostname,
				link_pathname = link.pathname.replace( /^\//, '' ),
				link_hostname = link.hostname;

			if ( ( link_pathname.replace( '/jobs', '' ) == location_pathname.replace( '/jobs', '' ) || location_pathname == "" ) && location_hostname == link_hostname ) {
				var anchorTop = getEndLocation( link.hash );
				var distance = getDistance( link.hash );

				// Add each link's hash, top, and distance values to anchors[]
				//  if hash already exists, this overwrites the previous value to avoid ambiguous values
				if ( hashExists( anchors, link.hash ) ) {
					anchors[ findHash( anchors, link.hash ) ] = {
						hash: link.hash ? link.hash : '',
						top: anchorTop ? anchorTop : 0,
						distance: distance ? distance : 0
					};
				} else {
					anchors.push( {
						hash: link.hash ? link.hash : '',
						top: anchorTop ? anchorTop : 0,
						distance: distance ? distance : 0
					} );
				}
				// updateHash( link.hash, a )
				addListeners( link );
			}

		}
		for ( let i = 0; i < preventLinks.length; i++ ) {
			const link = preventLinks[ i ];
			link.classList.add( 'jvss-prevent-link' );
			const anchor = getElem( link.hash || link );

			if ( !!anchor ) anchor.classList.add( 'jvss-prevent-anchor' );

			preventListeners( link );

		}
	}

	var addListeners = function ( link ) {
		// Add event listener to prevent default functionality
		link.addEventListener( 'click', function ( e ) {
			if ( link.hash.includes( '/' ) || link.hash.endsWith( '#' ) || link.hash.endsWith( '##' ) ) return;

			var target =
				anchors.find( function ( anchor ) {
					if ( anchor.hash === link.hash ) {
						return anchor.hash
					}
				} );

			if ( !target || target === "#" || target.hash === "#nav" ) {
				return;
			} else {
				var elem = getElem( target.hash );

				timestamp = new Date();
				scrollStart( target.hash );
				elem.focus();
			}

			e.preventDefault();
			e.stopPropagation();
		} );
	};

	var preventListeners = function( link ) {
		link.addEventListener( 'click', function ( e ) {
			void(0);
			e.preventDefault();
			e.stopPropagation();
		} );
	}

	var getDistance = function ( hash ) {
		var currentLocation = document.querySelector( 'html' ).scrollTop, // get current location
			anchorLocation = getEndLocation( hash );

		return ( anchorLocation - window.jvss.header.height - window.jvss.offset ) - currentLocation;
	}

	var scrollStart = function ( hash ) {
		var distance = getDistance( hash );

		if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent ) ) {
			smoothScrollTo( getEndLocation( hash ) ); //polyfill below
		} else if ( !!document.documentElement.style.scrollBehavior ) { //Checks if browser supports scroll function
			window.scrollBy( {
				top: distance,
				behavior: 'smooth',
				block: 'start'
			} );
		} else {
			smoothScrollTo( getEndLocation( hash ) ); //polyfill below
		}

		scrollStop();
		setFocus( hash );
	};

	// * JVSmoothScroll ScrollTo Method
	var smoothScrollTo = function ( endY ) {
		if ( typeof endY != 'number' ) {
			endY = getEndLocation( endY );
		}
		var startY = window.scrollY,
			distanceY = endY - startY,
			previousTimestamp = timestamp,
			duration = window.jvss.animation.duration,
			iteration = 0;

		// Easing function
		var timer = window.requestInterval( function () {
			++iteration;
			var tstamp = new Date() - previousTimestamp,
				newY = window.jvss.animation.easing( tstamp, startY, distanceY, duration );

			if ( tstamp >= duration ) {
				window.clearRequestInterval( timer );
				newY = endY;
			}

			console.log('iteration ~>', iteration);

			window.scrollTo( 0, newY );
		}); // 60 fps
	};

	var scrollStop = function () {
		!!window.jvss.animation.callback ? window.jvss.animation.callback() : function () {};
		anchors = [];
		getAnchors();
	};

	var setFocus = function ( hash ) {
		let el = getElem( hash );
		el.tabIndex = 0;
		el.focus();
		el.removeAttribute( 'tabindex' );
	}

	/* FOR TESTING */
	function log( e ) {
		if ( e.key == 'l' && e.metaKey && e.shiftKey ) {
			console.groupCollapsed( '~ Log ~' );
			console.log( 'window.JVSmoothScroll ~v' );
			console.dir( window.JVSmoothScroll )
			console.log( 'window.jvss ~v' );
			console.dir( window.jvss )
			console.log( 'links ~>', links );
			console.log( 'anchors ~>', anchors );
			console.groupEnd();
		}
	}
	/* FOR TESTING */

	//---------------------------------------------------------
	//
	// Window Events
	//
	//---------------------------------------------------------
	window.addEventListener( 'keydown', log );

	// * On Window Load
	// When the page renders, go to hash target
	window.onload = function () {
		if ( !anchors && !!links ) getAnchors();

		var hash = location.hash ? location.hash.replace( '/', '' ) : null;
		var anchor = anchors.find( function ( link ) {
			link.hash === hash
		} );
		if ( anchor ) {
			// Check for special occasions noted by team
			anchor.hash.includes( '#!' ) ? anchor.hash = anchor.hash.replace( '#!', '' ) : anchor.hash;
			anchor.hash.includes( '%23' ) ? anchor.hash = anchor.hash.replace( '%23', '#' ) : anchor.hash;
			// Wait for client side to catch up, then scroll to target
			if ( document.body.scrollTop <= 0 ) {
				requestTimeout( function () {
					smoothScrollTo( anchor.top );
				}, 10 );
			} else {
				requestTimeout( function () {
					smoothScrollTo( ( ( document.body.scrollTop * -1 ) + anchor.top ) );
				}, 10 );
			}
		} else if ( location.hash.length > 0 ) {
			if ( document.body.scrollTop <= 0 ) {
				requestTimeout( function () {
					smoothScrollTo( getEndLocation( hash ) )
				} );
			} else {
				requestTimeout( function () {
					smoothScrollTo( ( ( document.body.scrollTop * -1 ) + document.querySelector( hash ).getBoundingClientRect().top ) )
				} );
			}
		}

		window.JVSmoothScroll();
	};

	//---------------------------------------------------------


	//---------------------------------------------------------
	//
	// Utilities
	//
	//---------------------------------------------------------
	function mergeDeep( ...objects ) {
		const isObject = obj => obj && typeof obj === 'object';

		return objects.reduce( ( prev, obj ) => {
			Object.keys( obj ).forEach( key => {
				const pVal = prev[ key ];
				const oVal = obj[ key ];

				if ( Array.isArray( pVal ) && Array.isArray( oVal ) ) {
					prev[ key ] = pVal.concat( ...oVal );
				} else if ( isObject( pVal ) && isObject( oVal ) ) {
					prev[ key ] = mergeDeep( pVal, oVal );
				} else {
					prev[ key ] = oVal;
				}
			} );

			return prev;
		}, {} );
	}

	function isFunction( x ) {
		return Object.prototype.toString.call( x ) == '[object Function]';
	}
	function hashExists( list=anchors, hash ) {
		for ( var i = 0; i < list.length; i++ ) {
			if ( list[ i ].hash === hash ) {
				return true;
			}
		}
		return false;
	}
	function findHash( list=anchors, hash ) {
		for ( var i = 0; i < list.length; i++ ) {
			if ( list[ i ].hash === hash ) {
				return i;
			}
		}
	}
	//---------------------------------------------------------

	//---------------------------------------------------------
	// * Easing Functions
	// t - current time
	// b - start value
	// c - change in value
	// d - duration
	var linear = function ( t, b, c, d ) {
		return c * t / d + b;
	}
	var easeIn = function ( t, b, c, d ) {
		return c * ( t /= d ) * t * t + b;
	}
	var easeOut = function ( t, b, c, d ) {
		return c * ( ( t = t / d - 1 ) * t * t + 1 ) + b;
	}
	var easeInQuad = function ( t, b, c, d ) {
		return c * ( t /= d ) * t + b;
	}
	var easeOutQuad = function ( t, b, c, d ) {
		return -c * ( t /= d ) * ( t - 2 ) + b;
	}
	var easeInOutQuad = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * t * t + b;
		}
		return -c / 2 * ( ( --t ) * ( t - 2 ) - 1 ) + b;
	}
	var easeInCubic = function ( t, b, c, d ) {
		return c * Math.pow( t / d, 3 ) + b;
	}
	var easeOutCubic = function ( t, b, c, d ) {
		return c * ( Math.pow( t / d - 1, 3 ) + 1 ) + b;
	}
	var easeInOutCubic = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * Math.pow( t, 3 ) + b;
		}
		return c / 2 * ( Math.pow( t - 2, 3 ) + 2 ) + b;
	}
	var easeInQuart = function ( t, b, c, d ) {
		return c * Math.pow( t / d, 4 ) + b;
	}
	var easeOutQuart = function ( t, b, c, d ) {
		return -c * ( Math.pow( t / d - 1, 4 ) - 1 ) + b;
	}
	var easeInOutQuart = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * Math.pow( t, 4 ) + b;
		}
		return -c / 2 * ( Math.pow( t - 2, 4 ) - 2 ) + b;
	}
	var easeInQuint = function ( t, b, c, d ) {
		return c * Math.pow( t / d, 5 ) + b;
	}
	var easeOutQuint = function ( t, b, c, d ) {
		return c * ( Math.pow( t / d - 1, 5 ) + 1 ) + b;
	}
	var easeInOutQuint = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * Math.pow( t, 5 ) + b;
		}
		return c / 2 * ( Math.pow( t - 2, 5 ) + 2 ) + b;
	}
	var easeInSine = function ( t, b, c, d ) {
		return c * ( 1 - Math.cos( t / d * ( Math.PI / 2 ) ) ) + b;
	}
	var easeOutSine = function ( t, b, c, d ) {
		return c * Math.sin( t / d * ( Math.PI / 2 ) ) + b;
	}
	var easeInOutSine = function ( t, b, c, d ) {
		return c / 2 * ( 1 - Math.cos( Math.PI * t / d ) ) + b;
	}
	var easeInExpo = function ( t, b, c, d ) {
		return c * Math.pow( 2, 10 * ( t / d - 1 ) ) + b;
	}
	var easeOutExpo = function ( t, b, c, d ) {
		return c * ( -Math.pow( 2, -10 * t / d ) + 1 ) + b;
	}
	var easeInOutExpo = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * Math.pow( 2, 10 * ( t - 1 ) ) + b;
		}
		return c / 2 * ( -Math.pow( 2, -10 * --t ) + 2 ) + b;
	}
	var easeInCirc = function ( t, b, c, d ) {
		return c * ( 1 - Math.sqrt( 1 - ( t /= d ) * t ) ) + b;
	}
	var easeOutCirc = function ( t, b, c, d ) {
		return c * Math.sqrt( 1 - ( t = t / d - 1 ) * t ) + b;
	}
	var easeInOutCirc = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * ( 1 - Math.sqrt( 1 - t * t ) ) + b;
		}
		return c / 2 * ( Math.sqrt( 1 - ( t -= 2 ) * t ) + 1 ) + b;
	}
	var easeInBack = function ( t, b, c, d ) {

	}
	var easeOutBack = function ( t, b, c, d ) {

	}
	var easeInOutBack = function ( t, b, c, d ) {

	}
	var easeInElastic = function ( t, b, c, d ) {

	}
	var easeOutElastic = function ( t, b, c, d ) {

	}
	var easeInOutElastic = function ( t, b, c, d ) {

	}
	var easeInBounce = function ( t, b, c, d ) {

	}
	var easeOutBounce = function ( t, b, c, d ) {

	}
	var easeInOutBounce = function ( t, b, c, d ) {

	}
	var easingFunctions = {
		linear: linear,
		easeIn: easeIn,
		easeOut: easeOut,
		easeInOut: easeInOutQuad,
		easeInQuad: easeInQuad,
		easeOutQuad: easeOutQuad,
		easeInOutQuad: easeInOutQuad,
		easeInCubic: easeInCubic,
		easeOutCubic: easeOutCubic,
		easeInOutCubic: easeInOutCubic,
		easeInQuart: easeInQuart,
		easeOutQuart: easeOutQuart,
		easeInOutQuart: easeInOutQuart,
		easeInQuint: easeInQuint,
		easeOutQuint: easeOutQuint,
		easeInOutQuint: easeInOutQuint,
		easeInSine: easeInSine,
		easeOutSine: easeOutSine,
		easeInOutSine: easeInOutSine,
		easeInExpo: easeInExpo,
		easeOutExpo: easeOutExpo,
		easeInOutExpo: easeInOutExpo,
		easeInCirc: easeInCirc,
		easeOutCirc: easeOutCirc,
		easeInOutCirc: easeInOutCirc
	}
}() );

//---------------------------------------------------------
//
// Request Animation Frame
//
//---------------------------------------------------------
// requestAnimationFrame() shim by Paul Irish
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = ( function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function ( /* function */ callback, /* DOMElement */ element ) {
			window.setTimeout( callback, 1000 / 60 );
		};
} )();
/**
 * Behaves the same as setInterval except uses requestAnimationFrame() where possible for better performance
 * @param {function} fn The callback function
 * @param {int} delay The delay in milliseconds
 */
window.requestInterval = function ( fn, delay ) {
	if ( !window.requestAnimationFrame &&
		!window.webkitRequestAnimationFrame &&
		!( window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame ) && // Firefox 5 ships without cancel support
		!window.oRequestAnimationFrame &&
		!window.msRequestAnimationFrame )
		return window.setInterval( fn, delay );

	var start = new Date().getTime(),
		handle = new Object();

	function loop() {
		var current = new Date().getTime(),
			delta = current - start;

		if ( delta >= delay ) {
			fn.call();
			start = new Date().getTime();
		}

		handle.value = requestAnimFrame( loop );
	};

	handle.value = requestAnimFrame( loop );
	return handle;
}

/**
 * Behaves the same as clearInterval except uses cancelRequestAnimationFrame() where possible for better performance
 * @param {int|object} fn The callback function
 */
window.clearRequestInterval = function ( handle ) {
	window.cancelAnimationFrame ? window.cancelAnimationFrame( handle.value ) :
		window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame( handle.value ) :
		window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame( handle.value ) : /* Support for legacy API */
		window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame( handle.value ) :
		window.oCancelRequestAnimationFrame ? window.oCancelRequestAnimationFrame( handle.value ) :
		window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame( handle.value ) :
		clearInterval( handle );
};
/**
 * Behaves the same as setTimeout except uses requestAnimationFrame() where possible for better performance
 * @param {function} fn The callback function
 * @param {int} delay The delay in milliseconds
 */
window.requestTimeout = function ( fn, delay ) {
	if ( !window.requestAnimationFrame &&
		!window.webkitRequestAnimationFrame &&
		!( window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame ) && // Firefox 5 ships without cancel support
		!window.oRequestAnimationFrame &&
		!window.msRequestAnimationFrame )
		return window.setTimeout( fn, delay );

	var start = new Date().getTime(),
		handle = new Object();

	function loop() {
		var current = new Date().getTime(),
			delta = current - start;

		delta >= delay ? fn.call() : handle.value = requestAnimFrame( loop );
	};

	handle.value = requestAnimFrame( loop );
	return handle;
};
/**
 * Behaves the same as clearTimeout except uses cancelRequestAnimationFrame() where possible for better performance
 * @param {int|object} fn The callback function
 */
window.clearRequestTimeout = function ( handle ) {
	window.cancelAnimationFrame ? window.cancelAnimationFrame( handle.value ) :
		window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame( handle.value ) :
		window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame( handle.value ) : /* Support for legacy API */
		window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame( handle.value ) :
		window.oCancelRequestAnimationFrame ? window.oCancelRequestAnimationFrame( handle.value ) :
		window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame( handle.value ) :
		clearTimeout( handle );
};
//---------------------------------------------------------