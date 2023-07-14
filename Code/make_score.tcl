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
set DEFAuLT_MARKER_RGB {0xFF 0xFF 0x00}
set DEFAuLT_COLOR_SAMPLE_SIZE 30


################ The "main" ####################################################
## Example 1:  make_score_file  "Papirossen"  [list "Scores/Marked/Papirossen_mk.gif"]
proc make_score_file {name imgPathList}  {
  global scoreDict;  # OK_TMP
  set imgPathsOrdered $imgPathList;  # TODO: [sort_score_pages $imgPathList]
  set scoreDict [init_score_data_dict $name $imgPathsOrdered \
                                      $::DEFAULT_TIME_BEAT]
  # prepare data for all pages
  foreach pg [dict get $scoreDict PageIdList]  {
    set imgName [dict get $scoreDict  PageIdToImgName   $pg]
    set imgPath [dict get $scoreDict  PageIdToImgPath   $pg]
    set iPage   [dict get $scoreDict  PageIdToPageIndex $pg]
    LOG_MSG "-I- Begin processing score page '$pg', path: '$imgPath'"
    set htwd [read_image_pixels_into_array  $imgPath  2000  pixels]
    lassign $htwd height width
    # TODO: pass matrix by refernce
    set pageLineBounds [find_vertical_spans_of_color_in_pixel_matrix $pixels \
                        $::DEFAuLT_MARKER_RGB $::DEFAuLT_COLOR_SAMPLE_SIZE]
    format_score__one_page_scoreLines  scoreDict  $iPage  $pageLineBounds  \
                                       $width $height
    LOG_MSG "-I- End processing score page '$pg', path: '$imgPath', width=$width, height=$height"
  }
  # Print the arrays
  puts "\n\n"
  foreach pg [dict get $scoreDict PageIdList]  {
    puts "// Score data lines for page '$pg'"
    foreach sl [dict get $scoreDict ScoreDataLines $pg]  {
      puts "$sl"
    }
  }
  foreach pg [dict get $scoreDict PageIdList]  {
    puts "// Score control lines for page '$pg'"
    foreach sl [dict get $scoreDict ScoreControlLines $pg]  {
      puts "$sl"
    }
  }

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


# Workarounds use of excessive-width buffers for reading images.
# Finds where on x-axis the actual pixel data ends
## TODO: could optimize with kind-of binary search
### Example:
### proc _is_real_pixel {rgbList}  { lassign $rgbList r g b;  return [expr ($r>0)||($g>0)||($b>0)] }
### detect_true_image_dimensions pixels wd ht _is_real_pixel "image"
proc detect_true_image_dimensions {matrixOfPixelsRef width height \
                                     isRealPixelCB {descrForLog ""}}  {
  upvar $matrixOfPixelsRef pixels
  upvar $width             wd
  upvar $height            ht
  set N_SAMPLES 10;  # how many rows to check
  set FAST_STEP -100;   # initial X-step decrement - an optimization
  set fullWidth [llength [lindex $pixels 0]]
  set ht [llength $pixels]
  set sampledWidths [list]
  set step [expr {int(floor($ht / $N_SAMPLES))}]
  for {set y 0}  {$y < $ht}  {incr y $step}  {
    set xMax [expr $fullWidth - 1]
    # start search with fast rough pass from the right by 'FAST_STEP' decrements
    for {set xRough $xMax}  {$xRough >= 0}  {incr xRough $FAST_STEP}  {
      set rgbValStr [elem_list2d $pixels $y $xRough]
      if { [$isRealPixelCB [decode_rgb $rgbValStr]] }  {
        set xRough [expr {($xRough < $xMax)? $xRough - $FAST_STEP} : $xMax]
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
                                                   {ignoreUpToXY 0}}  {
  # set width [llength [lindex $matrixOfPixels 0]]
  # set height [llength $matrixOfPixels]
  detect_true_image_dimensions matrixOfPixels width height _is_real_pixel ""
  set rgbDescr [format "rgb(%02X%02X%02X)" {*}$reqRgbList]
  LOG_MSG "-I- Begin searching for spans of $rgbDescr in $width*$height image"

  set spans [list]
  set spanTop -1;  # == outside of any span
  for {set row 0}  {$row < $height}  {incr row 1}  {
    # look for at least one pixel of ~ given color in the row (all its columns)
    set foundInCol -1;  # in which column the matching color found in current row
    for {set col 0}  {$col < $width}  {incr col 1}  {
      if { ($col < $ignoreUpToXY) && ($row < $ignoreUpToXY) }  { continue }
      set rgbValStr [elem_list2d $matrixOfPixels $row $col]
      set rgbList [decode_rgb $rgbValStr]
      if { ![IS_REAL_PIXEL_VALUE $rgbList] }  { continue }; #ignore extra columns
      set equ [equ_rgb $rgbList $reqRgbList]
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
  return  $spans
}


############### Begin: score printing stuff ####################################
proc format__page_id {iPage}  {
  return  [format "pg%02d" [expr {$iPage + 1}]]
}


proc format__dataline_tag {iPage iLine}  {
  return  [format "line-%02d%02d-Begin" [expr {$iPage + 1}] [expr {$iLine + 1}]]
}


proc init_score_data_dict {scoreName imgPathsOrdered defaultTimeBeat}  {
  set scoreData [dict create]
  dict set scoreData  Name            $scoreName
  dict set scoreData  NumPages        [llength $imgPathsOrdered]
  dict set scoreData  PageImgPathList $imgPathsOrdered
  dict set scoreData  DefaultTimeBeat $defaultTimeBeat;  # default beats per line
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


## Sample output
# var g_scoreLines = [
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
# ];
# Fills with kists of formatted text:
# 'scoreDict::ScoreDataLines::pageId' and 'scoreDict::ScoreControlLines::pageId'
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
  # generate data lines
  set dataLines [list]
  set numLines [expr [llength $pageLineBounds]-1];# top for each; bottom for last
  for {set iL 0}  {$iL < $numLines}  {incr iL 1}  {
    lassign [lindex $pageLineBounds $iL]  y1 y2
    set y [expr {int($y1 + 0.1*($y2 - $y1))}];  # just under top of delimeter
    set str [format "{tag:\"%s\", pageId:\"%s\", x:0, y:%d,  timeBeat:%d},"   \
              [format__dataline_tag $iPage $iL]  $pageId  $y  $timeBeat]
    lappend dataLines $str
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
  LOG_MSG "-I- Generated [llength $dataLines] data-line(s) and [llength $ctrlLines] control-line(s) for page '$pageId'"
}
############### End:   score printing stuff #####################################



# # Returns (list) 'width' * list-of-y1,y2 -
# #  - per-column list of {upper lower} coordinates of spans of required color
# proc ABANDONED__find_vertical_spans_of_color_in_pixel_matrix {matrixOfPixels reqRgbList
#                                                    {ignoreUpToXY 0}}  {
#   set width [llength [lindex $matrixOfPixels 0]]
#   set height [llength $matrixOfPixels]
#   set spans [list]
#   for {set col 0}  {$col < $width}  {inctr col 1}  {
#     set oneColSpans [list]
#     set spanTop -1;  # == outside of any span
#     set column [lindex $matrixOfPixels $col];  # a shortcut
#     for {set row 0}  {$row < $height}  {incr row 1}  {
#       if { ($col < $ignoreUpToXY) && ($row < $ignoreUpToXY) }  { continue }
#       set rgbValStr [lindex $column $row]
#       #lassign [decode_rgb $rgbValStr] rV gV bV
#       set equ [equ_rgb [decode_rgb $rgbValStr]  $reqRgbList]
#       if { $equ && ($spanTop < 0) }  { ;  # new span started
#         set spanTop $row
#       }
#       elseif { !$equ && ($spanTop >= 0) }  { ;  # old span ended
#         lappend oneColSpans [list $spanTop [expr $row-1]]
#         set spanTop -1;  # prepare for the next span
#       }
#     }
#     if { $spanTop >= 0 }  { ;  # last span ends at the bottom
#       lappend oneColSpans [list $spanTop [expr $height-1]]
#       set spanTop -1;  # just cleanup
#     }
#     if { 0 != [llength $oneColSpans] }  {
#       # TODO: append
#     }
#   }
# }


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



##### Complete example: #########################################################
proc example_01 {}  {
  global _imgPathsList _width _height _pageLineBounds _scoreDict
  set NAME "Papirossen"
  set _imgPathsList [list "Scores/Marked/Papirossen_mk.gif"]
  set SCORE_IMG_PATH [lindex $_imgPathsList 0]
  set htwd [read_image_pixels_into_array  $SCORE_IMG_PATH  2000  _pixels]
  lassign $htwd _height _width
  set _pageLineBounds [find_vertical_spans_of_color_in_pixel_matrix $_pixels \
                        {0xFF 0xFF 0x00} 30]
  set _scoreDict [init_score_data_dict $NAME $_imgPathsList 3]
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
  
