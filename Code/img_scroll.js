// img_scroll.js
////////////////////////////////////////////////////////////////////////////////

var g_stepManual = true;  // false = auto-scroll, true = manual-stepping

var g_totalHeight = -1; // for document scroll height
var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_lastJumpedToWinY = -1;  // will track scroll-Y positions

var g_nextTimerIntervalId = 0;

var g_windowEventListenersRegistry = [];  // for {event-type :: handler}


//////////////////// Assume existence of the following global variables: ////////
// g_imgPageOccurences : array of {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
// g_imageDimensions : Map(pageId : {width:w, height:h})
////////////////////////////////////////////////////////////////////////////////


////////////////
//window.addEventListener("load", scroll__onload);
//window.addEventListener("load", (event) => { scroll__onload(event) });

/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll__onload  = (event) => { scroll__onload(event) }
register_window_event_listener("load", wrap__scroll__onload);

////////////////


function build_help_string(showHeader, modeManual=g_stepManual)
{
  let ret = "";
  if ( showHeader ) {
    ret +=  `======== Musical score scroller ========
   
=> Left-mouse-button-Double-Click \t= Restart\n`
  }
  ret += `
========================================   
Mode: ${(modeManual)? "MANUAL" : "AUTO"};
========================================`;

  if ( modeManual ) {
    ret += `
=> Left-mouse-button-Click \t= Go Back
=> Right-mouse-button-Click\t= Go Forth\n`;
  } else {
    ret += `
=> Right-mouse-button-Click\t= Stop/Pause Auto-Scroll
=> Left-mouse-button-Click \t= Start/Resume Auto-Scroll
=> When paused, you can manually adjust the scroll position\n`;
  }
  ret += "========================================";
  return  ret;
}


// Scrolls to line-01
function scroll__onload(event)
{
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation(); // crucial because of prompt inside handler!
  
  // set tab title to score-file name
  let fileName = window.location.pathname.split("/").pop();
  let pageName = `Scroll: ${remove_filename_extension(fileName)}`;
  document.title = pageName;
  
  const posDescrStr = positions_toString(g_scoreStations, "\n");
  console.log(`All score steps \n =========\n${posDescrStr}\n =========`);
  
  // Use tempo prompt to print help and determine operation mode and the tempo
  while ( false == show_and_process_help_and_tempo_dialog() )   {}

  // Assign event handlers according to the operation mode
  // To facilitate passing parameters to event handlers, use an anonymous function
  if ( !g_stepManual )  {
    register_window_event_listener( "click",
                                    wrap__scroll_stop_handler);
    register_window_event_listener( "contextmenu",
                                    wrap__scroll_start_handler);

  } else  {
    register_window_event_listener( "click",
                                    wrap__manual_step_back_handler);
    register_window_event_listener( "contextmenu",
                                    wrap__manual_step_forth_handler);
  }
  register_window_event_listener(   "dblclick",
                                    wrap__restart_handler);
  
  g_totalHeight = get_scroll_height();

  // scroll to the first ocuurence of any page
  const firstPageOccId = filter_positions(g_scoreStations)[0].occId;
  const firstPage = document.getElementById(firstPageOccId);
  const topPos = firstPage.offsetTop;
  //alert(`Page onload event; scroll to the first page (${firstPageOccId}) at y=${topPos}`);
  console.log(`Scroll to the first page (${firstPageOccId}) at y=${topPos}`);
  // window.scrollTo({ top: topPos, behavior: 'smooth'});
  window.scrollTo(0, topPos);
  g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'topPos' ?
  g_scrollIsOn = false;
  g_currStep = (g_stepManual)? 0 : -1;
}
// wrapper had to be moved to the top - before the 1st use


//~ function message__onMouseOver(event)
//~ {
  //~ alert("onMouseOver event on " + event.target.id);
//~ }


/* Uses tempo prompt to print help and determine operation mode and the tempo.
 * Returns true on success, false on error */
