import { fullName } from '../../utils/text.js';
import { formatDate } from '../../utils/date.js';
import { nhanQuanHeCon, nhanTrangThaiCap } from '../../config.js';

const TEN_SHEET_PHANG = 'BangPhang';
const TEN_SHEET_NGUOI = 'Nguoi';
const TEN_SHEET_GIADINH = 'GiaDinh';

const THU_TU_QUAN_HE = ['birth', 'adopted', 'step', 'foster', 'thua_tu'];
const CHA_ME = {
  birth: ['cha', 'mẹ'], adopted: ['cha nuôi', 'mẹ nuôi'], step: ['cha dượng', 'mẹ kế'],
  foster: ['cha nuôi dưỡng', 'mẹ nuôi dưỡng'], thua_tu: ['cha thừa tự', 'mẹ thừa tự'],
};

function loaiCua(relation) { return THU_TU_QUAN_HE.includes(relation) ? relation : 'birth'; }
function chuCon(loai) { return loai === 'birth' ? 'con' : nhanQuanHeCon(loai, 'con').toLowerCase(); }

function chuGioiTinh(sex) { return sex === 'M' ? 'Nam' : sex === 'F' ? 'Nữ' : ''; }
function chuTinhTrang(living) { return living === false ? 'Đã mất' : 'Còn sống'; }

function dungNen(persons, unions, doi) {
  const theoId = new Map((persons || []).map((p) => [p.id, p]));
  const song = (id) => theoId.has(id) && !theoId.get(id).deleted;
  const conSong = (persons || []).filter((p) => !p.deleted);
  const unionsSong = (unions || []).filter((u) => u && !u.deleted);

  const chongVo = new Map();
  for (const u of unionsSong) {
    let chong = '', vo = '';
    const cho = [];
    for (const id of u.partners || []) {
      const s = theoId.has(id) ? theoId.get(id).sex : '';
      if (s === 'M' && !chong) chong = id;
      else if (s === 'F' && !vo) vo = id;
      else cho.push(id);
    }
    for (const id of cho) { if (!chong) chong = id; else if (!vo) vo = id; }
    chongVo.set(u.id, { chong, vo });
  }

  const conTheoLoai = (u) => {
    const m = new Map();
    const ds = [...(u.children || [])].filter((c) => c && song(c.personId))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    for (const c of ds) {
      const loai = loaiCua(c.relation || 'birth');
      if (!m.has(loai)) m.set(loai, []);
      m.get(loai).push(c.personId);
    }
    return m;
  };

  const honNhanCua = new Map();
  for (const u of unionsSong) {
    for (const id of u.partners || []) {
      if (!honNhanCua.has(id)) honNhanCua.set(id, []);
      honNhanCua.get(id).push(u);
    }
  }
  for (const [id, ds] of honNhanCua) {
    const khoa = (u) => {
      const kia = (u.partners || []).find((x) => x !== id);
      return [(u.ranks && kia && u.ranks[kia]) || 1, (u.marriage && u.marriage.iso) || '9999', u.id];
    };
    ds.sort((a, b) => {
      const ka = khoa(a), kb = khoa(b);
      return (ka[0] - kb[0]) || (ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0) ||
        (ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0);
    });
  }

  return { theoId, song, conSong, unionsSong, doi: doi || new Map(), chongVo, conTheoLoai, honNhanCua };
}

function demToiDa(dsMap) {
  const max = new Map();
  for (const m of dsMap) for (const [loai, ds] of m) max.set(loai, Math.max(max.get(loai) || 0, ds.length));
  return max;
}

function cotCon(max) {
  const cot = [];
  for (const loai of THU_TU_QUAN_HE) {
    for (let i = 1; i <= (max.get(loai) || 0); i++) cot.push({ loai, i, ten: 'ID ' + chuCon(loai) + ' ' + i });
  }
  return cot;
}

const COT_NGUOI = [
  'ID', 'Đời', 'Tên húy', 'Biệt danh', 'Giới tính', 'Ngày sinh', 'Tình trạng',
  'Nơi sinh', 'Ngày mất', 'Ngày giỗ', 'Mộ tại', 'Chức tước', 'Nghề nghiệp',
  'Học vấn', 'Tôn giáo', 'Nơi ở', 'Dân tộc', 'Liên hệ', 'Thông tin khác',
];

function hangNguoi(p, doi) {
  const bietDanh = (p.names || []).find((n) => n && n.type === 'thuong_goi');
  return [
    p.id, doi.get(p.id) || '', fullName(p), bietDanh ? fullName(bietDanh) : '',
    chuGioiTinh(p.sex), formatDate(p.birth), chuTinhTrang(p.living),
    (p.birth && p.birth.place) || '', formatDate(p.death), (p.vn && p.vn.gio) || '',
    p.burialPlace || '', p.title || '', p.occupation || '', p.education || '',
    p.religion || '', p.residence || '', p.nationality || '', p.contact || '', p.note || '',
  ];
}

