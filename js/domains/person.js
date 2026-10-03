import { fullName, coGiaTri, removeDiacritics, doiSongNguoi } from '../utils/text.js';
import { parseLooseDate } from '../utils/date.js';
import { nextId, sinhUid, maCayCuaCay } from '../utils/id.js';

export function createPerson(tree, data, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons)) return null;

  const ma  = nextId('P', tree);
  const luc = (ghiNhan && coGiaTri(ghiNhan.luc)) ? String(ghiNhan.luc) : '';
  const boi = (ghiNhan && coGiaTri(ghiNhan.boi)) ? String(ghiNhan.boi) : '';

  const tron = {
    id:    ma,
    uid:   sinhUid(maCayCuaCay(tree), ma),
    names: [],
    sex:   'U',
    birth: { iso: null, raw: '', place: '' },
    death: { iso: null, raw: '', place: '' },
    burialPlace: '',

    title:       '',
    occupation:  '',
    education:   '',
    religion:    '',
    residence:   '',
    nationality: '',
    contact:     '',

    living:      true,
    photoFileId: '',
    note:        '',
    deleted:     false,
    meta:        { createdAt: luc, updatedAt: luc, updatedBy: boi },
  };

  const cayTron = Object.assign({}, tree, { persons: tree.persons.concat([tron]) });
  const kq = updatePerson(cayTron, ma, data || {}, ghiNhan);
  if (!kq) return null;

  return { tree: kq.tree, person: kq.person, diff: kq.diff };
}

export function updatePerson(tree, personId, changes, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !personId) return null;

  const cu = tree.persons.find((p) => p && p.id === personId);
  if (!cu) return null;

  const moi  = JSON.parse(JSON.stringify(cu));
  const diff = {};
  const ch   = changes || {};
  const ghi  = (duong, truoc, sau) => { diff[personId + '.' + duong] = [truoc, sau]; };

  if (ch.name) datTenChinh(moi, ch.name, ghi);
  datTenPhu(moi, ch.altNames, ghi);

  datChuoi(moi, 'sex',         ch.sex,         ghi);
  datChuoi(moi, 'burialPlace', ch.burialPlace, ghi);
  datChuoi(moi, 'note',        ch.note,        ghi);

  datChuoi(moi, 'title',       ch.title,       ghi);
  datChuoi(moi, 'occupation',  ch.occupation,  ghi);
  datChuoi(moi, 'education',   ch.education,   ghi);
  datChuoi(moi, 'religion',    ch.religion,    ghi);
  datChuoi(moi, 'residence',   ch.residence,   ghi);
  datChuoi(moi, 'nationality', ch.nationality, ghi);
  datChuoi(moi, 'contact',     ch.contact,     ghi);

  if (ch.living !== undefined) {
    const sau = ch.living === true;
    if (moi.living !== sau) { ghi('living', moi.living, sau); moi.living = sau; }
  }

  datKhoiNgay(moi, 'birth', ch.birth, ghi);
  datKhoiNgay(moi, 'death', ch.death, ghi);
  datNgayGio(moi, ch.gio, ghi);
  datDoi(moi, ch.doi, ghi);
  datVnChuoi(moi, 'branch', ch.chi, ghi);

  const thayDoi = Object.keys(diff).length > 0;

  if (thayDoi) {
    if (!moi.meta || typeof moi.meta !== 'object') moi.meta = {};
    if (ghiNhan && coGiaTri(ghiNhan.luc)) moi.meta.updatedAt = String(ghiNhan.luc);
    if (ghiNhan && coGiaTri(ghiNhan.boi)) moi.meta.updatedBy = String(ghiNhan.boi);
  }

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? moi : p)),
  });

  return { tree: cayMoi, person: moi, diff, thayDoi };
}

function datTenChinh(nguoi, ten, ghi) {
  if (!Array.isArray(nguoi.names)) nguoi.names = [];
  let muc = nguoi.names.find((n) => n && n.type === 'chinh') || nguoi.names[0];
  if (!muc) {
    muc = { type: 'chinh', surname: '', middle: '', given: '' };
    nguoi.names.push(muc);
  }

  const truoc = fullName(muc);
  for (const khoa of ['surname', 'middle', 'given']) {
    if (ten[khoa] === undefined) continue;
    muc[khoa] = String(ten[khoa]).trim();
  }
  const sau = fullName(muc);
  if (truoc !== sau) ghi('names.chinh', truoc, sau);
}

