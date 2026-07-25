/* Scales the whole 1440px layout to the browser width via CSS zoom on the
   root element. Unlike transform, zoom reflows layout natively: document
   height tracks the scale (single scrollbar) and position:fixed keeps
   working. Pages can opt out below a width with data-zoom-min-width. */
(() => {
    const BASE_WIDTH = 1440;
    const root = document.documentElement;
    const minWidth = Number(document.currentScript?.dataset.zoomMinWidth) || 0;

    function fit() {
        // Clear zoom before measuring so clientWidth is true viewport CSS px
        // (excluding any scrollbar) regardless of how the browser reports
        // sizes under a zoomed root. Both writes happen in the same task, so
        // the intermediate state never paints.
        root.style.zoom = "";
        const width = root.clientWidth;

        if (minWidth && width <= minWidth) {
            return;
        }

        root.style.zoom = String(width / BASE_WIDTH);
    }

    fit();
    // Refit once the document has laid out: with classic (non-overlay)
    // scrollbars the vertical scrollbar only exists after content loads,
    // which changes clientWidth.
    window.addEventListener("load", fit);
    window.addEventListener("resize", fit);
})();
