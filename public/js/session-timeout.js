(function () {
  if (window.__sessionTimeoutInitialized) return;
  window.__sessionTimeoutInitialized = true;

  const cfg = window.SessionTimeoutConfig || {};
  const role = cfg.role === "admin" ? "admin" : "user";
  const timeoutMs =
    Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : 15 * 60 * 1000;
  const sessionKeys = Array.isArray(cfg.keys)
    ? cfg.keys
    : role === "admin"
      ? ["adminUser"]
      : ["renovatec_user_session_v1"];
  const extraClearKeys = Array.isArray(cfg.extraClearKeys)
    ? cfg.extraClearKeys
    : role === "admin"
      ? []
      : ["renovatec_package_draft_v1"];

  const redirectUrl =
    typeof cfg.redirectUrl === "string" && cfg.redirectUrl.trim() !== ""
      ? cfg.redirectUrl
      : "/acceso?mode=login&reason=timeout";

  const timeoutMessage =
    typeof cfg.message === "string" && cfg.message.trim() !== ""
      ? cfg.message
      : "Tu sesión se cerró por seguridad tras 15 minutos de inactividad.";

  function hasSession() {
    return sessionKeys.some((key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw !== null && raw !== "";
      } catch {
        return false;
      }
    });
  }

  if (!hasSession()) return;

  let timerId = null;

  function clearSession() {
    [...sessionKeys, ...extraClearKeys].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // noop
      }
    });
  }

  function expireSession() {
    if (!hasSession()) return;

    fetch("/app/api/auth-logout.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .catch((err) =>
        console.error("Error al cerrar sesión por inactividad:", err),
      )
      .finally(() => {
        clearSession();
        try {
          sessionStorage.setItem("session_timeout_message", timeoutMessage);
        } catch {
          // noop
        }
        window.location.href = redirectUrl;
      });
  }

  function resetTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(expireSession, timeoutMs);
  }

  [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
  ].forEach((eventName) => {
    window.addEventListener(eventName, resetTimer, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      resetTimer();
    }
  });

  resetTimer();
})();
