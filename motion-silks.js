// Spoke Detector — Motion Silks flagship artwork.
// The recording authors the geometry and material baseline; restrained maker trims
// change presentation strength without inventing or replacing sensor values.
(() => {
  const STYLE_ID='silks';
  const PREVIEW_RASTER=820;
  const EXPORT_RASTER=2600;
  const PREVIEW_SAMPLES=520;
  const EXPORT_SAMPLES=1120;

  if(!STYLES.some(s=>s.id===STYLE_ID)) STYLES.unshift({
    id:STYLE_ID,
    name:'Motion Silks',
    note:'flagship portrait — data-authored motion material from outward + return journeys'
  });

  // Maker trims are centred on 100%. The recording supplies the baseline.
  state.silkFibreDensity ??= 100;
  state.silkThickness ??= 100;
  state.silkRipple ??= 100;
  state.silkFray ??= 100;
  state.silkBloom ??= 100;
  state.silkColourMode ??= 'hybrid';

  let previewTimer=null;
  let prepCache={key:null,value:null};
  let physicalCache={key:null,value:null};

  const sat01=v=>clamp(v,0,1);
  const exp01=(v,scale)=>sat01(1-Math.exp(-Math.max(0,v)/(scale||1)));

  function localWindow(arr,i,r=7){
    let s=0,s2=0,n=0;
    for(let k=-r;k<=r;k++){
      const j=(i+k+arr.length)%arr.length,v=arr[j]||0;
      s+=v;s2+=v*v;n++;
    }
    const m=s/n;
    return Math.sqrt(Math.max(0,s2/n-m*m));
  }

  function closeLoop(v){
    const a=Array.from(v),n=a.length;
    if(n<2)return a;
    const d=a[n-1]-a[0];
    return a.map((x,i)=>x-d*i/n);
  }

  function smoothCircular(v,passes=1){
    let out=Array.from(v),n=out.length;
    for(let p=0;p<passes;p++){
      const src=out;
      out=src.map((_,i)=>(src[(i-2+n)%n]+4*src[(i-1+n)%n]+6*src[i]+4*src[(i+1)%n]+src[(i+2)%n])/16);
    }
    return out;
  }

  function periodicityScore(values,fs){
    if(values.length<12||!isFinite(fs)||fs<=0)return 0;
    const v=normSignal(values),n=v.length;
    const lo=Math.max(2,Math.round(fs*.45));
    const hi=Math.min(n-3,Math.round(fs*1.40));
    if(hi<=lo)return 0;
    let best=0;
    for(let lag=lo;lag<=hi;lag++){
      let s=0,s0=0,s1=0;
      for(let i=0;i<n-lag;i++){
        const a=v[i],b=v[i+lag];
        s+=a*b;s0+=a*a;s1+=b*b;
      }
      const c=s/Math.sqrt(Math.max(1e-12,s0*s1));
      if(c>best)best=c;
    }
    return sat01(best);
  }

  function windowPhysical(start,end,dynFull,fs){
    const dyn=sliceRange(dynFull,start,end);
    const x=sliceRange(state.x,start,end),z=sliceRange(state.z,start,end);
    const abs=dyn.map(Math.abs);
    const dif=[];
    for(let i=1;i<dyn.length;i++)dif.push(dyn[i]-dyn[i-1]);
    const energy=rms(dyn);
    const impact=quantile(abs,.975)||0;
    const rough=rms(dif);
    const periodicity=periodicityScore(dyn,fs);
    const mx=mean(x),mz=mean(z);
    const orientation=clamp(Math.atan2(mx,Math.abs(mz)+1e-6),-.48,.48);
    return {
      energy,impact,rough,periodicity,orientation,
      energyN:exp01(energy,1.35),
      impactN:exp01(impact,3.8),
      roughN:exp01(rough,1.15)
    };
  }

  function physicalPair(){
    const r=selectedRanges();
    const key=[state.time.length,r.outStart.toFixed(3),r.outEnd.toFixed(3),r.retStart.toFixed(3),r.retEnd.toFixed(3)].join('|');
    if(physicalCache.key===key)return physicalCache.value;
    const fs=sampleRate();
    const dynFull=highpassApprox(state.mag,Math.max(8,Math.round(fs*.65)));
    const out=windowPhysical(r.outStart,r.outEnd,dynFull,fs);
    const ret=windowPhysical(r.retStart,r.retEnd,dynFull,fs);
    let outCycles=0,retCycles=0;
    try{
      if(typeof detectCycles==='function'){
        outCycles=detectCycles((r.outStart+r.outEnd)/2).length;
        retCycles=detectCycles((r.retStart+r.retEnd)/2).length;
      }
    }catch(_){/* visual baseline still works without cycle detector */}
    const value={r,out,ret,outCycles,retCycles};
    physicalCache={key,value};
    return value;
  }

  function sliceSignal(values,start,end){return normSignal(sliceRange(values,start,end));}

  function prepareJourney(start,end,n,metric){
    const x=closeLoop(resample(sliceSignal(state.x,start,end),n));
    const y=closeLoop(resample(sliceSignal(state.y,start,end),n));
    const z=closeLoop(resample(sliceSignal(state.z,start,end),n));
    const m=closeLoop(resample(sliceSignal(state.mag,start,end),n));

    // Noisier recordings receive a little more silhouette smoothing; the fast detail
    // is retained below as texture/fray instead of simply being discarded.
    const qualityScale=n>700?1.45:1;
    const dataSmooth=lerp(.88,1.28,metric.roughN);
    const scale=qualityScale*dataSmooth;
    const bx=smoothCircular(x,Math.max(3,Math.round(7*scale)));
    const by=smoothCircular(y,Math.max(3,Math.round(7*scale)));
    const bz=smoothCircular(z,Math.max(3,Math.round(7*scale)));
    const bm=smoothCircular(m,Math.max(4,Math.round(9*scale)));
    const medium=smoothCircular(m,Math.max(2,Math.round(3*scale)));
    const detail=m.map((v,i)=>v-medium[i]);
    const rough=detail.map((_,i)=>localWindow(detail,i,Math.max(4,Math.round(7*scale))));
    const rq=quantile(rough,.92)||1;
    const fray=smoothCircular(rough.map(v=>sat01(v/rq)),Math.max(2,Math.round(3*scale)));
    const motion=m.map((_,i)=>localWindow(m,i,Math.max(7,Math.round(12*scale))));
    const mq=quantile(motion,.94)||1;
    const energy=smoothCircular(motion.map(v=>sat01(v/mq)),Math.max(3,Math.round(5*scale)));
    const absDetail=detail.map(Math.abs),iq=quantile(absDetail,.985)||1;
    const impact=absDetail.map(v=>sat01(v/iq));
    return {x:bx,y:by,z:bz,m:bm,detail,fray,energy,impact};
  }

  function deriveAuthorship(physical){
    const o=physical.out,r=physical.ret;
    const avgEnergy=(o.energyN+r.energyN)/2;
    const avgImpact=(o.impactN+r.impactN)/2;
    const avgRough=(o.roughN+r.roughN)/2;
    const avgPeriod=(o.periodicity+r.periodicity)/2;
    const balance=Math.abs(o.energy-r.energy)/Math.max(.05,o.energy+r.energy);
    const cycles=physical.outCycles+physical.retCycles;
    const fibres=clamp(Math.round(32 + Math.min(24,cycles*1.15) + avgPeriod*13),32,72);

    const makeJourney=(m,which)=>({
      radius:(which===0?273:279)+34*m.energyN,
      thickness:82+42*m.energyN,
      ripple:72+58*m.periodicity,
      rotation:m.orientation*.72,
      opacity:clamp(.82+.12*m.periodicity+.05*m.energyN,.82,1)
    });

    return {
      out:makeJourney(o,0),
      ret:makeJourney(r,1),
      fibres,
      fray:60+68*sat01(.52*avgRough+.48*(1-avgPeriod)),
      bloom:68+58*sat01(.58*avgImpact+.42*avgRough),
      separation:136+30*sat01(balance*1.6),
      verticalBias:clamp((o.energyN-r.energyN)*20,-16,16),
      avgEnergy,avgImpact,avgRough,avgPeriod,balance,
      cycles
    };
  }

  function preparedPair(sampleCount){
    const physical=physicalPair(),r=physical.r;
    const key=[physicalCache.key,sampleCount].join('|');
    if(prepCache.key===key)return prepCache.value;
    const out=prepareJourney(r.outStart,r.outEnd,sampleCount,physical.out);
    const ret=prepareJourney(r.retStart,r.retEnd,sampleCount,physical.ret);
    const auth=deriveAuthorship(physical);
    const value={r,out,ret,auth,physical};
    prepCache={key,value};
    return value;
  }

  function rgbaCss(hex,a){const [r,g,b]=hexRgb(hex);return `rgba(${r},${g},${b},${a})`;}

  function journeyBase(journey){
    const p=state.customPalette;
    if(!p?.length)return journey?'#e24aa8':'#39cbe5';
    return journey===0?mixHex(p[0],p[Math.min(1,p.length-1)],.28):mixHex(p[Math.max(0,p.length-2)],p[p.length-1],.72);
  }

  function silkPaletteColor(journey,t,u=0){
    const mode=state.silkColourMode||'hybrid';
    const widthT=sat01((u+1)/2),tt=((t%1)+1)%1;
    if(mode==='journey-duo')return journeyBase(journey);
    if(mode==='time-spectrum')return paletteColor(tt);
    if(mode==='ribbon-spectrum')return paletteColor(widthT);
    if(mode==='journey-spectrum')return paletteColor(sat01((journey?0.5:0)+tt*.5));
    // Hybrid traverses almost the whole palette on both loops, with a journey offset.
    return paletteColor(((tt*.82 + widthT*.18 + (journey?.28:0))%1+1)%1);
  }

  function buildGeometry(sig,cx,cy,phase,journeyAuth){
    const n=sig.m.length;
    const makerRipple=clamp(state.silkRipple/100,.75,1.30);
    const makerThickness=clamp(state.silkThickness/100,.75,1.30);
    const genericTrim=1+clamp((state.complexity-68)/500,-.10,.07);
    const ripple=(journeyAuth.ripple/100)*makerRipple*genericTrim;
    const thickness=(journeyAuth.thickness/100)*makerThickness;
    const ampScale=105*ripple,sideScale=29*ripple,centres=[];
    const baseR=journeyAuth.radius;
    const rot=journeyAuth.rotation;

    for(let i=0;i<n;i++){
      const f=i/n,th=phase+rot+f*Math.PI*2;
      const radial=(.66*sig.m[i]+.22*sig.x[i]+.12*sig.z[i])*ampScale;
      const tangent=sig.y[i]*sideScale;
      const rr=baseR+radial;
      centres.push({x:cx+Math.cos(th)*rr-Math.sin(th)*tangent,y:cy+Math.sin(th)*rr+Math.cos(th)*tangent,th,f});
    }

    const normals=centres.map((p,i)=>{
      const a=centres[(i-2+n)%n],b=centres[(i+2)%n];
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
      return{x:-dy/L,y:dx/L};
    });
    const widths=sig.energy.map((e,i)=>(27+48*e+16*sig.fray[i])*thickness*(.90+.20*Math.sin(Math.PI*2*centres[i].f+.4)**2));
    return {centres,normals,widths};
  }

  function traceClosed(ctx,pts){
    if(!pts.length)return;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();
  }

  function traceOpen(ctx,pts){
    if(!pts.length)return;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.closePath();
  }

  function ribbonPolygon(geo,scale=1){
    const left=[],right=[];
    for(let i=0;i<geo.centres.length;i++){
      const p=geo.centres[i],nn=geo.normals[i],w=geo.widths[i]*scale;
      left.push({x:p.x+nn.x*w,y:p.y+nn.y*w});
      right.push({x:p.x-nn.x*w,y:p.y-nn.y*w});
    }
    return left.concat(right.reverse());
  }

  function offsetLine(geo,sig,u,variation,auth){
    const pts=[];
    const frayControl=(auth.fray/100)*clamp(state.silkFray/100,.60,1.40);
    for(let i=0;i<geo.centres.length;i++){
      const p=geo.centres[i],nn=geo.normals[i],w=geo.widths[i];
      const measuredFray=sig.fray[i]*(5+14*Math.abs(u))*frayControl;
      const wig=(Math.sin(i*.115+variation*1.7)+.45*Math.sin(i*.047+variation*2.9))*measuredFray;
      const off=u*w*.82+wig;
      pts.push({x:p.x+nn.x*off,y:p.y+nn.y*off});
    }
    return pts;
  }

  function drawBodyPass(ctx,geo,color,alpha,blur,scale,composite){
    ctx.save();ctx.globalCompositeOperation=composite;ctx.globalAlpha=alpha;
    ctx.filter=blur?`blur(${blur}px)`:'none';
    traceClosed(ctx,ribbonPolygon(geo,scale));ctx.fillStyle=color;ctx.fill();ctx.restore();
  }

  function bandPolygon(a,b){return a.concat([...b].reverse());}

  function drawBand(ctx,pts,color,alpha,blur,composite){
    ctx.save();ctx.globalCompositeOperation=composite;ctx.globalAlpha=alpha;
    ctx.filter=blur?`blur(${blur}px)`:'none';
    traceClosed(ctx,pts);ctx.fillStyle=color;ctx.fill();ctx.restore();
  }

  function drawSegmentedStroke(ctx,pts,width,alpha,colourFn,blur,composite,step=3){
    if(pts.length<2)return;
    ctx.save();ctx.globalCompositeOperation=composite;ctx.globalAlpha=alpha;
    ctx.filter=blur?`blur(${blur}px)`:'none';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;
    for(let i=1;i<pts.length;i+=step){
      const j=Math.min(i+step,pts.length-1),t=(i+j)/(2*(pts.length-1));
      ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[j].x,pts[j].y);
      ctx.strokeStyle=colourFn(t);ctx.stroke();
    }
    ctx.restore();
  }

  function drawJourney(ctx,sig,journey,geo,quality,auth){
    const dark=state.darkGround;
    const journeyAuth=journey===0?auth.out:auth.ret;
    const bloom=(auth.bloom/100)*clamp(state.silkBloom/100,.60,1.40);
    const alpha=journeyAuth.opacity;
    const comp=dark?'screen':'source-over';
    const bodyColor=silkPaletteColor(journey,.5,0);
    const deep=mixHex(bodyColor,dark?'#ffffff':'#101820',dark?.03:.30);

    drawBodyPass(ctx,geo,bodyColor,((dark?.05:.07)+bloom*.025)*alpha,26+bloom*24,1.18,comp);
    drawBodyPass(ctx,geo,deep,(dark?.10:.085)*alpha,0,1,'source-over');

    const bands=quality==='preview'?8:12;
    for(let b=0;b<bands;b++){
      const u0=-1+2*b/bands,u1=-1+2*(b+1)/bands,um=(u0+u1)/2;
      const a=offsetLine(geo,sig,u0,100+b,auth),c=offsetLine(geo,sig,u1,200+b,auth),poly=bandPolygon(a,c);
      const color=silkPaletteColor(journey,.5,um),hot=mixHex(color,'#ffffff',dark?.22:.07);
      drawBand(ctx,poly,color,((dark?.055:.065)+bloom*.014)*alpha,7+bloom*5,comp);
      drawBand(ctx,poly,hot,(dark?.035:.025)*alpha,1.2+bloom*.8,comp);
    }

    if(state.silkColourMode!=='ribbon-spectrum'&&state.silkColourMode!=='journey-duo'){
      const avgWidth=mean(geo.widths)*1.15;
      drawSegmentedStroke(ctx,geo.centres,avgWidth,((dark?.12:.08)+bloom*.02)*alpha,t=>silkPaletteColor(journey,t,0),5+bloom*3,comp,quality==='preview'?5:3);
    }

    const requested=Math.round(clamp(auth.fibres*clamp(state.silkFibreDensity/100,.70,1.30),22,92));
    const fibres=quality==='preview'?Math.min(requested,44):requested;
    for(let s=0;s<fibres;s++){
      const u=-1+2*s/(fibres-1||1),mid=1-Math.abs(u),pts=offsetLine(geo,sig,u,s+state.variation*.37,auth);
      const densityFade=Math.sqrt(54/Math.max(18,fibres));
      if(state.silkColourMode==='time-spectrum'||state.silkColourMode==='journey-spectrum'||state.silkColourMode==='hybrid'){
        drawSegmentedStroke(ctx,pts,.55+1.15*mid,(dark?(.028+.060*mid):(.034+.052*mid))*densityFade*alpha,t=>mixHex(silkPaletteColor(journey,t,u),'#ffffff',.12+.26*mid),0,comp,quality==='preview'?7:4);
      }else{
        const fibreColor=mixHex(silkPaletteColor(journey,.5,u),'#ffffff',.14+.32*mid);
        ctx.save();ctx.globalCompositeOperation=comp;
        ctx.strokeStyle=rgbaCss(fibreColor,(dark?(.032+.072*mid):(.04+.065*mid))*densityFade*alpha);
        ctx.lineWidth=.55+1.15*mid;ctx.lineCap='round';ctx.lineJoin='round';traceOpen(ctx,pts);ctx.stroke();ctx.restore();
      }
    }

    const core=geo.centres,segStep=quality==='preview'?5:3;
    drawSegmentedStroke(ctx,core,11+4*bloom,(dark?.24:.14)*alpha,t=>silkPaletteColor(journey,t,0),dark?3.5+2*bloom:1.7+bloom,comp,segStep);
    drawSegmentedStroke(ctx,core,4.7,(dark?.62:.40)*alpha,t=>mixHex(silkPaletteColor(journey,t,0),'#ffffff',.40),0,comp,segStep);
    drawSegmentedStroke(ctx,core,1.45,(dark?.88:.64)*alpha,t=>mixHex(silkPaletteColor(journey,t,0),'#ffffff',dark?.68:.20),0,comp,segStep);

    const threshold=Math.max(.72,quantile(sig.impact,.974)),events=[];
    for(let i=3;i<sig.impact.length-3;i++){
      if(sig.impact[i]>=threshold&&sig.impact[i]>=sig.impact[i-1]&&sig.impact[i]>=sig.impact[i+1])events.push({i,a:sig.impact[i]});
    }
    events.sort((a,b)=>b.a-a.a).slice(0,quality==='preview'?6:10).forEach(({i,a})=>{
      const p=geo.centres[i],q=geo.centres[(i+3)%geo.centres.length];
      const dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,len=6+16*a;
      const flare=mixHex(silkPaletteColor(journey,i/geo.centres.length,0),'#ffffff',.72);
      ctx.save();ctx.globalCompositeOperation=comp;ctx.lineCap='round';
      ctx.filter=`blur(${2+4*a*bloom}px)`;ctx.strokeStyle=rgbaCss(flare,(dark?.24:.13)*alpha);ctx.lineWidth=5+5*a;
      ctx.beginPath();ctx.moveTo(p.x-ux*len*.5,p.y-uy*len*.5);ctx.lineTo(p.x+ux*len*.5,p.y+uy*len*.5);ctx.stroke();
      ctx.filter='none';ctx.strokeStyle=rgbaCss(dark?'#ffffff':'#18212b',(.72+.22*a)*alpha);ctx.lineWidth=1.4+1.8*a;
      ctx.beginPath();ctx.moveTo(p.x-ux*len*.5,p.y-uy*len*.5);ctx.lineTo(p.x+ux*len*.5,p.y+uy*len*.5);ctx.stroke();ctx.restore();
    });
  }

  function renderMaterial(outSig,retSig,auth,quality){
    const raster=quality==='export'?EXPORT_RASTER:PREVIEW_RASTER;
    const canvas=document.createElement('canvas');canvas.width=raster;canvas.height=raster;
    const ctx=canvas.getContext('2d',{alpha:true});ctx.scale(raster/1200,raster/1200);

    // Journey balance controls separation; mean axis orientation gently rotates each loop.
    // The generic Symmetry control is now only a small maker trim around that data baseline.
    const sep=auth.separation+clamp((18-state.symmetry)*.18,-15,8);
    const outGeo=buildGeometry(outSig,600-sep,590-auth.verticalBias,Math.PI*.14,auth.out);
    const retGeo=buildGeometry(retSig,600+sep,610+auth.verticalBias,Math.PI*1.08,auth.ret);
    drawJourney(ctx,outSig,0,outGeo,quality,auth);
    drawJourney(ctx,retSig,1,retGeo,quality,auth);

    if(state.darkGround&&auth.bloom>0){
      const copy=document.createElement('canvas');copy.width=raster;copy.height=raster;
      copy.getContext('2d').drawImage(canvas,0,0);
      const bloom=(auth.bloom/100)*clamp(state.silkBloom/100,.60,1.40);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=.08+.14*bloom;ctx.filter=`blur(${quality==='export'?8+15*bloom:4+8*bloom}px)`;
      ctx.drawImage(copy,0,0);ctx.restore();
    }
    return {href:canvas.toDataURL('image/png'),sep};
  }

  function updateDataReadout(auth){
    const el=document.getElementById('silkDataBaseline');
    if(!el)return;
    el.innerHTML=`<strong>DATA-AUTHORED BASELINE</strong><span>radius ${Math.round(auth.out.radius)} / ${Math.round(auth.ret.radius)} · fibres ${auth.fibres} · width ${Math.round(auth.out.thickness)} / ${Math.round(auth.ret.thickness)}% · ripple ${Math.round(auth.out.ripple)} / ${Math.round(auth.ret.ripple)}% · bloom ${Math.round(auth.bloom)}%</span>`;
  }

  function renderSilksNow(quality='preview'){
    if(!state.time.length)return;
    const sampleCount=quality==='export'?EXPORT_SAMPLES:PREVIEW_SAMPLES;
    const {out,ret,auth}=preparedPair(sampleCount),svg=baseArt();
    const material=renderMaterial(out,ret,auth,quality);
    svg.appendChild(svgEl('image',{x:0,y:0,width:1200,height:1200,href:material.href,'data-motion-silks-material':'true'}));
    const muted=state.darkGround?'#8190a0':'#65717d';
    const mk=(x,y,t)=>{const el=svgEl('text',{x,y,fill:muted,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'1.6','text-anchor':'middle',opacity:'.70'});el.textContent=t;svg.appendChild(el);};
    mk(600-material.sep,250,'OUTWARD · TIME →');mk(600+material.sep,250,'RETURN · TIME →');
    addSignature(svg,'Motion Silks');addPersonalityOverlay(svg);updatePersonalityPreview();updateDataReadout(auth);
  }

  function schedulePreview(immediate=false){
    clearTimeout(previewTimer);
    previewTimer=setTimeout(()=>{previewTimer=null;renderSilksNow('preview');},immediate?0:55);
  }

  const previousRender=render;
  render=function(){
    if(!state.time.length)return;
    if(state.style===STYLE_ID)schedulePreview(false);else previousRender();
  };

  state.style=STYLE_ID;

  const previousBuild=buildStyleGallery;
  let showStudies=false;
  buildStyleGallery=function(){
    previousBuild();
    const g=$('styleGallery');if(!g)return;
    [...g.querySelectorAll('.style-card')].forEach(card=>{
      const isFlagship=card.dataset.style===STYLE_ID;
      card.classList.toggle('flagship-style',isFlagship);
      card.style.display=(!showStudies&&!isFlagship)?'none':'';
      if(isFlagship&&!card.querySelector('.flagship-badge')){
        const badge=document.createElement('span');badge.className='flagship-badge';badge.textContent='FLAGSHIP';card.prepend(badge);
      }
    });
    let toggle=document.getElementById('studyToggle');
    if(!toggle){
      toggle=document.createElement('button');toggle.type='button';toggle.id='studyToggle';toggle.className='secondary-button study-toggle';
      g.insertAdjacentElement('afterend',toggle);toggle.onclick=()=>{showStudies=!showStudies;buildStyleGallery();};
    }
    toggle.textContent=showStudies?'Hide experimental studies':'Explore experimental studies';
  };

  function installMaterialControls(){
    if(document.getElementById('silkMaterialControls'))return;
    const variation=$('variation'),section=variation?.closest('.panel-section');if(!section)return;
    const wrap=document.createElement('div');wrap.id='silkMaterialControls';wrap.className='silk-material-controls';
    const rows=[
      ['silkFibreDensity','Fibre density trim',70,130,1,state.silkFibreDensity,v=>`${Math.round(v)}%`],
      ['silkThickness','Ribbon thickness trim',75,130,1,state.silkThickness,v=>`${Math.round(v)}%`],
      ['silkRipple','Ripple strength trim',75,130,1,state.silkRipple,v=>`${Math.round(v)}%`],
      ['silkFray','Texture / fray trim',60,140,1,state.silkFray,v=>`${Math.round(v)}%`],
      ['silkBloom','Bloom trim',60,140,1,state.silkBloom,v=>`${Math.round(v)}%`]
    ];
    wrap.innerHTML=`
      <div class="silk-controls-title"><strong>Motion Silks · data-authored</strong><span>The recording sets the baseline. These controls make restrained print/art adjustments around it.</span></div>
      <div id="silkDataBaseline" class="silk-data-baseline"><strong>DATA-AUTHORED BASELINE</strong><span>Load or adjust a journey to calculate its material settings.</span></div>
      <label class="select-row silk-colour-row"><span>Colour spread · art direction</span><select id="silkColourMode">
        <option value="hybrid">Hybrid — full palette + journey offset</option>
        <option value="time-spectrum">Time spectrum</option>
        <option value="ribbon-spectrum">Across ribbon</option>
        <option value="journey-spectrum">Journey spectrum</option>
        <option value="journey-duo">Journey duo</option>
      </select></label>
      ${rows.map(([id,label,min,max,step,value,fmt])=>`<label class="control-row compact"><div><span>${label}</span><output id="${id}Out">${fmt(value)}</output></div><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`).join('')}
      <button id="silkResetBaseline" type="button" class="secondary-button silk-reset">Reset trims to data baseline</button>`;
    variation.insertAdjacentElement('beforebegin',wrap);

    const colourMode=$('silkColourMode');colourMode.value=state.silkColourMode;
    colourMode.addEventListener('change',e=>{state.silkColourMode=e.target.value;if(state.style===STYLE_ID)schedulePreview(true);});

    rows.forEach(([id,,min,max,,value,fmt])=>{
      const input=$(id),out=$(`${id}Out`);
      input.addEventListener('input',e=>{
        const v=clamp(+e.target.value,+min,+max);state[id]=v;out.textContent=fmt(v);
        if(state.style===STYLE_ID)schedulePreview(false);
      });
      input.addEventListener('change',()=>{if(state.style===STYLE_ID)schedulePreview(true);});
    });

    $('silkResetBaseline').onclick=()=>{
      rows.forEach(([id,,,,,,fmt])=>{
        state[id]=100;const input=$(id),out=$(`${id}Out`);input.value='100';out.textContent=fmt(100);
      });
      if(state.style===STYLE_ID)schedulePreview(true);
    };
  }

  // High-resolution material is generated only for export, then preview quality is restored.
  const originalExportSvg=exportSvg,originalExportPng=exportPng;
  function exportWithQuality(fn){
    if(state.style!==STYLE_ID){fn();return;}
    clearTimeout(previewTimer);renderSilksNow('export');fn();setTimeout(()=>schedulePreview(true),0);
  }
  if($('exportSvg'))$('exportSvg').onclick=()=>exportWithQuality(originalExportSvg);
  if($('exportPng'))$('exportPng').onclick=()=>exportWithQuality(originalExportPng);

  const style=document.createElement('style');
  style.textContent=`
    .flagship-style{position:relative;border-color:#617d98!important;box-shadow:0 0 0 1px #617d9838 inset}
    .flagship-badge{display:inline-block;margin:0 0 7px;padding:3px 6px;border-radius:999px;background:#dfe9f3;color:#111821;font:700 7px Inter,sans-serif;letter-spacing:.14em}
    .study-toggle{margin-top:9px;width:100%}
    .silk-material-controls{margin:15px 0 12px;padding:12px;border:1px solid #22303e;border-radius:12px;background:#0a1016}
    .silk-controls-title{display:grid;gap:3px;margin-bottom:8px}.silk-controls-title strong{font:600 11px Manrope,sans-serif;color:#dce7f1}.silk-controls-title span{font-size:8px;line-height:1.4;color:#6f7e8e}
    .silk-data-baseline{display:grid;gap:3px;margin:8px 0 10px;padding:8px 9px;border:1px solid #284255;border-radius:9px;background:#0d1720}.silk-data-baseline strong{font-size:7px;letter-spacing:.12em;color:#75d5dc}.silk-data-baseline span{font-size:8px;line-height:1.45;color:#8b9cac}
    .silk-material-controls .control-row{margin:8px 0 0}.silk-colour-row{margin:8px 0 11px}.silk-colour-row select{width:100%}.silk-reset{width:100%;margin-top:11px}
  `;
  document.head.appendChild(style);

  buildStyleGallery();installMaterialControls();if(state.time.length)schedulePreview(true);
})();