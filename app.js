const $ = (id) => document.getElementById(id);

const PALETTES = {
  aurora: { name: 'Aurora', colors: ['#1BE7FF','#4D7CFE','#7A5CFF','#D94CFF','#FF8A4C'] },
  ember: { name: 'Ember', colors: ['#FFEEA8','#FFC14D','#FF7B38','#E93C54','#741B47'] },
  mineral: { name: 'Mineral', colors: ['#C7FFF4','#55E6C1','#1AA6B7','#3454D1','#7B2CBF'] },
  bloom: { name: 'Bloom', colors: ['#FFE0F2','#FF8FCF','#FF5E78','#FF9F43','#FFE66D'] },
  nocturne: { name: 'Nocturne', colors: ['#B8F3FF','#3AC7FF','#5570FF','#854DFF','#FF5FCB'] },
  earth: { name: 'Earth / Gold', colors: ['#F7E7CE','#D7A44A','#A85D33','#5F3B2E','#1F6A62'] },
  mono: { name: 'Silver Ink', colors: ['#F5F7FA','#C6CED8','#8A96A6','#536171','#202A36'] },
  festival: { name: 'Festival', colors: ['#00F5D4','#00BBF9','#9B5DE5','#F15BB5','#FEE440'] },
};

const STYLES = [
  { id:'ribbons', name:'Pulse Ribbons', note:'layered contours grown from each measured journey' },
  { id:'orbit', name:'Twin Orbit', note:'two journey windows folded into one circular portrait' },
  { id:'choir', name:'Step Choir', note:'individual detected step-to-step cycles become strands' },
  { id:'weave', name:'Motion Weave', note:'x/y motion and acceleration woven into a textile-like field' },
];

