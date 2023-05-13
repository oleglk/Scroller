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
      let imgPath = this.pageImagePaths.get(occ.pageId);
      // TODO: check existence of 'imgPath'
      let img = new Image(); // assume auto-choice of width, height
      img.src = imgPath;
      let origWidth  = img.naturalWidth;
      let origHeight = img.naturalHeight;
      document.body.appendChild(img);
      console.log(`-Rendered image occurence #${i} "TODO" (page="${occ.pageId}", path="${imgPath}"); size: ${origWidth}x${origHeight}`);
    }
    console.log(`-I- Success rendering ${this.imgPageOccurences.length} image-page occurence(s)`);
    return  true;
  }
}
