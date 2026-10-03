import { LAYOUT, PHOTO } from '../config.js';
import { rankCua } from './union.js';
import { VE } from './render.js';

const RONG = LAYOUT.nodeWidth;
const DEM  = 24;

let CAO = LAYOUT.nodeHeight;

const MUC_NET = PHOTO.leTrenO + PHOTO.banKinhTrenO;

let HANG = null;
let KHONG_ANH = false;
let KHE    = LAYOUT.hGap;
let KHE_VC = LAYOUT.spouseGap;
let KHE_DOC = LAYOUT.vGap;
let CUNG = null;
const rongHang = (m) => (HANG && HANG.has(m) ? HANG.get(m).w : RONG);
const netHang  = (m) => (HANG && HANG.has(m) ? HANG.get(m).net : MUC_NET);
let RIENG = null;
const rongId   = (ct, id) => (RIENG && RIENG.has(id) ? RIENG.get(id) : rongHang(ct.muc.get(id)));
const netNut   = (nut) => netHang(nut.gen);
const leAnh    = (nut) => (KHONG_ANH ? 0 : nut.w / 2 - PHOTO.banKinhTrenO);

export function computeLayout(index, focusPersonId, visibleSet, scope, stubPoints, tuyChon) {
  CAO = (tuyChon && tuyChon.hienNgayGio)
    ? LAYOUT.nodeHeightNgayGio
    : LAYOUT.nodeHeight;
  HANG = null;
  RIENG = null;
  KHONG_ANH = !!(tuyChon && typeof tuyChon.oHang === 'function');
  const khe = (KHONG_ANH && tuyChon.khe) || {};
  KHE     = khe.hGap      ?? LAYOUT.hGap;
  KHE_VC  = khe.spouseGap ?? LAYOUT.spouseGap;
  KHE_DOC = khe.vGap      ?? LAYOUT.vGap;
  CUNG = KHONG_ANH ? { cao: khe.cungCao ?? 6, buoc: khe.cungBuoc ?? 3, tran: khe.cungTran ?? 12 } : null;

  const rong = {
    nodes: [], unions: [], links: [], stubs: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
  if (!index || !index.personById || !visibleSet || visibleSet.size === 0) return rong;

  const ct = dungNguCanh(index, visibleSet);
  if (ct.dsNguoi.length === 0) return rong;
  ct.tamId = focusPersonId || null;

  ganMucDoi(ct);
  hapThuCapTrongHo(ct);
  const yHang = KHONG_ANH ? dungHang(ct, tuyChon.oHang) : null;
  const viTriX = datBaKhoi(ct);

  const nodes = [];
  const nodeById = new Map();
  for (const id of ct.dsNguoi) {
    const gen = ct.muc.get(id) || 0;
    const nut = {
      id,
      x: viTriX.has(id) ? viTriX.get(id) : 0,
      y: yHang ? yHang.get(gen) : gen * (CAO + KHE_DOC),
      w: rongId(ct, id),
      h: HANG ? HANG.get(gen).h : CAO,
      kind: visibleSet.get(id) || 'full',
      gen,
      laTrungTam: id === focusPersonId,
    };
    nodes.push(nut);
    nodeById.set(id, nut);
  }
  ct.nodeById = nodeById;

  ganRongTenToiDa(nodes);

  const unions = dungDiemTreo(ct, stubPoints);
  const links  = dungDuongNoi(ct, unions);
  ct.links = links;
  const stubs  = dungNotCut(ct, unions, stubPoints);

  return { nodes, unions, links, stubs, bounds: tinhBounds(nodes, links, stubs) };
}

function dungHang(ct, oHang) {
  const theoDoi = new Map();
  for (const id of ct.dsNguoi) {
    const m = ct.muc.get(id) || 0;
    if (!theoDoi.has(m)) theoDoi.set(m, []);
    theoDoi.get(m).push(id);
  }
  HANG = new Map();
  RIENG = new Map();
  for (const [m, ids] of theoDoi) {
    const o = oHang(m, ids);
    HANG.set(m, o);
    if (o.rieng) for (const [id, w] of o.rieng) RIENG.set(id, w);
  }

  const yHang = new Map();
  const ds = [...theoDoi.keys()].sort((a, b) => a - b);
  let y = 0;
  for (let m = ds[0]; m <= ds[ds.length - 1]; m++) {
    yHang.set(m, y);
    y += (HANG.has(m) ? HANG.get(m).h : 0) + KHE_DOC;
  }
  return yHang;
}

function ganRongTenToiDa(nodes) {
  const theoHang = new Map();
  for (const n of nodes) {
    if (!theoHang.has(n.gen)) theoHang.set(n.gen, []);
    theoHang.get(n.gen).push(n);
  }

  const tran = LAYOUT.noiTenToiDa;
  for (const [, ds] of theoHang) {
    ds.sort((a, b) => a.x - b.x);
    for (let i = 0; i < ds.length; i++) {
      const n = ds[i];
      let khe = Infinity;
      if (i > 0)              khe = Math.min(khe, n.x - (ds[i - 1].x + ds[i - 1].w));
      if (i < ds.length - 1)  khe = Math.min(khe, ds[i + 1].x - (n.x + n.w));

      const noi = Number.isFinite(khe)
        ? Math.max(0, (khe - LAYOUT.kheBangTen) / 2)
        : tran;
      n.rongTenToiDa = n.w + 2 * Math.min(noi, tran);
    }
  }
}

function dungNguCanh(index, visibleSet) {
  const ct = {
    index,
    visibleSet,
    dsNguoi:       [],
    unionHT:       new Map(),
    unionLamVo:    new Map(),
    unionLamCon:   new Map(),
    unionSoHuu:    new Map(),
    hapThuBoi:     new Map(),
    roiChoCha:     new Set(),
    dai:           new Map(),
    muc:           new Map(),
    toTien:        new Map(),
    cumCon:        new Map(),
    tamId:         null,
    daDat:         new Set(),
  };

  for (const id of visibleSet.keys()) {
    if (index.personById.has(id)) ct.dsNguoi.push(id);
  }
  ct.dsNguoi.sort();
  const trongTap = new Set(ct.dsNguoi);

  for (const [uid, u] of index.unionById) {
    const partners = [];
    for (const pid of Array.isArray(u.partners) ? u.partners : []) {
      if (trongTap.has(pid) && partners.indexOf(pid) === -1) partners.push(pid);
    }
    if (partners.length === 0) continue;

    const children = [];
    for (const con of Array.isArray(u.children) ? u.children : []) {
      const cid = con && con.personId;
      if (!cid || !trongTap.has(cid)) continue;
      if (children.some((c) => c.personId === cid)) continue;
      children.push({
        personId: cid,
        relation: con.relation || 'birth',
        order:    Number.isFinite(Number(con.order)) ? Number(con.order) : 9999,
      });
    }
    if (partners.length < 2 && children.length === 0) continue;

    children.sort((a, b) => (a.order - b.order) || (a.personId < b.personId ? -1 : 1));
    ct.unionHT.set(uid, { id: uid, partners, children });
  }

  for (const id of ct.dsNguoi) { ct.unionLamVo.set(id, []); ct.unionLamCon.set(id, []); }
  for (const [uid, u] of ct.unionHT) {
    for (const pid of u.partners) ct.unionLamVo.get(pid).push(uid);
    for (const c of u.children)   ct.unionLamCon.get(c.personId).push(uid);
  }
  for (const [id, ds] of ct.unionLamVo) {
    ds.sort((a, b) =>
      (rankCua(index.unionById.get(a), id) - rankCua(index.unionById.get(b), id)) ||
      (a < b ? -1 : 1));
  }

  for (const id of ct.dsNguoi) {
    const ds = ct.unionLamCon.get(id);
    if (ds.length === 0) continue;
    const deIsBirth = ds.find((uid) =>
      ct.unionHT.get(uid).children.some((c) => c.personId === id && c.relation === 'birth'));
    ct.unionSoHuu.set(id, deIsBirth || ds.slice().sort()[0]);
  }

  const tuDung = new Set();
  for (const id of ct.dsNguoi) if (ct.unionSoHuu.has(id)) tuDung.add(id);

  const dsUnionSapXep = [...ct.unionHT.keys()].sort();
  for (const uid of dsUnionSapXep) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length < 2) continue;

    let neoU = u.partners.find((p) => tuDung.has(p) && !ct.hapThuBoi.has(p));
    if (!neoU) {
      const ungVien = u.partners.filter((p) => !ct.hapThuBoi.has(p));
      if (ungVien.length === 0) continue;
      neoU = ungVien.reduce((a, b) =>
        (ct.unionLamVo.get(b).length > ct.unionLamVo.get(a).length ? b : a));
      tuDung.add(neoU);
    }
    for (const p of u.partners) {
      if (p === neoU || tuDung.has(p) || ct.hapThuBoi.has(p)) continue;
      ct.hapThuBoi.set(p, { unionId: uid, neoId: neoU });
    }
  }

  return ct;
}

