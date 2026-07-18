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
    morphRafId = requestAnimationFrame(animate);

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
    // Opacity transition is handled by CSS (#container in main.css)
    element.style.opacity = "1";
}

// Start the animation, pausing the rAF loop while the hero is off-screen.
let morphRafId = null;
let morphRunning = false;
let morphStarted = false;
let heroVisible = true;

function startMorph() {
    if (morphRunning) return;
    morphRunning = true;
    time = new Date(); // reset the clock so dt doesn't jump after a pause
    morphRafId = requestAnimationFrame(animate);
}

function stopMorph() {
    if (!morphRunning) return;
    morphRunning = false;
    cancelAnimationFrame(morphRafId);
}

if (prefersReducedMotion) {
    if (container) {
        container.style.opacity = "1";
    }
} else {
    const heroEl = document.querySelector(".hero");
    if (heroEl && "IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
            heroVisible = entries[0].isIntersecting;
            if (!morphStarted) return;
            if (heroVisible) {
                startMorph();
            } else {
                stopMorph();
            }
        }).observe(heroEl);
    }

    setTimeout(function() {
        morphStarted = true;
        if (heroVisible) {
            startMorph();
        }
        fadeIn(container);
    }, 1400);
}

var textWrapper = document.querySelector(".anim1");
if (textWrapper && !prefersReducedMotion) {
    const originalHTML = textWrapper.innerHTML;

    // Disable background gradient on parent during animation to prevent ghost outlines
    textWrapper.style.background = "none";
    textWrapper.style.webkitTextFillColor = "initial";

    const words = textWrapper.textContent.trim().split(/\s+/);
    textWrapper.innerHTML = words
        .map(word => {
            const letters = word.split("")
                .map(char => `<span class="letter">${char}</span>`)
                .join("");
            return `<span class="word">${letters}</span>`;
        })
        .join(" ");

    const letters = textWrapper.querySelectorAll(".letter");
    const parentRect = textWrapper.getBoundingClientRect();
    const totalWidth = parentRect.width;

    // Get the exact elapsed time since page load to synchronize animation clocks
    const timeElapsed = performance.now() / 1000;

    letters.forEach(letter => {
        const letterRect = letter.getBoundingClientRect();
        const letterOffset = letterRect.left - parentRect.left;

        letter.style.setProperty('--x-offset', `${letterOffset}px`);
        letter.style.setProperty('--parent-width', `${totalWidth}px`);
        letter.style.backgroundSize = `${2 * totalWidth}px auto`;
        letter.style.animationDelay = `${-timeElapsed}s`; // Phase-lock the animation clock!
    });

    // Trigger staggered transitions for each letter
    letters.forEach((letter, index) => {
        setTimeout(() => {
            letter.classList.add("animated");
        }, 150 + index * 45);
    });

    // Restore original HTML after transitions end to clean up the DOM and activate gradient shimmer
    const totalDuration = 150 + letters.length * 45 + 800 + 100;
    setTimeout(() => {
        textWrapper.innerHTML = originalHTML;
        textWrapper.style.background = ""; // Restore background gradient
        textWrapper.style.webkitTextFillColor = "";
    }, totalDuration);
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
                        label: originalTag ? originalTag.label : normalizedTag,
                        iconSrc: originalTag ? originalTag.iconSrc : null
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
            const matchesMainFilter = !activeFilter || activeFilter.some((t) => cardTags.includes(t));
            const matchesDocFilter = !activeDocFilter || cardDocTags.includes(activeDocFilter);

            return matchesMainFilter && matchesDocFilter;
        };

        const updateSectionVisibility = () => {
            const isFiltering = activeFilter !== null || activeDocFilter !== null;
            projectsSection.classList.toggle("is-filtering", isFiltering);
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

        const FILTER_CHIPS = [
            { label: "Python", tags: ["python"], iconSrc: "icons/python.svg" },
            { label: "JavaScript/TypeScript", tags: ["javascript", "typescript"], iconSrc: "icons/javascript.svg" },
            { label: "CLI/TUI/Terminal", tags: ["cli", "tui", "terminal"], iconSrc: "icons/terminal.svg" },
            { label: "Extension/Plugin", tags: ["extension", "plugin", "vscode"], iconSrc: "icons/extension.svg" },
            { label: "Bot/Discord", tags: ["bot", "discord"], iconSrc: "icons/discord.svg" },
            { label: "Web", tags: ["web"], iconSrc: "icons/web.svg?v=2" },
            { label: "APIs", tags: ["apis", "api"], iconSrc: "icons/json.svg" }
        ];

        FILTER_CHIPS.forEach((chipData) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "project-filter__chip";
            chip.setAttribute("aria-pressed", "false");

            if (chipData.iconSrc) {
                const icon = document.createElement("img");
                icon.className = "project-filter__chip-icon";
                icon.src = chipData.iconSrc;
                icon.alt = "";
                chip.appendChild(icon);
            }

            const chipText = document.createElement("span");
            chipText.className = "project-filter__chip-text";
            chipText.textContent = chipData.label;
            chip.appendChild(chipText);

            chip.addEventListener("click", () => {
                prepareCardsForFiltering();

                const isAlreadyActive = activeFilter === chipData.tags;
                activeFilter = isAlreadyActive ? null : chipData.tags;

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
                .filter(([normalizedTag]) => (docTagCounts.get(normalizedTag) || 0) > 0 && normalizedTag !== "furo")
                .sort((a, b) => a[1].label.localeCompare(b[1].label))
                .forEach(([normalizedTag, tagData]) => {
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

// Collapsible Other Projects Section
const otherProjectsToggle = document.querySelector(".other-projects-toggle");
const otherProjectsWrapper = document.getElementById("other-projects-wrapper");

if (otherProjectsToggle && otherProjectsWrapper) {
    otherProjectsToggle.addEventListener("click", () => {
        const isExpanded = otherProjectsToggle.getAttribute("aria-expanded") === "true";
        const newExpandedState = !isExpanded;

        otherProjectsToggle.setAttribute("aria-expanded", String(newExpandedState));
        otherProjectsWrapper.classList.toggle("is-collapsed", !newExpandedState);

        // Refresh AOS when expanding so animation coordinates are calculated correctly
        if (newExpandedState && window.AOS && typeof window.AOS.refresh === "function") {
            requestAnimationFrame(() => {
                window.AOS.refresh();
            });
        }
    });
}

// Testimonials Carousel Slider
const testimonialsSlider = document.querySelector(".testimonials-slider");
const testimonialsDotsContainer = document.querySelector(".testimonials-dots");
const testimonialsPrevBtn = document.querySelector(".testimonials-arrow--prev");
const testimonialsNextBtn = document.querySelector(".testimonials-arrow--next");

if (testimonialsSlider && testimonialsDotsContainer) {
    const getCardsPerViewport = () => {
        const card = testimonialsSlider.querySelector(".testimonial-card");
        if (!card) return 1;
        const sliderWidth = testimonialsSlider.clientWidth;
        return Math.max(1, Math.round(sliderWidth / card.offsetWidth));
    };

    const setupDots = () => {
        // Clear previous dots
        testimonialsDotsContainer.innerHTML = "";

        const totalCards = testimonialsSlider.querySelectorAll(".testimonial-card").length;
        const cardsPerViewport = getCardsPerViewport();
        const totalPages = Math.ceil(totalCards / cardsPerViewport);

        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "testimonials-dot";
            if (i === 0) dot.classList.add("is-active");
            dot.setAttribute("role", "tab");
            dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
            dot.setAttribute("aria-label", `Go to page ${i + 1}`);

            dot.addEventListener("click", () => {
                const sliderWidth = testimonialsSlider.clientWidth;
                testimonialsSlider.scrollTo({
                    left: i * sliderWidth,
                    behavior: "smooth"
                });
            });

            testimonialsDotsContainer.appendChild(dot);
        }
    };

    const updateActiveDot = () => {
        const sliderWidth = testimonialsSlider.clientWidth;
        if (sliderWidth <= 0) return;

        const maxScroll = testimonialsSlider.scrollWidth - sliderWidth;
        const isAtEnd = testimonialsSlider.scrollLeft >= maxScroll - 10;
        const dots = testimonialsDotsContainer.querySelectorAll(".testimonials-dot");

        const pageIndex = isAtEnd && dots.length > 0
            ? dots.length - 1
            : Math.round(testimonialsSlider.scrollLeft / sliderWidth);

        dots.forEach((dot, idx) => {
            if (idx === pageIndex) {
                dot.classList.add("is-active");
                dot.setAttribute("aria-selected", "true");
            } else {
                dot.classList.remove("is-active");
                dot.setAttribute("aria-selected", "false");
            }
        });

        // Toggle state of prev/next buttons
        if (testimonialsPrevBtn) {
            testimonialsPrevBtn.disabled = testimonialsSlider.scrollLeft <= 5;
        }
        if (testimonialsNextBtn) {
            testimonialsNextBtn.disabled = isAtEnd;
        }
    };

    // Listen to scroll events to update indicators dynamically
    let scrollTimeout;
    testimonialsSlider.addEventListener("scroll", () => {
        window.cancelAnimationFrame(scrollTimeout);
        scrollTimeout = window.requestAnimationFrame(updateActiveDot);
    });

    // Arrow navigation
    if (testimonialsPrevBtn) {
        testimonialsPrevBtn.addEventListener("click", () => {
            const sliderWidth = testimonialsSlider.clientWidth;
            testimonialsSlider.scrollBy({
                left: -sliderWidth,
                behavior: "smooth"
            });
        });
    }

    if (testimonialsNextBtn) {
        testimonialsNextBtn.addEventListener("click", () => {
            const sliderWidth = testimonialsSlider.clientWidth;
            testimonialsSlider.scrollBy({
                left: sliderWidth,
                behavior: "smooth"
            });
        });
    }

    // Recalculate dots and page index on window resize (debounced)
    let resizeTimeout;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
            setupDots();
            updateActiveDot();
        }, 150);
    });

    // Autoplay: advance one page every few seconds, wrapping back to the start
    const AUTOPLAY_INTERVAL = 5000;
    const testimonialsContainer = testimonialsSlider.closest(".testimonials-container");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let autoplayTimer = null;
    let autoplayPaused = false;
    let sliderInView = false;

    const advanceSlider = () => {
        const sliderWidth = testimonialsSlider.clientWidth;
        const maxScroll = testimonialsSlider.scrollWidth - sliderWidth;
        if (testimonialsSlider.scrollLeft >= maxScroll - 10) {
            // Wrap around to the first page
            testimonialsSlider.scrollTo({ left: 0, behavior: "smooth" });
        } else {
            testimonialsSlider.scrollBy({ left: sliderWidth, behavior: "smooth" });
        }
    };

    const stopAutoplay = () => {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
    };

    const startAutoplay = () => {
        if (autoplayTimer || autoplayPaused || !sliderInView || reducedMotionQuery.matches) return;
        autoplayTimer = window.setInterval(() => {
            if (!document.hidden) advanceSlider();
        }, AUTOPLAY_INTERVAL);
    };

    const pauseAutoplay = () => {
        autoplayPaused = true;
        stopAutoplay();
    };

    const resumeAutoplay = () => {
        autoplayPaused = false;
        startAutoplay();
    };

    // Pause while the user is hovering, touching, or has focus inside the carousel
    testimonialsContainer.addEventListener("pointerenter", pauseAutoplay);
    testimonialsContainer.addEventListener("pointerleave", resumeAutoplay);
    testimonialsContainer.addEventListener("focusin", pauseAutoplay);
    testimonialsContainer.addEventListener("focusout", (e) => {
        if (!testimonialsContainer.contains(e.relatedTarget)) resumeAutoplay();
    });
    testimonialsSlider.addEventListener("touchstart", pauseAutoplay, { passive: true });
    testimonialsSlider.addEventListener("touchend", resumeAutoplay, { passive: true });

    // Only run while the carousel is actually on screen
    const autoplayObserver = new IntersectionObserver(([entry]) => {
        sliderInView = entry.isIntersecting;
        if (sliderInView) {
            startAutoplay();
        } else {
            stopAutoplay();
        }
    }, { threshold: 0.3 });
    autoplayObserver.observe(testimonialsSlider);

    reducedMotionQuery.addEventListener("change", () => {
        if (reducedMotionQuery.matches) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    // Initial setup
    setupDots();
    updateActiveDot();
}
/* ==========================================================================
   Impact Section — animated count-up
   ========================================================================== */
const impactCounters = document.querySelectorAll(".impact-counter");

if (impactCounters.length > 0) {
    const impactReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const formatCounterValue = (counter, value) => {
        const formatted =
            counter.dataset.format === "comma"
                ? Math.round(value).toLocaleString("en-US")
                : String(Math.round(value));
        return formatted + (counter.dataset.suffix || "");
    };

    const runCountUp = (counter) => {
        const target = parseFloat(counter.dataset.target);
        const card = counter.closest(".impact-card");

        if (impactReducedMotion.matches || !Number.isFinite(target)) {
            counter.textContent = formatCounterValue(counter, target);
            if (card) card.classList.add("is-counted");
            return;
        }

        const duration = 2000;
        let startTime = null;

        const tick = (timestamp) => {
            if (startTime === null) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // easeOutExpo — fast start, satisfying settle on the final digits
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            counter.textContent = formatCounterValue(counter, target * eased);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else if (card) {
                card.classList.add("is-counted");
            }
        };

        requestAnimationFrame(tick);
    };

    if ("IntersectionObserver" in window) {
        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    runCountUp(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        impactCounters.forEach((counter) => counterObserver.observe(counter));
    } else {
        impactCounters.forEach(runCountUp);
    }
}

/* ==========================================================================
   Journey Section — timeline fill + floating date cursor that snaps to cards
   ========================================================================== */
const journeyContainer = document.querySelector(".journey-container");
const journeyProgress = document.querySelector(".journey-line__progress");
const journeyCursor = document.querySelector(".journey-cursor");
const journeyCursorLabel = document.querySelector(".journey-cursor__label");

if (journeyContainer && journeyProgress) {
    const journeyReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const SNAP_RADIUS = 34;

    // Month index since year 0 for a data-when value ("2022-03" or "today")
    const whenToMonths = (when) => {
        if (when === "today") {
            const now = new Date();
            return now.getFullYear() * 12 + now.getMonth();
        }
        const [y, m] = when.split("-").map(Number);
        return y * 12 + (m - 1);
    };

    const monthsToLabel = (months) => {
        const y = Math.floor(months / 12);
        return `${MONTHS[((months % 12) + 12) % 12]} ${y}`;
    };

    // Node positions are read from layout offsets (not bounding rects), so
    // AOS transforms mid-animation don't disturb them.
    const journeyNodes = [...journeyContainer.querySelectorAll(".journey-item")].map((li) => {
        const marker = li.querySelector(".journey-item__marker");
        const dateText = li.querySelector(".journey-item__date");
        return {
            li,
            marker,
            months: whenToMonths(li.dataset.when || "today"),
            label: dateText ? dateText.textContent.trim() : "",
        };
    });

    const nodeY = (node) => node.li.offsetTop + node.marker.offsetTop + node.marker.offsetHeight / 2;

    let cursorY = null;
    let cursorRafActive = false;
    let lastLabel = "";
    let lastMonths = null;

    // Split "Aug 2024" / "August 2024" / "Late 2023" into (front, year) so
    // the year only animates when it actually changes.
    const splitLabel = (text) => {
        const match = text.match(/^(.*?)\s*(\d{4})$/);
        return match ? [match[1], match[2]] : [text, ""];
    };

    const tick = (el, goingForward) => {
        el.classList.remove("tick-up", "tick-down");
        void el.offsetWidth; // restart the animation
        el.classList.add(goingForward ? "tick-up" : "tick-down");
    };

    // Paced changes animate in the same frame the text is set, so the new
    // month is REVEALED by the animation (starts at opacity 0) instead of
    // popping in first. Rapid successive changes (fast scrolling) swap the
    // text silently and never replay an animation afterwards. Pure format
    // swaps at snap boundaries ("Jan 2022" <-> "January 2022") never animate.
    const RAPID_MS = 250;
    let lastChangeAt = 0;

    const setCursorLabel = (text, months) => {
        if (text === lastLabel) return;
        const prevMonths = lastMonths;
        const [front, year] = splitLabel(text);
        lastLabel = text;
        lastMonths = months;

        let monthEl = journeyCursorLabel.querySelector(".journey-cursor__month");
        let yearEl = journeyCursorLabel.querySelector(".journey-cursor__year");
        let firstRender = false;
        if (!monthEl) {
            journeyCursorLabel.textContent = "";
            monthEl = document.createElement("span");
            monthEl.className = "journey-cursor__month";
            yearEl = document.createElement("span");
            yearEl.className = "journey-cursor__year";
            journeyCursorLabel.append(monthEl, yearEl);
            firstRender = true;
        }

        monthEl.textContent = front;
        yearEl.textContent = year ? `\u00a0${year}` : "";

        const now = performance.now();
        const rapid = now - lastChangeAt < RAPID_MS;
        lastChangeAt = now;

        if (firstRender || rapid || prevMonths === null || months === prevMonths) return;

        const goingForward = months > prevMonths;
        tick(monthEl, goingForward);
        if (Math.floor(months / 12) !== Math.floor(prevMonths / 12)) {
            tick(yearEl, goingForward);
        }
    };

    const updateCursor = (tipY, containerVisible) => {
        if (!journeyCursor || !journeyCursorLabel) return;

        const firstY = nodeY(journeyNodes[0]);
        const lastY = nodeY(journeyNodes[journeyNodes.length - 1]);
        const visible = containerVisible && tipY >= firstY - SNAP_RADIUS && tipY <= lastY + SNAP_RADIUS;
        journeyCursor.classList.toggle("is-visible", visible);
        if (!visible) return;

        const clampedTip = Math.max(firstY, Math.min(lastY, tipY));

        // Segment the tip falls in
        let a = journeyNodes[0];
        let b = journeyNodes[journeyNodes.length - 1];
        for (let i = 0; i < journeyNodes.length - 1; i++) {
            if (clampedTip >= nodeY(journeyNodes[i]) && clampedTip <= nodeY(journeyNodes[i + 1])) {
                a = journeyNodes[i];
                b = journeyNodes[i + 1];
                break;
            }
        }

        // Magnetic snap to the nearest marker
        let targetY = clampedTip;
        let snapped = null;
        const distA = Math.abs(clampedTip - nodeY(a));
        const distB = Math.abs(clampedTip - nodeY(b));
        if (Math.min(distA, distB) <= SNAP_RADIUS) {
            snapped = distA <= distB ? a : b;
            targetY = nodeY(snapped);
        }
        journeyCursor.classList.toggle("is-snapped", snapped !== null);

        if (snapped !== null) {
            setCursorLabel(snapped.label, snapped.months);
        } else {
            const yA = nodeY(a);
            const yB = nodeY(b);
            const frac = yB > yA ? (clampedTip - yA) / (yB - yA) : 0;
            const months = Math.round(a.months + frac * (b.months - a.months));
            setCursorLabel(monthsToLabel(months), months);
        }

        // Ease toward the target for a soft, springy follow
        if (cursorY === null) cursorY = targetY;
        cursorY += (targetY - cursorY) * 0.22;
        journeyCursor.style.top = `${cursorY}px`;

        // Keep animating until settled
        if (Math.abs(targetY - cursorY) > 0.4 && !cursorRafActive) {
            cursorRafActive = true;
            requestAnimationFrame(() => {
                cursorRafActive = false;
                updateJourneyProgress();
            });
        }
    };

    let journeyTicking = false;

    const updateJourneyProgress = () => {
        journeyTicking = false;
        const rect = journeyContainer.getBoundingClientRect();
        const containerVisible = rect.bottom > 0 && rect.top < window.innerHeight;

        if (journeyReducedMotion.matches) {
            journeyProgress.style.height = "100%";
            if (journeyCursor) journeyCursor.classList.remove("is-visible");
            return;
        }

        // Fill relative to how far the container has passed a line ~2/3 down
        // the viewport, so the fill keeps pace with the cards animating in.
        const fillLine = window.innerHeight * 0.66;
        const progress = (fillLine - rect.top) / rect.height;
        const clamped = Math.max(0, Math.min(1, progress));
        journeyProgress.style.height = `${clamped * 100}%`;

        updateCursor(clamped * journeyContainer.offsetHeight, containerVisible);
    };

    const requestJourneyUpdate = () => {
        if (!journeyTicking) {
            journeyTicking = true;
            requestAnimationFrame(updateJourneyProgress);
        }
    };

    window.addEventListener("scroll", requestJourneyUpdate, { passive: true });
    window.addEventListener("resize", requestJourneyUpdate, { passive: true });
    updateJourneyProgress();
}

/* ==========================================================================
   Site Navigation — hidden over the hero. Every reveal (section change,
   scrolling up, hero exit, top-edge hover) shows the nav and re-arms a
   linger timer; it retracts once the timer expires with no new activity.
   ========================================================================== */
const siteNav = document.querySelector(".site-nav");

if (siteNav && "IntersectionObserver" in window) {
    const NAV_LINGER = 1800;
    const SCROLL_DELTA = 6;
    const HOVER_ZONE_PX = 80;

    const navList = siteNav.querySelector(".site-nav__list");
    const navLinks = new Map(
        [...siteNav.querySelectorAll(".site-nav__link")].map((link) => [
            link.getAttribute("href").slice(1),
            link,
        ])
    );
    const navSections = [...navLinks.keys()]
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    let heroInView = true;
    let hideTimer = null;
    let activeSectionId = null;
    let lastScrollY = window.scrollY;
    let navScrollTicking = false;

    const navHasAttention = () =>
        siteNav.matches(":hover") || siteNav.contains(document.activeElement);

    const hideNav = () => {
        if (!navHasAttention()) {
            siteNav.classList.remove("is-visible");
        }
    };

    const clearHideTimer = () => {
        window.clearTimeout(hideTimer);
        hideTimer = null;
    };

    // Show now; retract NAV_LINGER after the most recent reveal request
    const revealNav = () => {
        if (heroInView) return;
        siteNav.classList.add("is-visible");
        clearHideTimer();
        hideTimer = window.setTimeout(() => {
            hideTimer = null;
            hideNav();
        }, NAV_LINGER);
    };

    // Hidden over the hero; announces itself as soon as the hero scrolls away
    const navHero = document.querySelector(".hero");
    if (navHero) {
        new IntersectionObserver((entries) => {
            heroInView = entries[entries.length - 1].isIntersecting;
            if (heroInView) {
                clearHideTimer();
                siteNav.classList.remove("is-visible");
            } else {
                revealNav();
            }
        }).observe(navHero);
    }

    // Scrolling up keeps the nav on screen (each event re-arms the timer)
    window.addEventListener("scroll", () => {
        if (navScrollTicking) return;
        navScrollTicking = true;
        requestAnimationFrame(() => {
            navScrollTicking = false;
            const y = window.scrollY;
            const delta = y - lastScrollY;
            lastScrollY = y;
            if (!heroInView && delta < -SCROLL_DELTA) {
                revealNav();
            }
        });
    }, { passive: true });

    // Moving the pointer to the top edge summons the nav
    window.addEventListener("mousemove", (e) => {
        if (!heroInView && e.clientY <= HOVER_ZONE_PX) {
            revealNav();
        }
    }, { passive: true });

    // Keep the active pill in view when the list overflows (mobile)
    const centerActiveLink = (link) => {
        navList.scrollTo({
            left: link.offsetLeft - (navList.clientWidth - link.offsetWidth) / 2,
            behavior: prefersReducedMotion ? "auto" : "smooth",
        });
    };

    // Scroll-spy: highlight the active section, reveal on change
    const navSpyObserver = new IntersectionObserver((entries) => {
        let changed = false;

        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.target.id !== activeSectionId) {
                activeSectionId = entry.target.id;
                changed = true;
            }
        });

        if (!changed) return;

        navLinks.forEach((link, id) => {
            const isActive = id === activeSectionId;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        const activeLink = navLinks.get(activeSectionId);
        if (activeLink) centerActiveLink(activeLink);

        revealNav();
    }, { rootMargin: "-35% 0px -55% 0px" });

    navSections.forEach((section) => navSpyObserver.observe(section));

    // Retract when pointer/focus leaves after the linger timer already expired
    siteNav.addEventListener("pointerleave", () => {
        if (!hideTimer && !heroInView) hideNav();
    });
    siteNav.addEventListener("focusout", (e) => {
        if (siteNav.contains(e.relatedTarget)) return;
        if (!hideTimer && !heroInView) {
            siteNav.classList.remove("is-visible");
        }
    });
}
