const heroScroll = document.querySelector(".hero-scroll");
const video = document.querySelector(".hero__video");

let duration = 0;
let ticking = false;

function getScrollProgress() {
  const scrollRange = heroScroll.offsetHeight - window.innerHeight;
  if (scrollRange <= 0) return 0;

  const scrolled = window.scrollY - heroScroll.offsetTop;
  return Math.min(Math.max(scrolled / scrollRange, 0), 1);
}

function scrubVideo() {
  if (!duration) return;
  video.currentTime = getScrollProgress() * duration;
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(scrubVideo);
  }
}

video.addEventListener("loadedmetadata", () => {
  duration = video.duration;
  video.pause();
  scrubVideo();
});

video.addEventListener("loadeddata", scrubVideo);

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
