"use strict";
/* Link/QR stickers use the same movable, printable project model as other stickers. */
(function(){
  const $=id=>document.getElementById(id);
  let editing=null;
  const valid=value=>{
    try{const url=new URL(String(value).trim());
      return ["http:","https:"].includes(url.protocol)?url.href:"";
    }catch{return "";}
  };
  function style(){return document.querySelector('input[name="linkStyle"]:checked')?.value||"both";}
  function captionVisibility(){$("linkCaptionRow").hidden=style()==="qr";}
  function open(id=null){
    editing=id;
    const found=id==null?null:window.ChordLayout.stickers().find(item=>item.id===id&&item.type==="link");
    $("linkHeading").textContent=found?"Edit QR code / link":"Insert QR code / link";
    $("linkUrl").value=found?.url||"";
    $("linkCaption").value=found?.caption||"Watch this performance";
    document.querySelector('input[name="linkStyle"][value="'+(found?.linkStyle||"both")+'"]').checked=true;
    $("linkConfirm").textContent=found?"Apply changes":"Insert sticker";
    $("linkOpen").hidden=!found;
    $("linkError").hidden=true;
    captionVisibility();
    $("linkDialog").showModal();
    $("linkUrl").focus();
  }
  function close(){$("linkDialog").close();editing=null;}
  function qrImage(url){
    if(typeof QRCode!=="function")throw Error("QR generator has not loaded. Reload ChordStudio.");
    const host=document.createElement("div");
    host.style.cssText="position:absolute;left:-9999px;top:0";
    document.body.append(host);
    try{
      new QRCode(host,{text:url,width:512,height:512,colorDark:"#111111",
        colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
      const canvas=host.querySelector("canvas");
      if(!canvas)throw Error("QR canvas could not be created.");
      return canvas.toDataURL("image/png");
    }finally{host.remove();}
  }
  function apply(){
    const url=valid($("linkUrl").value);
    if(!url||url.length>2048){
      $("linkError").textContent="Enter a complete http:// or https:// URL (up to 2,048 characters).";
      $("linkError").hidden=false;return;
    }
    const mode=style();
    try{
      const source=mode==="text"?"":qrImage(url);
      if(editing==null)window.ChordLayout.addLinkSticker(url,mode,$("linkCaption").value,source);
      else window.ChordLayout.updateLinkSticker(editing,url,mode,$("linkCaption").value,source);
      close();window.ChordWorkflow?.activate("new-preview");
    }catch(error){
      $("linkError").textContent=error.message;$("linkError").hidden=false;
    }
  }
  function init(){
    $("insertLinkBtn").addEventListener("click",()=>open());
    $("linkConfirm").addEventListener("click",apply);
    $("linkOpen").addEventListener("click",()=>{
      const url=valid($("linkUrl").value);
      if(url)window.open(url,"_blank","noopener,noreferrer");
    });
    $("linkClose").addEventListener("click",close);
    $("linkCancel").addEventListener("click",close);
    $("linkDialog").addEventListener("cancel",e=>{e.preventDefault();close();});
    document.querySelectorAll('input[name="linkStyle"]').forEach(input=>input.addEventListener("change",captionVisibility));
    $("insertTextBtn").addEventListener("click",()=>{
      if($("stickerBoard").hidden)$("toggleStickerBoard").click();
      $("addTextNote").click();
    });
    $("insertChordBtn").addEventListener("click",()=>{
      if($("stickerBoard").hidden)$("toggleStickerBoard").click();
      window.ChordWorkflow?.focusPaper();
    });
    $("includeSourceFooter").addEventListener("change",()=>window.ChordLayout?.refresh());
  }
  window.ChordLinks={edit:id=>open(id)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();