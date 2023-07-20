# make_score.tcl
################################################################################

set SCRIPT_DIR [file normalize [file dirname [info script]]]

# package require Tk
# set ipap [image create photo -file Scores/INP/Papirossen.gif]
# set wd [image width $ipap];  set ht [image height $ipap]
# #set pixels [$ipap data];  # abnormally slow with 1170*800 because values are printed
# set pixels [$ipap data -from 0 0 99 [expr $ht-1]];  puts "[llength $pixels]"
# set tb [clock seconds];  set pixels [$ipap data];  puts "Size = [llength $pixels]";  set te [expr [clock seconds] - $tb]
## set pixels [$ipap data];  # returns list of lists - rows * columns
## llength $pixels             ==> 1170
## llength [lindex $pixels 0]  ==> 800

package require Tk

# In order to speed-up reading pixel colors from files,
# we allocate extra matrix columns; values there aren't valid RGB colors
proc IS_REAL_PIXEL_VALUE {rgbList}  {
  if { 3 != [llength $rgbList] }  { return 0 }
  return  1
}

proc LOG_MSG {msg}  { puts "$msg" }  ;  # TODO: logging


set DEFAULT_TIME_BEAT 3;  # default line duration in beat-s
set DEFAULT_NUM_LINES_IN_STEP 1;  # 1|2 (!) number of lines to scroll in one step
set DEFAULT_TEMPO 60;  # default play tempo in beats per minute
set DEFAuLT_MARKER_RGB {0xFF 0xFF 0x00}
set DEFAuLT_COLOR_SAMPLE_SIZE 30

set HEADERS_AND_FOOTERS 0;  # for dictionary with format-related headers/footers


################ The "main" ####################################################
## Example 1:  make_score_file  "Papirossen"  [list "Scores/Papirossen_mk.gif"]
## Example 2:  make_score_file  "Vals_by_Petrov"  [list "Scores/Vals_by_Petrov_mk__01.gif" "Scores/Vals_by_Petrov_mk__02.gif" "Scores/Vals_by_Petrov_mk__03.gif"]
proc make_score_file {name imgPathList}  {
  global scoreDict;  # OK_TMP
  set imgPathsOrdered $imgPathList;  # TODO: [sort_score_pages $imgPathList]
  # ::HEADERS_AND_FOOTERS <- dictionary with format-related headers/footers
  set ::HEADERS_AND_FOOTERS [init_header_footer_dict]
  set scoreDict [init_score_data_dict $name $imgPathsOrdered]

  set outDir [file dirname [lindex $imgPathsOrdered 0]]
  set outPath [file join $outDir [format {%s__straight_out.html} $name]]
  set outF [safe_open_outfile $outPath]
  
  # prepare data for all pages
  foreach pg [dict get $scoreDict PageIdList]  {
    set imgName [dict get $scoreDict  PageIdToImgName   $pg]
    set imgPath [dict get $scoreDict  PageIdToImgPath   $pg]
    set iPage   [dict get $scoreDict  PageIdToPageIndex $pg]
    LOG_MSG "-I- Begin processing score page '$pg', path: '$imgPath'"
    set htwd [read_image_pixels_into_array  $imgPath  2000  pixels]
    lassign $htwd height width
    # TODO: pass matrix by refernce
    set pageLineBoundsRaw [find_vertical_spans_of_color_in_pixel_matrix $pixels \
       $::DEFAuLT_MARKER_RGB _is_nonblack_pixel_str $::DEFAuLT_COLOR_SAMPLE_SIZE]
    if { 0 == [llength $pageLineBoundsRaw] }  {
      set err "-E- Aborted since no score lines detected on page '$pg'"
      LOG_MSG $err;  error $err
    }
    set pageLineBounds [merge_nearby_spans $pageLineBoundsRaw "score page $pg"]
    format_score__one_page_scoreLines  scoreDict  $iPage  $pageLineBounds  \
                                       $width $height
    LOG_MSG "-I- End processing score page '$pg', path: '$imgPath', width=$width, height=$height"
  }

  # output the whole score file
  set outDescr "score '$name' into '$outPath'"
  puts $outF "\n"
  LOG_MSG "-I- Printing score-file HTML header for $outDescr..."
  puts $outF [join [format \
        [dict get $::HEADERS_AND_FOOTERS HTML_NAME_comment_template] $name] "\n"]
  puts $outF [join [dict get $::HEADERS_AND_FOOTERS HEAD_html] "\n"]
  puts $outF "\n"
  LOG_MSG "-I- Printing user-configurable parameters for $outDescr..."
  print_score__control_parameters scoreDict $outF
  # Print the arrays
  puts $outF "\n"
  LOG_MSG "-I- Printing score-lines array for $outDescr..."
  print_score__all_pages_scoreLines scoreDict $outF
  puts $outF "\n"
  LOG_MSG "-I- Printing page-image-paths array for $outDescr..."
  print_score__pageImgPathsMap scoreDict $outF
  puts $outF "\n"
  LOG_MSG "-I- Printing example line-play-order array for $outDescr..."
  print_score__playedLines scoreDict $outF
  puts $outF "\n"
  LOG_MSG "-I- Printing score-file HTML footer for $outDescr..."
  puts $outF [join [dict get $::HEADERS_AND_FOOTERS FOOT_html] "\n"]
  puts $outF "\n"
  LOG_MSG "-I- Done generting description file for $outDescr..."
  safe_close_outfile $outF
};#__END_OF__make_score_file
################################################################################



