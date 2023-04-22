// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

// TODO: pass 'tempo', 'tactsInLine', 'beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'tempo'
var tempo = 60; // beats-per-minute
var tactsInLine = 7;
var beatsInTact = 4;


const beatsForFullLine = tactsInLine * beatsInTact;
const fullLineInSec = beatsForFullLine * tempo / 60;

var currLine = -1;  // not started
var scrollIsOn = false;

// TODO: specify target coordinates for image, not HTML page
// TODO, pass the whole array from the HTML
var scoreStations = [
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  pause:fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, pause:fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, pause:2/3*fullLineInSec},
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  pause:fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, pause:fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, pause:2/3^fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, pause:fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, pause:fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, pause:2/3*fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, pause:fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, pause:fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, pause:fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, pause:2/3*fullLineInSec},  
];
  
// To facilitate passing parameters to event handlers, use an anonymous function
window.addEventListener("onclick", (event) => {
                                                scroll_stop_handler(event)});
window.addEventListener("contextmenu", (event) => {
                                                scroll_start_handler(event)});



// Scrolls to line-01
function scroll__onload(x, y)
{
  //~ alert(`Page onload event; will scroll to ${x}, ${y}`);
  //~ window.scrollTo(x, y);
  
  const firstPageId = scoreStations[0].pageId;
  const firstPage = document.getElementById(firstPageId);
  const topPos = firstPage.offsetTop;
  alert(`Page onload event; scroll to the first page (${firstPageId}) at y=${topPos}`);
  window.scrollTo({ top: topPos, behavior: 'smooth'});
  scrollIsOn = false;
}

function message__onMouseOver(event)
{
  alert("onMouseOver event on " + event.target.id);
}


function scroll_start_handler(event)
{
  event.preventDefault();
  alert(`onRightClick event on ${event.target.id};\tSTART SCROLLING`);
  scrollIsOn = true;
}


function scroll_stop_handler(event)
{
  alert(`onLeftClick event on ${event.target.id};\tSTOP SCROLLING`);
  scrollIsOn = false;
}

function messge_onKeyPress(event)
{
  alert("onkeypress event - pressed " + event.code);
}
