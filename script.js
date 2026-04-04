const elts = {
    text1: document.getElementById("text1"),
    text2: document.getElementById("text2")
};

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

elts.text1.textContent = texts[textIndex % texts.length];
elts.text2.textContent = texts[(textIndex + 1) % texts.length];

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

var container = document.getElementById('container');
console.log(container);

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
setTimeout(function() {
    animate();
    fadeIn(container);
}, 1400);


// Wrap every letter in a span
var textWrapper = document.querySelector('.anim1');
if (textWrapper) {
    textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

    if (window.anime) {
        anime.timeline({ loop: false })
            .add({
                targets: '.anim1 .letter',
                scale: [4, 1],
                opacity: [0, 1],
                translateZ: 0,
                easing: "easeOutExpo",
                duration: 950,
                delay: (el, i) => 70 * i
            });
    }
}

const projectsSection = document.getElementById("projects");

if (projectsSection) {
    const filterGroup = projectsSection.querySelector(".project-filter__group");
    const projectCards = Array.from(projectsSection.querySelectorAll(".cards .card-wrapper"));
    let hasPreparedCardsForFiltering = false;

    if (filterGroup && projectCards.length > 0) {
        const normalizeTag = (tag) => tag.trim().toLowerCase();
        const allTags = new Map();
        const tagCounts = new Map();

        projectCards.forEach((card) => {
            const tagMeta = Array.from(card.querySelectorAll(".tag"))
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
            card.dataset.tags = normalizedTags.join(",");

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
        });

        let activeFilter = null;

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

        const applyProjectFilter = () => {
            projectCards.forEach((card) => {
                const cardTags = card.dataset.tags ? card.dataset.tags.split(",") : [];
                const shouldShow = !activeFilter || cardTags.includes(activeFilter);
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
    }
}