const state = {
  time:[], x:[], y:[], z:[], mag:[], duration:0,
  outMid:26, retMid:82, windowSeconds:15,
  markers:null, style:'ribbons', palette:'aurora', customPalette:[...PALETTES.aurora.colors],
  colorMode:'time', density:48, strokeWidth:1.2, glow:34, complexity:68, symmetry:18,
  darkGround:true, showSignature:true, variation:0, filename:'walk',
};

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function mean(a){ return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0; }
function std(a){ const m=mean(a); return Math.sqrt(mean(a.map(v=>(v-m)**2))); }
function quantile(a,q){ if(!a.length)return 0; const s=[...a].sort((u,v)=>u-v), p=(s.length-1)*q, lo=Math.floor(p), hi=Math.ceil(p); return lo===hi?s[lo]:lerp(s[lo],s[hi],p-lo); }
function movingAverage(a,r=4){ const out=new Array(a.length); let sum=0; for(let i=0;i<a.length;i++){ sum+=a[i]; if(i-r-1>=0)sum-=a[i-r-1]; const n=Math.min(i+1,r+1); out[i]=sum/n; } return out; }
function highpassApprox(a,r=70){ const low=movingAverage(a,r); return a.map((v,i)=>v-low[i]); }
function normSignal(a){ const med=quantile(a,.5), c=a.map(v=>v-med), sc=quantile(c.map(Math.abs),.98)||1; return c.map(v=>clamp(v/sc,-1.65,1.65)); }
function resample(a,n){ if(!a.length)return []; if(a.length===1)return Array(n).fill(a[0]); const out=[]; for(let i=0;i<n;i++){const p=i*(a.length-1)/(n-1),lo=Math.floor(p),hi=Math.min(a.length-1,lo+1),f=p-lo; out.push(lerp(a[lo],a[hi],f));} return out; }
function seeded(i){ const x=Math.sin((i+1)*12.9898 + state.variation*78.233 + state.mag.length*.017)*43758.5453; return x-Math.floor(x); }
function hexRgb(hex){ const h=hex.replace('#',''); const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function mixHex(a,b,t){ const A=hexRgb(a),B=hexRgb(b); return '#'+A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join(''); }
function rgba(hex,a){ const [r,g,b]=hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function paletteColor(t){ const p=state.customPalette; t=clamp(t,0,.999999); const x=t*(p.length-1),i=Math.floor(x),f=x-i; return mixHex(p[i],p[Math.min(p.length-1,i+1)],f); }
function svgEl(tag,attrs={}){ const e=document.createElementNS('http://www.w3.org/2000/svg',tag); for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v); return e; }
function pathD(points,close=false){ if(!points.length)return ''; return `M ${points.map((p,i)=>`${i?'L ':''}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')}${close?' Z':''}`; }
function append(parent,...nodes){ nodes.forEach(n=>parent.appendChild(n)); }
function sampleRate(){ return state.duration>0 ? state.time.length/state.duration : 100; }
function sliceRange(arr,start,end){ const o=[]; for(let i=0;i<state.time.length;i++)if(state.time[i]>=start&&state.time[i]<=end)o.push(arr[i]); return o; }
function sliceXY(start,end){ const o=[]; for(let i=0;i<state.time.length;i++)if(state.time[i]>=start&&state.time[i]<=end)o.push([state.x[i],state.y[i]]); return o; }
function selectedRanges(){ const h=state.windowSeconds/2; return {outStart:state.outMid-h,outEnd:state.outMid+h,retStart:state.retMid-h,retEnd:state.retMid+h}; }

function detectMarkers(){
  if(state.time.length<20)return null;
  const fs=sampleRate(), dyn=highpassApprox(state.mag,Math.max(10,Math.round(fs*.7))), a=dyn.map(Math.abs), th=quantile(a,.993);
  const minGap=Math.max(1,Math.round(fs*.26)); const peaks=[];
  for(let i=1;i<a.length-1;i++){
    if(a[i]>=th&&a[i]>=a[i-1]&&a[i]>=a[i+1]&&(!peaks.length||i-peaks.at(-1)>=minGap)) peaks.push(i);
    else if(peaks.length&&i-peaks.at(-1)<minGap&&a[i]>a[peaks.at(-1)]) peaks[peaks.length-1]=i;
  }
  const groups=[]; let cur=[];
  for(const idx of peaks){ if(!cur.length||state.time[idx]-state.time[cur.at(-1)]<=2.2)cur.push(idx); else{groups.push(cur);cur=[idx];} } if(cur.length)groups.push(cur);
  const candidates=groups.filter(g=>g.length>=2).map(g=>({
    start:state.time[g[0]], end:state.time[g.at(-1)], center:(state.time[g[0]]+state.time[g.at(-1)])/2,
    count:g.length, strength:mean(g.map(i=>a[i])), span:state.time[g.at(-1)]-state.time[g[0]],
  }));
  if(candidates.length<2)return null;
  const score=c=>c.strength*(1+Math.min(c.count,4)*.22)/(1+Math.abs(c.count-3)*.18+Math.max(0,c.span-2)*.4);
  const starts=candidates.filter(c=>c.center<state.duration*.2); const start=(starts.length?starts:candidates.slice(0,2)).sort((a,b)=>score(b)-score(a))[0];
  const middlePool=candidates.filter(c=>c.center>Math.max(state.duration*.2,start.end+12)&&c.center<state.duration*.62);
  const turn=(middlePool.length?middlePool:candidates.filter(c=>c.center>start.end+10)).sort((a,b)=>score(b)-score(a))[0];
  const endPool=candidates.filter(c=>c.center>turn.end+20&&c.center<=state.duration);
  const end=(endPool.length?endPool:candidates.filter(c=>c.center>turn.end+15)).sort((a,b)=>score(b)-score(a))[0];
  if(!start||!turn||!end)return null;
  return {start,turn,end,candidates};
}

function applyAutoJourneys(){
  state.markers=detectMarkers();
  if(state.markers){
    const {start,turn,end}=state.markers;
    const outA=start.end+1.8, outB=turn.start-2.0, retA=turn.end+3.0, retB=end.start-1.8;
    if(outB-outA>state.windowSeconds)state.outMid=(outA+outB)/2;
    else state.outMid=(start.center+turn.center)/2;
    if(retB-retA>state.windowSeconds)state.retMid=(retA+retB)/2;
    else state.retMid=(turn.center+end.center)/2;
  }else{
    state.outMid=state.duration*.25; state.retMid=state.duration*.65;
  }
  constrainSelections(); syncControls(); drawTimeline(); render();
}

function constrainSelections(){
  const h=state.windowSeconds/2, lo=h, hi=Math.max(h,state.duration-h);
  state.outMid=clamp(state.outMid,lo,hi); state.retMid=clamp(state.retMid,lo,hi);
  if(state.retMid<=state.outMid+h)state.retMid=clamp(state.outMid+state.windowSeconds+2,lo,hi);
}

function parseRows(rows){
  const keys=Object.keys(rows[0]||{}), pick=patterns=>keys.find(k=>patterns.some(p=>k.toLowerCase().includes(p)));
  const kt=pick(['time']),kx=pick(['acceleration x','accel x']),ky=pick(['acceleration y','accel y']),kz=pick(['acceleration z','accel z']),km=pick(['absolute acceleration','magnitude']);
  if(!kt||!(km||(kx&&ky&&kz)))throw new Error('Could not find Time and acceleration columns.');
  const clean=rows.map(r=>{const t=Number(r[kt]),x=kx?Number(r[kx]):0,y=ky?Number(r[ky]):0,z=kz?Number(r[kz]):0,m=km?Number(r[km]):Math.sqrt(x*x+y*y+z*z);return {t,x,y,z,m};}).filter(r=>Number.isFinite(r.t)&&Number.isFinite(r.m)).sort((a,b)=>a.t-b.t);
  if(clean.length<50)throw new Error('Not enough valid samples found.');
  const t0=clean[0].t;
  state.time=clean.map(r=>r.t-t0);state.x=clean.map(r=>r.x);state.y=clean.map(r=>r.y);state.z=clean.map(r=>r.z);state.mag=clean.map(r=>r.m);state.duration=state.time.at(-1);
  applyAutoJourneys(); setReady(true);
}

async function loadFile(file){
  state.filename=file.name.replace(/\.[^.]+$/,'')||'walk'; $('fileLabel').textContent=file.name;
  const buf=await file.arrayBuffer(); let rows=[];
  if(file.name.toLowerCase().endsWith('.csv')){ const text=new TextDecoder().decode(buf),wb=XLSX.read(text,{type:'string'});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null}); }
  else{ const wb=XLSX.read(buf,{type:'array'}),sheet=wb.Sheets['Raw Data']||wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(sheet,{defval:null}); }
  parseRows(rows);
}

