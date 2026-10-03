import { parseLooseDate, formatDate } from '../utils/date.js';
import { coGiaTri, fullName, removeDiacritics } from '../utils/text.js';
import { isValidId, loaiCua, maCayCua, maCayCuaCay, chuanUid, nextId, tachMa,
         sinhUid, soMaTrongKho } from '../utils/id.js';
import { QUAN_HE_CON_NHAN, nhanQuanHeCon, nhanTrangThaiCap } from '../config.js';
import { ranksRoRang } from './union.js';
import { bfs, buildIndex } from '../utils/graph.js';

const THANG_GED = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const DAI_TOI_DA = 200;

const PEDI_CHUAN = { birth: 'birth', adopted: 'adopted', foster: 'foster' };

const THANG_SO = {};
for (let i = 0; i < THANG_GED.length; i++) THANG_SO[THANG_GED[i]] = i + 1;

const TIEN_TO_NGAY = {
  ABT: 'khoảng', ABOUT: 'khoảng',
  EST: 'ước chừng',
  CAL: 'tính ra',
  BEF: 'trước', BEFORE: 'trước',
  AFT: 'sau',   AFTER: 'sau',
  INT: '',
};

const QUAN_HE_NHAP = QUAN_HE_CON_NHAN.map((x) => x.ma);

const NGOAI_CAY = 'file:';

export function exportGedcom(tree, tuyChon) {
  const y = tuyChon || {};
  const an = y.anNguoiConSong !== false;
  const luc = y.luc instanceof Date ? y.luc : new Date();

  const cay = tree && typeof tree === 'object' ? tree : {};
  const nguoi = Array.isArray(cay.persons) ? cay.persons : [];
  const cap = Array.isArray(cay.unions) ? cay.unions : [];
  const anh = Array.isArray(cay.media) ? cay.media : [];
  const nguon = Array.isArray(cay.sources) ? cay.sources : [];

  const nguoiRa = nguoi.filter((p) => p && p.id && !p.deleted);
  const coNguoi = new Set(nguoiRa.map((p) => p.id));
  const theoMa = new Map(nguoiRa.map((p) => [p.id, p]));

  const capRa = [];
  for (const u of cap) {
    if (!u || !u.id || u.deleted) continue;
    const banDoi = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => coNguoi.has(id));
    const con = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && coNguoi.has(c.personId));
    if (banDoi.length === 0 && con.length === 0) continue;
    capRa.push({ goc: u, banDoi, con });
  }

  const boAn = new Set(an ? nguoiRa.filter(daAn).map((p) => p.id) : []);
  const anhTheoChu = gomAnh(anh, coNguoi, new Set(capRa.map((x) => x.goc.id)));

  const lamVo = new Map();
  const lamCon = new Map();
  for (const c of capRa) {
    for (const id of c.banDoi) themVaoMang(lamVo, id, c.goc.id);
    for (const k of c.con) {
      themVaoMang(lamCon, k.personId, { unionId: c.goc.id, relation: k.relation });
    }
  }

  const ds = [];
  veHead(ds, cay, luc, y.tenFile, boAn.size, nguoiRa.length, capRa.length);
  for (const p of nguoiRa) {
    veNguoi(ds, p, boAn.has(p.id), lamVo.get(p.id), lamCon.get(p.id), anhTheoChu);
  }
  for (const c of capRa) veCap(ds, c, theoMa, boAn, anhTheoChu);
  for (const s of nguon) veNguon(ds, s);
  ds.push('0 TRLR');

  return ds.join('\r\n') + '\r\n';
}

export function tenFileGedcom(tree, luc) {
  const t = luc instanceof Date ? luc : new Date();
  const so = (n) => String(n).padStart(2, '0');
  const ngay = t.getFullYear() + so(t.getMonth() + 1) + so(t.getDate());

  const ten = tree && tree.tree && typeof tree.tree.name === 'string'
    ? tree.tree.name : '';
  const goc = boDauChoTenFile(ten).slice(0, 60) || 'gia-pha';
  return goc + '-' + ngay + '.ged';
}

export function tomTatXuat(tree, tuyChon) {
  const an = !tuyChon || tuyChon.anNguoiConSong !== false;
  const cay = tree && typeof tree === 'object' ? tree : {};
  const nguoi = Array.isArray(cay.persons) ? cay.persons : [];
  const cap = Array.isArray(cay.unions) ? cay.unions : [];

  const nguoiRa = nguoi.filter((p) => p && p.id && !p.deleted);
  const coNguoi = new Set(nguoiRa.map((p) => p.id));

  let soCap = 0;
  for (const u of cap) {
    if (!u || !u.id || u.deleted) continue;
    const banDoi = (Array.isArray(u.partners) ? u.partners : [])
      .filter((id) => coNguoi.has(id)).length;
    const con = (Array.isArray(u.children) ? u.children : [])
      .filter((c) => c && coNguoi.has(c.personId)).length;
    if (banDoi === 0 && con === 0) continue;
    soCap++;
  }

  return {
    soNguoi: nguoiRa.length,
    soCap,
    soAn: an ? nguoiRa.filter(daAn).length : 0,
    soBoQua: nguoi.length - nguoiRa.length,
  };
}

export function parseGedcom(text) {
  const dong = tachDong(text);
  const { goc, hong } = docCayGedcom(dong);

  const banGhi = { INDI: [], FAM: [], SOUR: [], khac: [] };
  let head = null;
  let subm = null;
  for (const r of goc) {
    if (r.the === 'HEAD') { head = r; continue; }
    if (r.the === 'SUBM') { subm = r; continue; }
    if (r.the === 'TRLR') continue;
    if (banGhi[r.the]) banGhi[r.the].push(r);
    else banGhi.khac.push(r);
  }

  const tatCa = banGhi.INDI.concat(banGhi.FAM, banGhi.SOUR);
  const { bang, doiMa } = dungBangMa(tatCa);

  const gom = {
    soAn: 0,
    anh: [],
    fams: [],
    famc: [],
  };
  const persons = banGhi.INDI.map((r) => docNguoi(r, gom));
  const coNguoi = new Set(persons.map((p) => p.id));

  const thoCap = banGhi.FAM.map((r) => docCap(r, gom));

  const noi = noiCapVaNguoi(thoCap, bang, coNguoi, gom);
  const unions = noi.unions;

  const sources = banGhi.SOUR.map((r) => docNguon(r));

  const demThe = new Map();
  for (const r of tatCa) quetTheLa(r, demThe);
  for (const r of banGhi.khac) {
    themDem(demThe, r.the);
    quetTheLa(r, demThe);
  }
  const theLa = [...demThe.entries()]
    .map(([the, so]) => ({ the, so }))
    .sort((a, b) => b.so - a.so || (a.the < b.the ? -1 : 1));
  const soDongBoQua = theLa.reduce((t, x) => t + x.so, 0);

  const canhBao = [];
  if (hong.length > 0) {
    canhBao.push({
      muc: 'nang',
      chu: hong.length + ' dòng không đúng khuôn GEDCOM, đã bỏ qua. ' +
           'Dòng đầu tiên: dòng ' + hong[0].so + ' — ' + catNgan(hong[0].chu, 60),
    });
  }
  if (persons.length === 0) {
    canhBao.push({
      muc: 'nang',
      chu: 'Không đọc được người nào. File này có thể không phải GEDCOM, ' +
           'hoặc đã hỏng.',
    });
  }
  if (gom.anh.length > 0) {
    canhBao.push({
      muc: 'nang',
      chu: gom.anh.length + ' tấm ảnh KHÔNG nhập được. File .ged chỉ mang ' +
           'đường dẫn tới ảnh chứ không mang chính tấm ảnh, và đường dẫn ấy ' +
           'trỏ vào máy khác. Ảnh phải thêm lại bằng tay sau khi nhập.',
    });
  }
  if (soDongBoQua > 0) {
    canhBao.push({
      muc: 'nang',
      chu: soDongBoQua + ' dòng mang thông tin app này không có chỗ chứa, ' +
           'sẽ MẤT khi nhập: ' + keTheLa(theLa) + '.',
    });
  }
  if (doiMa.length > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: doiMa.length + ' mã phải đổi vì không đúng khuôn của app ' +
           '(ví dụ ' + doiMa[0][0] + ' thành ' + doiMa[0][1] + ').',
    });
  }
  if (gom.soAn > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: gom.soAn + ' người mang cờ riêng tư ở file gốc — phần mềm xuất ra ' +
           'file này đã bỏ bớt chi tiết của họ trước khi ghi. App không lấy ' +
           'lại được phần đã bị bỏ.',
    });
  }
  for (const c of noi.canhBao) canhBao.push(c);

  return {
    persons,
    unions,
    sources,
    tenCay: tenCayTuFile(head, subm),
    nguonXuat: nguonTuHead(head),
    maNguon: maNguonTuHead(head),
    thongKe: {
      soNguoi: persons.length,
      soCap: unions.length,
      soNguon: sources.length,
      soAnhBoQua: gom.anh.length,
      soDongHong: hong.length,
      soDongBoQua,
      soAn: gom.soAn,
      soDoiMa: doiMa.length,
    },
    theLa,
    doiMa,
    anhBoQua: gom.anh,
    canhBao,
  };
}

const TRUONG_NGUOI = [
  { truong: 'ten',         nhan: 'Tên chính',  doc: (p) => fullName(p),
    dat: (p, m) => datTenChinh(p, m) },
  { truong: 'tenKhac',     nhan: 'Tên khác',   doc: (p) => tenKhacCua(p),
    dat: (p, m) => themTenKhac(p, m) },
  { truong: 'sex',         nhan: 'Giới tính',  doc: (p) => GIOI_CHU[p.sex] || '',
    dat: (p, m) => { p.sex = m.sex; } },
  { truong: 'birth',       nhan: 'Ngày sinh',  doc: (p) => formatDate(p.birth),
    dat: (p, m) => datNgay(p, m, 'birth') },
  { truong: 'birthPlace',  nhan: 'Nơi sinh',   doc: (p) => noiCua(p.birth),
    dat: (p, m) => datNoi(p, m, 'birth') },
  { truong: 'death',       nhan: 'Ngày mất',   doc: (p) => formatDate(p.death),
    dat: (p, m) => datNgay(p, m, 'death') },
  { truong: 'deathPlace',  nhan: 'Nơi mất',    doc: (p) => noiCua(p.death),
    dat: (p, m) => datNoi(p, m, 'death') },
  { truong: 'burialPlace', nhan: 'An táng',    doc: (p) => chu(p.burialPlace),
    dat: (p, m) => { p.burialPlace = chu(m.burialPlace); } },
  { truong: 'title',       nhan: 'Chức tước',  doc: (p) => chu(p.title),
    dat: (p, m) => { p.title = chu(m.title); } },
  { truong: 'occupation',  nhan: 'Nghề nghiệp', doc: (p) => chu(p.occupation),
    dat: (p, m) => { p.occupation = chu(m.occupation); } },
  { truong: 'education',   nhan: 'Học vấn',    doc: (p) => chu(p.education),
    dat: (p, m) => { p.education = chu(m.education); } },
  { truong: 'religion',    nhan: 'Tôn giáo',   doc: (p) => chu(p.religion),
    dat: (p, m) => { p.religion = chu(m.religion); } },
  { truong: 'residence',   nhan: 'Quê quán',   doc: (p) => chu(p.residence),
    dat: (p, m) => { p.residence = chu(m.residence); } },
  { truong: 'nationality', nhan: 'Dân tộc',    doc: (p) => chu(p.nationality),
    dat: (p, m) => { p.nationality = chu(m.nationality); } },
  { truong: 'contact',     nhan: 'Liên hệ',    doc: (p) => chu(p.contact),
    dat: (p, m) => { p.contact = chu(m.contact); } },
  { truong: 'doi',        nhan: 'Đời',        doc: (p) => soDoiCua(p),
    dat: (p, m) => datVn(p, m, 'generation') },
  { truong: 'chi',         nhan: 'Chi / nhánh', doc: (p) => chu(p.vn && p.vn.branch),
    dat: (p, m) => datVn(p, m, 'branch') },
  { truong: 'gio',         nhan: 'Ngày giỗ',   doc: (p) => chu(p.vn && p.vn.gio),
    dat: (p, m) => datVn(p, m, 'gio') },
  { truong: 'note',        nhan: 'Ghi chú',    doc: (p) => chu(p.note),
    dat: (p, m) => { p.note = chu(m.note); } },
];

