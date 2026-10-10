"use strict";
const $ = id => document.getElementById(id);
const DEMO = {
  "E":[{id:"022100",frets:[0,0,1,2,2,0],fingers:[0,0,1,3,2,0],fret:0,listCapos:[]}],
  "A":[{id:"x02220",frets:[0,2,2,2,0,-1],fingers:[0,3,2,1,0,0],fret:0,listCapos:[]}],
  "B":[{id:"x24442",frets:[2,4,4,4,2,-1],fingers:[0,4,3,2,0,0],fret:2,listCapos:[{fret:2,startString:0,lastString:4,finger:1}]}],
  "F#m":[{id:"244222",frets:[2,2,2,4,4,2],fingers:[0,0,0,4,3,0],fret:2,listCapos:[{fret:2,startString:0,lastString:5,finger:1}]}]
};
let catalog = structuredClone(DEMO);
let original = structuredClone(DEMO);
let page = null;
let rendered = [];
let importedSongNodes = [];
let editorOriginalStyle = null;
const message = (s,err=false)=>{$("message").textContent=s;$("message").classList.toggle("error",err);};
function parseCode(code){
  const s=String(code).trim(),compact=/^[0-9xX]{6}$/.test(s);
  const parts=compact?[...s]:s.split(/[\s,]+/);
  if(parts.length!==6||parts.some(p=>!/^\d+$|^[xX]$/.test(p)))throw Error("Use six string positions, e.g. x24442 or x 10 12 12 11 10");
  return parts.map(p=>/^x$/i.test(p)?-1:Number(p));
}
function codeFrom(v){
  const frets=v?.frets;
  if(!Array.isArray(frets)||frets.length!==6)return v?.id||"";
  const lowToHigh=[...frets].reverse().map(n=>n<0?"x":String(n));
  return lowToHigh.every(n=>n.length===1)?lowToHigh.join(""):lowToHigh.join(" ");
}
function isMatch(v,arr){return Array.isArray(v.frets)&&v.frets.length===6&&v.frets.every((f,i)=>Number(f)===arr[5-i]);}
function fallbackShape(arr){
  const fretted=arr.filter(f=>f>0),min=fretted.length?Math.min(...fretted):0;
  return {id:arr.map(n=>n<0?"x":String(n)).join(""),frets:[...arr].reverse(),fingers:[0,0,0,0,0,0],fret:min>=4?min:0,listCapos:[],showAllFrets:true};
}
function getShape(name,arr){
  const found=(catalog[name]||[]).find(v=>isMatch(v,arr));
  return found || fallbackShape(arr);
}
function parseEditor(){
  const items=[],errors=[];
  $("chordEditor").value.split(/\r?\n/).forEach((line,i)=>{
    if(!line.trim()||line.trim().startsWith("#"))return;
    const m=line.match(/^\s*(.+?)\s*:\s*(.+?)\s*$/);
    if(!m){errors.push("Line "+(i+1)+" needs Name: frets");return;}
    try{items.push({name:m[1],arr:parseCode(m[2])});}
    catch(e){errors.push("Line "+(i+1)+": "+e.message);}
  });
  return {items,errors};
}
// Reconstructed 76 x 72 CSS-pixel small-print diagram geometry; frets/fingers
// are stored high E to low E, while the compact id is low E to high E.
function drawDiagram(ctx,v){
  const ink="#111",gray="#777",left=20,top=10,gap=7,step=8,nut=2,base=Number(v.fret)||0;
  const rel=f=>f-base+(base>0?1:0);
  const stringX=i=>left+gap*(5-i); // i=0 is high E, on the right
  ctx.fillStyle=ink;ctx.fillRect(left,top,36,base?1:2);
  for(let f=1;f<=5;f++)ctx.fillRect(left,top+nut+f*step-1,36,1);
  for(let i=0;i<6;i++){
    ctx.fillStyle=v.frets[i]<0?gray:ink;
    ctx.fillRect(stringX(i),top,1,41);
  }
  const text=(s,x,y,font="10px Arial",align="center",baseline="top")=>{
    ctx.fillStyle=ink;ctx.font=font;ctx.textAlign=align;ctx.textBaseline=baseline;ctx.fillText(String(s),x,y);
  };
  for(const b of v.listCapos||[]){
    const r=rel(Number(b.fret));
    if(r<1||r>5)continue;
    const first=Math.max(0,Math.min(5,Number(b.startString)||0));
    const last=Math.max(first,Math.min(5,Number(b.lastString)||0));
    const x=Math.min(stringX(first),stringX(last))-2.7;
    const width=Math.abs(stringX(first)-stringX(last))+6.4;
    const y=top+nut+(r-1)*step+2.1;
    ctx.fillStyle=ink;ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,width,3,1.5);else ctx.rect(x,y,width,3);
    ctx.fill();
  }
  for(let i=0;i<6;i++){
    const f=v.frets[i],finger=v.fingers?.[i]||0,r=rel(f),x=stringX(i);
    if(f<0){text("×",x,top-2,"10px Arial","center","bottom");continue;}
    if(f>0 && r>=1 && r<=5 && (finger>0||v.showAllFrets)){
      ctx.fillStyle=ink;ctx.beginPath();ctx.arc(x,top+nut+(r-1)*step+3.5,2.7,0,Math.PI*2);ctx.fill();
    }
    if(f>0&&finger>0)text(finger,x,top+43,"10px Arial");
  }
  if(base>0)text(base+"fr",left+38,top,"11px Arial","left");
}
function makeDiagramCanvas(v){
  const canvas=document.createElement("canvas");canvas.width=152;canvas.height=144;
  canvas.style.width="76px";canvas.style.height="72px";
  const ctx=canvas.getContext("2d");ctx.scale(2,2);drawDiagram(ctx,v);return canvas;
}
function renderDiagrams(){
  const {items,errors}=parseEditor();
  const grid=$("chordGrid");grid.replaceChildren();rendered=[];
  for(const item of items){
    const source=getShape(item.name,item.arr);
    const card=document.createElement("div");card.className="chord-card";
    const heading=document.createElement("div");heading.className="chord-name";heading.textContent=item.name;
    const canvas=makeDiagramCanvas(source);
    canvas.setAttribute("role","img");canvas.setAttribute("aria-label",item.name+" guitar chord "+item.arr.join(" "));
    card.append(heading,canvas);
    if($("showCodes").checked){
      const code=document.createElement("div");code.className="chord-code";code.textContent=item.arr.map(n=>n<0?"x":String(n)).join(" ");card.append(code);
    }
    grid.append(card);rendered.push({name:item.name,arr:item.arr,source,canvas});
  }
  const cols=Number($("columns").value);
  grid.style.setProperty("--cols",cols);
  $("chordSection").hidden=!$("includeChords").checked||items.length===0;
  // Print visibility follows the actually displayed document, not the original import metadata.
  // The editor must not depend on whether the importer supplied a nonempty content field.
  $("songSection").hidden=!$("includeSong").checked||!$("songLines").textContent.trim();
  syncSongTypography();
  if(errors.length)message(errors.join(" | "),true);
  return rendered;
}
function decodeEntities(s){
  const area=document.createElement("textarea");area.innerHTML=String(s);return area.value;
}
function renderSong(content){
  const host=$("songLines");host.replaceChildren();
  const clean=decodeEntities(content).replace(/\[\/?tab\]/gi,"");
  for(let line of clean.split(/\r?\n/)){
    const div=document.createElement("div");div.className="song-line";
    if(/^\s*\[[^\]\r\n]+\]\s*$/.test(line)){
      div.classList.add("heading");div.textContent=line;host.append(div);continue;
    }
    const re=/\[ch\]([\s\S]*?)\[\/ch\]/gi;let idx=0,match;
    while((match=re.exec(line))){
      div.append(document.createTextNode(line.slice(idx,match.index)));
      const span=document.createElement("span");span.className="song-chord";
      span.textContent=match[1];div.append(span);idx=re.lastIndex;
    }
    div.append(document.createTextNode(line.slice(idx)));
    host.append(div);
  }
}

