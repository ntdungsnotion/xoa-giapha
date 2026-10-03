import { DEFAULT_SCOPE } from './config.js';

const MAC_DINH = {
  tree:           null,
  index:          null,
  treeId:         null,
  doi:            null,

  revision:       null,

  focusPersonId:  null,
  scope:          { ...DEFAULT_SCOPE },
  dirty:          false,
  phien:          null,

  showInLaws: true,

  hienNgayGio: false,

  daLocNguoiConSong: false,
  nguoiBiChe: new Set(),
};

export const state = { ...MAC_DINH, scope: { ...DEFAULT_SCOPE } };

const nguoiNghe = new Set();

export function resetState() {
  Object.assign(state, MAC_DINH, { scope: { ...DEFAULT_SCOPE } });
  notify();
}

export function subscribe(fn) {
  nguoiNghe.add(fn);
  return () => nguoiNghe.delete(fn);
}

export function notify() {
  for (const fn of nguoiNghe) {
    try {
      fn(state);
    } catch (e) {
      console.error('[state] lỗi trong subscriber:', e);
    }
  }
}