export function dungBangPhang(persons, unions, doi) {
  const n = dungNen(persons, unions, doi);

  const chaMeCua = new Map();
  for (const u of n.unionsSong) {
    const { chong, vo } = n.chongVo.get(u.id);
    for (const [loai, ds] of n.conTheoLoai(u)) {
      for (const id of ds) {
        if (!chaMeCua.has(id)) chaMeCua.set(id, new Map());
        const m = chaMeCua.get(id);
        if (!m.has(loai)) m.set(loai, []);
        m.get(loai).push({ cha: chong === id ? '' : chong, me: vo === id ? '' : vo });
      }
    }
  }
  const conCua = new Map();
  for (const p of n.conSong) {
    const m = new Map();
    for (const u of n.honNhanCua.get(p.id) || []) {
      for (const [loai, ds] of n.conTheoLoai(u)) {
        if (!m.has(loai)) m.set(loai, []);
        for (const id of ds) if (!m.get(loai).includes(id)) m.get(loai).push(id);
      }
    }
    conCua.set(p.id, m);
  }

  const maxChaMe = demToiDa(n.conSong.map((p) => chaMeCua.get(p.id) || new Map()));
  const nhomChaMe = [];
  for (const loai of THU_TU_QUAN_HE) {
    const max = maxChaMe.get(loai) || 0;
    for (let i = 1; i <= max; i++) {
      const hau = max > 1 ? ' ' + i : '';
      nhomChaMe.push({ loai, i, cha: 'ID ' + CHA_ME[loai][0] + hau, me: 'ID ' + CHA_ME[loai][1] + hau });
    }
  }
  const soPhoiNgau = Math.max(0, ...n.conSong.map((p) => (n.honNhanCua.get(p.id) || []).length));
  const nhomCon = cotCon(demToiDa(n.conSong.map((p) => conCua.get(p.id))));

  const dau = [...COT_NGUOI];
  for (const g of nhomChaMe) dau.push(g.cha, g.me);
  for (let i = 1; i <= soPhoiNgau; i++) dau.push('ID phối ngẫu ' + i);
  for (const c of nhomCon) dau.push(c.ten);

  const hang = n.conSong.map((p) => {
    const dong = hangNguoi(p, n.doi);
    const cm = chaMeCua.get(p.id) || new Map();
    for (const g of nhomChaMe) {
      const muc = (cm.get(g.loai) || [])[g.i - 1];
      dong.push(muc ? muc.cha : '', muc ? muc.me : '');
    }
    const hn = n.honNhanCua.get(p.id) || [];
    for (let i = 0; i < soPhoiNgau; i++) {
      dong.push(hn[i] ? ((hn[i].partners || []).find((x) => x !== p.id) || '') : '');
    }
    const cc = conCua.get(p.id);
    for (const c of nhomCon) dong.push((cc.get(c.loai) || [])[c.i - 1] || '');
    return dong;
  });

  return [dau, ...hang];
}

export function dungHaiSheet(persons, unions, doi) {
  const n = dungNen(persons, unions, doi);
  const nguoi = [COT_NGUOI, ...n.conSong.map((p) => hangNguoi(p, n.doi))];

  const conMoiCap = new Map(n.unionsSong.map((u) => [u.id, n.conTheoLoai(u)]));
  const nhomCon = cotCon(demToiDa(conMoiCap.values()));
  const thuTu = (u, id) => (id ? (u.ranks && u.ranks[id]) || 1 : '');

  const dau = [
    'ID gia đình', 'ID chồng', 'ID vợ', 'Thứ tự hôn nhân của chồng',
    'Thứ tự hôn nhân của vợ', 'Tình trạng hôn nhân', 'Ngày cưới', 'Ghi chú',
    ...nhomCon.map((c) => c.ten),
  ];
  const hang = n.unionsSong.map((u) => {
    const { chong, vo } = n.chongVo.get(u.id);
    const con = conMoiCap.get(u.id);
    return [
      u.id, chong, vo, thuTu(u, chong), thuTu(u, vo),
      nhanTrangThaiCap(u.status), formatDate(u.marriage), u.note || '',
      ...nhomCon.map((c) => (con.get(c.loai) || [])[c.i - 1] || ''),
    ];
  });

  return { nguoi, giaDinh: [dau, ...hang] };
}

export async function xuatExcelNguoi(persons, unions, tenFile, kieu, doi) {
  let XLSX;
  try {
    XLSX = await import('../../vendor/xlsx.mjs');
  } catch (e) {
    return { ok: false, loi: 'Không nạp được thư viện ghi Excel (js/vendor/xlsx.mjs). ' +
      'Thử tải lại trang. ' + (e && e.message ? e.message : String(e)) };
  }

  let wb;
  try {
    wb = XLSX.utils.book_new();
    if (kieu === 'hai-sheet') {
      const { nguoi, giaDinh } = dungHaiSheet(persons, unions, doi);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nguoi), TEN_SHEET_NGUOI);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(giaDinh), TEN_SHEET_GIADINH);
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dungBangPhang(persons, unions, doi)),
        TEN_SHEET_PHANG);
    }
  } catch (e) {
    return { ok: false, loi: 'Không dựng được file: ' + (e && e.message ? e.message : String(e)) };
  }

  try {
    XLSX.writeFile(wb, tenFile + '.xlsx');
  } catch (e) {
    return { ok: false, loi: 'Không tải file về được: ' + (e && e.message ? e.message : String(e)) };
  }
  return { ok: true };
}
