export const KHE_HO = 6;

export const TRAN = 65;

export const PHONG = 'system-ui, sans-serif';

const NS = 'http://www.w3.org/2000/svg';
const CO_DO = 100;
const daDo = new Map();
let ctx = null;

export function veBieuTuongTron(ky, tuyChon = {}) {
  const kheHo = typeof tuyChon.kheHo === 'number' ? tuyChon.kheHo : KHE_HO;
  const tran  = typeof tuyChon.tran  === 'number' ? tuyChon.tran  : TRAN;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + CO_DO + ' ' + CO_DO);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';

  const chu = document.createElementNS(NS, 'text');
  chu.setAttribute('font-family', PHONG);
  chu.setAttribute('fill', 'currentColor');
  chu.textContent = ky;

  const dat = tinhChoDat(ky, kheHo, tran);
  chu.setAttribute('font-size', String(dat.co));
  chu.setAttribute('x', String(dat.x));
  chu.setAttribute('y', String(dat.y));

  svg.append(chu);
  return svg;
}

function tinhChoDat(ky, kheHo, tran) {
  const R = CO_DO / 2 - kheHo;
  const muc = doVungMuc(ky);

  if (!muc) {
    return { co: CO_DO * 0.55, x: CO_DO / 2, y: CO_DO / 2 + CO_DO * 0.2, luiVe: true };
  }

  const nuaCheo = Math.sqrt(muc.rong * muc.rong + muc.cao * muc.cao) / 2;
  const canhLon = Math.max(muc.rong, muc.cao);

  const tyLeKhongTran = R / nuaCheo;
  const tyLeDuoiTran  = tran / canhLon;
  const tyLe = Math.min(tyLeKhongTran, tyLeDuoiTran);

  return {
    co: CO_DO * tyLe,
    x: CO_DO / 2 - (muc.trai + muc.rong / 2) * tyLe,
    y: CO_DO / 2 - (muc.tren + muc.cao  / 2) * tyLe,
  };
}

function doVungMuc(ky) {
  if (daDo.has(ky)) return daDo.get(ky);

  let kq = null;
  try {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    ctx.font = CO_DO + 'px ' + PHONG;
    const m = ctx.measureText(ky);
    const trai = -m.actualBoundingBoxLeft;
    const tren = -m.actualBoundingBoxAscent;
    const rong = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
    const cao  = m.actualBoundingBoxDescent + m.actualBoundingBoxAscent;
    if (isFinite(rong) && isFinite(cao) && rong > 0 && cao > 0) {
      kq = { trai, tren, rong, cao };
    }
  } catch (e) {
    kq = null;
  }

  daDo.set(ky, kq);
  return kq;
}

export function _doThu(ky, kheHo = KHE_HO, tran = TRAN) {
  return { muc: doVungMuc(ky), dat: tinhChoDat(ky, kheHo, tran) };
}
