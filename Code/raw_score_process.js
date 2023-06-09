// raw_score_process.js


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
  let imagePathsUnsorted = Array.prototype.map.call(
    document.images, function (img) {
      console.log('image', img.src); });
}
// wrapper had to be moved to the top - before the 1st use
