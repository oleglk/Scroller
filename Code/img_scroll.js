// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

// TODO: pass 'tempo', 'tactsInLine', 'beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'tempo'
var tempo = 60; // beats-per-minute
var tactsInLine = 7;
var beatsInTact = 4;


const beatsForFullLine = tactsInLine * beatsInTact;
const timeForFullLineSec = beatsForFullLine * tempo / 60;


# TODO: specify target coordinates for image, not HTML page
# TODO, pass the whole array from the HTML
var scoreStations = [
  {tag:"line-001-Begin",  x:0, y:300, pause: timeForFullLineSec},
  {tag:"line-002-Begin",  x:0, y:400, pause: timeForFullLineSec},
];


// Scrolls to line-01
function scroll__onload(x, y)
{
  alert(`Page onload event; will scroll to ${x}, ${y}`);
  window.scrollTo(x, y);
}

function message__onMouseOver(event)
{
  alert("onMouseOver event on " + event.target.id);
}


function message__onMouseClick(event)
{
alert("onMouseClick event on " + event.target.id);
}


function messge_onKeyPress(event)
{
  alert("onkeypress event - pressed " + event.code);
}
