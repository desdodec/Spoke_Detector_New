// Spoke Detector — background-aware visual contrast adapter.
// This changes presentation only (stroke/opacity/colour contrast), never sensor-derived geometry.
(() => {
  state.contrastMode = state.contrastMode || 'auto';

  function srgb(v){
    v/=255;
    return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  }
  function lum(hex){
    const [r,g,b]=hexRgb(hex);
    return 0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(b);
  }
  function contrast(a,b){
    const A=lum(a),B=lum(b),hi=Math.max(A,B),lo=Math.min(A,B);
    return (hi+.05)/(lo+.05);
  }
  function hexFromRgb(rgb){
    return '#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }
  function boostAgainstLight(hex,bg){
    if(!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    if(contrast(hex,bg)>=2.35) return hex;
    const rgb=hexRgb(hex);
    // Preserve hue character while progressively pulling toward a deep neutral ink.
    let out=rgb;
    for(let i=1;i<=8;i++){
      const t=i*.07;
      out=rgb.map((v,k)=>lerp(v,[22,27,34][k],t));
      const h=hexFromRgb(out);
      if(contrast(h,bg)>=2.35) return h;
    }
    return hexFromRgb(out);
  }

  function adaptArtboard(){
    const svg=$('artboard');
    if(!svg || !state.time.length || state.contrastMode==='original') return;
    const bg=state.backgroundColor || '#07090d';
    const light=lum(bg)>0.5;
    if(!light) return;

    svg.querySelectorAll('path,line,circle,polyline,polygon').forEach(el=>{
      if(el.closest('defs')) return;
      const opacity=parseFloat(el.getAttribute('opacity')||'1');
      if(Number.isFinite(opacity) && opacity<.44) el.setAttribute('opacity',String(Math.min(1,.44+opacity*.42)));

      const sw=parseFloat(el.getAttribute('stroke-width')||'0');
      if(sw>0) el.setAttribute('stroke-width',String(Math.min(8,sw*1.18)));

      const stroke=el.getAttribute('stroke');
      if(stroke && /^#[0-9a-f]{6}$/i.test(stroke)) el.setAttribute('stroke',boostAgainstLight(stroke,bg));
      const fill=el.getAttribute('fill');
      if(fill && /^#[0-9a-f]{6}$/i.test(fill) && fill.toLowerCase()!=='#ffffff00') el.setAttribute('fill',boostAgainstLight(fill,bg));

      // Dark-ground glow becomes muddy on paper/light garments.
      const filter=el.getAttribute('filter');
      if(filter && filter.includes('glow')) el.removeAttribute('filter');
    });

    // Adapt palette gradient stops used by hero/median strokes.
    svg.querySelectorAll('linearGradient#paletteLine stop').forEach(stop=>{
      const c=stop.getAttribute('stop-color');
      if(c && /^#[0-9a-f]{6}$/i.test(c)) stop.setAttribute('stop-color',boostAgainstLight(c,bg));
    });
  }

  const previousRender=render;
  render=function(){
    previousRender();
    adaptArtboard();
  };

  function installControl(){
    const bg=document.querySelector('.background-control');
    if(!bg) return;
    const row=document.createElement('label');
    row.className='select-row contrast-mode-row';
    row.innerHTML=`<span>Light-background contrast</span><select id="contrastMode"><option value="auto" selected>Auto — optimise for the background</option><option value="original">Original palette / styling</option></select>`;
    bg.appendChild(row);
    $('contrastMode').addEventListener('change',e=>{state.contrastMode=e.target.value;if(state.time.length)render();});
  }

  installControl();
})();
