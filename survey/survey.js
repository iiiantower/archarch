(function () {
    const form = document.querySelector(".survey-form");
    if (!form) {
        return;
    }

    // Local: node survey/dev-server.mjs
    // Production: Cloudflare Worker (survey/feishu-submit.worker.js)
    // Override: window.ARCHARCH_FEISHU_SUBMIT_URL = "https://...."
    const FEISHU_SUBMIT_URL =
        window.ARCHARCH_FEISHU_SUBMIT_URL ||
        (location.hostname === "127.0.0.1" || location.hostname === "localhost"
            ? "http://127.0.0.1:8787/api/feishu-submit"
            : "https://archarch-feishu-submit.iian.workers.dev");

    const FEISHU_FIELDS = {
        brings_you: {
            title: "What brings you to us?",
            kind: "multi",
        },
        challenge: {
            title: "What challenge are you hoping this project will solve? (Select up to 3)",
            kind: "multi",
        },
        brand_feel: {
            title: "How should your brand feel? (Select up to 3)",
            kind: "multi",
        },
        achieve: {
            title: "What would you like this project to help your business achieve?(Select up to 3)",
            kind: "multi",
        },
        audience: { title: "Who is your target audience?", kind: "text" },
        remember_one: {
            title: "If people remember only one thing about your brand, what should it be?",
            kind: "text",
        },
        anything_else: {
            title: "Is there anything else you'd like us to know?",
            kind: "text",
        },
        contact_name: { title: "Contact Name", kind: "text" },
        email: { title: "Email", kind: "text" },
        phone: { title: "Phone Number", kind: "text" },
        industry: { title: "Industry", kind: "text" },
        country: { title: "Country/ Region", kind: "text" },
        website: { title: "Website/Social Media", kind: "text" },
    };

    // Exact Feishu option names (some have leading spaces / line separators).
    const OPTION_MAPS = {
        brings_you: {
            "Launching a new brand": " Launching a new brand",
            "Rebranding an existing business": "\u2028Rebranding an existing business",
            "Brand strategy": "\u2028Brand strategy",
            "Logo & visual identity": " Logo & visual identity",
            "Packaging design": "Packaging design",
            "Website design": "Website design",
            "Marketing materials": "Marketing materials",
            "Ongoing design support": "Ongoing design support",
            Other: "Other",
        },
        challenge: {
            "Low brand recognition": "Low brand recognition",
            "Inconsistent brand identity": "Inconsistent brand identity",
            "Outdated visual identity": "Outdated visual identity",
            "Attracting the right customers": "Attracting the right customers",
            "Standing out from competitors": "Standing out from competitors",
            "Launching a new product or service": "Launching a new product or service",
            "Entering a new market": "Entering a new market",
            "Building trust & credibility": "Building trust & credibility",
            "Clarifying our positioning": "Clarifying our positioning",
            Other: "Other",
        },
        brand_feel: {
            Modern: "Modern",
            Timeless: "Timeless",
            Bold: "Bold",
            Minimal: "Minimal",
            Premium: "Premium",
            Sophisticated: "Sophisticated",
            Human: "Human",
            Approachable: "Approachable",
            Trustworthy: "Trustworthy",
            Friendly: "Friendly",
            Playful: "Playful",
            Innovative: "Innovative",
            Authentic: "Authentic",
            Sustainable: "Sustainable",
            Other: "Other",
        },
        achieve: {
            "Increase brand awareness": "Increase brand awareness",
            "Attract new customers": "Attract new customers",
            "Increase sales": "Increase sales",
            "Support a product launch": "Support a product launch",
            "Reach a new audience": "Reach a new audience",
            "Improve customer trust": "Improve customer trust",
            "Differentiate from competitors": "Differentiate from competitors",
            "Increase perceived value": "Increase perceived value",
            "Prepare for growth": "Prepare for growth",
            Other: "Other",
        },
    };

    const multiSelectInstances = [];
    const UNDER_DROPDOWN_CLASS = "field__box--under-dropdown";
    const submitButton = form.querySelector(".survey-form__submit");

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
        const fieldKey = String(root.dataset.field || "").replace(/-/g, "_");
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
            fieldKey,
            closePanel,
            validate,
            getSelectedValues,
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

    function mapOptions(fieldKey, values) {
        const map = OPTION_MAPS[fieldKey] || {};
        return values.map((value) => map[value] || value);
    }

    function textValue(name) {
        const el = form.elements.namedItem(name);
        return el && typeof el.value === "string" ? el.value.trim() : "";
    }

    function validateTextFields() {
        let firstInvalid = null;
        const requiredNames = ["audience", "industry", "country", "contact_name", "phone", "email"];

        requiredNames.forEach((name) => {
            const el = form.elements.namedItem(name);
            if (!el) {
                return;
            }

            const field = el.closest(".field");
            const ok = Boolean(el.value && el.value.trim());
            if (field) {
                field.classList.toggle("field--error", !ok);
            }
            if (!ok && !firstInvalid) {
                firstInvalid = field || el;
            }
        });

        return firstInvalid;
    }

    function buildFeishuContent() {
        const content = {};

        multiSelects.forEach((multiSelect) => {
            const key = multiSelect.fieldKey;
            const meta = FEISHU_FIELDS[key];
            if (!meta) {
                return;
            }

            const selected = mapOptions(key, multiSelect.getSelectedValues());
            if (selected.length === 0) {
                return;
            }

            content[meta.title] = selected;
        });

        const textKeys = [
            "audience",
            "remember_one",
            "anything_else",
            "contact_name",
            "email",
            "phone",
            "industry",
            "country",
            "website",
        ];

        textKeys.forEach((key) => {
            const meta = FEISHU_FIELDS[key];
            const value = textValue(key);
            if (!meta || !value) {
                return;
            }
            content[meta.title] = value;
        });

        return content;
    }

    function setSubmitting(isSubmitting) {
        if (!submitButton) {
            return;
        }
        submitButton.disabled = isSubmitting;
        submitButton.textContent = isSubmitting ? "Submitting…" : "Submit";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        let firstInvalid = null;

        multiSelects.forEach((multiSelect) => {
            if (!multiSelect.validate()) {
                firstInvalid = firstInvalid || multiSelect.root;
            }
        });

        const textInvalid = validateTextFields();
        firstInvalid = firstInvalid || textInvalid;

        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const content = buildFeishuContent();
        setSubmitting(true);

        try {
            const response = await fetch(FEISHU_SUBMIT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch (error) {
                payload = null;
            }

            if (!response.ok || !payload || payload.ok !== true) {
                const detail =
                    (payload &&
                        (payload.error ||
                            payload.msg ||
                            (payload.feishu &&
                                (payload.feishu.msg || JSON.stringify(payload.feishu))))) ||
                    `Submit failed (${response.status})`;
                throw new Error(detail);
            }

            window.location.href = "thanks/";
        } catch (error) {
            console.error(error);
            window.alert("Submission failed. Please try again in a moment.");
        } finally {
            setSubmitting(false);
        }
    });
})();
