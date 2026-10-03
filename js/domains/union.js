import { nextId, sinhUid, maCayCuaCay } from '../utils/id.js';
import { mocNgay, parseLooseDate } from '../utils/date.js';
import { QUAN_HE_CON_NHAN } from '../config.js';

export const QUAN_HE_CON = QUAN_HE_CON_NHAN.map((x) => x.ma);

export function rankCua(u, personId) {
  const r = u && u.ranks && Number(u.ranks[personId]);
  if (Number.isFinite(r) && r > 0) return r;
  const cu = u && Number(u.rank);
  return (Number.isFinite(cu) && cu > 0) ? cu : 1;
}

export function ranksRoRang(u) {
  const ra = {};
  if (!u || !u.ranks) return ra;
  for (const id of Object.keys(u.ranks)) {
    const n = Number(u.ranks[id]);
    if (Number.isInteger(n) && n > 1) ra[id] = n;
  }
  return ra;
}

function locRanks(tho, partners) {
  const ra = {};
  if (!tho || typeof tho !== 'object') return undefined;
  const cho = new Set((Array.isArray(partners) ? partners : []).filter(Boolean));
  for (const khoa of Object.keys(tho)) {
    if (!cho.has(khoa)) continue;
    const n = Number(tho[khoa]);
    if (Number.isFinite(n) && n > 1) ra[khoa] = Math.floor(n);
  }
  return Object.keys(ra).length > 0 ? ra : undefined;
}

export function createUnion(tree, partnerIds, data) {
  if (!tree || !Array.isArray(tree.unions) || !Array.isArray(tree.persons)) return null;

  const ds = Array.isArray(partnerIds) ? partnerIds.filter((id) => !!id) : [];
  if (ds.length === 0) return null;
  if (new Set(ds).size !== ds.length) return null;
  for (const id of ds) {
    if (!tree.persons.some((p) => p && p.id === id && !p.deleted)) return null;
  }

  const d  = data || {};
  const ma = nextId('U', tree);

  const union = {
    id:           ma,
    uid:          sinhUid(maCayCuaCay(tree), ma),
    partners:     ds.slice(),
    partnerOrder: ds.slice(),
    status:       typeof d.status === 'string' && d.status !== '' ? d.status : 'married',
    marriage: {
      iso:   chuoi(d.marriage && d.marriage.iso),
      raw:   chuoi(d.marriage && d.marriage.raw),
      place: chuoi(d.marriage && d.marriage.place),
    },
    children: [],
    note:     chuoi(d.note),
    deleted:  false,
  };

  const ranks = locRanks(d.ranks, ds);
  if (ranks) union.ranks = ranks;

  const cayMoi = Object.assign({}, tree, { unions: tree.unions.concat([union]) });
  const diff = {};
  diff[ma + '.partners'] = ['', ds.join(' + ')];

  return { tree: cayMoi, union, diff };
}

export function addChild(tree, unionId, personId, relation) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;
  if (!Array.isArray(tree.persons)) return null;
  if (!tree.persons.some((p) => p && p.id === personId && !p.deleted)) return null;

  const cacCon = Array.isArray(cu.children) ? cu.children : [];
  if (cacCon.some((c) => c && c.personId === personId)) return null;

  const qh = QUAN_HE_CON.indexOf(relation) >= 0 ? relation : 'birth';

  let lonNhat = 0;
  for (const c of cacCon) {
    const n = Number(c && c.order);
    if (Number.isFinite(n) && n > lonNhat) lonNhat = n;
  }

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = cacCon.concat([{ personId, relation: qh, order: lonNhat + 1 }]);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.children'] = [
    cacCon.map((c) => c && c.personId).filter(Boolean).join(' + '),
    moi.children.map((c) => c.personId).join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

export function updateChildRelation(tree, unionId, personId, relation) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;

  const cacCon = Array.isArray(cu.children) ? cu.children : [];
  const i = cacCon.findIndex((c) => c && c.personId === personId);
  if (i < 0) return null;

  const truoc = cacCon[i].relation || 'birth';
  const sau   = QUAN_HE_CON.indexOf(relation) >= 0 ? relation : 'birth';

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children[i].relation = sau;

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  if (truoc !== sau) {
    diff[unionId + '.children.' + personId + '.relation'] = [truoc, sau];
  }

  return { tree: cayMoi, union: moi, diff, thayDoi: truoc !== sau };
}

