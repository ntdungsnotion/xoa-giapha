import * as repo from '../services/repo.js';
import { xinVaoCay, nhanLoiMoi, tuChoiLoiMoi } from '../services/sb.js';
import { mountDangNhap } from './dang-nhap.js';
import { mountTreeView } from './tree-view.js';
import { openSettings, closeSettings } from './settings.js';
import { openChonGiaPha } from './chon-gia-pha.js';
import { rongHop, vaiTroBangChu } from '../config.js';
import { stampNow } from '../utils/date.js';

export async function mountKhoiDong(containerEl) {
  hienManHinhCho(containerEl);

  let phien;
  try {
    phien = await repo.khoiTao();
  } catch (loi) {
    hienManHinhLoi(containerEl, loi);
    return false;
  }

  if (phien.loi) {
    hienManHinhLoi(containerEl, new Error(phien.loi));
    return false;
  }

  if (!phien.daDangNhap) {
    mountDangNhap(containerEl, () => mountKhoiDong(containerEl));
    return false;
  }

  if (!phien.docDuoc) {
    hienManHinhKhongCoQuyen(containerEl, phien);
    return false;
  }

  mountTreeView(containerEl);
  return true;
}

function hienManHinhCho(el) {
  el.innerHTML = '';
  el.append(nutCaiDat());
  el.append(khung([
    tieuDe('Đang mở gia phả…'),
  ]));
}

