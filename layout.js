"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const STICKER_W=104,STICKER_H=107,MIN_SCALE=.4,MAX_SCALE=3.5;
  const stickerScale=record=>Math.max(MIN_SCALE,Number(record.scale)||1);
  const stickerWidth=record=>STICKER_W*stickerScale(record);
  const stickerHeight=record=>STICKER_H*stickerScale(record);
  let stickers=[], history=[], redo=[], nextId=1, drag=null;
  let building=false;
  let pointerDrag=null;
  let scrollFrame=0;
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
      copy.draggable=false;copy.removeAttribute("tabindex");copy.title="Drag to place another copy of this chord on any page";
      copy.querySelectorAll(".diagram-remove").forEach(node=>node.remove());
      // Cloning a canvas copies its element but NOT its drawn bitmap.
      // Recreate the chord graphic so paper previews and PDFs show actual dots.
      const oldCanvas=copy.querySelector("canvas");
      if(oldCanvas)oldCanvas.replaceWith(makeDiagramCanvas(item.source));
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
    el.dataset.stickerId=record.id;el.draggable=false;el.tabIndex=0;
    el.setAttribute("aria-label","Placed "+record.name+" diagram. Drag to move; drag the lower-right corner to resize; Delete to remove.");
    el.title="Drag to move · resize at bottom-right corner · Delete to remove";
    el.style.left=record.x+"px";el.style.top=record.y+"px";
    el.style.width=stickerWidth(record)+"px";el.style.height=stickerHeight(record)+"px";
    const inner=document.createElement("div");inner.className="sticker-inner";
    inner.style.transform="scale("+stickerScale(record)+")";
    const name=document.createElement("div");name.className="chord-name";name.textContent=record.name;
    const art=document.createElement("div");art.className="diagram-art";
    art.append(makeDiagramCanvas(record.shape));
    inner.append(name,art);
    const remove=document.createElement("button");remove.className="sticker-delete no-print";
    remove.type="button";remove.title="Remove placed diagram";
    remove.setAttribute("aria-label","Remove placed "+record.name+" diagram");
    remove.draggable=false;remove.addEventListener("mousedown",ev=>ev.stopPropagation());
    remove.addEventListener("click",ev=>{
      ev.stopPropagation();save();stickers=stickers.filter(s=>s.id!==record.id);refresh();
    });
    const resize=document.createElement("button");resize.className="sticker-resize no-print";
    resize.type="button";resize.draggable=false;
    resize.title="Drag corner to resize, preserving aspect ratio";
    resize.setAttribute("aria-label","Resize placed "+record.name+" diagram");
    el.append(inner,remove,resize);
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
        record.x=Math.max(0,Math.min(size.innerWidth-stickerWidth(record),record.x+(ev.key==="ArrowLeft"?-delta:ev.key==="ArrowRight"?delta:0)));
        record.y=Math.max(0,Math.min(size.innerHeight-stickerHeight(record),record.y+(ev.key==="ArrowUp"?-delta:ev.key==="ArrowDown"?delta:0)));
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
      const maxFit=Math.max(MIN_SCALE,Math.min(MAX_SCALE,size.innerWidth/STICKER_W,size.innerHeight/STICKER_H));
      record.scale=Math.min(stickerScale(record),maxFit);
      record.x=Math.max(0,Math.min(size.innerWidth-stickerWidth(record),record.x));
      record.y=Math.max(0,Math.min(size.innerHeight-stickerHeight(record),record.y));
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
  // Unified pointer drag: works when dragging into scrolled pages. Native
  // HTML drag/drop is not reliable here and does not reach the drop target.
  // Palette items are COPIED; existing placed stickers are MOVED.
  function makeGhost(name,shape){
    const el=document.createElement("div");
    el.className="chord-drag-ghost";
    el.setAttribute("aria-hidden","true");
    const title=document.createElement("div");title.className="chord-name";
    title.textContent=name;
    const art=document.createElement("div");art.className="diagram-art";
    art.append(makeDiagramCanvas(shape));
    el.append(title,art);
    document.body.append(el);
    return el;
  }
  function clearPointerFeedback(){
    for(const el of document.querySelectorAll(".page-drop-active,.chord-drag-target")){
      el.classList.remove("page-drop-active","chord-drag-target");
    }
  }
  function itemAtPointer(x,y){
    const target=document.elementFromPoint(x,y);
    if(!target)return {page:null,card:null};
    return {
      page:target.closest(".paper-page"),
      card:target.closest("#chordGrid .chord-card")
    };
  }
  function pointToPaper(ev,inside,record){
    const rect=inside.getBoundingClientRect(),size=pageSize();
    const scale=record.type==="sticker"?stickerScale(record):1;
    const offsetX=record.type==="sticker"?record.offsetX:STICKER_W/2;
    const offsetY=record.type==="sticker"?record.offsetY:20;
    return {
      x:Math.max(0,Math.min(size.innerWidth-STICKER_W*scale,Math.round(ev.clientX-rect.left-offsetX))),
      y:Math.max(0,Math.min(size.innerHeight-STICKER_H*scale,Math.round(ev.clientY-rect.top-offsetY)))
    };
  }
  function showPointerFeedback(){
    clearPointerFeedback();
    if(!pointerDrag?.started)return;
    const target=itemAtPointer(pointerDrag.x,pointerDrag.y);
    if(target.page){
      target.page.classList.add("page-drop-active");
      pointerDrag.ghost.dataset.tip="Release to "+(pointerDrag.type==="sticker"?"move":"place")+" diagram";
    }else if(target.card && pointerDrag.type==="bank"){
      target.card.classList.add("chord-drag-target");
      pointerDrag.ghost.dataset.tip="Release to reorder chord bank";
    }else{
      pointerDrag.ghost.dataset.tip="Drag onto a white page";
    }
  }
  function moveGhost(){
    if(!pointerDrag?.ghost)return;
    const ghost=pointerDrag.ghost;
    ghost.style.left=pointerDrag.x+"px";
    ghost.style.top=pointerDrag.y+"px";
  }
  function scrollDuringDrag(){
    scrollFrame=0;
    if(!pointerDrag?.started)return;
    const margin=85,edge=window.innerHeight;
    const y=pointerDrag.y;
    let speed=0;
    if(y>edge-margin)speed=Math.min(26,Math.max(3,(y-(edge-margin))*.34));
    else if(y<margin)speed=-Math.min(26,Math.max(3,(margin-y)*.34));
    if(speed){
      const oldY=window.scrollY;
      window.scrollBy(0,speed);
      if(window.scrollY!==oldY)showPointerFeedback();
    }
    scrollFrame=requestAnimationFrame(scrollDuringDrag);
  }
  function maximumStickerScale(record){
    const size=pageSize();
    return Math.max(MIN_SCALE,Math.min(MAX_SCALE,
      (size.innerWidth-record.x)/STICKER_W,
      (size.innerHeight-record.y)/STICKER_H));
  }
  function beginResize(ev,handle){
    const sticker=handle.closest(".paper-sticker");
    if(!sticker)return;
    const record=stickers.find(item=>item.id===Number(sticker.dataset.stickerId));
    if(!record)return;
    ev.preventDefault();
    ev.stopPropagation();
    pointerDrag={type:"resize",id:record.id,pointerId:ev.pointerId,
      startX:ev.clientX,startY:ev.clientY,initialScale:stickerScale(record),
      before:stickers.map(item=>structuredClone(item)),element:sticker,started:false};
    document.addEventListener("pointermove",movePointerDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endPointerDrag,true);
    document.addEventListener("pointercancel",cancelPointerDrag,true);
    document.body.classList.add("chord-resizing");
  }
  function moveResize(ev,state){
    const record=stickers.find(item=>item.id===state.id);
    if(!record)return;
    ev.preventDefault();
    const dx=(ev.clientX-state.startX)/STICKER_W;
    const dy=(ev.clientY-state.startY)/STICKER_H;
    const primary=Math.abs(dx)>=Math.abs(dy)?dx:dy;
    const next=Math.max(MIN_SCALE,Math.min(maximumStickerScale(record),
      Math.round((state.initialScale+primary)*1000)/1000));
    if(Math.abs(next-stickerScale(record))<.001)return;
    state.started=true;
    record.scale=next;
    state.element.style.width=stickerWidth(record)+"px";
    state.element.style.height=stickerHeight(record)+"px";
    state.element.querySelector(".sticker-inner").style.transform="scale("+next+")";
    state.element.classList.add("resizing");
  }
  function startPointerDrag(ev){
    if(pointerDrag||!ev.isPrimary||ev.button!==0)return;
    const handle=ev.target.closest(".sticker-resize");
    if(handle){beginResize(ev,handle);return;}
    if(ev.target.closest("button,input,select,textarea,a"))return;
    const sticker=ev.target.closest(".paper-sticker");
    const source=sticker?null:ev.target.closest("#chordGrid .chord-card,.paper-bank .chord-card");
    if(!sticker&&!source)return;
    let model;
    if(sticker){
      const id=Number(sticker.dataset.stickerId);
      const record=stickers.find(s=>s.id===id);
      if(!record)return;
      const box=sticker.getBoundingClientRect();
      model={type:"sticker",id,name:record.name,shape:record.shape,scale:stickerScale(record),
        offsetX:ev.clientX-box.left,offsetY:ev.clientY-box.top};
    }else{
      const key=source.dataset.diagramKey;
      const item=findItem(key);
      if(!item)return;
      model={type:"bank",key,name:item.name,shape:item.source};
    }
    pointerDrag={...model,pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:ev.clientX,startY:ev.clientY,started:false,ghost:null};
    document.addEventListener("pointermove",movePointerDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endPointerDrag,true);
    document.addEventListener("pointercancel",cancelPointerDrag,true);
  }
  function movePointerDrag(ev){
    const state=pointerDrag;
    if(!state||ev.pointerId!==state.pointerId)return;
    if(state.type==="resize"){moveResize(ev,state);return;}
    state.x=ev.clientX;state.y=ev.clientY;
    if(!state.started&&Math.hypot(state.x-state.startX,state.y-state.startY)<6)return;
    ev.preventDefault();
    if(!state.started){
      state.started=true;
      state.ghost=makeGhost(state.name,state.shape);
      document.body.classList.add("chord-pointer-dragging");
      scrollFrame=requestAnimationFrame(scrollDuringDrag);
    }
    moveGhost();
    showPointerFeedback();
  }
  function endPointerDrag(ev){
    const state=pointerDrag;
    if(!state||ev.pointerId!==state.pointerId)return;
    if(state.type==="resize"){
      ev.preventDefault();
      const record=stickers.find(item=>item.id===state.id);
      if(record&&Math.abs(stickerScale(record)-state.initialScale)>.001){
        // One history entry per completed resize gesture, NOT per pointer move.
        history.push(state.before);
        if(history.length>60)history.shift();
        redo=[];
        message("Diagram resized to "+Math.round(stickerScale(record)*100)+"%. Undo restores its previous size.");
      }
      endPointerCleanup();refresh();return;
    }
    if(state.started){
      ev.preventDefault();
      const hit=itemAtPointer(ev.clientX,ev.clientY);
      if(hit.page){
        const inside=hit.page.querySelector(".paper-inside");
        const pageIndex=[...$("printPage").querySelectorAll(".paper-page")].indexOf(hit.page);
        if(inside&&pageIndex>=0){
          const point=pointToPaper(ev,inside,state);
          if(state.type==="sticker"){
            const record=stickers.find(x=>x.id===state.id);
            if(record){
              if(ev.altKey){
                save();
                stickers.push({...structuredClone(record),id:nextId++,page:pageIndex,...point});
              }else if(record.page!==pageIndex||record.x!==point.x||record.y!==point.y){
                save();Object.assign(record,{page:pageIndex,...point});
              }
            }
          }else{
            const item=findItem(state.key);
            if(item){
              save();
              stickers.push({id:nextId++,name:item.name,key:state.key,shape:structuredClone(item.source),scale:1,page:pageIndex,...point});
            }
          }
          message("Diagram "+(state.type==="sticker"?"position":"copy")+" saved on page "+(pageIndex+1)+".");
          endPointerCleanup();
          refresh();
          return;
        }
      }else if(hit.card && state.type==="bank" && hit.card.dataset.diagramKey!==state.key){
        const r=hit.card.getBoundingClientRect();
        reorderDiagram(state.key,hit.card.dataset.diagramKey,ev.clientX>r.left+r.width/2);
      }
    }
    endPointerCleanup();
  }
  function cancelPointerDrag(ev){
    if(!pointerDrag||ev.pointerId!==pointerDrag.pointerId)return;
    if(pointerDrag.type==="resize"){
      const record=stickers.find(item=>item.id===pointerDrag.id);
      if(record)record.scale=pointerDrag.initialScale;
      endPointerCleanup();refresh();return;
    }
    endPointerCleanup();
  }
  function endPointerCleanup(){
    document.removeEventListener("pointermove",movePointerDrag,true);
    document.removeEventListener("pointerup",endPointerDrag,true);
    document.removeEventListener("pointercancel",cancelPointerDrag,true);
    if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0;}
    pointerDrag?.ghost?.remove();
    pointerDrag=null;
    document.body.classList.remove("chord-pointer-dragging","chord-resizing");
    clearPointerFeedback();
  }
  function init(){
    document.addEventListener("pointerdown",startPointerDrag,true);
    $("paperSize").addEventListener("change",refresh);
    $("undoPlacement").addEventListener("click",undo);
    $("redoPlacement").addEventListener("click",redoChange);
    $("clearPlacements").addEventListener("click",clearAll);
    refresh();
  }
  window.ChordLayout={init,refresh,reset,undo,redo:redoChange,clearAll,stickers:()=>structuredClone(stickers)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();