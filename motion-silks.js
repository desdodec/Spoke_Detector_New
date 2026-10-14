// Spoke Detector — Motion Silks flagship artwork.
// A participant-readable polar data portrait: time runs around each loop and
// measured handlebar motion pushes the ribbon inward/outward. Rendering adds
// deterministic silky depth without fabricating sensor values.
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
  function prepareJourney(start,end,n=900){
    const x=closeLoop(resample(sliceSignal(state.x,start,end),n));
    const y=closeLoop(resample(sliceSignal(state.y,start,end),n));
    const z=closeLoop(resample(sliceSignal(state.z,start,end),n));
    const m=closeLoop(resample(sliceSignal(state.mag,start,end),n));
    const sx=smoothCircular(x,5),sy=smoothCircular(y,5),sz=smoothCircular(z,5),sm=smoothCircular(m,4);
    const detail=m.map((v,i)=>v-sm[i]);
    const rough=detail.map((_,i)=>localWindow(detail,i,9));
    const roughQ=quantile(rough,.90)||1;
    const fray=smoothCircular(rough.map(v=>clamp(v/roughQ,0,1)),3);
    const absDetail=detail.map(Math.abs),impactQ=quantile(absDetail,.985)||1;
    const impact=absDetail.map(v=>clamp(v/impactQ,0,1));
    const energy=smoothCircular(m.map(v=>Math.abs(v)),10);
    const eQ=quantile(energy,.96)||1;
    return {x:sx,y:sy,z:sz,m:sm,detail,fray,impact,energy:energy.map(v=>clamp(v/eQ,0,1))};
  }
  function pathFrom(points,close=true){
    if(!points.length)return '';
    const d=pathD(points);
    return close ? `${d} Z` : d;
  }
  function colourFor(journey,f,amp){
    return paletteColor(colorScalar({journey,strand:f,time:f,amp}));
  }
  function ensureSilkDefs(svg){
    const defs=svg.querySelector('defs')||svg.insertBefore(svgEl('defs'),svg.firstChild);
    if(svg.querySelector('#silkBlurFine'))return;
    const mk=(id,std)=>{
      const f=svgEl('filter',{id,x:'-80%',y:'-80%',width:'260%',height:'260%','color-interpolation-filters':'sRGB'});
      f.appendChild(svgEl('feGaussianBlur',{stdDeviation:String(std)}));
      defs.appendChild(f);
    };
    mk('silkBlurFine',2.3);
    mk('silkBlurMid',8.5);
    mk('silkBlurWide',23);
  }
  function addBlurPath(group,d,stroke,width,opacity,filter){
    group.appendChild(svgEl('path',{d,fill:'none',stroke,'stroke-width':String(width),opacity:String(opacity),filter:`url(#${filter})`,'stroke-linecap':'round','stroke-linejoin':'round'}));
  }
  function addJourney(svg,sig,journey,cx,cy,baseR,phase){
    const n=sig.m.length,
          strands=Math.max(29,Math.min(57,Math.round(25+state.density*.38))),
          complexity=state.complexity/100,
          ampScale=62+complexity*62,
          sideScale=18+complexity*22,
          frayScale=8+complexity*21;

    const centres=[];
    for(let i=0;i<n;i++){
      const f=i/n,th=phase+f*Math.PI*2;
      // Explainable core mapping: time -> angle; measured handlebar motion -> displacement.
      const radial=(.62*sig.m[i]+.24*sig.x[i]+.14*sig.z[i])*ampScale;
      const tangent=sig.y[i]*sideScale;
      const r=baseR+radial;
      centres.push([cx+Math.cos(th)*r-Math.sin(th)*tangent,cy+Math.sin(th)*r+Math.cos(th)*tangent]);
    }

    const baseColor=colourFor(journey,.5,.7);
    const luminous=mixHex(baseColor,'#ffffff',state.darkGround?.62:.18);
    const blendStyle=state.darkGround?'mix-blend-mode:screen':'mix-blend-mode:normal';
    const glowG=svgEl('g',{style:blendStyle,'pointer-events':'none'});
    const fibreGlowG=svgEl('g',{style:blendStyle,'pointer-events':'none'});
    const fibreG=svgEl('g',{'pointer-events':'none'});
    const coreG=svgEl('g',{style:blendStyle,'pointer-events':'none'});

    const centreD=pathFrom(centres);
    const glowPower=.45+.55*(state.glow/100);
    // Three glow scales reproduce the soft luminous volume of the Python raster renderer.
    addBlurPath(glowG,centreD,baseColor,state.strokeWidth*18,.045*glowPower,'silkBlurWide');
    addBlurPath(glowG,centreD,baseColor,state.strokeWidth*11,.08*glowPower,'silkBlurMid');
    addBlurPath(glowG,centreD,luminous,state.strokeWidth*5.5,.13*glowPower,'silkBlurFine');

    for(let s=0;s<strands;s++){
      const u=-1+2*s/(strands-1||1),mid=1-Math.abs(u),pts=[];
      for(let i=0;i<n;i++){
        const f=i/n,th=phase+f*Math.PI*2,p=centres[i];
        const breathing=(11+27*mid)*(0.88+.36*sig.energy[i]);
        const localFray=sig.fray[i]*frayScale;
        // Deterministic strand decorrelation; magnitude is driven by measured local irregularity.
        const wig1=Math.sin(i*.145+s*1.53+state.variation*.31);
        const wig2=Math.sin(i*.071+s*2.17-state.variation*.19);
        const decorative=(wig1*.68+wig2*.32)*localFray*(.18+.82*Math.abs(u));
        const dataRipple=(.36*sig.x[i]+.22*sig.z[i])*(2.5+7*mid);
        const off=u*breathing+decorative+dataRipple;
        pts.push([p[0]+Math.cos(th)*off,p[1]+Math.sin(th)*off]);
      }
      const d=pathFrom(pts),f=s/(strands-1||1),amp=rms(sig.m),stroke=colourFor(journey,f,clamp(amp,0,1));
      const threadColor=mixHex(stroke,'#ffffff',.08+.28*mid);
      const crispOpacity=.055+.12*mid;
      const crispWidth=state.strokeWidth*(1.45+.95*mid);

      // Faint sheet-like body.
      fibreG.appendChild(svgEl('path',{d,fill:'none',stroke:threadColor,'stroke-width':String(crispWidth),opacity:String(crispOpacity),'stroke-linecap':'round','stroke-linejoin':'round'}));
      // Sparse glowing threads give the bundle depth without blurring every strand.
      if(s%3===1){
        addBlurPath(fibreGlowG,d,threadColor,state.strokeWidth*(4.2+2.2*mid),(.025+.055*mid)*glowPower,'silkBlurFine');
      }
      // A few brighter silk filaments, analogous to the Python renderer's highlight threads.
      if(s%5===2){
        fibreG.appendChild(svgEl('path',{d,fill:'none',stroke:mixHex(threadColor,'#ffffff',.42),'stroke-width':String(state.strokeWidth*(.55+.30*mid)),opacity:String(.22+.23*mid),'stroke-linecap':'round','stroke-linejoin':'round'}));
      }
    }

    // Bright layered core: broad coloured shoulder + hot narrow highlight.
    coreG.appendChild(svgEl('path',{d:centreD,fill:'none',stroke:baseColor,'stroke-width':String(state.strokeWidth*5.4),opacity:'.18','stroke-linecap':'round','stroke-linejoin':'round'}));
    coreG.appendChild(svgEl('path',{d:centreD,fill:'none',stroke:mixHex(baseColor,'#ffffff',.36),'stroke-width':String(state.strokeWidth*2.35),opacity:'.58','stroke-linecap':'round','stroke-linejoin':'round'}));
    coreG.appendChild(svgEl('path',{d:centreD,fill:'none',stroke:luminous,'stroke-width':String(Math.max(.7,state.strokeWidth*.82)),opacity:'.82','stroke-linecap':'round','stroke-linejoin':'round'}));

    svg.appendChild(glowG);
    svg.appendChild(fibreGlowG);
    svg.appendChild(fibreG);
    svg.appendChild(coreG);

    // Strong local impulses become compact white glints at their true time position.
    const threshold=Math.max(.68,quantile(sig.impact,.972));
    const glints=[];
    for(let i=2;i<n-2;i++){
      if(sig.impact[i]<threshold||sig.impact[i]<sig.impact[i-1]||sig.impact[i]<sig.impact[i+1])continue;
      glints.push({i,a:sig.impact[i]});
    }
    glints.sort((a,b)=>b.a-a.a).slice(0,12).forEach(({i,a})=>{
      const p=centres[i],rr=1.3+a*3.4;
      const halo=svgEl('circle',{cx:p[0],cy:p[1],r:String(rr*3.4),fill:'#ffffff',opacity:String((.04+.08*a)*glowPower),filter:'url(#silkBlurFine)',style:blendStyle});
      const dot=svgEl('circle',{cx:p[0],cy:p[1],r:String(rr),fill:state.darkGround?'#ffffff':'#15202b',opacity:String(.56+.38*a),style:blendStyle});
      svg.appendChild(halo);svg.appendChild(dot);
    });
    return centres;
  }

  function renderSilks(){
    const svg=baseArt();ensureSilkDefs(svg);
    const r=selectedRanges(),out=prepareJourney(r.outStart,r.outEnd),ret=prepareJourney(r.retStart,r.retEnd);
    const overlap=state.symmetry/100,sep=lerp(176,72,overlap);
    addJourney(svg,out,0,600-sep,590,287,Math.PI*.14);
    addJourney(svg,ret,1,600+sep,610,301,Math.PI*1.08);

    // Minimal orientation markers: useful in Explain Mode, quiet enough for the artwork.
    const muted=state.darkGround?'#8190a0':'#65717d';
    const mk=(x,y,t)=>{const el=svgEl('text',{x,y,fill:muted,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'1.6','text-anchor':'middle',opacity:'.78'});el.textContent=t;svg.appendChild(el);};
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
