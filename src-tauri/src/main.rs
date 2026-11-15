// Desktop entry point; the app itself lives in lib.rs so Android can load it as a library.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    yike_focus_timer_lib::run()
}
