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

  // Lista global de países con banderas (200+)
  const WORLD_COUNTRIES = [
    { name: "Afganistán", flag: "🇦🇫" },
    { name: "Albania", flag: "🇦🇱" },
    { name: "Alemania", flag: "🇩🇪" },
    { name: "Andorra", flag: "🇦🇩" },
    { name: "Angola", flag: "🇦🇴" },
    { name: "Antigua y Barbuda", flag: "🇦🇬" },
    { name: "Arabia Saudita", flag: "🇸🇦" },
    { name: "Argelia", flag: "🇩🇿" },
    { name: "Argentina", flag: "🇦🇷" },
    { name: "Armenia", flag: "🇦🇲" },
    { name: "Australia", flag: "🇦🇺" },
    { name: "Austria", flag: "🇦🇹" },
    { name: "Azerbaiyán", flag: "🇦🇿" },
    { name: "Bahamas", flag: "🇧🇸" },
    { name: "Bangladés", flag: "🇧🇩" },
    { name: "Barbados", flag: "🇧🇧" },
    { name: "Baréin", flag: "🇧🇭" },
    { name: "Bélgica", flag: "🇧🇪" },
    { name: "Belice", flag: "🇧🇿" },
    { name: "Benín", flag: "🇧🇯" },
    { name: "Bielorrusia", flag: "🇧🇾" },
    { name: "Birmania", flag: "🇲🇲" },
    { name: "Bolivia", flag: "🇧🇴" },
    { name: "Bosnia y Herzegovina", flag: "🇧🇦" },
    { name: "Botsuana", flag: "🇧🇼" },
    { name: "Brasil", flag: "🇧🇷" },
    { name: "Brunéi", flag: "🇧🇳" },
    { name: "Bulgaria", flag: "🇧🇬" },
    { name: "Burkina Faso", flag: "🇧🇫" },
    { name: "Burundi", flag: "🇧🇮" },
    { name: "Bután", flag: "🇧🇹" },
    { name: "Cabo Verde", flag: "🇨🇻" },
    { name: "Camboya", flag: "🇰🇭" },
    { name: "Camerún", flag: "🇨🇲" },
    { name: "Canadá", flag: "🇨🇦" },
    { name: "Catar", flag: "🇶🇦" },
    { name: "Chad", flag: "🇹🇩" },
    { name: "Chile", flag: "🇨🇱" },
    { name: "China", flag: "🇨🇳" },
    { name: "Chipre", flag: "🇨🇾" },
    { name: "Colombia", flag: "🇨🇴" },
    { name: "Comoras", flag: "🇰🇲" },
    { name: "Corea del Norte", flag: "🇰🇵" },
    { name: "Corea del Sur", flag: "🇰🇷" },
    { name: "Costa de Marfil", flag: "🇨🇮" },
    { name: "Costa Rica", flag: "🇨🇷" },
    { name: "Croacia", flag: "🇭🇷" },
    { name: "Cuba", flag: "🇨🇺" },
    { name: "Dinamarca", flag: "🇩🇰" },
    { name: "Dominica", flag: "🇩🇲" },
    { name: "Ecuador", flag: "🇪🇨" },
    { name: "Egipto", flag: "🇪🇬" },
    { name: "El Salvador", flag: "🇸🇻" },
    { name: "Emiratos Árabes Unidos", flag: "🇦🇪" },
    { name: "Eritrea", flag: "🇪🇷" },
    { name: "Eslovaquia", flag: "🇸🇰" },
    { name: "Eslovenia", flag: "🇸🇮" },
    { name: "España", flag: "🇪🇸" },
    { name: "Estados Unidos", flag: "🇺🇸" },
    { name: "Estonia", flag: "🇪🇪" },
    { name: "Esuatini", flag: "🇸🇿" },
    { name: "Etiopía", flag: "🇪🇹" },
    { name: "Filipinas", flag: "🇵🇭" },
    { name: "Finlandia", flag: "🇫🇮" },
    { name: "Fiyi", flag: "🇫🇯" },
    { name: "Francia", flag: "🇫🇷" },
    { name: "Gabón", flag: "🇬🇦" },
    { name: "Gambia", flag: "🇬🇲" },
    { name: "Georgia", flag: "🇬🇪" },
    { name: "Ghana", flag: "🇬🇭" },
    { name: "Granada", flag: "🇬🇩" },
    { name: "Grecia", flag: "🇬🇷" },
    { name: "Guatemala", flag: "🇬🇹" },
    { name: "Guinea", flag: "🇬🇳" },
    { name: "Guinea Ecuatorial", flag: "🇬🇶" },
    { name: "Guinea-Bisáu", flag: "🇬🇼" },
    { name: "Guyana", flag: "🇬🇾" },
    { name: "Haití", flag: "🇭🇹" },
    { name: "Honduras", flag: "🇭🇳" },
    { name: "Hungría", flag: "🇭🇺" },
    { name: "India", flag: "🇮🇳" },
    { name: "Indonesia", flag: "🇮🇩" },
    { name: "Irak", flag: "🇮🇶" },
    { name: "Irán", flag: "🇮🇷" },
    { name: "Irlanda", flag: "🇮🇪" },
    { name: "Islandia", flag: "🇮🇸" },
    { name: "Islas Marshall", flag: "🇲🇭" },
    { name: "Islas Salomón", flag: "🇸🇧" },
    { name: "Israel", flag: "🇮🇱" },
    { name: "Italia", flag: "🇮🇹" },
    { name: "Jamaica", flag: "🇯🇲" },
    { name: "Japón", flag: "🇯🇵" },
    { name: "Jordania", flag: "🇯🇴" },
    { name: "Kazajistán", flag: "🇰🇿" },
    { name: "Kenia", flag: "🇰🇪" },
    { name: "Kirguistán", flag: "🇰🇬" },
    { name: "Kiribati", flag: "🇰🇮" },
    { name: "Kuwait", flag: "🇰🇼" },
    { name: "Laos", flag: "🇱🇦" },
    { name: "Lesoto", flag: "🇱🇸" },
    { name: "Letonia", flag: "🇱🇻" },
    { name: "Líbano", flag: "🇱🇧" },
    { name: "Liberia", flag: "🇱🇷" },
    { name: "Libia", flag: "🇱🇾" },
    { name: "Liechtenstein", flag: "🇱🇮" },
    { name: "Lituania", flag: "🇱🇹" },
    { name: "Luxemburgo", flag: "🇱🇺" },
    { name: "Macedonia del Norte", flag: "🇲🇰" },
    { name: "Madagascar", flag: "🇲🇬" },
    { name: "Malasia", flag: "🇲🇾" },
    { name: "Malaui", flag: "🇲🇼" },
    { name: "Maldivas", flag: "🇲🇻" },
    { name: "Malí", flag: "🇲🇱" },
    { name: "Malta", flag: "🇲🇹" },
    { name: "Marruecos", flag: "🇲🇦" },
    { name: "Mauricio", flag: "🇲🇺" },
    { name: "Mauritania", flag: "🇲🇷" },
    { name: "México", flag: "🇲🇽" },
    { name: "Micronesia", flag: "🇫🇲" },
    { name: "Moldavia", flag: "🇲🇩" },
    { name: "Mónaco", flag: "🇲🇨" },
    { name: "Mongolia", flag: "🇲🇳" },
    { name: "Montenegro", flag: "🇲🇪" },
    { name: "Mozambique", flag: "🇲🇿" },
    { name: "Namibia", flag: "🇳🇦" },
    { name: "Nauru", flag: "🇳🇷" },
    { name: "Nepal", flag: "🇳🇵" },
    { name: "Nicaragua", flag: "🇳🇮" },
    { name: "Níger", flag: "🇳🇪" },
    { name: "Nigeria", flag: "🇳🇬" },
    { name: "Noruega", flag: "🇳🇴" },
    { name: "Nueva Zelanda", flag: "🇳🇿" },
    { name: "Omán", flag: "🇴🇲" },
    { name: "Países Bajos", flag: "🇳🇱" },
    { name: "Pakistán", flag: "🇵🇰" },
    { name: "Palaos", flag: "🇵🇼" },
    { name: "Panamá", flag: "🇵🇦" },
    { name: "Papúa Nueva Guinea", flag: "🇵🇬" },
    { name: "Paraguay", flag: "🇵🇾" },
    { name: "Perú", flag: "🇵🇪" },
    { name: "Polonia", flag: "🇵🇱" },
    { name: "Portugal", flag: "🇵🇹" },
    { name: "Reino Unido", flag: "🇬🇧" },
    { name: "República Centroafricana", flag: "🇨🇫" },
    { name: "República Checa", flag: "🇨🇿" },
    { name: "República del Congo", flag: "🇨🇬" },
    { name: "República Democrática del Congo", flag: "🇨🇩" },
    { name: "República Dominicana", flag: "🇩🇴" },
    { name: "Ruanda", flag: "🇷🇼" },
    { name: "Rumania", flag: "🇷🇴" },
    { name: "Rusia", flag: "🇷🇺" },
    { name: "Samoa", flag: "🇼🇸" },
    { name: "San Cristóbal y Nieves", flag: "🇰🇳" },
    { name: "San Marino", flag: "🇸🇲" },
    { name: "San Vicente y las Granadinas", flag: "🇻🇨" },
    { name: "Santa Lucía", flag: "🇱🇨" },
    { name: "Santo Tomé y Príncipe", flag: "🇸🇹" },
    { name: "Senegal", flag: "🇸🇳" },
    { name: "Serbia", flag: "🇷🇸" },
    { name: "Seychelles", flag: "🇸🇨" },
    { name: "Sierra Leona", flag: "🇸🇱" },
    { name: "Singapur", flag: "🇸🇬" },
    { name: "Siria", flag: "🇸🇾" },
    { name: "Somalia", flag: "🇸🇴" },
    { name: "Sri Lanka", flag: "🇱🇰" },
    { name: "Sudáfrica", flag: "🇿🇦" },
    { name: "Sudán", flag: "🇸🇩" },
    { name: "Sudán del Sur", flag: "🇸🇸" },
    { name: "Suecia", flag: "🇸🇪" },
    { name: "Suiza", flag: "🇨🇭" },
    { name: "Surinam", flag: "🇸🇷" },
    { name: "Tailandia", flag: "🇹🇭" },
    { name: "Tanzania", flag: "🇹🇿" },
    { name: "Tayikistán", flag: "🇹🇯" },
    { name: "Timor Oriental", flag: "🇹🇱" },
    { name: "Togo", flag: "🇹🇬" },
    { name: "Tonga", flag: "🇹🇴" },
    { name: "Trinidad y Tobago", flag: "🇹🇹" },
    { name: "Túnez", flag: "🇹🇳" },
    { name: "Turkmenistán", flag: "🇹🇲" },
    { name: "Turquía", flag: "🇹🇷" },
    { name: "Tuvalu", flag: "🇹🇻" },
    { name: "Ucrania", flag: "🇺🇦" },
    { name: "Uganda", flag: "🇺🇬" },
    { name: "Uruguay", flag: "🇺🇾" },
    { name: "Uzbekistán", flag: "🇺🇿" },
    { name: "Vanuatu", flag: "🇻🇺" },
    { name: "Vaticano", flag: "🇻🇦" },
    { name: "Venezuela", flag: "🇻🇪" },
    { name: "Vietnam", flag: "🇻🇳" },
    { name: "Yemen", flag: "🇾🇪" },
    { name: "Yibuti", flag: "🇩🇯" },
    { name: "Zambia", flag: "🇿🇲" },
    { name: "Zimbabue", flag: "🇿🇼" },
    { name: "Otro", flag: "🏳️" },
  ];

  function _flag(country) {
    if (!country) return "🏳️";
    const normalized = country
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    const c = WORLD_COUNTRIES.find(
      (x) =>
        x.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim() === normalized,
    );
    return c ? c.flag : "🏳️";
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  async function _loadData() {
    try {
      const res = await fetch("/app/api/auth-schools.php?admin=1", {
        headers: { "X-Admin": "1" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const instList = data?.data?.institutions || data?.institutions;
        if (Array.isArray(instList)) {
          _allInstitutions = instList;
          return;
        }
      }
    } catch (_) {}

    if (!_allInstitutions) _allInstitutions = [];
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
          ${!inst.is_verified ? `<span class="inst-proposed-by"><i class="fas fa-user-plus"></i> Propuesta por usuario</span>` : ""}
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
      ...new Set(_allInstitutions.map((i) => i.country).filter(Boolean)),
    ].sort();

    // Inyectar estilos del buscador de países si no existen
    if (!document.getElementById("inst-country-search-styles")) {
      const s = document.createElement("style");
      s.id = "inst-country-search-styles";
      s.textContent = `
.inst-country-search-wrap {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  max-width: 340px;
}
.inst-country-search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-mute);
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 1;
}
.inst-country-search-input {
  flex: 1;
  padding: 6px 12px 6px 30px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-sm);
  border-radius: 8px 0 0 8px;
  color: var(--text-main);
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.inst-country-search-input:focus { border-color: var(--accent,#3b82f6); }
.inst-country-search-input::placeholder { color: var(--text-mute); }
.inst-country-clear-btn {
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-sm);
  border-left: none;
  border-radius: 0 8px 8px 0;
  color: var(--text-mute);
  cursor: pointer;
  font-size: 0.75rem;
  transition: color 0.15s, background 0.15s;
  display: none;
}
.inst-country-clear-btn.visible { display: inline-flex; align-items: center; }
.inst-country-clear-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.08); }
.inst-country-active-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: var(--accent-dim, rgba(59,130,246,0.15));
  border: 1px solid var(--accent,#3b82f6);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent,#3b82f6);
  margin-left: 8px;
}
.inst-country-ddl-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 260px;
  background: #1e293b;
  border: 1px solid rgba(59,130,246,0.28);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.55);
  z-index: 9999;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 250px;
  overflow-y: auto;
  display: none;
}
.inst-country-ddl-list.open { display: block; }
.inst-country-ddl-list::-webkit-scrollbar { width: 4px; }
.inst-country-ddl-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:4px; }
.inst-cdl-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.83rem;
  color: #e2e8f0;
  transition: background 0.1s;
}
.inst-cdl-item:hover, .inst-cdl-item.selected { background: rgba(59,130,246,0.14); }
.inst-cdl-item-flag { font-size: 1.2rem; line-height: 1; flex-shrink: 0; }
.inst-cdl-item-name { flex: 1; }
.inst-cdl-no-results { padding: 10px 14px; font-size:0.8rem; color: rgba(255,255,255,0.3); text-align: center; }
`;
      document.head.appendChild(s);
    }

    // Construir UI de búsqueda
    const searchWrap = document.createElement("div");
    searchWrap.className = "inst-country-search-wrap";
    searchWrap.innerHTML = `
      <i class="fas fa-search inst-country-search-icon"></i>
      <input type="text" class="inst-country-search-input" id="instCountrySearchInput"
             placeholder="Buscar país… (todos)" autocomplete="off" spellcheck="false" />
      <button type="button" class="inst-country-clear-btn" id="instCountryClearBtn" title="Ver todos los países">
        <i class="fas fa-times"></i>
      </button>
      <ul class="inst-country-ddl-list" id="instCountryDdlList"></ul>`;

    wrap.innerHTML = "";
    wrap.appendChild(searchWrap);

    const input = document.getElementById("instCountrySearchInput");
    const clearBtn = document.getElementById("instCountryClearBtn");
    const ddl = document.getElementById("instCountryDdlList");

    function norm(s) {
      return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    function renderDdl(q) {
      const filtered = q
        ? countries.filter((c) => norm(c).indexOf(norm(q)) >= 0)
        : countries;

      if (!filtered.length) {
        ddl.innerHTML = '<li class="inst-cdl-no-results">Sin resultados</li>';
        return;
      }

      ddl.innerHTML = `
        <li class="inst-cdl-item${_filterCountry === "all" ? " selected" : ""}" data-country="all">
          <span class="inst-cdl-item-flag">🌐</span>
          <span class="inst-cdl-item-name">Todos los países</span>
        </li>
        ${filtered
          .map(
            (c) => `
          <li class="inst-cdl-item${_filterCountry === c ? " selected" : ""}" data-country="${c}">
            <span class="inst-cdl-item-flag">${_flag(c)}</span>
            <span class="inst-cdl-item-name">${c}</span>
          </li>`,
          )
          .join("")}`;

      ddl.querySelectorAll(".inst-cdl-item").forEach((li) => {
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const country = li.dataset.country;
          _filterCountry = country;
          if (country === "all") {
            input.value = "";
            clearBtn.classList.remove("visible");
            input.placeholder = "Buscar país… (todos)";
          } else {
            input.value = country;
            clearBtn.classList.add("visible");
            input.placeholder = country;
          }
          ddl.classList.remove("open");
          _applyFilters();
        });
      });
    }

    input.addEventListener("focus", () => {
      renderDdl(input.value);
      ddl.classList.add("open");
    });

    input.addEventListener("input", () => {
      renderDdl(input.value);
      ddl.classList.add("open");
      clearBtn.classList.toggle("visible", input.value.length > 0);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.remove("visible");
      input.placeholder = "Buscar país… (todos)";
      _filterCountry = "all";
      ddl.classList.remove("open");
      _applyFilters();
    });

    document.addEventListener("click", (e) => {
      if (!searchWrap.contains(e.target)) ddl.classList.remove("open");
    });
  }

  // ── Modal agregar / editar ────────────────────────────────────────────────

  function _initModalCountryDropdown() {
    const list = document.getElementById("instFormCountryList");
    const btn = document.getElementById("instFormCountryBtn");
    const ddl = document.getElementById("instFormCountryDdl");
    const search = document.getElementById("instFormCountrySearch");
    const hiddenInput = document.getElementById("instFormCountry");
    if (!list || !btn || !ddl) return;

    function renderList(q = "") {
      const normalizedQ = q
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const filtered = WORLD_COUNTRIES.filter((c) =>
        c.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(normalizedQ),
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
          const c = WORLD_COUNTRIES.find((x) => x.name === li.dataset.country);
          const flagEl = document.getElementById("instFormCountryFlag");
          const nameEl = document.getElementById("instFormCountryName");
          if (flagEl) flagEl.textContent = c ? c.flag : "🌐";
          if (nameEl) nameEl.textContent = li.dataset.country;
          if (hiddenInput) hiddenInput.value = li.dataset.country;
          ddl.style.display = "none";
        });
      });
    }

    if (search) search.value = "";
    renderList();

    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    if (!document.getElementById("inst-modal-custom-styles")) {
      const s = document.createElement("style");
      s.id = "inst-modal-custom-styles";
      s.textContent = `
        #instModal .form-field { margin-bottom: 16px; }
        #instModal label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: #94a3b8; font-weight: 600; }
        #instModal input[type="text"] {
          width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f1f5f9;
          font-family: inherit; outline: none; transition: border-color 0.2s;
        }
        #instModal input[type="text"]:focus { border-color: #3b82f6; background: rgba(255,255,255,0.06); }
        
        #instFormCountryBtn {
          display: flex; align-items: center; gap: 10px; width: 100%;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
          padding: 10px 14px; border-radius: 8px; color: #f1f5f9; text-align: left; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        #instFormCountryBtn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        #instFormCountryFlag { font-size: 1.2rem; line-height: 1; }
        #instFormCountryName { flex: 1; }
        
        #instFormCountryDdl {
          position: absolute; width: 100%; max-height: 260px; background: #1e293b;
          border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; z-index: 9999;
          box-shadow: 0 12px 36px rgba(0,0,0,0.6); overflow: hidden; display: none; margin-top: 4px;
        }
        #instFormCountrySearch {
          width: 100%; border: none !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          background: rgba(255,255,255,0.02) !important; color: #fff !important; padding: 12px 14px !important; outline: none !important;
          border-radius: 0 !important; font-size: 0.9rem;
        }
        #instFormCountryList {
          list-style: none; margin: 0; padding: 4px 0; max-height: 200px; overflow-y: auto;
        }
        #instFormCountryList::-webkit-scrollbar { width: 4px; }
        #instFormCountryList::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .pf-country-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; font-size: 0.9rem; color: #e2e8f0;
          transition: background 0.15s;
        }
        .pf-country-item:hover { background: rgba(59,130,246,0.15); }
        .pf-country-item .pf-flag { font-size: 1.2rem; line-height: 1; }
        
        /* Hacer el modal desplazable en pantallas pequeñas */
        #instModal .modal-card { max-height: 90vh !important; overflow-y: auto !important; width: 95% !important; max-width: 500px !important; margin: 1rem auto !important; }
      `;
      document.head.appendChild(s);

      if (btn.parentElement) {
        btn.parentElement.style.position = "relative";
      }
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

    if (search) {
      search.addEventListener("input", () => renderList(search.value));
      search.addEventListener("click", (e) => e.stopPropagation());
    }
    document.addEventListener("click", (e) => {
      if (ddl && !btn.contains(e.target) && !ddl.contains(e.target))
        ddl.style.display = "none";
    });
  }

  function openModal(id = null) {
    const modal = document.getElementById("instModal");
    const title = document.getElementById("instModalTitle");
    if (!modal) return;

    _initModalCountryDropdown();

    const setValSafe = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) {
        if (
          el.tagName === "INPUT" ||
          el.tagName === "SELECT" ||
          el.tagName === "TEXTAREA"
        ) {
          el.value = val;
        } else {
          el.textContent = val;
        }
      }
    };

    const setCheckSafe = (elId, checked) => {
      const el = document.getElementById(elId);
      if (el) el.checked = checked;
    };

    if (id) {
      const inst = _allInstitutions.find(
        (i) => i.id === id || String(i.id) === String(id),
      );
      if (!inst) return;
      if (title)
        title.innerHTML = `<i class="fas fa-pen"></i> Editar institución`;
      setValSafe("instFormId", inst.id);
      setValSafe("instFormName", inst.name);
      setValSafe("instFormState", inst.state || "");
      setValSafe("instFormCountry", inst.country);
      setValSafe("instFormCountryName", inst.country);
      setValSafe("instFormCountryFlag", _flag(inst.country));
      setCheckSafe("instFormVerified", !!inst.is_verified);

      const typeRadio = document.querySelector(
        `[name='instFormType'][value='${inst.type}']`,
      );
      if (typeRadio) typeRadio.checked = true;
    } else {
      if (title)
        title.innerHTML = `<i class="fas fa-university"></i> Nueva institución`;
      setValSafe("instFormId", "");
      setValSafe("instFormName", "");
      setValSafe("instFormState", "");
      setValSafe("instFormCountry", "México");
      setValSafe("instFormCountryName", "México");
      setValSafe("instFormCountryFlag", "🇲🇽");
      setCheckSafe("instFormVerified", true);

      const uniRadio = document.querySelector(
        "[name='instFormType'][value='universidad']",
      );
      if (uniRadio) uniRadio.checked = true;
    }

    const helper = document.getElementById("instFormNameHelper");
    if (helper) helper.innerHTML = "";

    if (typeof window.openModal === "function") {
      window.openModal(modal.id);
    } else {
      modal.classList.remove("hidden");
      modal.classList.add("show");
    }
  }

  function closeModal() {
    const modal = document.getElementById("instModal");
    if (typeof window.closeModal === "function") {
      window.closeModal("instModal");
    } else if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
    }
  }

  async function saveFromModal() {
    const nameEl = document.getElementById("instFormName");
    const countryEl = document.getElementById("instFormCountry");
    const stateEl = document.getElementById("instFormState");
    const verifiedEl = document.getElementById("instFormVerified");
    const idEl = document.getElementById("instFormId");

    const name = nameEl ? nameEl.value.trim() : "";
    const country = countryEl ? countryEl.value : "México";
    const state = stateEl ? stateEl.value.trim() : "";
    const type =
      document.querySelector("[name='instFormType']:checked")?.value ||
      "universidad";
    const is_verified = verifiedEl ? verifiedEl.checked : true;
    const id = idEl ? idEl.value : "";

    if (!name) {
      if (typeof setGlobalStatus === "function")
        setGlobalStatus("El nombre de la institución es requerido.", "error");
      else alert("El nombre de la institución es requerido.");
      return;
    }
    if (!country) {
      if (typeof setGlobalStatus === "function")
        setGlobalStatus("Selecciona un país.", "error");
      else alert("Selecciona un país.");
      return;
    }

    const payload = { name, country, state, type, is_verified };

    // --- VALIDACIÓN INTELIGENTE (Bloquea si existe o es muy similar) ---
    const stopWords = new Set([
      "instituto",
      "tecnologico",
      "tecnologica",
      "universidad",
      "politecnica",
      "superior",
      "colegio",
      "escuela",
      "facultad",
      "preparatoria",
      "de",
      "del",
      "la",
      "el",
      "los",
      "las",
      "y",
      "en",
      "para",
      "centro",
    ]);
    const getKw = (n) =>
      n
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

    const kw1 = getKw(name);
    const existsOrSimilar = _allInstitutions.find((i) => {
      if (String(i.id) === String(id)) return false;
      const nNorm = i.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const nameNorm = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (nNorm === nameNorm) return true;

      const kw2 = getKw(i.name);
      if (kw1.length > 0 && kw2.length > 0) {
        let matches = 0;
        for (const w1 of kw1) {
          if (kw2.includes(w1)) matches++;
        }
        return matches / Math.max(kw1.length, kw2.length) >= 0.7;
      }
      return false;
    });

    if (existsOrSimilar) {
      if (typeof setGlobalStatus === "function")
        setGlobalStatus(
          `Error: Ya existe una institución igual o muy similar (${existsOrSimilar.name}).`,
          "error",
        );
      else
        alert(
          `Error: Ya existe una institución igual o muy similar (${existsOrSimilar.name}).`,
        );
      return;
    }

    // Intentar guardar en servidor
    try {
      const method = "POST";
      const url = "/app/api/auth-schools.php";
      payload.id = id;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        closeModal();
        await reload();
        showInstOverlay(
          "La institución fue guardada correctamente en la Base de Datos.",
          "success",
        );
        return;
      } else {
        throw new Error(data.error || "No se pudo guardar la institución.");
      }
    } catch (err) {
      showInstOverlay(err.message, "error");
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function verify(id) {
    const inst = _allInstitutions.find((i) => String(i.id) === String(id));
    if (!inst) return;
    inst.is_verified = true;

    try {
      const res = await fetch(
        `/app/api/auth-schools.php?id=${id}&action=verify`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showInstOverlay("Institución verificada y aprobada.", "success");
        await reload();
      } else throw new Error(data.error);
    } catch (err) {
      showInstOverlay(err.message, "error");
    }
  }

  async function deleteInstitution(id) {
    const inst = _allInstitutions.find((i) => String(i.id) === String(id));
    if (!inst) return;
    if (!confirm(`¿Eliminar "${inst.name}"? Esta acción no se puede deshacer.`))
      return;

    try {
      const res = await fetch(
        `/app/api/auth-schools.php?id=${id}&action=delete`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showInstOverlay(
          "Institución eliminada de la base de datos.",
          "success",
        );
        await reload();
      } else throw new Error(data.error);
    } catch (err) {
      showInstOverlay(err.message, "error");
    }
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

  // ── Alerta Flotante (Overlay) ─────────────────────────────────────────────
  function showInstOverlay(msg, type = "success") {
    let overlay = document.getElementById("instStatusOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "instStatusOverlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(10, 15, 28, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; opacity: 0; transition: opacity 0.3s ease;
      `;
      document.body.appendChild(overlay);
    }
    const icon =
      type === "success"
        ? '<i class="fas fa-check-circle" style="color:#10b981;font-size:4rem;margin-bottom:15px;"></i>'
        : '<i class="fas fa-times-circle" style="color:#ef4444;font-size:4rem;margin-bottom:15px;"></i>';
    const title = type === "success" ? "¡Éxito!" : "Error";
    overlay.innerHTML = `
      <div style="background: #1e293b; border: 1px solid ${type === "success" ? "#10b981" : "#ef4444"}; border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; width: 90%; transform: translateY(20px); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
        ${icon}
        <h2 style="margin:0 0 10px; color:#f8fafc; font-size:1.5rem;">${title}</h2>
        <p style="color:#cbd5e1; font-size:1rem; margin:0 0 25px; line-height:1.5;">${msg}</p>
        <button onclick="document.getElementById('instStatusOverlay').style.opacity='0'; setTimeout(()=>document.getElementById('instStatusOverlay').style.display='none', 300);" style="background: ${type === "success" ? "#10b981" : "#ef4444"}; color: #fff; border: none; padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; width: 100%;">Aceptar</button>
      </div>
    `;
    overlay.style.display = "flex";
    void overlay.offsetWidth; // force reflow
    overlay.style.opacity = "1";
    overlay.querySelector("div").style.transform = "translateY(0)";
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function reload() {
    await _loadData();
    _buildCountryButtons();
    _applyFilters();
  }

  function init() {
    // Inyectar CSS Responsivo Estricto
    if (!document.getElementById("inst-responsive-styles")) {
      const s = document.createElement("style");
      s.id = "inst-responsive-styles";
      s.textContent = `
        #section-institutions {
           width: 100% !important; max-width: 100vw !important;
           box-sizing: border-box !important; overflow-x: hidden !important;
        }
        .inst-toolbar-custom {
           display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;
           width: 100%; box-sizing: border-box; align-items: center; justify-content: space-between;
        }
        .inst-toolbar-custom > div {
           flex: 1 1 100%; min-width: 0; box-sizing: border-box;
        }
        @media (min-width: 768px) { .inst-toolbar-custom > div { flex: 1 1 250px; } }
        .inst-table-wrap {
           width: 100% !important; max-width: 100% !important; overflow-x: auto !important;
           -webkit-overflow-scrolling: touch; border-radius: 8px;
           border: 1px solid var(--border-light, #334155); margin-bottom: 1rem;
           box-sizing: border-box; display: block;
        }
        #instTable { min-width: 800px; width: 100%; }
        .inst-country-search-wrap { width: 100%; max-width: 100%; }
      `;
      document.head.appendChild(s);
    }

    // Fix layout para evitar que se desborde a la derecha
    const section = document.getElementById("section-institutions");
    if (section) {
      section.style.paddingRight = "10px";
    }

    // Inject Search Input and Toolbar if missing
    let searchInput = document.getElementById("instSearchInput");
    const table = document.getElementById("instTable");

    if (!searchInput && table) {
      const toolbar = document.createElement("div");
      toolbar.className = "inst-toolbar-custom";
      toolbar.innerHTML = `
        <div style="position: relative;">
            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-mute);"></i>
            <input type="text" id="instSearchInput" placeholder="Buscar escuela por nombre o estado..." style="width: 100%; padding: 10px 12px 10px 35px; border-radius: 8px; border: 1px solid var(--border-light, #334155); background: rgba(255,255,255,0.05); color: var(--text-main, #fff); box-sizing: border-box;" autocomplete="off">
        </div>
        <div id="instCountryBtnGroup"></div>
      `;
      table.parentNode.insertBefore(toolbar, table);
      searchInput = document.getElementById("instSearchInput");
    }

    // Hacer que la tabla sea responsiva dinámicamente si no lo es
    if (
      table &&
      table.parentElement &&
      !table.parentElement.classList.contains("inst-table-wrap")
    ) {
      const wrap = document.createElement("div");
      wrap.className = "inst-table-wrap";
      wrap.style.cssText =
        "width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; border: 1px solid var(--border-light, #334155); margin-bottom: 1rem; box-sizing: border-box;";
      table.style.minWidth = "850px"; // Evita que se aplasten las columnas
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    }

    // Search input
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        _searchQuery = searchInput.value;
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

    const instNameInput = document.getElementById("instFormName");
    if (instNameInput) {
      instNameInput.addEventListener("input", () => {
        const currentId = document.getElementById("instFormId")?.value;
        const name = instNameInput.value
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        let helper = document.getElementById("instFormNameHelper");
        if (!helper) {
          helper = document.createElement("small");
          helper.id = "instFormNameHelper";
          helper.style.display = "block";
          helper.style.marginTop = "4px";
          helper.style.fontSize = "0.8rem";
          instNameInput.parentNode.appendChild(helper);
        }

        if (!name) {
          helper.innerHTML = "";
          return;
        }

        // --- BUSCADOR INTELIGENTE EN TIEMPO REAL ---
        const stopWords = new Set([
          "instituto",
          "tecnologico",
          "tecnologica",
          "universidad",
          "politecnica",
          "superior",
          "colegio",
          "escuela",
          "facultad",
          "preparatoria",
          "de",
          "del",
          "la",
          "el",
          "los",
          "las",
          "y",
          "en",
          "para",
          "centro",
        ]);
        const getKw = (n) =>
          n
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2 && !stopWords.has(w));
        const kw1 = getKw(instNameInput.value.trim());

        let exactMatch = null;
        let similarMatches = [];

        _allInstitutions.forEach((i) => {
          if (String(i.id) === String(currentId)) return;
          const nNorm = i.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (nNorm === name) {
            exactMatch = i;
          } else {
            const kw2 = getKw(i.name);
            if (kw1.length > 0 && kw2.length > 0) {
              let matches = 0;
              for (const w1 of kw1) {
                if (kw2.includes(w1)) matches++;
              }
              if (matches / Math.max(kw1.length, kw2.length) >= 0.7) {
                similarMatches.push(i);
              }
            }
          }
        });

        if (exactMatch) {
          helper.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Esta institución ya está agregada exactamente así (${exactMatch.country}).`;
          helper.style.color = "#fca5a5";
        } else if (similarMatches.length > 0) {
          const namesList = similarMatches
            .slice(0, 3)
            .map((s) => `<strong>${s.name}</strong>`)
            .join(", ");
          const more = similarMatches.length > 3 ? " y más..." : "";
          helper.innerHTML = `<div style="padding:8px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:6px;margin-top:6px;">
            <i class="fas fa-exclamation-circle" style="color:#fca5a5;"></i> 
            <span style="color:#fca5a5;">Existen instituciones muy similares: ${namesList}${more}. El sistema bloqueará el guardado si es la misma.</span>
          </div>`;
          helper.style.color = "#fca5a5";
        } else {
          helper.innerHTML = `<i class="fas fa-check-circle"></i> Nombre disponible.`;
          helper.style.color = "#4ade80";
        }
      });
    }

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
