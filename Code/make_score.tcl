# make_score.tcl
################################################################################

set SCRIPT_DIR [file normalize [file dirname [info script]]]

# set ipap [image create photo -file Scores/INP/Papirossen.gif]
# set wd [image width $ipap]
# set ht [image height $ipap]
# set pixels [$ipap data];   # abnormally slow with 1170*800


proc read_pixels_in_chunks {imgPath {priErr 1}}  {
  if { ![file exists $imgPath] }  {
    ok_err_msg "-E- Inexistent input file '$imgPath'"
    return  0
  }
  ## read data with 'convert <PATH> txt:-'
  ####### TODO: resolve $::IMCONVERT vs {$::IMCONVERT}
  set imCmd [format {|%s  %s -quiet txt:-} \
                      $::IMCONVERT $imgPath]
  set tclExecResult [catch {
    # Open a pipe to the program
    #   set io [open "|identify -format \"%w %h\" $fullPath" r]
    set io [eval [list open $imCmd r]]
    set buf [read $io];	# Get the full reply
    close $io
  } execResult]
  if { $tclExecResult != 0 } {
    if { $priErr == 1 }  {
      ok_err_msg "$execResult!"
      ok_err_msg "Cannot get pixel data of '$imgPath'"
    }
    return  0
  }
  # # split into list with element per a pixel
  # set asOneLine [join $buf " "];  # data read into arbitrary chunks
  # set pixels [regexp -all -inline \
  #       {\d+,\d+:\s+\([0-9.,]+\)\s+#[0-9A-F]+\s+gray\([0-9.]+%?\)} \
  #       $asOneLine]

  # return  $pixels
  return  buf
}