export function updateUnion(tree, unionId, changes) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;

  const moi  = JSON.parse(JSON.stringify(cu));
  const diff = {};
  const ch   = changes || {};
  const ghi  = (duong, truoc, sau) => { diff[unionId + '.' + duong] = [truoc, sau]; };

  if (ch.status !== undefined) {
    const sau = chuoi(ch.status) || 'married';
    if (moi.status !== sau) { ghi('status', moi.status, sau); moi.status = sau; }
  }

  if (ch.ranks && typeof ch.ranks === 'object') {
    if (!moi.ranks || typeof moi.ranks !== 'object') moi.ranks = {};
    const cho = new Set((Array.isArray(moi.partners) ? moi.partners : []).filter(Boolean));

    const cuMoc = Number(moi.rank);
    if (Number.isFinite(cuMoc) && cuMoc > 1) {
      for (const id of cho) {
        if (demCapCuaNguoi(tree, id, unionId) === 0) continue;
        if (moi.ranks[id] === undefined) moi.ranks[id] = cuMoc;
      }
    }
    if (moi.rank !== undefined) {
      ghi('rank', cuMoc, null);
      delete moi.rank;
    }

    for (const khoa of Object.keys(ch.ranks)) {
      if (!cho.has(khoa)) continue;
      const n     = Number(ch.ranks[khoa]);
      const sau   = (Number.isFinite(n) && n > 1) ? Math.floor(n) : 1;
      const truoc = rankCua(moi, khoa);
      if (truoc === sau) continue;

      if (sau > 1) moi.ranks[khoa] = sau;
      else         delete moi.ranks[khoa];
      ghi('ranks.' + khoa, truoc, sau);
    }

    if (Object.keys(moi.ranks).length === 0) delete moi.ranks;
  }

  if (ch.note !== undefined) {
    const sau   = chuoi(ch.note);
    const truoc = typeof moi.note === 'string' ? moi.note : '';
    if (truoc !== sau) { ghi('note', truoc, sau); moi.note = sau; }
  }

  if (ch.marriage && typeof ch.marriage === 'object') {
    if (!moi.marriage || typeof moi.marriage !== 'object') {
      moi.marriage = { iso: null, raw: '', place: '' };
    }
    const m = moi.marriage;

    if (ch.marriage.raw !== undefined) {
      const sau   = chuoi(ch.marriage.raw);
      const truoc = typeof m.raw === 'string' ? m.raw : '';
      if (truoc !== sau) {
        ghi('marriage.raw', truoc, sau);
        m.raw = sau;

        const isoCu  = (m.iso === undefined || m.iso === null || m.iso === '') ? null : m.iso;
        const isoMoi = ch.marriage.iso !== undefined
          ? (chuoi(ch.marriage.iso) || null)
          : parseLooseDate(sau).iso;
        if (isoCu !== isoMoi) { ghi('marriage.iso', isoCu, isoMoi); m.iso = isoMoi; }
      }
    }

    if (ch.marriage.place !== undefined) {
      const sau   = chuoi(ch.marriage.place);
      const truoc = typeof m.place === 'string' ? m.place : '';
      if (truoc !== sau) { ghi('marriage.place', truoc, sau); m.place = sau; }
    }
  }

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  return { tree: cayMoi, union: moi, diff, thayDoi: Object.keys(diff).length > 0 };
}

export function softDeleteUnion(tree, unionId) { return datCoXoaUnion(tree, unionId, true); }

export function restoreUnion(tree, unionId) { return datCoXoaUnion(tree, unionId, false); }

function datCoXoaUnion(tree, unionId, co) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId);
  if (!cu) return null;
  if ((cu.deleted === true) === co) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = co;

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.deleted'] = [cu.deleted === true, co];

  return { tree: cayMoi, union: moi, diff };
}

