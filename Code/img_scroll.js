// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

var g_totalHeight = -1; // for document scroll height
var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_nextTimerIntervalId = 0;


  
// To facilitate passing parameters to event handlers, use an anonymous function
window.addEventListener("click",        (event) => {
                                                scroll_stop_handler(event)});
window.addEventListener("contextmenu",  (event) => {
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
    msg = `START SCROLLING FROM THE TOP`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
  } else if ( g_scrollIsOn == true )  {
    g_currStep = 0;
    msg = `START SCROLLING FROM THE TOP`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
  } else if ( g_currStep  >= filter_positions(g_scoreStations).length )  {
    g_currStep = 0;
    msg = `RESTART SCROLLING FROM THE TOP`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
  } else  {  // g_scrollIsOn == falsa
    msg = `RESUME SCROLLING FROM STEP ${g_currStep}`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    // it immediately scrolls, since the step is already advanced
    // TODO: is the above OK?
  }
  g_scrollIsOn = true;
  rec = filter_positions(g_scoreStations)[g_currStep];
  scroll_step_handler();
}


function scroll_stop_handler(event)
{
  if ( !g_scrollIsOn )  { return }  // double-stop - silently ignore
  if ( g_currStep > 0 ) { g_currStep -= 1 }   // it was already advanced
  rec = filter_positions(g_scoreStations)[g_currStep];
  msg = `STOP/PAUSE SCROLLING AT STEP ${g_currStep};  POSITION ${rec.pageId}::${rec.tag}`;
  console.log(msg);
  alert(msg);
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
  const targetPos = convert_y_img_to_window(rec.pageId, rec.y);

  console.log(`-I- Scroll to ${rec.pageId}:${targetPos}) for step ${stepNum}`);
  // (scrolls absolute pixels) window.scrollTo({ top: targetPos, behavior: 'smooth'});
  window.scrollTo(rec.x/*TODO:calc*/, targetPos);
  g_currStep = stepNum + 1;
  
////scroll_abort(); // OK_TMP
  // the next line causes async wait
  scroll_schedule(rec.timeSec, rec.tag);
  return  1;
}


////////////////////////////////////////////////////////////////////////////////
function get_image_scale_y(scoreStationsArray, pageId)
{
  const imgHtmlElem   = document.getElementById(pageId);
  const renderHeight  = imgHtmlElem.offsetHeight;
  const origHeight    = read_image_size_record(scoreStationsArray, pageId);
  return  renderHeight / origHeight;
}


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


// Converts vertical position from image coordinates to rendered window
function convert_y_img_to_window(imgHtmlPageId, imgY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageId);
  const pageScaleY = get_image_scale_y(g_scoreStations, imgHtmlPageId);
  const winY = pageHtmlElem.offsetTop + imgY * pageScaleY;
  return  winY;
}


// Converts vertical position from image coordinates to rendered window
function convert_y_window_to_img(imgHtmlPageId, winY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageId);
  const pageScaleY = get_image_scale_y(g_scoreStations, imgHtmlPageId);
  const imgY = (winY - pageHtmlElem.offsetTop) / pageScaleY;
  return  imgY;
}
////////////////////////////////////////////////////////////////////////////////


/*******************************************************************************
 ** BEGIN: access to scoreStationsArray                                       **
*******************************************************************************/

// Returns newarray with only position-related lines from 'scoreStationsArray'
function filter_positions(scoreStationsArray)
{
  return  scoreStationsArray.filter((rec) =>  {
    return  !rec.tag.startsWith("Control-");
  })
}


/* Returns index (step) of position record that encloses 'winY'
 * in the latest step before 'lastStep'.
 * If not found, return 'lastStep' */
function find_preceding_matching_position(scoreStationsArray, winY, lastStep)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  const candidates = find_matching_positions(scoreStationsArray, winY);
  if ( candidates.length == 0 ) {
    console.log(`-E- No positions before step ${lastStep} at y=${winY}`);
    return  -1;
  }
  candidates.sort( (a,b) => a.step - b.step );
  //console.log(`-D- Positions before step ${lastStep} at y=${winY} => ${candidates.toString()}`);
  for ( let i = candidates.length-1;  i >= 0;  i -= 1 )  {
    if ( candidates[i].step < lastStep )  {
      console.log(`-I- Position before step ${lastStep} at y=${winY} is step ${candidates[i].step}`);
      return  candidates[i].step;
    }
  }
  console.log(`-I- No positions before step ${lastStep} at y=${winY}; choose step ${lastStep}`);
  return  lastStep;
}


/* Returns position records that enclose 'winY';
 * each record extended with step number  */
function find_matching_positions(scoreStationsArray, winY)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  // build an ascending list of position-Y-s - to detect the order
  const winYArrayUnsorted = scorePositions.map( (rec) => {
    return convert_y_img_to_window(rec.pageId, rec.y);
                                                  } );
  winYArray = uniq_sort(winYArrayUnsorted, (a, b) => a - b);
  let results = [];
  let currPage = null;
  for ( let i = 0;  i < scorePositions.length;  i += 1 ) {
    let rec       = scorePositions[i];
    let currWinY  = convert_y_img_to_window(rec.pageId, rec.y);
    let idxOfCurrWinY = winYArray.indexOf(currWinY);  // must exist
    let isTop     = (idxOfCurrWinY == 0);
    let isBottom  = (idxOfCurrWinY == (winYArray.length - 1));
    let nextWinY  = (!isBottom)? winYArray[idxOfCurrWinY + 1]
                            : Number.MAX_SAFE_INTEGER;
    if ( (currWinY <= winY) && (winY < nextWinY) )   {
      // 'winY' falls at the current record
      recAndStep = {step: i};
      Object.assign(recAndStep, rec)
      results.push(recAndStep);
    }
  }
  return  results;
}


function read_image_size_record(scoreStationsArray, pageId)
{
  const rec = scoreStationsArray.find((value, index, array) => {
    return  ( (value.tag == "Control-Height") && (value.pageId == pageId) )
  });
  return  rec.y;
}
/** END: access to scoreStationsArray *****************************************/


/*******************************************************************************
 * Automatically closing alert/message.
 * (from: https://stackoverflow.com/questions/15466802/how-can-i-auto-hide-alert-box-after-it-showing-it)
 ******************************************************************************/
function timed_alert(msg, durationSec)
{
  var el = document.createElement("div");
  el.setAttribute("style","position:absolute;top:80%;left:20%;background-color:lightblue;");
  el.innerHTML = msg;
  setTimeout( () => {el.parentNode.removeChild(el);}, 1000*durationSec );
  document.body.appendChild(el);
}


/*******************************************************************************
 * Removes duplicates and sorts the array
 * (from:  https://www.tutorialspoint.com/unique-sort-removing-duplicates-and-sorting-an-array-in-javascript)
 ^ Example: const uniq_sort([1, 1, 1, 3, 2, 2, 8, 3, 4],  (a, b) => a - b);
 ******************************************************************************/
function uniq_sort(arr, cmpFunc) {
   const map = {};
   const res = [];
   for (let i = 0; i < arr.length; i++) {
      if (!map[arr[i]]) {
         map[arr[i]] = true;
         res.push(arr[i]);
      };
   };
   return res.sort(cmpFunc);
};
