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

# Reads data from 'imgPath' and puts it into 'listOfPixels'
#                                       as list of lists - rows * columns.
# (First index is row, second index is column)
# On success returns list {height width}, on error returns 0.
# (Don't cause printing of returned value on the screen - the console gets stuck)
proc read_image_pixels_into_array {imgPath maxWidth listOfPixels {loud 1}}  {
  upvar $listOfPixels pixels
  if { ![file exists $imgPath] }  {
    if { $loud == 1 }  {
      puts "-E- Inexistent input file '$imgPath'"
    }
    return  0
  }
  set tclExecResult [catch {
    set imgH [image create photo -file $imgPath -width $maxWidth]
    set wd [image width $imgH];  set ht [image height $imgH]
    set pixels [$imgH data];  # returns list of lists - rows * columns
  } execResult]
  if { $tclExecResult != 0 } {
    if { $loud == 1 }  {
      puts "-E- $execResult!"
      puts "-E- Cannot get pixel data of '$imgPath'"
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


# Returns (list) 'width' * list-of-y1,y2 -
#  - per-column list of {upper lower} coordinates of spans of required color
proc find_vertical_spans_of_color_in_pixel_matrix {matrixOfPixels reqRgbList
                                                   {ignoreUpToXY 0}}  {
  set width [llength [lindex $matrixOfPixels 0]]
  set height [llength $matrixOfPixels]
  set spans [list]
  for {set col 0}  {$col < $width}  {inctr col 1}  {
    set oneColSpans [list]
    set spanTop -1;  # == outside of any span
    set column [lindex $matrixOfPixels $col];  # a shortcut
    for {set row 0}  {$row < $height}  {incr row 1}  {
      if { ($col < $ignoreUpToXY) && ($row < $ignoreUpToXY) }  { continue }
      set rgbValStr [lindex $column $row]
      #lassign [decode_rgb $rgbValStr] rV gV bV
      set equ [equ_rgb [decode_rgb $rgbValStr]  $reqRgbList]
      if { $equ && ($spanTop < 0) }  { ;  # new span started
        set spanTop $row
      }
      elseif { !$equ && ($spanTop >= 0) }  { ;  # old span ended
        lappend oneColSpans [list $spanTop [expr $row-1]]
        set spanTop -1;  # prepare for the next span
      }
    }
    if { $spanTop >= 0 }  { ;  # last span ends at the bottom
      lappend oneColSpans [list $spanTop [expr $height-1]]
      set spanTop -1;  # just cleanup
    }
    if { 0 != [llength $oneColSpans] }  {
      # TODO: append
    }
  }
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
