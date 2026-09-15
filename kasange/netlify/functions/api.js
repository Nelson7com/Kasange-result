const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
}
function token(event) {
  const match = (event.headers.cookie || '').match(/kasange_access=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
async function supabase(path, options = {}, accessToken = '') {
  const headers = { apikey: anonKey, 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await fetch(`${supabaseUrl}${path}`, { ...options, headers });
  const body = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(body.msg || body.error_description || body.message || 'Supabase request failed');
  return body;
}
async function currentUser(accessToken) {
  if (!accessToken) return null;
  const authUser = await supabase('/auth/v1/user', {}, accessToken);
  const profiles = await supabase(`/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,name,role,phone,profile_photo`, {}, accessToken);
  let profile = profiles[0];
  if (!profile) {
    const meta = authUser.user_metadata || {};
    const created = await supabase('/rest/v1/profiles?select=id,name,role,phone,profile_photo', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: authUser.id, name: meta.name || authUser.email, role: 'teacher', profile_photo: meta.profile_photo || '' }) }, accessToken);
    profile = created[0];
  }
  return profile ? { ...profile, email: authUser.email } : null;
}

exports.handler = async event => {
  if (!supabaseUrl || !anonKey) return response(500, { error: 'Supabase environment variables hazijawekwa Netlify.' });
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  try {
    if (path === '/auth/register' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !body.email || !body.password) return response(400, { error: 'Jina, email na password ni lazima.' });
      await supabase('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: body.email, password: body.password, data: { name: body.name, profile_photo: body.profile_photo || '' } }) });
      return response(201, { ok: true });
    }
    if (path === '/auth/login' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const auth = await supabase('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: body.email, password: body.password }) });
      const user = await currentUser(auth.access_token);
      if (!user || user.role !== body.role) return response(403, { error: 'Akaunti haina ruhusa ya portal hii.' });
      return response(200, user, { 'Set-Cookie': `kasange_access=${encodeURIComponent(auth.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` });
    }
    if (path === '/auth/logout' && event.httpMethod === 'POST') return response(200, {}, { 'Set-Cookie': 'kasange_access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
    const accessToken = token(event);
    const user = await currentUser(accessToken);
    if (!user) return response(401, { error: 'Hujaingia.' });
    if (path === '/auth/me' && event.httpMethod === 'GET') return response(200, user);
    if (path === '/auth/profile' && event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const authUpdates = {};
      if (body.email && body.email !== user.email) authUpdates.email = body.email;
      if (body.password) authUpdates.password = body.password;
      if (Object.keys(authUpdates).length) await supabase('/auth/v1/user', { method: 'PUT', body: JSON.stringify(authUpdates) }, accessToken);
      const profileUpdates = {};
      if (body.name) profileUpdates.name = body.name;
      if (body.phone !== undefined) profileUpdates.phone = body.phone;
      if (body.profile_photo !== undefined) profileUpdates.profile_photo = body.profile_photo;
      if (Object.keys(profileUpdates).length) await supabase(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(profileUpdates) }, accessToken);
      return response(200, await currentUser(accessToken));
    }
    if (path === '/submissions' && event.httpMethod === 'GET') {
      const filter = user.role === 'teacher' ? `&teacher_id=eq.${user.id}` : '';
      const rows = await supabase(`/rest/v1/submissions?select=*,submission_rows(name,admission_no,marks),profiles(name)&order=id.desc${filter}`, {}, accessToken);
      return response(200, rows.map(item => ({ ...item, className: item.class_name, teacherName: item.profiles?.name || user.name, count: item.submission_rows.length, createdAt: item.created_at, rows: item.submission_rows.map(row => ({ name: row.name, adm: row.admission_no, marks: row.marks })) })));
    }
    if (path === '/submissions' && event.httpMethod === 'POST') {
      if (user.role !== 'teacher') return response(403, { error: 'Teacher login inahitajika.' });
      const body = JSON.parse(event.body || '{}');
      const created = await supabase('/rest/v1/submissions?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ teacher_id: user.id, class_name: body.className, subject: body.subject, term: body.term, year: body.year, stream: body.stream || 'A' }) }, accessToken);
      await supabase('/rest/v1/submission_rows', { method: 'POST', body: JSON.stringify((body.rows || []).map(row => ({ submission_id: created[0].id, name: row.name, admission_no: row.adm || '', marks: Number(row.marks) }))) }, accessToken);
      return response(201, { ok: true });
    }
    const approval = path.match(/^\/submissions\/(\d+)\/approve$/);
    if (approval && event.httpMethod === 'POST') {
      if (user.role !== 'admin') return response(403, { error: 'Admin login inahitajika.' });
      await supabase(`/rest/v1/submissions?id=eq.${approval[1]}`, { method: 'PATCH', body: JSON.stringify({ status: 'Approved' }) }, accessToken);
      return response(200, { ok: true });
    }
    const deletion = path.match(/^\/submissions\/(\d+)$/);
    if (deletion && event.httpMethod === 'DELETE') {
      if (user.role !== 'admin') return response(403, { error: 'Admin login inahitajika.' });
      await supabase(`/rest/v1/submissions?id=eq.${deletion[1]}`, { method: 'DELETE' }, accessToken);
      return response(200, { ok: true });
    }
    return response(404, { error: 'Endpoint haipo.' });
  } catch (error) {
    return response(400, { error: error.message });
  }
};
