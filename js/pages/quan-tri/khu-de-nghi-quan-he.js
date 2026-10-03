import { dsDeNghiQuanHe, duyetDeNghiQuanHe, tuChoiDeNghiQuanHe } from '../../services/sb.js';
import { hoi } from './hop-thoai.js';
import { td, span, tenVaPhu, nut, hangNut, dongTrong, ngayGio } from './o-bang.js';

const SO_COT = 6;

export async function veKhuDeNghiQuanHe(sec) {
  const tb = sec.querySelector('#dnqh-tbody');
  const dem = sec.querySelector('#dnqh-dem');
  dongTrong(tb, SO_COT, 'Đang đọc…');

  const napLai = () => veKhuDeNghiQuanHe(sec);
  let ds;
  try { ds = await dsDeNghiQuanHe(); } catch (_) { ds = []; }

  if (!ds.length) {
    dem.textContent = '';
    dongTrong(tb, SO_COT, 'Không có đề nghị nào đang chờ duyệt.');
    return;
  }
  dem.textContent = ds.length + ' đề nghị đang chờ';
  tb.innerHTML = '';
  for (const d of ds) tb.append(dong(d, napLai));
}

function dong(d, napLai) {
  const bDuyet = nut('Duyệt (gỡ)', 'danger');
  bDuyet.addEventListener('click', () => hoiDuyet(d, napLai));
  const bTuChoi = nut('Từ chối');
  bTuChoi.addEventListener('click', () => hoiTuChoi(d, napLai));

  const tr = document.createElement('tr');
  tr.append(
    td(tenVaPhu(d.tenCay || d.maCay, d.maCay)),
    td(span('name', d.loai === 'go_con' ? 'Gỡ con khỏi cha mẹ' : 'Gỡ vợ/chồng')),
    td(chiTietQuanHe(d)),
    td(span('sub', d.lyDo || '')),
    td(span('name', d.nguoiGui || ''), span('sub', ngayGio(d.taoLuc))),
    td(hangNut(bDuyet, bTuChoi)),
  );
  return tr;
}

function chiTietQuanHe(d) {
  const vc = (d.voChong || []).map((x) => x.ten).filter(Boolean).join(' & ');
  if (d.loai === 'go_con') {
    return tenVaPhu('Con: ' + (d.tenNguoi || d.personId), 'Khỏi cặp: ' + (vc || d.unionId));
  }
  const bi = (d.voChong || []).find((x) => x.id === d.personId);
  return tenVaPhu('Gỡ: ' + (bi ? bi.ten : d.personId), 'Khỏi cặp: ' + (vc || d.unionId));
}

function moTaViec(d) {
  const ten = d.loai === 'go_con'
    ? (d.tenNguoi || d.personId)
    : ((d.voChong || []).find((x) => x.id === d.personId) || {}).ten || d.personId;
  return ten + (d.loai === 'go_con' ? ' khỏi đàn con của ' : ' khỏi vợ/chồng của ') + d.unionId;
}

async function hoiDuyet(d, napLai) {
  const kq = await hoi({
    tua: 'Duyệt đề nghị — gỡ quan hệ',
    chu: 'Gỡ ' + moTaViec(d) + ' (' + (d.tenCay || d.maCay) + '). Máy chủ tự thực hiện NGAY khi bấm ' +
      'và việc này không hoàn tác được bằng nút — quan hệ đúng khai lại theo đường thường nếu cần.',
    nutOk: 'Duyệt và gỡ', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: () => duyetDeNghiQuanHe(d.id),
  });
  if (kq) napLai();
}

async function hoiTuChoi(d, napLai) {
  const kq = await hoi({
    tua: 'Từ chối đề nghị',
    chu: 'Từ chối đề nghị gỡ ' + moTaViec(d) + ' của ' + (d.nguoiGui || 'người gửi') +
      '? Quan hệ giữ nguyên, không gỡ gì cả.',
    oNhap: { nhieuDong: true, goiY: 'Lý do từ chối (tuỳ chọn — người gửi đọc được lý do này)...' },
    nutOk: 'Từ chối', nutHuy: 'Hủy',
    lam: (lyDo) => tuChoiDeNghiQuanHe(d.id, lyDo),
  });
  if (kq) napLai();
}
