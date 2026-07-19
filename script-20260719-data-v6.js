const KEY="umanariShiftAppV2"; // 旧版データをそのまま引き継ぐ
let state=load();let selectedShiftId=null;let editingCell=null;let toastTimer;
const $=id=>document.getElementById(id);
const on=(id,event,handler)=>{const el=$(id);if(el)el[event]=handler;};
const els={shiftList:$("shiftList"),emptyMessage:$("emptyMessage"),detailPanel:$("detailPanel"),detailType:$("detailType"),detailTitle:$("detailTitle"),detailPeriod:$("detailPeriod"),staffEmptyMessage:$("staffEmptyMessage"),shiftTable:$("shiftTable"),staffList:$("staffList"),masterStaffEmptyMessage:$("masterStaffEmptyMessage"),shiftModal:$("shiftModal"),staffModal:$("staffModal"),assignmentModal:$("assignmentModal"),mobileModal:$("mobileModal"),shiftForm:$("shiftForm"),staffForm:$("staffForm"),shiftId:$("shiftId"),shiftName:$("shiftName"),shiftType:$("shiftType"),startDate:$("startDate"),endDate:$("endDate"),shiftError:$("shiftError"),staffId:$("staffId"),staffName:$("staffName"),staffWorkTypes:$("staffWorkTypes"),isManager:$("isManager"),shiftStaffModal:$("shiftStaffModal"),shiftStaffChecklist:$("shiftStaffChecklist"),shiftStaffModalNote:$("shiftStaffModalNote"),quickStaffName:$("quickStaffName"),assignmentTitle:$("assignmentTitle"),assignmentSubtitle:$("assignmentSubtitle"),assignmentOptions:$("assignmentOptions"),customAssignmentInput:$("customAssignmentInput"),registeredAssignmentSettings:$("registeredAssignmentSettings"),registeredAssignmentList:$("registeredAssignmentList"),mobileQrImage:$("mobileQrImage"),mobileUrlInput:$("mobileUrlInput"),categoryList:$("categoryList"),newCategoryName:$("newCategoryName"),toast:$("toast")};
init();
function init(){migrateOld();bind();renderAll();save()}
function bind(){
 on("openShiftModalButton","onclick",()=>openShiftModal());on("openStaffModalButton","onclick",()=>openStaffModal());on("closeDetailButton","onclick",closeDetail);on("pdfButton","onclick",exportPdf);on("printButton","onclick",()=>{if(!selectedShiftId)return alert("印刷するシフト表を開いてください。");window.print()});on("mobileOpenButton","onclick",openMobileModal);on("lineShareButton","onclick",shareToLine);on("copyMobileUrlButton","onclick",copyMobileUrl);on("lineShareModalButton","onclick",shareToLine);on("manageShiftStaffButton","onclick",openShiftStaffModal);on("toggleHeadcountButton","onclick",toggleHeadcount);on("copyPreviousButton","onclick",copyPrevious);on("clearShiftButton","onclick",clearShift);on("addCategoryButton","onclick",addCategory);if(els.newCategoryName){els.newCategoryName.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCategory()}})}on("exportButton","onclick",exportBackup);if($("importInput"))$("importInput").onchange=importBackup;els.shiftForm.onsubmit=saveShift;els.staffForm.onsubmit=saveStaff;on("saveCustomAssignmentButton","onclick",saveCustomAssignment);on("registerCustomAssignmentButton","onclick",registerCustomAssignment);on("saveShiftStaffButton","onclick",saveShiftStaffSelection);on("quickAddStaffButton","onclick",quickAddStaff);els.customAssignmentInput.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();saveCustomAssignment()}};
 document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>closeModal(x.dataset.close));
 document.querySelectorAll(".tab-button").forEach(x=>x.onclick=()=>switchView(x.dataset.view));
}
function defaultState(){return {staff:[],shifts:[],categories:[{id:"lunch",name:"ランチ"},{id:"dinner",name:"ディナー"}],customOptions:{lunch:[],dinner:[]}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||defaultState()}catch{return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function migrateOld(){
 if(!Array.isArray(state.staff))state.staff=[];if(!Array.isArray(state.shifts))state.shifts=[];
 if(!Array.isArray(state.categories)||!state.categories.length)state.categories=[{id:"lunch",name:"ランチ"},{id:"dinner",name:"ディナー"}];
 state.categories=state.categories.filter(c=>c&&c.id&&c.name);
 if(!state.customOptions||typeof state.customOptions!=="object")state.customOptions={};
 state.categories.forEach(c=>{if(!Array.isArray(state.customOptions[c.id]))state.customOptions[c.id]=[];state.customOptions[c.id]=[...new Set(state.customOptions[c.id].map(v=>String(v).trim()).filter(Boolean))]});
 state.staff.forEach((p,i)=>{if(p.order==null)p.order=i;if(!Array.isArray(p.workTypes)){p.workTypes=p.workType==="both"?["lunch","dinner"]:[p.workType||"lunch"]}p.workTypes=p.workTypes.filter(t=>state.categories.some(c=>c.id===t));if(!p.workTypes.length)p.workTypes=[state.categories[0].id]});
 state.shifts.forEach(s=>{if(!state.categories.some(c=>c.id===s.type))s.type=state.categories[0].id;if(!s.staffOverrides||typeof s.staffOverrides!=="object")s.staffOverrides={include:[],exclude:[]};if(!Array.isArray(s.staffOverrides.include))s.staffOverrides.include=[];if(!Array.isArray(s.staffOverrides.exclude))s.staffOverrides.exclude=[];if(typeof s.showHeadcount!=="boolean")s.showHeadcount=true});sortStaff()
}
function switchView(name){["shifts","staff","settings"].forEach(v=>$(v+"View").classList.toggle("hidden",v!==name));document.querySelectorAll(".tab-button").forEach(b=>b.classList.toggle("active",b.dataset.view===name))}
function openModal(name){$(name+"Modal").classList.remove("hidden")}
function closeModal(name){$(name+"Modal").classList.add("hidden")}
function renderAll(){renderTypeSelects();renderShiftList();renderStaffList();renderCategoryList();if(selectedShiftId)renderDetail()}
function openShiftModal(shift=null){renderTypeSelects();els.shiftForm.reset();els.shiftError.textContent="";$("shiftModalTitle").textContent=shift?"シフト表を編集":"新しいシフト表";els.shiftId.value=shift?.id||"";els.shiftName.value=shift?.name||"";els.shiftType.value=shift?.type||state.categories[0].id;if(shift){els.startDate.value=shift.startDate;els.endDate.value=shift.endDate}else suggestedDates();openModal("shift");els.shiftName.focus()}
function suggestedDates(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),last=new Date(y,d.getMonth()+1,0).getDate(),first=d.getDate()<=15;els.startDate.value=`${y}-${m}-${first?"01":"16"}`;els.endDate.value=`${y}-${m}-${first?"15":String(last).padStart(2,"0")}`}
function saveShift(e){e.preventDefault();const name=els.shiftName.value.trim(),type=els.shiftType.value,start=els.startDate.value,end=els.endDate.value;if(end<start){els.shiftError.textContent="終了日は開始日以降にしてください。";return}if(dateRange(start,end).length>31){els.shiftError.textContent="1つのシフト表は31日以内にしてください。";return}const existing=state.shifts.find(s=>s.id===els.shiftId.value);if(existing){Object.assign(existing,{name,type,startDate:start,endDate:end});normalize(existing)}else state.shifts.unshift({id:id(),name,type,startDate:start,endDate:end,assignments:{},staffOverrides:{include:[],exclude:[]},showHeadcount:true});save();closeModal("shift");renderAll();toast("シフト表を保存しました")}
function renderShiftList(){els.shiftList.innerHTML="";els.emptyMessage.classList.toggle("hidden",state.shifts.length>0);state.shifts.forEach(s=>{const c=document.createElement("article");c.className="shift-card";c.innerHTML=`<p class="type-badge">${esc(categoryName(s.type))}</p><h3>${esc(s.name)}</h3><p>${fmt(s.startDate)} ～ ${fmt(s.endDate)}</p><div class="card-actions"><button class="primary-button open">シフト入力</button><button class="small-button edit">編集</button><button class="danger-button del">削除</button></div>`;c.querySelector(".open").onclick=()=>openDetail(s.id);c.querySelector(".edit").onclick=()=>openShiftModal(s);c.querySelector(".del").onclick=()=>{if(confirm(`「${s.name}」を削除しますか？`)){state.shifts=state.shifts.filter(x=>x.id!==s.id);if(selectedShiftId===s.id)closeDetail();save();renderAll()}};els.shiftList.appendChild(c)})}
function openDetail(i){selectedShiftId=i;renderDetail();els.detailPanel.classList.remove("hidden");$("shiftsView").classList.add("detail-open");window.scrollTo({top:0,behavior:"auto"})}
function closeDetail(){selectedShiftId=null;els.detailPanel.classList.add("hidden");$("shiftsView").classList.remove("detail-open")}
function selected(){return state.shifts.find(s=>s.id===selectedShiftId)}


function publicUrl(){return `${location.origin}${location.pathname}`}
function qrApiUrl(u){return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(u)}`}
function openMobileModal(){
 const url=publicUrl();
 if(els.mobileUrlInput)els.mobileUrlInput.value=url;
 if(els.mobileQrImage){els.mobileQrImage.src=qrApiUrl(url);els.mobileQrImage.alt=`シンプルシフト表を開くQRコード`;}
 openModal("mobile");
}

function shareToLine(){
 const url=publicUrl();
 const text=`シンプルシフト表｜飲食店版\n${url}`;
 const lineUrl=`https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
 window.open(lineUrl,"_blank","noopener");
}

