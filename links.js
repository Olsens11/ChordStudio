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
    $("linkCaption").value=found?.caption||"Open link";
    document.querySelector('input[name="linkStyle"][value="'+(found?.linkStyle||"both")+'"]').checked=true;
    $("linkConfirm").textContent=found?"Apply changes":"Insert sticker";
    $("linkOpen").hidden=!found;
    $("linkError").hidden=true;
    captionVisibility();
    $("linkDialog").showModal();
    $("linkUrl").focus();
  }
  function close(){$("linkDialog").close();editing=null;}
  const imageSize=mode=>({
    w:mode==="text"?210:136,
    h:mode==="text"?38:mode==="both"?168:136
  });
  // QR modules and the caption are drawn into a single 4x bitmap so both
  // enlarge uniformly and the caption never becomes a clipped CSS overlay.
  function artwork(url,mode,caption){
    if(mode!=="text"&&typeof QRCode!=="function")
      throw Error("QR generator has not loaded. Reload ChordStudio.");
    const {w,h}=imageSize(mode),canvas=document.createElement("canvas"),scale=4;
    canvas.width=w*scale;canvas.height=h*scale;
    const ctx=canvas.getContext("2d");ctx.scale(scale,scale);
    if(mode!=="text"){
      const host=document.createElement("div");
      host.style.cssText="position:absolute;left:-9999px;top:0";
      document.body.append(host);
      try{
        new QRCode(host,{text:url,width:512,height:512,colorDark:"#111111",
          colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
        const qr=host.querySelector("canvas");
        if(!qr)throw Error("QR code could not be generated.");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,136,136);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(qr,8,8,120,120);
        ctx.imageSmoothingEnabled=true;
      }finally{host.remove();}
    }
    if(mode!=="qr"){
      const text=String(caption||"Open link").trim()||"Open link";
      const maxWidth=w-12,maxLines=mode==="text"?2:2;
      let lines=[],font=13;
      // Use actual canvas metrics to fit up to two complete lines before
      // applying a smaller font, rather than truncating the default caption.
      for(;font>=8;font--){
        ctx.font="700 "+font+"px Arial, sans-serif";
        lines=[];let current="";
        for(const word of text.split(/\s+/)){
          const candidate=current?current+" "+word:word;
          if(ctx.measureText(candidate).width<=maxWidth){current=candidate;continue;}
          if(current){lines.push(current);current="";}
          // Very long unbroken URLs/words can wrap at character boundaries.
          for(const char of word){
            const attempt=current+char;
            if(current&&ctx.measureText(attempt).width>maxWidth){
              lines.push(current);current=char;
            }else current=attempt;
          }
        }
        if(current)lines.push(current);
        if(lines.length<=maxLines)break;
      }
      if(lines.length>maxLines){
        lines=lines.slice(0,maxLines);
        let last=lines[maxLines-1];
        while(last&&ctx.measureText(last+"…").width>maxWidth)last=last.slice(0,-1);
        lines[maxLines-1]=last+"…";
      }
      ctx.fillStyle="#2358a0";ctx.font="700 "+font+"px Arial, sans-serif";
      ctx.textAlign="center";ctx.textBaseline="middle";
      const lineHeight=font*1.17,center=mode==="text"?h/2:149;
      lines.forEach((line,i)=>ctx.fillText(line,w/2,center+(i-(lines.length-1)/2)*lineHeight,maxWidth));
    }
    return canvas.toDataURL("image/png");
  }
  function apply(){
    const url=valid($("linkUrl").value);
    if(!url||url.length>2048){
      $("linkError").textContent="Enter a complete http:// or https:// URL (up to 2,048 characters).";
      $("linkError").hidden=false;return;
    }
    const mode=style();
    try{
      const source=artwork(url,mode,$("linkCaption").value);
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
    $("includeSourceFooter").addEventListener("change",()=>{
      $("repeatSourceFooter").disabled=!$("includeSourceFooter").checked;
      window.ChordLayout?.refresh();
    });
    for(const id of ["repeatSongHeader","repeatSourceFooter","showPageNumbers"]){
      $(id).addEventListener("change",()=>window.ChordLayout?.refresh());
    }
  }
  window.ChordLinks={edit:id=>open(id)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();