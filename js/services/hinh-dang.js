import { stampNow } from '../utils/date.js';

const TEN_PERSON = {
  id: null, uid: null, names: null, sex: null, birth: null, death: null,
  burialPlace: 'burial_place',
  title: null, occupation: null, education: null, religion: null,
  residence: null, nationality: null, contact: null,
  living: null,
  photoFileId: 'photo_file_id',
  note: null, deleted: null, vn: null, meta: null,
  branchId: 'branch_id',
  revision: null,
};

const TEN_UNION = {
  id: null, uid: null, partners: null,
  partnerOrder: 'partner_order',
  ranks: null, status: null, marriage: null, note: null, deleted: null,
  revision: null,
};

const TEN_MEDIA = {
  id: null,
  subjectId: 'subject_id',
  driveFileId: 'drive_file_id',
  driveFileIdLon: 'drive_file_id_lon',
  caption: null, year: null, deleted: null, meta: null,
  revision: null,
};

const TEN_SOURCE = { id: null, title: null, author: null, note: null };

const NGAY_RONG = { iso: null, raw: '', place: '' };

const MAC_DINH_PERSON = {
  uid: '', names: [], sex: 'U', birth: NGAY_RONG, death: NGAY_RONG,
  burialPlace: '',
  title: '', occupation: '', education: '', religion: '',
  residence: '', nationality: '', contact: '',
  living: true, photoFileId: '', note: '', deleted: false,
  vn: {}, meta: {}, revision: 0,
};

const MAC_DINH_UNION = {
  uid: '', partners: [], partnerOrder: [], ranks: {},
  status: 'unknown', marriage: NGAY_RONG, note: '', deleted: false,
  revision: 0,
};

const MAC_DINH_MEDIA = {
  subjectId: '', driveFileId: '', driveFileIdLon: '', caption: '',
  deleted: false, meta: {}, revision: 0,
};

const MAC_DINH_SOURCE = { title: '', author: '', note: '' };

const cot = (bang, khoa) => bang[khoa] || khoa;

function macDinh(bang, khoa) {
  const v = bang[khoa];
  if (v === undefined) return null;
  return v !== null && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
}

function veCay(bang, dong) {
  const ra = {};
  for (const khoa of Object.keys(bang)) ra[khoa] = dong[cot(bang, khoa)];
  return ra;
}

function veBang(bang, mac, banGhi) {
  const ra = {};
  for (const khoa of Object.keys(bang)) {
    const v = banGhi[khoa];
    ra[cot(bang, khoa)] = v === undefined || v === null ? macDinh(mac, khoa) : v;
  }
  return ra;
}

export function rapCay(dong) {
  const t = dong.tree;
  const conTheoUnion = gomCon(dong.children);

  return {
    format:  'giapha-json',
    version: t.data_version,

    tree: {
      id:           t.id,
      treeCode:     t.tree_code,
      name:         t.name,
      rootPersonId: t.root_person_id || '',
      note:         t.note || '',
      createdAt:    dauThoiGian(t.created_at),
      updatedAt:    dauThoiGian(t.updated_at),
      updatedBy:    t.updated_by || '',
      revision:     t.revision,
    },

    persons: (dong.persons || []).map((r) => veCay(TEN_PERSON, r)),

    unions: (dong.unions || []).map((r) => ({
      ...veCay(TEN_UNION, r),
      children: conTheoUnion.get(r.id) || [],
    })),

    media:   (dong.media   || []).map((r) => veCay(TEN_MEDIA, r)),
    sources: (dong.sources || []).map((r) => veCay(TEN_SOURCE, r)),

    changeLog: (dong.maNhatKy || []).map((ma) => ({ target: ma, diff: {} })),

    imports: (dong.imports || []).map((r) => ({
      at: dauThoiGian(r.at), by: r.by_email, file: r.file,
      source: r.source, sourceName: r.source_name, exporter: r.exporter,
      counts: r.counts || {}, map: r.map || [],
    })),

    vanhDai: (dong.vanhDai || []).map((r) => veCay(TEN_PERSON, r)),
  };
}

export function rapMotNguoi(dong) {
  return dong ? veCay(TEN_PERSON, dong) : null;
}

