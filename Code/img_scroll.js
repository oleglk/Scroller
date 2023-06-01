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


const g_numLinesInStep = 2; // HARDCODED(!) number of lines to scroll in one step


//////// Begin: prepare global data for the scroller and start it ///////////////

// (the global collections to be filled must be declared on the top level)
var g_scoreStations = null; // [{tag:STR, pageId:STR=occID, [origImgPageId:STR], x:INT, y:INT, timeSec:FLOAT}]
var g_imgPageOccurences = null; // [{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}]
arrange_score_global_data(g_scoreName, g_pageImgPathsMap,
                          g_scoreLines, g_linePlayOrder, g_numLinesInStep);

//(meaningless - will not wait for:)  modal_alert("OK_TMP: Test modal_alert()");

//(does not work) import Dialog from './ModalDialog.js';

let g_helpAndTempoDialog = null;

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

var g_nextTimerIntervalId = 0;


//////////////////// Assume existence of the following global variables: ////////
// g_imgPageOccurences : array of {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
// g_scoreStations : array of {tag:STR, pageId:STR=occID, [origImgPageId:STR], x:INT, y:INT, timeSec:FLOAT}
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

function build_help_string(showHeader, modeManual=g_stepManual)
{
  let ret = "";
  if ( showHeader ) {
    ret +=  `
========================================   
== Musical Score Scroller
== by Oleg Kosyakovsky - Haifa, Israel - 2023
========================================   


=> Left-mouse-button-Double-Click \t= Restart\n`
  }
  ret += `
Step Mode: ${(modeManual)? "MANUAL" : "AUTO"};
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


/* Builds browser page with score images' occurences in the play order.
 * Collects score data in the expected global collections */ 
function arrange_score_global_data(scoreName, pageImgPathsMap,
                                   scoreLinesArray, linePlayOrderArray,
                                   numLinesInStep)
{
  // Create the play-order layout (occurs AFTER the HTML body)
  // arguments:
  //     name,
  //     scoreLinesArray, /*{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}*/
  //     linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeSec:FLOAT}*/
  //     imagePathsMap, /*{pageId(STR) : path(STR)*/
  //     numLinesInStep  /*INT*/ 
  let plo = new PlayOrder(scoreName,
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
  iml.render_images();

  // ... the copy will be 2-level deep - fine for the task
  g_scoreStations = plo.scoreStations.map(a => {return {...a}});

  // ... the copy will be 2-level deep - fine for the task
  g_imgPageOccurences = plo.imgPageOccurences.map(a => {return {...a}});
}


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

  //  try {
    const posDescrStr = positions_toString(g_scoreStations, "\n");
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

  // scroll to the first ocuurence of any page
  const firstPageOccId = filter_positions(g_scoreStations)[0].pageId;
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
async function show_and_process_help_and_tempo_dialog()
{
  let defaultTempo = (g_stepManual)? 0 : g_tempo;
  let helpStr = build_help_string(1, 1) + "\n" + build_help_string(0, 0) +
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
  if ( g_permitManualScroll && (currWinY != g_lastJumpedToWinY) )   {
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

  // build the confirm-resart-dialog
  confirmRestartDialog = new Dialog(
    {
      eventsToBlockWhileOpen: ['click', 'contextmenu', 'dblclick'],
      supportCancel:          true,
      accept:                 "OK",
      cancel:                 "Cancel",
    } );
  const restartStr = "Press <OK> to restart from the top, <Cancel> to continue...";

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
  // 'res' is 'false' upon cancel or 'true' upon accept
  if ( res == true )  {
    console.log("Restart-from-top is confirmed");
    wrap__scroll__onload(event/*TODO: maybe extract onload worker function*/);
  } else {
    console.log("Restart-from-top is canceled; continuing");
    timed_alert("... continuing ...", 3/*sec*/);
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
throw new Error("OK_TMP: test UI event handlers and auto-scroll");
  if ( !g_stepManual && !g_scrollIsOn )  { return }
  if ( (stepNum < 0) || (stepNum >= filter_positions(g_scoreStations).length) )  {
    console.log(`-I- At step number ${stepNum}; stop scrolling`);
    scroll_abort();
    return  0;
  }
  //  {tag:"line-001-Begin", pageId: "pg01:01, origImgPageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec"}
  // note, in 'g_scoreStations' pageId is occurence-id
  const rec = filter_positions(g_scoreStations)[stepNum];
  const targetPos = convert_y_img_to_window(rec.pageId, rec.y);

  console.log(`-I- Scroll to ${rec.pageId}:${targetPos} for step ${stepNum}`);
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


/////// Begin: global error/exception handlers /////////////////////////////////
function _scroller_global_error_handler(errorEvent)
{
  let msg =
`Error in Scroller (exception) occurred in ${errorEvent.filename}:(line=${errorEvent.lineno},col=${errorEvent.colno}):

${errorEvent.message}`;

  // Unregister all custom event handlers to prevent further acting
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

  // Unregister all custom event handlers to prevent further acting
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
