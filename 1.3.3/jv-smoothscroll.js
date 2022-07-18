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

	var anchors = [],
		disabled = [];
	var defaultOptions = {
		container: 'html',
		selector: 'a[href*="#"]:not([href="#"])',
		disable: '',
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
		ngSelector: ':not([ng-href])'
	};
	var links, options, curHash;
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
	var easeInOut = function ( t, b, c, d ) {
		if ( ( t /= d / 2 ) < 1 ) {
			return c / 2 * t * t + b;
		}
		return -c / 2 * ( ( --t ) * ( t - 2 ) - 1 ) + b;
	}
	var easingFunctions = {
		easeIn: easeIn,
		easeOut: easeOut,
		easeInOut: easeInOut
	};

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

	var isDisabled = function ( link ) {
		const hash = link.hash || link.dataset.href;
		return hash.includes( '/' ) || hash === "#nav" || hash.includes( '##' ) || disabled.includes( link );
	};

	var getElem = function ( selector ) {
		if ( selector === undefined ) return;
		if ( selector.includes( '##' ) ) return;
		else if ( typeof selector === HTMLElement ) return selector;

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
		location = Math.max( location - options.header.height - options.offset, 0 );
		return location;
	};

	var getAnchors = function ( links ) {
		for ( let i = 0; i < links.length; i++ ) {
			const link = links[ i ];
			link.classList.add( 'jvss-anchor-link' );
			isDisabled( link ) && link.classList.add( 'jvss-disabled' );
			curHash = link.hash || link.dataset.href || link;
			const anchor = getElem( curHash );

			if ( !!anchor && !isDisabled( link ) ) anchor.classList.add( 'jvss-anchor' );

			// If the link points to the same base page
			let location_pathname = location.pathname.replace( /^\//, '' ),
				location_hostname = location.hostname,
				link_pathname = link.pathname ? link.pathname.replace( /^\//, '' ) : link.dataset.pathname = location_pathname,
				link_hostname = link.hostname ? link.hostname : link.dataset.hostname = location_hostname;

			if ( ( link_pathname.replace( '/jobs', '' ) == location_pathname.replace( '/jobs', '' ) || location_pathname == "" ) && location_hostname == link_hostname ) {
				var anchorTop = getEndLocation( curHash );
				var distance = getDistance( curHash );

				// Add each link's { hash, top } values to anchorLinks[]
				anchors.push( {
					hash: curHash ? curHash : '',
					top: anchorTop ? anchorTop : 0,
					distance: distance ? distance : 0
				} );
			}
		}

		addListeners();
	}

	var addListeners = function () {
		// Add event listener to prevent default functionality
		const linkList = document.querySelectorAll( '.jvss-anchor-link' );
		for ( let i = 0; i < linkList.length; i++ ) {
			const link = linkList[ i ];
			const hash = link.hash || link.dataset.href;

			link.addEventListener( 'click', function ( e ) {
				if ( hash.includes( '/' ) || hash === "#nav" || hash.includes( '##' ) || disabled.includes( link ) ) {
					scrollStart();
					return;
				}

				var target =
					anchors.find( function ( anchor ) {
						if ( anchor.hash === hash ) {
							return anchor.hash
						}
					} );

				if ( !target || target === "#" || target.hash === "#nav" ) {
					return;
				} else {
					e.preventDefault();

					var elem = getElem( target.hash );

					elem.focus();
					scrollStart( target.hash );
				}
			} );
		}
	};

	var getDistance = function ( hash ) {
		var currentLocation = document.querySelector( 'html' ).scrollTop, // get current location
			anchorLocation = getEndLocation( hash );

		return anchorLocation - currentLocation;
	}

	var scrollStart = function ( hash, duration=options.animation.duration ) {
		if ( !hash ) {
			smoothScrollTo( window.scrollY, 0, window.scrollY );
			return;
		}
		else if ( typeof hash == "number" ) {
			smoothScrollTo( hash, duration );
			return;
		}

		var distance = getDistance( hash );

		if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent ) ) {
			smoothScrollTo( getEndLocation( hash ), duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		} else if ( !!document.documentElement.style.scrollBehavior ) { //Checks if browser supports scroll function
			window.scrollBy( {
				top: distance,
				behavior: 'smooth',
				block: 'start'
			} );
		} else {
			smoothScrollTo( getEndLocation( hash ), duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		}

		scrollStop();
		setFocus( hash );
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

			if ( time >= duration ) {
				window.clearInterval( timer );
			}

			window.scrollTo( 0, newY );
		}, 1000 / 60 ); // 60 fps
	};

	var scrollStop = function () {
		!!options.animation.callback ? options.animation.callback() : function () {};
		anchors = [];
		getAnchors( links );
	};

	var setFocus = function ( hash ) {
		let el = getElem( hash );
		el.tabIndex = 0;
		el.focus();
		el.removeAttribute( 'tabindex' );
	}

	// * JVSmoothScroll constructor * //
	function JVSmoothScroll( opts = false ) {

		opts = !!opts ? opts : defaultOptions
		// Overwrite defaults
		options = merge( defaultOptions, opts );

		// Things needed
		var header = {
			elem: !!options.header.selector ? getElem( 'header' ) : getElem( 'header' ),
			fixed: !!options.header.fixed ? options.header.fixed : defaultOptions.header.fixed,
			selector: !!options.header.selector ? options.header.selector : defaultOptions.header.selector
		};

		options.header = merge( header, opts.header );

		options.header.height = options.header.fixed ? !!options.header.height ? options.header.height : !!options.header.selector ? getHeight( getElem( options.header.selector ) ) : getHeight( options.header.elem ) : 0;

		options.selector = options.container + ' ' + options.selector;

		if ( options.ignoreNg ) options.selector = options.selector + ':not(' + options.ngSelector + ')';

		if ( options.disable ) {
			if ( typeof options.disable == "string" ) options.disable = [ options.disable ];

			options.disable.forEach(selector => {
				disabled = [...disabled , ...document.querySelectorAll( selector )];
			});
		}

		links = document.querySelectorAll( options.selector );

		if ( !!links ) getAnchors( links );
	}

	/* FOR TESTING */
	function log( e ) {
		if ( e.key == 'l' && e.metaKey && e.shiftKey ) {
			console.group( '~ Log ~' );
			console.log( 'options ~>', options );
			console.log( 'links ~>', links );
			console.log( 'disabled ~>', disabled );
			console.log( 'anchors ~>', anchors );
			console.groupEnd();
		}
	}
	window.addEventListener( 'keydown', log );
	/* FOR TESTING */

	// * On Window Load
	// When the page renders, go to hash target
	window.onload = function () {
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