const TRUONG_CAP = [
  { truong: 'status',        nhan: 'Tình trạng', doc: (u) => nhanTrangThaiCap(u.status),
    dat: (u, m) => { u.status = chu(m.status); } },
  { truong: 'marriage',      nhan: 'Ngày cưới',  doc: (u) => formatDate(u.marriage),
    dat: (u, m) => datNgay(u, m, 'marriage') },
  { truong: 'marriagePlace', nhan: 'Nơi cưới',   doc: (u) => noiCua(u.marriage),
    dat: (u, m) => datNoi(u, m, 'marriage') },
  { truong: 'note',          nhan: 'Ghi chú',    doc: (u) => chu(u.note),
    dat: (u, m) => { u.note = chu(m.note); } },
];

function dongBang(bang, truong) {
  return bang.find((t) => t.truong === truong) || null;
}

function datNgay(dich, nguon, khoa) {
  const a = dich[khoa] && typeof dich[khoa] === 'object' ? dich[khoa] : khoiNgayRong();
  const b = nguon[khoa] && typeof nguon[khoa] === 'object' ? nguon[khoa] : khoiNgayRong();
  dich[khoa] = { iso: b.iso, raw: chu(b.raw), place: chu(a.place) };
}

function datNoi(dich, nguon, khoa) {
  if (!dich[khoa] || typeof dich[khoa] !== 'object') dich[khoa] = khoiNgayRong();
  const b = nguon[khoa] && typeof nguon[khoa] === 'object' ? nguon[khoa] : {};
  dich[khoa].place = chu(b.place);
}

function datVn(dich, nguon, khoa) {
  const v = nguon.vn ? nguon.vn[khoa] : undefined;
  if (v === undefined || v === null || v === '') return;
  if (!dich.vn || typeof dich.vn !== 'object') dich.vn = {};
  dich.vn[khoa] = v;
}

function datTenChinh(dich, nguon) {
  const m = mang(nguon.names).find((n) => n && n.type === 'chinh') || mang(nguon.names)[0];
  if (!m) return;
  const moi = {
    type: 'chinh', surname: chu(m.surname), middle: chu(m.middle), given: chu(m.given),
  };
  if (!Array.isArray(dich.names)) dich.names = [];
  const i = dich.names.findIndex((n) => n && n.type === 'chinh');
  if (i === -1) dich.names.unshift(moi);
  else dich.names[i] = moi;
}

function themTenKhac(dich, nguon) {
  if (!Array.isArray(dich.names)) dich.names = [];
  const khoaCua = (n) =>
    [chu(n.type), chu(n.surname), chu(n.middle), chu(n.given)].join('|');
  const daCo = new Set(dich.names.filter((n) => n).map(khoaCua));
  for (const n of mang(nguon.names)) {
    if (!n || n.type === 'chinh') continue;
    const k = khoaCua(n);
    if (daCo.has(k)) continue;
    daCo.add(k);
    dich.names.push({
      type: chu(n.type) || 'khac', surname: chu(n.surname),
      middle: chu(n.middle), given: chu(n.given),
    });
  }
}

const GIOI_CHU = { M: 'Nam', F: 'Nữ' };

export function detectDuplicates(tree, imported, tuyChon) {
  const thua = (lyDo, loi) => ({
    ok: false, lyDo, loi,
    caTrung: [], nguoiMoi: [], capMoi: [],
    duocTron: false, lyDoChan: 'khongdocduoc', neoTay: [], loiNeoTay: [],
    ngo: [], nguoiChuaNeo: [], capChuaNeo: [], thongKe: thongKeRong(),
  });

  if (!tree || typeof tree !== 'object') return thua('khongcocay', 'Chưa nạp được gia phả đích.');
  if (!imported || !Array.isArray(imported.persons)) {
    return thua('khongdocduoc', 'Chưa đọc được file nên chưa dò được gì.');
  }

  const nguoiCay = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.id)) nguoiCay.set(p.id, p);
  const capCay = new Map();
  for (const u of mang(tree.unions)) if (u && chu(u.id)) capCay.set(u.id, u);

  const tenTheoMa = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.id)) tenTheoMa.set(p.id, fullName(p));
  for (const p of imported.persons) {
    if (p && chu(p.id)) tenTheoMa.set(NGOAI_CAY + p.id, fullName(p));
  }

  const maAppTuCap = new Set();
  for (const cap of mang(imported.doiMa)) {
    if (Array.isArray(cap) && chu(cap[1])) maAppTuCap.add(chu(cap[1]));
  }
  const maCayTa   = maCayCuaCay(tree);
  const tuAppNay  = chu(imported.maNguon).toUpperCase() === 'GIAPHA';

  const neoCua = (id) => {
    if (maAppTuCap.has(id)) return '';
    const mc = maCayCua(id);
    if (mc) return mc === maCayTa ? 'ma-cay' : '';
    return tuAppNay ? 'ma-cu' : '';
  };

  const theoUid = new Map();
  for (const p of mang(tree.persons)) if (p && chu(p.uid)) theoUid.set(chu(p.uid), p);
  for (const u of mang(tree.unions))  if (u && chu(u.uid)) theoUid.set(chu(u.uid), u);

  const theoUidNhap = new Map();
  for (const lan of mang(tree.imports)) {
    for (const d of mang(lan && lan.map)) {
      const uid = chu(d && d.uid);
      const idCay = chu(d && d.id);
      if (!uid || !idCay || theoUid.has(uid) || theoUidNhap.has(uid)) continue;
      const cu = nguoiCay.get(idCay) || capCay.get(idCay);
      if (cu) theoUidNhap.set(uid, cu);
    }
  }

  const nguoiFile = new Map();
  for (const p of imported.persons) if (p && chu(p.id)) nguoiFile.set(chu(p.id), p);
  const capFile = new Map();
  for (const u of mang(imported.unions)) if (u && chu(u.id)) capFile.set(chu(u.id), u);

  const { neoTay, loiNeoTay } = docNeoTay(
    tuyChon && tuyChon.diemNeoTay, nguoiCay, capCay, nguoiFile, capFile);

  const khaiMoi = docKhaiMoi(
    tuyChon && tuyChon.khaiMoi, neoTay, nguoiFile, capFile, loiNeoTay);

  const caTrung = [];
  const nguoiMoi = [];
  const capMoi = [];
  const nguoiChuaNeo = [];
  const capChuaNeo = [];

  if (neoTay.size === 0 || loiNeoTay.length > 0) {
    for (const id of nguoiFile.keys()) nguoiChuaNeo.push(id);
    for (const id of capFile.keys()) capChuaNeo.push(id);

    const cayRong = nguoiCay.size === 0 && capCay.size === 0;
    return khungKetQua({
      caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
      duocTron: false,
      lyDoChan: cayRong ? 'cayRong'
              : (loiNeoTay.length > 0 ? 'neoSai' : 'chuaKhaiDiemNeo'),
      neoTay: capNeoTay(neoTay), loiNeoTay,
    });
  }

  const daGhep = new Set();

  const timBanCu = (banGhi, idFile, theoMa) => {
    const tay = neoTay.get(idFile);
    if (tay) {
      const cu = theoMa.get(tay);
      return cu && !daGhep.has(cu.id) ? { cu, neo: 'tay' } : { cu: null, neo: '' };
    }
    const uid = chu(banGhi && banGhi.uid);
    if (uid) {
      const cu = theoUid.get(uid);
      if (cu && !daGhep.has(cu.id)) return { cu, neo: 'uid' };
      if (cu) return { cu: null, neo: '' };
      const soNhap = theoUidNhap.get(uid);
      if (soNhap && !daGhep.has(soNhap.id)) return { cu: soNhap, neo: 'uid-nhap' };
      if (soNhap) return { cu: null, neo: '' };
    }
    const neo = neoCua(idFile);
    if (!neo) return { cu: null, neo: '' };
    const cu = theoMa.get(idFile) || null;
    if (cu && daGhep.has(cu.id)) return { cu: null, neo: '' };
    return { cu, neo };
  };

  const mayChiVao = (idFile) => {
    const banGhi = nguoiFile.get(idFile) || capFile.get(idFile);
    const uid = chu(banGhi && banGhi.uid);
    const theoU = uid ? theoUid.get(uid) : null;
    if (theoU) return { cu: theoU, duong: 'mã bền (uid)' };
    const theoSo = uid ? theoUidNhap.get(uid) : null;
    if (theoSo) return { cu: theoSo, duong: 'sổ nhập của lần trước' };
    if (!neoCua(idFile)) return { cu: null, duong: '' };
    const cu = nguoiCay.get(idFile) || capCay.get(idFile) || null;
    return cu ? { cu, duong: 'mã bản ghi' } : { cu: null, duong: '' };
  };

  const xungDot = [];
  for (const [idFile, idCay] of neoTay) {
    const { cu, duong } = mayChiVao(idFile);
    if (cu && cu.id !== idCay) {
      xungDot.push({
        trongFile: idFile, trongCay: idCay,
        vi: 'người khai đây là ' + idCay + ', nhưng ' + duong +
            ' của nó chỉ sang ' + cu.id + '.',
      });
    }
  }

  for (const idFile of khaiMoi) {
    const { cu, duong } = mayChiVao(idFile);
    if (cu) {
      xungDot.push({
        trongFile: idFile, trongCay: cu.id,
        vi: 'người khai đây là bản ghi CHƯA CÓ trong cây, nhưng ' + duong +
            ' của nó chỉ sang ' + cu.id + ' đang có sẵn.',
      });
    }
  }
  if (xungDot.length > 0) {
    for (const id of nguoiFile.keys()) nguoiChuaNeo.push(id);
    for (const id of capFile.keys()) capChuaNeo.push(id);
    return khungKetQua({
      caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
      duocTron: false, lyDoChan: 'neoMauThuan',
      neoTay: capNeoTay(neoTay), loiNeoTay: xungDot,
    });
  }

  for (const p of imported.persons) {
    const idFile = chu(p && p.id);
    if (!idFile) continue;
    const { cu, neo } = timBanCu(p, idFile, nguoiCay);
    if (!neo) { (khaiMoi.has(idFile) ? nguoiMoi : nguoiChuaNeo).push(idFile); continue; }
    if (!cu)  { nguoiMoi.push(idFile); continue; }
    daGhep.add(cu.id);
    caTrung.push(Object.assign(caNguoi(cu.id, cu, p), { neo, idTrongFile: idFile }));
  }

  const banDoNguoi = new Map();
  for (const ca of caTrung) {
    if (ca.kieu === 'nguoi') banDoNguoi.set(ca.idTrongFile, ca.id);
  }
  const doiSang = (id) => banDoNguoi.get(id) || (NGOAI_CAY + chu(id));

  const voLy = kiemNeoVoLy(tree, imported, banDoNguoi);
  if (voLy.xungDot.length > 0) {
    for (const id of nguoiFile.keys()) nguoiChuaNeo.push(id);
    for (const id of capFile.keys()) capChuaNeo.push(id);
    return khungKetQua({
      caTrung: [], nguoiMoi: [], capMoi: [], nguoiChuaNeo, capChuaNeo,
      duocTron: false, lyDoChan: 'neoVoLy',
      neoTay: capNeoTay(neoTay), loiNeoTay: voLy.xungDot, ngo: voLy.ngo,
    });
  }

  for (const u of mang(imported.unions)) {
    const idFile = chu(u && u.id);
    if (!idFile) continue;
    const { cu, neo } = timBanCu(u, idFile, capCay);
    if (!neo) { (khaiMoi.has(idFile) ? capMoi : capChuaNeo).push(idFile); continue; }
    if (!cu)  { capMoi.push(idFile); continue; }
    daGhep.add(cu.id);
    caTrung.push(Object.assign(caCap(cu.id, cu, u, tenTheoMa, doiSang),
                                { neo, idTrongFile: idFile }));
  }

  return khungKetQua({
    caTrung, nguoiMoi, capMoi, nguoiChuaNeo, capChuaNeo,
    duocTron: true, lyDoChan: '',
    neoTay: capNeoTay(neoTay), loiNeoTay: [], ngo: voLy.ngo,
  });
}

