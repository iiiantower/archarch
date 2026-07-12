const RAIL_TOP = 166;

function updateProjectNav() {
    document.querySelectorAll(".project").forEach((project) => {
        const nav = project.querySelector(".project__nav");
        const sticky = project.querySelector(".project__nav-sticky");
        const placeholder = project.querySelector(".project__nav-placeholder");
        const content = project.querySelector(".project__content");

        if (!nav || !sticky || !placeholder || !content) {
            return;
        }

        const projectRect = project.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const shouldFix =
            projectRect.top < RAIL_TOP && contentRect.bottom > RAIL_TOP;

        if (shouldFix) {
            placeholder.style.height = `${sticky.offsetHeight}px`;
            sticky.classList.add("is-fixed");
            sticky.style.width = `${nav.offsetWidth}px`;
            sticky.style.left = `${nav.getBoundingClientRect().left}px`;
        } else {
            placeholder.style.height = "0";
            sticky.classList.remove("is-fixed");
            sticky.style.width = "";
            sticky.style.left = "";
        }
    });
}

function scrollToProjectTarget() {
    const hash = window.location.hash;

    if (!hash) {
        return;
    }

    const target = document.querySelector(hash);

    if (!target) {
        return;
    }

    const top =
        target.getBoundingClientRect().top + window.scrollY - RAIL_TOP;

    window.scrollTo({
        top: Math.max(0, top),
        behavior: "auto",
    });
}

function handlePageReady() {
    scrollToProjectTarget();
    updateProjectNav();
}

window.addEventListener("scroll", updateProjectNav, { passive: true });
window.addEventListener("resize", updateProjectNav);
window.addEventListener("hashchange", handlePageReady);
window.addEventListener("load", handlePageReady);