function show_and_process_help_and_tempo_dialog()
{
  let defaultTempo = (g_stepManual)? 0 : g_tempo;
  let helpStr = build_help_string(1, 1) + "\n" + build_help_string(0, 0) +
                `\n\nPlease enter beats/sec; 0 or empty mean manual-step mode`;
  const tempoStr = window.prompt( helpStr, defaultTempo);
  let modeMsg = "UNDEF"
  if ( (tempoStr == "") || (tempoStr == "0") )  {
    g_stepManual = true;
    modeMsg = "MANUAL-STEP MODE SELECTED";
  } else  {
    const tempo = Number(tempoStr);
    // heck validity of 'tempo
    if ( isNaN(tempo) || (tempo < 0) )  {
      err = `Invalid tempo "${tempoStr}"; should be a positive number (beats/sec) or zero`;
      console.log("-E- " + err);      alert(err);
      return  false;
    }
    g_stepManual = false;
    g_tempo = tempo;
    modeMsg = `AUTO-SCROLL MODE SELECTED; TEMPO IS ${g_tempo} BEAT(s)/SEC`;
  }
  console.log("-I- " + modeMsg);
  timed_alert(modeMsg +
            ((g_stepManual)? "" : "\<br\><br\>RIGHT-CLICK TO START SCROLLING"),
            (g_stepManual)? 1.5 : 5);
  return  true;
}


