import {
  SUPABASE_URL, SUPABASE_KHOA_CONG_KHAI, KHO_ANH,
  NGUOI_QUAN_LY, thieuCauHinh, SAO_LUU_WEB_APP,
} from '../cau-hinh.js';
import { fullName } from '../utils/text.js';

let khach = null;

export function coKetNoi() {
  return !!layKhach();
}

function layKhach() {
  if (khach) return khach;
  if (typeof window === 'undefined' || !window.supabase) return null;
  if (thieuCauHinh()) return null;

  khach = window.supabase.createClient(SUPABASE_URL, SUPABASE_KHOA_CONG_KHAI, {
    auth: {
      persistSession:   true,
      autoRefreshToken: true,
    },
  });
  return khach;
}

function cauLoi(e) {
  if (!e) return 'Không rõ lỗi.';
  const m = String(e.message || e);
  if (/Failed to fetch|NetworkError/i.test(m)) {
    return 'Không nối được tới máy chủ. Kiểm tra mạng rồi thử lại.';
  }
  if (/Invalid login credentials/i.test(m)) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (/Email not confirmed/i.test(m)) {
    return 'Tài khoản chưa xác nhận. Mở hộp thư và bấm đường liên kết ' +
           'Supabase vừa gửi, rồi đăng nhập lại.';
  }
  if (/issued at future|JWTIssuedAtFuture/i.test(m)) {
    return 'Vé đăng nhập của trình duyệt được cấp lúc đồng hồ máy còn lệch, '
         + 'nên máy chủ từ chối. Bấm Đăng xuất rồi đăng nhập lại là xong.';
  }
  if (/user is banned|user_banned/i.test(m)) {
    return 'Tài khoản này đang bị khoá. Liên hệ Quản trị hệ thống để được mở lại.';
  }
  if (/JWT expired|token is expired/i.test(m)) {
    return 'Vé đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại việc vừa làm.';
  }
  if (/Could not find the function/i.test(m)) {
    return 'Máy chủ chưa có chức năng này — file SQL mới chưa được dán vào Supabase.';
  }
  return m;
}

export async function dangNhap(email, matKhau) {
  const k = layKhach();
  if (!k) return { ok: false, loi: thieuCauHinh() || 'Chưa nạp được thư viện Supabase.' };

  const { data, error } = await k.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: String(matKhau || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return { ok: true, loi: null, email: data.user && data.user.email };
}

export async function dangXuat() {
  const k = layKhach();
  if (!k) return { ok: true };
  const { error } = await k.auth.signOut();
  return error ? { ok: false, loi: cauLoi(error) } : { ok: true, loi: null };
}

export async function quenMatKhau(email) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { error } = await k.auth.resetPasswordForEmail(
    String(email || '').trim(),
    { redirectTo: window.location.href });
  return error ? { ok: false, loi: cauLoi(error) } : { ok: true, loi: null };
}

export async function doiMatKhau(matKhauCu, matKhauMoi) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };

  const nguoi = await nguoiDangNhap();
  if (!nguoi || !nguoi.email) return { ok: false, loi: 'Chưa đăng nhập.' };

  const { error: loiCu } = await k.auth.signInWithPassword({
    email: nguoi.email, password: String(matKhauCu || ''),
  });
  if (loiCu) return { ok: false, loi: 'Mật khẩu hiện tại không đúng.' };

  const { error } = await k.auth.updateUser({ password: String(matKhauMoi || '') });
  return error ? { ok: false, loi: cauLoi(error) } : { ok: true, loi: null };
}

export async function nguoiDangNhap() {
  const k = layKhach();
  if (!k) return null;
  const { data } = await k.auth.getUser();
  return (data && data.user) || null;
}

async function nguoiTrongPhien() {
  const k = layKhach();
  if (!k) return null;
  const { data } = await k.auth.getSession();
  return (data && data.session && data.session.user) || null;
}