function ganMucDoi(ct) {
  const muc = new Map();
  for (const id of ct.dsNguoi) muc.set(id, 0);

  let m = canNhanh(ct, noiDan(ct, muc));

  const tran = ct.dsNguoi.length + 2;
  for (let vong = 0; vong < tran; vong++) {
    const mKeo = keoGocTroiXuong(ct, m);
    if (!mKeo) break;
    m = canNhanh(ct, noiDan(ct, mKeo));
  }

  ct.muc = m;
}

function keoGocTroiXuong(ct, mucVao) {
  const muc = new Map(mucVao);
  let coDoi = false;

  for (const id of ct.dsNguoi) {
    if (ct.unionSoHuu.has(id)) continue;
    if (ct.hapThuBoi.has(id))  continue;

    let nongNhat = Infinity;
    for (const uid of ct.unionLamVo.get(id) || []) {
      const u = ct.unionHT.get(uid);
      if (!u) continue;
      for (const c of u.children) {
        const mc = muc.get(c.personId);
        if (mc !== undefined && mc < nongNhat) nongNhat = mc;
      }
    }
    if (!Number.isFinite(nongNhat)) continue;

    if (nongNhat - 1 > (muc.get(id) || 0)) { muc.set(id, nongNhat - 1); coDoi = true; }
  }

  return coDoi ? muc : null;
}

function noiDan(ct, mucVao) {
  const muc  = new Map(mucVao);
  const tran = ct.dsNguoi.length + 2;

  for (let vong = 0; vong < tran; vong++) {
    let coDoi = false;

    for (const [pid, ht] of ct.hapThuBoi) {
      const m = Math.max(muc.get(pid) || 0, muc.get(ht.neoId) || 0);
      if ((muc.get(pid) || 0) !== m)      { muc.set(pid, m);      coDoi = true; }
      if ((muc.get(ht.neoId) || 0) !== m) { muc.set(ht.neoId, m); coDoi = true; }
    }

    for (const [, u] of ct.unionHT) {
      let mCha = -1;
      for (const pid of u.partners) mCha = Math.max(mCha, muc.get(pid) || 0);
      if (mCha < 0) continue;
      for (const c of u.children) {
        if ((muc.get(c.personId) || 0) <= mCha) { muc.set(c.personId, mCha + 1); coDoi = true; }
      }
    }

    if (!coDoi) break;
  }
  return muc;
}

function toTienDong(ct, start) {
  if (ct.toTien.has(start)) return ct.toTien.get(start);

  const visited = new Set([start]);
  const hangDoi = [start];
  while (hangDoi.length) {
    const id  = hangDoi.shift();
    const uid = ct.unionSoHuu.get(id);
    if (!uid) continue;
    for (const p of ct.unionHT.get(uid).partners) {
      if (visited.has(p)) continue;
      visited.add(p);
      hangDoi.push(p);
    }
  }

  ct.toTien.set(start, visited);
  return visited;
}

function chungDongHo(ct, a, b) {
  const ttA = toTienDong(ct, a);
  const ttB = toTienDong(ct, b);
  const [nho, lon] = ttA.size <= ttB.size ? [ttA, ttB] : [ttB, ttA];
  for (const x of nho) if (lon.has(x)) return true;
  return false;
}

function canNhanh(ct, mucVao) {
  let muc = mucVao;
  const tran = ct.unionHT.size + 4;

  for (let vong = 0; vong < tran; vong++) {
    let coDoi = false;

    for (const [, u] of ct.unionHT) {
      if (u.partners.length < 2) continue;

      for (let i = 0; i < u.partners.length; i++) {
        for (let j = i + 1; j < u.partners.length; j++) {
          const a = u.partners[i];
          const b = u.partners[j];
          if (muc.get(a) === muc.get(b)) continue;
          if (chungDongHo(ct, a, b)) continue;

          const nong = muc.get(a) < muc.get(b) ? a : b;
          const buoc = Math.abs(muc.get(a) - muc.get(b));
          for (const x of toTienDong(ct, nong)) muc.set(x, muc.get(x) + buoc);
          coDoi = true;
        }
      }
    }

    if (!coDoi) break;
    muc = noiDan(ct, muc);
  }

  let min = Infinity;
  for (const v of muc.values()) if (v < min) min = v;
  if (min !== 0 && Number.isFinite(min)) {
    for (const id of ct.dsNguoi) muc.set(id, muc.get(id) - min);
  }
  return muc;
}

function hapThuCapTrongHo(ct) {
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length !== 2) continue;

    const [a, b] = u.partners;
    if (!ct.unionSoHuu.has(a) || !ct.unionSoHuu.has(b)) continue;
    if (ct.hapThuBoi.has(a) || ct.hapThuBoi.has(b)) continue;
    if (ct.muc.get(a) !== ct.muc.get(b)) continue;

    const soA = (ct.unionLamVo.get(a) || []).length;
    const soB = (ct.unionLamVo.get(b) || []).length;
    const neo = soB > soA ? b : a;
    const kia = neo === a ? b : a;
    if ((ct.unionLamVo.get(kia) || []).length !== 1) continue;

    ct.roiChoCha.add(kia);
    ct.hapThuBoi.set(kia, { unionId: uid, neoId: neo });
  }
}

