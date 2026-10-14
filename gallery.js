// Spoke Detector — session showreel / participant choice gallery.
// Captures the current standard artwork or T-shirt preview without altering source data.
(() => {
  const items=[];
  let selectedId=null;

  function injectStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .gallery-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.gallery-button{border:1px solid #314154;border-radius:10px;background:#0e151e;color:#dbe5ef;padding:10px 11px;font:600 11px Inter,sans-serif;cursor:pointer}.gallery-button:hover{background:#14202c}.gallery-button.primary{background:#e7edf3;color:#0a0d11;border-color:#e7edf3}.gallery-button.primary:hover{background:#fff}
      .gallery-count{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#26384b;color:#dfeaf4;font-size:9px;margin-left:6px}
      .showreel-modal{position:fixed;inset:0;z-index:1200;background:#030507e8;backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:24px}.showreel-modal.open{display:flex}.showreel-dialog{width:min(1280px,96vw);height:min(860px,94vh);display:grid;grid-template-rows:auto 1fr auto;background:#080c11;border:1px solid #263443;border-radius:20px;overflow:hidden;box-shadow:0 42px 150px #000}.showreel-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid #1b2632}.showreel-head h2{font:600 22px Manrope,sans-serif;margin:4px 0 4px}.showreel-head p{font-size:11px;color:#738293;margin:0}.showreel-close{width:34px;height:34px;border:1px solid #2a3745;border-radius:9px;background:#101720;color:#dce5ee;font-size:19px;cursor:pointer}
      .showreel-grid{overflow:auto;padding:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;align-content:start}.showreel-empty{grid-column:1/-1;min-height:350px;display:grid;place-items:center;text-align:center;color:#6f7e8e;font-size:12px;border:1px dashed #243242;border-radius:16px;background:#0a0f15}.showreel-card{position:relative;border:1px solid #22303e;border-radius:15px;background:#0c1219;overflow:hidden;transition:.18s}.showreel-card:hover{transform:translateY(-2px);border-color:#3d5268}.showreel-card.selected{border-color:#a9c8e6;box-shadow:0 0 0 1px #a9c8e655 inset}.showreel-thumb{aspect-ratio:1;background:#05070a;display:grid;place-items:center;overflow:hidden}.showreel-thumb img{width:100%;height:100%;object-fit:contain;display:block}.showreel-meta{padding:12px}.showreel-type{font-size:8px;letter-spacing:.13em;color:#6e8297;text-transform:uppercase}.showreel-label{display:block;width:100%;margin-top:6px;background:transparent;border:0;border-bottom:1px solid #263645;color:#eef4fa;font:600 12px Manrope,sans-serif;padding:0 0 5px;outline:none}.showreel-sub{font-size:9px;color:#768698;line-height:1.45;margin-top:7px}.showreel-card-actions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:10px}.showreel-select,.showreel-delete{border:1px solid #2b3b4b;border-radius:8px;background:#111a24;color:#cbd7e2;font:600 9px Inter,sans-serif;padding:7px;cursor:pointer}.showreel-card.selected .showreel-select{background:#e7edf3;color:#0a0d11;border-color:#e7edf3}.showreel-delete{width:32px;color:#9daaba}.showreel-footer{padding:13px 22px;border-top:1px solid #1b2632;display:flex;justify-content:space-between;gap:16px;align-items:center;font-size:10px;color:#728191}.showreel-choice{color:#c9d6e2}.showreel-choice strong{color:#f0f5fa}
      #addTshirtToGallery{margin-top:8px}
      @media(max-width:760px){.showreel-modal{padding:8px}.showreel-dialog{height:97vh}.showreel-grid{grid-template-columns:1fr 1fr;padding:12px;gap:10px}.showreel-footer{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function svgBlobUrl(svg){
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','1200');clone.setAttribute('height','1200');
    return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
  }

  async function imageFromUrl(url){
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    return img;
  }

  function currentMeta(type){
    const style=STYLES.find(s=>s.id===state.style)?.name||state.style;
    const palette=PALETTES[state.palette]?.name || (state.palette==='custom'?'Custom palette':state.palette);
    const bg=state.backgroundColor||'#07090d';
    return {type,style,palette,bg,filename:state.filename||'walk',variation:state.variation};
  }

  async function captureArtboard(){
    if(!state.time.length)return;
    const src=svgBlobUrl(document.getElementById('artboard'));
    const img=await imageFromUrl(src);
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1000;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,1000,1000);URL.revokeObjectURL(src);
    const url=canvas.toDataURL('image/jpeg',.9);
    addItem(url,currentMeta('Artwork'));
  }

  async function captureTshirt(){
    if(!state.time.length)return;
    const art=document.getElementById('shirtArtwork');
    const body=document.getElementById('shirtBody');
    if(!art||!art.src||!body)return;
    const W=1000,H=1120,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0b0f14';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(W*.5,H*.51);const s=Math.min(W/700,H/785)*.82;ctx.scale(s,s);ctx.translate(-350,-392.5);ctx.fillStyle=body.getAttribute('fill')||'#111317';ctx.fill(new Path2D('M246 86 C271 110 304 121 350 121 C396 121 429 110 454 86 L571 130 L668 257 L580 320 L521 249 L521 735 C471 759 413 771 350 771 C287 771 229 759 179 735 L179 249 L120 320 L32 257 L129 130 Z'));ctx.restore();
    const im=await imageFromUrl(art.src);
    const scene={left:W*.09,top:H*.10,width:W*.82,height:H*.82};
    const left=parseFloat(art.style.left)||50,top=parseFloat(art.style.top)||45,width=parseFloat(art.style.width)||34;
    const dw=scene.width*(width/100),dh=dw,x=scene.left+scene.width*(left/100)-dw/2,y=scene.top+scene.height*(top/100)-dh/2;ctx.drawImage(im,x,y,dw,dh);
    const meta=currentMeta('T-shirt preview');
    const caption=document.getElementById('mockupCaptionText')?.textContent||'';meta.mockup=caption;
    addItem(canvas.toDataURL('image/jpeg',.9),meta);
  }

  function addItem(url,meta){
    const id=`g${Date.now()}${Math.random().toString(36).slice(2,6)}`;
    const sameType=items.filter(x=>x.meta.type===meta.type).length+1;
    items.push({id,url,meta,label:`Option ${items.length+1}${meta.type==='T-shirt preview'?' · Tee':''}`});
    renderGallery();updateCount();openGallery();
  }

  function updateCount(){
    document.querySelectorAll('.gallery-count').forEach(el=>el.textContent=items.length);
  }

  function renderGallery(){
    const grid=document.getElementById('showreelGrid');if(!grid)return;
    if(!items.length){grid.innerHTML='<div class="showreel-empty"><div><strong>No options saved yet.</strong><br><br>Add a standard artwork or T-shirt preview to build the participant showreel.</div></div>';updateFooter();return;}
    grid.innerHTML='';
    items.forEach(item=>{
      const card=document.createElement('article');card.className='showreel-card'+(item.id===selectedId?' selected':'');card.dataset.id=item.id;
      const detail=item.meta.type==='T-shirt preview'?(item.meta.mockup||'Garment mockup'):`${item.meta.style} · ${item.meta.palette}`;
      card.innerHTML=`<div class="showreel-thumb"><img src="${item.url}" alt="${item.label}"></div><div class="showreel-meta"><div class="showreel-type">${item.meta.type}</div><input class="showreel-label" value="${item.label.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" aria-label="Option label"><div class="showreel-sub">${detail}</div><div class="showreel-card-actions"><button class="showreel-select">${item.id===selectedId?'Selected':'Choose this'}</button><button class="showreel-delete" title="Remove option" aria-label="Remove option">×</button></div></div>`;
      card.querySelector('.showreel-label').addEventListener('change',e=>{item.label=e.target.value.trim()||'Untitled option';updateFooter();});
      card.querySelector('.showreel-select').addEventListener('click',()=>{selectedId=item.id;renderGallery();});
      card.querySelector('.showreel-delete').addEventListener('click',()=>{const i=items.findIndex(x=>x.id===item.id);if(i>=0)items.splice(i,1);if(selectedId===item.id)selectedId=null;renderGallery();updateCount();});
      grid.appendChild(card);
    });
    updateFooter();
  }

  function updateFooter(){
    const el=document.getElementById('showreelChoice');if(!el)return;
    const chosen=items.find(x=>x.id===selectedId);
    el.innerHTML=chosen?`Participant choice: <strong>${chosen.label}</strong>`:'No participant choice selected yet.';
  }

  function openGallery(){const m=document.getElementById('showreelModal');m.classList.add('open');m.setAttribute('aria-hidden','false');renderGallery();}
  function closeGallery(){const m=document.getElementById('showreelModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');}

  function installUI(){
    const exportSection=document.querySelector('.export-section');if(exportSection){
      const wrap=document.createElement('div');wrap.className='gallery-actions';wrap.innerHTML=`<button class="gallery-button" id="addArtworkToGallery">Add artwork to showreel</button><button class="gallery-button" id="openShowreel">Showreel <span class="gallery-count">0</span></button>`;exportSection.appendChild(wrap);
      document.getElementById('addArtworkToGallery').onclick=captureArtboard;document.getElementById('openShowreel').onclick=openGallery;
    }
    const tshirtExport=document.getElementById('exportShirtMockup');if(tshirtExport){const b=document.createElement('button');b.id='addTshirtToGallery';b.className='mockup-export';b.textContent='Add preview to showreel';tshirtExport.insertAdjacentElement('afterend',b);b.onclick=captureTshirt;}
    const modal=document.createElement('div');modal.id='showreelModal';modal.className='showreel-modal';modal.setAttribute('aria-hidden','true');modal.innerHTML=`<div class="showreel-dialog" role="dialog" aria-modal="true" aria-label="Participant design showreel"><header class="showreel-head"><div><div class="eyebrow">PARTICIPANT SHOWREEL</div><h2>Choose a design</h2><p>Saved previews from this browser session. Mix standard artworks and T-shirt mockups freely.</p></div><button class="showreel-close" id="closeShowreel" aria-label="Close showreel">×</button></header><section class="showreel-grid" id="showreelGrid"></section><footer class="showreel-footer"><span>Previews are session-only and are not silently saved after the page is closed.</span><span class="showreel-choice" id="showreelChoice">No participant choice selected yet.</span></footer></div>`;document.body.appendChild(modal);
    document.getElementById('closeShowreel').onclick=closeGallery;modal.addEventListener('click',e=>{if(e.target===modal)closeGallery();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeGallery();});
    renderGallery();
  }

  injectStyles();installUI();
})();