function datTenPhu(nguoi, danhSach, ghi) {
  if (danhSach === undefined) return;
  if (!Array.isArray(nguoi.names)) nguoi.names = [];

  const chinh = nguoi.names.find((n) => n && n.type === 'chinh') || nguoi.names[0] || null;

  const sach = [];
  for (const m of (Array.isArray(danhSach) ? danhSach : [])) {
    if (!m || typeof m !== 'object') continue;
    const muc = {
      type:    chuanLoaiTenPhu(m.type),
      surname: m.surname === undefined || m.surname === null ? '' : String(m.surname).trim(),
      middle:  m.middle  === undefined || m.middle  === null ? '' : String(m.middle).trim(),
      given:   m.given   === undefined || m.given   === null ? '' : String(m.given).trim(),
    };
    if (!coGiaTri(fullName(muc))) continue;
    sach.push(muc);
  }

  const truoc = keTenPhu(nguoi.names, chinh);
  const sau   = keTenPhu(sach, null);
  if (truoc === sau) return;

  if (chinh) nguoi.names = [chinh].concat(sach);
  else if (sach.length) nguoi.names = [{ type: 'chinh', surname: '', middle: '', given: '' }].concat(sach);
  else nguoi.names = [];

  ghi('names.phu', truoc, sau);
}

function chuanLoaiTenPhu(loai) {
  const t = String(loai === undefined || loai === null ? '' : loai).trim();
  if (t === '' || t === 'chinh') return 'khac';
  return t;
}

function keTenPhu(danhSach, boQua) {
  return (Array.isArray(danhSach) ? danhSach : [])
    .filter((n) => n && n !== boQua)
    .map((n) => String(n.type || '') + ':' + fullName(n))
    .join(' · ');
}

function datNgayGio(nguoi, giaTri, ghi) {
  if (giaTri === undefined) return;

  const sau   = String(giaTri).trim();
  const truoc = (nguoi.vn && typeof nguoi.vn.gio === 'string') ? nguoi.vn.gio : '';
  if (truoc === sau) return;

  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  nguoi.vn.gio = sau;
  ghi('vn.gio', truoc, sau);
}

function datDoi(nguoi, giaTri, ghi) {
  if (giaTri === undefined) return;

  const chu   = String(giaTri).trim();
  const truoc = (nguoi.vn && Number.isFinite(Number(nguoi.vn.generation)) &&
                 Number(nguoi.vn.generation) > 0)
    ? Number(nguoi.vn.generation) : null;

  let sau = null;
  if (chu !== '') {
    const n = Number(chu);
    if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) return;
    sau = n;
  }

  if (truoc === sau) return;
  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  if (sau === null) delete nguoi.vn.generation;
  else nguoi.vn.generation = sau;
  ghi('vn.generation', truoc === null ? '' : truoc, sau === null ? '' : sau);
}

function datVnChuoi(nguoi, khoa, giaTri, ghi) {
  if (giaTri === undefined) return;

  const sau   = giaTri === null ? '' : String(giaTri).trim();
  const truoc = (nguoi.vn && typeof nguoi.vn[khoa] === 'string') ? nguoi.vn[khoa] : '';
  if (truoc === sau) return;

  if (!nguoi.vn || typeof nguoi.vn !== 'object') nguoi.vn = {};
  nguoi.vn[khoa] = sau;
  ghi('vn.' + khoa, truoc, sau);
}

function datChuoi(nguoi, khoa, giaTri, ghi) {
  if (giaTri === undefined) return;
  const sau = giaTri === null ? '' : String(giaTri).trim();
  const truoc = typeof nguoi[khoa] === 'string' ? nguoi[khoa] : '';
  if (truoc === sau) return;
  ghi(khoa, truoc, sau);
  nguoi[khoa] = sau;
}

function datKhoiNgay(nguoi, khoa, khoi, ghi) {
  if (!khoi || typeof khoi !== 'object') return;
  if (!nguoi[khoa] || typeof nguoi[khoa] !== 'object') {
    nguoi[khoa] = { iso: null, raw: '', place: '' };
  }
  const o = nguoi[khoa];

  if (khoi.raw !== undefined) {
    const sau = khoi.raw === null ? '' : String(khoi.raw).trim();
    const truoc = typeof o.raw === 'string' ? o.raw : '';
    if (truoc !== sau) {
      ghi(khoa + '.raw', truoc, sau);
      o.raw = sau;

      const isoCu = coGiaTri(o.iso) ? o.iso : null;
      const isoMoi = khoi.iso !== undefined
        ? (coGiaTri(khoi.iso) ? String(khoi.iso).trim() : null)
        : parseLooseDate(sau).iso;
      if (isoCu !== isoMoi) {
        ghi(khoa + '.iso', isoCu, isoMoi);
        o.iso = isoMoi;
      }
    }
  }

  if (khoi.place !== undefined) {
    const sau = khoi.place === null ? '' : String(khoi.place).trim();
    const truoc = typeof o.place === 'string' ? o.place : '';
    if (truoc !== sau) { ghi(khoa + '.place', truoc, sau); o.place = sau; }
  }
}

