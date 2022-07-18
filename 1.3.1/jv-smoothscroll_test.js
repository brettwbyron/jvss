/*
	JV Smooth Scroll ( JVSS ) v1.2
	A vanilla JS library for smooth scrolling anchor links.

	var jvss = JVSmoothScroll( {
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

	var anchorLinks = [];
	var defaultOptions = {
		container: 'html',
		selector: 'a[href*="#"]:not([href="#"]),a[href*="#["]',
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
	};
	var links, options, containerElem;
	var browser = [ 'ms', 'moz', 'webkit', 'o' ];
	for ( let x = 0, length = browser.length; x < length && !window.requestAnimationFrame; x++ ) {
		window.requestAnimationFrame = window[ browser[ x ] + 'RequestAnimationFrame' ];
		window.cancelAnimationFrame = window[ browser[ x ] + 'CancelAnimationFrame' ] ||
			window[ browser[ x ] + 'CancelRequestAnimationFrame' ];
	}

	// * Easing Functions
	// t - current time
	// b - start value
	// c - change in value
	// d - duration
	var easeIn = function ( t, b, c, d ) {
		return c * ( t /= d ) * t * t + b;
	}
	var easeOut = function ( t, b, c, d ) {
		return c * ( ( t = t / d - 1 ) * t * t + 1 ) + b;
	}
	var easeInOut = function  ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * t * t + b;
		}
		return -c / 2 * ( ( --t ) * ( t - 2 ) - 1 ) + b;
	}
	var easingFunctions = { easeIn: easeIn, easeOut: easeOut, easeInOut: easeInOut };

	function merge( obj1, obj2 ) {
		const obj3 = {};
		obj1 = !!obj1 ? obj1 : {};
		obj2 = !!obj2 ? obj2 : {};
		Object.keys( obj1 ).forEach( function ( propertyName ) {
			if ( typeof obj3[ propertyName ] == "object" ) {
				Object.keys( obj3[ propertyName ] ).forEach( function ( prop ) {
					!!obj3[ propertyName ][ prop ] ? obj3[ propertyName ][ prop ] = obj1[ propertyName ][ prop ] : undefined;
				} )
			} else {
				obj3[ propertyName ] = obj1[ propertyName ];
			}
		} );

		Object.keys( obj2 ).forEach( function ( propertyName ) {
			if ( typeof obj3[ propertyName ] == "object" ) {
				Object.keys( obj3[ propertyName ] ).forEach( function ( prop ) {
					!!obj3[ propertyName ][ prop ] ? obj3[ propertyName ][ prop ] = obj2[ propertyName ][ prop ] : undefined;
				} )
			} else {
				obj3[ propertyName ] = obj2[ propertyName ];
			}
		} );
		return obj3;
	};

	var getHeight = function ( elem ) {
		return parseInt( window.getComputedStyle( elem ).height );
	};

	var getElem = function ( selector ) {
		if ( selector === undefined ) return;
		if ( typeof selector === HTMLElement || typeof selector === "object" ) return document.getElementById( selector.id );

		if ( selector.includes('##') ) {
			return;
		} else if ( selector.includes( '#[' ) ) {
			return document.querySelector( selector.replace( /\W/g, '' ) )
		} else if ( selector.lastIndexOf( '.' ) > 0 || selector.lastIndexOf( '#' ) > 0 ) {
			return document.querySelector( selector )
		} else if ( selector.lastIndexOf('.') === 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByClassName( selector.substr( 1 ) )[0]
		} else if ( selector.lastIndexOf( '#' ) === 0 && selector.lastIndexOf( '.' ) < 0 ) {
			return document.getElementById( selector.substr( 1 ) )
		} else if ( selector.lastIndexOf( '.' ) < 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByTagName( selector )[0]
		}
	};

	var getEndLocation = function ( anchor ) {
		console.groupCollapsed('~ getEndLocation ~');
		console.log('anchor ~>', anchor);
		console.groupEnd();

		var anchorElem = typeof anchor === 'string' ? getElem( anchor ) : getElem( anchor.hash );
		var location = 0;
		if ( anchorElem && anchorElem.offsetParent ) {
			do {
				location += anchorElem.offsetTop;
				anchorElem = anchorElem.offsetParent;
			} while ( anchorElem );
		}
		location = Math.max( location - options.header.height - options.offset, 0 );
		return location;
	};

	var getAnchors = function ( links ) {
		for (let i = 0; i < links.length; i++) {
			var link = links[ i ];
			if (!!link) link.classList.add( 'jvss-anchor-link' );

			var anchor = getElem( link.hash || link );
			if ( !!anchor ) anchor.classList.add( 'jvss-anchor' );

			var anchorTop = getEndLocation( link.hash || link );
			var distance = getDistance( link.hash || link );

			// If the link points to the same base page
			let location_pathname = location.pathname.replace( /^\//, '' ),
				location_hostname = location.hostname,
				link_pathname = link.pathname.replace( /^\//, '' ),
				link_hostname = link.hostname;

			if ( ( link_pathname.replace( '/jobs', '' ) == location_pathname.replace( '/jobs', '' ) ) && location_hostname == link_hostname ) {
				// Add each link's { hash, top } values to anchorLinks[]
				anchorLinks.push( {
					hash: link.hash || link ? link.hash || link : '',
					top: anchorTop ? anchorTop : 0,
					distance: distance ? distance : 0
				} );
				addListeners( link );
			}

			console.log('links ~>', links);
			console.log('anchorLinks ~>', anchorLinks);
		}
	}

	var addListeners = function ( link ) {
		// Add event listener to prevent default functionality
		link.addEventListener( 'click', function ( e ) {

			if ( link.hash.includes( '/' ) || link.hash === "#nav" || link.hash === "#" || link.hash.includes( '##' ) ) {
				return;
			} else {
				e.preventDefault();
			}

			var target =
				anchorLinks.find( function ( anchor ) {
					if ( anchor.hash === link.hash ) {
						return anchor.hash
					}
				} );

			if ( !target || target === "#" || target.hash === "#nav" ) {
				return;
			} else {
				var elem = getElem( target.hash );

				elem.focus();
				scrollStart( target.hash );
			}
		} );
	};

	var getDistance = function ( hash ) {
		var currentLocation = document.querySelector('html').scrollTop, // get current location
			anchorLocation = getEndLocation( hash );

		return anchorLocation - currentLocation;
	}

	var scrollStart = function ( hash ) {
		var distance = getDistance( hash );

		if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent ) ) {
			smoothScrollTo( getEndLocation( hash ), options.animation.duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		} else if ( 'scrollBehavior' in document.documentElement.style ) { //Checks if browser supports scroll function
			window.scrollBy( {
				top: distance,
				behavior: 'smooth',
				block: 'start'
			} );
		} else {
			smoothScrollTo( getEndLocation( hash ), options.animation.duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		}

		scrollStop();
		setFocus( hash );
	};

	// * JVSmoothScroll ScrollTo Method
	var smoothScrollTo = function ( endY, duration=options.animation.duration, startY=0 ) {
		if ( typeof endY != 'number' ) {
			endY = getEndLocation( endY );
		}

		console.groupCollapsed('~ smoothScrollTo ~');
		console.log('endY ~>', endY);
		console.log('duration ~>', duration);
		console.log('startY ~>', startY);
		console.groupEnd();

		var sY = startY,
			distanceY = endY - sY,
			startTime = new Date().getTime(),
			d = duration;

		// Easing function
		var timer = window.setInterval( function () {
			var time = new Date().getTime() - startTime,
				newY = easeInOut( time, sY, distanceY, d );

			if ( time >= d ) {
				window.clearInterval( timer );
			}

			window.scrollTo( 0, newY );
		}, 1000 / 60 ); // 60 fps
	};

	var scrollStop = function () {
		!!options.animation.callback ? options.animation.callback() : function() {};
		anchorLinks = [];
		getAnchors( links );
	};

	var setFocus = function( hash ) {
		let el = getElem( hash );
		el.tabIndex = 0;
		el.focus();
		el.removeAttribute('tabindex');
	}

	// * JVSmoothScroll constructor * //
	function JVSmoothScroll( opts=false ) {
		window.addEventListener('load', function() {
			opts = !!opts ? opts : defaultOptions
			console.log( 'opts ~>', opts );

			// Overwrite defaults
			options = merge( defaultOptions, opts );

			console.log( 'options ~>', options );

			// // Things needed
			var header = {
				elem: !!options.header.selector ? getElem( 'header' ) : getElem( 'header' ),
				fixed: !!options.header.fixed ? options.header.fixed : defaultOptions.header.fixed,
				selector: !!options.header.selector ? options.header.selector : defaultOptions.header.selector,
				height: !!options.header.fixed ? !!options.header.height ? options.header.height : !!options.header.selector ? getHeight( getElem( options.header.selector ) ) : getHeight( getElem( 'header' ) ) : 0
			};

			options.header = merge( header, opts.header );

			console.log( 'options.header ~>', options.header );

			links = document.querySelectorAll( options.ignoreNg ? options.container + ' ' + options.selector + ',' + options.container + ' ' + options.ngSelector : options.container + ' ' + options.selector );

			if ( !!links ) getAnchors( links );
		})
	}

	/* FOR TESTING */
	function log( e ) {
		if ( e.key == 'l' && e.metaKey && e.shiftKey ) {
			console.groupCollapsed( '~ Log ~' );
			console.log('options ~>', options);
			console.log('links ~>', links);
			console.log('anchorLinks ~>', anchorLinks);
			console.groupEnd();
		}
	}
	window.addEventListener('keydown', log);
	/* FOR TESTING */

	// * On Window Load
	// When the page renders, go to hash target
	window.addEventListener( 'load', function() {
		var hash = location.hash && location.hash.replace( '/', '' );
		var anchor = anchorLinks.find( function ( link ) {
			link.hash === hash
		} );

		console.groupCollapsed( '~ onLoad ~' );
		console.log( 'hash ~>', hash );
		console.log( 'anchorLinks ~>', anchorLinks );
		console.log( 'anchor ~>', anchor );
		console.groupEnd();

		if ( anchor ) {
			// Check for special occasions noted by team
			anchor.hash.includes( '#!' ) ? anchor.hash = anchor.hash.replace( '#!', '' ) : anchor.hash;
			anchor.hash.includes( '%23' ) ? anchor.hash = anchor.hash.replace( '%23', '#' ) : anchor.hash;
			// Wait for client side to catch up, then scroll to target
			if ( document.body.scrollTop <= 0 ) {
				setTimeout( function () {
					smoothScrollTo( anchor.top );
				}, 10 );
			} else {
				setTimeout( function () {
					smoothScrollTo( ( ( document.body.scrollTop * -1 ) + anchor.top ) );
				}, 10 );
			}
		} else if ( hash.length > 0 ) {
			if ( document.body.scrollTop <= 0 ) {
				setTimeout( function () {
					smoothScrollTo( getEndLocation( hash ) )
				} );
			} else {
				setTimeout( function () {
					smoothScrollTo( ( ( document.body.scrollTop * -1 ) + document.querySelector( hash ).getBoundingClientRect().top ) )
				} );
			}
		}
	});

	window.JVSmoothScroll = JVSmoothScroll
}() );