import {
  docGiaDinhNguoi, layDanhSachGiaPha, dsTaiKhoanHeThong, dsCayCuaTaiKhoan,
} from '../../services/sb.js';
import { rapGiaDinh } from '../../services/hinh-dang.js';
import { buildIndex } from '../../utils/graph.js';
import { getParents, getSpouses, getChildren } from '../../domains/union.js';
import { getAlternateNames } from '../../domains/person.js';
import { fullName, coGiaTri, doiSongNguoi, ngayGio } from '../../utils/text.js';
import { formatDate, calcAge } from '../../utils/date.js';
import { nhanLoaiTenPhu, chuThichQuanHe } from '../../config.js';
import { duongDan } from './trang-chi-tiet.js';
import { moSoDo, cayNho } from './trang-cay.js';
import { datTabQuanTriHeThong } from './khu-quan-tri-he-thong.js';
import { TEN_VAI, td, span, huyHieu, lienKet, nutLink, dongTrong } from './o-bang.js';

const GIOI = { M: 'Nam', F: 'Nữ' };
const SO_COT = 5;

let loiVeGiaPha = null;
export function datLoiVeGiaPha(hash, chu) { loiVeGiaPha = { hash, chu }; }

export async function mountHoSoNguoi(sec, ctx) {
  const $ = (id) => sec.querySelector('#' + id);
  const ma = ctx.thamSo;
  const phien = ctx.phien || {};
  const tuQTHT = ctx.hashQuayVe === 'quan-tri-he-thong';

  const back = $('hsn-back');
  const veBang = ctx.hashQuayVe === 'gia-pha' && loiVeGiaPha;
  back.dataset.back = veBang ? loiVeGiaPha.hash : ctx.hashQuayVe;
  back.textContent = '← ' + (veBang ? loiVeGiaPha.chu : tuQTHT ? 'Sổ tài khoản' : ctx.chuQuayVe);
  if (tuQTHT) datTabQuanTriHeThong('so-tai-khoan');

  $('hsn-ten').textContent = 'Đang mở hồ sơ…';
  $('hsn-phu').textContent = '';
  $('hsn-ma').textContent = ma;
  $('hsn-ca-nhan').innerHTML = '';
  $('hsn-gia-dinh').innerHTML = '';
  $('hsn-cay-dem').textContent = '';
  $('hsn-tk').textContent = '';
  const tb = $('hsn-cay-tbody');
  dongTrong(tb, SO_COT, 'Đang đọc…');

  const hashLuc = window.location.hash;
  const napLai = () => mountHoSoNguoi(sec, ctx);
  const [kq, kqCay] = await Promise.all([docGiaDinhNguoi(ma), layDanhSachGiaPha()]);
  if (window.location.hash !== hashLuc) return;
  if (!kq.ok) {
    $('hsn-ten').textContent = 'Không mở được hồ sơ ' + ma;
    dongTrong(tb, SO_COT, kq.loi || 'Máy chủ không trả lời.', napLai);
    return;
  }

  const hs = rapGiaDinh(kq.dong);
  const p = hs.nguoi;
  $('hsn-ten').textContent = fullName(p) || '(chưa có tên)';
  $('hsn-phu').textContent = [doiSongNguoi(p), p.deleted ? 'Đã xoá khỏi gia phả' : '']
    .filter(Boolean).join(' · ');
  veCaNhan($('hsn-ca-nhan'), p);
  veGiaDinh($('hsn-gia-dinh'), hs, ma, ctx.hashQuayVe);

  const tk = await timTaiKhoanGan(ma, phien);
  if (window.location.hash !== hashLuc) return;
  veTaiKhoan($('hsn-tk'), tk);
  veBangCay(sec, hs.cacCay, kqCay, tk, phien, napLai);
}

