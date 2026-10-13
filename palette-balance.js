// Spoke Detector — balanced palette library for dark and light grounds.
// Colour changes remain user-selected and become the actual exported artwork colours.
(() => {
  const LIGHT_PALETTES = {
    inkpop: {
      name: 'Ink Pop',
      ground: 'light',
      colors: ['#12263A','#0B6E75','#2E5AAC','#9A3E78','#D1495B']
    },
    cobaltHeat: {
      name: 'Cobalt Heat',
      ground: 'light',
      colors: ['#12355B','#246EB9','#6C3FA0','#C43D58','#C96A16']
    },
    botanical: {
      name: 'Botanical Ink',
      ground: 'light',
      colors: ['#16302B','#245C45','#3C7A57','#8F3F35','#7A4E2D']
    },
    plumGold: {
      name: 'Plum / Gold',
      ground: 'light',
      colors: ['#2B193D','#5C356E','#8F3552','#B35C25','#876A16']
    },
    signalInk: {
      name: 'Signal Ink',
      ground: 'light',
      colors: ['#14213D','#004E89','#5B2A86','#A52A3A','#A95F00']
    },
    graphitePrism: {
      name: 'Graphite Prism',
      ground: 'light',
      colors: ['#20242B','#394867','#2F6690','#65418A','#963C5F']
    }
  };

  const GROUND_HINTS = {
    aurora: 'dark', ember: 'both', mineral: 'both', bloom: 'dark',
    nocturne: 'dark', earth: 'both', mono: 'both', festival: 'dark'
  };

  Object.entries(GROUND_HINTS).forEach(([id, ground]) => {
    if (PALETTES[id]) PALETTES[id].ground = ground;
  });
  Object.assign(PALETTES, LIGHT_PALETTES);

  const style = document.createElement('style');
  style.textContent = `
    .palette-card{position:relative}
    .palette-ground-badge{position:absolute;right:7px;top:7px;padding:2px 5px;border-radius:5px;background:#070b10cc;border:1px solid #ffffff18;color:#8fa0b3;font-size:7px;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}
    .palette-card[data-ground="light"] .palette-ground-badge{background:#f2eee5;color:#3d4855;border-color:#c9c1b4}
    .palette-card[data-ground="both"] .palette-ground-badge{background:#18202a;color:#bac7d4}
    .palette-balance-note{font-size:9px;color:#728092;line-height:1.45;margin:-5px 0 14px}
    .palette-balance-note strong{color:#aebdcb;font-weight:600}
  `;
  document.head.appendChild(style);

  const oldGallery = document.getElementById('paletteGallery');
  if (oldGallery && !document.getElementById('paletteBalanceNote')) {
    const note = document.createElement('p');
    note.id = 'paletteBalanceNote';
    note.className = 'palette-balance-note';
    note.innerHTML = '<strong>Ground-aware palette set.</strong> Dark picks glow on black/navy; Light picks keep contrast on white/cream; Both are versatile.';
    oldGallery.insertAdjacentElement('afterend', note);
  }

  buildPaletteGallery = function(){
    const g = $('paletteGallery');
    g.innerHTML = '';
    Object.entries(PALETTES).forEach(([id,p]) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'palette-card' + (id === state.palette ? ' active' : '');
      c.dataset.ground = p.ground || 'both';
      const badge = p.ground === 'light' ? 'Light' : p.ground === 'dark' ? 'Dark' : 'Both';
      c.innerHTML = `<div class="swatches">${p.colors.map(x=>`<i style="background:${x}"></i>`).join('')}</div><small>${p.name}</small><span class="palette-ground-badge">${badge}</span>`;
      c.onclick = () => {
        state.palette = id;
        state.customPalette = [...p.colors];
        document.querySelectorAll('.palette-color').forEach((el,i)=>el.value=state.customPalette[i]);
        buildPaletteGallery();
        drawTimeline();
        render();
      };
      g.appendChild(c);
    });
  };

  buildPaletteGallery();
})();