export function listDeletedUnions(tree) {
  const ds = (tree && Array.isArray(tree.unions)) ? tree.unions : [];
  const ra = [];

  for (const u of ds) {
    if (!u || !u.id || u.deleted !== true) continue;
    ra.push({
      id: u.id,
      union: u,
      partnerIds: (Array.isArray(u.partners) ? u.partners : []).filter(Boolean),
      childIds: (Array.isArray(u.children) ? u.children : [])
        .filter((c) => c && c.personId).map((c) => c.personId),
    });
  }

  ra.sort((a, b) => (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)));
  return ra;
}

export function removeChild(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const cacCon = (Array.isArray(cu.children) ? cu.children : []).filter((c) => c && c.personId);
  if (!cacCon.some((c) => c.personId === personId)) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = (Array.isArray(cu.children) ? cu.children : [])
    .filter((c) => !(c && c.personId === personId));

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.children'] = [
    cacCon.map((c) => c.personId).join(' + '),
    moi.children.map((c) => c && c.personId).filter(Boolean).join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

export function addPartner(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;
  if (!Array.isArray(tree.persons)) return null;
  if (!tree.persons.some((p) => p && p.id === personId && !p.deleted)) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const ds = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (ds.indexOf(personId) >= 0) return null;
  if (ds.length >= 2) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partners = ds.concat([personId]);
  moi.partnerOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && moi.partners.indexOf(id) >= 0)
    .concat([personId]);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partners'] = [ds.join(' + '), moi.partners.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

export function removePartner(tree, unionId, personId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId || !personId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const ds = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (ds.indexOf(personId) < 0) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partners = ds.filter((id) => id !== personId);
  moi.partnerOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && id !== personId && moi.partners.indexOf(id) >= 0);

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partners'] = [ds.join(' + '), moi.partners.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

export function conLyDoTonTai(union) {
  if (!union) return false;

  const soPartner = (Array.isArray(union.partners) ? union.partners : [])
    .filter(Boolean).length;
  const soCon = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId).length;

  if (soPartner >= 2) return true;
  if (soPartner === 1 && soCon >= 1) return true;
  return soPartner === 0 && soCon >= 2;
}

export function swapPartnerOrder(tree, unionId) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const dsPartner = (Array.isArray(cu.partners) ? cu.partners : []).filter(Boolean);
  if (dsPartner.length < 2) return null;

  const cuOrder = (Array.isArray(cu.partnerOrder) ? cu.partnerOrder : [])
    .filter((id) => id && dsPartner.indexOf(id) >= 0);
  const goc = (cuOrder.length === dsPartner.length) ? cuOrder : dsPartner;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.partnerOrder = goc.slice().reverse();

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.partnerOrder'] = [goc.join(' + '), moi.partnerOrder.join(' + ')];

  return { tree: cayMoi, union: moi, diff };
}

export function reorderChildren(tree, unionId, orderedPersonIds) {
  if (!tree || !Array.isArray(tree.unions) || !unionId) return null;

  const cu = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!cu) return null;

  const cacCon = (Array.isArray(cu.children) ? cu.children : []).filter((c) => c && c.personId);
  const moiDs  = Array.isArray(orderedPersonIds) ? orderedPersonIds.filter(Boolean) : [];

  if (moiDs.length !== cacCon.length) return null;
  if (new Set(moiDs).size !== moiDs.length) return null;
  const dangCo = new Set(cacCon.map((c) => c.personId));
  if (!moiDs.every((id) => dangCo.has(id))) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.children = moiDs.map((id, i) => {
    const c = cacCon.find((x) => x.personId === id);
    return { personId: id, relation: c.relation || 'birth', order: i + 1 };
  });

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => (u && u.id === unionId ? moi : u)),
  });

  const diff = {};
  diff[unionId + '.thuTuCon'] = [
    cacCon.map((c) => c.personId).join(' + '),
    moiDs.join(' + '),
  ];

  return { tree: cayMoi, union: moi, diff };
}