// Automatic-scroll-mode handler of scroll-start
function scroll_start_handler(event)
{
  event.preventDefault();
  // Unfortunately event prevention blocks timed alert
  //~ /* Keep the rest of the handlers from being executed
  //~ *   (and it prevents the event from bubbling up the DOM tree) */
  //~ event.stopImmediatePropagation();

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
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll_start_handler  = (event) => { scroll_start_handler(event) }


// Automatic-scroll-mode handler of scroll-stop
function scroll_stop_handler(event)
{
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  //event.stopImmediatePropagation();  // crucial because of alert inside handler!

  if ( !g_scrollIsOn )  { return }  // double-stop - silently ignore
  if ( g_currStep > 0 ) { g_currStep -= 1 }   // it was already advanced
  rec = filter_positions(g_scoreStations)[g_currStep];
  winY = get_scroll_current_y();
  msg = `STOP/PAUSE SCROLLING AT STEP ${rec.tag}::${one_position_toString(g_currStep, rec)};  POSITION ${winY}`;
  console.log(msg);
  alert(msg);
  scroll_abort();
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll_stop_handler  = (event) => { scroll_stop_handler(event) }


// Manual-step-mode handler of step-forth
function manual_step_forth_handler(event)
{
  event.preventDefault();
  // Unfortunately event prevention blocks timed alert
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation();

  const nSteps = filter_positions(g_scoreStations).length;
  if ( g_currStep >= (nSteps - 1) )  {
    msg = `ALREADY AT THE END`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    return;
  }
  return  _manual_one_step(+1);
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__manual_step_forth_handler  = (event) => {
                                              manual_step_forth_handler(event) }


// Manual-step-mode handler of step-back
function manual_step_back_handler(event)
{
  event.preventDefault();
  // Unfortunately event prevention blocks timed alert
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation();

  if ( g_currStep == 0 )  {
    msg = `ALREADY AT THE BEGINNING`;
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    return;
  }
  return  _manual_one_step(-1);
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__manual_step_back_handler  = (event) => {
                                              manual_step_back_handler(event) }


// Performs common for both forth and back actions of one manual step
function _manual_one_step(stepIncrement)
{
  if ( (stepIncrement != -1) && (stepIncrement != 1) )  {
    msg = `-E- Invalid step-increment=${stepIncrement}; should be -1 or 1`;
    console.log(msg);
    alert(msg);
    return
  }
  const nSteps = filter_positions(g_scoreStations).length;
  if ( (g_currStep < 0) || (g_currStep >= nSteps) ) {
    msg = `-E- Invalid step ${g_currStep}; should be 0..${nSteps-1}; jump to the begining`;
    console.trace();
    console.log(msg);
    alert(msg);
    g_currStep = 0;
    return;
  }

  /*  */
  const currWinY = get_scroll_current_y();
  let newStep = -1; 
////debugger;   // OK_TMP
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


function restart_handler(event)
{
  // restart with confirmation in auto mode would require pause scrolling
  //    though (at least on Linux) double-click is hidden
  //    by modal stop-scrolling confirmation dialog
  if ( !g_stepManual && g_scrollIsOn )  {
    msg = "-W- RESTART REQUESTS IGNORED UNTIL AUTO-SCROLL IS STOPPED";
    console.log(msg);
    timed_alert(msg, 1/*sec*/);
    return;
  }
  // Unfortunately event prevention blocks timed alert (so placed aftger it)
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation();  // crucial because of alert inside handler!


  if ( confirm("Press <OK> to restart from the top, <Cancel> to continue...")) {
    console.log("Restart-from-top is confirmed");
    scroll__onload(event/*TODO: maybe extract onload worked function*/);
  } else {
    console.log("Restart-from-top is canceled; continuing");
    timed_alert("... continuing ...", 3/*sec*/);
  }
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__restart_handler  = (event) => { restart_handler(event) }
///////////// End of handler functions ////////////////////////////////////////


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
  //  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec, occId: "pg01:01"}
  const rec = filter_positions(g_scoreStations)[stepNum];
  const targetPos = convert_y_img_to_window(rec.occId, rec.y);

  console.log(`-I- Scroll to ${rec.occId}:${targetPos} for step ${stepNum}`);
  // (scrolls absolute pixels) window.scrollTo({ top: targetPos, behavior: 'smooth'});
  window.scrollTo(rec.x/*TODO:calc*/, targetPos);
  g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'targetPos' ?
  
  if ( !g_stepManual )  {
////scroll_abort(); // OK_TMP
    g_currStep = stepNum + 1;
    // the next line causes async wait
    scroll_schedule(rec.timeSec, rec.tag);
  }
  return  1;
}


////////////////////////////////////////////////////////////////////////////////
/* Returns scale of the image/page occurence
 * (page occurences preserve scales of the original images) */
function get_image_occurence_scale_y(scoreStationsArray, occId, alertErr=false)
{
  // we need any line on our image/page occurence (occId) - to obtain 'pageId'
  const rec = scoreStationsArray.find((value, index, array) => {
    return  (value.occId == occId)
  });
  if ( rec === undefined )  {
    err = `-E- Missing records for image/page occurence '${occId}'`;
    console.log(err);
    if ( alertErr )  { alert(err); }
    return  -1;
  }
  return  get_image_scale_y(scoreStationsArray, rec.pageId);
}


// Returns scale of the original image (not possibly cropped occurence)
function get_image_scale_y(scoreStationsArray, pageId)
{
  const imgHtmlElem   = document.getElementById(pageId);
  const renderHeight  = imgHtmlElem.offsetHeight;
  const origHeight    = get_original_image_size(scoreStationsArray, pageId, true);
  return  renderHeight / origHeight;
}


function get_original_image_size(scoreStationsArray, pageId, alertErr=false)
{
  const rec = scoreStationsArray.find((value, index, array) => {
    return  ( (value.tag == "Control-Height") && (value.pageId == pageId) )
  });
  let height = read_image_size_record(scoreStationsArray, pageId,
                                      /*alertErr=*/false);
  if ( height < 0 )  {  // record missing in the stations' array
    // try to read from g_imageDimensions : Map(pageId : {width:w, height:h})
    // TODO: check existence of the map
    if ( !g_imageDimensions.has(pageId) )  {
      err = `-E- Missing size of original image for page '${pageId}'`;
      console.log(err);  console.trace();
      if ( alertErr )  {
        alert(err);
        return  -1;
      }
    } else {
      let {width:w, height:h} = g_imageDimensions.get(pageId);
      height = h;
    }
  }
  return  height;
}


// See https://javascript.info/size-and-scroll-window
function get_scroll_height()
{
  let scrollHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight);

  // alert('Full document height, with scrolled out part: ' + scrollHeight);
  return  scrollHeight;
}


// Returns the rendered vertical position (winY) of the current scroll status
function get_scroll_current_y()
{
  // adopted from: https://stackoverflow.com/questions/4096863/how-to-get-and-set-the-current-web-page-scroll-position
  return  document.documentElement.scrollTop || document.body.scrollTop;
}


// Converts vertical position from image coordinates to rendered window
// !!!! TODO: Recompute y-offset for possibly cropped page occurence !!!
function convert_y_img_to_window(imgHtmlPageOccId, imgY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageOccId);
  // page occurences preserve scales of the original images
  const pageScaleY = get_image_occurence_scale_y(g_scoreStations,
                                                 imgHtmlPageOccId);
  const yTop = read_image_occurence_yTop(g_imgPageOccurences,
                                         imgHtmlPageOccId, /*alertErr=*/true);
  if ( yTop < 0 )  {    /* TODO: raise exception */  }
  
  const winY = pageHtmlElem.offsetTop + (imgY - yTop) * pageScaleY;
  return  Math.floor(winY);
}


// Converts vertical position from image coordinates to rendered window
function convert_y_window_to_img(imgHtmlPageOccId, winY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageId);
  // page occurences preserve scales of the original images
  const pageScaleY = get_image_occurence_scale_y(g_scoreStations,
                                                 imgHtmlPageOccId);
  const yTop = read_image_occurence_yTop(g_imgPageOccurences,
                                         imgHtmlPageOccId, /*alertErr=*/true);
  if ( yTop < 0 )  {    /* TODO: raise exception */  }
  
  const imgY = (winY - pageHtmlElem.offsetTop) / pageScaleY + yTop;
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
  let descr = `step${stepIdx}=>${v.occId}::${v.y}=${convert_y_img_to_window(v.occId, v.y)}`;
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
  candidates.forEach( (v) => candidatesDescr += `; step${v.step}=>${v.occId}::${v.y}` );
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
    return convert_y_img_to_window(rec.occId, rec.y);
                                                  } );
  winYArray = uniq_sort(winYArrayUnsorted, (a, b) => a - b);
  let results = [];
  let currPage = null;
  for ( let i = 0;  i < scorePositions.length;  i += 1 ) {
    let rec       = scorePositions[i];
    let currWinY  = convert_y_img_to_window(rec.occId, rec.y);
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
                  scorePositions[step].occId, scorePositions[step].y);
}