function layDai(ct, neoId) {
  if (ct.dai.has(neoId)) return ct.dai.get(neoId);

  const w        = rongId(ct, neoId);
  const dsUnion  = (ct.unionLamVo.get(neoId) || []).filter((uid) => ct.unionHT.has(uid));
  const banDoi   = [];
  for (const uid of dsUnion) {
    for (const sid of ct.unionHT.get(uid).partners) {
      if (sid === neoId) continue;
      const ht = ct.hapThuBoi.get(sid);
      if (ht && ht.neoId === neoId && ht.unionId === uid) banDoi.push({ unionId: uid, spouseId: sid });
    }
  }

  const huong = tinhHuong(ct, neoId, banDoi);
  const n     = banDoi.length;
  const wS    = banDoi.map((bd) => rongId(ct, bd.spouseId));
  let tong = 0;
  for (const v of wS) tong += v + KHE_VC;
  const dxP   = huong > 0 ? 0 : tong;

  const dx     = new Map([[neoId, dxP]]);
  const khe    = new Map();
  const mucNet = new Map();
  let mep = huong > 0 ? w : dxP;
  banDoi.forEach((bd, i) => {
    const x = huong > 0 ? mep + KHE_VC : mep - KHE_VC - wS[i];
    dx.set(bd.spouseId, x);
    if (CUNG) khe.set(bd.unionId, chaCua(ct, neoId, bd.spouseId) === neoId ? dxP + w / 2 : x + wS[i] / 2);
    else khe.set(bd.unionId, huong > 0 ? mep + KHE_VC / 2 : mep - KHE_VC / 2);
    mep = huong > 0 ? x + wS[i] : x;
    mucNet.set(bd.unionId, i);
  });
  for (const uid of dsUnion) {
    if (khe.has(uid)) continue;
    khe.set(uid, dxP + w / 2);
    mucNet.set(uid, 0);
  }

  const buocNet = n > 1
    ? Math.min(LAYOUT.spouseStepMax, (netHang(ct.muc.get(neoId)) - LAYOUT.spouseStepPadTop) / (n - 1))
    : 0;

  const kq = {
    neoId, huong, n, dx, khe, mucNet, dxP, buocNet,
    rong: w + tong,
    thuTuUnion: dsUnion,
    banDoi,
  };
  ct.dai.set(neoId, kq);
  return kq;
}

function tinhHuong(ct, neoId, banDoi) {
  const gt = gioiTinh(ct, neoId);
  if (banDoi.length === 0) return gt === 'F' ? -1 : 1;

  const gtS = gioiTinh(ct, banDoi[0].spouseId);
  if (gt === 'M' && gtS === 'F') return 1;
  if (gt === 'F' && gtS === 'M') return -1;

  const u  = ct.index.unionById.get(banDoi[0].unionId);
  const po = (u && Array.isArray(u.partnerOrder) && u.partnerOrder.length)
    ? u.partnerOrder
    : ((u && u.partners) || []);
  const iP = po.indexOf(neoId);
  const iS = po.indexOf(banDoi[0].spouseId);
  if (iP >= 0 && iS >= 0) return iS > iP ? 1 : -1;
  return gt === 'F' ? -1 : 1;
}

function gioiTinh(ct, id) {
  const p = ct.index.personById.get(id);
  return (p && p.sex) || 'U';
}

function chaCua(ct, neoId, spouseId) {
  return gioiTinh(ct, neoId) !== 'M' && gioiTinh(ct, spouseId) === 'M' ? spouseId : neoId;
}

function deChoNay(ct, viTri, k, x) {
  for (const it of k.items) {
    const m = ct.muc.get(it.id);
    const t = it.x + x, p = t + rongId(ct, it.id);
    for (const [kh, xk] of viTri) {
      if (ct.muc.get(kh) !== m) continue;
      if (t < xk + rongId(ct, kh) + KHE && xk < p + KHE) return true;
    }
  }
  return false;
}

function canChumConVaoGiua(ct, viTriX) {
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    if (u.partners.length < 2) continue;

    const ids = ct.cumCon.get(uid);
    if (!ids || ids.length === 0) continue;

    const ht = ct.hapThuBoi.get(u.partners[0]) || ct.hapThuBoi.get(u.partners[1]);
    if (ht && ht.unionId === uid) continue;

    const xa = viTriX.get(u.partners[0]);
    const xb = viTriX.get(u.partners[1]);
    if (xa === undefined || xb === undefined) continue;
    const giua = (xa + xb) / 2 + rongId(ct, u.partners[0]) / 2;

    let trai = Infinity, phai = -Infinity;
    for (const id of ids) {
      const x = viTriX.get(id);
      if (x === undefined) continue;
      if (x < trai) trai = x;
      if (x + rongId(ct, id) > phai) phai = x + rongId(ct, id);
    }
    if (!Number.isFinite(trai)) continue;

    const d = giua - (trai + phai) / 2;
    if (Math.abs(d) < 1) continue;

    const cum = new Set(ids);
    if (deLenNhau(ct, viTriX, cum, d)) continue;
    for (const id of ids) viTriX.set(id, viTriX.get(id) + d);
  }
}

function deLenNhau(ct, viTriX, cum, d) {
  for (const id of cum) {
    const x = viTriX.get(id);
    if (x === undefined) continue;
    const m = ct.muc.get(id);
    const t = x + d, p = t + rongId(ct, id);
    for (const kh of ct.dsNguoi) {
      if (cum.has(kh)) continue;
      if (ct.muc.get(kh) !== m) continue;
      const xk = viTriX.get(kh);
      if (xk === undefined) continue;
      if (t < xk + rongId(ct, kh) + KHE && xk < p + KHE) return true;
    }
  }
  return false;
}

const MOC_KHOI = ['neoX', 'noi', 'mepTrai', 'mepPhai'];

function khoiRong() { return { items: [], vien: new Map() }; }

function themVien(vien, m, lo, hi) {
  const v = vien.get(m);
  if (!v) vien.set(m, [lo, hi]);
  else { if (lo < v[0]) v[0] = lo; if (hi > v[1]) v[1] = hi; }
}

function themO(ct, k, id, x) {
  const w = rongId(ct, id);
  k.items.push({ id, x, w });
  themVien(k.vien, ct.muc.get(id), x, x + w);
}

function dich(k, d) {
  if (!d) return;
  for (const it of k.items) it.x += d;
  for (const v of k.vien.values()) { v[0] += d; v[1] += d; }
  for (const m of MOC_KHOI) if (typeof k[m] === 'number') k[m] += d;
}

