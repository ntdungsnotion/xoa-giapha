import { calcAge } from './date.js';

export function removeDiacritics(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function matchesSearch(haystack, needle) {
  const kim = removeDiacritics(needle).trim();
  if (kim === '') return true;
  return removeDiacritics(haystack).indexOf(kim) !== -1;
}

export function fullName(nameObj) {
  if (!nameObj || typeof nameObj !== 'object') return '';

  if (Array.isArray(nameObj.names)) {
    const ds = nameObj.names;
    const chinh = ds.find((n) => n && n.type === 'chinh') || ds[0];
    return fullName(chinh);
  }

  return [nameObj.surname, nameObj.middle, nameObj.given]
    .filter(coGiaTri)
    .map((phan) => String(phan).trim())
    .join(' ');
}

export function coGiaTri(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

export function doiSongNguoi(person) {
  if (!person || typeof person !== 'object') return '';
  const sinh = namCua(person.birth);
  const mat  = namCua(person.death);

  if (sinh && mat) return sinh + ' – ' + mat;
  if (sinh)        return sinh;
  if (mat)         return '– ' + mat;
  return '';
}

export function doiSongTuoi(person) {
  const doi = doiSongNguoi(person);
  if (!doi) return '';
  if (!person || typeof person !== 'object') return doi;

  const t = calcAge(person.birth, person.death, person.living);
  if (!t || !isFinite(t.tuoi)) return doi;

  return doi + ' (' + (t.denHomNay ? 'tuổi ' : 'ở tuổi ') + t.tuoi + ')';
}

export function ngayGio(person) {
  const gio = person && person.vn && person.vn.gio;
  return coGiaTri(gio) ? String(gio).trim() : '';
}

export function dongOChu(person, id, hienGio) {
  const ra = [{ loai: 'ten', chu: fullName(person) || String(id || '') }];
  const nam = doiSongNguoi(person);
  if (nam) ra.push({ loai: 'nam', chu: nam });
  const gio = hienGio ? ngayGio(person) : '';
  if (gio) ra.push({ loai: 'gio', chu: 'Giỗ: ' + gio });
  return ra;
}

function namCua(khoiNgay) {
  if (!khoiNgay || typeof khoiNgay !== 'object') return '';
  for (const nguon of [khoiNgay.iso, khoiNgay.raw]) {
    if (!coGiaTri(nguon)) continue;
    const khop = String(nguon).match(/\d{4}/);
    if (khop) return khop[0];
  }
  return '';
}
