// ScrollerCommonUtils.js

////////////////////////////////////////////////////////////////////////////////
function verify_all_image_occurences_rendering(imgPageOccurencesArray)
{
  let cntBad = 0;
  imgPageOccurencesArray.forEach( (occ) => {
    //{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    const imgHtmlElem   = document.getElementById(occ.occId);
    if ( imgHtmlElem === null )
      throw new Error(`Missing image/page '${describe_image_page_occurence(occ.occId)}'`);
    if ( imgHtmlElem.offsetHeight < (occ.yBottom - occ.yTop) )  {
      console.log(`-E- Invalid rendering of image/page occurence '${occ.occId}' (path=TODO)`);
      cntBad += 1;
    }
  } );
  if ( cntBad > 0 )  {
    throw new Error(`Invalid rendering of ${cntBad} image/page occurence(s) out of ${imgPageOccurencesArray.length}`);
  }
  console.log(`Success rendering all ${imgPageOccurencesArray.length} image/page occurence(s)`);
}


/* Returns scale of the image/page occurence
 * (page occurences preserve scales of the original images)
 * (but page occurence could be a cropped portion of the original image) */
function get_image_occurence_scale_y(imgPageOccurencesArray, occId,
                                     alertErr=false)
{
  const topAndBottom = read_image_occurence_y_bounds(
                                       imgPageOccurencesArray, occId, alertErr);
  if ( topAndBottom === null )  {
    //return  -1; // error already printed
    throw new Error(`Failed detecting y-scale of page '${describe_image_page_occurence(occId)}'`);
  }
  const origHeight = topAndBottom.yBottom - topAndBottom.yTop + 1;

  const imgHtmlElem   = document.getElementById(occId);  // TODO: check for error
  if ( imgHtmlElem === null )
    throw new Error(`Missing image/page '${describe_image_page_occurence(occId)}'`);
  const renderHeight  = imgHtmlElem.offsetHeight;

  return  renderHeight / origHeight;
}


// Returns scale of the original image (not possibly cropped occurence)
function get_image_scale_y(scoreStationsArray, occId, origImgPageId="")
{
  const imgHtmlElem   = document.getElementById(occId);
  const renderHeight  = imgHtmlElem.offsetHeight;
  const origHeight    = get_original_image_size(
    scoreStationsArray, (origImgPageId != "")? origImgPageId : occId, true);
  return  renderHeight / origHeight;
}