function syncSongTypography(){
  const size=$("fontSize").value+"px";
  const font=$("songEditFont").value;
  const leading=$("songEditLeading").value;
  $("songEditSize").value=$("fontSize").value;
  for(const id of ["songLines","songEditor"]){
    const el=$(id);
    el.style.setProperty("--song-font",size);
    el.style.setProperty("--song-family",font);
    el.style.setProperty("--song-leading",leading);
  }
}
function resetImportedSongNodes(){
  importedSongNodes=Array.from($("songLines").childNodes,node=>node.cloneNode(true));
}
function openSongEditor(){
  const panel=$("songEditorPanel");
  if(!panel.hidden){$("songEditor").focus();return;}
  editorOriginalStyle={
    font:$("songEditFont").value,
    size:$("fontSize").value,
    leading:$("songEditLeading").value
  };
  $("songEditor").replaceChildren(...Array.from($("songLines").childNodes,node=>node.cloneNode(true)));
  panel.hidden=false;
  syncSongTypography();
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  $("songEditor").focus({preventScroll:true});
}
function closeSongEditor(){
  $("songEditorPanel").hidden=true;
  $("songEditor").replaceChildren();
}
function cancelSongEditor(){
  if(editorOriginalStyle){
    $("fontSize").value=editorOriginalStyle.size;
    $("songEditFont").value=editorOriginalStyle.font;
    $("songEditLeading").value=editorOriginalStyle.leading;
    syncSongTypography();
  }
  closeSongEditor();
  message("Song edit canceled; the print sheet is unchanged.");
}
function applySongEdit(quiet=false){
  if($("songEditorPanel").hidden)return false;
  const editor=$("songEditor");
  $("songLines").replaceChildren(...Array.from(editor.childNodes,node=>node.cloneNode(true)));
  if(!page){
    page={title:$("songName").textContent||"Untitled song",artist:$("artistName").textContent||"",content:"",source:""};
    $("status").textContent="Custom song sheet";
  }
  closeSongEditor();
  syncSongTypography();
  $("songSection").hidden=!$("includeSong").checked||!$("songLines").textContent.trim();
  if(!quiet)message("Song changes applied. The print preview now includes your edits.");
  return true;
}
function restoreImportedSong(){
  $("songEditor").replaceChildren(...importedSongNodes.map(node=>node.cloneNode(true)));
  message("Original imported text restored in the editor. Choose Apply changes to update the print sheet.");
}
function pasteSongText(event){
  const pasted=event.clipboardData?.getData("text/plain");
  if(pasted==null)return;
  event.preventDefault();
  // Keep pasted text literal: rich HTML from external pages could damage chord alignment.
  if(document.execCommand("insertText",false,pasted))return;
  const selection=window.getSelection();
  if(!selection?.rangeCount)return;
  const range=selection.getRangeAt(0);
  if(!$("songEditor").contains(range.commonAncestorContainer))return;
  range.deleteContents();
  const node=document.createTextNode(pasted);
  range.insertNode(node);
  range.setStartAfter(node);range.collapse(true);
  selection.removeAllRanges();selection.addRange(range);
}

