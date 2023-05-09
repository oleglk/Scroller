// PlayOrder.js


//~ /*{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}*/
//~ export class ScoreLineRecord
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


/*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
export class ScorePageOccurence
{
  constructor(pageId/*STR*/,
    firstLine/*INT*/, lastLine/*INT*/, yTop/*INT*/), yBottom/*INT*/)
  {
    this.pageId     = pageId;     /*STR*/
    this.firstLine  = firstLine;  /*INT*/
    this.lastLine   = lastLine;   /*INT*/
    this.yTop       = yTop;       /*INT*/
    this.yBottom    = yBottom;    /*INT*/
  }
  
  toString() {
    return `{pageId:"${this.pageId}", firstLine:${this.firstLine}, lastLine:${this.lastLine}, yTop:${this.yTop}, yBottom:${this.yBottom}}`
  }
}


export class PlayOrder
{
  // note, arrays provided in constructor are referenced and not altered
  constructor(
    name,
    scoreLinesArray, /*{tag:STR, pageId:STR, x:INT, y:INT, timeSec:FLOAT}*/
    linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeSec:FLOAT}*/
    imagePathsArray /*STR*/
  )
  {
    this.name = name;
    this.scoreLines = scoreLinesArray;
    this.linePlayOrder = linePlayOrderArray;
    this.imagePaths = imagePathsArray;
    //

    //scoreDataLines = {pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT}
    this.scoreDataLines = null;
    this.pageLineHeights = null;  // map of {pageId :: max-line-height}
    //imgPageOccurences = {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
    this.imgPageOccurences = null;
    
    _process_inputs();
  }

  
  _process_inputs()
  {
    
    this.scoreDataLines = filter_and_massage_positions(scoreLinesArray);
    // <= /*{pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT}*/
    
    this.pageLineHeights = TODO__compute_all_pages_line_heights();

    this.imgPageOccurences = compute_image_layout();
    //{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}
  }
  
  
  /* Computes and returns array of page play order -
   * - array of crop parameters for score-image occurences:
   *    {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}  */
  compute_image_layout()
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
      let onePageOccurence = _collect_page_occurence_ending_at(i-1);
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
      err = `-E- Invalid play-oreder index ${idxInLinePlayOrder}; should be 0...${this.linePlayOrder.length}`
      console.log(err);   alert(err);
      return  null;
    }
    {page:pageId, lastLineIdx:lineIdx} = this.linePlayOrder[idxInLinePlayOrder];

    // scan backward to find the first line played from this page this time
    let firstIdxPlayedOnPage = 0;
    if ( idxInLinePlayOrder > 0 )   {
      for ( let i = idxInLinePlayOrder-1;  i >= 0;  i -= 1 )  {
        if ( this.linePlayOrder[i].pageId != page ) {
          firstIdxPlayedOnPage = i + 1;
          break;
        }
      }
    }
    const firstLineLocalIdx = this.linePlayOrder[firstIdxPlayedOnPage].lineIdx;
    const lastLineLocalIdx  = this.linePlayOrder[idxInLinePlayOrder].lineIdx;
    const firstLine = this.scoreLines.find( (element, index, array) => {
      (element.pageId == pageId) && (element.lineIdx == firstLineLocalIdx)} );
    const lastLine  = this.scoreLines.find( (element, index, array) => {
      (element.pageId == pageId) && (element.lineIdx == lastLineLocalIdx)} );
    // TODO: check for errors

    // compute this page vertical crop parameters
    const lineHeight = TODO__get_page_line_height(pageId);
    const yTop = firstLine.yOnPage;
    const yBottom = lastLine.yOnPage + lineHeight;

    const occ = new ScorePageOccurence(
        /*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
        pageId,
        firstLineLocalIdx,
        lastLineLocalIdx,
        yTop,
        yBottom,
    );
    console.log(`-I- Detected image/page occurence: ${occ}`);
    return  occ;
  }
  
  TODO__compute_all_pages_line_heights()  {}
  TODO__get_page_line_height(pageId)  {}

}




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
  TODO__insert_local_line_indices(onlyDataLines);
  return  onlyDataLines;
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
    err = `-E- Missing size record for page '${pageId}'`;
    console.log(err);
    if ( alertErr )  {
      alert(err);
      return  -1;
    }
  }
  return  rec.y;
}
/** END: access to scoreStationsArray *****************************************/
