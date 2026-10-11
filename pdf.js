"use strict";
/* Browser cannot set the native print destination. This creates a PDF directly.
   Images/text are captured at 2.5x for printable fidelity. */
(function(){
 const $=id=>document.getElementById(id);
 let busy=false;
 function loadScript(url,ready){
  return new Promise((ok,fail)=>{
   if(ready())return ok();
   const src=document.createElement("script");src.src=url;
   src.onload=()=>ready()?ok():fail(Error("PDF library did not initialize."));
   src.onerror=()=>fail(Error("Could not load the PDF exporter. Check your internet connection."));
   document.head.append(src);
  });
 }
 async function ensureLibraries(){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    ()=>typeof window.html2canvas==="function");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    ()=>!!window.jspdf?.jsPDF);
 }
 function setStatus(text){
  const el=$("pdfExportStatus");if(!el)return;
  el.hidden=!text;el.textContent=text;
 }
 async function exportPdf(){
  if(busy)return;
  busy=true;
  const button=$("exportPdfBtn");button.disabled=true;
  try{
   if(typeof applySongEdit==="function")applySongEdit(true);
   window.ChordLayout?.refresh();
   setStatus("Preparing PDF export…");
   await ensureLibraries();
   const pages=[...document.querySelectorAll("#printPage .paper-page")];
   if(!pages.length)throw Error("There are no printable pages.");
   if(pages.length>50)throw Error("This project has too many pages for direct PDF export.");
   const format=$("paperSize").value==="a4"?"a4":"letter";
   const {jsPDF}=window.jspdf;
   const pdf=new jsPDF({orientation:"portrait",unit:"pt",format,compress:true});
   const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();
   for(let i=0;i<pages.length;i++){
    setStatus("Creating PDF — page "+(i+1)+" of "+pages.length+"…");
    // Match the visible page, not a second independently paginated document.
    const canvas=await window.html2canvas(pages[i],{
      backgroundColor:"#ffffff",scale:2.5,useCORS:false,
      logging:false,scrollX:0,scrollY:-window.scrollY,
      ignoreElements:el=>el.classList?.contains("no-print")||
        el.classList?.contains("sticker-delete")||el.classList?.contains("sticker-resize")
    });
    if(i)pdf.addPage(format,"portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg",.94),"JPEG",0,0,w,h,
      undefined,"FAST");
    // Allow the UI to update after each page.
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   const raw=($("songName")?.textContent||"ChordStudio-song")
     .replace(/[^\w -]+/g,"").trim().replace(/\s+/g,"-").slice(0,75);
   pdf.save((raw||"ChordStudio")+".pdf");
   setStatus("PDF downloaded. For selectable text, use Print → Save as PDF.");
   setTimeout(()=>setStatus(""),9000);
  }catch(e){
   setStatus("PDF export failed: "+e.message+" — you can still use Print / PDF.");
  }finally{busy=false;button.disabled=false;}
 }
 function print(){
  if(typeof applySongEdit==="function")applySongEdit(true);
  window.print(); // Browser chooses its native/remembered printer destination.
 }
 function init(){
  $("filePrintBtn").addEventListener("click",print);
  $("exportPdfBtn").addEventListener("click",exportPdf);
 }
 window.ChordPDF={exportPdf};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();