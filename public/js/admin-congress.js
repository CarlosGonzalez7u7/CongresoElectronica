/**
 * admin-congress.js
 * Módulo: Inscripciones al Congreso — Solicitudes y Paquetes
 * v20260608
 *
 * CAMBIOS v20260608:
 *  - Modal enriquecido: datos del usuario, paquete, taller, robótica (robots +
 *    integrantes editables), campamento.
 *  - Acciones bidireccionales: approved ↔ pending/rejected/resubmit.
 *  - WhatsApp automático con mensaje pre-redactado al número del participante.
 *  - Tarjetas compactas → abren modal al hacer clic (no colapsan en la lista).
 *  - Equipos con congreso+robótica aprobados se inyectan en Equipos Confirmados.
 */

const congressModule = (() => {
  let _requests = [];
  let _activeTab = "pending";
  let _reviewingRequest = null;
  let _scanStream = null;
  let _scanAnimFrame = null;
  let _searchTerm = "";

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

      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al cargar");
      _requests = json.data || [];
      renderRequests();
      _updateKpis();
      _updateBadge();
      _updateNotificationBell();
      _notifyStats();
      _updateConfirmedFromCongress();
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

  // ─── Equipos confirmados vía congreso ─────────────────────────

  function _updateConfirmedFromCongress() {
    // Incluir todos los aprobados con robótica, tengan o no folio de equipo en la tabla teams
    const approvedWithRobotics = _requests.filter(
      (r) => r.status === "approved" && r.includes_robotics,
    );
    document.dispatchEvent(
      new CustomEvent("congress:confirmedRobotics", {
        detail: { approved: approvedWithRobotics },
      }),
    );
  }

  // ─── Badge ────────────────────────────────────────────────────

  function _updateBadge() {
    const badgePending = document.getElementById("congressBadgePending");
    const countPending = _requests.filter((r) => r.status === "pending").length;
    if (badgePending) {
      badgePending.textContent = countPending > 0 ? countPending : "";
      badgePending.style.display = countPending > 0 ? "inline-flex" : "none";
    }
    const badgeAwaiting = document.getElementById("congressBadgeAwaiting");
    const countAwaiting = _requests.filter(
      (r) => r.status === "awaiting_receipt",
    ).length;
    if (badgeAwaiting) {
      badgeAwaiting.textContent = countAwaiting > 0 ? countAwaiting : "";
      badgeAwaiting.style.display = countAwaiting > 0 ? "inline-flex" : "none";
    }
  }

  function _updateNotificationBell() {
    const countEl = document.getElementById("notificationsCount");
    const listEl = document.getElementById("notificationsList");
    if (!countEl || !listEl) return;
    const needsAttention = _requests.filter(
      (r) => r.status === "pending" || r.status === "awaiting_receipt",
    );
    if (
      window.globalNotifState &&
      typeof window.updateGlobalNotifications === "function"
    ) {
      window.globalNotifState.congress = needsAttention;
      window.updateGlobalNotifications();
    }
  }

  function _goToRequest(requestId) {
    const dropdown = document.getElementById("notificationsDropdown");
    if (dropdown) dropdown.classList.remove("open");
    if (typeof switchSection === "function") switchSection("congress");
    const req = _requests.find((r) => r.request_id === requestId);
    if (req) {
      const targetTab =
        req.status === "awaiting_receipt" ? "awaiting_receipt" : "pending";
      switchTab(targetTab);
    }
    setTimeout(() => openDetailModal(requestId), 300);
  }

  // ─── KPIs ─────────────────────────────────────────────────────

  function _updateKpis() {
    const byStatus = (s) => _requests.filter((r) => r.status === s);
    const approved = byStatus("approved");
    const revenue = approved.reduce((s, r) => s + _num(r.total_fee), 0);
    _setEl("congressKpiPending", byStatus("pending").length);
    _setEl("congressKpiAwaiting", byStatus("awaiting_receipt").length);
    _setEl("congressKpiApproved", approved.length);
    _setEl("congressKpiRejected", byStatus("rejected").length);
    _setEl("congressKpiResubmit", byStatus("resubmit_requested").length);
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

    let filtered = _requests;

    if (_searchTerm) {
      // Búsqueda global inteligente: Fuerza visualmente a "Todas" para encontrar resultados ocultos
      if (_activeTab !== "all") {
        _activeTab = "all";
        document.querySelectorAll("#section-congress .tab-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.tab === "all");
        });
      }

      filtered = filtered.filter((r) =>
        [
          r.full_name,
          r.email,
          r.control_number,
          r.matricula,
          r.team_folio,
          r.request_folio,
          r.school,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(_searchTerm),
        ),
      );
    } else {
      filtered =
        _activeTab === "all"
          ? _requests
          : _requests.filter((r) => r.status === _activeTab);
    }

    if (!filtered.length) {
      const isSearch = !!_searchTerm;
      list.innerHTML = `
        <div class="cong-empty">
          <div class="cong-empty-icon"><i class="fas fa-${isSearch ? "search" : "inbox"}"></i></div>
          <strong>${isSearch ? "Sin resultados" : "Sin solicitudes"}</strong>
          <p>${
            isSearch
              ? 'Ninguna solicitud coincide con <em>"' +
                _esc(_searchTerm) +
                '"</em>.'
              : "No hay solicitudes en esta categoría por el momento."
          }</p>
        </div>`;
      return;
    }

    list.innerHTML = `<div class="cong-grid">${filtered.map(_requestCard).join("")}</div>`;
  }

  // ─── Tarjeta compacta ─────────────────────────────────────────

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

    const pkgIcons = [
      r.includes_congress
        ? `<i class="fas fa-id-card" title="Congreso"></i>`
        : "",
      r.includes_robotics
        ? `<i class="fas fa-robot" title="Robótica"></i>`
        : "",
      r.includes_camp
        ? `<i class="fas fa-campground" title="Campamento"></i>`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `
    <article class="cong-card cong-card--${r.status}" data-request-id="${r.request_id}"
      onclick="congressModule.openDetailModal(${r.request_id})" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')congressModule.openDetailModal(${r.request_id})"
      title="Ver detalle completo de ${_esc(r.full_name)}">
      <header class="cong-card-header">
        <div class="cong-avatar" aria-hidden="true">${_initials(r.full_name)}</div>
        <div class="cong-card-identity">
          <h4 class="cong-card-name">${_esc(r.full_name)}</h4>
          <p class="cong-card-email" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:4px 0;">
            <span><i class="fas fa-envelope"></i> ${_esc(r.email)}</span>
            ${r.request_folio ? `<span class="cong-folio-chip" style="margin:0;"><i class="fas fa-hashtag"></i>${_esc(r.request_folio)}</span>` : ""}
            ${r.team_folio && r.team_folio !== r.request_folio ? `<span class="cong-folio-chip" style="margin:0;"><i class="fas fa-ticket-alt"></i>${_esc(r.team_folio)}</span>` : ""}
          </p>
          <p class="cong-card-pkg">
            ${pkgIcons} <span>$${_fmtNum(r.total_fee)}</span>
          </p>
        </div>
        <span class="cong-badge ${s.cls}">
          <i class="fas fa-${s.icon}"></i> ${s.label}
        </span>
        <i class="fas fa-chevron-right cong-card-arrow" aria-hidden="true"></i>
      </header>
    </article>`;
  }

  // ─── Modal de detalle completo ────────────────────────────────

  function openDetailModal(requestId) {
    const r = _requests.find((x) => x.request_id === requestId);
    if (!r) return;
    _reviewingRequest = { requestId };

    const modal = document.getElementById("congressReviewModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("show");
    _renderModalContent(r);
  }

  function _renderModalContent(r) {
    const body = document.getElementById("congressReviewBody");
    const footer = document.getElementById("congressReviewFooter");
    if (!body || !footer) return;

    const sm = {
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
    }[r.status] || { label: r.status, cls: "", icon: "circle" };

    // ── 1. Datos del participante ──
    const userSection = `
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="const b=this.nextElementSibling; const i=this.querySelector('i.fa-chevron-down'); if(b.style.display==='none'){b.style.display='grid'; i.style.transform='rotate(0deg)';}else{b.style.display='none'; i.style.transform='rotate(-90deg)';}">
          <span><i class="fas fa-user"></i> Datos del Participante</span>
          <i class="fas fa-chevron-down" style="transition: transform 0.3s;"></i>
        </h5>
        <div class="cong-modal-user-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <div class="cong-modal-avatar-col" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 15px; flex-direction: row;">
            <div class="cong-avatar cong-avatar--xl">${_initials(r.full_name)}</div>
            <div>
               <div style="font-size: 1.2rem; font-weight: bold; color: #fff;">${_esc(r.full_name)}</div>
               <span class="cong-badge ${sm.cls}" style="margin-top:4px"><i class="fas fa-${sm.icon}"></i> ${sm.label}</span>
            </div>
          </div>
          <div class="cong-info-row"><i class="fas fa-envelope"></i> ${_esc(r.email)}</div>
          ${r.phone ? `<div class="cong-info-row"><i class="fas fa-phone"></i> ${_esc(r.phone)}</div>` : ""}
          ${r.school ? `<div class="cong-info-row" style="grid-column: 1 / -1;"><i class="fas fa-school"></i> ${_esc(r.school)}</div>` : ""}
          ${r.career ? `<div class="cong-info-row"><i class="fas fa-book"></i> ${_esc(r.career)}</div>` : ""}
          ${r.semester ? `<div class="cong-info-row"><i class="fas fa-layer-group"></i> Semestre ${_esc(r.semester)}</div>` : ""}
          ${r.control_number ? `<div class="cong-info-row"><i class="fas fa-id-badge"></i> No. Control: ${_esc(r.control_number)}</div>` : ""}
          ${r.matricula && r.matricula !== r.control_number ? `<div class="cong-info-row"><i class="fas fa-id-card"></i> Matrícula: ${_esc(r.matricula)}</div>` : ""}
          ${r.country ? `<div class="cong-info-row" style="grid-column: 1 / -1;"><i class="fas fa-globe"></i> ${_esc(r.country)}${r.city ? ", " + _esc(r.city) : ""}</div>` : ""}
          <div class="cong-info-row cong-info-row--muted"><i class="fas fa-calendar-alt"></i> Solicitud: ${_fmtDatetime(r.created_at)}</div>
          ${r.reviewed_at ? `<div class="cong-info-row cong-info-row--muted"><i class="fas fa-check"></i> Revisado: ${_fmtDatetime(r.reviewed_at)}</div>` : ""}
        </div>
      </section>`;

    // ── 2. Paquete y comprobante ──
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
        ? `<div class="cong-fee-row"><span>Robótica (${r.robot_count || 0} robot${(r.robot_count || 0) !== 1 ? "s" : ""})</span><span>$${_fmtNum(r.robotics_fee)}</span></div>`
        : "",
      r.includes_camp
        ? `<div class="cong-fee-row"><span>Campamento</span><span>$${_fmtNum(r.camp_fee)}</span></div>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const receiptHtml = r.receipt_filename
      ? `<a class="cong-receipt-link" href="${_apiUrl("get-receipt.php?filename=" + encodeURIComponent(r.receipt_filename))}" target="_blank" rel="noopener">
           <i class="fas fa-file-invoice"></i> Ver comprobante${r.receipt_uploaded_at ? " · " + _fmtDatetime(r.receipt_uploaded_at) : ""}
         </a>`
      : `<span class="cong-no-receipt"><i class="fas fa-file-slash"></i> Sin comprobante aún</span>`;

    const packageSection = `
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title"><i class="fas fa-box-open"></i> Paquete Adquirido</h5>
        <div class="cong-chips" style="margin-bottom:10px">${pkgChips || '<span class="cong-chip--empty">Sin paquete definido</span>'}</div>
        <div class="cong-fee-box">
          ${breakdown}
          <div class="cong-fee-row cong-fee-total"><span>Total</span><strong>$${_fmtNum(r.total_fee)}</strong></div>
        </div>
        <div style="margin-top:12px">${receiptHtml}</div>
        ${r.admin_notes ? `<div class="cong-admin-note" style="margin-top:10px"><i class="fas fa-sticky-note"></i> Nota admin: ${_esc(r.admin_notes)}</div>` : ""}
        ${r.rejection_reason ? `<div class="cong-reject-reason" style="margin-top:10px"><i class="fas fa-exclamation-circle"></i> Motivo rechazo: ${_esc(r.rejection_reason)}</div>` : ""}
      </section>`;

    // ── 3. Taller inscrito (si aplica) ──
    let workshopSection = "";
    if (r.workshop_id || r.workshop_name) {
      workshopSection = `
        <section class="cong-modal-section">
          <h5 class="cong-modal-section-title"><i class="fas fa-chalkboard-teacher"></i> Taller Inscrito</h5>
          <div class="cong-detail-block">
            <div class="cong-info-row"><strong>${_esc(r.workshop_name || "Taller")}</strong></div>
            ${r.workshop_date ? `<div class="cong-info-row"><i class="fas fa-calendar"></i> ${_esc(r.workshop_date)}</div>` : ""}
            ${r.workshop_location ? `<div class="cong-info-row"><i class="fas fa-map-marker-alt"></i> ${_esc(r.workshop_location)}</div>` : ""}
            ${r.workshop_instructor ? `<div class="cong-info-row"><i class="fas fa-user-tie"></i> ${_esc(r.workshop_instructor)}</div>` : ""}
          </div>
        </section>`;
    }

    // ── 4. Robótica — robots e integrantes editables ──
    let roboticsSection = "";
    if (r.includes_robotics) {
      const editable = ["approved", "pending", "resubmit_requested"].includes(
        r.status,
      );
      const teamFolioRow = r.team_folio
        ? `<div class="cong-info-row cong-info-row--muted">
             <i class="fas fa-ticket-alt"></i> Folio equipo: <strong>${_esc(r.team_folio)}</strong>
             ${r.team_payment_status === "verified" ? '<span class="cong-chip cong-chip--approved" style="margin-left:6px">Pago verificado</span>' : ""}
           </div>`
        : "";

      // Normalizar: snapshot usa {name, category}, tabla robots usa {robot_name, category, id}
      const robotsRaw =
        Array.isArray(r.robots) && r.robots.length ? r.robots : [];
      const robots = robotsRaw.map((rob) => ({
        id: rob.id || null,
        robot_name: rob.robot_name || rob.name || "",
        category: rob.category || "",
      }));
      const robotsHtml = robots.length
        ? robots
            .map(
              (rob, idx) => `
            <div class="cong-edit-row" id="cong-robot-row-${r.request_id}-${idx}" data-robot-id="${rob.id || ""}">
              <span class="cong-edit-num">${idx + 1}</span>
              <input class="cong-edit-input" value="${_esc(rob.robot_name)}" placeholder="Nombre del robot" />
              <select class="cong-edit-select">${_categoryOptions(rob.category)}</select>
              ${editable ? `<button class="cong-btn-remove" onclick="congressModule.removeRobotRow(${r.request_id},${idx})" title="Quitar"><i class="fas fa-trash"></i></button>` : ""}
            </div>`,
            )
            .join("")
        : `<p class="cong-empty-inline"><i class="fas fa-info-circle"></i> ${r.robot_count > 0 ? r.robot_count + " robot(s) en snapshot — refresca si no aparecen" : "Sin robots registrados"}</p>`;

      // Normalizar: snapshot usa {name}, tabla team_members usa {member_name, is_captain, id}
      const membersRaw =
        Array.isArray(r.members) && r.members.length ? r.members : [];
      const members = membersRaw.map((m) => ({
        id: m.id || null,
        member_name: m.member_name || m.name || "",
        is_captain: !!(m.is_captain || m.isCaptain),
      }));

      const membersHtml = members.length
        ? members
            .map(
              (m, idx) => `
            <div class="cong-edit-row" id="cong-member-row-${r.request_id}-${idx}" data-member-id="${m.id || ""}">
              <span class="cong-edit-num">${idx + 1}</span>
              <input class="cong-edit-input" value="${_esc(m.member_name)}" placeholder="Nombre del integrante" />
              <span class="cong-edit-badge">${m.is_captain ? "Capitán" : "Integrante"}</span>
              ${editable && !m.is_captain ? `<button class="cong-btn-remove" onclick="congressModule.removeMemberRow(${r.request_id},${idx})" title="Quitar"><i class="fas fa-trash"></i></button>` : ""}
            </div>`,
            )
            .join("")
        : `<p class="cong-empty-inline"><i class="fas fa-info-circle"></i> Sin integrantes en el snapshot. Puedes añadirlos manualmente.</p>`;

      roboticsSection = `
        <section class="cong-modal-section">
          <h5 class="cong-modal-section-title"><i class="fas fa-robot"></i> Torneo de Robótica</h5>
          ${teamFolioRow}
          <div class="cong-sub-block">
            <h6 class="cong-sub-title"><i class="fas fa-cog"></i> Robots registrados</h6>
            <div id="cong-robots-list-${r.request_id}">${robotsHtml}</div>
            ${editable ? `<button class="cong-btn-add" onclick="congressModule.addRobotRow(${r.request_id})"><i class="fas fa-plus"></i> Añadir robot</button>` : ""}
          </div>
          <div class="cong-sub-block" style="margin-top:14px">
            <h6 class="cong-sub-title"><i class="fas fa-users"></i> Integrantes del equipo</h6>
            <div id="cong-members-list-${r.request_id}">${membersHtml}</div>
            ${editable ? `<button class="cong-btn-add" onclick="congressModule.addMemberRow(${r.request_id})"><i class="fas fa-plus"></i> Añadir integrante</button>` : ""}
          </div>
          ${editable ? `<button class="cong-btn cong-btn--save-robotics" style="margin-top:12px" onclick="congressModule.saveRoboticsEdits(${r.request_id})"><i class="fas fa-save"></i> Guardar cambios de robótica</button>` : ""}
        </section>`;
    }

    // ── 5. Campamento ──
    let campSection = "";
    if (r.includes_camp) {
      campSection = `
        <section class="cong-modal-section">
          <h5 class="cong-modal-section-title"><i class="fas fa-campground"></i> Campamento</h5>
          <div class="cong-detail-block">
            <div class="cong-info-row"><i class="fas fa-check-circle" style="color:var(--cong-approved,#22c55e)"></i> Inscrito al campamento</div>
            <div class="cong-info-row cong-info-row--muted">Costo: <strong>$${_fmtNum(r.camp_fee)}</strong></div>
          </div>
        </section>`;
    }

    body.innerHTML =
      userSection +
      packageSection +
      workshopSection +
      roboticsSection +
      campSection;
    footer.innerHTML = _buildFooterActions(r);
  }

  // ─── Editores de robots e integrantes ────────────────────────

  function _categoryOptions(selected) {
    const cats = [
      ["robot-guerra-1lb", "Robot de guerra 1 lb"],
      ["robot-guerra-3lb", "Robot de guerra 3 lb"],
      ["seguidor-linea-profesional", "Seguidor de línea profesional"],
      ["seguidor-linea-amateur", "Seguidor de línea amateur"],
      ["carros-rc", "Carros RC"],
      ["soccer-rc", "Soccer RC"],
      ["mini-sumo-rc", "Mini sumo RC"],
      ["robot-insecto", "Robot insecto"],
    ];
    const s = String(selected || "").trim();
    let found = false;
    let html = cats
      .map(([val, lbl]) => {
        const isMatch =
          s.toLowerCase() === val.toLowerCase() ||
          s.toLowerCase() === lbl.toLowerCase();
        if (isMatch) found = true;
        return `<option value="${val}" ${isMatch ? "selected" : ""}>${lbl}</option>`;
      })
      .join("");
    if (!found && s) {
      html += `<option value="${_esc(s)}" selected>${_esc(s)}</option>`;
    }
    return html;
  }

  // ─── Generador de Gafetes ─────────────────────────────────────

  async function printBadges(requestId) {
    const r = _requests.find((x) => x.request_id === requestId);
    if (!r) return;

    // Obtener convocatorias de la base de datos para mostrar sus títulos reales
    let convosDB = [];
    try {
      const res = await fetch(_apiUrl("public-landing.php"));
      const json = await res.json();
      if (json.success && json.data && json.data.convocatorias) {
        convosDB = json.data.convocatorias;
      }
    } catch (e) {}

    let attendees = [];

    // Capitán / Titular
    attendees.push({
      name: r.full_name,
      role: "Capitán / Titular",
      school: r.school || "",
      folio: r.request_folio || r.team_folio || "",
    });

    // Integrantes adicionales
    if (r.members && Array.isArray(r.members)) {
      r.members.forEach((m) => {
        if (!m.is_captain && m.member_name) {
          attendees.push({
            name: m.member_name,
            role: "Participante",
            school: r.school || "",
            folio: r.request_folio || r.team_folio || "",
          });
        }
      });
    }

    // Detección de módulos del paquete
    let selectedIds = [];
    try {
      if (r.selected_convocatorias_json) {
        selectedIds = JSON.parse(r.selected_convocatorias_json);
      }
    } catch (e) {}

    let convos = [];
    if (selectedIds && selectedIds.length > 0) {
      selectedIds.forEach((cId) => {
        const dbConv = convosDB.find((c) => c.id == cId);
        if (dbConv) {
          let modNames = [];
          try {
            const mods = JSON.parse(dbConv.included_modules || "{}");
            if (mods.congress) modNames.push("Congreso");
            if (mods.workshops) modNames.push("Talleres");
            if (mods.conferences) modNames.push("Conferencias");
            if (mods.robotics) modNames.push("Robótica");
            if (mods.camp) modNames.push("Campamento");
            if (mods.custom && Array.isArray(mods.custom)) {
              mods.custom.forEach((cm) => modNames.push(cm.label));
            }
          } catch (e) {}
          let title = dbConv.titulo;
          if (modNames.length > 0) {
            title += ` (${modNames.join(", ")})`;
          }
          convos.push(title);
        }
      });
    }

    if (convos.length === 0) {
      if (r.includes_congress)
        convos.push("Congreso (Talleres y Conferencias)");
      if (r.includes_robotics) convos.push("Torneo de Robótica");
      if (r.includes_camp) convos.push("Campamento");
    }

    let convosText = convos.join("<br>");

    const printWindow = window.open("", "_blank");
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gafetes - ${r.request_folio || r.team_folio}</title>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 20px; text-align: center; }
          .gafete { 
            width: 8.5cm; 
            height: 11cm; 
            background: #fff;
            border: 2px dashed #cbd5e1; 
            display: inline-block; 
            margin: 10px; 
            padding: 20px 15px;
            box-sizing: border-box;
            text-align: center;
            position: relative;
            page-break-inside: avoid;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .header { font-size: 18px; font-weight: 900; color: #0284c7; margin-bottom: 15px; border-bottom: 3px solid #0284c7; padding-bottom: 8px; letter-spacing: 1px; }
          .name { font-size: 20px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; color: #0f172a; line-height: 1.1; }
          .role { font-size: 13px; color: #f59e0b; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; }
          .school { font-size: 11px; font-weight: bold; margin-bottom: 15px; color: #475569; }
          .qr-box { margin: 15px auto; width: 130px; height: 130px; padding: 5px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .qr-box img { width: 100%; height: 100%; }
          .convos { font-size: 11px; background: #f8fafc; padding: 8px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; color: #334155; }
          .folio { position: absolute; bottom: 15px; left: 0; right: 0; font-size: 11px; color: #94a3b8; font-family: monospace; }
          @media print {
            body { padding: 0; background: #fff; }
            .gafete { border: 1px solid #ccc; margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
    `;

    attendees.forEach((a) => {
      const qrUrl = new URL(
        _apiUrl(
          "get-qr.php?text=" +
            encodeURIComponent("RENOVATEC|FOLIO:" + a.folio) +
            "&size=250",
        ),
        window.location.href,
      ).href;
      html += `
        <div class="gafete">
          <div class="header">RENOVATEC 2026</div>
          <div class="name">${_esc(a.name)}</div>
          <div class="role">${_esc(a.role)}</div>
          <div class="school">${_esc(a.school)}</div>
          <div class="qr-box">
            <img src="${qrUrl}" alt="QR no disponible" onerror="this.onerror=null; this.outerHTML='<div style=\\'color:red;font-size:10px;font-weight:bold;margin-top:35%\\'>QR no disponible</div>';" style="width:100%; height:100%; display:block;">
            <div style="font-size:11px; font-weight:bold; font-family:monospace; margin-top:5px; color:#334155;">${_esc(a.folio)}</div>
          </div>
          <div class="convos"><strong>Accesos Autorizados:</strong><br>${convosText}</div>
          <div class="folio">FOLIO: ${_esc(a.folio)}</div>
        </div>
      `;
    });

    html += `
        <script>
          window.onload = function() { 
            // Esperar un poco extra a que rendericen los SVGs locales
            setTimeout(() => { window.print(); }, 1200);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  function addRobotRow(requestId) {
    const container = document.getElementById(`cong-robots-list-${requestId}`);
    if (!container) return;
    const idx = container.querySelectorAll(".cong-edit-row").length;
    const div = document.createElement("div");
    div.className = "cong-edit-row cong-edit-row--new";
    div.id = `cong-robot-row-${requestId}-${idx}`;
    div.dataset.robotId = "new";
    div.innerHTML = `
      <span class="cong-edit-num">${idx + 1}</span>
      <input class="cong-edit-input" value="" placeholder="Nombre del robot" />
      <select class="cong-edit-select">${_categoryOptions("")}</select>
      <button class="cong-btn-remove" onclick="this.parentElement.remove()" title="Quitar"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
  }

  function removeRobotRow(requestId, idx) {
    const row = document.getElementById(`cong-robot-row-${requestId}-${idx}`);
    if (!row) return;
    row.style.opacity = "0.35";
    row.dataset.deleted = "1";
    const btn = row.querySelector(".cong-btn-remove");
    if (btn) {
      btn.innerHTML = '<i class="fas fa-undo"></i>';
      btn.title = "Deshacer";
      btn.onclick = () => {
        row.style.opacity = "1";
        row.dataset.deleted = "0";
        btn.innerHTML = '<i class="fas fa-trash"></i>';
        btn.title = "Quitar";
        btn.onclick = () => removeRobotRow(requestId, idx);
      };
    }
  }

  function addMemberRow(requestId) {
    const container = document.getElementById(`cong-members-list-${requestId}`);
    if (!container) return;
    const idx = container.querySelectorAll(".cong-edit-row").length;
    const div = document.createElement("div");
    div.className = "cong-edit-row cong-edit-row--new";
    div.id = `cong-member-row-${requestId}-${idx}`;
    div.dataset.memberId = "new";
    div.innerHTML = `
      <span class="cong-edit-num">${idx + 1}</span>
      <input class="cong-edit-input" value="" placeholder="Nombre del integrante" />
      <span class="cong-edit-badge">Integrante</span>
      <button class="cong-btn-remove" onclick="this.parentElement.remove()" title="Quitar"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
  }

  function removeMemberRow(requestId, idx) {
    const row = document.getElementById(`cong-member-row-${requestId}-${idx}`);
    if (!row) return;
    row.style.opacity = "0.35";
    row.dataset.deleted = "1";
    const btn = row.querySelector(".cong-btn-remove");
    if (btn) {
      btn.innerHTML = '<i class="fas fa-undo"></i>';
      btn.title = "Deshacer";
      btn.onclick = () => {
        row.style.opacity = "1";
        row.dataset.deleted = "0";
        btn.innerHTML = '<i class="fas fa-trash"></i>';
        btn.title = "Quitar";
        btn.onclick = () => removeMemberRow(requestId, idx);
      };
    }
  }

  // Guardar ediciones de robótica (llama al backend con los datos actuales del DOM)
  async function saveRoboticsEdits(requestId) {
    const r = _requests.find((x) => x.request_id === requestId);
    if (!r) return;

    const robotRows = document.querySelectorAll(
      `#cong-robots-list-${requestId} .cong-edit-row`,
    );
    const robots = [];
    robotRows.forEach((row) => {
      if (row.dataset.deleted === "1") return;
      const name = row.querySelector("input")?.value?.trim() || "";
      const category = row.querySelector("select")?.value || "";
      const robotId = row.dataset.robotId;
      if (name)
        robots.push({ id: robotId === "new" ? null : robotId, name, category });
    });

    const memberRows = document.querySelectorAll(
      `#cong-members-list-${requestId} .cong-edit-row`,
    );
    const members = [];
    memberRows.forEach((row) => {
      if (row.dataset.deleted === "1") return;
      const name = row.querySelector("input")?.value?.trim() || "";
      const memberId = row.dataset.memberId;
      if (name)
        members.push({ id: memberId === "new" ? null : memberId, name });
    });

    try {
      const url =
        typeof getApiUrl === "function"
          ? getApiUrl("admin-congress-requests.php")
          : "/app/api/admin-congress-requests.php";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "update_robotics",
          request_id: requestId,
          robots,
          members,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      _showToast("Cambios de robótica guardados", "success");
      await reload();
    } catch (e) {
      _showToast(e.message, "error");
    }
  }

  function markRobotDirty() {}
  function markMemberDirty() {}

  // ─── Footer con acciones bidireccionales ──────────────────────

  function _buildFooterActions(r) {
    if (r.status === "awaiting_receipt") {
      return `
        <div class="cong-footer-locked">
          <i class="fas fa-lock"></i>
          <span>El participante aún no ha subido su comprobante. Las acciones se habilitarán cuando esté completa.</span>
        </div>
        <button class="btn btn-secondary" onclick="congressModule.closeReviewModal()">Cerrar</button>`;
    }

    const hasReceipt = !!r.receipt_filename;

    const btnApprove = hasReceipt
      ? `<button class="cong-btn cong-btn--approve" onclick="congressModule.openAction(${r.request_id},'approve')"><i class="fas fa-check"></i> Aprobar</button>`
      : "";
    const btnResubmit = `<button class="cong-btn cong-btn--resubmit" onclick="congressModule.openAction(${r.request_id},'resubmit')"><i class="fas fa-redo"></i> Pedir reenvío</button>`;
    const btnReject = `<button class="cong-btn cong-btn--reject" onclick="congressModule.openAction(${r.request_id},'reject')"><i class="fas fa-times"></i> Rechazar</button>`;
    const btnPending = `<button class="cong-btn cong-btn--pending" onclick="congressModule.openAction(${r.request_id},'pending')"><i class="fas fa-clock"></i> Pasar a pendiente</button>`;
    const btnGafetes =
      r.status === "approved" || r.status === "paid"
        ? `<button class="cong-btn" style="background:#0284c7;color:#fff;border:none;" onclick="congressModule.printBadges(${r.request_id})"><i class="fas fa-id-badge"></i> Gafetes</button>`
        : "";
    const btnClose = `<button class="btn btn-secondary" onclick="congressModule.closeReviewModal()">Cerrar</button>`;

    let actions = "";
    if (r.status === "approved" || r.status === "paid") {
      actions = `${btnGafetes}${btnReject}${btnResubmit}${btnPending}`;
    } else if (r.status === "rejected") {
      actions = `${btnApprove}${btnResubmit}${btnPending}`;
    } else if (r.status === "resubmit_requested") {
      actions = `${btnApprove}${btnReject}${btnPending}`;
    } else {
      // pending y sin comprobante
      if (!hasReceipt) {
        return `
          <div class="cong-footer-locked">
            <i class="fas fa-file-slash"></i>
            <span>No se puede aprobar ni rechazar sin comprobante de pago. Puedes pedir reenvío.</span>
          </div>
          <div class="cong-footer-actions">${btnResubmit}${btnClose}</div>`;
      }
      actions = `${btnApprove}${btnResubmit}${btnReject}`;
    }

    return `<div class="cong-footer-actions">${actions}${btnClose}</div>`;
  }

  // ─── Panel de confirmación de acción ─────────────────────────

  function openAction(requestId, action) {
    const r = _requests.find((x) => x.request_id === requestId);
    if (!r) return;
    _reviewingRequest = { requestId, action };

    const meta = {
      approve: {
        label: "Nota para el usuario (opcional)",
        btnLabel: "Confirmar aprobación",
        btnCls: "cong-btn cong-btn--approve-lg",
        icon: "check",
        title: "Aprobar solicitud",
        defaultNote:
          "Tu pago y documentos han sido revisados y están correctos. ¡Bienvenido a RENOVATEC!",
      },
      reject: {
        label: "Motivo del rechazo (requerido)",
        btnLabel: "Confirmar rechazo",
        btnCls: "cong-btn cong-btn--reject-lg",
        icon: "times",
        title: "Rechazar solicitud",
        defaultNote:
          "El comprobante de pago adjunto no es válido, no corresponde al monto o no es legible. Por favor, verifica los requisitos.",
      },
      resubmit: {
        label: "Qué debe corregir el participante",
        btnLabel: "Enviar solicitud de reenvío",
        btnCls: "cong-btn cong-btn--resubmit-lg",
        icon: "redo",
        title: "Pedir reenvío de comprobante",
        defaultNote:
          "El comprobante de pago no se ve claramente o falta información. Por favor, vuélvelo a subir en mejor calidad o formato.",
      },
      pending: {
        label: "Nota interna (opcional)",
        btnLabel: "Regresar a pendiente",
        btnCls: "cong-btn cong-btn--pending-lg",
        icon: "clock",
        title: "Regresar a estado pendiente",
        defaultNote: "",
      },
    };
    const m = meta[action];
    if (!m) return;

    const footer = document.getElementById("congressReviewFooter");
    if (!footer) return;

    let initialNote = "";
    if (action === "reject" && r.rejection_reason) {
      initialNote = r.rejection_reason;
    } else if (action !== "reject" && r.admin_notes) {
      initialNote = r.admin_notes;
    } else {
      initialNote = m.defaultNote;
    }

    footer.innerHTML = `
      <div class="cong-action-panel">
        <div class="cong-action-panel-head"><i class="fas fa-${m.icon}"></i> <strong>${m.title}</strong></div>
        <p class="cong-action-panel-user"><i class="fas fa-user"></i> ${_esc(r.full_name)} · ${_esc(r.email)}</p>
        <label for="congressReviewNote" class="cong-action-panel-label">${m.label}</label>
        <textarea id="congressReviewNote" class="form-control" rows="3" placeholder="Escribe aquí…">${_esc(initialNote)}</textarea>
        <div class="cong-action-panel-btns">
          <button class="btn btn-secondary btn-small" onclick="congressModule._restoreFooter(${requestId})">
            <i class="fas fa-arrow-left"></i> Cancelar
          </button>
          <button class="${m.btnCls}" onclick="congressModule.submitReview()">
            <i class="fas fa-save"></i> ${m.btnLabel}
          </button>
        </div>
      </div>`;
  }

  function _restoreFooter(requestId) {
    const r = _requests.find((x) => x.request_id === requestId);
    if (r) {
      const footer = document.getElementById("congressReviewFooter");
      if (footer) footer.innerHTML = _buildFooterActions(r);
    }
    _reviewingRequest = { requestId };
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
    if (!_reviewingRequest?.action) return;
    const { requestId, action } = _reviewingRequest;
    const note = (
      document.getElementById("congressReviewNote")?.value || ""
    ).trim();
    const r = _requests.find((x) => x.request_id === requestId);

    if (action === "reject" && !note) {
      _showToast("Escribe el motivo del rechazo", "error");
      return;
    }

    const backendActionMap = {
      approve: "approve",
      reject: "reject",
      resubmit: "request_resubmit",
      pending: "set_pending",
    };

    const payload = {
      action: backendActionMap[action] || action,
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
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      closeReviewModal();
      await reload();
      _showToast(json.message || "Operación realizada", "success");

      // Abrir WhatsApp si hay teléfono
      if (r?.phone) _openWhatsApp(r, action, note);
    } catch (e) {
      _showToast(e.message, "error");
    }
  }

  // ─── WhatsApp automático ──────────────────────────────────────

  function _openWhatsApp(r, action, note) {
    const nombre = (r.full_name || "participante").split(" ")[0];
    const paquete = r.package_label || "tu paquete";
    const total = "$" + _fmtNum(r.total_fee);

    const msgs = {
      approve: `Hola ${nombre} 👋\n\nTe informamos que tu solicitud de inscripción a *RENOVATEC 2026* ha sido *✅ APROBADA*.\n\n📦 Paquete: ${paquete}\n💰 Total pagado: ${total}${note ? "\n\n📝 Nota: " + note : ""}\n\n¡Te esperamos! Cualquier duda, escríbenos.`,
      reject: `Hola ${nombre} 👋\n\nLamentamos informarte que tu solicitud de inscripción a *RENOVATEC 2026* fue *❌ RECHAZADA*.\n\n📦 Paquete solicitado: ${paquete}\n\n📋 Motivo: ${note || "Comprobante no válido o información incorrecta"}\n\nSi tienes dudas, contáctanos directamente.`,
      resubmit: `Hola ${nombre} 👋\n\nTu solicitud de inscripción a *RENOVATEC 2026* requiere que *vuelvas a subir tu comprobante de pago* 🔄.\n\n📦 Paquete: ${paquete}\n\n📋 Qué debes corregir: ${note || "Por favor sube nuevamente tu comprobante"}\n\nIngresa a tu cuenta en la plataforma y sube el comprobante correcto. ¡Gracias!`,
      pending: `Hola ${nombre} 👋\n\nTu solicitud de inscripción a *RENOVATEC 2026* ha sido regresada a *revisión pendiente* ⏳.\n\n📦 Paquete: ${paquete}${note ? "\n\n📝 Nota: " + note : ""}\n\nTe avisaremos en cuanto sea revisada. ¡Gracias por tu paciencia!`,
    };

    const msg = msgs[action] || msgs["pending"];
    const phone = (r.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const fullPhone = phone.startsWith("52") ? phone : "52" + phone;
    window.open(
      `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener",
    );
  }

  // ─── Compatibilidad con openReview legacy ────────────────────

  function openReview(requestId, action) {
    openDetailModal(requestId);
    setTimeout(() => openAction(requestId, action), 150);
  }

  function toggleCard(requestId) {
    openDetailModal(requestId);
  }

  // ─── Scanner QR ───────────────────────────────────────────────

  let _isRequestingCamera = false;

  async function startCongressScanner() {
    if (_isRequestingCamera) return;
    _isRequestingCamera = true;

    const box = document.getElementById("congressScannerBox");
    const video = document.getElementById("congressScannerVideo");
    if (!box || !video) {
      _isRequestingCamera = false;
      return;
    }
    box.style.display = "flex";
    document.body.classList.add("scanner-active");
    try {
      _scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.srcObject = _scanStream;

      const p = video.play();
      if (p !== undefined) p.catch((e) => console.warn(e));

      _scanFrame(video);
      _isRequestingCamera = false;
    } catch (e) {
      _isRequestingCamera = false;
      _showToast("No se pudo acceder a la cámara: " + e.message, "error");
      stopCongressScanner();
    }
  }

  function _playBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
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
            _playBeep();
            stopCongressScanner();
            let term = code.data.trim();
            try {
              term = decodeURIComponent(term);
            } catch (e) {}

            const matchFolio = term.match(/FOLIO[:=]([^|%]+)/i);
            if (matchFolio && matchFolio[1]) {
              term = matchFolio[1].trim();
            } else {
              const matchRenov = term.match(/RENOV-\d{14}-\d{4}/i);
              if (matchRenov) term = matchRenov[0];
            }
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
    document.body.classList.remove("scanner-active");
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
    // Forzar lectura en hora local en todos los navegadores
    const cleanDate = String(v).replace(/-/g, "/").replace("T", " ");
    const d = new Date(cleanDate);
    return isNaN(d.getTime())
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

  return {
    init,
    reload,
    switchTab,
    toggleCard,
    openDetailModal,
    openReview,
    openAction,
    _restoreFooter,
    closeReviewModal,
    submitReview,
    saveRoboticsEdits,
    addRobotRow,
    removeRobotRow,
    addMemberRow,
    removeMemberRow,
    markRobotDirty,
    markMemberDirty,
    startCongressScanner,
    stopCongressScanner,
    printBadges,
    _goToRequest,
    _getRequests,
    _updateConfirmedFromCongress,
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
    if (sect && sect.classList.contains("active")) congressModule.init();

    // Escuchar equipos aprobados con robótica desde congreso
    document.addEventListener("congress:confirmedRobotics", (evt) => {
      _injectCongressRoboticsTeams(evt.detail?.approved || []);
    });
  });

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function _injectCongressRoboticsTeams(approvedRequests) {
    const container = document.getElementById("confirmedStageGroups");
    if (!container) return;

    // Quitar inyecciones previas
    container
      .querySelectorAll(".cong-congress-inject")
      .forEach((el) => el.remove());
    if (!approvedRequests.length) return;

    const section = document.createElement("section");
    section.className = "stage-group-card cong-congress-inject";
    section.innerHTML = `
      <div class="stage-group-head">
        <div>
          <h3 style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-id-card" style="color:var(--accent-cyan,#22d3ee)"></i>
            Vía Congreso + Robótica
          </h3>
          <p>Equipos cuyo pago combinado fue aprobado en el módulo de Inscripciones al Congreso.</p>
        </div>
        <span class="stage-chip active">${approvedRequests.length} equipo${approvedRequests.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="stage-group-list">
        ${approvedRequests
          .map(
            (r) => `
          <article class="confirmed-team-card">
            <div class="confirmed-team-top">
              <strong>${_esc(r.team_folio || r.email)}</strong>
              <span class="badge-status badge-verified">Aprobado · Congreso</span>
            </div>
            <div class="quick-meta">${_esc(r.full_name)} · ${_esc(r.school || "—")}</div>
            <div class="confirmed-team-meta">
              <span><strong>Robots:</strong> ${r.robot_count || 0}</span>
              <span><strong>Total:</strong> $${Number(r.total_fee || 0).toLocaleString("es-MX")}</span>
              <span><strong>Paquete:</strong> ${_esc(r.package_label || "Congreso + Robótica")}</span>
            </div>
            <button class="btn btn-secondary btn-small" type="button"
              onclick="if(typeof switchSection==='function')switchSection('congress');setTimeout(()=>congressModule.openDetailModal(${r.request_id}),300)">
              <i class="fas fa-eye"></i> Ver solicitud completa
            </button>
          </article>`,
          )
          .join("")}
      </div>`;
    container.appendChild(section);
  }
})();
