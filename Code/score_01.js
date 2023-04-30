// score_01.js

////////////////////////////////////////////////////////////////////////////////
function score_viewpoint(scoreLineObj, timeSec)
{
  let scoreStation = Object.assign(scoreLineObj);  // shallow copy is OK here
  scoreStation.timeSec = timeSec;
  return  scoreStation;
}
////////////////////////////////////////////////////////////////////////////////


// TODO: pass 'g_tempo', 'g_tactsInLine', 'g_beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'g_tempo'
var g_tempo = 10*60;  //60; // beats-per-minute
var g_tactsInLine = 7;
var g_beatsInTact = 4;

const g_beatsForFullLine = g_tactsInLine * g_beatsInTact;
const g_fullLineInSec = g_beatsForFullLine * 60 / g_tempo;

var g_scoreLines = [
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:108,  timeSec:g_fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:492, timeSec:g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:874, timeSec:2/3*g_fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1265, timeSec:g_fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:1646, timeSec:g_fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2028, timeSec:2/3*g_fullLineInSec},
  {tag:"Control-Height", pageId:"pg01", x:0, y:2492, timeSec:0},  
];


// TODO, pass the whole array from the HTML
// TODO: double-check times
  /* show 01,02,03 while playing 01,02,03,01,02 */
  /* show 03,04,05 while playing 03,04 */
  /* show 04,05,06 while playing 05,06,04,05,06 */
var g_scoreStations_Groupped = [
  {...score_viewpoint(g_scoreLines[0],  (1+1+2/3+1+1) * g_fullLineInSec)},
  {...score_viewpoint(g_scoreLines[2],  (2/3+1) * g_fullLineInSec)},
  {...score_viewpoint(g_scoreLines[3],  (1+2/3+1+1+2/3) * g_fullLineInSec)},
];

  
////////////////////////////////////////////////////////////////////////////////
// ... the copy will be 2-level deep - fine for the task
var g_scoreStations = g_scoreStations_Groupped.map(a => {return {...a}});
////////////////////////////////////////////////////////////////////////////////


//~ // TODO, pass the whole array from the HTML
//~ var g_scoreStations_LineBy_Line = [
  //~ {tag:"line-001-Begin", pageId:"pg01", x:0, y:108,  timeSec:g_fullLineInSec},
  //~ {tag:"line-002-Begin", pageId:"pg01", x:0, y:492, timeSec:g_fullLineInSec},
  //~ {tag:"line-003-Begin", pageId:"pg01", x:0, y:874, timeSec:2/3*g_fullLineInSec},
  //~ {tag:"line-001-Begin", pageId:"pg01", x:0, y:108,  timeSec:g_fullLineInSec},
  //~ {tag:"line-002-Begin", pageId:"pg01", x:0, y:492, timeSec:g_fullLineInSec},
  //~ {tag:"line-003-Begin", pageId:"pg01", x:0, y:874, timeSec:2/3^g_fullLineInSec},
  //~ {tag:"line-004-Begin", pageId:"pg01", x:0, y:1265, timeSec:g_fullLineInSec},
  //~ {tag:"line-005-Begin", pageId:"pg01", x:0, y:1646, timeSec:g_fullLineInSec},
  //~ {tag:"line-006-Begin", pageId:"pg01", x:0, y:2028, timeSec:2/3*g_fullLineInSec},
  //~ {tag:"line-004-Begin", pageId:"pg01", x:0, y:1265, timeSec:g_fullLineInSec},
  //~ {tag:"line-005-Begin", pageId:"pg01", x:0, y:1646, timeSec:g_fullLineInSec},
  //~ {tag:"line-006-Begin", pageId:"pg01", x:0, y:2028, timeSec:2/3*g_fullLineInSec},  
  //~ {tag:"Control-Height", pageId:"pg01", x:0, y:2492, timeSec:0},  
//~ ];
  //~ {tag:"line-006-Begin", pageId:"pg01", x:0, y:2028, timeSec:2/3*g_fullLineInSec},  
  //~ {tag:"Control-Height", pageId:"pg01", x:0, y:2492, timeSec:0},  
//~ ];
