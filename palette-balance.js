// Spoke Detector — expanded curated palette system.
// Thirty deliberate palettes with genuinely broad hue families for dark, light and versatile grounds.
// Custom five-colour editing remains available below the preset gallery.
(() => {
  const CURATED = {
    // DARK — luminous / emissive families
    polarGlow: {name:'Polar Glow',ground:'dark',colors:['#79F3FF','#38CFEA','#7897FF','#D85BEB','#FF62C5']},
    auroraSpectrum: {name:'Aurora Spectrum',ground:'dark',colors:['#28F0D2','#7CF255','#F4E04D','#FF8A42','#F04A76']},
    electricGarden: {name:'Electric Garden',ground:'dark',colors:['#25E6A8','#74F05A','#E7EF52','#FF9D3D','#F04E91']},
    solarFlare: {name:'Solar Flare',ground:'dark',colors:['#3AE6FF','#55E66B','#F6E94F','#FF9C36','#FF4C5A']},
    ultravioletCoral: {name:'Ultraviolet Coral',ground:'dark',colors:['#46E2FF','#557CFF','#8D5BE8','#E654BA','#FF755E']},
    neonHarvest: {name:'Neon Harvest',ground:'dark',colors:['#2DE7C2','#7EE75E','#FFD84A','#FF8C3A','#FF4F6E']},
    prismNight: {name:'Prism Night',ground:'dark',colors:['#24D7FF','#4EE58B','#EDEB55','#C95DF4','#FF5D6C']},
    festivalGlow: {name:'Festival Glow',ground:'dark',colors:['#00F5D4','#9BEE4C','#FEE440','#F15BB5','#7A5CFF']},
    jungleNeon: {name:'Jungle Neon',ground:'dark',colors:['#13E6A0','#57E389','#D9E94B','#FFAA3B','#F1516B']},
    cosmicCitrus: {name:'Cosmic Citrus',ground:'dark',colors:['#33D5FF','#59E26D','#F2E85B','#FF9F45','#B95CFF']},

    // LIGHT — stronger ink-like colours for white / cream / neutral grounds
    inkBlush: {name:'Ink & Blush',ground:'light',colors:['#086879','#165B78','#46507B','#8B315F','#B52E62']},
    orchardInk: {name:'Orchard Ink',ground:'light',colors:['#176B55','#5A7A2F','#A98A16','#B95B2A','#9E2F45']},
    botanicalHeat: {name:'Botanical Heat',ground:'light',colors:['#1E6B57','#4F7A3A','#9B8B27','#B86132','#A13D50']},
    cobaltSaffron: {name:'Cobalt Saffron',ground:'light',colors:['#1B4F8A','#3269A5','#7C5B8A','#B27A1E','#B44A3F']},
    forestAmber: {name:'Forest Amber',ground:'light',colors:['#285E45','#527044','#8B7A2B','#A65B2F','#8D3E55']},
    petrolOchre: {name:'Petrol / Ochre',ground:'light',colors:['#155B62','#2D6F74','#6A6D50','#A0782A','#A64E36']},
    graphitePrism: {name:'Graphite Prism',ground:'light',colors:['#26434D','#38586A','#515675','#704267','#913A5A']},
    plumCitrus: {name:'Plum / Citrus',ground:'light',colors:['#4A355F','#6E4775','#8A6A36','#B47B22','#B6533A']},
    jadeBrick: {name:'Jade / Brick',ground:'light',colors:['#2A6958','#4F7552','#867642','#A95D39','#9A3D48']},
    mediterranean: {name:'Mediterranean',ground:'light',colors:['#1D6B73','#387C78','#7B7C3B','#B17A2C','#AA4F45']},

    // BOTH — saturated enough for dark, deep enough for light
    signalDuet: {name:'Signal Duet',ground:'both',colors:['#00A9C6','#297AB8','#655DB7','#C5428B','#E85279']},
    spectrumFive: {name:'Spectrum Five',ground:'both',colors:['#009FC6','#2FAE72','#C6B72E','#E67D2F','#C83D69']},
    greenGoldRose: {name:'Green / Gold / Rose',ground:'both',colors:['#279F7A','#62A54E','#C4AA31','#D6763B','#C94F73']},
    cyanLimeOrange: {name:'Cyan / Lime / Orange',ground:'both',colors:['#13A9C9','#39B67E','#9EBB3C','#E69932','#D95652']},
    blueGreenSunset: {name:'Blue Green Sunset',ground:'both',colors:['#2B78B8','#2F9B88','#76A84E','#D19036','#C64D62']},
    jadeCoral: {name:'Jade / Coral',ground:'both',colors:['#2A9A82','#4BA55A','#B2A13A','#D46A4E','#C6537D']},
    tealCopper: {name:'Teal / Copper',ground:'both',colors:['#298E92','#3B9D78','#8E9A46','#BF7B3C','#A95060']},
    mineralRainbow: {name:'Mineral Rainbow',ground:'both',colors:['#238BAA','#399B75','#8FA147','#C48636','#B54C6D']},
    duskSpectrum: {name:'Dusk Spectrum',ground:'both',colors:['#3A8192','#4C9270','#9B954A','#C07B3F','#A94E79']},
    studioFestival: {name:'Studio Festival',ground:'both',colors:['#168EA5','#37A56F','#A5A441','#D67E35','#B64B76']}
  };

  Object.keys(PALETTES).forEach(k=>delete PALETTES[k]);
  Object.assign(PALETTES,CURATED);
  if(!PALETTES[state.palette]){
    state.palette='auroraSpectrum';
    state.customPalette=[...PALETTES.auroraSpectrum.colors];
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
  if(note) note.innerHTML='<strong>30 curated palettes + custom editing.</strong> Several are true full-spectrum sets with green, yellow, orange, red, violet, cyan and blue—not just blue/pink variations.';

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
