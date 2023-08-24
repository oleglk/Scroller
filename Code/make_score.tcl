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


set _RUN_IN_GUI          0;  # overriden if started by proc gui_start

######### Begin: Score-Maker preferances #######################################
set _APPTITLE            "Score-Maker";  # shown in window caption
set _GUI_NUM_LOG_COLUMNS 100;            # width  of short-log window
set _GUI_NUM_LOG_LINES   40;             # height of short-log window
###
set DEFAULT_TIME_BEAT 3;  # default line duration in beat-s
set DEFAULT_NUM_LINES_IN_STEP 1;  # 1|2 (!) number of lines to scroll in one step
set DEFAULT_TEMPO 60;  # default play tempo in beats per minute
###
##set DEFAuLT_MARKER_RGB {0xFF 0xFF 0x00}
set MIN_COLOR_SAMPLE_SIZE 10
set COLOR_CMP_APPROX 0;  # whether to allow variation in line-marker color
set MIN_MARKER_COLOR_LINE_WIDTH_PRC 1;  # in percents of page-image width
###
set LOGFILE_NAME_PATTERN "%s__score_maker_log.txt";  # %s - for score name
set LOG_DEBUG 1;  # whether to print debug-level messages into the logfie
######### End: Score-Maker preferances #######################################


# In order to speed-up reading pixel colors from files,
# we allocate extra matrix columns; values there aren't valid RGB colors
proc IS_REAL_PIXEL_VALUE {rgbList}  {
  if { 3 != [llength $rgbList] }  { return 0 }
  return  1
}


######### Begin: Score-Maker gloal variables ####################################
set SCORE_NAME ""
set LOG_F      0;  # log-file output channel
set OUT_DIR    "";  # output directory for score-file and log-file
set HEADERS_AND_FOOTERS 0;  # for dictionary with format-related headers/footers
######### End: Score-Maker global variables #####################################


