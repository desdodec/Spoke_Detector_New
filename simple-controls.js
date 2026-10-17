// Spoke Detector — simple participant-friendly controls for Motion Silks.
// The recording keeps authorship of the form; ordinary users get a few obvious
// presentation controls rather than low-level rendering parameters.
(() => {
  const STYLE_ID='silks';
  const clamp01=v=>Math.max(0,Math.min(1,v));
  const lerpLocal=(a,b,t)=>a+(b-a)*clamp01(t);

  state.simpleSilkFullness ??= 50;
  state.simpleSilkDrama ??= 50;
  state.simpleSilkGlow ??= 50;

  function mapSimpleControls(){
    const fullness=clamp01(state.simpleSilkFullness/100);
    const drama=clamp01(state.simpleSilkDrama/100);
    const glow=clamp01(state.simpleSilkGlow/100);

    // Stronger public ranges than the old trims, but still centred on the data-authored baseline.
    state.silkThickness=lerpLocal(72,138,fullness);
    state.silkFibreDensity=lerpLocal(72,132,fullness);

    state.silkRipple=lerpLocal(72,138,drama);
    state.silkFray=lerpLocal(55,148,drama);
    state.complexity=Math.round(lerpLocal(42,96,drama));

    state.silkBloom=lerpLocal(52,150,glow);
  }

  const hiddenIds=['density','strokeWidth','glow','complexity','symmetry','showSignature'];

  function setLegacyVisibility(showLegacy){
    hiddenIds.forEach(id=>{
      const el=document.getElementById(id);
      const row=el?.closest('label');
      if(row) row.style.display=showLegacy?'':'none';
    });
    const variation=document.getElementById('variation');
    if(variation) variation.style.display=showLegacy?'':'none';
    const oldSilk=document.getElementById('silkMaterialControls');
    if(oldSilk) oldSilk.style.display='none';
    const genericColour=document.getElementById('colorMode');
    const genericColourRow=genericColour?.closest('label');
    if(genericColourRow) genericColourRow.style.display=showLegacy?'':'none';
  }

  function installSimpleControls(){
    if(document.getElementById('simpleSilkControls')) return;
    const variation=document.getElementById('variation');
    const section=variation?.closest('.panel-section');
    if(!section) return;

    const wrap=document.createElement('div');
    wrap.id='simpleSilkControls';
    wrap.className='simple-silk-controls';
    wrap.innerHTML=`
      <div class="simple-silk-head">
        <strong>Shape & finish</strong>
        <span>Your recording creates the form. These controls only change how boldly that form is presented.</span>
      </div>

      <label class="select-row simple-silk-colour-flow">
        <span>Colour flow</span>
        <select id="simpleSilkColourMode">
          <option value="hybrid">Rich mix</option>
          <option value="time-spectrum">Flow around the walk</option>
          <option value="ribbon-spectrum">Flow across the ribbon</option>
          <option value="journey-spectrum">Different journey ranges</option>
          <option value="journey-duo">Two-colour journeys</option>
        </select>
      </label>

      <label class="control-row simple-control-row">
        <div><span>Ribbon fullness</span><output id="simpleSilkFullnessOut">${Math.round(state.simpleSilkFullness)}%</output></div>
        <input id="simpleSilkFullness" type="range" min="0" max="100" step="1" value="${state.simpleSilkFullness}" />
        <small>Fine and airy ↔ full and substantial</small>
      </label>

      <label class="control-row simple-control-row">
        <div><span>Movement drama</span><output id="simpleSilkDramaOut">${Math.round(state.simpleSilkDrama)}%</output></div>
        <input id="simpleSilkDrama" type="range" min="0" max="100" step="1" value="${state.simpleSilkDrama}" />
        <small>Calm and smooth ↔ expressive and textured</small>
      </label>

      <label class="control-row simple-control-row">
        <div><span>Glow / softness</span><output id="simpleSilkGlowOut">${Math.round(state.simpleSilkGlow)}%</output></div>
        <input id="simpleSilkGlow" type="range" min="0" max="100" step="1" value="${state.simpleSilkGlow}" />
        <small>Crisp ↔ luminous</small>
      </label>

      <div class="simple-preset-row">
        <button type="button" class="simple-preset" data-preset="delicate">Delicate</button>
        <button type="button" class="simple-preset active" data-preset="balanced">Balanced</button>
        <button type="button" class="simple-preset" data-preset="bold">Bold</button>
      </div>`;

    // Mount next to the old technical block/variation button. This is guaranteed to be
    // in the same parent; the previous implementation incorrectly targeted the nested
    // background control and could throw NotFoundError before the panel appeared.
    const oldSilk=document.getElementById('silkMaterialControls');
    const anchor=oldSilk||variation;
    anchor.parentNode.insertBefore(wrap,anchor);

    const colour=document.getElementById('simpleSilkColourMode');
    colour.value=state.silkColourMode||'hybrid';
    colour.addEventListener('change',e=>{state.silkColourMode=e.target.value;render();});

    const bind=(id,stateKey,outId)=>{
      const input=document.getElementById(id),out=document.getElementById(outId);
      input.addEventListener('input',e=>{
        state[stateKey]=+e.target.value;
        out.textContent=`${Math.round(state[stateKey])}%`;
        document.querySelectorAll('.simple-preset').forEach(b=>b.classList.remove('active'));
        mapSimpleControls();
        render();
      });
    };
    bind('simpleSilkFullness','simpleSilkFullness','simpleSilkFullnessOut');
    bind('simpleSilkDrama','simpleSilkDrama','simpleSilkDramaOut');
    bind('simpleSilkGlow','simpleSilkGlow','simpleSilkGlowOut');

    const PRESETS={
      delicate:{fullness:20,drama:22,glow:28},
      balanced:{fullness:50,drama:50,glow:50},
      bold:{fullness:86,drama:84,glow:82}
    };
    wrap.querySelectorAll('.simple-preset').forEach(btn=>btn.addEventListener('click',()=>{
      const p=PRESETS[btn.dataset.preset];
      state.simpleSilkFullness=p.fullness;state.simpleSilkDrama=p.drama;state.simpleSilkGlow=p.glow;
      for(const [id,v] of [['simpleSilkFullness',p.fullness],['simpleSilkDrama',p.drama],['simpleSilkGlow',p.glow]])document.getElementById(id).value=v;
      document.getElementById('simpleSilkFullnessOut').textContent=`${p.fullness}%`;
      document.getElementById('simpleSilkDramaOut').textContent=`${p.drama}%`;
      document.getElementById('simpleSilkGlowOut').textContent=`${p.glow}%`;
      wrap.querySelectorAll('.simple-preset').forEach(b=>b.classList.toggle('active',b===btn));
      mapSimpleControls();render();
    }));
  }

  function refreshVisibility(){
    const isSilks=state.style===STYLE_ID;
    const simple=document.getElementById('simpleSilkControls');
    if(simple) simple.style.display=isSilks?'':'none';
    setLegacyVisibility(!isSilks);
  }

  const previousBuild=buildStyleGallery;
  buildStyleGallery=function(){previousBuild();setTimeout(refreshVisibility,0);};

  mapSimpleControls();
  installSimpleControls();
  refreshVisibility();

  const style=document.createElement('style');
  style.textContent=`
    .simple-silk-controls{margin:10px 0 14px;padding:13px;border:1px solid #283746;border-radius:12px;background:#0a1016}
    .simple-silk-head{display:grid;gap:4px;margin-bottom:12px}.simple-silk-head strong{font:600 12px Manrope,sans-serif;color:#e3edf6}.simple-silk-head span{font-size:9px;line-height:1.45;color:#738293}
    .simple-silk-colour-flow{margin-bottom:13px}.simple-silk-colour-flow select{width:100%}
    .simple-control-row{margin:12px 0 0}.simple-control-row small{display:block;margin-top:4px;color:#657587;font-size:8px;letter-spacing:.01em}
    .simple-preset-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:14px}
    .simple-preset{border:1px solid #273646;border-radius:8px;background:#0b1118;color:#8493a4;padding:8px 6px;font:600 9px Inter,sans-serif;cursor:pointer}
    .simple-preset:hover{border-color:#50677e;color:#d0dbe6}.simple-preset.active{border-color:#74a2b9;color:#eef6fb;background:#101b25;box-shadow:0 0 0 1px #74a2b933 inset}
  `;
  document.head.appendChild(style);
})();