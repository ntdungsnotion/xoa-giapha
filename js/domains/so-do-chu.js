import { O_CHU } from '../config.js';
import { dongOChu } from '../utils/text.js';
import { computeLayout } from './layout.js';

function ngatTen(ten, co, tran, doRong) {
  const tu = String(ten).split(/\s+/).filter(Boolean);
  if (tu.length <= 1) return [String(ten)];
  const ra = [];
  let dong = tu[0];
  for (let i = 1; i < tu.length; i++) {
    const thu = dong + ' ' + tu[i];
    if (doRong(thu, co) <= tran) dong = thu;
    else { ra.push(dong); dong = tu[i]; }
  }
  ra.push(dong);
  return ra;
}

export function xepCheDoChu(index, focus, visible, scope, doRong, hienGio) {
  const tran = doRong(O_CHU.tenChuan, O_CHU.dong.ten.co);
  const nguoi = new Map();
  const doChu = (id) => {
    if (nguoi.has(id)) return nguoi.get(id);
    const dong = [];
    for (const d of dongOChu(index.personById.get(id), id, hienGio)) {
      if (d.loai !== 'ten') { dong.push(d); continue; }
      for (const s of ngatTen(d.chu, O_CHU.dong.ten.co, tran, doRong)) dong.push({ loai: 'ten', chu: s });
    }
    let dai = 0, day = 2 * O_CHU.le;
    for (const d of dong) {
      dai = Math.max(dai, doRong(d.chu, O_CHU.dong[d.loai].co));
      day += O_CHU.dong[d.loai].cao;
    }
    const v = { dong, dai, day };
    nguoi.set(id, v);
    return v;
  };

  const ngang = new Set();
  let hang = new Map();
  const oHang = (m, ids) => {
    let dai = 0, dayMax = 0;
    for (const id of ids) {
      const v = doChu(id);
      if (v.dai > dai) dai = v.dai;
      if (v.day > dayMax) dayMax = v.day;
    }
    const beDai = Math.ceil(Math.min(dai, tran)) + 2 * O_CHU.le;
    let o;
    if (ngang.has(m)) {
      o = { ngang: true, w: beDai, h: dayMax };
    } else {
      o = { ngang: false, w: dayMax, h: beDai, rieng: new Map(ids.map((id) => [id, doChu(id).day])) };
    }
    o.net = o.h / 2;
    o.soNguoi = ids.length;
    hang.set(m, o);
    return o;
  };

  let soLanXep = 0;
  const xep = () => {
    hang = new Map();
    soLanXep++;
    return computeLayout(index, focus, visible, scope, [], { oHang, khe: O_CHU });
  };
  const beNgang = (l) => l.bounds.maxX - l.bounds.minX;

  let layout = xep();
  let hangChot = hang;
  const W0 = beNgang(layout);

  const ds = [...hangChot.entries()].map(([m, o]) => ({ m, n: o.soNguoi }));
  let dongNhat = ds[0];
  for (const d of ds) if (d.n > dongNhat.n || (d.n === dongNhat.n && d.m > dongNhat.m)) dongNhat = d;
  const thu = ds.filter((d) => d !== dongNhat).sort((a, b) => (a.n - b.n) || (a.m - b.m));

  for (const d of thu) {
    ngang.add(d.m);
    const l = xep();
    if (beNgang(l) <= W0 + 0.5) { layout = l; hangChot = hang; }
    else ngang.delete(d.m);
  }
  return { layout, hang: hangChot, nguoi, soLanXep };
}
