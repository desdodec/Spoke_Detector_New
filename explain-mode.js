// Spoke Detector — participant-friendly Data Story / Explain Mode.
// Explains, in plain language, which visible features come from measured handlebar motion
// and which are presentation choices. It never changes sensor data or the artwork itself.
(() => {
  const STORIES = {
    ribbons: {
      name:'Pulse Ribbons',
      intro:'Your two walking passages become two flowing families of lines.',
      rules:[
        ['Out and back stay separate','The upper ribbons come from the outward section; the lower ribbons come from the return section.'],
        ['The bends come from movement','As the measured handlebar acceleration changes, the central line rises and falls with it.'],
        ['Layers make the movement visible','The extra ribbons are spaced copies built around the same measured trace. They add depth, not extra sensor readings.']
      ],
      styling:'Line density, spacing, symmetry, glow and stroke width change the presentation around the measured traces.'
    },
    orbit: {
      name:'Twin Orbit',
      intro:'The two walking passages are wrapped around a circular portrait.',
      rules:[
        ['Outward and return form the orbit','One passage is wrapped around one half of the circle and the other passage around the opposite half.'],
        ['Movement changes the radius','Stronger changes in the recorded motion push the layered lines farther inward or outward.'],
        ['The centre remembers direction','The small central path comes from the recorded X/Y handlebar movement, scaled to fit the artwork.']
      ],
      styling:'The circular layout, spacing between rings and small decorative variations are artistic choices; the changing motion still drives the displacement.'
    },
    choir: {
      name:'Step Choir',
      intro:'Repeated motion patterns found in the recording are lined up so you can see how similar — or different — they were.',
      rules:[
        ['Each row is a detected cycle','The software looks for repeating peaks in the handlebar-motion signal and keeps cycles within the accepted timing range.'],
        ['Outward is above; return is below','The two journey windows are never mixed into one row set.'],
        ['The stronger middle line is a summary','It shows the middle, or typical, shape across the accepted cycles rather than inventing a new cycle.']
      ],
      styling:'Spacing, line thickness, colour and the maximum number of rows are presentation choices. “Detected cycle” is deliberately used rather than claiming a validated footstep.'
    },
    weave: {
      name:'Motion Weave',
      intro:'Your motion is treated like thread: repeated traces run across the image and are woven together.',
      rules:[
        ['The horizontal threads follow the recording','The top half uses outward motion and the lower half uses return motion.'],
        ['The vertical threads compare the two passages','They bend according to the recorded values at matching positions through the two selected windows.'],
        ['More movement creates more bend','Larger changes in the measured signal produce stronger warping in the woven field.']
      ],
      styling:'The number of threads and their spacing are adjustable. Those controls change resolution and texture, not the underlying recorded values.'
    },
    terrain: {
      name:'Terrain Echo',
      intro:'The recording becomes a pair of imagined landscapes — one for the outward passage and one for the return.',
      rules:[
        ['Two journeys, two terrains','The upper horizons are built from the outward window; the lower horizons are built from the return window.'],
        ['Ridges follow measured changes','When the handlebar motion rises or falls, the terrain lines rise or fall with the same signal.'],
        ['Repeated horizons reveal the pattern','Multiple offset copies make recurring movement easier to see without adding new measurements.']
      ],
      styling:'Layer spacing, density, stroke and colour are artistic controls placed around the same measured motion trace.'
    },
    bloom: {
      name:'Gait Bloom',
      intro:'Detected repeating motion cycles are opened out like petals.',
      rules:[
        ['Each petal starts with a detected cycle','A petal is made from one accepted repeating section of the handlebar-motion signal.'],
        ['The petal edge follows that cycle','Changes within the measured cycle alter the petal’s length and contour.'],
        ['Outward and return are overlaid for comparison','Both journey sets occupy the same bloom region, so differences appear as overlapping petal structures rather than separate halves.']
      ],
      styling:'The radial arrangement is an artistic transformation. Petal count depends on how many cycles pass the detector’s timing rules; it is not a clinical step count.'
    },
    halo: {
      name:'Halo Barcode',
      intro:'Time runs around a set of rings, turning your changing motion into short coloured marks.',
      rules:[
        ['Inner rings are outward','The inner half of the rings uses the outward journey window; the outer half uses the return journey.'],
        ['Around each ring is time','Moving around a ring follows the selected recording from earlier to later.'],
        ['Stronger movement makes a stronger mark','Larger measured changes create longer, thicker and more visible arcs.']
      ],
      styling:'Ring spacing and the total number of rings are part of the visual design. The changing arc strength is driven by the measured motion.'
    },
    constellation: {
      name:'Tempo Constellation',
      intro:'The sideways and forward/back handlebar movement becomes a map of points and trails.',
      rules:[
        ['Point position comes from X/Y motion','Each point is positioned from the recorded handlebar acceleration in two directions, scaled so the whole path fits the artwork.'],
        ['Lines show sequence','A line joins consecutive samples from the same journey, so you can follow how the movement travelled through the shape.'],
        ['Outward and return are not falsely joined','The final outward point is never connected to the first return point. They remain separate recordings.']
      ],
      styling:'Dot size and some visual sparkle are deterministic decoration. The dot positions and within-journey paths are the data-derived part.'
    }
  };

  const COLOR_TEXT = {
    time:'Colour moves through time, so earlier and later parts of each selected passage receive different colours.',
    amplitude:'Colour responds to motion intensity, so stronger measured movement shifts the colour.',
    strand:'Colour follows layer or strand position. This helps separate the artwork’s layers; it is a layout key rather than another sensor measurement.',
    journey:'Colour separates the outward and return passages so the two journeys are easier to compare.'
  };

  function currentStory(){ return STORIES[state.style] || STORIES.ribbons; }

  function signalFor(mid){
    if(!state.time.length) return [];
    const half=state.windowSeconds/2, start=mid-half, end=mid+half;
    const dyn=highpassApprox(state.mag,Math.max(10,Math.round(sampleRate()*.7)));
    return resample(normSignal(sliceRange(dyn,start,end)),180);
  }

  function sparkPath(values,w=520,h=82){
    if(!values.length) return '';
    const cy=h/2, amp=h*.36;
    return values.map((v,i)=>`${i?'L':'M'} ${(i/(values.length-1)*w).toFixed(1)} ${(cy-v*amp).toFixed(1)}`).join(' ');
  }

  function renderJourneyStrips(){
    const out=signalFor(state.outMid), ret=signalFor(state.retMid), c1=state.customPalette?.[0]||'#58c7ff', c2=state.customPalette?.at(-1)||'#ff6da8';
    const r=selectedRanges();
    return `
      <div class="story-strip-card">
        <div class="story-strip-head"><strong>1. Your outward passage</strong><span>${r.outStart.toFixed(1)}–${r.outEnd.toFixed(1)} seconds used</span></div>
        <svg class="story-spark" viewBox="0 0 520 82" preserveAspectRatio="none" aria-label="Simplified outward movement trace"><line x1="0" y1="41" x2="520" y2="41" stroke="currentColor" opacity=".12"/><path d="${sparkPath(out)}" fill="none" stroke="${c1}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <p>This line is a simplified view of how the bicycle handlebars changed motion during the selected outward section. Bigger wiggles mean bigger changes in the recorded motion.</p>
      </div>
      <div class="story-strip-card">
        <div class="story-strip-head"><strong>2. Your return passage</strong><span>${r.retStart.toFixed(1)}–${r.retEnd.toFixed(1)} seconds used</span></div>
        <svg class="story-spark" viewBox="0 0 520 82" preserveAspectRatio="none" aria-label="Simplified return movement trace"><line x1="0" y1="41" x2="520" y2="41" stroke="currentColor" opacity=".12"/><path d="${sparkPath(ret)}" fill="none" stroke="${c2}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <p>The return is treated separately, so differences between the two passages remain visible in the final piece.</p>
      </div>`;
  }

  function cloneArtwork(){
    const target=document.getElementById('storyArtwork');
    const source=document.getElementById('artboard');
    if(!target||!source)return;
    target.innerHTML='';
    const clone=source.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('width','100%');clone.setAttribute('height','100%');
    target.appendChild(clone);
  }

  function identityHeading(){
    const name=(state.participantName||'').trim();
    const design=(state.designTitle||'').trim() || currentStory().name;
    return name ? `${name} · ${design}` : design;
  }

  function refresh(){
    if(!state.time.length)return;
    const story=currentStory();
    const title=document.getElementById('storyTitle'); if(title)title.textContent=identityHeading();
    const intro=document.getElementById('storyIntro'); if(intro)intro.textContent=story.intro;
    const strips=document.getElementById('storyStrips'); if(strips)strips.innerHTML=renderJourneyStrips();
    const rules=document.getElementById('storyRules');
    if(rules)rules.innerHTML=story.rules.map((r,i)=>`<article class="story-rule"><span>${i+3}</span><div><strong>${r[0]}</strong><p>${r[1]}</p></div></article>`).join('');
    const colour=document.getElementById('storyColour'); if(colour)colour.textContent=COLOR_TEXT[state.colorMode]||COLOR_TEXT.time;
    const styling=document.getElementById('storyStyling'); if(styling)styling.textContent=story.styling;
    cloneArtwork();
  }

  function openStory(){
    const modal=document.getElementById('dataStoryModal');
    if(!state.time.length){
      const status=document.getElementById('statusText');
      if(status)status.textContent='Load a recording before opening Data Story';
      return;
    }
    refresh();modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  }
  function closeStory(){const m=document.getElementById('dataStoryModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');}

  function install(){
    const toolbar=document.querySelector('.stage-toolbar');
    if(toolbar){
      const button=document.createElement('button');
      button.id='openDataStory';button.className='story-open';button.type='button';button.textContent='How did my walk make this?';
      toolbar.appendChild(button);button.onclick=openStory;
    }

    const modal=document.createElement('div');modal.id='dataStoryModal';modal.className='story-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="story-dialog" role="dialog" aria-modal="true" aria-label="How your walk became this artwork">
      <header class="story-head"><div><div class="eyebrow">DATA STORY</div><h2 id="storyTitle">How your walk became this artwork</h2><p id="storyIntro"></p></div><button class="story-close" id="closeDataStory" aria-label="Close explanation">×</button></header>
      <div class="story-body">
        <section class="story-art-side"><div class="story-art" id="storyArtwork"></div><div class="story-arrow"><span>YOUR RECORDED MOVEMENT</span><b>→</b><span>THIS ARTWORK</span></div></section>
        <section class="story-explain-side">
          <div class="story-plain"><strong>The simple version</strong><p>The phone on the bicycle recorded tiny changes in how the handlebars moved while you walked. We take two short sections — outward and return — and use those real measurements to shape the artwork. The app is making an artistic motion signature, not a medical gait test.</p></div>
          <div id="storyStrips" class="story-strips"></div>
          <div class="story-rules" id="storyRules"></div>
          <article class="story-rule story-colour-rule"><span>↗</span><div><strong>What the colours mean</strong><p id="storyColour"></p></div></article>
          <div class="story-truth"><div><strong>FROM YOUR RECORDING</strong><p>Journey timing, changing motion, detected repeating cycles where used, and X/Y motion where the design calls for it.</p></div><div><strong>ART DIRECTION</strong><p id="storyStyling"></p></div></div>
          <p class="story-caution">Because the sensor is on the handlebars, it records your movement indirectly through you and the bicycle. The result is a personal motion artwork, not a clinical measurement or diagnosis.</p>
        </section>
      </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('closeDataStory').onclick=closeStory;
    modal.addEventListener('click',e=>{if(e.target===modal)closeStory();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeStory();});

    const style=document.createElement('style');style.textContent=`
      .stage-toolbar .story-open{margin-left:auto;border:1px solid #35485c;background:#101923;color:#dce8f3;border-radius:9px;padding:7px 11px;font:600 10px Inter,sans-serif;cursor:pointer}.stage-toolbar .story-open:hover{background:#182535;border-color:#58718a}
      .story-modal{position:fixed;inset:0;z-index:1400;background:#020407e8;backdrop-filter:blur(14px);display:none;align-items:center;justify-content:center;padding:22px}.story-modal.open{display:flex}.story-dialog{width:min(1380px,97vw);height:min(900px,95vh);display:grid;grid-template-rows:auto 1fr;background:#080d12;border:1px solid #273646;border-radius:20px;overflow:hidden;box-shadow:0 40px 160px #000}.story-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:20px 24px;border-bottom:1px solid #1d2935}.story-head h2{font:600 22px Manrope,sans-serif;margin:3px 0 5px;color:#eff5fa}.story-head p{font-size:11px;color:#8090a0;margin:0;max-width:700px}.story-close{width:34px;height:34px;border:1px solid #2b3948;border-radius:9px;background:#101720;color:#dae4ed;font-size:19px;cursor:pointer}.story-body{min-height:0;display:grid;grid-template-columns:minmax(360px,.9fr) minmax(500px,1.1fr)}
      .story-art-side{min-width:0;padding:24px;background:radial-gradient(circle at 50% 42%,#1c2631 0,#0d131a 58%,#070a0e 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}.story-art{width:min(100%,610px);aspect-ratio:1;box-shadow:0 22px 65px #0008;background:#05070a}.story-art>svg{display:block;width:100%;height:100%}.story-arrow{display:flex;align-items:center;gap:14px;color:#8292a2;font:600 9px Inter,sans-serif;letter-spacing:.12em}.story-arrow b{font-size:19px;color:#cfdae4}
      .story-explain-side{overflow:auto;padding:22px 25px 34px;background:#0a0f15}.story-plain{border:1px solid #273746;background:#0d151e;border-radius:13px;padding:14px 15px;margin-bottom:14px}.story-plain strong{font:600 14px Manrope,sans-serif;color:#edf4fa}.story-plain p{font-size:11px;line-height:1.65;color:#a1afbd;margin:6px 0 0}.story-strips{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.story-strip-card{border:1px solid #202e3b;border-radius:12px;background:#090e14;padding:11px}.story-strip-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.story-strip-head strong{font-size:10px;color:#dbe5ee}.story-strip-head span{font-size:8px;color:#68798a}.story-spark{display:block;width:100%;height:72px;color:#607080;margin:5px 0}.story-strip-card p{font-size:9.5px;line-height:1.5;color:#758698;margin:0}.story-rules{display:grid;gap:8px}.story-rule{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;border:1px solid #1e2b37;border-radius:11px;background:#0b1118;padding:11px}.story-rule>span{width:27px;height:27px;border-radius:999px;display:grid;place-items:center;background:#172433;color:#bcd1e5;font:700 10px Inter,sans-serif}.story-rule strong{font-size:10.5px;color:#dce6ef}.story-rule p{font-size:9.8px;line-height:1.5;color:#7d8d9e;margin:3px 0 0}.story-colour-rule{margin-top:8px}.story-colour-rule>span{font-size:13px}.story-truth{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.story-truth>div{border-radius:11px;padding:11px 12px}.story-truth>div:first-child{background:#102019;border:1px solid #244838}.story-truth>div:last-child{background:#18151f;border:1px solid #3c304b}.story-truth strong{font-size:8px;letter-spacing:.1em;color:#b9c9d7}.story-truth p{font-size:9.4px;line-height:1.5;color:#8291a0;margin:4px 0 0}.story-caution{font-size:9px;line-height:1.55;color:#637486;margin:12px 1px 0}
      @media(max-width:900px){.story-modal{padding:8px}.story-dialog{height:97vh}.story-body{grid-template-columns:1fr;overflow:auto}.story-art-side{padding:16px}.story-art{width:min(76vw,500px)}.story-explain-side{overflow:visible}.story-strips,.story-truth{grid-template-columns:1fr}.stage-toolbar{gap:7px;flex-wrap:wrap}.stage-toolbar .story-open{margin-left:0}}
    `;document.head.appendChild(style);
  }

  install();
})();