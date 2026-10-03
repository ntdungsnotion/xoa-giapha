export const TEN_VAI = {
  quan_tri: 'Quản trị gia phả',
  sua: 'Thành viên',
  xem: 'Khách',
  sao_luu: 'Tài khoản sao lưu',
};

export const CHON_VAI = [['quan_tri', TEN_VAI.quan_tri], ['sua', TEN_VAI.sua], ['xem', TEN_VAI.xem]];

export function td(...con) {
  const o = document.createElement('td');
  for (const c of con) if (c != null && c !== '') o.append(c);
  return o;
}

export function span(cls, chu) {
  const s = document.createElement('span');
  if (cls) s.className = cls;
  if (chu != null) s.textContent = chu;
  return s;
}

export function tenVaPhu(ten, phu) {
  const f = document.createDocumentFragment();
  if (ten) f.append(span('name', ten));
  if (phu) f.append(span('sub', phu));
  return f;
}

export function huyHieu(chu, kieu = '') {
  return span('badge' + (kieu ? ' ' + kieu : ''), chu);
}

export function datHuyHieu(el, chu, kieu = '') {
  el.className = 'badge' + (kieu ? ' ' + kieu : '');
  el.textContent = chu;
}

export function nut(chu, kieu = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn' + (kieu ? ' ' + kieu : '');
  b.textContent = chu;
  return b;
}

export function chepKieu(el, css) {
  el.style.cssText = css;
  return el;
}

export function nutNho(chu, kieu = '') {
  return chepKieu(nut(chu, kieu), 'font-size:11px;padding:2px 7px');
}

export function lienKet(chu, hash) {
  return nutLink(chu, () => { window.location.hash = hash.replace(/^#/, ''); });
}

export function nutLink(chu, bam) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link';
  b.textContent = chu;
  if (bam) b.addEventListener('click', bam);
  return b;
}

export function nutMo(chu, lyDo, kieu = '') {
  const b = nut(chu, kieu);
  b.disabled = true;
  b.title = lyDo;
  return b;
}

export function mucMenu(chu, lyDo, bam, kieu = '') {
  if (lyDo) return nutMo(chu, lyDo, kieu);
  const b = nut(chu, kieu);
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.action-options')) x.hidden = true;
    bam();
  });
  return b;
}

export function chuaCo(chu, lyDo) {
  const s = span('muted', chu);
  if (lyDo) s.title = lyDo;
  return s;
}

export function hangNut(...ds) {
  const d = document.createElement('div');
  d.className = 'row-actions';
  d.append(...ds.filter(Boolean));
  return d;
}

export function dongLoi(chu) {
  return span('loi-dong', chu);
}

export function menuTuyChon(chu, dsNut) {
  const hop = document.createElement('div');
  hop.className = 'action-menu';
  const mo = nut(chu);
  mo.setAttribute('data-action-toggle', '');
  const ds = document.createElement('div');
  ds.className = 'action-options';
  ds.hidden = true;
  for (const b of dsNut) {
    if (b) { ds.append(b); continue; }
    ds.append(chepKieu(document.createElement('div'), 'border-top:1px solid var(--line);margin:3px 0'));
  }
  mo.addEventListener('click', (e) => {
    e.stopPropagation();
    for (const x of document.querySelectorAll('.action-options')) if (x !== ds) x.hidden = true;
    ds.hidden = !ds.hidden;
  });
  hop.append(mo, ds);
  return hop;
}

document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('.action-menu')) return;
  for (const x of document.querySelectorAll('.action-options')) x.hidden = true;
});

export function dongTrong(tbody, soCot, chu, thuLai) {
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  tr.className = 'dong-trong';
  const o = document.createElement('td');
  o.colSpan = soCot;
  o.textContent = chu;
  if (thuLai) {
    const b = nut('Thử lại');
    b.style.marginLeft = '10px';
    b.addEventListener('click', thuLai);
    o.append(b);
  }
  tr.append(o);
  tbody.append(tr);
  return o;
}

export function chuDau(hoTen, email) {
  const tu = String(hoTen || '').trim().split(/\s+/).filter(Boolean);
  const chu = tu.length >= 2 ? tu[0][0] + tu[tu.length - 1][0] : (tu[0] || email || '?').slice(0, 2);
  return chu.toUpperCase();
}

function phan(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const p = {};
  for (const x of new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(t)) p[x.type] = x.value;
  return p;
}

export function ngay(iso) {
  const p = iso && phan(iso);
  return p ? p.day + '/' + p.month + '/' + p.year : '';
}

export function ngayGio(iso) {
  const p = iso && phan(iso);
  return p ? p.day + '/' + p.month + '/' + p.year + ' ' + p.hour + ':' + p.minute : '';
}