export function thuTuConTheoTuoi(tree, unionId) {
  if (!tree || !Array.isArray(tree.unions) || !Array.isArray(tree.persons)) return null;

  const union = tree.unions.find((u) => u && u.id === unionId && !u.deleted);
  if (!union) return null;

  const thuTuHienTai = (Array.isArray(union.children) ? union.children : [])
    .filter((c) => c && c.personId)
    .slice()
    .sort((a, b) => (soOrder(a) - soOrder(b)) || (a.personId < b.personId ? -1 : 1))
    .map((c) => c.personId);
  if (thuTuHienTai.length < 2) return null;

  const nam = new Map();
  for (const id of thuTuHienTai) {
    const p = tree.persons.find((x) => x && x.id === id);
    const moc = p ? mocNgay(p.birth) : null;
    if (moc && Number.isFinite(Number(moc.nam))) nam.set(id, Number(moc.nam));
  }
  if (nam.size < 2) return null;

  const cho    = [];
  const coNam  = [];
  thuTuHienTai.forEach((id, i) => {
    if (nam.has(id)) { cho.push(i); coNam.push(id); }
  });

  const daSap = coNam.slice().sort((a, b) => {
    const d = nam.get(a) - nam.get(b);
    return d !== 0 ? d : (coNam.indexOf(a) - coNam.indexOf(b));
  });

  const thuTuMoi = thuTuHienTai.slice();
  cho.forEach((viTri, k) => { thuTuMoi[viTri] = daSap[k]; });

  const daDoi = thuTuHienTai.filter((id) => thuTuHienTai.indexOf(id) !== thuTuMoi.indexOf(id));

  return { hopLe: daDoi.length === 0, thuTuHienTai, thuTuMoi, daDoi, nam };
}

export function timCapTrung(tree) {
  const ds = (tree && Array.isArray(tree.unions))
    ? tree.unions.filter((u) => u && !u.deleted) : [];
  const ra = [];

  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      const loai = soSanhCapTrung(ds[i], ds[j]);
      if (!loai) continue;
      const nhoHon = soMa(ds[i].id) < soMa(ds[j].id);
      ra.push({
        unionA: nhoHon ? ds[i].id : ds[j].id,
        unionB: nhoHon ? ds[j].id : ds[i].id,
        loai,
      });
    }
  }
  return ra;
}

export function timXungDotGop(uA, uB) {
  const a = uA || {}, b = uB || {};
  const khacTrong = (x, y) => x !== '' && y !== '' && x !== y;

  const chung = [...boPartner(a)].filter((id) => boPartner(b).has(id));

  return {
    status:        khacTrong(chuoi(a.status), chuoi(b.status)),
    ranks:         chung.filter((id) => rankCua(a, id) !== rankCua(b, id)),
    note:          khacTrong(chuoi(a.note), chuoi(b.note)),
    marriageRaw:   khacTrong(chuoi(a.marriage && a.marriage.raw),
                             chuoi(b.marriage && b.marriage.raw)),
    marriagePlace: khacTrong(chuoi(a.marriage && a.marriage.place),
                             chuoi(b.marriage && b.marriage.place)),
  };
}

