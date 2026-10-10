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
  function safeCatalog(src){
    if(!src||Array.isArray(src)||typeof src!=="object")throw Error("Missing project chord definitions.");
    const entries=Object.entries(src);
    if(!entries.length||entries.length>500)throw Error("Invalid number of saved chord definitions.");
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
          showAllFrets:!!v.showAllFrets
        }));
      if(!result[name].length)delete result[name];
    }
    if(!Object.keys(result).length)throw Error("No usable fretboard shapes in saved project.");
    return result;
  }
  function snapshot(){
    applySongEdit(true);
    return {
      format:FORMAT,version:VERSION,savedAt:new Date().toISOString(),
      page:{
        title:page?.title||$("songName").textContent||"Untitled song",
        artist:page?.artist||$("artistName").textContent||"",
        content:page?.content||"",
        source:validSourceUrl(page?.source)
      },
      catalog:structuredClone(catalog),
      originalCatalog:structuredClone(original),
      chordEditor:$("chordEditor").value,
      chordOrder:[...diagramOrder],
      removedDiagrams:[...removedDiagrams],
      songLines:serializeLines($("songLines").childNodes),
      importedSongLines:serializeLines(importedSongNodes),
      options:{
        includeChords:$("includeChords").checked,
        includeSong:$("includeSong").checked,
        showCodes:$("showCodes").checked,
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
  function save(){
    try{
      const contents=JSON.stringify(snapshot(),null,2);
      const blob=new Blob([contents],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=filename();
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      message("Saved "+filename()+". Reopen it later using Open Project.");
    }catch(e){message("Could not save project: "+e.message,true);}
  }
  function load(data){
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
    const savedCatalog=safeCatalog(data.catalog);
    const originalCatalog=safeCatalog(data.originalCatalog||data.catalog);
    const source=validSourceUrl(meta.source);
    loadPage({
      song_name:String(meta.title||"Untitled song").slice(0,200),
      artist_name:String(meta.artist||"").slice(0,200),
      content:String(meta.content||""),
      source,
      applicature:originalCatalog
    });
    catalog=structuredClone(savedCatalog);
    original=structuredClone(originalCatalog);
    page.content=String(meta.content||"");
    $("chordEditor").value=typeof data.chordEditor==="string"
      ?data.chordEditor.slice(0,100000)
      :Object.entries(catalog).map(([name,v])=>name+": "+codeFrom(v[0])).join("\n");
    for(const id of ["includeChords","includeSong","showCodes"]){
      if(typeof opts[id]==="boolean")$(id).checked=opts[id];
    }
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
    $("status").textContent="Saved project restored with edited song and sticker positions.";
    $("status").classList.add("good");
    message("Project opened. You can continue editing and print whenever you're ready.");
  }
  async function openFile(file){
    if(!file)return;
    try{
      if(file.size>6*1024*1024)throw Error("The project file exceeds 6 MB.");
      load(JSON.parse(await file.text()));
    }catch(e){message("Could not open project: "+e.message,true);}
  }
  function init(){
    $("saveProjectBtn").addEventListener("click",save);
    $("openProjectBtn").addEventListener("click",()=>$("projectFile").click());
    $("welcomeOpenProject").addEventListener("click",()=>$("projectFile").click());
    $("projectFile").addEventListener("change",async event=>{
      const file=event.target.files?.[0];event.target.value="";
      await openFile(file);
    });
  }
  window.ChordProject={snapshot,load,save,openFile};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