function setReady(v){ $('statusDot').classList.toggle('ready',v); $('statusText').textContent=v?`${state.time.length.toLocaleString()} samples · ${state.duration.toFixed(1)} s`:'Load a recording to begin'; }
function syncControls(){
  const h=state.windowSeconds/2;
  for(const [id,val] of [['outMid',state.outMid],['retMid',state.retMid]]){ const el=$(id);el.min=h;el.max=Math.max(h,state.duration-h);el.value=val; }
  $('windowSeconds').value=state.windowSeconds;$('density').value=state.density;$('strokeWidth').value=state.strokeWidth;$('glow').value=state.glow;$('complexity').value=state.complexity;$('symmetry').value=state.symmetry;
  updateOutputs();
}
function updateOutputs(){
  $('outMidOut').textContent=`${state.outMid.toFixed(1)} s`;$('retMidOut').textContent=`${state.retMid.toFixed(1)} s`;$('windowOut').textContent=`${state.windowSeconds} s`;
  $('densityOut').textContent=state.density;$('strokeOut').textContent=state.strokeWidth.toFixed(2).replace(/0$/,'');$('glowOut').textContent=`${state.glow}%`;$('complexityOut').textContent=`${state.complexity}%`;$('symmetryOut').textContent=`${state.symmetry}%`;
  $('selectionReadout').textContent=`${state.windowSeconds} s outbound · ${state.windowSeconds} s return`;
  if(state.markers)$('markerReadout').textContent=`Detected taps: start ${state.markers.start.center.toFixed(1)} s · turn ${state.markers.turn.center.toFixed(1)} s · end ${state.markers.end.center.toFixed(1)} s`;
  else $('markerReadout').textContent='Tap clusters were not confidently detected; journey centres use fallback positions.';
}

