const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const faqItems = document.querySelectorAll(".faq-list details");
const contactForm = document.querySelector(".contact-form");
const LEAD_SUBMITTED_KEY = "avodahLeadSubmitted";
const BOOKING_LEAD_KEY = "avodahBookingLeadId";
const ATTRIBUTION_STORAGE_KEY = "avodahAttribution";
const ATTRIBUTION_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_id",
  "adset_id",
  "ad_id",
  "fbclid",
  "landing_page",
  "referrer",
];

const sanitizeAttributionUrl = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin + url.pathname;
  } catch {
    return "";
  }
};

const readAttribution = () => {
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const captureAttribution = () => {
  const attribution = readAttribution();
  const params = new URLSearchParams(window.location.search);

  ATTRIBUTION_FIELDS.slice(0, 9).forEach((field) => {
    const value = params.get(field);
    if (value) attribution[field] = value.slice(0, 500);
  });

  if (!attribution.landing_page) {
    attribution.landing_page = window.location.origin + window.location.pathname;
  }
  if (!attribution.referrer && document.referrer) {
    attribution.referrer = sanitizeAttributionUrl(document.referrer);
  }

  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Some strict privacy settings can block browser storage.
  }

  return attribution;
};

const decorateNeedsCheckLinks = (attribution) => {
  document.querySelectorAll('a[href^="/needs-check"]').forEach((link) => {
    const target = new URL(link.href, window.location.origin);
    ATTRIBUTION_FIELDS.forEach((field) => {
      if (attribution[field] && !target.searchParams.has(field)) {
        target.searchParams.set(field, attribution[field]);
      }
    });
    link.href = target.pathname + target.search;
  });
};


const populateLeadTrackingFields = (form, attribution) => {
  if (!form) return;

  ATTRIBUTION_FIELDS.forEach((field) => {
    const input = form.querySelector(`input[name="${field}"]`);
    if (input) input.value = attribution[field] || "";
  });

  const sourcePage = form.querySelector('input[name="source_page"]');
  if (sourcePage) sourcePage.value = window.location.pathname;
};

const avodahAttribution = captureAttribution();
decorateNeedsCheckLinks(avodahAttribution);
populateLeadTrackingFields(contactForm, avodahAttribution);


const createLeadSubmissionId = () => {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

const rememberLeadSubmission = (leadId) => {
  try {
    sessionStorage.setItem(LEAD_SUBMITTED_KEY, leadId);
    sessionStorage.setItem(BOOKING_LEAD_KEY, leadId);
  } catch {
    // Some strict privacy settings can block browser storage.
  }
  return leadId;
};

const getPendingLeadSubmission = () => {
  try {
    return sessionStorage.getItem(LEAD_SUBMITTED_KEY);
  } catch {
    return null;
  }
};

const clearPendingLeadSubmission = () => {
  try {
    sessionStorage.removeItem(LEAD_SUBMITTED_KEY);
  } catch {
    // Some strict privacy settings can block browser storage.
  }
};

const trackLeadEvent = (leadId) => {
  if (!leadId) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      send_to: "G-HV9X54P7NT",
      event_category: "consultation",
      event_label: "website_contact_form",
      lead_submission_id: leadId,
      transport_type: "beacon",
    });
  }

  clearPendingLeadSubmission();
};

const trackPendingLeadSubmission = () => {
  const leadId = getPendingLeadSubmission();
  if (leadId) {
    trackLeadEvent(leadId);
  }
};

const isThankYouPage = () => {
  const normalizedPath = window.location.pathname.replace(/\/$/, "");
  return normalizedPath === "/thank-you" || normalizedPath === "/thank-you.html";
};

if (isThankYouPage()) {
  trackPendingLeadSubmission();
}

if (header && menuToggle && nav) {
  const closeMenu = () => {
    header.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("is-open") && !header.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 901px)").matches) {
      closeMenu();
    }
  });
}

