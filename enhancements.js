// Additional genuine-data visual systems + data-derived gait personality.
// This extends the existing app.js engine without changing its raw-data pipeline.

STYLES.push(
  { id:'terrain', name:'Terrain Echo', note:'topographic horizons shaped by the two measured journey windows' },
  { id:'bloom', name:'Gait Bloom', note:'detected motion cycles unfold as a radial flower' },
  { id:'halo', name:'Halo Barcode', note:'concentric arc bands encode the recorded signal through time' },
  { id:'constellation', name:'Tempo Constellation', note:'the measured x/y handlebar orbit becomes a field of trails and stars' },
);

state.showPersonality = true;
state.textVoice = 'fun';

function enhancementDynamic(){
  return highpassApprox(state.mag, Math.max(8, Math.round(sampleRate()*.28)));
}

function cycleMetrics(mid){
  const half=state.windowSeconds/2, start=mid-half, end=mid+half, dyn=enhancementDynamic();
  const tt=[], yy=[];
  for(let i=0;i<state.time.length;i++) if(state.time[i]>=start&&state.time[i]<=end){tt.push(state.time[i]);yy.push(dyn[i]);}
  if(tt.length<10) return {intervals:[],tempo:0,variability:0,cycles:[]};
  const n=normSignal(yy), fs=sampleRate(), minDist=Math.max(2,Math.round(fs*.34));
  const threshold=Math.max(.16, std(n)*.32), peaks=[];
  for(let i=1;i<n.length-1;i++){
    if(n[i]>threshold&&n[i]>=n[i-1]&&n[i]>=n[i+1]){
      if(!peaks.length||i-peaks.at(-1)>=minDist)peaks.push(i);
      else if(n[i]>n[peaks.at(-1)])peaks[peaks.length-1]=i;
    }
  }
  const intervals=[],cycles=[];
  for(let i=0;i<peaks.length-1;i++){
    const a=peaks[i],b=peaks[i+1],dur=tt[b]-tt[a];
    if(dur>=.34&&dur<=.75){ intervals.push(dur); cycles.push(resample(n.slice(a,b+1),180)); }
  }
  const tempo=intervals.length?60/mean(intervals):0;
  const variability=intervals.length>1?std(intervals)/mean(intervals)*100:0;
  return {intervals,tempo,variability,cycles};
}

function gaitMetrics(){
  if(!state.time.length)return null;
  const out=cycleMetrics(state.outMid),ret=cycleMetrics(state.retMid),r=selectedRanges(),dyn=enhancementDynamic();
  const outSig=sliceRange(dyn,r.outStart,r.outEnd),retSig=sliceRange(dyn,r.retStart,r.retEnd);
  const outEnergy=rms(outSig),retEnergy=rms(retSig),avgEnergy=(outEnergy+retEnergy)/2;
  const balance=(retEnergy-outEnergy)/Math.max(.0001,avgEnergy)*100;
  const tempos=[out.tempo,ret.tempo].filter(Boolean),vars=[out.variability,ret.variability].filter(v=>Number.isFinite(v)&&v>0);
  return {
    tempo:tempos.length?mean(tempos):0,
    outTempo:out.tempo, retTempo:ret.tempo,
    variability:vars.length?mean(vars):0,
    balance, outEnergy, retEnergy, avgEnergy,
    outCycles:out.cycles.length, retCycles:ret.cycles.length,
    out,ret,
  };
}

