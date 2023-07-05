// img_scroll.js
////////////////////////////////////////////////////////////////////////////////


/////////// Global-events-registry should be defined on top of the code ////////
var g_windowEventListenersRegistry = null; //for {event-type::handler}
function _global_events_registry()  // wraps access to the registry
{
  if ( g_windowEventListenersRegistry === null )
    g_windowEventListenersRegistry = new Map();
  return  g_windowEventListenersRegistry;
}
////////////////////////////////////////////////////////////////////////////////


// register the global error handlers in the very beginning
window.addEventListener( "error", function (e) {
  return _scroller_global_error_handler(e);
}, { once: true } )
window.addEventListener( 'unhandledrejection', function (e) {
  return _scroller_global_rejection_handler(e);
}, {once: true} )

////throw new Error("OK_TMP: Test global error handler");


//////// Begin: scroller application configuration stuff ///////////////////////
const g_ScrollerPreferances = {
    numLinesInStep: 1, // 1|2 HARDCODED(!) number of lines to scroll in one step
    progressShowPeriodSec: 1,   // progress bar (or marker) update period
    progressBar_numCellsForMinFullTime: 3,  // shortest progress bar (char-s)
    progressBar_fontSize: 25,
};
const PF = g_ScrollerPreferances;   // shortcut to preferances
//////// End:   scroller application configuration stuff ///////////////////////


//////// Begin: raw inputs for a particular score //////////////////////////////
const g_ScoreRawInputs = {
  scoreName: g_scoreName,
  scoreLines: g_scoreLines, /*{tag:STR, pageId:STR, x:INT, y:INT, timeBeat:FLOAT}*/
  linePlayOrder: g_linePlayOrder, /*{pageId:STR, lineIdx:INT, timeBeat:FLOAT}*/
  pageImgPathsMap: g_pageImgPathsMap, /*{pageId(STR) : path(STR)*/
};
const RI = g_ScoreRawInputs;   // shortcut to per-score raw inputs
//////// End:   raw inputs for a particular score //////////////////////////////


//////// Begin: processed/massaged input data for a particular score ///////////
const g_ScoreMassagedDataInputs = {
  scoreStations: null, // [{tag:STR, pageId:STR=occID, [origImgPageId:STR], x:INT, y:INT, timeSec:FLOAT}]
  playedLinePageOccurences: null,  // (index in 'linePlayOrder') => occId
  // 'perStationScorePositionMarkers' serves for play-progress indication in auto-scroll mode
  perStationScorePositionMarkers: null,  // [..., [..., [xInWinPrc, occId, yOnPage], ...], ...]
  pageLineHeights: null,  // image/pageId :: estimated-line-height
  // min play duration of a line in the score - in beats and in seconds
  minTimeInOneLineBeat: -1,
  minTimeInOneLineSec: -1,
  maxScoreImageWidth: -1,
  minLineHeight: -1,
};
const PD = g_ScoreMassagedDataInputs;  // shortcut to per-score processed inputs
//////// End: processed/massaged input data for a particular score ///////////




//////// Begin: prepare global data for the scroller and start it ///////////////


arrange_score_global_data(RI.scoreName, RI.pageImgPathsMap,
                          RI.scoreLines, RI.linePlayOrder, PF.numLinesInStep);
// at this stage 'PD.scoreStations' is built, but times reflect default tempo

//(meaningless - will not wait for:)  modal_alert("OK_TMP: Test modal_alert()");

//(does not work) import Dialog from './ModalDialog.js';

let g_helpAndTempoDialog = null;
const _g_htmlStatusBoxId = "SCROLLER-STATUS_BOX";

/* Manual Scroll    == compute next position based on current scroll.
 * No Manual Scroll == compute next position based on current step, ignore scroll position.
 * (Do not confuse "Manual Scroll" with "Manual Step".)
 * Disclaimer: manual scroll isn't properly debugged. */
const g_permitManualScroll = false;  // 


var g_stepManual = true;  // false = auto-scroll, true = manual-stepping

var g_totalHeight = -1; // for document scroll height
var g_currStep = -1;  // not started
var g_scrollIsOn = false;

var g_lastJumpedToWinY = -1;  // will track scroll-Y positions


//////// Begin: global timer IDs ///////////////////////////////////////////////
var g_nextTimerIntervalId = 0;
var g_progressTimerId = 0;
//////// End:   global timer IDs ///////////////////////////////////////////////


//////// settings and variables for ignoring single-click upon double-click ////
const _g_singleClickDelayMs = 400;  //
var   _g_clickCount = 0;  // for ignoring single-click upon double-click
var   _g_singleClickTimer = null;
/////////////////////////////////////////////////////////////////////////////////

