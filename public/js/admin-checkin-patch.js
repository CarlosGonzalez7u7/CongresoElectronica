/* ═══════════════════════════════════════════════════════════════════
   admin-checkin-patch.js  —  RENOVATEC 2026
   Parche para la sección de Check-in / Registro de Llegadas

   CORRIGE:
   1. Los robots ya confirmados no se muestran marcados al re-escanear
      → se actualiza allTeams en memoria inmediatamente después del save
      → se agrega confirmación antes de desmarcar un robot ya verificado
   2. Aparecen equipos no aceptados en el historial / sección checkin
      → renderHistoryPanel y el checkin filtran solo payment_status="verified"
   3. Layout: botones para vista "Escáner" e "Historial completo" separadas
      dentro de la misma sección #section-checkin

   Cargar AL FINAL del <body>, DESPUÉS de admin.js y admin-improvements.js
   v20260606
═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ──────────────────────────────────────────────────────────────
     UTILIDADES INTERNAS
  ────────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDT(d) {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt)
      ? String(d)
      : dt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  }

  /* ──────────────────────────────────────────────────────────────
     FIX 1-A: Al re-escanear, los checkboxes reflejan el estado
     guardado en allTeams (no en el servidor, que ya cargó).
     Parchamos showRobotCheckinCard para que siempre lea el estado
     actualizado de window.allTeams antes de pintar los checkboxes.
  ────────────────────────────────────────────────────────────── */
  function patchShowRobotCheckinCard() {
    const orig = window.showRobotCheckinCard;
    if (typeof orig !== "function") {
      setTimeout(patchShowRobotCheckinCard, 200);
      return;
    }

    window.showRobotCheckinCard = function showRobotCheckinCardPatched(team) {
      // Sincronizar desde allTeams en memoria (puede tener datos más frescos
      // que el objeto 'team' recibido si saveRobotCheckin ya lo actualizó).
      const fresh = (window.allTeams || []).find(
        (t) => Number(t.id) === Number(team.id),
      );
      const target = fresh || team;
      orig(target);

      // Sobrescribir el manejador del checkbox para pedir confirmación
      // cuando se intenta desmarcar un robot que YA estaba verificado.
      _rebindCheckboxConfirm(target);
    };
  }

  /* ──────────────────────────────────────────────────────────────
     FIX 1-B: Confirmación antes de desmarcar robot ya verificado
  ────────────────────────────────────────────────────────────── */
  function _rebindCheckboxConfirm(team) {
    setTimeout(() => {
      const list = document.getElementById("robotCheckinList");
      if (!list) return;

      list.querySelectorAll(".robot-checkin-toggle").forEach((input) => {
        if (input.dataset._patchBound) return;
        input.dataset._patchBound = "1";

        const robotId = Number(input.dataset.robotId || 0);
        const robot = (team.robots || []).find(
          (r) => Number(r.id) === robotId,
        );
        if (!robot) return;

        const wasVerified =
          robot.arrived == 1 ||
          robot.arrived === true ||
          robot.arrived === "1" ||
          String(robot.arrived).toLowerCase() === "true";

        if (wasVerified) {
          // Marcar visualmente que ya fue verificado
          const label = input.closest("label");
          if (label && !label.querySelector(".already-verified-badge")) {
            const badge = document.createElement("span");
            badge.className = "already-verified-badge";
            badge.innerHTML =
              '<i class="fas fa-circle-check" style="color:#22d3a0;font-size:0.75rem;margin-left:6px;" title="Ya verificado anteriormente"></i>';
            label.appendChild(badge);
          }

          input.addEventListener(
            "change",
            function handleUncheck(e) {
              if (!input.checked) {
                // El usuario está intentando desmarcar
                const robotName =
                  robot.robot_name || "este robot";
                const confirmed = window.confirm(
                  `⚠️ "${robotName}" ya fue verificado como llegado.\n\n¿Estás seguro de quitarle la verificación?\n\nEsto actualizará su estado a "no llegó" al confirmar.`,
                );
                if (!confirmed) {
                  // Revertir — no permitir desmarcar
                  e.preventDefault();
                  input.checked = true;
                }
              }
            },
            false,
          );
        }
      });
    }, 80); // pequeño delay para que el DOM del card esté listo
  }

  /* ──────────────────────────────────────────────────────────────
     FIX 1-C: Después de saveRobotCheckin, actualizar allTeams en
     memoria con los estados merged para que re-escaneando se vean
     los robots ya verificados marcados sin esperar el refresh.
  ────────────────────────────────────────────────────────────── */
  function patchSaveRobotCheckin() {
    const orig = window.saveRobotCheckin;
    if (typeof orig !== "function") {
      setTimeout(patchSaveRobotCheckin, 200);
      return;
    }

    window.saveRobotCheckin = async function saveRobotCheckinPatched() {
      // Capturamos el equipo y los estados actuales ANTES de que orig
      // llame a resetCheckinForNextScan() que limpia selectedCheckinTeam.
      const team = window.selectedCheckinTeam;
      const checkboxes = Array.from(
        document.querySelectorAll(".robot-checkin-toggle"),
      );
      const checkedIds = new Set(
        checkboxes
          .filter((cb) => cb.checked)
          .map((cb) => Number(cb.dataset.robotId || 0)),
      );

      await orig.apply(this, arguments);

      // Si hubo éxito (orig llamó loadDashboard que tarda),
      // actualizamos allTeams en memoria inmediatamente con los estados merged.
      if (team && Array.isArray(window.allTeams)) {
        const idx = window.allTeams.findIndex(
          (t) => Number(t.id) === Number(team.id),
        );
        if (idx !== -1) {
          const updatedRobots = (
            window.allTeams[idx].robots || []
          ).map((r) => {
            const wasArrived =
              r.arrived == 1 ||
              r.arrived === true ||
              r.arrived === "1" ||
              String(r.arrived).toLowerCase() === "true";
            const nowChecked = checkedIds.has(Number(r.id));
            return {
              ...r,
              arrived: wasArrived || nowChecked ? 1 : 0,
            };
          });
          const arrivedCount = updatedRobots.filter((r) => r.arrived).length;
          window.allTeams[idx] = {
            ...window.allTeams[idx],
            robots: updatedRobots,
            arrived: arrivedCount > 0,
            arrived_robots_count: arrivedCount,
          };
        }
      }
    };
  }

  /* ──────────────────────────────────────────────────────────────
     FIX 2: El historial y el checkin solo muestran equipos verified
     Parchamos renderHistoryPanel para filtrar antes de pintar.
  ────────────────────────────────────────────────────────────── */
  function patchRenderHistoryPanel() {
    const orig = window.renderHistoryPanel;
    if (typeof orig !== "function") {
      setTimeout(patchRenderHistoryPanel, 200);
      return;
    }

    window.renderHistoryPanel = function renderHistoryPanelPatched(teams) {
      // Solo equipos aceptados (payment_status verified) con robots
      const verified = (teams || []).filter(
        (t) =>
          t.payment_status === "verified" &&
          Array.isArray(t.robots) &&
          t.robots.length > 0,
      );
      orig(verified);
    };
  }

  /* También parchamos openTeamCheckinByFolio para rechazar no-verified */
  function patchOpenTeamCheckinByFolio() {
    const orig = window.openTeamCheckinByFolio;
    if (typeof orig !== "function") {
      setTimeout(patchOpenTeamCheckinByFolio, 200);
      return;
    }

    window.openTeamCheckinByFolio = async function openTeamCheckinByFolioPatched(folio) {
      // Ejecutamos original (carga datos, muestra card).
      await orig.apply(this, arguments);
      // Si el equipo cargado no es verified, ya orig pone mensaje de error.
      // Aquí solo aseguramos que el historial tampoco lo muestre.
      if (Array.isArray(window.allTeams)) {
        _refreshHistoryView();
      }
    };
  }

  /* ──────────────────────────────────────────────────────────────
     FIX 3: Layout — dos vistas en section-checkin:
     [Escáner / Check-in]  y  [Historial de Llegadas]
     Se inyectan como tabs dentro de la sección existente.
  ────────────────────────────────────────────────────────────── */
  function injectCheckinTabs() {
    const section = document.getElementById("section-checkin");
    if (!section || section.dataset._tabsInjected) return;
    section.dataset._tabsInjected = "1";

    /* ── Estilos ── */
    if (!document.getElementById("checkin-tabs-css")) {
      const style = document.createElement("style");
      style.id = "checkin-tabs-css";
      style.textContent = `
/* ── Tabs de la sección checkin ── */
.ci-tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  border-bottom: 2px solid rgba(148,163,184,.12);
  padding-bottom: 0;
}
.ci-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13.5px;
  font-weight: 700;
  font-family: 'Syne', 'DM Sans', sans-serif;
  color: var(--text-mute, #64748b);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: color .15s, border-color .15s, background .15s;
}
.ci-tab-btn:hover { background: rgba(34,211,238,.05); color: #e2e8f0; }
.ci-tab-btn.active {
  color: #22d3ee;
  border-bottom-color: #22d3ee;
  background: rgba(34,211,238,.07);
}
.ci-tab-btn .ci-tab-badge {
  background: rgba(34,211,238,.18);
  color: #67e8f9;
  border-radius: 99px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
}
.ci-view { display: none; }
.ci-view.active { display: block; }

/* ── Historial expandido ── */
.ci-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.ci-history-header h3 {
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  color: #e2e8f0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ci-history-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.ci-history-filters .form-control {
  min-width: 140px;
  max-width: 200px;
  font-size: 12.5px;
  padding: 7px 10px;
  height: auto;
}

/* ── KPI bar del historial ── */
.ci-kpi-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
@media(max-width:600px){ .ci-kpi-bar { grid-template-columns: repeat(2,1fr); } }
.ci-kpi-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(148,163,184,.1);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.ci-kpi-card:hover { background: rgba(255,255,255,.07); }
.ci-kpi-card.active-filter { border-color: rgba(34,211,238,.5); background: rgba(34,211,238,.06); }
.ci-kpi-icon { font-size: 1.3rem; width: 34px; text-align: center; }
.ci-kpi-val { font-size: 1.4rem; font-weight: 800; font-family: 'Syne', sans-serif; line-height: 1; }
.ci-kpi-label { font-size: 0.7rem; color: var(--text-mute); text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
.ci-kpi-all .ci-kpi-icon  { color: #94a3b8; }
.ci-kpi-ok  .ci-kpi-icon  { color: #22d3a0; }
.ci-kpi-part .ci-kpi-icon { color: #f59e0b; }
.ci-kpi-miss .ci-kpi-icon { color: #f43f5e; }

/* ── Lista del historial expandido ── */
#ci-history-list { display: flex; flex-direction: column; gap: 10px; }
.ci-hist-card {
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(148,163,184,.1);
  border-radius: 14px;
  padding: 14px 16px;
  transition: border-color .15s;
}
.ci-hist-card:hover { border-color: rgba(34,211,238,.25); }
.ci-hist-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.ci-hist-folio {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  color: #e2e8f0;
}
.ci-hist-body {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 4px 12px;
  font-size: 12px;
  color: var(--text-mute);
}
@media(max-width:640px){ .ci-hist-body { grid-template-columns: 1fr 1fr; } }
.ci-hist-body strong { color: #cbd5e1; }
.ci-hist-robots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(148,163,184,.08);
}
.ci-robot-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}
.ci-robot-chip.ok   { background: rgba(34,211,160,.12); color: #6ee7b7; border: 1px solid rgba(34,211,160,.25); }
.ci-robot-chip.miss { background: rgba(244,63,94,.1);   color: #fda4af; border: 1px solid rgba(244,63,94,.2); }
.ci-hist-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid rgba(148,163,184,.1);
  font-size: 0.75rem;
  color: var(--text-mute);
}
.ci-hist-pag-btns { display: flex; gap: 4px; }
.ci-pag-btn {
  min-width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(148,163,184,.15);
  color: #94a3b8;
  cursor: pointer;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ci-pag-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); color: #e2e8f0; }
.ci-pag-btn.active { background: rgba(34,211,238,.15); color: #22d3ee; border-color: rgba(34,211,238,.35); }
.ci-pag-btn:disabled { opacity: .35; cursor: default; }
.ci-hist-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-mute);
  font-size: 0.9rem;
}
.ci-hist-empty i { font-size: 2rem; display: block; margin-bottom: 10px; opacity: .4; }
      `;
      document.head.appendChild(style);
    }

    /* ── Encontrar los elementos originales dentro de section-checkin ── */
    // El contenido del escáner ya existe en el HTML. Lo envolvemos en ci-view.
    const children = Array.from(section.children);

    // Crear wrapper para la vista del escáner
    const scanView = document.createElement("div");
    scanView.className = "ci-view active";
    scanView.id = "ci-view-scan";

    // Crear wrapper para la vista del historial
    const histView = document.createElement("div");
    histView.className = "ci-view";
    histView.id = "ci-view-history";

    // Crear la barra de tabs
    const tabBar = document.createElement("div");
    tabBar.className = "ci-tab-bar";
    tabBar.innerHTML = `
      <button class="ci-tab-btn active" data-ci-tab="scan">
        <i class="fas fa-qrcode"></i> Escanear / Check-in
      </button>
      <button class="ci-tab-btn" data-ci-tab="history">
        <i class="fas fa-list-check"></i> Historial de Llegadas
        <span class="ci-tab-badge" id="ci-history-badge">—</span>
      </button>
    `;

    // Mover todo el contenido actual al scanView
    children.forEach((child) => scanView.appendChild(child));

    // Construir el historyView
    histView.innerHTML = `
      <div class="ci-history-header">
        <h3><i class="fas fa-list-check" style="color:var(--accent,#22d3ee)"></i> Historial de Llegadas</h3>
        <div class="ci-history-filters">
          <div class="search-box" style="min-width:180px">
            <i class="fas fa-search"></i>
            <input type="text" id="ci-hist-search" class="form-control" placeholder="Folio, capitán, escuela…" />
          </div>
          <button class="btn btn-secondary btn-small" onclick="window._ciHistRefresh()">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>
      </div>

      <!-- KPI bar clicable para filtrar -->
      <div class="ci-kpi-bar">
        <div class="ci-kpi-card ci-kpi-all active-filter" data-ci-filter="all">
          <div class="ci-kpi-icon"><i class="fas fa-users"></i></div>
          <div>
            <div class="ci-kpi-val" id="ci-kpi-total">—</div>
            <div class="ci-kpi-label">Total</div>
          </div>
        </div>
        <div class="ci-kpi-card ci-kpi-ok" data-ci-filter="arrived">
          <div class="ci-kpi-icon"><i class="fas fa-check-circle"></i></div>
          <div>
            <div class="ci-kpi-val" id="ci-kpi-arrived">—</div>
            <div class="ci-kpi-label">Llegaron completos</div>
          </div>
        </div>
        <div class="ci-kpi-card ci-kpi-part" data-ci-filter="partial">
          <div class="ci-kpi-icon"><i class="fas fa-circle-half-stroke"></i></div>
          <div>
            <div class="ci-kpi-val" id="ci-kpi-partial">—</div>
            <div class="ci-kpi-label">Parciales</div>
          </div>
        </div>
        <div class="ci-kpi-card ci-kpi-miss" data-ci-filter="missing">
          <div class="ci-kpi-icon"><i class="fas fa-clock"></i></div>
          <div>
            <div class="ci-kpi-val" id="ci-kpi-missing">—</div>
            <div class="ci-kpi-label">Sin llegar</div>
          </div>
        </div>
      </div>

      <div id="ci-history-list">
        <div class="ci-hist-empty"><i class="fas fa-spinner fa-spin"></i> Cargando…</div>
      </div>
      <div class="ci-hist-pagination" id="ci-hist-pag" style="display:none">
        <span id="ci-pag-info"></span>
        <div class="ci-hist-pag-btns" id="ci-pag-btns"></div>
      </div>
    `;

    // Montar todo en la sección
    section.appendChild(tabBar);
    section.appendChild(scanView);
    section.appendChild(histView);

    /* ── Lógica de tabs ── */
    tabBar.querySelectorAll(".ci-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.ciTab;
        tabBar
          .querySelectorAll(".ci-tab-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        section
          .querySelectorAll(".ci-view")
          .forEach((v) => v.classList.remove("active"));
        const view = document.getElementById(`ci-view-${target}`);
        if (view) view.classList.add("active");

        if (target === "history") {
          _ciHistoryRender();
        }
      });
    });

    /* ── Lógica de filtros KPI ── */
    histView.querySelectorAll(".ci-kpi-card").forEach((card) => {
      card.addEventListener("click", () => {
        histView
          .querySelectorAll(".ci-kpi-card")
          .forEach((c) => c.classList.remove("active-filter"));
        card.classList.add("active-filter");
        _ciCurrentFilter = card.dataset.ciFilter || "all";
        _ciHistoryRender();
      });
    });

    /* ── Búsqueda ── */
    const searchInput = histView.querySelector("#ci-hist-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        _ciPage = 1;
        _ciHistoryRender();
      });
    }

    // Exponer función de actualización global
    window._ciHistRefresh = function () {
      if (typeof loadDashboard === "function") {
        loadDashboard().then(() => _ciHistoryRender());
      } else {
        _ciHistoryRender();
      }
    };
  }

  /* ──────────────────────────────────────────────────────────────
     Motor del historial expandido
  ────────────────────────────────────────────────────────────── */
  const CI_PAGE_SIZE = 20;
  let _ciPage = 1;
  let _ciCurrentFilter = "all";
  let _ciData = [];

  function _getArrivalStatus(team) {
    if (typeof window.getArrivalSummary === "function") {
      return window.getArrivalSummary(team).status; // "arrived"|"partial"|"missing"
    }
    const total = (team.robots || []).length;
    const arrived = Number(team.arrived_robots_count || 0);
    if (!total) return "missing";
    if (arrived >= total) return "arrived";
    if (arrived > 0) return "partial";
    if (team.arrived) return "arrived";
    return "missing";
  }

  function _arrivalLabel(status) {
    return { arrived: "Llegó", partial: "Parcial", missing: "Sin llegar" }[
      status
    ] || status;
  }

  function _ciHistoryRender() {
    // Solo equipos verificados con robots
    const base = (window.allTeams || []).filter(
      (t) =>
        t.payment_status === "verified" &&
        Array.isArray(t.robots) &&
        t.robots.length > 0,
    );

    // Contar KPIs
    let nArrived = 0, nPartial = 0, nMissing = 0;
    base.forEach((t) => {
      const s = _getArrivalStatus(t);
      if (s === "arrived") nArrived++;
      else if (s === "partial") nPartial++;
      else nMissing++;
    });

    const kpiTotal   = document.getElementById("ci-kpi-total");
    const kpiArrived = document.getElementById("ci-kpi-arrived");
    const kpiPartial = document.getElementById("ci-kpi-partial");
    const kpiMissing = document.getElementById("ci-kpi-missing");
    const badge      = document.getElementById("ci-history-badge");

    if (kpiTotal)   kpiTotal.textContent   = base.length;
    if (kpiArrived) kpiArrived.textContent = nArrived;
    if (kpiPartial) kpiPartial.textContent = nPartial;
    if (kpiMissing) kpiMissing.textContent = nMissing;
    if (badge)      badge.textContent      = base.length;

    // Filtrar por KPI seleccionado
    let filtered = base;
    if (_ciCurrentFilter !== "all") {
      filtered = base.filter((t) => _getArrivalStatus(t) === _ciCurrentFilter);
    }

    // Filtrar por búsqueda
    const searchVal = (
      document.getElementById("ci-hist-search")?.value || ""
    )
      .trim()
      .toLowerCase();
    if (searchVal) {
      filtered = filtered.filter((t) => {
        const robots = (t.robots || []).map((r) => r.robot_name || "").join(" ");
        return `${t.folio} ${t.captain_name || ""} ${t.school_name || ""} ${robots}`
          .toLowerCase()
          .includes(searchVal);
      });
    }

    // Ordenar: los que llegaron más reciente primero; los sin llegar al final
    filtered.sort((a, b) => {
      const sa = _getArrivalStatus(a), sb = _getArrivalStatus(b);
      const order = { arrived: 0, partial: 1, missing: 2 };
      const oa = order[sa] ?? 3, ob = order[sb] ?? 3;
      if (oa !== ob) return oa - ob;
      return new Date(b.checkin_at || 0) - new Date(a.checkin_at || 0);
    });

    _ciData = filtered;

    // Paginación
    const totalPages = Math.max(1, Math.ceil(filtered.length / CI_PAGE_SIZE));
    if (_ciPage > totalPages) _ciPage = totalPages;
    const start = (_ciPage - 1) * CI_PAGE_SIZE;
    const slice = filtered.slice(start, start + CI_PAGE_SIZE);

    const listEl = document.getElementById("ci-history-list");
    if (!listEl) return;

    if (!slice.length) {
      listEl.innerHTML = `<div class="ci-hist-empty"><i class="fas fa-inbox"></i>Sin equipos para estos filtros.</div>`;
      document.getElementById("ci-hist-pag").style.display = "none";
      return;
    }

    listEl.innerHTML = slice.map(_ciHistCard).join("");
    _ciRenderPagination(filtered.length, totalPages);
  }

  function _ciHistCard(team) {
    const status  = _getArrivalStatus(team);
    const label   = _arrivalLabel(status);
    const stageNum= Number(team.registration_stage || 0);
    const stageMap= { 1: "E1", 2: "E2", 3: "E3" };
    const stateMap= { 1: "stage1", 2: "stage2", 3: "stage3" };
    const stageShort = stageMap[stageNum] || "?";
    const stageCls   = stateMap[stageNum] || "";

    const arrived_n = Number(team.arrived_robots_count || 0);
    const total_r   = (team.robots || []).length;

    const statusColors = {
      arrived: "#22d3a0",
      partial: "#f59e0b",
      missing: "#f43f5e",
    };
    const statusIcons = {
      arrived: "fa-check-circle",
      partial: "fa-circle-half-stroke",
      missing: "fa-clock",
    };

    const robotChips = (team.robots || [])
      .map((r) => {
        const ok =
          r.arrived == 1 ||
          r.arrived === true ||
          r.arrived === "1" ||
          String(r.arrived).toLowerCase() === "true";
        const icon = ok ? "fa-check" : "fa-xmark";
        return `<span class="ci-robot-chip ${ok ? "ok" : "miss"}"><i class="fas ${icon}"></i>${esc(r.robot_name || "Robot")}</span>`;
      })
      .join("");

    return `
      <div class="ci-hist-card">
        <div class="ci-hist-head">
          <span class="ci-hist-folio">${esc(team.folio || "—")}</span>
          <span class="stage-chip ${stageCls}">${stageShort}</span>
          <span class="attendance-chip ${status}" style="display:inline-flex;align-items:center;gap:5px;">
            <i class="fas ${statusIcons[status] || "fa-circle"}" style="color:${statusColors[status] || "#94a3b8"}"></i>
            ${label}
          </span>
          ${team.checkin_at ? `<span style="font-size:11px;color:var(--text-mute);margin-left:auto;">${fmtDT(team.checkin_at)}</span>` : ""}
        </div>
        <div class="ci-hist-body">
          <span><strong>Capitán:</strong> ${esc(team.captain_name || "—")}</span>
          <span><strong>Escuela:</strong> ${esc(team.school_name || "—")}</span>
          <span><strong>Robots:</strong> ${arrived_n}/${total_r}</span>
        </div>
        ${robotChips ? `<div class="ci-hist-robots">${robotChips}</div>` : ""}
      </div>
    `;
  }

  function _ciRenderPagination(total, totalPages) {
    const pagEl  = document.getElementById("ci-hist-pag");
    const infoEl = document.getElementById("ci-pag-info");
    const btnsEl = document.getElementById("ci-pag-btns");
    if (!pagEl) return;

    if (totalPages <= 1) {
      pagEl.style.display = "none";
      return;
    }
    pagEl.style.display = "flex";

    const from = (_ciPage - 1) * CI_PAGE_SIZE + 1;
    const to   = Math.min(_ciPage * CI_PAGE_SIZE, total);
    if (infoEl) infoEl.textContent = `Mostrando ${from}–${to} de ${total} equipos`;

    // Páginas a mostrar
    let pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages = [1];
      const around = [_ciPage - 1, _ciPage, _ciPage + 1].filter(
        (p) => p > 1 && p < totalPages,
      );
      if (around[0] > 2) pages.push("…");
      pages = pages.concat(around);
      if (around[around.length - 1] < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }

    btnsEl.innerHTML = `
      <button class="ci-pag-btn" id="ci-pag-prev" ${_ciPage === 1 ? "disabled" : ""}>
        <i class="fas fa-chevron-left"></i>
      </button>
      ${pages
        .map((p) =>
          p === "…"
            ? `<button class="ci-pag-btn" disabled>…</button>`
            : `<button class="ci-pag-btn ${p === _ciPage ? "active" : ""}" data-ci-goto="${p}">${p}</button>`,
        )
        .join("")}
      <button class="ci-pag-btn" id="ci-pag-next" ${_ciPage === totalPages ? "disabled" : ""}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    btnsEl.querySelector("#ci-pag-prev")?.addEventListener("click", () => {
      _ciPage--;
      _ciHistoryRender();
      document.getElementById("ci-view-history")?.scrollIntoView({ behavior: "smooth" });
    });
    btnsEl.querySelector("#ci-pag-next")?.addEventListener("click", () => {
      _ciPage++;
      _ciHistoryRender();
      document.getElementById("ci-view-history")?.scrollIntoView({ behavior: "smooth" });
    });
    btnsEl.querySelectorAll("[data-ci-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        _ciPage = parseInt(btn.dataset.ciGoto);
        _ciHistoryRender();
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────
     Helper: re-renderizar historial si está visible
  ────────────────────────────────────────────────────────────── */
  function _refreshHistoryView() {
    const view = document.getElementById("ci-view-history");
    if (view && view.classList.contains("active")) {
      _ciHistoryRender();
    }
  }

  /* ──────────────────────────────────────────────────────────────
     Parchamos loadDashboard para actualizar el historial
  ────────────────────────────────────────────────────────────── */
  function patchLoadDashboard() {
    const orig = window.loadDashboard;
    if (typeof orig !== "function") {
      setTimeout(patchLoadDashboard, 300);
      return;
    }
    window.loadDashboard = async function loadDashboardPatched() {
      await orig.apply(this, arguments);
      _refreshHistoryView();
      // Actualizar badge del tab historial
      const badge = document.getElementById("ci-history-badge");
      if (badge) {
        const count = (window.allTeams || []).filter(
          (t) =>
            t.payment_status === "verified" &&
            Array.isArray(t.robots) &&
            t.robots.length > 0,
        ).length;
        badge.textContent = count || "—";
      }
    };
  }

  /* ──────────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────────── */
  function init() {
    patchShowRobotCheckinCard();
    patchSaveRobotCheckin();
    patchRenderHistoryPanel();
    patchOpenTeamCheckinByFolio();
    patchLoadDashboard();
    injectCheckinTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM ya listo, esperar un tick para que admin.js termine
    setTimeout(init, 0);
  }
})();
