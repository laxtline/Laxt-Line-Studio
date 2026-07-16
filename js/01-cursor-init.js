/* =====================================================================
   LAXTLINE — js/01-cursor-init.js   (runs first, near top of <body>)
   ---------------------------------------------------------------------
   PURPOSE: create the two custom-cursor elements (the small dot and the
   trailing ring) ONLY on desktop / mouse devices.

   WHY here & why document.write: on touch phones the cursor uses
   mix-blend-mode which can darken the screen, so we never insert it
   there. It is written this early so the elements exist before
   js/02-interactions.js looks them up with getElementById.
   ===================================================================== */

// Insert cursor elements ONLY on non-touch devices — prevents mix-blend-mode darkening on mobile
if(!('ontouchstart' in window) && navigator.maxTouchPoints === 0){
  document.write('<div class="cursor" id="cursor"></div><div class="cursor-follower" id="cursorFollower"></div>');
}
