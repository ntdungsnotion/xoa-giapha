import {
  layDanhSachGiaPha, dsThanhVien, moiVaoCay, goThanhVien, timTaiKhoan,
} from '../../services/sb.js';
import { ganGoiY, dongTaiKhoan } from './o-goi-y.js';
import { hoi } from './hop-thoai.js';
import { TEN_VAI, td, nut, dongTrong } from './o-bang.js';
import { wireTabsTrangCay, datSoDon } from './trang-cay.js';

let goGoiY = [];

export async function mountTrangMoi(sec, ctx) {
  wireTabsTrangCay(sec, ctx, 'loi-moi');
  datSoDon(sec, 0);
  goGoiY.forEach((go) => go());
  goGoiY = [];

  const nguCanh = sec.querySelectorAll('[data-tree-context]');
  const oTen = sec.querySelector('#invite-name');
  const oEmail = sec.querySelector('#invite-email');
  const oMa = sec.querySelector('#invite-code');
  const oVai = sec.querySelector('#invite-vai');
  const bGui = sec.querySelector('#invite-gui');
  const oLoi = sec.querySelector('#invite-loi');
  const tbody = sec.querySelector('#invite-tbody');

  for (const o of [oTen, oEmail, oMa]) o.value = '';
  oLoi.hidden = true;
  nguCanh.forEach((x) => { x.textContent = ctx.thamSo; });
  dongTrong(tbody, 5, 'Đang đọc…');

  const hashLuc = window.location.hash;
  const kq = await layDanhSachGiaPha();
  if (window.location.hash !== hashLuc) return;

  const cay = kq.ok ? kq.ds.find((c) => c.treeCode === ctx.thamSo) : null;
  if (!cay) {
    nguCanh.forEach((x) => { x.textContent = 'Không thấy gia phả mã ' + ctx.thamSo; });
    bGui.disabled = true;
    dongTrong(tbody, 5, kq.ok
      ? 'Danh sách gia phả của tài khoản này không có mã ấy.'
      : (kq.loi || 'Máy chủ không trả lời.'));
    return;
  }

  nguCanh.forEach((x) => { x.textContent = (cay.ten || '') + ' · ' + cay.treeCode; });

  dsThanhVien(cay.fileId).then((kqTV) => {
    if (window.location.hash === hashLuc && kqTV.ok) {
      datSoDon(sec, kqTV.ds.filter((t) => !t.daDuyet && !t.moiLuc).length);
    }
  });

  const duocMoi = cay.toiLaChu || ctx.phien.laQuanTriHeThong;
  bGui.disabled = !duocMoi;
  bGui.title = duocMoi ? '' : 'Chỉ chủ gia phả và Quản trị hệ thống mời được.';

  const dien = (m) => {
    oTen.value = m.hoTen || '';
    oEmail.value = m.email || '';
    oMa.value = m.maNgan || '';
  };
  const tim = async (chuoi) => (await timTaiKhoan(cay.fileId, chuoi)).ds;
  goGoiY = [
    ganGoiY(oTen, { tim, ve: dongTaiKhoan, giaTri: (m) => m.hoTen || m.email, khiChon: dien }),
    ganGoiY(oEmail, { tim, ve: dongTaiKhoan, giaTri: (m) => m.email, khiChon: dien }),
    ganGoiY(oMa, { tim, ve: dongTaiKhoan, giaTri: (m) => m.maNgan || '', khiChon: dien }),
  ];

  const napLoiMoi = () => veLoiMoiDaGui(tbody, cay);

  bGui.onclick = async () => {
    oLoi.hidden = true;
    const email = oEmail.value.trim();
    if (!email) {
      oLoi.textContent = 'Gõ vài chữ vào một ô rồi chọn đúng tài khoản trong danh sách gợi ý.';
      oLoi.hidden = false;
      return;
    }
    bGui.disabled = true;
    const chuCu = bGui.textContent;
    bGui.textContent = 'Đang mời…';
    const r = await moiVaoCay(cay.fileId, email, oVai.value);
    bGui.disabled = false;
    bGui.textContent = chuCu;
    if (!r.ok) { oLoi.textContent = r.loi || 'Không mời được.'; oLoi.hidden = false; return; }
    for (const o of [oTen, oEmail, oMa]) o.value = '';
    napLoiMoi();
  };

  napLoiMoi();
}

async function veLoiMoiDaGui(tbody, cay) {
  dongTrong(tbody, 5, 'Đang đọc…');
  const kq = await dsThanhVien(cay.fileId);
  if (!kq.ok) {
    dongTrong(tbody, 5, kq.loi || 'Không đọc được danh sách.', () => veLoiMoiDaGui(tbody, cay));
    return;
  }

  const ds = kq.ds.filter((t) => !t.daDuyet && t.moiLuc);
  if (!ds.length) { dongTrong(tbody, 5, 'Chưa có lời mời nào đang chờ nhận.'); return; }

  tbody.innerHTML = '';
  for (const t of ds) {
    const b = nut('Thu hồi lời mời', 'danger');
    b.addEventListener('click', async () => {
      const r = await hoi({
        tua: 'Thu hồi lời mời',
        chu: 'Thu hồi lời mời vào “' + (cay.ten || 'gia phả này') + '” đã gửi cho ' + t.email + '?',
        nutOk: 'Thu hồi', kieuOk: 'danger',
        lam: () => goThanhVien(cay.fileId, t.userId),
      });
      if (r) veLoiMoiDaGui(tbody, cay);
    });

    const tr = document.createElement('tr');
    tr.append(td(''), td(t.email), td(t.maNgan), td(TEN_VAI[t.moiVai] || t.moiVai), td(b));
    tbody.append(tr);
  }
}