function drawTimeline(){
  const svg=$('timeline');svg.innerHTML='';if(!state.time.length)return;
  const W=700,H=150,cy=74,sig=resample(normSignal(highpassApprox(state.mag,Math.max(10,Math.round(sampleRate()*.65)))),900);
  const tx=t=>clamp(t/state.duration,0,1)*W;
  const r=selectedRanges();
  append(svg,svgEl('rect',{x:tx(r.outStart),y:8,width:tx(r.outEnd)-tx(r.outStart),height:134,rx:7,fill:rgba(state.customPalette[0],.13)}),svgEl('rect',{x:tx(r.retStart),y:8,width:tx(r.retEnd)-tx(r.retStart),height:134,rx:7,fill:rgba(state.customPalette.at(-1),.13)}));
  const pts=sig.map((v,i)=>[i/(sig.length-1)*W,cy-v*27]);svg.appendChild(svgEl('path',{d:pathD(pts),fill:'none',stroke:'#617084','stroke-width':'1'}));
  if(state.markers){ for(const m of [state.markers.start,state.markers.turn,state.markers.end])svg.appendChild(svgEl('line',{x1:tx(m.center),x2:tx(m.center),y1:5,y2:145,stroke:'#dce4ec','stroke-width':'1','stroke-dasharray':'3 4',opacity:'.55'})); }
  for(const [mid,col] of [[state.outMid,state.customPalette[0]],[state.retMid,state.customPalette.at(-1)]]){ svg.appendChild(svgEl('line',{x1:tx(mid),x2:tx(mid),y1:8,y2:142,stroke:col,'stroke-width':'2'})); svg.appendChild(svgEl('circle',{cx:tx(mid),cy:14,r:4,fill:col})); }
}

function addDefs(svg){
  const defs=svgEl('defs');
  const bg=svgEl('radialGradient',{id:'bg',cx:'50%',cy:'43%',r:'75%'});append(bg,svgEl('stop',{offset:'0%','stop-color':state.darkGround?'#121925':'#ffffff'}),svgEl('stop',{offset:'100%','stop-color':state.darkGround?'#040609':'#eeeae2'}));defs.appendChild(bg);
  const glow=svgEl('filter',{id:'glow',x:'-60%',y:'-60%',width:'220%',height:'220%'});append(glow,svgEl('feGaussianBlur',{stdDeviation:String(.5+state.glow/15),result:'b'}));const merge=svgEl('feMerge');append(merge,svgEl('feMergeNode',{in:'b'}),svgEl('feMergeNode',{in:'SourceGraphic'}));glow.appendChild(merge);defs.appendChild(glow);
  const grad=svgEl('linearGradient',{id:'paletteLine',x1:'0%',y1:'0%',x2:'100%',y2:'0%'});state.customPalette.forEach((c,i)=>grad.appendChild(svgEl('stop',{offset:`${i/(state.customPalette.length-1)*100}%`,'stop-color':c})));defs.appendChild(grad);
  svg.appendChild(defs);
}
function baseArt(){ const svg=$('artboard');svg.innerHTML='';addDefs(svg);svg.appendChild(svgEl('rect',{width:1200,height:1200,fill:'url(#bg)'}));return svg; }
function colorScalar({journey=0,strand=.5,time=.5,amp=.5}){ if(state.colorMode==='journey')return journey?1:.05;if(state.colorMode==='strand')return strand;if(state.colorMode==='amplitude')return amp;return journey?(.48+.52*time):(.48*time); }
function dataSignals(){ const r=selectedRanges(),dyn=highpassApprox(state.mag,Math.max(10,Math.round(sampleRate()*.7)));return {r,out:normSignal(sliceRange(dyn,r.outStart,r.outEnd)),ret:normSignal(sliceRange(dyn,r.retStart,r.retEnd))}; }
function rms(a){ return Math.sqrt(mean(a.map(v=>v*v))); }
function addSegmented(svg,points,journey,strand,signal,opacity=.8,width=1){
  const chunks=Math.max(8,Math.round(10+state.complexity*.18)); const step=Math.max(2,Math.floor(points.length/chunks));
  for(let s=0;s<points.length-1;s+=step){ const e=Math.min(points.length,s+step+1),seg=points.slice(s,e), vals=signal.slice(Math.floor(s/points.length*signal.length),Math.max(Math.floor(e/points.length*signal.length),1)); const amp=clamp(rms(vals)/.8,0,1); const scalar=colorScalar({journey,strand,time:(s+e)/2/points.length,amp}); svg.appendChild(svgEl('path',{d:pathD(seg),fill:'none',stroke:paletteColor(scalar),'stroke-width':String(width),'stroke-linecap':'round','stroke-linejoin':'round',opacity:String(opacity)})); }
}
function addSignature(svg,label){ if(!state.showSignature)return;const fg=state.darkGround?'#aab6c4':'#3c4651',muted=state.darkGround?'#637183':'#69727d';const t=svgEl('text',{x:600,y:1138,'text-anchor':'middle',fill:fg,'font-family':'Inter, sans-serif','font-size':'15','letter-spacing':'6'});t.textContent=label.toUpperCase();const r=selectedRanges(),m=svgEl('text',{x:600,y:1168,'text-anchor':'middle',fill:muted,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'2.5'});m.textContent=`${r.outStart.toFixed(1)}–${r.outEnd.toFixed(1)} s  ·  ${r.retStart.toFixed(1)}–${r.retEnd.toFixed(1)} s`;append(svg,t,m); }

