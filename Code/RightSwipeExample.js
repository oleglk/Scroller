// RightSwipeExample.js

<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Detecting a swipe (left, right, top or down) using touch</title>

<link rel="stylesheet" type="text/css" href="../jkincludes/articlesv2.css" />

<script type="text/javascript" src="../jkincludes/syntaxhighlight/syntax3/scripts/shCore.js"></script>
<script type="text/javascript" src="../jkincludes/syntaxhighlight/syntax3/scripts/shBrushJScript.js"></script>
<link href="../jkincludes/syntaxhighlight/syntax3/styles/shCoreDefault.css" rel="stylesheet" type="text/css" />

<script type="text/javascript">
     SyntaxHighlighter.all()
</script>

<style>

#touchsurface{
width: 300px;
height: 300px;
padding: 10px;
font-size: 24px;
line-height: 1.1em;
background: lightyellow;
border: 1px solid orange;
}

#touchsurface2{
width: 300px;
height: 300px;
border: 1px solid orange;
background: lightyellow url(arrows.png) center center no-repeat;
}

#touchsurface2 #inner{
width: 100%;
height: 100%;
}

</style>


<script>

function isContained(m, e){
	var e=e||window.event
	var c=/(click)|(mousedown)|(mouseup)/i.test(e.type)? e.target : ( e.relatedTarget || ((e.type=="mouseover")? e.fromElement : e.toElement) )
	while (c && c!=m)try {c=c.parentNode} catch(e){c=m}
	if (c==m)
		return true
	else
		return false
}


// Demo 1:

window.addEventListener('load', function(){

	var touchsurface = document.getElementById('touchsurface'),
			detecttouch = !!('ontouchstart' in window) || !!('ontouchstart' in document.documentElement) || !!window.ontouchstart || !!window.Touch || !!window.onmsgesturechange || (window.DocumentTouch && window.document instanceof window.DocumentTouch),
			startX,
			startY,
			dist,
			threshold = 150,
			allowedTime = 200,
			elapsedTime,
			startTime,
			ismousedown = false

	function handleswipe(isrightswipe){
		if (isrightswipe)
			touchsurface.innerHTML = 'Congrats, you\'ve made a <span style="color:red">right swipe!</span>'
		else{
			touchsurface.innerHTML = 'Condition for right swipe not met yet'
		}
	}

	touchsurface.addEventListener('touchstart', function(e){
		touchsurface.innerHTML = ''
		var touchobj = e.changedTouches[0]
		dist = 0
		startX = touchobj.pageX
		startY = touchobj.pageY
		startTime = new Date().getTime() // record time when finger first makes contact with surface
		e.preventDefault()
	
	}, false)

	touchsurface.addEventListener('touchmove', function(e){
		e.preventDefault() // prevent scrolling when inside DIV
	}, false)

	touchsurface.addEventListener('touchend', function(e){
		var touchobj = e.changedTouches[0]
		dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
		elapsedTime = new Date().getTime() - startTime // get time elapsed
		// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
		var swiperightBol = (elapsedTime <= allowedTime && dist >= threshold && Math.abs(touchobj.pageY - startY) <= 100)
		handleswipe(swiperightBol)
		e.preventDefault()
	}, false)
	
	if (!detecttouch){
		document.body.addEventListener('mousedown', function(e){
			if ( isContained(touchsurface, e) ){
				touchsurface.innerHTML = ''
				var touchobj = e
				dist = 0
				startX = touchobj.pageX
				startY = touchobj.pageY
				startTime = new Date().getTime() // record time when finger first makes contact with surface
				ismousedown = true
				e.preventDefault()
			}
		}, false)
	
		document.body.addEventListener('mousemove', function(e){
			e.preventDefault() // prevent scrolling when inside DIV
		}, false)
	
		document.body.addEventListener('mouseup', function(e){
			if (ismousedown){
				var touchobj = e
				dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
				elapsedTime = new Date().getTime() - startTime // get time elapsed
				// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
				var swiperightBol = (elapsedTime <= allowedTime && dist >= threshold && Math.abs(touchobj.pageY - startY) <= 100)
				handleswipe(swiperightBol)
				ismousedown = false
				e.preventDefault()
			}
		}, false)
	}
}, false)

