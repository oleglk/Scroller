// raw_score_process.js

var pageIdsAndImagePaths = null;  // OK_TMP
var tmp__lineFinder = null;  // OK_TMP

/* To facilitate passing parameters to event handlers, use an anonymous function
 * Wrap it by named wrapper to allow storing the handler for future removal */
const wrap__raw__onload  = (event) => { raw__onload(event) }
window.addEventListener("load", wrap__raw__onload);

async function raw__onload(event)
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

  // TODO, open a dialog to prompt for marking color
  // analyze
  let lineFinder = new ScoreLineFinder(pageImagePathsMap,
                                       ScoreLineFinder.default_markRGB);
tmp__lineFinder = lineFinder;  // OK_TMP - allow debug access
  const cntGood = await lineFinder.scan_all_pages();
  if ( cntGood < pageImagePathsMap.length )  {
    const cntBad = pageImagePathsMap.length - cntGood;
    err = `-E- Failed searching for score-lines in ${cntBad} score-page image(s) out of $pageImagePathsMap.length}`;
    // console.log(msg);  alert(msg);
    throw new Error(err);
  }
  msg = `-I- Success searching for score-lines in all ${cntGood} score-page image(s)`;
  console.log(msg);  alert(msg);
  // results are in 'lineFinder.scoreLines'

  let scoreLinesArray = lineFinder.copy_score_lines();

  console.log(`===== Generated Score lines: ====`);
  console.log( format_score_lines(scoreLinesArray) );
  console.log(`=================================`);
}
// wrapper had to be moved to the top - before the 1st use


function format_score_lines(scoreLinesArray)
{
    return  scoreLinesArray.join("\n");  // TODO: generate the actual code
}