function gop(vao, k) {
  for (const it of k.items) vao.items.push(it);
  for (const [m, [lo, hi]] of k.vien) themVien(vao.vien, m, lo, hi);
}

function canhPhai(vTrai, vPhai, khe) {
  let d = -Infinity;
  for (const [m, v] of vTrai) {
    const p = vPhai.get(m);
    if (p) d = Math.max(d, v[1] + khe - p[0]);
  }
  return d;
}

function mepCua(k, phai) {
  let x = phai ? -Infinity : Infinity;
  for (const v of k.vien.values()) x = phai ? Math.max(x, v[1]) : Math.min(x, v[0]);
  return x;
}

function xepKhit(ds, khe) {
  const acc = khoiRong();
  let tamTruoc = -Infinity, wTruoc = 0;
  for (const k of ds) {
    let d = 0;
    if (acc.items.length) {
      d = canhPhai(acc.vien, k.vien, khe);
      if (!Number.isFinite(d)) d = mepCua(acc, true) + khe - mepCua(k, false);
      if (typeof k.neoX === 'number') d = Math.max(d, tamTruoc + (wTruoc + k.neoW) / 2 + khe - k.neoX);
    }
    dich(k, d);
    gop(acc, k);
    if (typeof k.neoX === 'number') { tamTruoc = k.neoX; wTruoc = k.neoW; }
  }
  if (!canVaoKhoangTrong(ds, khe)) return acc;
  const moi = khoiRong();
  for (const k of ds) gop(moi, k);
  return moi;
}

function canVaoKhoangTrong(ds, khe) {
  let coDoi = false;
  for (let i = 1; i < ds.length - 1; i++) {
    const k = ds[i];
    const trai = khoiRong(), phai = khoiRong();
    for (let j = 0; j < i; j++) gop(trai, ds[j]);
    for (let j = i + 1; j < ds.length; j++) gop(phai, ds[j]);
    const lui = -canhPhai(trai.vien, k.vien, khe);
    const tien = -canhPhai(k.vien, phai.vien, khe);
    if (!Number.isFinite(lui) || !Number.isFinite(tien)) continue;
    let d = (tien - lui) / 2;
    if (typeof k.neoX === 'number') {
      const neoTrai = ds[i - 1].neoX, neoPhai = ds[i + 1].neoX;
      if (typeof neoTrai === 'number') d = Math.max(d, neoTrai + (ds[i - 1].neoW + k.neoW) / 2 + khe - k.neoX);
      if (typeof neoPhai === 'number') d = Math.min(d, neoPhai - (ds[i + 1].neoW + k.neoW) / 2 - khe - k.neoX);
    }
    if (Math.abs(d) > 0.5) { dich(k, d); coDoi = true; }
  }
  return coDoi;
}

function khoiDuoi(ct, neoId) {
  if (ct.daDat.has(neoId)) return null;
  ct.daDat.add(neoId);
  const dai = layDai(ct, neoId);
  for (const id of dai.dx.keys()) ct.daDat.add(id);

  const oX = [...dai.dx.keys()].sort((a, b) => dai.dx.get(a) - dai.dx.get(b));
  const p0 = oX.map((id) => dai.dx.get(id));
  const viTriKhe = new Map();
  const dsUnion = [...dai.thuTuUnion];
  for (const uid of dsUnion) {
    const bd = dai.banDoi.find((b) => b.unionId === uid);
    if (!bd) { viTriKhe.set(uid, { o: oX.indexOf(neoId) }); continue; }
    const j = oX.indexOf(bd.spouseId);
    if (CUNG) viTriKhe.set(uid, { o: oX.indexOf(chaCua(ct, neoId, bd.spouseId)) });
    else viTriKhe.set(uid, { khe: dai.huong > 0 ? j - 1 : j });
  }
  for (const id of oX) {
    if (id === neoId) continue;
    for (const uid of ct.unionLamVo.get(id) || []) {
      if (viTriKhe.has(uid) || !ct.unionHT.get(uid).partners.every((p) => dai.dx.has(p))) continue;
      dsUnion.push(uid);
      viTriKhe.set(uid, { o: oX.indexOf(id) });
    }
  }
  const w = rongId(ct, neoId);
  const wO = oX.map((id) => rongId(ct, id));
  const kheTu = (p, uid) => {
    const v = viTriKhe.get(uid);
    return v.khe !== undefined ? (p[v.khe] + wO[v.khe] + p[v.khe + 1]) / 2 : p[v.o] + wO[v.o] / 2;
  };

  const chum = [];
  dsUnion.forEach((uid, i) => {
    const khoi = [];
    for (const c of ct.unionHT.get(uid).children) {
      if (ct.unionSoHuu.get(c.personId) !== uid) continue;
      if (ct.roiChoCha.has(c.personId)) continue;
      const k = khoiDuoi(ct, c.personId);
      if (k) { k.conId = c.personId; khoi.push(k); }
    }
    if (khoi.length) chum.push({ unionId: uid, khoi, goc: kheTu(p0, uid), i: dai.huong > 0 ? i : -i });
  });

  const kq = khoiRong();
  if (chum.length === 0) {
    oX.forEach((id, j) => themO(ct, kq, id, p0[j]));
    kq.neoX = dai.dxP + w / 2;
    kq.neoW = w;
    return kq;
  }

  chum.sort((a, b) => (a.goc - b.goc) || (a.i - b.i));
  const dsKhoi = [];
  for (const c of chum) for (const k of c.khoi) dsKhoi.push(k);
  gop(kq, xepKhit(dsKhoi, KHE));
  for (const c of chum) {
    c.lo = c.khoi[0].neoX;
    c.hi = c.khoi[c.khoi.length - 1].neoX;
    c.tam = (c.lo + c.hi) / 2;
    const ids = [];
    for (const k of c.khoi) for (const it of k.items) ids.push(it.id);
    ct.cumCon.set(c.unionId, ids);
  }

  let p;
  const dau = chum[0], cuoi = chum[chum.length - 1];
  if (chum.length === 1 && dau.khoi.length === 1) {
    p = p0.map((v) => v + dau.lo - kheTu(p0, dau.unionId));
  } else {
    const lMuon = (dau.tam + cuoi.tam) / 2 - (kheTu(p0, dau.unionId) + kheTu(p0, cuoi.unionId)) / 2;
    const motCho = CUNG && new Set(chum.map((c) => kheTu(p0, c.unionId))).size === 1;
    p = motCho ? p0.map((v) => v + lMuon) : xepDai(p0, chum, viTriKhe, kheTu, lMuon);
  }
  oX.forEach((id, j) => themO(ct, kq, id, p[j]));
  kq.neoX = p[oX.indexOf(neoId)] + w / 2;
  kq.neoW = w;

  for (const c of chum) {
    const m = ct.muc.get(c.khoi[0].conId);
    const x = kheTu(p, c.unionId);
    themVien(kq.vien, m, x, x);
  }

  const l0 = p[0] - p0[0];
  if (p.some((v, j) => Math.abs(v - p0[j] - l0) > 0.01)) {
    const dx = new Map(), khe = new Map();
    oX.forEach((id, j) => dx.set(id, p[j] - p[0]));
    for (const uid of dai.thuTuUnion) khe.set(uid, kheTu(p, uid) - p[0]);
    ct.dai.set(neoId, { ...dai, dx, khe, dxP: dx.get(neoId), rong: p[p.length - 1] - p[0] + wO[wO.length - 1] });
  }
  return kq;
}