function get_original_image_size(scoreStationsArray, pageId, alertErr=false)
{
  let height = read_image_size_record(scoreStationsArray, pageId,
                                      /*alertErr=*/false);
  if ( height < 0 )  {  // record missing in the stations' array
    throw new Error(`-OK_TMP- No dimension record for ${pageId}`);
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
  const pageScaleY = get_image_occurence_scale_y(g_imgPageOccurences,
                                                 imgHtmlPageOccId);
  const yTop = read_image_occurence_yTop(g_imgPageOccurences,
                                         imgHtmlPageOccId, /*alertErr=*/true);
  if ( yTop < 0 )  {    /* TODO: raise exception */  }
  
  const winY = pageHtmlElem.offsetTop + (imgY - yTop) * pageScaleY;
  console.log(`-D- convert_y_img_to_window(${imgHtmlPageOccId}, imgY=${imgY}): pageScaleY=${pageScaleY}, yTop=${yTop}, currScrollY=${pageHtmlElem.offsetTop} => ${winY}`);
  return  Math.floor(winY);
}


// Converts vertical position from image coordinates to rendered window
function convert_y_window_to_img(imgHtmlPageOccId, winY) {
  const pageHtmlElem = document.getElementById(imgHtmlPageId);
  // page occurences preserve scales of the original images
  const pageScaleY = get_image_occurence_scale_y(g_imgPageOccurences,
                                                 imgHtmlPageOccId);
  const yTop = read_image_occurence_yTop(g_imgPageOccurences,
                                         imgHtmlPageOccId, /*alertErr=*/true);
  if ( yTop < 0 )  {    /* TODO: raise exception */  }
  
  const imgY = (winY - pageHtmlElem.offsetTop) / pageScaleY + yTop;
  return  imgY;
}


function describe_image_page_occurence(occId)
{
  if ( (typeof g_pageImgPathsMap === 'undefined') ||
       (g_pageImgPathsMap === null) )
    throw new Error("Page-to-image-path map isn't ready");
  if ( !g_pageImgPathsMap.has(occId) )  {
    throw new Error(`Unknown page/image occurence '${occId}'; probably the image failed to load`);
  }
  return  `${occId}(${g_pageImgPathsMap.get(occId)}`
}
////////////////////////////////////////////////////////////////////////////////


/*******************************************************************************
 ** BEGIN: access to scoreStationsArray / scoreLinesArray                     **
*******************************************************************************/

// Copies one score position record while modifying the duration field
function score_viewpoint(scoreLineObj, timeSec)
{
  let scoreStation = Object.assign(scoreLineObj);  // shallow copy is OK here
  scoreStation.timeSec = timeSec;
  return  scoreStation;
}


// Returns new array with only position-related lines from 'scoreStationsArray'
function filter_positions(scoreStationsArray)
{
  return  scoreStationsArray.filter((rec) =>  {
    return  !rec.tag.startsWith("Control-");
  })
}


// Returns new array with only control lines from 'scoreStationsArray'
function filter_controls(scoreStationsArray)
{
  return  scoreStationsArray.filter((rec) =>  {
    return  rec.tag.startsWith("Control-");
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
  let lineStr = ('lineOnPageIdx' in v)? ` (line: ${v.lineOnPageIdx})}` : "";
  let descr = `step${stepIdx}=>${v.pageId}::${v.y}=${convert_y_img_to_window(v.pageId, v.y)}${lineStr}`;
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


/* Returns new array with only position-related lines
 *   from 'scoreLinesAndControlArray'
 * scoreLinesAndControlArray == {tag:STR, pageId:STR, x:INT,y:INT, timeSec:FLOAT}
 * result             <= {pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT} */
function filter_and_massage_positions(scoreLinesAndControlArray)
{
  let onlyDataLines = scoreLinesAndControlArray.filter((rec) =>  {
    return  !rec.tag.startsWith("Control-");
  })

  // insert local line indices and rename .y into .yOnPage
  let onlyDataLinesWithIdx = [];
  let prevPageId = null;
  let localIdx   = -1;
  onlyDataLines.forEach( line => {
    localIdx = ((prevPageId === null) || (prevPageId !== line.pageId))? 0 :
                                                                    localIdx + 1;
    const {y, ...otherProps} = line;
    let recWithIdx = {yOnPage: y,  lineIdx: localIdx,  ...otherProps};
    onlyDataLinesWithIdx.push( recWithIdx );
    prevPageId = line.pageId;
  } );
  // (the code below appended global indices, which is wrong)
  // for ( const [i, lineRec] of onlyDataLines.entries() )  {
  //   let recWithIdx = { ...lineRec, ...{lineIdx:i} };
  //   onlyDataLinesWithIdx.push( recWithIdx );
  // }
  
  return  onlyDataLinesWithIdx;
}


function derive_position_y_window(scoreStationsArray, step)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  return  convert_y_img_to_window(
                  scorePositions[step].pageId, scorePositions[step].y);
}


/* Returns image height or -1 on error
 * Note, height is that of the original image (not possibly cropped occurence)
 * Takes the data from 'scoreStationsArray'  */
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
    }
    return  -1;
  }
  return  rec.y;
}


/* Returns image bottommost sensible Y coordinate or -1 on error
 * Takes the (control!) data from 'scoreStationsArray or scoreLinesArray'  */
function read_optional_image_bottom_record(scoreStationsOrScoreLinesArray,
                                           pageId, alertErr=false)
{
  const rec = scoreStationsOrScoreLinesArray.find((value, index, array) => {
    return  ( (value.tag == "Control-Bottom") && (value.pageId == pageId) )
  });
  if ( rec === undefined )  {
    wrn = `-W- Missing bottom record for page '${pageId}'`;
    console.log(wrn);
    if ( alertErr )  {
      console.trace();  alert(wrn);
    }
    return  -1;
  }
  return  rec.y;
}


