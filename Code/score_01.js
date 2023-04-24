// score_01.js

// TODO: pass 'g_tempo', 'g_tactsInLine', 'g_beatsInTact' from the HTML
// TODO: provide a way for user to force alternative 'g_tempo'
var g_tempo = 10*60;  //60; // beats-per-minute
var g_tactsInLine = 7;
var g_beatsInTact = 4;

const g_beatsForFullLine = g_tactsInLine * g_beatsInTact;
const g_fullLineInSec = g_beatsForFullLine * 60 / g_tempo;


// TODO, pass the whole array from the HTML
var g_scoreStations = [
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, timeSec:g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, timeSec:2/3*g_fullLineInSec},
  {tag:"line-001-Begin", pageId:"pg01", x:0, y:656,  timeSec:g_fullLineInSec},
  {tag:"line-002-Begin", pageId:"pg01", x:0, y:1044, timeSec:g_fullLineInSec},
  {tag:"line-003-Begin", pageId:"pg01", x:0, y:1464, timeSec:2/3^g_fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, timeSec:g_fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, timeSec:g_fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, timeSec:2/3*g_fullLineInSec},
  {tag:"line-003-Repeat", pageId:"pg01", x:0, y:1464, timeSec:g_fullLineInSec},
  {tag:"line-004-Begin", pageId:"pg01", x:0, y:1840, timeSec:g_fullLineInSec},
  {tag:"line-005-Begin", pageId:"pg01", x:0, y:2220, timeSec:g_fullLineInSec},
  {tag:"line-006-Begin", pageId:"pg01", x:0, y:2592, timeSec:2/3*g_fullLineInSec},  
  {tag:"Control-Height", pageId:"pg01", x:0, y:3504, timeSec:0},  
];