export async function layPhien({ docCayLuon = false } = {}) {
  const nen = {
    daDangNhap: false, email: '', vaiTro: null,
    docDuoc: false, suaDuoc: false, treeId: null,
    laQuanTriHeThong: false, maNgan: '', hoTen: '',
    userId: '', duocTaoCay: false, biKhoa: false,
    nguoiTrungTamMacDinh: null, hienNgayGio: false,
    maNguoiGan: '', tenNguoiGan: '', cayChinhId: null, tenDongHo: '',
    nguoiQuanLy: NGUOI_QUAN_LY, loi: null,
  };

  const thieu = thieuCauHinh();
  if (thieu) return { ...nen, loi: thieu };

  const k = layKhach();
  if (!k) return { ...nen, loi: 'Chưa nạp được thư viện Supabase (vendor/supabase.js).' };

  const nguoi = await nguoiTrongPhien();
  if (!nguoi) return nen;

  const goi = await layGoiPhien(k, docCayLuon);
  const [{ data: ds, error }, { data: coQuyenHT }, { data: maTk }, { data: hangTk }, { data: coBiKhoa },
         { data: caiDat }] = goi ? [
      { data: goi.ds, error: null }, { data: goi.laQuanTriHeThong }, { data: goi.maNgan },
      { data: goi.tk }, { data: goi.biKhoa }, { data: goi.caiDat },
    ] :
    await Promise.all([
      k.from('tree_members').select('tree_id, role').eq('user_id', nguoi.id),
      k.rpc('la_quan_tri_he_thong'),
      k.rpc('ma_tai_khoan_cua_toi'),
      k.from('tai_khoan').select('ho_ten, duoc_tao_cay, khoa_ly_do, person_id, cay_chinh_id')
        .eq('user_id', nguoi.id).maybeSingle(),
      k.rpc('bi_khoa'),
      k.from('user_settings').select('tree_id, dang_mo, focus_person_id, hien_ngay_gio')
        .eq('user_id', nguoi.id),
    ]);

  const laQuanTriHeThong = Boolean(coQuyenHT);
  const maNgan = maTk || '';
  const hoTen = (hangTk && hangTk.ho_ten) || '';
  const biKhoa = Boolean(coBiKhoa);
  const duocTaoCay = laQuanTriHeThong || Boolean(hangTk && hangTk.duoc_tao_cay);

  const maNguoiGan = (hangTk && hangTk.person_id) || '';
  const cayChinhId = (hangTk && hangTk.cay_chinh_id) || null;
  const hoiTen = goi
    ? Promise.resolve([(goi.nguoiGan && fullName(goi.nguoiGan)) || '', goi.tenDongHo || ''])
    : Promise.all([
      maNguoiGan ? layTenNguoiGan(k, maNguoiGan) : Promise.resolve(''),
      cayChinhId ? layTenCayChinh(k, cayChinhId) : Promise.resolve(''),
    ]);
  const nenNguoi = async () => {
    const [tenNguoiGan, tenDongHo] = await hoiTen;
    return { ...nen, laQuanTriHeThong, maNgan, hoTen,
             userId: nguoi.id, duocTaoCay, biKhoa,
             maNguoiGan, tenNguoiGan, cayChinhId, tenDongHo };
  };

  const goiCay = (treeId) => goi && goi.treeId && goi.treeId === treeId;
  const docTruocCay = (treeId) => {
    if (!docCayLuon) return;
    const hua = goiCay(treeId) && goi.dong ? Promise.resolve(ghepGoiDong(goi.dong)) : docDong(treeId);
    docTruoc = { treeId, luc: Date.now(), hua };
  };
  const caiDatCuaCay = (treeId) => goiCay(treeId)
    ? Promise.resolve({ ...caiDatTuDong(caiDat, treeId), tenCay: goi.tenCay || '', maCay: goi.maCay || '' })
    : caiDatCay(k, treeId, caiDat);
  const vongCay = (treeId, hoiSua) => {
    docTruocCay(treeId);
    if (goiCay(treeId)) {
      return Promise.all([goi.tinRac || {}, caiDatCuaCay(treeId), hoiSua ? goi.suaDuoc === true : true]);
    }
    return Promise.all([
      tinThungRac(treeId),
      caiDatCuaCay(treeId),
      hoiSua ? coTheSua(treeId) : Promise.resolve(true),
    ]);
  };

  if (biKhoa) {
    return {
      ...(await nenNguoi()), daDangNhap: true, email: nguoi.email || '',
      vaiTro: null, docDuoc: false, suaDuoc: false,
      trangThai: 'khoa', khoaLyDo: (hangTk && hangTk.khoa_ly_do) || '',
    };
  }

  if (error) {
    return { ...(await nenNguoi()), daDangNhap: true, email: nguoi.email, loi: cauLoi(error) };
  }

  if (laQuanTriHeThong) {
    const treeId = goi ? goi.treeId
      : (ds && ds.length) ? cayDangChon(ds, caiDat) : await cayDauTien(k);

    const [tinRac, cd] = treeId ? await vongCay(treeId, false) : [{}, {}];
    if (tinRac.daXoa) {
      docTruoc = null;
      return {
        ...(await nenNguoi()), daDangNhap: true, email: nguoi.email || '',
        vaiTro: 'quan_tri_he_thong', docDuoc: false, suaDuoc: false,
        trangThai: 'daxoa', treeId, ...tinRac,
      };
    }

    return {
      ...(await nenNguoi()),
      daDangNhap: true,
      email: nguoi.email || '',
      vaiTro: 'quan_tri_he_thong',
      docDuoc: true,
      suaDuoc: true,
      trangThai: 'daduyet',
      treeId,
      ...cd,
    };
  }

  if (!ds || !ds.length) {
    const { data: cayMacDinh } = goi
      ? { data: goi.nguon === 'mac_dinh' ? goi.treeId : null }
      : await k.rpc('cay_mac_dinh');
    if (cayMacDinh) {
      docTruocCay(cayMacDinh);
      return {
        ...(await nenNguoi()),
        daDangNhap: true,
        email: nguoi.email || '',
        vaiTro: 'xem',
        docDuoc: true,
        suaDuoc: false,
        trangThai: 'daduyet',
        treeId: cayMacDinh,
        ...(await caiDatCuaCay(cayMacDinh)),
      };
    }

    const tt = await trangThaiCuaToi();
    return {
      ...(await nenNguoi()),
      daDangNhap: true,
      email: nguoi.email,
      trangThai: tt.trangThai,
      treeId: tt.treeId || null,
      soCay: tt.soCay,
      tenCay: tt.tenCay,
      maCay: tt.maCay,
      moiVai: tt.moiVai,
      emailNguoiMoi: tt.emailNguoiMoi,
    };
  }

  const treeId = goi ? goi.treeId : cayDangChon(ds, caiDat);
  const chan = ds.find((m) => m.tree_id === treeId);
  const vaiTro = chan ? chan.role : 'xem';

  const [tinRac, cd, suaDuoc] = await vongCay(treeId, true);
  if (tinRac.daXoa) {
    docTruoc = null;
    return {
      ...(await nenNguoi()), daDangNhap: true, email: nguoi.email || '',
      vaiTro, docDuoc: false, suaDuoc: false,
      trangThai: 'daxoa', treeId, ...tinRac,
    };
  }

  return {
    ...(await nenNguoi()),
    daDangNhap: true,
    email:   nguoi.email || '',
    vaiTro,
    docDuoc: true,
    suaDuoc,
    trangThai: 'daduyet',
    treeId,
    ...cd,
  };
}

async function layTenNguoiGan(k, maNguoi) {
  const { data } = await k.from('persons').select('names').eq('id', maNguoi).maybeSingle();
  return (data && fullName(data)) || '';
}

async function layTenCayChinh(k, treeId) {
  const { data } = await k.from('trees').select('name').eq('id', treeId).maybeSingle();
  return (data && data.name) || '';
}

async function tinThungRac(treeId) {
  const k = layKhach();
  if (!k || !treeId) return {};
  const { data, error } = await k.rpc('tin_thung_rac', { p_tree: treeId });
  if (error || !data) return {};
  return data;
}

async function coTheSua(treeId) {
  const k = layKhach();
  if (!k) return false;
  const { data, error } = await k.rpc('co_the_sua', { p_tree: treeId });
  return !error && data === true;
}

function cayDangChon(ds, caiDat) {
  const daChon = (caiDat || []).filter((r) => r.dang_mo === true).map((r) => r.tree_id);
  const hop = ds.find((m) => daChon.includes(m.tree_id));
  return hop ? hop.tree_id : ds[0].tree_id;
}

async function cayDauTien(k) {
  const { data } = await k.from('trees').select('id').order('name').limit(1);
  return (data && data[0] && data[0].id) || null;
}

async function caiDatCay(k, treeId, caiDat) {
  const { data: cay } = await k.from('trees').select('name, tree_code').eq('id', treeId).maybeSingle();
  return {
    ...caiDatTuDong(caiDat, treeId),
    tenCay: (cay && cay.name) || '',
    maCay: (cay && cay.tree_code) || '',
  };
}

function caiDatTuDong(caiDat, treeId) {
  const data = (caiDat || []).find((r) => r.tree_id === treeId) || null;
  return {
    nguoiTrungTamMacDinh: (data && data.focus_person_id) || null,
    hienNgayGio: !!(data && data.hien_ngay_gio),
  };
}

async function layGoiPhien(k, docCay) {
  try {
    const { data, error } = await k.rpc('mo_phien', { p_doc_cay: docCay === true });
    if (error || !data || data.ok !== true) return null;
    return data;
  } catch (_) {
    return null;
  }
}

export async function datNguoiTrungTamMacDinh(treeId, personId) {
  const k = layKhach();
  const nguoi = await nguoiDangNhap();
  if (!k || !nguoi) return { ok: false, loi: 'Chưa đăng nhập.' };

  const { error } = await k.from('user_settings').upsert({
    user_id: nguoi.id, tree_id: treeId, focus_person_id: personId,
  });
  return error ? { ok: false, loi: cauLoi(error) } : { ok: true, loi: null };
}

export async function xoaNguoiTrungTamMacDinh(treeId) {
  return datNguoiTrungTamMacDinh(treeId, null);
}

const GIOI_HAN = 20000;

let docTruoc = null;
const HAN_DOC_TRUOC_MS = 15000;

export function layDong(treeId) {
  const san = docTruoc;
  docTruoc = null;
  if (san && san.treeId === treeId && Date.now() - san.luc < HAN_DOC_TRUOC_MS) return san.hua;
  return docDong(treeId);
}

