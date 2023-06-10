// ScoreLineFinder.js - detects score-line-bound markup in score images
// !!! Uses code from ScoreImgLayout.js !!!
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
class ScoreLineFinder
{
  static default_markRGB = [255,255,0];  // default line-marking color is yellow
  
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


  // Processes all pages in 'this.pageImagePathsMap'; returns count of successes 
  scan_all_pages()
  {
    let cntGood = 0;
    this.scoreLines = [];
    
    for (const img of this.pageImagePathsMap.entries()) {
      if ( true == this.scan_one_page(img[0], img[1]) )
        cntGood += 1;
    }
    if ( cntGood == this.pageImagePathsMap.length )  {
      msg = `-I- Success searching for score-lines in all ${cntGood} score-page image(s)`;
      console.log(msg);  alert(msg);
      // TODO: request file-to-save name and store the results
      return  cntGood;
    } else {
      const cntBad = this.pageImagePathsMap.length - cntGood;
      err = `-E- Failed searching for score-lines in ${cntBad} score-page image(s) out of ${this.pageImagePathsMap.length}`;
      console.log(msg);  alert(msg);
      throw new Error(err);
      return  cntGood;
    }
  }


  /* Seaches the image for score-line marks.
   * Appends data- and metadata for the image to 'this.scoreLines'.
   * Returns true on success false on error */
  /*?async?*/ scan_one_page(htmlPageId, imgUrl)
  {
    const imgElement = document.getElementById(htmlPageId);  // TODO: check result
    const imgCanvas = /*?await?*/ ScoreLineFinder._get_canvas_from_image(imgElement);
    if ( imgCanvas === null )
      throw new Error(`-E- Missing in HTML image-page "${htmlPageId}" (url="${imgUrl}")`);
    const descr = `page '${htmlPageId} (path='${imgUrl}')`;

    // TODO: read pixels from the image canvas
    const imgData = imgCanvas.getImageData(0, 0,
                                           imgCanvas.width, imgCanvas.height);
    if ( imgData === null )  {
      const err = `-E- Failed reading pixels from ${descr}`;
      console.log(err);  alert(err);
      return  false;
      //throw new Error(err);
    }
    console.log(`-I- Succes reading data from ${descr};  dimensions=${imgData.width}x${imgData.height}`);
    //const pixels = TODO;
    return true;
 }


  // static async get_image_pixels(url)
  // {
  //   var img = new Image();
  //   img.src = url;
  //   var canvas = document.createElement('canvas');
  //   var context = canvas.getContext('2d');
  //   context.drawImage(img, 0, 0);
  //   return context.getImageData(?x?, ?y?, 1, 1).data;
  // }


  // WRONG; need to rewrite as async by the book ???
  // Copied from:
  //  https://stackoverflow.com/questions/67399203/get-a-canvas-object-from-an-img-element
  static /*?async?*/ _get_canvas_from_image(image) {  //was: getCanvasFromImage()
   const canvas = document.createElement('canvas');
   canvas.width = image.width;
   canvas.height = image.height;
   const ctx = canvas.getContext('2d');
   ctx.drawImage(image, 0, 0);
   return canvas;
  }


  copy_score_lines()
  {
    //// let clonedArray = JSON.parse(JSON.stringify(this.scoreLines));  //slow
    let clonedArray = this.scoreLines.map(a => {return {...a}}); // 2-level - OK
    return  clonedArray;
  }
  
  
  toString()
  {
    if ( this.scoreLines === null )
      throw new Error(`-E- ScoreLineFinder.toString() called before the data is ready`);
    return  this.scoreLines.join("\n");
  }
}//END_OF__class_ScoreLineFinder
////////////////////////////////////////////////////////////////////////////////