################ The "main" ####################################################
## Example 1:  make_score_file  "Papirossen"  [list "Scores/Papirossen_mk.gif"]
## Example 2:  make_score_file  "Vals_by_Petrov"  [list "Scores/Vals_by_Petrov_mk__01.gif" "Scores/Vals_by_Petrov_mk__02.gif" "Scores/Vals_by_Petrov_mk__03.gif"]
proc make_score_file {name imgPathList {markerRgbList 0}}  {
  global scoreDict;  # OK_TMP
  set ::SCORE_NAME $name
  set ::OUT_DIR [file dirname [lindex $imgPathList 0]]
  set outPath [file join $::OUT_DIR [format {%s__straight_out.html} $name]]
  set outF [safe_open_outfile $outPath]
  
  set imgPathsOrdered [order_names_by_numeric_fields $imgPathList "LOG_MSG"]
  # ::HEADERS_AND_FOOTERS <- dictionary with format-related headers/footers
  set ::HEADERS_AND_FOOTERS [init_header_footer_dict]
  set scoreDict [init_score_data_dict $name $imgPathsOrdered]

  # prepare data for all pages
  set pageMarkerRgbList $markerRgbList;  # common enforcing - if given
  foreach pg [dict get $scoreDict PageIdList]  {
    set imgName [dict get $scoreDict  PageIdToImgName   $pg]
    set imgPath [dict get $scoreDict  PageIdToImgPath   $pg]
    set iPage   [dict get $scoreDict  PageIdToPageIndex $pg]
    set begMsg "Begin processing score page '$pg', path: '$imgPath'"
    SCREEN_MSG "$begMsg";
    LOG_MSG "-I- $begMsg"
    SCREEN_MSG "\n... Please wait ..."
    set htwd [read_image_pixels_into_array  $imgPath  2000  pixels]
    lassign $htwd height width
    detect_true_image_dimensions pixels trueWidth trueHeight _is_nonblack_pixel \
                                 "page '$pg' ($imgName)"
    if { $markerRgbList == 0 }  {;  # no common marker color enforced
      set pageMaxColorSampleSize [choose_marker_color_sample_size \
                                                          $trueWidth $trueHeight]
      if { 0 == [set pageMarkerRgbList [detect_page_marker_color  \
                   pixels $::MIN_COLOR_SAMPLE_SIZE $pageMaxColorSampleSize]] }  {
        ABORT "No line-position marker color for page '$pg' ($imgName)"
      }
    }
    # TODO: pass matrix by refernce
    set pageLineBoundsRaw [find_vertical_spans_of_color_in_pixel_matrix $pixels \
                             $pageMarkerRgbList _is_nonblack_pixel_str \
                             [expr 1.5 *$pageMaxColorSampleSize]]
    if { [llength $pageLineBoundsRaw] > 1 }  {
      set pageLineBounds [merge_nearby_spans $pageLineBoundsRaw "score page $pg"]
    }
    if { ([llength $pageLineBoundsRaw] <= 1) ||  \
         ([llength $pageLineBounds   ] <= 1)  }  {
      set err "-E- Aborted since no score lines detected on page '$pg'"
      ABORT $err
    }
    format_score__one_page_scoreLines  scoreDict  $iPage  $pageLineBounds  \
                                       $width $height
    set endMsg "End processing score page '$pg', path: '$imgPath', width=$width, height=$height"
    SCREEN_MSG "$endMsg";  LOG_MSG "-I- $endMsg"
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
  set finMsg "Done generting description file for $outDescr..."
  SCREEN_MSG $finMsg
  LOG_MSG "-I- $finMsg"
  safe_close_outfile outF
  LOG_CLOSE
};#__END_OF__make_score_file
################################################################################


################ The GUI #######################################################
proc gui_start {}  {
  set ::_RUN_IN_GUI 1
  # initialize text widgt for screen log
  grid [text .gUI_TXT -state disabled -width $::_GUI_NUM_LOG_COLUMNS \
          -height $::_GUI_NUM_LOG_LINES -wrap char]
  wm title . $::_APPTITLE
  
  set types {
    {"Image Files"      {.gif .png .ppm}	}
    {"Image Files"      {}        {GIFF PNG PPM}}
    {{GIF Files}        {.gif}        }
    {{GIF Files}        {}        GIFF}
    {{PNG Files}        {.png}        }
    {{PPM Files}        {.ppm}        }
  }
  # (note: log-file is unavailble untill score name is chosen)
  
  set fileList [tk_getOpenFile -multiple 1 -filetypes $types  \
                          -title "Please select image(s) with all score pages"]
  
  if { $fileList == "" } {
    set msg "No score-page image files selected.  Press Ok / <Enter> to close..."
    if { !$::_RUN_IN_GUI }  {
      SCREEN_MSG $msg;      gets stdin
    } else {
      tk_messageBox -type ok -title $::_APPTITLE -message $msg
      catch { destroy .gUI_TXT }; # dismiss log window; protect from manual close
    }
    return
  }
  SCREEN_MSG "Selected [llength $fileList] score-page image file(s): {$fileList}"
  set nameList [lmap filePath $fileList {file rootname [file tail $filePath]}]
  set commonPrefix [find_common_prefix_of_strings $nameList]
  ##SCREEN_MSG "Common prefix is: '$commonPrefix'"
  set scoreName [string trimright $commonPrefix "_-0123456789 \r\n"]; #"", NOT {}
  SCREEN_MSG "Chosen score name is: '$scoreName'"
  if { [catch {
    make_score_file $scoreName $fileList
    set status "Score template generation succeeded."
  } errText] } {
    SCREEN_MSG "* Error occurred: $errText"
    set status "Score template generation failed."
  }
  set msg "Press Ok / <Enter> to close..."
  if { !$::_RUN_IN_GUI }  {
    SCREEN_MSG "\n ======== $msg ========";    gets stdin
  } else {
    tk_messageBox -type ok -title $::_APPTITLE -message "$status\n\n$msg"
    catch { destroy .gUI_TXT }; # dismiss log window; protect from manual close
  }
  return
}
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
    ABORT $err
  }
  set tclExecResult [catch {
    set imgH [image create photo -file $imgPath -width $maxWidth]
    set wd [image width $imgH];  set ht [image height $imgH]
    set pixels [$imgH data];  # returns list of lists - rows * columns
  } execResult]
  if { $tclExecResult != 0 } {
    if { $loud == 1 }  {
      set err "-E- Cannot get pixel data of '$imgPath' ($execResult)"
      ABORT $err
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
  if { $wd <= 0 }  {
    ABORT "Zero width encountered while height=$ht ($descrForLog)"
  }
  if { $descrForLog != "" }  {
    LOG_MSG "-I- Actual size of $descrForLog is $wd*$ht (full: $fullWidth*$ht)"
  }
  return  1
}


proc choose_marker_color_sample_size {imgWidth imgHeight}  {
  set colorSampleSize [expr {($imgWidth < $imgHeight)? round($imgWidth  / 20) \
                                                     : round($imgHeight / 20)}]
  if { $colorSampleSize < $::MIN_COLOR_SAMPLE_SIZE }  {
    set colorSampleSize $::MIN_COLOR_SAMPLE_SIZE
  }
  set maxSampleXY [expr $colorSampleSize - 1]
  LOG_MSG "-D- Marker color value will be sampled in the area up to (0...$maxSampleXY, 0...$maxSampleXY) of $imgWidth*$imgHeight image"
  return  $colorSampleSize
}


# Returns the most frequent color in the upper quadrant of the image -
# the color for marking line boundaries in this image. Format - [list R G B].
# If not found, returns 0.
## Starts the search in 0..'minSampleSize', then grows the sample quadrant
##   until the frequency begins reducing - up to 0..'maxSampleSize'.
proc detect_page_marker_color {matrixOfPixelsRef \
                               minSampleSize maxSampleSize}  {
  upvar $matrixOfPixelsRef matrixOfPixels
  if { $minSampleSize <= 0 }  {
    ABORT "Invalid minSampleSize $minSampleSize; should be positive integer"
  }
  if { $maxSampleSize < $minSampleSize }  {
    ABORT "maxSampleSize < minSampleSize: ($maxSampleSize < $minSampleSize)"
  }
  # if { ($maxSampleSize - $minSampleSize) > 10 }  {;# implementation inefficient
  #   LOG_MSG "-W- maxSampleSize of $maxSampleSize is too large; set to [expr $minSampleSize + 10]"
  #   set maxSampleSize [expr $minSampleSize + 10]
  # }
  
  set pageMarkerRgbList [list]
  set colorCntDict [dict create]
  # first compute color-appearance frequences in 0...minSampleSize quadrant
  for {set row 0}  {$row < $minSampleSize}  {incr row 1}  {
    for {set col 0}  {$col < $minSampleSize}  {incr col 1}  {
      set rgbValStr [elem_list2d $matrixOfPixels $row $col]
      dict incr colorCntDict $rgbValStr 1
    }
  }
  _most_frequent_key_in_dict $colorCntDict maxColor1 maxCount1 freq1
  set maxFreq $freq1
  # grow the sample quadrant while frequency doesn't reduce
  ##  00 01 02  03
  ##  10 11 12  13
  ##  20 21 22  23
  ##            
  ##  30 31 32  33
  # increment the sample while frequency isn't decreased ($freq2 >= $freq1)
  for {set last $minSampleSize}  {$last < $maxSampleSize}  {incr last 1}  {
    # incorporate row #last and column #last into 'colorCntDict'
    for {set i 0}  {$i <= $last}  {incr i 1}  {
      set rgbValStr [elem_list2d $matrixOfPixels $last $i];    # 30 31 32 33
      dict incr colorCntDict $rgbValStr 1
      if { $i != $last }  {
        set rgbValStr [elem_list2d $matrixOfPixels $i $last];  # 03 13 23
        dict incr colorCntDict $rgbValStr 1
      }
    }
    _most_frequent_key_in_dict $colorCntDict maxColor2 maxCount2 freq2
    if { $freq2 > $maxFreq }  { set maxFreq $freq2 }
    if { $freq2 < (0.8*$maxFreq) }  { ;  # was: ($freq2 < $freq1)
      LOG_MSG "-D- Color-sample growing stopped at 0...$last;  frequency dropped $freq1 ==> $freq2 (colors: $maxColor1 -> $maxColor2)"
      LOG_MSG "-D- Color-counts at 0...$last: {$colorCntDict}"
      break };  # result = {maxColor1 maxCount1 freq1}
    set maxColor1 $maxColor2;   set maxCount1 $maxCount2;    set freq1 $freq2
  }
  if { $last == $maxSampleSize }  {
    LOG_MSG "-E- Color-sample of '$rgbValStr' is suspiciously large (at least 0...$last* 0...$last); could it be the background color?"
    return  0
  }
  set rgbList [decode_rgb $maxColor1]
  set size [expr $last - 1]
  LOG_MSG "-D- Chosen marker color '$rgbList';  sample-size: $size*$size  frequency: $freq1%"
  return  $rgbList
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
      set equ [expr {($::COLOR_CMP_APPROX == 0)?  \
                       [string equal -nocase  $rgbValStr $reqRgbStr] :  \
                       [equ_rgbstr_to_rgblist $rgbValStr $reqRgbList]}]
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
  } elseif { [llength $spans] == 1 } {
    LOG_MSG "-W- Found single span of $rgbDescr - something is wrong"
  } else {
    LOG_MSG "-W- Found no span(s) of $rgbDescr"
  }
  LOG_MSG "-D- Search for spans of $rgbDescr in $width*$height image took [expr [clock seconds] - $timeBegin] second(s)"
  set goodSpans [drop_narrow_spans $matrixOfPixels $width $height \
                                   $reqRgbList $spans]
  return  $goodSpans
}