async function docDong(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', dong: null };

  try {
    const [cay, chung, sources, imports, maNhatKy] = await Promise.all([
      k.from('trees').select('*').eq('id', treeId).maybeSingle(),
      k.rpc('doc_cay', { p_tree: treeId }),
      k.from('sources').select('*').eq('tree_id', treeId).range(0, GIOI_HAN),
      k.from('imports').select('*').eq('tree_id', treeId)
        .order('at', { ascending: true }).range(0, GIOI_HAN),
      k.from('v_ma_nhat_ky').select('ma').eq('tree_id', treeId).range(0, GIOI_HAN),
    ]);

    for (const kq of [cay, chung, sources, imports, maNhatKy]) {
      if (kq.error) return { ok: false, loi: cauLoi(kq.error), dong: null };
    }
    return ghepDong(cay.data, chung.data, sources.data, imports.data,
                    (maNhatKy.data || []).map((r) => r.ma));
  } catch (e) {
    return { ok: false, loi: cauLoi(e), dong: null };
  }
}

function ghepGoiDong(d) {
  return ghepDong(d.tree, d.doc_cay, d.sources, d.imports, d.ma_nhat_ky);
}

function ghepDong(cay, chung, sources, imports, maNhatKy) {
  if (!chung || chung.ok !== true) {
    return { ok: false, dong: null,
             loi: (chung && chung.loi) || 'Máy chủ không trả về dữ liệu gia phả này.' };
  }
  if (!cay) {
    return { ok: false, loi: 'Không đọc được gia phả này. Có thể bạn đã ' +
                            'bị gỡ khỏi danh sách người được xem.', dong: null };
  }

  return {
    ok: true, loi: null,
    dong: {
      tree:     cay,
      persons:  chung.persons  || [],
      unions:   chung.unions   || [],
      children: chung.children || [],
      media:    chung.media    || [],
      vanhDai:  chung.vanh_dai || [],
      sources:  sources  || [],
      imports:  imports  || [],
      maNhatKy: maNhatKy || [],
      doi:      Array.isArray(chung.doi) ? chung.doi : [],
      cheConSong: chung.che_con_song === true,
      biChe:      Array.isArray(chung.bi_che) ? chung.bi_che : [],
    },
  };
}

export async function docDoi(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', dong: [] };
  try {
    const { data, error } = await k.rpc('doc_doi_cay', { p_tree: treeId });
    if (!error) {
      if (!Array.isArray(data)) return { ok: false, loi: 'Không đọc được Đời của gia phả này.', dong: [] };
      return { ok: true, loi: null, dong: data };
    }
    if (!/Could not find the function/i.test(error.message || '')) {
      return { ok: false, loi: cauLoi(error), dong: [] };
    }
    const cu = await k.from('tree_persons').select('person_id, doi')
      .eq('tree_id', treeId).range(0, GIOI_HAN);
    if (cu.error) return { ok: false, loi: cauLoi(cu.error), dong: [] };
    return { ok: true, loi: null, dong: cu.data || [] };
  } catch (e) {
    return { ok: false, loi: cauLoi(e), dong: [] };
  }
}

export async function capMa(loai, so = 1) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('cap_ma', { p_loai: loai, p_so: so });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  return { ok: true, loi: null, ds: Array.isArray(data) ? data : [] };
}

export async function dsNguoiMoCoi() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('ds_nguoi_mo_coi');
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  const ds = (data || []).map((r) => ({
    maNguoi: r.id,
    ten: r.ten || '',
    namSinh: r.nam_sinh || '',
    namMat: r.nam_mat || '',
    gioi: r.gioi || '',
    daXoa: Boolean(r.da_xoa),
    soHonNhan: Number(r.so_hon_nhan) || 0,
  }));
  return { ok: true, loi: null, ds };
}

export async function dsNguoiDaXoa() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('ds_nguoi_da_xoa');
  if (error) {
    const chuaDan = /Could not find the function/i.test(error.message || '');
    return { ok: false, chuaDan, ds: [],
             loi: chuaDan ? 'Máy chủ chưa có hàm này — chưa dán luoc-do/57.' : cauLoi(error) };
  }
  const ds = (data || []).map((r) => ({
    treeId: r.tree_id,
    tenCay: r.ten_cay || '',
    maCay: r.ma_cay || '',
    maNguoi: r.person_id,
    ten: r.ten || '',
    namSinh: r.nam_sinh || '',
    namMat: r.nam_mat || '',
    gioi: r.gioi || '',
    xoaLuc: r.xoa_luc || '',
    xoaBoi: r.xoa_boi || '',
  }));
  return { ok: true, loi: null, ds };
}

async function docMoCoi(ham, rap) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc(ham);
  if (error) {
    const chuaDan = /Could not find the function/i.test(error.message || '');
    return { ok: false, chuaDan, ds: [],
             loi: chuaDan ? 'Máy chủ chưa có hàm này — chưa dán luoc-do/58.' : cauLoi(error) };
  }
  return { ok: true, loi: null, ds: (data || []).map(rap) };
}

export function dsAnhMatChu() {
  return docMoCoi('ds_anh_mat_chu', (r) => ({
    maAnh: r.media_id, maChu: r.subject_id, duongDan: r.duong_dan || '',
    duongDanLon: r.duong_dan_lon || '', chuThich: r.chu_thich || '',
    treeId: r.cay_id || null, tenCay: r.ten_cay || '',
  }));
}

export function dsFileThua() {
  return docMoCoi('ds_file_thua', (r) => ({
    duongDan: r.duong_dan, taoLuc: r.tao_luc || '', treeId: r.cay_id || null, tenCay: r.ten_cay || '',
  }));
}

export async function duongDanAnh(duongDan) {
  if (!duongDan) return '';
  const kq = await kyAnh([duongDan], 3600);
  return kq.ok ? (kq.bang.get(duongDan) || '') : '';
}

export async function donMoCoiHeThong(dsNguoi, dsAnh) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('don_mo_coi_he_thong', {
    p_nguoi: dsNguoi || [], p_anh: dsAnh || [],
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) return { ok: false, loi: (data && data.loi) || 'Máy chủ từ chối.' };
  return { ok: true, loi: null, nguoi: data.nguoi || [], honNhan: data.honNhan || [],
           anh: data.anh || [], file: data.file || [], boQua: data.boQua || [] };
}

export async function luuCay(treeId, revision, ops, moTa) {
  const k = layKhach();
  if (!k) return { ok: false, lyDo: 'khongnoiduoc', loi: 'Chưa nối được máy chủ.' };

  const { data, error } = await k.rpc('luu_cay', {
    p_tree_id:  treeId,
    p_revision: revision,
    p_ops:      ops,
    p_mo_ta:    moTa || {},
  });
  if (error) return { ok: false, lyDo: 'maychutuchoi', loi: cauLoi(error) };
  if (data && data.lyDo === 'quanhetrung' && data.chiTiet) {
    return { ...data, loi: data.chiTiet };
  }
  return data;
}

