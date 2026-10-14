// Participant-facing Data Story supplement for the Motion Silks flagship design.
(() => {
  function updateSilksStory(){
    if(state.style!=='silks'||!state.time.length)return;
    const title=document.getElementById('storyTitle');
    if(title){
      const who=(state.participantName||'').trim();
      const design=(state.designTitle||'').trim()||'Motion Silks';
      title.textContent=who?`${who} · ${design}`:design;
    }
    const intro=document.getElementById('storyIntro');
    if(intro)intro.textContent='Your outward and return journeys become two silky loops. The recording now sets not only the changing line, but much of the material behaviour around it.';
    const rules=document.getElementById('storyRules');
    if(rules)rules.innerHTML=`
      <article class="story-rule"><span>3</span><div><strong>Around the loop is time</strong><p>Start at the top and travel around the loop: you are moving through the selected passage from earlier to later, like a normal signal plot wrapped into a circle.</p></div></article>
      <article class="story-rule"><span>4</span><div><strong>The changing shape is measured motion</strong><p>The recorded handlebar acceleration changes the centreline. Stronger movement pushes the ribbon farther from its underlying loop, while quieter sections stay closer.</p></div></article>
      <article class="story-rule"><span>5</span><div><strong>The recording also sets the material baseline</strong><p>Overall motion energy helps set loop size and ribbon width; repeating-motion coherence helps set ripple strength; local roughness affects fray; stronger impulses and fast vibration contribute to bloom and highlights.</p></div></article>
      <article class="story-rule"><span>6</span><div><strong>Outward and return remain separate</strong><p>The two selected journeys are analysed independently, so their size, width, ripple and orientation can differ. Their relative motion energy also influences how the two loops sit together.</p></div></article>
      <article class="story-rule"><span>7</span><div><strong>Bright flares stay tied to real events</strong><p>Small glints appear at stronger local changes in the recording and stay at their true position in time around the loop.</p></div></article>`;
    const styling=document.getElementById('storyStyling');
    if(styling)styling.textContent='DATA-AUTHORED: centreline shape, local width, loop radius, gentle loop rotation/positioning, fibre-density baseline, ripple emphasis, fray, opacity and bloom are derived from the selected recording. ART DIRECTION: wrapping time into loops, palette, colour-spread mode, background, typography and small maker trims around the calculated baseline. The handlebar sensor measures gait indirectly through the participant/bicycle coupling, so this is an artistic motion signature rather than a clinical gait measurement.';
  }

  document.addEventListener('click',e=>{
    if(e.target?.id==='openDataStory'&&state.style==='silks') setTimeout(updateSilksStory,0);
  },true);
})();