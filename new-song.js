"use strict";
/* Blank song creation and the shared Song details & credits dialog. */
(function(){
 const $=id=>document.getElementById(id);
 let dialogMode="edit";
 const newDetails=()=>({
   title:$("newSongTitle").value.trim(),
   writtenBy:$("newSongArtist").value.trim(),
   arrangedBy:"",
   performedBy:""
 });
 const formDetails=()=>({
   title:$("songDetailsTitle").value.trim(),
   writtenBy:$("songDetailsWritten").value.trim(),
   arrangedBy:$("songDetailsArranged").value.trim(),
   performedBy:$("songDetailsArtist").value.trim()
 });
 function hasUnsavedSheet(){
   if(!page)return false;
   return !!(
     $("songLines").textContent.trim()||
     $("songEditor").textContent.trim()||
     $("chordEditor").value.trim()||
     window.ChordLayout?.stickers()?.length);
 }
 function create(values=newDetails()){
   if(hasUnsavedSheet()&&!window.confirm(
     "Start a new song? This replaces the current sheet. Save your project first if you want to keep your work."))return false;
   const title=values.title||"Untitled song";
   window.ChordSong.startBlankSong(title,"",true,true,{
     writtenBy:values.writtenBy,arrangedBy:values.arrangedBy,performedBy:values.performedBy
   });
   if(title==="Untitled song")message("Your song is ready. Add a title or credits anytime from Edit → Song details & credits.");
   return true;
 }
 function showDetails(values,mode,focusField){
   dialogMode=mode;
   $("songDetailsTitle").value=values.title||"";
   $("songDetailsArtist").value=values.performedBy||"";
   $("songDetailsWritten").value=values.writtenBy||"";
   $("songDetailsArranged").value=values.arrangedBy||"";
   $("songDetailsStart").hidden=mode!=="create";
   $("songDetailsSave").hidden=mode!=="edit";
   $("songDetailsDescription").textContent=mode==="create"
     ?"Add any optional credits, then start writing your song."
     :"These details appear at the top of your sheet and in saved projects.";
   $("songDetailsDialog").showModal();
   $(focusField||"songDetailsTitle").focus();
 }
 function editExisting(){
   if(!page){
     window.ChordSong.updateSongDetails($("songName").textContent||"Untitled song",$("artistName").textContent);
   }
   showDetails({
     title:page?.title||"Untitled song",
     writtenBy:page?.writtenBy||"",
     performedBy:page?.performedBy??page?.artist??"",
     arrangedBy:page?.arrangedBy||""
   },"edit","songDetailsTitle");
 }
 function close(){
   if($("songDetailsDialog").open)$("songDetailsDialog").close();
   dialogMode="edit";
 }
 function applyDetails(){
   if(dialogMode!=="edit")return;
   const values=formDetails();
   window.ChordSong.updateSongDetails(values.title,values);
   close();
 }
 function createFromDialog(){
   if(dialogMode!=="create")return;
   const values=formDetails();
   if(!create(values))return; // Keep dialog open if the user declines replacing a sheet.
   close();
 }
 function init(){
   $("startOriginalSong").addEventListener("click",()=>create());
   for(const id of ["newSongTitle","newSongArtist"]){
     $(id).addEventListener("keydown",event=>{
       if(event.key==="Enter"&&!event.isComposing){event.preventDefault();create();}
     });
   }
   $("addCredits").addEventListener("click",()=>showDetails(newDetails(),"create","songDetailsArtist"));
   $("fileNewSongBtn").addEventListener("click",()=>{
     if(hasUnsavedSheet()&&!window.confirm(
       "Create a new document? Save the current project first if you want to keep it."))return;
     $("newSongTitle").value="";$("newSongArtist").value="";
     window.ChordSong.startBlankSong("Untitled song","",true);
   });
   document.addEventListener("keydown",event=>{
     if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&
       event.key.toLowerCase()==="n"){
       event.preventDefault();$("fileNewSongBtn").click();
     }
   },true);
   $("editSongDetailsBtn").addEventListener("click",editExisting);
   $("songDetailsClose").addEventListener("click",close);
   $("songDetailsCancel").addEventListener("click",close);
   $("songDetailsSave").addEventListener("click",applyDetails);
   $("songDetailsStart").addEventListener("click",createFromDialog);
   $("songDetailsDialog").addEventListener("cancel",ev=>{ev.preventDefault();close();});
   for(const id of ["songDetailsTitle","songDetailsWritten","songDetailsArtist","songDetailsArranged"]){
     $(id).addEventListener("keydown",ev=>{
       if(ev.key==="Enter"&&!ev.isComposing){
         ev.preventDefault();
         // Enter confirms the visible primary action: create the song from
         // the new-song dialog, or apply edits in an existing document.
         if(dialogMode==="create")createFromDialog();
         else applyDetails();
       }
     });
   }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();