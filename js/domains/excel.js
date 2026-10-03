import { parseLooseDate } from '../utils/date.js';
import { nhanQuanHeCon } from '../config.js';

const TEN_SHEET = 'DuLieu';
const TEN_SHEET_PHANG = 'BangPhang';

const COT = {
  doi: 'Đời', maSoCu: 'Mã số', tenHuy: 'Tên húy', bietDanh: 'Biệt danh',
  gioiTinh: 'Giới tính', ngaySinh: 'Ngày sinh', tinhTrang: 'Tình trạng',
  noiSinh: 'Nơi sinh', ngayMat: 'Ngày mất', ngayGio: 'Ngày giỗ',
  moTai: 'Mộ tại', tieuSu: 'Tiểu sử', thongTinKhac: 'Thông tin khác',
  idMoi: 'ID mới', idCha: 'ID cha', idMe: 'ID me',
  ps1: 'ID phối ngẫu 1', ps2: 'ID phối ngẫu 2',
  soThuTuHonNhan: 'Số thứ tự hôn nhân', soThuTuCon: 'Số thứ tự con',
  title: 'Chức tước', occupation: 'Nghề nghiệp', education: 'Học vấn',
  religion: 'Tôn giáo', residence: 'Nơi ở', nationality: 'Dân tộc', contact: 'Liên hệ',
};
const COT_TEN_KHAC = { idMe: ['ID mẹ'] };
const COT_THONG_TIN = ['title', 'occupation', 'education', 'religion', 'residence',
  'nationality', 'contact'];

let _xlsxDaNap = null;

async function layThuVienXlsx() {
  if (!_xlsxDaNap) _xlsxDaNap = await import('../vendor/xlsx.mjs');
  return _xlsxDaNap;
}

export async function parseExcel(arrayBuffer) {
  const canhBao = [];
  let XLSX;
  try {
    XLSX = await layThuVienXlsx();
  } catch (e) {
    return ketQuaLoi('Không nạp được thư viện đọc Excel (file ' +
      'js/vendor/xlsx.mjs của chính ứng dụng). Thử tải lại trang. ' +
      (e && e.message ? e.message : String(e)));
  }

  let wb;
  try {
    wb = XLSX.read(arrayBuffer, { type: 'array' });
  } catch (e) {
    return ketQuaLoi('Không đọc được file này — có thể không phải file Excel ' +
      'hợp lệ, hoặc file có mật khẩu MỞ FILE (khác mật khẩu VBA). ' +
      (e && e.message ? e.message : String(e)));
  }

  const sheet = wb.Sheets[TEN_SHEET];
  if (!sheet && wb.Sheets[TEN_SHEET_PHANG]) return docBangPhang(XLSX, wb.Sheets[TEN_SHEET_PHANG]);
  if (!sheet) {
    return ketQuaLoi('File không có sheet "' + TEN_SHEET + '" (khuôn nhập mẫu) hay "' +
      TEN_SHEET_PHANG + '" (bản Xuất Excel dạng bảng phẳng). Khuôn hai sheet ' +
      '"Nguoi" + "GiaDinh" chưa nhập được.');
  }

  const hang = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (hang.length < 2) return ketQuaLoi('Sheet "' + TEN_SHEET + '" không có dòng dữ liệu nào.');

  const header = hang[0];
  const idx = {};
  const tieuDe = header.map((c) => chu(c));
  for (const [k, ten] of Object.entries(COT)) {
    idx[k] = [ten, ...(COT_TEN_KHAC[k] || [])].map((t) => tieuDe.indexOf(t))
      .find((i) => i >= 0) ?? -1;
  }
  if (idx.idMoi === -1) {
    return ketQuaLoi('Không tìm thấy cột "ID mới" — đây có phải đúng khuôn ' +
      'file gia phả một bảng không?');
  }

  const dongThat = hang.slice(1).filter((r) => coGiaTriO(r, idx.idMoi));

  const nguoiTho = new Map();
  for (const r of dongThat) {
    const rawId = String(layO(r, idx.idMoi)).trim();
    if (!rawId || nguoiTho.has(rawId)) continue;
    nguoiTho.set(rawId, docDongNguoi(r, idx, rawId));
  }

  const { unionsTho, soCaMoHoMe } = xepUnion(nguoiTho);

  if (soCaMoHoMe > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: soCaMoHoMe + ' người con có cha nhiều vợ nhưng dòng con không nói ' +
           'rõ là con bà nào — đã xếp riêng, KHÔNG đoán là con của người vợ ' +
           'nào. Xem lại bằng tay sau khi nhập nếu cần.',
    });
  }
  if (header.some((c) => /^Đời \d+$/.test(String(c).trim()))) {
    canhBao.push({
      muc: 'nhe',
      chu: 'Hai mươi cột "Đời 1..Đời 20" của file (tên dòng trưởng từng nhánh, ' +
           'để hiển thị) KHÔNG được nhập — app tự tính lại quan hệ từ cha/mẹ/' +
           'vợ chồng, không cần bảng ấy.',
    });
  }

  return ketQuaTuTho(nguoiTho, unionsTho, canhBao);
}