function xepDai(p0, chum, viTriKhe, kheTu, lMuon) {
  const rang = chum;
  let lo = -Infinity, hi = Infinity;
  for (const c of rang) {
    const k = kheTu(p0, c.unionId);
    lo = Math.max(lo, c.lo - k);
    hi = Math.min(hi, c.hi - k);
  }
  if (lo <= hi) {
    const l = Math.min(hi, Math.max(lo, lMuon));
    return p0.map((v) => v + l);
  }

  let p = p0.map((v) => v + rang[0].hi - kheTu(p0, rang[0].unionId));
  const trong = (q, c) => { const k = kheTu(q, c.unionId); return k >= c.lo - 0.01 && k <= c.hi + 0.01; };
  rang.forEach((c, i) => {
    const k = kheTu(p, c.unionId);
    if (k >= c.lo) return;
    const v = viTriKhe.get(c.unionId);
    const cach = v.khe !== undefined
      ? [[v.khe + 1, 2 * (c.lo - k)], [v.khe, c.lo - k]]
      : [[v.o, c.lo - k]];
    for (const [t, buoc] of cach) {
      const q = p.map((x, j) => (j >= t ? x + buoc : x));
      if (rang.slice(0, i).every((c2) => trong(q, c2))) { p = q; break; }
    }
  });
  return p;
}

function neoDai(ct, id) {
  const ht = ct.hapThuBoi.get(id);
  return ht ? ht.neoId : id;
}

function tamTrong(k, id) {
  for (const it of k.items) if (it.id === id) return it.x + it.w / 2;
  return undefined;
}

function noiCua(ct, k, uid) {
  const u = ct.unionHT.get(uid);
  for (const p of u.partners) {
    const ht = ct.hapThuBoi.get(p);
    if (!ht || ht.unionId !== uid) continue;
    const dai = ct.dai.get(ht.neoId);
    const x = tamTrong(k, ht.neoId);
    if (dai && x !== undefined) return x - rongId(ct, ht.neoId) / 2 - dai.dxP + dai.khe.get(uid);
  }
  const xs = u.partners.map((p) => tamTrong(k, p)).filter((x) => x !== undefined);
  return xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : undefined;
}

function khoiTren(ct, X) {
  const uid = ct.unionSoHuu.get(X);
  if (!uid) return null;
  const u = ct.unionHT.get(uid);

  const dsNeo = [];
  for (const p of u.partners) {
    const n = neoDai(ct, p);
    if (!dsNeo.includes(n)) dsNeo.push(n);
  }
  if (dsNeo.some((n) => ct.daDat.has(n))) return null;

  dsNeo.sort((a, b) => (gioiTinh(ct, a) === 'M' ? 0 : 1) - (gioiTinh(ct, b) === 'M' ? 0 : 1));
  const dsDai = dsNeo.map((n) => {
    ct.daDat.add(n);
    const dai = layDai(ct, n);
    const k = khoiRong();
    for (const [id, dx] of dai.dx) { ct.daDat.add(id); themO(ct, k, id, dx); }
    k.neoW = rongId(ct, n);
    k.neoX = dai.dxP + k.neoW / 2;
    return k;
  });
  const hang = xepKhit(dsDai, KHE);
  hang.noi = noiCua(ct, hang, uid);

  const xs = hang.items.map((it) => it.x + it.w / 2);
  hang.mepTrai = Math.min(...xs);
  hang.mepPhai = Math.max(...xs);

  const doiTac = u.partners.filter((p) => tamTrong(hang, p) !== undefined)
    .sort((a, b) => tamTrong(hang, a) - tamTrong(hang, b));
  return treoToTien(ct, hang, doiTac, hang.noi);
}

function treoToTien(ct, k, doiTac, noi) {
  const co = [];
  for (const p of doiTac) {
    const t = khoiTren(ct, p);
    if (t) co.push({ p, t, j: doiTac.indexOf(p) });
  }
  if (co.length === 0) return k;

  if (co.length === 1) {
    const { p, t } = co[0];
    dich(t, tamTrong(k, p) - t.noi);
  } else {
    const acc = khoiRong();
    for (const o of co) {
      if (acc.items.length) {
        let d = canhPhai(acc.vien, o.t.vien, KHE);
        if (!Number.isFinite(d)) d = mepCua(acc, true) + KHE - mepCua(o.t, false);
        dich(o.t, d);
      }
      gop(acc, o.t);
    }
    const giua = (co[0].t.noi + co[co.length - 1].t.noi) / 2;
    for (const o of co) dich(o.t, noi - giua);
  }

  let dTrai = 0, dPhai = 0;
  for (const o of co) {
    const benTrai = o.t.noi < noi || (co.length === 1 && o.j === 0 && doiTac.length > 1);
    if (benTrai) dTrai = Math.max(dTrai, canhPhai(o.t.vien, k.vien, KHE));
    else         dPhai = Math.max(dPhai, canhPhai(k.vien, o.t.vien, KHE));
  }
  for (const o of co) {
    const benTrai = o.t.noi < noi || (co.length === 1 && o.j === 0 && doiTac.length > 1);
    dich(o.t, benTrai ? -dTrai : dPhai);
    gop(k, o.t);
  }
  return k;
}