# Reads data from 'imgPath' and puts it into 'listOfPixels'
#                                       as list of lists - rows * columns.
# (First index is row, second index is column)
# On success returns list {height width}, on error returns 0.
# (Don't cause printing of returned value on the screen - the console gets stuck)
## Example:  read_image_pixels_into_array Scores/Marked/Papirossen_mk.gif 2000 pixels
proc read_image_pixels_into_array {imgPath maxWidth listOfPixels {loud 1}}  {
  upvar $listOfPixels pixels
  if { ![file exists $imgPath] }  {
    set err "-E- Inexistent input file '$imgPath'"
    error $err
  }
  set tclExecResult [catch {
    set imgH [image create photo -file $imgPath -width $maxWidth]
    set wd [image width $imgH];  set ht [image height $imgH]
    set pixels [$imgH data];  # returns list of lists - rows * columns
  } execResult]
  if { $tclExecResult != 0 } {
    if { $loud == 1 }  {
      set err "-E- Cannot get pixel data of '$imgPath' ($execResult)"
      error $err
    }
    return  0
  }

  if { $loud == 1 }  {
    if { [llength $pixels] == 0 }  {
      LOG_MSG "-W- Image '$imgPath' has no pixels"
    } else {
      LOG_MSG "-I- Success reading image '$imgPath' into array of [llength $pixels]*[llength [lindex $pixels 0]]"
    }
  }
  return  [list [llength $pixels]  [llength [lindex $pixels 0]]]
}


proc _is_nonblack_pixel {rgbList}  {
  lassign $rgbList r g b
  return [expr ($r>0) || ($g>0) || ($b>0)]
}

