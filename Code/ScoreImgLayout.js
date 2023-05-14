// ScoreImgLayout.js - places oredered cropped images on an HTML page
// Uses placement definition produced by class PlayOrder

class ScoreImgLayout
{
  constructor (
    pageImagePathsMap,     /*pageId:STR => imgPath:STR*/
    imgPageOccurencesArray /*{pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
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
    /*ScorePageOccurence == {pageId:STR, firstLine:INT, lastLine:INT, yTop:INT, yBottom:INT}*/
    let imgPath = this.pageImagePaths.get(imagePageOcc.pageId);
    // TODO: check existence of 'imgPath' - in the map and on disk

    let croppedImageCanvas = render_img_crop_height(imgPath,
                                       imagePageOcc.yTop, imagePageOcc.yBottom);
    if ( croppedImageCanvas != null )  {
      console.log(`-I- Success reported for rendering image occurence "TODO" (page="${imagePageOcc.pageId}", path="${imgPath}"); size: ${croppedImageCanvas.width}x${croppedImageCanvas.height}`);
    } else {
      let err = `Failed rendering image occurence "TODO" (page="${imagePageOcc.pageId}", path="${imgPath}")`;
      console.log(err);  alert(err);
      return  false;
    }
    return  true;
  }
}


////////////////////////////////////////////////////////////////////////////////
/**
 * @param {string} url - The source image
 * @param {number} aspectRatio - The aspect ratio
 * @return {<HTMLCanvasElement>} - the resulting image as a canvas element
 * (Adopted from:
 *    https://pqina.nl/blog/cropping-images-to-an-aspect-ratio-with-javascript/)
 */
function render_img_crop_height(imgPath, yTop, yBottom) {
  // this image will hold our source image data
  const inputImage = new Image();

  // let's store the width and height of our image
  const inputWidth = inputImage.naturalWidth;
  const inputHeight = inputImage.naturalHeight;

  let outputWidth = inputWidth;  // we crop only vertically
  let outputHeight = yBottom - yTop + 1;
  if ( outputHeight > inputHeight )  {
    const err = `-E- Cannot crop image "${imgPath}" from height ${inputHeight} to target height ${outputHeight}`; 
    console.log(err);  //alert(err);  // TODO: remove alert
    outputHeight = inputHeight; // an alternative to rejcection?
    return  null;
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

  // start loading our image
  inputImage.src = imgPath;
  return  outputImage;
}
