let currentClass='', currentRows=[], currentTeacher='', currentTeacherRole='', currentTeacherBio='', currentAdminName='', currentAdminRole='', currentAdminBio='', history=[], submissions=[];
const pages=['landing','teacherLogin','adminLogin','classes','teacherProfile','classInfo','results','review','postSubmit','history','admin','adminProfile'];
const ADMIN_PASSWORD='admin123';
const TEACHER_PASSWORD='teacher123';
const SUPABASE_URL='https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY='your-anon-key';
const RESULTS_TABLE='results';
const supabase = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project-ref.supabase.co') ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function showPage(id){pages.forEach(p=>document.getElementById(p).classList.toggle('hidden',p!==id));window.scrollTo(0,0);if(id==='history')renderHistory();if(id==='admin')renderAdmin();}
document.getElementById('themeBtn').onclick=()=>document.body.classList.toggle('dark');
document.getElementById('logoutBtn').onclick=()=>{document.getElementById('logoutBtn').classList.add('hidden');showPage('landing')};

function teacherEnter(){
  let teacherName=sanitizeText(document.getElementById('teacherName').value);
  let teacherPassword=sanitizeText(document.getElementById('teacherPassword').value);
  if(!teacherName){alert('Jina la mwalimu linahitajika.');return}
  if(!teacherPassword){alert('Weka password ya mwalimu.');return}
  if(teacherPassword!==TEACHER_PASSWORD){alert('Password ya mwalimu si sahihi.');return}
  currentTeacher=teacherName||'Teacher Demo';
  document.getElementById('logoutBtn').classList.remove('hidden');
  showPage('teacherProfile');
}

function adminEnter(){
  let adminName=sanitizeText(document.getElementById('adminName').value);
  let adminPassword=sanitizeText(document.getElementById('adminPassword').value);
  if(!adminName){alert('Jina la admin linahitajika.');return}
  if(!adminPassword){alert('Weka password ya admin.');return}
  if(adminPassword!==ADMIN_PASSWORD){alert('Password ya admin si sahihi.');return}
  currentAdminName=adminName||'Admin';
  document.getElementById('logoutBtn').classList.remove('hidden');
  showPage('adminProfile');
}

function preview(input,id){if(input.files[0]){let r=new FileReader();r.onload=e=>document.getElementById(id).innerHTML='<img src="'+e.target.result+'">';r.readAsDataURL(input.files[0])}}
function confirmTeacherProfile(){
  let n=sanitizeText(document.getElementById('profileName').value);
  let role=sanitizeText(document.getElementById('profileRole').value);
  let bio=sanitizeText(document.getElementById('profileBio').value);
  if(n)currentTeacher=n;
  if(role)currentTeacherRole=role;
  if(bio)currentTeacherBio=bio;
  showPage('classes')
}

function saveAdminProfile(){
  let username=sanitizeText(document.getElementById('adminName').value);
  let role=sanitizeText(document.getElementById('adminRole').value);
  let bio=sanitizeText(document.getElementById('adminBio').value);
  if(username){currentAdminName=username;}
  if(role){currentAdminRole=role;}
  if(bio){currentAdminBio=bio;}
  showPage('admin')
}
function selectClass(c){currentClass=c;document.getElementById('chosenClass').textContent=c;showPage('classInfo')}
function sanitizeText(value){return String(value||'').trim().replace(/[<>]/g,'');}
function normalizeSubject(value){return sanitizeText(value).replace(/\s+/g,' ');} 
function validateClassInfo(){let s=normalizeSubject(document.getElementById('subject').value),t=sanitizeText(document.getElementById('term').value),y=sanitizeText(document.getElementById('year').value),stream=sanitizeText(document.getElementById('stream').value).toUpperCase();if(!s||!t||!y){alert('Jaza Somo, Term na Mwaka.');return false}if(!/^\d{4}$/.test(y)){alert('Mwaka lazima uwe miaka 4 ya namba, mfano 2026.');return false}if(!/^Term\s*[1-3]$/i.test(t)){alert('Term lazima iwe Term 1, Term 2, au Term 3.');return false}if(stream && !/^[A-Z]$/.test(stream)){alert('Mkondo lazima uwe A, B, C, au kitu kifupi kilichokubaliwa.');return false}return true}

