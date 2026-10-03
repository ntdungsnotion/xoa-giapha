import * as sb from '../services/sb.js';
import { rongHop } from '../config.js';

export function mountDangNhap(containerEl, khiXong) {
  containerEl.innerHTML = '';

  const oEmail   = oNhap('email',    'Email',    'email');
  const oMatKhau = oNhap('password', 'Mật khẩu', 'current-password');
  const nut      = document.createElement('button');
  const loi      = document.createElement('p');
  const quen     = document.createElement('button');

  nut.type = 'submit';
  nut.textContent = 'Đăng nhập';
  nut.style.cssText = 'width:100%;margin-top:18px;padding:12px 20px;' +
    'font-size:16px;border:1px solid var(--sd-vien-dam,#c8bfb2);border-radius:8px;' +
    'background:var(--sd-giay,#fff);cursor:pointer';

  loi.style.cssText = 'margin:14px 0 0;color:#c62828;font-size:14px;min-height:1px';
  loi.hidden = true;

  quen.type = 'button';
  quen.textContent = 'Quên mật khẩu?';
  quen.style.cssText = 'margin-top:14px;padding:0;border:0;background:none;' +
    'color:var(--sd-chu-vua,#6a625a);font-size:13px;text-decoration:underline;cursor:pointer';

  const form = document.createElement('form');
  form.append(oEmail.boc, oMatKhau.boc, nut, loi, quen);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    keLoi(null);
    dat(false, 'Đang đăng nhập…');

    const kq = await sb.dangNhap(oEmail.o.value, oMatKhau.o.value);

    if (!kq.ok) {
      dat(true, 'Đăng nhập');
      keLoi(kq.loi);
      oMatKhau.o.focus();
      oMatKhau.o.select();
      return;
    }
    if (typeof khiXong === 'function') khiXong();
  });

  quen.addEventListener('click', async () => {
    const email = String(oEmail.o.value || '').trim();
    if (!email) { keLoi('Gõ email vào ô trên trước, rồi bấm lại.'); return; }

    quen.disabled = true;
    const kq = await sb.quenMatKhau(email);
    quen.disabled = false;

    keLoi(kq.ok
      ? null
      : kq.loi);
    if (kq.ok) {
      loi.hidden = false;
      loi.style.color = 'var(--sd-chu,#2a2622)';
      loi.textContent = 'Nếu email này có tài khoản, thư đặt lại mật khẩu ' +
                        'vừa được gửi. Mở hộp thư và làm theo hướng dẫn.';
    }
  });

  containerEl.append(khung([
    tieuDe('Gia phả'),
    doan('Đăng nhập bằng email và mật khẩu chủ dự án đã cấp cho bạn.'),
    form,
    nhoMo('Chưa có tài khoản thì liên hệ người quản lý gia phả — trang này ' +
          'không tự đăng ký được.'),
  ]));

  oEmail.o.focus();

  function dat(baatDuoc, chu) {
    nut.disabled = !baatDuoc;
    nut.textContent = chu;
  }
  function keLoi(chu) {
    loi.hidden = !chu;
    loi.style.color = '#c62828';
    loi.textContent = chu || '';
  }
}

function oNhap(kieu, nhan, tuDien) {
  const boc = document.createElement('label');
  boc.style.cssText = 'display:block;margin-top:14px';

  const chu = document.createElement('span');
  chu.textContent = nhan;
  chu.style.cssText = 'display:block;font-size:13px;color:var(--sd-chu-vua,#6a625a);margin-bottom:5px';

  const o = document.createElement('input');
  o.type = kieu;
  o.required = true;
  o.autocomplete = tuDien;
  o.style.cssText = 'width:100%;box-sizing:border-box;padding:11px 12px;' +
    'font-size:16px;border:1px solid var(--sd-vien-dam,#c8bfb2);border-radius:8px;background:var(--sd-giay,#fff)';

  boc.append(chu, o);
  return { boc, o };
}

function khung(phanTu) {
  const d = document.createElement('div');
  d.style.cssText = 'max-width:' + rongHop(360, 420) + ';' +
                    'margin:0 auto;padding:48px 24px;' +
                    'font-family:system-ui,sans-serif;color:var(--sd-chu,#2a2622);' +
                    'line-height:1.6';
  phanTu.filter(Boolean).forEach((x) => d.append(x));
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

function nhoMo(chu) {
  const p = document.createElement('p');
  p.textContent = chu;
  p.style.cssText = 'margin:20px 0 0;font-size:13px;color:var(--sd-chu-phu,#8a8078)';
  return p;
}
