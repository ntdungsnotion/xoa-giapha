import { mountKhoiDong } from './pages/khoi-dong.js';

async function main() {
  const el = document.getElementById('app');
  if (!el) {
    console.error('[app] không tìm thấy phần tử #app trong index.html');
    return;
  }
  await mountKhoiDong(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
