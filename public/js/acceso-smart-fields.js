/**
 * acceso-smart-fields.js — RENOVATEC 2026
 * Parche de integración: campos inteligentes de escuela, carrera y teléfono
 * para el formulario de registro en acceso.html.
 *
 * CÓMO USAR:
 *  1. Reemplaza el bloque <div class="form-field"> del campo regOriginSchool
 *     con el HTML de abajo (ver sección HTML_PATCH).
 *  2. Agrega este script DESPUÉS de escuelas-data.js y phone-field.js
 *  3. Llama a SmartFields.init() en tu initSession() o DOMContentLoaded.
 *
 * v20260507
 */

/* ─────────────────────────────────────────────────────────────────────────────
   HTML_PATCH — Reemplaza en acceso.html dentro del #registerForm / .form-grid

   ANTES (campo de escuela):
     <div class="form-field">
       <label class="field-label" for="regOriginSchool">Escuela de procedencia</label>
       <input type="text" id="regOriginSchool" class="field-input" list="schoolSuggestions" ...>
       <datalist id="schoolSuggestions"></datalist>
     </div>

   DESPUÉS (pegar esto):

    <!-- TIPO DE INSTITUCIÓN (controla qué escuelas y carreras aparecen) -->
    <div class="form-field col-full">
      <label class="field-label"><i class="fas fa-building-columns"></i> Tipo de institución</label>
      <div class="sf-type-toggle" id="sfInstitutionTypeGroup">
        <label class="sf-type-radio">
          <input type="radio" name="sfInstType" value="universidad" checked />
          <span><i class="fas fa-graduation-cap"></i> Universidad / Tecnológico</span>
        </label>
        <label class="sf-type-radio">
          <input type="radio" name="sfInstType" value="preparatoria" />
          <span><i class="fas fa-school"></i> Preparatoria / Bachillerato</span>
        </label>
      </div>
    </div>

    <!-- ESCUELA -->
    <div class="form-field">
      <label class="field-label" for="regOriginSchool">
        <i class="fas fa-building-columns"></i> Escuela de procedencia
      </label>
      <div class="sf-autocomplete-wrap">
        <input
          type="text"
          id="regOriginSchool"
          class="field-input"
          placeholder="Escribe para buscar tu institución…"
          autocomplete="off"
          required
        />
        <ul class="sf-suggestions" id="sfSchoolList" style="display:none;"></ul>
      </div>
      <small class="field-hint sf-school-hint" id="sfSchoolHint"></small>
    </div>

    <!-- CARRERA (depende del tipo de institución) -->
    <div class="form-field">
      <label class="field-label" for="regCareer">
        <i class="fas fa-book-open"></i> Carrera / Programa
      </label>
      <div class="sf-autocomplete-wrap">
        <input
          type="text"
          id="regCareer"
          class="field-input"
          placeholder="Escribe para buscar tu carrera…"
          autocomplete="off"
          required
        />
        <ul class="sf-suggestions" id="sfCareerList" style="display:none;"></ul>
      </div>
      <small class="field-hint sf-career-hint" id="sfCareerHint"></small>
    </div>

    <!-- TELÉFONO — reemplaza el field anterior de regPhone -->
    <div class="form-field" id="phoneFieldContainer"></div>

   ─────────────────────────────────────────────────────────────────────────── */

