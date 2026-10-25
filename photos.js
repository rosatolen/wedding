export const ROTATE_MS = 5000;

export function startPhotos({ doc = document, setTimer = setInterval, clearTimer = clearInterval } = {}) {
  const clusters = new Map();
  doc.querySelectorAll(".photo").forEach((photo) => {
    const corner = photo.dataset.corner;
    if (!clusters.has(corner)) clusters.set(corner, { photos: [], current: -1 });
    const cluster = clusters.get(corner);
    cluster.photos.push(photo);
    if (photo.classList.contains("photo--front")) cluster.current = cluster.photos.length - 1;
  });

  function show(cluster, index) {
    cluster.photos[cluster.current]?.classList.remove("photo--raised");
    cluster.current = index;
    cluster.photos[index].classList.add("photo--raised");
  }

  function tick() {
    clusters.forEach((cluster) => show(cluster, (cluster.current + 1) % cluster.photos.length));
  }

  doc.querySelectorAll(".photo").forEach((photo) => {
    const cluster = clusters.get(photo.dataset.corner);
    const raise = () => show(cluster, cluster.photos.indexOf(photo));
    photo.tabIndex = 0;
    photo.setAttribute("role", "button");
    photo.addEventListener("click", raise);
    photo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); raise(); }
    });
  });

  const timer = setTimer(tick, ROTATE_MS);
  return { tick, stop: () => clearTimer(timer) };
}

// A second evaluation of this module must not leave two timers running.
if (typeof document !== "undefined") {
  globalThis.__photoRotation?.stop();
  globalThis.__photoRotation = startPhotos();
}
