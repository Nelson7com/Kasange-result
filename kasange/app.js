let currentClass = '';
let currentRows = [];
let currentTeacher = '';
let currentUser = null;

let submissions = [];
let history = [];

const pages = [
  'landing',
  'teacherLogin',
  'adminLogin',
  'classes',
  'teacherProfile',
  'classInfo',
  'results',
  'review',
  'postSubmit',
  'history',
  'admin',
  'adminProfile'
];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Server error');
  }

  return payload;
}

function notify(error) {
  alert(error instanceof Error ? error.message : error);
}

function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/[<>]/g, '');
}

function normalizeSubject(value) {
  return sanitizeText(value).replace(/\s+/g, ' ');
}

function showPage(id) {
  pages.forEach(page => {
    const element = document.getElementById(page);

    if (element) {
      element.classList.toggle('hidden', page !== id);
    }
  });

  window.scrollTo(0, 0);

  if (id === 'history') {
    loadHistory();
  }

  if (id === 'admin') {
    loadAdmin();
  }
}

function setLoggedIn(user) {
  currentUser = user;
  currentTeacher = user.name || '';

  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.classList.remove('hidden');
  }
}

function requireRole(role) {
  if (!currentUser || currentUser.role !== role) {
    showPage(role === 'admin' ? 'adminLogin' : 'teacherLogin');
    return false;
  }

  return true;
}

/* =========================
   THEME
========================= */

const themeBtn = document.getElementById('themeBtn');

if (themeBtn) {
  themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
  };
}

/* =========================
   LOGOUT
========================= */

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    try {
      await api('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      notify(error);
    }

    currentUser = null;
    currentRows = [];
    currentTeacher = '';

    logoutBtn.classList.add('hidden');

    showPage('landing');
  };
}

/* =========================
   TEACHER ACCOUNT
========================= */

async function createTeacherAccount() {
  const name = document
    .getElementById('teacherCreateName')
    .value
    .trim();

  const email = document
    .getElementById('teacherCreateEmail')
    .value
    .trim();

  const password = document
    .getElementById('teacherCreatePassword')
    .value;

  if (!name || !password) {
    notify('Jaza jina na password kabla ya kuunda akaunti ya mwalimu.');
    return;
  }

  try {
    const photoInput =
      document.getElementById('teacherCreatePhoto');

    const photo = photoInput?.files?.[0];

    let profilePhoto = '';

    if (photo) {
      const reader = new FileReader();

      profilePhoto = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error('Image upload failed'));

        reader.readAsDataURL(photo);
      });
    }

    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        profile_photo: profilePhoto
      })
    });

    alert(
      'Akaunti ya mwalimu imeundwa. Sasa ingia kwa jina lako na password.'
    );

    document.getElementById(
      'teacherCreatePassword'
    ).value = '';

  } catch (error) {
    notify(error);
  }
}

/* =========================
   TEACHER LOGIN
========================= */

async function teacherEnter() {
  const name = document
    .getElementById('teacherLoginName')
    .value
    .trim();

  const password = document
    .getElementById('teacherLoginPassword')
    .value;

  if (!name || !password) {
    notify('Jaza jina la mwalimu na password yako.');
    return;
  }

  try {
    const user = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        name,
        password,
        role: 'teacher'
      })
    });

    setLoggedIn(user);

    document.getElementById('profileName').value =
      user.name || name;

    document.getElementById('profilePhone').value =
      user.phone || '';

    document.getElementById('profileEmail').value =
      user.email || '';

    document.getElementById('profilePassword').value = '';

    document.getElementById(
      'profilePasswordConfirm'
    ).value = '';

    showPage('teacherProfile');

  } catch (error) {
    notify(error);
  }
}

/* =========================
   ADMIN LOGIN
========================= */

async function adminEnter() {
  try {
    const name = document
      .getElementById('adminName')
      .value
      .trim();

    const password = document
      .getElementById('adminPassword')
      .value;

    if (!name || !password) {
      notify('Jaza jina la admin na password.');
      return;
    }

    const user = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        name,
        password,
        role: 'admin'
      })
    });

    setLoggedIn(user);

    const adminProfileName =
      document.getElementById('adminProfileName');

    if (adminProfileName) {
      adminProfileName.value = user.name || '';
    }

    showPage('adminProfile');

  } catch (error) {
    notify(error);
  }
}

