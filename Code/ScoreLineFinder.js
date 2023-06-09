// ScoreLineFinder.js - detects score-line-bound markup in score images
// !!! Uses code from ScoreImgLayout.js !!!
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
class ScoreLineFinder
{
  constructor (
    pageImagePathsMap,  /*pageId:STR => imgPath:STR*/
    markRGB          /*[r,g,b] of the color used for line-bounds marks*/
  )
  {
    if ( (pageImagePathsMap === null) || (pageImagePathsMap.length == 0) )  {
      // should not reach here
      throw new Error(`-E- Invalid or empty page-image path map`);
    }
    this.pageImagePathsMap = pageImagePathsMap;
    if ( (markRGB.length != 3)                  ||
         (markRGB[0] < 0) || (markRGB[0] > 255) ||
         (markRGB[1] < 0) || (markRGB[0] > 255) ||
         (markRGB[2] < 0) || (markRGB[0] > 255)  )  {
      // should not reach here
      throw new Error(`-E- Invalid line-mark color [r,g,b] = [markRGB[0],markRGB[1],markRGB[2]]`);
    }
    this.markRGB = Object.assign({}, markRGB);

    this.scoreLines = null;/*for {tag:STR, pageId:STR, x=0, y:INT, timeSec=777}*/

  }


  scan_all_pages()
  {
    let cntGood = 0;
    for (const img of this.pageImagePathsMap.entries()) {
      if ( true == scan_one_page(img[0], img[1]) )
        cntGood += 1;
    }
    if ( cntGood == this.pageImagePathsMap.length )  {
      msg = `-I- Success searching for score-lines in all ${cntGood} score-page image(s)`;
      console.log(msg);  alert(msg);
      // TODO: request file-to-sabe name and store the results
    }
  }


  /* Seaches the image for score-line marks.
   * Appends data- and metadata for the image to 'this.scoreLines'.
   * Returns true on success false on error */
  scan_one_page(htmlPageId, imgUrl)
  {
    const imgCanvas = document.getElementById(htmlPageId);
    if ( imgCanvas === null )
      throw new Error(`-E- Missing in HTML image-page "${htmlPageId}" (url="${imgUrl}")`);

    // TODO: read pixels from the image canvas
  }

  
  toString()
  {
    if ( this.scoreLines === null )
      throw new Error(`-E- ScoreLineFinder.toString() called before the data is ready`);
    return  this.scoreLines.join("\n");
  }
}//END_OF__class_ScoreLineFinder
////////////////////////////////////////////////////////////////////////////////