const SmartFields = (() => {
  let _instType = "universidad"; // valor actual seleccionado
  let _selectedSchool = null;
  let _phoneValid = false;
  let _schoolsDB = [];

  const _FALLBACK_CAREERS = {
    universidad: [
      "Ingeniería Electrónica",
      "Ingeniería en Sistemas Computacionales",
      "Ingeniería en Tecnologías de la Información",
      "Ingeniería Mecatrónica",
      "Ingeniería Eléctrica",
      "Ingeniería Mecánica",
      "Ingeniería Industrial",
      "Ingeniería en Robótica",
      "Licenciatura en Administración de Empresas",
      "Licenciatura en Informática",
    ],
    preparatoria: [
      "Técnico en Programación",
      "Técnico en Redes",
      "Técnico en Electrónica",
      "Técnico en Mecatrónica",
      "Bachillerato General",
      "Bachillerato Tecnológico",
    ],
  };

  // ── Estilos del autocomplete ──────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById("sf-styles")) return;
    const style = document.createElement("style");
    style.id = "sf-styles";
    style.textContent = `
/* Tipo toggle */
.sf-type-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sf-type-radio {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.82rem;
  transition: border-color 0.15s, background 0.15s;
  flex: 1;
  min-width: 140px;
  color: var(--text-main, #e2e8f0);
}
.sf-type-radio:has(input:checked) {
  border-color: #3b82f6;
  background: rgba(59,130,246,0.12);
}
.sf-type-radio input { display: none; }

/* Autocomplete */
.sf-autocomplete-wrap {
  position: relative;
}
.sf-suggestions {
  position: absolute;
  top: calc(100% + 3px);
  left: 0; right: 0;
  z-index: 8000;
  list-style: none;
  margin: 0; padding: 4px 0;
  background: var(--card-bg, #1e293b);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
  max-height: 220px;
  overflow-y: auto;
}
.sf-suggestions::-webkit-scrollbar { width: 4px; }
.sf-suggestions::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

.sf-suggestion-item {
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-main, #e2e8f0);
  display: flex;
  align-items: center;
  gap: 7px;
  transition: background 0.1s;
}
.sf-suggestion-item:hover,
.sf-suggestion-item.focused {
  background: rgba(59,130,246,0.14);
}
.sf-suggestion-item.sf-proposal {
  color: #f59e0b;
  font-style: italic;
}
.sf-suggestion-divider {
  padding: 5px 14px 4px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,0.3);
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 2px;
}
.sf-hint-ok  { color: #4ade80; }
.sf-hint-warn { color: #f59e0b; }
.sf-empty-msg {
  padding: 12px 14px;
  font-size: 0.8rem;
  color: var(--text-mute, #94a3b8);
  text-align: center;
}
`;
    document.head.appendChild(style);
  }

  // ── Autocomplete genérico ────────────────────────────────────────────────
  function _buildAutocomplete(
    inputEl,
    listEl,
    getSuggestions,
    onSelect,
    onCustom,
  ) {
    let focusedIdx = -1;

    function show(items, query) {
      focusedIdx = -1;
      if (!items.length) {
        const trimmed = query.trim();
        if (trimmed.length > 2) {
          listEl.innerHTML = `
            <li class="sf-empty-msg" style="color:#f59e0b; padding-bottom:4px; text-align:left;">
               <i class="fas fa-exclamation-triangle"></i> La escuela "<strong>${trimmed}</strong>" no se encuentra en la base de datos.
            </li>
            <li class="sf-suggestion-item sf-proposal" data-value="__custom__">
              <i class="fas fa-plus-circle" style="color:#f59e0b"></i>
              ¿Desea registrarla o guardarla como nueva en el sistema?
            </li>`;
        } else {
          listEl.innerHTML = `<li class="sf-empty-msg">Sin resultados. Sigue escribiendo…</li>`;
        }
        listEl.style.display = "block";
        return;
      }

      // Separar verificadas de propuestas (si tienen .proposed)
      const verified = items.filter((i) => !i.proposed);
      const proposed = items.filter((i) => i.proposed);

      let html = verified
        .map((item) => {
          const name = typeof item === "string" ? item : item.name;
          return `<li class="sf-suggestion-item" data-value="${_esc(name)}">
          <i class="fas fa-check-circle" style="color:#4ade80; font-size:0.7rem"></i>
          ${_highlight(name, query)}
        </li>`;
        })
        .join("");

      if (proposed.length) {
        html += `<li class="sf-suggestion-divider">Propuestas por usuarios</li>`;
        html += proposed
          .map((item) => {
            const name = typeof item === "string" ? item : item.name;
            return `<li class="sf-suggestion-item sf-proposal" data-value="${_esc(name)}">
            <i class="fas fa-user-plus" style="font-size:0.7rem"></i>
            ${_highlight(name, query)}
          </li>`;
          })
          .join("");
      }

      // Siempre mostrar opción "agregar nueva"
      const trimmed = query.trim();
      const exactMatch = items.some((i) => {
        const n = typeof i === "string" ? i : i.name;
        return n.toLowerCase() === trimmed.toLowerCase();
      });
      if (!exactMatch && trimmed.length > 2) {
        html += `<li class="sf-suggestion-divider">¿No es la opción que buscas?</li>
          <li class="sf-empty-msg" style="padding-bottom:0; text-align:left; font-size:0.75rem;">
            Si tu escuela "<strong>${trimmed}</strong>" no es ninguna de las opciones anteriores, por favor regístrala como nueva opción.
          </li>
          <li class="sf-suggestion-item sf-proposal" data-value="__custom__">
            <i class="fas fa-plus-circle" style="color:#f59e0b"></i>
            Registrar como nueva opción
          </li>`;
      }

      listEl.innerHTML = html;
      listEl.style.display = "block";

      listEl.querySelectorAll(".sf-suggestion-item").forEach((li) => {
        li.addEventListener("mousedown", (e) => {
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
      if (!q.trim()) {
        hide();
        return;
      }
      const suggestions = getSuggestions(q);
      show(suggestions, q);
    });

    inputEl.addEventListener("keydown", (e) => {
      const items = listEl.querySelectorAll(".sf-suggestion-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        _updateFocus(items, focusedIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, 0);
        _updateFocus(items, focusedIdx);
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
        const suggestions = getSuggestions(inputEl.value);
        show(suggestions, inputEl.value);
      }
    });
  }

  function _updateFocus(items, idx) {
    items.forEach((li, i) => li.classList.toggle("focused", i === idx));
    items[idx]?.scrollIntoView({ block: "nearest" });
  }

  function _highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    return text.replace(
      re,
      "<mark style='background:rgba(59,130,246,0.3); color:inherit; border-radius:2px;'>$1</mark>",
    );
  }

  function _esc(s) {
    return s.replace(/"/g, "&quot;");
  }

  // ── Buscador de instituciones ─────────────────────────────────────────────
  function _getSchoolSuggestions(query) {
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return _schoolsDB
      .filter((i) => {
        if (_instType && i.type && i.type !== _instType) return false;
        const n = i.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return n.includes(q);
      })
      .slice(0, 12);
  }

  async function _loadSchoolsFromAPI() {
    try {
      const res = await fetch("/app/api/auth-schools.php");
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.schools)) {
        _schoolsDB = json.data.schools;
      }
    } catch (e) {}
  }

  // ── Buscador de carreras ──────────────────────────────────────────────────
  function _getCareerSuggestions(query) {
    let list =
      typeof getCareers === "function"
        ? getCareers(_instType)
        : _FALLBACK_CAREERS[_instType] || _FALLBACK_CAREERS.universidad;
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return list
      .filter((c) =>
        c
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(q),
      )
      .slice(0, 10);
  }

  // ── Campo de escuela ──────────────────────────────────────────────────────
  function _initSchoolField() {
    const input = document.getElementById("regOriginSchool");
    const list = document.getElementById("sfSchoolList");
    const hint = document.getElementById("sfSchoolHint");
    if (!input || !list) return;

    _buildAutocomplete(
      input,
      list,
      _getSchoolSuggestions,
      (name) => {
        // Selección de catálogo
        _selectedSchool = name;
        if (hint) {
          hint.textContent = "✓ Institución encontrada en el catálogo";
          hint.className = "field-hint sf-hint-ok";
        }
        input.setCustomValidity("");
      },
      (customName) => {
        // Propuesta del usuario
        _selectedSchool = customName;
        input.value = customName;
        if (typeof proposeInstitution === "function") {
          proposeInstitution(customName, _instType, "México");
        }
        if (hint) {
          hint.textContent =
            "⚠ Se registrará como nueva institución para revisión del administrador";
          hint.className = "field-hint sf-hint-warn";
        }
        // Enviar al servidor también
        _sendProposalToServer(customName, _instType);
      },
    );
  }

  // ── Campo de carrera ──────────────────────────────────────────────────────
  function _initCareerField() {
    const input = document.getElementById("regCareer");
    const list = document.getElementById("sfCareerList");
    const hint = document.getElementById("sfCareerHint");
    if (!input || !list) return;

    _buildAutocomplete(
      input,
      list,
      _getCareerSuggestions,
      (name) => {
        input.setCustomValidity("");
        if (hint) {
          hint.textContent = "✓";
          hint.className = "field-hint sf-hint-ok";
        }
      },
      (customName) => {
        input.value = customName;
        if (typeof proposeCareer === "function")
          proposeCareer(customName, _instType);
        if (hint) {
          hint.textContent = "⚠ Se registrará como nueva carrera";
          hint.className = "field-hint sf-hint-warn";
        }
      },
    );
  }

  // ── Toggle de tipo ────────────────────────────────────────────────────────
  function _initTypeToggle() {
    document.querySelectorAll("[name='sfInstType']").forEach((radio) => {
      radio.addEventListener("change", () => {
        _instType = radio.value;
        // Limpiar campos cuando cambia el tipo
        const schoolInput = document.getElementById("regOriginSchool");
        const careerInput = document.getElementById("regCareer");
        if (schoolInput) schoolInput.value = "";
        if (careerInput) careerInput.value = "";
        _selectedSchool = null;
        // Actualizar semestre: prepa tiene 1-6, universidad 1-12
        const semSelect = document.getElementById("regSemester");
        if (semSelect) {
          const max = _instType === "preparatoria" ? 6 : 12;
          Array.from(semSelect.options).forEach((opt) => {
            if (!opt.value) return; // opción vacía
            opt.style.display = parseInt(opt.value) <= max ? "" : "none";
          });
        }
        const hint = document.getElementById("sfSchoolHint");
        if (hint) hint.textContent = "";
      });
    });
  }

  // ── Campo de teléfono con banderas (auto-contenido) ──────────────────────
  // Lista completa de países con bandera emoji + lada
  const PHONE_COUNTRIES = [
    { code: "MX", name: "México", flag: "🇲🇽", dial: "+52" },
    { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "+1" },
    { code: "CA", name: "Canadá", flag: "🇨🇦", dial: "+1" },
    { code: "GT", name: "Guatemala", flag: "🇬🇹", dial: "+502" },
    { code: "BZ", name: "Belice", flag: "🇧🇿", dial: "+501" },
    { code: "SV", name: "El Salvador", flag: "🇸🇻", dial: "+503" },
    { code: "HN", name: "Honduras", flag: "🇭🇳", dial: "+504" },
    { code: "NI", name: "Nicaragua", flag: "🇳🇮", dial: "+505" },
    { code: "CR", name: "Costa Rica", flag: "🇨🇷", dial: "+506" },
    { code: "PA", name: "Panamá", flag: "🇵🇦", dial: "+507" },
    { code: "CU", name: "Cuba", flag: "🇨🇺", dial: "+53" },
    { code: "DO", name: "Rep. Dominicana", flag: "🇩🇴", dial: "+1" },
    { code: "PR", name: "Puerto Rico", flag: "🇵🇷", dial: "+1" },
    { code: "JM", name: "Jamaica", flag: "🇯🇲", dial: "+1" },
    { code: "HT", name: "Haití", flag: "🇭🇹", dial: "+509" },
    { code: "TT", name: "Trinidad y Tobago", flag: "🇹🇹", dial: "+1" },
    { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "+57" },
    { code: "VE", name: "Venezuela", flag: "🇻🇪", dial: "+58" },
    { code: "EC", name: "Ecuador", flag: "🇪🇨", dial: "+593" },
    { code: "PE", name: "Perú", flag: "🇵🇪", dial: "+51" },
    { code: "BO", name: "Bolivia", flag: "🇧🇴", dial: "+591" },
    { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56" },
    { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54" },
    { code: "UY", name: "Uruguay", flag: "🇺🇾", dial: "+598" },
    { code: "PY", name: "Paraguay", flag: "🇵🇾", dial: "+595" },
    { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "+55" },
    { code: "GY", name: "Guyana", flag: "🇬🇾", dial: "+592" },
    { code: "SR", name: "Surinam", flag: "🇸🇷", dial: "+597" },
    { code: "ES", name: "España", flag: "🇪🇸", dial: "+34" },
    { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
    { code: "FR", name: "Francia", flag: "🇫🇷", dial: "+33" },
    { code: "DE", name: "Alemania", flag: "🇩🇪", dial: "+49" },
    { code: "IT", name: "Italia", flag: "🇮🇹", dial: "+39" },
    { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "+44" },
    { code: "NL", name: "Países Bajos", flag: "🇳🇱", dial: "+31" },
    { code: "BE", name: "Bélgica", flag: "🇧🇪", dial: "+32" },
    { code: "CH", name: "Suiza", flag: "🇨🇭", dial: "+41" },
    { code: "AT", name: "Austria", flag: "🇦🇹", dial: "+43" },
    { code: "SE", name: "Suecia", flag: "🇸🇪", dial: "+46" },
    { code: "NO", name: "Noruega", flag: "🇳🇴", dial: "+47" },
    { code: "DK", name: "Dinamarca", flag: "🇩🇰", dial: "+45" },
    { code: "FI", name: "Finlandia", flag: "🇫🇮", dial: "+358" },
    { code: "PL", name: "Polonia", flag: "🇵🇱", dial: "+48" },
    { code: "RU", name: "Rusia", flag: "🇷🇺", dial: "+7" },
    { code: "UA", name: "Ucrania", flag: "🇺🇦", dial: "+380" },
    { code: "TR", name: "Turquía", flag: "🇹🇷", dial: "+90" },
    { code: "GR", name: "Grecia", flag: "🇬🇷", dial: "+30" },
    { code: "CZ", name: "Rep. Checa", flag: "🇨🇿", dial: "+420" },
    { code: "RO", name: "Rumania", flag: "🇷🇴", dial: "+40" },
    { code: "HU", name: "Hungría", flag: "🇭🇺", dial: "+36" },
    { code: "IL", name: "Israel", flag: "🇮🇱", dial: "+972" },
    { code: "AE", name: "Emiratos Árabes", flag: "🇦🇪", dial: "+971" },
    { code: "SA", name: "Arabia Saudita", flag: "🇸🇦", dial: "+966" },
    { code: "EG", name: "Egipto", flag: "🇪🇬", dial: "+20" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234" },
    { code: "ZA", name: "Sudáfrica", flag: "🇿🇦", dial: "+27" },
    { code: "KE", name: "Kenia", flag: "🇰🇪", dial: "+254" },
    { code: "MA", name: "Marruecos", flag: "🇲🇦", dial: "+212" },
    { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
    { code: "CN", name: "China", flag: "🇨🇳", dial: "+86" },
    { code: "JP", name: "Japón", flag: "🇯🇵", dial: "+81" },
    { code: "KR", name: "Corea del Sur", flag: "🇰🇷", dial: "+82" },
    { code: "PH", name: "Filipinas", flag: "🇵🇭", dial: "+63" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "+62" },
    { code: "MY", name: "Malasia", flag: "🇲🇾", dial: "+60" },
    { code: "TH", name: "Tailandia", flag: "🇹🇭", dial: "+66" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳", dial: "+84" },
    { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61" },
    { code: "NZ", name: "Nueva Zelanda", flag: "🇳🇿", dial: "+64" },
  ];

  let _phoneCountry = PHONE_COUNTRIES[0]; // México por defecto

  function _injectPhoneStyles() {
    if (document.getElementById("sf-phone-styles")) return;
    const s = document.createElement("style");
    s.id = "sf-phone-styles";
    s.textContent = `
/* ── SF Phone Field ────────────────────────────────── */
.sf-phone-wrap {
  display: flex;
  gap: 0;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: visible;
  transition: border-color 0.2s;
  background: var(--input-bg, rgba(255,255,255,0.04));
}
.sf-phone-wrap:focus-within {
  border-color: rgba(59,130,246,0.7);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
.sf-phone-dial-btn {
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
.sf-phone-dial-btn:hover { background: rgba(255,255,255,0.08); }
.sf-phone-dial-flag { font-size: 1.25rem; line-height: 1; }
.sf-phone-dial-code { font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em; }
.sf-phone-dial-caret {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.35);
  margin-left: 2px;
}
.sf-phone-number-input {
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
.sf-phone-number-input::placeholder { color: rgba(255,255,255,0.25); }

/* Dropdown */
.sf-phone-dropdown {
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
.sf-phone-dropdown.open { display: block; }
.sf-phone-search-wrap {
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  background: #1e293b;
  z-index: 1;
}
.sf-phone-search {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 7px 10px 7px 32px;
  font-size: 0.83rem;
  color: #e2e8f0;
  outline: none;
  font-family: inherit;
}
.sf-phone-search::placeholder { color: rgba(255,255,255,0.25); }
.sf-phone-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255,255,255,0.3);
  font-size: 0.78rem;
  pointer-events: none;
}
.sf-phone-country-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.sf-phone-country-list::-webkit-scrollbar { width: 4px; }
.sf-phone-country-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
.sf-phone-country-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.84rem;
  color: #e2e8f0;
  transition: background 0.1s;
}
.sf-phone-country-item:hover,
.sf-phone-country-item.sf-phone-active {
  background: rgba(59,130,246,0.14);
}
.sf-phone-country-item-flag { font-size: 1.35rem; line-height: 1; flex-shrink: 0; }
.sf-phone-country-item-name { flex: 1; }
.sf-phone-country-item-dial {
  font-size: 0.76rem;
  color: rgba(255,255,255,0.4);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.sf-phone-no-results {
  padding: 14px;
  text-align: center;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.3);
}
`;
    document.head.appendChild(s);
  }

  function _buildPhoneDropdown(container) {
    let dropdownOpen = false;

    const wrap = document.createElement("div");
    wrap.className = "sf-phone-wrap";

    const dialBtn = document.createElement("button");
    dialBtn.type = "button";
    dialBtn.className = "sf-phone-dial-btn";
    dialBtn.innerHTML = `
      <span class="sf-phone-dial-flag">${_phoneCountry.flag}</span>
      <span class="sf-phone-dial-code">${_phoneCountry.dial}</span>
      <i class="fas fa-chevron-down sf-phone-dial-caret"></i>`;

    const numberInput = document.createElement("input");
    numberInput.type = "tel";
    numberInput.id = "regPhoneNumber";
    numberInput.className = "sf-phone-number-input";
    numberInput.placeholder = "Número de teléfono";
    numberInput.autocomplete = "tel-national";

    // Hidden full-number input que lee acceso.js
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.id = "regPhone";

    function updateHidden() {
      const local = numberInput.value.replace(/\D/g, "");
      hiddenInput.value = local ? `${_phoneCountry.dial}${local}` : "";
    }
    numberInput.addEventListener("input", updateHidden);

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "sf-phone-dropdown";

    const searchWrap = document.createElement("div");
    searchWrap.className = "sf-phone-search-wrap";
    searchWrap.style.position = "relative";
    searchWrap.innerHTML = `
      <i class="fas fa-search sf-phone-search-icon"></i>
      <input type="text" class="sf-phone-search" placeholder="Buscar país o lada…" autocomplete="off" />`;

    const ul = document.createElement("ul");
    ul.className = "sf-phone-country-list";

    dropdown.appendChild(searchWrap);
    dropdown.appendChild(ul);

    function renderCountryList(q = "") {
      const filtered = PHONE_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.dial.includes(q) ||
          c.code.toLowerCase().includes(q.toLowerCase()),
      );
      if (!filtered.length) {
        ul.innerHTML = `<li class="sf-phone-no-results">Sin resultados</li>`;
        return;
      }
      ul.innerHTML = filtered
        .map(
          (c) => `
        <li class="sf-phone-country-item${c.code === _phoneCountry.code ? " sf-phone-active" : ""}"
            data-code="${c.code}">
          <span class="sf-phone-country-item-flag">${c.flag}</span>
          <span class="sf-phone-country-item-name">${c.name}</span>
          <span class="sf-phone-country-item-dial">${c.dial}</span>
        </li>`,
        )
        .join("");

      ul.querySelectorAll(".sf-phone-country-item").forEach((li) => {
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const c = PHONE_COUNTRIES.find((x) => x.code === li.dataset.code);
          if (c) {
            _phoneCountry = c;
            dialBtn.innerHTML = `
              <span class="sf-phone-dial-flag">${c.flag}</span>
              <span class="sf-phone-dial-code">${c.dial}</span>
              <i class="fas fa-chevron-down sf-phone-dial-caret"></i>`;
            updateHidden();
          }
          closeDropdown();
          numberInput.focus();
        });
      });
    }

    const searchInput = searchWrap.querySelector(".sf-phone-search");
    searchInput.addEventListener("input", () =>
      renderCountryList(searchInput.value),
    );

    function openDropdown() {
      dropdownOpen = true;
      dropdown.classList.add("open");
      searchInput.value = "";
      renderCountryList();
      setTimeout(() => searchInput.focus(), 30);
    }

    function closeDropdown() {
      dropdownOpen = false;
      dropdown.classList.remove("open");
    }

    dialBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownOpen ? closeDropdown() : openDropdown();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) closeDropdown();
    });

    wrap.appendChild(dialBtn);
    wrap.appendChild(numberInput);
    wrap.appendChild(hiddenInput);
    wrap.appendChild(dropdown);

    renderCountryList();
    return wrap;
  }

  function _initPhoneField() {
    // Si existe PhoneField externo, usarlo con prioridad
    if (typeof PhoneField !== "undefined") {
      PhoneField.init("phoneFieldContainer", {
        defaultCountry: "MX",
        onChange: () => {
          _phoneValid = PhoneField.validate().ok;
        },
      });
      return;
    }

    // Fallback: campo propio con banderas
    _injectPhoneStyles();
    const container = document.getElementById("phoneFieldContainer");
    if (!container) return;

    // Label
    const label = document.createElement("label");
    label.className = "field-label";
    label.setAttribute("for", "regPhoneNumber");
    label.innerHTML = `<i class="fas fa-phone"></i> Número de teléfono`;

    // Hint
    const hint = document.createElement("small");
    hint.className = "field-hint";
    hint.id = "sfPhoneHint";
    hint.textContent = "Selecciona tu país y escribe tu número sin la lada";

    const phoneWrap = _buildPhoneDropdown(container);

    container.appendChild(label);
    container.appendChild(phoneWrap);
    container.appendChild(hint);
  }

  // ── Envío al servidor de propuesta ────────────────────────────────────────
  async function _sendProposalToServer(name, type) {
    try {
      await fetch("/app/api/auth-schools.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, is_verified: false }),
        credentials: "include",
      });
    } catch (_) {
      /* silencioso */
    }
  }

  // ── Extractor de datos del formulario ────────────────────────────────────
  /**
   * Retorna los datos de los campos inteligentes para incluirlos en el POST.
   * Llama esto en tu registerForm submit handler.
   */
  function getFormData() {
    return {
      institution_type: _instType,
      school: document.getElementById("regOriginSchool")?.value?.trim() || "",
      career: document.getElementById("regCareer")?.value?.trim() || "",
      phone_dial:
        typeof PhoneField !== "undefined"
          ? PhoneField.getCountry().dial
          : "+52",
      phone_local:
        typeof PhoneField !== "undefined" ? PhoneField.getLocalNumber() : "",
      phone_full:
        typeof PhoneField !== "undefined" ? PhoneField.getValue() : "",
      phone_country_code:
        typeof PhoneField !== "undefined" ? PhoneField.getCountry().code : "MX",
    };
  }

  /**
   * Valida los campos inteligentes. Retorna { ok, errors: string[] }
   */
  function validate() {
    const errors = [];
    const school = document.getElementById("regOriginSchool")?.value?.trim();
    const career = document.getElementById("regCareer")?.value?.trim();

    if (!school) errors.push("La escuela de procedencia es requerida.");
    if (!career) errors.push("La carrera o programa es requerido.");

    if (typeof PhoneField !== "undefined") {
      const phoneResult = PhoneField.validate();
      if (!phoneResult.ok) errors.push(`Teléfono: ${phoneResult.msg}`);
    }

    return { ok: errors.length === 0, errors };
  }

  // ── Init principal ────────────────────────────────────────────────────────
  function init() {
    _injectStyles();
    _initTypeToggle();
    _initSchoolField();
    _initCareerField();
    _initPhoneField();
    _loadSchoolsFromAPI();
  }

  return { init, getFormData, validate };
})();

// Auto-init en DOMContentLoaded
document.addEventListener("DOMContentLoaded", SmartFields.init);