//////////////////// Assume existence of the following global variables: ////////
// g_imgPageOccurences : array of {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
// PD.scoreStations : array of {tag:STR, pageId:STR=occID, [origImgPageId:STR], x:INT, y:INT, timeSec:FLOAT}
////////////////////////////////////////////////////////////////////////////////


/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll__onload  = (event) => {
  scroll__onload(event).catch( (e) => {
    console.log(e);
//debugger;  // OK_TMP
    //throw new Error("Re-thrown error: " + e);
    throw e;
  } );
  /* error/exception is explicitly propagated to reach 'onerror; handler,
   * since JS returns rejected promise with error
   * (something like:  return Promise.Reject(error)) */
}


// !ASSIGNMENT OF A HANDLER FOR PAGE-LOAD EVENT EFFECTIVELY STARTS THE SCROLLER!
register_window_event_listener("load", wrap__scroll__onload);
//////// End  : prepare global data for the scroller and start it ///////////////


////////// Utilities ///////////////////////////////////////////////////////////

function build_help_string(showHeader, showFooter, modeManual=g_stepManual)
{
  const numStations = filter_positions(PD.scoreStations).length;
  let ret = "";
  if ( showHeader ) {
    ret +=  `
 . . . . . . MUSICAL SCORE SCROLLER . . . . . .
== by Oleg Kosyakovsky - Haifa, Israel - 2023


=> Left-mouse-button-Double-Click \t= Choose Step Mode (MANUAL/AUTO)\n`;
  }
  ret += `
============= Step Mode: ${(modeManual)? "MANUAL " : "AUTO =="}=============`;
    
  if ( modeManual ) {
    ret += `
=> Left-mouse-button-Click \t= Go Back
=> Right-mouse-button-Click\t= Go Forth`;
  } else {
    ret += `
=> Right-mouse-button-Click\t= Stop/Pause Auto-Scroll
=> Left-mouse-button-Click \t= Start/Resume Auto-Scroll
=> When paused, you can manually adjust the scroll position`;
  }
  if ( showFooter )  {
    ret += "\n\n========================================";
    let showStep = -1;
    if (      g_currStep <  0           )  showStep = 0;
    else if ( g_currStep >= numStations )  showStep = numStations - 1;
    else                                   showStep = g_currStep;
    ret += `
> > > > CURRENT STEP is ${showStep} out of 0...${numStations-1} < < < <`;
  }
  return  ret;
}


/* Builds browser page with score images' occurences in the play order.
 * Collects score data in the expected global collections */ 
async function arrange_score_global_data(scoreName, pageImgPathsMap,
                                   scoreLinesArray, linePlayOrderArray,
                                   numLinesInStep)
{
  // Create the play-order layout (occurs AFTER the HTML body)
  // arguments:
  //    name,
  //    scoreLinesArray, /*{tag:STR, pageId:STR, x:INT, y:INT, timeBeat:FLOAT}*/
  //    linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeBeat:FLOAT}*/
  //    imagePathsMap, /*{pageId(STR) : path(STR)*/
  //    numLinesInStep  /*INT*/ 
  let plo = new PlayOrder(scoreName,
                          g_tempo,
                          scoreLinesArray,
                          linePlayOrderArray,
                          pageImgPathsMap,
                          numLinesInStep
                         );

  // Compute and render the score images' occurences in the play order
  // arguments:
  //    pageImagePathsMap,  /*pageId:STR => imgPath:STR*/
  //    imgPageOccurences /*pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
  let iml = new ScoreImgLayout(pageImgPathsMap,
                               plo.imgPageOccurences
                              );
  await iml.render_images();  //...await completion to access image widths
  PD.maxScoreImageWidth = iml.get_max_score_image_width();

  // ... the copy will be 2-level deep - fine for the task
  PD.scoreStations = plo.scoreStations.map(a => {return {...a}});

  // ... the copy will be 1-level deep - fine for the task
  PD.playedLinePageOccurences = [...plo.playedLinePageOccurences];
  
  // true deep-copy - [..., [..., [xInWinPrc, occId, yOnPage], ...], ...]
  // (at this time 'PD.perStationScorePositionMarkers' built for default tempo)
  PD.perStationScorePositionMarkers = JSON.parse(
                         JSON.stringify( plo.perStationScorePositionMarkers ));

  // ... the copy will be 2-level deep - fine for the task
  g_imgPageOccurences = plo.imgPageOccurences.map(a => {return {...a}});

  // Map is deep-cloned
  PD.pageLineHeights = new Map(
    JSON.parse(JSON.stringify([...plo.pageLineHeights])));

  PD.minLineHeight = Math.min(... PD.pageLineHeights.values());

  PD.minTimeInOneLineBeat = Math.min.apply(null,
                        linePlayOrderArray.map(function(a){return a.timeBeat}));
}


