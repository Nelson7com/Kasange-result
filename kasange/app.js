let currentClass = '', currentRows = [], currentTeacher = '', currentUser = null;
let submissions = [], history = [];
const pages = ['landing', 'teacherLogin', 'adminLogin', 'classes', 'teacherProfile', 'classInfo', 'results', 'review', 'postSubmit', 'history', 'admin', 'adminProfile'];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Server error');
  return payload;
}

function notify(error) { alert(error instanceof Error ? error.message : error); }
function showPage(id) {
  pages.forEach(page => document.getElementById(page).classList.toggle('hidden', page !== id));
  window.scrollTo(0, 0);
  if (id === 'history') loadHistory();
  if (id === 'admin') loadAdmin();
}
function setLoggedIn(user) {
  currentUser = user;
  currentTeacher = user.name;
  document.getElementById('logoutBtn').classList.remove('hidden');
}
function requireRole(role) {
  if (!currentUser || currentUser.role !== role) {
    showPage(role === 'admin' ? 'adminLogin' : 'teacherLogin');
    return false;
  }
  return true;
}
document.getElementById('themeBtn').onclick = () => document.body.classList.toggle('dark');
document.getElementById('logoutBtn').onclick = async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch (error) { notify(error); }
  currentUser = null; currentRows = []; document.getElementById('logoutBtn').classList.add('hidden'); showPage('landing');
};
async function createTeacherAccount() {
  const name = document.getElementById('teacherCreateName').value.trim();
  const email = document.getElementById('teacherCreateEmail').value.trim();
  const password = document.getElementById('teacherCreatePassword').value;
  if (!name || !password) {
    notify('Jaza jina na password kabla ya kuunda akaunti ya mwalimu.');
    return;
  }
  try {
    const photo = document.getElementById('teacherCreatePhoto').files[0];
    let profilePhoto = '';
    if (photo) {
      const reader = new FileReader();
      profilePhoto = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Image upload failed'));
        reader.readAsDataURL(photo);
      });
    }
    await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, profile_photo: profilePhoto }) });
    alert('Akaunti ya mwalimu imeundwa. Sasa ingia kwa jina lako na password.');
    document.getElementById('teacherCreatePassword').value = '';
  } catch (error) { notify(error); }
}
async function teacherEnter() {
  const name = document.getElementById('teacherLoginName').value.trim();
  const password = document.getElementById('teacherLoginPassword').value;
  if (!name || !password) {
    notify('Jaza jina la mwalimu na password yako.');
    return;
  }
  try {
    const user = await api('/auth/login', { method: 'POST', body: JSON.stringify({ name, password, role: 'teacher' }) });
    setLoggedIn(user);
    document.getElementById('profileName').value = user.name || name;
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePassword').value = '';
    document.getElementById('profilePasswordConfirm').value = '';
    showPage('teacherProfile');
  } catch (error) { notify(error); }
}
async function adminEnter() {
  try {
    const name = document.getElementById('adminName').value.trim();
    const password = document.getElementById('adminPassword').value;
    if (!name || !password) {
      notify('Jaza jina la admin na password.');
      return;
    }
    const user = await api('/auth/login', { method: 'POST', body: JSON.stringify({ name, password, role: 'admin' }) });
    setLoggedIn(user); document.getElementById('adminProfileName').value = user.name; showPage('adminProfile');
  } catch (error) { notify(error); }
}
function preview(input, id) {
  if (input.files[0]) { const reader = new FileReader(); reader.onload = event => document.getElementById(id).innerHTML = `<img src="${event.target.result}" alt="Profile">`; reader.readAsDataURL(input.files[0]); }
}
async function confirmTeacherProfile() {
  if (!requireRole('teacher')) return;
  const name = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const password = document.getElementById('profilePassword').value;
  const passwordConfirm = document.getElementById('profilePasswordConfirm').value;
  const profilePhoto = document.getElementById('teacherPhoto').files[0];
  if (!name || !phone || !email) {
    notify('Jina, namba ya simu na email ni lazima.');
    return;
  }
  if (password || passwordConfirm) {
    if (password.length < 6) {
      notify('Password lazima iwe na angalau herufi 6.');
      return;
    }
    if (password !== passwordConfirm) {
      notify('Password hailingani.');
      return;
    }
  }
  try {
    let photoData = currentUser && currentUser.profile_photo ? currentUser.profile_photo : '';
    if (profilePhoto) {
      photoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Image upload failed'));
        reader.readAsDataURL(profilePhoto);
      });
    }
    await api('/auth/profile', { method: 'PUT', body: JSON.stringify({ name, phone, email, profile_photo: photoData, password: password || undefined }) });
    currentTeacher = name;
    currentUser = { ...currentUser, name, phone, email, profile_photo: photoData, role: 'teacher' };
    showPage('classes');
  } catch (error) { notify(error); }
}
function saveAdminProfile() { if (requireRole('admin')) { showPage('admin'); } }
function selectClass(value) { if (requireRole('teacher')) { currentClass = value; document.getElementById('chosenClass').textContent = value; showPage('classInfo'); } }
function goToResults() {
  const subject = document.getElementById('subject').value.trim(), term = document.getElementById('term').value.trim(), year = document.getElementById('year').value.trim(), stream = document.getElementById('stream').value.trim() || 'A';
  if (!subject || !term || !year) { notify('Jaza Somo, Term na Mwaka.'); return; }
  document.getElementById('infoSummary').textContent = `${currentClass} • ${subject} • ${term} • ${year} • Mkondo ${stream} • Mwalimu: ${currentTeacher}`;
  document.getElementById('resultClass').textContent = currentClass; document.getElementById('resultMeta').textContent = `${subject} | ${term} | ${year} | Mkondo ${stream} | Mwalimu: ${currentTeacher}`;
  if (!currentRows.length) currentRows = [{ name: '', adm: '', marks: '' }, { name: '', adm: '', marks: '' }, { name: '', adm: '', marks: '' }];
  renderRows(); showPage('results');
}
function grade(marks) { const mark = Number(marks); if (mark >= 80) return 'A'; if (mark >= 70) return 'B+'; if (mark >= 60) return 'B'; if (mark >= 50) return 'C'; if (mark >= 40) return 'D'; return 'F'; }
function renderRows() {
  document.getElementById('resultBody').innerHTML = currentRows.map((row, i) => `<tr><td>${i + 1}</td><td><input value="${row.name}" onchange="currentRows[${i}].name=this.value" placeholder="Jina"></td><td><input value="${row.adm}" onchange="currentRows[${i}].adm=this.value" placeholder="Admission No. (optional)"></td><td><input type="number" min="0" max="100" value="${row.marks}" onchange="currentRows[${i}].marks=this.value" placeholder="0-100"></td><td><b>${row.marks !== '' ? grade(row.marks) : '-'}</b></td><td><button class="small-btn" onclick="deleteStudent(${i})">Futa</button></td></tr>`).join('');
}
function addStudent() { currentRows.push({ name: '', adm: '', marks: '' }); renderRows(); }
function deleteStudent(index) { currentRows.splice(index, 1); if (!currentRows.length) currentRows.push({ name: '', adm: '', marks: '' }); renderRows(); }
function reviewSubmission() {
  if (!currentRows.length || currentRows.some(row => !row.name.trim() || row.marks === '' || Number(row.marks) < 0 || Number(row.marks) > 100)) { notify('Hakikisha kila mwanafunzi ana jina na marks 0-100.'); return; }
  document.getElementById('reviewContent').innerHTML = `<div class="review-row"><b>Darasa</b><span>${currentClass}</span></div><div class="review-row"><b>Somo</b><span>${document.getElementById('subject').value.trim()}</span></div><div class="review-row"><b>Term / Mwaka</b><span>${document.getElementById('term').value.trim()} ${document.getElementById('year').value.trim()}</span></div><div class="review-row"><b>Mwalimu</b><span>${currentTeacher}</span></div><div class="review-row"><b>Wanafunzi</b><span>${currentRows.map(row => `${row.name} (${row.adm || 'No Adm'}) ${row.marks} - ${grade(row.marks)}`).join(', ')}</span></div>`;
  showPage('review');
}
async function submitResults() {
  try {
    await api('/submissions', { method: 'POST', body: JSON.stringify({ className: currentClass, subject: document.getElementById('subject').value.trim(), term: document.getElementById('term').value.trim(), year: document.getElementById('year').value.trim(), stream: document.getElementById('stream').value.trim() || 'A', rows: currentRows }) });
    currentRows = []; notify('Matokeo yamesubmit kwa Admin.'); showPage('postSubmit');
  } catch (error) { notify(error); }
}
function rowsTableMarkup(rows = []) {
  return `
    <div class="results-table-wrap">
      <table class="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jina</th>
            <th>Adm</th>
            <th>Marks</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${row.name || '-'}</td>
              <td>${row.adm || '—'}</td>
              <td>${row.marks}</td>
              <td>${grade(row.marks)}</td>
            </tr>
          `).join('') : '<tr><td colspan="5">No results</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
