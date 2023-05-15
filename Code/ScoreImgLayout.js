// ScoreImgLayout.js - places oredered cropped images on an HTML page
// Uses placement definition produced by class PlayOrder

class ScoreImgLayout
{
  constructor (
    pageImagePathsMap,     /*pageId:STR => imgPath:STR*/
    imgPageOccurencesArray /*{occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
  )  {
    this.pageImagePaths = pageImagePathsMap;  /*pageId:STR => imgPath:STR*/
    this.imgPageOccurences = imgPageOccurencesArray;
  }


  /* Draws the images AND builds array of (occurence-based) score-stations.
   * TODO: Score-stations must include 'occurenceId' field.
   * TODO: what should be the 'y' value in a score-station - with crop?
 */
  async render_images()  {
    // ??? document.body.innerHTML = "";  // pre-clean the page contents

    for ( const [i, occ] of this.imgPageOccurences.entries() )  {
      if ( !this.pageImagePaths.has(occ.pageId) )  {
        err = `-E- Missing image path for page "${occ.pageId}". Aborting`;
        console.log(err);  alert(err);
        return  false;
      }

      let imgPath = this.pageImagePaths.get(occ.pageId);
      try {
        let croppedImageCanvas = await this._render_one_page_occurence(occ);
        console.log(`-I- Success reported for rendering image occurence "${occ.occId}" (page="${occ.pageId}", path="${imgPath}"); size: ${croppedImageCanvas.width}x${croppedImageCanvas.height}`);
      } catch (rejectErrorMsg) {
        console.log(`Exception while trying to render '${occ}'`);
        console.log(rejectErrorMsg);  alert(rejectErrorMsg);
        return  false;
      }
    }
    console.log(`-I- Success rendering ${this.imgPageOccurences.length} image-page occurence(s)`);
    return  true;
  }


  /* Draws the specified occurence with crop applied */
  async _render_one_page_occurence(imagePageOcc/*ScorePageOccurence*/)
  {
    /*ScorePageOccurence == {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
    let imgPath = this.pageImagePaths.get(imagePageOcc.pageId);
    // TODO: check existence of 'imgPath' - in the map and on disk

    let pageImgShowPromise = render_img_crop_height(
      /*"QQQ"*/imgPath, imagePageOcc.yTop, imagePageOcc.yBottom);
    console.log(`-D- Initiated rendering image occurence "${imagePageOcc.occId}" (page="${imagePageOcc.pageId}", path="${imgPath}")`);

    return  pageImgShowPromise;
  }
}


////////////////////////////////////////////////////////////////////////////////
/**
 * @param {string} url - The source image
 * @param {number} aspectRatio - The aspect ratio
 * @return {Promise<HTMLCanvasElement>} A Promise that resolves with the resulting image as a canvas element
 * (Adopted from:
 *    https://pqina.nl/blog/cropping-images-to-an-aspect-ratio-with-javascript/)
 */
async function render_img_crop_height(url, yTop, yBottom) {
  // we return a Promise that gets resolved with our canvas element
  return new Promise((resolve, reject) => {
    // this image will hold our source image data
    const inputImage = new Image();

    // we want to wait for our image to load
    inputImage.onload = () => {
      // let's store the width and height of our image
      const inputWidth = inputImage.naturalWidth;
      const inputHeight = inputImage.naturalHeight;

      let outputWidth = inputWidth;  // we crop only vertically
      let outputHeight = yBottom - yTop + 1;
      if ( outputHeight == (inputHeight + 1) )  {
        outputHeight = inputHeight; // let it go with yTop == 0 or 1 confusion
      }
      if ( outputHeight > inputHeight )  {
        const wrn = `-W- Cannot crop image "${url}" from height ${inputHeight} to target height ${outputHeight}`; 
        console.log(wrn);  //alert(wrn);  // TODO: remove alert
        reject(new Error(wrn));  // Error() provides call stack and std format
      }

      /* the drawn portion of the image begins at x = 0,  y = yTop
       * and is put at 0,0 on the canvas */

      // create a canvas that will present the output image
      const outputImage = document.createElement('canvas');

      // set it to the same size as the _cropped_ image
      outputImage.width = outputWidth;
      outputImage.height = outputHeight;

      // draw our image at position 0, 0 on the canvas
      const ctx = outputImage.getContext('2d');
      ctx.drawImage(inputImage, 0, yTop, outputWidth, outputHeight,
                                0, 0,    outputWidth, outputHeight)

      // show the canvas
      document.body.appendChild(outputImage);

      resolve(outputImage);
    };

    // start loading our image
    inputImage.src = url;
  });
}
