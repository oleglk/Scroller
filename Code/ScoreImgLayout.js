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
  render_images()  {
    for ( const [i, occ] of this.imgPageOccurences.entries() )  {
      if ( !this.pageImagePaths.has(occ.pageId) )  {
        err = `-E- Missing image path for page "${occ.pageId}". Aborting`;
        console.log(err);  alert(err);
        return  false;
      }

      if ( false == this._render_one_page_occurence(occ) )  {
        return  false;  // error already printed
      }
    }
    console.log(`-I- Success rendering ${this.imgPageOccurences.length} image-page occurence(s)`);
    return  true;
  }


  /* Draws the specified occurence with crop applied */
  _render_one_page_occurence(imagePageOcc/*ScorePageOccurence*/)
  {
    /*ScorePageOccurence == {occId:STR, pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
    let imgPath = this.pageImagePaths.get(imagePageOcc.pageId);
    // TODO: check existence of 'imgPath' - in the map and on disk

    let pageImgShowPromise = render_img_crop_height(
             imgPath, imagePageOcc.yTop, imagePageOcc.yBottom).then(
      croppedImageCanvas => {
        console.log(`-I- Success reported for rendering image occurence "${imagePageOcc.occId}" (page="${imagePageOcc.pageId}", path="${imgPath}"); size: ${croppedImageCanvas.width}x${croppedImageCanvas.height}`);
      },
      error => {
        console.log(error);  alert(error);
        return  false;
      }
    );

    return  true;
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
function render_img_crop_height(url, yTop, yBottom) {
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
      if ( outputHeight > inputHeight )  {
        const wrn = `-W- Cannot crop image "${url}" from height ${inputHeight} to target height ${outputHeight}`; 
        console.log(wrn);  //alert(wrn);  // TODO: remove alert
        outputHeight = inputHeight; // an alternative to rejcection?
        reject(new Error(wrn));
      }

      // calculate the position to draw the image at
      const outputX = 0;
      const outputY = yTop;

      // create a canvas that will present the output image
      const outputImage = document.createElement('canvas');

      // set it to the same size as the image
      outputImage.width = outputWidth;
      outputImage.height = outputHeight;

      // draw our image at position 0, 0 on the canvas
      const ctx = outputImage.getContext('2d');
      ctx.drawImage(inputImage, outputX, outputY);

      // show both the image and the canvas
      document.body.appendChild(inputImage);
      document.body.appendChild(outputImage);

      resolve(outputImage);
    };

    // start loading our image
    inputImage.src = url;
  });
}