function goToResults(){
  let s=normalizeSubject(document.getElementById('subject').value),t=sanitizeText(document.getElementById('term').value),y=sanitizeText(document.getElementById('year').value),stream=sanitizeText(document.getElementById('stream').value).toUpperCase();
  if(!validateClassInfo())return;
  document.getElementById('subject').value=s;
  document.getElementById('term').value=t;
  document.getElementById('year').value=y;
  document.getElementById('stream').value=stream||'A';
  document.getElementById('infoSummary').textContent=`${currentClass} � ${s} � ${t} � ${y} � Mkondo ${stream||'A'} � Mwalimu: ${currentTeacher}`;
  document.getElementById('resultClass').textContent=currentClass;
  document.getElementById('resultMeta').textContent=`${s} | ${t} | ${y} | Mkondo ${stream||'A'} | Mwalimu: ${currentTeacher}`;
  if(!currentRows.length)currentRows=[{name:'',adm:'',marks:''},{name:'',adm:'',marks:''},{name:'',adm:'',marks:''}];
  renderRows();
  showPage('results');
}

function grade(m){m=Number(m);if(m>=80)return'A';if(m>=70)return'B+';if(m>=60)return'B';if(m>=50)return'C';if(m>=40)return'D';return'F'}

function renderRows(){
  document.getElementById('resultBody').innerHTML=currentRows.map((r,i)=>`<tr><td>${i+1}</td><td><input value="${sanitizeText(r.name)}" onchange="currentRows[${i}].name=sanitizeText(this.value)" placeholder="Jina"></td><td><input value="${sanitizeText(r.adm)}" onchange="currentRows[${i}].adm=sanitizeText(this.value)" placeholder="Admission No. (optional)"></td><td><input type="number" min="0" max="100" value="${r.marks}" onchange="currentRows[${i}].marks=Math.max(0,Math.min(100,Number(this.value)))" placeholder="0-100"></td><td><b>${r.marks!==''?grade(r.marks):'-'}</b></td><td><button class="small-btn" onclick="deleteStudent(${i})">Futa</button></td></tr>`).join('')
}

function addStudent(){currentRows.push({name:'',adm:'',marks:''});renderRows()}
function deleteStudent(i){if(currentRows.length>1){currentRows.splice(i,1);renderRows()}else{currentRows=[{name:'',adm:'',marks:''}];renderRows();}}