// Demo 2:

function swipedetect(el, callback){

	var touchsurface = el,
			swipedir,
			startX,
			startY,
			distX,
			distY,
			threshold = 150,
			restraint = 100,
			allowedTime = 300,
			elapsedTime,
			startTime,
			ismousedown = false,
			detecttouch = !!('ontouchstart' in window) || !!('ontouchstart' in document.documentElement) || !!window.ontouchstart || !!window.Touch || !!window.onmsgesturechange || (window.DocumentTouch && window.document instanceof window.DocumentTouch),
			handleswipe = callback || function(swipedir){}

	touchsurface.addEventListener('touchstart', function(e){
		var touchobj = e.changedTouches[0]
		swipedir = 'none'
		dist = 0
		startX = touchobj.pageX
		startY = touchobj.pageY
		startTime = new Date().getTime() // record time when finger first makes contact with surface
		e.preventDefault()
	
	}, false)

	touchsurface.addEventListener('touchmove', function(e){
		e.preventDefault() // prevent scrolling when inside DIV
	}, false)

	touchsurface.addEventListener('touchend', function(e){
		var touchobj = e.changedTouches[0]
		distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
		distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
		elapsedTime = new Date().getTime() - startTime // get time elapsed
		if (elapsedTime <= allowedTime){ // first condition for awipe met
			if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
				swipedir = (distX < 0)? 'left' : 'right'
			}
			else if (Math.abs(distY) >= threshold  && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
				swipedir = (distY < 0)? 'up' : 'down'
			}
		}
		// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
		handleswipe(swipedir)
		e.preventDefault()
	}, false)

	if (!detecttouch){
		document.body.addEventListener('mousedown', function(e){
			if ( isContained(touchsurface, e) ){
				var touchobj = e
				swipedir = 'none'
				dist = 0
				startX = touchobj.pageX
				startY = touchobj.pageY
				startTime = new Date().getTime() // record time when finger first makes contact with surface
				ismousedown = true
				e.preventDefault()
			}
		}, false)
	
		document.body.addEventListener('mousemove', function(e){
			e.preventDefault() // prevent scrolling when inside DIV
		}, false)
	
		document.body.addEventListener('mouseup', function(e){
			if (ismousedown){
				var touchobj = e
				distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
				distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
				elapsedTime = new Date().getTime() - startTime // get time elapsed
				if (elapsedTime <= allowedTime){ // first condition for awipe met
					if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
						swipedir = (distX < 0)? 'left' : 'right'
					}
					else if (Math.abs(distY) >= threshold  && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
						swipedir = (distY < 0)? 'up' : 'down'
					}
				}
				// check that elapsed time is within specified, horizontal dist traveled >= threshold, and vertical dist traveled <= 100
				handleswipe(swipedir)
				ismousedown = false
				e.preventDefault()
			}
		}, false)
	}
}

window.addEventListener('load', function(){
	var el = document.getElementById('touchsurface2')
	var inner = document.getElementById('inner')
	var hidetimer = null
	swipedetect(el, function(swipedir){
		if (swipedir != 'none'){
			clearTimeout(hidetimer)
			var bgimage = swipedir + 'arrow.png'
			inner.style.background = 'transparent url(' + bgimage + ') center center no-repeat'
			hidetimer = setTimeout(function(){
				inner.style.background = ''
			}, 1000)
		}
			
	})
}, false)

</script>

</head>
<body>
<div id="maincontainer">

