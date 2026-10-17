// Spoke Detector — participant identity + configurable artwork text.
// Text content is presentation metadata only; sensor-derived geometry remains unchanged.
(() => {
  const today = new Date().toISOString().slice(0,10);
  Object.assign(state, {
    participantName: state.participantName || '',
    sessionDate: state.sessionDate || today,
    designTitle: state.designTitle || '',
    textDisplay: state.textDisplay || {
      participant: true,
      sessionDate: true,
      designName: true,
      gaitDescription: true,
      metrics: true,
      journeyWindow: false,
    },
  });

  function styleName(){ return STYLES.find(s=>s.id===state.style)?.name || state.style || 'Spoke Detector'; }
  function titleText(){ return (state.designTitle || '').trim() || styleName(); }
  function formatDate(iso){
    if(!iso) return '';
    const d=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function textColours(){
    return state.darkGround
      ? {strong:'#f3f7fb',mid:'#c0ccd8',soft:'#8293a5'}
      : {strong:'#15202b',mid:'#344351',soft:'#63707d'};
  }

  function addText(svg,x,y,text,attrs={}){
    if(!text) return null;
    const t=svgEl('text',Object.assign({x,y,'font-family':'Inter, sans-serif'},attrs));
    t.textContent=text; svg.appendChild(t); return t;
  }

  function selectedIdentityLine(){
    const bits=[];
    if(state.textDisplay.participant && state.participantName.trim()) bits.push(state.participantName.trim());
    if(state.textDisplay.sessionDate && state.sessionDate) bits.push(formatDate(state.sessionDate));
    return bits.join('  ·  ');
  }

  // Replaces legacy bottom signature with individually controlled fields.
  addSignature = function(svg,label){
    const c=textColours();
    const showName=state.textDisplay.designName;
    const showJourney=state.textDisplay.journeyWindow;
    const identity=selectedIdentityLine();
    let y=1124;
    if(showName){
      addText(svg,600,y,titleText().toUpperCase(),{'text-anchor':'middle',fill:c.mid,'font-size':'14','font-weight':'600','letter-spacing':'5'});
      y+=28;
    }
    if(identity){
      addText(svg,600,y,identity,{'text-anchor':'middle',fill:c.soft,'font-size':'10','font-weight':'500','letter-spacing':'1.5'});
      y+=23;
    }
    if(showJourney){
      const r=selectedRanges();
      addText(svg,600,y,`${r.outStart.toFixed(1)}–${r.outEnd.toFixed(1)} s  ·  ${r.retStart.toFixed(1)}–${r.retEnd.toFixed(1)} s`,{'text-anchor':'middle',fill:c.soft,'font-size':'9','letter-spacing':'2'});
    }
  };

  // Replaces fixed gait-personality block with individually controlled content.
  addPersonalityOverlay = function(svg){
    if(!state.time.length) return;
    const showDesc=state.textDisplay.gaitDescription;
    const showMetrics=state.textDisplay.metrics;
    if(!showDesc && !showMetrics) return;
    const c=textColours(), p=personalityDescriptor(), m=gaitMetrics();
    const g=svgEl('g',{'data-artwork-text':'gait',opacity:'.95'});
    let y=83;
    if(showDesc){
      const t1=svgEl('text',{x:92,y,fill:c.strong,'font-family':'Manrope, sans-serif','font-size':'27','font-weight':'600'});t1.textContent=p.title;g.appendChild(t1);y+=31;
      const body=p.body.length>118?p.body.slice(0,118)+'…':p.body;
      const t2=svgEl('text',{x:92,y,fill:c.mid,'font-family':'Inter, sans-serif','font-size':'11.5'});t2.textContent=body;g.appendChild(t2);y+=24;
    }
    if(showMetrics && m){
      const tempo=Number.isFinite(m.tempo)?Math.round(m.tempo):0;
      const variability=Number.isFinite(m.variability)?m.variability.toFixed(1):'—';
      const metric=`${tempo} detected cycles/min  ·  ${variability}% interval variation  ·  ${m.outCycles} + ${m.retCycles} accepted cycles`;
      const t3=svgEl('text',{x:92,y,fill:c.soft,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'.65'});t3.textContent=metric;g.appendChild(t3);
    }
    svg.appendChild(g);
  };

  function installUI(){
    const personality=document.getElementById('personalityPreview')?.closest('.panel-section');
    if(!personality) return;
    const heading=personality.querySelector('.section-heading');
    if(heading) heading.querySelector('h2').textContent='Identity + artwork text';

    const oldToggle=$('showPersonality')?.closest('label');
    const oldVoice=$('textVoice')?.closest('label');
    if(oldToggle) oldToggle.style.display='none';

    const wrap=document.createElement('div');
    wrap.className='identity-text-controls';
    wrap.innerHTML=`
      <div class="identity-grid">
        <label><span>Participant name</span><input id="participantName" type="text" autocomplete="off" placeholder="Optional" value="${state.participantName.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label>
        <label><span>Session date</span><input id="sessionDate" type="date" value="${state.sessionDate}"></label>
      </div>
      <label class="identity-field"><span>Design title <small>leave blank to use visualisation name</small></span><input id="designTitle" type="text" autocomplete="off" placeholder="${styleName()}" value="${state.designTitle.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label>
      <div class="text-options-title">Display on artwork</div>
      <div class="text-options">
        ${[
          ['participant','Participant name'],['sessionDate','Session date'],['designName','Design name'],['gaitDescription','Gait description'],['metrics','Detected-cycle metrics'],['journeyWindow','Journey time windows']
        ].map(([key,label])=>`<label><span>${label}</span><input type="checkbox" data-text-key="${key}" ${state.textDisplay[key]?'checked':''}></label>`).join('')}
      </div>`;
    if(oldVoice) personality.insertBefore(wrap,oldVoice); else personality.appendChild(wrap);

    $('participantName').addEventListener('input',e=>{state.participantName=e.target.value;render();});
    $('sessionDate').addEventListener('change',e=>{state.sessionDate=e.target.value;render();});
    $('designTitle').addEventListener('input',e=>{state.designTitle=e.target.value;render();});
    wrap.querySelectorAll('[data-text-key]').forEach(el=>el.addEventListener('change',e=>{state.textDisplay[e.target.dataset.textKey]=e.target.checked;render();}));

    // Keep the gait voice control: it still changes the wording when gait description is enabled.
    if(oldVoice){
      const label=oldVoice.querySelector('span'); if(label) label.textContent='Gait description voice';
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .identity-text-controls{margin:2px 0 14px}.identity-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.identity-grid label,.identity-field{display:grid;gap:6px;font-size:10px;color:#8998a8}.identity-grid input,.identity-field input{width:100%;min-width:0;background:#0c1219;color:#e9eef4;border:1px solid #273443;border-radius:9px;padding:9px;font:500 11px Inter,sans-serif}.identity-field{margin-top:9px}.identity-field small{font-size:8px;color:#647283;font-weight:400}.text-options-title{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#687789;margin:15px 0 6px}.text-options{border:1px solid #202c39;border-radius:11px;padding:3px 10px;background:#0a1016}.text-options label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #17212c;color:#aab6c3;font-size:10px}.text-options label:last-child{border-bottom:0}.text-options input{accent-color:#91aecb}
  `;
  document.head.appendChild(style);
  installUI();

  // Re-render once so the current artboard immediately adopts the new text system.
  if(state.time.length) render();
})();
