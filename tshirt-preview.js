// Spoke Detector — non-destructive T-shirt mockup previewer.
// The preview uses the current rendered SVG artwork unchanged. It never alters sensor data.
(() => {
  const SHIRTS = {
    black: { label: 'Black', color: '#111317' },
    white: { label: 'White', color: '#f4f2ec' },
    cream: { label: 'Cream', color: '#e7dfcf' },
    charcoal: { label: 'Charcoal', color: '#34383d' },
    navy: { label: 'Navy', color: '#172131' },
  };

  const PLACEMENTS = {
    center: { label: 'Centered chest', x: 50, y: 45, widths: [24, 34, 43] },
    oversized: { label: 'Oversized front', x: 50, y: 49, widths: [40, 50, 59] },
    left: { label: 'Left chest', x: 39, y: 35, widths: [11, 15, 19] },
    back: { label: 'Back print', x: 50, y: 45, widths: [28, 39, 49] },
  };

  const SIZES = ['Small', 'Medium', 'Large'];
  const previewState = { shirt: 'black', placement: 'center', size: 1 };
  let artUrl = null;

  function injectStyles(){
    const style = document.createElement('style');
    style.textContent = `
      .mockup-open{margin-top:0!important;margin-bottom:10px!important;border-color:#42566d!important;background:linear-gradient(135deg,#111b27,#0c131c)!important}
      .mockup-open:before{content:'◫';margin-right:7px;color:#87b7e3}
      .mockup-modal{position:fixed;inset:0;z-index:1000;background:#020407dc;backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:28px}
      .mockup-modal.open{display:flex}
      .mockup-dialog{width:min(1120px,96vw);height:min(790px,92vh);display:grid;grid-template-columns:300px 1fr;background:#090d12;border:1px solid #263342;border-radius:20px;overflow:hidden;box-shadow:0 40px 140px #000}
      .mockup-controls{padding:24px;background:linear-gradient(180deg,#0d131b,#080b10);border-right:1px solid #1e2834;overflow:auto}
      .mockup-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px}.mockup-head h2{font-family:Manrope,sans-serif;font-size:20px;margin:3px 0 5px}.mockup-head p{font-size:10px;line-height:1.5;color:#718092;margin:0}.mockup-close{border:1px solid #283543;background:#101720;color:#d5dee7;width:31px;height:31px;border-radius:9px;cursor:pointer;font-size:18px}
      .mockup-label{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6e7d8e;margin:18px 0 8px}.mockup-select{width:100%;background:#0c1219;color:#e4e9ef;border:1px solid #273443;border-radius:9px;padding:10px}
      .shirt-swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.shirt-swatch{height:38px;border-radius:9px;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px #ffffff20}.shirt-swatch.active{border-color:#8fc4f5;box-shadow:0 0 0 1px #8fc4f555}
      .mockup-note{font-size:10px;line-height:1.5;color:#6d7a88;margin:16px 0 20px;padding:11px;border:1px solid #1d2935;border-radius:10px;background:#0a1017}.mockup-note strong{color:#a9bdd0}
      .mockup-export{width:100%;border:0;border-radius:10px;padding:12px;font-weight:700;background:#e7edf3;color:#090c10;cursor:pointer}.mockup-export:disabled{opacity:.4;cursor:not-allowed}
      .mockup-stage{min-width:0;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 50% 45%,#27303a 0,#141a21 43%,#080b0f 100%);overflow:hidden}
      .shirt-scene{position:relative;width:min(72vh,650px);aspect-ratio:1/1.12;filter:drop-shadow(0 26px 35px #000a)}
      .shirt-svg{position:absolute;inset:0;width:100%;height:100%}.shirt-art{position:absolute;transform:translate(-50%,-50%);object-fit:contain;transition:all .22s ease;filter:drop-shadow(0 2px 4px #0003)}
      .mockup-caption{position:absolute;left:20px;bottom:18px;font-size:9px;letter-spacing:.12em;color:#7f8d9c;text-transform:uppercase}.mockup-caption strong{color:#bac8d5;margin-right:8px}
      .mockup-empty{position:absolute;inset:0;display:none;place-items:center;text-align:center;color:#83909e;font-size:12px;padding:40px}.mockup-empty.show{display:grid}
      @media(max-width:780px){.mockup-modal{padding:10px}.mockup-dialog{grid-template-columns:1fr;height:96vh;overflow:auto}.mockup-controls{border-right:0;border-bottom:1px solid #1e2834}.mockup-stage{min-height:560px}.shirt-scene{width:min(92vw,560px)}}
    `;
    document.head.appendChild(style);
  }

  function createUI(){
    const exportSection = document.querySelector('.export-section');
    if(!exportSection) return;
    const open = document.createElement('button');
    open.id = 'openShirtPreview';
    open.className = 'secondary-button mockup-open';
    open.textContent = 'Preview on T-shirt';
    const grid = exportSection.querySelector('.export-grid');
    exportSection.insertBefore(open, grid);

    const modal = document.createElement('div');
    modal.className = 'mockup-modal';
    modal.id = 'shirtPreviewModal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <div class="mockup-dialog" role="dialog" aria-modal="true" aria-label="T-shirt artwork preview">
        <aside class="mockup-controls">
          <div class="mockup-head"><div><div class="eyebrow">GARMENT PREVIEW</div><h2>T-shirt mockup</h2><p>Preview only. Your print artwork remains unchanged.</p></div><button class="mockup-close" id="closeShirtPreview" aria-label="Close preview">×</button></div>
          <span class="mockup-label">Garment colour</span>
          <div class="shirt-swatches" id="shirtSwatches"></div>
          <label class="mockup-label" for="shirtPlacement">Placement</label>
          <select class="mockup-select" id="shirtPlacement">${Object.entries(PLACEMENTS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select>
          <label class="mockup-label" for="shirtSize">Print scale</label>
          <select class="mockup-select" id="shirtSize">${SIZES.map((v,i)=>`<option value="${i}"${i===1?' selected':''}>${v}</option>`).join('')}</select>
          <div class="mockup-note"><strong>Mockup only.</strong> This view places the exact current SVG onto a garment silhouette. Use Export SVG / PNG in the main studio for production artwork.</div>
          <button class="mockup-export" id="exportShirtMockup">Export mockup PNG</button>
        </aside>
        <section class="mockup-stage">
          <div class="shirt-scene" id="shirtScene">
            <svg class="shirt-svg" viewBox="0 0 700 785" aria-hidden="true">
              <defs><filter id="shirtShadow"><feDropShadow dx="0" dy="13" stdDeviation="13" flood-opacity=".34"/></filter><linearGradient id="shirtLight" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".48" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".13"/></linearGradient></defs>
              <path id="shirtBody" d="M246 86 C271 110 304 121 350 121 C396 121 429 110 454 86 L571 130 L668 257 L580 320 L521 249 L521 735 C471 759 413 771 350 771 C287 771 229 759 179 735 L179 249 L120 320 L32 257 L129 130 Z" fill="#111317" filter="url(#shirtShadow)"/>
              <path d="M246 86 C267 128 302 151 350 151 C398 151 433 128 454 86 C429 110 396 121 350 121 C304 121 271 110 246 86 Z" fill="#07090c" opacity=".7"/>
              <path d="M129 130 L179 249 L179 735 C229 759 287 771 350 771 C413 771 471 759 521 735 L521 249 L571 130" fill="url(#shirtLight)" opacity=".62"/>
              <path d="M179 249 C236 268 291 277 350 277 C409 277 464 268 521 249" fill="none" stroke="#fff" stroke-opacity=".035"/>
            </svg>
            <img class="shirt-art" id="shirtArtwork" alt="Current Spoke Detector artwork on T-shirt" />
          </div>
          <div class="mockup-empty" id="shirtEmpty">Load a recording and generate artwork before opening the garment preview.</div>
          <div class="mockup-caption"><strong>PREVIEW</strong><span id="mockupCaptionText">Black · Centered chest · Medium</span></div>
        </section>
      </div>`;
    document.body.appendChild(modal);

    const swatches = document.getElementById('shirtSwatches');
    Object.entries(SHIRTS).forEach(([key,v])=>{
      const b=document.createElement('button'); b.type='button'; b.className='shirt-swatch'+(key===previewState.shirt?' active':''); b.dataset.shirt=key; b.title=v.label; b.setAttribute('aria-label',v.label); b.style.background=v.color; swatches.appendChild(b);
    });
  }

  function artworkBlobUrl(){
    if(!window.state || !state.time || !state.time.length || !document.getElementById('artboard')) return null;
    const clone=document.getElementById('artboard').cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','1200'); clone.setAttribute('height','1200');
    const text=new XMLSerializer().serializeToString(clone);
    if(artUrl) URL.revokeObjectURL(artUrl);
    artUrl=URL.createObjectURL(new Blob([text],{type:'image/svg+xml;charset=utf-8'}));
    return artUrl;
  }

  function placementStyle(){
    const p=PLACEMENTS[previewState.placement],w=p.widths[previewState.size];
    return { left:p.x, top:p.y, width:w };
  }

  function updatePreview(){
    const img=document.getElementById('shirtArtwork'), body=document.getElementById('shirtBody'), empty=document.getElementById('shirtEmpty');
    if(!img||!body) return;
    body.setAttribute('fill',SHIRTS[previewState.shirt].color);
    const style=placementStyle(); img.style.left=style.left+'%'; img.style.top=style.top+'%'; img.style.width=style.width+'%'; img.style.height='auto';
    const url=artworkBlobUrl();
    if(url){img.src=url;img.style.display='block';empty.classList.remove('show');}
    else{img.removeAttribute('src');img.style.display='none';empty.classList.add('show');}
    document.getElementById('exportShirtMockup').disabled=!url;
    document.getElementById('mockupCaptionText').textContent=`${SHIRTS[previewState.shirt].label} · ${PLACEMENTS[previewState.placement].label} · ${SIZES[previewState.size]}`;
  }

  function openPreview(){const m=document.getElementById('shirtPreviewModal');m.classList.add('open');m.setAttribute('aria-hidden','false');updatePreview();}
  function closePreview(){const m=document.getElementById('shirtPreviewModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');}

  function drawShirt(ctx,W,H,color){
    ctx.save(); ctx.translate(W*.5,H*.51); const s=Math.min(W/700,H/785)*.82; ctx.scale(s,s); ctx.translate(-350,-392.5);
    ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=35;ctx.shadowOffsetY=20;ctx.fillStyle=color;
    const p=new Path2D('M246 86 C271 110 304 121 350 121 C396 121 429 110 454 86 L571 130 L668 257 L580 320 L521 249 L521 735 C471 759 413 771 350 771 C287 771 229 759 179 735 L179 249 L120 320 L32 257 L129 130 Z');ctx.fill(p);
    ctx.shadowColor='transparent';ctx.fillStyle='rgba(0,0,0,.34)';const neck=new Path2D('M246 86 C267 128 302 151 350 151 C398 151 433 128 454 86 C429 110 396 121 350 121 C304 121 271 110 246 86 Z');ctx.fill(neck);
    ctx.restore();
  }

  async function exportMockup(){
    const art=artworkBlobUrl(); if(!art)return;
    const W=1800,H=2000,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    const grad=ctx.createRadialGradient(W*.5,H*.43,30,W*.5,H*.5,W*.68);grad.addColorStop(0,'#303943');grad.addColorStop(.5,'#151b22');grad.addColorStop(1,'#080b0f');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    drawShirt(ctx,W,H,SHIRTS[previewState.shirt].color);
    const im=new Image();
    await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=art;});
    const scene={left:W*.5-W*.82/2,top:H*.51-H*.82/2,width:W*.82,height:H*.82};
    const p=placementStyle();const drawW=scene.width*(p.width/100),drawH=drawW;const x=scene.left+scene.width*(p.left/100)-drawW/2,y=scene.top+scene.height*(p.top/100)-drawH/2;ctx.drawImage(im,x,y,drawW,drawH);
    ctx.fillStyle='rgba(225,234,243,.62)';ctx.font='600 18px Inter, sans-serif';ctx.fillText('SPOKE DETECTOR · GARMENT PREVIEW',54,H-58);
    canvas.toBlob(blob=>downloadBlob(blob,`${state.filename || 'spoke-detector'}-${state.style || 'art'}-tshirt-mockup.png`),'image/png');
  }

  function wireUI(){
    document.getElementById('openShirtPreview').addEventListener('click',openPreview);
    document.getElementById('closeShirtPreview').addEventListener('click',closePreview);
    document.getElementById('shirtPreviewModal').addEventListener('click',e=>{if(e.target.id==='shirtPreviewModal')closePreview();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closePreview();});
    document.querySelectorAll('.shirt-swatch').forEach(b=>b.addEventListener('click',()=>{previewState.shirt=b.dataset.shirt;document.querySelectorAll('.shirt-swatch').forEach(x=>x.classList.toggle('active',x===b));updatePreview();}));
    document.getElementById('shirtPlacement').addEventListener('change',e=>{previewState.placement=e.target.value;updatePreview();});
    document.getElementById('shirtSize').addEventListener('change',e=>{previewState.size=Number(e.target.value);updatePreview();});
    document.getElementById('exportShirtMockup').addEventListener('click',exportMockup);
  }

  injectStyles(); createUI(); wireUI();
})();
