// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

var g_stepManual = true;  // false = auto-scroll, true = manual-stepping

var g_totalHeight = -1; // for document scroll height
var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_lastJumpedToWinY = -1;  // will track scroll-Y positions

var g_nextTimerIntervalId = 0;


  
// To facilitate passing parameters to event handlers, use an anonymous function
if ( !g_stepManual )  {
  console.log("-I- AUTO-SCROLL OPERATION MODE");
  window.addEventListener("click",        (event) => {
                                                  scroll_stop_handler(event)});
  window.addEventListener("contextmenu",  (event) => {
                                                  scroll_start_handler(event)});
} else  {
  console.log("-I- MANUAL-STEP OPERATION MODE");
  window.addEventListener("click",        (event) => {
                                            manual_step_back_handler(event)});
  window.addEventListener("contextmenu",  (event) => {
                                            manual_step_forth_handler(event)});
}



// Scrolls to line-01
function scroll__onload(x, y)
{
  //~ alert(`Page onload event; will scroll to ${x}, ${y}`);
  //~ window.scrollTo(x, y);

  const posDescrStr = positions_toString(g_scoreStations, "\n");
  console.log(`All score steps \n =========\n${posDescrStr}\n =========`);
  
  g_totalHeight = get_scroll_height();
  
  const firstPageId = filter_positions(g_scoreStations)[0].pageId;
  const firstPage = document.getElementById(firstPageId);
  const topPos = firstPage.offsetTop;
  //alert(`Page onload event; scroll to the first page (${firstPageId}) at y=${topPos}`);
  console.log(`Scroll to the first page (${firstPageId}) at y=${topPos}`);
  // window.scrollTo({ top: topPos, behavior: 'smooth'});
  window.scrollTo(0, topPos);
  g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'topPos' ?
  g_scrollIsOn = false;
  g_currStep = (g_stepManual)? 0 : -1;
}

//~ function message__onMouseOver(event)
//~ {
  //~ alert("onMouseOver event on " + event.target.id);
//~ }


// Automatic-scroll-mode handler of scroll-start
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
  } else  {  // g_scrollIsOn == false
    // check if manually scrolled while being paused
    const currWinY = get_scroll_current_y();
    const newStep = find_nearest_matching_position(g_scoreStations,
                                                  currWinY, g_currStep);
    rec = filter_positions(g_scoreStations)[newStep];
    msg = `RESUME SCROLLING FROM STEP ${one_position_toString(newStep, rec)} FOR POSITION ${currWinY} (was paused at step ${g_currStep})`;
    console.log(msg);
    g_currStep = newStep;
    timed_alert(msg, 2/*sec*/);
    // it immediately scrolls, since the step is already advanced
    // TODO: is the above OK?
  }
  g_scrollIsOn = true;
  rec = filter_positions(g_scoreStations)[g_currStep];
  scroll_perform_one_step(g_currStep);
}


function scroll_stop_handler(event)
{
  if ( !g_scrollIsOn )  { return }  // double-stop - silently ignore
  if ( g_currStep > 0 ) { g_currStep -= 1 }   // it was already advanced
  rec = filter_positions(g_scoreStations)[g_currStep];
  winY = get_scroll_current_y();
  msg = `STOP/PAUSE SCROLLING AT STEP ${rec.tag}::${one_position_toString(g_currStep, rec)};  POSITION ${winY}`;
  console.log(msg);
  alert(msg);
  scroll_abort();
}


// Manual-step-mode handler of step-forth
function manual_step_forth_handler(event)
{
  event.preventDefault();
  const nSteps = filter_positions(g_scoreStations).length;
  if ( g_currStep >= (nSteps - 1) )  {
    msg = `ALREADY AT THE END`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    return;
  }
  return  _manual_one_step(+1);
}


// Manual-step-mode handler of step-back
function manual_step_back_handler(event)
{
  event.preventDefault();
  if ( g_currStep == 0 )  {
    msg = `ALREADY AT THE BEGINNING`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    return;
  }
  return  _manual_one_step(-1);
}