proc _is_nonblack_pixel_str {rgbStr}  {
  return  [expr { $rgbStr != {#000000} }]
}


# Workarounds use of excessive-width buffers for reading images.
# Finds where on x-axis the actual pixel data ends
## TODO: could optimize with kind-of binary search
### Example:
### proc _is_nonblack_pixel {rgbList}  { lassign $rgbList r g b;  return [expr ($r>0)||($g>0)||($b>0)] }
### detect_true_image_dimensions pixels wd ht _is_nonblack_pixel "image"
proc detect_true_image_dimensions {matrixOfPixelsRef width height \
                                     isRealPixelCB {descrForLog ""}}  {
  upvar $matrixOfPixelsRef pixels
  upvar $width             wd
  upvar $height            ht
  set N_SAMPLES 10;  # how many rows to check
  set FAST_DECR -100;   # initial X-step decrement - an optimization
  set fullWidth [llength [lindex $pixels 0]]
  set ht [llength $pixels]
  set sampledWidths [list]
  set step [expr {int(floor($ht / $N_SAMPLES))}]
  for {set y 0}  {$y < $ht}  {incr y $step}  {
    set xMax [expr $fullWidth - 1]
    # start search with fast rough pass from the right by 'FAST_DECR' decrements
    for {set xRough $xMax}  {$xRough >= 0}  {incr xRough $FAST_DECR}  {
      set rgbValStr [elem_list2d $pixels $y $xRough]
      if { [$isRealPixelCB [decode_rgb $rgbValStr]] }  {
        set xRough [expr {($xRough < $xMax)? ($xRough - $FAST_DECR) : $xMax}]
        #puts "@@ Y=$y, xRough=$xRough  (pixel='$rgbValStr')"
        break
      }
    }
    # fine search (-1 increments)
    for {set x $xRough}  {$x >= 0}  {incr x -1}  {
      set rgbValStr [elem_list2d $pixels $y $x]
      set rgbList [decode_rgb $rgbValStr]
      if { [$isRealPixelCB $rgbList] }  {
        lappend sampledWidths [expr $x + 1]
        LOG_MSG "-D- Width at Y=$y: [expr $x + 1] (val = '$rgbValStr'=={$rgbList}"
        break
      }
    }
  }
  # find the max of sampled width
  set wd [lindex $sampledWidths 0]
  foreach s $sampledWidths  {
    if { $s > $wd }  { set wd $s }
  }
  if { $descrForLog != "" }  {
    LOG_MSG "-I- Actual size of $descrForLog is $wd*$ht (full: $fullWidth*$ht)"
  }
  return  1
}


# Returns list of pairs {y1 y2} -
#  - each pair is {upper lower} coordinates of spans of required color
proc find_vertical_spans_of_color_in_pixel_matrix {matrixOfPixels reqRgbList
                                        isNonBlackPixelStrCB {ignoreUpToXY 0}}  {
  # set width [llength [lindex $matrixOfPixels 0]]
  # set height [llength $matrixOfPixels]
  set reqRgbStr [encode_rgb $reqRgbList]
  detect_true_image_dimensions matrixOfPixels width height _is_nonblack_pixel ""
  set rgbDescr [format "rgb(%02X%02X%02X)" {*}$reqRgbList]
  LOG_MSG "-I- Begin searching for spans of $rgbDescr in $width*$height image"
  set timeBegin [clock seconds]

  set spans [list]
  set spanTop -1;  # == outside of any span
  for {set row 0}  {$row < $height}  {incr row 1}  {
    # look for at least one pixel of ~ given color in the row (all its columns)
    set foundInCol -1;  # in which column the matching color found in current row
    for {set col 0}  {$col < $width}  {incr col 1}  {
      if { ($col < $ignoreUpToXY) && ($row < $ignoreUpToXY) }  { continue }
      set rgbValStr [elem_list2d $matrixOfPixels $row $col]
      if { ![$isNonBlackPixelStrCB $rgbValStr] }  {
        continue }; #ignore extra columns
      set equ [string equal -nocase $rgbValStr $reqRgbStr]
      if { $equ }  {
        LOG_MSG "-D- Matched ($rgbValStr) at row=$row, col=$col"
        set foundInCol $col
        if { $spanTop < 0 }  { ;  # new span started
          set spanTop $row
          LOG_MSG "-D- Span #[llength $spans] begins at $row; (column: $col)"
        }
        break;  # at least one pixel matches == we are inside some span
      }
    };#__ end of cycle over columns in one row
    # if no pixel matched our color in the whole row == we are outside any span
    if { ($spanTop >= 0) && ($foundInCol < 0) }  { ;  # old span ended
      LOG_MSG "-D- Span #[llength $spans] ends at [expr $row-1]"
      lappend spans [list $spanTop [expr $row-1]]
      set spanTop -1;  # prepare for the next span
    }
  };#__ end of cycle over rows
  # process the last span in case it reached the bottom row
  if { $spanTop >= 0 }  { ;  # last span ends at the bottom
    LOG_MSG "-D- Span #[llength $spans] ends at [expr $height-1]"
    lappend spans [list $spanTop [expr $height-1]]
    set spanTop -1;  # just cleanup
  }
  if { [llength $spans] > 0 }  {
    LOG_MSG "-I- Found [llength $spans] span(s) of $rgbDescr - between Y=[lindex [lindex $spans 0] 0] and Y=[lindex [lindex $spans end] 1]"
  } else {
    LOG_MSG "-W- Found no span(s) of $rgbDescr"
  }
  LOG_MSG "-D- Search for spans of $rgbDescr in $width*$height image took [expr [clock seconds] - $timeBegin] second(s)"
  return  $spans
}


# Receives and returns list of pairs {y1 y2} -
#  - each pair is {upper lower} coordinates of spans (of required color)
# In the returned list spans are merged that were
# closer to each other than half of the max span-to-span distance
# Example 1: merge_nearby_spans {{1 3} {5 6} {8 9}} "ex1"
# Example 2: merge_nearby_spans {{1 3} {5 7} {18 19}} "ex2"
# Example 3: merge_nearby_spans {{1 3} {5 7} {8 9} {21 22}} "ex3"
proc merge_nearby_spans {spanBeginsEnds whereStr}  {
  set nSpans1 [llength $spanBeginsEnds]
  set descr  "$nSpans1 span(s) of $whereStr"
  set cntMerges 0
  set spans2 [list]
  # first run to check basic assumptions and pick 'minDist'
  set maxDist 0
  for {set i 0} {$i < $nSpans1-1} {incr i 1}  {
    lassign [lindex $spanBeginsEnds $i         ] y11 y12
    lassign [lindex $spanBeginsEnds [expr $i+1]] y21 y22
    if { $y12 < $y11 }  { error "-E- Invalid span #$i: $y11...$y12 (in $descr)" }
    if { !($y21 > $y12) && ($y22 > $y12) }  { error "-E- Overlapping spans #$i: $y11...$y12 and #[expr $i+1]: $y21...$y22 (in $descr)" }
    if { $maxDist < ($y21 - $y12) }  { set maxDist [expr $y21 - $y12] }
  }
  set minDist [expr {int( $maxDist / 2.0 )}]
  LOG_MSG "-D- Minimal span-to-span distance chosen for $descr: $minDist"
  set spans1 $spanBeginsEnds
  set nPass 0
  # assume no spans overlap - already checked
  while 1  { ; # while there are spans to be merged
    set spanIndicesToMergeWithNext [list]
    incr nPass 1
    for {set i 0} {$i < $nSpans1-1} {incr i 1}  {
      lassign [lindex $spans1 $i         ] y11 y12
      lassign [lindex $spans1 [expr $i+1]] y21 y22
      if { ($y21 - $y12) < $minDist }  { lappend spanIndicesToMergeWithNext $i }
    }
    if { 0 == [llength $spanIndicesToMergeWithNext] }  { break }
    LOG_MSG "-D- Span merging pass #$nPass has [llength $spanIndicesToMergeWithNext] merge(s)"
    LOG_MSG "-D- Span merging pass #$nPass begins with: {$spans1}"
    # perform the merges - input list 'spans1', output list 'spans2'
    set spans2 [list]
    for {set i [expr $nSpans1-1]} {$i >= 0} {incr i -1}  {
      set prev [expr $i - 1];  # could be ==-1, which is not scheduled for merge
      # element #i could be a candidate to be appended to element #prev
      if { -1== [lsearch -integer -sorted  $spanIndicesToMergeWithNext $prev] } {
        # #i not to be appended to #prev; just copy #i to the output
        set spans2 [linsert $spans2 0 [lindex $spans1 $i]]
        continue
      }
      lassign [lindex $spans1 $prev] y11 y12
      lassign [lindex $spans1 $i   ] y21 y22
      LOG_MSG "-I- Merging spans $y11...$y12 with $y21...$y22 for $descr"
      set spans2 [linsert $spans2 0 [list $y11 $y22]];  # merge #prev with #i
      incr i -1;  # next time skip to the predecessor of #prev
      incr cntMerges 1
    };#END_OF__merging_pass_loop
    set spans1 $spans2;  # 
    set nSpans1 [llength $spans1]
    LOG_MSG "-D- Span merging pass #$nPass ends   with: {$spans1}"
  };#END_OF__while_loop
  if { $cntMerges > 0 }   {
    LOG_MSG "-I- Performed $cntMerges merge(s) of originally $descr"
  } else {
    LOG_MSG "-I- No merge(s) needed for $descr"
  }
  return  $spans1
  ##for {set i 0} {$i < $nSpans1-1} {}  {} ;  # incrementing 'i' inside the loop
}


############### Begin: score printing stuff ####################################
proc format__page_id {iPage}  {
  return  [format "pg%02d" [expr {$iPage + 1}]]
}


proc format__dataline_tag {iPage iLine}  {
  return  [format "line-%02d%02d-Begin" [expr {$iPage + 1}] [expr {$iLine + 1}]]
}


proc init_score_data_dict {scoreName imgPathsOrdered}  {
  set scoreData [dict create]
  dict set scoreData  Name                  $scoreName
  dict set scoreData  NumPages              [llength $imgPathsOrdered]
  dict set scoreData  PageImgPathList       $imgPathsOrdered
  dict set scoreData  DefaultTimeBeat       $::DEFAULT_TIME_BEAT
  dict set scoreData  DefaultNumLinesInStep $::DEFAULT_NUM_LINES_IN_STEP
  dict set scoreData  DefaultTempo          $::DEFAULT_TEMPO
  set pageIds [list]
  set pageNames [list]
  for {set i 0}  {$i < [llength $imgPathsOrdered]}  {incr i 1}  {
    set imgPath [lindex $imgPathsOrdered $i]
    lappend pageNames [file tail $imgPath]
    set pageId  [format__page_id $i]
    lappend pageIds $pageId
    dict set scoreData  PageIdToPageIndex $pageId $i
    dict set scoreData  PageIdToImgName   $pageId [file tail $imgPath]
    dict set scoreData  PageIdToImgPath   $pageId $imgPath
  }
  dict set scoreData  PageImgNameList $pageNames
  dict set scoreData  PageIdList      $pageIds
}


## Sample output - scoreLines
#   {tag:"line-011-Begin", pageId:"pg01", x:0, y:112,  timeBeat:11},
#   {tag:"line-012-Begin", pageId:"pg01", x:0, y:288,  timeBeat:11},
#   ...
#   {tag:"line-034-Begin", pageId:"pg03", x:0, y:661,  timeBeat:11},
#   {tag:"Control-Bottom", pageId:"pg01", x:0, y:1080, timeBeat:0},  
#   {tag:"Control-Height", pageId:"pg01", x:0, y:1130, timeBeat:0},  
#   {tag:"Control-Bottom", pageId:"pg02", x:0, y:1053, timeBeat:0},  
#   {tag:"Control-Height", pageId:"pg02", x:0, y:1130, timeBeat:0},  
#   {tag:"Control-Bottom", pageId:"pg03", x:0, y:914,  timeBeat:0},  
#   {tag:"Control-Height", pageId:"pg03", x:0, y:1130, timeBeat:0},  
# ---
## Sample output - playedLines
#  {pageId:"pg01", lineIdx:4, timeBeat:6*g_beatsInTact},
#  {pageId:"pg02", lineIdx:0, timeBeat:5*g_beatsInTact},
# ---
# Fills with lists of formatted text:
# 'scoreDict::ScoreDataLines::pageId' and 'scoreDict::ScoreControlLines::pageId'
# AND 'scoreDict::ScorePlayedLines::pageId' - sample (straight) play-order array
# 'pageLineBounds' is a list of line-delimeters' {min max}Y-coordinates
proc format_score__one_page_scoreLines {scoreDictRef iPage pageLineBounds
                                        pageWidth pageHeight}  {
  upvar $scoreDictRef scoreDict
  set maxPageIdx [expr [dict get $scoreDict NumPages] - 1]
  if { ($iPage < 0) || ($iPage > $maxPageIdx) }  {
    error "-E- Invalid page index $iPage; should be 0...$maxPageIdx"
  }
  set pageId  [format__page_id $iPage]
  set timeBeat [dict get $scoreDict DefaultTimeBeat]
  # generate data lines and played lines (sample play-order)
  set dataLines [list]
  set playedLines [list]
  set numLines [expr [llength $pageLineBounds]-1];# top for each; bottom for last
  for {set iL 0}  {$iL < $numLines}  {incr iL 1}  {
    lassign [lindex $pageLineBounds $iL]  y1 y2
    set y [expr {int($y1 + 0.1*($y2 - $y1))}];  # just under top of delimeter
    set strD [format "{tag:\"%s\", pageId:\"%s\", x:0, y:%d,  timeBeat:%d},"   \
              [format__dataline_tag $iPage $iL]  $pageId  $y  $timeBeat]
    lappend dataLines $strD
    #   {pageId:"pg01", lineIdx:0, timeBeat:6*g_beatsInTact},
    set strP [format "{pageId:\"%s\", lineIdx:%d, timeBeat:%d},"   \
                $pageId  $iL  $timeBeat]
    lappend playedLines $strP
  }
  # generate control lines
  set ctrlLines [list]
  #   {tag:"Control-Bottom", pageId:"pg03", x:0, y:914,  timeBeat:0},  
  #   {tag:"Control-Height", pageId:"pg03", x:0, y:1130, timeBeat:0},
  lassign [lindex $pageLineBounds end]  y1Last y2Last
  set yBottom [expr {int($y2Last - 0.1*($y2Last - $y1Last))}]; #just above bottom
  lappend ctrlLines \
    [format "{tag:\"Control-Bottom\", pageId:\"%s\", x:0, y:%d,  timeBeat:0},"  \
                     $pageId  $yBottom]
  lappend ctrlLines \
    [format "{tag:\"Control-Height\", pageId:\"%s\", x:0, y:%d,  timeBeat:0},"  \
                     $pageId  $pageHeight]
  
  dict set scoreDict  ScoreDataLines    $pageId $dataLines
  dict set scoreDict  ScoreControlLines $pageId $ctrlLines
  dict set scoreDict  ScorePlayedLines  $pageId $playedLines
  LOG_MSG "-I- Generated [llength $dataLines] data-line(s) and [llength $ctrlLines] control-line(s) for page '$pageId'"
}


# const g_scoreName = "Vals_by_Petrov";
# const g_numLinesInStep = 1;
# var g_tempo = 60;  //60; // beats-per-minute
proc print_score__control_parameters {scoreDictRef {outChannel stdout}}  {
  upvar $scoreDictRef scoreDict
  puts $outChannel "const g_scoreName = \"[dict get $scoreDict Name]\";"
  puts $outChannel ""
  puts $outChannel "//=========== Begin: user-configurable settings ===========";
  puts $outChannel "const g_numLinesInStep = [dict get $scoreDict DefaultNumLinesInStep];  // how many lines to scroll in one step - 1 or 2"
  puts $outChannel ""
  puts $outChannel "const g_tempo = [dict get $scoreDict DefaultTempo];  // assumed play speed - beats per minute"
  puts $outChannel "//=========== End:   user-configurable settings ===========";
}


proc print_score__all_pages_scoreLines {scoreDictRef {outChannel stdout}} {
  upvar $scoreDictRef scoreDict
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS HEAD_scoreLines] "\n"]
  foreach pg [dict get $scoreDict PageIdList]  {
    puts $outChannel "// Score data lines for page '$pg'"
    foreach sl [dict get $scoreDict ScoreDataLines $pg]  {
      puts $outChannel "$sl"
    }
  }
  foreach pg [dict get $scoreDict PageIdList]  {
    puts $outChannel "// Score control lines for page '$pg'"
    foreach sl [dict get $scoreDict ScoreControlLines $pg]  {
      puts $outChannel "$sl"
    }
  }
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS FOOT_scoreLines]]
}