// Initiates scrolling operation starting from the current step 'g_currStep'
// Scrolls to line-01
async function scroll__onload(event)
{
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation(); // crucial because of prompt inside handler!
  
  // Unregister main events to prevent interference with help/tempo.mode dialog
  ["click", "contextmenu", "dblclick"].forEach(
        evType => unregister_window_event_listener( evType ));
  
  // set tab title to score-file name
  let fileName = window.location.pathname.split("/").pop();
  let pageName = `Scroll: ${remove_filename_extension(fileName)}`;
  document.title = pageName;

  verify_score_lines_sanity(RI.scoreLines);                     // aborts on error
  verify_all_image_occurences_rendering(g_imgPageOccurences);  // aborts on error

  //  try {
    const posDescrStr = positions_toString(PD.scoreStations, "\n");
    console.log(`All score steps \n =========\n${posDescrStr}\n =========`);
  // } catch (e) {
  //   console.log(e);
  //   alert(e);
  //   throw new Error("Re-thrown error: " + e);
  // }
  
  // Use tempo prompt to print help and determine operation mode and the tempo
  while ( false == await show_and_process_help_and_tempo_dialog() );

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

  let scrollToPos = -1;
  const numStations = filter_positions(PD.scoreStations).length;
  if ( g_currStep < 0 )  {
    // scroll to the very first ocuurence of any page
    const firstPageOccId = filter_positions(PD.scoreStations)[0].pageId;
    const firstPage = document.getElementById(firstPageOccId);
    scrollToPos = firstPage.offsetTop;
    //alert(`Page onload event; scroll to the first page (${firstPageOccId}) at y=${scrollToPos}`);
    console.log(`-D- Initial scroll to the first page (${firstPageOccId}) at y=${scrollToPos}`);
    g_currStep = (g_stepManual)? 0 : -1;
  } else if ( g_currStep < numStations )  {
    // scroll to step 'g_currStep'
    const rec = filter_positions(PD.scoreStations)[g_currStep];
    scrollToPos = convert_y_img_to_window(rec.pageId, rec.y);
    console.log(`-D- Initial scroll to step ${g_currStep} at y=${scrollToPos}`);
  } else {
    // already after the end - tell not to scroll
    scrollToPos = g_lastJumpedToWinY = get_scroll_current_y();
    console.log(`-D- Initial scroll rejected - already at the bottom - y=${scrollToPos}`);
    g_currStep = numStations - 1;
  }
  if ( scrollToPos != g_lastJumpedToWinY )  {
    // window.scrollTo({ top: scrollToPos, behavior: 'smooth'});
    window.scrollTo(0, scrollToPos);
    g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'scrollToPos' ?
  }
  g_scrollIsOn = false;
}
// wrapper had to be moved to the top - before the 1st use


//~ function message__onMouseOver(event)
//~ {
  //~ alert("onMouseOver event on " + event.target.id);
//~ }


/* Uses tempo prompt to print help and determine operation mode and the tempo.
 * Returns true on success, false on error */
async function show_and_process_help_and_tempo_dialog()
{
  let defaultTempo = (g_stepManual)? 0 : g_tempo;
  let helpStr = build_help_string(1,0, 1, 1) + "\n" + build_help_string(0,1, 0) +
      `\n\nPlease enter beats/sec; 0 or empty mean manual-step mode`;

  // build the prompt-dialog so that it cannot be canceled
  g_helpAndTempoDialog = new Dialog(
    {
      eventsToBlockWhileOpen: ['click', 'contextmenu', 'dblclick'],
      supportCancel:          false,
      accept:                 "OK",
    } );

  window.addEventListener("keydown", _confirm_escape_handler);

  ////////const tempoStr = window.prompt( helpStr, defaultTempo);
  const res = await g_helpAndTempoDialog.prompt( helpStr, defaultTempo );

  window.removeEventListener("keydown", _confirm_escape_handler);

  //debugger;  // OK_TMP
  // 'res' is 'false' upon cancel or an object with form-data upon accept
  if ( res == false )  {
    return  false;
  }
  let formData = res;
  //debugger;  // OK_TMP
  let tempoStr = ('prompt' in formData)? formData.prompt : "MISSING";
  let modeMsg = "UNDEF"
  if ( (tempoStr == "") || (tempoStr == "0") )  {
    g_stepManual = true;
    g_tempo = 0;
    PD.perStationScorePositionMarkers = null; //manual mode - cannot show progress
    modeMsg = "MANUAL-STEP MODE SELECTED";
  } else  {
    const tempo = Number(tempoStr);
    // check validity of 'tempo
    if ( isNaN(tempo) || (tempo < 0) )  {
      err = `Invalid tempo "${tempoStr}"; should be a positive number (beats/sec) or zero`;
      console.log("-E- " + err);      alert(err);
      return  false;
    }
    g_stepManual = false;
    g_tempo = tempo;  // beat/min
    PD.minTimeInOneLineSec = PD.minTimeInOneLineBeat * 60.0 / g_tempo;
    modeMsg = `AUTO-SCROLL MODE SELECTED.\<br\> TEMPO IS ${g_tempo} BEAT(s)/SEC`;
    // auto mode can show progress, build 'PD.perStationScorePositionMarkers'
    const tmp_scoreDataLines = filter_and_massage_positions(RI.scoreLines);
    PD.perStationScorePositionMarkers = [];  // prepare for completely new values
    PlayOrder.recompute_times_in_score_stations_array(
                   PD.scoreStations, g_tempo, PF.numLinesInStep, RI.linePlayOrder,
                   tmp_scoreDataLines, PD.playedLinePageOccurences,
                   PD.perStationScorePositionMarkers);
  }
  console.log("-I- " + modeMsg);
  let statusMsg = modeMsg + "\<br\><br\>" + _status_descr(g_currStep, -1);
  sticky_alert(statusMsg, _g_htmlStatusBoxId);
  timed_alert(modeMsg +
              ((g_stepManual)? "" : "\<br\><br\>RIGHT-CLICK TO START SCROLLING"),
              (g_stepManual)? 1.5 : 5);

  return  true;
}


