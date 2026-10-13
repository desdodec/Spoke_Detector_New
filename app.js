const $ = (id) => document.getElementById(id);

const state = {
  rows: [],
  time: [],
  x: [],
  y: [],
  z: [],
  mag: [],
  duration: 0,
  midpoint: 55,
  windowSeconds: 20,
  turnGap: 5,
  style: 'ribbons',
  outColor: '#2fa8ff',
  retColor: '#ff8a1f',
  density: 42,
  strokeWidth: 1.3,
  glow: 38,
  complexity: 64,
  darkGround: true,
  showSignature: true,
};

const styles = [
  { id: 'ribbons', name: 'Pulse Ribbons', note: 'flowing layered gait contours' },
  { id: 'orbit', name: 'Twin Orbit', note: 'out-and-back circular portrait' },
  { id: 'choir', name: 'Step Choir', note: 'each detected cycle becomes a strand' },
  { id: 'weave', name: 'Motion Weave', note: 'sample-true woven field' },
];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function std(a) { const m = mean(a); return Math.sqrt(mean(a.map(v => (v-m)**2))); }
function quantile(a, q) {
  if (!a.length) return 0;
  const s = [...a].sort((u,v)=>u-v);
  const p = (s.length - 1) * q;
  const lo = Math.floor(p), hi = Math.ceil(p);
  return lo === hi ? s[lo] : lerp(s[lo], s[hi], p-lo);
}
function normSignal(a) {
  const med = quantile(a, .5);
  const centered = a.map(v => v - med);
  const scale = quantile(centered.map(Math.abs), .98) || 1;
  return centered.map(v => clamp(v / scale, -1.5, 1.5));
}
function movingAverage(a, radius=4) {
  const out = new Array(a.length);
  let sum=0, count=0;
  for(let i=0;i<a.length;i++){
    sum += a[i]; count++;
    if(i-radius-1>=0){sum-=a[i-radius-1];count--;}
    out[i]=sum/count;
  }
  return out;
}
function highpassApprox(a, radius=70) {
  const low = movingAverage(a, radius);
  return a.map((v,i)=>v-low[i]);
}
function resample(a, n) {
  if (!a.length) return [];
  if (a.length === 1) return Array(n).fill(a[0]);
  const out = [];
  for(let i=0;i<n;i++){
    const p = i*(a.length-1)/(n-1);
    const lo = Math.floor(p), hi = Math.min(a.length-1, lo+1), f=p-lo;
    out.push(lerp(a[lo], a[hi], f));
  }
  return out;
}
function hexToRgba(hex, a=1){
  const h = hex.replace('#','');
  const n = parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function svgEl(tag, attrs={}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function pointsPath(points, close=false) {
  if (!points.length) return '';
  return `M ${points.map((p,i)=>`${i?'L ':''}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')}${close?' Z':''}`;
}
function selectedRanges(){
  const halfGap = state.turnGap;
  const outEnd = state.midpoint - halfGap;
  const outStart = outEnd - state.windowSeconds;
  const retStart = state.midpoint + halfGap;
  const retEnd = retStart + state.windowSeconds;
  return { outStart, outEnd, retStart, retEnd };
}
function sliceRange(arr, start, end){
  const out=[];
  for(let i=0;i<state.time.length;i++) if(state.time[i]>=start && state.time[i]<=end) out.push(arr[i]);
  return out;
}
function sliceRangeXY(start,end){
  const out=[];
  for(let i=0;i<state.time.length;i++) if(state.time[i]>=start && state.time[i]<=end) out.push([state.x[i],state.y[i]]);
  return out;
}
function detectMidpoint(){
  if(!state.time.length) return 55;
  const dyn = highpassApprox(state.mag, Math.max(10, Math.round(state.time.length/state.duration*0.7)));
  const abs = dyn.map(Math.abs);
  const step = Math.max(1, Math.round(state.time.length / state.duration * 0.25));
  let bestT = state.duration/2, bestScore=-Infinity;
  const lo = state.duration*.25, hi = state.duration*.75;
  for(let i=step;i<abs.length-step;i+=step){
    const ti=state.time[i]; if(ti<lo||ti>hi) continue;
    let s=0; for(let j=Math.max(0,i-step);j<Math.min(abs.length,i+step);j++) s+=abs[j];
    if(s>bestScore){bestScore=s;bestT=ti;}
  }
  return bestT;
}
function parseRows(rows){
  const keys = Object.keys(rows[0]||{});
  const pick=(patterns)=>keys.find(k=>patterns.some(p=>k.toLowerCase().includes(p)));
  const kt=pick(['time']);
  const kx=pick(['acceleration x','accel x']);
  const ky=pick(['acceleration y','accel y']);
  const kz=pick(['acceleration z','accel z']);
  const km=pick(['absolute acceleration','magnitude']);
  if(!kt || !(km || (kx&&ky&&kz))) throw new Error('Could not find Time and acceleration columns.');
  const clean = rows.map(r=>{
    const tt=Number(r[kt]);
    const xx=kx?Number(r[kx]):0, yy=ky?Number(r[ky]):0, zz=kz?Number(r[kz]):0;
    const mm=km?Number(r[km]):Math.sqrt(xx*xx+yy*yy+zz*zz);
    return {t:tt,x:xx,y:yy,z:zz,m:mm};
  }).filter(r=>[r.t,r.m].every(Number.isFinite)).sort((a,b)=>a.t-b.t);
  state.rows=clean;
  state.time=clean.map(r=>r.t); state.x=clean.map(r=>r.x); state.y=clean.map(r=>r.y); state.z=clean.map(r=>r.z); state.mag=clean.map(r=>r.m);
  state.duration=state.time.at(-1)-state.time[0];
  state.midpoint=detectMidpoint();
  $('midpoint').min=Math.max(0,state.windowSeconds+state.turnGap);
  $('midpoint').max=Math.max(state.midpoint+1,state.duration-state.windowSeconds-state.turnGap);
  $('midpoint').value=state.midpoint;
  updateOutputs(); drawTimeline(); render(); setReady(true);
}
async function loadFile(file){
  const buf = await file.arrayBuffer();
  let rows=[];
  if(file.name.toLowerCase().endsWith('.csv')){
    const text=new TextDecoder().decode(buf);
    const wb=XLSX.read(text,{type:'string'}); rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});
  }else{
    const wb=XLSX.read(buf,{type:'array'});
    const sheet=wb.Sheets['Raw Data']||wb.Sheets[wb.SheetNames[0]];
    rows=XLSX.utils.sheet_to_json(sheet,{defval:null});
  }
  parseRows(rows);
}
function setReady(ready){
  $('statusDot').classList.toggle('ready',ready);
  $('statusText').textContent=ready?`${state.time.length.toLocaleString()} samples loaded`:'Load a recording to begin';
}
function updateOutputs(){
  $('midpointOut').textContent=`${Number(state.midpoint).toFixed(1)} s`;
  $('windowOut').textContent=`${state.windowSeconds} s`;
  $('gapOut').textContent=`${state.turnGap} s`;
  $('densityOut').textContent=state.density;
  $('strokeOut').textContent=state.strokeWidth.toFixed(1);
  $('glowOut').textContent=`${state.glow}%`;
  $('complexityOut').textContent=`${state.complexity}%`;
  $('selectionReadout').textContent=`${state.windowSeconds} s outbound + ${state.windowSeconds} s return`;
}
function drawTimeline(){
  const svg=$('timeline'); svg.innerHTML='';
  if(!state.time.length) return;
  const W=600,H=120, mid=60;
  const sig=normSignal(highpassApprox(state.mag,60));
  const sampled=resample(sig,700);
  const pts=sampled.map((v,i)=>[i/(sampled.length-1)*W,mid-v*22]);
  svg.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:'#526174','stroke-width':'1'}));
  const r=selectedRanges(), tx=(v)=>v/state.duration*W;
  svg.appendChild(svgEl('rect',{x:tx(r.outStart),y:6,width:Math.max(1,tx(r.outEnd)-tx(r.outStart)),height:108,rx:5,fill:hexToRgba(state.outColor,.18)}));
  svg.appendChild(svgEl('rect',{x:tx(r.retStart),y:6,width:Math.max(1,tx(r.retEnd)-tx(r.retStart)),height:108,rx:5,fill:hexToRgba(state.retColor,.18)}));
  svg.appendChild(svgEl('rect',{x:tx(r.outEnd),y:6,width:Math.max(1,tx(r.retStart)-tx(r.outEnd)),height:108,fill:'#8a93a222'}));
  svg.appendChild(svgEl('line',{x1:tx(state.midpoint),x2:tx(state.midpoint),y1:0,y2:H,stroke:'#d8e0e8','stroke-width':'1','stroke-dasharray':'3 4'}));
}

