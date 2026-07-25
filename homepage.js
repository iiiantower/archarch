const FRAME_N = 6.5;
const FRAME_X = 45;
const FRAME_Y = 83.5;
const FRAME_BY_KEY = { n: FRAME_N, x: FRAME_X, y: FRAME_Y };
/* Viewport offset when jumping to #manifesto (matches scroll-margin-top). */
const MANIFESTO_TOP = 100;
const SCROLL_MS = 500;

const nav = document.querySelector(".corner-nav");
const logo = document.querySelector(".logo");
const gallery = document.getElementById("gallery");
const manifesto = document.getElementById("manifesto");

let scrollFrameCenter = FRAME_X;
let hoverKey = null;
let hoverLeaveTimer = 0;

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

    // "x" — pin gallery top to the top of the viewport.
    return gallery.getBoundingClientRect().top + window.scrollY;
}

function getManifestoAnchorY() {
    if (!manifesto) {
        return 0;
    }

    // "n" — pin manifesto top to MANIFESTO_TOP (includes the 230px gallery gap).
    return manifesto.getBoundingClientRect().top + window.scrollY - MANIFESTO_TOP;
}

function setFrameCenter(center, { animate = false } = {}) {
    if (!nav) {
        return;
    }

    nav.classList.toggle("is-hovering", animate);
    nav.style.setProperty("--corner-nav-frame-center", `${center}px`);
}

function updateLogoFromGalleryScroll() {
    if (!logo || !gallery) {
        return;
    }

    // Start when gallery bottom meets the logo bottom; then move 1:1 with gallery.
    // Use offset box (ignores transform) so the threshold stays at the resting logo.
    const logoBottom = logo.offsetTop + logo.offsetHeight;
    const past = logoBottom - gallery.getBoundingClientRect().bottom;
    const offsetY = past > 0 ? -past : 0;

    logo.style.transform = `translateY(${offsetY}px)`;
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
        updateLogoFromGalleryScroll();
        return;
    }

    const galleryY = getGalleryAnchorY();
    const manifestoY = getManifestoAnchorY();
    const span = manifestoY - galleryY;

    if (span <= 0) {
        scrollFrameCenter = FRAME_X;
        nav.dataset.active = "x";
    } else {
        const progress = clamp((window.scrollY - galleryY) / span, 0, 1);
        scrollFrameCenter = FRAME_X + (FRAME_N - FRAME_X) * progress;
        nav.dataset.active = progress >= 1 ? "n" : "x";
    }

    updateLogoFromGalleryScroll();

    if (!hoverKey) {
        setFrameCenter(scrollFrameCenter, { animate: false });
    }
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

function bindCornerNavHover() {
    if (!nav) {
        return;
    }

    nav.querySelectorAll(".corner-nav__item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
            window.clearTimeout(hoverLeaveTimer);
            hoverKey = item.dataset.nav;
            const center = FRAME_BY_KEY[hoverKey];

            if (typeof center === "number") {
                setFrameCenter(center, { animate: true });
            }
        });
    });

    nav.addEventListener("mouseleave", () => {
        hoverKey = null;
        setFrameCenter(scrollFrameCenter, { animate: true });
        window.clearTimeout(hoverLeaveTimer);
        hoverLeaveTimer = window.setTimeout(() => {
            if (!hoverKey) {
                nav.classList.remove("is-hovering");
            }
        }, 450);
    });
}

if (nav) {
    bindCornerNavHover();

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