function veCaNhan(ul, p) {
  const tenKhac = getAlternateNames(p)
    .map((n) => n.ten + (coGiaTri(n.loai) ? ' (' + nhanLoaiTenPhu(n.loai) + ')' : ''))
    .join(' · ');
  const tuoi = tuoiTho(p);
  const hang = [
    ['Tên khác', tenKhac],
    ['Giới tính', GIOI[p.sex] || ''],
    ['Sinh', ghepNgayNoi(p.birth)],
    ['Mất', ghepNgayNoi(p.death)],
    ['An táng', p.burialPlace],
    ['Ngày giỗ', ngayGio(p)],
    [tuoi.nhan, tuoi.giaTri],
    ['Chức tước', p.title],
    ['Nghề nghiệp', p.occupation],
    ['Học vấn', p.education],
    ['Quê quán', p.residence],
    ['Dân tộc', p.nationality],
    ['Tôn giáo', p.religion],
    ['Chi / nhánh', p.vn && p.vn.branch],
    ['Ghi chú', p.note],
  ].filter(([, v]) => coGiaTri(v));

  if (!hang.length) { ul.append(liMo('Chưa điền thông tin nào ngoài họ tên.')); return; }
  for (const [nhan, giaTri] of hang) {
    const li = document.createElement('li');
    const gt = document.createElement('strong');
    gt.textContent = String(giaTri);
    li.append(span('', nhan), gt);
    ul.append(li);
  }
}

function ghepNgayNoi(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  return [formatDate(khoiNgay), khoiNgay.place].filter(coGiaTri).join(' · ');
}

function tuoiTho(p) {
  const t = calcAge(p.birth, p.death, p.living === true);
  if (!t) return { nhan: 'Tuổi', giaTri: '' };
  return {
    nhan: t.denHomNay ? 'Tuổi' : 'Hưởng thọ',
    giaTri: (t.xapXi ? 'khoảng ' : '') + t.tuoi + ' tuổi',
  };
}

function veGiaDinh(ul, hs, ma, khu) {
  const idx = buildIndex({
    persons: hs.persons.map((x) => (x.id === ma ? { ...x, deleted: false } : x)),
    unions: hs.unions,
  });
  const nguoi = (id) => idx.personById.get(id);
  const theoGioi = (id, nam, nu, chung) => ({ M: nam, F: nu }[(nguoi(id) || {}).sex] || chung);

  const hang = [
    ...getParents(idx, ma).map((x) => [theoGioi(x.personId, 'Cha', 'Mẹ', 'Cha / mẹ'),
      x.personId, chuThichQuanHe(x.relation, 'chaMe')]),
    ...getSpouses(idx, ma).map((x) => [theoGioi(x.personId, 'Chồng', 'Vợ', 'Vợ / chồng'),
      x.personId, x.status === 'divorced' ? 'đã ly hôn' : '']),
    ...getChildren(idx, ma).map((x) => [theoGioi(x.personId, 'Con trai', 'Con gái', 'Con'),
      x.personId, chuThichQuanHe(x.relation, 'con')]),
  ];

  if (!hang.length) { ul.append(liMo('Chưa ghi cha mẹ, vợ/chồng hay con nào.')); return; }
  for (const [nhan, id, chuThich] of hang) {
    const q = nguoi(id);
    const khoi = document.createElement('div');
    khoi.append(
      lienKet(fullName(q) || '(chưa có tên)', duongDan(khu, 'nguoi', id)),
      span('sub', [doiSongNguoi(q), id, chuThich].filter(Boolean).join(' · ')),
    );
    const li = document.createElement('li');
    li.append(span('', nhan), khoi);
    ul.append(li);
  }
}

function liMo(chu) {
  const li = document.createElement('li');
  li.append(span('muted', chu));
  return li;
}

async function timTaiKhoanGan(ma, phien) {
  if (phien.maNguoiGan && ma === phien.maNguoiGan) return { loai: 'toi' };
  if (!phien.laQuanTriHeThong) return { loai: 'an' };

  const kq = await dsTaiKhoanHeThong();
  if (!kq.ok) return { loai: 'loi', loi: kq.loi };
  const tk = kq.ds.find((t) => t.maNguoiGan === ma);
  if (!tk) return { loai: 'khong' };
  const kqDs = await dsCayCuaTaiKhoan(tk.userId);
  if (!kqDs.ok) return { loai: 'loi', loi: kqDs.loi };
  return { loai: 'khac', tk, theoCay: new Map(kqDs.ds.map((c) => [c.treeId, c])) };
}

