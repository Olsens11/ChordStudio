"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const STICKER_W=104,STICKER_H=107,MIN_SCALE=.4,MAX_SCALE=3.5;
  const stickerScale=record=>Math.max(MIN_SCALE,Number(record.scale)||1);
  const stickerWidth=record=>(record.type==="text"||record.noteType==="text")?(record.w||190):STICKER_W*stickerScale(record);
  const stickerHeight=record=>(record.type==="text"||record.noteType==="text")?(record.h||85):STICKER_H*stickerScale(record);
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
    for(const item of rendered){
      const card=document.createElement("div");card.className="chord-card";
      card.dataset.diagramKey=diagramKey(item);
      card.title="Drag onto a page to place another "+item.name+" diagram";
      card.setAttribute("aria-label","Drag "+item.name+" onto a page");
      const name=document.createElement("div");name.className="chord-name";name.textContent=item.name;
      const art=document.createElement("div");art.className="diagram-art";
      art.append(makeDiagramCanvas(item.source));
      card.append(name,art);
      grid.append(card);
    }
    if(!rendered.length){
      const note=document.createElement("p");note.textContent="No diagrams selected.";
      grid.append(note);
    }
  }
  function toggleStickerTray(open){
    $("stickerBoard").hidden=!open;
    $("toggleStickerBoard").setAttribute("aria-expanded",String(open));
    $("toggleStickerBoard").textContent=open?"🎸 Hide sticker tray":"🎸 Open sticker tray";
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
    $("noteBackground").value=record.background||"#fff0ae";
    $("noteColor").value=record.color||"#18365f";
    positionNoteEditor();
    if(focus)$("noteText").focus({preventScroll:true});
  }
  function noteStyle(content,record){
    content.style.color=record.color||"#18365f";
    content.style.background=record.background||"#fff0ae";
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
    const x=Math.max(0,Math.min(size.innerWidth-w,Math.round(ev.clientX-rect.left)));
    const y=Math.max(0,Math.min(size.innerHeight-h,Math.round(ev.clientY-rect.top)));
    const note={id:nextId++,type:"text",name:"Note",text:"",page:pages.indexOf(page),x,y,w,h,
      fontSize:16,bold:false,italic:false,align:"left",color:"#18365f",background:"#fff0ae"};
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
    const isText=record.type==="text";
    const el=document.createElement("div");el.className="paper-sticker"+(isText?" text-sticker":"");
    el.dataset.stickerId=record.id;el.draggable=false;el.tabIndex=0;
    el.setAttribute("aria-label",isText?"Text note. Click to edit, drag to move, corner to resize. Shift click to duplicate.":"Placed "+record.name+" diagram. Shift click to duplicate, drag to move, corner to resize.");
    el.title=isText?"Click to edit note · drag to move · corner resizes · Shift+click copies":
      "Drag to move · Shift+click copies · Ctrl+Shift snaps to 5px grid · corner resizes";
    el.style.left=record.x+"px";el.style.top=record.y+"px";
    el.style.width=stickerWidth(record)+"px";el.style.height=stickerHeight(record)+"px";
    if(isText){
      const content=document.createElement("div");content.className="note-content";
      content.textContent=record.text||"";
      noteStyle(content,record);el.append(content);
      el.addEventListener("click",ev=>{
        if(!ev.shiftKey&&!ev.ctrlKey&&!ev.altKey&&ev.target.closest(".paper-sticker")===el){
          openNoteEditor(record.id);
        }
      });
    }else{
      const inner=document.createElement("div");inner.className="sticker-inner";
      inner.style.transform="scale("+stickerScale(record)+")";
      const name=document.createElement("div");name.className="chord-name";name.textContent=record.name;
      const art=document.createElement("div");art.className="diagram-art";
      art.append(makeDiagramCanvas(record.shape));inner.append(name,art);el.append(inner);
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
    el.append(remove,resize);
    el.addEventListener("keydown",ev=>{
      if(ev.key==="Delete"||ev.key==="Backspace"){
        ev.preventDefault();save();stickers=stickers.filter(item=>item.id!==record.id);
        if(activeNoteId===record.id)closeNoteEditor();refresh();
      }else if(ev.key==="Enter"&&isText){
        ev.preventDefault();openNoteEditor(record.id,{focus:true});
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
      if(record.type==="text"){
        record.w=Math.max(NOTE_MIN_W,Math.min(record.w||190,size.innerWidth));
        record.h=Math.max(NOTE_MIN_H,Math.min(record.h||85,size.innerHeight));
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
    if(state.noteType==="text"){
      const content=document.createElement("div");content.className="note-content";
      content.textContent=state.text||"";noteStyle(content,state);
      el.append(content);
    }else{
      const inner=document.createElement("div");inner.className="sticker-inner";
      inner.style.transform="scale("+stickerScale(state)+")";
      const title=document.createElement("div");title.className="chord-name";title.textContent=state.name;
      const art=document.createElement("div");art.className="diagram-art";
      art.append(makeDiagramCanvas(state.shape));inner.append(title,art);el.append(inner);
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
  function pointToPaper(ev,inside,record){
    const rect=inside.getBoundingClientRect(),size=pageSize();
    const offsetX=record.type==="sticker"?record.offsetX:STICKER_W/2;
    const offsetY=record.type==="sticker"?record.offsetY:20;
    const snap=!!(record.ctrlKey&&record.shiftKey);
    return {
      x:snapValue(ev.clientX-rect.left-offsetX,size.innerWidth-stickerWidth(record),snap),
      y:snapValue(ev.clientY-rect.top-offsetY,size.innerHeight-stickerHeight(record),snap)
    };
  }
  function beginSortPreview(state){
    if(state.type!=="bank"||state.bankOrigin!=="top")return;
    const source=state.source;
    if(!source?.isConnected)return;
    const slot=document.createElement("div");
    slot.className="chord-reorder-slot";
    source.replaceWith(slot);
    $("chordGrid").classList.add("chord-bank-sorting");
    state.sort={source,slot};
  }
  function updateSortPreview(state){
    const sort=state.sort;if(!sort)return;
    const grid=$("chordGrid"),bounds=grid.getBoundingClientRect();
    if(state.x<bounds.left-8||state.x>bounds.right+8||state.y<bounds.top-12||state.y>bounds.bottom+12)return;
    const cards=[...grid.querySelectorAll(".chord-card")];
    if(!cards.length)return;
    let closest=null,min=Infinity;
    for(const card of cards){
      const r=card.getBoundingClientRect();
      const dx=state.x-(r.left+r.width/2),dy=state.y-(r.top+r.height/2);
      const d=dx*dx+dy*dy*2;
      if(d<min){min=d;closest=card;}
    }
    if(!closest)return;
    const r=closest.getBoundingClientRect();
    const after=state.x>r.left+r.width/2;
    if((after?closest.nextElementSibling===sort.slot:closest.previousElementSibling===sort.slot))return;
    const before=new Map(cards.map(card=>[card,card.getBoundingClientRect()]));
    if(after)closest.after(sort.slot);else closest.before(sort.slot);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    for(const card of cards){
      const a=before.get(card),b=card.getBoundingClientRect();
      const dx=a.left-b.left,dy=a.top-b.top;
      if(Math.abs(dx)>.5||Math.abs(dy)>.5){
        card.getAnimations().forEach(animation=>animation.cancel());
        card.animate([{transform:"translate("+dx+"px,"+dy+"px)"},{transform:"translate(0,0)"}],
          {duration:170,easing:"ease-out"});
      }
    }
  }
  function sortDropDestination(state){
    const slot=state.sort?.slot;
    if(!slot||!slot.parentElement)return null;
    return slot.nextElementSibling?.dataset.diagramKey
      ?{key:slot.nextElementSibling.dataset.diagramKey,after:false}
      :slot.previousElementSibling?.dataset.diagramKey
      ?{key:slot.previousElementSibling.dataset.diagramKey,after:true}:null;
  }
  function restoreSortPreview(state){
    if(!state?.sort)return;
    const {slot,source}=state.sort,grid=$("chordGrid");
    if(slot.isConnected)slot.replaceWith(source);
    // A preview is only DOM movement; restore the committed order if canceled
    // or if the same bank item was instead dropped onto a paper page.
    const cards=new Map([...grid.querySelectorAll(".chord-card")].map(card=>[card.dataset.diagramKey,card]));
    for(const item of rendered){
      const card=cards.get(diagramKey(item));
      if(card)grid.append(card);
    }
    grid.classList.remove("chord-bank-sorting");
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
      initialW:record.w,initialH:record.h,isText:record.type==="text",
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
      const size=pageSize();
      const w=Math.max(NOTE_MIN_W,Math.min(size.innerWidth-record.x,Math.round(state.initialW+ev.clientX-state.startX)));
      const h=Math.max(NOTE_MIN_H,Math.min(size.innerHeight-record.y,Math.round(state.initialH+ev.clientY-state.startY)));
      if(w===record.w&&h===record.h)return;
      state.started=true;record.w=w;record.h=h;
      state.element.style.width=w+"px";state.element.style.height=h+"px";
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
  function startPointerDrag(ev){
    if(pointerDrag||!ev.isPrimary||ev.button!==0||placingNote)return;
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
        noteType:record.type==="text"?"text":"diagram",w:record.w,h:record.h,
        text:record.text,fontSize:record.fontSize,bold:record.bold,italic:record.italic,
        align:record.align,color:record.color,background:record.background,
        offsetX:ev.clientX-box.left,offsetY:ev.clientY-box.top};
      if(record.type==="text")closeNoteEditor();
    }else{
      const key=source.dataset.diagramKey;
      const item=findItem(key);
      if(!item)return;
      model={type:"bank",key,name:item.name,shape:item.source,bankOrigin:source.closest("#chordGrid")?"top":source.closest("#stickerBoardGrid")?"tray":"paper",source};
    }
    pointerDrag={...model,pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:ev.clientX,startY:ev.clientY,ctrlKey:ev.ctrlKey,shiftKey:ev.shiftKey,started:false,ghost:null};
    document.addEventListener("pointermove",movePointerDrag,{capture:true,passive:false});
    document.addEventListener("pointerup",endPointerDrag,true);
    document.addEventListener("pointercancel",cancelPointerDrag,true);
  }
  function movePointerDrag(ev){
    const state=pointerDrag;
    if(!state||ev.pointerId!==state.pointerId)return;
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
    if(state.type==="resize"){
      ev.preventDefault();
      const record=stickers.find(item=>item.id===state.id);
      if(record&&(state.isText?(record.w!==state.initialW||record.h!==state.initialH):Math.abs(stickerScale(record)-state.initialScale)>.001)){
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
              stickers.push({id:nextId++,name:item.name,key:state.key,shape:structuredClone(item.source),scale:1,page:pageIndex,...point});
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
    if(pointerDrag.type==="resize"){
      const record=stickers.find(item=>item.id===pointerDrag.id);
      if(record){if(pointerDrag.isText){record.w=pointerDrag.initialW;record.h=pointerDrag.initialH;}else record.scale=pointerDrag.initialScale;}
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
  window.ChordLayout={init,refresh,reset,undo,redo:redoChange,clearAll,stickers:()=>structuredClone(stickers)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();