// Performs common for both forth and back actions of one manual step
function _manual_one_step(stepIncrement)
{
  if ( (stepIncrement != -1) && (stepIncrement != 1) )  {
    msg = `-E- Invalid stepIncrement=${stepIncrement}; should be -1 or 1`;
    console.log(msg);
    alert(msg);
    return
  }
  const nSteps = filter_positions(g_scoreStations).length;
  if ( (g_currStep < 0) || (g_currStep >= nSteps) ) {
    alert(`Invalid step ${g_currStep}; should be 0..${nSteps-1}; jump to the begining`);
    g_currStep = 0;
    return;
  }

  /*  */
  const currWinY = get_scroll_current_y();
  let newStep = -1; 
  if ( currWinY != g_lastJumpedToWinY )   {
    newStep = find_nearest_matching_position(g_scoreStations,
                                                currWinY, g_currStep);
    console.log(`-I- Manual scroll to winY=${currWinY} detected`);
  } else {
    // not scrolled manually or scrolled not enough, so go one 'stepIncrement'
    newStep = g_currStep + stepIncrement; 
  }
  rec = filter_positions(g_scoreStations)[newStep];
  const actionStr = (newStep == (g_currStep + stepIncrement))?
                                ((stepIncrement < 0)? "BACK":"FORTH") : "JUMP"; 
  msg = `${actionStr} TO STEP ${one_position_toString(newStep, rec)} FOR POSITION ${currWinY} (previous step was ${g_currStep})`;
  console.log(msg);
  g_currStep = newStep;
  timed_alert(msg, 1/*sec*/);
  // in manual-step mode it should scroll immediately
  scroll_perform_one_step(g_currStep);
}


function scroll_schedule(currDelaySec, descr)
{
  if ( g_stepManual )  {
    console.log("-W- scroll_schedule() ignored in manual-step mode");
    return;
  }

  console.log(`-I- Scheduling wait for ${currDelaySec} second(s) at ${descr}`);
  g_nextTimerIntervalId = setTimeout(scroll_perform_one_step,
                                      currDelaySec * 1000/*msec*/, g_currStep);
}


function scroll_abort()
{
  g_scrollIsOn = false;
  clearInterval(g_nextTimerIntervalId);
  g_nextTimerIntervalId = 0;
}


function messge_onKeyPress(event)
{
  alert("onkeypress event - pressed " + event.code);
}


//////////////////////////////////////////////////
/* Immediately scrolls to the current-step position;
 * afterwards - if in auto-scroll mode - starts timer to requested interval. */
