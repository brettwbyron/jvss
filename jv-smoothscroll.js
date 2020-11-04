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

	var anchorLinks = [];
	var defaultOptions = {
		container: 'html',
		selector: 'a[href*="#"]:not([href="#"])',
		backToTop: true,
		animation: {
			tolerance: 0,
			duration: 800,
			easing: 'easeInOut', // 'easeIn', 'easeOut', 'easeInOut'
			callback: function () {},
		},
		header: {
			fixed: false,
			height: 0,
			selector: 'header',
			offset: 0
		},
		offset: 0
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
		Object.keys( obj1 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj1[ propertyName ];
		} );

		Object.keys( obj2 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj2[ propertyName ];
		} );
		return obj3;
	};

	var getHeight = function ( elem ) {
		return parseInt( window.getComputedStyle( elem ).height );
	};

	var getElem = function ( selector ) {
		if ( selector === undefined ) return;
		// if ( selector.includes('##') ) return;
		if ( typeof selector === HTMLElement ) return selector;

		if ( !!selector && typeof selector === 'string') {
			if ( selector.lastIndexOf( '.' ) > 0 || selector.lastIndexOf( '#' ) > 0 ) {
				selector.includes( '##' ) ? selector = selector.replace( '##', '#' ) : null;
				return document.querySelector( selector )
			} else if ( selector.lastIndexOf('.') === 0 && selector.lastIndexOf( '#' ) < 0 ) {
				return document.getElementsByClassName( selector.substr( 1 ) )[0]
			} else if ( selector.lastIndexOf( '#' ) === 0 && selector.lastIndexOf( '.' ) < 0 ) {
				return document.getElementById( selector.substr( 1 ) )
			} else if ( selector.lastIndexOf( '.' ) < 0 && selector.lastIndexOf( '#' ) < 0 ) {
				return document.getElementsByTagName( selector )[0]
			}
		}
	};

	var getEndLocation = function ( anchor ) {
		var anchorElem = typeof anchor === 'string' ? getElem( anchor ) : anchor;
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

	var getAnchors = function ( links, backToTop ) {
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			let anchor;

			console.log('!link.hash ~>', !link.hash);
			if (!link.hash && !!backToTop) {
				anchor = getElem( 'body' );
			} else {
				anchor = getElem( link.hash );
			};

			if ( !!anchor ) anchor.classList.add( 'jvss-anchor' );

			// If the link points to the same base page
			if ( location.pathname.replace( /^\//, '' ) == link.pathname.replace( /^\//, '' ) && location.hostname == link.hostname ) {
				var anchorTop = getEndLocation( link.hash );
				var distance = getDistance( link.hash );

				// Add each link's { hash, top } values to anchorLinks[]
				anchorLinks.push( {
					hash: link.hash ? link.hash : '',
					top: anchorTop ? anchorTop : 0,
					distance: distance ? distance : 0
				} );
				addListeners( link );
			}
		}
	}

	var addListeners = function ( link ) {
		link.classList.add( 'jvss-anchor-link' );

		// Add event listener to prevent default functionality
		link.addEventListener( 'click', function ( e ) {
			var target = anchorLinks.find( function ( anchor ) {
				if ( !anchor.hash ) return 'body';

				if ( anchor.hash === link.hash ) {
					return anchor.hash
				}
			} ),

			elem = getElem( target );
			!!elem ? elem.focus() : null;
			e.preventDefault();

			// console.log( 'link clicked\nlink ~>', link );
			// console.log( 'e ~>', e );
			// console.log( 'target ~>', target );

			scrollStart( target );
		} );
	};

	var getDistance = function ( hash ) {
		var currentLocation = document.querySelector('html').scrollTop, // get current location
			anchorLocation = getEndLocation( hash );

		return anchorLocation - currentLocation;
	}

	var scrollStart = function ( hash ) {
		var distance = getDistance( hash );

		// if ( 'scrollBehavior' in document.documentElement.style ) { //Checks if browser supports scroll function
		// 	window.scrollBy( {
		// 		top: distance,
		// 		behavior: 'smooth',
		// 		block: 'start'
		// 	} );
		// } else {
			smoothScrollTo( getEndLocation( hash ), options.animation.duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		// }

		scrollStop();
	};

	// * JVSmoothScroll ScrollTo Method
	var smoothScrollTo = function ( endY, duration, startY ) {
		if ( typeof endY != 'number' ) {
			endY = getEndLocation( endY );
		}
		var startY = startY ? startY : 0,
			distanceY = endY - startY,
			startTime = new Date().getTime(),
			duration = duration ? duration : options.animation.duration;

		// Easing function
		var timer = window.setInterval( function () {
			var time = new Date().getTime() - startTime,
				newY = easeInOut( time, startY, distanceY, duration );
			if ( time >= duration || newY >= endY ) {
				window.clearInterval( timer );
			}
			window.scrollTo( 0, newY );
		}, 1000 / 60 ); // 60 fps
	};

	var scrollStop = function () {
		options.animation.callback();
		anchorLinks = [];
		getAnchors( links );
	};

	// * JVSmoothScroll constructor * //
	function JVSmoothScroll( opts ) {

		opts = !!opts ? opts : defaultOptions

		if ( opts.backToTop ) { opts.selector = opts.selector + ', .back-to-top' }
		// Overwrite defaults
		options = merge( defaultOptions, opts );

		// Things needed
		var header = {
			elem: !!options.header.selector ? getElem( 'header' ) : getElem( 'header' ),
			fixed: !!options.header.fixed ? options.header.fixed : defaultOptions.header.fixed,
			selector: !!options.header.selector ? options.header.selector : defaultOptions.header.selector,
			height: !!options.header.fixed ? !!parseInt( options.header.height ) ? options.header.height : !!options.header.selector ? getHeight( getElem( options.header.selector ) ) : getHeight( getElem( 'header' ) ) : 0,
			offset: !!options.header.offset ? options.header.offset : defaultOptions.header.offset
		};

		options.header = merge( opts.header, header );


		links = document.querySelectorAll( '' + options.container + ' ' + options.selector );
		if ( options.backToTop ) {
			console.log('links ~>', links);
			// links.length > 1 ? links.push( document.querySelector('.back-to-top') ) : null;
		}

		if ( !!links ) {
			!!options.backToTop ? getAnchors( links, true ) : getAnchors( links, false );
		}
	}

	// * On Window Load
	// When the page renders, go to hash target
	window.onload = function () {
		var hash = location.hash ? location.hash.replace( '/', '' ) : null;
		var anchor = anchorLinks.find( function ( link ) {
			link.hash === hash
		} );
		if ( anchor ) {
			console.log('anchor ~>', anchor);
			// Check for special occasions noted by team
			anchor.hash.includes( '##' ) ? anchor.hash = anchor.hash.replace( '##', '#') : anchor.hash.includes( '#!' ) ? anchor.hash = anchor.hash.replace( '#!', '' ) : anchor.hash.includes( '%23' ) ? anchor.hash = anchor.hash.replace( '%23', '#' ) : anchor.hash;
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
		} else if ( location.hash.length > 0 ) {
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
	};

	window.JVSmoothScroll = JVSmoothScroll
}() );