# Filters out spans that are narrower than allowed.
# Min span-width is a fraction of image-width;
#     given by 'MIN_MARKER_COLOR_LINE_WIDTH_PRC'.
proc drop_narrow_spans {matrixOfPixels width height reqRgbList spanBeginsEnds}  {
  set timeBegin [clock seconds]
  set minColorSpanWidth \
              [expr {int($::MIN_MARKER_COLOR_LINE_WIDTH_PRC * $width / 100.0)}]
  set nSpans1 [llength $spanBeginsEnds]
  set reqRgbStr [encode_rgb $reqRgbList]
  set filteredSpanBeginsEnds [list]
  for {set i 0} {$i < $nSpans1} {incr i 1}  {
    lassign [lindex $spanBeginsEnds $i] y1 y2
    set spanDescr "color-span #$i/\[$y1...$y2\]"
    LOG_MSG "-D- Verifying width of $spanDescr"
    # find left- and right columns if the current span
    set spanLeftCol $width ;  # e,g, unknown
    set spanRightCol -1
    for {set row $y1}  {$row <= $y2}  {incr row 1}  {
      # update leftmost column
      for {set col 0}  {$col < $width}  {incr col 1}  {
        set rgbValStr [elem_list2d $matrixOfPixels $row $col]
        set equ [expr {($::COLOR_CMP_APPROX == 0)?  \
                         [string equal -nocase  $rgbValStr $reqRgbStr] :  \
                         [equ_rgbstr_to_rgblist $rgbValStr $reqRgbList]}]
        if { $equ }  { ; # span starts at #col
          if { $col < $spanLeftCol }  {
            set spanLeftCol $col
          }
          break;  # done with left column in this line
        }
      };#__END_OF__left_to_right_cycle_over_columns_in_a_span
      # update rightmost column
      for {set col [expr $width-1]}  {$col >= 0}  {incr col -1}  {
        set rgbValStr [elem_list2d $matrixOfPixels $row $col]
        set equ [expr {($::COLOR_CMP_APPROX == 0)?  \
                         [string equal -nocase  $rgbValStr $reqRgbStr] :  \
                         [equ_rgbstr_to_rgblist $rgbValStr $reqRgbList]}]
        if { $equ }  { ; # span ends at #col
          if { $col > $spanRightCol }  {
            set spanRightCol $col
          }
          break;  # done with right column in this line
        }
      };#__END_OF__right_to_left_cycle_over_columns_in_a_span
    };#__END_OF__cycle_over_rows_in_a_span
    set spanWidth [expr $spanRightCol - $spanLeftCol + 1]
    set wideEnough [expr $spanWidth >= $minColorSpanWidth]
    set msg [format \
          "Width of $spanDescr - %d - is %s threshold of %d pixel(s)" \
          $spanWidth [expr {($wideEnough)? "above":"below"}] $minColorSpanWidth]
    LOG_MSG "-D- $msg"
    if { $wideEnough }  {
      lappend filteredSpanBeginsEnds [list $y1 $y2];  # keep this span
    }
  };#__END_OF__cycle_over_spans
  LOG_MSG "-I- Width verification of color {$reqRgbList} spans on a page left [llength $filteredSpanBeginsEnds] span(s) out of [llength $spanBeginsEnds]"
  LOG_MSG "-D- Color-span width verification in $width*$height image took [expr [clock seconds] - $timeBegin] second(s)"
  return  $filteredSpanBeginsEnds
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
    if { $y12 < $y11 }  { ABORT "-E- Invalid span #$i: $y11...$y12 (in $descr)" }
    if { !($y21 > $y12) && ($y22 > $y12) }  { ABORT "-E- Overlapping spans #$i: $y11...$y12 and #[expr $i+1]: $y21...$y22 (in $descr)" }
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
    ABORT "-E- Invalid page index $iPage; should be 0...$maxPageIdx"
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
  puts $outChannel "const g_numLinesInStep = [dict get $scoreDict DefaultNumLinesInStep];  // how many lines to scroll in one step - 1...3"
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
proc equ_rgbstr {rgbStr1 rgbStr2}  {
  return  [equ_rgb  [decode_rgb $rgbStr1]  [decode_rgb $rgbStr2]]
}


# Returns 1 if the two (rgb) colors are _nearly_ equal, otherwise returns 0
proc equ_rgbstr_to_rgblist {rgbStr1 rgbList2}  {
  return  [equ_rgb  [decode_rgb $rgbStr1]  $rgbList2]
}


  # Returns 1 if the two (rgb) colors are _nearly_ equal, otherwise returns 0
proc equ_rgb {rgbList1 rgbList2}  {
  #### LOG_MSG "@@@@ {$rgbList1} {$rgbList2}"
  set thresholdPrc 1.0;  # relDiffPrc(250, 255) == 0.9900990099009901
  # unroll as much as possible - to improve performance
  lassign $rgbList1 r1 g1 b1
  lassign $rgbList2 r2 g2 b2
  if { ($r1 > 0) || ($r2 > 0) }  {
    set relDiffPrc [expr {100.0 * abs($r1 - $r2) / ($r1 + $r2)}]
    if { $relDiffPrc >= $thresholdPrc }  {
      return  0
    }
  }
  if { ($g1 > 0) || ($g2 > 0) }  {
    set relDiffPrc [expr {100.0 * abs($g1 - $g2) / ($g1 + $g2)}]
    if { $relDiffPrc >= $thresholdPrc }  {
      return  0
    }
  }
  if { ($b1 > 0) || ($b2 > 0) }  {
    set relDiffPrc [expr {100.0 * abs($b1 - $b2) / ($b1 + $b2)}]
    if { $relDiffPrc >= $thresholdPrc }  {
      return  0
    }
  }
  return  1
}



proc elem_list2d {listOfLists row col}  {
  set width [llength [lindex $listOfLists 0]]
  set height [llength $listOfLists]
  if { ($row < 0) || ($row >= $height) || ($col < 0) || ($col >= $width) }  {
    set err "-E- Invalid pixel index ($row $col); should be (0..[expr $height-1], 0..[expr $width-1])"
    ABORT $err
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
    ABORT $err
  }
  return  $outF
}


proc safe_close_outfile {outChannelRef} {
  upvar $outChannelRef outChannel
  if { ![string equal $outChannel "stdout"] } {
    close $outChannel
    set outChannel 0
  }
}


# _most_frequent_key_in_dict [dict create "a" 2  "b" 1  "c" 3] k c f;  # = c 3 50
proc _most_frequent_key_in_dict {keyToCntDict \
                           mostFreqKey cntOfMostFreqKey freqOfMostFreqKeyPrc}  {
  upvar $mostFreqKey      freqKey
  upvar $cntOfMostFreqKey maxCount
  upvar $freqOfMostFreqKeyPrc freq
  set freqKey ""
  set maxCount 0
  set totalCont 0
  dict for {key cnt} $keyToCntDict  {
    incr totalCont $cnt
    if { $cnt > $maxCount }  {
      set maxCount $cnt;      set freqKey $key
    }
  }
  set freq [expr {round(100.0 * $maxCount / $totalCont)}]
  return
}


# Returns list of names ordered by ALL numbers appearing after the common prefix
# Example 1: order_names_by_numeric_fields {a1 a10 a7b4 a3 a2}
# Example 2: order_names_by_numeric_fields {adc e bc}
# Example 3: order_names_by_numeric_fields {e3 ad3c e bc}
# Example 4: order_names_by_numeric_fields {e3 ad3c e3 3bc}
# Example 5: order_names_by_numeric_fields {ea3 ad3c e3 3bc}
proc order_names_by_numeric_fields {namesUnordered {logPriCB puts}}  {
  if { [llength $namesUnordered] == 1 }  {
    $logPriCB "-I- Single page in the score - no reordering needed"
    return  $namesUnordered
  }
  set abcOrder [lsort -unique -ascii -increasing $namesUnordered]
  set numEqual [expr [llength $namesUnordered] - [llength $abcOrder]]
  if { $numEqual > 0 } {
    ABORT "-E- Detected $numEqual non-unoque page name(s)"
  }
  
  set commonPrefix [find_common_prefix_of_strings $namesUnordered]
  set commonPrefixLength [llength $commonPrefix]
  $logPriCB "-D- Common prefix of all page-file names is '$commonPrefix'; length: $commonPrefixLength"
  
  # find all numbers that appear after the common prefix
  set nameToNumeric [dict create]
  set maxNumDigits 0;  # needed for further reformatting
  foreach name $namesUnordered  {
    set suffix [string range $name $commonPrefixLength end]
    set stringOfNumbers [regsub -all -- {[^0-9]+} $suffix " "]
    set numbers [split [string trim $stringOfNumbers]]
    if { [llength $numbers] == 0 }  {
      $logPriCB "-W- Page file name '$name' lacks numeric field; will order the pages alphabetically"
      $logPriCB "-I- Ordered list of score page images: {$abcOrder}"
      return  $abcOrder
    }
    $logPriCB "'$name' =unprocessed=> {$numbers} ('$stringOfNumbers')"
    dict set nameToNumeric $name $numbers
    foreach numStr $numbers {
      if { $maxNumDigits < [string length $numStr] }  {
        set maxNumDigits   [string length $numStr]
      }
    }
  }
  # replace lists of numbers by strings with all numbers normalized to max length
  set nameToNormalized [dict create]
  dict for {name numLiist} $nameToNumeric  {
    set normList [list]
    foreach num $numLiist { lappend normList [format "%0*d" $maxNumDigits $num] }
    dict set nameToNormalized $name [join $normList " "]
  }
  $logPriCB "-D- Normalized numeric fields in page file names: {$nameToNormalized}"
  # check for repetitions; if all unique, can map from numeric-fields to names
  set allNumericFieldsUnsorted [dict values $nameToNormalized]
  set allNumericFieldsSorted [lsort -unique -ascii $allNumericFieldsUnsorted]
  $logPriCB "-D- Normalized numeric fields ordered: {$allNumericFieldsSorted}" 
  set numEqual [expr \
       [llength $allNumericFieldsUnsorted] - [llength $allNumericFieldsSorted]]
  if { $numEqual > 0 } {
    $logPriCB "-W- Detected $numEqual page names with non-unique numeric fields; will order the pages alphabetically"
    $logPriCB "-I- Ordered list of score page images: {$abcOrder}"
    return  $abcOrder
  }
  # build a reversed (normalized-numeric-field-as-srring :: name) mapping
  set numToName [dict create];  # normalized-numeric-field-as-srring :: name
  dict for {name numStr} $nameToNormalized  { dict set numToName $numStr $name }
  # assemble the list of names ordered by normalized numeric fields
  set namesOrdered [list]
  foreach numStr $allNumericFieldsSorted {
    lappend namesOrdered [dict get $numToName $numStr]
  }
  $logPriCB "-I- Ordered list of score page images: {$namesOrdered}"
  return  $namesOrdered
}


proc find_common_prefix_of_strings {stringList}  {
  set minLength 9999
  foreach name $stringList  {
    if { $minLength < [string length $name] }  {
      set minLength [string length $name]
    }
  }
  set commonPrefixLength -1
  for {set i 0}  {($i < $minLength) && ($commonPrefixLength < 0)}  {incr i 1}  {
    set chI [string index [lindex $stringList 0] $i];  # to compare with rest
    foreach name $stringList  {
      if { $chI != [string index $name $i] }  {
        set commonPrefixLength $i;  # signals end of search
        break
      }
    }
  }
  if { $commonPrefixLength < 0 }  {
    set commonPrefixLength $minLength;  # TODO: is it OK?
  }
  set commonPrefix [string range  [lindex $stringList 0]  \
                      0  [expr $commonPrefixLength-1]]
  return  $commonPrefix
}


######### Begin: Score-Maker logging utils ######################################
proc LOG_MSG {msg}  {
  if { $::LOG_F == 0 }  {
    LOG_OPEN
  }
  if { ($::LOG_DEBUG == 0) && [string match "-D-*" $msg] }  { return }
  puts  $::LOG_F  "$msg"
}

proc LOG_OPEN {}  {
  if { $::SCORE_NAME == "" }  {
    ABORT "Missing score name - cannot init log file" }
  if { $::OUT_DIR == "" }  {
    ABORT "Missing output directory name - cannot init log file" }
  set logPath [file join $::OUT_DIR \
                         [format $::LOGFILE_NAME_PATTERN $::SCORE_NAME]]
  set ::LOG_F [safe_open_outfile $logPath]
  set descr "Log file for score '$::SCORE_NAME'"
  SCREEN_MSG "$descr goes into '$logPath'"
  puts $::LOG_F "$descr; debug messages are [expr {($::LOG_DEBUG != 0)? {included} : {not included}}]"
}

proc LOG_CLOSE {}  { safe_close_outfile ::LOG_F }


proc SCREEN_MSG {msg}  {
  if { !$::_RUN_IN_GUI }  {
    puts stdout "$msg";  return
  }
  set numlines [lindex [split [.gUI_TXT index "end - 1 line"] "."] 0]
  .gUI_TXT configure -state normal
  if { $numlines==$::_GUI_NUM_LOG_LINES }  {
    .gUI_TXT delete 1.0 2.0
  }
  if { [.gUI_TXT index "end-1c"]!="1.0" }  {
    .gUI_TXT insert end "\n"
  }
  .gUI_TXT insert end "$msg"
  update idletasks;  # flush the output into the log window
  .gUI_TXT configure -state disabled
  return
}


proc ABORT {msg}  {
  LOG_MSG $msg;  LOG_CLOSE;  error $msg
}
######### End: Score-Maker logging utils ######################################


################################################################################
proc init_header_footer_dict {}  {
  set hfd [dict create]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_scoreLines  [list  \
{/* Images are first resized to equal width, then measured:}  \
{ * set IMCONVERT {C:\Program Files\Imagemagick_711_3\convert.exe}}  \
{ * #### exec $IMCONVERT --version}  \
{ * foreach f [glob {TMP/*.jpg}]  {$IMCONVERT $f -resize 800x -quality 92 [file tail $f]}}  \
{ * !Having page-width close to screen resolution makes fading alerts visible!}  \
{ * More possible enhancements: widen by 1.5, turn gray into black: }  \
{ * foreach f [glob {*.jpg}]  {$IMCONVERT $f  -resize 150%x100%  -resize 1050x  -black-threshold 80% -quality 92 [file join "ENH" [file tail $f]]}}  \
{****************************************************************************/} \
{}  \
{}  \
{// g_scoreLines: score-lines' locations (page + vertical coord.) and durations} \
{var g_scoreLines = [}  \
                                  ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_scoreLines  [list  \
{];}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_pageImgPathsMap  [list  \
{/* g_pageImgPathsMap: file-paths of score pages' images}  \
{ * Image paths should be relative to the location of score files */}  \
{var g_pageImgPathsMap = new Map([}
                                ]
  #------------------------------------------------------------------------#
  dict set hfd FOOT_pageImgPathsMap  [list  \
{]);}  \
                                ]
  #------------------------------------------------------------------------#
  dict set hfd HEAD_playedLinesStraight  [list  \
{/* g_linePlayOrder: specifies play order of the score-lines with actual times} \
{ * Example of line play order spec: straight - without repetitions}  \
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