# Prints two examples of line play-order:
# 1) straight: all lines once - from line-1 of page-1 till last line of last page
# 2) dummy:    line-1 of page-1 twice, then last line of last page twice
proc print_score__playedLines {scoreDictRef {outChannel stdout}} {
  upvar $scoreDictRef scoreDict
  set allPageIds [dict get $scoreDict PageIdList]

  # print "straight" play-order"
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                                               HEAD_playedLinesStraight] "\n"]
  foreach pg $allPageIds  {
    # print all score played lines for page '$pg'
    foreach pl [dict get $scoreDict ScorePlayedLines $pg]  {
      puts $outChannel "$pl"
    }
  }
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                            FOOT_playedLinesStraight]]
  puts $outChannel ""

  # print "dummy" play-order" - first line twice, then last lins twice
  set pg1 [lindex $allPageIds 0]
  set playedLines_pg1 [dict get $scoreDict ScorePlayedLines $pg1]
  set pgN [lindex $allPageIds end]
  set playedLines_pgN [dict get $scoreDict ScorePlayedLines $pgN]
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                            HEAD_playedLinesDummy] "\n"]
  foreach i {1 2}  {  puts $outChannel [lindex $playedLines_pg1 0] };   # first
  foreach i {1 2}  {  puts $outChannel [lindex $playedLines_pgN end] }; # last
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                            FOOT_playedLinesDummy] "\n"]

  # print choice of "straight" play-order
  puts $outChannel ""
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                            HELPER_choose_line_play_order] "\n"]
  puts $outChannel "\n"
  puts $outChannel [join [dict get $::HEADERS_AND_FOOTERS  \
                            CHOICE_playedLinesStraight] "\n"]
}


