// ============================================================
// DIMENSIONS SYSTEM (V6)
// Fake 3D preview renders for class preview panel
// ============================================================
window.Dimensions = (() => {
  function previewCubeSVG(baseColor='#ff8c2a'){
    const front = baseColor;
    const top = '#ffb15a';
    const left = '#cc6f20';
    const right = '#b85f18';
    return (
      '<div class="preview-cube-wrap" aria-hidden="true">'
      + '<svg class="preview-cube-svg" width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="Rotating orange cube preview">'
      +   '<defs>'
      +     '<linearGradient id="cubeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">'
      +       '<stop offset="0%" stop-color="rgba(255,255,255,0.38)"/>'
      +       '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>'
      +     '</linearGradient>'
      +   '</defs>'
      +   '<g class="preview-cube-bounce">'
      +     '<ellipse class="preview-cube-shadow" cx="66" cy="108" rx="28" ry="8"></ellipse>'
      +     '<g class="preview-cube-spin">'
      +       '<polygon points="66,18 98,36 66,54 34,36" fill="'+top+'" stroke="rgba(255,255,255,0.92)" stroke-width="2" stroke-linejoin="round"/>'
      +       '<polygon points="34,36 66,54 66,92 34,74" fill="'+left+'" stroke="rgba(255,255,255,0.92)" stroke-width="2" stroke-linejoin="round"/>'
      +       '<polygon points="66,54 98,36 98,74 66,92" fill="'+right+'" stroke="rgba(255,255,255,0.92)" stroke-width="2" stroke-linejoin="round"/>'
      +       '<polygon points="66,54 98,36 66,18 34,36" fill="'+front+'" fill-opacity="0.08" stroke="none"/>'
      +       '<path d="M66 22 L89 35" stroke="url(#cubeGlowGrad)" stroke-width="3" stroke-linecap="round" opacity="0.65"/>'
      +       '<path d="M39 37 L66 52" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-linecap="round"/>'
      +       '<path d="M93 37 L66 52" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-linecap="round"/>'
      +       '<path d="M66 54 L66 92" stroke="rgba(255,255,255,0.16)" stroke-width="1.2" stroke-linecap="round"/>'
      +     '</g>'
      +   '</g>'
      + '</svg>'
      + '</div>'
    );
  }

  return { previewCubeSVG };
})();