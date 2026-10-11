"use strict";
/* Alternative importer + bookmarklet setup guidance. */
(function(){
 const $=id=>document.getElementById(id);
 function help(){
   $("bookmarkHelp").hidden=false;
   $("importDetails").open=true;
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
   const bookmark=$("bookmarklet");
   bookmark.addEventListener("click",event=>{event.preventDefault();help();});
   $("copyBookmarklet").addEventListener("click",copy);
   $("closeBookmarkHelp").addEventListener("click",()=>{$("bookmarkHelp").hidden=true;});
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