// Throws exception if iconsistency encountered in 'scoreLinesArray'
function verify_score_lines_sanity(scoreLinesArray)
{
  //~ for ( let i = 0;  i < scorePositions.length;  i += 1 )  {
    //~ v = scorePositions[i];
    //~ descr += ((i > 0)? separatorStr : "") + one_position_toString(i, v);
  //~ }
  
  // ?TODO: check time deviations: one tact in a line is minimum?

  // scoreLinesArray==[{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}]
  const scoreDataLines = filter_positions(scoreLinesArray); // only data lines

  const _DataLineDescr = (idx) => `score line #${idx} (${scoreDataLines[idx].tag})`;
//debugger;  // OK_TMP

  // find indices of first- and last lines on each page
  let pageIdToBoundIndices = new Map(); // {pageId : [firstLineIdx, lastLineIdx]}
  for ( let i = 1;  i < scoreDataLines.length;  i += 1 )
  {
    const currLine = scoreDataLines[i-1];  // {tag, pageId, x, y, timeSec}
    const nextLine = scoreDataLines[i];    // {tag, pageId, x, y, timeSec}
    if ( !pageIdToBoundIndices.has(currLine.pageId) )  {
      pageIdToBoundIndices.set(currLine.pageId, [i-1]); // store first line index
    }
    if ( currLine.pageId !== nextLine.pageId )  { // 'currLine' is last on page
      pageIdToBoundIndices.get(currLine.pageId).push(i-1);//store last line index
      if ( pageIdToBoundIndices.has(nextLine.pageId) )  {
        throw new Error(`-E- Repeated appearance of page '${nextLine.pageId}' in ${_DataLineDescr(i)}; previously seen in score lines #${pageIdToBoundIndices.get(nextLine.pageId)}`);
      }
    }
  }
  // treat the case of singl line in the last page
  const lastIdx = scoreDataLines.length - 1;
  const lastLine = scoreDataLines[lastIdx];   // {tag, pageId, x, y, timeSec}
  if ( !pageIdToBoundIndices.has(lastLine.pageId) )  {
    pageIdToBoundIndices.set(lastLine.pageId, [lastIdx, lastIdx]);
  }

  // verify line vertical coordinates' sequence per a page
  // we can check heights of all lines except the last one on each page
  for (const [pageId, firstAndLast] of pageIdToBoundIndices.entries()) {
    let numLines = firstAndLast[1] - firstAndLast[0] + 1;
    let pageHeight = read_image_size_record(scoreLinesArray, pageId,
                                                       /*alertErr=*/true);
    let pageBottom = read_optional_image_bottom_record(scoreLinesArray, pageId,
                                                       /*alertErr=*/true);
    let maxY = (pageBottom > 0)? pageBottom : pageHeight;
    let minLineHeight = Math.round(Math.min(0.4* maxY/numLines), maxY/6); //heur
    
    for ( let i = firstAndLast[0];  i <= firstAndLast[1];  i += 1 )  {
      let currLine = scoreDataLines[i];  // {tag, pageId, x, y, timeSec}
      if ( (currLine.y < 0) || (currLine.y >= maxY) )  {
        throw new Error(`-E- ${_DataLineDescr(i)} has coordiante ${currLine.y} outside the range [0, ${maxY}]`);
      }
      let lineHeight = (i > 0)? (currLine.y - scoreDataLines[i-1].y) : 0;
      if ( (i > firstAndLast[0]) && (lineHeight < minLineHeight) )  {
        //debugger;  // OK_TMP
        throw new Error(`-E- ${_DataLineDescr(i-1)} has unreasonably small height ${(lineHeight>=0)?lineHeight:"(negative)"} (estimated minimum = ${minLineHeight}); please check vertical coordinates of ${_DataLineDescr(i-1)} and ${_DataLineDescr(i)}`);
      }
    }
  }
  console.log(`-I- Success verifying sanity of line coordinates sequence for all ${scoreDataLines.length} score line(s) of ${pageIdToBoundIndices.size} score page(s)`);
  return;
}
/** END: access to scoreStationsArray / scoreLinesArray ***********************/


/** BEGIN: access to imgPageOccurencesArray ************************************/
//imgPageOccurencesArray /*{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/

function read_image_occurence_yTop(imgPageOccurencesArray, occId, alertErr=false)
{
  const topAndBottom = read_image_occurence_y_bounds(
                                       imgPageOccurencesArray, occId, alertErr);
  if ( topAndBottom === null )  { return  -1; } // error already printed
  return  topAndBottom.yTop;
}

function read_image_occurence_yBottom(imgPageOccurencesArray, occId,
                                      alertErr=false)
{
  const topAndBottom = read_image_occurence_y_bounds(
                                       imgPageOccurencesArray, occId, alertErr);
  if ( topAndBottom === null )  { return  -1; } // error already printed
  return  topAndBottom.yBottom;
}


// Returns {yTop=<OCC>.yTop, yBottom=<OCC>.yBottom} or null on error
function read_image_occurence_y_bounds(imgPageOccurencesArray, occId,
                                       alertErr=false)
{
  const rec = imgPageOccurencesArray.find((value, index, array) => {
    return  (value.occId == occId)
  });
  if ( rec === undefined )  {
    err = `-E- Unknown image/page occurence '${occId}'`;
    console.log(err);  console.trace();
    if ( alertErr )  { alert(err); }
    return  null;
  }
  return  {yTop:rec.yTop, yBottom:rec.yBottom};
}
/** END: access to imgPageOccurencesArray **************************************/


/*******************************************************************************
 ** BEGIN: common utilities                                                   **
*******************************************************************************/

