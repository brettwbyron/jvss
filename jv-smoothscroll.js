( function () {
	'use strict';

	var anchorLinks = [];
	var defaultOptions = {
		'container': 'html',
		'selector': 'a[href*="#"]:not([href="#"])',
		'animation': {
			tolerance: 0,
			duration: 800,
			easing: 'easeInOut',
			callback: function () {},
		},
		'header': {
			'fixed': false,
			'height': 0,
			'selector': 'header',
			'offset': 0
		},
		'offset': 0
	};
	var hash, links, headerHeight, options, containerElem;

	/**
	 * Easing Functions
	 * @param  {number} t - current time
	 * @param  {number} b - start value
	 * @param  {number} c - change in value
	 * @param  {number} d - duration
	 * @return {number} - calculated value
	 */
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

	/**
	 * Merge two objects
	 *
	 * @param  {object} obj1
	 * @param  {object} obj2
	 * @return {object} merged object
	 */
	function merge( obj1, obj2 ) {
		const obj3 = {};
		Object.keys( obj1 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj1[ propertyName ];
		} );

		Object.keys( obj2 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj2[ propertyName ];
		} );
		return obj3;
	};

	/**
	 * Get the height of an element.
	 * @param  {Node} elem The element to get the height of
	 * @return {Number}    The element's height in pixels
	 */
	var getHeight = function ( elem ) {
		return parseInt( window.getComputedStyle( elem ).height );
	};

	/**
	 * Shortcut for document.getElement[...] methods and document.querySelector for complex selectors
	 * @param  {String}  selector
	 * @return {Element} first instance
	 */
	var getElem = function ( selector ) {
		if ( typeof selector === HTMLElement ) return selector;

		if ( selector.lastIndexOf( '.' ) > 0 || selector.lastIndexOf( '#' ) > 0 ) {
			return document.querySelector( selector )
		} else if ( selector.lastIndexOf('.') === 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByClassName( selector.substr( 1 ) )[0]
		} else if ( selector.lastIndexOf( '#' ) === 0 && selector.lastIndexOf( '.' ) < 0 ) {
			return document.getElementById( selector.substr( 1 ) )
		} else if ( selector.lastIndexOf( '.' ) < 0 && selector.lastIndexOf( '#' ) < 0 ) {
			return document.getElementsByTagName( selector )[0]
		}
	};

	/**
	 * Calculate how far to scroll
	 * @param {Element} anchor       The anchor element to scroll to
	 * @param {Number}  headerHeight Height of a fixed header, if any
	 * @param {Number}  offset       Number of pixels by which to offset scroll
	 * @returns {Number}
	 */
	var getEndLocation = function ( anchor ) {
		var anchorElem = typeof anchor === 'string' ? getElem( anchor ) : getElem( anchor.hash );
		var location = 0;
		if ( anchorElem.offsetParent ) {
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
			const link = links[i];
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
			}
		}
	}

	var addListeners = function ( link ) {
		// Add event listener to prevent default functionality
		link.addEventListener( 'click', function ( e ) {
			e.preventDefault();

			var target = anchorLinks.find( function ( anchor ) {
				if ( anchor.hash === link.hash ) {
					return anchor.hash
				}
			} );

			smoothScrollTo( document.querySelector( 'html' ).scrollTop, getEndLocation( target ), options.animation.duration ); // starting location, end

			scrollStop();
		} );
	};

	/**
	 * Get distance to clicked anchor
	 * @param {String} hash the target hash value
	 */
	var getDistance = function ( hash ) {
		var currentLocation = document.querySelector('html').scrollTop; // get current location
		var anchorLocation = getEndLocation( hash );

		return anchorLocation - currentLocation;
	}

	var scrollStop = function () {
		anchorLinks = [];
		getAnchors( links );
	};

	var smoothScrollTo = function ( startY, endY, duration ) {
		var startY = startY,
			distanceY = endY - startY,
			startTime = new Date().getTime();

		// Easing function
		var easeInOutQuart = function ( time, from, distance, duration ) {
			if ( ( time /= duration / 2 ) < 1 ) return distance / 2 * time * time * time * time + from;
			return -distance / 2 * ( ( time -= 2 ) * time * time * time - 2 ) + from;
		};

		var timer = window.setInterval( function () {
			var time = new Date().getTime() - startTime,
				newY = easeInOut( time, startY, distanceY, duration );
			if ( time >= duration ) {
				window.clearInterval( timer );
			}
			window.scrollTo( 0, newY );
		}, 1000 / 60 ); // 60 fps
	};

	/**
	 * JVSmoothScroll constructor
	 * @param  {object} initialized options
	 */
	function JVSmoothScroll( opts ) {
		// Overwrite defaults
		options = merge( defaultOptions, opts );

		// Things needed
		var header = {
			elem: !!options.header.selector ? getElem( 'header' ) : getElem( 'header' ),
			fixed: !!options.header.fixed ? options.header.fixed : defaultOptions.header.fixed,
			selector: !!options.header.selector ? options.header.selector : defaultOptions.header.selector,
			height: !!parseInt( options.header.height ) ? options.header.height : !!options.header.selector ? getHeight( getElem( options.header.selector ) ) : getHeight( getElem( 'header' ) ),
			offset: !!options.header.offset ? options.header.offset : defaultOptions.header.offset
		};

		options.header = merge( opts.header, header );

		headerHeight = header.height;
		links = document.querySelectorAll( '' + options.container + ' ' + options.selector );

		getAnchors( links );
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			addListeners( link );
		}
	}

	/**
	 * ScrollTo
	 * Scrolls to a given element by using easing function
	 * @param  {HTMLElement|number} target Target element to be scrolled or target position
	 */
	JVSmoothScroll.scrollTo = function( target ) {
		if ( target !== 0 && !target ) {
			return;
		}

		containerElem = typeof options.container === HTMLElement ? options.container : getElem( options.container )

		var distance = typeof target === 'number' ? target : target.offsetTop;
		const from = getEndLocation( containerElem );
		var startTime = null;
		var lastYOffset;
		distance -= options.animation.tolerance;

		//.prototype rAF loop
		const loop = function( currentTime ) {
			const currentYOffset = getEndLocation( containerElem );

			if ( !startTime ) {
				// Starts time from 1; subtracted 1 from current time to start at 0
				// If time starts from 1 The first loop will not do anything,
				// because easing value will be zero
				startTime = currentTime - 1;
			}

			const timeElapsed = currentTime - startTime;

			if ( lastYOffset ) {
				if (
					( distance > 0 && lastYOffset > currentYOffset ) ||
					( distance < 0 && lastYOffset < currentYOffset )
				) {
					if ( options.animation.callback() != undefined ) {
						return options.animation.callback( target );
					}
				}
			}
			lastYOffset = currentYOffset;

			const val = easingFunctions[options.animation.easing]( timeElapsed, from, distance, options.animation.duration );

			window.scroll( 0, val );

			if ( timeElapsed < options.animation.duration ) {
				window.requestAnimationFrame( loop );
			} else {
				window.scroll( 0, distance + from );
				if ( options.animation.callback() != undefined ) {
					options.animation.callback( target );
				}
			}
		};

		window.requestAnimationFrame( loop );
	};

	// When the page renders, go to hash target
	window.onload = function () {
		var hash = location.hash ? location.hash.replace( '/', '' ) : null;
		var anchor = anchorLinks.find( function ( link ) {
			link.hash === hash
		} );
		if ( anchor ) {
			// Check for special occasions noted by team
			anchor.hash.includes( '#!' ) ? anchor.hash = anchor.hash.replace( '#!', '' ) : anchor.hash;
			anchor.hash.includes( '%23' ) ? anchor.hash = anchor.hash.replace( '%23', '#' ) : anchor.hash;
			// Wait for client side to catch up, then scroll to target
			if ( document.body.scrollTop <= 0 ) {
				setTimeout( function () {
					JVSmoothScroll.scrollTo( anchor.top );
				}, 10 );
			} else {
				setTimeout( function () {
					JVSmoothScroll.scrollTo( ( ( document.body.scrollTop * -1 ) + anchor.top ) );
				}, 10 );
			}
		} else if ( location.hash.length > 0 ) {
			if ( document.body.scrollTop <= 0 ) {
				setTimeout( function () {
					JVSmoothScroll.scrollTo( getEndLocation( getElem( hash ) ) )
				} );
			} else {
				setTimeout( function () {
					JVSmoothScroll.scrollTo( ( ( document.body.scrollTop * -1 ) + document.querySelector( hash ).getBoundingClientRect().top ) )
				} );
			}
		}
	};

	window.JVSmoothScroll = JVSmoothScroll
}() );