/* =========================
   IMAGE PREVIEW
========================= */

function preview(input, id) {
  if (!input?.files?.[0]) {
    return;
  }

  const reader = new FileReader();

  reader.onload = event => {
    const target = document.getElementById(id);

    if (target) {
      target.innerHTML = `
        <img
          src="${event.target.result}"
          alt="Profile"
        >
      `;
    }
  };

  reader.readAsDataURL(input.files[0]);
}

/* =========================
   TEACHER PROFILE
========================= */

async function confirmTeacherProfile() {
  if (!requireRole('teacher')) {
    return;
  }

  const name = document
    .getElementById('profileName')
    .value
    .trim();

  const phone = document
    .getElementById('profilePhone')
    .value
    .trim();

  const email = document
    .getElementById('profileEmail')
    .value
    .trim();

  const password = document
    .getElementById('profilePassword')
    .value;

  const passwordConfirm = document
    .getElementById('profilePasswordConfirm')
    .value;

  const profilePhoto =
    document.getElementById('teacherPhoto')
      ?.files?.[0];

  if (!name || !phone || !email) {
    notify(
      'Jina, namba ya simu na email ni lazima.'
    );

    return;
  }

  if (password || passwordConfirm) {
    if (password.length < 6) {
      notify(
        'Password lazima iwe na angalau herufi 6.'
      );

      return;
    }

    if (password !== passwordConfirm) {
      notify('Password hailingani.');
      return;
    }
  }

  try {
    let photoData =
      currentUser?.profile_photo || '';

    if (profilePhoto) {
      photoData = await new Promise(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () =>
            resolve(reader.result);

          reader.onerror = () =>
            reject(
              new Error('Image upload failed')
            );

          reader.readAsDataURL(profilePhoto);
        }
      );
    }

    await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name,
        phone,
        email,
        profile_photo: photoData,
        password: password || undefined
      })
    });

    currentTeacher = name;

    currentUser = {
      ...currentUser,
      name,
      phone,
      email,
      profile_photo: photoData,
      role: 'teacher'
    };

    showPage('classes');

  } catch (error) {
    notify(error);
  }
}

/* =========================
   ADMIN PROFILE
========================= */

function saveAdminProfile() {
  if (requireRole('admin')) {
    showPage('admin');
  }
}

/* =========================
   CLASS
========================= */

function selectClass(value) {
  if (!requireRole('teacher')) {
    return;
  }

  currentClass = value;

  const chosenClass =
    document.getElementById('chosenClass');

  if (chosenClass) {
    chosenClass.textContent = value;
  }

  showPage('classInfo');
}

/* =========================
   CLASS VALIDATION
========================= */

function validateClassInfo() {
  const subject = normalizeSubject(
    document.getElementById('subject').value
  );

  const term = sanitizeText(
    document.getElementById('term').value
  );

  const year = sanitizeText(
    document.getElementById('year').value
  );

  const stream = sanitizeText(
    document.getElementById('stream').value
  ).toUpperCase();

  if (!subject || !term || !year) {
    notify('Jaza Somo, Term na Mwaka.');
    return false;
  }

  if (!/^\d{4}$/.test(year)) {
    notify(
      'Mwaka lazima uwe miaka 4 ya namba, mfano 2026.'
    );

    return false;
  }

  if (!/^Term\s*[1-3]$/i.test(term)) {
    notify(
      'Term lazima iwe Term 1, Term 2, au Term 3.'
    );

    return false;
  }

  if (stream && !/^[A-Z]$/.test(stream)) {
    notify(
      'Mkondo lazima uwe herufi moja, mfano A, B au C.'
    );

    return false;
  }

  return true;
}

/* =========================
   RESULTS PAGE
========================= */