export function mergeUnions(tree, unionIdA, unionIdB, luaChon) {
  if (!tree || !Array.isArray(tree.unions) || !unionIdA || !unionIdB) return null;
  if (unionIdA === unionIdB) return null;

  const uA = tree.unions.find((u) => u && u.id === unionIdA && !u.deleted);
  const uB = tree.unions.find((u) => u && u.id === unionIdB && !u.deleted);
  if (!uA || !uB) return null;
  if (!soSanhCapTrung(uA, uB)) return null;

  const nhoHon   = soMa(uA.id) < soMa(uB.id);
  const giu      = nhoHon ? uA : uB;
  const boDi     = nhoHon ? uB : uA;
  const lc       = luaChon || {};

  const moi = JSON.parse(JSON.stringify(giu));

  const boPGiu  = boPartner(giu);
  const boPBoDi = boPartner(boDi);
  const hopP    = [...new Set([...boPGiu, ...boPBoDi])];
  moi.partners  = hopP;

  const orderGiu  = (Array.isArray(giu.partnerOrder) ? giu.partnerOrder : [])
    .filter((id) => hopP.indexOf(id) >= 0);
  const orderBoDi = (Array.isArray(boDi.partnerOrder) ? boDi.partnerOrder : [])
    .filter((id) => hopP.indexOf(id) >= 0);
  const orderGoc = (orderGiu.length === hopP.length) ? orderGiu
                  : (orderBoDi.length === hopP.length) ? orderBoDi
                  : orderGiu;
  const daCoOrder = new Set(orderGoc);
  moi.partnerOrder = orderGoc.concat(hopP.filter((id) => !daCoOrder.has(id)));

  moi.status = (lc.status !== undefined) ? (chuoi(lc.status) || 'married') : giu.status;

  {
    const rMoi = {};
    for (const id of hopP) {
      const coGiu  = boPGiu.has(id);
      const coBoDi = boPBoDi.has(id);
      let n;
      if (lc.ranks && lc.ranks[id] !== undefined)  n = Number(lc.ranks[id]);
      else if (coGiu)                              n = rankCua(giu, id);
      else if (coBoDi)                             n = rankCua(boDi, id);
      else                                         n = 1;
      if (Number.isFinite(n) && n > 1) rMoi[id] = Math.floor(n);
    }
    if (Object.keys(rMoi).length > 0) moi.ranks = rMoi;
    else if (moi.ranks !== undefined)  delete moi.ranks;
    if (moi.rank !== undefined) delete moi.rank;
  }

  {
    const gN = chuoi(giu.note), bN = chuoi(boDi.note);
    moi.note = (lc.note !== undefined) ? chuoi(lc.note) : (gN !== '' ? gN : bN);
  }

  {
    const gM = giu.marriage || {}, bM = boDi.marriage || {};
    const gRaw = chuoi(gM.raw), bRaw = chuoi(bM.raw);
    const gPlace = chuoi(gM.place), bPlace = chuoi(bM.place);

    const rawSau = (lc.marriage && lc.marriage.raw !== undefined)
      ? chuoi(lc.marriage.raw) : (gRaw !== '' ? gRaw : bRaw);
    const placeSau = (lc.marriage && lc.marriage.place !== undefined)
      ? chuoi(lc.marriage.place) : (gPlace !== '' ? gPlace : bPlace);

    let isoSau;
    if (lc.marriage && lc.marriage.iso !== undefined) {
      isoSau = chuoi(lc.marriage.iso) || null;
    } else if (rawSau === gRaw) {
      isoSau = (gM.iso === undefined ? null : gM.iso);
    } else if (rawSau === bRaw) {
      isoSau = (bM.iso === undefined ? null : bM.iso);
    } else {
      isoSau = parseLooseDate(rawSau).iso;
    }
    moi.marriage = { iso: isoSau, raw: rawSau, place: placeSau };
  }

  const conGiu  = (Array.isArray(giu.children) ? giu.children : []).filter((c) => c && c.personId);
  const conBoDi = (Array.isArray(boDi.children) ? boDi.children : []).filter((c) => c && c.personId);

  const conGiuBanSao = conGiu.map((c) => Object.assign({}, c));
  const theoMa = new Map(conGiuBanSao.map((c) => [c.personId, c]));
  let lonNhat = conGiuBanSao.reduce((m, c) => Math.max(m, Number(c.order) || 0), 0);
  const conThem = [];

  for (const c of conBoDi) {
    const daCoDong = theoMa.get(c.personId);
    if (daCoDong) {
      if (daCoDong.relation !== 'birth' && c.relation === 'birth') daCoDong.relation = 'birth';
      continue;
    }
    lonNhat += 1;
    const dong = { personId: c.personId, relation: c.relation || 'birth', order: lonNhat };
    theoMa.set(c.personId, dong);
    conThem.push(dong);
  }
  moi.children = conGiuBanSao.concat(conThem);

  const boDiMoi = JSON.parse(JSON.stringify(boDi));
  boDiMoi.deleted = true;

  let media = Array.isArray(tree.media) ? tree.media : [];
  if (lc.media === 'chuyen') {
    media = media.map((m) => (m && m.subjectId === boDi.id)
      ? Object.assign({}, m, { subjectId: giu.id }) : m);
  }

  const cayMoi = Object.assign({}, tree, {
    unions: tree.unions.map((u) => {
      if (u && u.id === giu.id)  return moi;
      if (u && u.id === boDi.id) return boDiMoi;
      return u;
    }),
    media,
  });

  const diff = {};
  diff[giu.id + '.partners'] = [boPGiu.size + ' người', hopP.length + ' người'];
  diff[giu.id + '.children'] = [conGiu.length + ' con', moi.children.length + ' con'];
  diff[boDi.id + '.deleted'] = [false, true];
  if (lc.media === 'chuyen') diff['media.subjectId'] = [boDi.id, giu.id];

  return { tree: cayMoi, union: moi, unionXoa: boDi.id, diff };
}

