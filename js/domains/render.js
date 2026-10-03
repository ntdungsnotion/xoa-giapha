import { LAYOUT, PHOTO, O_CHU } from '../config.js';
import { fullName, doiSongTuoi, ngayGio, dongOChu } from '../utils/text.js';
import { driveThumbUrl } from '../utils/image.js';
import { anhMacDinhUri } from '../utils/avatar.js';

const NS = 'http://www.w3.org/2000/svg';

let demLanVe = 0;

export const VE = {
  chuTen:      11,
  chuTenNho:   10,

  nenToiDaPt:  1,
  sanNen:      0.90,
  leTrongO:    12,
  chuNam:      9.5,
  chuDem:      10,
  phong:       'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',

  nenBangTen:   '#ffffff',
  vienBangTen:  '#ece5db',
  boBangTen:    5,
  leBangTen:    3,
  leTrongBang:  3,
  buocDongTen:  11,
  deLenAnh:      8,

  leNenChu:      3,

  buocDongPhu:  11,
  chuGio:       9.5,
  chuGioMau:    '#9b8f7f',

  nenTrang:    '#faf8f5',
  chuChinh:    '#2a2622',
  chuPhu:      '#8a8078',

  vienNam:     '#3f6b8a',
  vienNu:      '#a4576b',
  vienKhongRo: '#8a8078',

  quangTrungTam: '#e08a3c',
  net:           '#6b6157',
  notCut:        '#c07a3e',

  dayNetCon:   1.6,
  dayNetVo:    1.2,
  dayQuang:    3,

  motNetDut:   '6 4',
  motNetGachCham: '5 3 1 3',
  motNetOBien: '4 3',
  vienOChuBien: '#c4b8a8',

  moNetDai:    0.5,
  bo:          8,
};

export function renderTree(svgEl, layout, index, handlers, tuyChon) {
  if (!svgEl) return;
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  if (!layout || !Array.isArray(layout.nodes) || layout.nodes.length === 0) return;

  demLanVe += 1;
  const xuLy    = handlers || {};
  const hienGio = !!(tuyChon && tuyChon.hienNgayGio);
  const b    = layout.bounds || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const rong = Math.max(1, b.maxX - b.minX);
  const cao  = Math.max(1, b.maxY - b.minY);

  svgEl.setAttribute('viewBox', b.minX + ' ' + b.minY + ' ' + rong + ' ' + cao);
  svgEl.setAttribute('width',  String(rong));
  svgEl.setAttribute('height', String(cao));
  svgEl.setAttribute('font-family', VE.phong);

  const gDuong = tao('g', { 'data-lop': 'duong' });
  const gO     = tao('g', { 'data-lop': 'o' });
  const gNot   = tao('g', { 'data-lop': 'not-cut' });

  for (const link of layout.links || []) {
    const el = renderLink(link);
    if (el) gDuong.append(el);
  }

  const notCho = [];
  for (const stub of layout.stubs || []) {
    const phan = renderStub(stub, xuLy.onChonNotCut);
    if (!phan) continue;
    gDuong.append(phan.net);
    notCho.push(phan.nut);
  }

  for (const node of layout.nodes) {
    const person = index && index.personById ? index.personById.get(node.id) : null;
    const hangChu = tuyChon && tuyChon.hangChu;
    const el = hangChu
      ? renderOChu(node, person, node.kind, hangChu.get(node.gen),
                   tuyChon.nguoiChu && tuyChon.nguoiChu.get(node.id), hienGio)
      : renderPersonNode(node, person, node.kind, hienGio);
    if (!el) continue;
    if (xuLy.onChonNguoi) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => xuLy.onChonNguoi(node.id));
    }
    gO.append(el);
  }

  for (const nut of notCho) gNot.append(nut);

  svgEl.append(gDuong, gO, gNot);
}

