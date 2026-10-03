export function parseLooseDate(text) {
  const chuoi = typeof text === 'string' ? text.trim() : '';
  if (chuoi === '') return { iso: null, confident: false };

  const uocChung = TU_UOC_CHUNG.test(chuoi);
  const chac = (iso) => ({ iso, confident: !uocChung });
  const doan = (iso) => ({ iso, confident: false });

  let m = chuoi.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return hopLe(+m[1], +m[2], +m[3]) ? chac(ghepIso(+m[1], +m[2], +m[3])) : doan(m[1]);
  m = chuoi.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return hopLe(+m[1], +m[2], 0) ? chac(ghepIso(+m[1], +m[2], 0)) : doan(m[1]);
  if (/^\d{4}$/.test(chuoi)) return chac(chuoi);

  m = chuoi.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return hopLe(+m[3], +m[2], +m[1]) ? chac(ghepIso(+m[3], +m[2], +m[1])) : doan(m[3]);

  m = chuoi.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) return hopLe(+m[2], +m[1], 0) ? chac(ghepIso(+m[2], +m[1], 0)) : doan(m[2]);

  const nam   = chuoi.match(/n[ăa]m\s*(\d{4})/i);
  const thang = chuoi.match(/th[áa]ng\s*(\d{1,2})/i);
  const ngay  = chuoi.match(/ng[àa]y\s*(\d{1,2})/i);
  const soNam = nam ? +nam[1] : (chuoi.match(/\d{4}/) ? +chuoi.match(/\d{4}/)[0] : 0);

  if (soNam && thang) {
    const t = +thang[1];
    const d = ngay ? +ngay[1] : 0;
    if (hopLe(soNam, t, d)) return chac(ghepIso(soNam, t, d));
    return doan(String(soNam));
  }

  if (soNam) return doan(String(soNam));
  return { iso: null, confident: false };
}

const TU_UOC_CHUNG = /kho[ảa]ng|[ướuo]{1,3}c\s|ch[ừu]ng|đ[ộo]\s|tr[ưu][ớo]c|sau|đ[ầa]u|gi[ữu]a|cu[ốo]i|\?|~/i;

function hopLe(nam, thang, ngay) {
  if (!nam || nam < 1 || nam > 3000) return false;
  if (thang && (thang < 1 || thang > 12)) return false;
  if (!ngay) return true;
  if (!thang) return false;
  const soNgayCuaThang = new Date(nam, thang, 0).getDate();
  return ngay >= 1 && ngay <= soNgayCuaThang;
}

function ghepIso(nam, thang, ngay) {
  const hai = (n) => String(n).padStart(2, '0');
  const n = String(nam).padStart(4, '0');
  if (!thang) return n;
  if (!ngay)  return n + '-' + hai(thang);
  return n + '-' + hai(thang) + '-' + hai(ngay);
}

export function formatDate(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  const raw = khoiNgay.raw;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();

  const iso = typeof khoiNgay.iso === 'string' ? khoiNgay.iso.trim() : '';
  const day = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return day[3] + '/' + day[2] + '/' + day[1];
  const thang = iso.match(/^(\d{4})-(\d{2})$/);
  if (thang) return 'tháng ' + Number(thang[2]) + '/' + thang[1];
  const nam = iso.match(/^(\d{4})$/);
  if (nam) return nam[1];
  return iso;
}

export function calcAge(birth, death, isLiving) {
  const sinh = mocNgay(birth);
  if (!sinh) return null;

  const mat = mocNgay(death);
  let denHomNay = false;
  let moc = mat;

  if (!moc) {
    if (isLiving !== true) return null;
    const nay = new Date();
    moc = { nam: nay.getFullYear(), thang: nay.getMonth() + 1, ngay: nay.getDate(), duNgay: true };
    denHomNay = true;
  }

  let tuoi = moc.nam - sinh.nam;
  if (sinh.thang && moc.thang) {
    if (moc.thang < sinh.thang) tuoi--;
    else if (moc.thang === sinh.thang && sinh.ngay && moc.ngay && moc.ngay < sinh.ngay) tuoi--;
  }

  if (tuoi < 0) return null;
  return { tuoi, xapXi: !(sinh.duNgay && moc.duNgay), denHomNay };
}

export function mocNgay(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return null;

  const iso = typeof khoiNgay.iso === 'string' ? khoiNgay.iso.trim() : '';
  const day = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return { nam: +day[1], thang: +day[2], ngay: +day[3], duNgay: true };
  const thang = iso.match(/^(\d{4})-(\d{2})$/);
  if (thang) return { nam: +thang[1], thang: +thang[2], ngay: 0, duNgay: false };

  for (const nguon of [iso, khoiNgay.raw]) {
    if (typeof nguon !== 'string') continue;
    const khop = nguon.match(/\d{4}/);
    if (khop) return { nam: +khop[0], thang: 0, ngay: 0, duNgay: false };
  }
  return null;
}

export function soSanhNgay(a, b) {
  const x = mocNgay(a);
  const y = mocNgay(b);
  if (!x || !y) return null;

  if (x.nam !== y.nam) return x.nam < y.nam ? -1 : 1;
  if (!x.thang || !y.thang) return null;
  if (x.thang !== y.thang) return x.thang < y.thang ? -1 : 1;
  if (!x.ngay || !y.ngay) return null;
  if (x.ngay !== y.ngay) return x.ngay < y.ngay ? -1 : 1;
  return 0;
}

export function chenhNam(a, b) {
  const x = mocNgay(a);
  const y = mocNgay(b);
  if (!x || !y) return null;
  return y.nam - x.nam;
}

export function stampNow(luc) {
  const d = luc instanceof Date ? luc : new Date();
  const hai = (n) => String(n).padStart(2, '0');
  return hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear() +
         ' ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
}
