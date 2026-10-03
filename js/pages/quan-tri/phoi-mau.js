const KHOA_LUU = 'giapha_phoi_mau';
const MAC_DINH = 'goc';
const KHOANG_CACH_NUT = 14;
const LE_MAN_HINH = 12;

function docDaLuu() {
  try { return localStorage.getItem(KHOA_LUU) || MAC_DINH; } catch (e) { return MAC_DINH; }
}

function apDung(ma) {
  const goc = document.documentElement;
  if (ma === MAC_DINH) goc.removeAttribute('data-theme');
  else goc.setAttribute('data-theme', ma);
  try {
    if (ma === MAC_DINH) localStorage.removeItem(KHOA_LUU);
    else localStorage.setItem(KHOA_LUU, ma);
  } catch (e) {   }
}

export function ganNutPhoiMau(app) {
  const khoi = app.querySelector('.pm-khoi');
  if (!khoi) return;
  const nut = khoi.querySelector('.pm-nut');
  const bang = khoi.querySelector('.pm-bang');
  const dangDung = khoi.querySelector('.pm-dang-dung');
  const cacMuc = [...khoi.querySelectorAll('.pm-muc[data-ma]')];
  document.body.append(bang);
  const trongKhoi = (el) => khoi.contains(el) || bang.contains(el);
  const tenCua = (ma) => {
    const m = cacMuc.find((x) => x.dataset.ma === ma);
    return m ? m.textContent.trim() : '';
  };

  const danhDau = (ma) => {
    for (const m of cacMuc) m.classList.toggle('dang-chon', m.dataset.ma === ma);
    dangDung.textContent = 'Đang dùng: ' + tenCua(ma);
  };

  let dangChon = docDaLuu();
  if (!tenCua(dangChon)) dangChon = MAC_DINH;
  apDung(dangChon);
  danhDau(dangChon);

  function dinhVi() {
    if (bang.hidden) return;
    const r = nut.getBoundingClientRect();
    const cao = bang.offsetHeight;
    const rong = bang.offsetWidth;
    let tren = r.bottom - cao;
    if (tren + cao > window.innerHeight - LE_MAN_HINH) tren = window.innerHeight - LE_MAN_HINH - cao;
    if (tren < LE_MAN_HINH) tren = LE_MAN_HINH;
    let trai = r.right + KHOANG_CACH_NUT;
    if (trai + rong > window.innerWidth - LE_MAN_HINH) trai = Math.max(LE_MAN_HINH, window.innerWidth - LE_MAN_HINH - rong);
    bang.style.top = tren + 'px';
    bang.style.left = trai + 'px';
  }

  function mo() {
    bang.hidden = false;
    nut.setAttribute('aria-expanded', 'true');
    dinhVi();
  }
  function dong() {
    bang.hidden = true;
    nut.setAttribute('aria-expanded', 'false');
  }

  nut.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bang.hidden) mo(); else dong();
  });
  bang.querySelector('.pm-dong').addEventListener('click', dong);
  for (const m of cacMuc) {
    m.addEventListener('click', () => {
      apDung(m.dataset.ma);
      danhDau(m.dataset.ma);
      dong();
    });
  }
  document.addEventListener('click', (e) => { if (!trongKhoi(e.target)) dong(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dong(); });
  window.addEventListener('resize', dinhVi, { passive: true });
}
