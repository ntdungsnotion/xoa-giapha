import {
  timNguoiBaoTrung, nopBaoTrung, rutBaoTrung, dsBaoTrung, duyetBaoTrung, tuChoiBaoTrung,
} from '../../services/sb.js';
import { hoi, bao } from './hop-thoai.js';
import { td, span, tenVaPhu, huyHieu, nut, hangNut, dongTrong, ngayGio } from './o-bang.js';
import { ganGoiY, dongNguoiCayKhac } from './o-goi-y.js';

const SO_COT_CUA_TOI = 5;
const SO_COT_DUYET = 5;

let goCu = [];

function nam(p) {
  return (p.namSinh || p.namMat) ? ' (' + (p.namSinh || '?') + '–' + (p.namMat || '') + ')' : '';
}

function tomTat(p) {
  if (!p) return tenVaPhu('(không còn bản ghi)', '');
  const qh = [
    p.soChaMe ? 'có cha mẹ' : '',
    p.soVoChong ? p.soVoChong + ' vợ/chồng' : '',
    p.soCon ? p.soCon + ' con' : '',
    p.coTaiKhoan ? 'đã gắn tài khoản' : '',
    p.gopVao ? 'đã gộp vào ' + p.gopVao : '',
  ].filter(Boolean).join(' · ');
  const phu = [p.id, p.cacCay ? 'ở: ' + p.cacCay : '', qh].filter(Boolean).join('  ·  ');
  return tenVaPhu((p.ten || p.id) + nam(p), phu);
}

function tenNgan(p, ma) {
  return p ? (p.ten || ma) + ' (' + ma + ')' : ma;
}

export async function veKhuBaoTrung(sec) {
  const oX = sec.querySelector('#bt-x');
  const oY = sec.querySelector('#bt-y');
  if (!oX || !oY) return;
  ganForm(sec, oX, oY);
  await veCuaToi(sec);
}

function ganForm(sec, oX, oY) {
  const oLyDo = sec.querySelector('#bt-ly-do');
  const oLoi = sec.querySelector('#bt-loi');
  const bGui = sec.querySelector('#bt-gui');
  const chon = { x: null, y: null };

  for (const go of goCu) go();
  goCu = [];

  const gan = (o, khoa, oChon) => {
    oChon.textContent = '';
    goCu.push(ganGoiY(o, {
      tim: async (chuoi) => (await timNguoiBaoTrung(chuoi)).ds,
      ve: dongNguoiCayKhac,
      giaTri: (m) => m.ten,
      khiChon: (m) => {
        chon[khoa] = { ...m, dien: m.ten };
        oChon.textContent = '✓ ' + m.ten + nam(m) + ' · ' + m.maNguoi +
          (m.cacCay ? ' · ở: ' + m.cacCay : '');
      },
    }));
  };
  gan(oX, 'x', sec.querySelector('#bt-x-chon'));
  gan(oY, 'y', sec.querySelector('#bt-y-chon'));

  const maCua = (o, c) => {
    const chu = o.value.trim();
    if (c && chu === c.dien) return c.maNguoi;
    return /^P\d+$/i.test(chu) ? chu.toUpperCase() : '';
  };

  bGui.onclick = async () => {
    oLoi.hidden = true;
    const x = maCua(oX, chon.x);
    const y = maCua(oY, chon.y);
    const baoLoi = (chu) => { oLoi.textContent = chu; oLoi.hidden = false; };
    if (!x || !y) return baoLoi('Gõ tên rồi bấm chọn một dòng trong danh sách gợi ý (hoặc gõ đúng mã người, ví dụ P0123) — cho cả hai ô.');
    if (x === y) return baoLoi('Hai ô đang là cùng một người.');
    if (!oLyDo.value.trim()) return baoLoi('Ghi vài chữ vì sao đây là một người — Quản trị hệ thống đọc nó để quyết định.');

    bGui.disabled = true;
    const chuCu = bGui.textContent;
    bGui.textContent = 'Đang gửi…';
    const kq = await nopBaoTrung(x, y, oLyDo.value);
    bGui.disabled = false;
    bGui.textContent = chuCu;
    if (!kq.ok) return baoLoi(kq.loi || 'Không gửi được.');

    oX.value = ''; oY.value = ''; oLyDo.value = '';
    chon.x = null; chon.y = null;
    sec.querySelector('#bt-x-chon').textContent = '';
    sec.querySelector('#bt-y-chon').textContent = '';
    await bao('Đã gửi báo trùng',
      'Quản trị hệ thống sẽ xét. Nếu được duyệt, mã ' + kq.maGiu + ' ở lại và ' + kq.maThua +
      ' gộp vào đó (máy chọn mã nhỏ hơn). Kết quả hiện ở bảng ngay dưới.');
    veCuaToi(sec);
  };
}

const TRANG_THAI = {
  cho: ['Chờ duyệt', 'wait'],
  duyet: ['Đã gộp', ''],
  tu_choi: ['Từ chối', 'red'],
};

