// PlayOrder.js


//~ /*{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}*/
//~ class ScoreLineRecord
//~ {
  //~ constructor(tag/*STR*/, pageId/*STR*/, x/*INT*/, y/*INT*/, timeSec/*FLOAT*/)
  //~ {
    //~ this.tag    = tag;    /*STR*/
    //~ this.pageId = pageId; /*STR*/
    //~ this.x      = x;      /*INT*/
    //~ this.y      = y;      /*INT*/
    //~ this.timeSec;        /*FLOAT*/
  //~ }
  
  //~ toString() {
    //~ return `{tag:"${this.tag}", pageId:"${this.pageId}", x:${this.x}, y:${this.y}, timeSec:${this.timeSec}}`
  //~ }
//~ }


var _DBG__scoreDataLines = null;  // OK_TMP


/*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
class ScorePageOccurence
{
  constructor(pageId/*STR*/,
              firstLine/*INT*/, lastLine/*INT*/, yTop/*INT*/, yBottom/*INT*/)
  {
    this.pageId = pageId;/*STR*/
    this.firstLine   = firstLine;  /*INT*/
    this.lastLine    = lastLine;   /*INT*/
    this.yTop        = yTop;       /*INT*/
    this.yBottom     = yBottom;    /*INT*/
  }
  
  toString() {
    return `{pageId:"${this.pageId}", firstLine:${this.firstLine}, lastLine:${this.lastLine}, yTop:${this.yTop}, yBottom:${this.yBottom}}`
  }
}//END_OF__class_ScorePageOccurence


