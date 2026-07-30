const RAIL_TOP = 140;
const FRAME_BY_KEY = { n: 6.5, x: 45, y: 83.5 };
const FRAME_Y = FRAME_BY_KEY.y;

const logoProbe = document.querySelector(".logo");

function visualScale() {
    // Ratio of rendered (gBCR) px to layout (offset*) px. Under page zoom
    // this is the zoom factor; 1 when unzoomed.
    if (!logoProbe || !logoProbe.offsetHeight) {
        return 1;
    }

    return logoProbe.getBoundingClientRect().height / logoProbe.offsetHeight;
}

/* .page-canvas is `transform`'d, which makes it the containing block for
   any `position: fixed` descendant — so the sticky nav can't just fix
   itself in place there. Instead, keep the original always in normal
   flow and clone it once into a real (un-transformed) fixed overlay that
   mirrors its position/scale via JS, toggling visibility between the two. */
function getStickyOverlay(sticky) {
    if (sticky._overlay) {
        return sticky._overlay;
    }

    const overlay = sticky.cloneNode(true);
    overlay.classList.add("project__nav-sticky--overlay");
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    sticky._overlay = overlay;
    return overlay;
}

function updateProjectNav() {
    const z = visualScale();
    const railTop = RAIL_TOP * z;

    document.querySelectorAll(".project").forEach((project) => {
        const nav = project.querySelector(".project__nav");
        const sticky = project.querySelector(".project__nav-sticky");
        const content = project.querySelector(".project__content");

        if (!nav || !sticky || !content) {
            return;
        }

        const overlay = getStickyOverlay(sticky);
        const projectRect = project.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const shouldFix =
            projectRect.top < railTop && contentRect.bottom > railTop;

        if (shouldFix) {
            sticky.style.visibility = "hidden";
            overlay.style.display = "block";
            overlay.style.top = `${railTop}px`;
            overlay.style.left = `${nav.getBoundingClientRect().left}px`;
            overlay.style.transform = `scale(${z})`;
        } else {
            sticky.style.visibility = "";
            overlay.style.display = "none";
        }
    });
}

function scrollToProjectTarget({ smooth = false } = {}) {
    const hash = window.location.hash;
    const target = hash
        ? document.querySelector(hash)
        : document.querySelector(".project");

    if (!target) {
        return;
    }

    const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        RAIL_TOP * visualScale();

    window.scrollTo({
        top: Math.max(0, top),
        behavior: smooth ? "smooth" : "auto",
    });
}

function handlePageReady() {
    scrollToProjectTarget();
    updateProjectNav();
}

const practiceToggle = document.querySelector('[data-section="practice"]');
const practiceProjects = document.querySelector(".sidebar__projects");

/* Height is set from scrollHeight rather than a class, so the list can
   transition open (a `height: auto` target wouldn't animate) and still
   work if projects are added later. */
function setPracticeProjectsOpen(open) {
    if (!practiceToggle || !practiceProjects) {
        return;
    }

    practiceToggle.setAttribute("aria-expanded", String(open));
    practiceProjects.classList.toggle("is-open", open);
    practiceProjects.style.height = open
        ? `${practiceProjects.scrollHeight}px`
        : "0px";
}

function togglePracticeProjects(event) {
    event.stopPropagation();
    setPracticeProjectsOpen(practiceToggle?.getAttribute("aria-expanded") !== "true");
}

practiceToggle?.addEventListener("click", togglePracticeProjects);
practiceToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePracticeProjects(event);
    }
});

practiceProjects?.addEventListener("click", (event) => {
    event.stopPropagation();

    const projectButton = event.target.closest(".sidebar__project");
    if (!projectButton) {
        return;
    }

    const targetId = projectButton.dataset.projectTarget;
    if (targetId && document.getElementById(targetId)) {
        history.replaceState(null, "", `#${targetId}`);
        scrollToProjectTarget({ smooth: true });
        updateProjectNav();
    }

    setPracticeProjectsOpen(false);
});

document.addEventListener("click", () => setPracticeProjectsOpen(false));
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setPracticeProjectsOpen(false);
    }
});

const cornerNav = document.querySelector(".corner-nav");
let cornerHoverKey = null;
let cornerHoverLeaveTimer = 0;
let cornerScrollFrameCenter = FRAME_Y;

function setCornerFrameCenter(center, { animate = false } = {}) {
    if (!cornerNav) {
        return;
    }

    cornerNav.classList.toggle("is-hovering", animate);
    cornerNav.style.setProperty("--corner-nav-frame-center", `${center}px`);
}

function bindCornerNavHover() {
    if (!cornerNav) {
        return;
    }

    cornerNav.querySelectorAll(".corner-nav__item").forEach((item) => {
        item.addEventListener("mouseenter", () => {
            window.clearTimeout(cornerHoverLeaveTimer);
            cornerHoverKey = item.dataset.nav;
            const center = FRAME_BY_KEY[cornerHoverKey];

            if (typeof center === "number") {
                setCornerFrameCenter(center, { animate: true });
            }
        });
    });

    cornerNav.addEventListener("mouseleave", () => {
        cornerHoverKey = null;
        setCornerFrameCenter(cornerScrollFrameCenter, { animate: true });
        window.clearTimeout(cornerHoverLeaveTimer);
        cornerHoverLeaveTimer = window.setTimeout(() => {
            if (!cornerHoverKey) {
                cornerNav.classList.remove("is-hovering");
            }
        }, 450);
    });
}

bindCornerNavHover();
setCornerFrameCenter(cornerScrollFrameCenter, { animate: false });

cornerNav?.querySelector('[data-nav="y"]')?.addEventListener("click", (event) => {
    const href = event.currentTarget.getAttribute("href");

    if (!href?.startsWith("#")) {
        return;
    }

    event.preventDefault();
    history.replaceState(null, "", href);
    scrollToProjectTarget({ smooth: true });
    updateProjectNav();
});

window.addEventListener("scroll", updateProjectNav, { passive: true });
window.addEventListener("resize", updateProjectNav);
window.addEventListener("hashchange", handlePageReady);
window.addEventListener("load", handlePageReady);