function defsFor(svg){
  const defs=svgEl('defs');
  const bg=svgEl('radialGradient',{id:'bg',cx:'50%',cy:'45%',r:'70%'});
  bg.append(svgEl('stop',{offset:'0%','stop-color':state.darkGround?'#101724':'#ffffff'}),svgEl('stop',{offset:'100%','stop-color':state.darkGround?'#05070a':'#f2f1ec'}));
  defs.appendChild(bg);
  const filter=svgEl('filter',{id:'glow',x:'-50%',y:'-50%',width:'200%',height:'200%'});
  filter.appendChild(svgEl('feGaussianBlur',{stdDeviation:String(1+state.glow/16),result:'blur'}));
  const merge=svgEl('feMerge'); merge.append(svgEl('feMergeNode',{in:'blur'}),svgEl('feMergeNode',{in:'SourceGraphic'})); filter.appendChild(merge); defs.appendChild(filter);
  return defs;
}
function baseArtboard(){
  const svg=$('artboard'); svg.innerHTML=''; svg.appendChild(defsFor(svg));
  svg.appendChild(svgEl('rect',{width:1200,height:1200,fill:'url(#bg)'}));
  return svg;
}
function addSignature(svg,label){
  if(!state.showSignature)return;
  const g=svgEl('g',{opacity:state.darkGround?'.8':'.72'});
  const txt=svgEl('text',{x:600,y:1140,'text-anchor':'middle',fill:state.darkGround?'#aab6c4':'#394552','font-family':'Inter, sans-serif','font-size':'17','letter-spacing':'6'});
  txt.textContent=label.toUpperCase(); g.appendChild(txt);
  const r=selectedRanges();
  const meta=svgEl('text',{x:600,y:1170,'text-anchor':'middle',fill:state.darkGround?'#667587':'#6f7680','font-family':'Inter, sans-serif','font-size':'11','letter-spacing':'3'});
  meta.textContent=`${r.outStart.toFixed(1)}–${r.outEnd.toFixed(1)} s  /  ${r.retStart.toFixed(1)}–${r.retEnd.toFixed(1)} s`;
  g.appendChild(meta); svg.appendChild(g);
}
function dataSignals(){
  const r=selectedRanges();
  const dyn=highpassApprox(state.mag,60);
  const out=normSignal(sliceRange(dyn,r.outStart,r.outEnd));
  const ret=normSignal(sliceRange(dyn,r.retStart,r.retEnd));
  return {out,ret,r};
}
function renderRibbons(){
  const svg=baseArtboard(), {out,ret}=dataSignals();
  const n=900, a=resample(out,n), b=resample(ret,n);
  const density=state.density, amp=110*(.5+state.complexity/100);
  const group=svgEl('g');
  for(let k=0;k<density;k++){
    const f=k/(density-1||1), y0=lerp(240,525,f), spread=lerp(.35,1.1,Math.sin(f*Math.PI));
    const pts=a.map((v,i)=>[110+i/(n-1)*980,y0+v*amp*spread + Math.sin(i*.018+k*.23)*8]);
    group.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba(state.outColor,lerp(.08,.72,1-Math.abs(f-.5)*1.5)),'stroke-width':String(state.strokeWidth*(.55+f*.55)),'stroke-linecap':'round'}));
  }
  for(let k=0;k<density;k++){
    const f=k/(density-1||1), y0=lerp(675,960,f), spread=lerp(1.1,.35,Math.sin(f*Math.PI));
    const pts=b.map((v,i)=>[110+i/(n-1)*980,y0+v*amp*spread - Math.sin(i*.018+k*.23)*8]);
    group.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba(state.retColor,lerp(.08,.72,1-Math.abs(f-.5)*1.5)),'stroke-width':String(state.strokeWidth*(.55+(1-f)*.55)),'stroke-linecap':'round'}));
  }
  const centerA=a.map((v,i)=>[110+i/(n-1)*980,390+v*135]);
  const centerB=b.map((v,i)=>[110+i/(n-1)*980,810+v*135]);
  group.append(svgEl('path',{d:pointsPath(centerA),fill:'none',stroke:state.outColor,'stroke-width':String(state.strokeWidth*2.2),filter:'url(#glow)'}),svgEl('path',{d:pointsPath(centerB),fill:'none',stroke:state.retColor,'stroke-width':String(state.strokeWidth*2.2),filter:'url(#glow)'}));
  svg.appendChild(group); addSignature(svg,'Pulse Ribbons');
}
function renderOrbit(){
  const svg=baseArtboard(), {out,ret}=dataSignals();
  const n=1800,a=resample(out,n),b=resample(ret,n), amp=85*(.5+state.complexity/100);
  const group=svgEl('g',{transform:'translate(600 570)'});
  const make=(arr,start,end,color,phase)=>{
    const layers=Math.max(8,Math.round(state.density*.55));
    for(let k=0;k<layers;k++){
      const f=k/(layers-1||1), base=300+f*100;
      const pts=arr.map((v,i)=>{const th=lerp(start,end,i/(n-1)); const wobble=Math.sin(i*.015+phase+k*.2)*10; const r=base+v*amp*(.35+.65*Math.sin(f*Math.PI))+wobble; return [Math.cos(th)*r,Math.sin(th)*r];});
      group.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba(color,lerp(.12,.72,1-Math.abs(f-.5)*1.6)),'stroke-width':String(state.strokeWidth*(.6+f*.4))}));
    }
  };
  make(a,Math.PI,0,state.outColor,0); make(b,0,-Math.PI,state.retColor,1.4);
  svg.appendChild(group);
  const xy1=sliceRangeXY(selectedRanges().outStart,selectedRanges().outEnd), xy2=sliceRangeXY(selectedRanges().retStart,selectedRanges().retEnd);
  const all=[...xy1,...xy2]; const xs=all.map(p=>p[0]), ys=all.map(p=>p[1]); const mx=mean(xs),my=mean(ys), sx=quantile(xs.map(v=>Math.abs(v-mx)),.97)||1, sy=quantile(ys.map(v=>Math.abs(v-my)),.97)||1;
  const knot=svgEl('g',{transform:'translate(600 570)'});
  [[xy1,state.outColor],[xy2,state.retColor]].forEach(([arr,c])=>{const rs=resample(arr.map(p=>p[0]),300).map((vx,i)=>[clamp((vx-mx)/sx,-2,2)*90,clamp((resample(arr.map(p=>p[1]),300)[i]-my)/sy,-2,2)*90]); knot.appendChild(svgEl('path',{d:pointsPath(rs),fill:'none',stroke:hexToRgba(c,.72),'stroke-width':String(state.strokeWidth),filter:'url(#glow)'}));});
  svg.appendChild(knot); addSignature(svg,'Twin Orbit');
}
function detectCycles(sig){
  if(sig.length<10)return [];
  const s=movingAverage(sig,3), thresh=std(s)*.15, peaks=[];
  for(let i=2;i<s.length-2;i++) if(s[i]>s[i-1]&&s[i]>=s[i+1]&&s[i]>thresh) peaks.push(i);
  const minDist=Math.max(10,Math.round(sig.length/state.windowSeconds*.32)), kept=[];
  for(const p of peaks){if(!kept.length||p-kept.at(-1)>=minDist)kept.push(p); else if(s[p]>s[kept.at(-1)])kept[kept.length-1]=p;}
  const cycles=[];
  for(let i=0;i<kept.length-1;i++){const d=kept[i+1]-kept[i]; if(d>=minDist&&d<=minDist*2.3) cycles.push(resample(sig.slice(kept[i],kept[i+1]+1),180));}
  return cycles;
}
function renderChoir(){
  const svg=baseArtboard(), {out,ret}=dataSignals();
  const co=detectCycles(out), cr=detectCycles(ret), maxN=Math.max(co.length,cr.length,1), center=590;
  const group=svgEl('g');
  const draw=(cycles,color,dir)=>{cycles.forEach((c,j)=>{const y=center+dir*(50+j*(400/maxN)); const scale=42*(.55+state.complexity/100); const pts=c.map((v,i)=>[170+i/(c.length-1)*860,y+dir*v*scale]); group.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba(color,.25+.6*(1-j/(cycles.length+1))),'stroke-width':String(state.strokeWidth*(.7+Math.sin((j+1)*.8)*.12))}));});};
  draw(co,state.outColor,-1); draw(cr,state.retColor,1);
  const med=(cycles)=>cycles.length?cycles[0].map((_,i)=>quantile(cycles.map(c=>c[i]),.5)):[];
  [[med(co),state.outColor,-1],[med(cr),state.retColor,1]].forEach(([m,c,d])=>{if(!m.length)return; const y=center+d*455; const pts=m.map((v,i)=>[170+i/(m.length-1)*860,y+d*v*60]); group.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:c,'stroke-width':String(state.strokeWidth*2.4),filter:'url(#glow)'}));});
  svg.appendChild(group); addSignature(svg,`Step Choir • ${co.length} / ${cr.length} cycles`);
}
function renderWeave(){
  const svg=baseArtboard(), {out,ret}=dataSignals();
  const n=260,a=resample(out,n),b=resample(ret,n),g=svgEl('g');
  const rows=Math.max(16,Math.round(state.density*.72));
  for(let r=0;r<rows;r++){
    const f=r/(rows-1||1), y=180+f*840;
    const arr=f<.5?a:b, color=f<.5?state.outColor:state.retColor, local=f<.5?f*2:(f-.5)*2;
    const pts=arr.map((v,i)=>{const x=130+i/(n-1)*940; const bend=v*95*(.35+.8*Math.sin(local*Math.PI))*state.complexity/70; return[x,y+bend];});
    g.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba(color,.18+.55*Math.sin(local*Math.PI)),'stroke-width':String(state.strokeWidth)}));
  }
  const cols=Math.round(20+state.complexity*.45);
  for(let c=0;c<cols;c++){
    const f=c/(cols-1||1), x=130+f*940, ai=Math.floor(f*(n-1)); const pts=[];
    for(let r=0;r<rows;r++){const rf=r/(rows-1||1), arr=rf<.5?a:b, local=rf<.5?rf*2:(rf-.5)*2, y=180+rf*840+arr[ai]*95*(.35+.8*Math.sin(local*Math.PI))*state.complexity/70; pts.push([x,y]);}
    g.appendChild(svgEl('path',{d:pointsPath(pts),fill:'none',stroke:hexToRgba('#ffffff',state.darkGround?.08:.13),'stroke-width':String(Math.max(.3,state.strokeWidth*.45))}));
  }
  svg.appendChild(g); addSignature(svg,'Motion Weave');
}
function render(){
  if(!state.time.length)return;
  if(state.style==='ribbons')renderRibbons();
  else if(state.style==='orbit')renderOrbit();
  else if(state.style==='choir')renderChoir();
  else renderWeave();
  drawTimeline();
}
function renderStyleGallery(){
  const g=$('styleGallery'); g.innerHTML='';
  styles.forEach((s,idx)=>{
    const card=document.createElement('button'); card.className=`style-card${state.style===s.id?' active':''}`; card.type='button';
    const cv=document.createElement('canvas'); cv.width=180;cv.height=180; const ctx=cv.getContext('2d'); ctx.fillStyle='#07090d';ctx.fillRect(0,0,180,180);
    const c1=state.outColor,c2=state.retColor;
    if(idx===0){for(let j=0;j<12;j++){ctx.strokeStyle=hexToRgba(c1,.25+j*.03);ctx.beginPath();for(let x=12;x<168;x++){const y=55+j*2+Math.sin(x*.08+j*.3)*10; x===12?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.strokeStyle=hexToRgba(c2,.25+j*.03);ctx.beginPath();for(let x=12;x<168;x++){const y=125-j*2+Math.sin(x*.08+j*.3)*10;x===12?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}}
    else if(idx===1){ctx.lineWidth=1;for(let j=0;j<20;j++){ctx.strokeStyle=hexToRgba(j<10?c1:c2,.35);ctx.beginPath();for(let i=0;i<160;i++){const th=(i/159)*Math.PI+(j<10?Math.PI:0);const r=45+j%10*2+Math.sin(i*.12+j)*8;const x=90+Math.cos(th)*r,y=90+Math.sin(th)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}}
    else if(idx===2){for(let j=0;j<18;j++){ctx.strokeStyle=hexToRgba(j<9?c1:c2,.4);ctx.beginPath();for(let x=18;x<162;x++){const y=(j<9?82-j*6:98+(j-9)*6)+Math.sin(x*.14+j)*7;x===18?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}}
    else{for(let j=0;j<18;j++){ctx.strokeStyle=hexToRgba(j<9?c1:c2,.35);ctx.beginPath();for(let x=14;x<166;x++){const y=20+j*8+Math.sin(x*.11+j*.2)*6;x===14?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}ctx.strokeStyle='#ffffff18';for(let x=20;x<170;x+=10){ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,165);ctx.stroke();}}
    const strong=document.createElement('strong');strong.textContent=s.name;const span=document.createElement('span');span.textContent=s.note;card.append(cv,strong,span);card.onclick=()=>{state.style=s.id;renderStyleGallery();render();};g.appendChild(card);
  });
}
function exportSVG(){
  const svg=$('artboard').cloneNode(true); svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg);
  downloadBlob(new Blob([xml],{type:'image/svg+xml'}),`spoke-${state.style}.svg`);
}
function exportPNG(){
  const svg=$('artboard').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const xml=new XMLSerializer().serializeToString(svg),blob=new Blob([xml],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=3200;canvas.height=3200;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,3200,3200);URL.revokeObjectURL(url);canvas.toBlob(b=>downloadBlob(b,`spoke-${state.style}-3200.png`),'image/png');};img.src=url;
}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

$('fileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;$('fileLabel').textContent=f.name;try{await loadFile(f);}catch(err){alert(err.message);}});
['midpoint','windowSeconds','turnGap','density','strokeWidth','glow','complexity'].forEach(id=>$(id).addEventListener('input',()=>{
  const map={midpoint:'midpoint',windowSeconds:'windowSeconds',turnGap:'turnGap',density:'density',strokeWidth:'strokeWidth',glow:'glow',complexity:'complexity'};
  state[map[id]]=Number($(id).value);updateOutputs();render();
}));
['outColor','retColor'].forEach(id=>$(id).addEventListener('input',()=>{state[id==='outColor'?'outColor':'retColor']=$(id).value;renderStyleGallery();render();}));
$('darkGround').addEventListener('change',()=>{state.darkGround=$('darkGround').checked;render();});
$('showSignature').addEventListener('change',()=>{state.showSignature=$('showSignature').checked;render();});
$('autoMidpoint').addEventListener('click',()=>{state.midpoint=detectMidpoint();$('midpoint').value=state.midpoint;updateOutputs();render();});
$('exportSvg').addEventListener('click',exportSVG);$('exportPng').addEventListener('click',exportPNG);

const drop=$('fileDrop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#4b8bc2';}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='';}));
drop.addEventListener('drop',async e=>{const f=e.dataTransfer.files[0];if(!f)return;$('fileLabel').textContent=f.name;try{await loadFile(f);}catch(err){alert(err.message);}});

renderStyleGallery(); updateOutputs();
