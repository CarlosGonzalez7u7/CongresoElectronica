/* ═══════════════════════════════════════════════════════════════════
   PANEL DE EQUIPOS CONFIRMADOS — confirmedPanel
   v20260505 — fix: modal de solo lectura (sin Aprobar/Rechazar)

   FUENTE DE DATOS:
   - window.allTeams[]  →  cargado por loadDashboard() desde admin-dashboard.php
═══════════════════════════════════════════════════════════════════ */

const confirmedPanel = (function () {
  /* Estado local */
  let _currentTab = "all"; // "all" | "1" | "2" | "3"
  let _searchQuery = "";

  /* ── Configuración de etapas ── */
  const STAGE_CFG = {
    1: {
      label: "Etapa 1",
      short: "E1",
      rangeText: "1 abr – 30 jun",
      price: 130,
      dotCls: "cf-dot-stage1",
      badgeCls: "cf-badge-stage1",
      color: "#22d3a0",
    },
    2: {
      label: "Etapa 2",
      short: "E2",
      rangeText: "1 jul – 31 ago",
      price: 200,
      dotCls: "cf-dot-stage2",
      badgeCls: "cf-badge-stage2",
      color: "#00d4ff",
    },
    3: {
      label: "Etapa 3",
      short: "E3",
      rangeText: "1 sep – 23 oct",
      price: 350,
      dotCls: "cf-dot-stage3",
      badgeCls: "cf-badge-stage3",
      color: "#f59e0b",
    },
  };

  /* ── Helpers ── */
  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function _initials(name) {
    return (name || "?")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  }

  function _money(n) {
    const v = Number(n || 0);
    return "$" + v.toLocaleString("es-MX") + " MXN";
  }

  function _shortMoney(n) {
    const v = Number(n || 0);
    if (v >= 1000) return "$" + (v / 1000).toFixed(1).replace(".0", "") + "k";
    return "$" + v;
  }

  function _fmtDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt)
      ? String(d)
      : dt.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });
  }

  function _fmtDateTime(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt)
      ? String(d)
      : dt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  }

  function _el(id) {
    return document.getElementById(id);
  }

  function _setText(id, v) {
    const el = _el(id);
    if (el) el.textContent = String(v ?? "");
  }

  /* ── Filtrar equipos con robótica verificada ── */
  function _roboticsTeams() {
    if (!Array.isArray(window.allTeams)) return [];
    const seen = new Set();
    const uniqueTeams = [];
    for (const t of window.allTeams) {
      if (
        t.payment_status === "verified" &&
        Array.isArray(t.robots) &&
        t.robots.length > 0
      ) {
        if (!seen.has(t.folio)) {
          seen.add(t.folio);
          uniqueTeams.push(t);
        }
      }
    }
    return uniqueTeams;
  }

  function _filtered() {
    let teams = _roboticsTeams();

    if (_currentTab !== "all") {
      const stageNum = Number(_currentTab);
      teams = teams.filter(
        (t) => Number(t.registration_stage || 0) === stageNum,
      );
    }

    if (_searchQuery.trim()) {
      const q = _searchQuery.toLowerCase();
      teams = teams.filter((t) => {
        const robotText = (t.robots || [])
          .map((r) => r.robot_name + " " + r.category)
          .join(" ");
        return (
          String(t.folio || "")
            .toLowerCase()
            .includes(q) ||
          String(t.captain_name || "")
            .toLowerCase()
            .includes(q) ||
          String(t.school_name || "")
            .toLowerCase()
            .includes(q) ||
          String(t.captain_email || "")
            .toLowerCase()
            .includes(q) ||
          robotText.toLowerCase().includes(q)
        );
      });
    }

    return teams;
  }

  /* ── KPIs ── */
  function _renderKpis() {
    const teams = _roboticsTeams();
    const totalRobots = teams.reduce((a, t) => a + (t.robots || []).length, 0);
    const totalRevenue = teams.reduce(
      (a, t) => a + Number(t.total_amount || 0),
      0,
    );
    const arrivedTeams = teams.filter(
      (t) => t.arrived || Number(t.arrived_robots_count || 0) > 0,
    ).length;

    _setText("cfKpiTeams", teams.length);
    _setText("cfKpiRobots", totalRobots);
    _setText("cfKpiRevenue", _money(totalRevenue));
    _setText("cfKpiArrived", arrivedTeams + " / " + teams.length);

    [1, 2, 3].forEach((sn) => {
      const st = teams.filter((t) => Number(t.registration_stage || 0) === sn);
      const rev = st.reduce((a, t) => a + Number(t.total_amount || 0), 0);
      const robs = st.reduce((a, t) => a + (t.robots || []).length, 0);
      _setText("cfKpiRev" + sn, _money(rev));
      _setText("cfKpiSub" + sn, st.length + " equipos · " + robs + " robots");
    });
  }

  /* ── Analíticas ── */
  function _renderAnalytics() {
    const teams = _roboticsTeams();

    const catMap = {};
    teams.forEach((t) => {
      const fallbackPrice = Number(
        t.price_per_robot || t.total_amount / Math.max(1, t.robots.length) || 0,
      );
      (t.robots || []).forEach((r) => {
        const cat = r.category || "sin-categoria";
        if (!catMap[cat]) catMap[cat] = { count: 0, revenue: 0, label: cat };
        catMap[cat].count++;
        catMap[cat].revenue += Number(r.robot_price || fallbackPrice);
      });
    });

    const getLabel =
      typeof getCategoryLabel === "function" ? getCategoryLabel : (c) => c;

    const cats = Object.values(catMap)
      .map((c) => ({ ...c, label: getLabel(c.label) }))
      .sort((a, b) => b.count - a.count);

    const maxCount = cats.length ? cats[0].count : 1;

    const catBarsEl = _el("cfCatBars");
    if (catBarsEl) {
      if (!cats.length) {
        catBarsEl.innerHTML =
          '<p class="quick-empty">Sin robots registrados aún.</p>';
      } else {
        catBarsEl.innerHTML = cats
          .map(
            (c, i) => `
          <div class="cf-cat-row">
            <div class="cf-cat-rank">${i + 1}</div>
            <div class="cf-cat-name" title="${_esc(c.label)}">${_esc(c.label)}</div>
            <div class="cf-cat-bar-wrap">
              <div class="cf-cat-bar" style="width:${Math.round((c.count / maxCount) * 100)}%"></div>
            </div>
            <div class="cf-cat-count">${c.count} robot${c.count !== 1 ? "s" : ""}</div>
            <div class="cf-cat-money">${_shortMoney(c.revenue)}</div>
          </div>`,
          )
          .join("");
      }
    }

    const revData = [1, 2, 3].map((sn) => {
      const cfg = STAGE_CFG[sn];
      const st = teams.filter((t) => Number(t.registration_stage || 0) === sn);
      return {
        label: cfg.label + " · $" + cfg.price + "/robot",
        color: cfg.color,
        teams: st.length,
        robots: st.reduce((a, t) => a + (t.robots || []).length, 0),
        revenue: st.reduce((a, t) => a + Number(t.total_amount || 0), 0),
      };
    });
    const maxRev = Math.max(...revData.map((r) => r.revenue), 1);

    const revRowsEl = _el("cfRevRows");
    if (revRowsEl) {
      const totalRev = revData.reduce((a, r) => a + r.revenue, 0);
      revRowsEl.innerHTML =
        revData
          .map(
            (r) => `
        <div class="cf-rev-row">
          <div class="cf-rev-meta">
            <span class="cf-rev-label">${_esc(r.label)}</span>
            <span class="cf-rev-sub">${r.teams} equipos · ${r.robots} robots</span>
          </div>
          <div class="cf-rev-bar-wrap">
            <div class="cf-rev-bar" style="width:${Math.round((r.revenue / maxRev) * 100)}%; background:${_esc(r.color)}"></div>
          </div>
          <div class="cf-rev-val">${_money(r.revenue)}</div>
        </div>`,
          )
          .join("") +
        `<div class="cf-rev-total">
          <span>Total recaudado (robótica)</span>
          <span class="cf-rev-total-val">${_money(totalRev)}</span>
        </div>`;
    }
  }

  /* ── Pestañas ── */
  function _renderTabs() {
    const teams = _roboticsTeams();
    _setText("cfTabCountAll", teams.length);
    [1, 2, 3].forEach((sn) => {
      _setText(
        "cfTabCount" + sn,
        teams.filter((t) => Number(t.registration_stage || 0) === sn).length,
      );
    });
    document.querySelectorAll(".cf-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cfTab === _currentTab);
    });
  }

  /* ── Tarjeta de equipo ── */
  function _teamCard(team) {
    const cfg = STAGE_CFG[Number(team.registration_stage)] || STAGE_CFG[1];
    const robots = team.robots || [];
    const members = team.members || [];

    const arrivalDetail = (() => {
      const total = robots.length;
      const arrived_n = Number(team.arrived_robots_count || 0);
      if (!total) return { dot: "cf-arrived-pending", text: "Sin robots" };
      if (arrived_n >= total)
        return {
          dot: "cf-arrived-full",
          text: arrived_n + "/" + total + " robots",
        };
      if (arrived_n > 0)
        return {
          dot: "cf-arrived-partial",
          text: arrived_n + "/" + total + " robots",
        };
      if (team.arrived) return { dot: "cf-arrived-full", text: "Llegó" };
      return { dot: "cf-arrived-pending", text: "Sin registro" };
    })();

    const membersNames = members
      .filter((m) => !m.is_captain)
      .map((m) => _esc(m.member_name || "Sin nombre"));

    return `
      <article class="cf-team-card" data-cf-team-id="${team.id}" tabindex="0"
               onclick="confirmedPanel.openDetail(${team.id})"
               onkeydown="if(event.key==='Enter')confirmedPanel.openDetail(${team.id})"
               title="Ver detalles de ${_esc(team.captain_name)}">

        <div class="cf-team-head">
          <span class="cf-team-folio">${_esc(team.folio)}</span>
          <span class="cf-team-badge ${cfg.badgeCls}">${cfg.short}</span>
        </div>

        <div class="cf-team-captain">${_esc(team.captain_name || "—")}</div>
        <div class="cf-team-school" title="${_esc(team.school_name)}">${_esc(team.school_name || "—")}</div>
        <div class="cf-team-contact">
          <i class="fas fa-envelope"></i> ${_esc(team.captain_email || "—")}
          &ensp;·&ensp;
          <i class="fas fa-phone"></i> ${_esc(team.captain_phone || "—")}
        </div>

        <div class="cf-team-robots-label">
          <i class="fas fa-robot"></i> ${robots.length} robot${robots.length !== 1 ? "s" : ""}
        </div>
        <div class="cf-robot-list">
          ${robots
            .map((r) => {
              const isArrived =
                r.arrived == 1 ||
                r.arrived === true ||
                r.arrived === "1" ||
                String(r.arrived).toLowerCase() === "true";
              return `
            <div class="cf-robot-item ${isArrived ? "cf-robot-arrived" : ""}">
              <span class="cf-robot-dot ${isArrived ? "cf-robot-dot--on" : "cf-robot-dot--off"}"></span>
              <span class="cf-robot-name">${_esc(r.robot_name || "Robot")}</span>
              <span class="cf-robot-cat">${_esc(typeof getCategoryLabel === "function" ? getCategoryLabel(r.category) : r.category || "—")}</span>
            </div>`;
            })
            .join("")}
        </div>

        ${
          members.length > 1
            ? `<div class="cf-team-members">
            <i class="fas fa-people-group"></i>
            ${members.length} integrantes
            ${membersNames.length ? "· " + membersNames.slice(0, 3).join(", ") + (membersNames.length > 3 ? " …" : "") : ""}
          </div>`
            : ""
        }

        <div class="cf-team-footer">
          <div class="cf-arrival">
            <span class="cf-arrival-dot ${arrivalDetail.dot}"></span>
            <span class="cf-arrival-text">${arrivalDetail.text}</span>
            ${team.checkin_at ? `<span class="cf-arrival-date">· ${_fmtDate(team.checkin_at)}</span>` : ""}
          </div>
          <div class="cf-team-amount">${_money(team.total_amount)}</div>
        </div>

      </article>`;
  }

  /* ── Cuerpo principal ── */
  function _renderBody() {
    const bodyEl = _el("cfBody");
    if (!bodyEl) return;

    const teams = _filtered();
    if (!teams.length) {
      bodyEl.innerHTML = `
        <div class="cf-empty">
          <i class="fas fa-inbox"></i>
          <p>No hay equipos que coincidan con la búsqueda.</p>
        </div>`;
      return;
    }

    const sorted = [...teams].sort((a, b) => {
      const stDiff =
        Number(a.registration_stage || 0) - Number(b.registration_stage || 0);
      if (stDiff !== 0) return stDiff;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    let html = "";

    if (_currentTab === "all") {
      [1, 2, 3].forEach((sn) => {
        const group = sorted.filter(
          (t) => Number(t.registration_stage || 0) === sn,
        );
        if (!group.length) return;

        const cfg = STAGE_CFG[sn];
        const grpRev = group.reduce(
          (a, t) => a + Number(t.total_amount || 0),
          0,
        );
        const grpRob = group.reduce((a, t) => a + (t.robots || []).length, 0);

        html += `
          <div class="cf-stage-group">
            <div class="cf-stage-group-head">
              <div class="cf-stage-group-title">
                <span class="cf-stage-dot-lg" style="background:${cfg.color}"></span>
                <span>${cfg.label}</span>
                <span class="cf-stage-range">${cfg.rangeText}</span>
              </div>
              <div class="cf-stage-group-stats">
                <span><strong>${group.length}</strong> equipos</span>
                <span><strong>${grpRob}</strong> robots</span>
                <span><strong>${_money(grpRev)}</strong></span>
              </div>
            </div>
            <div class="cf-teams-grid">
              ${group.map(_teamCard).join("")}
            </div>
          </div>`;
      });
    } else {
      const sn = Number(_currentTab);
      const cfg = STAGE_CFG[sn] || STAGE_CFG[1];
      const grpRev = sorted.reduce(
        (a, t) => a + Number(t.total_amount || 0),
        0,
      );
      const grpRob = sorted.reduce((a, t) => a + (t.robots || []).length, 0);

      html += `
        <div class="cf-stage-group">
          <div class="cf-stage-group-head">
            <div class="cf-stage-group-title">
              <span class="cf-stage-dot-lg" style="background:${cfg.color}"></span>
              <span>${cfg.label} · $${cfg.price}/robot</span>
              <span class="cf-stage-range">${cfg.rangeText}</span>
            </div>
            <div class="cf-stage-group-stats">
              <span><strong>${sorted.length}</strong> equipos</span>
              <span><strong>${grpRob}</strong> robots</span>
              <span><strong>${_money(grpRev)}</strong></span>
            </div>
          </div>
          <div class="cf-teams-grid">
            ${sorted.map(_teamCard).join("")}
          </div>
        </div>`;
    }

    bodyEl.innerHTML = html;
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL DE SOLO LECTURA — no muestra Aprobar/Rechazar
     porque estos equipos ya están confirmados (payment_status = verified)
  ══════════════════════════════════════════════════════════════ */
  function _ensureDetailModal() {
    let modal = _el("cfDetailModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "cfDetailModal";
    modal.className = "modal-overlay hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="modal-card modal-lg">
        <div class="modal-head">
          <h3><i class="fas fa-trophy"></i> <span id="cfDetailTitle">Equipo Confirmado</span></h3>
          <button class="modal-close-btn" id="cfDetailCloseBtn" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal-body" id="cfDetailBody" style="max-height:70vh;overflow-y:auto"></div>
        <div class="modal-foot" id="cfDetailFoot">
          <button class="btn btn-secondary" id="cfDetailFootClose">Cerrar</button>
          <button class="btn btn-secondary btn-small" id="cfDetailReceiptBtn" type="button">
            <i class="fas fa-file-invoice"></i> Ver comprobante
          </button>
          <button class="btn btn-secondary btn-small" id="cfDetailWhatsappBtn" type="button">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </button>
          <button class="btn btn-secondary btn-small" id="cfDetailCheckinBtn" type="button">
            <i class="fas fa-qrcode"></i> Ir a Check-in
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) _closeDetail();
    });
    _el("cfDetailCloseBtn").addEventListener("click", _closeDetail);
    _el("cfDetailFootClose").addEventListener("click", _closeDetail);

    return modal;
  }

  function _closeDetail() {
    const modal = _el("cfDetailModal");
    if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
    }
  }

  function openDetail(teamId) {
    const team = (window.allTeams || []).find(
      (t) => Number(t.id) === Number(teamId),
    );
    if (!team) return;

    const modal = _ensureDetailModal();
    const cfg = STAGE_CFG[Number(team.registration_stage)] || STAGE_CFG[1];
    const robots = team.robots || [];
    const members = team.members || [];

    // ── Título ──
    _el("cfDetailTitle").textContent = `${team.folio} · ${cfg.label}`;

    // ── Estado de asistencia ──
    const arrived_n = Number(team.arrived_robots_count || 0);
    const total_r = robots.length;
    let arrivalHtml;
    if (arrived_n >= total_r && total_r > 0) {
      arrivalHtml = `<span style="color:#22d3a0"><i class="fas fa-circle-check"></i> Completo (${arrived_n}/${total_r} robots)</span>`;
    } else if (arrived_n > 0) {
      arrivalHtml = `<span style="color:#f59e0b"><i class="fas fa-circle-half-stroke"></i> Parcial (${arrived_n}/${total_r} robots)</span>`;
    } else if (team.arrived) {
      arrivalHtml = `<span style="color:#22d3a0"><i class="fas fa-circle-check"></i> Llegó (sin desglose por robot)</span>`;
    } else {
      arrivalHtml = `<span style="color:#94a3b8"><i class="fas fa-circle-xmark"></i> Sin registro de llegada (0/${total_r})</span>`;
    }

    // ── Robots ──
    const robotRows = robots.length
      ? robots
          .map((r) => {
            const isArrived =
              r.arrived == 1 ||
              r.arrived === true ||
              r.arrived === "1" ||
              String(r.arrived).toLowerCase() === "true";
            return `
          <div class="cong-edit-row" style="pointer-events:none;opacity:${isArrived ? "1" : "0.55"}">
            <span class="cong-edit-num" style="color:${isArrived ? "#22d3a0" : "#94a3b8"}">
              ${isArrived ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>'}
            </span>
            <span style="flex:1;font-weight:500">${_esc(r.robot_name || "Robot")}</span>
            <span class="cong-edit-badge">${_esc(typeof getCategoryLabel === "function" ? getCategoryLabel(r.category) : r.category || "—")}</span>
          </div>`;
          })
          .join("")
      : '<p class="cong-empty-inline"><i class="fas fa-info-circle"></i> Sin robots registrados.</p>';

    // ── Integrantes ──
    const memberRows = members.length
      ? members
          .map(
            (m) => `
          <div class="cong-edit-row" style="pointer-events:none">
            <span class="cong-edit-num">${m.is_captain ? "★" : "·"}</span>
            <span style="flex:1">${_esc(m.member_name || "—")}</span>
            <span class="cong-edit-badge">${m.is_captain ? "Capitán" : "Integrante"}</span>
          </div>`,
          )
          .join("")
      : '<p class="cong-empty-inline">Sin integrantes registrados.</p>';

    // ── Cuerpo del modal ──
    _el("cfDetailBody").innerHTML = `

      <!-- Capitán -->
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title"><i class="fas fa-user"></i> Capitán / Responsable</h5>
        <div class="cong-modal-user-grid">
          <div class="cong-modal-avatar-col">
            <div class="cong-avatar cong-avatar--xl">${_initials(team.captain_name)}</div>
            <span class="cf-team-badge ${cfg.badgeCls}" style="margin-top:8px">${cfg.label}</span>
          </div>
          <div class="cong-modal-user-info">
            <div class="cong-info-row cong-info-row--name"><strong>${_esc(team.captain_name || "—")}</strong></div>
            ${team.captain_email ? `<div class="cong-info-row"><i class="fas fa-envelope"></i> ${_esc(team.captain_email)}</div>` : ""}
            ${team.captain_phone ? `<div class="cong-info-row"><i class="fas fa-phone"></i> ${_esc(team.captain_phone)}</div>` : ""}
            ${team.school_name ? `<div class="cong-info-row"><i class="fas fa-school"></i> ${_esc(team.school_name)}</div>` : ""}
            ${team.state_name ? `<div class="cong-info-row"><i class="fas fa-map-marker-alt"></i> ${_esc(team.state_name)}${team.country_name ? ", " + _esc(team.country_name) : ""}</div>` : ""}
          </div>
        </div>
      </section>

      <!-- Pago verificado -->
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title"><i class="fas fa-sack-dollar"></i> Pago Verificado ✅</h5>
        <div class="cong-fee-box">
          <div class="cong-fee-row">
            <span>Etapa</span>
            <span>${cfg.label} · $${cfg.price}/robot · ${cfg.rangeText}</span>
          </div>
          <div class="cong-fee-row">
            <span>Robots pagados</span>
            <span>${Number(team.number_of_robots || robots.length)}</span>
          </div>
          <div class="cong-fee-row cong-fee-total">
            <span>Total cobrado</span>
            <strong>${_money(team.total_amount)}</strong>
          </div>
        </div>
        ${
          team.upload_date
            ? `<div class="cong-info-row cong-info-row--muted" style="margin-top:8px">
               <i class="fas fa-calendar-check"></i> Comprobante subido: ${_fmtDate(team.upload_date)}
             </div>`
            : ""
        }
        ${
          team.review_notes
            ? `<div class="cong-admin-note" style="margin-top:8px">
               <i class="fas fa-sticky-note"></i> Nota admin: ${_esc(team.review_notes)}
             </div>`
            : ""
        }
      </section>

      <!-- Asistencia -->
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title"><i class="fas fa-calendar-check"></i> Asistencia (Check-in)</h5>
        <div class="cong-info-row" style="font-size:1rem">${arrivalHtml}</div>
        ${
          team.checkin_at
            ? `<div class="cong-info-row cong-info-row--muted" style="margin-top:6px">
               <i class="fas fa-clock"></i> Registrado: ${_fmtDateTime(team.checkin_at)}
             </div>`
            : ""
        }
      </section>

      <!-- Robots -->
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title">
          <i class="fas fa-robot"></i> Robots inscritos
          <span style="font-weight:400;font-size:.85rem;margin-left:6px;color:var(--text-mute)">
            (verde = llegó al evento)
          </span>
        </h5>
        <div>${robotRows}</div>
      </section>

      <!-- Integrantes -->
      <section class="cong-modal-section">
        <h5 class="cong-modal-section-title"><i class="fas fa-users"></i> Integrantes del equipo</h5>
        <div>${memberRows}</div>
      </section>`;

    // ── Botones del footer ──
    const receiptBtn = _el("cfDetailReceiptBtn");
    receiptBtn.onclick = () => {
      if (typeof openReceipt === "function") openReceipt(team.id);
    };

    const waBtn = _el("cfDetailWhatsappBtn");
    if (team.captain_phone) {
      waBtn.style.display = "";
      waBtn.onclick = () => {
        const phone = String(team.captain_phone).replace(/\D/g, "");
        const full = phone.startsWith("52") ? phone : "52" + phone;
        window.open(`https://wa.me/${full}`, "_blank", "noopener");
      };
    } else {
      waBtn.style.display = "none";
    }

    const checkinBtn = _el("cfDetailCheckinBtn");
    checkinBtn.onclick = () => {
      _closeDetail();
      // Navegar a check-in y prellenar el folio
      if (typeof switchSection === "function") switchSection("checkin");
      setTimeout(() => {
        const folioInput = document.getElementById("scanFolioInput");
        if (folioInput) {
          folioInput.value = team.folio;
          if (typeof handleManualArrival === "function") handleManualArrival();
        }
      }, 300);
    };

    // ── Mostrar ──
    modal.classList.remove("hidden");
    modal.classList.add("show");
  }

  /* ── API pública ── */

  function render() {
    _renderKpis();
    _renderAnalytics();
    _renderTabs();
    _renderBody();
  }

  function switchTab(tab) {
    _currentTab = tab || "all";
    _renderTabs();
    _renderBody();
  }

  function applySearch() {
    const input = _el("confirmedSearchInput");
    _searchQuery = input ? input.value : "";
    _renderBody();
  }

  function reload() {
    if (typeof loadDashboard === "function") loadDashboard();
  }

  function exportCsv() {
    const teams = _filtered();
    if (!teams.length) {
      if (typeof setGlobalStatus === "function")
        setGlobalStatus("No hay equipos para exportar.", "error");
      return;
    }

    const getLabel =
      typeof getCategoryLabel === "function" ? getCategoryLabel : (c) => c;

    const rows = teams.map((t) => {
      const cfg = STAGE_CFG[Number(t.registration_stage)] || STAGE_CFG[1];
      const robots = (t.robots || [])
        .map((r) => r.robot_name + " (" + getLabel(r.category) + ")")
        .join(" | ");
      const members = (t.members || []).map((m) => m.member_name).join(" | ");
      return {
        Folio: t.folio,
        Etapa: cfg.label,
        Capitán: t.captain_name,
        Email: t.captain_email,
        Teléfono: t.captain_phone,
        Escuela: t.school_name,
        Estado: t.state_name,
        País: t.country_name,
        Robots: robots,
        Integrantes: members,
        Total: t.total_amount,
        Asistencia:
          t.arrived || Number(t.arrived_robots_count || 0) > 0 ? "Sí" : "No",
        "Robots llegados": Number(t.arrived_robots_count || 0),
        "Check-in": t.checkin_at
          ? new Date(t.checkin_at).toLocaleString("es-MX")
          : "",
        "Fecha registro": t.created_at
          ? new Date(t.created_at).toLocaleString("es-MX")
          : "",
      };
    });

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          headers
            .map((h) => {
              const v = String(row[h] ?? "");
              return v.includes(",") || v.includes('"') || v.includes("\n")
                ? '"' + v.replace(/"/g, '""') + '"'
                : v;
            })
            .join(","),
        ),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipos_confirmados_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof setGlobalStatus === "function")
      setGlobalStatus("CSV exportado correctamente.", "success");
  }

  return {
    render,
    switchTab,
    applySearch,
    reload,
    openDetail,
    exportCsv,
  };
})();
/* fin de confirmedPanel */
