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
    if(intro)intro.textContent='Your outward and return journeys become two silky loops. The easiest way to read them is like a familiar signal plot wrapped into a circle.';
    const rules=document.getElementById('storyRules');
    if(rules)rules.innerHTML=`
      <article class="story-rule"><span>3</span><div><strong>Around the loop is time</strong><p>Start at the top and travel around the loop: you are moving through the selected passage from earlier to later, just as you would move left-to-right across a normal graph.</p></div></article>
      <article class="story-rule"><span>4</span><div><strong>The changing edge is your movement</strong><p>When the recorded handlebar motion changes more strongly, the ribbon moves farther away from its smooth underlying circle. Calmer sections sit closer to it.</p></div></article>
      <article class="story-rule"><span>5</span><div><strong>The fibres show local texture</strong><p>The bright centre trace carries the main measured shape. The surrounding fibres make that trace feel tactile; where local motion is less even, they spread and shimmer more.</p></div></article>
      <article class="story-rule"><span>6</span><div><strong>Bright points mark stronger impulses</strong><p>Small glints appear where the selected recording contains unusually strong local changes. They stay at the same position in time around the loop.</p></div></article>`;
    const styling=document.getElementById('storyStyling');
    if(styling)styling.textContent='The decision to wrap time into a loop, the number of silky strands, their exact spacing, glow, overall loop placement and palette are artistic choices. The changing centreline, local ribbon texture and impulse positions come from the selected recording.';
  }

  document.addEventListener('click',e=>{
    if(e.target?.id==='openDataStory'&&state.style==='silks') setTimeout(updateSilksStory,0);
  },true);
})();
