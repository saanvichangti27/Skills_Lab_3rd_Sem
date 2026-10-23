
(() => {
  const $ = id => document.getElementById(id);

  const globeView = $("globe-view");
  const countryView = $("country-view");
  const search = $("country-search");
  const results = $("search-results");
  const rail = $("country-rail");
  const track = $("destination-track");
  const modal = $("destination-modal");

  let countries = {};
  let activeKey = "japan";
  let slideIndex = 0;
  let toastTimer;

  // Load the local country data when the page starts.
  async function boot() {
    try {
      const response = await fetch(
        window.GLOBETROTTER_DATA_URL || "destinations.json"
      );

      if (!response.ok) {
        throw new Error("Could not load local destination data");
      }

      countries = await response.json();
    } catch (error) {
      console.error(error);
      showToast(
        "Could not load destination data. Please run the project using a local web server."
      );
      return;
    }

    buildRail();

    if (window.GlobeTrotterGlobe) {
      window.GlobeTrotterGlobe.addCountries(countries);
    }

    bindUI();
    renderCountry(activeKey);
  }

  // Build the popular-country list beside the globe.
  function buildRail() {
    rail.innerHTML = Object.entries(countries)
      .map(([key, country]) => `
        <button
          class="rail-country ${key === activeKey ? "selected" : ""}"
          data-country="${key}"
        >
          <span class="flag">${country.flag}</span>
          <span>${country.name}</span>
        </button>
      `)
      .join("");

    rail.querySelectorAll("[data-country]").forEach(button => {
      button.addEventListener("click", () => {
        selectCountry(button.dataset.country);
      });
    });
  }

  // Set up all interactive controls.
  function bindUI() {
    
const countrySelect = $("featured-country-select");

if (countrySelect) {
  countrySelect.addEventListener("change", () => {
    const key = countrySelect.value;

    if (key && countries[key]) {
      selectCountry(key);
    }
  });
}

const itineraryButton = $("make-itinerary");

if (itineraryButton) {
  itineraryButton.addEventListener("click", () => {
    const key = $("featured-country-select").value || activeKey;
    const country = countries[key];

    if (!country) {
      showToast("Please select a country first.");
      return;
    }

    selectCountry(key);

    showToast(
      `Let's plan your ${country.name} journey! Explore the destinations below.`
    );
  });
}


    $("brand-home").addEventListener("click", event => {
      event.preventDefault();
      showGlobe();
    });

    $("footer-home").addEventListener("click", event => {
      event.preventDefault();
      showGlobe();
    });

    $("back-to-globe").addEventListener("click", showGlobe);
    $("footer-back").addEventListener("click", showGlobe);
    $("nav-explore").addEventListener("click", showGlobe);

    $("nav-destinations").addEventListener("click", () => {
      if (countryView.classList.contains("active-view")) {
        $("destinations-section").scrollIntoView({
          behavior: "smooth"
        });
      } else {
        showToast("Choose a country to explore its destinations.");
      }
    });

    $("nav-about").addEventListener("click", () => {
      showToast(
        "TravelTheWorld is a student-built travel discovery experience. More features are on the way."
      );
    });

    $("slide-prev").addEventListener("click", () => moveSlider(-1));
    $("slide-next").addEventListener("click", () => moveSlider(1));

    $("modal-close").addEventListener("click", closeModal);
    $("modal-done").addEventListener("click", closeModal);
    $("modal-close-backdrop").addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeModal();

      if (
        event.key === "ArrowRight" &&
        countryView.classList.contains("active-view")
      ) {
        moveSlider(1);
      }

      if (
        event.key === "ArrowLeft" &&
        countryView.classList.contains("active-view")
      ) {
        moveSlider(-1);
      }
    });

    search.addEventListener("input", () => {
      showSearchResults(search.value);
    });

    search.addEventListener("focus", () => {
      if (search.value.trim()) {
        showSearchResults(search.value);
      }
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".header-search")) {
        results.classList.remove("show");
      }
    });

    // Receive clicks on markers on the 3D globe.
    window.addEventListener("country-selected", event => {
      selectCountry(event.detail.key);
    });

    $("mobile-search-toggle").addEventListener("click", () => {
      search.focus();
    });

    // Allow users to swipe through destination cards on touchscreens.
    let touchStartX = null;

    track.addEventListener(
      "touchstart",
      event => {
        touchStartX = event.changedTouches[0].screenX;
      },
      { passive: true }
    );

    track.addEventListener(
      "touchend",
      event => {
        if (touchStartX === null) return;

        const dx = event.changedTouches[0].screenX - touchStartX;

        if (Math.abs(dx) > 45) {
          moveSlider(dx < 0 ? 1 : -1);
        }

        touchStartX = null;
      },
      { passive: true }
    );
  }

  // Search countries by name or region.
  function showSearchResults(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
      results.classList.remove("show");
      results.innerHTML = "";
      return;
    }

    const matches = Object.entries(countries).filter(([, country]) => {
      return `${country.name} ${country.region}`
        .toLowerCase()
        .includes(q);
    });

    results.innerHTML = matches.length
      ? matches
          .map(([key, country]) => `
            <button
              class="search-result"
              role="option"
              data-country="${key}"
            >
              <span class="result-flag">${country.flag}</span>
              <span>${country.name}</span>
              <span class="result-region">${country.region}</span>
            </button>
          `)
          .join("")
      : `
        <div
          class="search-result"
          style="color:#9eacba;cursor:default"
        >
          No countries found
        </div>
      `;

    results.classList.add("show");

    results.querySelectorAll("[data-country]").forEach(button => {
      button.addEventListener("click", () => {
        selectCountry(button.dataset.country);
        search.value = "";
        results.classList.remove("show");
      });
    });
  }

  // Open the landing page for the selected country.
  function selectCountry(key) {
    if (!countries[key]) return;

    activeKey = key;

    rail.querySelectorAll(".rail-country").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.country === key
      );
    });

    renderCountry(key);

    globeView.classList.remove("active-view");
    countryView.classList.add("active-view");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    $("nav-explore").classList.remove("active");
    $("nav-destinations").classList.add("active");
  }

  // Return to the interactive globe.
  function showGlobe() {
    countryView.classList.remove("active-view");
    globeView.classList.add("active-view");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    $("nav-destinations").classList.remove("active");
    $("nav-explore").classList.add("active");
  }

  // Update the country hero and its destination cards.
  function renderCountry(key) {
    const country = countries[key];
    const countryNumber = Object.keys(countries).indexOf(key) + 1;

    $("country-name").textContent = country.name;

    $("country-region").textContent =
      `${country.region.toUpperCase()} / ${String(countryNumber).padStart(2, "0")}`;

    $("country-tagline").textContent = country.tagline;
    $("country-description").textContent = country.description;

    $("country-hero").style.backgroundImage =
      `url("${country.hero}")`;

    $("discover-country").textContent = country.name;

    $("hero-index").textContent =
      `DESTINATION ${String(countryNumber).padStart(2, "0")}`;

    const facts = [
      ["⌖", "Capital", country.capital],
      ["ⓢ", "Currency", country.currency],
      ["◎", "Language", country.language]
    ];

    $("country-facts").innerHTML = facts
      .map(([icon, label, value]) => `
        <div class="fact">
          <span class="fact-icon">${icon}</span>
          <span>
            <strong>${label}</strong>
            ${value}
          </span>
        </div>
      `)
      .join("");

    // Create the destination cards for this country.
    track.innerHTML = country.destinations
      .map((destination, index) => `
        <article
          class="destination-card"
          tabindex="0"
          role="button"
          data-index="${index}"
          aria-label="Learn more about ${destination.name}"
        >
          <img
            src="${destination.image}"
            alt="${destination.name}"
            loading="${index > 1 ? "lazy" : "eager"}"
            onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(145deg,#17334a,#07111d)'"
          >

          <span class="card-number">
            ${String(index + 1).padStart(2, "0")} /
            ${String(country.destinations.length).padStart(2, "0")}
          </span>

          <span class="card-arrow">↗</span>

          <div class="card-copy">
            <h3>${destination.name}</h3>
            <p class="card-subtitle">${destination.subtitle}</p>
            <p class="card-description">${destination.description}</p>
          </div>
        </article>
      `)
      .join("");

    // Make each card open its destination details.
    track.querySelectorAll(".destination-card").forEach(card => {
      const open = () => {
        const destination =
          country.destinations[Number(card.dataset.index)];

        openModal(country, destination);
      };

      card.addEventListener("click", open);

      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });

    slideIndex = 0;
    updateSlider();
  }

  // Move the destination gallery left or right.
  function moveSlider(direction) {
    const cards = track.querySelectorAll(".destination-card");

    if (!cards.length) return;

    const cardWidth =
      cards[0].getBoundingClientRect().width +
      parseFloat(getComputedStyle(track).gap || 18);

    const maxIndex = Math.max(
      0,
      cards.length - visibleCards()
    );

    slideIndex = Math.max(
      0,
      Math.min(maxIndex, slideIndex + direction)
    );

    track.style.transform =
      `translateX(${-slideIndex * cardWidth}px)`;

    updateProgress();
  }

  // Estimate how many cards fit across the current screen.
  function visibleCards() {
    if (window.innerWidth <= 760) return 1;
    if (window.innerWidth <= 1100) return 2;
    return 3;
  }

  function updateSlider() {
    track.style.transform = "translateX(0)";
    updateProgress();
  }

  function updateProgress() {
    const country = countries[activeKey];
    if (!country) return;

    const total = country.destinations.length;
    const shown = Math.min(
      total,
      slideIndex + visibleCards()
    );

    $("gallery-count").textContent =
      `${String(Math.min(total, slideIndex + 1)).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

    $("progress-fill").style.width =
      `${(shown / total) * 100}%`;
  }

  // Fill in and display the destination details popup.
  function openModal(country, destination) {
    $("modal-country").textContent =
      `${country.name.toUpperCase()} / DESTINATION`;

    $("modal-title").textContent = destination.name;
    $("modal-description").textContent = destination.description;

    $("modal-image").style.backgroundImage =
      `url("${destination.image}")`;

    $("modal-meta").innerHTML = `
      <span>
        ✧ Best time<br>
        <strong>${destination.best}</strong>
      </span>
      <span>
        ◷ Suggested stay<br>
        <strong>${destination.duration}</strong>
      </span>
    `;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    $("modal-close").focus();
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Display small notifications at the bottom of the screen.
  function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // Reset the slider when the browser is resized.
  window.addEventListener("resize", () => {
    slideIndex = 0;
    updateSlider();
  });

  boot();
})();
