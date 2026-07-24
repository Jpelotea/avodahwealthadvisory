(() => {
  "use strict";
  document.querySelector("[data-system-retry]")?.addEventListener("click", () => {
    window.location.reload();
  });
})();