function submissionHtml(item, admin = false) {
  const rowsMarkup = rowsTableMarkup(item.rows || []);
  return `
    <div class="history-item">
      <div class="history-top-row">
        <div>
          <b>${item.className} — ${item.subject}</b>
          <div class="meta-line">${admin ? `Teacher: ${item.teacherName} • ` : ''}Mkondo ${item.stream} • ${item.term} • ${item.year}</div>
          <small>${item.count} students • ${new Date(item.createdAt).toLocaleString()}</small>
        </div>
        <div class="history-actions">
          <span class="status">${item.status}</span>
          ${admin ? `<button class="primary" onclick="approve(${item.id})">Approve</button><button class="secondary" onclick="viewSubmission(${item.id})">View</button><button class="danger" onclick="deleteSubmission(${item.id})">Delete</button>` : `<button class="primary" onclick="resubmitSubmission(${item.id})">Resubmit</button>`}
        </div>
      </div>
      ${rowsMarkup}
    </div>
  `;
}
async function loadHistory() {
  try {
    history = await api('/submissions');
    document.getElementById('historyList').innerHTML = history.length ? history.map(item => submissionHtml(item)).join('') : '<div class="card">Hakuna history bado.</div>';
  } catch (error) { notify(error); }
}
async function loadAdmin() {
  if (!requireRole('admin')) return;
  try {
    submissions = await api('/submissions');
    const pending = submissions.filter(item => item.status === 'Pending Admin').length;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('adminList').innerHTML = submissions.length ? submissions.map(item => submissionHtml(item, true)).join('') : '<div class="card">Hakuna submissions bado.</div>';
  } catch (error) { notify(error); }
}
async function approve(id) {
  try {
    await api(`/submissions/${id}/approve`, { method: 'POST' });
    await loadAdmin();
  } catch (error) { notify(error); }
}
async function deleteSubmission(id) {
  try {
    if (!confirm('Unataka kufuta matokeo haya?')) return;
    await api(`/submissions/${id}`, { method: 'DELETE' });
    await loadAdmin();
    await loadHistory();
  } catch (error) { notify(error); }
}
function resubmitSubmission(id) {
  const item = history.find(value => value.id === id);
  if (!item) return;
  currentClass = item.className;
  currentRows = (item.rows || []).map(row => ({ name: row.name || '', adm: row.adm || '', marks: row.marks }));
  document.getElementById('subject').value = item.subject;
  document.getElementById('term').value = item.term;
  document.getElementById('year').value = item.year;
  document.getElementById('stream').value = item.stream || 'A';
  document.getElementById('chosenClass').textContent = currentClass;
  renderRows();
  showPage('results');
  alert('Matokeo yamewekwa tena kwa editing. Ukibofya submit tena, yatawasilishwa tena kwa admin.');
}
function viewSubmission(itemId) {
  const item = submissions.find(value => value.id === itemId);
  if (!item) return;
  document.getElementById('adminDetailContent').innerHTML = `
    <div class="review-row"><b>Class</b><span>${item.className}</span></div>
    <div class="review-row"><b>Teacher</b><span>${item.teacherName}</span></div>
    <div class="review-row"><b>Subject</b><span>${item.subject}</span></div>
    <div class="review-row"><b>Term / Year</b><span>${item.term} ${item.year}</span></div>
    <div class="review-row"><b>Status</b><span>${item.status}</span></div>
    ${rowsTableMarkup(item.rows || [])}
  `;
  document.getElementById('adminDetail').classList.remove('hidden');
}
async function init() { try { const user = await api('/auth/me'); setLoggedIn(user); showPage(user.role === 'admin' ? 'admin' : 'teacherProfile'); } catch (_) { showPage('landing'); } }
init();
