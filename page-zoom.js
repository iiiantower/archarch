/* Scales the whole 1440px layout to the browser width via CSS zoom on the
   root element. Unlike transform, zoom reflows layout natively: document
   height tracks the scale (single scrollbar) and position:fixed keeps
   working. Pages can opt out below a width with data-zoom-min-width.

   Also forces a stable right gutter on overlay-scrollbar browsers (macOS
   default), matching classic scrollbars + scrollbar-gutter: stable. */
(() => {
    const BASE_WIDTH = 1440;
    /* Keep in sync with html::-webkit-scrollbar { width }. */
    const GUTTER_PX = 8;
    const root = document.documentElement;
    const minWidth = Number(document.currentScript?.dataset.zoomMinWidth) || 0;

    function overlayGutterPx() {
        // Classic / stable-gutter: innerWidth > clientWidth.
        // Overlay scrollbars: both equal → force a synthetic gutter.
        const taken = Math.max(0, window.innerWidth - root.clientWidth);
        return taken < 4 ? GUTTER_PX : 0;
    }

    function fit() {
        // Clear zoom before measuring so clientWidth is true viewport CSS px.
        // Both writes happen in the same task, so the intermediate state
        // never paints.
        root.style.zoom = "";
        const forced = overlayGutterPx();
        const width = root.clientWidth - forced;

        if (minWidth && width <= minWidth) {
            // No zoom: gutter is already in viewport CSS px.
            root.style.setProperty("--scrollbar-gutter", `${forced}px`);
            return;
        }

        const z = width / BASE_WIDTH;
        // --scrollbar-gutter is used by zoomed rules (e.g. fixed header), so
        // store layout px such that layout × zoom = forced viewport px.
        root.style.setProperty(
            "--scrollbar-gutter",
            forced ? `${forced / z}px` : "0px"
        );
        root.style.zoom = String(z);
    }

    fit();
    // Refit once the document has laid out: classic scrollbars / stable
    // gutter may only affect clientWidth after content is present.
    window.addEventListener("load", fit);
    window.addEventListener("resize", fit);
})();