<div id="topsection">

      <div id="pathlinks"><a href="http://www.javascriptkit.com">Home</a> 
      <img border="0" src="../jkincludes/arrow.gif" width="15" height="18">
        <a href="http://www.javascriptkit.com/javatutors/">JavaScript Tutorials</a>
      <img border="0" src="../jkincludes/arrow.gif" width="15" height="18">
        <a href="http://www.javascriptkit.com/javatutors/">Touch Events</a>
      <img border="0" src="../jkincludes/arrow.gif" width="15" height="18">
        Detecting a swipe (left, right, top or down) using touch</div>
<p>
      <!-- BuySellAds Ad Code -->
<script type="text/javascript">
(function(){
  var bsa = document.createElement('script');
     bsa.type = 'text/javascript';
     bsa.async = true;
     bsa.src = 'http://s3.buysellads.com/ac/bsa.js';
  (document.getElementsByTagName('head')[0]||document.getElementsByTagName('body')[0]).appendChild(bsa);
})();
</script>
<!-- End BuySellAds Ad Code -->


<script type="text/javascript" src="http://www.javascriptkit.com/jkincludes/syntaxhighlight/shCore.js"></script>
<script type="text/javascript" src="http://www.javascriptkit.com/jkincludes/syntaxhighlight/shBrushJScript.js"></script>
<link href="http://www.javascriptkit.com/jkincludes/syntaxhighlight/shCore.css" rel="stylesheet" type="text/css" />
<link href="http://www.javascriptkit.com/jkincludes/syntaxhighlight/shThemeDefault.css" rel="stylesheet" type="text/css" />

<script type="text/javascript">
     SyntaxHighlighter.all()
</script>

<form id="jksitesearch" method="get" action="http://www.javascriptkit.com/search/search.php" class="zoom_searchform" style="text-align:right" onSubmit="if (this.zoom_query.value=='' || this.zoom_query.value=='Search JavaScript Kit'){alert('Please enter a search term first!'); return false}">
<input type="text" name="zoom_query" id="zoom_query" size="20" value="Search JavaScript Kit" class="zoom_searchbox" /> 
<input class="zoom_button" type="image" src="http://www.javascriptkit.com/jkincludes/search.gif" title="Search JK" />
<input name="zoom_per_page" id="zoom_per_page" type="hidden" value="10" />
<input name="zoom_and" id="zoom_and" type="hidden" value="1" />
<input type="hidden" name="zoom_sort" value="0" />

<div id="jksitesearch_cat">
<b>Categories:</b> <input type="checkbox" name="zoom_cat[]" value="-1" id="searchall" style="margin-left: 5px" /><label for="searchall">All</label> <input type="checkbox" name="zoom_cat[]" id="javascriptssearch" value="0" /><label for="javascriptssearch">Free JS/ Applets</label> <input type="checkbox" name="zoom_cat[]" id="tutorialsearch" value="1" checked="checked" /><label for="tutorialsearch">Tutorials</label> <input type="checkbox" name="zoom_cat[]" id="referencesearch" value="2" /><label for="referencesearch">References</label>
</div>

</form>


	<div id="bannerarea">
	<script type="text/javascript" src="http://www.javascriptkit.com/adbanner.js"></script>
	</div>

</div>

