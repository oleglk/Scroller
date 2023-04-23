// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

// TODO: pass 'g_tempo', 'g_tactsInLine', 'g_beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'g_tempo'
var g_tempo = 60; // beats-per-minute
var g_tactsInLine = 7;
var g_beatsInTact = 4;


const g_beatsForFullLine = g_tactsInLine * g_beatsInTact;
const g_fullLineInSec = g_beatsForFullLine * g_tempo / 60;

var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_nextTimerIntervalId = 0;


// TODO: specify target coordinates for image, not HTML page
// TODO, pass the whole array from the HTML
var g_scoreStations = [timeSec
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, timeSec:g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, timeSec:2/3*g_fullLineInSec},
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, timeSec:g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, timeSec:2/3^g_fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, timeSec:g_fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, timeSec:g_fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, timeSec:2/3*g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, timeSec:g_fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, timeSec:g_fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, timeSec:g_fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, timeSec:2/3*g_fullLineInSec},  
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
  
  const firstPageId = g_scoreStations[0].pageId;
  const firstPage = document.getElementById(firstPageId);
  const topPos = firstPage.offsetTop;
  alert(`Page onload event; scroll to the first page (${firstPageId}) at y=${topPos}`);
  window.scrollTo({ top: topPos, behavior: 'smooth'});
  g_scrollIsOn = false;
  g_currStep = -1;
}

function message__onMouseOver(event)
{
  alert("onMouseOver event on " + event.target.id);
}


function scroll_start_handler(event)
{
  event.preventDefault();
  if ( g_currStep == -1 ) {
    g_currStep = 0;
    alert(`START SCROLLING FROM THE TOP`);
  } else if ( g_scrollIsOn == true )  {
    g_currStep = 0;
    alert(`START SCROLLING FROM THE TOP`);
  } else  {  // g_scrollIsOn == falsa
    alert(`RESUME SCROLLING FROM STEP ${g_currStep}`);
  }
  g_scrollIsOn = true;
  scroll_schedule(g_scoreStations[g_currStep].timeSec)
}


function scroll_stop_handler(event)
{
  alert(`onLeftClick event on ${event.target.id};\tSTOP SCROLLING`);
  scroll_abort();
}


function scroll_schedule(currDelaySec)
{
  g_nextTimerIntervalId = setTimeout(scroll_step_handler, currDelaySec);
}


function scroll_abort()
{
  g_scrollIsOn = false;
  clearInterval(g_nextTimerIntervalId);
  g_nextTimerIntervalId = 0;
}


// Determines the current step number and executes the step
function scroll_step_handler()
{
  stepNum = g_currStep; // TODO: track actual window scroll position
  return  scroll_one_step(stepNum);
}


function messge_onKeyPress(event)
{
  alert("onkeypress event - pressed " + event.code);
}


//////////////////////////////////////////////////
/* Scrolls to the current-step position and starts timer to requested interval
 */
function scroll_one_step(stepNum)
{
  if ( g_scrollIsOn == false )  { return }
  if ( (stepNum < 0) || (stepNum > g_scoreStations.length) )  {
    console.log(`-I- At step number ${stepNum}; stop scrolling`);
    scroll_abort();
    return  0;
  }
  //  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec}
  const rec = g_scoreStations[stepNum];
  const currPage = document.getElementById(rec.pageId);
  const currPos = currPage.offsetTop + rec.y;

  console.log('-I- Scroll to ${rec.pageId}:${currPos}) for step ${stepNum}');
  window.scrollTo({ top: currPos, behavior: 'smooth'});
  g_currStep = stepNum + 1;
  // the next line causes async wait
  scroll_schedule(rec.timeSec);
  return  1;
}