function khungKetQua(k) {
  const caTrung = k.caTrung;
  return {
    ok: true, lyDo: '', loi: '',
    caTrung, nguoiMoi: k.nguoiMoi, capMoi: k.capMoi,
    duocTron: k.duocTron, lyDoChan: k.lyDoChan,
    neoTay: k.neoTay, loiNeoTay: k.loiNeoTay,
    ngo: mang(k.ngo),
    nguoiChuaNeo: k.nguoiChuaNeo, capChuaNeo: k.capChuaNeo,
    thongKe: {
      soCaTrung:   caTrung.length,
      soCaNguoi:   caTrung.filter((c) => c.kieu === 'nguoi').length,
      soCaCap:     caTrung.filter((c) => c.kieu === 'giadinh').length,
      soGiongHet:  caTrung.filter((c) => c.giongHet).length,
      soKhacTen:   caTrung.filter((c) => c.khacTen).length,
      soDaXoa:     caTrung.filter((c) => c.daXoa).length,
      soBoSung:    caTrung.reduce((n, c) => n + c.boSung.length, 0),
      soMauThuan:  caTrung.reduce((n, c) => n + c.mauThuan.length, 0),
      soNguoiMoi:  k.nguoiMoi.length,
      soCapMoi:    k.capMoi.length,
      soChuaNeo:   k.nguoiChuaNeo.length + k.capChuaNeo.length,
      soNeoTay:    k.neoTay.length,
    },
  };
}

const capNeoTay = (m) =>
  Array.from(m, ([trongFile, trongCay]) => ({ trongFile, trongCay }));

function docNeoTay(ds, nguoiCay, capCay, nguoiFile, capFile) {
  const neoTay = new Map();
  const loiNeoTay = [];
  const dungRoi = new Set();

  for (const c of mang(ds)) {
    const trongFile = chu(c && c.trongFile);
    const trongCay  = chu(c && c.trongCay);
    const ghiLoi = (vi) => loiNeoTay.push({ trongFile, trongCay, vi });

    if (!trongFile || !trongCay) { ghiLoi('thiếu một trong hai vế.'); continue; }

    const coFile = nguoiFile.has(trongFile) || capFile.has(trongFile);
    const coCay  = nguoiCay.has(trongCay)  || capCay.has(trongCay);
    if (!coFile) { ghiLoi('file không có bản ghi ' + trongFile + '.'); continue; }
    if (!coCay)  { ghiLoi('cây không có bản ghi ' + trongCay + '.'); continue; }

    const laNguoi = nguoiFile.has(trongFile);
    if (laNguoi !== nguoiCay.has(trongCay)) {
      ghiLoi('một vế là người, vế kia là gia đình.');
      continue;
    }

    if (neoTay.has(trongFile)) { ghiLoi('bản ghi trong file được khai hai lần.'); continue; }
    if (dungRoi.has(trongCay)) { ghiLoi('bản ghi trong cây được khai hai lần.'); continue; }

    neoTay.set(trongFile, trongCay);
    dungRoi.add(trongCay);
  }
  return { neoTay, loiNeoTay };
}

function docKhaiMoi(ds, neoTay, nguoiFile, capFile, loiNeoTay) {
  const khaiMoi = new Set();
  for (const x of mang(ds)) {
    const trongFile = chu(x);
    const ghiLoi = (vi) => loiNeoTay.push({ trongFile, trongCay: '', vi });

    if (!trongFile) { ghiLoi('một dòng khai "chưa có trong cây" mà không có mã.'); continue; }
    if (!nguoiFile.has(trongFile) && !capFile.has(trongFile)) {
      ghiLoi('file không có bản ghi ' + trongFile + '.');
      continue;
    }
    if (neoTay.has(trongFile)) {
      ghiLoi('vừa khai ghép với ' + neoTay.get(trongFile) +
             ', vừa khai là bản ghi chưa có trong cây.');
      continue;
    }
    khaiMoi.add(trongFile);
  }
  return khaiMoi;
}

function thongKeRong() {
  return {
    soCaTrung: 0, soCaNguoi: 0, soCaCap: 0, soGiongHet: 0, soKhacTen: 0,
    soDaXoa: 0, soBoSung: 0, soMauThuan: 0, soNguoiMoi: 0, soCapMoi: 0,
    soChuaNeo: 0, soNeoTay: 0,
  };
}

function caNguoi(id, cu, moi) {
  const { boSung, mauThuan } = soTruong(TRUONG_NGUOI, cu, moi);
  dongConSong(boSung, mauThuan, cu, moi);

  const tenDangCo = fullName(cu);
  const tenTrongFile = fullName(moi);
  return {
    kieu: 'nguoi',
    id,
    tenDangCo,
    tenTrongFile,
    khacTen: chu(tenDangCo) !== chu(tenTrongFile),
    daXoa: cu.deleted === true,
    giongHet: boSung.length === 0 && mauThuan.length === 0,
    boSung,
    mauThuan,
  };
}

function caCap(id, cu, moi, tenTheoMa, doiSang) {
  const { boSung, mauThuan } = soTruong(TRUONG_CAP, cu, moi);
  dongBanDoi(boSung, mauThuan, cu, moi, tenTheoMa, doiSang);
  dongCon(boSung, mauThuan, cu, moi, tenTheoMa, doiSang);

  const tenDangCo = keBanDoi(cu, tenTheoMa);
  const tenTrongFile = keBanDoi(moi, tenTheoMa, doiSang);
  return {
    kieu: 'giadinh',
    id,
    tenDangCo,
    tenTrongFile,
    khacTen: !cungTap(banDoiCua(cu), banDoiCua(moi).map(doiSang)),
    daXoa: cu.deleted === true,
    giongHet: boSung.length === 0 && mauThuan.length === 0,
    boSung,
    mauThuan,
  };
}

function soTruong(bang, cu, moi) {
  const boSung = [];
  const mauThuan = [];
  for (const t of bang) {
    const a = chu(t.doc(cu));
    const b = chu(t.doc(moi));
    if (b === '' || a === b) continue;
    if (a === '') {
      boSung.push({ truong: t.truong, khoa: t.truong, nhan: t.nhan, giaTri: b });
    } else {
      mauThuan.push({
        truong: t.truong, khoa: t.truong, nhan: t.nhan, dangCo: a, trongFile: b,
      });
    }
  }
  return { boSung, mauThuan };
}

function dongConSong(boSung, mauThuan, cu, moi) {
  const daKe = (ds) => ds.some((d) => d.truong === 'death');
  if (daKe(boSung) || daKe(mauThuan)) return;

  const a = cu.living === false;
  const b = moi.living === false;
  if (a === b) return;
  if (!b) return;
  if (!a) {
    boSung.push({
      truong: 'living', khoa: 'living', nhan: 'Còn sống', giaTri: 'Đã mất',
    });
  }
}

function dongBanDoi(boSung, mauThuan, cu, moi, tenTheoMa, doiSang) {
  const a = banDoiCua(cu);
  const goc = banDoiCua(moi);
  const b = goc.map(doiSang);
  if (cungTap(a, b)) return;

  const ke = (ds) => ds.map((id) => moTaMa(id, tenTheoMa)).join(', ');
  if (a.every((id) => b.includes(id))) {
    const them = goc.filter((id) => !a.includes(doiSang(id)));
    boSung.push({
      truong: 'banDoi', khoa: 'banDoi', nhan: 'Vợ/chồng',
      giaTri: 'thêm ' + ke(them.map(doiSang)), themFile: them,
    });
    return;
  }
  mauThuan.push({
    truong: 'banDoi', khoa: 'banDoi', nhan: 'Vợ/chồng',
    dangCo: ke(a), trongFile: ke(b),
  });
}

function dongCon(boSung, mauThuan, cu, moi, tenTheoMa, doiSang) {
  const a = new Map();
  for (const c of mang(cu.children)) if (c && chu(c.personId)) a.set(c.personId, c);

  for (const c of mang(moi.children)) {
    const goc = chu(c && c.personId);
    const id = doiSang(goc);
    if (!id) continue;
    const ten = moTaMa(id, tenTheoMa);
    const qhMoi = chu(nhanQuanHeCon(c.relation));
    const cCu = a.get(id);

    if (!cCu) {
      boSung.push({
        truong: 'con', khoa: 'con+' + goc, nhan: 'Con',
        giaTri: 'thêm ' + ten + (qhMoi ? ' — ' + qhMoi.toLowerCase() : ''),
        maFile: goc, qh: chu(c.relation),
      });
      continue;
    }
    const qhCu = chu(nhanQuanHeCon(cCu.relation));
    if (qhMoi === '' || qhMoi === qhCu) continue;
    if (qhCu === '') {
      boSung.push({
        truong: 'con', khoa: 'qh+' + goc, nhan: 'Quan hệ với ' + ten,
        giaTri: qhMoi, maFile: goc, qh: chu(c.relation),
      });
    } else {
      mauThuan.push({
        truong: 'con', khoa: 'qh+' + goc, nhan: 'Quan hệ với ' + ten,
        dangCo: qhCu, trongFile: qhMoi, maFile: goc, qh: chu(c.relation),
      });
    }
  }
}

function moTaMa(id, tenTheoMa) {
  const ten = chu(tenTheoMa.get(id));
  if (chu(id).startsWith(NGOAI_CAY)) {
    return ten === '' ? 'một người trong file' : ten + ' (trong file)';
  }
  return ten === '' ? id : ten + ' (' + id + ')';
}

function banDoiCua(u) {
  return mang(u && u.partners).map((x) => chu(x)).filter((x) => x !== '');
}

function keBanDoi(u, tenTheoMa, doiSang) {
  const ds = banDoiCua(u).map(doiSang || ((id) => id));
  return ds.length === 0 ? '' : ds.map((id) => moTaMa(id, tenTheoMa)).join(' — ');
}

