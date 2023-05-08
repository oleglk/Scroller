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
    scoreLinesArray, /*{pageId:STR, lineIdx:INT, yOnPage:INT, timeSec:FLOAT}*/
    linePlayOrderArray, /*{pageId:STR, lineIdx:INT, timeSec:FLOAT}*/
    imagePathsArray /*STR*/
  )
  {
    this.name = name;
    this.scoreLines = scoreLinesArray;
    this.linePlayOrder = linePlayOrderArray;
    this.imagePaths = imagePathsArray;
    //

    this.scoreDataLines = filter_positions(scoreLinesArray);
    this.pageLineHeights = null;  // array of max-line-height per page
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
      // page-turn detected; collect data for PREV page
      let onePageOccurence = collect_page_occurence_ending_at(i-1);
      if ( onePageOccurence === null )  {
        return  null;   // error already printed
      }
      //TODO
      currPage = page;
    }
  }
  
  
  // Returns {pageFirstLine, pageLastLine}
  collect_page_occurence_ending_at(idxInLinePlayOrder)
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
          firstIdxPlayedOnPage = i;
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
      
    const lineHeight = TODO__get_page_line_height(pageId);
    const yBottom = lastLine.yOnPage + lineHeight;
    
    return  new ScorePageOccurence(
        /*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
        pageId,
        firstLineLocalIdx,
        lastLineLocalIdx,
        firstLine.yTop = yOnPage,
        yBottom,
        );
  }
  
  TODO__compute_all_pages_line_heights(pageId)  {}
  TODO__get_page_line_height(pageId)  {}

}




/*******************************************************************************
 ** BEGIN: access to scoreStationsArray  (TMP: COPY-PASTED)                   **
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
