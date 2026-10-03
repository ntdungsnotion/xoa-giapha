const CHO_GO = 180;

const TOI_THIEU = 2;

export function ganGoiY(oNhap, { tim, ve, giaTri, khiChon }) {
  let bang = null;
  let ds = [];
  let dang = -1;
  let dongHo = null;
  let soLuot = 0;
  let cacDong = [];
  let boQuaLuotSau = false;

  function dong() {
    if (bang) { bang.remove(); bang = null; }
    ds = [];
    cacDong = [];
    dang = -1;
  }

  function datCho() {
    if (!bang) return;
    const h = oNhap.getBoundingClientRect();
    bang.style.left = h.left + 'px';
    bang.style.top = (h.bottom + 2) + 'px';
    bang.style.width = Math.max(h.width, 240) + 'px';
  }

  function kieuDong(i, mo) {
    return 'padding:7px 10px;cursor:pointer;border-bottom:1px solid #f0ebe3;' +
      (i === dang ? 'background:#f2ece2;' : '') +
      (mo ? 'opacity:.62;' : '');
  }

  function toSang() {
    cacDong.forEach((d, i) => { d.style.cssText = kieuDong(i, d.dataset.mo === '1'); });
    const d = cacDong[dang];
    if (d && d.scrollIntoView) d.scrollIntoView({ block: 'nearest' });
  }

  function veBang() {
    if (!bang) {
      bang = document.createElement('div');
      bang.style.cssText =
        'position:fixed;z-index:9999;max-height:246px;overflow-y:auto;' +
        'background:#fffdf9;border:1px solid #c9c0b4;border-radius:8px;' +
        'box-shadow:0 6px 18px rgba(42,38,34,.16);font-size:12px;' +
        'color:#2a2622';
      document.body.append(bang);
    }
    bang.innerHTML = '';
    cacDong = [];

    ds.forEach((muc, i) => {
      const { chinh, phu, mo } = ve(muc);

      const d = document.createElement('div');
      d.dataset.mo = mo ? '1' : '0';
      d.style.cssText = kieuDong(i, mo);

      const c1 = document.createElement('div');
      c1.textContent = chinh;
      c1.style.cssText = 'font-weight:600';

      d.append(c1);
      if (phu) {
        const c2 = document.createElement('div');
        c2.textContent = phu;
        c2.style.cssText = 'font-size:11px;color:#6a625a;margin-top:1px';
        d.append(c2);
      }

      d.addEventListener('mousedown', (e) => { e.preventDefault(); chon(i); });
      d.addEventListener('click', (e) => { e.preventDefault(); chon(i); });
      d.addEventListener('mouseenter', () => {
        if (dang === i) return;
        dang = i;
        toSang();
      });

      bang.append(d);
      cacDong.push(d);
    });

    datCho();
  }

  function chon(i) {
    const muc = ds[i];
    if (!muc) return;
    oNhap.value = giaTri(muc);
    dong();
    if (khiChon) khiChon(muc);
    boQuaLuotSau = true;
    oNhap.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function hoi() {
    const chuoi = oNhap.value.trim();
    if (chuoi.length < TOI_THIEU) { dong(); return; }

    const luot = ++soLuot;
    let kq;
    try {
      kq = await tim(chuoi);
    } catch (e) {
      kq = [];
    }
    if (luot !== soLuot) return;

    ds = Array.isArray(kq) ? kq : [];
    dang = -1;
    if (ds.length === 0) { dong(); return; }
    veBang();
  }

  function khiGo() {
    if (boQuaLuotSau) { boQuaLuotSau = false; return; }
    if (dongHo) clearTimeout(dongHo);
    dongHo = setTimeout(hoi, CHO_GO);
  }

  function khiPhim(e) {
    if (!bang || ds.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      dang = (dang + 1) % ds.length;
      toSang();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      dang = (dang <= 0 ? ds.length : dang) - 1;
      toSang();
    } else if (e.key === 'Enter') {
      if (dang >= 0) { e.preventDefault(); chon(dang); }
    } else if (e.key === 'Escape') {
      dong();
    }
  }

  const khiRoi = () => dong();
  const khiCuon = () => { if (bang) datCho(); };
  const vv = window.visualViewport;

  oNhap.addEventListener('input', khiGo);
  oNhap.addEventListener('keydown', khiPhim);
  oNhap.addEventListener('blur', khiRoi);
  window.addEventListener('scroll', khiCuon, true);
  window.addEventListener('resize', khiCuon);
  if (vv) {
    vv.addEventListener('resize', khiCuon);
    vv.addEventListener('scroll', khiCuon);
  }

  return function go() {
    if (dongHo) clearTimeout(dongHo);
    dong();
    oNhap.removeEventListener('input', khiGo);
    oNhap.removeEventListener('keydown', khiPhim);
    oNhap.removeEventListener('blur', khiRoi);
    window.removeEventListener('scroll', khiCuon, true);
    window.removeEventListener('resize', khiCuon);
    if (vv) {
      vv.removeEventListener('resize', khiCuon);
      vv.removeEventListener('scroll', khiCuon);
    }
  };
}

export function dongTaiKhoan(m) {
  const noi = {
    chinh_minh: 'chính bạn — không tự mời mình được',
    thanh_vien: 'đã có tên trong gia phả này',
    cho_duyet: 'đang có đơn xin vào — duyệt đơn ấy, đừng mời lại',
    da_moi: 'đã mời rồi, đang chờ nhận lời',
  }[m.trangThai] || '';

  const duoi = [m.email, noi].filter(Boolean).join('  ·  ');

  return {
    chinh: m.hoTen || m.email,
    phu: m.hoTen ? duoi : noi,
    mo: m.trangThai !== 'chua',
  };
}

export function dongNguoi(m) {
  const nam = (m.namSinh || m.namMat)
    ? '(' + (m.namSinh || '?') + '–' + (m.namMat || '') + ')'
    : '';

  const phu = [m.maNguoi, nam,
    m.ganChoEmail ? 'đã gắn cho ' + m.ganChoEmail : '']
    .filter(Boolean).join('  ·  ');

  return { chinh: m.ten, phu, mo: Boolean(m.ganChoEmail) };
}

export function dongNguoiCayKhac(m) {
  const nam = (m.namSinh || m.namMat)
    ? '(' + (m.namSinh || '?') + '–' + (m.namMat || '') + ')'
    : '';

  const phu = [m.maNguoi, nam,
    m.cacCay ? 'đã có ở: ' + m.cacCay : '']
    .filter(Boolean).join('  ·  ');

  return { chinh: m.ten, phu, mo: false };
}
