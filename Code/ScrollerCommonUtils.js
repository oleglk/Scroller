// ScrollerCommonUtils.js

////////////////////////////////////////////////////////////////////////////////
/* Returns scale of the image/page occurence
 * (page occurences preserve scales of the original images)
 * (but page occurence could be a cropped portion of the original image) */
function get_image_occurence_scale_y(imgPageOccurencesArray, occId,
                                     alertErr=false)
{
  const topAndBottom = read_image_occurence_y_bounds(
                                       imgPageOccurencesArray, occId, alertErr);
  if ( topAndBottom === null )  { return  -1; } // error already printed
  const origHeight = topAndBottom.yBottom - topAndBottom.yTop + 1;

  const imgHtmlElem   = document.getElementById(occId);  // TODO: check for error
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
    }
    return  -1;
  }
  return  rec.y;
}

/** END: access to scoreStationsArray *****************************************/


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
/*******************************************************************************
 ** END: common utilities                                                   **
*******************************************************************************/