function hienManHinhKhongCoQuyen(el, phien) {
  el.innerHTML = '';
  el.append(nutCaiDat());

  if (phien.trangThai === 'khoa') {
    el.append(khung([
      tieuDe('Tài khoản của bạn đang bị khoá'),
      phien.khoaLyDo ? doan('Lý do: “' + phien.khoaLyDo + '”.') : null,
      doan('Liên hệ Quản trị hệ thống để được mở khoá.'),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  if (phien.trangThai === 'khongcay') {
    el.append(khung([
      tieuDe('Hệ thống chưa có gia phả nào'),
      doan('Bạn là Quản trị hệ thống. Mở trang Quản trị, khu Gia phả, thẻ ' +
           '“Tạo gia phả mới” để dựng gia phả đầu tiên.'),
      veNutQuanTri(),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  if (phien.trangThai === 'daxoa') {
    el.append(khung([
      tieuDe('Gia phả này đã bị xoá'),
      doan('“' + (phien.tenCay || 'Gia phả bạn đang mở') + '”' +
           (phien.maCay ? ' (' + phien.maCay + ')' : '') +
           ' đã được đưa vào thùng rác' +
           (phien.daXoaLuc ? ' lúc ' + stampNow(new Date(phien.daXoaLuc)) : '')
           + '.'),
      phien.emailXinXoa
        ? doan('Người xin xoá: ' + phien.emailXinXoa +
               (phien.emailDuyet ? ' — Quản trị hệ thống duyệt: ' +
                                   phien.emailDuyet : '') + '.')
        : null,
      phien.lyDo ? doan('Lý do: “' + phien.lyDo + '”') : null,
      doan(phien.laQuanTriHeThong
        ? 'Còn phục hồi được trong 30 ngày. Bạn là Quản trị hệ thống — mở ' +
          'trang Quản trị, khu Gia phả, khối Thùng rác.'
        : 'Còn phục hồi được trong 30 ngày. Nếu đây là nhầm lẫn, nhắn cho ' +
          'Quản trị hệ thống. Muốn sang gia phả khác thì mở trang Quản trị.'),
      veNutQuanTri(),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  if (phien.trangThai === 'duocmoi') {
    el.append(khung([
      tieuDe('Bạn được mời vào gia phả'),
      doan((phien.tenCay || 'Một gia phả') + ' mời bạn vào, với vai ' +
           (vaiTroBangChu(phien.moiVai) || phien.moiVai || 'xem') + '.'),
      doan('Người mời: ' + (phien.emailNguoiMoi || '(không rõ)')),
      veKhoiNhanLoiMoi(el, phien),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  if (phien.trangThai === 'cho') {
    el.append(khung([
      tieuDe('Đơn của bạn đang chờ duyệt'),
      doan('Bạn đã xin vào một gia phả. Quản trị viên sẽ xem và duyệt.'),
      doan('Duyệt xong thì mở lại trang này là thấy sơ đồ, không phải làm gì thêm.'),
      nhoMo('Sốt ruột thì nhắn cho ' + (phien.nguoiQuanLy || '') + '.'),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  if (phien.trangThai === 'nhieucay') {
    el.append(khung([
      tieuDe('Bạn chưa được cấp quyền xem'),
      doan('Máy chủ này đang có ' + (phien.soCay || 'nhiều') + ' cây gia phả, ' +
           'và bạn chưa có chân trong cây nào.'),
      doan('Hãy nhắn cho ' + (phien.nguoiQuanLy || 'người quản lý') +
           ' để được thêm vào đúng cây của bạn.'),
      phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
    ]));
    return;
  }

  el.append(khung([
    tieuDe('Bạn chưa được cấp quyền xem'),
    doan('Bạn chưa được cấp quyền xem gia phả này.'),
    doan('Bấm nút dưới đây để xin vào. Quản trị viên duyệt xong thì bạn xem được.'),
    veKhoiXinVao(el, phien),
    nhoMo('Hoặc nhắn thẳng cho ' + (phien.nguoiQuanLy || '') + '.'),
    phien.email ? nhoMo('Bạn đang đăng nhập bằng: ' + phien.email) : null,
  ]));
}

function veKhoiNhanLoiMoi(el, phien) {
  const hop = document.createElement('div');
  hop.style.cssText = 'display:flex;gap:10px;margin:16px 0';

  const nutNhan = document.createElement('button');
  nutNhan.type = 'button';
  nutNhan.textContent = 'Nhận lời mời';
  nutNhan.style.cssText =
    'flex:1;min-height:44px;font:inherit;font-size:15px;font-weight:600;' +
    'border-radius:9px;cursor:pointer;background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);' +
    'border:1px solid var(--sd-nut,#2a2622)';

  const nutTuChoi = document.createElement('button');
  nutTuChoi.type = 'button';
  nutTuChoi.textContent = 'Từ chối';
  nutTuChoi.style.cssText =
    'flex:1;min-height:44px;font:inherit;font-size:15px;font-weight:600;' +
    'border-radius:9px;cursor:pointer;background:var(--sd-giay,#fffdf9);color:var(--sd-chu,#2a2622);' +
    'border:1px solid var(--sd-vien-dam,#c8bfb2)';

  const bao = document.createElement('p');
  bao.style.cssText = 'margin:10px 0 0;font-size:13px;line-height:1.5;color:var(--sd-do,#8a3a2a)';

  const khoaCa = (khoa) => { nutNhan.disabled = khoa; nutTuChoi.disabled = khoa; };

  nutNhan.addEventListener('click', async () => {
    khoaCa(true);
    nutNhan.textContent = 'Đang nhận…';
    const kq = await nhanLoiMoi(phien.treeId);
    if (!kq || !kq.ok) {
      khoaCa(false);
      nutNhan.textContent = 'Nhận lời mời';
      bao.textContent = (kq && kq.loi) || 'Không nhận được lời mời. Thử lại sau.';
      return;
    }
    mountKhoiDong(el);
  });

  nutTuChoi.addEventListener('click', async () => {
    khoaCa(true);
    nutTuChoi.textContent = 'Đang từ chối…';
    const kq = await tuChoiLoiMoi(phien.treeId);
    if (!kq || !kq.ok) {
      khoaCa(false);
      nutTuChoi.textContent = 'Từ chối';
      bao.textContent = (kq && kq.loi) || 'Không từ chối được. Thử lại sau.';
      return;
    }
    mountKhoiDong(el);
  });

  hop.append(nutNhan, nutTuChoi);
  const boc = document.createElement('div');
  boc.append(hop, bao);
  return boc;
}

function veKhoiXinVao(el, phien) {
  const hop = document.createElement('div');
  hop.style.cssText = 'margin:16px 0';

  const o = document.createElement('textarea');
  o.rows = 2;
  o.maxLength = 500;
  o.placeholder = 'Bạn là ai trong họ? (không bắt buộc) — ví dụ: cháu nội cụ Bắc, con ông Hùng';
  o.style.cssText =
    'width:100%;box-sizing:border-box;padding:10px;font:inherit;font-size:14px;' +
    'border:1px solid var(--sd-vien,#d8d0c6);border-radius:9px;background:var(--sd-giay,#fffdf9);resize:vertical';

  const nut = document.createElement('button');
  nut.type = 'button';
  nut.textContent = 'Xin vào gia phả';
  nut.style.cssText =
    'margin-top:10px;width:100%;min-height:44px;font:inherit;font-size:15px;' +
    'font-weight:600;border-radius:9px;cursor:pointer;' +
    'background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9);border:1px solid var(--sd-nut,#2a2622)';

  const bao = document.createElement('p');
  bao.style.cssText = 'margin:10px 0 0;font-size:13px;line-height:1.5';

  nut.addEventListener('click', async () => {
    nut.disabled = true;
    nut.textContent = 'Đang gửi…';
    const kq = await xinVaoCay(o.value, phien.treeId);
    if (!kq || !kq.ok) {
      nut.disabled = false;
      nut.textContent = 'Xin vào gia phả';
      bao.style.color = 'var(--sd-do,#8a3a2a)';
      bao.textContent = (kq && kq.loi) || 'Không gửi được đơn. Thử lại sau.';
      return;
    }
    hienManHinhKhongCoQuyen(el, { ...phien, trangThai: 'cho' });
  });

  hop.append(o, nut, bao);
  return hop;
}

function hienManHinhLoi(el, loi) {
  el.innerHTML = '';
  el.append(nutCaiDat());
  const nut = document.createElement('button');
  nut.textContent = 'Thử lại';
  nut.style.cssText = 'margin-top:16px;padding:10px 20px;font-size:16px;' +
                      'border:1px solid var(--sd-vien-dam,#c8bfb2);border-radius:8px;' +
                      'background:var(--sd-giay,#fff);cursor:pointer';
  nut.addEventListener('click', () => mountKhoiDong(el));

  el.append(khung([
    tieuDe('Không mở được gia phả'),
    doan('Kiểm tra kết nối mạng rồi thử lại.'),
    nhoMo(String(loi && loi.message || loi)),
    nut,
  ]));
}

function nutCaiDat() {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = '⚙';
  b.title = 'Cài đặt';
  b.setAttribute('aria-label', 'Cài đặt');
  b.dataset.viec = 'cai-dat-khoi-dong';
  b.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:20;width:44px;height:44px;' +
    'border-radius:50%;font-size:22px;line-height:1;cursor:pointer;' +
    'touch-action:manipulation;background:var(--sd-giay,#fffdf9);' +
    'color:var(--sd-chu,#2a2622);border:1px solid var(--sd-vien,#e6e0d8);' +
    'box-shadow:0 2px 8px rgba(42,38,34,.15)';
  b.addEventListener('click', () => openSettings({
    onMoChonGiaPha: () => { closeSettings(); openChonGiaPha(); },
  }));
  return b;
}

function khung(phanTu) {
  const d = document.createElement('div');
  d.style.cssText = 'max-width:' + rongHop(520, 680) + ';' +
                    'margin:0 auto;padding:32px 24px;' +
                    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622);' +
                    'line-height:1.6';
  phanTu.filter(Boolean).forEach(x => d.append(x));
  return d;
}

function tieuDe(chu) {
  const h = document.createElement('h1');
  h.textContent = chu;
  h.style.cssText = 'font-size:20px;margin:0 0 12px';
  return h;
}

function doan(chu) {
  const p = document.createElement('p');
  p.textContent = chu;
  p.style.margin = '0 0 10px';
  return p;
}

function veNutQuanTri() {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Mở trang Quản trị';
  b.style.cssText =
    'margin:14px 0 0;padding:9px 16px;border-radius:7px;font:inherit;' +
    'cursor:pointer;border:1px solid var(--sd-nut,#2a2622);background:var(--sd-nut,#2a2622);color:var(--sd-nut-chu,#fffdf9)';
  b.addEventListener('click', () => {
    window.location.href = 'QuanTri.html#gia-pha';
  });
  return b;
}

function nhoMo(chu) {
  const p = document.createElement('p');
  p.textContent = chu;
  p.style.cssText = 'margin:16px 0 0;font-size:13px;color:var(--sd-chu-phu,#8a8078)';
  return p;
}