function cungTap(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function tenKhacCua(p) {
  const ds = mang(p && p.names).filter((n) => n && n.type !== 'chinh');
  return ds.map(fullName).filter((t) => chu(t) !== '').join(', ');
}

function noiCua(khoi) {
  return chu(khoi && khoi.place);
}

function soDoiCua(p) {
  const s = p && p.vn && p.vn.generation;
  return Number.isInteger(s) && s > 0 ? String(s) : '';
}

function mang(x) {
  return Array.isArray(x) ? x : [];
}

export function goiYCapTheoNguoi(tree, imported, banDoNguoi) {
  const tra = (id) => (banDoNguoi instanceof Map
    ? banDoNguoi.get(id)
    : (banDoNguoi && typeof banDoNguoi === 'object' ? banDoNguoi[id] : ''));

  const khoaCua = (ds) => ds.slice().sort().join('|');

  const capTheoKhoa = new Map();
  const trung = new Set();
  for (const u of mang(tree && tree.unions)) {
    if (!u || !chu(u.id) || u.deleted === true) continue;
    const k = khoaCua(banDoiCua(u));
    if (k === '') continue;
    if (capTheoKhoa.has(k)) trung.add(k);
    else capTheoKhoa.set(k, u.id);
  }

  const ketQua = [];
  const daDung = new Map();
  const boDi = new Set();
  for (const u of mang(imported && imported.unions)) {
    const idFile = chu(u && u.id);
    if (!idFile) continue;
    const banDoi = banDoiCua(u);
    if (banDoi.length === 0) continue;

    const trongCay = [];
    for (const id of banDoi) {
      const sang = chu(tra(id));
      if (!sang) { trongCay.length = 0; break; }
      trongCay.push(sang);
    }
    if (trongCay.length === 0) continue;

    const k = khoaCua(trongCay);
    if (trung.has(k)) continue;
    const capCay = capTheoKhoa.get(k);
    if (!capCay) continue;

    if (daDung.has(capCay)) { boDi.add(capCay); continue; }
    daDung.set(capCay, idFile);
    ketQua.push({ trongFile: idFile, trongCay: capCay });
  }

  return boDi.size === 0
    ? ketQua
    : ketQua.filter((x) => !boDi.has(x.trongCay));
}

export function lanTheoQuanHe(tree, imported, banDoNguoi, boQua) {
  const ketQua = [];

  const banDo = new Map();
  if (banDoNguoi instanceof Map) {
    for (const [k, v] of banDoNguoi) {
      if (chu(k) && chu(v)) banDo.set(chu(k), chu(v));
    }
  } else if (banDoNguoi && typeof banDoNguoi === 'object') {
    for (const k of Object.keys(banDoNguoi)) {
      if (chu(k) && chu(banDoNguoi[k])) banDo.set(chu(k), chu(banDoNguoi[k]));
    }
  }
  if (banDo.size === 0) return ketQua;

  const bo = boQua instanceof Set ? boQua : new Set(mang(boQua).map((x) => chu(x)));

  let qF;
  let qT;
  try {
    qF = chiMucQuanHe(imported);
    qT = chiMucQuanHe(tree);
  } catch (e) {
    return ketQua;
  }

  const chiem = new Set(banDo.values());
  const daDeXuat = new Map();
  const hangDoi = [...banDo.keys()];
  const daXet = new Set(hangDoi);

  const HUONG = [
    ['bố mẹ',   'cha'],
    ['bạn đời', 'vo'],
    ['con',     'con'],
  ];

  while (hangDoi.length > 0) {
    const x = hangDoi.shift();
    const a = banDo.get(x) || daDeXuat.get(x);
    if (!a) continue;

    for (const [ten, khoa] of HUONG) {
      const thanNhanFile = qF[khoa].get(x);
      const thanNhanCay = qT[khoa].get(a);
      if (!thanNhanFile || !thanNhanCay) continue;

      for (const y of thanNhanFile) {
        if (banDo.has(y) || daDeXuat.has(y) || bo.has(y)) continue;
        const nguoiFile = qF.nguoi.get(y);
        if (!nguoiFile) continue;

        const ungVien = [];
        for (const z of thanNhanCay) {
          if (chiem.has(z)) continue;
          const nguoiCay = qT.nguoi.get(z);
          if (nguoiCay && khopDuocNguoi(nguoiFile, nguoiCay)) ungVien.push(z);
        }
        if (ungVien.length !== 1) continue;

        daDeXuat.set(y, ungVien[0]);
        chiem.add(ungVien[0]);
        ketQua.push({ trongFile: y, trongCay: ungVien[0], qua: ten, tuNguoi: x });
        if (!daXet.has(y)) { daXet.add(y); hangDoi.push(y); }
      }
    }
  }

  return ketQua;
}

function chiMucQuanHe(nguon) {
  const ix = buildIndex(nguon);
  const cha = new Map();
  const vo = new Map();
  const con = new Map();

  const them = (m, a, b) => {
    if (!a || !b || a === b) return;
    if (!m.has(a)) m.set(a, new Set());
    m.get(a).add(b);
  };

  for (const id of ix.personById.keys()) {
    for (const uid of (ix.unionsAsChild.get(id) || [])) {
      const u = ix.unionById.get(uid);
      for (const b of banDoiCua(u)) if (ix.personById.has(b)) them(cha, id, b);
    }
    for (const uid of (ix.unionsAsPartner.get(id) || [])) {
      const u = ix.unionById.get(uid);
      for (const b of banDoiCua(u)) if (ix.personById.has(b)) them(vo, id, b);
      for (const c of mang(u && u.children)) {
        const cid = chu(c && c.personId);
        if (ix.personById.has(cid)) them(con, id, cid);
      }
    }
  }

  return { cha, vo, con, nguoi: ix.personById };
}

function hoVaTenChuan(p) {
  const ds = mang(p && p.names);
  const n = ds.find((x) => x && x.type === 'chinh') || ds[0];
  if (!n) return '';
  const s = [n.surname, n.given].filter(coGiaTri).map((x) => String(x).trim()).join(' ');
  return removeDiacritics(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

function khopDuocNguoi(a, b) {
  const ta = hoVaTenChuan(a);
  if (ta === '' || ta !== hoVaTenChuan(b)) return false;

  const sa = chu(a && a.sex);
  const sb = chu(b && b.sex);
  if (sa && sb && sa !== 'U' && sb !== 'U' && sa !== sb) return false;

  const na = namSinhCua(a);
  const nb = namSinhCua(b);
  if (na && nb && Math.abs(na - nb) >= 3) return false;

  return true;
}

export function kiemNeoVoLy(tree, imported, banDoNguoi) {
  const xungDot = [];
  const ngo = [];
  const tra = (id) => chu(banDoNguoi instanceof Map
    ? banDoNguoi.get(id)
    : (banDoNguoi && typeof banDoNguoi === 'object' ? banDoNguoi[id] : ''));

  const soNeo = banDoNguoi instanceof Map
    ? banDoNguoi.size
    : Object.keys(banDoNguoi || {}).length;
  if (soNeo === 0) return { xungDot, ngo };

  let chiMuc;
  try {
    chiMuc = buildIndex(tree);
  } catch (e) {
    return {
      xungDot: [{ trongFile: '', trongCay: '', vi: String((e && e.message) || e) }],
      ngo,
    };
  }

  const nhoToTien = new Map();
  const toTienCua = (id) => {
    if (nhoToTien.has(id)) return nhoToTien.get(id);
    const tap = bfs(id, (x) => {
      const ra = [];
      for (const idU of mang(chiMuc.unionsAsChild.get(x))) {
        const u = chiMuc.unionById.get(idU);
        for (const idP of mang(u && u.partners)) if (chu(idP)) ra.push(idP);
      }
      return ra;
    });
    nhoToTien.set(id, tap);
    return tap;
  };

  const tenCay = (id) => {
    const t = fullName(chiMuc.personById.get(id));
    return t ? t + ' (' + id + ')' : id;
  };
  const nguoiFile = new Map();
  for (const p of mang(imported && imported.persons)) {
    if (p && chu(p.id)) nguoiFile.set(chu(p.id), p);
  }
  const tenFile = (id) => {
    const t = fullName(nguoiFile.get(id));
    return t ? t + ' (' + id + ')' : id;
  };

  for (const u of mang(imported && imported.unions)) {
    if (!u) continue;
    const banDoi = mang(u.partners).map((x) => chu(x)).filter((x) => x !== '');
    const con = mang(u.children)
      .map((c) => chu(c && c.personId))
      .filter((x) => x !== '');

    for (const idCha of banDoi) {
      const a = tra(idCha);
      if (!a) continue;
      for (const idCon of con) {
        const b = tra(idCon);
        if (!b || b === a) continue;
        if (!toTienCua(a).has(b)) continue;
        xungDot.push({
          trongFile: idCon,
          trongCay: b,
          vi: 'file khai ' + tenFile(idCha) + ' là cha/mẹ của ' + tenFile(idCon)
            + ', nhưng trong cây ' + tenCay(b) + ' lại là bậc TRÊN của '
            + tenCay(a) + '. Nhận cả hai điểm neo này là biến người con thành '
            + 'tổ tiên của chính cha mẹ mình.',
        });
      }
    }

    for (let i = 0; i < banDoi.length; i++) {
      for (let j = i + 1; j < banDoi.length; j++) {
        const a = tra(banDoi[i]);
        const b = tra(banDoi[j]);
        if (!a || !b || a === b) continue;
        const aTrenB = toTienCua(b).has(a);
        const bTrenA = toTienCua(a).has(b);
        if (!aTrenB && !bTrenA) continue;
        xungDot.push({
          trongFile: aTrenB ? banDoi[j] : banDoi[i],
          trongCay: aTrenB ? b : a,
          vi: 'file khai ' + tenFile(banDoi[i]) + ' và ' + tenFile(banDoi[j])
            + ' là vợ chồng, nhưng trong cây ' + tenCay(aTrenB ? a : b)
            + ' là bậc TRÊN của ' + tenCay(aTrenB ? b : a) + '.',
        });
      }
    }
  }

  for (const [idFile, p] of nguoiFile) {
    const idCay = tra(idFile);
    if (!idCay) continue;
    const cu = chiMuc.personById.get(idCay);
    if (!cu) continue;

    const gtFile = chu(p.sex);
    const gtCay = chu(cu.sex);
    const roRang = (g) => g === 'M' || g === 'F';
    if (roRang(gtFile) && roRang(gtCay) && gtFile !== gtCay) {
      ngo.push({
        trongFile: idFile,
        trongCay: idCay,
        vi: 'giới tính lệch: file ghi ' + (gtFile === 'M' ? 'nam' : 'nữ')
          + ', cây ghi ' + (gtCay === 'M' ? 'nam' : 'nữ') + '.',
      });
    }

    const namF = namSinhCua(p);
    const namC = namSinhCua(cu);
    if (namF && namC && Math.abs(namF - namC) >= 3) {
      ngo.push({
        trongFile: idFile,
        trongCay: idCay,
        vi: 'năm sinh lệch ' + Math.abs(namF - namC) + ' năm: file ghi '
          + namF + ', cây ghi ' + namC + '.',
      });
    }
  }

  return { xungDot, ngo };
}

function namSinhCua(p) {
  const b = p && p.birth;
  if (!b || typeof b !== 'object') return 0;
  const iso = chu(b.iso);
  const m = iso ? iso.match(/^(\d{4})/) : null;
  if (m) return Number(m[1]);
  const raw = chu(b.raw);
  const m2 = raw ? raw.match(/(\d{4})/) : null;
  return m2 ? Number(m2[1]) : 0;
}

export function mergeImported(tree, imported, tuyChon) {
  const t = tuyChon || {};
  const che = chu(t.che) || 'moi';
  const thua = (lyDo, loi) => ({ ok: false, lyDo, loi, cay: null, tomTat: null });

  if (che !== 'moi' && che !== 'bosung') {
    return thua('chelala',
      'Chế độ nhập "' + che + '" không có. Chỉ có "moi" và "bosung".');
  }
  if (!imported || !Array.isArray(imported.persons) || imported.persons.length === 0) {
    return thua('khongcoai', 'File không có người nào, nên không có gì để ghi.');
  }
  if (!tree || typeof tree !== 'object' || !tree.tree) {
    return thua('khongcocay', 'Chưa nạp được gia phả đích nên chưa ghi được gì.');
  }

  return che === 'moi'
    ? tronMoi(tree, imported, t, thua)
    : tronBoSung(tree, imported, t, thua);
}

function tronMoi(tree, imported, t, thua) {
  const dem = (x) => (Array.isArray(x) ? x.length : 0);
  const daCo = dem(tree.persons) + dem(tree.unions) + dem(tree.sources);
  if (daCo > 0) {
    return thua('khongrong',
      'Gia phả đích đã có ' + dem(tree.persons) + ' người và ' +
      dem(tree.unions) + ' gia đình. Chế độ này chỉ ghi vào một gia phả RỖNG.');
  }

  const cay = JSON.parse(JSON.stringify(tree));
  const nhap = JSON.parse(JSON.stringify(imported));

  const nguoiFile = mang(nhap.persons).filter((p) => p && chu(p.id));
  const capFile = mang(nhap.unions).filter((u) => u && chu(u.id));
  const nguonFile = mang(nhap.sources).filter((s) => s && chu(s.id));

  const banDo = new Map();
  const capMa = capMaHangLoat(cay);
  for (const p of nguoiFile) banDo.set(chu(p.id), capMa('P'));
  for (const u of capFile) banDo.set(chu(u.id), capMa('U'));
  for (const s of nguonFile) banDo.set(chu(s.id), capMa('S'));
  const doiSang = (id) => banDo.get(chu(id)) || '';

  const maCay = maCayCuaCay(cay);
  const luc = chu(t.luc);
  const boi = chu(t.nguoiGhi);
  const lacKhiDich = [];

  const soNhap = [];
  const ghiSo = (goc, trongCay) => {
    const idFile = chu(goc && goc.id);
    if (!idFile || !banDo.has(idFile)) return;
    soNhap.push({
      xref: chu(goc.xrefGoc), fileId: idFile,
      uid: chu(trongCay && trongCay.uid), id: banDo.get(idFile), added: true,
    });
  };

  for (const p of nguoiFile) {
    p.id = banDo.get(chu(p.id));
    if (!chu(p.uid)) p.uid = sinhUid(maCay, p.id);
    p.meta = { createdAt: luc, updatedAt: luc, updatedBy: boi };
    delete p.xrefGoc;
  }
  for (const u of capFile) {
    u.id = banDo.get(chu(u.id));
    if (!chu(u.uid)) u.uid = sinhUid(maCay, u.id);
    doiConTroCap(u, doiSang, lacKhiDich);
    delete u.xrefGoc;
  }
  for (const s of nguonFile) s.id = banDo.get(chu(s.id));

  if (lacKhiDich.length > 0) {
    return thua('controlac',
      'Có ' + lacKhiDich.length + ' con trỏ trong file trỏ vào bản ghi không ' +
      'có trong file (' + lacKhiDich.slice(0, 3).join(' · ') + '). Đã dừng, ' +
      'chưa ghi gì.');
  }

  const theoMaMoi = new Map(nguoiFile.concat(capFile).map((x) => [x.id, x]));
  const moiCua = (goc) => theoMaMoi.get(banDo.get(chu(goc && goc.id)));
  for (const p of mang(imported.persons)) ghiSo(p, moiCua(p));
  for (const u of mang(imported.unions)) ghiSo(u, moiCua(u));

  cay.persons = nguoiFile;
  cay.unions = capFile;
  cay.sources = nguonFile;
  cay.media = [];
  if (!Array.isArray(cay.imports)) cay.imports = [];
  cay.imports.push({
    at: luc, by: boi,
    file: chu(t.tenFile),
    source: loaiFileNhap(imported),
    sourceName: chu(imported.tenCay),
    exporter: chu(imported.nguonXuat),
    counts: { matched: 0, added: nguoiFile.length + capFile.length + nguonFile.length },
    map: soNhap,
  });

  cay.tree.rootPersonId = nguoiFile.length ? nguoiFile[0].id : null;

  const lac = conTroLac(cay);
  if (lac.length > 0) {
    return thua('controtreo',
      'Sau khi cấp mã mới thì có ' + lac.length + ' con trỏ trỏ vào bản ghi ' +
      'không tồn tại (' + lac.slice(0, 3).join(' · ') + '). Đã dừng, chưa ghi gì.');
  }

  return {
    ok: true, lyDo: '', loi: '', cay, boQua: [],
    tomTat: {
      soNguoi: cay.persons.length,
      soCap: cay.unions.length,
      soNguon: cay.sources.length,
      themNguoi: cay.persons.length,
      themCap: cay.unions.length,
      themNguon: cay.sources.length,
      suaNguoi: 0, suaCap: 0,
      soBoSung: 0, soLay: 0, soGiu: 0,
    },
  };
}

const LOI_CHAN = {
  cayRong: 'Gia phả đang mở chưa có ai. Đường đúng của ca này là tạo gia phả MỚI.',
  chuaKhaiDiemNeo: 'Chưa khai điểm neo nào, nên chưa có căn cứ để trộn.',
  neoSai: 'Có dòng khai chưa dùng được, nên chặn cả lần nhập.',
  neoMauThuan: 'Lời khai của bạn và điểm neo của máy đang chỉ vào hai bản ghi khác nhau.',
  neoVoLy: 'Bộ điểm neo đang mâu thuẫn với quan hệ gia đình trong cây.',
};

function tronBoSung(tree, imported, t, thua) {
  const kq = detectDuplicates(tree, imported, {
    diemNeoTay: t.diemNeoTay, khaiMoi: t.khaiMoi,
  });
  if (!kq.ok) return thua('dotrunghong', kq.loi);
  if (!kq.duocTron) {
    return thua('chuachot',
      (LOI_CHAN[kq.lyDoChan] || 'Bảng ghép đôi chưa xong.') +
      ' Chưa trộn được gì.');
  }
  if (kq.thongKe.soChuaNeo > 0) {
    return thua('conchuaquyet',
      'Còn ' + kq.thongKe.soChuaNeo + ' bản ghi chưa có câu trả lời. Mỗi bản ' +
      'ghi trong file phải là "người này trong cây" hoặc "chưa có trong cây".');
  }

  const vaoRac = kq.caTrung.filter((c) => c.daXoa);
  if (vaoRac.length > 0) {
    return thua('ghepvaothungrac',
      vaoRac.length + ' bản ghi được ghép vào một bản ghi đang nằm trong ' +
      'THÙNG RÁC (' + vaoRac.map((c) => c.id).join(', ') + '). Hãy khôi phục ' +
      'chúng ở màn Thùng rác trước, rồi nhập lại.');
  }

  const cay = JSON.parse(JSON.stringify(tree));
  const nhap = JSON.parse(JSON.stringify(imported));
  for (const ten of ['persons', 'unions', 'media', 'sources']) {
    if (!Array.isArray(cay[ten])) cay[ten] = [];
  }

  const nguoiFile = new Map();
  for (const p of mang(nhap.persons)) if (p && chu(p.id)) nguoiFile.set(p.id, p);
  const capFile = new Map();
  for (const u of mang(nhap.unions)) if (u && chu(u.id)) capFile.set(u.id, u);
  const nguonFile = mang(nhap.sources).filter((s) => s && chu(s.id));

  const banDo = new Map();
  for (const ca of kq.caTrung) banDo.set(ca.idTrongFile, ca.id);

  const capMa = capMaHangLoat(cay);
  for (const id of kq.nguoiMoi) banDo.set(id, capMa('P'));
  for (const id of kq.capMoi) banDo.set(id, capMa('U'));
  for (const s of nguonFile) banDo.set(chu(s.id), capMa('S'));
  const doiSang = (id) => banDo.get(chu(id)) || '';

  const maCay = maCayCuaCay(cay);
  const luc = chu(t.luc);
  const boi = chu(t.nguoiGhi);
  const lacKhiDich = [];

  let themNguoi = 0;
  for (const idFile of kq.nguoiMoi) {
    const p = nguoiFile.get(idFile);
    if (!p) continue;
    p.id = banDo.get(idFile);
    if (!chu(p.uid)) p.uid = sinhUid(maCay, p.id);
    p.meta = { createdAt: luc, updatedAt: luc, updatedBy: boi };
    delete p.xrefGoc;
    cay.persons.push(p);
    themNguoi++;
  }

  let themCap = 0;
  for (const idFile of kq.capMoi) {
    const u = capFile.get(idFile);
    if (!u) continue;
    u.id = banDo.get(idFile);
    if (!chu(u.uid)) u.uid = sinhUid(maCay, u.id);
    doiConTroCap(u, doiSang, lacKhiDich);
    delete u.xrefGoc;
    cay.unions.push(u);
    themCap++;
  }

  let themNguon = 0;
  for (const s of nguonFile) {
    s.id = banDo.get(chu(s.id));
    cay.sources.push(s);
    themNguon++;
  }

  if (lacKhiDich.length > 0) {
    return thua('controlac',
      'Có ' + lacKhiDich.length + ' con trỏ trong file không dịch được sang ' +
      'mã của cây (' + lacKhiDich.slice(0, 3).join(' · ') + '). Đã dừng, ' +
      'chưa ghi gì.');
  }

  const nguoiCay = new Map(cay.persons.map((p) => [p.id, p]));
  const capCay = new Map(cay.unions.map((u) => [u.id, u]));
  const quyetDinh = (t.quyetDinh && typeof t.quyetDinh === 'object') ? t.quyetDinh : {};

  const boQua = [];
  let suaNguoi = 0;
  let suaCap = 0;
  let soBoSung = 0;
  let soLay = 0;
  let soGiu = 0;

  for (const ca of kq.caTrung) {
    const laNguoi = ca.kieu === 'nguoi';
    const dich = laNguoi ? nguoiCay.get(ca.id) : capCay.get(ca.id);
    const nguon = laNguoi ? nguoiFile.get(ca.idTrongFile) : capFile.get(ca.idTrongFile);
    if (!dich || !nguon) continue;

    const lay = new Set(mang(quyetDinh[ca.id]).map((x) => chu(x)));
    let daDoi = false;

    for (const m of ca.boSung) {
      if (apMotChoLech(ca.kieu, m, dich, nguon, doiSang)) { soBoSung++; daDoi = true; }
      else boQua.push({ id: ca.id, nhan: m.nhan, vi: viBoQua(m) });
    }
    for (const m of ca.mauThuan) {
      if (!lay.has(m.khoa)) { soGiu++; continue; }
      if (apMotChoLech(ca.kieu, m, dich, nguon, doiSang)) { soLay++; daDoi = true; }
      else boQua.push({ id: ca.id, nhan: m.nhan, vi: viBoQua(m) });
    }

    if (!daDoi) continue;
    if (laNguoi) {
      const cu = (dich.meta && typeof dich.meta === 'object') ? dich.meta : {};
      dich.meta = { createdAt: chu(cu.createdAt), updatedAt: luc, updatedBy: boi };
      suaNguoi++;
    } else {
      suaCap++;
    }
  }

  const soNhap = [];
  const moiNguoi = new Set(kq.nguoiMoi);
  const moiCap = new Set(kq.capMoi);
  const ghiSo = (goc, trongCay, laMoi) => {
    const idFile = chu(goc && goc.id);
    if (!idFile || !banDo.has(idFile)) return;
    soNhap.push({
      xref: chu(goc.xrefGoc),
      fileId: idFile,
      uid: chu(trongCay && trongCay.uid),
      id: banDo.get(idFile),
      added: laMoi,
    });
  };
  for (const p of mang(imported.persons)) {
    ghiSo(p, nguoiFile.get(chu(p && p.id)), moiNguoi.has(chu(p && p.id)));
  }
  for (const u of mang(imported.unions)) {
    ghiSo(u, capFile.get(chu(u && u.id)), moiCap.has(chu(u && u.id)));
  }

  if (!Array.isArray(cay.imports)) cay.imports = [];
  cay.imports.push({
    at: luc,
    by: boi,
    file: chu(t.tenFile),
    source: loaiFileNhap(imported),
    sourceName: chu(imported.tenCay),
    exporter: chu(imported.nguonXuat),
    counts: {
      matched: kq.caTrung.length,
      added: themNguoi + themCap + themNguon,
    },
    map: soNhap,
  });

  const lacTruoc = new Set(conTroLac(tree));
  const lacMoi = conTroLac(cay).filter((x) => !lacTruoc.has(x));
  if (lacMoi.length > 0) {
    return thua('controtreo',
      'Sau khi trộn thì có ' + lacMoi.length + ' con trỏ trỏ vào bản ghi ' +
      'không tồn tại (' + lacMoi.slice(0, 3).join(' · ') + '). Đã dừng, ' +
      'chưa ghi gì.');
  }

  return {
    ok: true, lyDo: '', loi: '', cay, boQua,
    tomTat: {
      soNguoi: cay.persons.length,
      soCap: cay.unions.length,
      soNguon: cay.sources.length,
      themNguoi, themCap, themNguon,
      suaNguoi, suaCap,
      soBoSung, soLay, soGiu,
    },
  };
}

function loaiFileNhap(imported) {
  return chu(imported && imported.maNguon).toUpperCase() === 'EXCEL' ? 'EXCEL' : 'GEDCOM';
}

function capMaHangLoat(cay) {
  const dem = {};
  return (loai) => {
    if (soMaTrongKho(loai) > 0) {
      const ma = nextId(loai, cay);
      const p = tachMa(ma);
      if (!dem[loai] || p.so > dem[loai].so) dem[loai] = { maCay: p.maCay, so: p.so };
      return ma;
    }
    if (!dem[loai]) {
      const p = tachMa(nextId(loai, cay));
      dem[loai] = { maCay: p.maCay, so: p.so };
    } else {
      dem[loai].so++;
    }
    const d = dem[loai];
    return (d.maCay ? d.maCay + '_' : '') + loai + String(d.so).padStart(4, '0');
  };
}

function doiConTroCap(u, doiSang, lac) {
  const dich = (ds, o) => mang(ds).map((x) => {
    const id = doiSang(x);
    if (!id) lac.push(chu(u.id) + '.' + o + '→' + chu(x));
    return id;
  }).filter((x) => x !== '');

  u.partners = dich(u.partners, 'partners');
  u.partnerOrder = dich(u.partnerOrder, 'partnerOrder');

  const con = [];
  for (const c of mang(u.children)) {
    const id = doiSang(c && c.personId);
    if (!id) { lac.push(chu(u.id) + '.children→' + chu(c && c.personId)); continue; }
    con.push({ personId: id, relation: chu(c.relation) || 'birth', order: con.length + 1 });
  }
  u.children = con;

  if (u.ranks && typeof u.ranks === 'object') {
    const moi = {};
    for (const k of Object.keys(u.ranks)) {
      const id = doiSang(k);
      if (!id) { lac.push(chu(u.id) + '.ranks→' + k); continue; }
      moi[id] = u.ranks[k];
    }
    if (Object.keys(moi).length > 0) u.ranks = moi;
    else delete u.ranks;
  }
}

function apMotChoLech(kieu, m, dich, nguon, doiSang) {
  if (kieu === 'nguoi') {
    if (m.khoa === 'living') { dich.living = false; return true; }
    const t = dongBang(TRUONG_NGUOI, m.truong);
    if (!t) return false;
    t.dat(dich, nguon);
    return true;
  }

  if (m.truong === 'banDoi') {
    if (!Array.isArray(m.themFile)) return false;
    if (!Array.isArray(dich.partners)) dich.partners = [];
    if (!Array.isArray(dich.partnerOrder)) dich.partnerOrder = dich.partners.slice();
    for (const goc of m.themFile) {
      const id = doiSang(goc);
      if (!id) return false;
      if (dich.partners.indexOf(id) === -1) dich.partners.push(id);
      if (dich.partnerOrder.indexOf(id) === -1) dich.partnerOrder.push(id);
    }
    return true;
  }

  if (m.truong === 'con') {
    const id = doiSang(m.maFile);
    if (!id) return false;
    if (!Array.isArray(dich.children)) dich.children = [];
    const qh = QUAN_HE_NHAP.indexOf(chu(m.qh)) >= 0 ? chu(m.qh) : 'birth';
    const cCu = dich.children.find((c) => c && c.personId === id);
    if (cCu) cCu.relation = qh;
    else dich.children.push({ personId: id, relation: qh, order: dich.children.length + 1 });
    return true;
  }

  const t = dongBang(TRUONG_CAP, m.truong);
  if (!t) return false;
  t.dat(dich, nguon);
  return true;
}

function viBoQua(m) {
  if (m.truong === 'banDoi') {
    return 'đổi danh sách vợ/chồng là gỡ một người ra khỏi cặp của họ, ' +
           'nên đường nhập không làm. Sửa ở màn Sửa thông tin gia đình.';
  }
  return 'app chưa có cách ghi chỗ này khi nhập.';
}

function conTroLac(cay) {
  const coNguoi = new Set();
  for (const p of mang(cay && cay.persons)) if (p && chu(p.id)) coNguoi.add(p.id);
  const coCap = new Set();
  for (const u of mang(cay && cay.unions)) if (u && chu(u.id)) coCap.add(u.id);

  const lac = [];
  const soi = (id, o) => { if (chu(id) && !coNguoi.has(chu(id))) lac.push(o + '→' + chu(id)); };

  for (const u of mang(cay && cay.unions)) {
    if (!u) continue;
    const ma = chu(u.id);
    for (const x of mang(u.partners)) soi(x, ma + '.partners');
    for (const x of mang(u.partnerOrder)) soi(x, ma + '.partnerOrder');
    for (const c of mang(u.children)) soi(c && c.personId, ma + '.children');
    if (u.ranks && typeof u.ranks === 'object') {
      for (const k of Object.keys(u.ranks)) soi(k, ma + '.ranks');
    }
  }
  for (const m of mang(cay && cay.media)) {
    const s = chu(m && m.subjectId);
    if (s && !coNguoi.has(s) && !coCap.has(s)) {
      lac.push(chu(m.id) + '.subjectId→' + s);
    }
  }
  const goc = chu(cay && cay.tree && cay.tree.rootPersonId);
  if (goc && !coNguoi.has(goc)) lac.push('tree.rootPersonId→' + goc);

  return lac;
}

function tachDong(text) {
  const s = typeof text === 'string' ? text : '';
  return s.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
}

function docCayGedcom(dong) {
  const goc = [];
  const hong = [];
  const ngan = [];

  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];
    if (d.trim() === '') continue;

    const m = d.match(/^\s*(\d+)\s+(?:@([^@]*)@\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\s([\s\S]*))?$/);
    if (!m) { hong.push({ so: i + 1, chu: d }); continue; }

    const cap = Number(m[1]);
    const the = m[3].toUpperCase();
    const giaTri = m[4] === undefined ? '' : m[4];

    if (the === 'CONC' || the === 'CONT') {
      const cha = ngan[cap - 1];
      if (!cha) { hong.push({ so: i + 1, chu: d }); continue; }
      cha.giaTri += (the === 'CONT' ? '\n' : '') + giaTri;
      continue;
    }

    const nut = {
      xref: m[2] ? m[2].trim() : '',
      the,
      giaTri,
      con: [],
      dung: false,
      ma: '',
    };

    if (cap === 0) {
      goc.push(nut);
      ngan.length = 0;
      ngan[0] = nut;
      continue;
    }
    const cha = ngan[cap - 1];
    if (!cha) { hong.push({ so: i + 1, chu: d }); continue; }
    cha.con.push(nut);
    ngan.length = cap;
    ngan[cap] = nut;
  }
  return { goc, hong };
}

function dungBangMa(banGhi) {
  const nhom = { INDI: 'P', FAM: 'U', SOUR: 'S' };
  const bang = new Map();
  const daDung = new Set();
  const doiMa = [];

  for (const r of banGhi) {
    const tt = nhom[r.the];
    if (!tt || !r.xref) continue;
    const ma = r.xref.trim().toUpperCase();
    if (isValidId(ma) && loaiCua(ma) === tt && !daDung.has(ma)) {
      daDung.add(ma);
      r.ma = ma;
      bang.set(r.xref, ma);
    }
  }

  const dem = { P: 0, U: 0, S: 0 };
  for (const r of banGhi) {
    const tt = nhom[r.the];
    if (!tt || r.ma) continue;
    let ma;
    do {
      dem[tt]++;
      ma = tt + String(dem[tt]).padStart(4, '0');
    } while (daDung.has(ma));
    daDung.add(ma);
    r.ma = ma;
    if (r.xref) {
      bang.set(r.xref, ma);
      doiMa.push([r.xref, ma]);
    } else {
      doiMa.push(['(bản ghi không có mã)', ma]);
    }
  }
  return { bang, doiMa };
}

function docNguoi(r, gom) {
  const p = {
    id: r.ma,
    uid: '',
    xrefGoc: chu(r.xref),
    names: [],
    sex: 'U',
    birth: khoiNgayRong(),
    death: khoiNgayRong(),
    burialPlace: '',
    title: '',
    occupation: '',
    education: '',
    religion: '',
    residence: '',
    nationality: '',
    contact: '',
    living: true,
    photoFileId: '',
    note: '',
    deleted: false,
    meta: { createdAt: '', updatedAt: '', updatedBy: '' },
  };
  const vn = {};
  let coChet = false;

  for (const n of r.con) {
    switch (n.the) {
      case 'NAME': {
        n.dung = true;
        const t = docTen(n, p.names.length === 0);
        if (t) p.names.push(t);
        break;
      }
      case 'SEX': {
        n.dung = true;
        const v = giaTriChu(n).toUpperCase();
        p.sex = (v === 'M' || v === 'F') ? v : 'U';
        break;
      }
      case 'UID':
      case '_UID': {
        n.dung = true;
        if (!p.uid) p.uid = chuanUid(giaTriChu(n));
        break;
      }
      case 'BIRT': n.dung = true; p.birth = docSuKien(n); break;
      case 'DEAT': n.dung = true; coChet = true; p.death = docSuKien(n); break;
      case 'BURI': n.dung = true; p.burialPlace = docNoiChon(n); break;
      case 'RESI': n.dung = true; p.residence = docNoiChon(n) || giaTriChu(n); break;
      case 'TITL': n.dung = true; p.title = giaTriChu(n); break;
      case 'OCCU': n.dung = true; p.occupation = giaTriChu(n); break;
      case 'EDUC': n.dung = true; p.education = giaTriChu(n); break;
      case 'RELI': n.dung = true; p.religion = giaTriChu(n); break;
      case 'NATI': n.dung = true; p.nationality = giaTriChu(n); break;
      case '_LIENHE': n.dung = true; p.contact = giaTriChu(n); break;
      case 'NOTE': n.dung = true; p.note = gopChu(p.note, giaTriChu(n)); break;
      case '_DOI': {
        n.dung = true;
        const s = Number(giaTriChu(n));
        if (Number.isInteger(s) && s > 0) vn.generation = s;
        break;
      }
      case '_CHI': n.dung = true; if (giaTriChu(n)) vn.branch = giaTriChu(n); break;
      case '_GIO': n.dung = true; if (giaTriChu(n)) vn.gio = giaTriChu(n); break;
      case 'RESN':
        n.dung = true;
        if (giaTriChu(n).toLowerCase() === 'privacy') gom.soAn++;
        break;
      case 'OBJE':
        n.dung = true;
        gom.anh.push(docAnh(n, p.id));
        break;
      case 'FAMS':
        n.dung = true;
        gom.fams.push({ personId: p.id, capXref: troToi(n) });
        break;
      case 'FAMC': {
        n.dung = true;
        const cQh = conThe(n, '_QUANHE');
        const cPedi = conThe(n, 'PEDI');
        if (cQh) cQh.dung = true;
        if (cPedi) cPedi.dung = true;
        const ma = (cQh ? giaTriChu(cQh) : '') ||
                   (cPedi ? giaTriChu(cPedi).toLowerCase() : '');
        gom.famc.push({ personId: p.id, capXref: troToi(n), relation: ma });
        break;
      }
      case 'ADOP': {
        const cFamc = conThe(n, 'FAMC');
        if (!cFamc) break;
        n.dung = true;
        cFamc.dung = true;
        gom.famc.push({
          personId: p.id, capXref: troToi(cFamc), relation: 'adopted',
        });
        const cAi = conThe(cFamc, 'ADOP');
        if (cAi && giaTriChu(cAi).toUpperCase() === 'BOTH') cAi.dung = true;
        break;
      }
      default: break;
    }
  }

  if (p.names.length === 0) {
    p.names.push({ type: 'chinh', surname: '', middle: '', given: '' });
  }
  if (coChet) p.living = false;
  if (Object.keys(vn).length > 0) p.vn = vn;
  return p;
}

function docTen(n, laDau) {
  const cSurn = conThe(n, 'SURN');
  const cGivn = conThe(n, 'GIVN');
  const cType = conThe(n, 'TYPE');
  if (cSurn) cSurn.dung = true;
  if (cGivn) cGivn.dung = true;
  if (cType) cType.dung = true;

  let ho = cSurn ? giaTriChu(cSurn) : '';
  let truoc = cGivn ? giaTriChu(cGivn) : '';

  if (!cSurn || !cGivn) {
    const tho = giaTriChu(n);
    const m = tho.match(/^([^/]*)\/([^/]*)\/([\s\S]*)$/);
    if (m) {
      if (!cGivn) truoc = (m[1].trim() + ' ' + m[3].trim()).trim();
      if (!cSurn) ho = m[2].trim();
    } else if (!cGivn) {
      truoc = tho;
    }
  }

  ho = ho.replace(/\s+/g, ' ').trim();
  truoc = truoc.replace(/\s+/g, ' ').trim();

  const loai = laDau
    ? 'chinh'
    : ((cType ? giaTriChu(cType) : '') || 'khac');

  if (ho === '' && truoc === '') {
    return laDau ? { type: 'chinh', surname: '', middle: '', given: '' } : null;
  }

  const manh = truoc === '' ? [] : truoc.split(' ');
  const rieng = manh.length > 0 ? manh[manh.length - 1] : '';
  const dem = manh.slice(0, -1).join(' ');
  return { type: loai, surname: ho, middle: dem, given: rieng };
}

function docSuKien(n) {
  const k = khoiNgayRong();

  const cDate = conThe(n, 'DATE');
  if (cDate) {
    cDate.dung = true;
    const d = docNgayGedcom(giaTriChu(cDate));
    k.iso = d.iso;
    k.raw = d.raw;
  }
  const cPlac = conThe(n, 'PLAC');
  if (cPlac) { cPlac.dung = true; k.place = giaTriChu(cPlac); }

  for (const c of moiCon(n, 'NOTE')) {
    const v = giaTriChu(c);
    const m = v.match(/^Nguyên văn:\s*([\s\S]+)$/);
    if (m) { c.dung = true; k.raw = m[1].trim(); }
  }
  return k;
}

function docNoiChon(n) {
  const cPlac = conThe(n, 'PLAC');
  if (!cPlac) return '';
  cPlac.dung = true;
  return giaTriChu(cPlac);
}

function docAnh(n, chuThe) {
  const cFile = conThe(n, 'FILE');
  const cTitl = conThe(n, 'TITL') || (cFile ? conThe(cFile, 'TITL') : null);
  const cForm = conThe(n, 'FORM') || (cFile ? conThe(cFile, 'FORM') : null);
  if (cFile) cFile.dung = true;
  if (cTitl) cTitl.dung = true;
  if (cForm) cForm.dung = true;
  return {
    chuThe,
    duongDan: cFile ? giaTriChu(cFile) : '',
    caption: cTitl ? giaTriChu(cTitl) : '',
  };
}

function docCap(r, gom) {
  const tho = {
    id: r.ma,
    uid: '',
    xrefGoc: chu(r.xref),
    banDoiXref: [],
    conXref: [],
    status: '',
    marriage: khoiNgayRong(),
    note: '',
    rank: 0,
    ranksTho: {},
  };
  let coLyHon = false;

  for (const n of r.con) {
    switch (n.the) {
      case 'HUSB':
      case 'WIFE':
      case '_BANDOI': {
        n.dung = true;
        const x = troToi(n);
        tho.banDoiXref.push(x);
        const cRank = conThe(n, '_RANK');
        if (cRank) {
          cRank.dung = true;
          const s2 = Number(giaTriChu(cRank));
          if (Number.isInteger(s2) && s2 > 1 && x) tho.ranksTho[x] = s2;
        }
        break;
      }
      case 'CHIL':
        n.dung = true;
        tho.conXref.push(troToi(n));
        break;
      case 'UID':
      case '_UID': {
        n.dung = true;
        if (!tho.uid) tho.uid = chuanUid(giaTriChu(n));
        break;
      }
      case 'MARR': {
        n.dung = true;
        tho.marriage = docSuKien(n);
        const cType = conThe(n, 'TYPE');
        if (cType && giaTriChu(cType).toLowerCase() === 'marriage') cType.dung = true;
        break;
      }
      case 'DIV': n.dung = true; coLyHon = true; break;
      case '_TRANGTHAI': n.dung = true; tho.status = giaTriChu(n); break;
      case '_MSTAT': {
        const v = giaTriChu(n).toLowerCase().trim();
        if (v === 'current') { n.dung = true; if (tho.status === '') tho.status = 'married'; }
        else if (v === 'former' || v === 'divorced') {
          n.dung = true;
          if (tho.status === '') tho.status = 'divorced';
        }
        break;
      }
      case '_RANK': {
        n.dung = true;
        const s = Number(giaTriChu(n));
        if (Number.isInteger(s) && s > 0) tho.rank = s;
        break;
      }
      case 'NOTE': n.dung = true; tho.note = gopChu(tho.note, giaTriChu(n)); break;
      case 'RESN': n.dung = true; break;
      default: break;
    }
  }

  if (tho.status === '' && coLyHon) tho.status = 'divorced';
  if (tho.status === '') tho.status = 'married';
  return tho;
}

function docNguon(r) {
  const s = { id: r.ma, title: '', author: '', note: '' };
  for (const n of r.con) {
    switch (n.the) {
      case 'TITL': n.dung = true; s.title = giaTriChu(n); break;
      case 'AUTH': n.dung = true; s.author = giaTriChu(n); break;
      case 'NOTE': n.dung = true; s.note = gopChu(s.note, giaTriChu(n)); break;
      default: break;
    }
  }
  return s;
}

function noiCapVaNguoi(thoCap, bang, coNguoi, gom) {
  const canhBao = [];
  const theoMa = new Map(thoCap.map((c) => [c.id, c]));

  const doi = (xref) => {
    const ma = bang.get(xref);
    return ma || (isValidId(String(xref).toUpperCase()) ? String(xref).toUpperCase() : '');
  };

  let hutTro = 0;
  let lechFamc = 0;
  let lechFams = 0;

  const quanHe = new Map();
  for (const f of gom.famc) {
    const uid = doi(f.capXref);
    if (!uid || !theoMa.has(uid)) { hutTro++; continue; }
    const khoa = uid + '|' + f.personId;
    if (chu(f.relation) === '' && quanHe.has(khoa)) continue;
    if (quanHe.has(khoa) && chu(quanHe.get(khoa)) !== '') continue;
    quanHe.set(khoa, f.relation);
  }

  const unions = [];
  for (const c of thoCap) {
    const banDoi = [];
    for (const x of c.banDoiXref) {
      const id = doi(x);
      if (!id || !coNguoi.has(id)) { hutTro++; continue; }
      if (banDoi.indexOf(id) === -1) banDoi.push(id);
    }

    const con = [];
    const daCo = new Set();
    for (const x of c.conXref) {
      const id = doi(x);
      if (!id || !coNguoi.has(id)) { hutTro++; continue; }
      if (daCo.has(id)) continue;
      daCo.add(id);
      con.push({ personId: id, relation: '', order: con.length + 1 });
    }

    for (const f of gom.famc) {
      const uid = doi(f.capXref);
      if (uid !== c.id) continue;
      if (!coNguoi.has(f.personId) || daCo.has(f.personId)) continue;
      daCo.add(f.personId);
      con.push({ personId: f.personId, relation: '', order: con.length + 1 });
      lechFamc++;
    }

    for (const k of con) {
      const ma = quanHe.get(c.id + '|' + k.personId) || '';
      k.relation = QUAN_HE_NHAP.indexOf(ma) >= 0 ? ma : 'birth';
    }

    const u = {
      id: c.id,
      uid: chu(c.uid),
      xrefGoc: chu(c.xrefGoc),
      partners: banDoi,
      partnerOrder: banDoi.slice(),
      status: c.status,
      marriage: c.marriage,
      children: con,
      note: c.note,
      deleted: false,
    };
    const ranks = {};
    for (const x of Object.keys(c.ranksTho)) {
      const id = doi(x);
      if (id && banDoi.indexOf(id) >= 0) ranks[id] = c.ranksTho[x];
    }
    if (Object.keys(ranks).length > 0) u.ranks = ranks;
    else if (c.rank > 0) u.rank = c.rank;
    unions.push(u);
  }

  const theoUnion = new Map(unions.map((u) => [u.id, u]));
  for (const f of gom.fams) {
    const uid = doi(f.capXref);
    const u = theoUnion.get(uid);
    if (!u) { hutTro++; continue; }
    if (!coNguoi.has(f.personId) || u.partners.indexOf(f.personId) >= 0) continue;
    u.partners.push(f.personId);
    u.partnerOrder.push(f.personId);
    lechFams++;
  }

  const giu = unions.filter((u) => u.partners.length > 0 || u.children.length > 0);
  const boBot = unions.length - giu.length;

  if (hutTro > 0) {
    canhBao.push({
      muc: 'nang',
      chu: hutTro + ' con trỏ trỏ vào bản ghi không có trong file, đã bỏ. ' +
           'File gốc thiếu người hoặc thiếu gia đình.',
    });
  }
  if (lechFamc > 0 || lechFams > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: (lechFamc + lechFams) + ' mối quan hệ chỉ được ghi ở MỘT phía của ' +
           'file (bản ghi người có, bản ghi gia đình không). Đã nhận, và xếp ' +
           'người ấy vào cuối.',
    });
  }
  if (boBot > 0) {
    canhBao.push({
      muc: 'nhe',
      chu: boBot + ' gia đình rỗng — không còn vợ chồng lẫn con — đã bỏ.',
    });
  }
  return { unions: giu, canhBao };
}