function goToResults() {
  const subject = normalizeSubject(
    document.getElementById('subject').value
  );

  const term = sanitizeText(
    document.getElementById('term').value
  );

  const year = sanitizeText(
    document.getElementById('year').value
  );

  const stream = sanitizeText(
    document.getElementById('stream').value
  ).toUpperCase();

  if (!validateClassInfo()) {
    return;
  }

  document.getElementById('subject').value = subject;
  document.getElementById('term').value = term;
  document.getElementById('year').value = year;
  document.getElementById('stream').value =
    stream || 'A';

  document.getElementById('infoSummary').textContent =
    `${currentClass} • ${subject} • ${term} • ${year} • Mkondo ${stream || 'A'} • Mwalimu: ${currentTeacher}`;

  document.getElementById('resultClass').textContent =
    currentClass;

  document.getElementById('resultMeta').textContent =
    `${subject} | ${term} | ${year} | Mkondo ${stream || 'A'} | Mwalimu: ${currentTeacher}`;

  if (!currentRows.length) {
    currentRows = [
      {
        name: '',
        adm: '',
        marks: ''
      },
      {
        name: '',
        adm: '',
        marks: ''
      },
      {
        name: '',
        adm: '',
        marks: ''
      }
    ];
  }

  renderRows();

  showPage('results');
}

/* =========================
   GRADE
========================= */

function grade(marks) {
  const mark = Number(marks);

  if (mark >= 80) return 'A';
  if (mark >= 70) return 'B+';
  if (mark >= 60) return 'B';
  if (mark >= 50) return 'C';
  if (mark >= 40) return 'D';

  return 'F';
}

/* =========================
   RENDER STUDENTS
========================= */

