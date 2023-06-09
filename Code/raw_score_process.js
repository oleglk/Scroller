// raw_score_process.js

var pageIdsAndImagePaths = null;  // OK_TMP

/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__raw__onload  = (event) => { raw__onload(event) }
window.addEventListener("load", wrap__raw__onload);

function raw__onload(event)
{
  /* Keep the rest of the handlers from being executed
  *   (and it prevents the event from bubbling up the DOM tree) */
  event.stopImmediatePropagation(); // crucial because of prompt inside handler!
  
  // set tab title to score-file name
  let fileName = window.location.pathname.split("/").pop();
  let pageName = `Scroll: ${remove_filename_extension(fileName)}`;
  document.title = pageName;

  // find all score images on the page
  // let pageIdsAndImagePaths = Array.prototype.map.call(
  //   document.images, function (img) {
  //     console.log('image', img.src); });
  /*let*/ pageIdsAndImagePaths = Array.prototype.map.call(
    document.images,    (x)  =>  { return {id: x.id,  url: x.src}; }  );
  // build 'pageImagePathsMap' ==  {pageId:STR => imgPath:STR*}
  let pageImagePathsMap = new Map();
  for ( let iAndP of pageIdsAndImagePaths.entries() ) {
    console.log(`-I- Image [${iAndP[0]}] : "${iAndP[1].id}"="${iAndP[1].url}"`);
    pageImagePathsMap.set( iAndP[1].id, iAndP[1].url );
  }

  // TODO: analyze
}
// wrapper had to be moved to the top - before the 1st use
