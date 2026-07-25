(() => {
    const root = document.documentElement;
    const IDLE_MS = 900;
    let idleTimer = 0;

    function markScrolling() {
        root.classList.add("is-scrolling");
        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
            root.classList.remove("is-scrolling");
        }, IDLE_MS);
    }

    window.addEventListener("scroll", markScrolling, { passive: true });
    window.addEventListener("wheel", markScrolling, { passive: true });
    window.addEventListener("touchmove", markScrolling, { passive: true });
})();
