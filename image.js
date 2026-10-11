"use strict";
(function(){
const $=id=>document.getElementById(id),TYPES=/^image\/(png|jpeg|webp|gif)$/i;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let pending=null,session=null,drag=null,noticeTimer=null;
function notice(text,error=false,keep=false){
 clearTimeout(noticeTimer);
 const el=$("imagePlacementHint");$("imagePlacementText").textContent=text;
 el.hidden=!text;el.classList.toggle("error-notice",error);
 if(text&&!keep)noticeTimer=setTimeout(()=>{if(!pending&&!session)el.hidden=true;},6500);
}
function cancel(){pending=null;document.body.classList.remove("placing-image");notice("");}
function decode(src){return new Promise((ok,fail)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>fail(Error("This image cannot be decoded."));img.src=src;});}
function asUrl(file){return new Promise((ok,fail)=>{const r=new FileReader();r.onerror=()=>fail(Error("Could not read image."));r.onload=()=>ok(r.result);r.readAsDataURL(file);});}
function rotated(){return session.rotation%2?{w:session.h,h:session.w}:{w:session.w,h:session.h};}
function rotatedDrawing(ctx,img,x,y,w,h,turn){
 ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(turn*Math.PI/2);
 ctx.drawImage(img,-(turn%2?h:w)/2,-(turn%2?w:h)/2,turn%2?h:w,turn%2?w:h);ctx.restore();
}
function showPreview(){
 if(!session)return;
 const c=$("imageEditCanvas"),ctx=c.getContext("2d"),r=rotated();
 const k=Math.min((c.width-32)/r.w,(c.height-32)/r.h);
 const box={x:(c.width-r.w*k)/2,y:(c.height-r.h*k)/2,w:r.w*k,h:r.h*k};
 session.box=box;ctx.clearRect(0,0,c.width,c.height);
 ctx.fillStyle="#edf1f6";ctx.fillRect(0,0,c.width,c.height);
 rotatedDrawing(ctx,session.img,box.x,box.y,box.w,box.h,session.rotation);
 const crop=session.crop;
 if(crop){
  const x=box.x+crop.x*box.w,y=box.y+crop.y*box.h,w=crop.w*box.w,h=crop.h*box.h;
  ctx.fillStyle="#1b2d4370";ctx.fillRect(box.x,box.y,box.w,y-box.y);
  ctx.fillRect(box.x,y,x-box.x,h);ctx.fillRect(x+w,y,box.x+box.w-x-w,h);
  ctx.fillRect(box.x,y+h,box.w,box.y+box.h-y-h);
  ctx.strokeStyle="white";ctx.lineWidth=2;ctx.setLineDash([7,4]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
 }
 $("imageEditSummary").textContent=session.id==null?"Crop or rotate before placing":"Crop or rotate this sticker";
 $("imageEditNotice").textContent=session.w+" × "+session.h+" source · "+
  (session.large?"Large image — automatically optimized on Apply":"Crop and rotate are optional");
}
function coord(ev){
 const canvas=$("imageEditCanvas"),b=canvas.getBoundingClientRect(),q=session.box;
 return {x:clamp(((ev.clientX-b.left)*canvas.width/b.width-q.x)/q.w,0,1),
 y:clamp(((ev.clientY-b.top)*canvas.height/b.height-q.y)/q.h,0,1)};
}
function cropBetween(a,b){
 const w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);
 return w>.012&&h>.012?{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w,h}:null;
}
function closeDialog(){if($("imageEditDialog").open)$("imageEditDialog").close();session=null;drag=null;}
function edit(data,id=null,position=null){
 cancel();
 session={img:data.img,src:data.src,w:data.width,h:data.height,id,
  large:!!data.large,rotation:0,crop:null,position};
 if(!$("imageEditDialog").open)$("imageEditDialog").showModal();
 showPreview();
}
async function optimized(){
 const r=rotated(),crop=session.crop||{x:0,y:0,w:1,h:1};
 const k=Math.min(1,2400/r.w,2400/r.h,Math.sqrt(6000000/(r.w*r.h)));
 const full=document.createElement("canvas");
 full.width=Math.max(1,Math.round(r.w*k));full.height=Math.max(1,Math.round(r.h*k));
 rotatedDrawing(full.getContext("2d"),session.img,0,0,full.width,full.height,session.rotation);
 const w=Math.max(1,Math.round(crop.w*full.width)),h=Math.max(1,Math.round(crop.h*full.height));
 const out=document.createElement("canvas");out.width=w;out.height=h;
 out.getContext("2d").drawImage(full,
  clamp(Math.round(crop.x*full.width),0,full.width-w),
  clamp(Math.round(crop.y*full.height),0,full.height-h),
  w,h,0,0,w,h);
 const src=out.toDataURL("image/webp",.9);
 if(!src.startsWith("data:image/webp")||src.length>9000000)throw Error("Image is still too large. Select a smaller crop.");
 return {src,width:w,height:h};
}
function arm(data){
 cancel();pending=data;document.body.classList.add("placing-image");
 notice("Image ready — click a paper page to place it. Escape or × cancels.",false,true);
}
function place(page,x,y){
 if(!pending||!page)return;
 const r=page.querySelector(".paper-inside").getBoundingClientRect(),data=pending;
 const scale=Math.min(1,240/data.width,180/data.height,r.width/data.width,r.height/data.height);
 const pageIndex=[...document.querySelectorAll(".paper-page")].indexOf(page);
 const px=Math.round(x-r.left-data.width*scale/2),py=Math.round(y-r.top-data.height*scale/2);
 cancel();window.ChordLayout.addImageSticker(data.src,data.width,data.height,pageIndex,px,py);
}
async function fromFile(file,position){
 try{
  if(!file||!TYPES.test(file.type))throw Error("Choose PNG, JPEG, WebP or GIF.");
  if(file.size>64*1024*1024)throw Error("Image is over 64 MB; export to a smaller file.");
  const src=await new Promise((ok,fail)=>{const reader=new FileReader();
   reader.onerror=()=>fail(Error("Could not read image."));reader.onload=()=>ok(reader.result);reader.readAsDataURL(file);});
  const img=await decode(src),width=img.naturalWidth,height=img.naturalHeight;
  if(width*height>100000000||!width||!height)throw Error("Image exceeds the safe 100-megapixel decoding limit.");
  if(file.size>4*1024*1024||Math.max(width,height)>2400||width*height>6000000){
   edit({src,img,width,height,large:true},null,position);return;
  }
  pending={src,width,height};
  if(position)place(position.page,position.x,position.y);else arm({src,width,height});
 }catch(e){notice("Image import: "+e.message,true);}
}
async function editSticker(id){
 try{
  const record=window.ChordLayout.stickers().find(s=>s.id===id&&s.type==="image");
  if(!record)return;
  const img=await decode(record.src);
  edit({src:record.src,img,width:img.naturalWidth,height:img.naturalHeight},id);
 }catch(e){notice("Image edit: "+e.message,true);}
}
async function apply(){
 if(!session)return;
 const button=$("imageEditApply");button.disabled=true;
 try{
  const result=await optimized(),id=session.id,position=session.position;
  closeDialog();
  if(id!=null)window.ChordLayout.updateImageSticker(id,result.src,result.width,result.height);
  else if(position){
    pending=result;place(position.page,position.x,position.y);
  }else arm(result);
 }catch(e){$("imageEditNotice").textContent=e.message;}
 finally{button.disabled=false;}
}
function imageFrom(dt){
 return [...(dt?.files||[])].find(f=>TYPES.test(f.type))||
  [...(dt?.items||[])].filter(i=>i.kind==="file").map(i=>i.getAsFile()).find(f=>f&&TYPES.test(f.type));
}
function init(){
 for(const id of ["importImageBtn","trayImportImage"])$(id).addEventListener("click",()=>{
   window.ChordMobilePages?.edit();
   $("imageFile").click();
 });
 $("imageFile").addEventListener("change",e=>{
  const file=e.target.files?.[0];e.target.value="";if(file)fromFile(file);
 });
 $("imagePlacementDismiss").addEventListener("pointerdown",event=>{
   event.stopPropagation();cancel();
 });
 $("imagePlacementDismiss").addEventListener("click",cancel);
 $("imageEditClose").addEventListener("click",closeDialog);
 $("imageEditCancel").addEventListener("click",closeDialog);
 $("imageEditApply").addEventListener("click",apply);
 $("imageEditDialog").addEventListener("cancel",ev=>{ev.preventDefault();closeDialog();});
 for(const [id,amount] of [["imageRotateLeft",-1],["imageRotateRight",1]]){
  $(id).addEventListener("click",()=>{
   if(!session)return;session.rotation=(session.rotation+amount+4)%4;session.crop=null;showPreview();
  });
 }
 $("imageCropReset").addEventListener("click",()=>{if(session){session.crop=null;showPreview();}});
 const canvas=$("imageEditCanvas");
 canvas.addEventListener("pointerdown",e=>{
  if(!session||e.button!==0)return;drag={id:e.pointerId,start:coord(e)};
  canvas.setPointerCapture(e.pointerId);e.preventDefault();
 });
 canvas.addEventListener("pointermove",e=>{
  if(drag&&e.pointerId===drag.id){session.crop=cropBetween(drag.start,coord(e));showPreview();}
 });
 canvas.addEventListener("pointerup",e=>{
  if(drag&&e.pointerId===drag.id){session.crop=cropBetween(drag.start,coord(e));drag=null;showPreview();}
 });
 document.addEventListener("pointerdown",e=>{
  if(!pending||e.button!==0)return;const page=e.target.closest(".paper-page");if(!page)return;
  e.preventDefault();e.stopImmediatePropagation();place(page,e.clientX,e.clientY);
 },true);
 document.addEventListener("dragover",e=>{
  if(e.target.closest(".paper-page")&&e.dataTransfer?.types?.includes("Files")){
   e.preventDefault();e.dataTransfer.dropEffect="copy";
  }
 },true);
 document.addEventListener("drop",e=>{
  const page=e.target.closest(".paper-page"),file=imageFrom(e.dataTransfer);
  if(!page||!file)return;e.preventDefault();e.stopImmediatePropagation();
  fromFile(file,{page,x:e.clientX,y:e.clientY});
 },true);
 document.addEventListener("paste",e=>{
  if(e.target.closest("#songEditor,#noteText,input,textarea,[contenteditable]"))return;
  const file=imageFrom(e.clipboardData);if(!file)return;e.preventDefault();
  const page=e.target.closest(".paper-page"),r=page?.getBoundingClientRect();
  fromFile(file,page?{page,x:r.left+r.width/2,y:r.top+r.height/2}:null);
 },true);
 document.addEventListener("keydown",e=>{
  if(pending&&e.key==="Escape"){e.preventDefault();cancel();}
 },true);
}
window.ChordImages={arm,cancel,editSticker,fromFile,optimized};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();