function ketQuaTuTho(nguoiTho, unionsTho, canhBao) {
  const thuTuNguoi = [...nguoiTho.values()].sort((a, b) => (a.doi || 9999) - (b.doi || 9999));
  const maNguoi = new Map();
  thuTuNguoi.forEach((p, i) => maNguoi.set(p.rawId, 'P' + String(i + 1).padStart(4, '0')));
  const maUnion = new Map();
  unionsTho.forEach((u, i) => maUnion.set(u.key, 'U' + String(i + 1).padStart(4, '0')));

  const persons = thuTuNguoi.map((p) => dungNguoi(p, maNguoi.get(p.rawId)));
  const unions = unionsTho.map((u) => dungUnion(u, maUnion, maNguoi));

  return {
    persons, unions, sources: [],
    tenCay: '', nguonXuat: '', maNguon: 'EXCEL',
    thongKe: {
      soNguoi: persons.length, soCap: unions.length, soNguon: 0,
      soAnhBoQua: 0, soDongHong: 0, soDongBoQua: 0, soAn: 0, soDoiMa: 0,
    },
    theLa: [], doiMa: [], anhBoQua: [], canhBao,
  };
}

const THU_TU_QUAN_HE = ['birth', 'adopted', 'step', 'foster', 'thua_tu'];
const CHA_ME_PHANG = {
  birth: ['cha', 'mẹ'], adopted: ['cha nuôi', 'mẹ nuôi'], step: ['cha dượng', 'mẹ kế'],
  foster: ['cha nuôi dưỡng', 'mẹ nuôi dưỡng'], thua_tu: ['cha thừa tự', 'mẹ thừa tự'],
};
function tenConPhang(loai) {
  return loai === 'birth' ? 'con' : nhanQuanHeCon(loai, 'con').toLowerCase();
}

function docCotQuanHe(tieuDe) {
  const chaMe = [];
  const phoiNgau = [];
  const con = [];
  tieuDe.forEach((t, i) => {
    let m = t.match(/^ID phối ngẫu (\d+)$/);
    if (m) { phoiNgau.push({ i, so: Number(m[1]) }); return; }
    for (const loai of THU_TU_QUAN_HE) {
      for (let vai = 0; vai < 2; vai++) {
        m = t.match(new RegExp('^ID ' + CHA_ME_PHANG[loai][vai] + '(?: (\\d+))?$'));
        if (m) { chaMe.push({ i, loai, vai, nhom: m[1] ? Number(m[1]) : 1 }); return; }
      }
      m = t.match(new RegExp('^ID ' + tenConPhang(loai) + ' (\\d+)$'));
      if (m) { con.push({ i, loai, so: Number(m[1]) }); return; }
    }
  });
  phoiNgau.sort((a, b) => a.so - b.so);
  con.sort((a, b) => a.so - b.so);
  return { chaMe, phoiNgau, con };
}