async function veCuaToi(sec) {
  const tb = sec.querySelector('#bt-tbody');
  const dem = sec.querySelector('#bt-dem');
  dongTrong(tb, SO_COT_CUA_TOI, 'Đang đọc…');
  const napLai = () => veCuaToi(sec);
  const kq = await dsBaoTrung(true);
  if (!kq.ok) { dem.textContent = ''; dongTrong(tb, SO_COT_CUA_TOI, kq.loi, napLai); return; }
  if (!kq.ds.length) {
    dem.textContent = '';
    dongTrong(tb, SO_COT_CUA_TOI, 'Bạn chưa gửi báo trùng nào.');
    return;
  }
  dem.textContent = kq.ds.length + ' báo trùng';
  tb.innerHTML = '';
  for (const d of kq.ds) {
    const [chu, kieu] = TRANG_THAI[d.trangThai] || [d.trangThai, ''];
    let hanhDong = '';
    if (d.trangThai === 'cho') {
      hanhDong = nut('Rút');
      hanhDong.addEventListener('click', () => hoiRut(d, napLai));
    }
    const tr = document.createElement('tr');
    tr.append(
      td(tomTat(d.giu), span('sub', '— trùng với —'), tomTat(d.thua)),
      td(span('sub', d.lyDo || '')),
      td(span('sub', ngayGio(d.taoLuc))),
      td(huyHieu(chu, kieu), d.loiXet ? span('sub', d.loiXet) : ''),
      td(hanhDong),
    );
    tb.append(tr);
  }
}

async function hoiRut(d, napLai) {
  const kq = await hoi({
    tua: 'Rút báo trùng',
    chu: 'Rút báo trùng ' + tenNgan(d.giu, d.maGiu) + ' = ' + tenNgan(d.thua, d.maThua) +
      '? Quản trị hệ thống sẽ không thấy nó nữa.',
    nutOk: 'Rút', nutHuy: 'Hủy',
    lam: () => rutBaoTrung(d.id),
  });
  if (kq) napLai();
}

export async function veKhuDuyetBaoTrung(sec) {
  const tb = sec.querySelector('#btd-tbody');
  const dem = sec.querySelector('#btd-dem');
  if (!tb) return;
  dongTrong(tb, SO_COT_DUYET, 'Đang đọc…');
  const napLai = () => veKhuDuyetBaoTrung(sec);
  const kq = await dsBaoTrung(false);
  if (!kq.ok) { dem.textContent = ''; dongTrong(tb, SO_COT_DUYET, kq.loi, napLai); return; }
  const ds = kq.ds.filter((d) => d.trangThai === 'cho');
  if (!ds.length) {
    dem.textContent = '';
    dongTrong(tb, SO_COT_DUYET, 'Không có báo trùng nào đang chờ duyệt.');
    return;
  }
  dem.textContent = ds.length + ' báo trùng đang chờ';
  tb.innerHTML = '';
  for (const d of ds) {
    const bDuyet = nut('Duyệt (gộp)', 'danger');
    bDuyet.addEventListener('click', () => hoiDuyet(d, napLai));
    const bTuChoi = nut('Từ chối');
    bTuChoi.addEventListener('click', () => hoiTuChoi(d, napLai));
    const tr = document.createElement('tr');
    tr.append(
      td(tomTat(d.giu)),
      td(tomTat(d.thua)),
      td(span('sub', d.lyDo || '')),
      td(span('name', d.nguoiGui || ''), span('sub', ngayGio(d.taoLuc))),
      td(hangNut(bDuyet, bTuChoi)),
    );
    tb.append(tr);
  }
}

async function hoiDuyet(d, napLai) {
  const giu = tenNgan(d.giu, d.maGiu);
  const thua = tenNgan(d.thua, d.maThua);
  const kq = await hoi({
    tua: 'Duyệt báo trùng — gộp hai bản ghi',
    chu: 'Gộp ' + thua + ' VÀO ' + giu + '. Máy chủ làm ngay khi bấm: mã ' + d.maGiu +
      ' ở lại; ô nào ' + d.maGiu + ' bỏ trống thì lấy của ' + d.maThua + ' (ô khác nhau thì giữ của ' +
      d.maGiu + ', sửa tay sau); vợ/chồng, con, ảnh và các gia phả của ' + d.maThua +
      ' chuyển sang ' + d.maGiu + '; hai hôn nhân cùng một cặp vợ chồng tự gộp làm một. ' +
      d.maThua + ' được đánh dấu "đã gộp", không xoá cứng. Việc này KHÔNG hoàn tác được bằng nút.',
    nutOk: 'Duyệt và gộp', nutHuy: 'Hủy', kieuOk: 'danger',
    lam: () => duyetBaoTrung(d.id),
  });
  if (!kq) return;
  await bao('Đã gộp', (kq.kq && kq.kq.moTa ? kq.kq.moTa + '. ' : '') +
    'Ai đang mở một trong các gia phả ấy sẽ được nhắc tải lại trước khi lưu.');
  napLai();
}

async function hoiTuChoi(d, napLai) {
  const kq = await hoi({
    tua: 'Từ chối báo trùng',
    chu: 'Từ chối báo trùng ' + tenNgan(d.giu, d.maGiu) + ' = ' + tenNgan(d.thua, d.maThua) +
      ' của ' + (d.nguoiGui || 'người gửi') + '? Hai bản ghi giữ nguyên.',
    oNhap: { nhieuDong: true, goiY: 'Lý do từ chối (tuỳ chọn — người gửi đọc được lý do này)...' },
    nutOk: 'Từ chối', nutHuy: 'Hủy',
    lam: (lyDo) => tuChoiBaoTrung(d.id, lyDo),
  });
  if (kq) napLai();
}