export function getParentUnions(index, personId) {
  return dsUnion(index, index && index.unionsAsChild, personId);
}

export function getPartnerUnions(index, personId) {
  return dsUnion(index, index && index.unionsAsPartner, personId);
}

export function getParents(index, personId) {
  const ra = [];
  for (const u of getParentUnions(index, personId)) {
    const relation = quanHeCua(u, personId);
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (id && id !== personId && index.personById.has(id)) {
        ra.push({ personId: id, unionId: u.id, relation });
      }
    }
  }
  return ra;
}

export function getChildren(index, personId) {
  const ra = [];
  for (const u of getPartnerUnions(index, personId)) {
    for (const c of Array.isArray(u.children) ? u.children : []) {
      if (!c || !c.personId || !index.personById.has(c.personId)) continue;
      ra.push({
        personId: c.personId,
        unionId:  u.id,
        relation: c.relation || 'birth',
        order:    Number.isFinite(Number(c.order)) ? Number(c.order) : 9999,
      });
    }
  }
  return ra;
}

export function getSiblings(index, personId) {
  const ra = [];
  const daCo = new Set([personId]);
  for (const u of getParentUnions(index, personId)) {
    for (const c of Array.isArray(u.children) ? u.children : []) {
      if (!c || !c.personId || daCo.has(c.personId)) continue;
      if (!index.personById.has(c.personId)) continue;
      daCo.add(c.personId);
      ra.push({ personId: c.personId, unionId: u.id, relation: c.relation || 'birth' });
    }
  }
  return ra;
}

export function getSpouses(index, personId) {
  const ra = [];
  for (const u of getPartnerUnions(index, personId)) {
    for (const id of Array.isArray(u.partners) ? u.partners : []) {
      if (!id || id === personId || !index.personById.has(id)) continue;
      ra.push({
        personId: id,
        unionId:  u.id,
        rank:     rankCua(u, personId),
        status:   typeof u.status === 'string' ? u.status : '',
      });
    }
  }
  return ra;
}

function dsUnion(index, bang, personId) {
  if (!index || !index.unionById || !bang || !personId) return [];
  const ra = [];
  for (const unionId of bang.get(personId) || []) {
    const u = index.unionById.get(unionId);
    if (u) ra.push(u);
  }
  return ra;
}

function quanHeCua(union, personId) {
  for (const c of Array.isArray(union.children) ? union.children : []) {
    if (c && c.personId === personId) return c.relation || 'birth';
  }
  return 'birth';
}

function chuoi(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

function demCapCuaNguoi(tree, personId, trUnionId) {
  const ds = (tree && Array.isArray(tree.unions)) ? tree.unions : [];
  let n = 0;
  for (const u of ds) {
    if (!u || u.deleted || u.id === trUnionId) continue;
    if (Array.isArray(u.partners) && u.partners.indexOf(personId) >= 0) n++;
  }
  return n;
}

function boPartner(u) {
  return new Set((u && Array.isArray(u.partners) ? u.partners : []).filter(Boolean));
}

function soSanhCapTrung(a, b) {
  const pa = boPartner(a), pb = boPartner(b);
  if (pa.size === 0 || pb.size === 0) return null;

  if (pa.size === pb.size && [...pa].every((id) => pb.has(id))) return 'trung-het';
  if (pa.size === 1 && [...pa].every((id) => pb.has(id))) return 'mot-nam-trong-hai';
  if (pb.size === 1 && [...pb].every((id) => pa.has(id))) return 'mot-nam-trong-hai';
  return null;
}

function soMa(id) {
  const n = Number(String(id || '').replace(/^\D+/, ''));
  return Number.isFinite(n) ? n : 0;
}

function soOrder(con) {
  const n = Number(con && con.order);
  return Number.isFinite(n) ? n : 9999;
}