function veTaiKhoan(el, tk) {
  el.innerHTML = '';
  if (tk.loai === 'toi') {
    el.textContent = 'Người này là bạn — cột Vai trò là quyền của tài khoản bạn.';
  } else if (tk.loai === 'khac') {
    el.append('Tài khoản gắn: ', lienKet(tk.tk.hoTen || tk.tk.email,
      duongDan('quan-tri-he-thong', 'tai-khoan', tk.tk.maNgan)));
  } else if (tk.loai === 'khong') {
    el.textContent = 'Chưa có tài khoản nào gắn với người này.';
  } else if (tk.loai === 'an') {
    el.textContent = 'Chỉ Quản trị hệ thống xem được tài khoản gắn với người khác.';
  } else {
    el.textContent = 'Không đọc được tài khoản gắn: ' + (tk.loi || '');
  }
}

function veBangCay(sec, cacCay, kqCay, tk, phien, napLai) {
  const tb = sec.querySelector('#hsn-cay-tbody');
  if (!kqCay.ok) { dongTrong(tb, SO_COT, kqCay.loi || 'Không đọc được danh sách gia phả.', napLai); return; }

  const theoId = new Map(kqCay.ds.map((c) => [c.fileId, c]));
  const ds = cacCay
    .map((x) => ({ ...x, c: theoId.get(x.treeId) || null }))
    .sort((a, b) => String((a.c && a.c.ten) || '').localeCompare(String((b.c && b.c.ten) || ''), 'vi'));

  sec.querySelector('#hsn-cay-dem').textContent = ds.length ? 'Có mặt ở ' + ds.length + ' gia phả' : '';
  if (!ds.length) { dongTrong(tb, SO_COT, 'Người này không có mặt ở gia phả nào bạn xem được.'); return; }

  tb.innerHTML = '';
  for (const { treeId, doi, c } of ds) {
    const tr = document.createElement('tr');
    tr.append(
      td(c ? lienKet(c.ten || c.treeCode, duongDan('gia-pha', 'cay', c.treeCode))
           : span('muted', 'Không đọc được tên cây')),
      td(c ? c.treeCode : ''),
      td(doi ? 'thứ ' + doi : ''),
      td(oVai(tk, c, treeId)),
      td(c && c.coTheXem ? nutLink('Xem sơ đồ →', () => moSoDo(cayNho(c), phien)) : ''),
    );
    tb.append(tr);
  }
}

function oVai(tk, c, treeId) {
  if (tk.loai === 'toi') {
    if (!c) return '';
    if (c.toiLaChu) return huyHieu('Chủ gia phả');
    if (c.duocMoi) return huyHieu('Được mời: ' + (TEN_VAI[c.moiVai] || c.moiVai || ''), 'wait');
    if (c.vaiCuaToi) return huyHieu(TEN_VAI[c.vaiCuaToi] || c.vaiCuaToi);
    if (c.daNopDon) return huyHieu('Đơn xin vào', 'wait');
    return span('muted', 'Chưa tham gia cây này');
  }
  if (tk.loai === 'khac') {
    const x = tk.theoCay.get(treeId);
    if (!x) return span('muted', 'Chưa tham gia cây này');
    if (x.laChuCay) return huyHieu('Chủ gia phả');
    if (!x.daDuyet) {
      return x.moiLuc ? huyHieu('Được mời: ' + (TEN_VAI[x.moiVai || x.vai] || x.moiVai || x.vai), 'wait')
        : huyHieu('Đơn chờ duyệt', 'wait');
    }
    return huyHieu(TEN_VAI[x.vai] || x.vai);
  }
  return '';
}
