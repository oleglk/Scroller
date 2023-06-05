# assemble.tcl - merges Scroller source-code files into one - for delivery.

set appName           "Musical Score Scroller"
set assemblyFileName  "[regsub -all  " "  $appName  "_"].js"
set assemblyDir       "bin"

set srcFileOrderInAssembly {
  "ModalDialog.js"
  "ScrollerCommonUtils.js"
  "PlayOrder.js"
  "ScoreImgLayout.js"
  "img_scroll.js"
}
################################################################################

set SCRIPT_DIR [file normalize [file dirname [info script]]]


################################################################################
proc concat_files {inPathList outPath {separatorPrefix ""}}  {
  set out [open $outPath w]
  fconfigure $out -translation binary
  if { $separatorPrefix != "" }  {
    puts $out "$separatorPrefix ====== $::appName (single-file assembly of all sources) ======"
    puts $out "$separatorPrefix         (C) Oleg Kosyakovsky   (Haifa  Israel  2023)"
    puts $out "";      puts $out ""
  }
  foreach fname $inPathList  {
    set fPath [file normalize $fname]
    set in [open $fname]
    fconfigure $in -translation binary
    if { $separatorPrefix != "" }  {
      puts $out "";      puts $out ""
      puts $out "$separatorPrefix (concatenated) ...... BEGIN: source file '$fname' ......."
      puts $out "";      puts $out ""
    }
    fcopy $in $out
    if { $separatorPrefix != "" }  {
      puts $out "";      puts $out ""
      puts $out "$separatorPrefix (concatenated) ...... END:   source file '$fname' ......."
    }
    close $in
  }
  close $out
}
################################################################################

set inPathList [list]
foreach f $srcFileOrderInAssembly  {
  lappend inPathList [file join  $SCRIPT_DIR  ".."  "Code"  $f]
}

foreach p $inPathList  {
  if { ![file exists $p] }  {
    error "Missing $appName source file '$p'"
  }
}

file mkdir -p $assemblyDir

set outPath [file join  $SCRIPT_DIR  ".."  $assemblyDir  $assemblyFileName]
if { [file exists $outPath] }  {
  file rename -force --  $outPath  "$outPath.OLD"
}

concat_files  $inPathList  $outPath  "//"
if { ! [file exists $outPath] }  {
  error "Creation of assembly for $appName failed"
} else {
  puts "Creation of assembly for $appName succeeded; path: '$outPath'"
}

