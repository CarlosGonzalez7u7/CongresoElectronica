/**
 * admin-institutions.js — RENOVATEC 2026
 * Módulo de administración del catálogo de instituciones.
 * Trabaja con los datos locales de escuelas-data.js y también
 * consulta/guarda en el servidor vía API.
 * v20260507
 */

const institutionsModule = (() => {
  // ── Estado interno ────────────────────────────────────────────────────────
  let _allInstitutions = []; // copia de trabajo del catálogo
  let _filtered = [];
  let _page = 1;
  const PER_PAGE = 20;

  let _filterCountry = "all";
  let _filterType = "all"; // all | universidad | preparatoria
  let _filterStatus = "all"; // all | verified | proposed
  let _searchQuery = "";

  // Países con bandera (usamos el catálogo de PhoneField si está disponible,
  // o una lista básica de fallback)
  const COUNTRY_FLAGS = {
    México: "🇲🇽",
    "Estados Unidos": "🇺🇸",
    Canadá: "🇨🇦",
    Guatemala: "🇬🇹",
    Belice: "🇧🇿",
    "El Salvador": "🇸🇻",
    Honduras: "🇭🇳",
    Nicaragua: "🇳🇮",
    "Costa Rica": "🇨🇷",
    Panamá: "🇵🇦",
    Colombia: "🇨🇴",
    Venezuela: "🇻🇪",
    Ecuador: "🇪🇨",
    Perú: "🇵🇪",
    Bolivia: "🇧🇴",
    Chile: "🇨🇱",
    Argentina: "🇦🇷",
    Uruguay: "🇺🇾",
    Paraguay: "🇵🇾",
    Brasil: "🇧🇷",
    España: "🇪🇸",
    Alemania: "🇩🇪",
    Francia: "🇫🇷",
    "Reino Unido": "🇬🇧",
    Italia: "🇮🇹",
    Japón: "🇯🇵",
    China: "🇨🇳",
    India: "🇮🇳",
  };

  function _flag(country) {
    return COUNTRY_FLAGS[country] || "🏳️";
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  async function _loadData() {
    // 1. Cargar catálogo local desde escuelas-data.js
    let local = [];
    if (typeof INSTITUTIONS_CATALOG !== "undefined") {
      local = INSTITUTIONS_CATALOG.map((inst, idx) => ({
        id: `local_${idx}`,
        ...inst,
        is_verified: !inst.proposed,
        times_used: 0,
        source: "local",
      }));
    }

    // 2. Intentar cargar desde API del servidor
    try {
      const res = await fetch("/api/institutions?admin=1", {
        headers: { "X-Admin": "1" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.institutions)) {
          // Mezclar: el servidor tiene prioridad sobre duplicados locales
          const serverNames = new Set(
            data.institutions.map((i) => i.name.toLowerCase()),
          );
          const uniqueLocal = local.filter(
            (l) => !serverNames.has(l.name.toLowerCase()),
          );
          _allInstitutions = [...data.institutions, ...uniqueLocal];
          return;
        }
      }
    } catch (_) {
      // Servidor no disponible: trabajamos solo con datos locales
    }

    _allInstitutions = local;
  }

  // ── Filtrado y render ─────────────────────────────────────────────────────

  function _applyFilters() {
    const q = _searchQuery.toLowerCase();
    _filtered = _allInstitutions.filter((inst) => {
      if (_filterCountry !== "all" && inst.country !== _filterCountry)
        return false;
      if (_filterType !== "all" && inst.type !== _filterType) return false;
      if (_filterStatus === "verified" && !inst.is_verified) return false;
      if (_filterStatus === "proposed" && inst.is_verified) return false;
      if (
        q &&
        !inst.name.toLowerCase().includes(q) &&
        !(inst.state || "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    _page = 1;
    _renderTable();
    _renderPagination();
    _updateKPIs();
  }

  function _renderTable() {
    const tbody = document.getElementById("instTableBody");
    const count = document.getElementById("instTableCount");
    if (!tbody) return;

    const start = (_page - 1) * PER_PAGE;
    const slice = _filtered.slice(start, start + PER_PAGE);

    if (count)
      count.textContent = `${_filtered.length} resultado${_filtered.length !== 1 ? "s" : ""}`;

    if (slice.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="inst-table-empty">
        <i class="fas fa-search"></i> Sin resultados con los filtros actuales
      </td></tr>`;
      return;
    }

    tbody.innerHTML = slice
      .map((inst) => {
        const typeBadge =
          inst.type === "universidad"
            ? `<span class="inst-badge inst-badge-uni"><i class="fas fa-graduation-cap"></i> Universidad</span>`
            : `<span class="inst-badge inst-badge-pre"><i class="fas fa-school"></i> Preparatoria</span>`;

        const statusBadge = inst.is_verified
          ? `<span class="inst-badge inst-badge-verified"><i class="fas fa-check"></i> Verificada</span>`
          : `<span class="inst-badge inst-badge-proposed"><i class="fas fa-clock"></i> Por revisar</span>`;

        return `<tr class="${!inst.is_verified ? "inst-row-proposed" : ""}">
        <td class="inst-cell-name">
          <span class="inst-name">${inst.name}</span>
          ${inst.proposed ? `<span class="inst-proposed-by"><i class="fas fa-user-plus"></i> Propuesta por usuario</span>` : ""}
        </td>
        <td>${typeBadge}</td>
        <td>
          <span class="inst-country-cell">
            <span class="inst-flag">${_flag(inst.country)}</span>
            <span>${inst.country}</span>
          </span>
        </td>
        <td>${inst.state || `<em style="color:var(--text-mute)">—</em>`}</td>
        <td>
          <span class="inst-usage-chip">${inst.times_used || 0}</span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="inst-action-btns">
            ${
              !inst.is_verified
                ? `
              <button class="btn btn-small inst-btn-verify" title="Verificar" onclick="institutionsModule.verify('${inst.id}')">
                <i class="fas fa-check"></i>
              </button>`
                : ""
            }
            <button class="btn btn-small inst-btn-edit" title="Editar" onclick="institutionsModule.openModal('${inst.id}')">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-small inst-btn-delete" title="Eliminar" onclick="institutionsModule.deleteInstitution('${inst.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  }

  function _renderPagination() {
    const bar = document.getElementById("instPaginationBar");
    if (!bar) return;
    const totalPages = Math.ceil(_filtered.length / PER_PAGE);
    if (totalPages <= 1) {
      bar.innerHTML = "";
      return;
    }

    let btns = "";
    for (let i = 1; i <= totalPages; i++) {
      btns += `<button class="inst-page-btn${i === _page ? " active" : ""}" onclick="institutionsModule.goToPage(${i})">${i}</button>`;
    }
    bar.innerHTML = `
      <button class="inst-page-btn" onclick="institutionsModule.goToPage(${_page - 1})" ${_page === 1 ? "disabled" : ""}>
        <i class="fas fa-chevron-left"></i>
      </button>
      ${btns}
      <button class="inst-page-btn" onclick="institutionsModule.goToPage(${_page + 1})" ${_page === totalPages ? "disabled" : ""}>
        <i class="fas fa-chevron-right"></i>
      </button>`;
  }

  function _updateKPIs() {
    const verified = _allInstitutions.filter((i) => i.is_verified).length;
    const proposed = _allInstitutions.filter((i) => !i.is_verified).length;
    const unis = _allInstitutions.filter(
      (i) => i.type === "universidad",
    ).length;
    const preps = _allInstitutions.filter(
      (i) => i.type === "preparatoria",
    ).length;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("instKpiVerified", verified);
    set("instKpiProposed", proposed);
    set("instKpiUniversities", unis);
    set("instKpiPreparatories", preps);
  }

  // ── Botones de país (filter bar) ──────────────────────────────────────────

  function _buildCountryButtons() {
    const wrap = document.getElementById("instCountryBtnGroup");
    if (!wrap) return;

    const countries = [
      ...new Set(_allInstitutions.map((i) => i.country)),
    ].sort();

    wrap.innerHTML = `
      <button class="inst-filter-btn active" data-inst-country="all" type="button">
        🌐 Todos
      </button>
      ${countries
        .map(
          (c) => `
        <button class="inst-filter-btn" data-inst-country="${c}" type="button">
          ${_flag(c)} ${c}
        </button>`,
        )
        .join("")}`;

    wrap.querySelectorAll("[data-inst-country]").forEach((btn) => {
      btn.addEventListener("click", () => {
        wrap
          .querySelectorAll("[data-inst-country]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _filterCountry = btn.dataset.instCountry;
        _applyFilters();
      });
    });
  }

  // ── Modal agregar / editar ────────────────────────────────────────────────

  // Lista de países para el selector del modal
  const MODAL_COUNTRIES = [
    { name: "México", flag: "🇲🇽" },
    { name: "Estados Unidos", flag: "🇺🇸" },
    { name: "Canadá", flag: "🇨🇦" },
    { name: "Guatemala", flag: "🇬🇹" },
    { name: "Belice", flag: "🇧🇿" },
    { name: "El Salvador", flag: "🇸🇻" },
    { name: "Honduras", flag: "🇭🇳" },
    { name: "Nicaragua", flag: "🇳🇮" },
    { name: "Costa Rica", flag: "🇨🇷" },
    { name: "Panamá", flag: "🇵🇦" },
    { name: "Colombia", flag: "🇨🇴" },
    { name: "Venezuela", flag: "🇻🇪" },
    { name: "Perú", flag: "🇵🇪" },
    { name: "Chile", flag: "🇨🇱" },
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Brasil", flag: "🇧🇷" },
    { name: "España", flag: "🇪🇸" },
    { name: "Alemania", flag: "🇩🇪" },
    { name: "Francia", flag: "🇫🇷" },
    { name: "Reino Unido", flag: "🇬🇧" },
    { name: "Japón", flag: "🇯🇵" },
    { name: "Otro", flag: "🏳️" },
  ];

  function _initModalCountryDropdown() {
    const list = document.getElementById("instFormCountryList");
    const btn = document.getElementById("instFormCountryBtn");
    const ddl = document.getElementById("instFormCountryDdl");
    const search = document.getElementById("instFormCountrySearch");
    const hiddenInput = document.getElementById("instFormCountry");
    if (!list || !btn || !ddl) return;

    function renderList(q = "") {
      const filtered = MODAL_COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()),
      );
      list.innerHTML = filtered
        .map(
          (c) => `
        <li class="pf-country-item" data-country="${c.name}">
          <span class="pf-flag">${c.flag}</span>
          <span class="pf-country-name">${c.name}</span>
        </li>`,
        )
        .join("");
      list.querySelectorAll(".pf-country-item").forEach((li) => {
        li.addEventListener("click", () => {
          const c = MODAL_COUNTRIES.find((x) => x.name === li.dataset.country);
          document.getElementById("instFormCountryFlag").textContent = c
            ? c.flag
            : "🌐";
          document.getElementById("instFormCountryName").textContent =
            li.dataset.country;
          hiddenInput.value = li.dataset.country;
          ddl.style.display = "none";
        });
      });
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = ddl.style.display !== "none";
      ddl.style.display = open ? "none" : "block";
      if (!open && search) {
        search.value = "";
        renderList();
        search.focus();
      }
    });

    if (search)
      search.addEventListener("input", () => renderList(search.value));
    document.addEventListener("click", (e) => {
      if (ddl && !btn.closest("[id]").contains(e.target))
        ddl.style.display = "none";
    });

    renderList();
  }

  function openModal(id = null) {
    const modal = document.getElementById("instModal");
    const title = document.getElementById("instModalTitle");
    if (!modal) return;

    _initModalCountryDropdown();

    if (id) {
      const inst = _allInstitutions.find(
        (i) => i.id === id || String(i.id) === String(id),
      );
      if (!inst) return;
      title.innerHTML = `<i class="fas fa-pen"></i> Editar institución`;
      document.getElementById("instFormId").value = inst.id;
      document.getElementById("instFormName").value = inst.name;
      document.getElementById("instFormState").value = inst.state || "";
      document.getElementById("instFormCountry").value = inst.country;
      document.getElementById("instFormCountryName").textContent = inst.country;
      document.getElementById("instFormCountryFlag").textContent = _flag(
        inst.country,
      );
      document.getElementById("instFormVerified").checked = !!inst.is_verified;
      document.querySelectorAll("[name='instFormType']").forEach((radio) => {
        radio.checked = radio.value === inst.type;
      });
    } else {
      title.innerHTML = `<i class="fas fa-university"></i> Nueva institución`;
      document.getElementById("instFormId").value = "";
      document.getElementById("instFormName").value = "";
      document.getElementById("instFormState").value = "";
      document.getElementById("instFormCountry").value = "México";
      document.getElementById("instFormCountryName").textContent = "México";
      document.getElementById("instFormCountryFlag").textContent = "🇲🇽";
      document.getElementById("instFormVerified").checked = true;
      document.querySelector(
        "[name='instFormType'][value='universidad']",
      ).checked = true;
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    const modal = document.getElementById("instModal");
    if (modal) modal.classList.add("hidden");
  }

  async function saveFromModal() {
    const name = document.getElementById("instFormName").value.trim();
    const country = document.getElementById("instFormCountry").value;
    const state = document.getElementById("instFormState").value.trim();
    const type =
      document.querySelector("[name='instFormType']:checked")?.value ||
      "universidad";
    const is_verified = document.getElementById("instFormVerified").checked;
    const id = document.getElementById("instFormId").value;

    if (!name) {
      alert("El nombre de la institución es requerido.");
      return;
    }
    if (!country) {
      alert("Selecciona un país.");
      return;
    }

    const payload = { name, country, state, type, is_verified };

    // Intentar guardar en servidor
    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/institutions/${id}` : "/api/institutions";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        // Actualizar en catálogo local también
        if (typeof INSTITUTIONS_CATALOG !== "undefined") {
          if (id) {
            const idx = INSTITUTIONS_CATALOG.findIndex(
              (i) => String(i.id) === String(id),
            );
            if (idx >= 0)
              INSTITUTIONS_CATALOG[idx] = {
                ...INSTITUTIONS_CATALOG[idx],
                ...payload,
              };
          } else {
            INSTITUTIONS_CATALOG.push(payload);
          }
        }
        closeModal();
        await reload();
        return;
      }
    } catch (_) {}

    // Fallback: solo local
    if (id) {
      const idx = _allInstitutions.findIndex(
        (i) => String(i.id) === String(id),
      );
      if (idx >= 0)
        _allInstitutions[idx] = { ..._allInstitutions[idx], ...payload };
      // Sincronizar también en INSTITUTIONS_CATALOG global
      if (typeof INSTITUTIONS_CATALOG !== "undefined") {
        const gIdx = INSTITUTIONS_CATALOG.findIndex(
          (i) => i.name === _allInstitutions[idx].name,
        );
        if (gIdx >= 0) Object.assign(INSTITUTIONS_CATALOG[gIdx], payload);
      }
    } else {
      const newInst = {
        id: `local_${Date.now()}`,
        ...payload,
        times_used: 0,
        source: "local",
      };
      _allInstitutions.unshift(newInst);
      if (typeof INSTITUTIONS_CATALOG !== "undefined")
        INSTITUTIONS_CATALOG.push(payload);
    }

    closeModal();
    _applyFilters();
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function verify(id) {
    const inst = _allInstitutions.find((i) => String(i.id) === String(id));
    if (!inst) return;
    inst.is_verified = true;

    try {
      await fetch(`/api/institutions/${id}/verify`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch (_) {}

    _applyFilters();
  }

  async function deleteInstitution(id) {
    const inst = _allInstitutions.find((i) => String(i.id) === String(id));
    if (!inst) return;
    if (!confirm(`¿Eliminar "${inst.name}"? Esta acción no se puede deshacer.`))
      return;

    try {
      await fetch(`/api/institutions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (_) {}

    _allInstitutions = _allInstitutions.filter(
      (i) => String(i.id) !== String(id),
    );
    _applyFilters();
  }

  function goToPage(p) {
    const totalPages = Math.ceil(_filtered.length / PER_PAGE);
    if (p < 1 || p > totalPages) return;
    _page = p;
    _renderTable();
    _renderPagination();
    document
      .getElementById("instTable")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function reload() {
    await _loadData();
    _buildCountryButtons();
    _applyFilters();
  }

  function init() {
    // Search input
    const search = document.getElementById("instSearchInput");
    if (search) {
      search.addEventListener("input", () => {
        _searchQuery = search.value;
        _applyFilters();
      });
    }

    // Filtros tipo
    document.querySelectorAll("[data-inst-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-inst-type]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _filterType = btn.dataset.instType;
        _applyFilters();
      });
    });

    // Filtros status
    document.querySelectorAll("[data-inst-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-inst-status]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        _filterStatus = btn.dataset.instStatus;
        _applyFilters();
      });
    });

    // Botón agregar
    const addBtn = document.getElementById("instAddBtn");
    if (addBtn) addBtn.addEventListener("click", () => openModal());

    reload();
  }

  return {
    init,
    reload,
    openModal,
    closeModal,
    saveFromModal,
    verify,
    deleteInstitution,
    goToPage,
  };
})();

// Auto-init cuando cargue la sección
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("section-institutions")) {
    institutionsModule.init();
  }
});