function scroll_perform_one_step(stepNum)
{
  if ( !g_stepManual && !g_scrollIsOn )  { return }
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
  g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'targetPos' ?
  g_currStep = stepNum + 1;
  
  if ( !g_stepManual )  {
////scroll_abort(); // OK_TMP
    // the next line causes async wait
    scroll_schedule(rec.timeSec, rec.tag);
  }
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


// Returns the rendered vertical position (winY) of the current scroll status
function get_scroll_current_y()
{
  // adopted from: https://stackoverflow.com/questions/4096863/how-to-get-and-set-the-current-web-page-scroll-position
  return  document.documentElement.scrollTop || document.body.scrollTop;
}


// Converts vertical position from image coordinates to rendered window
function convert_y_img_to_window(imgHtmlPageId, imgY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageId);
  const pageScaleY = get_image_scale_y(g_scoreStations, imgHtmlPageId);
  const winY = pageHtmlElem.offsetTop + imgY * pageScaleY;
  return  Math.floor(winY);
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

// Returns new array with only position-related lines from 'scoreStationsArray'
function filter_positions(scoreStationsArray)
{
  return  scoreStationsArray.filter((rec) =>  {
    return  !rec.tag.startsWith("Control-");
  })
}


function positions_toString(scoreStationsArray, separatorStr)
{
  let descr = "";
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  for ( let i = 0;  i < scorePositions.length;  i += 1 )  {
    v = scorePositions[i];
    descr += ((i > 0)? separatorStr : "") + one_position_toString(i, v);
  }
  return  descr
}


function one_position_toString(stepIdx, scoreStationRecord)
{
  v = scoreStationRecord; // to shorten the notation
  let descr = `step${stepIdx}=>${v.pageId}::${v.y}=${convert_y_img_to_window(v.pageId, v.y)}`;
  return  descr
}


var DBG_candidates = undefined; //OK_TMP

/* Returns index (step) of position record that encloses 'winY'
 * in the closest step to 'lastStep'.
 * If in doubt, prefers the step before 'lastStep'.
 * If not found, return 'lastStep' */
function find_nearest_matching_position(scoreStationsArray, winY, lastStep)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  if ( lastStep >= scorePositions.length )  {
    console.log(`-E- Invalid step ${lastStep}; should be 0..${scorePositions.length-1}`);
    return  scorePositions.length - 1;  // the last possible
  }
  const candidates = find_matching_positions(scoreStationsArray, winY);
  if ( candidates.length == 0 ) {
    console.log(`-E- No positions enclose y=${winY}`);
    return  lastStep;
  }
  // find the closest of the matching positions
  candidates.sort( (a,b) =>
                    Math.abs(a.step - lastStep) - Math.abs(b.step - lastStep) );
  DBG_candidates = candidates;  // OK_TMP
  let candidatesDescr = "";
  candidates.forEach( (v) => candidatesDescr += `; step${v.step}=>${v.pageId}::${v.y}` );
  console.log(`-D- Positions around step ${lastStep} at y=${winY} => ${candidatesDescr}`);
  
  let result = -1;  let resultDescr = "UNKNOWN";
  if ( (candidates.length == 1) ||
       (Math.abs(candidates[0].step - lastStep) < 
        Math.abs(candidates[1].step - lastStep)) )  {
    result = candidates[0].step; // found unambiguously closest position
    resultDescr = "unambiguous";
  } else  {
    result = Math.min(candidates[0].step, candidates[1].step);  // the earlier
    resultDescr = "earlier of two";
  }
  //const lastStepRec = scorePositions[lastStep];
  const lastStepWinY = derive_position_y_window(scoreStationsArray, lastStep);
  const resultWinY   = derive_position_y_window(scoreStationsArray, result);
  console.log(`-D- Closest position to step ${lastStep} (winY=${lastStepWinY}) is step ${result} (winY=${resultWinY}) - ${resultDescr}`);
  return  result;
}


//~ /* Returns index (step) of position record that encloses 'winY'
 //~ * in the latest step before 'lastStep'.
 //~ * If not found, return 'lastStep' */
//~ function UNUSED__find_preceding_matching_position(scoreStationsArray, winY, lastStep)
//~ {
  //~ const scorePositions = filter_positions(scoreStationsArray); // only data lines
  //~ const candidates = find_matching_positions(scoreStationsArray, winY);
  //~ if ( candidates.length == 0 ) {
    //~ console.log(`-E- No positions before step ${lastStep} at y=${winY}`);
    //~ return  -1;
  //~ }
  //~ candidates.sort( (a,b) => a.step - b.step );
  //~ //console.log(`-D- Positions before step ${lastStep} at y=${winY} => ${candidates.toString()}`);
  //~ for ( let i = candidates.length-1;  i >= 0;  i -= 1 )  {
    //~ if ( candidates[i].step < lastStep )  {
      //~ console.log(`-I- Position before step ${lastStep} at y=${winY} is step ${candidates[i].step}`);
      //~ return  candidates[i].step;
    //~ }
  //~ }
  //~ console.log(`-I- No positions before step ${lastStep} at y=${winY}; choose step ${lastStep}`);
  //~ return  lastStep;
//~ }


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
    if ( isTop )  { currWinY = 0; }   // treat "above-image" as "image-top"
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


function derive_position_y_window(scoreStationsArray, step)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  return  convert_y_img_to_window(
                  scorePositions[step].pageId, scorePositions[step].y);
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
}
