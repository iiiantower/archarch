const FRAME_N = 7.7;
const FRAME_X = 54.12;
const MANIFESTO_TOP = 320;
const SCROLL_MS = 500;

const nav = document.querySelector(".corner-nav");
const gallery = document.getElementById("gallery");
const manifesto = document.getElementById("manifesto");

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getGalleryAnchorY() {
    if (!gallery) {
        return 0;
    }

    return gallery.getBoundingClientRect().top + window.scrollY;
}

function getManifestoAnchorY() {
    if (!manifesto) {
        return 0;
    }

    return manifesto.getBoundingClientRect().top + window.scrollY - MANIFESTO_TOP;
}

function smoothScrollTo(targetY, duration = SCROLL_MS) {
    const startY = window.scrollY;
    const delta = targetY - startY;

    if (Math.abs(delta) < 1) {
        window.scrollTo(0, targetY);
        updateFrameFromScroll();
        return;
    }

    const startTime = performance.now();

    function tick(now) {
        const progress = clamp((now - startTime) / duration, 0, 1);
        window.scrollTo(0, startY + delta * easeInOutCubic(progress));

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            window.scrollTo(0, targetY);
            updateFrameFromScroll();
        }
    }

    requestAnimationFrame(tick);
}

function jumpTo(targetY) {
    window.scrollTo(0, Math.max(0, targetY));
    updateFrameFromScroll();
}

function updateFrameFromScroll() {
    if (!nav || !manifesto) {
        return;
    }

    const galleryY = getGalleryAnchorY();
    const manifestoY = getManifestoAnchorY();
    const span = manifestoY - galleryY;

    if (span <= 0) {
        nav.style.setProperty("--corner-nav-frame-center", `${FRAME_X}px`);
        nav.dataset.active = "x";
        return;
    }

    const progress = clamp((window.scrollY - galleryY) / span, 0, 1);
    const center = FRAME_X + (FRAME_N - FRAME_X) * progress;

    nav.style.setProperty("--corner-nav-frame-center", `${center}px`);
    nav.dataset.active = progress >= 1 ? "n" : "x";
}

function scrollToManifesto(smooth = true) {
    const targetY = Math.max(0, getManifestoAnchorY());

    if (smooth) {
        smoothScrollTo(targetY);
    } else {
        jumpTo(targetY);
    }
}

function scrollToGallery(smooth = true) {
    const targetY = Math.max(0, getGalleryAnchorY());

    if (smooth) {
        smoothScrollTo(targetY);
    } else {
        jumpTo(targetY);
    }
}

function applyHashTarget(smooth = false) {
    const hash = window.location.hash;

    if (hash === "#manifesto") {
        scrollToManifesto(smooth);
        return true;
    }

    if (hash === "#gallery") {
        scrollToGallery(smooth);
        return true;
    }

    return false;
}

if (nav) {
    nav.querySelector('[data-nav="n"]')?.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState(null, "", "#manifesto");
        scrollToManifesto(true);
    });

    nav.querySelector('[data-nav="x"]')?.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState(null, "", "#gallery");
        scrollToGallery(true);
    });
}

window.addEventListener("scroll", updateFrameFromScroll, { passive: true });
window.addEventListener("resize", updateFrameFromScroll);
window.addEventListener("hashchange", () => applyHashTarget(true));
window.addEventListener("load", () => {
    if (!applyHashTarget(false)) {
        updateFrameFromScroll();
    }
});
updateFrameFromScroll();
