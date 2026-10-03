import { removeDiacritics } from './text.js';

const TIEN_TO   = ['P', 'U', 'M', 'S'];
const MANG      = ['persons', 'unions', 'media', 'sources'];
const SO_CHU_SO = 4;

const KHUON_UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const KHUON_MA_CAY = /^[A-Z][A-Z0-9]{0,13}$/;

const KHUON_ID = /^(?:[A-Z][A-Z0-9]{0,13}_)?[PUMS][0-9]{4,}$/;

const MOI_MA = /(?:[A-Z][A-Z0-9]{0,13}_)?[PUMS][0-9]{4,}/g;

export function tachMa(id) {
  if (typeof id !== 'string' || !KHUON_ID.test(id)) return null;
  const vach = id.lastIndexOf('_');
  const than = vach === -1 ? id : id.slice(vach + 1);
  return {
    maCay: vach === -1 ? '' : id.slice(0, vach),
    loai:  than.charAt(0),
    so:    Number(than.slice(1)),
  };
}

export function loaiCua(id) {
  const p = tachMa(id);
  return p ? p.loai : '';
}

export function maCayCua(id) {
  const p = tachMa(id);
  return p ? p.maCay : '';
}

const KHO = { P: [], U: [], M: [] };

export function napKho(loai, ds) {
  const chu = String(loai == null ? '' : loai).trim().toUpperCase();
  if (!KHO[chu] || !Array.isArray(ds)) return;
  for (const ma of ds) if (typeof ma === 'string' && KHUON_ID.test(ma)) KHO[chu].push(ma);
}

export function soMaTrongKho(loai) {
  const chu = String(loai == null ? '' : loai).trim().toUpperCase();
  return KHO[chu] ? KHO[chu].length : 0;
}

export function nextId(prefix, tree) {
  const chu = String(prefix == null ? '' : prefix).trim().toUpperCase();
  if (TIEN_TO.indexOf(chu) === -1) {
    throw new Error('Tiền tố ID không hợp lệ: "' + prefix + '". ' +
                    'Chỉ có P (người), U (hôn nhân), M (ảnh), S (nguồn).');
  }
  if (KHO[chu] && KHO[chu].length) return KHO[chu].shift();

  const so = soLonNhatDaDung(chu, tree) + 1;
  let phanSo = String(so);
  while (phanSo.length < SO_CHU_SO) phanSo = '0' + phanSo;
  return chu + phanSo;
}

export function isValidId(id) {
  return typeof id === 'string' && KHUON_ID.test(id);
}

export function maCayCuaCay(tree) {
  const t = tree && typeof tree === 'object' ? tree.tree : null;
  const ma = t && typeof t.treeCode === 'string' ? t.treeCode : '';
  return KHUON_MA_CAY.test(ma) ? ma : '';
}

const SO_BAM = '23456789';

const TU_BO = ['gia', 'pha', 'ho', 'dong', 'toc', 'cua', 'chi', 'nhanh',
               'ban', 'cay', 'family', 'tree'];

export function sinhMaCay(ten, hat) {
  return phanDocDuoc(ten) + phanPhanBiet(String(hat == null ? '' : hat));
}

function phanDocDuoc(ten) {
  const sach = removeDiacritics(String(ten == null ? '' : ten))
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!sach) return 'GP';

  const chuCai = [];
  for (const tu of sach.split(' ')) {
    if (!tu || TU_BO.indexOf(tu) !== -1) continue;
    const c = tu.charAt(0).toUpperCase();
    if (c >= 'A' && c <= 'Z') chuCai.push(c);
    if (chuCai.length === 4) break;
  }
  return chuCai.length ? chuCai.join('') : 'GP';
}

function phanPhanBiet(hat) {
  const h = bam(hat, 2166136261);
  const lay = (dich) => SO_BAM.charAt(Math.floor(h / dich) % SO_BAM.length);
  return lay(1) + lay(32) + lay(512);
}

export function sinhUid(maCay, id) {
  const hat = String(maCay == null ? '' : maCay) + '|' + String(id == null ? '' : id);
  const k = [bam(hat, 2166136261), bam(hat, 271828183),
             bam(hat, 314159265), bam(hat, 987654321)];
  const hex = k.map((n) => n.toString(16).padStart(8, '0')).join('');

  const c = hex.split('');
  c[12] = '8';
  c[16] = '89ab'.charAt(parseInt(c[16], 16) % 4);
  const h = c.join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
         h.slice(16, 20) + '-' + h.slice(20, 32);
}

export function laUid(x) {
  return typeof x === 'string' && KHUON_UID.test(x);
}

export function chuanUid(x) {
  const s = String(x == null ? '' : x).trim().toLowerCase();
  if (KHUON_UID.test(s)) return s;
  const tron = s.replace(/[^0-9a-f]/g, '');
  const h = tron.length === 36 ? tron.slice(0, 32) : tron;
  if (h.length !== 32) return '';
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' +
         h.slice(16, 20) + '-' + h.slice(20, 32);
}

function bam(chuoi, mo) {
  let h = mo >>> 0;
  for (let i = 0; i < chuoi.length; i++) {
    h ^= chuoi.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function soLonNhatDaDung(chu, tree) {
  let lonNhat = 0;
  const nhin = (chuoi) => {
    if (typeof chuoi !== 'string' || chuoi === '') return;
    const cacMa = chuoi.match(MOI_MA);
    if (!cacMa) return;
    for (const ma of cacMa) {
      const p = tachMa(ma);
      if (!p || p.loai !== chu) continue;
      if (Number.isFinite(p.so) && p.so > lonNhat) lonNhat = p.so;
    }
  };

  if (!tree || typeof tree !== 'object') return lonNhat;

  for (const ten of MANG) {
    const ds = Array.isArray(tree[ten]) ? tree[ten] : [];
    for (const banGhi of ds) if (banGhi) nhin(banGhi.id);
  }

  const nhatKy = Array.isArray(tree.changeLog) ? tree.changeLog : [];
  for (const muc of nhatKy) {
    if (!muc || typeof muc !== 'object') continue;
    nhin(muc.target);
    if (muc.diff && typeof muc.diff === 'object') {
      for (const khoa of Object.keys(muc.diff)) nhin(khoa);
    }
  }

  return lonNhat;
}