async function copyMobileUrl(){
 const url=publicUrl();
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(url);
  else{els.mobileUrlInput.focus();els.mobileUrlInput.select();document.execCommand("copy")}
  toast("URLをコピーしました");
 }catch{alert("URLのコピーに失敗しました。URLを手で選んでコピーしてください。");}
}

function preparePrintLayout(){
 const s=selected();if(!s)return;
 const dayCount=dateRange(s.startDate,s.endDate).length;
 const rowCount=getShiftStaff(s).length+(s.showHeadcount?1:0);
 document.documentElement.style.setProperty("--print-day-count",dayCount);
 document.documentElement.style.setProperty("--print-row-count",rowCount);
 document.body.classList.toggle("print-dense",dayCount>20||rowCount>15);
 document.body.classList.toggle("print-ultra",dayCount>27||rowCount>21);
}
function clearPrintLayout(){
 document.body.classList.remove("print-dense","print-ultra");
}
window.addEventListener("beforeprint",preparePrintLayout);
window.addEventListener("afterprint",clearPrintLayout);
function exportPdf(){
 if(!selectedShiftId)return alert("PDFにするシフト表を開いてください。");
 preparePrintLayout();
 window.print();
}
function renderDetail(){
 const s=selected();if(!s)return;
 const staff=getShiftStaff(s);
 els.detailType.textContent=`${categoryName(s.type)}シフト`;
 els.detailTitle.textContent=s.name;
 els.detailPeriod.textContent=`${fmt(s.startDate)} ～ ${fmt(s.endDate)}`;
 $("toggleHeadcountButton").textContent=s.showHeadcount?"出勤人数を非表示":"出勤人数を表示";
 els.staffEmptyMessage.classList.toggle("hidden",staff.length>0);
 const dates=dateRange(s.startDate,s.endDate);
 let h='<thead><tr><th>名前</th>';
 dates.forEach(d=>{
  const w=new Date(d+"T00:00:00").getDay();
  const holiday=isJapaneseHoliday(d);
  const classes=[];
  if(holiday)classes.push("holiday");
  else if(w===0)classes.push("sunday");
  else if(w===6)classes.push("saturday");
  h+=`<th class="${classes.join(" ")}">${headerDate(d)}</th>`;
 });
 h+="</tr></thead><tbody>";
 staff.forEach((p,rowIndex)=>{
  const rowClass=rowIndex%2===0?"row-white":"row-blue";
  h+=`<tr class="${rowClass}"><td>${esc(p.name)}</td>`;
  dates.forEach(d=>{
   const v=s.assignments?.[p.id]?.[d]||"";
   const btnClasses=["shift-cell"];
   if(v==="休")btnClasses.push("value-off");
   else if(v==="○")btnClasses.push("value-lunch");
   else if(v)btnClasses.push("value-time");
   h+=`<td><button class="${btnClasses.join(" ")}" data-staff="${p.id}" data-date="${d}">${esc(v)}</button></td>`;
  });
  h+="</tr>";
 });
 if(s.showHeadcount){
  h+='<tr class="headcount-row"><td>出勤人数</td>';
  dates.forEach(d=>{
   const count=staff.filter(p=>isWorkingAssignment(s.assignments?.[p.id]?.[d]||"")).length;
   h+=`<td><strong>${count}人</strong></td>`;
  });
  h+="</tr>";
 }
 els.shiftTable.innerHTML=h+"</tbody>";
 els.shiftTable.querySelectorAll(".shift-cell").forEach(b=>b.onclick=()=>openAssignment(b.dataset.staff,b.dataset.date));
}
function isWorkingAssignment(value){const v=String(value||"").trim();if(!v)return false;if(v==="休"||v==="休み"||v.includes("定休日")||v.includes("休業"))return false;return true}
function toggleHeadcount(){const s=selected();if(!s)return;s.showHeadcount=!s.showHeadcount;save();renderDetail()}
function openAssignment(staffId,date){const s=selected(),p=state.staff.find(x=>x.id===staffId);if(!s||!p)return;editingCell={staffId,date};els.assignmentTitle.textContent=p.name;els.assignmentSubtitle.textContent=longDate(date);renderAssignmentChoices();openModal("assignment");els.customAssignmentInput.focus()}
function baseChoices(type){return type==="dinner"?[["","未入力"],["17:00","17:00"],["17:30","17:30"],["17:45","17:45"],["18:00","18:00"],["18:15","18:15"],["18:30","18:30"],["休","休"]]:[["","未入力"],["○","○ 出勤"],["休","休"]]}
function renderAssignmentChoices(){const s=selected();if(!s||!editingCell)return;els.assignmentOptions.innerHTML="";const current=s.assignments?.[editingCell.staffId]?.[editingCell.date]||"",standard=baseChoices(s.type),registered=state.customOptions[s.type]||[],standardValues=new Set(standard.map(([v])=>v));const choices=[...standard,...registered.filter(v=>!standardValues.has(v)).map(v=>[v,v])];choices.forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.className="assignment-option"+(v===current?" selected":"");b.textContent=l;b.onclick=()=>setAssignment(v);els.assignmentOptions.appendChild(b)});els.customAssignmentInput.value=choices.some(([v])=>v===current)?"":current;renderRegisteredSettings(s.type)}
function renderRegisteredSettings(type){const items=state.customOptions[type]||[];els.registeredAssignmentSettings.classList.toggle("hidden",items.length===0);els.registeredAssignmentList.innerHTML="";items.forEach((value,index)=>{const row=document.createElement("div");row.className="registered-assignment-row";row.innerHTML=`<span>${esc(value)}</span><div><button type="button" class="mini-option-button up" ${index===0?"disabled":""}>↑</button><button type="button" class="mini-option-button down" ${index===items.length-1?"disabled":""}>↓</button><button type="button" class="mini-option-button delete">削除</button></div>`;row.querySelector(".up").onclick=()=>moveCustomOption(type,index,-1);row.querySelector(".down").onclick=()=>moveCustomOption(type,index,1);row.querySelector(".delete").onclick=()=>deleteCustomOption(type,value);els.registeredAssignmentList.appendChild(row)})}
function setAssignment(v){const s=selected(),{staffId,date}=editingCell;if(!s.assignments[staffId])s.assignments[staffId]={};if(v)s.assignments[staffId][date]=v;else delete s.assignments[staffId][date];if(Object.keys(s.assignments[staffId]).length===0)delete s.assignments[staffId];save();closeModal("assignment");renderDetail()}
function saveCustomAssignment(){const v=els.customAssignmentInput.value.trim();if(!v)return alert("自由入力の内容を入力してください。");setAssignment(v)}
function registerCustomAssignment(){const s=selected(),v=els.customAssignmentInput.value.trim();if(!s||!v)return alert("登録する内容を入力してください。");const standard=new Set(baseChoices(s.type).map(([value])=>value));if(standard.has(v))return alert("この内容はすでに標準の選択肢にあります。");const list=state.customOptions[s.type];if(list.includes(v))return alert("この内容はすでに登録されています。");list.push(v);save();renderAssignmentChoices();els.customAssignmentInput.value=v;toast(`「${v}」を登録しました`)}
function moveCustomOption(type,index,direction){const list=state.customOptions[type],next=index+direction;if(next<0||next>=list.length)return;[list[index],list[next]]=[list[next],list[index]];save();renderAssignmentChoices()}
function deleteCustomOption(type,value){if(!confirm(`登録した「${value}」を削除しますか？\nシフト表に入力済みの内容は消えません。`))return;state.customOptions[type]=state.customOptions[type].filter(v=>v!==value);save();renderAssignmentChoices();toast("登録内容を削除しました")}