function renderPersonNode(node, person, kind, hienGio) {
  const g = tao('g', { 'data-id': node.id });
  const laBien = kind === 'edge';
  const tamX   = node.x + node.w / 2;
  const R      = PHOTO.banKinhTrenO;

  g.append(renderAnhTrongO(node, person, laBien, node.laTrungTam));

  const ten       = fullName(person) || node.id;
  const rongOTen  = Math.max(node.w, Number(node.rongTenToiDa) || node.w);
  const rongChuan = node.w   - VE.leBangTen * 2 - 6;
  const rongMax   = rongOTen - VE.leBangTen * 2 - 6;

  const keTen    = xepTen(ten, rongChuan, rongMax);
  const dong     = keTen.dong;
  const coChu    = keTen.coChu;
  const rongBang = keTen.rongChu + 6;

  const dinhBang = node.y + PHOTO.leTrenO + 2 * R - VE.deLenAnh;
  const caoBang  = VE.leTrongBang * 2 + dong.length * VE.buocDongTen;

  g.append(tao('rect', {
    x: tamX - rongBang / 2, y: dinhBang,
    width: rongBang, height: caoBang,
    rx: VE.boBangTen,
    fill: VE.nenBangTen,
    stroke: VE.vienBangTen, 'stroke-width': 1,
  }));

  const mauTen = laBien ? VE.chuPhu : VE.chuChinh;
  const dauTen = dinhBang + VE.leTrongBang + coChu * 0.82;
  dong.forEach((chuoi, i) => {
    g.append(chu(chuoi, tamX, dauTen + i * VE.buocDongTen, coChu, mauTen,
                 keTen.rongChu, keTen.ep));
  });

  const doi = doiSongTuoi(person);
  let y = dinhBang + caoBang + VE.buocDongPhu;
  if (doi) {
    for (const el of chuDuoiBang(doi, tamX, y, VE.chuNam, VE.chuPhu,
                                 node.w - VE.leTrongO)) g.append(el);
    y += VE.buocDongPhu;
  }

  const gio = hienGio ? ngayGio(person) : '';
  if (gio) {
    for (const el of chuDuoiBang('Giỗ: ' + gio, tamX, y, VE.chuGio, VE.chuGioMau,
                                 node.w - VE.leTrongO)) g.append(el);
  }

  const nhan = tao('title');
  nhan.textContent = ten + (doi ? '  ·  ' + doi : '') +
                     (ngayGio(person) ? '  ·  giỗ ' + ngayGio(person) : '') +
                     (laBien ? '  —  nhánh của người này không được vẽ tiếp' : '');
  g.append(nhan);

  return g;
}

