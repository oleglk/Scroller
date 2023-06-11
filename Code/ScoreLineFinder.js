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

    this.pageIdToCanvas = new Map();  // canvas objects for all the images
    
    this.scoreLines = null;/*for {tag:STR, pageId:STR, x=0, y:INT, timeSec=777}*/

  }




  // _init_all_images()
  // {
  //   for ( const [pageId, url] of this.pageImagePathsMap )  {
  //     console.log(`-I- Going to initialize ${pageId} ==> ${url}`);
  //     const descr = `page '${pageId} (path='${imgUrl}')`;
  //     let image = document.getElementById(pageId);
  //     if ( image === null )
  //       throw new Error(`-E- Missing in HTML image '${descr}'`);  // abort
  //           const outputImage = document.createElement('canvas');
  //     outputImage.id = htmlId;

  //     // set it to the same size as the _cropped_ image
  //     outputImage.width  = outputWidth;
  //     outputImage.height = outputHeight;

  //     // draw our image at position 0, 0 on the canvas
  //     const context = outputImage.getContext('2d');
  //     ctx.drawImage(inputImage, 0, yTop, inputWidth,  inputHeight,
  //                               0, 0,    outputWidth, outputHeight)

  // context = canvas.getContext('2d');

  // drawImage(image);
  // }


  // Processes all pages in 'this.pageImagePathsMap'; returns count of successes 
  async scan_all_pages()
  {
    let cntGood = 0;
    this.scoreLines = [];
    
    for (const img of this.pageImagePathsMap.entries()) {
      if ( true == await this.scan_one_page(img[0], img[1]) )
        cntGood += 1;
    }
    if ( cntGood == this.pageImagePathsMap.length )  {
      msg = `-I- Success searching for score-lines in all ${cntGood} score-page image(s)`;
      console.log(msg);  alert(msg);
      // TODO: request file-to-save name and store the results
      return  cntGood;
    } else {
      const cntBad = this.pageImagePathsMap.length - cntGood;
      const err = `-E- Failed searching for score-lines in ${cntBad} score-page image(s) out of ${this.pageImagePathsMap.length}`;
      console.log(err);  alert(err);
      return  cntGood;  // DO NOT:  throw new Error(err);
    }
  }


  /* Seaches the image for score-line marks.
   * Appends data- and metadata for the image to 'this.scoreLines'.
   * Returns true on success false on error */
  async scan_one_page(htmlPageId, imgUrl)
  {
    const descr = `page '${htmlPageId} (path='${imgUrl}')`;
    let imgCanvas = null;

    try {
      imgCanvas = await render_img_return_canvas(htmlPageId, imgUrl);
      console.log(`-I- Success reported for temporary rendering ${descr}"; size: ${imgCanvas.width}x${imgCanvas.height}`);
      this.pageIdToCanvas.set(htmlPageId, imgCanvas);
    } catch (rejectErrorMsg) {
      //throw new Error(rejectErrorMsg);
      console.log(`Exception while trying to render ${descr}`);
      console.log(rejectErrorMsg);  alert(rejectErrorMsg);
      return  false;
    }

    // TODO: read pixels from the image canvas
    const context = imgCanvas.getContext('2d');
    const imgData = context.getImageData(0, 0,
                                         imgCanvas.width, imgCanvas.height);
    if ( imgData === null )  {
      const err = `-E- Failed reading pixels from ${descr}`;
      //throw new Error(err);
      console.log(err);  alert(err);
      return  false;
    }
    console.log(`-I- Success reading data from ${descr};  dimensions=${imgData.width}x${imgData.height}`);
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


//////// Begin: utilities ///////////////////////////////////////////////////////
/**
 * @param {string} htmlId - id attribute of the original DOM image object
 * @param {string} url - The source image
 * @return {Promise<HTMLCanvasElement>} A Promise that resolves with the resulting image as a canvas element
 * (Adopted and reduced from:
 *    https://pqina.nl/blog/cropping-images-to-an-aspect-ratio-with-javascript/)
 */
async function render_img_return_canvas(htmlId, url)
{
  // we return a Promise that gets resolved with our canvas element
  return new Promise((resolve, reject) => {
    // cannot verify existence of 'url' - in the map and on disk
    
    // this image will hold our source image data
    const inputImage = new Image();
    ///////inputImage.crossOrigin = "anonymous";
    
    inputImage.onerror = () => {
      const err = `Image '${url}' (page '${htmlId}') failed to load for line-finder`;
      throw new Error(err);
    }

    // we want to wait for our image to load
    inputImage.onload = () => {
      // let's store the width and height of our image
      const origWidth  = inputImage.naturalWidth;
      const origHeight = inputImage.naturalHeight;

      // create a canvas that will present the output image
      const outputImage = document.createElement('canvas');
      outputImage.id = "tmp__" + htmlId;

      // set it to the size as the original image
      outputImage.width  = origWidth;
      outputImage.height = origHeight;

      // draw our image at position 0, 0 on the canvas
      const ctx = outputImage.getContext('2d');
      ctx.drawImage(inputImage, 0, 0);

      // DO NOT append the image elem to HTML contents - don't want showing it
      //document.body.appendChild(outputImage);

      resolve(outputImage);
    };

    // start loading our image
    inputImage.src = url;
  });
}
//////// End:   utilities ///////////////////////////////////////////////////////
