// ============================================================
// DIMENSIONS SYSTEM (V6)
// Fake 3D preview renders for class preview panel
// ============================================================

window.Dimensions = (() => {
  function previewCubeSVG() {
    // V6: animated CSS 3D cube — rotates on vertical axis (4 sides visible, no top/bottom),
    // with a slow bounce. Colors and timing live in SHAPES_V6.css under .cube3d*.
    return '<div class="cube3d-wrap"><div class="cube3d-bounce"><div class="cube3d">'
      +'<div class="face front"></div><div class="face right"></div><div class="face back"></div><div class="face left"></div>'
      +'</div></div></div>';
  }

  return { previewCubeSVG };
})();
