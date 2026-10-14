// Spoke Detector — compact curated palette system.
// Six deliberate palettes replace the large menu: two dark-ground, two light-ground,
// two versatile. All remain deterministic presentation choices around measured geometry.
(() => {
  const CURATED = {
    polarGlow: {
      name:'Polar Glow', ground:'dark',
      colors:['#79F3FF','#38CFEA','#7897FF','#D85BEB','#FF62C5']
    },
    nocturneDuet: {
      name:'Nocturne Duet', ground:'dark',
      colors:['#5DE6D7','#2EB9D1','#6673D8','#BD4AC8','#F36BAF']
    },
    inkBlush: {
      name:'Ink & Blush', ground:'light',
      colors:['#086879','#165B78','#46507B','#8B315F','#B52E62']
    },
    graphitePrism: {
      name:'Graphite Prism', ground:'light',
      colors:['#26434D','#38586A','#515675','#704267','#913A5A']
    },
    signalDuet: {
      name:'Signal Duet', ground:'both',
      colors:['#00A9C6','#297AB8','#655DB7','#C5428B','#E85279']
    },
    studioAccent: {
      name:'Studio Accent', ground:'both',
      colors:['#39747A','#4D7183','#626581','#7F556E','#A34F69']
    }
  };

  // Replace the sprawling palette catalogue rather than adding yet more choices.
  Object.keys(PALETTES).forEach(k=>delete PALETTES[k]);
  Object.assign(PALETTES,CURATED);
  if(!PALETTES[state.palette]){
    state.palette='polarGlow';
    state.customPalette=[...PALETTES.polarGlow.colors];
  }

  const style=document.createElement('style');
  style.textContent=`
    .palette-card{position:relative}
    .palette-ground-badge{position:absolute;right:7px;top:7px;padding:2px 5px;border-radius:5px;background:#070b10cc;border:1px solid #ffffff18;color:#8fa0b3;font-size:7px;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}
    .palette-card[data-ground="light"] .palette-ground-badge{background:#f2eee5;color:#3d4855;border-color:#c9c1b4}
    .palette-card[data-ground="both"] .palette-ground-badge{background:#18202a;color:#bac7d4}
    .palette-balance-note{font-size:9px;color:#728092;line-height:1.45;margin:-5px 0 14px}
    .palette-balance-note strong{color:#aebdcb;font-weight:600}
  `;
  document.head.appendChild(style);

  const oldGallery=document.getElementById('paletteGallery');
  if(oldGallery&&!document.getElementById('paletteBalanceNote')){
    const note=document.createElement('p');
    note.id='paletteBalanceNote';note.className='palette-balance-note';
    note.innerHTML='<strong>Six curated palettes.</strong> Dark palettes maximise luminous depth; Light palettes hold contrast on white/cream; Both are designed to travel between grounds.';
    oldGallery.insertAdjacentElement('afterend',note);
  }

  buildPaletteGallery=function(){
    const g=$('paletteGallery');g.innerHTML='';
    Object.entries(PALETTES).forEach(([id,p])=>{
      const c=document.createElement('button');c.type='button';
      c.className='palette-card'+(id===state.palette?' active':'');
      c.dataset.ground=p.ground||'both';
      const badge=p.ground==='light'?'Light':p.ground==='dark'?'Dark':'Both';
      c.innerHTML=`<div class="swatches">${p.colors.map(x=>`<i style="background:${x}"></i>`).join('')}</div><small>${p.name}</small><span class="palette-ground-badge">${badge}</span>`;
      c.onclick=()=>{
        state.palette=id;state.customPalette=[...p.colors];
        document.querySelectorAll('.palette-color').forEach((el,i)=>{if(state.customPalette[i])el.value=state.customPalette[i];});
        buildPaletteGallery();drawTimeline();render();
      };
      g.appendChild(c);
    });
  };

  document.querySelectorAll('.palette-color').forEach((el,i)=>{if(state.customPalette[i])el.value=state.customPalette[i];});
  buildPaletteGallery();
})();
