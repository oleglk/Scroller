// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

// TODO: pass 'g_tempo', 'g_tactsInLine', 'g_beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'g_tempo'
var g_tempo = 20*60;  //60; // beats-per-minute
var g_tactsInLine = 7;
var g_beatsInTact = 4;


const g_beatsForFullLine = g_tactsInLine * g_beatsInTact;
const g_fullLineInSec = g_beatsForFullLine * 60 / g_tempo;

var g_totalHeight = -1; // for document scroll height
var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_nextTimerIntervalId = 0;


// TODO: specify target coordinates for image, not HTML page
// TODO, pass the whole array from the HTML
var g_scoreStations = [
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
  {tag:"Control-Height", pageId:"pg01", x:0, y:3504, timeSec:0},  
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
  
  g_totalHeight = get_scroll_height();
  
  const firstPageId = filter_positions(g_scoreStations)[0].pageId;
  const firstPage = document.getElementById(firstPageId);
  const topPos = firstPage.offsetTop;
  //alert(`Page onload event; scroll to the first page (${firstPageId}) at y=${topPos}`);
  console.log(`Scroll to the first page (${firstPageId}) at y=${topPos}`);
  // window.scrollTo({ top: topPos, behavior: 'smooth'});
  window.scrollTo(0, topPos);
  g_scrollIsOn = false;
  g_currStep = -1;
}

//~ function message__onMouseOver(event)
//~ {
  //~ alert("onMouseOver event on " + event.target.id);
//~ }


function scroll_start_handler(event)
{
  event.preventDefault();
  if ( g_currStep == -1 ) {
    g_currStep = 0;
    console.log(`START SCROLLING FROM THE TOP`);
  } else if ( g_scrollIsOn == true )  {
    g_currStep = 0;
    console.log(`START SCROLLING FROM THE TOP`);
  } else  {  // g_scrollIsOn == falsa
    console.log(`RESUME SCROLLING FROM STEP ${g_currStep}`);
  }
  g_scrollIsOn = true;
  rec = filter_positions(g_scoreStations)[g_currStep];
  scroll_schedule(rec.timeSec, rec.tag);
}


function scroll_stop_handler(event)
{
  alert(`onLeftClick event on ${event.target.id};\tSTOP SCROLLING`);
  scroll_abort();
}


function scroll_schedule(currDelaySec, descr)
{
  console.log(`-I- Scheduling wait for ${currDelaySec} second(s) at ${descr}`);
  g_nextTimerIntervalId = setTimeout(scroll_step_handler,
                                      currDelaySec * 1000/*msec*/);
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
  if ( (stepNum < 0) || (stepNum >= filter_positions(g_scoreStations).length) )  {
    console.log(`-I- At step number ${stepNum}; stop scrolling`);
    scroll_abort();
    return  0;
  }
  //  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec}
  const rec = filter_positions(g_scoreStations)[stepNum];
  const currPage = document.getElementById(rec.pageId);
  const currPos = currPage.offsetTop + rec.y;

  console.log(`-I- Scroll to ${rec.pageId}:${currPos}) for step ${stepNum}`);
  // (scrolls absolute pixels) window.scrollTo({ top: currPos, behavior: 'smooth'});
  window.scrollTo(rec.x/*TODO:calc*/, currPos);
  g_currStep = stepNum + 1;
  
////scroll_abort(); // OK_TMP
  // the next line causes async wait
  scroll_schedule(rec.timeSec, rec.tag);
  return  1;
}


////////////////////////////////////////////////////////////////////////////////
// See https://javascript.info/size-and-scroll-window
function get_scroll_height()
{
  let scrollHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight);

  alert('Full document height, with scrolled out part: ' + scrollHeight);
  return  scrollHeight;
}


// Returns newarray with only position-related lines from 'scoreStationsArray'
function filter_positions(scoreStationsArray)
{
  return  scoreStationsArray.filter((rec) =>  {
    return  !rec.tag.startsWith("Control-");
  })
}

function read_image_size_record(scoreStationsArray)
{
  const elem = scoreStationsArray.find(TODO:function);
  /*
Example
const numbers = [4, 9, 16, 25, 29];
let first = numbers.find(myFunction);

function myFunction(value, index, array) {
  return value > 18;
} 
  */
}


// TODO find scale factor for the coordinates; see HTMLElement.offsetHeight