// Automatic-scroll-mode handler of scroll-start
async function scroll_start_handler(event)
{
  let countDownMsg = "";
  event.preventDefault();
  // Unfortunately event prevention blocks timed alert
  //~ /* Keep the rest of the handlers from being executed
  //~ *   (and it prevents the event from bubbling up the DOM tree) */
  //~ event.stopImmediatePropagation();
//debugger;  //OK_TMP
  if ( !g_stepManual && g_scrollIsOn ) { return }//double-start - silently ignore
  
  const numPositions = filter_positions(PD.scoreStations).length;
  const currWinY = get_scroll_current_y();
  let newStep = g_currStep;  // may differ if manually scrolled while paused
  if ( g_scrollIsOn == false )  {
    // check if manually scrolled while being paused;  TODO: MAYBE DEACTIVATE?
    let stepToLookAround = g_currStep;
    if ( stepToLookAround < 0 )
      stepToLookAround = 0;
    else if ( stepToLookAround >= numPositions )
      stepToLookAround = numPositions - 1;
    newStep = find_nearest_matching_position(PD.scoreStations,
                                     currWinY, stepToLookAround);
  }

  if ( newStep == 0 /*g_currStep == -1*/ ) {
    g_currStep = 0;
    countDownMsg = "Second(s) left till start from top:";
    msg = `START SCROLLING FROM THE TOP`;
    console.log(msg);
  } else if ( g_scrollIsOn == true /*newStep == g_currStep*/ )  { // ?what for?
    g_currStep = 0;
    countDownMsg = "Second(s) left till start from top:";
    msg = `START SCROLLING FROM THE TOP`;
    console.log(msg);
  } else if ( newStep >= numPositions )  {
    msg = "Already beyound the end"
    console.log(msg);
    timed_alert(msg, 2/*sec*/);
    return;  // essentially ignored
    //~ g_currStep = 0;  // automatic jump to top - DEACTIVATED
    //~ countDownMsg = "Second(s) left till restart from top:";
    //~ msg = `RESTART SCROLLING FROM THE TOP`;
    //~ console.log(msg);
  } else  {  // g_scrollIsOn == false
    // if manually scrolled while being paused, change step;  TODO: MAYBE DEACTIVATE?
    rec = filter_positions(PD.scoreStations)[newStep];
    countDownMsg = `Second(s) left till resume from step ${newStep}:`;
    msg = `RESUME SCROLLING FROM STEP ${one_position_toString(newStep, rec)} FOR POSITION ${currWinY} (was paused at step ${g_currStep})`;
    console.log(msg);
    g_currStep = newStep;
    // it immediately scrolls, since the step is already advanced
    // TODO: is the above OK?
  }
  g_scrollIsOn = true;
  rec = filter_positions(PD.scoreStations)[g_currStep];

  // start delay with countdown display
  await async_wait_with_countdown(4/*start delay (sec)*/,  1/*period (sec)*/,
                                  countDownMsg);
  timed_alert(msg, 2/*sec*/);

  scroll_perform_one_step(g_currStep);
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll_start_handler  = (event) => { scroll_start_handler(event) }


// Automatic-scroll-mode handler of scroll-stop
function scroll_stop_handler(event)
{
  //console.log(`-D- click-event: 'detail'=${event.detail}`);
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  //event.stopImmediatePropagation();  // crucial because of alert inside handler!

  if ( !g_scrollIsOn )  { return }  // double-stop - silently ignore
  if ( g_currStep > 0 ) { g_currStep -= 1 }   // it was already advanced

  if ( g_progressTimerId != 0 )
    clearTimeout(g_progressTimerId);  // kill old progress-indicator timer if any

  rec = filter_positions(PD.scoreStations)[g_currStep];
  winY = get_scroll_current_y();
  msg = `STOP/PAUSE SCROLLING AT STEP ${rec.tag}::${one_position_toString(g_currStep, rec)};  POSITION ${winY}`;
  console.log(msg);
  alert(msg);
  scroll_abort();
}


/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__scroll_stop_handler  = (event) => {
  event.preventDefault();
  _g_clickCount++;
  if (_g_clickCount === 1) {
    _g_singleClickTimer = setTimeout(
      function() {
        _g_clickCount = 0;    scroll_stop_handler(event);
      }, _g_singleClickDelayMs );
    //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) ENGAGED`);
  } else if (_g_clickCount === 2) {
    clearTimeout(_g_singleClickTimer);
    //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) CLEARED (stop)`);
    _g_clickCount = 0;
    console.log("-D- Ignoring 2nd single-click");;
  }
  
  //////////scroll_stop_handler(event)
}


// Manual-step-mode handler of step-forth
function manual_step_forth_handler(event)
{
  event.preventDefault();
  // Unfortunately event prevention blocks timed alert
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation();

  const nSteps = filter_positions(PD.scoreStations).length;
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
  manual_step_forth_handler(event)
}


// Manual-step-mode handler of step-back
function manual_step_back_handler(event)
{
  //console.log(`-D- click-event: 'detail'=${event.detail}`);
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
  event.preventDefault();
  _g_clickCount++;
  if (_g_clickCount === 1) {
    _g_singleClickTimer = setTimeout(
      function() {
        _g_clickCount = 0;    manual_step_back_handler(event);
      }, _g_singleClickDelayMs );
    //console.trace();  // OK_TMP
    //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) ENGAGED`);
  } else if (_g_clickCount === 2) {
    clearTimeout(_g_singleClickTimer);
    //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) CLEARED (back)`);
    _g_clickCount = 0;
    console.log("-D- Ignoring 2nd single-click");;
  }
  
  ////manual_step_back_handler(event)
}


// Performs common for both forth and back actions of one manual step
function _manual_one_step(stepIncrement)
{
  if ( (stepIncrement != -1) && (stepIncrement != 1) )  {
    msg = `-E- Invalid step-increment=${stepIncrement}; should be -1 or 1`;
    console.log(msg);
    alert(msg);
    return
  }
  const nSteps = filter_positions(PD.scoreStations).length;
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
  if ( g_permitManualScroll && (currWinY != g_lastJumpedToWinY) )   {
    newStep = find_nearest_matching_position(PD.scoreStations,
                                                currWinY, g_currStep);
    console.log(`-I- Manual scroll to winY=${currWinY} detected`);
  } else {
    // not scrolled manually or scrolled not enough, so go one 'stepIncrement'
    newStep = g_currStep + stepIncrement; 
  }
  rec = filter_positions(PD.scoreStations)[newStep];
  const actionStr = (newStep == (g_currStep + stepIncrement))?
                                ((stepIncrement < 0)? "BACK":"FORTH") : "JUMP"; 
  msg = `${actionStr} TO STEP ${one_position_toString(newStep, rec)} FOR POSITION ${currWinY} (previous step was ${g_currStep})`;
  console.log(msg);
  g_currStep = newStep;
  timed_alert(msg, 1/*sec*/);
  // in manual-step mode it should scroll immediately
  scroll_perform_one_step(g_currStep);
}


async function restart_handler(event)
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
  event.preventDefault();

  // build the confirm-restart-dialog
  confirmRestartDialog = new Dialog(
    {
      eventsToBlockWhileOpen: ['click', 'contextmenu', 'dblclick'],
      supportCancel:          true,
      accept:                 "OK",
      cancel:                 "Cancel",
    } );
  
  const numStations = filter_positions(PD.scoreStations).length;
  let showStep = -1;
  if (      g_currStep <  0           )  showStep = 0;
  else if ( g_currStep >= numStations )  showStep = numStations - 1;
  else                                   showStep = g_currStep;
  
  const restartStr = `
Press <OK> to re-select operation mode, <Cancel> to continue...

> > > > (CURRENT STEP is ${showStep} out of 0...${numStations-1}) < < < <
          --- You can "wind" forward/backward in manual-step mode ---`;

  // Unregister main events to prevent interference with restart dialog
  let copyOfRegistry = new Map(_global_events_registry());  // shallow-copy
  ["click", "contextmenu", "dblclick"].forEach(
        evType => unregister_window_event_listener( evType ));
  window.addEventListener("keydown", _confirm_escape_handler);

  const res = await confirmRestartDialog.confirm( restartStr );

  window.removeEventListener("keydown", _confirm_escape_handler);
  // Restore registration of main events
//debugger;  // OK_TMP
  register_specified_window_event_listeners(copyOfRegistry);

  //debugger;  // OK_TMP
  clearTimeout(_g_singleClickTimer);// prevent delayed firing of single-click
  //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) CLEARED (after-restart)`);

  // 'res' is 'false' upon cancel or 'true' upon accept
  if ( res == true )  {
    console.log(`Restart-from-step-${g_currStep} is confirmed`);
    wrap__scroll__onload(event/*TODO: maybe extract onload worker function*/);
  } else {
    console.log(`Restart-from-step-${g_currStep} is canceled; continuing`);
    timed_alert("... continuing ...", 3/*sec*/);
    return  false;
  }


  // if ( confirm("Press <OK> to restart from the top, <Cancel> to continue...")) {
  //   console.log("Restart-from-top is confirmed");
  //   scroll__onload(event/*TODO: maybe extract onload worked function*/);
  // } else {
  //   console.log("Restart-from-top is canceled; continuing");
  //   timed_alert("... continuing ...", 3/*sec*/);
  // }
}
/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__restart_handler  = (event) => {
  clearTimeout(_g_singleClickTimer);// prevent delayed firing of single-click
  //console.log(`-D- _g_singleClickTimer(${_g_singleClickTimer}) CLEARED (before-restart)`);
  restart_handler(event)
}
///////////// End of handler functions ////////////////////////////////////////


