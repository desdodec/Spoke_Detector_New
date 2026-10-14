// Spoke Detector — Motion Silks flagship artwork.
// A participant-readable polar data portrait: time runs around each loop and
// measured handlebar motion pushes the ribbon inward/outward. Decorative
// strand spacing is art direction; centreline shape and local texture are data-derived.
(() => {
  const STYLE_ID='silks';
  if(!STYLES.some(s=>s.id===STYLE_ID)) STYLES.unshift({
    id:STYLE_ID,
    name:'Motion Silks',
    note:'flagship portrait — time runs around the loop; measured movement shapes the ribbon'
  });

  function localWindow(arr,i,r=5){
    let s=0,s2=0,n=0;
    for(let k=-r;k<=r;k++){
      const j=(i+k+arr.length)%arr.length,v=arr[j]||0;
      s+=v;s2+=v*v;n++;
    }
    const m=s/n;
    return Math.sqrt(Math.max(0,s2/n-m*m));
  }
  function closeLoop(v){
    const a=Array.from(v),n=a.length;if(n<2)return a;
    const d=a[n-1]-a[0];
    return a.map((x,i)=>x-d*i/n);
  }
  function smoothCircular(v,passes=1){
    let out=Array.from(v),n=out.length;
    for(let p=0;p<passes;p++){
      const src=out;out=src.map((_,i)=>(src[(i-2+n)%n]+4*src[(i-1+n)%n]+6*src[i]+4*src[(i+1)%n]+src[(i+2)%n])/16);
    }
    return out;
  }
  function sliceSignal(values,start,end){ return normSignal(sliceRange(values,start,end)); }
  function prepareJourney(start,end,n=720){
    const x=closeLoop(resample(sliceSignal(state.x,start,end),n));
    const y=closeLoop(resample(sliceSignal(state.y,start,end),n));
    const z=closeLoop(resample(sliceSignal(state.z,start,end),n));
    const m=closeLoop(resample(sliceSignal(state.mag,start,end),n));
    const sx=smoothCircular(x,4),sy=smoothCircular(y,4),sz=smoothCircular(z,4),sm=smoothCircular(m,3);
    const detail=m.map((v,i)=>v-sm[i]);
    const rough=detail.map((_,i)=>localWindow(detail,i,7));
    const q=quantile(rough,.90)||1;
    const fray=rough.map(v=>clamp(v/q,0,1));
    const impact=detail.map(v=>clamp(Math.abs(v)/Math.max(.001,quantile(detail.map(Math.abs),.98)),0,1));
    const lean=mean(x)*.05;
    return {x:sx,y:sy,z:sz,m:sm,detail,fray,impact,lean};
  }
  function pathFrom(points,close=true){
    if(!points.length)return '';
    const d=pathD(points);
    return close ? `${d} Z` : d;
  }
  function colourFor(journey,f,amp){
    return paletteColor(colorScalar({journey,strand:f,time:f,amp}));
  }
  function addJourney(svg,sig,journey,cx,cy,baseR,phase){
    const n=sig.m.length, strands=Math.max(17,Math.min(41,Math.round(state.density*.48))),
          complexity=state.complexity/100,
          ampScale=58+complexity*54,
          sideScale=18+complexity*18,
          frayScale=10+complexity*18;

    const centres=[];
    for(let i=0;i<n;i++){
      const f=i/n,th=phase+f*Math.PI*2;
      // Core explainable mapping: time -> angle, measured acceleration -> radius.
      const radial=(.62*sig.m[i]+.24*sig.x[i]+.14*sig.z[i])*ampScale;
      const tangent=sig.y[i]*sideScale;
      const r=baseR+radial;
      centres.push([cx+Math.cos(th)*r-Math.sin(th)*tangent,cy+Math.sin(th)*r+Math.cos(th)*tangent]);
    }

    // Silky strands: centred on the data-derived path. Fray amount comes from local
    // irregular/high-frequency motion, while the exact strand offsets are decorative.
    for(let s=0;s<strands;s++){
      const u=-1+2*s/(strands-1||1),mid=1-Math.abs(u),pts=[];
      for(let i=0;i<n;i++){
        const f=i/n,th=phase+f*Math.PI*2;
        const p=centres[i],width=(10+24*mid)*(1+.45*Math.abs(sig.m[i]));
        const dataFray=sig.fray[i]*frayScale;
        const deterministic=Math.sin(i*.16+s*1.71+state.variation*.37)*dataFray*(.25+.75*Math.abs(u));
        const off=u*width+deterministic;
        pts.push([p[0]+Math.cos(th)*off,p[1]+Math.sin(th)*off]);
      }
      const amp=rms(sig.m),stroke=colourFor(journey,(s/(strands-1||1)),clamp(amp,0,1));
      svg.appendChild(svgEl('path',{d:pathFrom(pts),fill:'none',stroke,'stroke-width':String(state.strokeWidth*(.48+.62*mid)),opacity:String(.10+.28*mid),'stroke-linecap':'round','stroke-linejoin':'round'}));
    }

    // Bright centreline behaves like a familiar waveform trace, but wrapped into a loop.
    svg.appendChild(svgEl('path',{d:pathFrom(centres),fill:'none',stroke:colourFor(journey,.5,.8),'stroke-width':String(state.strokeWidth*2.0),opacity:'.78',filter:'url(#glow)','stroke-linecap':'round','stroke-linejoin':'round'}));

    // Strong local impulses become glints at their true position around the journey.
    const threshold=quantile(sig.impact,.965);
    for(let i=0;i<n;i+=2){
      if(sig.impact[i]<threshold||sig.impact[i]<.45)continue;
      const p=centres[i],rr=1.5+sig.impact[i]*4.5;
      svg.appendChild(svgEl('circle',{cx:p[0],cy:p[1],r:rr,fill:state.darkGround?'#ffffff':'#111820',opacity:String(.28+.52*sig.impact[i]),filter:'url(#glow)'}));
    }
    return centres;
  }

  function renderSilks(){
    const svg=baseArt(),r=selectedRanges();
    const out=prepareJourney(r.outStart,r.outEnd),ret=prepareJourney(r.retStart,r.retEnd);
    const overlap=state.symmetry/100;
    const sep=lerp(170,70,overlap);
    addJourney(svg,out,0,600-sep,590,285,Math.PI*.14);
    addJourney(svg,ret,1,600+sep,610,300,Math.PI*1.08);

    // Minimal orientation markers make the mapping understandable without turning it into a chart.
    const c=state.darkGround?'#ffffff':'#17212b';
    const muted=state.darkGround?'#8190a0':'#65717d';
    const mk=(x,y,t)=>{const el=svgEl('text',{x,y,fill:muted,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'1.6','text-anchor':'middle'});el.textContent=t;svg.appendChild(el);};
    mk(600-sep,250,'OUTWARD · TIME →');mk(600+sep,250,'RETURN · TIME →');
    addSignature(svg,'Motion Silks');
  }

  const previousRender=render;
  render=function(){
    if(!state.time.length)return;
    if(state.style===STYLE_ID){
      renderSilks();
      addPersonalityOverlay($('artboard'));
      updatePersonalityPreview();
    } else previousRender();
  };

  // Make the flagship portrait the default without deleting experimental systems.
  state.style=STYLE_ID;

  // Keep alternatives available to the maker, but do not confront participants with nine equal choices.
  const previousBuild=buildStyleGallery;
  let showStudies=false;
  buildStyleGallery=function(){
    previousBuild();
    const g=$('styleGallery');if(!g)return;
    [...g.querySelectorAll('.style-card')].forEach(card=>{
      const isFlagship=card.dataset.style===STYLE_ID;
      card.classList.toggle('flagship-style',isFlagship);
      if(!showStudies&&!isFlagship)card.style.display='none';else card.style.display='';
      if(isFlagship&&!card.querySelector('.flagship-badge')){
        const badge=document.createElement('span');badge.className='flagship-badge';badge.textContent='FLAGSHIP';card.prepend(badge);
      }
    });
    let toggle=document.getElementById('studyToggle');
    if(!toggle){
      toggle=document.createElement('button');toggle.type='button';toggle.id='studyToggle';toggle.className='secondary-button study-toggle';g.insertAdjacentElement('afterend',toggle);
      toggle.onclick=()=>{showStudies=!showStudies;buildStyleGallery();};
    }
    toggle.textContent=showStudies?'Hide experimental studies':'Explore experimental studies';
  };

  const style=document.createElement('style');
  style.textContent=`
    .flagship-style{position:relative;border-color:#617d98!important;box-shadow:0 0 0 1px #617d9838 inset}
    .flagship-badge{display:inline-block;margin:0 0 7px;padding:3px 6px;border-radius:999px;background:#dfe9f3;color:#111821;font:700 7px Inter,sans-serif;letter-spacing:.14em}
    .study-toggle{margin-top:9px;width:100%}
  `;
  document.head.appendChild(style);
  buildStyleGallery();
  if(state.time.length)render();
})();
