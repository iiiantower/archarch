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
    const target = hash
        ? document.querySelector(hash)
        : document.querySelector(".project");

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

const cornerNav = document.querySelector(".corner-nav");

cornerNav?.querySelector('[data-nav="y"]')?.addEventListener("click", (event) => {
    const href = event.currentTarget.getAttribute("href");

    if (!href?.startsWith("#")) {
        return;
    }

    event.preventDefault();
    history.replaceState(null, "", href);
    scrollToProjectTarget();
    updateProjectNav();
});

window.addEventListener("scroll", updateProjectNav, { passive: true });
window.addEventListener("resize", updateProjectNav);
window.addEventListener("hashchange", handlePageReady);
window.addEventListener("load", handlePageReady);