function datBaKhoi(ct) {
  const viTri = new Map();
  const ghi = (k) => { for (const it of k.items) viTri.set(it.id, it.x); };

  const tam = ct.tamId && ct.dsNguoi.includes(ct.tamId) ? ct.tamId : ct.dsNguoi[0];
  const neoTam = neoDai(ct, tam);
  const pu = ct.roiChoCha.has(neoTam) ? null : ct.unionSoHuu.get(neoTam);

  let loi = null, doiTac = [], noi;
  if (pu) {
    const n = neoDai(ct, ct.unionHT.get(pu).partners[0]);
    loi = khoiDuoi(ct, n);
    if (loi) {
      doiTac = ct.unionHT.get(pu).partners.filter((p) => tamTrong(loi, p) !== undefined);
      noi = noiCua(ct, loi, pu);
    }
  }
  if (!loi) {
    loi = khoiDuoi(ct, neoTam);
    if (loi) {
      doiTac = [...layDai(ct, neoTam).dx.keys()];
      const xs = doiTac.map((p) => tamTrong(loi, p));
      noi = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
  }
  if (loi) {
    doiTac.sort((a, b) => tamTrong(loi, a) - tamTrong(loi, b));
    ghi(treoToTien(ct, loi, doiTac, noi));
  }

  for (const id of ct.dsNguoi) {
    if (ct.daDat.has(id)) continue;
    let goc = neoDai(ct, id);
    const daLeo = new Set([goc]);
    for (;;) {
      const uid = ct.unionSoHuu.get(goc);
      if (!uid || ct.roiChoCha.has(goc)) break;
      const len = neoDai(ct, ct.unionHT.get(uid).partners[0]);
      if (ct.daDat.has(len) || daLeo.has(len)) break;
      daLeo.add(len);
      goc = len;
    }
    const k = khoiDuoi(ct, goc);
    if (!k) { ct.daDat.add(id); continue; }
    const x0 = mocLuoi(ct, viTri, k, goc);
    ghi(datGanNhat(ct, viTri, k, x0));
  }
  for (const id of ct.dsNguoi) if (!viTri.has(id)) viTri.set(id, 0);

  canChumConVaoGiua(ct, viTri);

  let min = Infinity;
  for (const x of viTri.values()) if (x < min) min = x;
  if (Number.isFinite(min) && min !== 0) for (const [id, x] of viTri) viTri.set(id, x - min);
  return viTri;
}

function mocLuoi(ct, viTri, k, goc) {
  const trong = new Set(k.items.map((it) => it.id));
  const uid = ct.unionSoHuu.get(goc);
  if (uid) {
    const xs = ct.unionHT.get(uid).partners.map((p) => viTri.get(p)).filter((x) => x !== undefined);
    if (xs.length) return (Math.min(...xs) + Math.max(...xs)) / 2 + rongId(ct, ct.unionHT.get(uid).partners[0]) / 2 - k.neoX;
  }
  for (const it of k.items) {
    for (const u2 of ct.unionLamVo.get(it.id) || []) {
      const u = ct.unionHT.get(u2);
      for (const c of u.children) {
        if (!trong.has(c.personId) && viTri.has(c.personId)) return viTri.get(c.personId) - it.x;
      }
      for (const p of u.partners) {
        if (!trong.has(p) && viTri.has(p)) return viTri.get(p) - it.x;
      }
    }
  }
  let phai = -Infinity;
  for (const [id, x] of viTri) phai = Math.max(phai, x + rongId(ct, id));
  return Number.isFinite(phai) ? phai + LAYOUT.blockGap - mepCua(k, false) : 0;
}

function datGanNhat(ct, viTri, k, x0) {
  for (let b = 0; b <= 20000; b += 4) {
    for (const d of (b === 0 ? [x0] : [x0 + b, x0 - b])) {
      if (!deChoNay(ct, viTri, k, d)) { dich(k, d); return k; }
    }
  }
  let phai = -Infinity;
  for (const [id, x] of viTri) phai = Math.max(phai, x + rongId(ct, id));
  dich(k, phai + LAYOUT.blockGap - mepCua(k, false));
  return k;
}

function soBanDoiAn(ct, unionId) {
  const uGoc = ct.index.unionById.get(unionId);
  const ds = (uGoc && Array.isArray(uGoc.partners)) ? uGoc.partners : [];
  return ds.filter((pid) => pid && ct.index.personById.has(pid) && !ct.visibleSet.has(pid)).length;
}
function thieuBanDoiCua(ct, unionId) { return soBanDoiAn(ct, unionId) > 0; }

function netNgangCat(ct, x, y) {
  const r = LAYOUT.stubRadius + 2;
  for (const l of ct.links || []) {
    const p = l.points || [];
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x2, y2] = p[i];
      if (Math.abs(y0 - y2) > 0.5 || Math.abs(y0 - y) > r) continue;
      if (x >= Math.min(x0, x2) - r && x <= Math.max(x0, x2) + r) return true;
    }
  }
  return false;
}

function soConAn(ct, unionId) {
  const uGoc = ct.index.unionById.get(unionId);
  const ds = (uGoc && Array.isArray(uGoc.children)) ? uGoc.children : [];
  return ds.filter((c) => c && c.personId && ct.index.personById.has(c.personId) &&
                          !ct.visibleSet.has(c.personId)).length;
}
function conAnCua(ct, unionId) { return soConAn(ct, unionId) > 0; }

function unionCoNotNeXuong(ct, stubPoints) {
  const ra = new Map();
  if (!Array.isArray(stubPoints)) return ra;

  for (const sp of stubPoints) {
    if (!sp || sp.direction === 'up') continue;
    const u = ct.unionHT.get(sp.unionId);
    if (!u || !conAnCua(ct, sp.unionId)) continue;
    if (!u.children.some((c) => ct.nodeById.has(c.personId))) continue;
    const dai = ct.dai.get(sp.personId);
    ra.set(sp.unionId, dai ? dai.huong : 1);
  }
  return ra;
}

function nhipNotCut(ct, u, xTreo, huong) {
  let lo = xTreo, hi = xTreo, coCon = false, wCon = RONG;
  for (const c of u.children) {
    const con = ct.nodeById.get(c.personId);
    if (!con) continue;
    coCon = true;
    wCon = con.w;
    const cx = con.x + con.w / 2;
    if (cx < lo) lo = cx;
    if (cx > hi) hi = cx;
  }
  if (!coCon) return null;

  let ra, goc;
  if (xTreo >= hi - 0.5)      { ra =  1; goc = hi; }
  else if (xTreo <= lo + 0.5) { ra = -1; goc = lo; }
  else                        { ra = huong; goc = huong > 0 ? hi : lo; }

  return { goc, x: goc + ra * (wCon / 2 + KHE) };
}

function nhipThanhNgang(ct, t, neXuong) {
  const u = ct.unionHT.get(t.id);
  if (!u) return null;

  let a = t.x, b = t.x, co = false;
  for (const c of u.children) {
    const con = ct.nodeById.get(c.personId);
    if (!con) continue;
    if (ct.unionSoHuu.get(c.personId) !== t.id) continue;
    const cx = con.x + con.w / 2;
    if (Math.abs(t.x - cx) <= 0.5) continue;
    a = Math.min(a, cx);
    b = Math.max(b, cx);
    co = true;
  }

  if (neXuong && neXuong.has(t.id)) {
    const nhip = nhipNotCut(ct, u, t.x, neXuong.get(t.id));
    if (nhip) {
      a = Math.min(a, nhip.goc, nhip.x);
      b = Math.max(b, nhip.goc, nhip.x);
      co = true;
    }
  }

  return co ? { a, b } : null;
}

