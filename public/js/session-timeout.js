(function () {
  if (window.__sessionTimeoutInitialized) return;
  window.__sessionTimeoutInitialized = true;

  const cfg = window.SessionTimeoutConfig || {};
  const role = cfg.role === "admin" ? "admin" : "user";
  const timeoutMs =
    Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : 15 * 60 * 1000;
  const storagePrefix = role === "admin" ? "renovatec_admin" : "renovatec_user";
  const activityKey = `${storagePrefix}_session_activity_v1`;
  const expiredKey = `${storagePrefix}_session_expired_v1`;
  const channelName = `${storagePrefix}_session_timeout_v1`;
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
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        return raw !== null && raw !== "";
      } catch {
        return false;
      }
    });
  }

  if (!hasSession()) return;

  let timerId = null;
  let tickerId = null;
  let broadcastChannel = null;
  let isExpired = false;

  function getNow() {
    return Date.now();
  }

  function readLastActivity() {
    try {
      const raw = localStorage.getItem(activityKey);
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  function writeLastActivity(timestamp) {
    try {
      localStorage.setItem(activityKey, String(timestamp));
    } catch {
      // noop
    }
  }

  function ensureLastActivity() {
    const stored = readLastActivity();
    if (stored > 0) return stored;
    const now = getNow();
    writeLastActivity(now);
    return now;
  }

  function getRemainingMs() {
    const lastActivity = ensureLastActivity();
    const remaining = timeoutMs - (getNow() - lastActivity);
    return remaining > 0 ? remaining : 0;
  }

  function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function ensureWidget() {
    if (!document.body) return null;
    let widget = document.getElementById("sessionTimeoutWidget");
    if (widget) return widget;

    widget = document.createElement("div");
    widget.id = "sessionTimeoutWidget";
    widget.setAttribute("role", "status");
    widget.setAttribute("aria-live", "polite");
    widget.style.cssText =
      "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:20000;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(15,23,42,.92);border:1px solid rgba(59,130,246,.32);box-shadow:0 14px 30px rgba(0,0,0,.26);backdrop-filter:blur(10px);color:#e2e8f0;font:700 12px/1.2 'DM Sans',sans-serif;min-width:92px;";
    widget.innerHTML =
      '<div style="width:24px;height:24px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,.14);color:#60a5fa;flex-shrink:0;"><i class="fas fa-clock"></i></div>' +
      '<strong id="sessionTimeoutCountdown" style="font-size:14px;letter-spacing:.02em;color:#fff;min-width:52px;text-align:center;">00:00</strong>';
    document.body.appendChild(widget);
    return widget;
  }

  function updateWidget() {
    const widget = ensureWidget();
    if (!widget) return;
    const countdown = widget.querySelector("#sessionTimeoutCountdown");
    const remaining = getRemainingMs();
    if (countdown) countdown.textContent = formatRemaining(remaining);
    widget.style.opacity = remaining <= 60 * 1000 ? "1" : "0.96";
    widget.style.borderColor =
      remaining <= 5 * 60 * 1000
        ? "rgba(96,165,250,.48)"
        : "rgba(59,130,246,.32)";
  }

  function broadcast(message) {
    try {
      if (!broadcastChannel && "BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel(channelName);
      }
      broadcastChannel?.postMessage(message);
    } catch {
      // noop
    }
  }

  function markActivity() {
    if (isExpired) return;
    const now = getNow();
    writeLastActivity(now);
    try {
      localStorage.removeItem(expiredKey);
    } catch {
      // noop
    }
    broadcast({ type: "activity", at: now });
    updateWidget();
    resetTimer();
  }

  function clearSession() {
    [...sessionKeys, ...extraClearKeys].forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // noop
      }
    });
    try {
      localStorage.removeItem(activityKey);
      localStorage.removeItem(expiredKey);
    } catch {
      // noop
    }
  }

  function expireSession() {
    if (isExpired || !hasSession()) return;
    isExpired = true;

    try {
      localStorage.setItem(expiredKey, String(getNow()));
    } catch {
      // noop
    }
    broadcast({ type: "expired", at: getNow() });

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
    if (isExpired) return;
    if (timerId) {
      window.clearTimeout(timerId);
    }
    const remaining = getRemainingMs();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    timerId = window.setTimeout(expireSession, remaining);
    updateWidget();
  }

  ["mousedown", "keydown", "scroll", "touchstart", "click", "focusin"].forEach(
    (eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    },
  );

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (isExpired) return;
      if (getRemainingMs() <= 0) {
        expireSession();
        return;
      }
      resetTimer();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === activityKey || event.key === expiredKey) {
      if (event.key === expiredKey && event.newValue) {
        expireSession();
        return;
      }
      if (!isExpired) {
        resetTimer();
      }
    }
  });

  if ("BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(channelName);
      broadcastChannel.onmessage = (event) => {
        const message = event?.data || {};
        if (message.type === "expired") {
          expireSession();
          return;
        }
        if (message.type === "activity" && !isExpired) {
          resetTimer();
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }

  tickerId = window.setInterval(() => {
    if (isExpired) return;
    updateWidget();
    if (getRemainingMs() <= 0) {
      expireSession();
    }
  }, 1000);

  ensureLastActivity();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateWidget, { once: true });
  } else {
    updateWidget();
  }

  resetTimer();
})();