export async function layDanhSachGiaPha() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const { data, error } = await k.rpc('ds_gia_pha');
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const ds = (data || []).map((r) => ({
    fileId: r.id, ten: r.ten, tenFile: r.tree_code,
    treeCode: r.tree_code,
    emailChu: r.email_chu || '',
    soNguoi: Number(r.so_nguoi) || 0,
    vaiCuaToi: r.vai_cua_toi || null,
    coTheXem: Boolean(r.co_the_xem),
    suaDuoc: Boolean(r.co_the_sua_du_lieu),
    daNopDon: Boolean(r.da_nop_don),
    choNguoiLaThayTen: Boolean(r.cho_nguoi_la_thay_ten),
    toiLaChu: Boolean(r.toi_la_chu),
    duocMoi: Boolean(r.duoc_moi),
    moiVai: r.moi_vai || null,
    emailNguoiMoi: r.email_nguoi_moi || '',
    xinXoaLuc: r.xin_xoa_luc || null,
    xinXoaLyDo: r.xin_xoa_ly_do || '',
    emailXinXoa: r.email_xin_xoa || '',
    daXoaLuc: r.da_xoa_luc || null,
  }));
  return { ok: true, loi: null, ds };
}

export async function layCayMacDinh() {
  const k = layKhach();
  if (!k) return null;
  const { data, error } = await k.rpc('cay_mac_dinh');
  if (error) return null;
  return data || null;
}

export async function datCayMacDinh(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_cay_mac_dinh', { p_tree: treeId || null });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (data && data.ok === false) {
    return { ok: false, loi: data.lyDo || 'Không đặt được cây mặc định.' };
  }
  return { ok: true, loi: null };
}

export async function docTruongCongKhai(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, ds: null, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.from('trees').select('truong_cong_khai')
    .eq('id', treeId).maybeSingle();
  if (error) return { ok: false, ds: null, loi: cauLoi(error) };
  if (!data || !Array.isArray(data.truong_cong_khai)) {
    return { ok: false, ds: null, loi: 'Máy chủ chưa có công khai theo từng trường.' };
  }
  return { ok: true, ds: data.truong_cong_khai, loi: null };
}

export async function datTruongCongKhai(treeId, ds) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_truong_cong_khai', {
    p_tree: treeId, p_truong: ds || [],
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (data && data.ok === false) {
    return { ok: false, loi: data.lyDo || 'Không lưu được thiết lập công khai.' };
  }
  return { ok: true, loi: null };
}

export async function dsCongKhaiTaiKhoan(userId) {
  const k = layKhach();
  if (!k) return { ok: false, theoCay: new Map(), loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('ds_cong_khai_tai_khoan', { p_user: userId || null });
  if (error) return { ok: false, theoCay: new Map(), loi: cauLoi(error) };
  return { ok: true, theoCay: new Map((data || []).map((d) => [d.tree_id, d.truong])), loi: null };
}

export async function docCongKhaiTaiKhoan(treeId, userId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('doc_cong_khai_tai_khoan', {
    p_tree: treeId, p_user: userId || null,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok === false) {
    return { ok: false, loi: (data && data.lyDo) || 'Không đọc được thiết lập công khai.' };
  }
  return { ...data, loi: null };
}

export async function datCongKhaiTaiKhoan(treeId, userId, ds) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_cong_khai_tai_khoan', {
    p_tree: treeId, p_user: userId || null, p_truong: ds || [],
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (data && data.ok === false) {
    return { ok: false, loi: data.lyDo || 'Không lưu được thiết lập công khai.' };
  }
  return { ok: true, loi: null };
}

export async function datChoNguoiLaThayTen(treeId, cho) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_cho_nguoi_la_thay_ten', {
    p_tree: treeId, p_cho: !!cho,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (data && data.ok === false) {
    return { ok: false, loi: data.lyDo || 'Không đổi được công tắc.' };
  }
  return { ok: true, loi: null };
}

export async function taoGiaPhaMoi(ten, maCay, note = '') {
  const k = layKhach();
  if (!k) return { ok: false, cay: null, loi: 'Chưa nối được máy chủ.' };

  const { data, error } = await k.rpc('tao_gia_pha_moi', {
    p_ten: String(ten == null ? '' : ten),
    p_ma_cay: String(maCay == null ? '' : maCay),
    p_note: String(note == null ? '' : note),
  });
  if (error) return { ok: false, cay: null, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return {
      ok: false, cay: null,
      loi: (data && data.lyDo) || 'Không dựng được gia phả mới.',
    };
  }

  const c = data.cay || {};
  return {
    ok: true, loi: null,
    cay: { fileId: c.id, ten: c.ten || '', maCay: c.maCay || '' },
  };
}

export async function chonGiaPha(treeId) {
  const k = layKhach();
  const nguoi = await nguoiDangNhap();
  if (!k || !nguoi) return { ok: false, loi: 'Chưa đăng nhập.' };

  const { data, error } = await k.rpc('dat_cay_dang_mo', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (data && data.ok === false) return { ok: false, loi: data.loi || 'Không đổi được gia phả.' };
  return { ok: true, loi: null };
}

export async function datHienNgayGio(treeId, bat) {
  const k = layKhach();
  const nguoi = await nguoiDangNhap();
  if (!k || !nguoi) return { ok: false, loi: 'Chưa đăng nhập.' };

  const { error } = await k.from('user_settings').upsert({
    user_id: nguoi.id, tree_id: treeId, hien_ngay_gio: !!bat,
  });
  return error ? { ok: false, loi: cauLoi(error) } : { ok: true, loi: null };
}

export async function taiAnh(treeId, blob, tenFile) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', duongDan: '' };

  const duongDan = treeId + '/' + tenFile;
  const { error } = await k.storage.from(KHO_ANH)
    .upload(duongDan, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) return { ok: false, loi: cauLoi(error), duongDan: '' };
  return { ok: true, loi: null, duongDan };
}

export async function kyAnh(dsDuongDan, giay) {
  const bang = new Map();
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', bang };
  const ds = Array.from(new Set((dsDuongDan || []).filter(Boolean)));
  let loi = null;
  for (let i = 0; i < ds.length; i += 300) {
    const { data, error } = await k.storage.from(KHO_ANH).createSignedUrls(ds.slice(i, i + 300), giay);
    if (error) { loi = cauLoi(error); continue; }
    for (const d of data || []) {
      if (d && d.signedUrl && !d.error) bang.set(d.path, d.signedUrl);
    }
  }
  return { ok: !loi || bang.size > 0, loi, bang };
}

export async function xoaAnhThat(dsDuongDan) {
  const k = layKhach();
  if (!k) return { ok: false, soXoa: 0, soHong: 0 };
  const ds = (dsDuongDan || []).filter(Boolean);
  if (!ds.length) return { ok: true, soXoa: 0, soHong: 0 };

  const { data, error } = await k.storage.from(KHO_ANH).remove(ds);
  if (error) return { ok: false, soXoa: 0, soHong: ds.length, loi: cauLoi(error) };
  return { ok: true, soXoa: (data || []).length, soHong: ds.length - (data || []).length };
}

