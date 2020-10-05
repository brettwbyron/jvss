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
		console.log( 'v-------- merge( obj1, obj2 ) -------v' );
		console.log( '\t -> obj1:', {obj1} );
		console.log( '\t -> obj2:', {obj2} );
		const obj3 = {};
		obj1 = !!obj1 ? obj1 : {};
		obj2 = !!obj2 ? obj2 : {};
		Object.keys( obj1 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj1[ propertyName ];
		} );

		Object.keys( obj2 ).forEach( function( propertyName ) {
			obj3[ propertyName ] = obj2[ propertyName ];
		} );

		console.log( '\t -> return', obj3 );
		console.log( '^-------- merge( obj1, obj2 ) -------^' );
		return obj3;
	};

	/**
	 * Get the height of an element.
	 * @param  {Node} elem The element to get the height of
	 * @return {Number}    The element's height in pixels
	 */
	var getHeight = function ( elem ) {
		console.log( 'v-------- getHeight( elem ) ---------v' );
		console.log( '\t -> elem:', elem );
		console.log( '\t -> return', parseInt( window.getComputedStyle( elem ).height ) );
		console.log( '^-------- getHeight( elem ) ---------^' );
		return parseInt( window.getComputedStyle( elem ).height );
	};

	/**
	 * Shortcut for document.getElement[...] methods and document.querySelector for complex selectors
	 * @param  {String}  selector
	 * @return {Element} first instance
	 */
	var getElem = function ( selector ) {
		console.log( 'v------- getElem( selector ) --------v' );
		console.log( '\t -> selector', selector );
		if ( selector === undefined ) return;
		else if ( typeof selector === HTMLElement ) return selector;

		if ( selector.lastIndexOf( '.' ) > 0 || selector.lastIndexOf( '#' ) > 0 ) {
			console.log( '\t -> return', document.querySelector( selector ) );
			console.log( '^------- getElem( selector ) --------^' );
			return document.querySelector( selector )
		} else if ( selector.lastIndexOf('.') === 0 && selector.lastIndexOf( '#' ) < 0 ) {
			console.log( '\t -> return', document.getElementsByClassName( selector.substr( 1 ) )[0] );
			console.log( '^------- getElem( selector ) --------^' );
			return document.getElementsByClassName( selector.substr( 1 ) )[0]
		} else if ( selector.lastIndexOf( '#' ) === 0 && selector.lastIndexOf( '.' ) < 0 ) {
			console.log( '\t -> return', document.getElementById( selector.substr( 1 ) ) );
			console.log( '^------- getElem( selector ) --------^' );
			return document.getElementById( selector.substr( 1 ) )
		} else if ( selector.lastIndexOf( '.' ) < 0 && selector.lastIndexOf( '#' ) < 0 ) {
			console.log( '\t -> return', document.getElementsByTagName( selector )[0] );
			console.log( '^------- getElem( selector ) --------^' );
			return document.getElementsByTagName( selector )[0]
		}
	};

	/**
	 * Calculate how far to scroll
	 * @param {Element} anchor       The anchor element to scroll to
	 * @returns {Number}
	 */
	var getEndLocation = function ( anchor ) {
		console.log( 'v----- getEndLocation( anchor ) -----v' );
		console.log( '\t -> anchor:', anchor );
		var anchorElem = typeof anchor === 'string' ? getElem( anchor ) : getElem( anchor.hash );
		console.log( '--- anchorElem:', anchorElem );
		var location = 0;
		if ( anchorElem && anchorElem.offsetParent ) {
			do {
				location += anchorElem.offsetTop;
				anchorElem = anchorElem.offsetParent;
			} while ( anchorElem );
		}
		location = Math.max( location - options.header.height - options.offset, 0 );
		console.log( '\t -> return', location );
		console.log( '^----- getEndLocation( anchor ) -----^' );
		return location;
	};

	/**
	 * Set DOM element info for each anchor link target
	 * @param {Array} links		array of links with hashes
	 */
	var getAnchors = function ( links ) {
		console.log( 'v------- getAnchors( links ) --------v' );
		console.log( '\t -> links:', { links }, '---' );

		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			const anchor = getElem( link.hash );
			if (!!anchor) anchor.classList.add('jvss-anchor');

			console.log( '- for (let ', i ,' = 0; ', i ,' <', links.length, '; ', i ,'++) {' );
			console.log( '-- const link =', { link }, '\n...}' );
			console.log( '-- if ( ', location.pathname.replace( /^\//, '' ), ' == ', link.pathname.replace( /^\//, "" ), ' && ', location.hostname, ' == ', link.hostname, ' ) {' );
			// If the link points to the same base page
			if ( location.pathname.replace( /^\//, '' ) == link.pathname.replace( /^\//, '' ) && location.hostname == link.hostname ) {
				console.log( '--- (hash ===', link.hash ? link.hash : '""', ')' );
				var anchorTop = getEndLocation( link.hash );
				console.log( '--- var anchorTop = getEndLocation(', link.hash ,') === ', anchorTop );

				var distance = getDistance( link.hash );
				console.log( '--- var distance = getDistance(', link.hash ,') === ', distance );

				// Add each link's { hash, top } values to anchorLinks[]
				anchorLinks.push( {
					hash: link.hash ? link.hash : '',
					top: anchorTop ? anchorTop : 0,
					distance: distance ? distance : 0
				} );
				console.log( '--- anchorLinks.push({\n\t---- hash:', link.hash ? link.hash : '' ,'\n\t---- top:', anchorTop ? anchorTop : 0 ,'\n\t---- distance:', distance ? distance : 0, '\n--- })' );

				addListeners( link );
			}
		}


		console.log( '\t -> anchorLinks:', { anchorLinks }, '---' );
		console.log( '^------- getAnchors( links ) --------^' );
	}

	var addListeners = function ( link ) {
		console.log( 'v------- addListeners( link ) -------v' );
		console.log( '\t -> link:', link );
		link.classList.add( 'jvss-anchor-link' );



		// Add event listener to prevent default functionality
		link.addEventListener( 'click', function ( e ) {
			var target = anchorLinks.find( function ( anchor ) {
				if ( anchor.hash === link.hash ) {
					console.log( '-- {in .find()} anchor:', anchor );
					return anchor.hash
				}
			} ),
				elem = getElem( target.hash );

			console.log( '\t -> e:', e );
			console.log( '\t -> link:', link );
			console.log( '\t -> target:', target );
			console.log( '\t -> elem:', elem );
			console.log( '^------- addListeners( link ) -------^' );
			elem.focus();
			e.preventDefault();
			scrollStart( target.hash );
		} );
	};

	/**
	 * Get distance to clicked anchor
	 * @param {String} hash the target hash value
	 */
	var getDistance = function ( hash ) {
		console.log( 'v------- getDistance( hash ) --------v' );
		console.log( '\t -> hash:', hash );
		var currentLocation = document.querySelector('html').scrollTop; // get current location
		console.log( '- var currentLocation =', currentLocation );
		var anchorLocation = getEndLocation( hash );
		console.log( '- var anchorLocation = getEndLocation(', hash, ') =', anchorLocation );

		console.log( '\t -> return anchorLocation - currentLocation ===', anchorLocation - currentLocation );
		console.log( '^------- getDistance( hash ) --------^' );
		return anchorLocation - currentLocation;
	}

	/**
	 * Scroll to target adjustments
	 * @param {String} hash The anchor hash
	 */
	var scrollStart = function ( hash ) {
		console.log( 'v------- scrollStart( hash ) --------v' );
		console.log( '\t -> hash:', hash );
		var distance = getDistance( hash );
		console.log( 'var distance = ', getDistance( hash ) );

		if ( 'scrollBehavior' in document.documentElement.style ) { //Checks if browser supports scroll function
			window.scrollBy( {
				top: distance,
				behavior: 'smooth',
				block: 'start'
			} );
		} else {
			smoothScrollTo( getEndLocation( hash ), options.animation.duration, document.querySelector( 'html' ).scrollTop ); //polyfill below
		}

		scrollStop();
		console.log( '^------- scrollStart( hash ) --------^' );
	};

	// * JVSmoothScroll ScrollTo Method
	var smoothScrollTo = function ( endY, duration, startY ) {
		console.log( 'v---- smoothScrollTo( end, dur, str ) ----v' );
		console.log( '\t -> typeof end ===', typeof endY );
		if ( typeof endY != 'number' ) {
			endY = getEndLocation( endY );
		}
		var startY = startY ? startY : 0,
			distanceY = endY - startY,
			startTime = new Date().getTime(),
			duration = duration ? duration : options.animation.duration;
		console.log( '- end:', endY );
		console.log( '- duration:', duration );
		console.log( '- start:', startY );
		// Easing function
		var timer = window.setInterval( function () {
			var time = new Date().getTime() - startTime,
				newY = easeInOut( time, startY, distanceY, duration );
			if ( time >= duration || newY >= endY ) {
				window.clearInterval( timer );
			}
			window.scrollTo( 0, newY );
		}, 1000 / 60 ); // 60 fps
		console.log( '^---- smoothScrollTo( end, dur, str ) ----^' );
	};

	var scrollStop = function () {
		console.log( '---vvv---vvv scrollStop() vvv---vvv--' );
		options.animation.callback();
		anchorLinks = [];
		getAnchors( links );
		console.log( '---^^^---^^^ scrollStop() ^^^---^^^--' );
	};

	/**
	 * JVSmoothScroll constructor
	 * @param  {object} initialized options
	 */
	function JVSmoothScroll( opts ) {
		console.log( 'v------ JVSmoothScroll( opts ) ------v' );
		console.log( 'init opts:', {opts} );

		opts = !!opts ? opts : defaultOptions
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

		console.log( 'final opts:', {options} );

		links = document.querySelectorAll( '' + options.container + ' ' + options.selector );

		if ( !!links ) getAnchors( links );
		console.log( '^------ JVSmoothScroll( opts ) ------^' );
	}

	// When the page renders, go to hash target
	window.onload = function () {
		console.log( 'v--------- window.onload() ----------v' );
		var hash = location.hash ? location.hash.replace( '/', '' ) : null;
		console.log( 'var hash = location.hash ? location.hash.replace( \'/\', \'\' ) : null;' );
		console.log( 'var hash = ',location.hash,' ? ', location.hash.replace( '/', '' ),' : null ===', hash );
		var anchor = anchorLinks.find( function ( link ) {
			link.hash === hash
		} );
		console.log( 'var anchor = anchorLinks.find(',hash,') => ', anchor );
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
		console.log( '^---------- window.onload() -----------^' );
	};

	window.JVSmoothScroll = JVSmoothScroll
}() );