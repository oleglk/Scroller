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



# Reads data from 'imgPath' and puts it into 'listOfPixels'
#                                       as list of lists - rows * columns.
# (First index is row, second index is column)
# On success returns list {height width}, on error returns 0.
# (Don't cause printing of returned value on the screen - the console gets stuck)
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
      puts "-W- Image '$imgPath' has no pixels"
    } else {
      puts "-I- Success reading image '$imgPath' into array of [llength $pixels]*[llength [lindex $pixels 0]]"
    }
  }
  return  [list [llength $pixels]  [llength [lindex $pixels 0]]]
}


# Returns list of pairs {y1 y2} -
#  - each pair is {upper lower} coordinates of spans of required color
proc find_vertical_spans_of_color_in_pixel_matrix {matrixOfPixels reqRgbList
                                                   {ignoreUpToXY 0}}  {
  set width [llength [lindex $matrixOfPixels 0]]
  set height [llength $matrixOfPixels]
  set rgbDescr [format "rgb(%02X%02X%02X)" {*}$reqRgbList]
  puts "-I- Begin searching for spans of $rgbDescr in $width*$height image"

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
        puts "-D- Matched ($rgbValStr) at row=$row, col=$col"
        set foundInCol $col
        if { $spanTop < 0 }  { ;  # new span started
          set spanTop $row
          puts "-D- Span #[llength $spans] begins at $row; (column: $col)"
        }
        break;  # at least one pixel matches == we are inside some span
      }
    };#__ end of cycle over columns in one row
    # if no pixel matched our color in the whole row == we are outside any span
    if { ($spanTop >= 0) && ($foundInCol < 0) }  { ;  # old span ended
      puts "-D- Span #[llength $spans] ends at [expr $row-1]"
      lappend spans [list $spanTop [expr $row-1]]
      set spanTop -1;  # prepare for the next span
    }
  };#__ end of cycle over rows
  # process the last span in case it reached the bottom row
  if { $spanTop >= 0 }  { ;  # last span ends at the bottom
    puts "-D- Span #[llength $spans] ends at [expr $height-1]"
    lappend spans [list $spanTop [expr $height-1]]
    set spanTop -1;  # just cleanup
  }
  if { [llength $spans] > 0 }  {
    puts "-I- Found [llength $spans] span(s) of $rgbDescr - between Y=[lindex [lindex $spans 0] 0] and Y=[lindex [lindex $spans end] 1]"
  } else {
    puts "-W- Found no span(s) of $rgbDescr"
  }
  return  $spans
}


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
  #### puts "@@@@ {$rgbList1} {$rgbList2}"
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
    set err "-E- Invalid pixel index ($row $col); should be (0..[expr $row-1], 0..[expr $col-1])"
    error $err
  }
  return  [lindex [lindex $listOfLists $row] $col]
}


# "#00A1B2" => {0 161 178}.  On error returns 0
proc decode_rgb {pixelStr}  {
  if { 0 == [regexp -nocase                                               \
               {#([0-9A-F][0-9A-F])([0-9A-F][0-9A-F])([0-9A-F][0-9A-F])}  \
               $pixelStr all hR hG hB] }  {
    return  0
  }
  scan  "$hR $hG $hB"  {%x %x %x}  dR dG dB
  return  [list $dR $dG $dB]
}

################################################################################
# proc read_pixels_in_chunks {imgPath {priErr 1}}  {
#   if { ![file exists $imgPath] }  {
#     ok_err_msg "-E- Inexistent input file '$imgPath'"
#     return  0
#   }
#   ## read data with 'convert <PATH> txt:-'
#   ####### TODO: resolve $::IMCONVERT vs {$::IMCONVERT}
#   set imCmd [format {|%s  %s -quiet txt:-} \
#                       $::IMCONVERT $imgPath]
#   set tclExecResult [catch {
#     # Open a pipe to the program
#     #   set io [open "|identify -format \"%w %h\" $fullPath" r]
#     set io [eval [list open $imCmd r]]
#     set buf [read $io];	# Get the full reply
#     close $io
#   } execResult]
#   if { $tclExecResult != 0 } {
#     if { $priErr == 1 }  {
#       ok_err_msg "$execResult!"
#       ok_err_msg "Cannot get pixel data of '$imgPath'"
#     }
#     return  0
#   }
#   # # split into list with element per a pixel
#   # set asOneLine [join $buf " "];  # data read into arbitrary chunks
#   # set pixels [regexp -all -inline \
#   #       {\d+,\d+:\s+\([0-9.,]+\)\s+#[0-9A-F]+\s+gray\([0-9.]+%?\)} \
#   #       $asOneLine]

#   # return  $pixels
#   return  buf
# }


##### Complete example: #########################################################
## read_image_pixels_into_array  Scores/Marked/Papirossen_mk.gif  2000  pixels
## set spans [find_vertical_spans_of_color_in_pixel_matrix $pixels {0xFF 0xFF 0x00} 30]
  