function xepMucThanhNgang(ct, unions, neXuong) {
  const tran = KHONG_ANH ? KHE_DOC - CUNG.cao - 3
    : KHE_DOC - LAYOUT.stubLength - LAYOUT.stubRadius - 2;

  const theoHang = new Map();
  for (const t of unions) {
    const nhip = nhipThanhNgang(ct, t, neXuong);
    if (!nhip) continue;
    const khoa = Math.round(t.busY);
    if (!theoHang.has(khoa)) theoHang.set(khoa, []);
    theoHang.get(khoa).push({ t, a: nhip.a, b: nhip.b, muc: 0 });
  }

  for (const [, ds] of theoHang) {
    ds.sort((p, q) => (p.a - q.a) || (p.t.id < q.t.id ? -1 : 1));

    const daXep = [];
    let caoNhat = 0;
    for (const it of ds) {
      let m = 0;
      while (daXep[m] && daXep[m].some(
        (k) => Math.min(it.b, k.b) - Math.max(it.a, k.a) > 0.5)) m += 1;
      if (!daXep[m]) daXep[m] = [];
      daXep[m].push(it);
      it.muc = m;
      if (m > caoNhat) caoNhat = m;
    }
    if (caoNhat === 0) continue;

    const buoc = Math.min(LAYOUT.buocThanhNgang,
                          (tran - LAYOUT.khoangSatChu) / caoNhat);
    for (const it of ds) it.t.busY += it.muc * buoc;
  }
}

function dungDiemTreo(ct, stubPoints) {
  const neoTheoUnion = new Map();
  for (const [, ht] of ct.hapThuBoi) neoTheoUnion.set(ht.unionId, ht.neoId);

  const ra = [];
  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u = ct.unionHT.get(uid);
    let neoId = neoTheoUnion.get(uid) || null;

    let x, y, busY, kieu;
    if (neoId && ct.dai.has(neoId)) {
      const dai = ct.dai.get(neoId);
      const nut = ct.nodeById.get(neoId);
      x    = nut.x - dai.dxP + dai.khe.get(uid);
      y    = CUNG ? nut.y + 1 : nut.y + netNut(nut) - (dai.mucNet.get(uid) || 0) * dai.buocNet;
      busY = nut.y + nut.h + LAYOUT.khoangSatChu;
      kieu = dai.n > 0 ? 'khe' : 'don';
    } else if (u.partners.length === 1) {
      const nut = ct.nodeById.get(u.partners[0]);
      x    = nut.x + nut.w / 2;
      y    = CUNG ? nut.y + 1 : nut.y + netNut(nut);
      busY = nut.y + nut.h + LAYOUT.khoangSatChu;
      kieu = 'don';
      neoId = u.partners[0];
    } else {
      const a = ct.nodeById.get(u.partners[0]);
      const b = ct.nodeById.get(u.partners[1]);
      x    = (a.x + b.x) / 2 + a.w / 2;
      y    = a.y === b.y ? mucVong(a, b) : (a.y + b.y) / 2 + netNut(a);
      busY = Math.max(a.y + a.h, b.y + b.h) + LAYOUT.khoangSatChu;
      kieu = 'cheo';
      neoId = u.partners[0];
    }

    ra.push({ id: uid, x, y, busY, kieu, neoId, partnerIds: u.partners.slice() });
  }

  xepMucThanhNgang(ct, ra, unionCoNotNeXuong(ct, stubPoints));
  return ra;
}

function dungDuongNoi(ct, unions) {
  const links = [];
  const treoCua = new Map(unions.map((t) => [t.id, t]));

  for (const uid of [...ct.unionHT.keys()].sort()) {
    const u   = ct.unionHT.get(uid);
    const treo = treoCua.get(uid);

    for (let i = 1; i < u.partners.length; i++) {
      themNetVoChong(ct, links, uid, u.partners[0], u.partners[i]);
    }

    for (const c of u.children) {
      const con = ct.nodeById.get(c.personId);
      if (!con) continue;

      const netDai = ct.unionSoHuu.get(c.personId) !== uid;
      const cxGiua = con.x + con.w / 2;
      const cx   = netDai ? (treo.x > cxGiua ? con.x + con.w * 0.75 : con.x + con.w * 0.25)
                          : cxGiua;
      const busY = netDai
        ? Math.min(treo.busY - LAYOUT.lechNetDai, con.y - 1)
        : Math.min(treo.busY, con.y - 1);

      const points = [[treo.x, treo.y]];
      if (Math.abs(treo.x - cx) > 0.5) { points.push([treo.x, busY]); points.push([cx, busY]); }
      points.push([cx, con.y + chamVongAnh(cx - cxGiua)]);

      links.push({
        kind: 'child',
        relation: c.relation,
        unionId: uid,
        from: uid,
        to: c.personId,
        points,
        netDai,
        cheo: false,
      });
    }
  }

  return links;
}

function chamVongAnh(dx) {
  if (KHONG_ANH) return 0;
  const R = PHOTO.banKinhTrenO;
  const d = Math.min(Math.abs(dx), R);
  return PHOTO.leTrenO + R - Math.sqrt(R * R - d * d);
}

function themNetVoChong(ct, links, uid, aId, bId) {
  const a = ct.nodeById.get(aId);
  const b = ct.nodeById.get(bId);
  if (!a || !b) return;

  const htA = ct.hapThuBoi.get(aId);
  const htB = ct.hapThuBoi.get(bId);
  const keNhau = (htA && htA.unionId === uid) || (htB && htB.unionId === uid);

  if (keNhau) {
    const neoId = htA && htA.unionId === uid ? htA.neoId : htB.neoId;
    const dai   = ct.dai.get(neoId);
    const neo   = ct.nodeById.get(neoId);
    const kia   = neoId === aId ? b : a;
    if (CUNG) {
      const muc = dai.mucNet.get(uid) || 0;
      const x1 = neo.x + neo.w * (dai.huong > 0 ? 0.75 : 0.25);
      const x2 = kia.x + kia.w * (dai.huong > 0 ? 0.25 : 0.75);
      links.push({ kind: 'spouse', relation: null, unionId: uid, from: neoId, to: kia.id,
                   points: [[x1, neo.y], [x2, kia.y]], netDai: false, cheo: false,
                   cung: Math.min(CUNG.tran, CUNG.cao + muc * CUNG.buoc) });
      return;
    }
    const y     = neo.y + netNut(neo) - (dai.mucNet.get(uid) || 0) * dai.buocNet;
    const x1    = dai.huong > 0 ? neo.x + neo.w - leAnh(neo) : neo.x + leAnh(neo);
    const x2    = dai.huong > 0 ? kia.x + leAnh(kia)     : kia.x + kia.w - leAnh(kia);
    links.push({ kind: 'spouse', relation: null, unionId: uid, from: neoId, to: kia.id,
                 points: [[x1, y], [x2, y]], netDai: false, cheo: false });
    return;
  }

  const ax = a.x + a.w / 2, ay = a.y + netNut(a);
  const bx = b.x + b.w / 2, by = b.y + netNut(b);

  if (a.gen !== b.gen) {
    links.push({ kind: 'spouse', relation: null, unionId: uid, from: aId, to: bId,
                 points: [[ax, ay], [bx, by]], netDai: true, cheo: true });
    return;
  }

  const vong = mucVong(a, b);
  links.push({ kind: 'spouse', relation: null, unionId: uid, from: aId, to: bId,
               points: [[ax, ay], [ax, vong], [bx, vong], [bx, by]], netDai: true, cheo: false });
}