function scroll_schedule(currDelaySec, descr)
{
  if ( g_stepManual )  {
    console.log("-W- scroll_schedule() ignored in manual-step mode");
    return;
  }

  // note, 'g_currStep' is already advanced!!!
  console.log(`-I- Scheduling wait for ${currDelaySec} second(s) at ${descr}`);

  const stepMsg = `... Just scrolled to step ${g_currStep} ...`;
  g_nextTimerIntervalId = setTimeout(scroll_perform_one_step,
                                     currDelaySec * 1000/*msec*/, g_currStep,
                                     stepMsg);

  // scheduled scroll to step #j, meanwhile step #j-1 is progressing
  if ( PD.perStationScorePositionMarkers !== null )  {
    if ( g_progressTimerId != 0 )
      clearTimeout(g_progressTimerId); //kill old progress-indicator timer if any
    console.log(`-I- Scheduling progress indication every ${PF.progressShowPeriodSec} second(s) for step ${g_currStep-1}`);
    if ( (g_currStep-1) >= filter_positions(PD.scoreStations).length )
      throw new Error(`-E- Step number ${g_currStep} too big`);
    //const periodMsec = PF.progressShowPeriodSec * 1000;
    g_progressTimerId = setTimeout(
      _progress_timer_handler, 0/*start indication immediately*/,
      g_currStep-1, 0/*1st indication for current step*/ );
  }
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
function scroll_perform_one_step(stepNum, msgForTimedAlert="")
{
////throw new Error("OK_TMP: test UI event handlers and auto-scroll");
  const stationsDataLines = filter_positions(PD.scoreStations);
  if ( !g_stepManual && !g_scrollIsOn )  { return }
  if ( (stepNum < 0) || (stepNum >= stationsDataLines.length) )  {
    console.log(`-I- At step number ${stepNum}; stop scrolling`);
    //sticky_alert(`Step ${stepNum}:\n stop scrolling`, _g_htmlStatusBoxId);
    sticky_alert(_status_descr(stepNum, -1), _g_htmlStatusBoxId);
    scroll_abort();
    return  0;
  }
  //  {tag:"line-001-Begin", pageId: "pg01:01, origImgPageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec"}
  // note, in 'PD.scoreStations' pageId is occurence-id
  const rec = stationsDataLines[stepNum];
  const targetPos = convert_y_img_to_window(rec.pageId, rec.y);

  console.log(`-I- Scroll to ${rec.pageId}:${targetPos} for step ${stepNum}`);
  // (scrolls absolute pixels) window.scrollTo({ top: targetPos, behavior: 'smooth'});
  window.scrollTo(rec.x/*TODO:calc*/, targetPos);
  g_lastJumpedToWinY = get_scroll_current_y();  // ? or maybe 'targetPos' ?
  // include step time in auto mode
  sticky_alert(_status_descr(stepNum, (!g_stepManual)? rec.timeSec : -1), 
               _g_htmlStatusBoxId);
  if ( msgForTimedAlert != "" )  {
    /* Show step-alert during the beginning of the new step
     * for a fraction of its duration. Location - at the bottom of the score.
     * The assumption: the bottom line was played, then it jumped to the top. */
    const minStepAlertSec = 1;
    const nextStepTimeSec = (stepNum < (stationsDataLines.length-1))?
        stationsDataLines[stepNum+1].timeSec : minStepAlertSec;
    timed_alert(msgForTimedAlert, Math.max(nextStepTimeSec/3, minStepAlertSec));
  }
  if ( !g_stepManual )  {
////scroll_abort(); // OK_TMP
    g_currStep = stepNum + 1;
    // the next line causes async wait
    scroll_schedule(rec.timeSec, rec.tag);
  }
  return  1;
}


////////////////////////////////////////////////////////////////////////////////
// Local utils
////////////////////////////////////////////////////////////////////////////////

function register_window_event_listener(eventType, handler)
{
  if ( _global_events_registry().has(eventType) ) {
    window.removeEventListener(eventType,
                          _global_events_registry().get(eventType));
  }
  window.addEventListener(eventType, handler);
  _global_events_registry().set(eventType, handler);
}


function register_specified_window_event_listeners(eventTypeToHandlerMap)
{
  eventTypeToHandlerMap.forEach( (handler/*value*/, eventType/*key*/) => {
    register_window_event_listener(eventType, handler);
  } );
}


// Removes listener for specified event and returns the original event registry
function unregister_window_event_listener(eventType)
{
  let copyOfRegistry = new Map(_global_events_registry());  // shallow-copy
  if ( _global_events_registry().has(eventType) ) {
    window.removeEventListener(eventType,
                          _global_events_registry().get(eventType));
  }
  _global_events_registry().delete(eventType);
  return  copyOfRegistry;
}


function _confirm_escape_handler(event)
{
  if ( event.key === 'Escape' )  {
    if ( false == window.confirm(
                       "Pressing OK will abort the Musical Score Scroller") )  {
      event.preventDefault();
      /* Keep the rest of the handlers from being executed
       *   (and it prevents the event from bubbling up the DOM tree) */
      event.stopImmediatePropagation();
      console.log("<Escape> key event suppressed at browser-window level")
    }
  }
}



async function modal_alert(msg)
{
  // build the aler-dialog
  alertDialog = new Dialog(
    {
      eventsToBlockWhileOpen: ['click', 'contextmenu', 'dblclick'],
      supportCancel:          false,
      accept:                 "OK",
    } );

  // Unregister main events to prevent interference with this dialog
  let copyOfRegistry = new Map(_global_events_registry());  // shallow-copy
  ["click", "contextmenu", "dblclick"].forEach(
    evType => unregister_window_event_listener( evType ));
  ////(no need) window.addEventListener("keydown", _confirm_escape_handler);

  await alertDialog.alert( msg );

  //// (no need) window.removeEventListener("keydown", _confirm_escape_handler);
  // Restore registration of main events
  //debugger;  // OK_TMP
  register_specified_window_event_listeners(copyOfRegistry);
}


function _status_descr(stepIdx, timeInStateOrNegative)
{
  const numSteps = filter_positions(PD.scoreStations).length;
  let showStep = -1;
  if (      stepIdx <  0           )  showStep = 0;
  else if ( stepIdx >= numSteps    )  showStep = numSteps - 1;
  else                                showStep = stepIdx;

  let descr = "";
  let stepStr = `Step ${showStep} out of 0...${numSteps-1}`;
  if ( (stepIdx < 0) || (stepIdx >= numSteps) ) {
    descr = stepStr + ((!g_stepManual)? ":\<br\><br\>  scrolling stopped" : "");
  } else {
    descr = stepStr;
    if ( timeInStateOrNegative >= 0 )
      descr += `\<br\><br\> (duration ${timeInStateOrNegative} sec)`;
  }
  return  descr;
}


function _progress_timer_handler(iStation, tSecFromStationBegin)
{
  if ( PD.perStationScorePositionMarkers === null )
    throw new Error("-E- Progress position markers unavailable");
  //PD.perStationScorePositionMarkers[i] = [..., [xInWinPrc, occId, yOnPage], ...]
  const nStations = PD.perStationScorePositionMarkers.length;
  if ( iStation >= nStations/*filter_positions(PD.scoreStations).length*/ )
    throw new Error(`-E- Progress position markers for score-step #${iStation} unavailable; expected 0...${nStations-1}`);
  const allMarkers = PD.perStationScorePositionMarkers[iStation];  // one per sec
  let timePerLine = _derive_time_per_line_from_marker_positions(iStation);
  // allMarkers[0]:0sec, allMarkers[1]:1sec, etc.
  if ( (tSecFromStationBegin < 0 ) ||
       (tSecFromStationBegin >= allMarkers.length) )
    throw new Error(`-E- Progress position marker for score-step #${iStation} at ${tSecFromStationBegin} [sec] unavailable; expected 0..${allMarkers.length-1}`);
  [xInWinPrc, pageOccId, yOnPage] = allMarkers[tSecFromStationBegin];
  const fromTopPx = convert_y_img_to_window(pageOccId, yOnPage);
  console.log(`-D- Called _progress_timer_handler(${iStation}, ${tSecFromStationBegin}) => X=${xInWinPrc}%, pageOccId='${pageOccId}', Y=${yOnPage}:${fromTopPx}`);
  // if possible, remove progress indicator before scrolling to the next station
  let removeAfterSec = (tSecFromStationBegin < (allMarkers.length-2))?
                  PF.progressShowPeriodSec : (PF.progressShowPeriodSec - 0.1);
  if ( 0 )
    timed_marker("red", xInWinPrc, fromTopPx, removeAfterSec);
  else  {
    let currLineFullTime = timePerLine.get(fromTopPx);
//debugger;  //OK_TMP
    let progrStr = timed_progress_bar("black",
              xInWinPrc, currLineFullTime, fromTopPx, 1.01*PD.maxScoreImageWidth,
              removeAfterSec, Math.floor(PD.minLineHeight/5.0));
    console.log(`-D- _progress_timer_handler(${iStation}, ${tSecFromStationBegin}) :: ${progrStr}`);
  }

  // if not at end, schedule next indication
  if ( tSecFromStationBegin < (allMarkers.length - PF.progressShowPeriodSec) )
    g_progressTimerId = setTimeout(
      _progress_timer_handler, PF.progressShowPeriodSec * 1000/*msec*/,
      iStation, tSecFromStationBegin + PF.progressShowPeriodSec) ;
}


// Builds and returns Map of {y-in-window :: time-on-this-y}
// TODO: memoize
function _derive_time_per_line_from_marker_positions(iStation)
{
  const markers = PD.perStationScorePositionMarkers[iStation];  // one per sec
  let timePerLine = new Map();  // yOnPage :: time-on-this-y
  let prevStartTime = 0;
//debugger;  // OK_TMP  
  for ( let t = 0;  t < markers.length-1;  t += 1 )  {
    [xInWinPrc1, pageOccId1, yOnPage1] = markers[t+0];
    [xInWinPrc2, pageOccId2, yOnPage2] = markers[t+1];
    if ( (yOnPage1 != yOnPage2) || (pageOccId1 != pageOccId2) )  {
      // new line starts at t+1
      let fromTopPx = convert_y_img_to_window(pageOccId1, yOnPage1);
      timePerLine.set( fromTopPx, (t + 1 - prevStartTime) );
      prevStartTime = t + 1;
    }
  }
  // process the last line
  [xInWinPrcN, pageOccIdN, yOnPageN] = markers[markers.length-1];
  let fromTopPx = convert_y_img_to_window(pageOccId1, yOnPageN);
  timePerLine.set( fromTopPx, markers.length - prevStartTime );
  return  timePerLine;
}


/////// Begin: global error/exception handlers /////////////////////////////////
function _scroller_global_error_handler(errorEvent)
{
  let msg =
`Error in Scroller (exception) occurred in ${errorEvent.filename}:(line=${errorEvent.lineno},col=${errorEvent.colno}):

${errorEvent.message}`;

  /* Unregister all custom event handlers to prevent further acting
   * (done before modal_alert() to avoid re-register the handlers) */
  ["click", "contextmenu", "dblclick", "load", "keydown"].forEach(
    evType => unregister_window_event_listener( evType ));

  console.log("-E- " + msg);
//debugger;  // OK_TMP
  modal_alert("-E- " + msg + "\n\n -- The script is now aborted --\n\n" +
              "(please see console log for more details)");

  window.stop();  // though unclear whether it at all works

  return false;  //  to retain the default behavior of the error event of Window
}

function _scroller_global_rejection_handler(promiseRejectionEvent)
{
  let msg =
`Error in Scroller (rejected promise).

Reason: ${promiseRejectionEvent.reason}`;

  /* Unregister all custom event handlers to prevent further acting
   * (done before modal_alert() to avoid re-register the handlers) */
  ["click", "contextmenu", "dblclick", "load", "keydown"].forEach(
    evType => unregister_window_event_listener( evType ));

  console.log("-E- " + msg + "\n");
//debugger;  // OK_TMP
  modal_alert("-E- " + msg + "\n\n -- The script is now aborted --\n\n" +
              "(please see console log for more details)");

  window.stop();  // though unclear whether it at all works

  return false;  //  to retain the default behavior of the error event of Window
}
/////// End:   global error/exception handlers /////////////////////////////////
