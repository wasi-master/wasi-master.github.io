const elts = {
    text1: document.getElementById("text1"),
    text2: document.getElementById("text2")
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The strings to morph between. You can change these to anything you want!
const texts = [
    "I'm a Photographer",
    "I'm a Programmer",
    "I'm a Computer enthusiast",
    "I'm an Open source contributor",
    "I'm a Traveller",
];

// Controls the speed of morphing.
const morphTime = 0.5;
const cooldownTime = 1;

let textIndex = texts.length - 1;
let time = new Date();
let morph = 0;
let cooldown = cooldownTime;

if (prefersReducedMotion) {
    elts.text1.textContent = "Programmer · Photographer · Open source contributor";
    elts.text2.textContent = "";
    elts.text2.style.display = "none";
} else {
    elts.text1.textContent = texts[textIndex % texts.length];
    elts.text2.textContent = texts[(textIndex + 1) % texts.length];
}

function doMorph() {
    morph -= cooldown;
    cooldown = 0;

    let fraction = morph / morphTime;

    if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
    }

    setMorph(fraction);
}

// A lot of the magic happens here, this is what applies the blur filter to the text.
function setMorph(fraction) {
    // fraction = Math.cos(fraction * Math.PI) / -2 + .5;

    elts.text2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    elts.text2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

    fraction = 1 - fraction;
    elts.text1.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    elts.text1.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

    elts.text1.textContent = texts[textIndex % texts.length];
    elts.text2.textContent = texts[(textIndex + 1) % texts.length];
}

function doCooldown() {
    morph = 0;

    elts.text2.style.filter = "";
    elts.text2.style.opacity = "100%";

    elts.text1.style.filter = "";
    elts.text1.style.opacity = "0%";
}

// Animation loop, which is called every frame.
function animate() {
    requestAnimationFrame(animate);

    let newTime = new Date();
    let shouldIncrementIndex = cooldown > 0;
    let dt = (newTime - time) / 1000;
    time = newTime;

    cooldown -= dt;

    if (cooldown <= 0) {
        if (shouldIncrementIndex) {
            textIndex++;
        }

        doMorph();
    } else {
        doCooldown();
    }
}

var container = document.getElementById("container");

function fadeIn(element) {
    var op = 0.1; // initial opacity
    var timer = setInterval(function() {
        if (op >= 1) {
            clearInterval(timer);
        }
        element.style.opacity = op;
        op += op * 0.1;
    }, 10);
}

// Start the animation.
if (prefersReducedMotion) {
    if (container) {
        container.style.opacity = "1";
    }
} else {
    setTimeout(function() {
        animate();
        fadeIn(container);
    }, 1400);
}

// Wrap every letter in a span
var textWrapper = document.querySelector(".anim1");
if (textWrapper && !prefersReducedMotion) {
    textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

    if (window.anime) {
        anime.timeline({ loop: false })
            .add({
                targets: ".anim1 .letter",
                scale: [4, 1],
                opacity: [0, 1],
                translateZ: 0,
                easing: "easeOutExpo",
                duration: 950,
                delay: (el, i) => 70 * i
            });
    }
}

const projectButtons = document.querySelectorAll("#projects .card .button");

projectButtons.forEach((button) => {
    if (button.querySelector(".button__label")) {
        return;
    }

    const labelText = Array.from(button.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    if (!labelText) {
        return;
    }

    Array.from(button.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            node.remove();
        }
    });

    const label = document.createElement("span");
    label.className = "button__label";
    label.textContent = labelText;

    const extIcon = button.querySelector(".ext");

    if (extIcon) {
        button.insertBefore(label, extIcon);
    } else {
        button.appendChild(label);
    }
});

const projectsSection = document.getElementById("projects");

