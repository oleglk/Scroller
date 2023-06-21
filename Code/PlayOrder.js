// PlayOrder.js


//~ /*{tag:STR, pageId:STR, x:INT, y:INT, timeBeat:INT}*/
//~ class ScoreLineRecord
//~ {
  //~ constructor(tag/*STR*/, pageId/*STR*/, x/*INT*/, y/*INT*/, timeBeat/*FLOAT*/)
  //~ {
    //~ this.tag    = tag;    /*STR*/
    //~ this.pageId = pageId; /*STR*/
    //~ this.x      = x;      /*INT*/
    //~ this.y      = y;      /*INT*/
    //~ this.timeBeat;        /*FLOAT*/
  //~ }
  
  //~ toString() {
    //~ return `{tag:"${this.tag}", pageId:"${this.pageId}", x:${this.x}, y:${this.y}, timeBeat:${this.timeBeat}}`
  //~ }
//~ }


var _DBG__scoreDataLines = null;  // OK_TMP

////////////////////////////////////////////////////////////////////////////////
/*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
class ScorePageOccurence
{
  constructor(occId/*STR*/, pageId/*STR*/,
              firstLine/*INT*/, lastLine/*INT*/, yTop/*INT*/, yBottom/*INT*/)
  {
    this.occId       = occId;/*STR*/
    this.pageId      = pageId;/*STR*/
    this.firstLine   = firstLine;  /*INT*/
    this.lastLine    = lastLine;   /*INT*/
    this.yTop        = yTop;       /*INT*/
    this.yBottom     = yBottom;    /*INT*/
  }
  
  toString() {
    return `{occId:"${this.occId}", pageId:"${this.pageId}", firstLine:${this.firstLine}, lastLine:${this.lastLine}, yTop:${this.yTop}, yBottom:${this.yBottom}}`
  }
}//END_OF__class_ScorePageOccurence