export async function xinVaoCay(loiNhan = '', treeId = null) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xin_vao_cay', {
    p_tree: treeId || null, p_loi_nhan: String(loiNhan || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function trangThaiCuaToi(treeId = null) {
  const k = layKhach();
  if (!k) return { trangThai: 'chuadangnhap' };
  const { data, error } = await k.rpc('trang_thai_cua_toi', { p_tree: treeId || null });
  if (error || !data) return { trangThai: 'chuadangnhap' };
  return data;
}

export async function moiVaoCay(treeId, email, vai = 'xem') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('moi_vao_cay', {
    p_tree: treeId, p_email: String(email || ''), p_vai: vai, p_ma_nguoi: null,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function nhanLoiMoi(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nhan_loi_moi', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiLoiMoi(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_loi_moi', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function rutDonXinVao(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('rut_don_xin_vao', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function roiCay(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('roi_cay', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function xoaCay(treeId, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xoa_cay', {
    p_tree: treeId, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: loiDoiTen(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function traLaiCay(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tra_lai_cay', { p_tree: treeId });
  if (error) return { ok: false, loi: loiDoiTen(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

function loiDoiTen(error) {
  return /Could not find the function/i.test((error && error.message) || '')
    ? 'Máy chủ chưa có hàm này — chưa dán luoc-do/60.' : cauLoi(error);
}

export async function duyetXoaCay(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_xoa_cay', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function phucHoiCay(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('phuc_hoi_cay', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function donThungRac(dsTreeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const ds = (dsTreeId || []).filter(Boolean);
  if (!ds.length) return { ok: false, loi: 'Chưa chọn gia phả nào để dọn.' };
  const { data, error } = await k.rpc('don_thung_rac', { p_ds: ds });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsChoDuyet(treeId) {
  const k = layKhach();
  if (!k || !treeId) return [];
  const { data, error } = await k.rpc('ds_cho_duyet', { p_tree: treeId });
  return error ? [] : (data || []);
}

export async function duyetThanhVien(treeId, email) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_thanh_vien', {
    p_tree: treeId, p_email: email, p_person_id: null, p_duyet: true,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiThanhVien(treeId, email) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_thanh_vien', {
    p_tree: treeId, p_email: email,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function coTheKiemDuyet(treeId) {
  const k = layKhach();
  if (!k) return false;
  const { data, error } = await k.rpc('co_the_kiem_duyet', { p_tree: treeId || null });
  return !error && data === true;
}

export async function dsKiemDuyet(treeId, trangThai = 'cho', gioiHan = 200) {
  const k = layKhach();
  if (!k || !treeId) return [];
  const { data, error } = await k.rpc('ds_kiem_duyet', {
    p_tree: treeId,
    p_trang_thai: trangThai === undefined ? 'cho' : trangThai,
    p_gioi_han: gioiHan,
  });
  return error ? [] : (data || []);
}

export async function demChoKiemDuyet(treeId) {
  const k = layKhach();
  if (!k || !treeId) return 0;
  const { data, error } = await k.rpc('dem_cho_kiem_duyet', { p_tree: treeId });
  return error ? 0 : (Number(data) || 0);
}

export async function demDuLieu(treeId) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', dem: null };
  const { data, error } = await k.rpc('dem_du_lieu', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error), dem: null };
  const r = (data || [])[0];
  if (!r) return { ok: true, dem: null };
  return {
    ok: true,
    dem: {
      persons: Number(r.persons) || 0,
      unions: Number(r.unions) || 0,
      unionChildren: Number(r.union_children) || 0,
      treeMembers: Number(r.tree_members) || 0,
      changeLog: Number(r.change_log) || 0,
    },
  };
}

export async function xemTruocKhoiPhuc(noiDung) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xem_truoc_khoi_phuc', { p_noi_dung: noiDung });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || !data.ok) return { ok: false, loi: (data && data.loi) || 'Máy chủ từ chối file này.' };
  return { ok: true, tenFile: data.ten_file, taoLucVn: data.tao_luc_vn,
           dem: data.dem || {}, demHienTai: data.dem_hien_tai || {} };
}

export async function khoiPhucBanSao(noiDung) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('khoi_phuc_ban_sao', { p_noi_dung: noiDung });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || !data.ok) return { ok: false, loi: (data && data.loi) || 'Máy chủ từ chối khôi phục.' };
  return { ok: true, tenFile: data.ten_file, taoLucVn: data.tao_luc_vn, baoCao: data.bao_cao || [] };
}

export function coMaySaoLuu() { return !!SAO_LUU_WEB_APP; }

async function goiMaySaoLuu(viec, them = {}) {
  if (!SAO_LUU_WEB_APP) return { ok: false, loi: 'Chưa điền địa chỉ máy sao lưu (SAO_LUU_WEB_APP trong js/cau-hinh.js).' };
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data: { session } } = await k.auth.getSession();
  if (!session) return { ok: false, loi: 'Chưa đăng nhập.' };
  try {
    const r = await fetch(SAO_LUU_WEB_APP, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ viec, ve: session.access_token, ...them }),
    });
    const j = await r.json();
    return j && typeof j === 'object' ? j : { ok: false, loi: 'Máy sao lưu trả về thứ lạ.' };
  } catch (e) {
    return { ok: false, loi: 'Không gọi được máy sao lưu (Apps Script). Kiểm địa chỉ trong cau-hinh.js và ' +
      'lúc triển khai đã chọn "Who has access: Anyone" chưa. (' + ((e && e.message) || e) + ')' };
  }
}

export function dsBanSaoLuuDrive() { return goiMaySaoLuu('danh-sach'); }

export function taiBanSaoLuuDrive(id) { return goiMaySaoLuu('tai', { id }); }

export function khoiPhucAnhDrive() { return goiMaySaoLuu('khoi-phuc-anh'); }

export function saoLuuNgayDrive() { return goiMaySaoLuu('sao-luu-ngay'); }

export async function duyetThayDoi(treeId, id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_thay_doi', {
    p_tree: treeId, p_id: id,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiThayDoi(treeId, id, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_thay_doi', {
    p_tree: treeId, p_id: id, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function chiTietKiemDuyet(treeId, id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('chi_tiet_kiem_duyet', {
    p_tree: treeId, p_id: id,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

function noiTuChoi(data, macDinh) {
  if (!data) return macDinh;
  return data.loi || data.lyDo || macDinh;
}

export async function coTheQuanTri(treeId) {
  const k = layKhach();
  if (!k || !treeId) return false;
  const { data, error } = await k.rpc('co_the_quan_tri', { p_tree: treeId });
  return !error && data === true;
}

export async function dsThanhVien(treeId) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const [{ data, error }, nguoi] = await Promise.all([
    k.rpc('ds_thanh_vien', { p_tree: treeId }),
    nguoiDangNhap(),
  ]);
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const toi = (nguoi && nguoi.id) || null;
  const ds = (data || []).map((r) => ({
    userId: r.user_id,
    email: r.email || '',
    maNgan: r.ma_ngan || '',
    vai: r.vai || '',
    daDuyet: Boolean(r.approved),
    maNguoi: r.person_id || '',
    tenNguoi: r.ten_nguoi || '',
    tinCay: Boolean(r.tin_cay),
    laChuCay: Boolean(r.la_chu_cay),
    laChinhToi: Boolean(toi && r.user_id === toi),
    xinLuc: r.xin_luc || null,
    loiNhan: r.loi_nhan || '',
    thamGia: r.added_at || null,
    moiLuc: r.moi_luc || null,
    moiVai: r.moi_vai || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function doiVaiThanhVien(treeId, userId, vai) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('doi_vai_thanh_vien', {
    p_tree: treeId, p_user: userId, p_vai: String(vai || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không đổi được vai trò.') };
  }
  return { ok: true, loi: null, vaiCu: data.vaiCu || '', vaiMoi: data.vaiMoi || '' };
}

export async function datTinCayThanhVien(treeId, userId, bat) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_tin_cay_thanh_vien', {
    p_tree: treeId, p_user: userId, p_bat: !!bat,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không đổi được chế độ ghi thẳng.') };
  }
  return { ok: true, loi: null, tinCay: Boolean(data.tinCay) };
}

export async function goThanhVien(treeId, userId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('go_thanh_vien', {
    p_tree: treeId, p_user: userId,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không gỡ được tài khoản.') };
  }
  return { ok: true, loi: null, email: data.email || '' };
}

export async function doiChuCay(treeId, userIdMoi) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('doi_chu_cay', {
    p_tree: treeId, p_user_moi: userIdMoi,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không bàn giao được gia phả.') };
  }
  return { ok: true, loi: null, emailMoi: data.emailMoi || '' };
}

export async function dsTaiKhoanHeThong() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const [{ data, error }, nguoi] = await Promise.all([
    k.rpc('ds_tai_khoan_he_thong'),
    nguoiDangNhap(),
  ]);
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const toi = (nguoi && nguoi.id) || null;
  const ds = (data || []).map((r) => ({
    userId: r.user_id,
    email: r.email || '',
    hoTen: r.ho_ten || '',
    vaiCaoNhat: r.vai_cao_nhat || '',
    maNgan: r.ma_ngan || '',
    laQuanTriHeThong: Boolean(r.la_quan_tri_he_thong),
    duocTaoCay: Boolean(r.duoc_tao_cay),
    soCay: Number(r.so_cay) || 0,
    soCho: Number(r.so_cho) || 0,
    soMoi: Number(r.so_moi) || 0,
    soCayLamChu: Number(r.so_cay_lam_chu) || 0,
    maNguoiGan: r.nguoi_gan_ma || '',
    tenNguoiGan: r.nguoi_gan_ten || '',
    cayChinhId: r.cay_chinh_id || null,
    tenDongHo: r.ten_dong_ho || '',
    taoLuc: r.tao_luc || null,
    dangNhapGanNhat: r.dang_nhap_gan_nhat || null,
    daXacNhanEmail: Boolean(r.da_xac_nhan_email),
    khoaLuc: r.khoa_luc || null,
    khoaLyDo: r.khoa_ly_do || '',
    emailKhoaBoi: r.email_khoa_boi || '',
    qthtMoiLuc: r.qtht_moi_luc || null,
    emailQthtMoiBoi: r.email_qtht_moi_boi || '',
    laChinhToi: Boolean(toi && r.user_id === toi),
  }));
  return { ok: true, loi: null, ds };
}

export async function dsCayCuaTaiKhoan(userId) {
  const k = layKhach();
  if (!k || !userId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const { data, error } = await k.rpc('ds_cay_cua_tai_khoan', { p_user: userId });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const ds = (data || []).map((r) => ({
    treeId: r.tree_id,
    ten: r.ten || '',
    maCay: r.tree_code || '',
    vai: r.vai || '',
    daDuyet: Boolean(r.approved),
    moiLuc: r.moi_luc || null,
    moiVai: r.moi_vai || '',
    maNguoi: r.person_id || '',
    tenNguoi: r.ten_nguoi || '',
    tinCay: Boolean(r.tin_cay),
    laChuCay: Boolean(r.la_chu_cay),
    thamGia: r.added_at || null,
  }));
  return { ok: true, loi: null, ds };
}

export async function datQuanTriHeThong(userId, bat) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_quan_tri_he_thong', {
    p_user: userId, p_bat: !!bat,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không đặt được cờ Quản trị hệ thống.') };
  }
  return {
    ok: true, loi: null,
    moi: Boolean(data.moi), bat: Boolean(data.bat), email: data.email || '',
  };
}

export async function loiMoiQthtCuaToi() {
  const k = layKhach();
  if (!k) return {};
  const { data, error } = await k.rpc('loi_moi_qtht_cua_toi');
  if (error || !data) return {};
  return {
    coLoiMoi: Boolean(data.coLoiMoi),
    moiLuc: data.moiLuc || null,
    emailNguoiMoi: data.emailNguoiMoi || '',
  };
}

export async function nhanQuyenQtht() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nhan_quyen_qtht');
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiQuyenQtht() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_quyen_qtht');
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function datDuocTaoCay(userId, bat) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_duoc_tao_cay', {
    p_user: userId, p_bat: !!bat,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không đặt được quyền dựng gia phả.') };
  }
  return { ok: true, loi: null, bat: Boolean(data.bat) };
}

export async function xoaTaiKhoan(userId, emailXacNhan, chuMoi = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xoa_tai_khoan', {
    p_user: userId,
    p_email_xac_nhan: String(emailXacNhan || ''),
    p_chu_moi: chuMoi || null,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không xoá được tài khoản.') };
  }
  return {
    ok: true, loi: null,
    email: data.email || '',
    soChanDaGo: Number(data.soChanDaGo) || 0,
    soCayDaChuyen: Number(data.soCayDaChuyen) || 0,
    emailChuMoi: data.emailChuMoi || '',
  };
}

export async function khoaTaiKhoan(userId, emailXacNhan, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('khoa_tai_khoan', {
    p_user: userId,
    p_email_xac_nhan: String(emailXacNhan || ''),
    p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không khoá được tài khoản.') };
  }
  return {
    ok: true, loi: null, email: data.email || '',
    soCayLamChu: Number(data.soCayLamChu) || 0,
    dsCayLamChu: Array.isArray(data.dsCayLamChu) ? data.dsCayLamChu : [],
    xoaDuocTu: data.xoaDuocTu || '',
  };
}

export async function moKhoaTaiKhoan(userId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('mo_khoa_tai_khoan', { p_user: userId });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không mở khoá được tài khoản.') };
  }
  return { ok: true, loi: null, email: data.email || '' };
}

export async function taoTaiKhoan(email) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data: { session } } = await k.auth.getSession();
  if (!session) return { ok: false, loi: 'Chưa đăng nhập.' };
  try {
    const r = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/tao-tai-khoan', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KHOA_CONG_KHAI,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: String(email || '').trim() }),
    });
    if (r.status === 404) {
      return { ok: false, loi: 'Máy chủ chưa có hàm tao-tai-khoan — chưa dán Edge Function.' };
    }
    const data = await r.json().catch(() => null);
    if (!data || data.ok !== true) {
      return { ok: false, loi: noiTuChoi(data, 'Không tạo được tài khoản (HTTP ' + r.status + ').') };
    }
    return {
      ok: true, loi: null, userId: data.userId, email: data.email,
      maNgan: data.maNgan || '', matKhau: data.matKhau,
    };
  } catch (e) {
    return { ok: false, loi: cauLoi(e) };
  }
}

export async function timTaiKhoan(treeId, chuoi) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const { data, error } = await k.rpc('tim_tai_khoan', {
    p_tree: treeId, p_chuoi: String(chuoi || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const ds = (data || []).map((r) => ({
    userId: r.user_id,
    email: r.email || '',
    hoTen: r.ho_ten || '',
    vaiCaoNhat: r.vai_cao_nhat || '',
    maNgan: r.ma_ngan || '',
    maNguoi: r.person_id || '',
    tenNguoi: r.ten_nguoi || '',
    trangThai: r.trang_thai || 'chua',
  }));
  return { ok: true, loi: null, ds };
}

export async function timNguoiTrongCay(treeId, chuoi) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const { data, error } = await k.rpc('tim_nguoi_trong_cay', {
    p_tree: treeId, p_chuoi: String(chuoi || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const ds = (data || []).map((r) => ({
    maNguoi: r.id || '',
    ten: r.ten || '',
    namSinh: r.nam_sinh || '',
    namMat: r.nam_mat || '',
    gioi: r.gioi || 'U',
    ganChoEmail: r.gan_cho_email || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function timNguoiMoiCay(treeId, chuoi) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };

  const { data, error } = await k.rpc('tim_nguoi_moi_cay', {
    p_tree: treeId, p_chuoi: String(chuoi || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };

  const ds = (data || []).map((r) => ({
    maNguoi: r.id || '',
    ten: r.ten || '',
    namSinh: r.nam_sinh || '',
    namMat: r.nam_mat || '',
    gioi: r.gioi || 'U',
    cacCay: r.cac_cay || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function docNguoiTheoMa(ma) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', dong: null };

  const { data, error } = await k.from('persons').select('*')
    .eq('id', String(ma || '')).maybeSingle();
  if (error) return { ok: false, loi: cauLoi(error), dong: null };
  if (!data) {
    return { ok: false, dong: null,
             loi: 'Không đọc được người mang mã ' + ma + '. Có thể mã sai, ' +
                  'hoặc người ấy nằm trong gia phả bạn không có quyền xem.' };
  }
  return { ok: true, loi: null, dong: data };
}

export async function dsCayCoNguoi(ma) {
  const k = layKhach();
  if (!k || !ma) return { ok: false, loi: 'Chưa nối được máy chủ.', treeIds: new Set() };
  const { data, error } = await k.from('tree_persons').select('tree_id')
    .eq('person_id', String(ma));
  if (error) return { ok: false, loi: cauLoi(error), treeIds: new Set() };
  return { ok: true, loi: null, treeIds: new Set((data || []).map((r) => r.tree_id)) };
}

export async function docGiaDinhNguoi(ma) {
  const k = layKhach();
  const id = String(ma || '').trim();
  if (!k || !id) return { ok: false, loi: 'Chưa nối được máy chủ.', dong: null };

  try {
    const { data, error } = await k.rpc('doc_ho_so_nguoi', { p_ma: id });
    if (!error) {
      if (!data || data.ok !== true) {
        return { ok: false, dong: null, loi: (data && data.loi) || 'Máy chủ không trả hồ sơ.' };
      }
      return {
        ok: true, loi: null,
        dong: { nguoi: data.nguoi, persons: data.persons || [], unions: data.unions || [],
                children: data.children || [], cay: data.cay || [] },
      };
    }
    if (!/Could not find the function/i.test(error.message || '')) {
      return { ok: false, loi: cauLoi(error), dong: null };
    }
  } catch (e) {
    return { ok: false, loi: cauLoi(e), dong: null };
  }

  try {
    const [nguoi, lamVoChong, lamCon, cay] = await Promise.all([
      k.from('persons').select('*').eq('id', id).maybeSingle(),
      k.from('unions').select('*').contains('partners', [id]),
      k.from('union_children').select('union_id').eq('person_id', id),
      k.from('tree_persons').select('tree_id, doi').eq('person_id', id),
    ]);
    for (const kq of [nguoi, lamVoChong, lamCon, cay]) {
      if (kq.error) return { ok: false, loi: cauLoi(kq.error), dong: null };
    }
    if (!nguoi.data) {
      return { ok: false, dong: null,
               loi: 'Không đọc được người mang mã ' + id + '. Có thể mã sai, ' +
                    'hoặc người ấy nằm trong gia phả bạn không có quyền xem.' };
    }

    const daCo = new Set((lamVoChong.data || []).map((u) => u.id));
    const maChaMe = [...new Set((lamCon.data || []).map((r) => r.union_id))]
      .filter((u) => !daCo.has(u));
    const chaMe = maChaMe.length
      ? await k.from('unions').select('*').in('id', maChaMe) : { data: [] };
    if (chaMe.error) return { ok: false, loi: cauLoi(chaMe.error), dong: null };
    const unions = [...(lamVoChong.data || []), ...(chaMe.data || [])];

    const maUnion = unions.map((u) => u.id);
    const con = maUnion.length
      ? await k.from('union_children').select('*').in('union_id', maUnion) : { data: [] };
    if (con.error) return { ok: false, loi: cauLoi(con.error), dong: null };

    const maNguoi = new Set();
    for (const u of unions) for (const p of u.partners || []) maNguoi.add(p);
    for (const c of con.data || []) maNguoi.add(c.person_id);
    maNguoi.delete(id);
    const khac = maNguoi.size
      ? await k.from('persons').select('*').in('id', [...maNguoi]) : { data: [] };
    if (khac.error) return { ok: false, loi: cauLoi(khac.error), dong: null };

    return {
      ok: true, loi: null,
      dong: {
        nguoi: nguoi.data,
        persons: [nguoi.data, ...(khac.data || [])],
        unions,
        children: con.data || [],
        cay: cay.data || [],
      },
    };
  } catch (e) {
    return { ok: false, loi: cauLoi(e), dong: null };
  }
}

export async function datHoTenTaiKhoan(userId, hoTen) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_ho_ten_tai_khoan', {
    p_user: userId, p_ho_ten: String(hoTen || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) {
    return { ok: false, loi: noiTuChoi(data, 'Không đặt được họ tên.') };
  }
  return { ok: true, loi: null, hoTen: data.hoTen || '' };
}

export async function nopDeXuatGan(maNguoi, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nop_de_xuat_gan', {
    p_person: String(maNguoi || ''), p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function deXuatGanHo(userId, maNguoi, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('de_xuat_gan_ho', {
    p_user: userId, p_person: String(maNguoi || ''), p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function deXuatGoHo(userId, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('de_xuat_go_ho', { p_user: userId, p_ly_do: String(lyDo || '') });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function ganThangTaiKhoan(userId, maNguoi) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('gan_thang_tai_khoan', {
    p_user: userId, p_person: maNguoi ? String(maNguoi) : null,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function goGanTaiKhoanCuaToi() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('go_gan_tai_khoan');
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsLienKetCay(treeId) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('ds_lien_ket_cay', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  const ds = (data || []).map((r) => ({
    maNguoi: r.person_id, userId: r.user_id, email: r.email || '',
    hoTen: r.ho_ten || '', maNgan: r.ma_ngan || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function timTaiKhoanTrongCay(treeId, chuoi) {
  const k = layKhach();
  if (!k || !treeId) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('tim_tai_khoan_trong_cay', {
    p_tree: treeId, p_chuoi: String(chuoi || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  const ds = (data || []).map((r) => ({
    userId: r.user_id, email: r.email || '', hoTen: r.ho_ten || '',
    maNgan: r.ma_ngan || '', vai: r.vai || '', maNguoi: r.person_id || '',
    lienKet: r.lien_ket || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function rutDeXuatGan(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('rut_de_xuat_gan', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function deXuatGanCuaToi() {
  const k = layKhach();
  if (!k) return { coDon: false };
  const { data, error } = await k.rpc('de_xuat_gan_cua_toi');
  if (error || !data) return { coDon: false };
  return data;
}

export async function dsDeXuatGan() {
  const k = layKhach();
  if (!k) return [];
  const { data, error } = await k.rpc('ds_de_xuat_gan');
  if (error || !Array.isArray(data)) return [];
  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    email: d.email || '',
    maNgan: d.ma_ngan || '',
    maNguoi: d.person_id || '',
    tenNguoi: d.ten_nguoi || '',
    lyDo: d.ly_do || '',
    taoLuc: d.tao_luc || '',
    laCuaToi: d.la_cua_toi === true,
    maDangCo: d.ma_dang_co || '',
    loai: d.loai || 'gan',
    emailNopBoi: d.email_nop_boi || '',
  }));
}

export async function duyetDeXuatGan(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_de_xuat_gan', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiDeXuatGan(id, lyDo) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_de_xuat_gan', {
    p_id: id, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function nopDeXuatDongHo(treeId, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nop_de_xuat_dong_ho', {
    p_tree: treeId, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function rutDeXuatDongHo(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('rut_de_xuat_dong_ho', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function deXuatDongHoCuaToi() {
  const k = layKhach();
  if (!k) return { coDon: false };
  const { data, error } = await k.rpc('de_xuat_dong_ho_cua_toi');
  if (error || !data) return { coDon: false };
  return data;
}

export async function dsDeXuatDongHo() {
  const k = layKhach();
  if (!k) return [];
  const { data, error } = await k.rpc('ds_de_xuat_dong_ho');
  if (error || !Array.isArray(data)) return [];
  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    email: d.email || '',
    maNgan: d.ma_ngan || '',
    treeId: d.tree_id,
    tenCay: d.ten_cay || '',
    dongHoHien: d.dong_ho_hien || '',
    lyDo: d.ly_do || '',
    taoLuc: d.tao_luc || '',
    laCuaToi: d.la_cua_toi === true,
  }));
}

export async function duyetDeXuatDongHo(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_de_xuat_dong_ho', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiDeXuatDongHo(id, lyDo) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_de_xuat_dong_ho', {
    p_id: id, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function datDongHoQtht(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('dat_dong_ho_qtht', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function xinDoiVai(treeId, vai, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xin_doi_vai', {
    p_tree: treeId, p_vai: String(vai || ''), p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function rutXinDoiVai(treeId) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('rut_xin_doi_vai', { p_tree: treeId });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function duyetXinDoiVai(treeId, userId, dongY) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_xin_doi_vai', {
    p_tree: treeId, p_user: userId, p_dong_y: !!dongY,
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsXinDoiVai(treeId) {
  const k = layKhach();
  if (!k || !treeId) return [];
  const { data, error } = await k.rpc('ds_xin_doi_vai', { p_tree: treeId });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    userId: r.user_id,
    email: r.email || '',
    hoTen: r.ho_ten || '',
    vaiHienTai: r.vai_hien_tai || '',
    xinVai: r.xin_vai || '',
    xinVaiLuc: r.xin_vai_luc || '',
    xinVaiLyDo: r.xin_vai_ly_do || '',
  }));
}

export async function nopDeNghiQuanHe(treeId, loai, unionId, personId, lyDo) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nop_de_nghi_quan_he', {
    p_tree: treeId, p_loai: String(loai || ''), p_union: String(unionId || ''),
    p_person: String(personId || ''), p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsDeNghiQuanHe() {
  const k = layKhach();
  if (!k) return [];
  const { data, error } = await k.rpc('ds_de_nghi_quan_he');
  return error ? [] : (data || []);
}

export async function duyetDeNghiQuanHe(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_de_nghi_quan_he', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiDeNghiQuanHe(id, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_de_nghi_quan_he', {
    p_id: id, p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function timNguoiBaoTrung(chuoi) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('tim_nguoi_bao_trung', { p_chuoi: String(chuoi || '') });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  const ds = (data || []).map((r) => ({
    maNguoi: r.id || '',
    ten: r.ten || '',
    namSinh: r.nam_sinh || '',
    namMat: r.nam_mat || '',
    gioi: r.gioi || 'U',
    cacCay: r.cac_cay || '',
  }));
  return { ok: true, loi: null, ds };
}

export async function nopBaoTrung(maX, maY, lyDo) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('nop_bao_trung', {
    p_x: String(maX || ''), p_y: String(maY || ''), p_ly_do: String(lyDo || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function rutBaoTrung(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('rut_bao_trung', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsBaoTrung(cuaToi = false) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('ds_bao_trung', { p_cua_toi: Boolean(cuaToi) });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  return { ok: true, loi: null, ds: data || [] };
}

export async function duyetBaoTrung(id) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('duyet_bao_trung', { p_id: id });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function tuChoiBaoTrung(id, lyDo = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('tu_choi_bao_trung', { p_id: id, p_ly_do: String(lyDo || '') });
  if (error) return { ok: false, loi: cauLoi(error) };
  return data || { ok: false, loi: 'Máy chủ không trả lời.' };
}

export async function dsNhatKyHeThong({ loai = null, tu = null, den = null, gioiHan = 1000 } = {}) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const iso = (d) => (d ? new Date(d).toISOString() : null);
  const { data, error } = await k.rpc('ds_nhat_ky_he_thong', {
    p_loai: loai || null, p_tu: iso(tu), p_den: iso(den), p_gioi_han: gioiHan,
  });
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  return {
    ok: true, loi: null,
    ds: (data || []).map((r) => ({
      id: Number(r.id), luc: r.luc, loai: r.loai || '', suKien: r.su_kien || '',
      emailNguoiLam: r.email_nguoi_lam || '', doiTuong: r.doi_tuong || '',
      chiTiet: r.chi_tiet || {},
    })),
  };
}

export async function xoaNhatKy(ids, moTa = '') {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('xoa_nhat_ky', {
    p_ids: (ids || []).map(Number), p_mo_ta: String(moTa || ''),
  });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) return { ok: false, loi: noiTuChoi(data, 'Không xoá được nhật ký.') };
  return { ok: true, loi: null, soDong: Number(data.soDong) || 0, moTa: data.moTa || '' };
}

export async function dsLoNhatKyRac() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.', ds: [] };
  const { data, error } = await k.rpc('ds_lo_nhat_ky_rac');
  if (error) return { ok: false, loi: cauLoi(error), ds: [] };
  return {
    ok: true, loi: null,
    ds: (data || []).map((r) => ({
      id: Number(r.id), moTa: r.mo_ta || '', soDong: Number(r.so_dong) || 0,
      xoaLuc: r.xoa_luc, emailXoaBoi: r.email_xoa_boi || '', conLai: Number(r.con_lai) || 0,
    })),
  };
}

export async function phucHoiLoNhatKy(lo) {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('phuc_hoi_lo_nhat_ky', { p_lo: Number(lo) });
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) return { ok: false, loi: noiTuChoi(data, 'Không phục hồi được.') };
  return { ok: true, loi: null, soDong: Number(data.soDong) || 0 };
}

export async function donNhatKyRac() {
  const k = layKhach();
  if (!k) return { ok: false, loi: 'Chưa nối được máy chủ.' };
  const { data, error } = await k.rpc('don_nhat_ky_rac');
  if (error) return { ok: false, loi: cauLoi(error) };
  if (!data || data.ok !== true) return { ok: false, loi: noiTuChoi(data, 'Không dọn được thùng rác nhật ký.') };
  return { ok: true, loi: null, soLo: Number(data.soLo) || 0, soDong: Number(data.soDong) || 0 };
}
