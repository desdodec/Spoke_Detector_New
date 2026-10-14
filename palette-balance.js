// Spoke Detector — role-based palette system.
// Palettes are grouped by tonal character rather than only background suitability.
// Five colours have unequal roles: dominant, secondary, bridge, accent, highlight.
(() => {
  const ROLE_NAMES=['Dominant','Secondary','Bridge','Accent','Highlight'];
  const DEFAULT_WEIGHTS=[0.42,0.24,0.16,0.11,0.07];

  const CURATED={
    // VIBRANT
    spectrumPunch:{name:'Spectrum Punch',category:'Vibrant',ground:'both',colors:['#00A8C8','#25A96B','#E2C92F','#E55E2D','#8F43C6'],weights:[.34,.22,.16,.16,.12]},
    tropicalSignal:{name:'Tropical Signal',category:'Vibrant',ground:'dark',colors:['#15D6C5','#61E34A','#F4D83C','#FF7C32','#EA3E8C'],weights:[.34,.22,.16,.16,.12]},
    electricPrimary:{name:'Electric Primary',category:'Vibrant',ground:'both',colors:['#1769E0','#11A36A','#F3C72C','#E94C35','#A13CC2'],weights:[.38,.20,.14,.16,.12]},

    // EDITORIAL / PRINT
    bauhausInk:{name:'Bauhaus Ink',category:'Editorial',ground:'light',colors:['#17202A','#E7DCC8','#D94A38','#D4A72C','#2456A6'],weights:[.44,.22,.14,.12,.08]},
    museumPoster:{name:'Museum Poster',category:'Editorial',ground:'both',colors:['#2B2A27','#D8D0C4','#365E9D','#C44D36','#B28A36'],weights:[.42,.24,.14,.12,.08]},
    modernistPrint:{name:'Modernist Print',category:'Editorial',ground:'light',colors:['#1F4D3A','#E8E1D6','#D26A32','#315A9A','#7B3545'],weights:[.42,.24,.14,.12,.08]},

    // MONOCHROMATIC / TONAL
    cobaltTonal:{name:'Cobalt Tonal',category:'Monochrome',ground:'both',colors:['#16263F','#24466E','#356EA3','#6E9AC8','#B8D0E8'],weights:[.40,.25,.17,.11,.07]},
    verdantTonal:{name:'Verdant Tonal',category:'Monochrome',ground:'both',colors:['#17382F','#285B4B','#3D7F67','#72A58B','#C2D8CA'],weights:[.40,.25,.17,.11,.07]},
    plumTonal:{name:'Plum Tonal',category:'Monochrome',ground:'both',colors:['#332238','#57345B','#7E4C80','#A978A8','#D8BDD5'],weights:[.40,.25,.17,.11,.07]},

    // COMPLEMENTARY
    tealVermilion:{name:'Teal / Vermilion',category:'Complementary',ground:'both',colors:['#156B72','#2F9A97','#A7C6AF','#E36A42','#A93D2F'],weights:[.38,.22,.14,.17,.09]},
    cobaltTangerine:{name:'Cobalt / Tangerine',category:'Complementary',ground:'both',colors:['#254E9B','#4B72BC','#B6B9B4','#ED8A3A','#C65624'],weights:[.38,.22,.14,.17,.09]},
    violetChartreuse:{name:'Violet / Chartreuse',category:'Complementary',ground:'dark',colors:['#5C3DA8','#8A62D1','#AEBB87','#B7D93D','#759D22'],weights:[.38,.22,.14,.17,.09]},

    // SOFT / PASTEL
    mineralPastel:{name:'Mineral Pastel',category:'Soft / Pastel',ground:'light',colors:['#6F8F88','#9FBFC8','#D8C8A9','#D4A5B7','#E5DDE7'],weights:[.38,.24,.17,.13,.08]},
    sorbetStudio:{name:'Sorbet Studio',category:'Soft / Pastel',ground:'light',colors:['#73BFB2','#A8D48A','#E8D88A','#E9A48E','#B6A4D9'],weights:[.36,.23,.16,.15,.10]},
    dustyGarden:{name:'Dusty Garden',category:'Soft / Pastel',ground:'both',colors:['#5E7568','#8EA083','#C8B67A','#B97D86','#7B7FA1'],weights:[.38,.24,.16,.14,.08]},

    // HIGH CONTRAST
    signalBlack:{name:'Signal Black',category:'High Contrast',ground:'light',colors:['#111111','#F4F2EC','#D8322B','#F0C929','#2056B3'],weights:[.46,.20,.14,.12,.08]},
    nightSafety:{name:'Night Safety',category:'High Contrast',ground:'dark',colors:['#E8F1F2','#26D7E8','#F5DD38','#F05B37','#15181C'],weights:[.30,.22,.18,.18,.12]},
    paperPunch:{name:'Paper Punch',category:'High Contrast',ground:'both',colors:['#202020','#F2EEE7','#2E64C8','#E56B2F','#B52D75'],weights:[.44,.20,.14,.13,.09]}
  };

  Object.keys(PALETTES).forEach(k=>delete PALETTES[k]);
  Object.assign(PALETTES,CURATED);

  if(!PALETTES[state.palette]){
    state.palette='spectrumPunch';
    state.customPalette=[...PALETTES.spectrumPunch.colors];
  }
  state.customPaletteWeights=[...(PALETTES[state.palette]?.weights||DEFAULT_WEIGHTS)];

  // Override equal-step interpolation with role-weighted colour positions.
  paletteColor=function(t){
    const colors=state.customPalette||[];
    if(!colors.length)return '#ffffff';
    if(colors.length===1)return colors[0];
    const active=PALETTES[state.palette];
    const raw=(active?.weights||state.customPaletteWeights||DEFAULT_WEIGHTS).slice(0,colors.length);
    while(raw.length<colors.length)raw.push(1);
    const total=raw.reduce((s,v)=>s+Math.max(0,v),0)||1;
    const weights=raw.map(v=>Math.max(0,v)/total);
    const centers=[];let acc=0;
    for(let i=0;i<weights.length;i++){centers.push(acc+weights[i]/2);acc+=weights[i];}
    const x=clamp(t,0,.999999);
    if(x<=centers[0])return colors[0];
    for(let i=0;i<centers.length-1;i++){
      if(x<=centers[i+1]){
        const f=(x-centers[i])/Math.max(1e-9,centers[i+1]-centers[i]);
        return mixHex(colors[i],colors[i+1],f);
      }
    }
    return colors.at(-1);
  };

  let activeCategory='All';
  const categories=['All','Vibrant','Editorial','Monochrome','Complementary','Soft / Pastel','High Contrast'];

  const gallery=document.getElementById('paletteGallery');
  let filters=document.getElementById('paletteCategoryFilters');
  if(gallery&&!filters){
    filters=document.createElement('div');
    filters.id='paletteCategoryFilters';filters.className='palette-category-filters';
    filters.innerHTML=categories.map(c=>`<button type="button" data-category="${c}" class="palette-filter${c==='All'?' active':''}">${c}</button>`).join('');
    gallery.insertAdjacentElement('beforebegin',filters);
    filters.addEventListener('click',e=>{
      const b=e.target.closest('.palette-filter');if(!b)return;
      activeCategory=b.dataset.category;
      filters.querySelectorAll('.palette-filter').forEach(x=>x.classList.toggle('active',x===b));
      buildPaletteGallery();
    });
  }

  let note=document.getElementById('paletteBalanceNote');
  if(gallery&&!note){note=document.createElement('p');note.id='paletteBalanceNote';note.className='palette-balance-note';gallery.insertAdjacentElement('afterend',note);}
  if(note)note.innerHTML='<strong>Role-based palettes.</strong> Swatch widths show colour hierarchy: dominant → secondary → bridge → accent → highlight. Filter by tonal character rather than just dark/light.';

  const roleLabel=document.querySelector('.custom-palette-label');
  if(roleLabel)roleLabel.textContent='Custom colour roles';
  const rack=document.getElementById('colorRack');
  if(rack&&!rack.querySelector('.palette-role-labels')){
    const labels=document.createElement('div');labels.className='palette-role-labels';
    labels.innerHTML=ROLE_NAMES.map((r,i)=>`<span style="flex:${DEFAULT_WEIGHTS[i]}">${r}</span>`).join('');
    rack.insertAdjacentElement('beforebegin',labels);
  }
  document.querySelectorAll('.palette-color').forEach((el,i)=>{el.title=ROLE_NAMES[i]||`Colour ${i+1}`;});

  buildPaletteGallery=function(){
    const g=$('paletteGallery');if(!g)return;g.innerHTML='';
    Object.entries(PALETTES).filter(([,p])=>activeCategory==='All'||p.category===activeCategory).forEach(([id,p])=>{
      const c=document.createElement('button');c.type='button';
      c.className='palette-card'+(id===state.palette?' active':'');
      c.dataset.ground=p.ground||'both';
      const badge=p.ground==='light'?'Light':p.ground==='dark'?'Dark':'Both';
      const weights=p.weights||DEFAULT_WEIGHTS;
      c.innerHTML=`<div class="swatches role-swatches">${p.colors.map((x,i)=>`<i title="${ROLE_NAMES[i]}" style="background:${x};flex:${weights[i]||.1}"></i>`).join('')}</div><div class="palette-card-copy"><small>${p.name}</small><span>${p.category}</span></div><span class="palette-ground-badge">${badge}</span>`;
      c.onclick=()=>{
        state.palette=id;state.customPalette=[...p.colors];state.customPaletteWeights=[...(p.weights||DEFAULT_WEIGHTS)];
        document.querySelectorAll('.palette-color').forEach((el,i)=>{if(state.customPalette[i])el.value=state.customPalette[i];});
        buildPaletteGallery();drawTimeline();render();
      };
      g.appendChild(c);
    });
  };

  const style=document.createElement('style');
  style.textContent=`
    .palette-category-filters{display:flex;gap:6px;overflow:auto;padding:0 0 9px;scrollbar-width:none}.palette-category-filters::-webkit-scrollbar{display:none}
    .palette-filter{white-space:nowrap;border:1px solid #263545;border-radius:999px;background:#0b1118;color:#8190a0;padding:5px 8px;font:600 8px Inter,sans-serif;cursor:pointer}.palette-filter.active{border-color:#7898b6;color:#edf4fa;background:#111b25}
    .palette-card{position:relative}.palette-ground-badge{position:absolute;right:7px;top:7px;padding:2px 5px;border-radius:5px;background:#070b10cc;border:1px solid #ffffff18;color:#8fa0b3;font-size:7px;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}
    .palette-card[data-ground="light"] .palette-ground-badge{background:#f2eee5;color:#3d4855;border-color:#c9c1b4}.palette-card[data-ground="both"] .palette-ground-badge{background:#18202a;color:#bac7d4}
    .role-swatches{display:flex!important;overflow:hidden}.role-swatches i{min-width:4px!important}.palette-card-copy{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.palette-card-copy span{font-size:7px;color:#657486}
    .palette-balance-note{font-size:9px;color:#728092;line-height:1.45;margin:7px 0 14px}.palette-balance-note strong{color:#aebdcb;font-weight:600}
    #paletteGallery{max-height:520px;overflow:auto;padding-right:3px;scrollbar-width:thin;scrollbar-color:#314153 transparent}#paletteGallery::-webkit-scrollbar{width:6px}#paletteGallery::-webkit-scrollbar-thumb{background:#314153;border-radius:99px}
    .palette-role-labels{display:flex;gap:5px;margin:5px 0 5px;color:#5e6d7d;font-size:7px;text-transform:uppercase;letter-spacing:.04em}.palette-role-labels span{text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis}
  `;
  document.head.appendChild(style);

  document.querySelectorAll('.palette-color').forEach((el,i)=>{if(state.customPalette[i])el.value=state.customPalette[i];});
  buildPaletteGallery();
})();