function docBangPhang(XLSX, sheet) {
  const hang = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (hang.length < 2) return ketQuaLoi('Sheet "' + TEN_SHEET_PHANG + '" không có dòng dữ liệu nào.');

  const tieuDe = hang[0].map((c) => chu(c));
  const idx = {};
  for (const [k, ten] of Object.entries(COT)) idx[k] = tieuDe.indexOf(ten);
  idx.idMoi = tieuDe.indexOf('ID');
  if (idx.idMoi === -1) {
    return ketQuaLoi('Sheet "' + TEN_SHEET_PHANG + '" không có cột "ID" — đây có phải ' +
      'file do nút Xuất Excel (Bảng phẳng) tạo ra không?');
  }
  for (const k of ['idCha', 'idMe', 'ps1', 'ps2', 'soThuTuHonNhan', 'soThuTuCon']) idx[k] = -1;
  const cot = docCotQuanHe(tieuDe);

  const nguoiTho = new Map();
  for (const r of hang.slice(1)) {
    const rawId = chu(layO(r, idx.idMoi));
    if (!rawId || nguoiTho.has(rawId)) continue;
    const p = docDongNguoi(r, idx, rawId);
    if (p.vn) { delete p.vn.generation; if (Object.keys(p.vn).length === 0) p.vn = undefined; }
    if (chu(layO(r, idx.tenHuy)) === '') {
      p.note = p.note.split('\n').filter((l) => l !== 'Tên húy trong Excel: (trống)').join('\n');
    }
    p.chaMe = cot.chaMe.map((c) => ({ ...c, id: chu(layO(r, c.i)) })).filter((c) => c.id);
    p.phoiNgau = cot.phoiNgau.map((c) => chu(layO(r, c.i))).filter(Boolean);
    p.con = cot.con.map((c) => ({ loai: c.loai, id: chu(layO(r, c.i)) })).filter((c) => c.id);
    nguoiTho.set(rawId, p);
  }

  const unionsTho = xepUnionPhang(nguoiTho);
  return ketQuaTuTho(nguoiTho, unionsTho, [{
    muc: 'nhe',
    chu: 'Đọc theo khuôn Bảng phẳng (bản Xuất Excel). Khuôn này không có ngày ' +
         'cưới, tình trạng hôn nhân, nơi mất — các trường ấy sẽ trống. Thứ tự ' +
         'vợ/chồng lấy theo cột "ID phối ngẫu 1, 2…".',
  }]);
}

function xepUnionPhang(nguoiTho) {
  const co = (id) => id && nguoiTho.has(id);
  const unionMap = new Map();
  const layHoacTao = (ids) => {
    const key = ids.length === 2 ? [...ids].sort().join('|') : 'MOT:' + ids[0];
    let u = unionMap.get(key);
    if (!u) {
      const ps = ids.length === 2 && nguoiTho.get(ids[1]).sex === 'M' &&
        nguoiTho.get(ids[0]).sex !== 'M' ? [ids[1], ids[0]] : ids.slice();
      u = { key, partners: ps, children: [] };
      unionMap.set(key, u);
    }
    return u;
  };

  for (const p of nguoiTho.values()) {
    for (const sp of p.phoiNgau) if (co(sp) && sp !== p.rawId) layHoacTao([p.rawId, sp]);
  }

  for (const p of nguoiTho.values()) {
    const nhom = new Map();
    for (const c of p.chaMe) {
      const k = c.loai + '#' + c.nhom;
      if (!nhom.has(k)) nhom.set(k, { loai: c.loai, ids: [null, null] });
      nhom.get(k).ids[c.vai] = c.id;
    }
    for (const g of nhom.values()) {
      const ids = g.ids.filter((id) => co(id) && id !== p.rawId);
      if (ids.length === 0) continue;
      const u = layHoacTao(ids);
      if (!u.children.some((c) => c.rawId === p.rawId)) u.children.push({ rawId: p.rawId, loai: g.loai });
    }
  }

  for (const u of unionMap.values()) {
    const viTri = (c) => {
      let tot = Infinity;
      for (const id of u.partners) {
        const ds = nguoiTho.get(id).con.filter((x) => x.loai === c.loai).map((x) => x.id);
        const i = ds.indexOf(c.rawId);
        if (i >= 0 && i < tot) tot = i;
      }
      return THU_TU_QUAN_HE.indexOf(c.loai) * 100000 + (tot === Infinity ? 99999 : tot);
    };
    u.children.sort((a, b) => viTri(a) - viTri(b));
  }

  for (const p of nguoiTho.values()) {
    p.phoiNgau.filter((sp) => co(sp) && sp !== p.rawId).forEach((sp, i) => {
      if (i === 0) return;
      const u = unionMap.get([p.rawId, sp].sort().join('|'));
      if (!u.ranks) u.ranks = {};
      u.ranks[sp] = i + 1;
    });
  }

  return [...unionMap.values()];
}

function ketQuaLoi(loi) {
  return {
    persons: [], unions: [], sources: [],
    tenCay: '', nguonXuat: '', maNguon: 'EXCEL',
    thongKe: { soNguoi: 0, soCap: 0, soNguon: 0, soAnhBoQua: 0, soDongHong: 0,
               soDongBoQua: 0, soAn: 0, soDoiMa: 0 },
    theLa: [], doiMa: [], anhBoQua: [],
    canhBao: [{ muc: 'nang', chu: loi }],
  };
}