function docNgayGedcom(v) {
  const s = String(v || '').replace(/^@#[^@]*@\s*/, '').trim();
  if (s === '') return { iso: '', raw: '' };

  const ngoac = s.match(/^\(([\s\S]*)\)$/);
  if (ngoac) return { iso: '', raw: ngoac[1].trim() };

  const don = ngayDonGedcom(s);
  if (don) return { iso: don, raw: '' };

  let m = s.match(/^(?:BET|BETWEEN)\s+([\s\S]+?)\s+AND\s+([\s\S]+)$/i);
  if (m) return khoangNgay('giữa', 'và', m[1], m[2]);
  m = s.match(/^FROM\s+([\s\S]+?)\s+TO\s+([\s\S]+)$/i);
  if (m) return khoangNgay('từ', 'đến', m[1], m[2]);
  m = s.match(/^FROM\s+([\s\S]+)$/i);
  if (m) return motDauNgay('từ', m[1]);
  m = s.match(/^TO\s+([\s\S]+)$/i);
  if (m) return motDauNgay('đến', m[1]);
  m = s.match(/^(ABT|ABOUT|EST|CAL|BEF|BEFORE|AFT|AFTER|INT)\s+([\s\S]+)$/i);
  if (m) return motDauNgay(TIEN_TO_NGAY[m[1].toUpperCase()] || '', m[2]);

  return { iso: '', raw: s };
}

function motDauNgay(chu, phan) {
  const t = String(phan).trim();
  const iso = ngayDonGedcom(t);
  const doc = iso ? formatDate({ iso, raw: '' }) : t;
  return { iso: iso || '', raw: (chu ? chu + ' ' : '') + doc };
}

function khoangNgay(truoc, giua, x, y) {
  const tx = String(x).trim();
  const ty = String(y).trim();
  const ix = ngayDonGedcom(tx);
  const iy = ngayDonGedcom(ty);
  return {
    iso: ix || iy || '',
    raw: truoc + ' ' + (ix ? formatDate({ iso: ix, raw: '' }) : tx) +
         ' ' + giua + ' ' + (iy ? formatDate({ iso: iy, raw: '' }) : ty),
  };
}

function ngayDonGedcom(s) {
  const t = String(s || '').trim().toUpperCase();
  let m = t.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
  if (m && THANG_SO[m[2]]) return ghepIsoGedcom(m[3], THANG_SO[m[2]], Number(m[1]));
  m = t.match(/^([A-Z]{3})\s+(\d{3,4})$/);
  if (m && THANG_SO[m[1]]) return ghepIsoGedcom(m[2], THANG_SO[m[1]], 0);
  m = t.match(/^(\d{3,4})$/);
  if (m) return ghepIsoGedcom(m[1], 0, 0);
  return '';
}

function ghepIsoGedcom(nam, thang, ngay) {
  const hai = (n) => String(n).padStart(2, '0');
  const n = String(Number(nam)).padStart(4, '0');
  if (!thang) return n;
  if (!ngay) return n + '-' + hai(thang);
  return n + '-' + hai(thang) + '-' + hai(ngay);
}

function quetTheLa(nut, dem) {
  for (const c of nut.con) {
    if (!c.dung) themDem(dem, c.the);
    quetTheLa(c, dem);
  }
}

function themDem(dem, the) {
  dem.set(the, (dem.get(the) || 0) + 1);
}

function keTheLa(theLa) {
  const dau = theLa.slice(0, 5).map((x) => x.the + ' (' + x.so + ')');
  return dau.join(', ') + (theLa.length > 5 ? ', và ' + (theLa.length - 5) + ' loại nữa' : '');
}

function tenCayTuFile(head, subm) {
  if (subm) {
    const c = conThe(subm, 'NAME');
    if (c) { c.dung = true; const v = giaTriChu(c); if (v) return v; }
  }
  if (head) {
    const c = conThe(head, 'NOTE');
    if (c) {
      c.dung = true;
      const dong1 = giaTriChu(c).split('\n')[0].trim();
      if (dong1 && !/^Xuất lúc /.test(dong1)) return dong1;
    }
  }
  return '';
}

function maNguonTuHead(head) {
  if (!head) return '';
  const c = conThe(head, 'SOUR');
  return c ? giaTriChu(c).trim().toUpperCase() : '';
}

function nguonTuHead(head) {
  if (!head) return '';
  const c = conThe(head, 'SOUR');
  if (!c) return '';
  c.dung = true;
  const cName = conThe(c, 'NAME');
  if (cName) cName.dung = true;
  return (cName ? giaTriChu(cName) : '') || giaTriChu(c);
}

function conThe(nut, the) {
  if (!nut) return null;
  for (const c of nut.con) if (c.the === the) return c;
  return null;
}

function moiCon(nut, the) {
  if (!nut) return [];
  return nut.con.filter((c) => c.the === the);
}

function troToi(nut) {
  const v = nut && typeof nut.giaTri === 'string' ? nut.giaTri.trim() : '';
  const m = v.match(/^@([^@]+)@$/);
  return m ? m[1].trim() : '';
}

function giaTriChu(nut) {
  const v = nut && typeof nut.giaTri === 'string' ? nut.giaTri : '';
  if (/^@[^@]+@$/.test(v.trim())) return v.trim();
  return v.replace(/@@/g, '@').trim();
}

function gopChu(cu, moi) {
  if (moi === '') return cu;
  return cu === '' ? moi : cu + '\n' + moi;
}

function khoiNgayRong() {
  return { iso: '', raw: '', place: '' };
}

function catNgan(s, n) {
  const t = String(s || '');
  return t.length <= n ? t : t.slice(0, n) + '…';
}

function veHead(ds, cay, luc, tenFile, soAn, soNguoi, soCap) {
  const t = cay.tree && typeof cay.tree === 'object' ? cay.tree : {};

  ds.push('0 HEAD');
  ds.push('1 SOUR GIAPHA');
  themDong(ds, 2, 'NAME', 'Gia phả — web app gia phả của dòng họ');
  themDong(ds, 2, 'VERS', '1.0.0');
  ds.push('1 DEST ANY');
  themDong(ds, 1, 'DATE', ngayHead(luc));
  themDong(ds, 2, 'TIME', gioHead(luc));
  ds.push('1 SUBM @SUB1@');
  themDong(ds, 1, 'FILE', tenFile);
  ds.push('1 GEDC');
  ds.push('2 VERS 5.5.1');
  ds.push('2 FORM LINEAGE-LINKED');
  ds.push('1 CHAR UTF-8');
  ds.push('1 LANG Vietnamese');

  const cau = [];
  if (coGiaTri(t.name)) cau.push(String(t.name).trim());
  cau.push('Xuất lúc ' + ngayGioViet(luc) + '. ' +
           soNguoi + ' người, ' + soCap + ' gia đình.');
  if (soAn > 0) {
    cau.push('Đã ẩn chi tiết của ' + soAn + ' người còn sống — giữ tên và ' +
             'mối nối gia đình, bỏ ngày tháng, nơi chốn, ghi chú, ảnh. ' +
             'Họ mang thẻ RESN privacy.');
  }
  if (coGiaTri(t.note)) cau.push(String(t.note).trim());
  themDong(ds, 1, 'NOTE', cau.join('\n'));

  ds.push('0 @SUB1@ SUBM');
  themDong(ds, 1, 'NAME', coGiaTri(t.name) ? t.name : 'Gia phả');
}

function veUid(ds, banGhi) {
  const uid = chu(banGhi && banGhi.uid);
  if (uid) ds.push('1 _UID ' + uid);
}

function veNguoi(ds, p, giauChiTiet, dsLamVo, dsLamCon, anhTheoChu) {
  ds.push('0 @' + p.id + '@ INDI');
  veUid(ds, p);

  const ten = Array.isArray(p.names) ? p.names : [];
  const chinh = ten.find((n) => n && n.type === 'chinh') || ten[0] || null;
  veTen(ds, chinh, true);
  if (!giauChiTiet) {
    for (const n of ten) {
      if (n === chinh || !n) continue;
      veTen(ds, n, false);
    }
  }

  if (p.sex === 'M' || p.sex === 'F' || p.sex === 'U') {
    ds.push('1 SEX ' + p.sex);
  }

  if (giauChiTiet) {
    ds.push('1 RESN privacy');
  } else {
    veSuKien(ds, 'BIRT', p.birth);
    veChet(ds, p);
    veNoiChon(ds, 'BURI', p.burialPlace);

    themDong(ds, 1, 'TITL', p.title);
    themDong(ds, 1, 'OCCU', p.occupation);
    themDong(ds, 1, 'EDUC', p.education);
    themDong(ds, 1, 'RELI', p.religion);
    veNoiChon(ds, 'RESI', p.residence);
    themDong(ds, 1, 'NATI', p.nationality);
    themDong(ds, 1, '_LIENHE', p.contact);
    themDong(ds, 1, 'NOTE', p.note);

    const vn = p.vn && typeof p.vn === 'object' ? p.vn : {};
    if (Number.isInteger(vn.generation) && vn.generation > 0) {
      themDong(ds, 1, '_DOI', String(vn.generation));
    }
    themDong(ds, 1, '_CHI', vn.branch);
    themDong(ds, 1, '_GIO', vn.gio);

    for (const m of anhTheoChu.get(p.id) || []) veAnh(ds, m);
  }

  for (const uid of dsLamVo || []) ds.push('1 FAMS @' + uid + '@');
  for (const k of dsLamCon || []) {
    ds.push('1 FAMC @' + k.unionId + '@');
    const ma = String(k.relation || '').trim();
    if (PEDI_CHUAN[ma]) ds.push('2 PEDI ' + PEDI_CHUAN[ma]);
    themDong(ds, 2, '_QUANHE', ma);
  }
}

function veCap(ds, c, theoMa, boAn, anhTheoChu) {
  const u = c.goc;
  ds.push('0 @' + u.id + '@ FAM');
  veUid(ds, u);

  const vaiTro = chiaVaiTro(c.banDoi, u.partnerOrder, theoMa);
  const bacRieng = ranksRoRang(u);
  if (vaiTro.husb) veBanDoi(ds, 'HUSB', vaiTro.husb, bacRieng);
  if (vaiTro.wife) veBanDoi(ds, 'WIFE', vaiTro.wife, bacRieng);
  for (const id of vaiTro.thua) veBanDoi(ds, '_BANDOI', id, bacRieng);

  const con = c.con.slice().sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  for (const k of con) ds.push('1 CHIL @' + k.personId + '@');

  const anCap = c.banDoi.some((id) => boAn.has(id));
  if (anCap) {
    if (coGiaTri(u.note) || coNgay(u.marriage)) ds.push('1 RESN privacy');
  } else {
    veSuKien(ds, 'MARR', u.marriage);
    themDong(ds, 1, 'NOTE', u.note);
    for (const m of anhTheoChu.get(u.id) || []) veAnh(ds, m);
  }

  const tt = String(u.status || '').trim();
  if (tt === 'divorced') ds.push('1 DIV Y');
  if (tt !== '' && tt !== 'married') themDong(ds, 1, '_TRANGTHAI', tt);

  if (Object.keys(bacRieng).length === 0 &&
      Number.isInteger(u.rank) && u.rank > 0) {
    themDong(ds, 1, '_RANK', String(u.rank));
  }
}

function veBanDoi(ds, the, personId, bacRieng) {
  ds.push('1 ' + the + ' @' + personId + '@');
  const n = bacRieng[personId];
  if (Number.isInteger(n) && n > 1) ds.push('2 _RANK ' + n);
}

function veNguon(ds, s) {
  if (!s || !s.id) return;
  ds.push('0 @' + s.id + '@ SOUR');
  themDong(ds, 1, 'TITL', s.title);
  themDong(ds, 1, 'AUTH', s.author);
  themDong(ds, 1, 'NOTE', s.note);
}

function veTen(ds, n, laChinh) {
  if (!n) return;
  const ho = chu(n.surname);
  const dem = chu(n.middle);
  const rieng = chu(n.given);
  if (ho === '' && dem === '' && rieng === '') return;

  const truoc = [dem, rieng].filter((x) => x !== '').join(' ');
  themDong(ds, 1, 'NAME', (truoc === '' ? '' : truoc + ' ') + '/' + ho + '/');
  if (!laChinh) themDong(ds, 2, 'TYPE', n.type);
  themDong(ds, 2, 'GIVN', truoc);
  themDong(ds, 2, 'SURN', ho);
}

function veSuKien(ds, the, khoi) {
  const ngay = ngayGedcom(khoi);
  const noi = khoi && typeof khoi === 'object' ? chu(khoi.place) : '';
  const them = rawNoiThem(khoi);
  if (ngay === '' && noi === '' && them === '') return;

  ds.push('1 ' + the);
  themDong(ds, 2, 'DATE', ngay);
  themDong(ds, 2, 'PLAC', noi);
  if (them !== '') themDong(ds, 2, 'NOTE', 'Nguyên văn: ' + them);
}

function veChet(ds, p) {
  const truoc = ds.length;
  veSuKien(ds, 'DEAT', p.death);
  if (ds.length > truoc) return;
  if (p.living === false) ds.push('1 DEAT Y');
}

function veNoiChon(ds, the, noi) {
  const c = chu(noi);
  if (c === '') return;
  ds.push('1 ' + the);
  themDong(ds, 2, 'PLAC', c);
}

function veAnh(ds, m) {
  ds.push('1 OBJE');
  themDong(ds, 2, 'FILE', 'https://drive.google.com/uc?id=' + chu(m.driveFileId));
  themDong(ds, 3, 'FORM', 'jpg');
  themDong(ds, 3, 'TITL', m.caption);
}

function themDong(ds, cap, the, giaTri) {
  const chuoi = lamSach(giaTri);
  if (chuoi === '') return;

  const doan = chuoi.split('\n');
  for (let i = 0; i < doan.length; i++) {
    const manh = chiaDai(doan[i]);
    for (let j = 0; j < manh.length; j++) {
      if (i === 0 && j === 0) ds.push(cap + ' ' + the + ' ' + manh[j]);
      else if (j === 0) ds.push((cap + 1) + ' CONT ' + manh[j]);
      else ds.push((cap + 1) + ' CONC ' + manh[j]);
    }
    if (manh.length === 0) ds.push((cap + 1) + ' CONT');
  }
}

function chiaDai(s) {
  if (s.length <= DAI_TOI_DA) return s === '' ? [] : [s];
  const ra = [];
  let i = 0;
  while (i < s.length) {
    let n = Math.min(DAI_TOI_DA, s.length - i);
    if (i + n < s.length) {
      const ma = s.charCodeAt(i + n - 1);
      if (ma >= 0xD800 && ma <= 0xDBFF) n--;
      while (n > 1 && (s.charAt(i + n - 1) === ' ' || s.charAt(i + n) === ' ')) n--;
    }
    ra.push(s.slice(i, i + n));
    i += n;
  }
  return ra;
}

function lamSach(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/@/g, '@@')
    .trim();
}