class PlayOrder
{
  // note, arrays provided in constructor are referenced and not altered
  constructor(
    name,
    tempo, /*beats/minute*/
    scoreLinesArray, /*{tag:STR, pageId:STR, x:INT, y:INT, timeBeat:FLOAT}*/
    linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeBeat:FLOAT}*/
    pageImagePathsMap, /*pageId:STR => imgPath:STR*/
    numLinesInStep /*how many lines to jump btw score stations*/
  )
  {
    this.name = name;
    this.tempo = tempo;
    this.scoreLines = scoreLinesArray;
    this.linePlayOrder = linePlayOrderArray;
    this.pageImagePaths = pageImagePathsMap;
    this.numLinesInStep = numLinesInStep;
    //

    //scoreDataLines = {pageId:STR, lineIdx:INT, yOnPage:INT, timeBeat:FLOAT}
    this.scoreDataLines = null;
    this.pageLineHeights = null;  // map of {pageId :: max-line-height}
    this.pageHeights = null;      // map of {pageId :: image-height}
    this.pageLineCounts = null;   // map of {pageId :: lines-number-on-page}

    //imgPageOccurences = {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    this.imgPageOccurences = null;

    //playedLinePageOccurences = (index in 'linePlayOrder') => occId
    this.playedLinePageOccurences = null;

    //scoreStations = {tag:STR, pageId:STR=occID, [origImgPageId:STR], x:INT, y:INT, timeSec:FLOAT}
    this.scoreStations = null;

    /*perStationScorePositionMarkers = [..., [..., [xInWinPrc, occId, yOnPage], ...], ...]
     * == array of per-station arrays of per-second position-marker triples
     * (serves for play-progress indication in auto-scroll mode) */
    this.perStationScorePositionMarkers = null;
    
    this._process_inputs();
  }


  /* Postprocesses user inputs for further operation convenience.
   * Returns true on success. false on error. */
  _process_inputs()
  {
    this.scoreDataLines = filter_and_massage_positions(this.scoreLines);
    // <= /*{pageId:STR, lineIdx:INT, yOnPage:INT, timeBeat:FLOAT}*/
_DBG__scoreDataLines = this.scoreDataLines;  // OK_TMP: reveal for console

    this.pageHeights = this._find_all_pages_heights();
    if ( this.pageHeights == null )  {
      // actually exception is thrown; should not get here
      return  false;  // error already printed
    }

////this._get_page_total_height("Test-Inexistent-pageId");  // OK_TMP 

    this.pageLineCounts  = this._find_all_pages_line_counts();
    this.pageLineHeights = this._compute_all_pages_line_heights();

    this.imgPageOccurences = this.compute_image_pages_layout();
    //{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    if ( this.imgPageOccurences == null )  { return  false; }  // error printed

    this._name_image_page_occurences();

    this.playedLinePageOccurences = this._find_played_lines_page_occurences();
    
    [this.scoreStations, this.perStationScorePositionMarkers] =
      this.build_score_stations_array_for_page_occurences(this.numLinesInStep);
    if ( this.scoreStations == null )  { return  false; }  // error printed
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
      let noJump = !first && !afterLast
        &&
        (this.linePlayOrder[i].pageId == this.linePlayOrder[i-1].pageId)
        &&
        (this.linePlayOrder[i].lineIdx == (1+ this.linePlayOrder[i-1].lineIdx));
      if ( noJump )  {
        continue; // continues to the next line on the prev page
      }
      /* page-turn or jump within page is detected;
       * collect data for PREV page in 'ScorePageOccurence' */
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
  
  
  /* Builds and returns array of 2 arrays:
   *   (1)  array of score-stations
   *   (2)  per-station array of arrays of per-second position-marker triples
   *                       ( position-marker == (xInWinPrc, occId, yOnPage) )
   * Score-stations refer to play-order page occurences, not original page images
   * For each line computes time in seconds based on specified time in beats.
   * 'numLinesInStep' - how many lines to jump in one step.
   * On error returns null */
  // TODO: pass num lines on screen and verify normal and last steps
  // TODO: (example: if pre-last step view includes last line, drop last step)
  build_score_stations_array_for_page_occurences(numLinesInStep)
  {
    if ( this.imgPageOccurences == null ) {
      throw new Error("Array of image-page occurences isn't built yet");
    }
    if ( this.playedLinePageOccurences == null ) {
      throw new Error("Array of played-lines' image-page occurences isn't built yet");
    }
    
    // imgPageOccurences = {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    // scoreDataLines = {pageId:STR, lineIdx:INT, yOnPage:INT, timeBeat:FLOAT}
    // scoreLines = control lines in the format of 'scoreDataLines'
    // linePlayOrder = {pageId:STR, lineIdx:INT, timeBeat:FLOAT}
    // scoreStations = {tag:STR, pageId:STR=occID, origImgPageId:STR, [lineOnPageIdx:INT], x:INT, y:INT, timeSec:FLOAT}
    // (e.g, a record in 'scoreStations' extended with 'origImgPageId' field)

    /* this.playedLinePageOccurences  == (index in 'linePlayOrder') => occId
     * => {... firstLine: 0, lastLine: 4, ...} means we played lines 0,1,2,3,4 */

    let scoreStationsArray = [];
    ////for ( const [i, playedLine] of this.linePlayOrder.entries() )  {}
    // TODO: any precautions to ensure last line(s) are visible in the last step?
    for ( let i = 0;  i < this.linePlayOrder.length;  i += numLinesInStep )  {
      let playedLine = this.linePlayOrder[i];
      let scoreLine  = this.scoreDataLines.find(
        (element, index, array) => ((element.pageId  == playedLine.pageId) &&
                                    (element.lineIdx == playedLine.lineIdx)) );
      if ( scoreLine == undefined )  {
        err = `Missing score data line page:${playedLine.pageId}, local-index=${playedLine.lineIdx}`;
        console.log(err);  console.trace();  alert(err);
        return  null;
      }
      let stepTag = "step:" + zero_pad(scoreStationsArray.length, 2);
      
      let station = { tag:           stepTag,
                      pageId:        this.playedLinePageOccurences[i],
                      origImgPageId: playedLine.pageId,
                      lineOnPageIdx: playedLine.lineIdx,
                      x:             0,
                      y:             scoreLine.yOnPage,
                      timeSec:       playedLine.timeBeat * 60.0 / this.tempo};
      scoreStationsArray.push( station );
    }

    // copy control lines from 'scoreLines' array into 'scoreStationsArray'
    scoreStationsArray =
      scoreStationsArray.concat( filter_controls(this.scoreLines) );

    console.log(`Assembled score-stations-array with ${scoreStationsArray.length} station(s) for ${this.linePlayOrder.length} played line(s) with station-step ${numLinesInStep}`);

    let scoreStationsPositionMarkersArray = []; //will be built for default tempo
    PlayOrder.recompute_times_in_score_stations_array(
      scoreStationsArray, this.tempo, this.numLinesInStep, this.linePlayOrder,
      this.scoreDataLines, this.playedLinePageOccurences,
      scoreStationsPositionMarkersArray);
    return  [scoreStationsArray, scoreStationsPositionMarkersArray];
  }


  /* Builds and returns array of occurence-Ids
   * for correponding (by index) lines in line play order ('this.linePlayOrder')
   * Assumes existence of 'this.imgPageOccurences'. */
  _find_played_lines_page_occurences()
  {
    if ( this.imgPageOccurences === null )
      throw new Error("-E- Image-page-occurence-s array isn't built yet");
    let playedLinePageOccurences = [];  // (index in 'linePlayOrder') => occId
    /* assume page-occurences array is correct => we traverse it sequentially
     * => {... firstLine: 0, lastLine: 4, ...} means we played lines 0,1,2,3,4 */
    this.imgPageOccurences.forEach( occ => {
      for ( let j = occ.firstLine;  j <= occ.lastLine;  j += 1 )  {
        playedLinePageOccurences.push(occ.occId);
      }
    });
    if ( playedLinePageOccurences.length != this.linePlayOrder.length )  {
      err = `-E- Mismatch in number of lines between occurences (${playedLinePageOccurences.length}) and play-order (${this.linePlayOrder.length}).`
      throw new Error(err);
    }
    return  playedLinePageOccurences;
  }
  

  /* Adjusts times in 'scoreStationsArray' (in place) according to 'this.tempo'.
   * If 'perStationScorePositionMarkersArray' given, appends to it arrays of
   * per-second position-marker (xInWinPrc, occId, yOnPage) triples.
   * (Note, it made static to enable being called when tempo changes) */
  static recompute_times_in_score_stations_array(scoreStationsArray, tempo,
         numLinesInStep, linePlayOrderArray, scoreDataLinesArray,
         playedLinePageOccurencesArray, perStationScorePositionMarkersArray=null)
  {
    // linePlayOrderArray = {pageId:STR, lineIdx:INT, timeBeat:FLOAT}
    // scoreStationsArray = {tag:STR, pageId:STR=occID, origImgPageId:STR, lineOnPageIdx:INT, x:INT, y:INT, timeSec:FLOAT}
    // each score station corresponds to 'numLinesInStep' played lines
    // scoreDataLinesArray = {pageId:STR, lineIdx:INT, yOnPage:INT, timeBeat:FLOAT}

    let scoreStationsData = filter_positions(scoreStationsArray);
    // 'scoreStationsData' references original data lines in 'scoreStationsArray'
    
    let iStation = -1;
    let totalTimeSec = 0;

//debugger;  // OK_TMP
    for ( let i1 = 0;  i1 < linePlayOrderArray.length;
          i1 += numLinesInStep )   {  // 'i1' = idx of station's first line
      iStation += 1;
      let stationRec = scoreStationsData[iStation];
      let i2 = i1 + numLinesInStep;    // 'i2' = idx of station's last  line
      if ( i2 >= linePlayOrderArray.length )
        i2 = linePlayOrderArray.length - 1;
      let timeInStationBeat = 0;
      let markerXY = [];  // for marker positions within all lines in the station
      for ( let j = i1;  j < i2;  j += 1 )  { 
        const playedLine = linePlayOrderArray[j];
        const scoreline = scoreDataLinesArray.find( (element, index, array) =>
                            (element.pageId == playedLine.pageId) &&
                            (element.lineIdx == playedLine.lineIdx) );
        if ( scoreline === undefined )
          throw new Error(`-E- Missing score line record for page '${playedLine.pageId}' line ${playedLine.lineIdx}`);
        timeInStationBeat += playedLine.timeBeat;
        if ( perStationScorePositionMarkersArray !== null )  {
          for ( let t = 0;  t <= playedLine.timeBeat * 60.0 / tempo;  t += 1 )  {
            let relTime = (t * tempo / 60.0) / playedLine.timeBeat;
            /* at this time in-window Y-coordinates unavailable - store local Y,
             * then use convert_y_img_to_window() when rendering markers */
            // let winY = convert_y_img_to_window(stationRec.pageId/*==occId*/,
            //                                    scoreline.yOnPage)
            markerXY.push( [Math.min(relTime*100, 100),
                            playedLinePageOccurencesArray[j]/*==occId-for-line*/,
                            scoreline.yOnPage] );
          }
        }
      }
      if ( perStationScorePositionMarkersArray !== null )
        perStationScorePositionMarkersArray.push(markerXY);//all lines in station
      const timeInStationSec = timeInStationBeat * 60.0 / tempo;
      stationRec.timeSec = timeInStationSec;
      console.log(`-D- Lines #${i1}...#${i2-1} scoreStationsData[${iStation}].timeSec = ${stationRec.timeSec} (=${timeInStationSec} for ${timeInStationBeat} beat(s))`);
      totalTimeSec += timeInStationSec;
    }
    console.log(`-I- Done computing score station duration(s) in ${scoreStationsData.length} station(s) for tempo of ${tempo} beats/sec. Total playing time is ${totalTimeSec} second(s)`);
    return;
  }


  // static _compute_progress_marker_xy_in_score_station(elapsedTimeInStationSec,
  //                        scoreStationsArray, numLinesInStep, linePlayOrderArray)
  // {
  //   // linePlayOrderArray = {pageId:STR, lineIdx:INT, timeBeat:FLOAT}
  //   // scoreStationsArray = {tag:STR, pageId:STR=occID, origImgPageId:STR, lineOnPageIdx:INT, x:INT, y:INT, timeSec:FLOAT}
  //   // each score station corresponds to 'numLinesInStep' played lines

  //   let scoreStationsData = filter_positions(scoreStationsArray);
  //   // 'scoreStationsData' references original data lines in 'scoreStationsArray'
    
  // }
  
  
  // Returns 'ScorePageOccurence' or null on error
  _collect_page_occurence_ending_at(idxInLinePlayOrder)
  {
    if ( (idxInLinePlayOrder < 0) ||
         (idxInLinePlayOrder >= this.linePlayOrder.length) )  {
      const err = `-E- Invalid play-order index ${idxInLinePlayOrder}; should be 0...${this.linePlayOrder.length}`
      console.log(err);  console.trace();   alert(err);
      return  null;
    }
    const {pageId: page,  lineIdx: lastLineIdx} =
                                         this.linePlayOrder[idxInLinePlayOrder];

    /* scan backward to find the first line played this time
     *   (a) from this page AND (b) in order */
    let firstIdxPlayedOnPage = 0;  // actually on page-occurence
    // (the scan below occurs only if idxInLinePlayOrder > 0)
    for ( let i = idxInLinePlayOrder-1;  i >= 0;  i -= 1 )  {
      let lineOnPageIdx_1 = this.linePlayOrder[i  ].lineIdx;
      let lineOnPageIdx_2 = this.linePlayOrder[i+1].lineIdx - 1;
      if ( (this.linePlayOrder[i].pageId != page) ||
           (lineOnPageIdx_1 != lineOnPageIdx_2) ) {
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
      console.log(err);  console.trace();  alert(err);
//debugger;  // OK_TMP
      return  null;
    }
    
    const linesOnPageCount = this._get_page_line_count(page);
    const lastLineIsBottom = ( lastLineLocalIdx == (linesOnPageCount - 1) );

    // compute this page vertical crop parameters
    const lineHeight    = this._get_page_line_height(page);
    const pageImgHeight = this._get_page_total_height(page); // not! cropped
    let   givenPageImgBottom = read_optional_image_bottom_record(
                                     this.scoreLines/*scoreStations not ready*/,
                                     page, /*alertErr=*/false);
    let   derivedPageImgBottom = Math.min((lastLineRec.yOnPage + lineHeight),
                                          pageImgHeight);
    const yTop       = firstLineRec.yOnPage;         // uppermost on current page
    const yBottom    =                               // lowermost on current page
          ((givenPageImgBottom > 0) && (lastLineIsBottom))?
                         // take explicitly provided bottom if given and relevant
                         givenPageImgBottom : derivedPageImgBottom;

    const occ = new ScorePageOccurence(
      //{occId:STR, pageId:STR, firstLine:INT,lastLine:INT, yTop:INT,yBottom:INT}
      "UNDEF",
      page /*preliminary value to be transformed into occurence-id when known*/,
      firstLineLocalIdx,
      lastLineLocalIdx,
      yTop,
      yBottom
    );
    console.log(`-I- Detected image/page occurence: ${occ}`);
    return  occ;
  }


  // // 'pageIdToDimensionsMap' = Map('pageID' : { width:INT, height:INT }
  // _fill_image_size_records_in_score_stations_array(pageIdToDimensionsMap)
  // {
  //   if ( pageIdToDimensionsMap === null )  {
  //     err = "-E- Image-page dimensions map isn't ready yet"
  //     console.log(err);  console.trace(err);  alert(err);
  //     return  failse;
  //   }
  //   // TODO
  // }


  // Returns number of lines on page 'pageId'; throws exception on error
  _get_page_line_count(pageId)
  {
    if ( !this.pageLineCounts.has(pageId) )  {
      const err = `-E- Missing lines count for page/image ${pageId} (image-path "TODO")`;
      throw new Error(err);
      //console.log(err);  console.trace();  alert(err);      return  -1;
    }
    return  this.pageLineCounts.get(pageId);
  }


  /* Builds and returns map of per-image/page number of lines on the page
   * based on 'this.scoreDataLines' */
  _find_all_pages_line_counts()
  {
    let pageIdToLineCount = new Map();
    this.scoreDataLines.forEach( scoreLine => {
      // scoreLine == {tag, pageId, x, y, timeBeat}
      if ( !pageIdToLineCount.has(scoreLine.pageId) )
        pageIdToLineCount.set( scoreLine.pageId, 1 );
      else
        pageIdToLineCount.set( scoreLine.pageId,
                               1 + pageIdToLineCount.get(scoreLine.pageId) );
    });
    return  pageIdToLineCount;
  }
  

  /* Builds and returns map of per-image/page line heights
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
      const currLine = scoreLinesSorted[i-1];  // {tag, pageId, x, y, timeBeat}
      const nextLine = scoreLinesSorted[i];    // {tag, pageId, x, y, timeBeat}
      if ( currLine.pageId !== nextLine.pageId )  { // 'currLine' is last on page
        // image(s)/page(s) with single score line need special treatment
        if ( !pageIdToLineCount.has(currLine.pageId) )  {
          // (e.g. next line is on other page AND no prior lines on this page)
          const pageImgHeight = this._get_page_total_height(currLine.pageId);  // not! cropped
          pageIdToLineCount.set( currLine.pageId, 1 );
          pageIdToLineHeightSum.set( currLine.pageId, pageImgHeight ); // unoptimal!
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
    // note, 2% added to line height to warrant finger labels inclusion
    pageIdToLineHeightSum.forEach( (totalHeight, pageId) => {
      pageIdToLineHeight.set(pageId,
                             1.02* totalHeight / pageIdToLineCount.get(pageId));
    } )
    
    return  pageIdToLineHeight;
  }


  /* Returns estimated pixel-height of one line on page 'pageId';
   * throws exception on error */
  _get_page_line_height(pageId)
  {
    if ( !this.pageLineHeights.has(pageId) )  {
      const err = `-E- Missing line height for page/image ${pageId} (image-path "TODO")`;
      throw new Error(err);
      //console.log(err);  console.trace();  alert(err);      return  -1;
    }
    return  this.pageLineHeights.get(pageId);
  }

  

  /* Builds and returns array of per-image/page total heights
   * based on 'this.scoreDataLines'; throws exception on error */
  _find_all_pages_heights()
  {
    let pageIdToHeight = new Map();
    this.scoreDataLines.forEach( scoreLine => { // {tag, pageId, x, y, timeBeat}
      if ( !pageIdToHeight.has(scoreLine.pageId) )  {
        // TODO: this could need cropped occurence
        const h = read_image_size_record(this.scoreLines, scoreLine.pageId,
                                         true/*alertErr*/);
        if ( h < 0 )  {
          throw new Error("-E- Failed detcting all page heights");
          //return  null;  // error already printed
        }
        pageIdToHeight.set(scoreLine.pageId, h);
      }
    } );
    return  pageIdToHeight;
  }
  
  
  /* Returns pixel-height of page 'pageId' (original image);
   * throws exception on error. */
  _get_page_total_height(pageId)
  {
    if ( !this.pageHeights.has(pageId) )  {
      const err = `-E- Missing height for page/image ${pageId} (image-path "TODO")`;
      throw new Error(err);
      //console.log(err);  console.trace();  alert(err);      return  -1;
    }
    return  this.pageHeights.get(pageId);
  }


  // Sets occurence "occId" fields to <pageId><num-of-this-page-current-ocuurence>
  _name_image_page_occurences()
  {
    //imgPageOccurences = {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    let pageIdToCount = new Map();
    for ( const [i, occ] of this.imgPageOccurences.entries() )  {
      if ( !pageIdToCount.has(occ.pageId) )  {
        pageIdToCount.set(occ.pageId, 1);
      } else {
        pageIdToCount.set(occ.pageId, (pageIdToCount.get(occ.pageId) + 1));
      }
      let pageOccCntSoFar = pageIdToCount.get(occ.pageId);
      occ.occId = occ.pageId + ":" + zero_pad(pageIdToCount.get(occ.pageId), 2);
    }
  }
  
}//END_OF__class_PlayOrder





//TODO: HOW_TO_EXPORT-INTO-HTML?  Export { ScorePageOccurence, PlayOrder };
