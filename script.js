const heroScroll = document.querySelector(".hero-scroll");
const hero = document.querySelector(".hero");
const video = document.querySelector(".hero__video");
const canvas = document.querySelector(".hero__canvas");
const ctx = canvas.getContext("2d", { alpha: false });

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && "ontouchend" in document);

const useCanvas = isIOS;
const isMobile = window.matchMedia("(max-width: 640px)").matches;
const supportsReversePlayback = !useCanvas;

video.muted = true;
video.playsInline = true;
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");
document.body.classList.add(useCanvas ? "use-canvas" : "use-video");

let duration = 0;
let isReady = false;
let isActivated = !useCanvas;
let smoothTime = 0;
let lastScrollY = window.scrollY;
let crop = null;

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getMaxScroll() {
  return Math.max(heroScroll.offsetHeight - getViewportHeight(), 1);
}

function getScrollProgress() {
  return Math.min(Math.max(window.scrollY / getMaxScroll(), 0), 1);
}

function getTargetTime() {
  if (!duration) return 0;
  return getScrollProgress() * duration;
}

function updateCropCache() {
  if (!useCanvas) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const cw = hero.clientWidth;
  const ch = hero.clientHeight;
  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoAspect > canvasAspect) {
    sw = vh * canvasAspect;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / canvasAspect;
    sy = (vh - sh) / 2;
  }

  crop = { sx, sy, sw, sh, cw, ch };
}

function resizeCanvas() {
  if (!useCanvas) return;

  const dpr = isMobile
    ? 1
    : Math.min(window.devicePixelRatio || 1, 1.5);
  const width = hero.clientWidth;
  const height = hero.clientHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  updateCropCache();
}

function drawCoverFrame() {
  if (!useCanvas || !crop) return;
  ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.cw, crop.ch);
}

function scheduleDraw() {
  if (!useCanvas) return;

  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(() => drawCoverFrame());
  } else {
    drawCoverFrame();
  }
}

function applyForwardSmoothing(target) {
  const gap = target - smoothTime;
  const factor = gap > 0.4 ? 0.22 : gap > 0.1 ? 0.14 : 0.09;
  smoothTime += gap * factor;

  if (Math.abs(video.currentTime - smoothTime) > 0.004) {
    video.currentTime = smoothTime;
    if (useCanvas) scheduleDraw();
  }
}

function applyReverseByScrollDelta(scrollDelta, target) {
  const rawDelta = (scrollDelta / getMaxScroll()) * duration;
  const timeDelta = Math.max(rawDelta, -0.045);
  smoothTime = Math.max(0, smoothTime + timeDelta);

  if (smoothTime < target) smoothTime = target;

  if (Math.abs(video.currentTime - smoothTime) > 0.008) {
    video.currentTime = smoothTime;
    drawCoverFrame();
  }
}

function applyReverseByPlayback(target) {
  const diff = target - video.currentTime;

  if (diff < -0.012) {
    video.playbackRate = Math.max(diff * 6, -3);
    if (video.paused) video.play();
    smoothTime = video.currentTime;
    return;
  }

  video.pause();
  video.playbackRate = 1;
  video.currentTime = target;
  smoothTime = target;
}

function scrubToScroll() {
  if (!isReady || !isActivated) return;

  const scrollY = window.scrollY;
  const scrollDelta = scrollY - lastScrollY;
  lastScrollY = scrollY;

  const target = getTargetTime();
  const reversing = target < smoothTime - 0.001;

  if (reversing) {
    if (supportsReversePlayback) {
      applyReverseByPlayback(target);
    } else if (scrollDelta < 0) {
      applyReverseByScrollDelta(scrollDelta, target);
    } else {
      smoothTime = target;
      if (Math.abs(video.currentTime - smoothTime) > 0.008) {
        video.currentTime = smoothTime;
        drawCoverFrame();
      }
    }
    return;
  }

  if (!useCanvas && !video.paused) {
    video.pause();
    video.playbackRate = 1;
  }

  applyForwardSmoothing(target);
}

function updateHeroVisibility() {
  if (window.scrollY >= getMaxScroll() - 2) {
    hero.classList.add("is-hidden");
  } else {
    hero.classList.remove("is-hidden");
  }
}

function tick() {
  scrubToScroll();
  updateHeroVisibility();
  requestAnimationFrame(tick);
}

async function activateVideo() {
  if (isActivated) return;

  try {
    await video.play();

    if (useCanvas) {
      video.playbackRate = 0;
    } else {
      video.pause();
      video.playbackRate = 1;
    }

    isActivated = true;
    smoothTime = getTargetTime();
    lastScrollY = window.scrollY;
    scrubToScroll();
  } catch {
    isActivated = false;
  }
}

function onVideoReady() {
  if (!video.duration || !isFinite(video.duration)) return;

  duration = video.duration;
  isReady = video.readyState >= 2;
  smoothTime = getTargetTime();
  lastScrollY = window.scrollY;

  if (!useCanvas) {
    video.pause();
    video.playbackRate = 1;
    isActivated = true;
  }

  resizeCanvas();
  scrubToScroll();
}

video.addEventListener("loadedmetadata", onVideoReady);
video.addEventListener("loadeddata", onVideoReady);
video.addEventListener("canplay", onVideoReady);

document.addEventListener("touchstart", activateVideo, { passive: true });
document.addEventListener("click", activateVideo);

window.addEventListener(
  "scroll",
  () => {
    if (useCanvas && !isActivated) activateVideo();
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  lastScrollY = window.scrollY;
  resizeCanvas();
  scrubToScroll();
}, { passive: true });

window.visualViewport?.addEventListener("resize", () => {
  lastScrollY = window.scrollY;
  resizeCanvas();
  scrubToScroll();
}, { passive: true });

video.load();
resizeCanvas();
requestAnimationFrame(tick);
