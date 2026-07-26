/* Scales the 1440px design canvas to the browser width using CSS
   `transform: scale()` — not the non-standard `zoom` property, which is
   unreliable on iOS Safari for text sizing and for `position: fixed`
   (zoom quietly re-inflates text and fixed-element offsets in ways that
   don't match desktop browsers).

   Structure this relies on (see homepage/projects/survey CSS+HTML):
   - `.scale-frame` is an un-transformed sizer; its only child (`.homepage`
     / `.page-canvas`) is `position: absolute` + `transform: scale(var(
     --page-scale))`. The frame's own box is set to the *rendered* size in
     JS, so the document has exactly one, correctly sized scrollbar and no
     horizontal overflow.
   - `.site-header__inner` / `.sidebar__inner` / `.lang-nav__inner` read
     the same `--page-scale` custom property directly in CSS. Their fixed
     ancestors (`.site-header`, `.sidebar`, `.lang-nav`) are never
     transformed, so they stay genuinely pinned to the viewport — a
     transformed ancestor would otherwise become the containing block for
     any `position: fixed` descendant, breaking real "stick to viewport"
     behaviour.
   - Survey pages may pass `data-zoom-min-width` to keep an untouched
     mobile layout (matched by screen size, so the desktop-scaled markup
     on other pages can't confuse it). */
(() => {
    const BASE_WIDTH = 1440;
    /* Keep in sync with html::-webkit-scrollbar { width }. */
    const GUTTER_PX = 8;

    const root = document.documentElement;
    const minWidth = Number(document.currentScript?.dataset.zoomMinWidth) || 0;

    function isSurveyMobile() {
        if (!minWidth) {
            return false;
        }
        // Screen size, not layout width, so a scaled desktop page can't trip this.
        return Math.min(window.screen.width, window.screen.height) <= minWidth;
    }

    /* True reserved scrollbar width; ~0 on overlay-scrollbar systems
       (trackpad-style macOS, and all of iOS/iPadOS). */
    function classicScrollbarWidth() {
        const el = document.createElement("div");
        el.style.cssText =
            "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden";
        (document.body || root).appendChild(el);
        const width = el.offsetWidth - el.clientWidth;
        el.remove();
        return width;
    }

    function overlayGutterPx() {
        return classicScrollbarWidth() < 4 ? GUTTER_PX : 0;
    }

    function applyGutter(px) {
        root.classList.toggle("has-overlay-gutter", px > 0);
        root.style.setProperty("--scrollbar-gutter", `${px}px`);
        root.style.setProperty("--overlay-gutter-width", `${px}px`);
    }

    function fit() {
        const frame = document.querySelector(".scale-frame");
        const canvas = frame?.firstElementChild;

        if (isSurveyMobile() || !frame || !canvas) {
            root.style.setProperty("--page-scale", "1");
            applyGutter(0);
            if (frame) {
                frame.style.height = "";
            }
            return;
        }

        const gutter = overlayGutterPx();
        applyGutter(gutter);

        const width = root.clientWidth - gutter;
        if (width <= 0) {
            return;
        }

        const z = width / BASE_WIDTH;
        root.style.setProperty("--page-scale", String(z));
        // canvas.offsetHeight is the natural, pre-transform layout height —
        // transform never feeds back into offset*, only getBoundingClientRect.
        frame.style.height = `${canvas.offsetHeight * z}px`;
    }

    fit();
    document.addEventListener("DOMContentLoaded", fit);
    window.addEventListener("load", fit);
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
})();