function ngayGedcom(khoi) {
  if (!khoi || typeof khoi !== 'object') return '';
  const iso = chu(khoi.iso);
  const m = iso.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (m) {
    const nam = m[1];
    if (!m[2]) return nam;
    const t = THANG_GED[Number(m[2]) - 1];
    if (!t) return nam;
    if (!m[3]) return t + ' ' + nam;
    return Number(m[3]) + ' ' + t + ' ' + nam;
  }
  const raw = chu(khoi.raw);
  if (raw !== '') return '(' + raw.replace(/[()]/g, ' ').trim() + ')';
  return '';
}

function rawNoiThem(khoi) {
  if (!khoi || typeof khoi !== 'object') return '';
  const raw = chu(khoi.raw);
  const iso = chu(khoi.iso);
  if (raw === '' || iso === '') return '';
  const doc = parseLooseDate(raw);
  if (doc.iso === iso && doc.confident) return '';
  return raw;
}

function coNgay(khoi) {
  return ngayGedcom(khoi) !== '';
}

function ngayHead(t) {
  return t.getDate() + ' ' + THANG_GED[t.getMonth()] + ' ' + t.getFullYear();
}

function gioHead(t) {
  const so = (n) => String(n).padStart(2, '0');
  return so(t.getHours()) + ':' + so(t.getMinutes()) + ':' + so(t.getSeconds());
}

