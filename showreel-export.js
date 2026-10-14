// Spoke Detector — participant showreel export.
// Builds a numbered contact sheet from the visible session gallery for chat/email handoff.
(() => {
  function formatDate(iso){
    if(!iso) return '';
    const d=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }

  function safeName(s){
    return (s||'participant').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'participant';
  }

  function collectCards(){
    const cards=[...document.querySelectorAll('#showreelGrid .showreel-card')];
    return cards.map((card,i)=>({
      number:i+1,
      label:card.querySelector('.showreel-label')?.value?.trim()||`Option ${i+1}`,
      type:card.querySelector('.showreel-type')?.textContent?.trim()||'Artwork',
      detail:card.querySelector('.showreel-sub')?.textContent?.trim()||'',
      image:card.querySelector('.showreel-thumb img')?.src||'',
      selected:card.classList.contains('selected'),
    })).filter(x=>x.image);
  }

  async function loadImage(src){
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src;});
    return img;
  }

  function headerLines(count){
    const name=(state.participantName||'').trim();
    const date=formatDate(state.sessionDate||'');
    const identity=[name,date].filter(Boolean).join(' · ');
    return {
      kicker:'SPOKE DETECTOR · PARTICIPANT SHOWREEL',
      title:name?`${name} — design selection`:'Design selection',
      sub:[identity,`${count} option${count===1?'':'s'} to review`].filter(Boolean).join(' · '),
      instruction:'Reply with the option number you prefer, e.g. “03”, and optionally a second choice.',
    };
  }

  async function drawContactSheet({pageItems,width=1600,columns=2,compact=false,pageNumber=1,pageCount=1}){
    const margin=84, gap=34, headerH=compact?220:265, footerH=compact?90:110;
    const cellW=(width-margin*2-gap*(columns-1))/columns;
    const imageH=cellW;
    const captionH=compact?118:138;
    const rows=Math.ceil(pageItems.length/columns);
    const height=Math.max(900,headerH+rows*(imageH+captionH)+(rows-1)*gap+footerH);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f5f3ee';ctx.fillRect(0,0,width,height);

    const header=headerLines(pageItems.length);
    ctx.fillStyle='#11161d';ctx.font='700 18px Inter, sans-serif';ctx.fillText(header.kicker,margin,58);
    ctx.font=`700 ${compact?42:48}px Manrope, sans-serif`;ctx.fillText(header.title,margin,120);
    ctx.fillStyle='#56616e';ctx.font='500 20px Inter, sans-serif';ctx.fillText(header.sub,margin,160);
    ctx.fillStyle='#6c7680';ctx.font='400 17px Inter, sans-serif';ctx.fillText(header.instruction,margin,197);
    ctx.strokeStyle='#c9c7c0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(margin,headerH-28);ctx.lineTo(width-margin,headerH-28);ctx.stroke();

    for(let i=0;i<pageItems.length;i++){
      const item=pageItems[i], row=Math.floor(i/columns), col=i%columns;
      const x=margin+col*(cellW+gap), y=headerH+row*(imageH+captionH+gap);
      ctx.fillStyle='#0b0f14';ctx.fillRect(x,y,cellW,imageH);
      try{
        const img=await loadImage(item.image);
        const scale=Math.min(cellW/img.width,imageH/img.height);
        const dw=img.width*scale,dh=img.height*scale;
        ctx.drawImage(img,x+(cellW-dw)/2,y+(imageH-dh)/2,dw,dh);
      }catch(e){
        ctx.fillStyle='#8994a0';ctx.font='500 16px Inter, sans-serif';ctx.fillText('Preview unavailable',x+20,y+36);
      }
      const badge=String(item.number).padStart(2,'0');
      ctx.fillStyle=item.selected?'#dbe8f3':'#11161d';ctx.fillRect(x+16,y+16,62,38);
      ctx.fillStyle=item.selected?'#11161d':'#ffffff';ctx.font='700 20px Inter, sans-serif';ctx.fillText(badge,x+29,y+42);
      if(item.selected){ctx.fillStyle='#dbe8f3';ctx.font='700 12px Inter, sans-serif';ctx.fillText('SELECTED',x+88,y+42);}

      const cy=y+imageH+26;
      ctx.fillStyle='#11161d';ctx.font='700 22px Manrope, sans-serif';ctx.fillText(`${badge} — ${item.label}`,x,cy);
      ctx.fillStyle='#586472';ctx.font='600 12px Inter, sans-serif';ctx.fillText(item.type.toUpperCase(),x,cy+26);
      ctx.fillStyle='#6d7781';ctx.font='400 14px Inter, sans-serif';
      const detail=item.detail.length>68?item.detail.slice(0,68)+'…':item.detail;
      ctx.fillText(detail,x,cy+51);
    }

    const fy=height-footerH+34;
    ctx.strokeStyle='#d4d1ca';ctx.beginPath();ctx.moveTo(margin,fy-20);ctx.lineTo(width-margin,fy-20);ctx.stroke();
    ctx.fillStyle='#68727c';ctx.font='500 14px Inter, sans-serif';ctx.fillText('Generated from measured handlebar-motion data · preview sheet only',margin,fy+9);
    if(pageCount>1){ctx.textAlign='right';ctx.fillText(`${pageNumber} / ${pageCount}`,width-margin,fy+9);ctx.textAlign='left';}
    return canvas;
  }

  async function exportJpg(){
    const cards=collectCards();
    if(!cards.length){alert('Add at least one design to the showreel first.');return;}
    const canvas=await drawContactSheet({pageItems:cards,width:1600,columns:2,compact:true});
    canvas.toBlob(blob=>{
      if(!blob)return;
      downloadBlob(blob,`${safeName(state.participantName)}-spoke-detector-showreel.jpg`);
    },'image/jpeg',.92);
  }

  async function exportPdf(){
    const cards=collectCards();
    if(!cards.length){alert('Add at least one design to the showreel first.');return;}
    const api=window.jspdf?.jsPDF;
    if(!api){alert('PDF export library did not load. Please check your internet connection and reload the page.');return;}
    const perPage=4, pages=[];
    for(let i=0;i<cards.length;i+=perPage) pages.push(cards.slice(i,i+perPage));
    const pdf=new api({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    for(let p=0;p<pages.length;p++){
      if(p>0)pdf.addPage('a4','portrait');
      const canvas=await drawContactSheet({pageItems:pages[p],width:1600,columns:2,compact:true,pageNumber:p+1,pageCount:pages.length});
      const img=canvas.toDataURL('image/jpeg',.9);
      const pageW=210,pageH=297,ratio=canvas.width/canvas.height;
      let w=190,h=w/ratio;
      if(h>277){h=277;w=h*ratio;}
      pdf.addImage(img,'JPEG',(pageW-w)/2,(pageH-h)/2,w,h,undefined,'FAST');
    }
    pdf.save(`${safeName(state.participantName)}-spoke-detector-showreel.pdf`);
  }

  function install(){
    const footer=document.querySelector('#showreelModal .showreel-footer');
    if(!footer)return;
    const controls=document.createElement('div');
    controls.className='showreel-export-actions';
    controls.innerHTML='<button id="exportShowreelJpg">Export chat JPG</button><button id="exportShowreelPdf">Export A4 PDF</button>';
    footer.insertBefore(controls,footer.firstChild);
    document.getElementById('exportShowreelJpg').onclick=exportJpg;
    document.getElementById('exportShowreelPdf').onclick=exportPdf;

    const style=document.createElement('style');
    style.textContent=`
      .showreel-export-actions{display:flex;gap:8px;flex-wrap:wrap}
      .showreel-export-actions button{border:1px solid #34475a;border-radius:9px;background:#e7edf3;color:#0a0d11;padding:8px 11px;font:700 9px Inter,sans-serif;cursor:pointer}
      .showreel-export-actions button:hover{background:#fff}
      @media(max-width:760px){.showreel-export-actions{width:100%}.showreel-export-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  install();
})();