function normalizeSource(text){
  const value=text.trim();let root;
  if(value.startsWith("<")){
    const doc=new DOMParser().parseFromString(value,"text/html");
    const el=doc.querySelector(".js-store[data-content]");
    if(!el)throw Error("No compatible song data element found in this HTML.");
    root=JSON.parse(el.getAttribute("data-content"));
  }else root=JSON.parse(value);
  // The regular tab and print page expose the same chord data in different places.
  const data=root?.store?.page?.data||root?.page?.data||root?.data||root;
  const view=data?.tab_view||{};
  const tab=data?.tab||{};
  const result={
    song_name:data?.song_name||tab.song_name||view.headerMeta?.name||data?.songName||"Untitled song",
    artist_name:data?.artist_name||tab.artist_name||data?.artistName||"",
    content:data?.content||view.wiki_tab?.content||"",
    applicature:data?.applicature||view.applicature,
    source:data?.source||root?.source||$("songUrl").value
  };
  if(!result.applicature||typeof result.applicature!=="object")throw Error("No guitar chord definitions found. Open a guitar Chords tab.");
  return result;
}
function loadPage(data){
  if(!data||typeof data!=="object"||!data.applicature)throw Error("Missing chord data");
  const next={};
  for(const [name,variations] of Object.entries(data.applicature)){
    if(!Array.isArray(variations))continue;
    const usable=variations.filter(v=>Array.isArray(v.frets)&&v.frets.length===6)
      .map(v=>({id:v.id||codeFrom(v),frets:v.frets.map(Number),
       fingers:Array.isArray(v.fingers)?v.fingers.map(Number):[0,0,0,0,0,0],
       fret:Number(v.fret)||0,listCapos:Array.isArray(v.listCapos)?v.listCapos:[]}));
    if(usable.length)next[name]=usable;
  }
  if(!Object.keys(next).length)throw Error("No usable guitar chord shapes were found.");
  catalog=next;original=structuredClone(next);
  page={title:decodeEntities(data.song_name||data.songName||"Untitled song"),
    artist:decodeEntities(data.artist_name||data.artistName||""),
    content:typeof data.content==="string"?data.content:"",
    source:data.source||$("songUrl").value};
  $("songName").textContent=page.title;
  $("artistName").textContent=page.artist;
  $("sourceCredit").textContent="Chord tab imported for personal formatting";
  $("chordEditor").value=Object.entries(next).map(([name,v])=>name+": "+codeFrom(v[0])).join("\n");
  renderSong(page.content);
  resetImportedSongNodes();
  closeSongEditor();
  $("status").textContent=Object.keys(next).length+" chord names loaded"+(page.content?" with song text.":".");
  $("status").classList.add("good");
  renderDiagrams();message("Imported "+Object.keys(next).length+" chord names. Ready to print or export.");
}
function makeImage(){
  const list=renderDiagrams();if(!list.length)throw Error("No diagrams to export.");
  const columns=Math.max(1,Number($("columns").value));
  const cols=Math.min(columns,list.length),rows=Math.ceil(list.length/columns);
  const tileW=112,tileH=$("showCodes").checked?120:106,scale=3;
  const output=document.createElement("canvas");
  output.width=cols*tileW*scale;output.height=rows*tileH*scale;
  const ctx=output.getContext("2d");ctx.scale(scale,scale);
  ctx.fillStyle="#fff";ctx.fillRect(0,0,cols*tileW,rows*tileH);
  list.forEach((item,i)=>{
    const x=(i%columns)*tileW,y=Math.floor(i/columns)*tileH;
    ctx.textAlign="center";ctx.textBaseline="top";ctx.font="bold 14px Arial";ctx.fillStyle="#111";
    ctx.fillText(item.name,x+tileW/2,y+6);
    ctx.drawImage(item.canvas,x+(tileW-76)/2,y+27,76,72);
    if($("showCodes").checked){
      ctx.font="10px Arial";ctx.fillText(item.arr.map(n=>n<0?"x":String(n)).join(" "),x+tileW/2,y+102);
    }
  });
  return output;
}
function blobFrom(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("PNG encoding failed")),"image/png"));}
async function copyPng(){
  try{
    if(!navigator.clipboard?.write||!window.ClipboardItem)throw Error("PNG clipboard access is unavailable.");
    const canvas=makeImage();
    await navigator.clipboard.write([new ClipboardItem({"image/png":blobFrom(canvas)})]);
    message("Diagram image copied. Paste into Google Docs with Ctrl+V.");
  }catch(e){message(e.message+". Try Download PNG instead.",true);}
}
async function downloadPng(){
  try{
    const blob=await blobFrom(makeImage()),href=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=href;link.download="chordstudio-chords.png";link.click();
    setTimeout(()=>URL.revokeObjectURL(href),2000);message("PNG downloaded; insert it in Google Docs as an image.");
  }catch(e){message(e.message,true);}
}
function setDemo(){
  catalog=structuredClone(DEMO);original=structuredClone(DEMO);page=null;
  $("chordEditor").value=Object.entries(DEMO).map(([k,v])=>k+": "+v[0].id).join("\n");
  importedSongNodes=[];
  closeSongEditor();
  $("songSection").hidden=true;renderDiagrams();
}
function makeBookmarklet(){
  const target=new URL("./",location.href).href;
  const code="(function(){\n  var base = __STUDIO_BASE__;\n  function pick(source) {\n    var page = source && source.store && source.store.page && source.store.page.data;\n    if (!page) return null;\n    var view = page.tab_view || {};\n    var meta = page.tab || {};\n    var raw = (view.applicature && Object.keys(view.applicature).length ? view.applicature : null) ||\n              (page.applicature && Object.keys(page.applicature).length ? page.applicature : null);\n    if (!raw) return null;\n    var shapes = {};\n    Object.keys(raw).forEach(function(name){\n      if (!Array.isArray(raw[name])) return;\n      var good = raw[name].filter(function(s){\n        return s && Array.isArray(s.frets) && s.frets.length === 6;\n      }).slice(0,3).map(function(s){\n        return {id:s.id,frets:s.frets,fingers:s.fingers,fret:s.fret,listCapos:s.listCapos};\n      });\n      if(good.length) shapes[name] = good;\n    });\n    if(!Object.keys(shapes).length) return null;\n    return {\n      song_name: page.song_name || meta.song_name || view.headerMeta && view.headerMeta.name || \"Untitled song\",\n      artist_name: page.artist_name || meta.artist_name || \"\",\n      content: page.content || view.wiki_tab && view.wiki_tab.content || \"\",\n      applicature: shapes,\n      source: location.href\n    };\n  }\n  function extract(doc){\n    var nodes=doc.querySelectorAll(\".js-store[data-content]\");\n    for(var i=0;i<nodes.length;i++){\n      try{\n        var payload=pick(JSON.parse(nodes[i].getAttribute(\"data-content\")));\n        if(payload) return payload;\n      }catch(_){}\n    }\n    return null;\n  }\n  function destination(payload){\n    return base+\"#import=\"+encodeURIComponent(JSON.stringify(payload));\n  }\n  try {\n    var current=extract(document);\n    if(current) {\n      if(!window.open(destination(current),\"_blank\"))\n        throw Error(\"Popup blocked. Allow popups for the source site.\");\n      return;\n    }\n    // React may remove its initial data element after page hydration.\n    // Fetching the original HTML here is same-origin and requires no proxy.\n    var popup=window.open(\"about:blank\",\"_blank\");\n    if(!popup) throw Error(\"Popup blocked. Allow popups for the source site.\");\n    try{popup.document.body.textContent=\"ChordStudio: reading the song page...\";}catch(_){}\n    fetch(location.href.split(\"#\")[0],{credentials:\"same-origin\",cache:\"no-store\"})\n      .then(function(response){\n        if(!response.ok) throw Error(\"Song source request returned HTTP \"+response.status);\n        return response.text();\n      })\n      .then(function(html){\n        var doc=new DOMParser().parseFromString(html,\"text/html\");\n        var payload=extract(doc);\n        if(!payload) throw Error(\"The page source did not contain usable chord data.\");\n        popup.location.replace(destination(payload));\n      })\n      .catch(function(error){\n        try{popup.close();}catch(_){}\n        alert(\"ChordStudio: Import failed: \"+error.message);\n      });\n  }catch(error){alert(\"ChordStudio: \"+error.message);}\n})();".replace("__STUDIO_BASE__",JSON.stringify(target));
  $("bookmarklet").href="javascript:"+code.replace(/^\s*\/\/[^\n]*(?:\n|$)/gm,"").replace(/\s*\n\s*/g," ");
}
function init(){
  makeBookmarklet();
  const incoming=location.hash.startsWith("#import=")?location.hash.slice(8):location.hash.startsWith("#ug=")?location.hash.slice(4):null;
  if(incoming){
    history.replaceState(null,"",location.pathname+location.search);
    try{loadPage(normalizeSource(decodeURIComponent(incoming)));}
    catch(e){setDemo();message("Import failed: "+e.message,true);}
  }else setDemo();
  $("openSource").addEventListener("click",()=>{
    try{const url=new URL($("songUrl").value);
      if(url.protocol!=="https:")throw Error("Enter an HTTPS song-page URL.");
      window.open(url.href,"_blank","noopener");
      message("On the opened chord page, click the Send to ChordStudio bookmark.");
    }catch(e){message(e.message,true);}
  });
  $("importPaste").addEventListener("click",()=>{
    try{loadPage(normalizeSource($("sourcePaste").value));}
    catch(e){message("Import failed: "+e.message,true);}
  });
  $("sourceFile").addEventListener("change",async e=>{
    try{const file=e.target.files?.[0];if(file)loadPage(normalizeSource(await file.text()));}
    catch(e){message("File import failed: "+e.message,true);}
    e.target.value="";
  });
  $("editSongBtn").addEventListener("click",openSongEditor);
  $("applySongEdit").addEventListener("click",()=>applySongEdit());
  $("applyPrintSong").addEventListener("click",()=>{applySongEdit(true);window.print();});
  $("cancelSongEdit").addEventListener("click",cancelSongEditor);
  $("restoreSongEdit").addEventListener("click",restoreImportedSong);
  $("songEditor").addEventListener("paste",pasteSongText);
  $("songEditor").addEventListener("keydown",event=>{
    if(event.key==="Escape"){event.preventDefault();cancelSongEditor();}
    if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();applySongEdit();}
  });
  for(const button of document.querySelectorAll("[data-song-format]")){
    button.addEventListener("mousedown",event=>event.preventDefault());
    button.addEventListener("click",()=>{
      $("songEditor").focus();
      document.execCommand(button.dataset.songFormat,false,null);
    });
  }
  $("songEditSize").addEventListener("change",()=>{
    $("fontSize").value=$("songEditSize").value;
    renderDiagrams();
  });
  for(const id of ["songEditFont","songEditLeading"]){
    $(id).addEventListener("change",syncSongTypography);
  }
  window.addEventListener("beforeprint",()=>applySongEdit(true));
  $("printBtn").addEventListener("click",()=>{applySongEdit(true);window.print();});
  $("copyBtn").addEventListener("click",copyPng);
  $("downloadBtn").addEventListener("click",downloadPng);
  $("resetVoicings").addEventListener("click",()=>{
    catalog=structuredClone(original);$("chordEditor").value=Object.entries(original).map(([k,v])=>k+": "+codeFrom(v[0])).join("\n");
    renderDiagrams();message("Restored imported chord shapes.");
  });
  for(const id of ["includeChords","includeSong","showCodes","columns","fontSize"]){
    $(id).addEventListener("change",renderDiagrams);
  }
  $("chordEditor").addEventListener("input",renderDiagrams);
}
init();
