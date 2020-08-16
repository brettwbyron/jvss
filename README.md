# JV Smooth Scroll
A smooth scroll library made in Vanilla JS for Jobvite CWS sites.

---

## Getting Started

### 1. Include JV Smooth Scroll

#### Direct Download
You can [download the files directly from GitHub](https://github.com/jobvite-github/jv-smooth-scroll/archive/master.zip)
```html
<script src="path/to/jv-smoothscroll.js">
```
or include it in your markup with:
```html
<script src="//careers.jobvite.com/common/js/jv-smoothscroll/jv-smoothscroll.js">
```

### 2. Initialize the smooth scroll with your [settings](#custom-settings)
```js
var jvSmoothScroll = new JVSmoothScroll({
	'selector': 'a[href*="#"]:not([href="#"])',
	'animation': {
		'duration': 999,
		'easing': 'easeInOut'
	},
	'header': {
		'fixed': true,
		'height': 100
	},
	'offset': 15
});
```
or simply
```js
var jvSmoothScroll = new JVSmoothScroll();
```

## Settings
```js
defaultOptions = {
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
}
```