/* Returns image height or -1 on error
 * Note, height is that of the original image (not possibly cropped occurence)
 * Takes the data from 'scoreStationsArray' or 'g_imageDimensions'  */
function read_image_size_record(scoreStationsArray, pageId, alertErr=false)
{
  const rec = scoreStationsArray.find((value, index, array) => {
    return  ( (value.tag == "Control-Height") && (value.pageId == pageId) )
  });
  if ( rec === undefined )  {
    wrn = `-W- Missing size record for page '${pageId}'`;
    console.log(wrn);
    if ( alertErr )  {
      console.trace();  alert(wrn);
      return  -1;
    }
  }
  return  rec.y;
}

/** END: access to scoreStationsArray *****************************************/


/** BEGIN: access to imgPageOccurencesArray ************************************/
//imgPageOccurencesArray /*{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
function read_image_occurence_yTop(imgPageOccurencesArray, occId, alertErr=false)
{
  const rec = imgPageOccurencesArray.find((value, index, array) => {
    return  (value.occId == occId)
  });
  if ( rec === undefined )  {
    err = `-E- Unknown image/page occurence '${occId}'`;
    console.log(err);  console.trace();
    if ( alertErr )  { alert(err); }
    return  -1;
  }
  return  rec.yTop;
}
/** END: access to imgPageOccurencesArray **************************************/


/*******************************************************************************
 * Automatically closing alert/message.
 * (from: https://stackoverflow.com/questions/15466802/how-can-i-auto-hide-alert-box-after-it-showing-it)
 ******************************************************************************/
function timed_alert(msg, durationSec)
{
  var el = document.createElement("div");
  el.setAttribute("style","position:fixed;top:85%;left:20%;background-color:lightblue;");
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


function remove_filename_extension(filename)
{
  var lastDotPosition = filename.lastIndexOf(".");
  if (lastDotPosition === -1) return filename;
  else return filename.substr(0, lastDotPosition);
}


function register_window_event_listener(eventType, handler)
{
  if ( g_windowEventListenersRegistry.hasOwnProperty(eventType) ) {
    window.removeEventListener(eventType,
                               g_windowEventListenersRegistry[eventType]);
  }
  window.addEventListener(eventType, handler);
  g_windowEventListenersRegistry[eventType] = handler;
}