function personalityDescriptor(){
  const m=gaitMetrics();
  if(!m)return {title:'No data',sub:'',body:''};
  const tempo=m.tempo<100?'Unhurried':m.tempo<115?'Measured':m.tempo<130?'Brisk':'Quick';
  const regularity=m.variability<8?'Steady':m.variability<14?'Flowing':'Variable';
  const balance=Math.abs(m.balance)<8?'Balanced':m.balance>0?'Return-led':'Outbound-led';
  const energy=m.avgEnergy<.5?'Light-touch':m.avgEnergy<.95?'Grounded':'High-energy';
  if(state.textVoice==='precise'){
    return {
      title:`${Math.round(m.tempo)} detected cycles/min · ${m.variability.toFixed(1)}% variation`,
      sub:`${balance} · outward ${m.outTempo.toFixed(0)} / return ${m.retTempo.toFixed(0)} cycles/min`,
      body:`Calculated from the selected handlebar-motion windows; ${m.outCycles} outward and ${m.retCycles} return cycles were accepted by the detector.`
    };
  }
  if(state.textVoice==='poetic'){
    return {
      title:`${tempo} pulse, ${regularity.toLowerCase()} line`,
      sub:`${balance.toLowerCase()} between the outward journey and the return`,
      body:`A ${energy.toLowerCase()} gesture through the handlebars, repeating with ${regularity.toLowerCase()} timing across the two passages.`
    };
  }
  return {
    title:`${tempo} • ${regularity} • ${balance}`,
    sub:`${Math.round(m.tempo)} detected cycles/min · ${m.outCycles} + ${m.retCycles} accepted cycles`,
    body:`A ${tempo.toLowerCase()}, ${regularity.toLowerCase()} rhythm with a ${energy.toLowerCase()} motion signature${Math.abs(m.balance)<8?', staying closely balanced out and back':m.balance>0?', with a little more motion on the return':', with a little more motion on the outward journey'}.`
  };
}

function updatePersonalityPreview(){
  const el=$('personalityPreview'); if(!el)return;
  if(!state.time.length){el.textContent='Load a recording to generate a gait personality.';return;}
  const p=personalityDescriptor();
  el.innerHTML=`<strong>${p.title}</strong>${p.body}`;
}

function addPersonalityOverlay(svg){
  if(!state.showPersonality||!state.time.length)return;
  const p=personalityDescriptor(),fg=state.darkGround?'#f3f8fc':'#17212d',mid=state.darkGround?'#b6c7d8':'#374657',muted=state.darkGround?'#8296aa':'#657484';
  const g=svgEl('g',{opacity:'.94'});
  const t1=svgEl('text',{x:92,y:92,fill:fg,'font-family':'Manrope, sans-serif','font-size':'30','font-weight':'600'});t1.textContent=p.title;
  const t2=svgEl('text',{x:92,y:124,fill:mid,'font-family':'Inter, sans-serif','font-size':'13','letter-spacing':'1'});t2.textContent=p.sub;
  const t3=svgEl('text',{x:92,y:151,fill:muted,'font-family':'Inter, sans-serif','font-size':'12'});t3.textContent=p.body.length>105?p.body.slice(0,105)+'…':p.body;
  append(g,t1,t2,t3);svg.appendChild(g);
}

function renderTerrain(){
  const svg=baseArt(),{out,ret}=dataSignals(),a=resample(out,820),b=resample(ret,820),layers=Math.max(14,Math.round(state.density*.48));
  for(let k=0;k<layers;k++){
    const f=k/(layers-1||1),up=610-k*17,down=640+k*17;
    const p1=a.map((v,i)=>[92+i/(a.length-1)*1016,up-v*(52+76*f)]);
    const p2=b.map((v,i)=>[92+i/(b.length-1)*1016,down-v*(52+76*(1-f))]);
    addSegmented(svg,p1,0,f,a,.17+.45*(1-f*.8),state.strokeWidth*(.7+.65*(1-f)));
    addSegmented(svg,p2,1,f,b,.17+.45*(1-f*.8),state.strokeWidth*(.7+.65*(1-f)));
  }
  addSignature(svg,'Terrain Echo');
}

function renderBloom(){
  const svg=baseArt(),out=cycleMetrics(state.outMid).cycles.slice(0,28),ret=cycleMetrics(state.retMid).cycles.slice(0,28),g=svgEl('g',{transform:'translate(600 610)'});
  g.appendChild(svgEl('circle',{cx:0,cy:0,r:30,fill:state.darkGround?'#ffffff09':'#00000008',stroke:paletteColor(.5),'stroke-width':String(state.strokeWidth),opacity:'.45'}));
  const draw=(cycles,a0,a1,journey)=>cycles.forEach((cyc,k)=>{
    const f=k/(cycles.length-1||1),ang=lerp(a0,a1,f),arr=resample(cyc,96),pts=[[0,0]];
    arr.forEach((v,i)=>{const q=i/(arr.length-1),rr=105+q*(225+Math.abs(v)*22)+v*34,th=ang+(q-.5)*.38;pts.push([Math.cos(th)*rr,Math.sin(th)*rr]);});pts.push([0,0]);
    const path=svgEl('path',{d:pathD(pts),fill:'none',stroke:paletteColor(colorScalar({journey,strand:f,time:f,amp:clamp(rms(cyc),0,1)})),'stroke-width':String(state.strokeWidth*(.75+.55*(1-f))),opacity:String(.22+.58*(1-f))});g.appendChild(path);
  });
  draw(out,Math.PI*1.06,Math.PI*1.94,0);draw(ret,-Math.PI*.94,-Math.PI*.06,1);svg.appendChild(g);addSignature(svg,`Gait Bloom · ${out.length} + ${ret.length} cycles`);
}

