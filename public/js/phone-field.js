/**
 * phone-field.js — RENOVATEC 2026
 * Componente de campo telefónico con:
 *  - Selector de lada (bandera + código)
 *  - Input separado para el número local
 *  - Validación en tiempo real (solo dígitos, longitud correcta)
 *  - Máscara visual según país
 * v20260507
 *
 * USO:
 *   <div id="phoneFieldContainer"></div>
 *   PhoneField.init('phoneFieldContainer', { onChange: (fullNumber) => {} });
 */

const PhoneField = (() => {
  // ── Catálogo de países con lada, bandera emoji y longitud esperada ──────
  const COUNTRIES = [
    // América Latina primero
    { code: "MX", name: "México",          dial: "+52", flag: "🇲🇽", digits: 10, placeholder: "452 112 3947" },
    { code: "US", name: "Estados Unidos",  dial: "+1",  flag: "🇺🇸", digits: 10, placeholder: "555 123 4567" },
    { code: "CA", name: "Canadá",          dial: "+1",  flag: "🇨🇦", digits: 10, placeholder: "416 123 4567" },
    { code: "GT", name: "Guatemala",       dial: "+502",flag: "🇬🇹", digits: 8,  placeholder: "5555 1234" },
    { code: "BZ", name: "Belice",          dial: "+501",flag: "🇧🇿", digits: 7,  placeholder: "222 1234" },
    { code: "SV", name: "El Salvador",     dial: "+503",flag: "🇸🇻", digits: 8,  placeholder: "7777 1234" },
    { code: "HN", name: "Honduras",        dial: "+504",flag: "🇭🇳", digits: 8,  placeholder: "9999 1234" },
    { code: "NI", name: "Nicaragua",       dial: "+505",flag: "🇳🇮", digits: 8,  placeholder: "8888 1234" },
    { code: "CR", name: "Costa Rica",      dial: "+506",flag: "🇨🇷", digits: 8,  placeholder: "8888 1234" },
    { code: "PA", name: "Panamá",          dial: "+507",flag: "🇵🇦", digits: 8,  placeholder: "6666 1234" },
    { code: "CU", name: "Cuba",            dial: "+53", flag: "🇨🇺", digits: 8,  placeholder: "5555 1234" },
    { code: "DO", name: "Rep. Dominicana", dial: "+1",  flag: "🇩🇴", digits: 10, placeholder: "809 123 4567" },
    { code: "CO", name: "Colombia",        dial: "+57", flag: "🇨🇴", digits: 10, placeholder: "300 123 4567" },
    { code: "VE", name: "Venezuela",       dial: "+58", flag: "🇻🇪", digits: 10, placeholder: "412 123 4567" },
    { code: "EC", name: "Ecuador",         dial: "+593",flag: "🇪🇨", digits: 9,  placeholder: "98 123 4567" },
    { code: "PE", name: "Perú",            dial: "+51", flag: "🇵🇪", digits: 9,  placeholder: "912 345 678" },
    { code: "BO", name: "Bolivia",         dial: "+591",flag: "🇧🇴", digits: 8,  placeholder: "7123 4567" },
    { code: "CL", name: "Chile",           dial: "+56", flag: "🇨🇱", digits: 9,  placeholder: "9 1234 5678" },
    { code: "AR", name: "Argentina",       dial: "+54", flag: "🇦🇷", digits: 10, placeholder: "11 1234 5678" },
    { code: "UY", name: "Uruguay",         dial: "+598",flag: "🇺🇾", digits: 9,  placeholder: "91 234 567" },
    { code: "PY", name: "Paraguay",        dial: "+595",flag: "🇵🇾", digits: 9,  placeholder: "961 234 567" },
    { code: "BR", name: "Brasil",          dial: "+55", flag: "🇧🇷", digits: 11, placeholder: "11 91234 5678" },
    // Europa / Resto
    { code: "ES", name: "España",          dial: "+34", flag: "🇪🇸", digits: 9,  placeholder: "612 345 678" },
    { code: "DE", name: "Alemania",        dial: "+49", flag: "🇩🇪", digits: 10, placeholder: "1512 3456789" },
    { code: "FR", name: "Francia",         dial: "+33", flag: "🇫🇷", digits: 9,  placeholder: "612 345 678" },
    { code: "GB", name: "Reino Unido",     dial: "+44", flag: "🇬🇧", digits: 10, placeholder: "7911 123456" },
    { code: "IT", name: "Italia",          dial: "+39", flag: "🇮🇹", digits: 10, placeholder: "312 345 6789" },
    { code: "JP", name: "Japón",           dial: "+81", flag: "🇯🇵", digits: 10, placeholder: "90 1234 5678" },
    { code: "CN", name: "China",           dial: "+86", flag: "🇨🇳", digits: 11, placeholder: "139 1234 5678" },
    { code: "IN", name: "India",           dial: "+91", flag: "🇮🇳", digits: 10, placeholder: "98123 45678" },
  ];

  let _container = null;
  let _selectedCountry = COUNTRIES[0]; // México por defecto
  let _onChangeCb = null;
  let _dropdownOpen = false;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _sanitize(val) {
    return val.replace(/\D/g, ""); // solo dígitos
  }

  function _validate(digits, country) {
    if (digits.length === 0) return { ok: false, msg: "" };
    if (digits.length < country.digits) {
      return { ok: false, msg: `Faltan ${country.digits - digits.length} dígito(s)` };
    }
    if (digits.length > country.digits) {
      return { ok: false, msg: `Número demasiado largo (máx. ${country.digits} dígitos)` };
    }
    return { ok: true, msg: "✓ Número válido" };
  }

  function _getFullNumber() {
    const input = _container.querySelector(".pf-number-input");
    const digits = _sanitize(input ? input.value : "");
    return digits ? `${_selectedCountry.dial} ${digits}` : "";
  }

  function _fireChange() {
    if (_onChangeCb) _onChangeCb(_getFullNumber(), _selectedCountry);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _buildHTML() {
    return `
<div class="pf-wrapper">
  <label class="field-label pf-label">
    <i class="fas fa-phone"></i>
    Número de teléfono / WhatsApp
  </label>
  <div class="pf-row">
    <!-- Selector de lada -->
    <button type="button" class="pf-dial-btn" aria-haspopup="listbox" aria-expanded="false">
      <span class="pf-flag">${_selectedCountry.flag}</span>
      <span class="pf-dial-code">${_selectedCountry.dial}</span>
      <i class="fas fa-chevron-down pf-chevron"></i>
    </button>

    <!-- Input del número -->
    <input
      type="tel"
      class="pf-number-input field-input"
      placeholder="${_selectedCountry.placeholder}"
      maxlength="${_selectedCountry.digits + 4}"
      inputmode="numeric"
      autocomplete="tel-national"
    />
  </div>

  <!-- Dropdown de países -->
  <div class="pf-dropdown" role="listbox" style="display:none;">
    <div class="pf-search-wrap">
      <i class="fas fa-search pf-search-icon"></i>
      <input type="text" class="pf-search" placeholder="Buscar país…" autocomplete="off" />
    </div>
    <ul class="pf-country-list">
      ${COUNTRIES.map((c) => `
        <li class="pf-country-item${c.code === _selectedCountry.code ? " selected" : ""}"
            data-code="${c.code}" role="option"
            aria-selected="${c.code === _selectedCountry.code}">
          <span class="pf-flag">${c.flag}</span>
          <span class="pf-country-name">${c.name}</span>
          <span class="pf-country-dial">${c.dial}</span>
        </li>`).join("")}
    </ul>
  </div>

  <!-- Hint de validación -->
  <small class="pf-hint"></small>
</div>`;
  }

  function _updateHint(input) {
    const hint = _container.querySelector(".pf-hint");
    const digits = _sanitize(input.value);
    const result = _validate(digits, _selectedCountry);
    if (!hint) return;
    hint.textContent = result.msg;
    hint.className = "pf-hint" + (result.ok ? " pf-hint-ok" : digits.length > 0 ? " pf-hint-error" : "");
    input.setCustomValidity(result.ok || digits.length === 0 ? "" : result.msg);
  }

  function _selectCountry(code) {
    const country = COUNTRIES.find((c) => c.code === code);
    if (!country) return;
    _selectedCountry = country;

    const btn = _container.querySelector(".pf-dial-btn");
    btn.querySelector(".pf-flag").textContent = country.flag;
    btn.querySelector(".pf-dial-code").textContent = country.dial;

    const numberInput = _container.querySelector(".pf-number-input");
    numberInput.placeholder = country.placeholder;
    numberInput.maxLength = country.digits + 4;
    numberInput.value = "";

    // Marcar selected en lista
    _container.querySelectorAll(".pf-country-item").forEach((li) => {
      const sel = li.dataset.code === code;
      li.classList.toggle("selected", sel);
      li.setAttribute("aria-selected", sel);
    });

    _updateHint(numberInput);
    _closeDropdown();
    _fireChange();
  }

  function _openDropdown() {
    const dd = _container.querySelector(".pf-dropdown");
    const btn = _container.querySelector(".pf-dial-btn");
    dd.style.display = "block";
    btn.setAttribute("aria-expanded", "true");
    _dropdownOpen = true;
    const search = _container.querySelector(".pf-search");
    if (search) { search.value = ""; _filterList(""); search.focus(); }
  }

  function _closeDropdown() {
    const dd = _container.querySelector(".pf-dropdown");
    const btn = _container.querySelector(".pf-dial-btn");
    if (dd) { dd.style.display = "none"; }
    if (btn) btn.setAttribute("aria-expanded", "false");
    _dropdownOpen = false;
  }

  function _filterList(query) {
    const q = query.toLowerCase();
    _container.querySelectorAll(".pf-country-item").forEach((li) => {
      const name = li.querySelector(".pf-country-name").textContent.toLowerCase();
      const dial = li.querySelector(".pf-country-dial").textContent;
      li.style.display = (name.includes(q) || dial.includes(q)) ? "" : "none";
    });
  }

  function _bindEvents() {
    const btn = _container.querySelector(".pf-dial-btn");
    const numberInput = _container.querySelector(".pf-number-input");
    const search = _container.querySelector(".pf-search");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _dropdownOpen ? _closeDropdown() : _openDropdown();
    });

    _container.querySelectorAll(".pf-country-item").forEach((li) => {
      li.addEventListener("click", () => _selectCountry(li.dataset.code));
    });

    if (search) {
      search.addEventListener("input", () => _filterList(search.value));
      search.addEventListener("click", (e) => e.stopPropagation());
      search.addEventListener("keydown", (e) => {
        if (e.key === "Escape") _closeDropdown();
      });
    }

    numberInput.addEventListener("input", () => {
      // Solo permitir dígitos y espacios/guiones para visualización
      const raw = numberInput.value.replace(/[^\d\s\-]/g, "");
      numberInput.value = raw;
      _updateHint(numberInput);
      _fireChange();
    });

    numberInput.addEventListener("keydown", (e) => {
      // Bloquear letras (permitir teclas de control)
      if (e.key.length === 1 && !/[\d\s\-]/.test(e.key)) {
        e.preventDefault();
        // Vibrar suavemente en móvil
        if (navigator.vibrate) navigator.vibrate(30);
      }
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener("click", (e) => {
      if (_dropdownOpen && !_container.contains(e.target)) _closeDropdown();
    });
  }

  // ── Estilos (inyectados una sola vez) ────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById("pf-styles")) return;
    const style = document.createElement("style");
    style.id = "pf-styles";
    style.textContent = `
.pf-wrapper { position: relative; width: 100%; }
.pf-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 0.83rem; font-weight: 600; color: var(--text-main, #e2e8f0); }
.pf-row { display: flex; gap: 0; }
.pf-dial-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 0 10px; min-width: 80px; height: 100%;
  background: var(--input-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--input-border, rgba(255,255,255,0.12));
  border-right: none;
  border-radius: 8px 0 0 8px;
  color: var(--text-main, #e2e8f0);
  cursor: pointer; white-space: nowrap;
  transition: background .15s;
  font-size: 0.83rem; font-weight: 600;
}
.pf-dial-btn:hover { background: var(--input-hover-bg, rgba(255,255,255,0.1)); }
.pf-flag { font-size: 1.15rem; line-height: 1; }
.pf-dial-code { font-size: 0.8rem; }
.pf-chevron { font-size: 0.65rem; color: var(--text-mute, #94a3b8); transition: transform .2s; }
.pf-dial-btn[aria-expanded="true"] .pf-chevron { transform: rotate(180deg); }
.pf-number-input { border-radius: 0 8px 8px 0 !important; flex: 1; }
.pf-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 9999;
  width: 280px; max-height: 240px;
  background: var(--card-bg, #1e293b);
  border: 1px solid var(--border-sm, rgba(255,255,255,0.1));
  border-radius: 10px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.pf-search-wrap {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--border-sm, rgba(255,255,255,0.07));
}
.pf-search-icon { font-size: 0.75rem; color: var(--text-mute, #94a3b8); }
.pf-search {
  flex: 1; background: none; border: none; outline: none;
  font-size: 0.8rem; color: var(--text-main, #e2e8f0);
}
.pf-country-list { list-style: none; margin: 0; padding: 4px 0; overflow-y: auto; max-height: 190px; }
.pf-country-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; cursor: pointer; font-size: 0.8rem;
  transition: background .12s;
}
.pf-country-item:hover, .pf-country-item.selected { background: var(--accent-dim, rgba(59,130,246,0.15)); }
.pf-country-name { flex: 1; color: var(--text-main, #e2e8f0); }
.pf-country-dial { color: var(--text-mute, #94a3b8); font-size: 0.75rem; }
.pf-hint { display: block; margin-top: 4px; font-size: 0.72rem; min-height: 16px; transition: color .2s; }
.pf-hint-ok { color: #4ade80; }
.pf-hint-error { color: #f87171; }
/* Scrollbar en dropdown */
.pf-country-list::-webkit-scrollbar { width: 4px; }
.pf-country-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
`;
    document.head.appendChild(style);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Inicializa el campo de teléfono.
   * @param {string|HTMLElement} containerIdOrEl - ID del contenedor o el elemento.
   * @param {object} options
   * @param {function} options.onChange - Callback(fullNumber, countryObj)
   * @param {string}   options.defaultCountry - Código ISO ej. "MX"
   */
  function init(containerIdOrEl, options = {}) {
    _container = typeof containerIdOrEl === "string"
      ? document.getElementById(containerIdOrEl)
      : containerIdOrEl;

    if (!_container) { console.error("[PhoneField] Contenedor no encontrado:", containerIdOrEl); return; }

    if (options.defaultCountry) {
      const found = COUNTRIES.find((c) => c.code === options.defaultCountry);
      if (found) _selectedCountry = found;
    }

    _onChangeCb = options.onChange || null;

    _injectStyles();
    _container.innerHTML = _buildHTML();
    _bindEvents();
  }

  /**
   * Retorna el número completo con lada ej. "+52 4521123947"
   */
  function getValue() { return _getFullNumber(); }

  /**
   * Retorna solo los dígitos locales sin lada.
   */
  function getLocalNumber() {
    const input = _container ? _container.querySelector(".pf-number-input") : null;
    return input ? _sanitize(input.value) : "";
  }

  /**
   * Retorna el país seleccionado.
   */
  function getCountry() { return { ..._selectedCountry }; }

  /**
   * Valida el estado actual. Retorna { ok, msg }.
   */
  function validate() {
    const input = _container ? _container.querySelector(".pf-number-input") : null;
    const digits = input ? _sanitize(input.value) : "";
    if (!digits) return { ok: false, msg: "El número de teléfono es requerido" };
    return _validate(digits, _selectedCountry);
  }

  /**
   * Establece un valor programáticamente.
   * @param {string} dialCode - ej. "+52"
   * @param {string} localNumber - ej. "4521123947"
   */
  function setValue(dialCode, localNumber) {
    const country = COUNTRIES.find((c) => c.dial === dialCode);
    if (country) _selectCountry(country.code);
    const input = _container ? _container.querySelector(".pf-number-input") : null;
    if (input) {
      input.value = localNumber;
      _updateHint(input);
    }
  }

  /**
   * Retorna todos los países disponibles.
   */
  function getCountries() { return [...COUNTRIES]; }

  return { init, getValue, getLocalNumber, getCountry, validate, setValue, getCountries, COUNTRIES };
})();