<div id="contentwrapper">
<div id="contentcolumn">
	<h3 align="left">Detecting a swipe (left, right, top or down) using touch</h3>
	<p align="left">Swiping in touch is the act of quickly moving your finger 
	across the touch surface in a certain direction. There is currently no &quot;<code>onswipe</code>&quot; event 
	in JavaScript, which means it's up to us to implement one using the 
	available touch events, plus define just when a swipe is a, well, &quot;swipe&quot;.</p>
	<p align="left">Lets first define when a movement across the touch surface 
	should be considered a swipe. There are two variables at play here- the 
	distance traveled by the user's finger on the x or y-axis from <code>touchstart</code> to 
	<code>touchend</code>, and, the time it took. Based on these two factors, we can decide 
	whether that action qualifies as a swipe and in what direction.</p>
	<p align="left">With that said, lets put ideas into action and see how to 
	go about detecting a swipe right (from left to right). Once we can do that, 
	detecting swipe in the other 3 directions is pretty much identical. For this exercise we'll stipulate that a right swipe has 
	occurred when the user has moved his finger across the touch surface a 
	minimum of 150px <b>horizontally</b> in 200 ms or less from left to right. 
	Furthermore, there should be no more than 100px traveled vertically, to 
	avoid &quot;false positives&quot; whereby the user swipes diagonally across, which we 
	don't want to qualify as a swipe right.</p>
	<p align="left"><b>Example (mouse simulation added for non touch devices):</b></p>
	<p align="left"><!--webbot bot="HTMLMarkup" startspan --><div id="touchsurface">Swipe Me</div><!--webbot bot="HTMLMarkup" endspan i-checksum="23164" --></p>
	<pre class="brush: js;">&lt;script&gt;

window.addEventListener('load', function(){

	var touchsurface = document.getElementById('touchsurface'),
		startX,
		startY,
		dist,
		threshold = 150, //required min distance traveled to be considered swipe
		allowedTime = 200, // maximum time allowed to travel that distance
		elapsedTime,
		startTime

	function handleswipe(isrightswipe){
		if (isrightswipe)
			touchsurface.innerHTML = 'Congrats, you\'ve made a &lt;span style="color:red"&gt;right swipe!&lt;/span&gt;'
		else{
			touchsurface.innerHTML = 'Condition for right swipe not met yet'
 		}
 	}

	touchsurface.addEventListener('touchstart', function(e){
		touchsurface.innerHTML = ''
		var touchobj = e.changedTouches[0]
		dist = 0
		startX = touchobj.pageX
		startY = touchobj.pageY
		startTime = new Date().getTime() // record time when finger first makes contact with surface
		e.preventDefault()
	}, false)

	touchsurface.addEventListener('touchmove', function(e){
		e.preventDefault() // prevent scrolling when inside DIV
	}, false)

	touchsurface.addEventListener('touchend', function(e){
		var touchobj = e.changedTouches[0]
		dist = touchobj.pageX - startX // get total dist traveled by finger while in contact with surface
		elapsedTime = new Date().getTime() - startTime // get time elapsed
		// check that elapsed time is within specified, horizontal dist traveled &gt;= threshold, and vertical dist traveled &lt;= 100
		var swiperightBol = (elapsedTime &lt;= allowedTime && dist &gt;= threshold && Math.abs(touchobj.pageY - startY) &lt;= 100)
		handleswipe(swiperightBol)
		e.preventDefault()
	}, false)

}, false) // end window.onload
&lt;/script&gt;