// Copied from https://stackoverflow.com/questions/2998784/how-to-output-numbers-with-leading-zeros-in-javascript
// Prepends number with zeroes
function zero_pad(num, places)
{
  return String(num).padStart(places, '0');
}


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


// If 'msg' not empty, draws the message box, otherwise removes it
function sticky_alert(msg, htmlDivElementId)
{
  let divEl = document.getElementById(htmlDivElementId);
  if ( msg == "" )  {   // remove the element
    if ( divEl === null )
      return;  // nothing to do
    el.parentNode.removeChild(divEl);
    divEl = null;
    return;
  }
  // draw or update the element
  const justCreated = (divEl === null);
  if ( justCreated )   {
    divEl = document.createElement("div");
    divEl.setAttribute("style", 
          "position:fixed;top:75%;left:85%;background-color:lightgreen;");
    divEl.id = htmlDivElementId;
  }
  divEl.innerHTML = msg;
  if ( justCreated )
    document.body.appendChild(divEl);
}


/*******************************************************************************
 * Automatically closing solid-color-shape mark.
 ******************************************************************************/
// Prints fading marker in X='fromLeftPrc'%, Y=fromTopPx
function timed_marker(color, fromLeftPrc, fromTopPx, durationSec)
{
  var el = document.createElement("div");
  el.id = "SCROLLER-POSITION-MARK";
  el.setAttribute("style", `position:absolute;top:${fromTopPx}px;left:${fromLeftPrc}%;background-color:lightgrey;color:${color};`);
  el.innerHTML = ":<br/>:<br/>:<br/>";
  setTimeout( () => {el.parentNode.removeChild(el);}, 1000*durationSec );
  document.body.appendChild(el);
}


// Example: timed_progress_bar("black", 80, 10, 200, 11) 
function timed_progress_bar(color, currTimePrc, currLineFullTime, fromTopPx,
                            durationSec)
{
  var el = document.createElement("div");
  el.id = "SCROLLER-PROGRESS-BAR";
  // TODO: use monospaced font for the progress-bar
  el.setAttribute("style", `position:absolute;top:${fromTopPx}px;left:75%;background-color:lightgrey;color:${color};font-family:monospace;fontWeight:bold`);
  el.style.fontSize = `${g_progressBar_fontSize}px`;
  const str = format_progress_bar_str(currTimePrc/100.0, currLineFullTime,
                g_minTimeInOneLineSec, g_progressBar_numCellsForMinFullTime);
  el.innerHTML = str;
  setTimeout( () => {el.parentNode.removeChild(el);}, 1000*durationSec );
  document.body.appendChild(el);
  return  str;
}


/* 
 * Shortest: 0% == (0, 6, 6, 3) ==> ">--";    50% == (0.5, 6, 6, 3) ==> ">>-"
 * Longer: 75% == (0.75, 120, 50, 5) ==> ">>>>>>>>>---"
 * .....  current == 9 {(50):5 => (0.75*120):ceil((0.75*120)*(5/50))}
 * .....  final   == 12 {(50):5 => (120):ceil((1.0*120)*(5/50))}
 */
function format_progress_bar_str(position_0to1,
                                 fullTime, minFullTime, numCellsForMinFullTime)
{
  const emptyCh = "-";   const filledCh = ">";
  if ( (position_0to1 < 0) || (position_0to1 > 1.0) ||
       (fullTime < minFullTime) )
    throw new Error(`-E- Invalid parameters for progress bar: (pos=${position_0to1}, full=${fullTime}, minFull=${minFullTime}, ...)`);
//debugger;  // OK_TMP
  // minFullTime - numCellsForMinFullTime
  // fullTime    - x
  const full = Math.ceil( 1.0* fullTime * numCellsForMinFullTime / minFullTime );
  const curr = Math.ceil( position_0to1 * full );
  const tmpDescr = ` :  (${curr}/${full})`
  return  filledCh.repeat(curr) + emptyCh.repeat(full - curr) + tmpDescr;
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



// !!! DOES NOT WORK!!!  Copied from: https://www.quora.com/How-do-you-check-if-a-file-exists-in-JavaScript 
function check_file_exists(url) { 
  var xhr = new XMLHttpRequest(); 
  xhr.open('HEAD', url, false); 
  xhr.send(); 
  return xhr.status !== 404; 
}


// From: https://stackoverflow.com/questions/11729835/how-to-disable-prevent-this-page-from-creating-additional-dialogs
function alert_without_notice(message)
{
  setTimeout( function() { alert(message); }, 1000 );
}


// function prompt_without_notice(messageStr, defaultVal)
// {
//   TODO
// }

/*******************************************************************************
 ** END: common utilities                                                   **
*******************************************************************************/
