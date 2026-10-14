// Spoke Detector — optional default recording for local Live Server use.
// Tries the relative project path requested by the studio workflow. If the file
// is absent or cannot be fetched, the app quietly falls back to manual upload.
(() => {
  const DEFAULT_DATA_URL='./phyphox_data/Data%20from%20phyphox2.xlsx';
  const DEFAULT_DATA_NAME='Data from phyphox2.xlsx';

  async function loadDefaultRecording(){
    if(location.protocol==='file:' || state.time.length) return;
    const status=$('statusText');
    const previous=status?.textContent||'Load a recording to begin';
    try{
      if(status) status.textContent='Loading default recording…';
      const res=await fetch(DEFAULT_DATA_URL,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      if(state.time.length) return; // do not overwrite a recording the user loaded meanwhile
      const blob=await res.blob();
      const file=new File([blob],DEFAULT_DATA_NAME,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      await loadFile(file);
    }catch(err){
      if(!state.time.length && status) status.textContent=previous;
      console.info(`Default recording not loaded from ${DEFAULT_DATA_URL}; manual upload remains available.`,err);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadDefaultRecording,{once:true});
  else loadDefaultRecording();
})();
