"use strict";
/* Alternative importer + bookmarklet setup guidance. */
(function(){
 const $=id=>document.getElementById(id);
 const devicePlatform=()=>{
   const ua=navigator.userAgent||"";
   if(/Android/i.test(ua))return "android";
   if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))return "ios";
   return "desktop";
 };
 function selectPlatform(platform){
   for(const button of document.querySelectorAll("[data-bookmark-platform]")){
     button.setAttribute("aria-pressed",String(button.dataset.bookmarkPlatform===platform));
   }
   for(const guide of document.querySelectorAll("[data-bookmark-guide]")){
     guide.hidden=guide.dataset.bookmarkGuide!==platform;
   }
 }
 function help(){
   $("importDetails").open=true;
   $("bookmarkHelp").hidden=false;
   $("showImportHelp").setAttribute("aria-expanded","true");
 }
 async function copy(){
   const data=$("bookmarklet").href;
   try{
     await navigator.clipboard.writeText(data);
     message("Bookmarklet code copied. Add a bookmark named ChordStudio and paste it into its URL field.");
   }catch(error){
     const field=document.createElement("textarea");
     field.value=data;field.setAttribute("aria-label","Bookmarklet code");
     field.style.position="fixed";field.style.opacity="0";document.body.append(field);
     field.select();
     const copied=document.execCommand("copy");field.remove();
     message(copied?"Bookmarklet code copied — paste it into a bookmark's URL.":"Use the yellow link's drag-to-bookmarks action.",!copied);
   }
 }
 async function fromUrl(value){
   let url;
   try{url=new URL(value);}catch{throw Error("Enter a complete http:// or https:// URL.");}
   if(!["http:","https:"].includes(url.protocol))throw Error("Only http and https URLs are supported.");
   $("importPaste").disabled=true;
   try{
     message("Trying to read the song page from its URL…");
     const response=await fetch(url.href,{mode:"cors",redirect:"follow",credentials:"omit",signal:AbortSignal.timeout(16000)});
     if(!response.ok)throw Error("The source returned HTTP "+response.status);
     const html=await response.text();
     if(html.length>6000000)throw Error("Source page is too large.");
     const data=normalizeSource(html);data.source=url.href;
     loadPage(data);
     message("Imported from the pasted URL.");
   }catch(err){
     const open=$("sourceOpenFromPaste");
     open.hidden=false;open.href=url.href;
     throw Error("This site could not read that URL directly ("+err.message+"). Open the song in a new tab and use the ↗ ChordStudio bookmark on that page, or import saved HTML/JSON.");
   }finally{$("importPaste").disabled=false;}
 }
 function init(){
   const platform=devicePlatform();
   selectPlatform(platform);
   for(const button of document.querySelectorAll("[data-bookmark-platform]")){
     button.addEventListener("click",()=>selectPlatform(button.dataset.bookmarkPlatform));
   }
   if(platform==="android"){
     $("importStartHint").textContent="On Android Chrome, set up the ChordStudio bookmark once, then run it from the address bar on a song page.";
     $("showImportHelp").textContent="How to import on Android";
   }else if(platform==="ios"){
     $("importStartHint").textContent="On iPhone or iPad, set up a Safari bookmarklet to import from a song's chord page.";
     $("showImportHelp").textContent="How to import on iPhone / iPad";
   }
   const bookmark=$("bookmarklet");
   bookmark.addEventListener("click",event=>{event.preventDefault();help();});
   bookmark.addEventListener("dragstart",event=>{
     // Chromium's default drag preview often captures surrounding card content.
     // Keep the real javascript: bookmark target; only replace the visual ghost.
     const ghost=document.createElement("span");
     ghost.textContent="↗ ChordStudio";
     ghost.className="bookmark-drag-ghost";
     document.body.append(ghost);
     if(event.dataTransfer?.setDragImage){
       event.dataTransfer.setDragImage(ghost,ghost.offsetWidth/2,ghost.offsetHeight/2);
     }
     requestAnimationFrame(()=>ghost.remove());
   });
   $("showImportHelp").addEventListener("click",()=>{
     help();
     $("bookmarkHelp").scrollIntoView({behavior:"smooth",block:"nearest"});
   });
   $("copyBookmarklet").addEventListener("click",copy);
   $("closeBookmarkHelp").addEventListener("click",()=>{
     $("bookmarkHelp").hidden=true;
     $("showImportHelp").setAttribute("aria-expanded","false");
   });
   $("importPaste").addEventListener("click",event=>{
     const value=$("sourcePaste").value.trim();
     if(!/^https?:\/\/\S+$/i.test(value))return;
     event.preventDefault();event.stopImmediatePropagation();
     fromUrl(value).catch(e=>message("URL import: "+e.message,true));
   },true);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();