function layO(r, i) { return i >= 0 && i < r.length ? r[i] : ''; }
function coGiaTriO(r, i) {
  const v = layO(r, i);
  return v !== null && v !== undefined && String(v).trim() !== '';
}
function chu(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function docCo(v, chuCo, chuKhong) {
  if (v === true || v === false) return v;
  const t = chu(v).toLowerCase();
  if (t === 'true' || chuCo.includes(t)) return true;
  if (t === 'false' || chuKhong.includes(t)) return false;
  return null;
}

function laNgayTrong(s) {
  return s === '' || s.indexOf('_') >= 0;
}

const TEN_KHONG_RO = new Set(['không rõ', '..', '...', '.']);

function boSoThuTuDauTen(s) {
  let t = s.replace(/^\d+\s+/, '');
  t = t.replace(/^Bà\s*\d+\s*[.:]?\s*/i, '');
  return t.trim();
}

function laTenRong(s) {
  const t = s.trim();
  return t === '' || TEN_KHONG_RO.has(t.toLowerCase()) || /^_+$/.test(t);
}

function tachHoTen(s) {
  const manh = s.split(/\s+/).filter(Boolean);
  if (manh.length === 0) return { surname: '', middle: '', given: '' };
  if (manh.length === 1) return { surname: '', middle: '', given: manh[0] };
  return { surname: manh[0], middle: manh.slice(1, -1).join(' '), given: manh[manh.length - 1] };
}

function docNgay(raw) {
  const s = chu(raw);
  if (laNgayTrong(s)) return { iso: '', raw: '', place: '' };
  const d = parseLooseDate(s);
  return { iso: d.iso || '', raw: d.iso && d.confident ? '' : s, place: '' };
}

function docDongNguoi(r, idx, rawId) {
  const tenHuyGoc = chu(layO(r, idx.tenHuy));
  const tenSauKhiBo = boSoThuTuDauTen(tenHuyGoc);
  const tenRong = laTenRong(tenSauKhiBo);
  const bietDanh = chu(layO(r, idx.bietDanh));

  const names = [];
  names.push(Object.assign(
    { type: 'chinh' },
    tenRong ? { surname: '', middle: '', given: '' } : tachHoTen(tenSauKhiBo),
  ));
  if (bietDanh) names.push(Object.assign({ type: 'thuong_goi' }, tachHoTen(bietDanh)));

  const gioiTinhO = docCo(layO(r, idx.gioiTinh), ['nam'], ['nữ', 'nu']);
  const sex = gioiTinhO === true ? 'M' : gioiTinhO === false ? 'F' : 'U';

  const tinhTrangO = docCo(layO(r, idx.tinhTrang), ['còn sống', 'con song', 'sống'],
    ['đã mất', 'da mat', 'mất']);
  const living = tinhTrangO === true ? true : tinhTrangO === false ? false : true;

  const maSoCu = chu(layO(r, idx.maSoCu));
  const ngayGio = chu(layO(r, idx.ngayGio));
  const ghiChu = [];
  if (maSoCu) ghiChu.push('Mã số cũ: ' + maSoCu);
  if (tenSauKhiBo !== tenHuyGoc.trim() || tenRong) {
    ghiChu.push('Tên húy trong Excel: ' + (tenHuyGoc || '(trống)'));
  }
  const tieuSu = chu(layO(r, idx.tieuSu));
  const thongTinKhac = chu(layO(r, idx.thongTinKhac));
  if (tieuSu) ghiChu.push(tieuSu);
  if (thongTinKhac) ghiChu.push(thongTinKhac);

  const doiRaw = layO(r, idx.doi);
  const doi = Number.isFinite(Number(doiRaw)) && Number(doiRaw) > 0 ? Math.round(Number(doiRaw)) : 0;

  const vn = {};
  if (doi > 0) vn.generation = doi;
  if (ngayGio && !laNgayTrong(ngayGio)) vn.gio = ngayGio;

  const soThuTuHonNhanRaw = layO(r, idx.soThuTuHonNhan);
  const soThuTuConRaw = layO(r, idx.soThuTuCon);

  const thongTin = {};
  for (const k of COT_THONG_TIN) thongTin[k] = chu(layO(r, idx[k]));

  return {
    rawId, doi,
    thongTin,
    names,
    sex,
    living,
    birth: docNgay(layO(r, idx.ngaySinh)),
    death: docNgay(layO(r, idx.ngayMat)),
    burialPlace: chu(layO(r, idx.moTai)),
    note: ghiChu.join('\n'),
    vn: Object.keys(vn).length > 0 ? vn : undefined,
    birthPlace: chu(layO(r, idx.noiSinh)),
    idCha: chu(layO(r, idx.idCha)),
    idMe: chu(layO(r, idx.idMe)),
    ps1: chu(layO(r, idx.ps1)),
    ps2: chu(layO(r, idx.ps2)),
    soThuTuHonNhan: Number.isFinite(Number(soThuTuHonNhanRaw)) ? Number(soThuTuHonNhanRaw) : 0,
    soThuTuCon: Number.isFinite(Number(soThuTuConRaw)) ? Number(soThuTuConRaw) : null,
  };
}

function xepUnion(nguoiTho) {
  const pairKey = (a, b) => [a, b].sort().join('|');
  const unionMap = new Map();
  const layHoacTao = (key, partners) => {
    let u = unionMap.get(key);
    if (!u) { u = { key, partners: partners.slice(), children: [] }; unionMap.set(key, u); }
    return u;
  };

  for (const p of nguoiTho.values()) {
    for (const sp of [p.ps1, p.ps2]) {
      if (!sp || !nguoiTho.has(sp) || sp === p.rawId) continue;
      const key = pairKey(p.rawId, sp);
      if (unionMap.has(key)) continue;
      const pb = nguoiTho.get(sp);
      const partners = (pb.sex === 'M' && p.sex !== 'M') ? [sp, p.rawId] : [p.rawId, sp];
      layHoacTao(key, partners);
    }
  }

  let soCaMoHoMe = 0;
  for (const p of nguoiTho.values()) {
    const coCha = p.idCha && nguoiTho.has(p.idCha);
    const coMe = p.idMe && nguoiTho.has(p.idMe);
    if (coCha && coMe) {
      const u = layHoacTao(pairKey(p.idCha, p.idMe), [p.idCha, p.idMe]);
      u.children.push(p);
    } else if (coCha) {
      const u = layHoacTao('CHA:' + p.idCha, [p.idCha]);
      u.children.push(p);
      const soVo = [...unionMap.values()]
        .filter((u2) => u2.partners.length === 2 && u2.partners.indexOf(p.idCha) >= 0).length;
      if (soVo >= 2) soCaMoHoMe++;
    } else if (coMe) {
      const u = layHoacTao('ME:' + p.idMe, [p.idMe]);
      u.children.push(p);
    }
  }

  for (const u of unionMap.values()) {
    u.children.sort((a, b) => {
      const oa = a.soThuTuCon === null ? Infinity : a.soThuTuCon;
      const ob = b.soThuTuCon === null ? Infinity : b.soThuTuCon;
      return oa - ob;
    });
  }

  for (const u of unionMap.values()) {
    if (u.partners.length !== 2) continue;
    const ranks = {};
    for (const rawId of u.partners) {
      const p = nguoiTho.get(rawId);
      if (p && p.soThuTuHonNhan > 1) ranks[rawId] = p.soThuTuHonNhan;
    }
    if (Object.keys(ranks).length > 0) u.ranks = ranks;
  }

  return { unionsTho: [...unionMap.values()], soCaMoHoMe };
}

function dungUnion(u, maUnion, maNguoi) {
  const partners = u.partners.map((rawId) => maNguoi.get(rawId));
  const children = u.children.map((p, i) => ({
    personId: maNguoi.get(p.rawId), relation: p.loai || 'birth', order: i + 1,
  }));
  const ranks = {};
  if (u.ranks) {
    for (const rawId of Object.keys(u.ranks)) ranks[maNguoi.get(rawId)] = u.ranks[rawId];
  }
  const out = {
    id: '', uid: '', xrefGoc: '',
    partners, partnerOrder: partners.slice(),
    status: 'married',
    marriage: { iso: '', raw: '', place: '' },
    children, note: '', deleted: false,
  };
  if (Object.keys(ranks).length > 0) out.ranks = ranks;
  out.id = maUnion.get(u.key);
  return out;
}

function dungNguoi(p, id) {
  return {
    id, uid: '', xrefGoc: '',
    names: p.names,
    sex: p.sex,
    birth: Object.assign({}, p.birth, { place: p.birthPlace || p.birth.place }),
    death: p.death,
    burialPlace: p.burialPlace,
    ...p.thongTin,
    living: p.living,
    photoFileId: '',
    note: p.note,
    deleted: false,
    meta: { createdAt: '', updatedAt: '', updatedBy: '' },
    vn: p.vn,
  };
}
