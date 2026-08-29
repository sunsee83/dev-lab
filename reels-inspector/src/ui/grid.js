import { EVENTS } from '../core/app.js';
import { copyText } from '../core/clipboard.js';
import { resolveGridCardMedia } from '../media/media-resolver.js';
import { showToast } from './toast.js';

const MENU_ID = 'ri32-grid-menu';

export function mountGridActions({ app, adapter, downloads, capabilities, doc = globalThis.document, env = globalThis } = {}) {
  if (!doc?.documentElement || !adapter || !downloads) throw new Error('Grid actions require document, adapter and Download Manager');
  let destroyed = false;

  doc.addEventListener('pointerdown', onPointerDown, true);
  doc.addEventListener('click', onClick, true);
  env.addEventListener?.('scroll', closeMenu, true);
  env.addEventListener?.('resize', closeMenu, true);
  const unsubscribeRoute = app?.on?.(EVENTS.ROUTE_CHANGED, closeMenu) || (() => {});

  function onPointerDown(event) {
    const mediaButton = event.target?.closest?.('.ri3-grid-media');
    if (mediaButton) {
      event.stopImmediatePropagation();
      return;
    }
    const menu = doc.getElementById(MENU_ID);
    if (menu && !menu.contains(event.target)) closeMenu();
  }

  function onClick(event) {
    const mediaButton = event.target?.closest?.('.ri3-grid-media');
    if (!mediaButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const anchor = mediaButton.closest('a[href*="/reel/"],a[href*="/reels/"],a[href*="/p/"]');
    if (!anchor) return;
    openMenu(anchor, mediaButton);
  }

  function openMenu(anchor, trigger) {
    const shortcode = anchor.dataset.ri315Code || adapter.codeFromUrl(anchor.href);
    if (!shortcode) return;
    const existing = doc.getElementById(MENU_ID);
    if (existing?.dataset.code === shortcode) {
      closeMenu();
      return;
    }
    closeMenu();
    doc.getElementById('ri3-grid-menu')?.remove();

    const post = adapter.getPost(shortcode) || { shortcode };
    const media = resolveGridCardMedia({ anchor, post, shortcode });
    const menu = doc.createElement('div');
    menu.id = MENU_ID;
    menu.dataset.code = shortcode;
    menu.setAttribute('role', 'menu');

    if (media.type === 'REEL' || media.type === 'VIDEO') {
      addButton(menu, media.videoUrl ? '영상 다운로드' : '영상 준비중', !!media.videoUrl, () => downloadSingle({
        kind: 'video', shortcode, url: media.videoUrl
      }));
      addButton(menu, media.imageUrl ? '썸네일 다운로드' : '썸네일 준비중', !!media.imageUrl, () => downloadSingle({
        kind: 'cover', shortcode, url: media.imageUrl
      }));
    } else if (media.type === 'CAROUSEL') {
      const count = media.carouselImages.length;
      addButton(menu, count ? `전체 이미지 다운로드 (${count})` : '전체 이미지 준비중', count > 0, () => downloadCarousel(shortcode, media.carouselImages));
      addButton(menu, media.imageUrl ? '대표 이미지 다운로드' : '대표 이미지 준비중', !!media.imageUrl, () => downloadSingle({
        kind: 'photo', shortcode, url: media.imageUrl
      }));
    } else {
      addButton(menu, media.imageUrl ? '이미지 다운로드' : '이미지 준비중', !!media.imageUrl, () => downloadSingle({
        kind: 'photo', shortcode, url: media.imageUrl
      }));
    }

    addButton(menu, '링크 복사', !!media.pageUrl, async () => {
      const ok = await copyText(media.pageUrl, { env, doc, capabilities });
      showToast(doc, ok ? '링크를 복사했습니다.' : '링크 복사에 실패했습니다.');
    });

    doc.documentElement.appendChild(menu);
    positionMenu(menu, trigger);
  }

  function addButton(menu, label, enabled, action) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = !enabled;
    if (enabled) button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      try {
        await action();
      } catch (error) {
        console.warn('[RI] grid action failed', error);
        showToast(doc, '작업을 완료하지 못했습니다.');
      }
    });
    menu.appendChild(button);
  }

  async function downloadSingle(request) {
    return downloads.download(request);
  }

  async function downloadCarousel(shortcode, images) {
    const requests = images.map((url, index) => ({
      kind: 'carousel-slide',
      shortcode,
      url,
      slideIndex: index + 1
    }));
    return downloads.downloadBatch(requests);
  }

  function positionMenu(menu, trigger) {
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const width = env.innerWidth || doc.documentElement.clientWidth;
    const height = env.innerHeight || doc.documentElement.clientHeight;
    const left = Math.max(6, Math.min(width - menuRect.width - 6, rect.left));
    let top = rect.bottom + 6;
    if (top + menuRect.height > height - 8) top = Math.max(8, rect.top - menuRect.height - 6);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function closeMenu() {
    doc.getElementById(MENU_ID)?.remove();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    closeMenu();
    unsubscribeRoute();
    doc.removeEventListener('pointerdown', onPointerDown, true);
    doc.removeEventListener('click', onClick, true);
    env.removeEventListener?.('scroll', closeMenu, true);
    env.removeEventListener?.('resize', closeMenu, true);
  }

  if (app?.adapters) app.adapters.gridActions = { closeMenu };
  return { closeMenu, destroy };
}
