"use strict";
/* Images are local, embedded project stickers. Never fetch remote image URLs. */
(function(){
  const $=id=>document.getElementById(id);
  const MAX_BYTES=4*1024*1024;
  let pending=null;
  function pageAtPoint(x,y){
    return document.elementFromPoint(x,y)?.closest(".paper-page")||null;
  }
  function pagePoint(page,x,y,center=false){
    const pages=[...document.querySelectorAll("#printPage .paper-page")];
    const r=page.querySelector(".paper-inside").getBoundingClientRect();
    const scale=center?Math.min(1,240/pending.width,180/pending.height,
      r.width/pending.width,r.height/pending.height):1;
    return {page:pages.indexOf(page),x:Math.round(x-r.left-(center?pending.width*scale/2:0)),
      y:Math.round(y-r.top-(center?pending.height*scale/2:0))};
  }
  function readFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(Error("Could not read image."));
      reader.onload=()=>resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
  async function loadImage(file){
    if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))
      throw Error("Choose a PNG, JPEG, WebP, or GIF image.");
    if(file.size>MAX_BYTES)throw Error("Image is too large (maximum 4 MB).");
    const src=await readFile(file);
    const dimensions=await new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});
      img.onerror=()=>reject(Error("This image could not be decoded."));
      img.src=src;
    });
    if(!dimensions.width||!dimensions.height||dimensions.width*dimensions.height>24000000)
      throw Error("Image dimensions are unsupported or too large.");
    return {...dimensions,src};
  }
  function announce(text,error=false){
    const banner=$("imagePlacementHint");
    if(banner){banner.textContent=text;banner.hidden=!text;}
    if(text&&typeof message==="function")message(text,error);
  }
  function armImage(data){
    pending=data;
    document.body.classList.add("placing-image");
    announce("Image ready — click any printable page to place it. Press Escape to cancel.");
  }
  function cancelImage(){
    pending=null;document.body.classList.remove("placing-image");
    announce("");
  }
  function place(page,x,y){
    if(!pending||!page)return false;
    const point=pagePoint(page,x,y,true);
    if(point.page<0)return false;
    const data=pending;
    cancelImage();
    window.ChordLayout.addImageSticker(data.src,data.width,data.height,
      point.page,point.x,point.y);
    return true;
  }
  function fileFromTransfer(dt){
    if(!dt)return null;
    return [...(dt.files||[])].find(f=>/^image\/(png|jpeg|webp|gif)$/.test(f.type))||null;
  }
  async function insertDrop(event){
    const page=event.target.closest(".paper-page");
    if(!page||!event.dataTransfer)return;
    const file=fileFromTransfer(event.dataTransfer);
    if(!file)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const data=await loadImage(file);
      pending=data;place(page,event.clientX,event.clientY);
    }catch(e){announce("Image import failed: "+e.message,true);}
  }
  async function insertPaste(event){
    if(!event.clipboardData)return;
    const target=event.target;
    if(target.closest("#songEditor,#noteText,input,textarea,[contenteditable]"))return;
    const file=fileFromTransfer(event.clipboardData);
    const item=file||[...event.clipboardData.items].filter(i=>i.kind==="file").map(i=>i.getAsFile()).find(f=>f&&/^image\/(png|jpeg|webp|gif)$/.test(f.type));
    if(!item)return;
    event.preventDefault();
    try{
      const data=await loadImage(item);
      const page=target.closest(".paper-page");
      if(page){
        const rect=page.getBoundingClientRect();
        pending=data;place(page,rect.left+rect.width/2,rect.top+rect.height/2);
      }else armImage(data);
    }catch(e){announce("Image paste failed: "+e.message,true);}
  }
  function init(){
    $("importImageBtn").addEventListener("click",()=>$("imageFile").click());
    $("imageFile").addEventListener("change",async event=>{
      const file=event.target.files?.[0];event.target.value="";
      if(!file)return;
      try{armImage(await loadImage(file));}
      catch(e){announce("Image import failed: "+e.message,true);}
    });
    document.addEventListener("pointerdown",event=>{
      if(!pending||event.button!==0)return;
      const page=event.target.closest(".paper-page");
      if(!page)return;
      event.preventDefault();event.stopImmediatePropagation();
      place(page,event.clientX,event.clientY);
    },true);
    document.addEventListener("dragover",event=>{
      if(event.target.closest(".paper-page")&&event.dataTransfer?.types?.includes("Files")){
        event.preventDefault();event.dataTransfer.dropEffect="copy";
      }
    },true);
    document.addEventListener("drop",insertDrop,true);
    document.addEventListener("paste",insertPaste,true);
    document.addEventListener("keydown",event=>{
      if(pending&&event.key==="Escape"){event.preventDefault();cancelImage();}
    },true);
    for(const id of ["filePrintBtn","exportPdfBtn"]){
      $(id).addEventListener("click",()=>{
        if(typeof applySongEdit==="function")applySongEdit(true);
        window.print(); // Choose Save as PDF in the system print dialog for export.
      });
    }
  }
  window.ChordImages={armImage,cancelImage,loadImage};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
