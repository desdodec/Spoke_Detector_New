// Spoke Detector — expanded curated palette system.
// Twenty-four deliberate palettes: eight dark-ground, eight light-ground, eight versatile.
// Custom five-colour editing remains available below the preset gallery.
(() => {
  const CURATED = {
    // DARK — luminous / emissive families
    polarGlow: {name:'Polar Glow',ground:'dark',colors:['#79F3FF','#38CFEA','#7897FF','#D85BEB','#FF62C5']},
    nocturneDuet: {name:'Nocturne Duet',ground:'dark',colors:['#5DE6D7','#2EB9D1','#6673D8','#BD4AC8','#F36BAF']},
    auroraFlame: {name:'Aurora Flame',ground:'dark',colors:['#6EF4E8','#28D0C5','#46A2E5','#C94FD4','#FF6C67']},
    ultravioletCoral: {name:'Ultraviolet Coral',ground:'dark',colors:['#46E2FF','#557CFF','#8D5BE8','#E654BA','#FF755E']},
    emeraldRose: {name:'Emerald Rose',ground:'dark',colors:['#69E6C1','#29C5A8','#41A3C4','#C14893','#FF5D9B']},
    electricCitrus: {name:'Electric Citrus',ground:'dark',colors:['#58F2D4','#2BC4D4','#5E8FFF','#DF62C9','#FFB14A']},
    plasmaBerry: {name:'Plasma Berry',ground:'dark',colors:['#54E8FF','#49A8F2','#7966E8','#C849CC','#FF4F91']},
    neonEmber: {name:'Neon Ember',ground:'dark',colors:['#57EFE1','#39AFC7','#766FD9','#DF577F','#FF8A48']},

    // LIGHT — stronger ink-like colours for white / cream / neutral grounds
    inkBlush: {name:'Ink & Blush',ground:'light',colors:['#086879','#165B78','#46507B','#8B315F','#B52E62']},
    graphitePrism: {name:'Graphite Prism',ground:'light',colors:['#26434D','#38586A','#515675','#704267','#913A5A']},
    cobaltEmber: {name:'Cobalt Ember',ground:'light',colors:['#125481','#206A9D','#5E4E8A','#A6415B','#B95E33']},
    botanicalPlum: {name:'Botanical Plum',ground:'light',colors:['#285E51','#347769','#4E7777','#764E70','#99466C']},
    oxfordRose: {name:'Oxford Rose',ground:'light',colors:['#163F59','#245D73','#4E6278','#7C455F','#A13C59']},
    petrolRust: {name:'Petrol / Rust',ground:'light',colors:['#155B62','#267178','#476F78','#8C4B4B','#B0593A']},
    indigoSaffron: {name:'Indigo Saffron',ground:'light',colors:['#243D66','#36558A','#605A86','#936040','#A56D20']},
    forestWine: {name:'Forest / Wine',ground:'light',colors:['#244F48','#35665D','#57646C','#784756','#973D52']},

    // BOTH — sufficiently saturated on dark but deep enough for light grounds
    signalDuet: {name:'Signal Duet',ground:'both',colors:['#00A9C6','#297AB8','#655DB7','#C5428B','#E85279']},
    studioAccent: {name:'Studio Accent',ground:'both',colors:['#39747A','#4D7183','#626581','#7F556E','#A34F69']},
    tealCopper: {name:'Teal / Copper',ground:'both',colors:['#298E92','#3B8596','#627B8A','#9B625A','#BF6C3C']},
    oceanOrchid: {name:'Ocean Orchid',ground:'both',colors:['#168DA3','#337BAE','#5D68B3','#9A4DA4','#C84F83']},
    jadeCoral: {name:'Jade / Coral',ground:'both',colors:['#2A9A82','#348C8D','#587B91','#B15475','#DA665F']},
    cobaltRose: {name:'Cobalt Rose',ground:'both',colors:['#267FB0','#3E72B7','#6E60B1','#B24C91','#D95D78']},
    mineralHeat: {name:'Mineral Heat',ground:'both',colors:['#2E8F8B','#438496','#667590','#A25B67','#C96D45']},
    duskGold: {name:'Dusk Gold',ground:'both',colors:['#3A8192','#536E9A','#765F8C','#A45E65','#C78B3E']}
  };

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
    .palette-balance-note{font-size:9px;color:#728092;line-height:1.45;margin:7px 0 14px}
    .palette-balance-note strong{color:#aebdcb;font-weight:600}
    #paletteGallery{max-height:560px;overflow:auto;padding-right:3px;scrollbar-width:thin;scrollbar-color:#314153 transparent}
    #paletteGallery::-webkit-scrollbar{width:6px}#paletteGallery::-webkit-scrollbar-thumb{background:#314153;border-radius:99px}
  `;
  document.head.appendChild(style);

  const oldGallery=document.getElementById('paletteGallery');
  let note=document.getElementById('paletteBalanceNote');
  if(oldGallery&&!note){
    note=document.createElement('p');
    note.id='paletteBalanceNote';note.className='palette-balance-note';
    oldGallery.insertAdjacentElement('afterend',note);
  }
  if(note) note.innerHTML='<strong>24 curated palettes + custom editing.</strong> Eight are tuned for dark grounds, eight for light/neutral grounds and eight work across both.';

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
