"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const STICKER_W=104,STICKER_H=107;
  let stickers=[], history=[], redo=[], nextId=1, drag=null;
  let building=false;
  const save=()=>{history.push(stickers.map(s=>({...s,shape:structuredClone(s.shape)})));if(history.length>60)history.shift();redo=[];};
  const restore=data=>{stickers=data.map(s=>({...s,shape:structuredClone(s.shape)}));refresh();};
  const findItem=key=>(typeof rendered!=="undefined"?rendered:[]).find(item=>diagramKey(item)===key);
  function updateUndoButtons(){
    $("undoPlacement").disabled=!history.length;
    $("redoPlacement").disabled=!redo.length;
    $("clearPlacements").disabled=!stickers.length;
    $("layoutStatus").textContent=stickers.length+" placed diagram"+(stickers.length===1?"":"s");
  }
  function undo(){if(!history.length)return;redo.push(stickers.map(s=>structuredClone(s)));restore(history.pop());}
  function redoChange(){if(!redo.length)return;history.push(stickers.map(s=>structuredClone(s)));restore(redo.pop());}
  function clearAll(){if(!stickers.length)return;save();stickers=[];refresh();}
  function reset(){stickers=[];history=[];redo=[];nextId=1;refresh();}
  function pageSize(){
    const a4=$("paperSize").value==="a4";
    return {name:a4?"A4":"Letter",width:a4?794:816,height:a4?1123:1056,innerWidth:a4?746:768,innerHeight:a4?1075:1008};
  }
  function updatePaperCSS(){
    let style=$("paperFormatCSS");
    if(!style){style=document.createElement("style");style.id="paperFormatCSS";document.head.append(style);}
    style.textContent="@media print{@page{size:"+($("paperSize").value==="a4"?"A4":"letter")+";margin:0;}}";
  }
  function lineStyle(el){
    el.style.setProperty("--song-font",$("fontSize").value+"px");
    el.style.setProperty("--song-family",$("songEditFont").value);
    el.style.setProperty("--song-leading",$("songEditLeading").value);
  }
  function freshPage(number){
    const wrapper=document.createElement("section");wrapper.className="paper-wrapper";
    const page=document.createElement("div");page.className="paper-page";
    page.setAttribute("aria-label","Printable page "+number);
    const label=document.createElement("div");label.className="paper-label no-print";label.textContent="Page "+number;
    const inside=document.createElement("div");inside.className="paper-inside";
    const main=document.createElement("div");main.className="paper-main";
    const overlay=document.createElement("div");overlay.className="paper-stickers";
    inside.append(main,overlay);page.append(inside);wrapper.append(label,page);
    $("printPage").append(wrapper);
    attachDrop(page,inside,number-1);
    return {wrapper,page,inside,main,overlay,number};
  }
  function sectionLabel(text){
    const h=document.createElement("h3");h.className="paper-section-label";h.textContent=text;return h;
  }
  function titleBlock(){
    const el=document.createElement("div");el.className="paper-head";
    const name=document.createElement("h2");name.textContent=$("songName").textContent;
    const artist=document.createElement("p");artist.textContent=$("artistName").textContent;
    el.append(name,artist);return el;
  }
  function renderBank(main,pages,current,size){
    if(!$("includeChords").checked||!rendered.length)return current;
    let title=sectionLabel("CHORDS");
    current.main.append(title);
    let bank=document.createElement("div");bank.className="paper-bank";
    bank.style.setProperty("--cols",Number($("columns").value));
    current.main.append(bank);
    for(const item of rendered){
      const key=diagramKey(item);
      const source=$("chordGrid").querySelectorAll(".chord-card");
      let copy=[...source].find(node=>node.dataset.diagramKey===key)?.cloneNode(true);
      if(!copy)continue;
      copy.draggable=false;copy.removeAttribute("tabindex");copy.removeAttribute("title");
      copy.querySelectorAll(".diagram-remove").forEach(node=>node.remove());
      bank.append(copy);
      if(bank.getBoundingClientRect().bottom>current.inside.getBoundingClientRect().bottom-.5){
        copy.remove();
        if(!bank.childElementCount){
          bank.remove();title.remove();
        }
        current=freshPage(pages.length+1);
        pages.push(current);
        title=sectionLabel("CHORDS (continued)");current.main.append(title);
        bank=document.createElement("div");bank.className="paper-bank";
        bank.style.setProperty("--cols",Number($("columns").value));
        current.main.append(bank);bank.append(copy);
      }
    }
    return current;
  }
  function renderSong(current,pages){
    if(!$("includeSong").checked||!$("songLines").textContent.trim())return;
    const lines=[...$("songLines").children];
    if(!lines.length)return;
    let label=sectionLabel("SONG");current.main.append(label);
    let area=document.createElement("div");area.className="paper-song song-lines";
    lineStyle(area);current.main.append(area);
    for(const source of lines){
      const clone=source.cloneNode(true);
      clone.classList.remove("print-page-start");
      area.append(clone);
      if(clone.getBoundingClientRect().bottom>current.inside.getBoundingClientRect().bottom-.5){
        clone.remove();
        if(!area.children.length){label.remove();area.remove();}
        current=freshPage(pages.length+1);pages.push(current);
        area=document.createElement("div");area.className="paper-song song-lines";
        lineStyle(area);current.main.append(area);
        area.append(clone);
      }
    }
  }
  function stickerElement(record){
    const el=document.createElement("div");el.className="paper-sticker";
    el.dataset.stickerId=record.id;el.draggable=true;el.tabIndex=0;
    el.setAttribute("aria-label","Placed "+record.name+" diagram. Drag to move; Delete to remove.");
    el.title="Drag to move · Delete to remove";
    el.style.left=record.x+"px";el.style.top=record.y+"px";
    const name=document.createElement("div");name.className="chord-name";name.textContent=record.name;
    const art=document.createElement("div");art.className="diagram-art";
    art.append(makeDiagramCanvas(record.shape));
    const remove=document.createElement("button");remove.className="sticker-delete no-print";
    remove.type="button";remove.textContent="×";remove.title="Remove placed diagram";
    remove.setAttribute("aria-label","Remove placed "+record.name+" diagram");
    remove.draggable=false;remove.addEventListener("mousedown",ev=>ev.stopPropagation());
    remove.addEventListener("click",ev=>{
      ev.stopPropagation();save();stickers=stickers.filter(s=>s.id!==record.id);refresh();
    });
    el.append(name,art,remove);
    el.addEventListener("dragstart",ev=>{
      const box=el.getBoundingClientRect();
      drag={type:"sticker",id:record.id,offsetX:ev.clientX-box.left,offsetY:ev.clientY-box.top};
      ev.dataTransfer.effectAllowed="move";
      ev.dataTransfer.setData("text/plain","chordstudio-sticker:"+record.id);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend",()=>{el.classList.remove("dragging");drag=null;clearDrops();});
    el.addEventListener("keydown",ev=>{
      if(ev.key==="Delete"||ev.key==="Backspace"){
        ev.preventDefault();save();stickers=stickers.filter(s=>s.id!==record.id);refresh();
      }else if(ev.altKey&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(ev.key)){
        ev.preventDefault();save();const size=pageSize(),delta=ev.shiftKey?20:5;
        record.x=Math.max(0,Math.min(size.innerWidth-STICKER_W,record.x+(ev.key==="ArrowLeft"?-delta:ev.key==="ArrowRight"?delta:0)));
        record.y=Math.max(0,Math.min(size.innerHeight-STICKER_H,record.y+(ev.key==="ArrowUp"?-delta:ev.key==="ArrowDown"?delta:0)));
        refresh();
        $("printPage").querySelector('[data-sticker-id="'+record.id+'"]')?.focus();
      }
    });
    return el;
  }
  function decorate(pages){
    const size=pageSize();
    stickers.forEach(record=>{
      while(record.page>=pages.length)pages.push(freshPage(pages.length+1));
      record.x=Math.max(0,Math.min(size.innerWidth-STICKER_W,record.x));
      record.y=Math.max(0,Math.min(size.innerHeight-STICKER_H,record.y));
      pages[record.page].overlay.append(stickerElement(record));
    });
  }
  function clearDrops(){for(const el of $("printPage").querySelectorAll(".page-drop-active"))el.classList.remove("page-drop-active");}
  function attachDrop(page,inside,index){
    page.addEventListener("dragover",ev=>{
      if(!drag && !draggingChordKey)return;
      ev.preventDefault();ev.dataTransfer.dropEffect=drag?.type==="sticker"?"move":"copy";
      clearDrops();page.classList.add("page-drop-active");
    });
    page.addEventListener("dragleave",ev=>{if(!page.contains(ev.relatedTarget))page.classList.remove("page-drop-active");});
    page.addEventListener("drop",ev=>{
      ev.preventDefault();ev.stopPropagation();page.classList.remove("page-drop-active");
      const kind=drag?.type||"library";
      const r=inside.getBoundingClientRect(),size=pageSize();
      const offsetX=drag?.type==="sticker"?drag.offsetX:STICKER_W/2;
      const offsetY=drag?.type==="sticker"?drag.offsetY:20;
      const x=Math.max(0,Math.min(size.innerWidth-STICKER_W,Math.round(ev.clientX-r.left-offsetX)));
      const y=Math.max(0,Math.min(size.innerHeight-STICKER_H,Math.round(ev.clientY-r.top-offsetY)));
      if(kind==="sticker"){
        const record=stickers.find(s=>s.id===drag.id);
        if(record){save();Object.assign(record,{page:index,x,y});refresh();}
      }else{
        const key=drag?.key||draggingChordKey||ev.dataTransfer?.getData("text/plain");
        const item=findItem(key);
        if(item){
          save();stickers.push({id:nextId++,name:item.name,key,shape:structuredClone(item.source),page:index,x,y});refresh();
        }
      }
      drag=null;draggingChordKey=null;
    });
  }
  function refresh(){
    if(building||!$("printPage"))return;
    building=true;
    try{
      updatePaperCSS();
      const root=$("printPage");root.classList.toggle("paper-a4",$("paperSize").value==="a4");
      root.replaceChildren();
      const pages=[freshPage(1)];
      let current=pages[0];
      current.main.append(titleBlock());
      current=renderBank(current.main,pages,current,pageSize());
      renderSong(current,pages);
      decorate(pages);
      $("pageCount").textContent=pages.length+" printable "+(pages.length===1?"page":"pages");
      updateUndoButtons();
    }finally{building=false;}
  }
  function onSourceDragStart(ev){
    const card=ev.target.closest?.("#chordGrid .chord-card");
    if(!card)return;
    drag={type:"library",key:card.dataset.diagramKey};
  }
  function onDragEnd(){drag=null;clearDrops();}
  function init(){
    document.addEventListener("dragstart",onSourceDragStart,true);
    document.addEventListener("dragend",onDragEnd);
    $("paperSize").addEventListener("change",refresh);
    $("undoPlacement").addEventListener("click",undo);
    $("redoPlacement").addEventListener("click",redoChange);
    $("clearPlacements").addEventListener("click",clearAll);
    refresh();
  }
  window.ChordLayout={init,refresh,reset,undo,redo:redoChange,clearAll,stickers:()=>structuredClone(stickers)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();