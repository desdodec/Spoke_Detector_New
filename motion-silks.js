// Spoke Detector — Motion Silks flagship artwork.
// Time runs around each loop; measured handlebar motion shapes the centreline.
// A deterministic canvas material pass adds translucent body, fibre, bloom and glints.
(() => {
  const STYLE_ID='silks';
  const RASTER=1800;
  if(!STYLES.some(s=>s.id===STYLE_ID)) STYLES.unshift({
    id:STYLE_ID,
    name:'Motion Silks',
    note:'flagship portrait — time runs around the loop; measured movement shapes the ribbon'
  });

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
    const a=Array.from(v),n=a.length;if(n<2)return a;
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
  function sliceSignal(values,start,end){ return normSignal(sliceRange(values,start,end)); }
  function prepareJourney(start,end,n=960){
    const x=closeLoop(resample(sliceSignal(state.x,start,end),n));
    const y=closeLoop(resample(sliceSignal(state.y,start,end),n));
    const z=closeLoop(resample(sliceSignal(state.z,start,end),n));
    const m=closeLoop(resample(sliceSignal(state.mag,start,end),n));

    // Broad motion owns the silhouette; faster detail becomes texture rather than jagged geometry.
    const bx=smoothCircular(x,10),by=smoothCircular(y,10),bz=smoothCircular(z,10),bm=smoothCircular(m,12);
    const medium=smoothCircular(m,4);
    const detail=m.map((v,i)=>v-medium[i]);
    const rough=detail.map((_,i)=>localWindow(detail,i,10));
    const rq=quantile(rough,.92)||1;
    const fray=smoothCircular(rough.map(v=>clamp(v/rq,0,1)),5);
    const motion=m.map((_,i)=>localWindow(m,i,18));
    const mq=quantile(motion,.94)||1;
    const energy=smoothCircular(motion.map(v=>clamp(v/mq,0,1)),7);
    const absDetail=detail.map(Math.abs),iq=quantile(absDetail,.985)||1;
    const impact=absDetail.map(v=>clamp(v/iq,0,1));
    return {x:bx,y:by,z:bz,m:bm,detail,fray,energy,impact};
  }
  function rgb(hex){ return hexRgb(hex); }
  function rgbaCss(hex,a){ const [r,g,b]=rgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function journeyBase(journey){
    const p=state.customPalette;
    if(!p?.length) return journey ? '#e24aa8' : '#39cbe5';
    if(journey===0) return mixHex(p[0],p[Math.min(1,p.length-1)],.28);
    return mixHex(p[Math.max(0,p.length-2)],p[p.length-1],.72);
  }
  function buildGeometry(sig,cx,cy,baseR,phase){
    const n=sig.m.length,complexity=state.complexity/100;
    const ampScale=68+complexity*58,sideScale=17+complexity*18;
    const centres=[];
    for(let i=0;i<n;i++){
      const f=i/n,th=phase+f*Math.PI*2;
      const radial=(.66*sig.m[i]+.22*sig.x[i]+.12*sig.z[i])*ampScale;
      const tangent=sig.y[i]*sideScale;
      const r=baseR+radial;
      centres.push({
        x:cx+Math.cos(th)*r-Math.sin(th)*tangent,
        y:cy+Math.sin(th)*r+Math.cos(th)*tangent,
        th,f
      });
    }
    const normals=centres.map((p,i)=>{
      const a=centres[(i-2+n)%n],b=centres[(i+2)%n];
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
      return {x:-dy/L,y:dx/L};
    });
    const widths=sig.energy.map((e,i)=>{
      const base=27 + 48*e + 16*sig.fray[i];
      return base*(.90+.20*Math.sin(Math.PI*2*centres[i].f+0.4)**2);
    });
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
  }
  function ribbonPolygon(geo,scale=1){
    const left=[],right=[],n=geo.centres.length;
    for(let i=0;i<n;i++){
      const p=geo.centres[i],nn=geo.normals[i],w=geo.widths[i]*scale;
      left.push({x:p.x+nn.x*w,y:p.y+nn.y*w});
      right.push({x:p.x-nn.x*w,y:p.y-nn.y*w});
    }
    return left.concat(right.reverse());
  }
  function offsetLine(geo,sig,u,variation){
    const pts=[],n=geo.centres.length;
    for(let i=0;i<n;i++){
      const p=geo.centres[i],nn=geo.normals[i],w=geo.widths[i];
      const measuredFray=sig.fray[i]*(5+14*Math.abs(u));
      const wig=(Math.sin(i*.115+variation*1.7)+.45*Math.sin(i*.047+variation*2.9))*measuredFray;
      const off=u*w*.82+wig;
      pts.push({x:p.x+nn.x*off,y:p.y+nn.y*off});
    }
    return pts;
  }
  function drawBodyPass(ctx,geo,color,alpha,blur,scale,composite='screen'){
    ctx.save();ctx.globalCompositeOperation=composite;ctx.globalAlpha=alpha;
    ctx.filter=blur?`blur(${blur}px)`:'none';
    traceClosed(ctx,ribbonPolygon(geo,scale));ctx.fillStyle=color;ctx.fill();ctx.restore();
  }
  function drawJourney(ctx,sig,journey,geo){
    const dark=state.darkGround,base=journeyBase(journey);
    const luminous=mixHex(base,'#ffffff',dark?.62:.16);
    const deep=mixHex(base,dark?'#ffffff':'#101820',dark?.04:.28);
    const glow=(state.glow||0)/100;
    const comp=dark?'screen':'source-over';

    // Atmospheric volume: broad colour body first, then tighter luminous shoulders.
    drawBodyPass(ctx,geo,base,(dark?.075:.095)+glow*.025,34+glow*20,1.18,comp);
    drawBodyPass(ctx,geo,base,(dark?.12:.13)+glow*.035,15+glow*10,1.05,comp);
    drawBodyPass(ctx,geo,deep,dark?.14:.11,0,1.00,'source-over');
    drawBodyPass(ctx,geo,luminous,dark?.13:.075,4.5,0.66,comp);
    drawBodyPass(ctx,geo,mixHex(luminous,'#ffffff',.45),dark?.09:.045,1.5,0.34,comp);

    // A modest number of fibres live inside the material rather than defining its edges.
    const fibres=Math.max(13,Math.min(25,Math.round(11+state.density*.18)));
    for(let s=0;s<fibres;s++){
      const u=-1+2*s/(fibres-1||1),mid=1-Math.abs(u),pts=offsetLine(geo,sig,u,s+state.variation*.37);
      ctx.save();ctx.globalCompositeOperation=comp;
      ctx.strokeStyle=rgbaCss(mixHex(base,'#ffffff',.16+.42*mid),dark?(.045+.085*mid):(.055+.075*mid));
      ctx.lineWidth=.7+1.35*mid;ctx.lineCap='round';ctx.lineJoin='round';
      traceOpen(ctx,pts);ctx.stroke();ctx.restore();
    }

    // Hot core hierarchy: broad coloured shoulder -> bright filament -> white glints.
    const core=geo.centres.map(p=>({x:p.x,y:p.y}));
    ctx.save();ctx.globalCompositeOperation=comp;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.filter=`blur(${dark?5:2.5}px)`;ctx.strokeStyle=rgbaCss(base,dark?.30:.16);ctx.lineWidth=13;traceOpen(ctx,core);ctx.stroke();
    ctx.filter='none';ctx.strokeStyle=rgbaCss(mixHex(base,'#ffffff',.42),dark?.66:.42);ctx.lineWidth=5.2;traceOpen(ctx,core);ctx.stroke();
    ctx.strokeStyle=rgbaCss(luminous,dark?.90:.67);ctx.lineWidth=1.55;traceOpen(ctx,core);ctx.stroke();ctx.restore();

    // Strong events become short embedded flares, not chart-like dots.
    const threshold=Math.max(.72,quantile(sig.impact,.974)),events=[];
    for(let i=3;i<sig.impact.length-3;i++){
      if(sig.impact[i]>=threshold&&sig.impact[i]>=sig.impact[i-1]&&sig.impact[i]>=sig.impact[i+1])events.push({i,a:sig.impact[i]});
    }
    events.sort((a,b)=>b.a-a.a).slice(0,9).forEach(({i,a})=>{
      const p=geo.centres[i],q=geo.centres[(i+3)%geo.centres.length],dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,len=6+16*a;
      ctx.save();ctx.globalCompositeOperation=comp;ctx.lineCap='round';
      ctx.filter=`blur(${3+4*a}px)`;ctx.strokeStyle=rgbaCss('#ffffff',dark?.22:.12);ctx.lineWidth=6+5*a;ctx.beginPath();ctx.moveTo(p.x-ux*len*.5,p.y-uy*len*.5);ctx.lineTo(p.x+ux*len*.5,p.y+uy*len*.5);ctx.stroke();
      ctx.filter='none';ctx.strokeStyle=rgbaCss(dark?'#ffffff':'#18212b',.72+.22*a);ctx.lineWidth=1.4+1.8*a;ctx.beginPath();ctx.moveTo(p.x-ux*len*.5,p.y-uy*len*.5);ctx.lineTo(p.x+ux*len*.5,p.y+uy*len*.5);ctx.stroke();ctx.restore();
    });
  }
  function renderMaterial(outSig,retSig,sep){
    const canvas=document.createElement('canvas');canvas.width=RASTER;canvas.height=RASTER;
    const ctx=canvas.getContext('2d',{alpha:true});
    const S=RASTER/1200;ctx.scale(S,S);
    const overlap=state.symmetry/100;
    const outGeo=buildGeometry(outSig,600-sep,590,287,Math.PI*.14);
    const retGeo=buildGeometry(retSig,600+sep,610,301,Math.PI*1.08);
    drawJourney(ctx,outSig,0,outGeo);
    drawJourney(ctx,retSig,1,retGeo);
    // A final restrained bloom lets cyan/magenta overlaps approach white on dark grounds.
    if(state.darkGround){
      const copy=document.createElement('canvas');copy.width=RASTER;copy.height=RASTER;
      const cc=copy.getContext('2d');cc.drawImage(canvas,0,0);
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.16+.14*(state.glow/100);ctx.filter=`blur(${8+10*(state.glow/100)}px)`;ctx.drawImage(copy,0,0);ctx.restore();
    }
    return canvas.toDataURL('image/png');
  }
  function renderSilks(){
    const svg=baseArt(),r=selectedRanges();
    const out=prepareJourney(r.outStart,r.outEnd),ret=prepareJourney(r.retStart,r.retEnd);
    const sep=lerp(176,72,state.symmetry/100);
    const href=renderMaterial(out,ret,sep);
    const image=svgEl('image',{x:0,y:0,width:1200,height:1200,href,'data-motion-silks-material':'true'});
    svg.appendChild(image);

    const muted=state.darkGround?'#8190a0':'#65717d';
    const mk=(x,y,t)=>{const el=svgEl('text',{x,y,fill:muted,'font-family':'Inter, sans-serif','font-size':'10','letter-spacing':'1.6','text-anchor':'middle',opacity:'.70'});el.textContent=t;svg.appendChild(el);};
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