function renderRibbons(){
  const svg=baseArt(),{out,ret}=dataSignals(),n=1000,a=resample(out,n),b=resample(ret,n),layers=state.density,amp=70+state.complexity*1.05,sym=state.symmetry/100;
  for(let k=0;k<layers;k++){
    const f=k/(layers-1||1),base=lerp(205,520,f),phase=(seeded(k)-.5)*28*(1-sym),pts=a.map((v,i)=>{const x=95+i/(n-1)*1010,w=Math.sin(i*.012+k*.18+state.variation*.31)*lerp(3,18,state.complexity/100);return[x,base+v*amp*(.35+.75*Math.sin(Math.PI*f))+w+phase];});
    addSegmented(svg,pts,0,f,a,.12+.5*(1-Math.abs(f-.5)*1.6),state.strokeWidth*(.55+.65*f));
  }
  for(let k=0;k<layers;k++){
    const f=k/(layers-1||1),base=lerp(680,995,f),phase=(seeded(k+300)-.5)*28*(1-sym),pts=b.map((v,i)=>{const x=95+i/(n-1)*1010,w=-Math.sin(i*.012+k*.18+state.variation*.31)*lerp(3,18,state.complexity/100);return[x,base+v*amp*(.35+.75*Math.sin(Math.PI*f))+w+phase];});
    addSegmented(svg,pts,1,f,b,.12+.5*(1-Math.abs(f-.5)*1.6),state.strokeWidth*(1.2-.55*f));
  }
  const ca=a.map((v,i)=>[95+i/(n-1)*1010,365+v*145]),cb=b.map((v,i)=>[95+i/(n-1)*1010,835+v*145]);
  append(svg,svgEl('path',{d:pathD(ca),fill:'none',stroke:'url(#paletteLine)','stroke-width':String(state.strokeWidth*2.3),filter:'url(#glow)',opacity:'.8'}),svgEl('path',{d:pathD(cb),fill:'none',stroke:'url(#paletteLine)','stroke-width':String(state.strokeWidth*2.3),filter:'url(#glow)',opacity:'.8'}));addSignature(svg,'Pulse Ribbons');
}

function renderOrbit(){
  const svg=baseArt(),{out,ret}=dataSignals(),n=1600,a=resample(out,n),b=resample(ret,n),layers=Math.max(10,Math.round(state.density*.65)),C=[600,565],sym=state.symmetry/100;
  for(const [journey,arr,start,end] of [[0,a,Math.PI,0],[1,b,0,-Math.PI]]){
    for(let k=0;k<layers;k++){
      const f=k/(layers-1||1),base=270+f*145,jitter=(seeded(k+journey*200)-.5)*22*(1-sym),pts=arr.map((v,i)=>{const th=lerp(start,end,i/(n-1));const wave=Math.sin(i*.013+k*.21+state.variation*.27)*8*(1-sym);const rr=base+v*(48+state.complexity*.58)*(0.4+.75*Math.sin(Math.PI*f))+wave+jitter;return[C[0]+Math.cos(th)*rr,C[1]+Math.sin(th)*rr];});
      addSegmented(svg,pts,journey,f,arr,.14+.56*(1-Math.abs(f-.5)*1.5),state.strokeWidth*(.55+f*.65));
    }
  }
  const ring=svgEl('circle',{cx:C[0],cy:C[1],r:420,fill:'none',stroke:'url(#paletteLine)','stroke-width':String(state.strokeWidth*1.5),opacity:'.6',filter:'url(#glow)'});svg.appendChild(ring);
  const r=selectedRanges(),xy=[...sliceXY(r.outStart,r.outEnd),...sliceXY(r.retStart,r.retEnd)];if(xy.length){const mx=mean(xy.map(p=>p[0])),my=mean(xy.map(p=>p[1])),sx=quantile(xy.map(p=>Math.abs(p[0]-mx)),.96)||1,sy=quantile(xy.map(p=>Math.abs(p[1]-my)),.96)||1,samp=resample(xy.map(p=>(p[0]-mx)/sx),500),sampY=resample(xy.map(p=>(p[1]-my)/sy),500),pts=samp.map((v,i)=>[600+v*115,565+sampY[i]*115]);svg.appendChild(svgEl('path',{d:pathD(pts),fill:'none',stroke:paletteColor(.52),'stroke-width':String(state.strokeWidth*.75),opacity:'.45'}));}
  addSignature(svg,'Twin Orbit');
}

