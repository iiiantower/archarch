(function () {
    const form = document.querySelector(".survey-form");
    if (!form) {
        return;
    }

    const multiSelectInstances = [];
    const UNDER_DROPDOWN_CLASS = "field__box--under-dropdown";

    function clearUnderDropdownBorders() {
        form.querySelectorAll(`.${UNDER_DROPDOWN_CLASS}`).forEach((box) => {
            box.classList.remove(UNDER_DROPDOWN_CLASS);
        });
    }

    function hideBordersUnderPanel(panel, trigger) {
        clearUnderDropdownBorders();

        if (panel.hidden) {
            return;
        }

        const panelRect = panel.getBoundingClientRect();

        form.querySelectorAll(".field__box").forEach((box) => {
            if (box === trigger) {
                return;
            }

            const rect = box.getBoundingClientRect();
            const overlapsHorizontally = rect.left < panelRect.right && rect.right > panelRect.left;
            const topNearPanelBottom = rect.top >= panelRect.bottom - 1 && rect.top <= panelRect.bottom + 2;

            if (overlapsHorizontally && topNearPanelBottom) {
                box.classList.add(UNDER_DROPDOWN_CLASS);
            }
        });
    }

    function initMultiSelect(root) {
        const max = root.dataset.max ? Number.parseInt(root.dataset.max, 10) : Infinity;
        const required = root.dataset.required === "true";
        const trigger = root.querySelector(".multi-select__trigger");
        const panel = root.querySelector(".multi-select__panel");
        const valueEl = root.querySelector(".multi-select__value");
        const checkboxes = Array.from(root.querySelectorAll('input[type="checkbox"]'));

        function getSelectedValues() {
            return checkboxes
                .filter((checkbox) => checkbox.checked)
                .map((checkbox) => checkbox.value);
        }

        function updateDisabledState() {
            const atMax = getSelectedValues().length >= max;

            checkboxes.forEach((checkbox) => {
                const option = checkbox.closest(".multi-select__option");
                const shouldDisable = !checkbox.checked && atMax;

                checkbox.disabled = shouldDisable;
                option.classList.toggle("multi-select__option--disabled", shouldDisable);
            });
        }

        function clearError() {
            if (!required || getSelectedValues().length > 0) {
                root.classList.remove("field--error");
            }
        }

        function showError() {
            root.classList.add("field--error");
            trigger.focus();
        }

        function updateDisplay() {
            valueEl.textContent = getSelectedValues().join(", ");
            updateDisabledState();
            clearError();
        }

        function openPanel() {
            panel.hidden = false;
            trigger.setAttribute("aria-expanded", "true");
            root.classList.add("multi-select--open");
            requestAnimationFrame(() => {
                hideBordersUnderPanel(panel, trigger);
            });
        }

        function closePanel() {
            panel.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            root.classList.remove("multi-select--open");
            clearUnderDropdownBorders();
        }

        function togglePanel() {
            if (panel.hidden) {
                multiSelectInstances.forEach((multiSelect) => {
                    if (multiSelect.root !== root) {
                        multiSelect.closePanel();
                    }
                });
                openPanel();
            } else {
                closePanel();
            }
        }

        function validate() {
            if (!required) {
                return true;
            }

            if (getSelectedValues().length === 0) {
                showError();
                return false;
            }

            clearError();
            return true;
        }

        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            togglePanel();
        });

        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                if (checkbox.checked && getSelectedValues().length > max) {
                    checkbox.checked = false;
                    return;
                }

                updateDisplay();
            });
        });

        panel.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        updateDisplay();

        const instance = {
            root,
            closePanel,
            validate,
        };

        multiSelectInstances.push(instance);
        return instance;
    }

    const multiSelects = Array.from(document.querySelectorAll(".multi-select")).map(initMultiSelect);

    document.addEventListener("click", (event) => {
        multiSelects.forEach((multiSelect) => {
            if (!multiSelect.root.contains(event.target)) {
                multiSelect.closePanel();
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            multiSelects.forEach((multiSelect) => {
                multiSelect.closePanel();
            });
        }
    });

    form.addEventListener("submit", (event) => {
        let firstInvalid = null;

        multiSelects.forEach((multiSelect) => {
            if (!multiSelect.validate()) {
                firstInvalid = firstInvalid || multiSelect.root;
            }
        });

        if (firstInvalid) {
            event.preventDefault();
            firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
})();
