import { nextId, loaiCua } from '../utils/id.js';
import { coGiaTri } from '../utils/text.js';

export function attachMedia(tree, subjectId, driveFileId, caption, ghiNhan, driveFileIdLon) {
  if (!tree || !coGiaTri(subjectId) || !coGiaTri(driveFileId)) return null;
  if (!coChuThe(tree, subjectId)) return null;

  const ds = Array.isArray(tree.media) ? tree.media : [];
  const ma = nextId('M', tree);
  const luc = (ghiNhan && coGiaTri(ghiNhan.luc)) ? String(ghiNhan.luc) : '';
  const boi = (ghiNhan && coGiaTri(ghiNhan.boi)) ? String(ghiNhan.boi) : '';

  const muc = {
    id:          ma,
    subjectId:   String(subjectId),
    driveFileId: String(driveFileId),
    driveFileIdLon: coGiaTri(driveFileIdLon) ? String(driveFileIdLon) : '',
    caption:     coGiaTri(caption) ? String(caption).trim() : '',
    year:        null,
    deleted:     false,
    meta:        { createdAt: luc, updatedAt: luc, updatedBy: boi },
  };

  const cayMoi = Object.assign({}, tree, { media: ds.concat([muc]) });
  const diff = {};
  diff[ma + '.driveFileId'] = ['', muc.driveFileId];
  if (muc.driveFileIdLon) diff[ma + '.driveFileIdLon'] = ['', muc.driveFileIdLon];

  return { tree: cayMoi, media: muc, diff };
}

export function detachMedia(tree, mediaId, ghiNhan) {
  if (!tree || !Array.isArray(tree.media) || !coGiaTri(mediaId)) return null;

  const cu = tree.media.find((m) => m && m.id === mediaId);
  if (!cu || cu.deleted === true) return null;

  const moi = JSON.parse(JSON.stringify(cu));
  moi.deleted = true;
  datMeta(moi, ghiNhan);

  const diff = {};
  diff[moi.id + '.deleted'] = [false, true];

  let persons = tree.persons;
  const chuThe = tra(tree, moi.subjectId);
  if (chuThe && chuThe.photoFileId === moi.driveFileId) {
    const nguoiMoi = JSON.parse(JSON.stringify(chuThe));
    nguoiMoi.photoFileId = '';
    datMeta(nguoiMoi, ghiNhan);
    diff[nguoiMoi.id + '.photoFileId'] = [moi.driveFileId, ''];
    persons = tree.persons.map((p) => (p && p.id === nguoiMoi.id ? nguoiMoi : p));
  }

  const cayMoi = Object.assign({}, tree, {
    media: tree.media.map((m) => (m && m.id === moi.id ? moi : m)),
    persons,
  });

  return { tree: cayMoi, media: moi, diff };
}

export function setPortrait(tree, personId, mediaId, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !coGiaTri(personId)) return null;

  const nguoi = tree.persons.find((p) => p && p.id === personId);
  if (!nguoi) return null;

  const anh = (Array.isArray(tree.media) ? tree.media : [])
    .find((m) => m && m.id === mediaId && m.deleted !== true);
  if (!anh) return null;
  if (anh.subjectId !== personId) return null;

  const truoc = typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (truoc === anh.driveFileId) {
    return { tree, person: nguoi, media: anh, diff: {} };
  }

  const nguoiMoi = JSON.parse(JSON.stringify(nguoi));
  nguoiMoi.photoFileId = anh.driveFileId;
  datMeta(nguoiMoi, ghiNhan);

  const diff = {};
  diff[personId + '.photoFileId'] = [truoc, anh.driveFileId];

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? nguoiMoi : p)),
  });

  return { tree: cayMoi, person: nguoiMoi, media: anh, diff };
}

export function clearPortrait(tree, personId, ghiNhan) {
  if (!tree || !Array.isArray(tree.persons) || !coGiaTri(personId)) return null;

  const nguoi = tree.persons.find((p) => p && p.id === personId);
  if (!nguoi) return null;

  const truoc = typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (!truoc) return { tree, person: nguoi, diff: {} };

  const nguoiMoi = JSON.parse(JSON.stringify(nguoi));
  nguoiMoi.photoFileId = '';
  datMeta(nguoiMoi, ghiNhan);

  const diff = {};
  diff[personId + '.photoFileId'] = [truoc, ''];

  const cayMoi = Object.assign({}, tree, {
    persons: tree.persons.map((p) => (p && p.id === personId ? nguoiMoi : p)),
  });

  return { tree: cayMoi, person: nguoiMoi, diff };
}

export function datAnhDaiDien(tree, personId, driveFileId, caption, ghiNhan) {
  const gan = attachMedia(tree, personId, driveFileId, caption, ghiNhan);
  if (!gan) return null;

  const dat = setPortrait(gan.tree, personId, gan.media.id, ghiNhan);
  if (!dat) return null;

  return {
    tree:   dat.tree,
    person: dat.person,
    media:  gan.media,
    diff:   Object.assign({}, gan.diff, dat.diff),
  };
}

export function getMediaFor(tree, subjectId) {
  if (!tree || !Array.isArray(tree.media) || !coGiaTri(subjectId)) return [];
  return tree.media
    .filter((m) => m && m.subjectId === subjectId && m.deleted !== true)
    .reverse();
}

export function getPortrait(tree, personId) {
  if (!tree || !Array.isArray(tree.media)) return null;
  const nguoi = (Array.isArray(tree.persons) ? tree.persons : [])
    .find((p) => p && p.id === personId);
  const ma = nguoi && typeof nguoi.photoFileId === 'string' ? nguoi.photoFileId : '';
  if (!ma) return null;
  return tree.media.find(
    (m) => m && m.subjectId === personId && m.driveFileId === ma && m.deleted !== true
  ) || null;
}

function tra(tree, id) {
  if (!coGiaTri(id)) return null;
  const ds = loaiCua(id) === 'U'
    ? (Array.isArray(tree.unions) ? tree.unions : [])
    : (Array.isArray(tree.persons) ? tree.persons : []);
  return ds.find((x) => x && x.id === id) || null;
}

function coChuThe(tree, id) {
  return !!tra(tree, id);
}

function datMeta(banGhi, ghiNhan) {
  if (!banGhi.meta || typeof banGhi.meta !== 'object') banGhi.meta = {};
  if (ghiNhan && coGiaTri(ghiNhan.luc)) banGhi.meta.updatedAt = String(ghiNhan.luc);
  if (ghiNhan && coGiaTri(ghiNhan.boi)) banGhi.meta.updatedBy = String(ghiNhan.boi);
}