function detectCycles(mid){
  const h=state.windowSeconds/2,r={a:mid-h,b:mid+h},dyn=highpassApprox(state.mag,Math.max(8,Math.round(sampleRate()*.25))),tt=[],yy=[];for(let i=0;i<state.time.length;i++)if(state.time[i]>=r.a&&state.time[i]<=r.b){tt.push(state.time[i]);yy.push(dyn[i]);}
  const n=normSignal(yy),fs=sampleRate(),dist=Math.round(fs*.34),prom=Math.max(.2,std(n)*.35),peaks=[];
  for(let i=1;i<n.length-1;i++){if(n[i]>n[i-1]&&n[i]>=n[i+1]&&n[i]>prom&&(!peaks.length||i-peaks.at(-1)>=dist))peaks.push(i);else if(peaks.length&&i-peaks.at(-1)<dist&&n[i]>n[peaks.at(-1)])peaks[peaks.length-1]=i;}
  const cycles=[];for(let j=0;j<peaks.length-1;j++){const a=peaks[j],b=peaks[j+1],dur=tt[b]-tt[a];if(dur>=.34&&dur<=.75)cycles.push(resample(n.slice(a,b+1),220));}return cycles;
}
function renderChoir(){
  const svg=baseArt(),co=detectCycles(state.outMid),cr=detectCycles(state.retMid),maxRows=Math.max(8,Math.min(Math.round(state.density*.75),45));
  const draw=(cycles,journey,top,bottom)=>{const chosen=cycles.slice(0,maxRows),gap=(bottom-top)/Math.max(1,chosen.length);chosen.forEach((c,k)=>{const f=k/Math.max(1,chosen.length-1),y=top+k*gap,pts=c.map((v,i)=>[135+i/(c.length-1)*930,y+v*(18+state.complexity*.28)]);addSegmented(svg,pts,journey,f,c,.42+.25*(1-Math.abs(f-.5)*1.7),state.strokeWidth);}); if(chosen.length){const med=[];for(let i=0;i<chosen[0].length;i++)med.push(quantile(chosen.map(c=>c[i]),.5));const pts=med.map((v,i)=>[135+i/(med.length-1)*930,(top+bottom)/2+v*70]);svg.appendChild(svgEl('path',{d:pathD(pts),fill:'none',stroke:'url(#paletteLine)','stroke-width':String(state.strokeWidth*2),filter:'url(#glow)',opacity:'.7'}));}};
  draw(co,0,145,515);draw(cr,1,665,1035);addSignature(svg,`Step Choir · ${co.length} + ${cr.length} cycles`);
}

function renderWeave(){
  const svg=baseArt(),r=selectedRanges(),dyn=highpassApprox(state.mag,Math.max(10,Math.round(sampleRate()*.7))),out=normSignal(sliceRange(dyn,r.outStart,r.outEnd)),ret=normSignal(sliceRange(dyn,r.retStart,r.retEnd)),n=520,a=resample(out,n),b=resample(ret,n),rows=Math.max(18,Math.round(state.density*.8)),cols=Math.max(20,Math.round(state.density*.9));
  for(let j=0;j<rows;j++){const f=j/(rows-1||1),y=150+f*900,journey=f<.5?0:1,arr=journey?a:b,pts=arr.map((v,i)=>[120+i/(n-1)*960,y+v*(18+state.complexity*.34)*Math.sin(Math.PI*f)]);addSegmented(svg,pts,journey,f,arr,.16+.38*Math.sin(Math.PI*f),state.strokeWidth*.7);}
  for(let j=0;j<cols;j++){const f=j/(cols-1||1),x=145+f*910,idx=Math.floor(f*(n-1)),pts=[];for(let q=0;q<170;q++){const u=q/169,y=150+u*900,blend=lerp(a[idx]||0,b[idx]||0,u),warp=blend*(26+state.complexity*.35)*Math.sin(Math.PI*u);pts.push([x+warp,y]);}const arr=[a[idx]||0,b[idx]||0];addSegmented(svg,pts,f>.5?1:0,f,arr,.12+.32*(1-Math.abs(f-.5)*1.4),state.strokeWidth*.55);}
  addSignature(svg,'Motion Weave');
}