function mucVong(a, b) {
  return Math.max(a.y + a.h, b.y + b.h) + LAYOUT.khoangNetVong;
}

function dungNotCut(ct, unions, stubPoints) {
  if (!Array.isArray(stubPoints) || stubPoints.length === 0) return [];
  const treoCua = new Map(unions.map((t) => [t.id, t]));
  const gop = new Map();

  const ds = [];
  for (const sp of stubPoints) {
    if (!sp || sp.direction === 'up') { ds.push(sp); continue; }
    const nBd = soBanDoiAn(ct, sp.unionId), nCon = soConAn(ct, sp.unionId);
    if (nBd > 0) ds.push({ ...sp, ep: 'ngang', hiddenCount: nCon > 0 ? nBd : sp.hiddenCount });
    if (nCon > 0) ds.push({ ...sp, ep: 'xuong', hiddenCount: nBd > 0 ? nCon : sp.hiddenCount });
    if (nBd === 0 && nCon === 0) ds.push(sp);
  }

  for (const sp of ds) {
    if (sp && sp.direction === 'up') {
      const u = ct.index.unionById.get(sp.unionId);
      if (u && (u.partners || []).some((p) => ct.visibleSet.get(p) === 'full')) continue;
    }
    const nut = ct.nodeById.get(sp && sp.personId);
    if (!nut) continue;
    const diem = viTriNotCut(ct, treoCua, sp, nut);
    if (!diem) continue;

    const khoa = Math.round(diem.x) + '|' + Math.round(diem.y);
    if (gop.has(khoa)) {
      const cu = gop.get(khoa);
      cu.hiddenCount += sp.hiddenCount || 0;
      cu.nguon.push({ personId: sp.personId, unionId: sp.unionId,
                      direction: sp.direction, hiddenCount: sp.hiddenCount });
      continue;
    }
    gop.set(khoa, {
      personId: sp.personId,
      unionId:  sp.unionId,
      direction: sp.direction,
      hiddenCount: sp.hiddenCount || 0,
      x: diem.x, y: diem.y, x1: diem.x1, y1: diem.y1, angle: diem.angle,
      duong: diem.duong || null,
      nguon: [{ personId: sp.personId, unionId: sp.unionId,
                direction: sp.direction, hiddenCount: sp.hiddenCount }],
    });
  }

  return [...gop.values()];
}

function viTriNotCut(ct, treoCua, sp, nut) {
  const L = LAYOUT.stubLength;

  if (sp.direction === 'up') {
    const x = nut.x + nut.w / 2;
    return { x, y: nut.y - L, x1: x, y1: nut.y, angle: -90 };
  }

  const u    = ct.unionHT.get(sp.unionId);
  const treo = treoCua.get(sp.unionId);
  const dai  = ct.dai.get(sp.personId);

  const thieuBanDoi = sp.ep ? sp.ep === 'ngang' : thieuBanDoiCua(ct, sp.unionId);

  if (!u && !thieuBanDoi) {
    const x = nut.x + nut.w / 2;
    const dayTen = KHONG_ANH ? nut.h
      : PHOTO.leTrenO + 2 * PHOTO.banKinhTrenO - VE.deLenAnh +
        VE.leTrongBang * 2 + VE.buocDongTen;
    let yNot = Math.min(nut.y + nut.h + LAYOUT.stubRadius - 3,
                        nut.y + nut.h + LAYOUT.khoangSatChu - LAYOUT.stubRadius - 2);
    if (netNgangCat(ct, x, yNot)) yNot = nut.y + nut.h + KHE_DOC - LAYOUT.stubRadius - 2;
    return { x, y: yNot, x1: x, y1: nut.y + dayTen, angle: 90 };
  }

  if (thieuBanDoi) {
    const LN = LAYOUT.stubLengthNgang;

    const ht     = ct.hapThuBoi.get(sp.personId);
    const neoId  = ct.dai.has(sp.personId) ? sp.personId : (ht ? ht.neoId : null);
    const daiNg  = neoId ? ct.dai.get(neoId) : null;
    const nutNeo = neoId ? ct.nodeById.get(neoId) : null;

    const huong = daiNg ? daiNg.huong : (gioiTinh(ct, sp.personId) === 'F' ? -1 : 1);
    const mepDai = (daiNg && nutNeo)
      ? (huong > 0 ? nutNeo.x - daiNg.dxP + daiNg.rong : nutNeo.x - daiNg.dxP)
      : (huong > 0 ? nut.x + nut.w : nut.x);
    const y = dai
      ? nut.y + netNut(nut) - (dai.mucNet.get(sp.unionId) || 0) * dai.buocNet
      : nut.y + netNut(nut);
    let ngoaiCung = sp.personId;
    if (daiNg) {
      let dxMep = null;
      for (const [id, d] of daiNg.dx) {
        if (dxMep === null || (huong > 0 ? d > dxMep : d < dxMep)) { dxMep = d; ngoaiCung = id; }
      }
    }
    const R  = KHONG_ANH ? 0 : PHOTO.banKinhTrenO;
    const dy = Math.min(Math.abs(y - nut.y - netNut(nut)), R);
    let x1 = ngoaiCung === sp.personId
      ? mepDai - huong * (leAnh(nut) + R - Math.sqrt(R * R - dy * dy))
      : mepDai;
    if (x1 !== mepDai && netNgangCat(ct, x1 + huong * LN, y)) x1 = mepDai;
    return { x: x1 + huong * LN, y, x1, y1: y, angle: huong > 0 ? 0 : 180 };
  }

  const huong = dai ? dai.huong : 1;
  const xTreo = treo ? treo.x : nut.x + nut.w / 2;
  const y1    = treo ? treo.y : nut.y + netNut(nut);
  const busY  = treo ? treo.busY : nut.y + netNut(nut);

  const tranY = nut.y + nut.h + KHE_DOC - LAYOUT.stubRadius - 2;
  const yDay  = tranY;

  const nhip = nhipNotCut(ct, u, xTreo, huong);

  if (!nhip) return { x: xTreo, y: yDay, x1: xTreo, y1, angle: 90 };

  return {
    x: nhip.x, y: yDay, x1: nhip.goc, y1: busY, angle: 90,
    duong: [[nhip.goc, busY], [nhip.x, busY], [nhip.x, yDay]],
  };
}

function tinhBounds(nodes, links, stubs) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const nhet = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const n of nodes) { nhet(n.x, n.y); nhet(n.x + n.w, n.y + n.h); }
  for (const l of links) for (const p of l.points) nhet(p[0], p[1]);
  for (const s of stubs) {
    nhet(s.x - LAYOUT.stubRadius, s.y - LAYOUT.stubRadius);
    nhet(s.x + LAYOUT.stubRadius, s.y + LAYOUT.stubRadius);
  }

  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX: minX - DEM, minY: minY - DEM, maxX: maxX + DEM, maxY: maxY + DEM };
}
