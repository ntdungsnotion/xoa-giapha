const URL_DU_AN = Deno.env.get('SUPABASE_URL');
const KHOA_CONG_KHAI = Deno.env.get('SUPABASE_ANON_KEY');
const KHOA_BI_MAT = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BANG_CHU = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function traLoi(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function sinhMatKhau(dai = 10) {
  const so = crypto.getRandomValues(new Uint32Array(dai));
  let kq = '';
  for (const n of so) kq += BANG_CHU[n % BANG_CHU.length];
  return kq;
}

async function laQuanTriHeThong(theNguoiGoi) {
  const r = await fetch(URL_DU_AN + '/rest/v1/rpc/la_quan_tri_he_thong', {
    method: 'POST',
    headers: {
      apikey: KHOA_CONG_KHAI,
      Authorization: theNguoiGoi,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return traLoi({ ok: false, loi: 'Chỉ nhận POST.' });

  const the = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/.test(the)) return traLoi({ ok: false, loi: 'Chưa đăng nhập.' });
  if (!(await laQuanTriHeThong(the))) {
    return traLoi({ ok: false, loi: 'Chỉ Quản trị hệ thống được tạo tài khoản.' });
  }

  let vao = {};
  try { vao = await req.json(); } catch (_) {   }
  const email = String(vao.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return traLoi({ ok: false, loi: 'Địa chỉ email không đúng khuôn.' });
  }

  const matKhau = sinhMatKhau();
  const quan = { apikey: KHOA_BI_MAT, Authorization: 'Bearer ' + KHOA_BI_MAT };

  const r = await fetch(URL_DU_AN + '/auth/v1/admin/users', {
    method: 'POST',
    headers: { ...quan, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: matKhau, email_confirm: true }),
  });
  const u = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = String(u.msg || u.message || u.error_description || u.error || r.status);
    if (/already|exists|registered/i.test(m)) {
      return traLoi({ ok: false, loi: 'Email ' + email + ' đã có tài khoản.' });
    }
    return traLoi({ ok: false, loi: 'Máy chủ Auth từ chối: ' + m });
  }

  let maNgan = '';
  const t = await fetch(URL_DU_AN + '/rest/v1/tai_khoan?select=ma_ngan&user_id=eq.' + u.id, {
    headers: quan,
  });
  if (t.ok) maNgan = ((await t.json())[0] || {}).ma_ngan || '';

  return traLoi({ ok: true, loi: null, userId: u.id, email, maNgan, matKhau });
});
