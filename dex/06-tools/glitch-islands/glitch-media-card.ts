/**
 * <glitch-media-card> — poster + optional native HTML5 media.
 * Tilt is compositor-only (CSS vars) and off when reduced-motion or coarse pointer.
 */
import { sanitizeSiteRelativePath } from './is-site-relative-path.ts';

const TAG = 'glitch-media-card';

const STYLE = `
:host {
  display: block;
  position: relative;
  aspect-ratio: 40 / 21;
  max-height: 12rem;
  overflow: hidden;
  background: var(--color-glitch-surface-2, #14141e);
  border-bottom: 1px solid var(--color-glitch-border, #1e1e2e);
  transform: perspective(720px)
    rotateX(var(--tilt-x, 0deg))
    rotateY(var(--tilt-y, 0deg));
  will-change: transform;
}
:host([data-tilt="off"]) {
  transform: none;
  will-change: auto;
}
.frame {
  position: relative;
  width: 100%;
  height: 100%;
}
.frame img,
.frame video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
img, video {
  object-fit: cover;
}
audio {
  position: relative;
  z-index: 1;
  width: 100%;
  display: block;
  margin: 0;
}
video[hidden], audio[hidden] { display: none; }
`;

export type MediaKind = 'image' | 'video' | 'audio';

/** Mirror media-card-schema resolvePoster() for attribute-driven markup. */
export function resolveElementPoster(
  poster: string,
  src: string,
  kind: MediaKind,
): string {
  if (poster) return poster;
  if (kind === 'image' && src) return src;
  return '';
}

export function tiltAllowed(mq: { matches: boolean } | null | undefined): boolean {
  return !mq?.matches;
}

let activeVideo: HTMLVideoElement | null = null;

function claimVideo(video: HTMLVideoElement) {
  if (activeVideo && activeVideo !== video) {
    activeVideo.pause();
  }
  activeVideo = video;
}

function releaseVideo(video: HTMLVideoElement) {
  video.pause();
  if (activeVideo === video) activeVideo = null;
}

/** SSR/SSG-safe: Node has no HTMLElement until the island hydrates. */
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as typeof HTMLElement) : HTMLElement;

export class GlitchMediaCard extends HTMLElementBase {
  static get observedAttributes() {
    return ['poster', 'src', 'kind', 'loop'];
  }

  tiltEnabled = false;
  #io: IntersectionObserver | null = null;
  #built = false;
  #motionMql: MediaQueryList | null = null;
  #onMotionChange: ((event: MediaQueryListEvent) => void) | null = null;
  #onTiltMove: ((event: PointerEvent) => void) | null = null;
  #onTiltLeave: (() => void) | null = null;