function validateRows(rows){
  if(!rows.length){alert('Hakuna mwanafunzi aliyeingizwa.');return false}
  for(let r of rows){
    let validName=/^[a-zA-Z][a-zA-Z .'-]{1,50}$/.test(sanitizeText(r.name));
    if(!validName){alert('Jina la mwanafunzi lazima liwe la herufi na si tupu.');return false}
    if(r.marks===''||isNaN(r.marks)){alert('Marks ya kila mwanafunzi yanahitajika na lazima yawe kati ya 0 na 100.');return false}
    let m=Number(r.marks);
    if(m<0||m>100||!Number.isInteger(m)){alert('Marks ya kila mwanafunzi lazima iwe kati ya 0 na 100.');return false}
    if(r.adm && !/^[A-Za-z0-9\-\/ ]{2,30}$/.test(sanitizeText(r.adm))){alert('Admission No. lazima iwe namba au herufi inayokubalika.');return false}
  }
  return true
}

function reviewSubmission(){
  if(!validateRows(currentRows)){return}
  document.getElementById('reviewContent').innerHTML=`<div class="review-row"><b>Darasa</b><span>${currentClass}</span></div><div class="review-row"><b>Mkondo</b><span>${document.getElementById('stream').value.trim().toUpperCase()||'A'}</span></div><div class="review-row"><b>Somo</b><span>${normalizeSubject(document.getElementById('subject').value)}</span></div><div class="review-row"><b>Term / Mwaka</b><span>${sanitizeText(document.getElementById('term').value)} ${sanitizeText(document.getElementById('year').value)}</span></div><div class="review-row"><b>Mwalimu</b><span>${currentTeacher}</span></div><div class="review-row"><b>Idadi</b><span>${currentRows.length}</span></div><div class="review-row"><b>Wanafunzi</b><span>${currentRows.map(r=>`${sanitizeText(r.name)} (${sanitizeText(r.adm) || 'No Adm'}) ${r.marks} - ${grade(r.marks)}`).join(', ')}</span></div>`;
  showPage('review')
}

async function submitResults(){
  if(!validateRows(currentRows)){return}

  let item={
    id:Date.now(),
    class:currentClass,
    teacher:currentTeacher,
    teacherRole:currentTeacherRole||'Teacher',
    teacherBio:currentTeacherBio||'',
    subject:normalizeSubject(document.getElementById('subject').value),
    term:sanitizeText(document.getElementById('term').value),
    year:sanitizeText(document.getElementById('year').value),
    stream:sanitizeText(document.getElementById('stream').value).toUpperCase()||'A',
    count:currentRows.length,
    status:'Pending Admin',
    date:new Date().toLocaleString(),
    adminName:currentAdminName||'Admin',
    adminRole:currentAdminRole||'Administrator',
    adminBio:currentAdminBio||'',
    rows:currentRows.map(r=>({name:sanitizeText(r.name),adm:sanitizeText(r.adm),marks:Number(r.marks)}))
  };

  if(supabase){
    const {error}=await supabase.from(RESULTS_TABLE).insert([item]);
    if(error){console.error(error);alert('Supabase storage failed.');return}
  }

  submissions.unshift(item);
  history.unshift(item);
  alert('Matokeo yamesubmit kwa Admin.');
  currentRows=[];
  showPage('postSubmit')
}

function renderHistory(){
  document.getElementById('historyList').innerHTML=history.length?history.map(x=>`<div class="history-item"><div><b>${x.class} � ${x.subject}</b><div>${x.teacher} � Mkondo ${x.stream||'A'} � ${x.term} � ${x.year}</div><small>${x.count} students � ${x.date}</small></div><span class="status">${x.status}</span></div>`).join(''):'<div class="card">Hakuna history bado.</div>'
}

function renderAdmin(){
  document.getElementById('pendingCount').textContent=submissions.filter(x=>x.status==='Pending Admin').length;
  document.getElementById('adminList').innerHTML=submissions.length?submissions.map(x=>`<div class="history-item"><div><b>${x.class} � ${x.subject}</b><div>Teacher: ${x.teacher} � Mkondo ${x.stream||'A'} � ${x.term} ${x.year}</div><small>${x.count} students � ${x.date}</small></div><div><span class="status">${x.status}</span><button class="primary" style="margin-left:8px" onclick="approve(${x.id})">Approve</button><button class="secondary" style="margin-left:8px" onclick="viewSubmission(${x.id})">View</button><button class="danger" style="margin-left:8px" onclick="deleteSubmission(${x.id})">Delete</button></div></div>`).join(''):'<div class="card">Hakuna submissions bado.</div>'
}

function viewSubmission(id){
  let item=submissions.find(x=>x.id===id);
  if(!item){return}

  let rowDetail = (item.rows || []).map(r => `${sanitizeText(r.name)} (${sanitizeText(r.adm) || 'No Adm'}) ${r.marks} ${grade(r.marks)}`).join(', ');

  document.getElementById('adminDetailContent').innerHTML=`<div class="review-row"><b>Class</b><span>${item.class}</span></div><div class="review-row"><b>Teacher</b><span>${item.teacher}</span></div><div class="review-row"><b>Teacher Role</b><span>${item.teacherRole || 'Teacher'}</span></div><div class="review-row"><b>Teacher Bio</b><span>${item.teacherBio || '—'}</span></div><div class="review-row"><b>Subject</b><span>${item.subject}</span></div><div class="review-row"><b>Term / Year</b><span>${item.term} ${item.year}</span></div><div class="review-row"><b>Stream</b><span>${item.stream||'A'}</span></div><div class="review-row"><b>Status</b><span>${item.status}</span></div><div class="review-row"><b>Submitted By Admin</b><span>${item.adminName || 'Admin'}</span></div><div class="review-row"><b>Admin Role</b><span>${item.adminRole || 'Administrator'}</span></div><div class="review-row"><b>Admin Bio</b><span>${item.adminBio || '—'}</span></div><div class="review-row"><b>Students</b><span>${rowDetail}</span></div>`;
  document.getElementById('adminDetail').classList.remove('hidden');
}

async function approve(id){
  submissions=submissions.map(x=>x.id===id?{...x,status:'Approved'}:x);
  history=history.map(x=>x.id===id?{...x,status:'Approved'}:x);
  if(supabase){
    const {error}=await supabase.from(RESULTS_TABLE).update({status:'Approved'}).eq('id',id);
    if(error){console.error(error);alert('Supabase update failed.');return}
  }
  renderAdmin();renderHistory();
}

async function deleteSubmission(id){
  if(!confirm('Unataka kufuta data hii kutoka kwa admin dashboard?'))return;
  if(supabase){
    const {error}=await supabase.from(RESULTS_TABLE).delete().eq('id',id);
    if(error){console.error(error);alert('Supabase delete failed.');return}
  }
  submissions=submissions.filter(x=>x.id!==id);
  history=history.filter(x=>x.id!==id);
  renderAdmin();renderHistory();
  document.getElementById('adminDetail').classList.add('hidden');
}

async function loadFromSupabase(){
  if(!supabase){return}
  const {data,error}=await supabase.from(RESULTS_TABLE).select('*').order('id',{ascending:false});
  if(error){console.error(error);return}
  if(data){
    submissions=data;
    history=data;
    renderAdmin();
    renderHistory();
  }
}

async function init(){
  await loadFromSupabase();
  showPage('landing');
}

init();
