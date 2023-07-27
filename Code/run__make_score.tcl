# run__make_score.tcl
################################################################################

set SCRIPT_DIR [file normalize [file dirname [info script]]]

source [file join $SCRIPT_DIR "make_score.tcl"]

gui_start
exit 0