&lt;div id=&quot;touchsurface&quot;&gt;Swipe Me&lt;/div&gt;</pre>
	<p align="left">Inside <code>touchend</code>, we check that the dist traveled from 
	<code>touchstart</code> to <code>touchend</code> is a positive number above the specified threshold 
	value (ie: 150), since in a right swipe, that dist should always be positive 
	based on the equation used (versus negative for a left swipe). At the same 
	time, we make sure any vertical lateral movement traveled is less than 100px 
	to weed out diagonal swipes. Since the vertical movement can occur either above 
	the starting touch point or below, we use <code>Math.abs()</code> when getting the 
	absolute vertical dist traveled so both scenarios are covered when comparing it to our 
	vertical threshold value of 100.</p>
	<h3 align="left">A generic swipe detecting function</h3>
	<p align="left">Now that we 
	got right swipe down, lets create a more generic function that detects 
	swiping in either of the 4 directions (left, right, up, or down):</p>
	<pre class="brush: js;">function swipedetect(el, callback){
 
	var touchsurface = el,
	swipedir,
	startX,
	startY,
	distX,
	distY,
	threshold = 150, //required min distance traveled to be considered swipe
	restraint = 100, // maximum distance allowed at the same time in perpendicular direction
	allowedTime = 300, // maximum time allowed to travel that distance
	elapsedTime,
	startTime,
	handleswipe = callback || function(swipedir){}
 
	touchsurface.addEventListener('touchstart', function(e){
		var touchobj = e.changedTouches[0]
		swipedir = 'none'
		dist = 0
		startX = touchobj.pageX
		startY = touchobj.pageY
		startTime = new Date().getTime() // record time when finger first makes contact with surface
		e.preventDefault()
 	}, false)
 
	touchsurface.addEventListener('touchmove', function(e){
		e.preventDefault() // prevent scrolling when inside DIV
	}, false)
 
	touchsurface.addEventListener('touchend', function(e){
		var touchobj = e.changedTouches[0]
		distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
		distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
		elapsedTime = new Date().getTime() - startTime // get time elapsed
		if (elapsedTime &lt;= allowedTime){ // first condition for awipe met
			if (Math.abs(distX) &gt;= threshold && Math.abs(distY) &lt;= restraint){ // 2nd condition for horizontal swipe met
				swipedir = (distX &lt; 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
			}
			else if (Math.abs(distY) &gt;= threshold && Math.abs(distX) &lt;= restraint){ // 2nd condition for vertical swipe met
				swipedir = (distY &lt; 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
			}
		}
		handleswipe(swipedir)
		e.preventDefault()
	}, false)
}
 
//USAGE:
/*
var el = document.getElementById('someel')
swipedetect(el, function(swipedir){
	swipedir contains either "none", "left", "right", "top", or "down"
	if (swipedir =='left')
		alert('You just swiped left!')
})
*/</pre>
	<p align="left"><code>swipedetect()</code> accepts two parameters, the element to bind 
	the touch events to, plus a function to execute when a swipe has occurred. 
	The function parameter &quot;<code>swipedir</code>&quot; tells you the type of swipe that was just 
	made with five possible values: &quot;<b>none</b>&quot;, &quot;<b>left</b>&quot;, &quot;<b>right</b>&quot;, &quot;<b>top</b>&quot;, or &quot;<b>down</b>&quot;.</p>
	<p align="left">The below uses the <code>swipedetect()</code> function to show a &quot;left&quot;, &quot;right&quot;, &quot;top&quot;, or &quot;down&quot; 
	background image (overlaid on top of a default background image) depending 
	on the swipe that has just occurred:</p>
	<p align="left"><b>Example (mouse simulation added for non touch devices):</b></p>
	<p align="left"><!--webbot bot="HTMLMarkup" startspan --><div id="touchsurface2">
<div id="inner">
Swipe Me
</div>
</div><!--webbot bot="HTMLMarkup" endspan i-checksum="39332" --></p>
	<p align="left">The code used is:</p>
	<pre class="brush: js;">window.addEventListener('load', function(){
	var el = document.getElementById('touchsurface2')
	var inner = document.getElementById('inner')
	var hidetimer = null
	swipedetect(el, function(swipedir){
		if (swipedir != 'none'){
			clearTimeout(hidetimer)
			var bgimage = swipedir + 'arrow.png' // naming convention is "leftarrow.png", "rightarrow.png" etc
			inner.style.background = 'transparent url(' + bgimage + ') center center no-repeat'
			hidetimer = setTimeout(function(){ // reset background image after 1 second
				inner.style.background = ''
			}, 1000)
		}
	})
}, false)</pre>
	<p align="left">The HTML markup is:</p>
	<pre class="brush: js;">&lt;div id=&quot;touchsurface2&quot;&gt;
	&lt;div id=&quot;inner&quot;&gt;
		Swipe Me
	&lt;/div&gt;
&lt;/div&gt;</pre>
	<p align="left">We bind <code>swipedetect()</code> to &quot;<code>#touchsurface2</code>&quot;, 
	and whenever a valid swipe has occurred inside it, we change the &quot;<code>#inner</code>&quot; 
	DIV's background image accordingly to reflect the type of swipe that has 
	just occurred.</p>
	<ul id="toc">
      <li><a href="touchevents.shtml">Introduction to Touch events in JavaScript</a></li>
		<li>Detecting a swipe using touch</li>
      <li><a href="touchevents3.shtml">Monitoring touch actions at every stage, swipe image gallery</a></li>
    </ul>
	<p align="right"><b><a href="touchevents3.shtml">Monitoring touch actions at every stage, swipe image gallery</a></b>
	<a href="touchevents3.shtml"> 
      <img border="0" src="../jkincludes/forward.gif" width="15" height="17"></a></p>
    </div>
</div>

<div id="leftcolumn">
      <div class="sidemenucomponent">
<div><a href="http://www.javascriptkit.com">
  <img src="http://www.javascriptkit.com/jkincludes/jklogosmall.gif" border="0" title="JavaScript Kit" width="163" height="51" style="margin-top: 2px" /></a>
</div>


			<ul id="mainmenulinks" class="categorylinks">
				<li><a href="http://www.javascriptkit.com/" >JavaScript Kit</a></li>
				<li><a href="http://www.javascriptkit.com/cutpastejava.shtml" >Free JavaScripts</a></li>
				<li><a href="http://www.javascriptkit.com/javatutors/">JavaScript tutorials</a></li>
				<li><a href="http://www.javascriptkit.com/jsref/">JavaScript Reference</a></li>
				<li><a href="http://www.javascriptkit.com/domref/">DOM Reference</a></li>
				<li><a href="http://www.javascriptkit.com/dhtmltutors/">Developer & CSS</a></li>
				<li><a href="http://www.javascriptkit.com/howto/">Web Design</a></li>
				<li><a href="http://www.javascriptkit.com/java/">Free Java Applets</a></li>	
				<li><a href="http://www.javascriptkit.com/dhtmltutors/cssreference.shtml">CSS Quick Reference</a></li>
				<li><a href="http://www.javascriptkit.com/courses/">Developer Courses</a></li>		
			</ul>


<script type="text/javascript">
var sectionmatch=["cutpastejava", "javatutors", "jsref", "dhtmltutors", "howto", "java", "cssref"]
var docurl=window.location.toString()
var menulinksobj=document.getElementById("mainmenulinks")
if (menulinksobj && menulinksobj.getElementsByTagName("a")){
for (i=0; i<sectionmatch.length; i++){
if (docurl.indexOf(sectionmatch[i])!=-1 && menulinksobj.getElementsByTagName("a")[i+1].style){
menulinksobj.getElementsByTagName("a")[i+1].style.color="#3A6200"
menulinksobj.getElementsByTagName("a")[i+1].style.backgroundColor="#EAEAEA"
break;
}
}
}

</script>

</div>

<div id="stickyarea">

<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<!-- JK RA horizontal -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-7051847089736268"
     data-ad-slot="9662634634"
     data-ad-format="auto"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>

<!-- BuySellAds Zone Code -->
<div class="bsacontainer nomargin">
<div id="bsap_1299814" class="bsarocks bsap_dd6e9fbb78d92ec298f6119b05509777"></div>
</div>
<!-- End BuySellAds Zone Code -->


<div class="sidemenucomponent">

<div style="font-size: 12px; margin-top: 1em; padding-left: 5px;">
<script type="text/javascript">
bookmarkit()
</script>
</div>

</div>

<!-- Go to www.addthis.com/dashboard to customize your tools -->
<div class="addthis_sharing_toolbox" style="margin-left:10px"></div>

<!-- Go to www.addthis.com/dashboard to customize your tools -->
<script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid=georgeuser"></script>

<div id="sharearea" style="font-size: 12px; margin: 1em auto; padding-left: 5px; text-align:center">
<a href="https://twitter.com/share" class="twitter-share-button" data-size="large" data-show-count="false">Tweet</a><script async src="http://platform.twitter.com/widgets.js" charset="utf-8"></script>
</div>

<!-- end sticky area -->
</div>

<script>

;(function(){

	var rightcolumnad = document.getElementById('stickyarea')
	var standardbody = (document.compatMode=="CSS1Compat")? document.documentElement : document.body

	function getoffset(what, offsettype){
		return (what.offsetParent)? what[offsettype]+getoffset(what.offsetParent, offsettype) : what[offsettype]
	}
	
	function getoffsetof(el){
		el._offsets={left:getoffset(el, "offsetLeft"), top:getoffset(el, "offsetTop"), h: el.offsetHeight}
	}

	var jkmakesticky = {
		target: null,
		docheight: null,
		docscrollHeight: null,
		contentcolumnheight: null,
		rightcolumnheight: null,
		resizeTimer: null,
		refreshCoords: function(){
			this.docheight = window.innerHeight || standardbody.clientHeight-15
			this.docscrollHeight = standardbody.scrollHeight-20
			this.contentcolumnheight = document.getElementById("contentcolumn").offsetHeight
			this.rightcolumnheight = document.getElementById("leftcolumn").offsetHeight
			getoffsetof( this.target )
		},
		stickit: function(){
			var target = this.target
			var offsettop = target._offsets.top
			if (offsettop == 0 || ( this.rightcolumnheight >= this.contentcolumnheight)){ // if offsettop of banner container is 0, it means it's hidden, or if right column is longer than content column
				return
			}
			var docscrolly = window.pageYOffset || standardbody.scrollTop
			if ( docscrolly > offsettop){
				if (!/sticky/i.test(target.className)){
					target.className = target.className + 'sticky'
				}
			}
			else{
				if (/sticky/i.test(target.className)){
					target.className = target.className.replace(/\s*sticky\s*/i, '')
				}
			}
		},
		init:function(target){
			this.target = target
			this.refreshCoords()
			window.addEventListener('scroll', function(){
				requestAnimationFrame(function(){
					jkmakesticky.stickit()
				})
			}, false)
		}
	}

	if (rightcolumnad){
		jkmakesticky.init( rightcolumnad )
		jkmakesticky.stickit()
		window.addEventListener('load', function(e){
			rightcolumnad.className = rightcolumnad.className.replace(/\s*sticky\s*/i, '')
			jkmakesticky.refreshCoords()
			jkmakesticky.stickit()
		}, false)
		window.addEventListener('resize', function(e){
			clearTimeout(jkmakesticky.resizeTimer)
			jkmakesticky.resizeTimer = setTimeout(function(){
				rightcolumnad.className = rightcolumnad.className.replace(/\s*sticky\s*/i, '')
				jkmakesticky.refreshCoords()
				jkmakesticky.stickit()
			}, 100)
		}, false)
	}

})();

</script>

</div>

<div id="footer">
 <!--ZOOMSTOP-->

<p align="center">

<div style="max-width: 730px; margin-left: 185px;" id="footerad">

<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<!-- JK RA horizontal -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-7051847089736268"
     data-ad-slot="9662634634"
     data-ad-format="horizontal, rectangle"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>

</div>


<div style="margin-left:195px; margin-top:6px" id="copyright">Copyright (c) 2016 <a href="http://www.javascriptkit.com">JavaScript Kit</a>. NO PART may be reproduced without author's permission.</div>

</p>

<script src="http://www.google-analytics.com/urchin.js" type="text/javascript">
</script>
<script type="text/javascript">
_uacct = "UA-55377-1";
urchinTracker();
</script>

<!-- MailMunch for JavaScript Kit -->
<!-- Paste this code right before the </head> tag on every page of your site. -->
<script src="//a.mailmunch.co/app/v1/site.js" id="mailmunch-script" data-mailmunch-site-id="283097" async="async"></script>

</div>

</div>

</body>
</html>