function renderRows() {
  const resultBody =
    document.getElementById('resultBody');

  if (!resultBody) {
    return;
  }

  resultBody.innerHTML = currentRows
    .map((row, index) => `
      <tr>
        <td>${index + 1}</td>

        <td>
          <input
            value="${sanitizeText(row.name)}"
            onchange="currentRows[${index}].name=sanitizeText(this.value)"
            placeholder="Jina"
          >
        </td>

        <td>
          <input
            value="${sanitizeText(row.adm)}"
            onchange="currentRows[${index}].adm=sanitizeText(this.value)"
            placeholder="Admission No. (optional)"
          >
        </td>

        <td>
          <input
            type="number"
            min="0"
            max="100"
            value="${row.marks}"
            onchange="currentRows[${index}].marks=this.value"
            placeholder="0-100"
          >
        </td>

        <td>
          <b>
            ${
              row.marks !== ''
                ? grade(row.marks)
                : '-'
            }
          </b>
        </td>

        <td>
          <button
            class="small-btn"
            onclick="deleteStudent(${index})"
          >
            Futa
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function addStudent() {
  currentRows.push({
    name: '',
    adm: '',
    marks: ''
  });

  renderRows();
}

function deleteStudent(index) {
  currentRows.splice(index, 1);

  if (!currentRows.length) {
    currentRows.push({
      name: '',
      adm: '',
      marks: ''
    });
  }

  renderRows();
}

/* =========================
   VALIDATE STUDENTS
========================= */

function validateRows(rows) {
  if (!rows.length) {
    notify('Hakuna mwanafunzi aliyeingizwa.');
    return false;
  }

  for (const row of rows) {
    const name = sanitizeText(row.name);

    if (!name) {
      notify(
        'Jina la mwanafunzi haliwezi kuwa tupu.'
      );

      return false;
    }

    if (name.length < 2) {
      notify(
        'Jina la mwanafunzi ni fupi sana.'
      );

      return false;
    }

    if (
      row.marks === '' ||
      row.marks === null ||
      row.marks === undefined ||
      Number.isNaN(Number(row.marks))
    ) {
      notify(
        'Marks za kila mwanafunzi zinahitajika.'
      );

      return false;
    }

    const mark = Number(row.marks);

    if (
      mark < 0 ||
      mark > 100 ||
      !Number.isInteger(mark)
    ) {
      notify(
        'Marks lazima ziwe namba kamili kati ya 0 na 100.'
      );

      return false;
    }

    if (
      row.adm &&
      !/^[A-Za-z0-9\-\/ ]{2,30}$/.test(
        sanitizeText(row.adm)
      )
    ) {
      notify(
        'Admission No. ina format isiyoruhusiwa.'
      );

      return false;
    }
  }

  return true;
}

/* =========================
   REVIEW
========================= */

function reviewSubmission() {
  if (!validateRows(currentRows)) {
    return;
  }

  const subject = normalizeSubject(
    document.getElementById('subject').value
  );

  const term = sanitizeText(
    document.getElementById('term').value
  );

  const year = sanitizeText(
    document.getElementById('year').value
  );

  const stream =
    sanitizeText(
      document.getElementById('stream').value
    ).toUpperCase() || 'A';

  document.getElementById('reviewContent').innerHTML = `
    <div class="review-row">
      <b>Darasa</b>
      <span>${currentClass}</span>
    </div>

    <div class="review-row">
      <b>Mkondo</b>
      <span>${stream}</span>
    </div>

    <div class="review-row">
      <b>Somo</b>
      <span>${subject}</span>
    </div>

    <div class="review-row">
      <b>Term / Mwaka</b>
      <span>${term} ${year}</span>
    </div>

    <div class="review-row">
      <b>Mwalimu</b>
      <span>${currentTeacher}</span>
    </div>

    <div class="review-row">
      <b>Idadi</b>
      <span>${currentRows.length}</span>
    </div>

    <div class="review-row">
      <b>Wanafunzi</b>
      <span>
        ${currentRows
          .map(
            row =>
              `${sanitizeText(row.name)}
              (${sanitizeText(row.adm) || 'No Adm'})
              ${row.marks} -
              ${grade(row.marks)}`
          )
          .join(', ')}
      </span>
    </div>
  `;

  showPage('review');
}

/* =========================
   SUBMIT RESULTS TO BACKEND
========================= */

async function submitResults() {
  if (!validateRows(currentRows)) {
    return;
  }

  try {
    await api('/submissions', {
      method: 'POST',

      body: JSON.stringify({
        className: currentClass,

        subject: normalizeSubject(
          document.getElementById('subject').value
        ),

        term: sanitizeText(
          document.getElementById('term').value
        ),

        year: sanitizeText(
          document.getElementById('year').value
        ),

        stream:
          sanitizeText(
            document.getElementById('stream').value
          ).toUpperCase() || 'A',

        rows: currentRows.map(row => ({
          name: sanitizeText(row.name),
          adm: sanitizeText(row.adm),
          marks: Number(row.marks)
        }))
      })
    });

    currentRows = [];

    notify(
      'Matokeo yamesubmit kwa Admin.'
    );

    showPage('postSubmit');

  } catch (error) {
    notify(error);
  }
}

/* =========================
   RESULTS TABLE
========================= */

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

          ${
            rows.length
              ? rows
                  .map(
                    (row, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${row.name || '-'}</td>
                        <td>${row.adm || '—'}</td>
                        <td>${row.marks}</td>
                        <td>${grade(row.marks)}</td>
                      </tr>
                    `
                  )
                  .join('')
              : `
                <tr>
                  <td colspan="5">
                    No results
                  </td>
                </tr>
              `
          }

        </tbody>

      </table>

    </div>
  `;
}

/* =========================
   HISTORY / ADMIN ITEM
========================= */

function submissionHtml(item, admin = false) {
  const rowsMarkup =
    rowsTableMarkup(item.rows || []);

  return `
    <div class="history-item">

      <div class="history-top-row">

        <div>

          <b>
            ${item.className || item.class || '-'}
            — ${item.subject || '-'}
          </b>

          <div class="meta-line">
            ${
              admin
                ? `Teacher: ${item.teacherName || item.teacher || '-'} • `
                : ''
            }

            Mkondo ${item.stream || 'A'}
            • ${item.term || '-'}
            • ${item.year || '-'}
          </div>

          <small>
            ${item.count || (item.rows || []).length}
            students
            •
            ${
              item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : ''
            }
          </small>

        </div>

        <div class="history-actions">

          <span class="status">
            ${item.status || 'Pending Admin'}
          </span>

          ${
            admin
              ? `
                <button
                  class="primary"
                  onclick="approve(${item.id})"
                >
                  Approve
                </button>

                <button
                  class="secondary"
                  onclick="viewSubmission(${item.id})"
                >
                  View
                </button>

                <button
                  class="danger"
                  onclick="deleteSubmission(${item.id})"
                >
                  Delete
                </button>
              `
              : `
                <button
                  class="primary"
                  onclick="resubmitSubmission(${item.id})"
                >
                  Resubmit
                </button>
              `
          }

        </div>

      </div>

      ${rowsMarkup}

    </div>
  `;
}

/* =========================
   TEACHER HISTORY
========================= */

async function loadHistory() {
  try {
    history = await api('/submissions');

    const historyList =
      document.getElementById('historyList');

    if (!historyList) {
      return;
    }

    historyList.innerHTML = history.length
      ? history
          .map(item => submissionHtml(item))
          .join('')
      : `
        <div class="card">
          Hakuna history bado.
        </div>
      `;

  } catch (error) {
    notify(error);
  }
}

/* =========================
   ADMIN DASHBOARD
========================= */

async function loadAdmin() {
  if (!requireRole('admin')) {
    return;
  }

  try {
    submissions =
      await api('/submissions');

    const pending =
      submissions.filter(
        item =>
          item.status === 'Pending Admin'
      ).length;

    const pendingCount =
      document.getElementById('pendingCount');

    if (pendingCount) {
      pendingCount.textContent = pending;
    }

    const adminList =
      document.getElementById('adminList');

    if (!adminList) {
      return;
    }

    adminList.innerHTML =
      submissions.length
        ? submissions
            .map(item =>
              submissionHtml(item, true)
            )
            .join('')
        : `
          <div class="card">
            Hakuna submissions bado.
          </div>
        `;

  } catch (error) {
    notify(error);
  }
}

/* =========================
   APPROVE
========================= */

async function approve(id) {
  try {
    await api(
      `/submissions/${id}/approve`,
      {
        method: 'POST'
      }
    );

    await loadAdmin();

  } catch (error) {
    notify(error);
  }
}

/* =========================
   DELETE
========================= */

async function deleteSubmission(id) {
  try {
    if (
      !confirm(
        'Unataka kufuta matokeo haya?'
      )
    ) {
      return;
    }

    await api(
      `/submissions/${id}`,
      {
        method: 'DELETE'
      }
    );

    await loadAdmin();
    await loadHistory();

  } catch (error) {
    notify(error);
  }
}

/* =========================
   RESUBMIT
========================= */

function resubmitSubmission(id) {
  const item =
    history.find(
      value => value.id === id
    );

  if (!item) {
    return;
  }

  currentClass =
    item.className || item.class || '';

  currentRows =
    (item.rows || []).map(row => ({
      name: row.name || '',
      adm: row.adm || '',
      marks: row.marks
    }));

  document.getElementById('subject').value =
    item.subject || '';

  document.getElementById('term').value =
    item.term || '';

  document.getElementById('year').value =
    item.year || '';

  document.getElementById('stream').value =
    item.stream || 'A';

  document.getElementById('chosenClass').textContent =
    currentClass;

  renderRows();

  showPage('results');

  alert(
    'Matokeo yamewekwa tena kwa editing. Ukibofya submit tena, yatawasilishwa tena kwa admin.'
  );
}

/* =========================
   VIEW SUBMISSION
========================= */

function viewSubmission(itemId) {
  const item =
    submissions.find(
      value => value.id === itemId
    );

  if (!item) {
    return;
  }

  document.getElementById(
    'adminDetailContent'
  ).innerHTML = `

    <div class="review-row">
      <b>Class</b>
      <span>
        ${item.className || item.class || '-'}
      </span>
    </div>

    <div class="review-row">
      <b>Teacher</b>
      <span>
        ${item.teacherName || item.teacher || '-'}
      </span>
    </div>

    <div class="review-row">
      <b>Subject</b>
      <span>
        ${item.subject || '-'}
      </span>
    </div>

    <div class="review-row">
      <b>Term / Year</b>
      <span>
        ${item.term || '-'}
        ${item.year || '-'}
      </span>
    </div>

    <div class="review-row">
      <b>Stream</b>
      <span>
        ${item.stream || 'A'}
      </span>
    </div>

    <div class="review-row">
      <b>Status</b>
      <span>
        ${item.status || '-'}
      </span>
    </div>

    ${rowsTableMarkup(item.rows || [])}

  `;

  document
    .getElementById('adminDetail')
    .classList.remove('hidden');
}

/* =========================
   INITIALIZE
========================= */

async function init() {
  try {
    const user =
      await api('/auth/me');

    setLoggedIn(user);

    showPage(
      user.role === 'admin'
        ? 'admin'
        : 'teacherProfile'
    );

  } catch (_) {
    showPage('landing');
  }
}

init();