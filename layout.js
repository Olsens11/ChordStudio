"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const STICKER_W=104,STICKER_H=107,MIN_SCALE=.4,MAX_SCALE=3.5;
  const imageMinScale=record=>Math.min(1,18/Math.max(record.w||190,record.h||85));
  const minimumScale=record=>record.type==="image"||record.noteType==="image"?imageMinScale(record):MIN_SCALE;
  const chordHeight=record=>record.showDiagram===false?54:record.showCode===true?127:STICKER_H;
  const stickerScale=record=>Math.max(minimumScale(record),Number(record.scale)||1);
  const stickerWidth=record=>(record.type==="text"||record.noteType==="text"||record.type==="image"||record.noteType==="image")?(record.w||190)*stickerScale(record):STICKER_W*stickerScale(record);
  const stickerHeight=record=>(record.type==="text"||record.noteType==="text"||record.type==="image"||record.noteType==="image")?(record.h||85)*stickerScale(record):chordHeight(record)*stickerScale(record);
  const NOTE_MIN_W=85,NOTE_MIN_H=36;
  let placingNote=false,activeNoteId=null,noteTextHistorySaved=false;
  let stickers=[], history=[], redo=[], nextId=1, drag=null;
  let building=false;
  let pointerDrag=null;
  let scrollFrame=0;
  const SNAP=5;
  const save=()=>{history.push(stickers.map(s=>({...s,shape:structuredClone(s.shape)})));if(history.length>60)history.shift();redo=[];};
  const restore=data=>{stickers=data.map(s=>({...s,shape:structuredClone(s.shape)}));refresh();};
  const findItem=key=>(typeof rendered!=="undefined"?rendered:[]).find(item=>diagramKey(item)===key);
  function renderStickerTray(){
    const grid=$("stickerBoardGrid");
    if(!grid)return;
    grid.replaceChildren();
    const mode=activeChordMode(true);
    for(const item of rendered){
      const card=document.createElement("div");card.className="chord-card";
      card.dataset.diagramKey=diagramKey(item);
      card.title="Drag onto a page to place another "+item.name+" chord";
      card.setAttribute("aria-label","Drag "+item.name+" onto a page");
      fillChordCard(card,item,mode);grid.append(card);
    }
    if(!rendered.length){
      const note=document.createElement("p");note.textContent="No chords selected.";
      grid.append(note);
    }
  }
  function toggleStickerTray(open){
    $("stickerBoard").hidden=!open;
    $("toggleStickerBoard").setAttribute("aria-expanded",String(open));
    $("toggleStickerBoard").textContent=open?"Hide sticker tray":"Open sticker tray";
  }
  function noteRecord(id){
    return stickers.find(item=>item.id===id&&item.type==="text");
  }
  function setNotePlacementMode(enabled){
    placingNote=!!enabled;
    document.body.classList.toggle("placing-note",placingNote);
    $("addTextNote").setAttribute("aria-pressed",String(placingNote));
    $("addTextNote").textContent=placingNote?"✕ Cancel note":"✎ Add text note";
    $("trayHint").textContent=placingNote
      ?"Click anywhere on a white page to add a note."
      :"Drag onto any page · sources stay here";
  }
  function closeNoteEditor(){
    window.ChordEmoji?.close();
    activeNoteId=null;noteTextHistorySaved=false;
    $("noteEditor").hidden=true;
  }
  function positionNoteEditor(){
    if($("noteEditor").hidden||activeNoteId==null)return;
    const sticker=$("printPage").querySelector('[data-sticker-id="'+activeNoteId+'"]');
    if(!sticker){closeNoteEditor();return;}
    const bounds=sticker.getBoundingClientRect();
    const panel=$("noteEditor");
    const width=panel.offsetWidth||285,height=panel.offsetHeight||310;
    panel.style.left=Math.max(8,Math.min(innerWidth-width-8,bounds.left))+"px";
    const below=bounds.bottom+14;
    panel.style.top=Math.max(8,Math.min(innerHeight-height-8,
      below+height<innerHeight-8?below:bounds.top-height-12))+"px";
  }
  function openNoteEditor(id,{focus=false}={}){
    const record=noteRecord(id);if(!record)return;
    activeNoteId=id;noteTextHistorySaved=false;setNotePlacementMode(false);
    $("noteEditor").hidden=false;
    $("noteText").value=record.text||"";
    $("noteFontSize").value=String(record.fontSize||16);
    $("noteBold").setAttribute("aria-pressed",String(!!record.bold));
    $("noteItalic").setAttribute("aria-pressed",String(!!record.italic));
    $("noteAlign").value=record.align||"left";
    $("noteBackground").value=record.background??"transparent";
    $("noteColor").value=record.color||"#181818";
    positionNoteEditor();
    if(focus)$("noteText").focus({preventScroll:true});
  }
  function noteStyle(content,record){
    content.style.color=record.color||"#181818";
    content.style.background=record.background??"transparent";
    content.style.fontSize=(record.fontSize||16)+"px";
    content.style.fontWeight=record.bold?"700":"400";
    content.style.fontStyle=record.italic?"italic":"normal";
    content.style.textAlign=record.align||"left";
  }
  function updateNoteView(record){
    const el=$("printPage").querySelector('[data-sticker-id="'+record.id+'"] .note-content');
    if(el){el.textContent=record.text||"";noteStyle(el,record);}
  }
  function applyNoteFormat(property,value){
    const record=noteRecord(activeNoteId);
    if(!record||record[property]===value)return;
    save();record[property]=value;updateNoteView(record);
    positionNoteEditor();
  }
  function clickToPlaceNote(ev){
    if(!placingNote||ev.button!==0)return;
    const page=ev.target.closest(".paper-page");
    if(!page||ev.target.closest(".paper-sticker"))return;
    ev.preventDefault();ev.stopPropagation();
    const pages=[...$("printPage").querySelectorAll(".paper-page")];
    const inside=page.querySelector(".paper-inside"),rect=inside.getBoundingClientRect(),size=pageSize();
    const w=190,h=85;
    const pageIndex=pages.indexOf(page);
    const point=pageGridPoint(ev.clientX-rect.left,ev.clientY-rect.top,
      w,h,inside,pageIndex,null,ev.ctrlKey&&ev.shiftKey);
    const {x,y}=point;
    const note={id:nextId++,type:"text",name:"Note",text:"",page:pageIndex,x,y,w,h,scale:1,
      fontSize:16,bold:false,italic:false,align:"left",color:"#181818",background:"transparent"};
    save();stickers.push(note);
    setNotePlacementMode(false);refresh();
    openNoteEditor(note.id,{focus:true});
    message("Text note created. Type and format your note; then drag or resize it like a diagram.");
  }
  function updateUndoButtons(){
    $("undoPlacement").disabled=!history.length;
    $("redoPlacement").disabled=!redo.length;
    $("clearPlacements").disabled=!stickers.length;
    $("layoutStatus").textContent=stickers.length+" placed item"+(stickers.length===1?"":"s");
  }
  function undo(){if(!history.length)return;closeNoteEditor();redo.push(stickers.map(s=>structuredClone(s)));restore(history.pop());}
  function redoChange(){if(!redo.length)return;closeNoteEditor();history.push(stickers.map(s=>structuredClone(s)));restore(redo.pop());}
  function clearAll(){if(!stickers.length)return;save();stickers=[];refresh();}
  function reset(){closeNoteEditor();setNotePlacementMode(false);stickers=[];history=[];redo=[];nextId=1;refresh();}
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
    let title=sectionLabel("CHORDS");current.main.append(title);
    let bank=document.createElement("div");bank.className="paper-bank";
    bank.style.setProperty("--cols",Number($("columns").value));
    current.main.append(bank);
    const mode=activeChordMode(false);
    for(const item of rendered){
      const key=diagramKey(item);
      const copy=document.createElement("div");
      copy.className="chord-card";copy.dataset.diagramKey=key;copy.draggable=false;
      copy.title="Drag to place another copy of this chord";
      fillChordCard(copy,item,mode);bank.append(copy);
      if(bank.getBoundingClientRect().bottom>current.inside.getBoundingClientRect().bottom-.5){
        copy.remove();
        if(!bank.childElementCount){bank.remove();title.remove();}
        current=freshPage(pages.length+1);pages.push(current);
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
  function chordStickerArtwork(record){
    const inner=document.createElement("div");inner.className="sticker-inner";
    inner.style.height=chordHeight(record)+"px";
    inner.style.transform="scale("+stickerScale(record)+")";
    const name=document.createElement("div");name.className="chord-name";
    name.textContent=record.name;inner.append(name);
    if(record.showDiagram!==false){
      const art=document.createElement("div");art.className="diagram-art";
      art.append(makeDiagramCanvas(record.shape));inner.append(art);
    }
    if(record.showCode===true){
      const code=document.createElement("div");code.className="chord-code";
      code.textContent=record.code||fretCode(
        Array.isArray(record.shape?.frets)?[...record.shape.frets].reverse():[]);
      inner.append(code);
    }
    return inner;
  }
  function imageStickerArtwork(record){
    const img=document.createElement("img");
    img.className="sticker-image";
    img.src=record.src;
    img.alt=record.name||"Imported image";
    img.width=record.w||200;img.height=record.h||100;
    img.draggable=false;
    img.style.width="100%";img.style.height="100%";
    return img;
  }
  let lastImageDragAt=0;
  function rotatableArtwork(content,rotation=0){
    const wrap=document.createElement("div");
    wrap.className="sticker-rotatable";
    wrap.style.transform="rotate("+(Number(rotation)||0)+"deg)";
    wrap.append(content);
    return wrap;
  }
  function stickerElement(record){
    const isText=record.type==="text";
    const isImage=record.type==="image";
    const el=document.createElement("div");el.className="paper-sticker"+(isText?" text-sticker":isImage?" image-sticker":"");
    el.dataset.stickerId=record.id;el.draggable=false;el.tabIndex=0;
    el.setAttribute("aria-label",isText?"Text note. Click to edit, drag to move, corner to resize. Shift click to duplicate.":isImage?"Image sticker. Drag to move, corner to resize. Shift click to duplicate.":"Placed "+record.name+" diagram. Shift click to duplicate, drag to move, corner to resize.");
    el.title=isText?"Click to edit note · drag to move · corner resizes · Shift+click copies":
      "Drag to move · Shift+click copies · Ctrl+Shift snaps to 5px grid · corner resizes";
    el.style.left=record.x+"px";el.style.top=record.y+"px";
    el.style.width=stickerWidth(record)+"px";el.style.height=stickerHeight(record)+"px";
    if(isText){
      const inner=document.createElement("div");inner.className="note-inner";
      inner.style.width=(record.w||190)+"px";
      inner.style.height=(record.h||85)+"px";
      inner.style.transform="scale("+stickerScale(record)+")";
      const content=document.createElement("div");content.className="note-content";
      content.textContent=record.text||"";
      noteStyle(content,record);inner.append(content);el.append(rotatableArtwork(inner,record.rotation));
      el.addEventListener("click",ev=>{
        if(!ev.shiftKey&&!ev.ctrlKey&&!ev.altKey&&!ev.target.closest(".sticker-delete,.sticker-resize,.sticker-rotate")&&ev.target.closest(".paper-sticker")===el){
          openNoteEditor(record.id);
        }
      });
    }else if(isImage){
      el.append(rotatableArtwork(imageStickerArtwork(record),record.rotation));
      el.addEventListener("click",ev=>{
        if(ev.shiftKey||ev.ctrlKey||ev.altKey||
          ev.target.closest(".sticker-delete,.sticker-resize,.sticker-rotate")||
          performance.now()-lastImageDragAt<500)return;
        window.ChordImages?.editSticker(record.id);
      });
    }else{
      el.append(rotatableArtwork(chordStickerArtwork(record),record.rotation));
    }
    const remove=document.createElement("button");remove.className="sticker-delete no-print";
    remove.type="button";remove.title="Remove placed "+(isText?"note":"diagram");
    remove.setAttribute("aria-label","Remove placed "+(isText?"note":record.name+" diagram"));
    remove.draggable=false;remove.addEventListener("mousedown",ev=>ev.stopPropagation());
    remove.addEventListener("click",ev=>{
      ev.stopPropagation();save();stickers=stickers.filter(item=>item.id!==record.id);
      if(activeNoteId===record.id)closeNoteEditor();
      refresh();
    });
    const resize=document.createElement("button");resize.className="sticker-resize no-print";
    resize.type="button";resize.draggable=false;
    resize.title=isText?"Drag corner to resize note":"Drag corner to resize, preserving aspect ratio";
    resize.setAttribute("aria-label","Resize placed "+(isText?"note":record.name+" diagram"));
    const rotate=document.createElement("button");
    rotate.type="button";rotate.className="sticker-rotate no-print";
    rotate.draggable=false;rotate.textContent="↻";
    rotate.title="Drag to rotate by any angle · Shift snaps to 15°";
    rotate.setAttribute("aria-label","Rotate sticker");
    rotate.addEventListener("mousedown",event=>event.stopPropagation());
    el.append(remove,resize,rotate);
    el.addEventListener("keydown",ev=>{
      if(ev.key==="Delete"||ev.key==="Backspace"){
        ev.preventDefault();save();stickers=stickers.filter(item=>item.id!==record.id);
        if(activeNoteId===record.id)closeNoteEditor();refresh();
      }else if(ev.key==="Enter"&&isText){
        ev.preventDefault();openNoteEditor(record.id,{focus:true});
      }else if(ev.key==="Enter"&&isImage){
        ev.preventDefault();window.ChordImages?.editSticker(record.id);
      }else if(ev.altKey&&ev.key.toLowerCase()==="r"){
        ev.preventDefault();save();
        record.rotation=((Number(record.rotation)||0)+(ev.shiftKey?-15:15)+360)%360;
        refresh();
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
      if(record.type==="text"||record.type==="image"){
        record.w=Math.max(30,record.w||190);
        record.h=Math.max(30,record.h||85);
        const maxFit=Math.min(MAX_SCALE,size.innerWidth/record.w,size.innerHeight/record.h);
        record.scale=Math.max(minimumScale(record),Math.min(stickerScale(record),maxFit));
      }else{
        const maxFit=Math.max(MIN_SCALE,Math.min(MAX_SCALE,size.innerWidth/STICKER_W,size.innerHeight/STICKER_H));
        record.scale=Math.min(stickerScale(record),maxFit);
      }
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
          save();stickers.push({id:nextId++,name:item.name,key,shape:structuredClone(item.source),
            showDiagram:true,showCode:false,code:fretCode(item.arr),scale:1,page:index,x,y});refresh();
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
      renderStickerTray();
      $("pageCount").textContent=pages.length+" printable "+(pages.length===1?"page":"pages");
      updateUndoButtons();
      if(activeNoteId!=null)positionNoteEditor();
    }finally{building=false;}
  }
  // Unified pointer drag: works when dragging into scrolled pages. Native
  // HTML drag/drop is not reliable here and does not reach the drop target.
  // Palette items are COPIED; existing placed stickers are MOVED.
  function makeGhost(state){
    const el=document.createElement("div");
    el.className="chord-drag-ghost"+(state.noteType==="text"?" note-ghost":"");
    el.setAttribute("aria-hidden","true");
    el.style.width=stickerWidth(state)+"px";
    el.style.height=stickerHeight(state)+"px";
    if(state.noteType==="image"){
      el.append(rotatableArtwork(imageStickerArtwork(state),state.rotation));
    }else if(state.noteType==="text"){
      const inner=document.createElement("div");inner.className="note-inner";
      inner.style.width=(state.w||190)+"px";
      inner.style.height=(state.h||85)+"px";
      inner.style.transform="scale("+stickerScale(state)+")";
      const content=document.createElement("div");content.className="note-content";
      content.textContent=state.text||"";noteStyle(content,state);
      inner.append(content);el.append(rotatableArtwork(inner,state.rotation));
    }else{
      el.append(rotatableArtwork(chordStickerArtwork(state),state.rotation));
    }
    document.body.append(el);
    return el;
  }
  function clearPointerFeedback(){
    for(const el of document.querySelectorAll(".page-drop-active,.chord-drag-target,.grid-snap-active")){
      el.classList.remove("page-drop-active","chord-drag-target","grid-snap-active");
    }
  }
  function itemAtPointer(x,y){
    const target=document.elementFromPoint(x,y);
    if(!target)return {page:null,card:null};
    return {
      page:target.closest(".paper-page"),
      card:target.closest("#chordGrid .chord-card"),
      bankGrid:target.closest("#chordGrid"),
      trayCard:target.closest("#stickerBoardGrid .chord-card")
    };
  }
  function snapValue(v,max,snap){
    if(!snap)return Math.round(Math.max(0,Math.min(max,v)));
    return Math.max(0,Math.min(Math.floor(max/SNAP)*SNAP,Math.round(v/SNAP)*SNAP));
  }
  function pageGridPoint(x,y,w,h,inside,pageIndex,excludeId,snap){
    const size=pageSize();
    const maxX=Math.max(0,size.innerWidth-w),maxY=Math.max(0,size.innerHeight-h);
    // Every page and every sticker uses the SAME (0,0) origin at .paper-inside,
    // not an offset from whichever sticker was first grabbed.
    const axis=(raw,max,coordinate,length)=>{
      const basic=snapValue(raw,max,snap);
      if(!snap)return basic;
      const nearby=[];
      for(const other of stickers){
        if(other.page!==pageIndex||other.id===excludeId)continue;
        const edge=coordinate==="x"?other.x:other.y;
        const far=edge+(coordinate==="x"?stickerWidth(other):stickerHeight(other))-length;
        for(const candidate of [edge,far]){
          if(candidate<0||candidate>max)continue;
          if(Math.abs(candidate-raw)<=9)nearby.push(candidate);
        }
      }
      // Magnetic alignment takes precedence within 9px, including stickers
      // placed before the snap feature was enabled and off the 5px grid.
      return nearby.length
        ?nearby.sort((a,b)=>Math.abs(a-raw)-Math.abs(b-raw))[0]
        :basic;
    };
    return {x:axis(x,maxX,"x",w),y:axis(y,maxY,"y",h)};
  }
  function pointToPaper(ev,inside,record){
    const rect=inside.getBoundingClientRect();
    const pageIndex=[...$("printPage").querySelectorAll(".paper-page")].indexOf(inside.closest(".paper-page"));
    const offsetX=record.type==="sticker"?record.offsetX:STICKER_W/2;
    const offsetY=record.type==="sticker"?record.offsetY:20;
    return pageGridPoint(ev.clientX-rect.left-offsetX,ev.clientY-rect.top-offsetY,
      stickerWidth(record),stickerHeight(record),inside,pageIndex,
      record.type==="sticker"?record.id:null,
      !!(record.ctrlKey&&record.shiftKey));
  }
  // Reordering should be predictable, not an animation storm. Keep every
  // chord stationary until release and show exactly one insertion marker.
  function beginSortPreview(state){
    if(state.type!=="bank"||state.bankOrigin!=="top")return;
    const source=state.source;
    if(!source?.isConnected)return;
    const grid=$("chordGrid");
    const marker=document.createElement("div");
    marker.className="chord-reorder-marker";
    marker.setAttribute("aria-hidden","true");
    grid.append(marker);
    grid.classList.add("chord-bank-sorting");
    source.classList.add("chord-sort-source");
    state.sort={source,marker,destination:null};
  }
  function updateSortPreview(state){
    const sort=state.sort;if(!sort)return;
    const grid=$("chordGrid"),bounds=grid.getBoundingClientRect();
    const inside=state.x>=bounds.left-18&&state.x<=bounds.right+18
      &&state.y>=bounds.top-18&&state.y<=bounds.bottom+18;
    if(!inside){
      sort.marker.hidden=true;sort.destination=null;
      return;
    }
    const cards=[...grid.querySelectorAll(".chord-card")].filter(card=>card!==sort.source);
    if(!cards.length){sort.marker.hidden=true;sort.destination=null;return;}
    let closest=null,min=Infinity;
    for(const card of cards){
      const r=card.getBoundingClientRect();
      const dx=state.x-(r.left+r.width/2),dy=state.y-(r.top+r.height/2);
      const d=dx*dx+dy*dy*1.75;
      if(d<min){min=d;closest=card;}
    }
    if(!closest)return;
    const r=closest.getBoundingClientRect();
    const after=state.x>=r.left+r.width/2;
    const key=closest.dataset.diagramKey;
    const previous=sort.destination;
    if(previous?.key===key&&previous.after===after)return;
    sort.destination={key,after};
    const gridRect=grid.getBoundingClientRect();
    const x=(after?r.right:r.left)-gridRect.left;
    sort.marker.style.left=Math.round(x)+"px";
    sort.marker.style.top=Math.round(r.top-gridRect.top)+"px";
    sort.marker.style.height=Math.round(r.height)+"px";
    sort.marker.hidden=false;
  }
  function sortDropDestination(state){
    return state.sort?.destination||null;
  }
  function restoreSortPreview(state){
    if(!state?.sort)return;
    const {marker,source}=state.sort;
    marker.remove();
    source.classList.remove("chord-sort-source");
    $("chordGrid").classList.remove("chord-bank-sorting");
  }
  function showPointerFeedback(){
    clearPointerFeedback();
    if(!pointerDrag?.started)return;
    const target=itemAtPointer(pointerDrag.x,pointerDrag.y);
    pointerDrag.ghost.classList.toggle("grid-snapping",!!(pointerDrag.ctrlKey&&pointerDrag.shiftKey));
    if(target.page){
      target.page.classList.add("page-drop-active");
      if(pointerDrag.ctrlKey&&pointerDrag.shiftKey)target.page.classList.add("grid-snap-active");
      pointerDrag.ghost.dataset.tip=pointerDrag.ctrlKey&&pointerDrag.shiftKey
        ?"5px grid":pointerDrag.type==="sticker"?"Move sticker":"Place copy";
    }else if(target.bankGrid && pointerDrag.sort){
      updateSortPreview(pointerDrag);
    }else if(target.card && pointerDrag.type==="bank"){
      target.card.classList.add("chord-drag-target");
    }else{
      pointerDrag.ghost.dataset.tip="Drag onto a white page";
    }
  }
  function moveGhost(){
    if(!pointerDrag?.ghost)return;
    const state=pointerDrag;
    const ghost=state.ghost;
    const offsetX=state.type==="sticker"?state.offsetX:STICKER_W/2;
    const offsetY=state.type==="sticker"?state.offsetY:20;
    let x=state.x-offsetX,y=state.y-offsetY;
    // Apply the same edge clamping as the eventual drop. What the user sees
    // inside the page is exactly where the sticker will land.
    const page=itemAtPointer(state.x,state.y).page;
    if(page){
      const inside=page.querySelector(".paper-inside");
      if(inside){
        const point=pointToPaper({clientX:state.x,clientY:state.y},inside,state);
        const rect=inside.getBoundingClientRect();
        x=rect.left+point.x;
        y=rect.top+point.y;
      }
    }
    ghost.style.left=x+"px";
    ghost.style.top=y+"px";
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
      if(window.scrollY!==oldY){moveGhost();showPointerFeedback();}
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
      initialW:record.w,initialH:record.h,isText:record.type==="text"||record.type==="image",isImage:record.type==="image",
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
    if(state.isText){
      // Scale the entire fixed-size note, including all glyphs and line breaks.
      // CSS transforms keep editable vector text sharp in the PDF.
      const size=pageSize();
      const baseW=record.w||190,baseH=record.h||85;
      const dx=(ev.clientX-state.startX)/baseW;
      const dy=(ev.clientY-state.startY)/baseH;
      const delta=Math.abs(dx)>=Math.abs(dy)?dx:dy;
      const maxFit=Math.min(MAX_SCALE,(size.innerWidth-record.x)/baseW,
        (size.innerHeight-record.y)/baseH);
      const minFit=Math.min(minimumScale(record),maxFit);
      const next=Math.max(minFit,Math.min(maxFit,Math.round((state.initialScale+delta)*1000)/1000));
      if(Math.abs(next-stickerScale(record))<.001)return;
      state.started=true;record.scale=next;
      state.element.style.width=stickerWidth(record)+"px";
      state.element.style.height=stickerHeight(record)+"px";
      if(!state.isImage)state.element.querySelector(".note-inner").style.transform="scale("+next+")";
      state.element.classList.add("resizing");
      return;
    }
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
  function beginRotate(ev,handle){
    const sticker=handle.closest(".paper-sticker");
    const record=stickers.find(x=>x.id===Number(sticker?.dataset.stickerId));
    if(!record)return;
    ev.preventDefault();ev.stopPropagation();
    const rect=sticker.getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const startAngle=Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI;
    pointerDrag={type:"rotate",id:record.id,pointerId:ev.pointerId,
      element:sticker,cx,cy,startAngle,initialAngle:Number(record.rotation)||0,
      before:stickers.map(item=>structuredClone(item)),started:false};
    document.addEventListener("pointermove",movePointerDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endPointerDrag,true);
    document.addEventListener("pointercancel",cancelPointerDrag,true);
    document.body.classList.add("chord-resizing");
  }
  function moveRotate(ev,state){
    const record=stickers.find(x=>x.id===state.id);if(!record)return;
    ev.preventDefault();
    const now=Math.atan2(ev.clientY-state.cy,ev.clientX-state.cx)*180/Math.PI;
    let delta=now-state.startAngle;
    if(delta>180)delta-=360;if(delta< -180)delta+=360;
    const raw=state.initialAngle+delta;
    const next=((ev.shiftKey?Math.round(raw/15)*15:Math.round(raw*10)/10)%360+360)%360;
    if(Math.abs(next-record.rotation)<.05)return;
    record.rotation=next;state.started=true;
    state.element.querySelector(".sticker-rotatable").style.transform="rotate("+next+"deg)";
    state.element.classList.add("rotating");
  }
  function startPointerDrag(ev){
    if(pointerDrag||!ev.isPrimary||ev.button!==0||placingNote)return;
    const rotateHandle=ev.target.closest(".sticker-rotate");
    if(rotateHandle){beginRotate(ev,rotateHandle);return;}
    const handle=ev.target.closest(".sticker-resize");
    if(handle){beginResize(ev,handle);return;}
    if(ev.target.closest("button,input,select,textarea,a"))return;
    const sticker=ev.target.closest(".paper-sticker");
    const source=sticker?null:ev.target.closest("#chordGrid .chord-card,.paper-bank .chord-card,#stickerBoardGrid .chord-card");
    if(!sticker&&!source)return;
    let model;
    if(sticker){
      const id=Number(sticker.dataset.stickerId);
      const record=stickers.find(s=>s.id===id);
      if(!record)return;
      const box=sticker.getBoundingClientRect();
      model={type:"sticker",id,name:record.name,shape:record.shape,scale:stickerScale(record),
        noteType:record.type==="text"?"text":record.type==="image"?"image":"diagram",w:record.w,h:record.h,src:record.src,
        text:record.text,fontSize:record.fontSize,bold:record.bold,italic:record.italic,
        showDiagram:record.showDiagram!==false,showCode:record.showCode===true,code:record.code,
        align:record.align,color:record.color,background:record.background,rotation:record.rotation||0,
        offsetX:ev.clientX-box.left,offsetY:ev.clientY-box.top};
      if(record.type==="text")closeNoteEditor();
    }else{
      const key=source.dataset.diagramKey;
      const item=findItem(key);
      if(!item)return;
      model={type:"bank",key,name:item.name,shape:item.source,
        showDiagram:source.dataset.showDiagram!=="false",showCode:source.dataset.showCode==="true",
        code:fretCode(item.arr),
        bankOrigin:source.closest("#chordGrid")?"top":source.closest("#stickerBoardGrid")?"tray":"paper",source};
    }
    pointerDrag={...model,pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:ev.clientX,startY:ev.clientY,ctrlKey:ev.ctrlKey,shiftKey:ev.shiftKey,started:false,ghost:null};
    document.addEventListener("pointermove",movePointerDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endPointerDrag,true);
    document.addEventListener("pointercancel",cancelPointerDrag,true);
  }
  function movePointerDrag(ev){
    const state=pointerDrag;
    if(!state||ev.pointerId!==state.pointerId)return;
    if(state.type==="rotate"){moveRotate(ev,state);return;}
    if(state.type==="resize"){moveResize(ev,state);return;}
    state.x=ev.clientX;state.y=ev.clientY;state.ctrlKey=ev.ctrlKey;state.shiftKey=ev.shiftKey;
    if(!state.started&&Math.hypot(state.x-state.startX,state.y-state.startY)<6)return;
    ev.preventDefault();
    if(!state.started){
      state.started=true;
      state.ghost=makeGhost(state);
      beginSortPreview(state);
      document.body.classList.add("chord-pointer-dragging");
      scrollFrame=requestAnimationFrame(scrollDuringDrag);
    }
    moveGhost();
    showPointerFeedback();
  }
  function endPointerDrag(ev){
    const state=pointerDrag;
    if(!state||ev.pointerId!==state.pointerId)return;
    if(state.type==="rotate"){
      ev.preventDefault();
      const record=stickers.find(x=>x.id===state.id);
      if(record&&state.started){
        history.push(state.before);if(history.length>60)history.shift();
        redo=[];message("Sticker rotated to "+Math.round(record.rotation)+"°. Undo restores its previous angle.");
      }
      endPointerCleanup();refresh();return;
    }
    if(state.type==="resize"){
      ev.preventDefault();
      const record=stickers.find(item=>item.id===state.id);
      if(record&&Math.abs(stickerScale(record)-state.initialScale)>.001){
        // One history entry per completed resize gesture, NOT per pointer move.
        history.push(state.before);
        if(history.length>60)history.shift();
        redo=[];
        message(state.isText?"Note resized. Undo restores the previous dimensions.":"Diagram resized to "+Math.round(stickerScale(record)*100)+"%. Undo restores its previous size.");
      }
      endPointerCleanup();refresh();return;
    }
    if(state.started){
      ev.preventDefault();
      if(state.noteType==="image")lastImageDragAt=performance.now();
      const hit=itemAtPointer(ev.clientX,ev.clientY);
      if(hit.page){
        state.ctrlKey=ev.ctrlKey;state.shiftKey=ev.shiftKey;
        const inside=hit.page.querySelector(".paper-inside");
        const pageIndex=[...$("printPage").querySelectorAll(".paper-page")].indexOf(hit.page);
        if(inside&&pageIndex>=0){
          const point=pointToPaper(ev,inside,state);
          if(state.type==="sticker"){
            const record=stickers.find(x=>x.id===state.id);
            if(record){
              if(ev.altKey||(ev.shiftKey&&!ev.ctrlKey)){
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
              stickers.push({id:nextId++,name:item.name,key:state.key,shape:structuredClone(item.source),
                showDiagram:state.showDiagram!==false,showCode:state.showCode===true,code:state.code,
                scale:1,page:pageIndex,...point});
            }
          }
          message("Diagram "+(state.type==="sticker"?"position":"copy")+" saved on page "+(pageIndex+1)+".");
          endPointerCleanup();
          refresh();
          return;
        }
      }else if(state.sort && hit.bankGrid){
        const destination=sortDropDestination(state);
        endPointerCleanup();
        if(destination)reorderDiagram(state.key,destination.key,destination.after);
        return;
      }else if(hit.card && state.type==="bank" && hit.card.dataset.diagramKey!==state.key){
        const r=hit.card.getBoundingClientRect();
        reorderDiagram(state.key,hit.card.dataset.diagramKey,ev.clientX>r.left+r.width/2);
      }
    }else if(state.type==="sticker"&&ev.shiftKey){
      const record=stickers.find(item=>item.id===state.id);
      if(record){
        const size=pageSize(),gap=15;
        const x=Math.max(0,Math.min(size.innerWidth-stickerWidth(record),record.x+gap));
        const y=Math.max(0,Math.min(size.innerHeight-stickerHeight(record),record.y+gap));
        save();
        stickers.push({...structuredClone(record),id:nextId++,x,y});
        message("Duplicate "+record.name+" placed at the same size.");
        endPointerCleanup();refresh();return;
      }
    }
    endPointerCleanup();
  }
  function cancelPointerDrag(ev){
    if(!pointerDrag||ev.pointerId!==pointerDrag.pointerId)return;
    if(pointerDrag.type==="rotate"){
      const record=stickers.find(x=>x.id===pointerDrag.id);
      if(record)record.rotation=pointerDrag.initialAngle;
      endPointerCleanup();refresh();return;
    }
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
    restoreSortPreview(pointerDrag);
    pointerDrag=null;
    document.body.classList.remove("chord-pointer-dragging","chord-resizing");
    clearPointerFeedback();
  }
  function init(){
    document.addEventListener("pointerdown",startPointerDrag,true);
    $("paperSize").addEventListener("change",refresh);
    for(const id of ["trayShowDiagrams","trayShowCodes"]){
      $(id).addEventListener("change",()=>{
        const other=id==="trayShowDiagrams"?"trayShowCodes":"trayShowDiagrams";
        if(!$(id).checked&&!$(other).checked){$(id).checked=true;message("Keep Diagram or Fret codes enabled.");}
        renderStickerTray();
      });
    }
    $("undoPlacement").addEventListener("click",undo);
    $("redoPlacement").addEventListener("click",redoChange);
    $("clearPlacements").addEventListener("click",clearAll);
    $("toggleStickerBoard").addEventListener("click",()=>toggleStickerTray($("stickerBoard").hidden));
    $("closeStickerBoard").addEventListener("click",()=>{setNotePlacementMode(false);toggleStickerTray(false);});
    $("addTextNote").addEventListener("click",()=>{
      closeNoteEditor();setNotePlacementMode(!placingNote);
    });
    document.addEventListener("click",clickToPlaceNote,true);
    $("closeNoteEditor").addEventListener("click",closeNoteEditor);
    $("doneNote").addEventListener("click",closeNoteEditor);
    $("noteText").addEventListener("input",()=>{
      const record=noteRecord(activeNoteId);if(!record)return;
      if(!noteTextHistorySaved){save();noteTextHistorySaved=true;}
      record.text=$("noteText").value;updateNoteView(record);
    });
    $("noteFontSize").addEventListener("change",()=>applyNoteFormat("fontSize",Number($("noteFontSize").value)));
    $("noteAlign").addEventListener("change",()=>applyNoteFormat("align",$("noteAlign").value));
    $("noteBackground").addEventListener("change",()=>applyNoteFormat("background",$("noteBackground").value));
    $("noteColor").addEventListener("change",()=>applyNoteFormat("color",$("noteColor").value));
    for(const [id,prop] of [["noteBold","bold"],["noteItalic","italic"]]){
      $(id).addEventListener("click",()=>{
        const record=noteRecord(activeNoteId);if(!record)return;
        applyNoteFormat(prop,!record[prop]);
        $(id).setAttribute("aria-pressed",String(!!record[prop]));
      });
    }
    window.addEventListener("scroll",()=>{if(activeNoteId!=null)positionNoteEditor();},{passive:true});
    window.addEventListener("resize",()=>{if(activeNoteId!=null)positionNoteEditor();});
    document.addEventListener("keydown",ev=>{
      if(ev.key==="Escape"){
        if(placingNote){setNotePlacementMode(false);ev.preventDefault();}
        else if(activeNoteId!=null){closeNoteEditor();ev.preventDefault();}
      }
      if(!pointerDrag?.started||!["Control","Shift"].includes(ev.key))return;
      pointerDrag.ctrlKey=ev.ctrlKey;pointerDrag.shiftKey=ev.shiftKey;
      moveGhost();showPointerFeedback();
    });
    document.addEventListener("keyup",ev=>{
      if(!pointerDrag?.started||!["Control","Shift"].includes(ev.key))return;
      pointerDrag.ctrlKey=ev.ctrlKey;pointerDrag.shiftKey=ev.shiftKey;
      moveGhost();showPointerFeedback();
    });
    refresh();
  }
  function updateImageSticker(id,src,width,height){
    const record=stickers.find(s=>s.id===id&&s.type==="image");
    if(!record)throw Error("Image sticker no longer exists.");
    if(typeof src!=="string"||src.length>9000000||
      !/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(src))
      throw Error("Unsupported edited image.");
    const visualWidth=stickerWidth(record);
    const sourceW=Math.max(1,Number(width)||200);
    const sourceH=Math.max(1,Number(height)||100);
    const fit=Math.min(1,1500/sourceW,1500/sourceH);
    const w=Math.max(20,Math.round(sourceW*fit));
    const h=Math.max(20,Math.round(sourceH*fit));
    save();
    record.src=src;
    record.w=w;record.h=h;
    record.scale=Math.max(.2,Math.min(MAX_SCALE,visualWidth/w));
    refresh();
    message("Image changes applied. Undo restores the previous crop and rotation.");
  }
  function addImageSticker(src,w,h,pageIndex,x,y){
    const size=pageSize();
    if(typeof src!=="string"||src.length>9000000||!/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(src))
      throw Error("Only supported local image files can be added.");
    const width=Math.max(20,Math.min(3000,Number(w)||200));
    const height=Math.max(20,Math.min(3000,Number(h)||120));
    const fit=Math.min(1,size.innerWidth/width,size.innerHeight/height);
    const scale=Math.min(fit,Math.min(1,240/width,180/height));
    const page=Math.max(0,Math.floor(Number(pageIndex)||0));
    const maxX=size.innerWidth-width*scale,maxY=size.innerHeight-height*scale;
    const item={id:nextId++,type:"image",name:"Imported image",src,w:width,h:height,scale,
      page,x:Math.max(0,Math.min(maxX,Math.round(Number(x)||0))),y:Math.max(0,Math.min(maxY,Math.round(Number(y)||0)))};
    save();stickers.push(item);refresh();
    message("Image placed. Drag it to move, use the corner to resize, or Shift+click to duplicate.");
    return item.id;
  }
  function editorPageBreaks(){
    const editor=$("songEditor");if(!editor||$("songEditorPanel").hidden)return [];
    if(!$("includeSong").checked)return [];
    const saved=[...$("songLines").childNodes];
    const nodes=[...editor.children].map((node,i)=>{
      const clone=node.cloneNode(true);clone.classList.add("song-line");
      clone.dataset.editorLineIndex=String(i);return clone;
    });
    const breakList=[];
    try{
      $("songLines").replaceChildren(...nodes);
      refresh();
      const paperPages=[...$("printPage").querySelectorAll(".paper-page")];
      for(const paper of paperPages){
        const first=paper.querySelector(".paper-song .song-line[data-editor-line-index]");
        if(first){
          const index=Number(first.dataset.editorLineIndex);
          if(index>0)breakList.push({page:paperPages.indexOf(paper)+1,index});
        }
      }
    }finally{
      $("songLines").replaceChildren(...saved);
      refresh();
    }
    return breakList;
  }
  function exportProjectLayout(){
    return {
      stickers:structuredClone(stickers),
      trayOpen:!$("stickerBoard").hidden,
      trayMode:activeChordMode(true)
    };
  }
  function importProjectLayout(data){
    if(!data||typeof data!=="object"||!Array.isArray(data.stickers))
      throw Error("Saved project is missing its sticker layout.");
    if(data.stickers.length>500)throw Error("Project has too many placed items.");
    const size=pageSize();
    const restored=[];
    const used=new Set();
    for(const raw of data.stickers){
      if(!raw||typeof raw!=="object")throw Error("Project contains an invalid sticker.");
      const isText=raw.type==="text",isImage=raw.type==="image";
      if(!isText&&!isImage && raw.type!=="diagram" && raw.type!=="sticker" && raw.type!=null)
        throw Error("Project contains an unsupported sticker type.");
      if(!isText&&!isImage && (!raw.shape||!Array.isArray(raw.shape.frets)||raw.shape.frets.length!==6))
        throw Error("Project contains a chord sticker without fret data.");
      const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
      const id=Math.floor(number(raw.id,0));
      if(id<1||used.has(id))throw Error("Project has duplicate or missing sticker IDs.");
      used.add(id);
      const item={
        id,type:isText?"text":isImage?"image":"diagram",
        name:String(raw.name|| (isText?"Note":"Chord")).slice(0,100),
        page:Math.max(0,Math.min(100,Math.floor(number(raw.page,0)))),
        x:number(raw.x,0),y:number(raw.y,0),scale:Math.max(isImage?0.001:.2,Math.min(MAX_SCALE,number(raw.scale,1))),
        rotation:((number(raw.rotation,0)%360)+360)%360
      };
      if(isText){
        item.text=String(raw.text||"").slice(0,15000);
        item.w=Math.max(NOTE_MIN_W,Math.min(2500,number(raw.w,190)));
        item.h=Math.max(NOTE_MIN_H,Math.min(2500,number(raw.h,85)));
        item.fontSize=Math.max(8,Math.min(72,number(raw.fontSize,16)));
        item.bold=!!raw.bold;item.italic=!!raw.italic;
        item.align=["left","right","center"].includes(raw.align)?raw.align:"left";
        item.background=["transparent","#fff0ae","#d8edff","#fce0eb","#ddf5e2","#ffffff"].includes(raw.background)?raw.background:"transparent";
        item.color=/^#[0-9a-f]{6}$/i.test(raw.color||"")?raw.color:"#181818";
      }else if(isImage){
        if(typeof raw.src!=="string"||!/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw.src)||raw.src.length>9000000)
          throw Error("Project contains an unsupported or oversized image.");
        item.src=raw.src;
        item.w=Math.max(20,Math.min(3000,number(raw.w,200)));
        item.h=Math.max(20,Math.min(3000,number(raw.h,120)));
      }else{
        item.key=String(raw.key||"").slice(0,150);
        item.shape=structuredClone(raw.shape);
        item.showDiagram=raw.showDiagram!==false;
        item.showCode=raw.showCode===true;
        if(!item.showDiagram&&!item.showCode)item.showDiagram=true;
        item.code=typeof raw.code==="string"?raw.code.slice(0,50):fretCode([...raw.shape.frets].reverse());
      }
      restored.push(item);
    }
    closeNoteEditor();
    setNotePlacementMode(false);
    stickers=restored;history=[];redo=[];
    nextId=Math.max(1,...restored.map(item=>item.id))+1;
    const savedMode=data.trayMode||{diagram:true,codes:false};
    $("trayShowDiagrams").checked=savedMode.diagram!==false;
    $("trayShowCodes").checked=savedMode.codes===true;
    if(!$("trayShowDiagrams").checked&&!$("trayShowCodes").checked)$("trayShowDiagrams").checked=true;
    toggleStickerTray(!!data.trayOpen);
    refresh();
  }
  window.ChordLayout={init,refresh,reset,undo,redo:redoChange,clearAll,
    stickers:()=>structuredClone(stickers),exportProjectLayout,importProjectLayout,addImageSticker,updateImageSticker,editorPageBreaks};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();