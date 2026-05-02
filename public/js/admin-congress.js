/**
 * admin-congress.js
 * Módulo: Inscripciones al Congreso — Solicitudes y Paquetes
 * Autónomo — no depende de admin-workshops.js
 * v20260502
 *
 * CAMBIOS v20260502:
 *  - Nuevo estado "awaiting_receipt": solicitud creada pero sin comprobante subido.
 *    El admin NO puede aprobar/rechazar hasta que el comprobante exista.
 *  - Tarjetas colapsables: solo muestra el resumen compacto; el detalle se expande
 *    al tocar, evitando saturación visual con +100 solicitudes.
 *  - Campanita de notificaciones: ahora incluye solicitudes "pending" Y "awaiting_receipt",
 *    con mensajes diferenciados. Se refresca al cargar y al hacer reload().
 */

const congressModule = (() => {
  let _requests = [];
  let _activeTab = "pending";
  let _reviewingRequest = null;
  let _scanStream = null;
  let _scanAnimFrame = null;
  let _searchTerm = "";

  // ─── Ids de tarjetas expandidas ─────────────────────────────
  const _expandedCards = new Set();

  // ─── Init ────────────────────────────────────────────────────

  function init() {
    _wireTabBar();
    _wireScanQr();
    _wireSearch();
    reload();
  }

  function _wireTabBar() {
    document.querySelectorAll("#section-congress .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
  }

  function _wireSearch() {
    const input = document.getElementById("congressSearchInput");
    if (!input) return;
    input.addEventListener("input", () => {
      _searchTerm = input.value.toLowerCase().trim();
      renderRequests();
    });
  }

  function _wireScanQr() {
    const openBtn = document.getElementById("congressScanQrBtn");
    const cancelBtn = document.getElementById("congressScannerCancelBtn");
    if (openBtn) openBtn.addEventListener("click", startCongressScanner);
    if (cancelBtn) cancelBtn.addEventListener("click", stopCongressScanner);
  }

  function switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll("#section-congress .tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    renderRequests();
  }

  // ─── Data ─────────────────────────────────────────────────────

  /** Genera N tarjetas skeleton para el estado de carga */
  function _skeletonHTML(n) {
    n = n || 4;
    const card = `
      <div class="cong-skeleton-card">
        <div class="cong-skeleton-avatar"></div>
        <div class="cong-skeleton-body">
          <div class="cong-skeleton-line cong-skeleton-line--name"></div>
          <div class="cong-skeleton-line cong-skeleton-line--email"></div>
          <div class="cong-skeleton-line cong-skeleton-line--meta"></div>
        </div>
        <div class="cong-skeleton-badge"></div>
      </div>`;
    let cards = "";
    for (let i = 0; i < n; i++) cards += card;
    return `
      <div class="cong-loading">
        <div class="cong-loading-icon">
          <div class="cong-loading-ring"></div>
          <div class="cong-loading-dot"><i class="fas fa-id-card"></i></div>
        </div>
        <div class="cong-loading-text">
          <strong>Cargando solicitudes</strong>
          <span>Obteniendo datos del servidor…</span>
        </div>
      </div>
      <div class="cong-skeleton-grid">${cards}</div>`;
  }

  async function reload() {
    const list = document.getElementById("congressRequestsList");
    if (list) list.innerHTML = _skeletonHTML(4);

    try {
      const url =
        typeof getApiUrl === "function"
          ? getApiUrl("admin-congress-requests.php?status=all")
          : "/app/api/admin-congress-requests.php?status=all";

      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al cargar");
      _requests = json.data || [];
      renderRequests();
      _updateKpis();
      _updateBadge();
      _updateNotificationBell();
      _notifyStats();
    } catch (e) {
      if (list)
        list.innerHTML = `
          <div class="cong-error">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="cong-error-body">
              <strong>No se pudieron cargar las solicitudes</strong>
              <p>${_esc(e.message)}</p>
              <button class="cong-error-retry" onclick="congressModule.reload()">
                <i class="fas fa-rotate-right"></i> Reintentar
              </button>
            </div>
          </div>`;
    }
  }

  function _getRequests() {
    return _requests;
  }

  // ─── Badge de la pestaña ──────────────────────────────────────

  function _updateBadge() {
    // Badge pestaña "Pendientes"
    const badgePending = document.getElementById("congressBadgePending");
    const countPending = _requests.filter((r) => r.status === "pending").length;
    if (badgePending) {
      badgePending.textContent = countPending > 0 ? countPending : "";
      badgePending.style.display = countPending > 0 ? "inline-flex" : "none";
    }

    // Badge pestaña "En espera"
    const badgeAwaiting = document.getElementById("congressBadgeAwaiting");
    const countAwaiting = _requests.filter(
      (r) => r.status === "awaiting_receipt",
    ).length;
    if (badgeAwaiting) {
      badgeAwaiting.textContent = countAwaiting > 0 ? countAwaiting : "";
      badgeAwaiting.style.display = countAwaiting > 0 ? "inline-flex" : "none";
    }
  }

  // ─── Campanita de notificaciones ─────────────────────────────

  function _updateNotificationBell() {
    const countEl = document.getElementById("notificationsCount");
    const newCountEl = document.getElementById("notificationsNewCount");
    const listEl = document.getElementById("notificationsList");
    if (!countEl || !listEl) return;

    // Las solicitudes que importan al admin: pendientes de revisar + esperando comprobante
    const needsAttention = _requests.filter(
      (r) => r.status === "pending" || r.status === "awaiting_receipt",
    );

    if (
      window.globalNotifState &&
      typeof window.updateGlobalNotifications === "function"
    ) {
      window.globalNotifState.congress = needsAttention;
      window.updateGlobalNotifications();
      return;
    }
  }

  // Navega a la sección congress y hace scroll/expand de la tarjeta
  function _goToRequest(requestId) {
    // Cerrar dropdown de notificaciones
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) dropdown.classList.remove("open");

    // Cambiar sección si no está activa
    if (typeof switchSection === "function") switchSection("congress");

    // Buscar el tab correcto y activarlo
    const req = _requests.find((r) => r.request_id === requestId);
    if (req) {
      const targetTab =
        req.status === "awaiting_receipt" ? "awaiting_receipt" : "pending";
      switchTab(targetTab);
    }

    // Dar tiempo al render y hacer scroll
    setTimeout(() => {
      const card = document.querySelector(`[data-request-id="${requestId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        // Auto-expandir la tarjeta
        if (!_expandedCards.has(requestId)) {
          _expandedCards.add(requestId);
          renderRequests();
          setTimeout(() => {
            const updated = document.querySelector(
              `[data-request-id="${requestId}"]`,
            );
            if (updated)
              updated.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        }
      }
    }, 200);
  }

  // ─── KPIs ─────────────────────────────────────────────────────

  function _updateKpis() {
    const pending = _requests.filter((r) => r.status === "pending");
    const awaiting = _requests.filter((r) => r.status === "awaiting_receipt");
    const approved = _requests.filter((r) => r.status === "approved");
    const rejected = _requests.filter((r) => r.status === "rejected");
    const resubmit = _requests.filter((r) => r.status === "resubmit_requested");
    const revenue = approved.reduce((s, r) => s + _num(r.total_fee), 0);

    _setEl("congressKpiPending", pending.length);
    _setEl("congressKpiAwaiting", awaiting.length);
    _setEl("congressKpiApproved", approved.length);
    _setEl("congressKpiRejected", rejected.length);
    _setEl("congressKpiResubmit", resubmit.length);
    _setEl("congressKpiRevenue", _fmtMoney(revenue));
  }

  function _notifyStats() {
    if (typeof updateCongressStatsKpis === "function")
      updateCongressStatsKpis();
    if (typeof renderCongressPackageChart === "function")
      renderCongressPackageChart();
  }

  // ─── Render de lista ──────────────────────────────────────────

  function renderRequests() {
    const list = document.getElementById("congressRequestsList");
    if (!list) return;

    let filtered =
      _activeTab === "all"
        ? _requests
        : _requests.filter((r) => r.status === _activeTab);

    if (_searchTerm) {
      filtered = filtered.filter((r) =>
        [
          r.full_name,
          r.email,
          r.control_number,
          r.matricula,
          r.team_folio,
          r.school,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(_searchTerm),
        ),
      );
    }

    if (!filtered.length) {
      const isSearch = !!_searchTerm;
      list.innerHTML = `
        <div class="cong-empty">
          <div class="cong-empty-icon">
            <i class="fas fa-${isSearch ? "search" : "inbox"}"></i>
          </div>
          <strong>${isSearch ? "Sin resultados" : "Sin solicitudes"}</strong>
          <p>${
            isSearch
              ? 'Ninguna solicitud coincide con <em>"' +
                _esc(_searchTerm) +
                '"</em>. Intenta con otro nombre, folio o correo.'
              : "No hay solicitudes en esta categoría por el momento."
          }</p>
        </div>`;
      return;
    }

    list.innerHTML = `<div class="cong-grid">${filtered.map(_requestCard).join("")}</div>`;
  }

  // ─── Tarjeta (colapsable) ──────────────────────────────────────

  function _requestCard(r) {
    const meta = {
      pending: {
        label: "Pendiente",
        cls: "cong-badge--pending",
        icon: "clock",
      },
      awaiting_receipt: {
        label: "Sin comprobante",
        cls: "cong-badge--awaiting",
        icon: "hourglass-half",
      },
      approved: {
        label: "Aprobada",
        cls: "cong-badge--approved",
        icon: "check-circle",
      },
      rejected: {
        label: "Rechazada",
        cls: "cong-badge--rejected",
        icon: "times-circle",
      },
      resubmit_requested: {
        label: "Reenvío pedido",
        cls: "cong-badge--resubmit",
        icon: "redo",
      },
    };
    const s = meta[r.status] || { label: r.status, cls: "", icon: "circle" };

    const isExpanded = _expandedCards.has(r.request_id);

    // ── Parte compacta (siempre visible) ──
    const compactHtml = `
      <header class="cong-card-header" onclick="congressModule.toggleCard(${r.request_id})" role="button" aria-expanded="${isExpanded}" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')congressModule.toggleCard(${r.request_id})">
        <div class="cong-avatar" aria-hidden="true">${_initials(r.full_name)}</div>
        <div class="cong-card-identity">
          <h4 class="cong-card-name">${_esc(r.full_name)}</h4>
          <p class="cong-card-email"><i class="fas fa-envelope"></i> ${_esc(r.email)}</p>
        </div>
        <span class="cong-badge ${s.cls}">
          <i class="fas fa-${s.icon}"></i> ${s.label}
        </span>
        <button class="cong-expand-btn" aria-label="${isExpanded ? "Colapsar" : "Expandir"}" tabindex="-1">
          <i class="fas fa-chevron-${isExpanded ? "up" : "down"}"></i>
        </button>
      </header>`;

    if (!isExpanded) {
      return `<article class="cong-card cong-card--${r.status} cong-card--collapsed" data-request-id="${r.request_id}">${compactHtml}</article>`;
    }

    // ── Parte detallada (solo si expandida) ──
    const pkgChips = [
      r.includes_congress
        ? `<span class="cong-chip cong-chip--congress"><i class="fas fa-id-card"></i> Congreso</span>`
        : "",
      r.includes_robotics
        ? `<span class="cong-chip cong-chip--robotics"><i class="fas fa-robot"></i> Robótica</span>`
        : "",
      r.includes_camp
        ? `<span class="cong-chip cong-chip--camp"><i class="fas fa-campground"></i> Campamento</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const breakdown = [
      r.includes_congress
        ? `<div class="cong-fee-row"><span>Congreso</span><span>$${_fmtNum(r.congress_fee)}</span></div>`
        : "",
      r.includes_robotics
        ? `<div class="cong-fee-row"><span>Robótica (${r.robot_count} robot${r.robot_count !== 1 ? "s" : ""})</span><span>$${_fmtNum(r.robotics_fee)}</span></div>`
        : "",
      r.includes_camp
        ? `<div class="cong-fee-row"><span>Campamento</span><span>$${_fmtNum(r.camp_fee)}</span></div>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const receiptLink = r.receipt_filename
      ? `<a class="cong-receipt-link" href="${_apiUrl("get-receipt.php?filename=" + encodeURIComponent(r.receipt_filename))}" target="_blank" rel="noopener">
           <i class="fas fa-file-invoice"></i> Ver comprobante
         </a>`
      : `<span class="cong-no-receipt"><i class="fas fa-file-slash"></i> Sin comprobante</span>`;

    // ⚠ Bloquear acciones si no hay comprobante o está en awaiting_receipt
    const canAct =
      (r.status === "pending" || r.status === "resubmit_requested") &&
      r.receipt_filename;
    const isAwaiting = r.status === "awaiting_receipt";

    let actions = "";
    if (isAwaiting) {
      actions = `
        <div class="cong-card-actions cong-card-actions--locked">
          <div class="cong-locked-notice">
            <i class="fas fa-lock"></i>
            <span>El participante aún no ha subido su comprobante de pago. Las acciones se habilitarán cuando la solicitud esté completa.</span>
          </div>
        </div>`;
    } else if (
      (r.status === "pending" || r.status === "resubmit_requested") &&
      !r.receipt_filename
    ) {
      actions = `
        <div class="cong-card-actions cong-card-actions--locked">
          <div class="cong-locked-notice">
            <i class="fas fa-lock"></i>
            <span>No se puede actuar sin comprobante de pago.</span>
          </div>
        </div>`;
    } else if (canAct) {
      actions = `
        <div class="cong-card-actions">
          <button class="cong-btn cong-btn--approve" onclick="congressModule.openReview(${r.request_id},'approve')">
            <i class="fas fa-check"></i> Aprobar
          </button>
          <button class="cong-btn cong-btn--resubmit" onclick="congressModule.openReview(${r.request_id},'resubmit')">
            <i class="fas fa-redo"></i> Pedir reenvío
          </button>
          <button class="cong-btn cong-btn--reject" onclick="congressModule.openReview(${r.request_id},'reject')">
            <i class="fas fa-times"></i> Rechazar
          </button>
        </div>`;
    }

    const adminNote = r.admin_notes
      ? `<div class="cong-admin-note"><i class="fas fa-sticky-note"></i> ${_esc(r.admin_notes)}</div>`
      : "";

    const rejectReason = r.rejection_reason
      ? `<div class="cong-reject-reason"><i class="fas fa-exclamation-circle"></i> ${_esc(r.rejection_reason)}</div>`
      : "";

    return `
    <article class="cong-card cong-card--${r.status} cong-card--expanded" data-request-id="${r.request_id}">

      ${compactHtml}

      <div class="cong-card-detail">
        <!-- Datos extra de contacto -->
        ${r.phone ? `<div class="cong-card-phone-row"><i class="fas fa-phone"></i> ${_esc(r.phone)}</div>` : ""}

        <!-- Datos académicos -->
        <div class="cong-academic">
          ${r.school ? `<span><i class="fas fa-school"></i> ${_esc(r.school)}</span>` : ""}
          ${r.control_number ? `<span><i class="fas fa-id-badge"></i> ${_esc(r.control_number)}</span>` : ""}
          ${r.career ? `<span><i class="fas fa-book"></i> ${_esc(r.career)}</span>` : ""}
          ${r.grade ? `<span><i class="fas fa-layer-group"></i> ${_esc(r.grade)}</span>` : ""}
        </div>

        <!-- Paquete contratado -->
        <section class="cong-package-section">
          <div class="cong-chips">${pkgChips || '<span class="cong-chip--empty">Sin paquete</span>'}</div>
          <div class="cong-fee-box">
            ${breakdown}
            <div class="cong-fee-row cong-fee-total">
              <span>Total</span>
              <strong>$${_fmtNum(r.total_fee)}</strong>
            </div>
          </div>
        </section>

        <!-- Comprobante + Fecha -->
        <div class="cong-card-footer">
          ${receiptLink}
          <span class="cong-date"><i class="fas fa-calendar-alt"></i> ${_fmtDatetime(r.created_at)}</span>
        </div>

        ${adminNote}
        ${rejectReason}
        ${actions}
      </div>

    </article>`;
  }

  // ─── Toggle colapso ──────────────────────────────────────────

  function toggleCard(requestId) {
    if (_expandedCards.has(requestId)) {
      _expandedCards.delete(requestId);
    } else {
      _expandedCards.add(requestId);
    }
    renderRequests();
    // Scroll suave tras render
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-request-id="${requestId}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // ─── Modal de revisión ────────────────────────────────────────

  function openReview(requestId, action) {
    const req = _requests.find((r) => r.request_id === requestId);
    if (!req) return;

    // Bloqueo de seguridad: sin comprobante no se puede actuar
    if (!req.receipt_filename) {
      _showToast(
        "No se puede realizar esta acción sin comprobante de pago.",
        "error",
      );
      return;
    }
    if (req.status === "awaiting_receipt") {
      _showToast("El participante aún no ha subido su comprobante.", "error");
      return;
    }

    _reviewingRequest = { requestId, action };
    const modal = document.getElementById("congressReviewModal");
    const body = document.getElementById("congressReviewBody");
    const footer = document.getElementById("congressReviewFooter");
    if (!modal) return;

    const actionMeta = {
      approve: {
        label: "Nota para el usuario (opcional)",
        btnLabel: "Confirmar aprobación",
        btnCls: "cong-btn cong-btn--approve-lg",
        fieldKey: "admin_notes",
      },
      reject: {
        label: "Motivo del rechazo",
        btnLabel: "Confirmar rechazo",
        btnCls: "cong-btn cong-btn--reject-lg",
        fieldKey: "rejection_reason",
      },
      resubmit: {
        label: "Mensaje al usuario (qué corregir)",
        btnLabel: "Enviar solicitud",
        btnCls: "cong-btn cong-btn--resubmit-lg",
        fieldKey: "admin_notes",
      },
    };
    const m = actionMeta[action];

    body.innerHTML = `
      <div class="cong-review-user">
        <div class="cong-avatar cong-avatar--lg">${_initials(req.full_name)}</div>
        <div>
          <h4>${_esc(req.full_name)}</h4>
          <p>${_esc(req.email)}</p>
          <p class="cong-review-pkg">${_esc(req.package_label || "—")} — <strong>$${_fmtNum(req.total_fee)}</strong></p>
        </div>
      </div>
      ${
        req.receipt_filename
          ? `<p style="margin-bottom:14px"><a class="cong-receipt-link" href="${_apiUrl("get-receipt.php?filename=" + encodeURIComponent(req.receipt_filename))}" target="_blank" rel="noopener"><i class="fas fa-file-invoice"></i> Ver comprobante</a></p>`
          : ""
      }
      <div class="cong-review-field">
        <label for="congressReviewNote">${m.label}</label>
        <textarea id="congressReviewNote" class="form-control" rows="3" placeholder="Escribe aquí…"></textarea>
      </div>`;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="congressModule.closeReviewModal()">Cancelar</button>
      <button class="${m.btnCls}" onclick="congressModule.submitReview()">
        <i class="fas fa-save"></i> ${m.btnLabel}
      </button>`;

    modal.classList.remove("hidden");
    modal.classList.add("show");
  }

  function closeReviewModal() {
    const modal = document.getElementById("congressReviewModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("show");
    }
    _reviewingRequest = null;
  }

  async function submitReview() {
    if (!_reviewingRequest) return;
    const { requestId, action } = _reviewingRequest;
    const note = (
      document.getElementById("congressReviewNote")?.value || ""
    ).trim();

    const payload = {
      action: action === "resubmit" ? "request_resubmit" : action,
      request_id: requestId,
    };
    if (action === "reject")
      payload.rejection_reason = note || "Comprobante no válido";
    else payload.admin_notes = note;

    try {
      const url =
        typeof getApiUrl === "function"
          ? getApiUrl("admin-congress-requests.php")
          : "/app/api/admin-congress-requests.php";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      closeReviewModal();
      await reload();
      _showToast(json.message || "Operación realizada", "success");
    } catch (e) {
      _showToast(e.message, "error");
    }
  }

  // ─── Scanner QR ───────────────────────────────────────────────

  async function startCongressScanner() {
    const box = document.getElementById("congressScannerBox");
    const video = document.getElementById("congressScannerVideo");
    if (!box || !video) return;
    box.style.display = "block";

    try {
      _scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = _scanStream;
      await video.play();
      _scanFrame(video);
    } catch (e) {
      _showToast("No se pudo acceder a la cámara: " + e.message, "error");
      stopCongressScanner();
    }
  }

  function _scanFrame(video) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function tick() {
      if (!_scanStream) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== "undefined") {
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            stopCongressScanner();
            const term = code.data.trim();
            const searchEl = document.getElementById("congressSearchInput");
            if (searchEl) {
              searchEl.value = term;
              _searchTerm = term.toLowerCase();
              renderRequests();
            }
            return;
          }
        }
      }
      _scanAnimFrame = requestAnimationFrame(tick);
    }
    _scanAnimFrame = requestAnimationFrame(tick);
  }

  function stopCongressScanner() {
    if (_scanAnimFrame) {
      cancelAnimationFrame(_scanAnimFrame);
      _scanAnimFrame = null;
    }
    if (_scanStream) {
      _scanStream.getTracks().forEach((t) => t.stop());
      _scanStream = null;
    }
    const box = document.getElementById("congressScannerBox");
    if (box) box.style.display = "none";
  }

  // ─── Utilidades ───────────────────────────────────────────────

  function _esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function _initials(name) {
    return (name || "?")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  }
  function _num(v) {
    return isNaN(+v) ? 0 : +v;
  }
  function _fmtNum(v) {
    return Number(v || 0).toLocaleString("es-MX");
  }
  function _fmtMoney(v) {
    return (
      "$" + Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })
    );
  }
  function _fmtDatetime(v) {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d)
      ? String(v)
      : d.toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }
  function _apiUrl(path) {
    return typeof getApiUrl === "function"
      ? getApiUrl(path)
      : "/app/api/" + path;
  }
  function _showToast(msg, type) {
    if (typeof setGlobalStatus === "function") setGlobalStatus(msg, type);
    else console[type === "error" ? "error" : "log"](msg);
  }
  function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ─── API pública ──────────────────────────────────────────────

  return {
    init,
    reload,
    switchTab,
    toggleCard,
    openReview,
    closeReviewModal,
    submitReview,
    startCongressScanner,
    stopCongressScanner,
    _goToRequest,
    _getRequests,
  };
})();

// ─── Bootstrap ────────────────────────────────────────────────

(function () {
  function hookWhenReady() {
    const orig = window.switchSection;
    window.switchSection = function (sectionName) {
      if (typeof orig === "function") orig(sectionName);
      if (sectionName === "congress") congressModule.init();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hookWhenReady);
  } else {
    hookWhenReady();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sect = document.getElementById("section-congress");
    if (sect && sect.classList.contains("active")) {
      congressModule.init();
    }
  });
})();
