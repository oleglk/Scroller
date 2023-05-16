// ScoreImgLayout.js - places oredered cropped images on an HTML page
// Uses placement definition produced by class PlayOrder

class ScoreImgLayout
{
  constructor (
    pageImagePathsMap,     /*pageId:STR => imgPath:STR*/
    imgPageOccurencesArray /*{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
  )
  {
    this.pageImagePaths = pageImagePathsMap;  /*pageId:STR => imgPath:STR*/
    this.imgPageOccurences = imgPageOccurencesArray;
    
    this._croppedCanvasArray = [];  // facilitates reshape canvas after loading
    this._maxWidth = -1;  // need to ensure equal width for all pages
  }


  /* Draws the images AND builds array of (occurence-based) score-stations.
   * TODO: Score-stations must include 'occurenceId' field.
   * TODO: what should be the 'y' value in a score-station - with crop?
 */
  async render_images()  {
    // ??? document.body.innerHTML = "";  // pre-clean the page contents

    // ensure all canvas have same width (the max among them)
    let maxWidth = 0;
    for ( const [i, occ] of this.imgPageOccurences.entries() )  {
      if ( !this.pageImagePaths.has(occ.pageId) )  {
        err = `-E- Missing image path for page "${occ.pageId}". Aborting`;
        console.log(err);  alert(err);
        return  false;
      }
      let imgPath = this.pageImagePaths.get(occ.pageId);
      try {
        let {width:w, height:h} = await detect_img_dimensions(imgPath);
        console.log(`-D- Original image [${occ.pageId}=${imgPath}] width = ${w}`);
        if ( w > maxWidth )  { maxWidth = w; }
      } catch (rejectErrorMsg) {
        console.log(`Exception reading dimensions of '${imgPath}'`);
        console.log(rejectErrorMsg);  alert(rejectErrorMsg);
        return  false;
      }
    }
    this._maxWidth = maxWidth;
    console.log(`Maximal width = ${this._maxWidth}`);

    this._croppedCanvasArray = [];

    for ( const [i, occ] of this.imgPageOccurences.entries() )  {
      // condition already checked: this.pageImagePaths.has(occ.pageId)
      let imgPath = this.pageImagePaths.get(occ.pageId);
      try {
        let croppedImageCanvas = await this._render_one_page_occurence(occ);
        console.log(`-I- Success reported for rendering image occurence "${occ.occId}" (page="${occ.pageId}", path="${imgPath}"); size: ${croppedImageCanvas.width}x${croppedImageCanvas.height}`);
        this._croppedCanvasArray.push( croppedImageCanvas );
      } catch (rejectErrorMsg) {
        console.log(`Exception while trying to render '${occ}'`);
        console.log(rejectErrorMsg);  alert(rejectErrorMsg);
        return  false;
      }
    }

    console.log(`-I- Success rendering ${this.imgPageOccurences.length} image-page occurence(s) at width=${this._maxWidth}`);
    return  true;
  }


  /* Draws the specified occurence with crop applied */
  async _render_one_page_occurence(imagePageOcc/*ScorePageOccurence*/)
  {
    /*ScorePageOccurence == {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
    let imgPath = this.pageImagePaths.get(imagePageOcc.pageId);
    // TODO: check existence of 'imgPath' - in the map and on disk

    let pageImgShowPromise = render_img_crop_height(
      /*"QQQ"*/imgPath, imagePageOcc.yTop, imagePageOcc.yBottom, this._maxWidth);
    console.log(`-D- Initiated rendering image occurence "${imagePageOcc.occId}" (page="${imagePageOcc.pageId}", path="${imgPath}")`);

    return  pageImgShowPromise;
  }
}


////////////////////////////////////////////////////////////////////////////////
/**
 * @param {string} url - The source image
 * @param {number} aspectRatio - The aspect ratio
 * @param {number} forcedWidth - Override for canvas width
 * @return {Promise<HTMLCanvasElement>} A Promise that resolves with the resulting image as a canvas element
 * (Adopted from:
 *    https://pqina.nl/blog/cropping-images-to-an-aspect-ratio-with-javascript/)
 */
async function render_img_crop_height(url, yTop, yBottom, forcedWidth=-1) {
  // we return a Promise that gets resolved with our canvas element
  return new Promise((resolve, reject) => {
    // TODO: verify image-file existence; reject if none
    
    // this image will hold our source image data
    const inputImage = new Image();

    // we want to wait for our image to load
    inputImage.onload = () => {
      // let's store the width and height of our image
      const inputWidth = inputImage.naturalWidth;
      const origHeight = inputImage.naturalHeight;

      let  inputHeight = yBottom - yTop + 1;  // the vertical crop
      if ( inputHeight == (origHeight + 1) )  {
        inputHeight = origHeight; // let it go with yTop == 0 or 1 confusion
      }
      if ( inputHeight > origHeight )  {
        const wrn = `-W- Cannot crop image "${url}" from height ${origHeight} to target height ${inputHeight}`; 
        console.log(wrn);  //alert(wrn);  // TODO: remove alert
        reject(new Error(wrn));  // Error() provides call stack and std format
      }

      const outputWidth = (forcedWidth > 0)? forcedWidth
                                         : inputWidth; // we crop only vertically
      const outputHeight = inputHeight;

      /* the drawn portion of the image begins at x = 0,  y = yTop
       * and is put at 0,0 on the canvas */

      // create a canvas that will present the output image
      const outputImage = document.createElement('canvas');

      // set it to the same size as the _cropped_ image
      outputImage.width  = outputWidth;
      outputImage.height = outputHeight;

      // draw our image at position 0, 0 on the canvas
      const ctx = outputImage.getContext('2d');
      ctx.drawImage(inputImage, 0, yTop, inputWidth,  inputHeight,
                                0, 0,    outputWidth, outputHeight)

      // show the canvas
      document.body.appendChild(outputImage);

      resolve(outputImage);
    };

    // start loading our image
    inputImage.src = url;
  });
}


async function detect_img_dimensions(url) {
  // we return a Promise that gets resolved with {width:W, height:H} object
  return new Promise((resolve, reject) => {
    // TODO: verify image-file existence; reject if none

    // this image will hold our source image data
    const inputImage = new Image();

    // we want to wait for our image to load
    inputImage.onload = () => {
      // let's store the width and height of our image
      const inputWidth = inputImage.naturalWidth;
      const inputHeight = inputImage.naturalHeight;
      resolve( {width:inputWidth, height:inputHeight} );
    };

    // start loading our image
    inputImage.src = url;
  });
}