function renderOChu(node, person, kind, o, oNguoi, hienGio) {
  const g = tao('g', { 'data-id': node.id });
  const laBien = kind === 'edge';
  const { x, y, w } = node;
  const ngang = !o || o.ngang;
  const h = ngang && oNguoi ? oNguoi.day : node.h;

  g.append(tao('rect', {
    x, y, width: w, height: h, rx: 3,
    fill: VE.nenBangTen,
    stroke: node.laTrungTam ? VE.quangTrungTam : (laBien ? VE.vienOChuBien : VE.vienBangTen),
    'stroke-width': node.laTrungTam ? 2 : 1,
    'stroke-dasharray': laBien && !node.laTrungTam ? VE.motNetOBien : null,
  }));
  g.append(tao('rect', ngang
    ? { x, y, width: 3, height: h, fill: mauVien(person) }
    : { x, y: y + h - 3, width: w, height: 3, fill: mauVien(person) }));

  const goc = dongOChu(person, node.id, hienGio);
  const dong = oNguoi ? oNguoi.dong : goc;
  const mau = { ten: laBien ? VE.chuPhu : VE.chuChinh, nam: VE.chuPhu, gio: VE.chuGioMau };
  let tong = 0;
  for (const d of dong) tong += O_CHU.dong[d.loai].cao;

  let da = 0;
  for (const d of dong) {
    const { co, cao } = O_CHU.dong[d.loai];
    const tam = da + cao / 2;
    da += cao;
    if (ngang) {
      const cy = y + (h - tong) / 2 + tam;
      g.append(chu(d.chu, x + w / 2, cy + co * 0.35, co, mau[d.loai], w - 2 * O_CHU.le));
      continue;
    }
    const cx = x + (w + tong) / 2 - tam;
    const t = tao('text', {
      transform: 'translate(' + (cx - co * 0.35) + ',' + (y + O_CHU.le) + ') rotate(90)',
      'font-size': co,
      fill: mau[d.loai],
    });
    const dai = h - 2 * O_CHU.le;
    if (beRong(d.chu, co) > dai) {
      t.setAttribute('textLength', String(dai));
      t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    t.textContent = d.chu;
    g.append(t);
  }

  const ten = goc[0].chu;
  const nhan = tao('title');
  nhan.textContent = goc.map((d) => d.chu).join('  ·  ') +
                     (laBien ? '  —  nhánh của người này không được vẽ tiếp' : '');
  g.append(nhan);
  g.setAttribute('aria-label', ten);
  return g;
}

function renderAnhTrongO(node, person, laBien, laTrungTam) {
  const R  = PHOTO.banKinhTrenO;
  const cx = node.x + node.w / 2;
  const cy = node.y + PHOTO.leTrenO + R;

  const g  = tao('g');
  const ma = 'anh-' + demLanVe + '-' + String(node.id).replace(/[^A-Za-z0-9_-]/g, '');

  const cat = tao('clipPath', { id: ma });
  cat.append(tao('circle', { cx, cy, r: R }));
  g.append(cat);

  if (laBien) g.append(tao('circle', { cx, cy, r: R, fill: VE.nenTrang }));

  const oAnh = {
    x: cx - R, y: cy - R, width: 2 * R, height: 2 * R,
    'clip-path': 'url(#' + ma + ')',
    preserveAspectRatio: 'xMidYMid slice',
    opacity: 1,
  };

  g.append(tao('image', Object.assign({
    href: anhMacDinhUri(person && person.sex, mauVien(person)),
  }, oAnh)));

  const anhThat = person && typeof person.photoFileId === 'string'
    ? person.photoFileId.trim() : '';
  if (anhThat) {
    const duong = driveThumbUrl(anhThat, PHOTO.thumbSize);
    const oThat = tao('image', Object.assign({}, oAnh));
    g.append(oThat);

    const thu = new Image();
    thu.onload = () => {
      if (thu.naturalWidth > 0 && thu.naturalHeight > 0) {
        oThat.setAttribute('href', duong);
      }
    };
    thu.src = duong;
  }

  g.append(tao('circle', {
    cx, cy, r: R, fill: 'none', stroke: '#ffffff', 'stroke-width': 2,
  }));
  g.append(tao('circle', {
    cx, cy, r: R, fill: 'none', stroke: mauVien(person),
    'stroke-width': laBien ? 1.4 : 1.8,
    'stroke-opacity': laBien ? 0.6 : 0.85,
    'stroke-dasharray': laBien ? VE.motNetOBien : null,
  }));

  if (laTrungTam) {
    g.append(tao('circle', {
      cx, cy, r: R + 4, fill: 'none',
      stroke: VE.quangTrungTam, 'stroke-width': VE.dayQuang,
    }));
  }

  return g;
}

export function mauVien(person) {
  const gt = (person && person.sex) || 'U';
  if (gt === 'M') return VE.vienNam;
  if (gt === 'F') return VE.vienNu;
  return VE.vienKhongRo;
}

const PT = 96 / 72;

function xepTen(ten, rongChuan, rongMax) {
  const s = String(ten || '').trim();
  const vua = (dong, coChu, rongChu, ep) => ({ dong, coChu, rongChu, ep });

  if (s === '') return vua([''], VE.chuTen, rongChuan, null);

  const w = beRong(s, VE.chuTen);

  if (w <= rongChuan) return vua([s], VE.chuTen, rongChuan, null);

  if (w <= rongMax) return vua([s], VE.chuTen, Math.ceil(w), null);

  const khe   = Math.max(1, s.length - 1);
  const thieu = w - rongMax;

  if (thieu / khe <= VE.nenToiDaPt * PT) {
    return vua([s], VE.chuTen, rongMax, 'spacing');
  }

  if (rongMax / w >= VE.sanNen) {
    return vua([s], VE.chuTen, rongMax, 'spacingAndGlyphs');
  }

  const tu = s.split(/\s+/);
  if (tu.length === 1) return vua([s], VE.chuTen, rongMax, 'spacingAndGlyphs');

  let cat = -1;
  for (let i = 1; i < tu.length; i++) {
    if (beRong(tu.slice(0, i).join(' '), VE.chuTenNho) <= rongMax) cat = i;
  }
  if (cat <= 0) cat = tu.length - 1;
  return vua([tu.slice(0, cat).join(' '), tu.slice(cat).join(' ')],
             VE.chuTenNho, rongMax, 'spacingAndGlyphs');
}

const nhoRong = new Map();
let doChu;

export function beRong(s, coChu) {
  const khoa = coChu + '|' + s;
  if (nhoRong.has(khoa)) return nhoRong.get(khoa);

  if (doChu === undefined) {
    try {
      doChu = document.createElement('canvas').getContext('2d');
    } catch (e) {
      doChu = null;
    }
  }

  const rong = doChu
    ? (doChu.font = coChu + 'px ' + VE.phong, doChu.measureText(String(s)).width)
    : String(s).length * coChu * 0.55;

  nhoRong.set(khoa, rong);
  return rong;
}

function renderLink(link) {
  if (!link || !Array.isArray(link.points) || link.points.length < 2) return null;

  const laCon  = link.kind === 'child';
  const conNuoi = laCon && link.relation && link.relation !== 'birth';

  if (link.cung > 0) {
    const [[x1, y1], [x2, y2]] = link.points;
    return tao('path', {
      d: 'M' + x1 + ',' + y1 + ' Q' + (x1 + x2) / 2 + ',' + (Math.min(y1, y2) - 2 * link.cung) +
         ' ' + x2 + ',' + y2,
      fill: 'none',
      stroke: VE.net,
      'stroke-width': VE.dayNetVo,
      'stroke-opacity': link.netDai ? VE.moNetDai : 1,
      'stroke-linecap': 'round',
    });
  }

  return tao('polyline', {
    points: link.points.map((p) => p[0] + ',' + p[1]).join(' '),
    fill: 'none',
    stroke: VE.net,
    'stroke-width': laCon ? VE.dayNetCon : VE.dayNetVo,
    'stroke-dasharray': conNuoi ? VE.motNetDut : null,
    'stroke-opacity': link.netDai ? VE.moNetDai : 1,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });
}

function renderStub(stub, onClick) {
  if (!stub || !Number.isFinite(stub.x) || !Number.isFinite(stub.y)) return null;

  const kieuNet = {
    stroke: VE.notCut,
    'stroke-width': VE.dayNetVo,
    'stroke-dasharray': VE.motNetGachCham,
    'stroke-linecap': 'round',
  };
  const net = Array.isArray(stub.duong) && stub.duong.length >= 2
    ? tao('polyline', Object.assign({
        points: stub.duong.map((p) => p[0] + ',' + p[1]).join(' '),
        fill: 'none',
      }, kieuNet))
    : tao('line', Object.assign({
        x1: stub.x1, y1: stub.y1, x2: stub.x, y2: stub.y,
      }, kieuNet));

  const nut = tao('g', {
    'data-not-cut': (stub.personId || '') + '|' + (stub.unionId || ''),
  });

  nut.append(tao('circle', {
    cx: stub.x, cy: stub.y, r: LAYOUT.stubRadius + 10,
    fill: 'transparent',
  }));
  nut.append(tao('circle', {
    cx: stub.x, cy: stub.y, r: LAYOUT.stubRadius,
    fill: VE.notCut,
  }));

  const dem = Number(stub.hiddenCount) || 0;
  if (dem > 1) {
    const goc = Number(stub.angle) || 0;
    const d   = LAYOUT.stubRadius + 9;
    const ngang = goc === 0 || goc === 180;
    const x = ngang ? stub.x : stub.x + d;
    const y = ngang ? stub.y - d : stub.y;

    for (const el of chuCoNen(String(dem), x, y, VE.chuDem, VE.notCut)) nut.append(el);
  }

  const nhan = tao('title');
  nhan.textContent = stub.direction === 'up'
    ? 'Còn ' + dem + ' người ở đời trên chưa vẽ — bấm để mở'
    : 'Còn ' + dem + ' người ở nhánh này chưa vẽ — bấm để mở';
  nut.append(nhan);

  if (onClick) {
    nut.style.cursor = 'pointer';
    nut.addEventListener('click', () => onClick(stub));
  }

  return { net, nut };
}

function tao(ten, thuoc) {
  const el = document.createElementNS(NS, ten);
  for (const khoa in thuoc || {}) {
    const v = thuoc[khoa];
    if (v === null || v === undefined) continue;
    el.setAttribute(khoa, String(v));
  }
  return el;
}

function chuCoNen(noiDung, x, y, coChu, mau) {
  const r = coChu * 0.78 + 2;
  return [
    tao('circle', { cx: x, cy: y, r, fill: VE.nenTrang }),
    chu(noiDung, x, y + coChu * 0.35, coChu, mau),
  ];
}

function chuDuoiBang(noiDung, x, y, coChu, mau, rongToiDa) {
  const rong = Math.min(beRong(noiDung, coChu), rongToiDa) + VE.leNenChu * 2;
  return [
    tao('rect', {
      x: x - rong / 2,
      y: y - coChu * 0.95,
      width: rong,
      height: coChu * 1.28,
      fill: VE.nenTrang,
    }),
    chu(noiDung, x, y, coChu, mau, rongToiDa),
  ];
}

function chu(noiDung, x, y, coChu, mau, rongToiDa, cachEp) {
  const t = tao('text', {
    x, y,
    'text-anchor': 'middle',
    'font-size': coChu,
    fill: mau,
  });
  if (rongToiDa && beRong(noiDung, coChu) > rongToiDa) {
    t.setAttribute('textLength', String(rongToiDa));
    t.setAttribute('lengthAdjust', cachEp === 'spacing' ? 'spacing' : 'spacingAndGlyphs');
  }
  t.textContent = noiDung;
  return t;
}