faqItems.forEach((details, index) => {
  const summary = details.querySelector("summary");
  const contentNodes = [...details.childNodes].filter((node) => node !== summary);
  const answer = document.createElement("div");

  answer.className = "faq-answer";
  answer.id = `faq-answer-${index + 1}`;
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-controls", answer.id);

  contentNodes.forEach((node) => answer.appendChild(node));
  details.appendChild(answer);

  const setExpanded = (expanded) => {
    summary.setAttribute("aria-expanded", String(expanded));
    details.classList.toggle("is-open", expanded);
  };

  setExpanded(details.open);
  answer.style.maxHeight = details.open ? `${answer.scrollHeight}px` : "0px";

  summary.addEventListener("click", (event) => {
    event.preventDefault();

    if (details.open) {
      answer.style.maxHeight = `${answer.scrollHeight}px`;
      requestAnimationFrame(() => {
        setExpanded(false);
        answer.style.maxHeight = "0px";
      });

      answer.addEventListener(
        "transitionend",
        () => {
          if (!details.classList.contains("is-open")) {
            details.open = false;
          }
        },
        { once: true }
      );
    } else {
      details.open = true;
      answer.style.maxHeight = "0px";
      requestAnimationFrame(() => {
        setExpanded(true);
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      });
    }
  });
});

window.addEventListener("resize", () => {
  faqItems.forEach((details) => {
    const answer = details.querySelector(".faq-answer");
    if (details.open && answer) {
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    }
  });
});

if (contactForm) {
  const status = contactForm.querySelector(".form-status");
  const fields = [...contactForm.querySelectorAll("input, select, textarea")].filter(
    (field) => field.type !== "hidden" && field.name !== "bot-field"
  );
  const honeypot = contactForm.querySelector('input[name="bot-field"]');
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const originalSubmitText = submitButton?.textContent || "Submit Consultation Request";

  const showStatus = (message, type) => {
    if (!status) return;
    status.textContent = message;
    status.className = `form-status is-visible is-${type}`;
  };

  const clearStatus = () => {
    if (!status) return;
    status.textContent = "";
    status.className = "form-status";
  };

  const setFieldState = (field, message = "") => {
    const error = field.closest("label")?.querySelector(".field-error");
    const isInvalid = Boolean(message);
    const hasValue = field.type === "checkbox" ? field.checked : Boolean(field.value.trim());

    field.classList.toggle("is-invalid", isInvalid);
    field.classList.toggle("is-valid", !isInvalid && hasValue);
    field.setAttribute("aria-invalid", String(isInvalid));

    if (error) {
      error.textContent = message;
    }
  };

  const validateField = (field) => {
    const value = field.type === "checkbox" ? field.checked : field.value.trim();
    let message = "";

    if (field.required && !value) {
      message = field.dataset.error || "This field is required.";
    } else if (field.type === "email" && value && !field.validity.valid) {
      message = field.dataset.error || "Please enter a valid email address.";
    }

    setFieldState(field, message);
    return !message;
  };

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      validateField(field);
      clearStatus();
    });

    field.addEventListener("change", () => {
      validateField(field);
      clearStatus();
    });

    field.addEventListener("blur", () => {
      validateField(field);
    });
  });

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const valid = fields.map(validateField).every(Boolean);
    const firstInvalid = fields.find((field) => field.classList.contains("is-invalid"));

    if (honeypot && honeypot.value) {
      showStatus("Your message could not be sent. Please try again.", "error");
      return;
    }

    if (!valid) {
      showStatus("Please review the highlighted fields before sending.", "error");
      firstInvalid?.focus();
      return;
    }

    const leadIdInput = contactForm.querySelector('input[name="lead_submission_id"]');
    const leadId = createLeadSubmissionId();
    if (leadIdInput) leadIdInput.value = leadId;

    const formData = new FormData(contactForm);
    const encoded = new URLSearchParams(formData).toString();
    const endpoint = "/";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encoded,
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      contactForm.reset();
      fields.forEach((field) => {
        field.classList.remove("is-invalid", "is-valid");
        field.removeAttribute("aria-invalid");
        const error = field.parentElement.querySelector(".field-error");
        if (error) error.textContent = "";
      });
      showStatus("Thank you. Your inquiry has been sent. Redirecting you to the next step...", "success");
      rememberLeadSubmission(leadId);
      window.location.href = "/thank-you.html";
    } catch {
      showStatus("We could not send your inquiry just now. Please try again in a moment.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  });
}
