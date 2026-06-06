/**
 * perfil-smart-fields.js — RENOVATEC 2026
 * Campos inteligentes para la sección "Información Personal" del perfil:
 *  - Teléfono con bandera + lada (igual que en acceso)
 *  - Escuela / Institución con autocomplete contra la BD y opción de proponer
 *  - Ciudad con autocomplete con ciudades comunes
 *
 * Se carga DESPUÉS de perfil.js. Se auto-inicializa en DOMContentLoaded.
 * v20260606
 */

const PerfilSmartFields = (() => {
  /* ─────────────────────────────────────────────────────────────────────
     ESTADO GLOBAL
  ───────────────────────────────────────────────────────────────────── */
  let _schoolsDB = [];          // instituciones cargadas desde la API
  let _selectedSchoolOk = false; // true cuando el valor viene del catálogo o fue propuesto
  let _phoneCountry = null;      // objeto del país seleccionado

  /* ─────────────────────────────────────────────────────────────────────
     LISTA DE PAÍSES (misma que acceso-smart-fields.js)
  ───────────────────────────────────────────────────────────────────── */
  const PHONE_COUNTRIES = [
    { code: "MX", name: "México",            flag: "🇲🇽", dial: "+52"  },
    { code: "US", name: "Estados Unidos",    flag: "🇺🇸", dial: "+1"   },
    { code: "CA", name: "Canadá",            flag: "🇨🇦", dial: "+1"   },
    { code: "GT", name: "Guatemala",         flag: "🇬🇹", dial: "+502" },
    { code: "BZ", name: "Belice",            flag: "🇧🇿", dial: "+501" },
    { code: "SV", name: "El Salvador",       flag: "🇸🇻", dial: "+503" },
    { code: "HN", name: "Honduras",          flag: "🇭🇳", dial: "+504" },
    { code: "NI", name: "Nicaragua",         flag: "🇳🇮", dial: "+505" },
    { code: "CR", name: "Costa Rica",        flag: "🇨🇷", dial: "+506" },
    { code: "PA", name: "Panamá",            flag: "🇵🇦", dial: "+507" },
    { code: "CU", name: "Cuba",              flag: "🇨🇺", dial: "+53"  },
    { code: "DO", name: "Rep. Dominicana",   flag: "🇩🇴", dial: "+1"   },
    { code: "PR", name: "Puerto Rico",       flag: "🇵🇷", dial: "+1"   },
    { code: "JM", name: "Jamaica",           flag: "🇯🇲", dial: "+1"   },
    { code: "HT", name: "Haití",             flag: "🇭🇹", dial: "+509" },
    { code: "TT", name: "Trinidad y Tobago", flag: "🇹🇹", dial: "+1"   },
    { code: "CO", name: "Colombia",          flag: "🇨🇴", dial: "+57"  },
    { code: "VE", name: "Venezuela",         flag: "🇻🇪", dial: "+58"  },
    { code: "EC", name: "Ecuador",           flag: "🇪🇨", dial: "+593" },
    { code: "PE", name: "Perú",              flag: "🇵🇪", dial: "+51"  },
    { code: "BO", name: "Bolivia",           flag: "🇧🇴", dial: "+591" },
    { code: "CL", name: "Chile",             flag: "🇨🇱", dial: "+56"  },
    { code: "AR", name: "Argentina",         flag: "🇦🇷", dial: "+54"  },
    { code: "UY", name: "Uruguay",           flag: "🇺🇾", dial: "+598" },
    { code: "PY", name: "Paraguay",          flag: "🇵🇾", dial: "+595" },
    { code: "BR", name: "Brasil",            flag: "🇧🇷", dial: "+55"  },
    { code: "GY", name: "Guyana",            flag: "🇬🇾", dial: "+592" },
    { code: "SR", name: "Surinam",           flag: "🇸🇷", dial: "+597" },
    { code: "ES", name: "España",            flag: "🇪🇸", dial: "+34"  },
    { code: "PT", name: "Portugal",          flag: "🇵🇹", dial: "+351" },
    { code: "FR", name: "Francia",           flag: "🇫🇷", dial: "+33"  },
    { code: "DE", name: "Alemania",          flag: "🇩🇪", dial: "+49"  },
    { code: "IT", name: "Italia",            flag: "🇮🇹", dial: "+39"  },
    { code: "GB", name: "Reino Unido",       flag: "🇬🇧", dial: "+44"  },
    { code: "NL", name: "Países Bajos",      flag: "🇳🇱", dial: "+31"  },
    { code: "BE", name: "Bélgica",           flag: "🇧🇪", dial: "+32"  },
    { code: "CH", name: "Suiza",             flag: "🇨🇭", dial: "+41"  },
    { code: "AT", name: "Austria",           flag: "🇦🇹", dial: "+43"  },
    { code: "SE", name: "Suecia",            flag: "🇸🇪", dial: "+46"  },
    { code: "NO", name: "Noruega",           flag: "🇳🇴", dial: "+47"  },
    { code: "DK", name: "Dinamarca",         flag: "🇩🇰", dial: "+45"  },
    { code: "FI", name: "Finlandia",         flag: "🇫🇮", dial: "+358" },
    { code: "PL", name: "Polonia",           flag: "🇵🇱", dial: "+48"  },
    { code: "RU", name: "Rusia",             flag: "🇷🇺", dial: "+7"   },
    { code: "UA", name: "Ucrania",           flag: "🇺🇦", dial: "+380" },
    { code: "TR", name: "Turquía",           flag: "🇹🇷", dial: "+90"  },
    { code: "GR", name: "Grecia",            flag: "🇬🇷", dial: "+30"  },
    { code: "CZ", name: "Rep. Checa",        flag: "🇨🇿", dial: "+420" },
    { code: "RO", name: "Rumania",           flag: "🇷🇴", dial: "+40"  },
    { code: "HU", name: "Hungría",           flag: "🇭🇺", dial: "+36"  },
    { code: "IL", name: "Israel",            flag: "🇮🇱", dial: "+972" },
    { code: "AE", name: "Emiratos Árabes",   flag: "🇦🇪", dial: "+971" },
    { code: "SA", name: "Arabia Saudita",    flag: "🇸🇦", dial: "+966" },
    { code: "EG", name: "Egipto",            flag: "🇪🇬", dial: "+20"  },
    { code: "NG", name: "Nigeria",           flag: "🇳🇬", dial: "+234" },
    { code: "ZA", name: "Sudáfrica",         flag: "🇿🇦", dial: "+27"  },
    { code: "KE", name: "Kenia",             flag: "🇰🇪", dial: "+254" },
    { code: "MA", name: "Marruecos",         flag: "🇲🇦", dial: "+212" },
    { code: "IN", name: "India",             flag: "🇮🇳", dial: "+91"  },
    { code: "CN", name: "China",             flag: "🇨🇳", dial: "+86"  },
    { code: "JP", name: "Japón",             flag: "🇯🇵", dial: "+81"  },
    { code: "KR", name: "Corea del Sur",     flag: "🇰🇷", dial: "+82"  },
    { code: "PH", name: "Filipinas",         flag: "🇵🇭", dial: "+63"  },
    { code: "ID", name: "Indonesia",         flag: "🇮🇩", dial: "+62"  },
    { code: "MY", name: "Malasia",           flag: "🇲🇾", dial: "+60"  },
    { code: "TH", name: "Tailandia",         flag: "🇹🇭", dial: "+66"  },
    { code: "VN", name: "Vietnam",           flag: "🇻🇳", dial: "+84"  },
    { code: "AU", name: "Australia",         flag: "🇦🇺", dial: "+61"  },
    { code: "NZ", name: "Nueva Zelanda",     flag: "🇳🇿", dial: "+64"  },
  ];

  /* ─────────────────────────────────────────────────────────────────────
     CIUDADES COMUNES (autocomplete local, no requiere BD)
  ───────────────────────────────────────────────────────────────────── */
  const CITIES_LIST = [
    "Uruapan","Morelia","Guadalajara","Ciudad de México","Monterrey",
    "Puebla","Tijuana","León","Juárez","Zapopan","Mérida","San Luis Potosí",
    "Aguascalientes","Hermosillo","Mexicali","Culiacán","Acapulco","Saltillo",
    "Veracruz","Chihuahua","Torreón","Querétaro","Oaxaca","Cancún","Tepic",
    "Colima","Durango","Tuxtla Gutiérrez","Zacatecas","Villahermosa",
    "Cuernavaca","Toluca","Tlaxcala","Pachuca","Guanajuato","Celaya",
    "Irapuato","San Juan del Río","Zamora","Apatzingán","Lázaro Cárdenas",
    "Pátzcuaro","Zitácuaro","Tacámbaro","Jiquilpan","Sahuayo","La Piedad",
    "Bogotá","Buenos Aires","Santiago","Lima","Caracas","Brasilia","São Paulo",
    "Quito","La Paz","Montevideo","Asunción","Medellín","Cali","Barranquilla",
    "Madrid","Barcelona","Sevilla","Lisboa","Paris","Londres","Berlin",
    "Roma","Amsterdam","Bruselas","Ginebra","Viena","Estocolmo",
    "New York","Los Angeles","Chicago","Houston","Miami","Dallas",
    "San Francisco","Seattle","Boston","Washington DC","Toronto","Vancouver",
    "Calgary","Montreal","Ottawa","Ciudad de Guatemala","San José",
    "Panamá","San Salvador","Tegucigalpa","Managua","La Habana",
    "Santo Domingo","Puerto Rico","Kingston","Puerto Príncipe",
  ];

  /* ─────────────────────────────────────────────────────────────────────
     ESTILOS
  ───────────────────────────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById("pf-smart-styles")) return;
    const s = document.createElement("style");
    s.id = "pf-smart-styles";
    s.textContent = `
/* ── Autocomplete wrappers ───────────────────────────────────── */
.pf-autocomplete-wrap {
  position: relative;
}
.pf-smart-input {
  width: 100%;
  box-sizing: border-box;
}
.pf-suggestions {
  position: absolute;
  top: calc(100% + 3px);
  left: 0; right: 0;
  z-index: 9000;
  list-style: none;
  margin: 0; padding: 4px 0;
  background: var(--card-bg, #1e293b);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
  max-height: 220px;
  overflow-y: auto;
}
.pf-suggestions::-webkit-scrollbar { width: 4px; }
.pf-suggestions::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
.pf-suggestion-item {
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-main, #e2e8f0);
  display: flex;
  align-items: center;
  gap: 7px;
  transition: background 0.1s;
}
.pf-suggestion-item:hover,
.pf-suggestion-item.pf-focused {
  background: rgba(59,130,246,0.14);
}
.pf-suggestion-item.pf-proposal {
  color: #f59e0b;
  font-style: italic;
}
.pf-suggestion-divider {
  padding: 5px 14px 4px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.3);
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 2px;
}
.pf-empty-msg {
  padding: 12px 14px;
  font-size: 0.8rem;
  color: var(--text-mute, #94a3b8);
  text-align: left;
}
.pf-hint-ok   { color: #4ade80; }
.pf-hint-warn { color: #f59e0b; }
.pf-hint-err  { color: #ef4444; }

/* ── Phone field (igual que acceso) ────────────────────────── */
.pf-phone-wrap {
  display: flex;
  gap: 0;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: visible;
  transition: border-color 0.2s;
  background: var(--input-bg, rgba(255,255,255,0.04));
}
.pf-phone-wrap:focus-within {
  border-color: rgba(59,130,246,0.7);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
.pf-phone-dial-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 0 12px;
  background: rgba(255,255,255,0.04);
  border: none;
  border-right: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--text-main, #e2e8f0);
  white-space: nowrap;
  min-width: 86px;
  height: 44px;
  transition: background 0.15s;
  flex-shrink: 0;
}
.pf-phone-dial-btn:hover { background: rgba(255,255,255,0.08); }
.pf-phone-dial-flag { font-size: 1.25rem; line-height: 1; }
.pf-phone-dial-code { font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em; }
.pf-phone-dial-caret { font-size: 0.6rem; color: rgba(255,255,255,0.35); margin-left: 2px; }
.pf-phone-number-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 0 14px;
  font-size: 0.92rem;
  color: var(--text-main, #e2e8f0);
  height: 44px;
  border-radius: 0 10px 10px 0;
  font-family: inherit;
  min-width: 0;
}
.pf-phone-number-input::placeholder { color: rgba(255,255,255,0.25); }
.pf-phone-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 300px;
  max-width: 340px;
  background: #1e293b;
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.55);
  z-index: 99999;
  overflow: hidden;
  display: none;
}
.pf-phone-dropdown.open { display: block; }
.pf-phone-search-wrap {
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  background: #1e293b;
  z-index: 1;
  position: relative;
}
.pf-phone-search {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 7px 10px 7px 32px;
  font-size: 0.83rem;
  color: #e2e8f0;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.pf-phone-search::placeholder { color: rgba(255,255,255,0.25); }
.pf-phone-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.3);
  font-size: 0.78rem;
  pointer-events: none;
}
.pf-phone-country-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.pf-phone-country-list::-webkit-scrollbar { width: 4px; }
.pf-phone-country-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
.pf-phone-country-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.84rem;
  color: #e2e8f0;
  transition: background 0.1s;
}
.pf-phone-country-item:hover,
.pf-phone-country-item.pf-phone-active { background: rgba(59,130,246,0.14); }
.pf-phone-country-item-flag { font-size: 1.35rem; line-height: 1; flex-shrink: 0; }
.pf-phone-country-item-name { flex: 1; }
.pf-phone-country-item-dial { font-size: 0.76rem; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.02em; }
.pf-phone-no-results { padding: 14px; text-align: center; font-size: 0.82rem; color: rgba(255,255,255,0.3); }
`;
    document.head.appendChild(s);
  }

  /* ─────────────────────────────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────────────────────────────── */
  function _esc(s) { return String(s).replace(/"/g, "&quot;"); }

  function _norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function _highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(re, "<mark style='background:rgba(59,130,246,0.3);color:inherit;border-radius:2px;'>$1</mark>");
  }

  /* ─────────────────────────────────────────────────────────────────────
     CAMPO DE TELÉFONO
  ───────────────────────────────────────────────────────────────────── */
  function _buildPhoneField(container, existingPhone) {
    // Detectar lada y número del valor guardado  (e.g. "+524521123947" o "4521123947")
    let defaultCountry = PHONE_COUNTRIES[0]; // México
    let localNumber = "";

    if (existingPhone) {
      // Buscar país por dial prefix (ordenar de más largo a más corto para evitar conflictos)
      const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
      const normalized = existingPhone.replace(/\s/g, "");
      for (const c of sorted) {
        if (normalized.startsWith(c.dial)) {
          defaultCountry = c;
          localNumber = normalized.slice(c.dial.length).replace(/\D/g, "");
          break;
        }
      }
      // Si no empieza con +, asumir México y todo es número
      if (!existingPhone.startsWith("+")) {
        localNumber = existingPhone.replace(/\D/g, "");
      }
    }

    _phoneCountry = defaultCountry;

    // Construir markup
    const wrap = document.createElement("div");
    wrap.className = "pf-phone-wrap";

    const dialBtn = document.createElement("button");
    dialBtn.type = "button";
    dialBtn.className = "pf-phone-dial-btn";
    dialBtn.innerHTML = `
      <span class="pf-phone-dial-flag">${_phoneCountry.flag}</span>
      <span class="pf-phone-dial-code">${_phoneCountry.dial}</span>
      <i class="fas fa-chevron-down pf-phone-dial-caret"></i>`;

    const numberInput = document.createElement("input");
    numberInput.type = "tel";
    numberInput.id = "pfPhoneNumber";
    numberInput.className = "pf-phone-number-input";
    numberInput.placeholder = "Número de teléfono";
    numberInput.autocomplete = "tel-national";
    numberInput.value = localNumber;

    // Hidden input que lee perfil.js al guardar
    const hiddenPhone = document.createElement("input");
    hiddenPhone.type = "hidden";
    hiddenPhone.id = "phone";

    function updateHidden() {
      const local = numberInput.value.replace(/\D/g, "");
      hiddenPhone.value = local ? `${_phoneCountry.dial}${local}` : "";
    }
    updateHidden();
    numberInput.addEventListener("input", updateHidden);

    // Dropdown de países
    const dropdown = document.createElement("div");
    dropdown.className = "pf-phone-dropdown";

    const searchWrap = document.createElement("div");
    searchWrap.className = "pf-phone-search-wrap";
    searchWrap.innerHTML = `
      <i class="fas fa-search pf-phone-search-icon"></i>
      <input type="text" class="pf-phone-search" placeholder="Buscar país o lada…" autocomplete="off" />`;

    const ul = document.createElement("ul");
    ul.className = "pf-phone-country-list";

    dropdown.appendChild(searchWrap);
    dropdown.appendChild(ul);

    function renderList(q = "") {
      const filtered = PHONE_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q.toLowerCase())
      );
      if (!filtered.length) {
        ul.innerHTML = `<li class="pf-phone-no-results">Sin resultados</li>`;
        return;
      }
      ul.innerHTML = filtered.map(c => `
        <li class="pf-phone-country-item${c.code === _phoneCountry.code ? " pf-phone-active" : ""}"
            data-code="${c.code}">
          <span class="pf-phone-country-item-flag">${c.flag}</span>
          <span class="pf-phone-country-item-name">${c.name}</span>
          <span class="pf-phone-country-item-dial">${c.dial}</span>
        </li>`).join("");

      ul.querySelectorAll(".pf-phone-country-item").forEach(li => {
        li.addEventListener("mousedown", e => {
          e.preventDefault();
          const c = PHONE_COUNTRIES.find(x => x.code === li.dataset.code);
          if (c) {
            _phoneCountry = c;
            dialBtn.innerHTML = `
              <span class="pf-phone-dial-flag">${c.flag}</span>
              <span class="pf-phone-dial-code">${c.dial}</span>
              <i class="fas fa-chevron-down pf-phone-dial-caret"></i>`;
            updateHidden();
          }
          closeDropdown();
          numberInput.focus();
        });
      });
    }

    const searchInput = searchWrap.querySelector(".pf-phone-search");
    searchInput.addEventListener("input", () => renderList(searchInput.value));

    let dropdownOpen = false;
    function openDropdown() {
      dropdownOpen = true;
      dropdown.classList.add("open");
      searchInput.value = "";
      renderList();
      setTimeout(() => searchInput.focus(), 30);
    }
    function closeDropdown() {
      dropdownOpen = false;
      dropdown.classList.remove("open");
    }

    dialBtn.addEventListener("click", e => {
      e.stopPropagation();
      dropdownOpen ? closeDropdown() : openDropdown();
    });
    document.addEventListener("click", e => {
      if (!wrap.contains(e.target)) closeDropdown();
    });

    wrap.appendChild(dialBtn);
    wrap.appendChild(numberInput);
    wrap.appendChild(hiddenPhone);
    wrap.appendChild(dropdown);

    renderList();
    return wrap;
  }

  function initPhoneField(existingPhone) {
    const container = document.getElementById("profilePhoneContainer");
    if (!container) return;
    container.innerHTML = "";
    container.appendChild(_buildPhoneField(container, existingPhone));
  }

  /* ─────────────────────────────────────────────────────────────────────
     AUTOCOMPLETE GENÉRICO
  ───────────────────────────────────────────────────────────────────── */
  function _buildAutocomplete(inputEl, listEl, getSuggestions, onSelect, onCustom, opts = {}) {
    const { allowFreeText = false } = opts;
    let focusedIdx = -1;

    function show(items, query) {
      focusedIdx = -1;
      const trimmed = query.trim();

      if (!items.length) {
        if (trimmed.length > 1) {
          if (allowFreeText) {
            // Ciudad: libre, solo sugerir
            listEl.innerHTML = `<li class="pf-empty-msg">Sin coincidencias. Puedes escribir tu ciudad libremente.</li>`;
          } else {
            // Escuela: no libre
            listEl.innerHTML = `
              <li class="pf-empty-msg" style="color:#f59e0b;">
                <i class="fas fa-exclamation-triangle"></i>
                "<strong>${_esc(trimmed)}</strong>" no está en el catálogo.
              </li>
              <li class="pf-suggestion-item pf-proposal" data-value="__custom__">
                <i class="fas fa-plus-circle" style="color:#f59e0b"></i>
                Registrarla como nueva institución (pendiente de verificación)
              </li>`;
          }
        } else {
          listEl.innerHTML = `<li class="pf-empty-msg">Sigue escribiendo…</li>`;
        }
        listEl.style.display = "block";
        _attachClickHandlers(listEl, inputEl, onSelect, onCustom, listEl);
        return;
      }

      const verified = items.filter(i => !i.proposed);
      const proposed = items.filter(i =>  i.proposed);

      let html = verified.map(item => {
        const name = typeof item === "string" ? item : item.name;
        return `<li class="pf-suggestion-item" data-value="${_esc(name)}">
          <i class="fas fa-check-circle" style="color:#4ade80;font-size:0.7rem"></i>
          ${_highlight(name, query)}
        </li>`;
      }).join("");

      if (proposed.length) {
        html += `<li class="pf-suggestion-divider">Propuestas por usuarios</li>`;
        html += proposed.map(item => {
          const name = typeof item === "string" ? item : item.name;
          return `<li class="pf-suggestion-item pf-proposal" data-value="${_esc(name)}">
            <i class="fas fa-user-plus" style="font-size:0.7rem"></i>
            ${_highlight(name, query)}
          </li>`;
        }).join("");
      }

      // Mostrar opción de agregar si no hay match exacto (solo para escuelas)
      if (!allowFreeText) {
        const exactMatch = items.some(i => {
          const n = typeof i === "string" ? i : i.name;
          return _norm(n) === _norm(trimmed);
        });
        if (!exactMatch && trimmed.length > 1) {
          html += `<li class="pf-suggestion-divider">¿No encuentras tu institución?</li>
            <li class="pf-suggestion-item pf-proposal" data-value="__custom__">
              <i class="fas fa-plus-circle" style="color:#f59e0b"></i>
              Registrar "<strong>${_esc(trimmed)}</strong>" como nueva opción
            </li>`;
        }
      }

      listEl.innerHTML = html;
      listEl.style.display = "block";
      _attachClickHandlers(listEl, inputEl, onSelect, onCustom, listEl);
    }

    function _attachClickHandlers(listEl, inputEl, onSelect, onCustom) {
      listEl.querySelectorAll(".pf-suggestion-item").forEach(li => {
        li.addEventListener("mousedown", e => {
          e.preventDefault();
          const val = li.dataset.value;
          if (val === "__custom__") {
            onCustom && onCustom(inputEl.value.trim());
          } else {
            inputEl.value = val;
            onSelect && onSelect(val);
          }
          listEl.style.display = "none";
        });
      });
    }

    function hide() {
      listEl.style.display = "none";
      focusedIdx = -1;
    }

    inputEl.addEventListener("input", () => {
      const q = inputEl.value;
      if (!q.trim()) { hide(); return; }
      show(getSuggestions(q), q);
    });

    inputEl.addEventListener("keydown", e => {
      const items = listEl.querySelectorAll(".pf-suggestion-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        items.forEach((li, i) => li.classList.toggle("pf-focused", i === focusedIdx));
        items[focusedIdx]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, 0);
        items.forEach((li, i) => li.classList.toggle("pf-focused", i === focusedIdx));
        items[focusedIdx]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && focusedIdx >= 0) {
        e.preventDefault();
        items[focusedIdx]?.dispatchEvent(new Event("mousedown"));
      } else if (e.key === "Escape") {
        hide();
      }
    });

    inputEl.addEventListener("blur", () => setTimeout(hide, 150));
    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) {
        show(getSuggestions(inputEl.value), inputEl.value);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     CAMPO DE ESCUELA
  ───────────────────────────────────────────────────────────────────── */
  async function _loadSchoolsFromAPI() {
    try {
      const res = await fetch("/app/api/auth-schools.php");
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.schools)) {
        _schoolsDB = json.data.schools;
      }
    } catch (_) {}
  }

  function _getSchoolSuggestions(query) {
    const q = _norm(query);
    return _schoolsDB.filter(i => {
      const n = _norm(i.name);
      return n.includes(q);
    }).slice(0, 15);
  }

  function initSchoolField(existingValue) {
    const input  = document.getElementById("school");
    const list   = document.getElementById("pfSchoolList");
    const hint   = document.getElementById("pfSchoolHint");
    if (!input || !list) return;

    if (existingValue) {
      input.value = existingValue;
      // Marcar como ok si ya tenía valor
      _selectedSchoolOk = true;
      if (hint) { hint.textContent = ""; hint.className = "input-hint"; }
    }

    _buildAutocomplete(
      input, list,
      _getSchoolSuggestions,
      // onSelect: encontrada en catálogo
      (name) => {
        _selectedSchoolOk = true;
        if (hint) {
          hint.textContent = "✓ Institución encontrada en el catálogo";
          hint.className = "input-hint pf-hint-ok";
        }
      },
      // onCustom: proponer nueva
      (customName) => {
        _selectedSchoolOk = true; // se puede guardar como propuesta
        input.value = customName;
        if (hint) {
          hint.textContent = "⚠ Se registrará como nueva institución (pendiente de verificación)";
          hint.className = "input-hint pf-hint-warn";
        }
        _sendSchoolProposal(customName);
      },
      { allowFreeText: false }
    );

    // Al cambiar manualmente, invalidar selección
    input.addEventListener("input", () => {
      _selectedSchoolOk = false;
      if (hint) { hint.textContent = ""; hint.className = "input-hint"; }
    });
  }

  async function _sendSchoolProposal(name) {
    try {
      await fetch("/app/api/auth-schools.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "universidad", is_verified: false }),
        credentials: "include",
      });
    } catch (_) {}
  }

  /* ─────────────────────────────────────────────────────────────────────
     CAMPO DE CIUDAD
  ───────────────────────────────────────────────────────────────────── */
  function _getCitySuggestions(query) {
    const q = _norm(query);
    return CITIES_LIST.filter(c => _norm(c).includes(q)).slice(0, 12);
  }

  function initCityField(existingValue) {
    const input = document.getElementById("city");
    const list  = document.getElementById("pfCityList");
    const hint  = document.getElementById("pfCityHint");
    if (!input || !list) return;

    if (existingValue) input.value = existingValue;

    _buildAutocomplete(
      input, list,
      _getCitySuggestions,
      // onSelect
      (name) => {
        if (hint) { hint.textContent = ""; hint.className = "input-hint"; }
      },
      null,  // no hay "proponer" para ciudad — texto libre
      { allowFreeText: true }
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     VALIDACIÓN (llamada desde perfil.js antes de guardar)
  ───────────────────────────────────────────────────────────────────── */
  function validateSchool() {
    const input = document.getElementById("school");
    const hint  = document.getElementById("pfSchoolHint");
    const val   = input?.value.trim();

    if (!val) {
      if (hint) { hint.textContent = "La institución es requerida."; hint.className = "input-hint pf-hint-err"; }
      return false;
    }
    // Si el usuario escribió algo que no fue seleccionado del catálogo ni propuesto
    if (!_selectedSchoolOk) {
      if (hint) {
        hint.textContent = "Selecciona tu institución del listado o regístrala como nueva opción.";
        hint.className = "input-hint pf-hint-err";
      }
      return false;
    }
    return true;
  }

  /* ─────────────────────────────────────────────────────────────────────
     INIT PRINCIPAL
  ───────────────────────────────────────────────────────────────────── */
  function init(existingData) {
    _injectStyles();
    // existingData = { phone, school, city } del perfil guardado
    initPhoneField(existingData?.phone || "");
    _loadSchoolsFromAPI().then(() => {
      initSchoolField(existingData?.school || "");
    });
    initCityField(existingData?.city || "");
  }

  /* ─────────────────────────────────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────────────────────────────────── */
  return {
    init,
    validateSchool,
    /** Devuelve el teléfono completo (lada + número) */
    getPhone() {
      return document.getElementById("phone")?.value || "";
    },
    /** Marca la escuela actual como ok (cuando viene del servidor) */
    markSchoolOk() { _selectedSchoolOk = true; },
  };
})();

/* ──────────────────────────────────────────────────────────────────────────
   INTEGRACIÓN CON PERFIL.JS:
   - Se engancha en el evento "perfil:dataLoaded" que dispara perfil.js
     cuando ya tiene los datos del usuario.
   - Si perfil.js no emite ese evento, se inicializa en DOMContentLoaded
     con los datos que perfil.js haya dejado en fillPersonalForm().
────────────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Esperar a que perfil.js termine de cargar datos de sesión
  // (fillPersonalForm es síncrono en DOMContentLoaded de perfil.js,
  //  así que a este punto ya se han seteado los campos básicos)
  setTimeout(() => {
    const SESSION_KEY = "renovatec_user_session_v1";
    let profile = {};
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        profile = user?.profile || {};
        // También puede estar a nivel raíz
        if (!profile.phone && user?.phone) profile.phone = user.phone;
        if (!profile.school && user?.school) profile.school = user.school;
        if (!profile.city && user?.city) profile.city = user.city;
      }
    } catch (_) {}

    PerfilSmartFields.init({
      phone:  profile.phone  || "",
      school: profile.school || "",
      city:   profile.city   || "",
    });

    // Si la escuela viene del perfil guardado, marcarla como válida
    if (profile.school) PerfilSmartFields.markSchoolOk();

    // Parchear el submit de personalForm para usar validateSchool
    const form = document.getElementById("personalForm");
    if (form && !form.dataset.smartPatched) {
      form.dataset.smartPatched = "1";
      form.addEventListener("submit", e => {
        if (!PerfilSmartFields.validateSchool()) {
          e.stopImmediatePropagation();
          e.preventDefault();
          document.getElementById("school")?.focus();
        }
      }, true); // true = captura antes que el handler de perfil.js
    }
  }, 80);
});