# var g_pageImgPathsMap = new Map([
#   ["pg01", "Vals_by_Petrov__01.jpg"],
#   ["pg02", "Vals_by_Petrov__02.jpg"],
#   ["pg03", "Vals_by_Petrov__03.jpg"],
# ]);
proc print_score__pageImgPathsMap {scoreDictRef {outChannel stdout}} {
  upvar $scoreDictRef scoreDict
  puts $outChannel [join \
                     [dict get $::HEADERS_AND_FOOTERS HEAD_pageImgPathsMap] "\n"]
  foreach pg [dict get $scoreDict  PageIdList]  {
    # set imgPath [dict get $scoreDict PageIdToImgPath $pg]
    set imgFileName [dict get $scoreDict PageIdToImgName $pg]
    puts $outChannel [format {["%s", "%s"],} $pg $imgFileName]
  }
  puts $outChannel [join \
                     [dict get $::HEADERS_AND_FOOTERS FOOT_pageImgPathsMap] "\n"]
}

############### End:   score printing stuff #####################################




# Returns 1 if the two (rgb) colors are _nearly_ equal, otherwise returns 0
proc equ_rgb {rgbList1 rgbList2}  {
  #### LOG_MSG "@@@@ {$rgbList1} {$rgbList2}"
  set thresholdPrc 1.0;  # relDiffPrc(250, 255) == 0.9900990099009901
  set bigDiff 0
  for {set c 0}  {$c < 3}  {incr c 1}  {
    set v1 [lindex $rgbList1 $c];    set v2 [lindex $rgbList2 $c]
    if { ($v1 == 0) && ($v2 == 0) }  { continue }
    set relDiffPrc [expr {(($v1 == 0) && ($v2 == 0))? 0.0
                          : [expr {100.0 * abs($v1 - $v2) / ($v1 + $v2)}] }]
    if { $relDiffPrc >= $thresholdPrc }  {
      set bigDiff 1
    }
  }
  return  [expr {$bigDiff == 0}]
}



