"use strict";
/* Blank song creation and the shared Song details & credits dialog. */
(function(){
 const $=id=>document.getElementById(id);
 let dialogMode="edit";
 let draft={arrangedBy:"",performedBy:""};
 const newDetails=()=>({
   title:$("newSongTitle").value.trim(),
   writtenBy:$("newSongArtist").value.trim(),
   arrangedBy:draft.arrangedBy,
   performedBy:draft.performedBy
 });
 const formDetails=()=>({
   title:$("songDetailsTitle").value.trim(),
   writtenBy:$("songDetailsWritten").value.trim(),
   arrangedBy:$("songDetailsArranged").value.trim(),
   performedBy:$("songDetailsArtist").value.trim()
 });
 function updateCreditButtons(){
   $("addArrangementCredit").textContent=draft.arrangedBy?"Edit arrangement credit":"Add arrangement credit";
   $("addPerformerCredit").textContent=draft.performedBy?"Edit performer credit":"Add performer credit";
 }
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
 function applyDraft(values){
   $("newSongTitle").value=values.title;
   $("newSongArtist").value=values.writtenBy;
   draft={arrangedBy:values.arrangedBy,performedBy:values.performedBy};
   updateCreditButtons();
 }
 function showDetails(values,mode,focusField){
   dialogMode=mode;
   $("songDetailsTitle").value=values.title||"";
   $("songDetailsArtist").value=values.performedBy||"";
   $("songDetailsWritten").value=values.writtenBy||"";
   $("songDetailsArranged").value=values.arrangedBy||"";
   $("songDetailsStart").hidden=mode!=="create";
   $("songDetailsSave").classList.toggle("primary",mode==="edit");
   $("songDetailsDescription").textContent=mode==="create"
     ?"Add the optional credits before you begin. Apply details to return to the card, or start writing now."
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
   const values=formDetails();
   if(dialogMode==="create")applyDraft(values);
   else window.ChordSong.updateSongDetails(values.title,values);
   close();
 }
 function createFromDialog(){
   if(dialogMode!=="create")return;
   const values=formDetails();
   if(!create(values))return; // Keep dialog open if the user declines replacing a sheet.
   applyDraft(values);
   close();
 }
 function init(){
   $("startOriginalSong").addEventListener("click",()=>create());
   for(const id of ["newSongTitle","newSongArtist"]){
     $(id).addEventListener("keydown",event=>{
       if(event.key==="Enter"&&!event.isComposing){event.preventDefault();create();}
     });
   }
   $("addArrangementCredit").addEventListener("click",()=>showDetails(newDetails(),"create","songDetailsArranged"));
   $("addPerformerCredit").addEventListener("click",()=>showDetails(newDetails(),"create","songDetailsArtist"));
   $("fileNewSongBtn").addEventListener("click",()=>{
     if(hasUnsavedSheet()&&!window.confirm(
       "Create a new document? Save the current project first if you want to keep it."))return;
     $("newSongTitle").value="";$("newSongArtist").value="";
     draft={arrangedBy:"",performedBy:""};updateCreditButtons();
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
         // Enter confirms the fields and dismisses the dialog. Starting the
         // document remains the explicit "Start writing" action.
         applyDetails();
       }
     });
   }
   updateCreditButtons();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();