class PlayOrder
{
  // note, arrays provided in constructor are referenced and not altered
  constructor(
    name,
    scoreLinesArray, /*{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}*/
    linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeSec:FLOAT}*/
    pageImagePathsMap /*pageId:STR => imgPath:STR*/
  )
  {
    this.name = name;
    this.scoreLines = scoreLinesArray;
    this.linePlayOrder = linePlayOrderArray;
    this.pageImagePaths = pageImagePathsMap;
    //

    //scoreDataLines = {pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT}
    this.scoreDataLines = null;
    this.pageLineHeights = null;  // map of {pageId :: max-line-height}
    //imgPageOccurences = {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    this.pageHeights = null;  // map of {pageId :: image-height}
    this.imgPageOccurences = null;
    
    this._process_inputs();
  }


  /* Postprocesses user inputs for further operation convenience.
   * Returns true on success. false on error. */
  _process_inputs()
  {
    
    this.scoreDataLines = filter_and_massage_positions(this.scoreLines);
    // <= /*{pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT}*/
_DBG__scoreDataLines = this.scoreDataLines;  // OK_TMP: reveal for console

    this.pageHeights = this._find_all_pages_heights();
    if ( this.pageHeights == null )  {
      // TODO: abort
      return  false;  // error already printed
    }
    
    this.pageLineHeights = this._compute_all_pages_line_heights();

    this.imgPageOccurences = this.compute_image_pages_layout();
    //{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}

    return  true;
  }
  
  
  /* Computes and returns array of page play order -
   * - array of crop parameters for score-image occurences:
   *    {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}  */
  compute_image_pages_layout()
  {
    let imgOccurences = [];
    let currPage = null;
    for (let i = 0; i <= this.linePlayOrder.length; i += 1)  {
      let first     = (i == 0);
      let afterLast = (i == this.linePlayOrder.length);
      //const currLine = (!afterLast)? this.scoreDataLines[i] : {"", -1, -1}
      // look for changes in file/page references
      if ( first )  { continue; } // nothing to do yet
      if ( !first && !afterLast &&
        (this.linePlayOrder[i].pageId == this.linePlayOrder[i-1].pageId) )  {
        continue; // prev page continues
      }
      // page-turn detected; collect data for PREV page in 'ScorePageOccurence'
      let onePageOccurence = this._collect_page_occurence_ending_at(i-1);
      if ( onePageOccurence === null )  {
        return  null;   // error already printed
      }
      // 'onePageOccurence' == {pageId, firstLine, lastLine, yTop, yBottom}
      imgOccurences.push( onePageOccurence );

      // new page starts being referenced at #i, unless it's the end (afterLast)
    }
    if ( imgOccurences.length > 0 )  {
      console.log(`-I- Found ${imgOccurences.length} image/page occurence(s)`);
      return  imgOccurences;
    } else {
      console.log(`-E- Found no image/page occurence(s)`);
      return  null;
    }
  }
  
  
  // Returns 'ScorePageOccurence' or null on error
  _collect_page_occurence_ending_at(idxInLinePlayOrder)
  {
    if ( (idxInLinePlayOrder < 0) ||
         (idxInLinePlayOrder >= this.linePlayOrder.length) )  {
      const err = `-E- Invalid play-order index ${idxInLinePlayOrder}; should be 0...${this.linePlayOrder.length}`
      console.log(err);   alert(err);
      return  null;
    }
    const {pageId: page,  lineIdx: lastLineIdx} =
                                         this.linePlayOrder[idxInLinePlayOrder];

    // scan backward to find the first line played from this page this time
    let firstIdxPlayedOnPage = 0;
    // (the scan below occurs only if idxInLinePlayOrder > 0)
    for ( let i = idxInLinePlayOrder-1;  i >= 0;  i -= 1 )  {
      if ( this.linePlayOrder[i].pageId != page ) {
        firstIdxPlayedOnPage = i + 1;
        break;
      }
    }
    const firstLineLocalIdx = this.linePlayOrder[firstIdxPlayedOnPage].lineIdx;
    const lastLineLocalIdx  = this.linePlayOrder[idxInLinePlayOrder].lineIdx;
    const firstLineRec = this.scoreDataLines.find( (element, index, array) =>
      (element.pageId == page) && (element.lineIdx == firstLineLocalIdx) );
    const lastLineRec  = this.scoreDataLines.find( (element, index, array) =>
      (element.pageId == page) && (element.lineIdx == lastLineLocalIdx) );
    if ( (firstLineRec === undefined) || (lastLineRec === undefined) )  {
      const err = `-E- Failed finding first (${firstLineLocalIdx} => ${firstLineRec}) and/or last (${lastLineLocalIdx} => ${lastLineRec}) line on page ${page} (path="TODO")`;
      console.log(err);  alert(err);
//debugger;  // OK_TMP
      return  null;
    }

    // compute this page vertical crop parameters
    const lineHeight = this._get_page_line_height(page);
    const imgHeight  = this._get_page_total_height(page);
    const yTop       = firstLineRec.yOnPage;         // uppermost on current page
    const yBottom    = Math.min((lastLineRec.yOnPage + lineHeight),
                                imgHeight);          // lowermost on current page

    const occ = new ScorePageOccurence(
      /*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
      page /*preliminary value to be transformed into occurence-id when known*/,
      firstLineLocalIdx,
      lastLineLocalIdx,
      yTop,
      yBottom
    );
    console.log(`-I- Detected image/page occurence: ${occ}`);
    return  occ;
  }


  /* Builds and returns array of per-image/page line heights
   * based on 'this.scoreDataLines' */
  _compute_all_pages_line_heights()
  {
    // sort (copy of)  score lines array by pageId__lineIdx
    let scoreLinesSorted = [...this.scoreDataLines].sort( (a, b) => {
      const pageCmp = a.pageId.localeCompare(b.pageId);
      if ( pageCmp != 0 )  { return pageCmp; }
      return  (a.lineIdx - b.lineIdx);
    } )
//debugger;  // OK_TMP
    // compute average line height per a page
    let pageIdToLineHeightSum = new Map();
    let pageIdToLineCount  = new Map();
    // we can derive heights of all lines except the last one on each page
    for ( let i = 1;  i < scoreLinesSorted.length;  i += 1 )
    {
      const currLine = scoreLinesSorted[i-1];  // {tag, pageId, x, y, timeSec}
      const nextLine = scoreLinesSorted[i];    // {tag, pageId, x, y, timeSec}
      if ( currLine.pageId !== nextLine.pageId )  {   // last on page
        // image(s)/page(s) with single score line need special treatment
        if ( !pageIdToLineCount.has(currLine.pageId) )  {
          const imgHeight = this._get_page_total_height(currLine.pageId);
          pageIdToLineCount.set( currLine.pageId, 1 );
          pageIdToLineHeightSum.set( currLine.pageId, imgHeight ); // unoptimal!
          // TODO: provide per-image last line bottom instead of total height
        }
        continue;
      }
      if ( !pageIdToLineCount.has(currLine.pageId) )  {
        pageIdToLineCount.set( currLine.pageId, 0 );
        pageIdToLineHeightSum.set( currLine.pageId, 0 );
      }
      pageIdToLineCount.set( currLine.pageId,
                             pageIdToLineCount.get(currLine.pageId) + 1 );
      pageIdToLineHeightSum.set( currLine.pageId,
                                 (pageIdToLineHeightSum.get(currLine.pageId) +
                                  (nextLine.yOnPage - currLine.yOnPage)) );
    }
    let pageIdToLineHeight = new Map();
    // note, 10% added to line height to warrant finger labels inclusion
    pageIdToLineHeightSum.forEach( (totalHeight, pageId) => {
      pageIdToLineHeight.set( pageId,
                              1.2* totalHeight / pageIdToLineCount.get(pageId) );
    } )
    
    return  pageIdToLineHeight;
  }


  // Returns estimated pixel-height of one line on page 'pageId' or -1 on error
  _get_page_line_height(pageId)
  {
    if ( !this.pageLineHeights.has(pageId) )  {
      const err = `-E- Missing line height for page/image ${pageId} (image-path "TODO")`;
      console.log(err);  alert(err);
      return  -1;
    }
    return  this.pageLineHeights.get(pageId);
  }

  

  /* Builds and returns array of per-image/page total heights
   * based on 'this.scoreDataLines' */
  _find_all_pages_heights()
  {
    let pageIdToHeight = new Map();
    this.scoreDataLines.forEach( scoreLine => {  // {tag, pageId, x, y, timeSec}
      if ( !pageIdToHeight.has(scoreLine.pageId) )  {
        const h = read_image_size_record(this.scoreLines, scoreLine.pageId,
                                         true/*alertErr*/);
        if ( h < 0 )  {
          return  null;  // error already printed
        }
        pageIdToHeight.set(scoreLine.pageId, h);
      }
    } );
    return  pageIdToHeight;
  }
  
  
  // Returns pixel-height of page 'pageId' or -1 on error
  _get_page_total_height(pageId)
  {
    if ( !this.pageHeights.has(pageId) )  {
      const err = `-E- Missing height for page/image ${pageId} (image-path "TODO")`;
      console.log(err);  alert(err);
      return  -1;
    }
    return  this.pageHeights.get(pageId);
  }

  
}//END_OF__class_PlayOrder




/*******************************************************************************
 ** BEGIN: access to scoreStationsArray  (TMP: COPY-PASTED)                   **
*******************************************************************************/

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



function derive_position_y_window(scoreStationsArray, step)
{
  const scorePositions = filter_positions(scoreStationsArray); // only data lines
  return  convert_y_img_to_window(
                  scorePositions[step].pageId, scorePositions[step].y);
}


// Returns image height or -1 on error
function read_image_size_record(scoreStationsArray, pageId, alertErr=false)
{
  const rec = scoreStationsArray.find((value, index, array) => {
    return  ( (value.tag == "Control-Height") && (value.pageId == pageId) )
  });
  if ( rec === undefined )  {
    const err = `-E- Missing size record for page '${pageId}'`;
    console.log(err);
    if ( alertErr )  {
      alert(err);
      return  -1;
    }
  }
  return  rec.y;
}
/** END: access to scoreStationsArray *****************************************/

//TODO: HOW_TO_EXPORT-INTO-HTML?  Export { ScorePageOccurence, PlayOrder };
