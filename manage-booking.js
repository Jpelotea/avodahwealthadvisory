(() => {
  const token = new URLSearchParams(location.search).get("token") || "";
  const statusEl = document.getElementById("manage-status");
  const detailsEl = document.getElementById("booking-details");
  const dateEl = document.getElementById("booking-date");
  const stateEl = document.getElementById("booking-state");
  const meetLink = document.getElementById("meet-link");
  const rescheduleSection = document.getElementById("reschedule-section");
  const cancelSection = document.getElementById("cancel-section");
  const dateSelect = document.getElementById("manage-date");
  const timesEl = document.getElementById("manage-times");
  const selectionEl = document.getElementById("manage-selection");
  const rescheduleButton = document.getElementById("reschedule-button");
  const cancelButton = document.getElementById("cancel-button");
  let days = [];
  let selectedStart = "";

  const formatSlot = (iso) => new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

  const callManage = async (action, extra = {}) => {
    const response = await fetch("/api/manage-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action, management_token: token, ...extra }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      const error = new Error(
        result.message || result.error || "Request failed"
      );

      error.code = result.code || "REQUEST_FAILED";
      throw error;
    }

    return result;
  };

  const renderTimes = () => {
    const day = days.find((item) => item.date === dateSelect.value);

    timesEl.replaceChildren();
    selectedStart = "";
    selectionEl.textContent = "";
    rescheduleButton.disabled = true;

    if (!day) return;

    day.slots.forEach((slot) => {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = slot.label;

      button.addEventListener("click", () => {
        timesEl
          .querySelectorAll("button")
          .forEach((item) =>
            item.classList.toggle("is-selected", item === button)
          );

        selectedStart = slot.start;

        selectionEl.textContent =
          "Selected: " + formatSlot(slot.start);

        rescheduleButton.disabled = false;
      });

      timesEl.appendChild(button);
    });
  };

  const loadAvailability = async () => {
    const response = await fetch("/api/booking-slots", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error("Availability unavailable");
    }

    days = result.days || [];

    dateSelect.replaceChildren();

    days.forEach((day) => {
      const option = document.createElement("option");

      option.value = day.date;
      option.textContent =
        day.label + " — " + day.slots.length + " available";

      dateSelect.appendChild(option);
    });

    renderTimes();
  };

  const load = async () => {
    if (!token || token.length < 40) {
      statusEl.textContent =
        "This appointment management link is invalid.";

      return;
    }

    try {
      const result = await callManage("status");

      detailsEl.hidden = false;

      dateEl.textContent = result.start
        ? formatSlot(result.start)
        : "Appointment schedule unavailable";

      stateEl.textContent =
        "Status: " + (result.status || "Unknown");

      if (result.meet_link) {
        meetLink.href = result.meet_link;
        meetLink.hidden = false;
      }

      if (result.active) {
        rescheduleSection.hidden = false;
        cancelSection.hidden = false;

        await loadAvailability();

        statusEl.textContent =
          "You can reschedule or cancel this appointment below.";
      } else {
        statusEl.textContent =
          "This appointment is no longer active.";
      }
    } catch (error) {
      statusEl.textContent =
        error.message || "Unable to load this appointment.";
    }
  };

  dateSelect.addEventListener(
    "change",
    renderTimes
  );

  rescheduleButton.addEventListener(
    "click",
    async () => {
      if (!selectedStart) return;

      rescheduleButton.disabled = true;

      statusEl.textContent =
        "Rescheduling your appointment…";

      try {
        const result = await callManage(
          "reschedule",
          {
            start: selectedStart,
          }
        );

        dateEl.textContent =
          formatSlot(result.start);

        stateEl.textContent =
          "Status: Rescheduled";

        if (result.meet_link) {
          meetLink.href =
            result.meet_link;

          meetLink.hidden =
            false;
        }

        statusEl.textContent =
          "Your appointment has been rescheduled successfully.";

        selectedStart = "";

        await loadAvailability();
      } catch (error) {
        statusEl.textContent =
          error.code === "SLOT_UNAVAILABLE"
            ? "That time is no longer available. Please select another schedule."
            : error.message ||
              "Unable to reschedule the appointment.";
      } finally {
        rescheduleButton.disabled =
          !selectedStart;
      }
    }
  );

  cancelButton.addEventListener(
    "click",
    async () => {
      if (
        !confirm(
          "Cancel this appointment?"
        )
      ) {
        return;
      }

      cancelButton.disabled = true;

      statusEl.textContent =
        "Cancelling your appointment…";

      try {
        await callManage("cancel");

        stateEl.textContent =
          "Status: Cancelled";

        statusEl.textContent =
          "Your appointment has been cancelled.";

        rescheduleSection.hidden =
          true;

        cancelSection.hidden =
          true;

        meetLink.hidden =
          true;
      } catch (error) {
        statusEl.textContent =
          error.message ||
          "Unable to cancel the appointment.";

        cancelButton.disabled =
          false;
      }
    }
  );

  load();
})();