function renderHalo(){
  const svg=baseArt(),{out,ret}=dataSignals(),a=resample(out,210),b=resample(ret,210),g=svgEl('g',{transform:'translate(600 610)'}),rings=14;
  for(let r=0;r<rings;r++){
    const f=r/(rings-1),source=r<rings/2?a:b,journey=r<rings/2?0:1,baseR=145+f*330;
    for(let i=0;i<source.length;i+=3){
      const v=source[i],amp=clamp(Math.abs(v)/1.6,0,1),ang=i/source.length*Math.PI*2,span=.012+amp*.062+state.complexity*.00016;
      const p1=[Math.cos(ang)*baseR,Math.sin(ang)*baseR],p2=[Math.cos(ang+span)*baseR,Math.sin(ang+span)*baseR],d=`M ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A ${baseR.toFixed(2)} ${baseR.toFixed(2)} 0 0 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
      g.appendChild(svgEl('path',{d,fill:'none',stroke:paletteColor(colorScalar({journey,strand:f,time:i/source.length,amp})),'stroke-width':String(state.strokeWidth*(.75+amp*1.2)),opacity:String(.16+amp*.68)}));
    }
  }
  svg.appendChild(g);addSignature(svg,'Halo Barcode');
}

function renderConstellation(){
  const svg=baseArt(),r=selectedRanges(),out=sliceXY(r.outStart,r.outEnd),ret=sliceXY(r.retStart,r.retEnd),stepOut=Math.max(1,Math.round(out.length/240)),stepRet=Math.max(1,Math.round(ret.length/240));
  const ptsRaw=[...out.filter((_,i)=>i%stepOut===0).map(p=>({x:p[0],y:p[1],j:0})),...ret.filter((_,i)=>i%stepRet===0).map(p=>({x:p[0],y:p[1],j:1}))];
  if(!ptsRaw.length){addSignature(svg,'Tempo Constellation');return;}
  const mx=mean(ptsRaw.map(p=>p.x)),my=mean(ptsRaw.map(p=>p.y)),sx=quantile(ptsRaw.map(p=>Math.abs(p.x-mx)),.96)||1,sy=quantile(ptsRaw.map(p=>Math.abs(p.y-my)),.96)||1;
  const pts=ptsRaw.map((p,i)=>({x:600+(p.x-mx)/sx*340,y:615+(p.y-my)/sy*340,j:p.j,t:i/(ptsRaw.length-1||1)}));
  for(let i=1;i<pts.length;i++){
    const p=pts[i-1],q=pts[i];
    if(p.j!==q.j)continue; // Separate journeys: never invent a connecting trajectory.
    svg.appendChild(svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:paletteColor(colorScalar({journey:q.j,strand:q.t,time:q.t,amp:.5})),'stroke-width':String(state.strokeWidth*.55),opacity:'.16'}));
  }
  pts.forEach((p,i)=>{const rr=1.2+seeded(i+700)*3.8;svg.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:rr.toFixed(2),fill:paletteColor(colorScalar({journey:p.j,strand:p.t,time:p.t,amp:rr/5})) ,opacity:'.82',filter:'url(#glow)'}));});
  addSignature(svg,'Tempo Constellation');
}

const originalRender=render;
render=function(){
  if(!state.time.length)return;
  if(state.style==='terrain')renderTerrain();
  else if(state.style==='bloom')renderBloom();
  else if(state.style==='halo')renderHalo();
  else if(state.style==='constellation')renderConstellation();
  else originalRender();
  addPersonalityOverlay($('artboard'));
  updatePersonalityPreview();
};

const originalUpdateOutputs=updateOutputs;
updateOutputs=function(){ originalUpdateOutputs(); updatePersonalityPreview(); };

$('showPersonality').onchange=e=>{state.showPersonality=e.target.checked;render();};
$('textVoice').onchange=e=>{state.textVoice=e.target.value;render();};

buildStyleGallery();
updatePersonalityPreview();
