// Spoke Detector — editable artwork background colour.
// The selected colour is part of the artwork state and therefore appears in SVG/PNG exports.
(() => {
  const PRESETS = [
    {name:'Ink', value:'#07090d'},
    {name:'Navy', value:'#111827'},
    {name:'Forest', value:'#11221b'},
    {name:'Oxblood', value:'#2a1118'},
    {name:'Paper', value:'#f3efe7'},
    {name:'White', value:'#ffffff'},
  ];

  state.backgroundColor = state.backgroundColor || (state.darkGround ? '#07090d' : '#f3efe7');

  function luminance(hex){
    const [r,g,b]=hexRgb(hex).map(v=>{
      const x=v/255;
      return x<=0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055,2.4);
    });
    return 0.2126*r+0.7152*g+0.0722*b;
  }

  function syncContrast(){
    state.darkGround = luminance(state.backgroundColor) < 0.42;
    const legacy=$('darkGround');
    if(legacy) legacy.checked=state.darkGround;
  }

  syncContrast();

  // Replace the old two-state dark/light artboard with an explicit solid background colour.
  baseArt = function(){
    const svg=$('artboard');
    svg.innerHTML='';
    addDefs(svg);
    svg.appendChild(svgEl('rect',{width:1200,height:1200,fill:state.backgroundColor,'data-artboard-background':'true'}));
    return svg;
  };

  function updateEmptyArtboard(){
    if(state.time.length) return;
    const svg=$('artboard');
    if(!svg) return;
    const bg=[...svg.children].find(el=>el.tagName?.toLowerCase()==='rect' && el.getAttribute('width')==='1200' && el.getAttribute('height')==='1200');
    if(bg) bg.setAttribute('fill',state.backgroundColor);
  }

  function setBackground(value){
    state.backgroundColor=value;
    syncContrast();
    const picker=$('artworkBackground');
    if(picker && picker.value.toLowerCase()!==value.toLowerCase()) picker.value=value;
    document.querySelectorAll('.background-preset').forEach(b=>b.classList.toggle('active',b.dataset.color.toLowerCase()===value.toLowerCase()));
    if(state.time.length) render(); else updateEmptyArtboard();
  }

  function installControl(){
    const legacy=$('darkGround');
    if(!legacy) return;
    const legacyRow=legacy.closest('label');
    if(legacyRow) legacyRow.style.display='none';

    const wrap=document.createElement('div');
    wrap.className='background-control';
    wrap.innerHTML=`
      <div class="background-control-head"><span>Artwork background</span><input id="artworkBackground" type="color" value="${state.backgroundColor}" aria-label="Artwork background colour" /></div>
      <div class="background-presets">${PRESETS.map(p=>`<button type="button" class="background-preset${p.value.toLowerCase()===state.backgroundColor.toLowerCase()?' active':''}" data-color="${p.value}" title="${p.name}" aria-label="${p.name} background"><i style="background:${p.value}"></i><span>${p.name}</span></button>`).join('')}</div>
      <p class="helper-text">This colour is part of the artwork and is included in SVG and PNG exports. Text contrast adjusts automatically.</p>`;
    if(legacyRow) legacyRow.parentNode.insertBefore(wrap,legacyRow);

    $('artworkBackground').addEventListener('input',e=>setBackground(e.target.value));
    wrap.querySelectorAll('.background-preset').forEach(b=>b.addEventListener('click',()=>setBackground(b.dataset.color)));
  }

  const style=document.createElement('style');
  style.textContent=`
    .background-control{border-top:1px solid #151d27;margin-top:15px;padding-top:13px}
    .background-control-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:#aeb8c5;margin-bottom:10px}
    #artworkBackground{width:58px;height:34px;border:1px solid #2b3948;border-radius:8px;padding:2px;background:#0b1016;cursor:pointer}
    .background-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .background-preset{display:flex;align-items:center;gap:6px;border:1px solid #253241;border-radius:8px;background:#0b1016;color:#8795a5;padding:6px;cursor:pointer;font:500 9px Inter,sans-serif;text-align:left}
    .background-preset:hover{border-color:#43566c;color:#c9d3dd}.background-preset.active{border-color:#7f9fbe;color:#e8eef4;box-shadow:0 0 0 1px #7f9fbe33 inset}
    .background-preset i{display:block;width:16px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1px #ffffff28;flex:0 0 auto}
  `;
  document.head.appendChild(style);
  installControl();
  updateEmptyArtboard();
})();