proc elem_list2d {listOfLists row col}  {
  set width [llength [lindex $listOfLists 0]]
  set height [llength $listOfLists]
  if { ($row < 0) || ($row >= $height) || ($col < 0) || ($col >= $width) }  {
    set err "-E- Invalid pixel index ($row $col); should be (0..[expr $height-1], 0..[expr $width-1])"
    error $err
  }
  return  [lindex [lindex $listOfLists $row] $col]
}


# "#00A1B2" => {0 161 178}.  On error returns 0
proc decode_rgb {pixelStr}  {
  if { 0 == [regexp -nocase                                                \
               {\#([0-9A-F][0-9A-F])([0-9A-F][0-9A-F])([0-9A-F][0-9A-F])}  \
               $pixelStr all hR hG hB] }  {
    return  0
  }
  scan  "$hR $hG $hB"  {%x %x %x}  dR dG dB
  return  [list $dR $dG $dB]
}


# {0 161 178} => "#00A1B2".  On error returns 0
proc encode_rgb {rgbList}  {
  return  [format "#%02X%02X%02X" {*}$rgbList]
  
}

proc safe_open_outfile {fullPath} {
  set tclExecResult [catch {
    if { ![string equal $fullPath "stdout"] } {
      set outF [open [file normalize $fullPath] w]
    } else {
      set outF stdout
    }
  } execResult]
  if { $tclExecResult != 0 } {
    set err "-E- Failed to open output file '$fullPath': $execResult!"
    #LOG_MSG $err
    error $err
  }
  return  $outF
}


proc safe_close_outfile {outChannel} {
  if { ![string equal $outChannel "stdout"] } {    close $outChannel	}
}


################################################################################
proc init_header_footer_dict {}  {
  set hfd [dict create]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_scoreLines  [list  \
{/* Images are first resized to equal width, then measured:}  \
{ * set IMCONVERT {C:\Program Files\Imagemagick_711_3\convert.exe}}  \
{ * #### exec $IMCONVERT --version"}  \
{ * foreach f [glob {TMP/*.jpg}]  {$IMCONVERT $f -resize 800x -quality 92 [file tail $f]}}  \
{ * !Having page-width close to screen resolution makes fading alerts visible!*/ }  \
{var g_scoreLines = [}  \
                                  ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_scoreLines  [list  \
{];}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_pageImgPathsMap  [list  \
{/* Image paths should be relative to the location of score files */}  \
{var g_pageImgPathsMap = new Map([}
                                ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_pageImgPathsMap  [list  \
{]);}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_playedLinesStraight  [list  \
{/* Example of line play order spec: straight - without repetitions}  \
{ * Line format:  {pageId:<line-page-id>, lineIdx:<line-index-from-0>, timeBeat:<line-play-time-in-beats>}  */}  \
{var g_linePlayOrder_straight = [}
                                ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_playedLinesStraight  [list  \
{];}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_playedLinesDummy  [list  \
{/* Example of line play order spec: dummy - twice first line, twice last line}  \
{ * Line format:  {pageId:<line-page-id>, lineIdx:<line-index-from-0>, timeBeat:<line-play-time-in-beats>}  */}  \
{var g_linePlayOrder_dummy = [}
                                ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_playedLinesDummy  [list  \
{];}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HELPER_choose_line_play_order  [list  \
{// a helper function for safe selection of play-order spec}  \
{function _TwoLevelCopy(arrayOfObjects)}  \
{{  return  arrayOfObjects.map(a => {return {...a}});  }}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd CHOICE_playedLinesStraight  [list  \
{/* Example of choosing one of the pre-built line play orders:}  \
{   - point at the "straight" order */ }  \
{var g_linePlayOrder = _TwoLevelCopy( g_linePlayOrder_straight );}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HTML_NAME_comment_template  [list  \
{<!-- Score/notes for "%s" -->}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_html  [list  \
{<!DOCTYPE HTML>}  \
{<html>}  \
{<head>}  \
{<style>}  \
"img {"  \
{width: 75%;}  \
"}"  \
{</style>}  \
{}  \
{<script type="text/javascript">}  \
{////////////////////////////////////////////////////////////////////////////////}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_html  [list  \
{////////////////////////////////////////////////////////////////////////////////}  \
{</script>}  \
{</head>}  \
{}  \
{<body>}  \
{</body>}  \
{}  \
{<!-- ..................... In the very end ................................. -->}  \
{}  \
{<!-- Load the generic Dialog class code -->}  \
{<script src="../Code/ModalDialog.js"></script>}  \
{<!-- Load the utility code -->}  \
{<script src="../Code/ScrollerCommonUtils.js"></script>}  \
{<!-- Load the layout code -->}  \
{<script src="../Code/PlayOrder.js"></script>}  \
{<script src="../Code/ScoreImgLayout.js"></script>}  \
{}  \
{<!-- Load and execute the scrolling code                                     -->}  \
{<!-- (... then create the play-order layout)                                 -->}  \
{<!-- (... then prepare global data for the scroller and start it)            -->}  \
{<script src="../Code/img_scroll.js"></script> }  \
{}  \
{</html>}  \
                                ]
  #------------------------------------------------------------------------#
  #------------------------------------------------------------------------#
  return  $hfd
}
################################################################################


##### Complete example: #########################################################
proc example_01 {}  {
  global _imgPathsList _width _height _pageLineBounds _scoreDict
  set NAME "Papirossen"
  set _imgPathsList [list "Scores/Marked/Papirossen_mk.gif"]
  set SCORE_IMG_PATH [lindex $_imgPathsList 0]
  set htwd [read_image_pixels_into_array  $SCORE_IMG_PATH  2000  _pixels]
  lassign $htwd _height _width
  set _pageLineBounds [find_vertical_spans_of_color_in_pixel_matrix $_pixels \
                        {0xFF 0xFF 0x00} _is_nonblack_pixel_str 30]
  set _scoreDict [init_score_data_dict $NAME $_imgPathsList]
  format_score__one_page_scoreLines  _scoreDict  0  $_pageLineBounds  \
                                     $_width $_height

  puts "\n\n"
  foreach pg [dict get $_scoreDict PageIdList]  {
    puts "// Score data lines for page '$pg'"
    foreach sl [dict get $_scoreDict ScoreDataLines $pg]  {
      puts "$sl"
    }
    puts "// Score control lines for page '$pg'"
    foreach sl [dict get $_scoreDict ScoreControlLines $pg]  {
      puts "$sl"
    }
  }
}
################################################################################

################################################################################
## Make symbolic links to score images in a directory other than "Scores/"
##   set myDir [pwd];  cd Scores/;  foreach img [glob -nocomplain -directory "Marked" {*.gif}]  {puts "$img";  exec  ln -s -f $img [file tail $img]};  cd $myDir
################################################################################