function render(){ if(!state.time.length)return; if(state.style==='orbit')renderOrbit(); else if(state.style==='choir')renderChoir(); else if(state.style==='weave')renderWeave(); else renderRibbons(); }

function buildStyleGallery(){ const g=$('styleGallery');g.innerHTML='';STYLES.forEach(s=>{const c=document.createElement('button');c.type='button';c.className='style-card'+(s.id===state.style?' active':'');c.dataset.style=s.id;c.innerHTML=`<div class="style-preview"></div><strong>${s.name}</strong><span>${s.note}</span>`;c.onclick=()=>{state.style=s.id;buildStyleGallery();render();};g.appendChild(c);}); }
function buildPaletteGallery(){ const g=$('paletteGallery');g.innerHTML='';Object.entries(PALETTES).forEach(([id,p])=>{const c=document.createElement('button');c.type='button';c.className='palette-card'+(id===state.palette?' active':'');c.innerHTML=`<div class="swatches">${p.colors.map(x=>`<i style="background:${x}"></i>`).join('')}</div><small>${p.name}</small>`;c.onclick=()=>{state.palette=id;state.customPalette=[...p.colors];document.querySelectorAll('.palette-color').forEach((el,i)=>el.value=state.customPalette[i]);buildPaletteGallery();drawTimeline();render();};g.appendChild(c);}); }

function downloadBlob(blob,name){ const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},200); }
function svgText(){ const clone=$('artboard').cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1200');clone.setAttribute('height','1200');return new XMLSerializer().serializeToString(clone); }
function exportSvg(){ if(!state.time.length)return;downloadBlob(new Blob([svgText()],{type:'image/svg+xml;charset=utf-8'}),`${state.filename}-${state.style}.svg`); }
function exportPng(){ if(!state.time.length)return;const blob=new Blob([svgText()],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=3200;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,3200,3200);URL.revokeObjectURL(url);canvas.toBlob(b=>downloadBlob(b,`${state.filename}-${state.style}.png`),'image/png');};img.src=url; }

function wire(){
  buildStyleGallery();buildPaletteGallery();updateOutputs();
  $('fileInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{await loadFile(f);}catch(err){alert(err.message);setReady(false);}};
  const drop=$('fileDrop');['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging');}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging');}));drop.addEventListener('drop',async e=>{const f=e.dataTransfer.files[0];if(f)try{await loadFile(f);$('fileLabel').textContent=f.name;}catch(err){alert(err.message);}});
  $('autoJourneys').onclick=applyAutoJourneys;
  $('outMid').oninput=e=>{state.outMid=+e.target.value;updateOutputs();drawTimeline();render();};$('retMid').oninput=e=>{state.retMid=+e.target.value;updateOutputs();drawTimeline();render();};
  $('windowSeconds').oninput=e=>{state.windowSeconds=+e.target.value;constrainSelections();syncControls();drawTimeline();render();};
  for(const [id,key,num] of [['density','density',true],['strokeWidth','strokeWidth',true],['glow','glow',true],['complexity','complexity',true],['symmetry','symmetry',true]])$(id).oninput=e=>{state[key]=num?+e.target.value:e.target.value;updateOutputs();render();};
  $('darkGround').onchange=e=>{state.darkGround=e.target.checked;render();};$('showSignature').onchange=e=>{state.showSignature=e.target.checked;render();};$('colorMode').onchange=e=>{state.colorMode=e.target.value;render();};
  document.querySelectorAll('.palette-color').forEach((el,i)=>el.oninput=e=>{state.palette='custom';state.customPalette[i]=e.target.value;buildPaletteGallery();drawTimeline();render();});
  $('variation').onclick=()=>{state.variation++;render();};$('exportSvg').onclick=exportSvg;$('exportPng').onclick=exportPng;
}
wire();