function ngayGioViet(t) {
  const so = (n) => String(n).padStart(2, '0');
  return so(t.getDate()) + '/' + so(t.getMonth() + 1) + '/' + t.getFullYear() +
         ' ' + so(t.getHours()) + ':' + so(t.getMinutes());
}

function chiaVaiTro(banDoi, partnerOrder, theoMa) {
  const ds = xepTheoThuTu(banDoi, partnerOrder);
  const gioi = (id) => {
    const p = theoMa.get(id);
    return p && (p.sex === 'M' || p.sex === 'F') ? p.sex : 'U';
  };

  const nam = ds.filter((id) => gioi(id) === 'M');
  const nu = ds.filter((id) => gioi(id) === 'F');

  let husb = null;
  let wife = null;
  const thua = [];

  const cungGioi = (nam.length > 1 && nu.length === 0) ||
                   (nu.length > 1 && nam.length === 0);
  if (cungGioi) {
    husb = ds[0] || null;
    wife = ds[1] || null;
  } else {
    husb = nam[0] || null;
    wife = nu[0] || null;
  }

  for (const id of ds) {
    if (id === husb || id === wife) continue;
    if (!husb) husb = id;
    else if (!wife) wife = id;
    else thua.push(id);
  }
  return { husb, wife, thua };
}

function xepTheoThuTu(banDoi, partnerOrder) {
  const con = new Set(banDoi);
  const ra = [];
  for (const id of Array.isArray(partnerOrder) ? partnerOrder : []) {
    if (con.has(id)) { ra.push(id); con.delete(id); }
  }
  for (const id of banDoi) if (con.has(id)) { ra.push(id); con.delete(id); }
  return ra;
}

function gomAnh(media, coNguoi, coCap) {
  const ra = new Map();
  for (const m of media) {
    if (!m || m.deleted || !coGiaTri(m.driveFileId)) continue;
    const chuThe = m.subjectId;
    if (!coNguoi.has(chuThe) && !coCap.has(chuThe)) continue;
    themVaoMang(ra, chuThe, m);
  }
  return ra;
}

function daAn(p) {
  return p.living === true;
}

function themVaoMang(bang, khoa, giaTri) {
  const cu = bang.get(khoa);
  if (cu) cu.push(giaTri);
  else bang.set(khoa, [giaTri]);
}

function chu(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export function boDauChoTenFile(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