export function softDeletePerson(tree, personId, ghiNhan) {
  return datCoXoa(tree, personId, true, ghiNhan);
}

export function restorePerson(tree, personId, ghiNhan) {
  return datCoXoa(tree, personId, false, ghiNhan);
}

function datCoXoa(tree, personId, coXoa, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !personId) return null;

  const cu = tree.persons.find((p) => p && p.id === personId);
  if (!cu) return null;

  const truoc = cu.deleted === true;
  if (truoc === coXoa) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = coXoa;

  if (!moi.meta || typeof moi.meta !== 'object') moi.meta = {};
  if (ghiNhan && coGiaTri(ghiNhan.luc)) moi.meta.updatedAt = String(ghiNhan.luc);
  if (ghiNhan && coGiaTri(ghiNhan.boi)) moi.meta.updatedBy = String(ghiNhan.boi);

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? moi : p)),
  });

  const diff = {};
  diff[personId + '.deleted'] = [truoc, coXoa];

  return { tree: cayMoi, person: moi, diff };
}

export function getDisplayName(person) {
  return fullName(person);
}

export function getAlternateNames(person) {
  const ds = (person && Array.isArray(person.names)) ? person.names : [];
  const coChinh = ds.some((n) => n && n.type === 'chinh');
  const ra = [];

  ds.forEach((n, i) => {
    if (!n) return;
    if (coChinh ? n.type === 'chinh' : i === 0) return;
    const ten = fullName(n);
    if (!coGiaTri(ten)) return;
    ra.push({ loai: coGiaTri(n.type) ? String(n.type) : '', ten });
  });
  return ra;
}

export const TIM_TOI_DA = 200;

export function searchPersons(tree, keyword, tuyChon) {
  const ds  = (tree && Array.isArray(tree.persons)) ? tree.persons : [];
  const tuy = tuyChon || {};
  const gomDaXoa = tuy.gomDaXoa === true;
  const toiDa = Number.isFinite(tuy.toiDa) ? Math.max(0, Math.trunc(tuy.toiDa)) : TIM_TOI_DA;

  const kim = removeDiacritics(typeof keyword === 'string' ? keyword : '').trim();

  let tongNguoi = 0;
  const khop = [];

  for (const p of ds) {
    if (!p || !p.id) continue;
    if (!gomDaXoa && p.deleted === true) continue;
    tongNguoi++;

    const m = doHang(p, kim);
    if (!m) continue;

    khop.push({
      id:      p.id,
      person:  p,
      ten:     fullName(p),
      doiSong: doiSongNguoi(p),
      deleted: p.deleted === true,
      hang:    m.hang,
      khop:    m.khop,
      tenKhac: m.tenKhac || '',
    });
  }

  khop.sort((a, b) => {
    if (a.hang !== b.hang) return a.hang - b.hang;
    const ca = a.ten === '' ? 1 : 0;
    const cb = b.ten === '' ? 1 : 0;
    if (ca !== cb) return ca - cb;
    const t = a.ten.localeCompare(b.ten, 'vi');
    if (t !== 0) return t;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });

  const ket = toiDa > 0 ? khop.slice(0, toiDa) : khop;
  return { ket, tongKhop: khop.length, tongNguoi, conThua: khop.length - ket.length };
}

function doHang(p, kim) {
  const tenPhang = removeDiacritics(fullName(p));
  if (kim === '') return { hang: 1, khop: 'ten' };

  const maPhang = String(p.id).toLowerCase();
  if (maPhang === kim) return { hang: 0, khop: 'ma' };

  if (tenPhang !== '') {
    for (const tieng of tenPhang.split(/\s+/)) {
      if (tieng !== '' && tieng.indexOf(kim) === 0) return { hang: 1, khop: 'ten' };
    }
    if (tenPhang.indexOf(kim) !== -1) return { hang: 2, khop: 'ten' };
  }

  for (const k of getAlternateNames(p)) {
    if (removeDiacritics(k.ten).indexOf(kim) !== -1) {
      return { hang: 3, khop: 'tenKhac', tenKhac: k.ten };
    }
  }

  if (maPhang.indexOf(kim) !== -1) return { hang: 4, khop: 'ma' };
  return null;
}