export function rapGiaDinh(dong) {
  const conTheoUnion = gomCon(dong.children);
  return {
    nguoi: dong.nguoi ? veCay(TEN_PERSON, dong.nguoi) : null,
    persons: (dong.persons || []).map((r) => veCay(TEN_PERSON, r)),
    unions: (dong.unions || []).map((r) => ({
      ...veCay(TEN_UNION, r),
      children: conTheoUnion.get(r.id) || [],
    })),
    cacCay: (dong.cay || []).map((r) => ({ treeId: r.tree_id, doi: Number(r.doi) || 0 })),
  };
}

function gomCon(children) {
  const conTheoUnion = new Map();
  for (const c of children || []) {
    if (!conTheoUnion.has(c.union_id)) conTheoUnion.set(c.union_id, []);
    conTheoUnion.get(c.union_id).push({
      personId: c.person_id,
      relation: c.relation,
      order:    c.ord,
      revision: c.revision,
    });
  }
  for (const ds of conTheoUnion.values()) {
    ds.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return conTheoUnion;
}

export function rapDoi(dong) {
  const m = new Map();
  for (const r of Array.isArray(dong) ? dong : []) {
    const n = Number(r && r.doi);
    if (r && r.person_id && Number.isInteger(n) && n > 0) m.set(r.person_id, n);
  }
  return m;
}

function dauThoiGian(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : stampNow(d);
}

export function boCay(cay, treeId) {
  const children = [];
  for (const u of cay.unions || []) {
    if (!u || !u.id) continue;
    for (const c of u.children || []) {
      if (!c || !c.personId) continue;
      children.push({
        union_id: u.id, person_id: c.personId,
        relation: c.relation || 'birth',
        ord: Number.isFinite(c.order) ? c.order : 1,
        revision: Number.isFinite(c.revision) ? c.revision : 0,
      });
    }
  }

  const gan = (bang, mac, ds) => (ds || []).map((b) => veBang(bang, mac, b));
  const ganCay = (bang, mac, ds) =>
    (ds || []).map((b) => ({ tree_id: treeId, ...veBang(bang, mac, b) }));

  return {
    tree: {
      id:             treeId,
      tree_code:      cay.tree.treeCode,
      name:           cay.tree.name,
      root_person_id: cay.tree.rootPersonId || null,
      note:           cay.tree.note || '',
      data_version:   cay.version,
      revision:       cay.tree.revision || 0,
      updated_by:     cay.tree.updatedBy || '',
    },
    persons:  gan(TEN_PERSON, MAC_DINH_PERSON, cay.persons),
    unions:   gan(TEN_UNION,  MAC_DINH_UNION,  cay.unions),
    children,
    media:    gan(TEN_MEDIA,  MAC_DINH_MEDIA,  cay.media),
    sources:  ganCay(TEN_SOURCE, MAC_DINH_SOURCE, cay.sources),
    treePersons: (cay.persons || [])
      .filter((p) => p && p.id)
      .map((p) => ({ tree_id: treeId, person_id: p.id })),
    imports: (cay.imports || []).map((e) => ({
      tree_id: treeId, by_email: e.by || '', file: e.file || '',
      source: e.source || '', source_name: e.sourceName || '',
      exporter: e.exporter || '', counts: e.counts || {}, map: e.map || [],
    })),
    changeLog: (cay.changeLog || []).map((m) => ({
      tree_id: treeId, action: m.action || 'migrate', target: m.target || '',
      note: m.note || '', diff: m.diff || {}, by_email: m.by || '',
    })),
  };
}

export function soSanh(cu, moi) {
  return {
    tree:     soSanhKhoiCay(cu.tree, moi.tree),
    persons:  soSanhMang(TEN_PERSON, MAC_DINH_PERSON, cu.persons, moi.persons),
    unions:   soSanhMang(TEN_UNION,  MAC_DINH_UNION,  cu.unions,  moi.unions),
    children: soSanhCon(cu.unions, moi.unions),
    media:    soSanhMang(TEN_MEDIA,  MAC_DINH_MEDIA,  cu.media,   moi.media),
    sources:  soSanhMang(TEN_SOURCE, MAC_DINH_SOURCE, cu.sources, moi.sources),
    imports:  themMoi(cu.imports, moi.imports),
  };
}

export function coGiDeGhi(ops) {
  if (ops.tree) return true;
  if (ops.imports && ops.imports.length) return true;
  for (const ten of ['persons', 'unions', 'children', 'media', 'sources']) {
    const o = ops[ten];
    if (o && (o.luu.length || o.xoa.length)) return true;
  }
  return false;
}

export function tangSoSauKhiLuu(cay, ops) {
  if (!cay || !ops) return;

  const sauKhiGhi = (r) => (Number(r && r.revision) || 0) + 1;

  const apDung = (dsCay, dsOps, khoaCua) => {
    if (!Array.isArray(dsCay) || !dsOps || !Array.isArray(dsOps.luu)) return;
    const so = new Map();
    for (const r of dsOps.luu) so.set(khoaCua(r), sauKhiGhi(r));
    for (const b of dsCay) {
      if (!b) continue;
      const v = so.get(khoaCua(b));
      if (v !== undefined) b.revision = v;
    }
  };

  const theoId = (r) => r.id;
  apDung(cay.persons, ops.persons, theoId);
  apDung(cay.unions,  ops.unions,  theoId);
  apDung(cay.media,   ops.media,   theoId);

  if (ops.children && Array.isArray(ops.children.luu) && ops.children.luu.length) {
    const so = new Map();
    for (const r of ops.children.luu) so.set(r.union_id + '|' + r.person_id, sauKhiGhi(r));
    for (const u of cay.unions || []) {
      if (!u || !u.id || !Array.isArray(u.children)) continue;
      for (const c of u.children) {
        if (!c || !c.personId) continue;
        const v = so.get(u.id + '|' + c.personId);
        if (v !== undefined) c.revision = v;
      }
    }
  }
}

function soSanhKhoiCay(cu, moi) {
  if (!cu || !moi) return null;
  const doi = cu.name !== moi.name
           || (cu.rootPersonId || '') !== (moi.rootPersonId || '')
           || (cu.note || '')         !== (moi.note || '');
  if (!doi) return null;
  return {
    name: moi.name,
    root_person_id: moi.rootPersonId || null,
    note: moi.note || '',
  };
}

function soSanhMang(bang, mac, dsCu, dsMoi) {
  const cu  = theoMa(dsCu);
  const luu = [];
  const xoa = [];

  for (const banGhi of dsMoi || []) {
    if (!banGhi || !banGhi.id) continue;
    const truoc = cu.get(banGhi.id);

    const dongMoi = veBang(bang, mac, banGhi);
    if (!truoc || !bangNhau(veBang(bang, mac, truoc), dongMoi, Object.keys(dongMoi))) {
      luu.push(dongMoi);
    }
    cu.delete(banGhi.id);
  }
  for (const ma of cu.keys()) xoa.push(ma);

  return { luu, xoa };
}

function soSanhCon(dsCu, dsMoi) {
  const bam = (u, c) => u + '|' + c;
  const trai = (ds) => {
    const m = new Map();
    for (const u of ds || []) {
      if (!u || !u.id || !Array.isArray(u.children)) continue;
      for (const c of u.children) {
        if (!c || !c.personId) continue;
        m.set(bam(u.id, c.personId), {
          union_id: u.id, person_id: c.personId,
          relation: c.relation || 'birth',
          ord: Number.isFinite(c.order) ? c.order : 1,
          revision: Number.isFinite(c.revision) ? c.revision : 0,
        });
      }
    }
    return m;
  };

  const cu  = trai(dsCu);
  const moi = trai(dsMoi);
  const luu = [];
  const xoa = [];

  for (const [khoa, dong] of moi) {
    const truoc = cu.get(khoa);
    if (!truoc || truoc.relation !== dong.relation || truoc.ord !== dong.ord) {
      luu.push(dong);
    }
  }
  for (const [khoa, dong] of cu) {
    if (!moi.has(khoa)) xoa.push({ union_id: dong.union_id, person_id: dong.person_id });
  }
  return { luu, xoa };
}

function themMoi(cu, moi) {
  const soCu = Array.isArray(cu) ? cu.length : 0;
  const ds   = Array.isArray(moi) ? moi : [];
  return ds.slice(soCu).map((e) => ({
    file: e.file || '', source: e.source || '',
    source_name: e.sourceName || '', exporter: e.exporter || '',
    counts: e.counts || {}, map: e.map || [],
  }));
}

function theoMa(ds) {
  const m = new Map();
  for (const b of ds || []) if (b && b.id) m.set(b.id, b);
  return m;
}

function bangNhau(a, b, khoas) {
  for (const k of khoas) {
    if (!sauBangNhau(a[k], b[k])) return false;
  }
  return true;
}

function sauBangNhau(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sauBangNhau(a[i], b[i])) return false;
    return true;
  }

  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!sauBangNhau(a[k], b[k])) return false;
  }
  return true;
}