function staffMatchesShift(p,type){return Array.isArray(p.workTypes)&&p.workTypes.includes(type)}
function getShiftStaff(s){
 const include=new Set(s.staffOverrides?.include||[]),exclude=new Set(s.staffOverrides?.exclude||[]);
 return [...state.staff].filter(p=>(staffMatchesShift(p,s.type)||include.has(p.id))&&!exclude.has(p.id)).sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order));
}
function openShiftStaffModal(){
 const s=selected();if(!s)return;
 if(!s.staffOverrides)s.staffOverrides={include:[],exclude:[]};
 els.shiftStaffModalNote.textContent=`${categoryName(s.type)}登録のスタッフは最初から選択されています。`;
 els.shiftStaffChecklist.innerHTML="";
 if(state.staff.length===0){els.shiftStaffChecklist.innerHTML='<div class="empty-message">スタッフが登録されていません。</div>'}
 [...state.staff].sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order)).forEach(p=>{
  const checked=getShiftStaff(s).some(x=>x.id===p.id),row=document.createElement("label");
  row.className="shift-staff-check-row";
  row.innerHTML=`<input type="checkbox" value="${p.id}" ${checked?"checked":""}><span><strong>${esc(p.name)}</strong><small>${esc(workTypeLabel(p))}</small></span>`;
  els.shiftStaffChecklist.appendChild(row);
 });
 els.quickStaffName.value="";openModal("shiftStaff");
}
function saveShiftStaffSelection(){
 const s=selected();if(!s)return;
 const checked=new Set([...els.shiftStaffChecklist.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value));
 s.staffOverrides={include:[],exclude:[]};
 state.staff.forEach(p=>{
  const natural=staffMatchesShift(p,s.type),isChecked=checked.has(p.id);
  if(isChecked&&!natural)s.staffOverrides.include.push(p.id);
  if(!isChecked&&natural)s.staffOverrides.exclude.push(p.id);
 });
 save();closeModal("shiftStaff");renderDetail();toast("このシフトのスタッフを反映しました");
}
function quickAddStaff(){
 const s=selected(),name=els.quickStaffName.value.trim();if(!s||!name)return alert("スタッフ名を入力してください。");
 const duplicate=state.staff.find(p=>p.name===name);
 if(duplicate)return alert("同じ名前のスタッフがすでに登録されています。");
 const p={id:id(),name,workTypes:[s.type],isManager:false,order:state.staff.length};state.staff.push(p);sortStaff();save();renderStaffList();openShiftStaffModal();toast(`${name}を追加しました`);
}
function copyPrevious(){const s=selected();if(!s)return;const dates=dateRange(s.startDate,s.endDate);if(dates.length<2)return alert("コピーできる日がありません。");const target=prompt("コピー先の日付を入力してください（例：2026-08-02）",dates[1]);if(!target||!dates.includes(target))return alert("このシフト表内の日付を入力してください。");const i=dates.indexOf(target);if(i===0)return alert("初日は前日コピーできません。");const prev=dates[i-1];state.staff.forEach(p=>{const v=s.assignments?.[p.id]?.[prev]||"";if(!s.assignments[p.id])s.assignments[p.id]={};if(v)s.assignments[p.id][target]=v;else delete s.assignments[p.id][target]});save();renderDetail();toast("前日の内容をコピーしました")}
function clearShift(){const s=selected();if(s&&confirm("このシフト表の入力内容をすべて消去しますか？")){s.assignments={};save();renderDetail();toast("入力を全消去しました")}}
function normalize(s){const valid=new Set(dateRange(s.startDate,s.endDate));Object.values(s.assignments||{}).forEach(m=>Object.keys(m).forEach(d=>{if(!valid.has(d))delete m[d]}))}
function openStaffModal(p=null){els.staffForm.reset();$("staffModalTitle").textContent=p?"スタッフ編集":"スタッフ追加";els.staffId.value=p?.id||"";els.staffName.value=p?.name||"";renderStaffTypeChecklist(p?.workTypes||[state.categories[0].id]);els.isManager.checked=!!p?.isManager;openModal("staff");els.staffName.focus()}
function saveStaff(e){e.preventDefault();const name=els.staffName.value.trim();if(!name)return;const workTypes=[...els.staffWorkTypes.querySelectorAll('input:checked')].map(x=>x.value);if(!workTypes.length)return alert("種類を1つ以上選んでください。");const p=state.staff.find(x=>x.id===els.staffId.value);if(p){p.name=name;p.workTypes=workTypes;p.isManager=els.isManager.checked}else state.staff.push({id:id(),name,workTypes,isManager:els.isManager.checked,order:state.staff.length});sortStaff();save();closeModal("staff");renderAll();toast("スタッフを保存しました")}
function sortStaff(){state.staff.sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order));state.staff.forEach((s,i)=>s.order=i)}
function renderStaffList(){els.staffList.innerHTML="";els.masterStaffEmptyMessage.classList.toggle("hidden",state.staff.length>0);state.staff.forEach((p,i)=>{const r=document.createElement("div");r.className="staff-row";r.innerHTML=`<div><span class="staff-name">${esc(p.name)}</span>${p.isManager?'<span class="manager-mark">店長</span>':''}<span class="work-type-mark">${esc(workTypeLabel(p))}</span></div><div class="staff-actions"><button class="small-button up" ${i===0?'disabled':''}>↑</button><button class="small-button down" ${i===state.staff.length-1?'disabled':''}>↓</button><button class="small-button edit">編集</button><button class="danger-button del">削除</button></div>`;r.querySelector(".edit").onclick=()=>openStaffModal(p);r.querySelector(".del").onclick=()=>deleteStaff(p);r.querySelector(".up").onclick=()=>moveStaff(i,-1);r.querySelector(".down").onclick=()=>moveStaff(i,1);els.staffList.appendChild(r)})}
function moveStaff(i,d){const j=i+d;if(j<0||j>=state.staff.length)return;[state.staff[i],state.staff[j]]=[state.staff[j],state.staff[i]];state.staff.forEach((s,k)=>{s.order=k;s.isManager=k===0&&s.isManager});save();renderAll()}
function deleteStaff(p){if(!confirm(`「${p.name}」を削除しますか？\n過去のシフト入力も削除されます。`))return;state.staff=state.staff.filter(x=>x.id!==p.id);state.shifts.forEach(s=>{delete s.assignments[p.id];if(s.staffOverrides){s.staffOverrides.include=s.staffOverrides.include.filter(x=>x!==p.id);s.staffOverrides.exclude=s.staffOverrides.exclude.filter(x=>x!==p.id)}});save();renderAll();toast("スタッフを削除しました")}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`シンプルシフト表_バックアップ_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.staff)||!Array.isArray(x.shifts))throw 0;if(!confirm("現在のデータをバックアップ内容に置き換えますか？"))return;state=x;selectedShiftId=null;save();closeDetail();renderAll();toast("保存データから復元しました")}catch{alert("正しいバックアップファイルではありません。")};e.target.value=""};r.readAsText(f)}

function categoryName(type){return state.categories.find(c=>c.id===type)?.name||type}
function renderTypeSelects(){if(els.shiftType){const current=els.shiftType.value;els.shiftType.innerHTML=state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");if(state.categories.some(c=>c.id===current))els.shiftType.value=current}}
function renderStaffTypeChecklist(selectedTypes=[]){els.staffWorkTypes.innerHTML=state.categories.map(c=>`<label class="check-label"><input type="checkbox" value="${esc(c.id)}" ${selectedTypes.includes(c.id)?"checked":""}>${esc(c.name)}</label>`).join("")}
function workTypeLabel(p){return (p.workTypes||[]).map(categoryName).join("・")||"未設定"}
function slugifyCategory(name){const base=name.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g,"-").replace(/^-+|-+$/g,"");return (base||"type")+"-"+Date.now().toString(36)}
function addCategory(){const name=els.newCategoryName.value.trim();if(!name)return alert("種類名を入力してください。");if(state.categories.some(c=>c.name===name))return alert("同じ種類名が登録されています。");const category={id:slugifyCategory(name),name};state.categories.push(category);state.customOptions[category.id]=[];els.newCategoryName.value="";save();renderAll();toast(`「${name}」を追加しました`)}
function renderCategoryList(){
 if(!els.categoryList)return;
 els.categoryList.innerHTML="";
 state.categories.forEach((c,i)=>{
  const row=document.createElement("div");
  row.className="staff-row category-edit-row";
  row.innerHTML=`<div class="category-name-edit"><span class="category-number">${i+1}</span><input class="category-name-input" type="text" maxlength="20" value="${esc(c.name)}" aria-label="種類名"></div><div class="staff-actions"><button type="button" class="primary-button save-name">変更を保存</button><button type="button" class="danger-button del">削除</button></div>`;
  const input=row.querySelector(".category-name-input");
  const saveButton=row.querySelector(".save-name");
  const commit=()=>renameCategoryFromInput(c,input.value);
  saveButton.onclick=commit;
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit()}});
  row.querySelector(".del").onclick=()=>deleteCategory(c);
  els.categoryList.appendChild(row);
 });
}
function renameCategoryFromInput(c,value){
 const name=String(value||"").trim();
 if(!name)return alert("種類名を入力してください。");
 if(name===c.name)return toast("変更はありません");
 if(state.categories.some(x=>x.id!==c.id&&x.name===name))return alert("同じ種類名が登録されています。");
 c.name=name;save();renderAll();toast("種類名を変更しました");
}
function renameCategory(c){const name=prompt("新しい種類名を入力してください。",c.name)?.trim();if(!name||name===c.name)return;renameCategoryFromInput(c,name)}
function deleteCategory(c){if(state.categories.length<=1)return alert("種類は最低1つ必要です。");const usedShift=state.shifts.some(s=>s.type===c.id),usedStaff=state.staff.some(p=>(p.workTypes||[]).includes(c.id));if(usedShift||usedStaff)return alert("この種類はシフト表またはスタッフで使用中です。先に別の種類へ変更してください。");if(!confirm(`「${c.name}」を削除しますか？`))return;state.categories=state.categories.filter(x=>x.id!==c.id);delete state.customOptions[c.id];save();renderAll();toast("種類を削除しました")}
function dateRange(a,b){const arr=[],d=new Date(a+"T00:00:00"),e=new Date(b+"T00:00:00");while(d<=e){arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);d.setDate(d.getDate()+1)}return arr}
function fmt(d){const x=new Date(d+"T00:00:00");return `${x.getFullYear()}年${x.getMonth()+1}月${x.getDate()}日`}
function headerDate(d){const x=new Date(d+"T00:00:00"),w="日月火水木金土"[x.getDay()];return `${x.getMonth()+1}/${x.getDate()}<br>(${w}${isJapaneseHoliday(d)?"・祝":""})`}
function longDate(d){const x=new Date(d+"T00:00:00"),w="日月火水木金土"[x.getDay()];return `${x.getMonth()+1}月${x.getDate()}日（${w}${isJapaneseHoliday(d)?"・祝":""}）`}

const holidayCache={};
function isJapaneseHoliday(dateStr){
 const year=Number(dateStr.slice(0,4));
 if(!holidayCache[year])holidayCache[year]=buildJapaneseHolidaySet(year);
 return holidayCache[year].has(dateStr);
}
function buildJapaneseHolidaySet(year){
 const set=new Set();
 const add=(m,d)=>set.add(formatYmd(year,m,d));
 add(1,1);
 add(1,nthMonday(year,1,2));
 add(2,11);
 if(year>=2020)add(2,23);
 add(3,vernalEquinoxDay(year));
 add(4,29);add(5,3);add(5,4);add(5,5);
 add(7,nthMonday(year,7,3));
 if(year>=2016)add(8,11);
 add(9,nthMonday(year,9,3));
 add(9,autumnEquinoxDay(year));
 add(10,nthMonday(year,10,2));
 add(11,3);add(11,23);
 const originalHolidays=[...set].sort();
 for(const day of originalHolidays){
  const dt=new Date(day+"T00:00:00");
  if(dt.getDay()!==0)continue;
  const sub=new Date(dt);
  do{sub.setDate(sub.getDate()+1)}while(set.has(toDateStr(sub)));
  set.add(toDateStr(sub));
 }
 const list=[...set].sort();
 for(let i=0;i<list.length-1;i++){
  const a=new Date(list[i]+"T00:00:00"),b=new Date(list[i+1]+"T00:00:00");
  const mid=new Date(a);mid.setDate(mid.getDate()+1);
  if(toDateStr(mid)===list[i+1])continue;
  if(mid<b && b-mid===86400000){
   const midStr=toDateStr(mid);
   if(mid.getDay()!==0 && !set.has(midStr))set.add(midStr);
  }
 }
 return set;
}
function formatYmd(y,m,d){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function toDateStr(dt){return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`}
function nthMonday(year,month,n){const first=new Date(year,month-1,1),offset=(8-first.getDay())%7;return 1+offset+7*(n-1)}
function vernalEquinoxDay(year){return Math.floor(20.8431+0.242194*(year-1980))-Math.floor((year-1980)/4)}
function autumnEquinoxDay(year){return Math.floor(23.2488+0.242194*(year-1980))-Math.floor((year-1980)/4)}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function toast(t){clearTimeout(toastTimer);els.toast.textContent=t;els.toast.classList.remove("hidden");toastTimer=setTimeout(()=>els.toast.classList.add("hidden"),1800)}