  get #poster() {
    return this.getAttribute('poster') ?? '';
  }
  get #src() {
    return this.getAttribute('src') ?? '';
  }
  get #kind(): MediaKind {
    return (this.getAttribute('kind') ?? 'image') as MediaKind;
  }
  get #loop() {
    return this.hasAttribute('loop');
  }

  connectedCallback() {
    this.#render();
    this.#subscribeMotionPreference();
    this.#applyMotionPolicy();
    this.#bindTilt();
    this.#bindMedia();
  }

  disconnectedCallback() {
    this.#teardown();
  }

  attributeChangedCallback() {
    if (!this.#built || !this.isConnected) return;
    this.#teardownMedia();
    this.#teardownTilt();
    this.#render();
    this.#applyMotionPolicy();
    this.#bindTilt();
    this.#bindMedia();
  }

  #shadow() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    return this.shadowRoot as ShadowRoot;
  }

  #render() {
    const root = this.#shadow();
    const poster = sanitizeSiteRelativePath(this.#poster);
    const src = sanitizeSiteRelativePath(this.#src);
    const kind = this.#kind;
    const displayPoster = resolveElementPoster(poster, src, kind);
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="frame">
        ${displayPoster ? `<img alt="" width="1200" height="630" loading="lazy" decoding="async" src="${escapeAttr(displayPoster)}">` : ''}
        ${kind === 'video' && src ? `<video playsinline muted ${this.#loop ? 'loop' : ''} ${poster ? `poster="${escapeAttr(poster)}"` : ''} src="${escapeAttr(src)}"></video>` : ''}
        ${kind === 'audio' && src ? `<audio controls src="${escapeAttr(src)}"></audio>` : ''}
      </div>
    `;
    this.#built = true;
  }

  #subscribeMotionPreference() {
    const win = this.ownerDocument.defaultView;
    if (!win) return;

    this.#motionMql = win.matchMedia('(prefers-reduced-motion: reduce)');
    this.#onMotionChange = () => {
      this.#applyMotionPolicy();
      if (!this.tiltEnabled) {
        this.#teardownTilt();
        this.#resetTilt();
      } else if (!this.#onTiltMove) {
        this.#bindTilt();
      }
      this.#bindMedia();
    };
    this.#motionMql.addEventListener('change', this.#onMotionChange);
  }

  #applyMotionPolicy() {
    const motionOk = tiltAllowed(this.#motionMql);
    const hoverFine =
      this.ownerDocument.defaultView?.matchMedia('(hover: hover) and (pointer: fine)').matches ??
      false;
    this.tiltEnabled = motionOk && hoverFine;
    this.setAttribute('data-tilt', this.tiltEnabled ? 'on' : 'off');
  }

  #bindTilt() {
    if (!this.tiltEnabled || this.#onTiltMove) return;
    const max = 4;
    this.#onTiltMove = (e) => {
      const r = this.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      this.style.setProperty('--tilt-y', `${px * max}deg`);
      this.style.setProperty('--tilt-x', `${-py * max}deg`);
    };
    this.#onTiltLeave = () => this.#resetTilt();
    this.addEventListener('pointermove', this.#onTiltMove);
    this.addEventListener('pointerleave', this.#onTiltLeave);
  }

  #resetTilt() {
    this.style.setProperty('--tilt-x', '0deg');
    this.style.setProperty('--tilt-y', '0deg');
  }

  #teardownTilt() {
    if (this.#onTiltMove) {
      this.removeEventListener('pointermove', this.#onTiltMove);
      this.#onTiltMove = null;
    }
    if (this.#onTiltLeave) {
      this.removeEventListener('pointerleave', this.#onTiltLeave);
      this.#onTiltLeave = null;
    }
  }

  #bindMedia() {
    this.#teardownMediaObserver();

    const video = this.shadowRoot?.querySelector('video');
    if (!video) return;

    video.addEventListener('error', () => {
      video.hidden = true;
    });
    video.addEventListener('play', () => claimVideo(video));

    if (!tiltAllowed(this.#motionMql)) {
      releaseVideo(video);
      return;
    }

    this.#io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            claimVideo(video);
            void video.play().catch(() => {
              video.hidden = true;
            });
          } else {
            releaseVideo(video);
          }
        }
      },
      { threshold: 0.35 },
    );
    this.#io.observe(this);
  }

  #teardownMediaObserver() {
    this.#io?.disconnect();
    this.#io = null;
  }

  #teardownMedia() {
    const video = this.shadowRoot?.querySelector('video');
    const audio = this.shadowRoot?.querySelector('audio');
    if (video) releaseVideo(video);
    audio?.pause();
    this.#teardownMediaObserver();
  }

  #teardownMotionPreference() {
    if (this.#motionMql && this.#onMotionChange) {
      this.#motionMql.removeEventListener('change', this.#onMotionChange);
    }
    this.#motionMql = null;
    this.#onMotionChange = null;
  }

  #teardown() {
    this.#teardownMedia();
    this.#teardownTilt();
    this.#resetTilt();
    this.#teardownMotionPreference();
  }
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function registerGlitchMediaCard() {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(TAG)) {
    customElements.define(TAG, GlitchMediaCard);
  }
}

/** Tilt on stretched-link cards (overlay steals pointer events from the CE). */
export function bindGlitchTilt(root?: ParentNode) {
  const win = typeof window !== 'undefined' ? window : undefined;
  if (!win) return;
  const scope = root ?? win.document;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverFine = win.matchMedia('(hover: hover) and (pointer: fine)');
  if (!tiltAllowed(reduced) || !hoverFine.matches) return;

  const max = 4;
  for (const card of scope.querySelectorAll<HTMLElement>('.project-card')) {
    if (card.dataset.tiltBound === '1') continue;
    card.dataset.tiltBound = '1';
    card.style.willChange = 'transform';
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--tilt-y', `${px * max}deg`);
      card.style.setProperty('--tilt-x', `${-py * max}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  }
}
