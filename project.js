"use strict";
/* Portable, local-only ChordStudio project files. No network or account needed. */
(function(){
  const $=id=>document.getElementById(id);
  const FORMAT="chordstudio-project", VERSION=1;
  function serializeLines(nodes){
    return [...nodes].filter(node=>node.nodeType===1)
      .map(line=>({heading:line.classList.contains("heading"),html:line.innerHTML}));
  }
  function safeChild(node){
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.nodeValue);
    if(node.nodeType!==Node.ELEMENT_NODE)return null;
    const tag=node.tagName.toLowerCase();
    if(["script","style","iframe","svg","img","object","embed","form","input","meta","link","video","audio"].includes(tag))return null;
    const allowed=["span","b","strong","em","i","u","s","strike","br","div","p"];
    const el=document.createElement(allowed.includes(tag)?tag:"span");
    if(tag==="br")return el;
    if(tag==="span"&&node.classList.contains("song-chord"))el.className="song-chord";
    const css=node.style;
    if(["bold","bolder","600","700","800","900"].includes(css.fontWeight))el.style.fontWeight=css.fontWeight;
    if(["italic","oblique"].includes(css.fontStyle))el.style.fontStyle=css.fontStyle;
    if(["underline","line-through"].includes(css.textDecorationLine))el.style.textDecoration=css.textDecorationLine;
    for(const child of node.childNodes){const copy=safeChild(child);if(copy)el.append(copy);}
    return el;
  }
  function decodeLines(entries){
    if(!Array.isArray(entries)||entries.length>10000)throw Error("Project contains invalid song lines.");
    const result=[];
    for(const entry of entries){
      if(!entry||typeof entry.html!=="string"||entry.html.length>50000)
        throw Error("Project contains invalid formatted text.");
      const div=document.createElement("div");div.className="song-line";
      if(entry.heading)div.classList.add("heading");
      // Parse as an HTML fragment. Parsing a whole HTML document discards
      // leading spaces before the first span, breaking chord alignment.
      const template=document.createElement("template");
      template.innerHTML=entry.html;
      for(const child of template.content.childNodes){
        const copy=safeChild(child);if(copy)div.append(copy);
      }
      result.push(div);
    }
    return result;
  }
  function safeCatalog(src,{allowEmpty=false}={}){
    if(!src||Array.isArray(src)||typeof src!=="object")throw Error("Missing project chord definitions.");
    const entries=Object.entries(src);
    if((!allowEmpty&&!entries.length)||entries.length>500)throw Error("Invalid number of saved chord definitions.");
    const result={};
    for(const [name,shapes] of entries){
      if(name.length>100||!Array.isArray(shapes)||shapes.length>100)
        throw Error("Invalid chord variation entries.");
      result[name]=shapes.filter(v=>v&&Array.isArray(v.frets)&&v.frets.length===6)
        .map(v=>({
          id:String(v.id||codeFrom(v)).slice(0,100),
          frets:v.frets.map(Number),
          fingers:Array.isArray(v.fingers)&&v.fingers.length===6?v.fingers.map(Number):[0,0,0,0,0,0],
          fret:Number(v.fret)||0,
          listCapos:Array.isArray(v.listCapos)?v.listCapos:[],
          showAllFrets:!!v.showAllFrets,
          showNoteNames:v.showNoteNames===true,
          noteSpellings:v.noteSpellings&&typeof v.noteSpellings==="object"
            ?Object.fromEntries(Object.entries(v.noteSpellings).filter(([k,n])=>/^(?:[0-9]|1[01])$/.test(k)&&/^[A-G](?:#|b)?$/.test(String(n)))):{},
          tuningMidi:Array.isArray(v.tuningMidi)&&v.tuningMidi.length===6
            &&v.tuningMidi.every(Number.isInteger)?[...v.tuningMidi]:null
        }));
      if(!result[name].length)delete result[name];
    }
    if(!allowEmpty&&!Object.keys(result).length)throw Error("No usable fretboard shapes in saved project.");
    return result;
  }
  function snapshot(){
    applySongEdit(true);
    return {
      format:FORMAT,version:VERSION,savedAt:new Date().toISOString(),
      page:{
        title:page?.title||$("songName").textContent||"Untitled song",
        artist:page?.artist??$("artistName").textContent??"",
        writtenBy:page?.writtenBy||"",
        arrangedBy:page?.arrangedBy||"",
        performedBy:page?.performedBy??page?.artist??"",
        content:page?.content||"",
        source:validSourceUrl(page?.source)
      },
      catalog:structuredClone(catalog),
      originalCatalog:structuredClone(original),
      chordEditor:$("chordEditor").value,
      tuning:window.ChordTheory?.getTuning()||{id:"standard"},
      songKey:window.ChordKey?.getState()||{value:""},
      chordOrder:[...diagramOrder],
      removedDiagrams:[...removedDiagrams],
      songLines:serializeLines($("songLines").childNodes),
      importedSongLines:serializeLines(importedSongNodes),
      options:{
        includeChords:$("includeChords").checked,
        includeSong:$("includeSong").checked,
        includeSourceFooter:$("includeSourceFooter").checked,
        showCodes:$("showCodes").checked,
        showDiagrams:$("showDiagrams").checked,
        columns:$("columns").value,
        fontSize:$("fontSize").value,
        songEditFont:$("songEditFont").value,
        songEditLeading:$("songEditLeading").value,
        paperSize:$("paperSize").value
      },
      layout:window.ChordLayout?.exportProjectLayout()||{stickers:[],trayOpen:false}
    };
  }
  function filename(){
    const title=(page?.artist?page.artist+" - ":"")+(page?.title||"Untitled song");
    return ((title.normalize("NFKD").replace(/[^\w .-]+/g,"").trim()
      .replace(/\s+/g,"-").slice(0,85))||"ChordStudio")+"-ChordStudio.chordstudio";
  }
  let currentFilename=null,currentHandle=null,saveBusy=false,saveAsRequested=false;
  function normalizeFilename(input){
    // Never alter ordinary letters; strip only filesystem-reserved characters.
    let name=String(input||"").trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,"-");
    name=name.replace(/\.chordstudio$/i,"").replace(/\.+$/,"").trim();
    if(!name||name.length>125)throw Error("Choose a filename of 1–125 characters.");
    return name+".chordstudio";
  }
  function openSaveDialog(forceAs=false){
    saveAsRequested=!!forceAs;
    $("saveAsTitle").textContent=forceAs?"Save As":"Save project";
    $("saveAsDescription").textContent=forceAs
      ?"Choose a new filename. Save As creates a separate project copy."
      :"Name this new project before its first save.";
    $("saveAsName").value=currentFilename||filename();
    $("saveAsError").hidden=true;$("saveAsError").textContent="";
    if(!$("saveAsDialog").open)$("saveAsDialog").showModal();
    $("saveAsName").focus();$("saveAsName").select();
  }
  function closeSaveDialog(){if($("saveAsDialog").open)$("saveAsDialog").close();}
  function downloadProject(text,name){
    const blob=new Blob([text],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=name;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async function writeProject(name,forceAs=false){
    if(saveBusy)return;
    saveBusy=true;
    try{
      const normalized=normalizeFilename(name),data=snapshot();
      data.projectFilename=normalized;
      const contents=JSON.stringify(data,null,2);
      let nextHandle=forceAs?null:currentHandle;
      if(!nextHandle&&typeof window.showSaveFilePicker==="function"&&(forceAs||!currentHandle&&currentFilename===null)){
        try{
          // Only a user gesture can select an actual overwrite-capable file.
          nextHandle=await window.showSaveFilePicker({
            suggestedName:normalized,
            types:[{description:"ChordStudio project",accept:{"application/json":[".chordstudio"]}}]
          });
        }catch(e){
          if(e.name==="AbortError")return;
          // In restricted browsers, fall back to a safe non-overwriting download.
          nextHandle=null;
        }
      }
      if(nextHandle){
        const stream=await nextHandle.createWritable();
        await stream.write(contents);await stream.close();
        currentHandle=nextHandle;
        currentFilename=nextHandle.name||normalized;
        message("Saved "+currentFilename+" to your chosen file.");
      }else{
        downloadProject(contents,normalized);
        currentHandle=null;currentFilename=normalized;
        message("Downloaded "+normalized+". Your browser may number copies; Save As chooses a different name.");
      }
      if(forceAs)window.ChordRecents?.newDocument();
      window.ChordRecents?.onSaved(data);
    }catch(e){message("Could not save project: "+e.message,true);}
    finally{saveBusy=false;}
  }
  function save(){
    if(!currentFilename){openSaveDialog();return;}
    void writeProject(currentFilename,false);
  }
  function saveAs(){openSaveDialog(true);}
  async function confirmSaveDialog(){
    let name;
    try{name=normalizeFilename($("saveAsName").value);}
    catch(e){$("saveAsError").textContent=e.message;$("saveAsError").hidden=false;return;}
    const forceAs=saveAsRequested;
    // Do not change the current filename until the picker or download succeeds.
    closeSaveDialog();
    await writeProject(name,forceAs);
  }
  function clearFileAssociation(){currentFilename=null;currentHandle=null;}
  function load(data){
    clearFileAssociation();
    if(!data||data.format!==FORMAT||data.version!==VERSION)
      throw Error("This is not a supported ChordStudio project (version 1).");
    const meta=data.page||{},opts=data.options;
    if(!opts||!data.layout||!Array.isArray(data.layout.stickers)
      ||!Array.isArray(data.songLines)||!Array.isArray(data.importedSongLines))
      throw Error("The saved project is missing its song or layout.");
    if(!["letter","a4"].includes(opts.paperSize))
      throw Error("The project has an unsupported paper size.");
    // Validate song markup and chord models in detached nodes before altering the page.
    const editedNodes=decodeLines(data.songLines);
    const originalNodes=decodeLines(data.importedSongLines);
    const savedCatalog=safeCatalog(data.catalog,{allowEmpty:true});
    const originalCatalog=safeCatalog(data.originalCatalog||data.catalog,{allowEmpty:true});
    const source=validSourceUrl(meta.source);
    if(Object.keys(originalCatalog).length){
      loadPage({
        song_name:String(meta.title||"Untitled song").slice(0,200),
        artist_name:String(meta.artist||"").slice(0,200),
        content:String(meta.content||""),
        source,
        applicature:originalCatalog
      },{navigate:false});
    }else{
      // Authored-from-scratch projects deliberately have no imported catalog.
      // They can be reopened before the first custom chord has been added.
      window.ChordSong.startBlankSong(
        String(meta.title||"Untitled song").slice(0,200),
        String(meta.artist||"").slice(0,200),false,false);
    }
    // Older projects only stored "artist", which represented the performer.
    page.writtenBy=String(meta.writtenBy||"").slice(0,200);
    page.arrangedBy=String(meta.arrangedBy||"").slice(0,200);
    page.performedBy=String(meta.performedBy??meta.artist??"").slice(0,200);
    page.artist=page.performedBy;
    $("artistName").textContent=page.performedBy;
    $("songName").textContent=page.title;
    $("includeSourceFooter").checked=opts.includeSourceFooter===true&&!!source;
    updateOriginalSourceLink();
    // Version-1 projects from before tuning support intentionally fall back
    // to an *unconfirmed* standard-tuning assumption.
    if(data.tuning&&typeof data.tuning==="object"){
      try{window.ChordTheory?.setTuning(
        data.tuning.id||"standard",
        data.tuning.custom||"E2 A2 D3 G3 B3 E4",
        data.tuning.confirmed===true);}
      catch(e){throw Error("Saved guitar tuning is invalid: "+e.message);}
    }else window.ChordTheory?.setTuning("standard",null,false);
    window.ChordKey?.restore(data.songKey||{value:""});
    catalog=structuredClone(savedCatalog);
    original=structuredClone(originalCatalog);
    page.content=String(meta.content||"");
    $("chordEditor").value=typeof data.chordEditor==="string"
      ?data.chordEditor.slice(0,100000)
      :Object.entries(catalog).map(([name,v])=>name+": "+codeFrom(v[0])).join("\n");
    for(const id of ["includeChords","includeSong","showCodes"]){
      if(typeof opts[id]==="boolean")$(id).checked=opts[id];
    }
    $("showDiagrams").checked=opts.showDiagrams!==false;
    if(!$("showDiagrams").checked&&!$("showCodes").checked)$("showDiagrams").checked=true;
    for(const id of ["columns","fontSize","songEditFont","songEditLeading","paperSize"]){
      const value=String(opts[id]||"");
      if([...$(id).options].some(option=>option.value===value))$(id).value=value;
    }
    $("songLines").replaceChildren(...editedNodes);
    importedSongNodes=originalNodes;
    $("songSection").hidden=!$("includeSong").checked||!$("songLines").textContent.trim();
    diagramOrder=Array.isArray(data.chordOrder)?data.chordOrder.filter(x=>typeof x==="string"):[];
    removedDiagrams=new Set(Array.isArray(data.removedDiagrams)
      ?data.removedDiagrams.filter(x=>typeof x==="string"):[]);
    chordUndo=[];chordRedo=[];
    closeSongEditor();syncSongTypography();renderDiagrams();
    if(!window.ChordLayout?.importProjectLayout)
      throw Error("The project layout engine has not finished loading.");
    window.ChordLayout.importProjectLayout(data.layout);
    // Project confirmation uses a temporary dismissible notice, not a permanent status line.
    $("status").textContent="";
    $("status").classList.remove("good");
    $("status").hidden=true;
    if(typeof data.projectFilename==="string"){
      try{currentFilename=normalizeFilename(data.projectFilename);}
      catch{currentFilename=null;}
    }
    message("");
  }
  async function openFile(file,handle=null){
    if(!file)return;
    try{
      if(file.size>18*1024*1024)throw Error("The project file exceeds 18 MB. Use smaller images.");
      const data=JSON.parse(await file.text());
      load(data);
      currentFilename=normalizeFilename(file.name.replace(/\\.chordstudio$/i,""));
      currentHandle=handle;
      window.ChordRecents?.onOpened({...data,projectFilename:currentFilename});
      window.ChordWorkflow?.activate("project");
    }catch(e){message("Could not open project: "+e.message,true);}
  }
  async function openViaPicker(){
    if(typeof window.showOpenFilePicker==="function"){
      try{
        const handles=await window.showOpenFilePicker({
          multiple:false,types:[{description:"ChordStudio project",accept:{"application/json":[".chordstudio",".json"]}}]
        });
        if(handles?.[0])await openFile(await handles[0].getFile(),handles[0]);
      }catch(e){if(e.name!=="AbortError")message("Could not open project: "+e.message,true);}
    }else $("projectFile").click();
  }
  function init(){
    $("saveProjectBtn").addEventListener("click",save);
    $("saveProjectAsBtn").addEventListener("click",saveAs);
    $("quickSaveProject").addEventListener("click",save);
    $("saveAsConfirm").addEventListener("click",confirmSaveDialog);
    $("saveAsCancel").addEventListener("click",closeSaveDialog);
    $("saveAsClose").addEventListener("click",closeSaveDialog);
    $("saveAsDialog").addEventListener("cancel",event=>{event.preventDefault();closeSaveDialog();});
    $("saveAsName").addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();confirmSaveDialog();}
    });
    document.addEventListener("keydown",event=>{
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const key=event.key.toLowerCase();
      if(key==="s"){
        event.preventDefault();
        if(event.shiftKey)saveAs();else save();
      }
    },true);
    $("openProjectBtn").addEventListener("click",openViaPicker);
    $("welcomeOpenProject").addEventListener("click",openViaPicker);
    $("projectFile").addEventListener("change",async event=>{
      const file=event.target.files?.[0];event.target.value="";
      await openFile(file);
    });
  }
  window.ChordProject={snapshot,load,save,saveAs,openFile,clearFileAssociation};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();