if (projectsSection) {
    const filterGroup = projectsSection.querySelector(".project-filter__group");
    const docsFilterGroup = projectsSection.querySelector(".project-filter__group--docs");
    const projectCards = Array.from(projectsSection.querySelectorAll(".cards .card-wrapper"));
    let hasPreparedCardsForFiltering = false;

    if (filterGroup && projectCards.length > 0) {
        const normalizeTag = (tag) => tag.trim().toLowerCase();
        const allTags = new Map();
        const tagCounts = new Map();
        const allDocTags = new Map();
        const docTagCounts = new Map();

        projectCards.forEach((card) => {
            const tagMeta = Array.from(card.querySelectorAll(".tags:not(.docs-tags) .tag"))
                .map((tagElement) => {
                    const label = tagElement.textContent.trim();
                    const iconElement = tagElement.querySelector("img");

                    if (!label) {
                        return null;
                    }

                    return {
                        label,
                        normalized: normalizeTag(label),
                        iconSrc: iconElement ? iconElement.getAttribute("src") : null
                    };
                })
                .filter(Boolean);

            const docTagMeta = Array.from(card.querySelectorAll(".docs-tags .tag"))
                .map((tagElement) => {
                    const label = tagElement.textContent.trim();

                    if (!label) {
                        return null;
                    }

                    return {
                        label,
                        normalized: normalizeTag(label)
                    };
                })
                .filter(Boolean);

            const normalizedTags = Array.from(new Set(tagMeta.map((tag) => tag.normalized)));
            const normalizedDocTags = Array.from(new Set(docTagMeta.map((tag) => tag.normalized)));

            card.dataset.tags = normalizedTags.join(",");
            card.dataset.docTags = normalizedDocTags.join(",");

            normalizedTags.forEach((normalizedTag) => {
                if (!allTags.has(normalizedTag)) {
                    const originalTag = tagMeta.find((tag) => tag.normalized === normalizedTag);

                    allTags.set(normalizedTag, {
                        label: originalTag ? originalTag.label : normalizedTag,
                        iconSrc: originalTag ? originalTag.iconSrc : null
                    });
                }

                tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
            });

            normalizedDocTags.forEach((normalizedTag) => {
                if (!allDocTags.has(normalizedTag)) {
                    const originalTag = docTagMeta.find((tag) => tag.normalized === normalizedTag);

                    allDocTags.set(normalizedTag, {
                        label: originalTag ? originalTag.label : normalizedTag
                    });
                }

                docTagCounts.set(normalizedTag, (docTagCounts.get(normalizedTag) || 0) + 1);
            });
        });

        let activeFilter = null;
        let activeDocFilter = null;

        const prepareCardsForFiltering = () => {
            if (hasPreparedCardsForFiltering) {
                return;
            }

            projectCards.forEach((card) => {
                card.removeAttribute("data-aos");
                card.classList.remove("aos-init", "aos-animate");
                card.style.opacity = "1";
                card.style.transform = "none";
            });

            if (window.AOS && typeof window.AOS.refreshHard === "function") {
                window.AOS.refreshHard();
            }

            hasPreparedCardsForFiltering = true;
        };

        const cardMatchesFilters = (card) => {
            const cardTags = card.dataset.tags ? card.dataset.tags.split(",") : [];
            const cardDocTags = card.dataset.docTags ? card.dataset.docTags.split(",") : [];
            const matchesMainFilter = !activeFilter || cardTags.includes(activeFilter);
            const matchesDocFilter = !activeDocFilter || cardDocTags.includes(activeDocFilter);

            return matchesMainFilter && matchesDocFilter;
        };

        const updateSectionVisibility = () => {
            const isFiltering = activeFilter !== null || activeDocFilter !== null;
            const sections = projectsSection.querySelectorAll(".cards-section");
            
            sections.forEach((section) => {
                const title = section.querySelector(".cards-section__title");
                const cards = Array.from(section.querySelectorAll(".card-wrapper"));
                
                // Check if any cards in this section are visible
                const hasVisibleCards = cards.some(card => !card.classList.contains("is-filtered-out"));
                
                if (isFiltering) {
                    // While filtering, hide section title
                    if (title) {
                        title.classList.add("is-hidden");
                    }
                } else {
                    // When not filtering, show section title
                    if (title) {
                        title.classList.remove("is-hidden");
                    }
                }
                
                // Hide entire section if no visible cards
                if (!hasVisibleCards && isFiltering) {
                    section.style.display = "none";
                } else {
                    section.style.display = "";
                }
            });
        };

        const applyProjectFilter = () => {
            projectCards.forEach((card) => {
                const shouldShow = cardMatchesFilters(card);
                const isHidden = card.classList.contains("is-filtered-out");

                card.setAttribute("aria-hidden", String(!shouldShow));

                if (shouldShow) {
                    if (isHidden) {
                        card.classList.remove("is-filtered-out");
                        card.classList.add("is-filter-transition");
                        requestAnimationFrame(() => {
                            card.classList.remove("is-filter-transition");
                        });
                    }

                    return;
                }

                if (isHidden) {
                    return;
                }

                card.classList.add("is-filter-transition");
                window.setTimeout(() => {
                    card.classList.add("is-filtered-out");
                    card.classList.remove("is-filter-transition");
                }, 180);
            });
            
            updateSectionVisibility();
        };

        Array.from(allTags.entries())
            .filter(([normalizedTag]) => (tagCounts.get(normalizedTag) || 0) > 1)
            .sort((a, b) => a[1].label.localeCompare(b[1].label))
            .forEach(([normalizedTag, tagData]) => {
                const label = tagData.label;
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "project-filter__chip";
                chip.setAttribute("aria-pressed", "false");

                if (tagData.iconSrc) {
                    const icon = document.createElement("img");
                    icon.className = "project-filter__chip-icon";
                    icon.src = tagData.iconSrc;
                    icon.alt = "";
                    chip.appendChild(icon);
                }

                const chipText = document.createElement("span");
                chipText.className = "project-filter__chip-text";
                chipText.textContent = label;
                chip.appendChild(chipText);

                chip.addEventListener("click", () => {
                    prepareCardsForFiltering();

                    const isAlreadyActive = activeFilter === normalizedTag;
                    activeFilter = isAlreadyActive ? null : normalizedTag;

                    filterGroup.querySelectorAll(".project-filter__chip").forEach((button) => {
                        button.classList.remove("is-active");
                        button.setAttribute("aria-pressed", "false");
                    });

                    if (!isAlreadyActive) {
                        chip.classList.add("is-active");
                        chip.setAttribute("aria-pressed", "true");
                    }

                    applyProjectFilter();
                });

                filterGroup.appendChild(chip);
            });

        if (docsFilterGroup) {
            Array.from(allDocTags.entries())
                .filter(([normalizedTag]) => (docTagCounts.get(normalizedTag) || 0) > 0)
                .sort((a, b) => a[1].label.localeCompare(b[1].label))
                .forEach(([normalizedTag, tagData]) => {
                    const chip = document.createElement("button");
                    chip.type = "button";
                    chip.className = "project-filter__chip";
                    chip.setAttribute("aria-pressed", "false");

                    const chipText = document.createElement("span");
                    chipText.className = "project-filter__chip-text";
                    chipText.textContent = tagData.label;
                    chip.appendChild(chipText);

                    chip.addEventListener("click", () => {
                        prepareCardsForFiltering();

                        const isAlreadyActive = activeDocFilter === normalizedTag;
                        activeDocFilter = isAlreadyActive ? null : normalizedTag;

                        docsFilterGroup.querySelectorAll(".project-filter__chip").forEach((button) => {
                            button.classList.remove("is-active");
                            button.setAttribute("aria-pressed", "false");
                        });

                        if (!isAlreadyActive) {
                            chip.classList.add("is-active");
                            chip.setAttribute("aria-pressed", "true");
                        }

                        applyProjectFilter();
                    });

                    docsFilterGroup.appendChild(chip);
                });
        }
    }
}

document.querySelector(".skip-link")?.addEventListener("click", () => {
    const mainEl = document.getElementById("main");
    if (mainEl) {
        requestAnimationFrame(() => mainEl.focus());
    }
});