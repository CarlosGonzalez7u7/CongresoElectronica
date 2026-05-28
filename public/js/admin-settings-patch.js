/**
 * admin-settings-patch.js — Parche v1.0
 * ──────────────────────────────────────────────────────────────────
 * Sobrescribe openConvModal() y openModuleModal() del settingsModule
 * para corregir:
 *   1. El modal de convocatoria es ahora completamente dinámico (inline).
 *   2. Los módulos incluidos se muestran SIN duplicados.
 *   3. Los chips de módulos son clicables → abren modal de edición.
 *   4. El modal de módulo incluye perfil del responsable con foto.
 * ──────────────────────────────────────────────────────────────────
 * INSTRUCCIÓN DE USO: carga este archivo DESPUÉS de admin-settings.js
 *   <script src="js/admin-settings.js?v=31"></script>
 *   <script src="js/admin-settings-patch.js?v=1"></script>
 */

/* Esperar a que el DOM esté listo */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof settingsModule === 'undefined') {
    console.warn('[patch] settingsModule no encontrado');
    return;
  }

  /* ════════════════════════════════════════════════════
     CSS inyectado una sola vez
  ════════════════════════════════════════════════════ */
  if (!document.getElementById('_patch_styles')) {
    const style = document.createElement('style');
    style.id = '_patch_styles';
    style.textContent = `
      /* ── Conv Modal ── */
      #_convModalDyn .modal-card { max-width: 720px; width: 95vw; }
      #_convModalDyn .modal-body { max-height: 78vh; overflow-y: auto; padding: 20px 22px; }

      /* ── Sección form ── */
      .patch-section { margin-bottom: 20px; }
      .patch-section-title {
        font-size: 11px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: var(--text-mute, #64748b);
        display: flex; align-items: center; gap: 6px;
        margin-bottom: 10px; padding-bottom: 6px;
        border-bottom: 1px solid var(--border, #2a3045);
      }

      /* ── Módulos incluidos ── */
      .mods-row {
        display: flex; flex-wrap: wrap; gap: 8px;
        margin-bottom: 10px;
      }
      .mod-chip {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 6px 13px; border-radius: 99px; font-size: 13px;
        font-weight: 600; cursor: pointer; border: 1.5px solid;
        transition: all .15s; position: relative; user-select: none;
      }
      .mod-chip--active {
        border-color: var(--green, #10b981);
        background: rgba(16,185,129,.1); color: var(--green, #10b981);
      }
      .mod-chip--active:hover { filter: brightness(1.15); }
      .mod-chip--available {
        border-color: var(--border, #2a3045);
        background: var(--surface, #131929);
        color: var(--text-mute, #64748b);
      }
      .mod-chip--available:hover {
        border-color: var(--green, #10b981);
        color: var(--green, #10b981);
        background: rgba(16,185,129,.06);
      }
      .mod-chip .chip-x {
        font-size: 11px; opacity: .6; margin-left: 2px;
        line-height: 1; padding: 1px 2px; border-radius: 50%;
      }
      .mod-chip .chip-x:hover { opacity: 1; background: rgba(255,255,255,.15); }
      .mod-chip--custom {
        border-color: var(--amber, #f59e0b);
        background: rgba(245,158,11,.08); color: var(--amber, #f59e0b);
      }
      .mod-chip--edit-badge {
        position: absolute; top: -5px; right: -5px;
        width: 16px; height: 16px; border-radius: 50%;
        background: var(--accent, #22d3ee); color: #000;
        font-size: 8px; display: flex; align-items: center; justify-content: center;
        pointer-events: none;
      }

      .mods-custom-input {
        display: flex; gap: 8px; align-items: center; margin-top: 6px;
      }
      .mods-custom-input input {
        flex: 1; background: var(--input-bg, #1e2535);
        border: 1px solid var(--border, #2a3045); border-radius: 8px;
        padding: 8px 12px; color: var(--text, #e2e8f0); font-size: 13px;
      }
      .mods-custom-input input:focus { outline: none; border-color: var(--accent, #22d3ee); }
      .mods-custom-input .btn { white-space: nowrap; flex-shrink: 0; }

      /* ── Modal módulo mejorado ── */
      #_moduleModalDyn .modal-card { max-width: 640px; width: 95vw; }
      #_moduleModalDyn .modal-body { max-height: 80vh; overflow-y: auto; padding: 18px 22px; }

      /* Foto responsable */
      .resp-photo-wrap {
        display: flex; align-items: flex-start; gap: 16px; margin-bottom: 14px;
      }
      .resp-photo-thumb {
        width: 80px; height: 80px; border-radius: 50%;
        object-fit: cover; border: 2.5px solid var(--accent, #22d3ee);
        background: var(--surface, #131929); flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-mute); font-size: 28px; overflow: hidden;
      }
      .resp-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .resp-photo-actions { display: flex; flex-direction: column; gap: 8px; }
      .resp-photo-actions small { font-size: 11px; color: var(--text-mute); }

      /* Galería de fotos del módulo */
      .mod-gallery-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(100px,1fr));
        gap: 8px; margin-top: 8px;
      }
      .mod-gallery-item {
        position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
        background: var(--surface, #131929); border: 1px solid var(--border, #2a3045);
      }
      .mod-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
      .mod-gallery-item .del-img-btn {
        position: absolute; top: 4px; right: 4px;
        width: 22px; height: 22px; border-radius: 50%;
        background: rgba(239,68,68,.85); color: #fff;
        border: none; cursor: pointer; font-size: 10px;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .15s;
      }
      .mod-gallery-item:hover .del-img-btn { opacity: 1; }

      /* Perfil en chips de convocatoria */
      .conv-mod-resp {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; color: var(--text-mute);
        margin-top: 2px;
      }
      .conv-mod-resp img {
        width: 18px; height: 18px; border-radius: 50%; object-fit: cover;
        border: 1px solid var(--border, #2a3045);
      }
    `;
    document.head.appendChild(style);
  }

  /* ════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════ */
  const e = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const toLocal = (d) => {
    if (!d || String(d).startsWith('0000')) return '';
    const dt = new Date(String(d).replace(' ','T'));
    if (isNaN(dt)) return '';
    const pad = n => String(n).padStart(2,'0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  /* Obtener o crear el modal de convocatoria dinámico */
  function getConvModal() {
    let m = document.getElementById('_convModalDyn');
    if (!m) {
      m = document.createElement('div');
      m.id = '_convModalDyn';
      m.className = 'modal-overlay hidden';
      m.style.zIndex = '9000';
      document.body.appendChild(m);
      m.addEventListener('click', ev => { if (ev.target === m) settingsModule.closeModal('_convModalDyn'); });
    }
    return m;
  }

  /* ════════════════════════════════════════════════════
     RENDER MÓDULOS INCLUIDOS (sin duplicados)
  ════════════════════════════════════════════════════ */
  function renderModulesSection(cv) {
    // Los módulos que ya existen en BD para esta convocatoria
    const dbMods = cv?.modules ?? [];

    // Los módulos "fijos" disponibles (congress, robotics, camp)
    // que se guardan en included_modules JSON
    const incJson = (() => {
      try { return JSON.parse(cv?.included_modules ?? 'null') || {}; }
      catch { return {}; }
    })();

    const isCongress  = incJson.congress  ?? true;
    const isRobotics  = incJson.robotics  ?? true;
    const isCamp      = incJson.camp      ?? false;
    const customFixed = incJson.custom    ?? [];

    // ── Chips de módulos BD (clicables → abren modal edición) ──
    const dbChips = dbMods.map(m => {
      const icon = m.icon || 'fas fa-puzzle-piece';
      const hasResp = !!m.responsible_name;
      const statusDot = m.status === 'published'
        ? `<span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;margin-left:2px"></span>`
        : m.status === 'disabled'
          ? `<span style="width:6px;height:6px;border-radius:50%;background:#ef4444;display:inline-block;margin-left:2px"></span>`
          : `<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block;margin-left:2px"></span>`;

      return `<button type="button" class="mod-chip mod-chip--active mod-chip--custom"
          title="Clic para editar · ${e(m.title)}"
          onclick="settingsModule.openModuleModal(${cv.id}, ${m.id})"
          style="position:relative">
        <i class="${e(icon)}"></i>
        ${e(m.title)}
        ${statusDot}
        <span class="mod-chip--edit-badge"><i class="fas fa-pen"></i></span>
      </button>`;
    }).join('');

    // ── Chips disponibles fijos (toggle) ──
    const fixedChips = [
      { key: 'congress',  icon: 'fas fa-microphone', label: 'Congreso',  checked: isCongress },
      { key: 'robotics',  icon: 'fas fa-robot',       label: 'Robótica',  checked: isRobotics },
      { key: 'camp',      icon: 'fas fa-campground',  label: 'Campamento',checked: isCamp },
    ].map(f => `
      <button type="button" class="mod-chip ${f.checked ? 'mod-chip--active' : 'mod-chip--available'}"
          id="_mod_${f.key}" data-modkey="${f.key}"
          onclick="_patchToggleFixedMod(this, '${f.key}')"
          title="${f.checked ? 'Clic para quitar' : 'Clic para agregar'}">
        <i class="${f.icon}"></i>
        ${f.label}
        ${f.checked
          ? `<span class="chip-x" onclick="event.stopPropagation();_patchToggleFixedMod(document.getElementById('_mod_${f.key}'),'${f.key}')"><i class="fas fa-times"></i></span>`
          : ''}
      </button>`).join('');

    // ── Chips personalizados ya guardados en included_modules.custom ──
    const customChips = customFixed.map((m, idx) => `
      <button type="button" class="mod-chip mod-chip--custom"
          data-custom-idx="${idx}" title="Quitar módulo personalizado"
          onclick="_patchRemoveCustomFixed(${idx})">
        <i class="fas fa-star"></i>
        ${e(m.label)}
        <span class="chip-x"><i class="fas fa-times"></i></span>
      </button>`).join('');

    return `
      <div class="patch-section">
        <div class="patch-section-title">
          <i class="fas fa-puzzle-piece"></i> Módulos incluidos
          <small style="font-weight:400;margin-left:4px;text-transform:none">Agrega o quita según el programa académico.</small>
        </div>

        ${dbMods.length ? `
        <p style="font-size:11px;color:var(--text-mute);margin-bottom:6px">
          <i class="fas fa-circle-info"></i>
          Los módulos con <i class="fas fa-pen" style="font-size:9px"></i> ya están creados — clic para editar su perfil, fotos y responsable.
        </p>
        <div class="mods-row" id="_modsDbRow">${dbChips}</div>
        ` : `<p style="font-size:12px;color:var(--text-mute);margin-bottom:8px"><i class="fas fa-info-circle"></i> Aún no hay módulos creados. Después de guardar la convocatoria, haz clic en "+ Módulo" en la tarjeta para crearlos.</p>`}

        <p style="font-size:11px;color:var(--text-mute);margin:8px 0 6px">Módulos base del evento:</p>
        <div class="mods-row" id="_modsFixedRow">
          ${fixedChips}
          ${customChips}
        </div>

        <div class="mods-custom-input">
          <input id="_customModInput" placeholder="Módulo personalizado, por ejemplo: Laboratorios" maxlength="60">
          <button type="button" class="btn btn-secondary btn-small" onclick="_patchAddCustomFixed()" style="background:var(--amber,#f59e0b);color:#000;border-color:var(--amber,#f59e0b)">
            <i class="fas fa-plus"></i> Agregar
          </button>
        </div>

        <!-- Datos ocultos para guardar -->
        <input type="hidden" id="_modCongress" value="${isCongress?'1':'0'}">
        <input type="hidden" id="_modRobotics" value="${isRobotics?'1':'0'}">
        <input type="hidden" id="_modCamp"     value="${isCamp?'1':'0'}">
        <div id="_modCustomFixedData" style="display:none">${JSON.stringify(customFixed)}</div>
      </div>`;
  }

  /* Helpers globales para interacción de chips */
  window._patchToggleFixedMod = function(btn, key) {
    const hiddenEl = document.getElementById(`_mod${key.charAt(0).toUpperCase()+key.slice(1)}`);
    const isOn = hiddenEl?.value === '1';
    const newVal = isOn ? '0' : '1';
    if (hiddenEl) hiddenEl.value = newVal;

    if (newVal === '1') {
      btn.className = 'mod-chip mod-chip--active';
      const icons = { congress:'fas fa-microphone', robotics:'fas fa-robot', camp:'fas fa-campground' };
      const labels = { congress:'Congreso', robotics:'Robótica', camp:'Campamento' };
      btn.innerHTML = `<i class="${icons[key]}"></i> ${labels[key]}
        <span class="chip-x" onclick="event.stopPropagation();_patchToggleFixedMod(document.getElementById('_mod_${key}'),'${key}')"><i class="fas fa-times"></i></span>`;
    } else {
      btn.className = 'mod-chip mod-chip--available';
      const icons = { congress:'fas fa-microphone', robotics:'fas fa-robot', camp:'fas fa-campground' };
      const labels = { congress:'Congreso', robotics:'Robótica', camp:'Campamento' };
      btn.innerHTML = `<i class="${icons[key]}"></i> ${labels[key]}`;
    }
  };

  window._patchAddCustomFixed = function() {
    const input = document.getElementById('_customModInput');
    const label = input?.value.trim();
    if (!label) return;
    const dataEl = document.getElementById('_modCustomFixedData');
    const customs = JSON.parse(dataEl?.textContent || '[]');
    customs.push({ key: label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''), label, icon:'fas fa-star', price:0 });
    if (dataEl) dataEl.textContent = JSON.stringify(customs);
    input.value = '';
    // Re-render chips
    const row = document.getElementById('_modsFixedRow');
    if (row) {
      const lastCustoms = row.querySelectorAll('[data-custom-idx]');
      lastCustoms.forEach(el => el.remove());
      customs.forEach((m,idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mod-chip mod-chip--custom';
        btn.dataset.customIdx = idx;
        btn.title = 'Quitar módulo personalizado';
        btn.onclick = () => _patchRemoveCustomFixed(idx);
        btn.innerHTML = `<i class="fas fa-star"></i> ${e(m.label)} <span class="chip-x"><i class="fas fa-times"></i></span>`;
        row.appendChild(btn);
      });
    }
  };

  window._patchRemoveCustomFixed = function(idx) {
    const dataEl = document.getElementById('_modCustomFixedData');
    const customs = JSON.parse(dataEl?.textContent || '[]');
    customs.splice(idx,1);
    if (dataEl) dataEl.textContent = JSON.stringify(customs);
    // Re-render
    const row = document.getElementById('_modsFixedRow');
    if (row) {
      row.querySelectorAll('[data-custom-idx]').forEach(el => el.remove());
      customs.forEach((m,i) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'mod-chip mod-chip--custom';
        btn.dataset.customIdx = i; btn.title = 'Quitar módulo personalizado';
        btn.onclick = () => _patchRemoveCustomFixed(i);
        btn.innerHTML = `<i class="fas fa-star"></i> ${e(m.label)} <span class="chip-x"><i class="fas fa-times"></i></span>`;
        row.appendChild(btn);
      });
    }
  };

  /* ════════════════════════════════════════════════════
     OVERRIDE: openConvModal()
  ════════════════════════════════════════════════════ */
  settingsModule.openConvModal = function(id) {
    const cv = id ? this.data.convocatorias.find(c => c.id == id) : null;
    const isNew = !id;

    const pricingMode = cv?.pricing_mode ?? 'fixed';
    const statusOpts = [
      { v:'1', l:'Activa' }, { v:'0', l:'Inactiva' }
    ].map(o => `<option value="${o.v}" ${String(cv?.is_active ?? '1') === o.v ? 'selected' : ''}>${o.l}</option>`).join('');

    const pricingOpts = [
      { v:'fixed', l:'Precio fijo' }, { v:'staged', l:'Precio por etapas' }
    ].map(o => `<option value="${o.v}" ${pricingMode === o.v ? 'selected' : ''}>${o.l}</option>`).join('');

    // Precio fijo
    const fixedBlock = `
      <div id="_convFixedBlock" style="${pricingMode !== 'fixed' ? 'display:none' : ''}">
        <div class="form-field">
          <label>Precio base (MXN) <span class="required-mark">*</span></label>
          <input class="form-control" type="number" min="0" step="0.01"
            id="_convPrecio" placeholder="350.00" value="${e(cv?.precio_base ?? '')}">
        </div>
      </div>`;

    // Precio por etapas
    let stagesHtml = '';
    if (cv?.pricing_mode === 'staged' && cv?.price_stages) {
      try {
        JSON.parse(cv.price_stages).forEach(s => {
          stagesHtml += _psPriceStageRow(s);
        });
      } catch {}
    }
    const stagedBlock = `
      <div id="_convStagedBlock" style="${pricingMode !== 'staged' ? 'display:none' : ''}">
        <label style="font-size:12px;color:var(--text-mute)">Etapas de precio</label>
        <div id="_convPriceStages">${stagesHtml}</div>
        <button type="button" class="btn btn-secondary btn-small" style="margin-top:6px"
          onclick="_psAddPriceStage()"><i class="fas fa-plus"></i> Agregar etapa</button>
      </div>`;

    const modal = getConvModal();
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3>
            <i class="fas fa-bullhorn" style="color:var(--amber,#f59e0b)"></i>
            <span>${isNew ? 'Nueva Convocatoria' : 'Editar Convocatoria'}</span>
          </h3>
          <button class="modal-close-btn" onclick="settingsModule.closeModal('_convModalDyn')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="_convId" value="${cv?.id ?? ''}">

          <!-- Información general -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-info-circle"></i> Información general</div>
            <div class="form-grid-2">
              <div class="form-field form-field-full">
                <label>Título <span class="required-mark">*</span></label>
                <input class="form-control" id="_convTitulo" placeholder="Ej. RENOVATEC 2026"
                  value="${e(cv?.titulo ?? '')}">
              </div>
              <div class="form-field">
                <label>Tipo / Categoría</label>
                <input class="form-control" id="_convTipo" list="_convTipoSug"
                  placeholder="Ej. Congreso Académico" value="${e(cv?.conv_tipo ?? '')}">
                <datalist id="_convTipoSug"></datalist>
              </div>
              <div class="form-field">
                <label>Estado</label>
                <select class="form-control" id="_convActive">${statusOpts}</select>
              </div>
              <div class="form-field form-field-full">
                <label>Descripción</label>
                <textarea class="form-control" id="_convDesc" rows="3"
                  placeholder="Descripción de la convocatoria">${e(cv?.descripcion ?? '')}</textarea>
              </div>
            </div>
          </div>

          <!-- Fechas -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-calendar-alt"></i> Fechas</div>
            <div class="form-grid-2">
              <div class="form-field">
                <label>Inicio de inscripciones</label>
                <input class="form-control" type="datetime-local" id="_convInsIni"
                  value="${toLocal(cv?.inscripcion_inicio)}">
              </div>
              <div class="form-field">
                <label>Cierre de inscripciones</label>
                <input class="form-control" type="datetime-local" id="_convInsFin"
                  value="${toLocal(cv?.inscripcion_fin)}">
              </div>
              <div class="form-field">
                <label>Inicio del evento</label>
                <input class="form-control" type="datetime-local" id="_convEvtIni"
                  value="${toLocal(cv?.evento_inicio)}">
              </div>
              <div class="form-field">
                <label>Fin del evento</label>
                <input class="form-control" type="datetime-local" id="_convEvtFin"
                  value="${toLocal(cv?.evento_fin)}">
              </div>
            </div>
          </div>

          <!-- Precio -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-tag"></i> Precios</div>
            <div class="form-field" style="margin-bottom:10px">
              <label>Modalidad de precio</label>
              <select class="form-control" id="_convPricingMode"
                onchange="_psTogglePricing()">${pricingOpts}</select>
            </div>
            ${fixedBlock}
            ${stagedBlock}
          </div>

          <!-- Módulos -->
          ${renderModulesSection(cv)}

          <!-- PDF -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-file-pdf"></i> Documento PDF</div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span id="_convPdfStatus" style="font-size:13px;color:var(--text-mute)">
                ${cv?.documento_url
                  ? `<a href="${e(cv.documento_url)}" target="_blank" style="color:var(--accent,#22d3ee)"><i class="fas fa-file-pdf"></i> Ver PDF actual</a>`
                  : '<i class="fas fa-minus-circle"></i> Sin PDF'}
              </span>
              ${id ? `<button type="button" class="btn btn-secondary btn-small"
                onclick="settingsModule.pickDoc('convocatoria',${id})">
                <i class="fas fa-upload"></i> Subir / Reemplazar PDF
              </button>` : '<small style="color:var(--text-mute)">Guarda la convocatoria primero para subir el PDF.</small>'}
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-secondary btn-small" onclick="settingsModule.closeModal('_convModalDyn')">
            Cancelar
          </button>
          <button class="btn btn-primary" id="_convSaveBtn" onclick="_patchSaveConv()">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>`;

    // Llenar datalist de tipos
    const dl = modal.querySelector('#_convTipoSug');
    if (dl && this.data?.convocatorias) {
      const defaults = ['Torneo de Robótica','Torneo de Videojuegos','Congreso','Congreso Académico','Campamento','Hackathon','Taller'];
      const fromDB = this.data.convocatorias.map(c => c.conv_tipo).filter(Boolean);
      [...new Set([...fromDB, ...defaults])].sort().forEach(t => {
        const opt = document.createElement('option'); opt.value = t; dl.appendChild(opt);
      });
    }

    this.showModal('_convModalDyn');
  };

  /* ── Pricing helpers globales ── */
  window._psTogglePricing = function() {
    const mode = document.getElementById('_convPricingMode')?.value;
    const fixEl = document.getElementById('_convFixedBlock');
    const stgEl = document.getElementById('_convStagedBlock');
    if (fixEl) fixEl.style.display = mode === 'fixed' ? '' : 'none';
    if (stgEl) stgEl.style.display = mode === 'staged' ? '' : 'none';
  };

  function _psPriceStageRow(st={}) {
    return `<div class="price-stage-row" style="display:flex;gap:8px;align-items:flex-end;margin-bottom:6px">
      <div class="form-field">
        <label style="font-size:11px">Inicio</label>
        <input class="form-control" type="date" value="${(st.start||'').substring(0,10)}" data-role="ps-start">
      </div>
      <div class="form-field">
        <label style="font-size:11px">Fin</label>
        <input class="form-control" type="date" value="${(st.end||'').substring(0,10)}" data-role="ps-end">
      </div>
      <div class="form-field">
        <label style="font-size:11px">Precio (MXN)</label>
        <input class="form-control" type="number" min="0" step="0.01"
          value="${st.price||''}" placeholder="400.00" data-role="ps-price">
      </div>
      <button type="button" class="btn btn-danger btn-small" style="flex-shrink:0"
        onclick="this.closest('.price-stage-row').remove()"><i class="fas fa-times"></i></button>
    </div>`;
  }
  window._psAddPriceStage = function() {
    const wrap = document.getElementById('_convPriceStages');
    if (wrap) wrap.insertAdjacentHTML('beforeend', _psPriceStageRow());
  };

  /* ── Save conv ── */
  window._patchSaveConv = async function() {
    const id        = document.getElementById('_convId').value;
    const titulo    = document.getElementById('_convTitulo').value.trim();
    const tipo      = document.getElementById('_convTipo').value.trim();
    const desc      = document.getElementById('_convDesc').value.trim();
    const active    = document.getElementById('_convActive').value;
    const mode      = document.getElementById('_convPricingMode').value;

    if (!titulo) return settingsModule.toast('El título es obligatorio', 'error');

    let precio_base = 0, price_stages = null;
    if (mode === 'fixed') {
      precio_base = parseFloat(document.getElementById('_convPrecio')?.value);
      if (isNaN(precio_base)) return settingsModule.toast('Ingresa un precio válido', 'error');
    } else {
      const rows = document.querySelectorAll('#_convPriceStages .price-stage-row');
      const stages = [];
      for (const row of rows) {
        const start = row.querySelector('[data-role="ps-start"]').value;
        const end   = row.querySelector('[data-role="ps-end"]').value;
        const price = parseFloat(row.querySelector('[data-role="ps-price"]').value);
        if (!start || !end || isNaN(price))
          return settingsModule.toast('Completa todas las etapas de precio', 'error');
        stages.push({ start, end, price });
      }
      price_stages = JSON.stringify(stages);
      precio_base = stages[0]?.price || 0;
    }

    const congress = document.getElementById('_modCongress')?.value === '1';
    const robotics = document.getElementById('_modRobotics')?.value === '1';
    const camp     = document.getElementById('_modCamp')?.value === '1';
    const customFixedRaw = document.getElementById('_modCustomFixedData')?.textContent || '[]';
    let customFixed = [];
    try { customFixed = JSON.parse(customFixedRaw); } catch {}

    const included_modules = JSON.stringify({ congress, robotics, camp, custom: customFixed });

    const payload = {
      titulo, conv_tipo: tipo, descripcion: desc,
      precio_base, is_active: active, pricing_mode: mode,
      price_stages, included_modules,
      inscripcion_inicio: document.getElementById('_convInsIni')?.value || null,
      inscripcion_fin:    document.getElementById('_convInsFin')?.value || null,
      evento_inicio:      document.getElementById('_convEvtIni')?.value || null,
      evento_fin:         document.getElementById('_convEvtFin')?.value || null,
    };

    const btn = document.getElementById('_convSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    if (id) {
      payload.id = id;
      await settingsModule.postUpdate('update_convocatoria', payload);
    } else {
      await settingsModule.postUpdate('add_convocatoria', payload);
    }

    settingsModule.closeModal('_convModalDyn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  };

  /* ════════════════════════════════════════════════════
     OVERRIDE: openModuleModal() — con foto de responsable y galería
  ════════════════════════════════════════════════════ */
  settingsModule.openModuleModal = function(convId, moduleId) {
    const cv = this.data.convocatorias.find(c => c.id == convId);
    if (!cv) return;
    const mod = moduleId ? (cv.modules || []).find(m => m.id == moduleId) : null;
    const isNew = !mod;

    // Limpiar modal anterior
    const prev = document.getElementById('_moduleModalDyn');
    if (prev) prev.remove();

    const typeOpts = [
      { v:'workshop',   l:'Taller', icon:'fas fa-chalkboard-teacher' },
      { v:'conference', l:'Conferencia / Ponencia', icon:'fas fa-microphone-lines' },
      { v:'custom',     l:'Módulo personalizado', icon:'fas fa-puzzle-piece' },
    ].map(o => `<option value="${o.v}" ${(mod?.module_type||'workshop')===o.v?'selected':''}>${o.l}</option>`).join('');

    const roleOpts = [
      { v:'manager',    l:'Responsable' },
      { v:'instructor', l:'Instructor / Tallerista' },
      { v:'speaker',    l:'Ponente / Conferencista' },
    ].map(o => `<option value="${o.v}" ${(mod?.responsible_role||'instructor')===o.v?'selected':''}>${o.l}</option>`).join('');

    const statusOpts = [
      { v:'draft',    l:'Borrador' },
      { v:'published',l:'Publicado' },
      { v:'disabled', l:'Deshabilitado' },
    ].map(o => `<option value="${o.v}" ${(mod?.status||'draft')===o.v?'selected':''}>${o.l}</option>`).join('');

    // Foto de perfil del responsable
    const photoUrl = mod?.responsible_photo_url || null;
    const photoThumb = photoUrl
      ? `<div class="resp-photo-thumb"><img id="_respPhotoImg" src="${e(photoUrl)}" alt="Foto"></div>`
      : `<div class="resp-photo-thumb" id="_respPhotoThumb"><i class="fas fa-user"></i></div>`;

    // Galería de imágenes del módulo
    const modImages = mod?.images || [];
    const galleryItems = modImages.map((img, idx) => `
      <div class="mod-gallery-item">
        <img src="${e(img.url)}" alt="${e(img.caption||'')}">
        <button class="del-img-btn" onclick="_patchDeleteModImage(${img.id})"
          title="Eliminar imagen"><i class="fas fa-trash"></i></button>
      </div>`).join('');

    const configVal = mod?.config_json ? JSON.stringify(mod.config_json, null, 2) : '';

    const modal = document.createElement('div');
    modal.id = '_moduleModalDyn';
    modal.className = 'modal-overlay hidden';
    modal.style.zIndex = '9100';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3>
            <i class="${isNew ? 'fas fa-plus-circle' : 'fas fa-puzzle-piece'}" style="color:var(--accent,#22d3ee)"></i>
            ${isNew ? 'Nuevo módulo' : 'Editar: ' + e(mod.title)}
          </h3>
          <button class="modal-close-btn" onclick="settingsModule.closeModal('_moduleModalDyn')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="_mmConvId"   value="${convId}">
          <input type="hidden" id="_mmModuleId" value="${mod?.id ?? ''}">

          <!-- Tipo y estado -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-tag"></i> Tipo y estado</div>
            <div class="form-grid-2">
              <div class="form-field">
                <label>Tipo <span class="required-mark">*</span></label>
                <select class="form-control" id="_mmType"
                  onchange="_patchSyncModIcon()">${typeOpts}</select>
              </div>
              <div class="form-field">
                <label>Estado</label>
                <select class="form-control" id="_mmStatus">${statusOpts}</select>
              </div>
            </div>
          </div>

          <!-- Info general -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-info-circle"></i> Información general</div>
            <div class="form-grid-2">
              <div class="form-field form-field-full">
                <label>Título <span class="required-mark">*</span></label>
                <input class="form-control" id="_mmTitle"
                  placeholder="Ej. Taller de Drones" value="${e(mod?.title||'')}">
              </div>
              <div class="form-field form-field-full">
                <label>Descripción</label>
                <textarea class="form-control" id="_mmDesc" rows="3"
                  placeholder="Alcance, contenido o propósito del módulo">${e(mod?.description||'')}</textarea>
              </div>
              <div class="form-field">
                <label>Ícono FontAwesome</label>
                <input class="form-control" id="_mmIcon"
                  placeholder="fas fa-chalkboard-teacher" value="${e(mod?.icon||'')}">
                <small class="field-hint">fas fa-chalkboard-teacher · fas fa-microphone-lines · fas fa-gamepad</small>
              </div>
              <div class="form-field">
                <label>Orden de aparición</label>
                <input class="form-control" type="number" min="0" id="_mmSortOrder"
                  value="${mod?.sort_order ?? 0}">
              </div>
            </div>
          </div>

          <!-- ══ Responsable / Perfil ══ -->
          <div class="patch-section">
            <div class="patch-section-title">
              <i class="fas fa-id-badge"></i> Perfil del Responsable
              <small style="font-weight:400;text-transform:none;margin-left:4px">
                — Instructor, tallerista o ponente
              </small>
            </div>

            <div class="resp-photo-wrap">
              ${photoThumb}
              <div class="resp-photo-actions">
                <button type="button" class="btn btn-secondary btn-small"
                  onclick="_patchPickResponsiblePhoto(${convId}, ${mod?.id ?? 'null'})">
                  <i class="fas fa-camera"></i> ${photoUrl ? 'Cambiar foto' : 'Subir foto de perfil'}
                </button>
                ${photoUrl ? `<button type="button" class="btn btn-danger btn-small"
                  onclick="_patchRemoveResponsiblePhoto()"><i class="fas fa-trash"></i> Quitar foto</button>` : ''}
                <small>JPG, PNG, WEBP · máx. 5 MB</small>
              </div>
            </div>

            <div class="form-grid-2">
              <div class="form-field">
                <label>Rol</label>
                <select class="form-control" id="_mmRole">${roleOpts}</select>
              </div>
              <div class="form-field">
                <label>Nombre completo</label>
                <input class="form-control" id="_mmRespName"
                  placeholder="Ing. Juan Pérez" value="${e(mod?.responsible_name||'')}">
              </div>
              <div class="form-field">
                <label>Correo electrónico</label>
                <input class="form-control" type="email" id="_mmRespEmail"
                  placeholder="correo@ejemplo.com" value="${e(mod?.responsible_email||'')}">
              </div>
              <div class="form-field">
                <label>Teléfono</label>
                <input class="form-control" type="tel" id="_mmRespPhone"
                  placeholder="452 123 4567" value="${e(mod?.responsible_phone||'')}">
              </div>
              <div class="form-field">
                <label>Institución / Empresa</label>
                <input class="form-control" id="_mmRespOrg"
                  placeholder="ITSU, UNAM, Empresa…" value="${e(mod?.responsible_org||'')}">
              </div>
              <div class="form-field">
                <label>Usuario del sistema (opcional)</label>
                <input class="form-control" id="_mmRespUser"
                  placeholder="usuario del admin" value="${e(mod?.responsible_username||'')}">
              </div>
              <div class="form-field form-field-full">
                <label>Biografía / Semblanza breve</label>
                <textarea class="form-control" id="_mmRespBio" rows="3"
                  placeholder="Breve descripción del perfil académico o profesional…">${e(mod?.responsible_bio||'')}</textarea>
              </div>
            </div>
          </div>

          <!-- ══ Galería de fotos del módulo ══ -->
          <div class="patch-section">
            <div class="patch-section-title">
              <i class="fas fa-images"></i> Galería de fotos del módulo
            </div>
            <div class="mod-gallery-grid" id="_mmGallery">
              ${galleryItems}
              ${modImages.length < 8 ? `
              <div class="mod-gallery-item" style="display:flex;align-items:center;justify-content:center;cursor:pointer;border-style:dashed"
                onclick="_patchPickModuleImage(${convId}, ${mod?.id ?? 'null'})">
                <i class="fas fa-plus" style="font-size:20px;color:var(--text-mute)"></i>
              </div>` : ''}
            </div>
            <small class="field-hint" style="margin-top:6px;display:block">
              Máx. 8 imágenes por módulo · JPG, PNG, WEBP
            </small>
          </div>

          <!-- Config JSON -->
          <div class="patch-section">
            <div class="patch-section-title"><i class="fas fa-code"></i> Configuración extra (JSON)</div>
            <div class="form-field">
              <textarea class="form-control" id="_mmConfig" rows="3"
                placeholder='{"capacity": 30, "room": "Aula 4"}'
                style="font-family:monospace;font-size:12px">${e(configVal)}</textarea>
              <small class="field-hint">Opcional — debe ser JSON válido.</small>
            </div>
          </div>

        </div><!-- /modal-body -->
        <div class="modal-foot" style="justify-content:space-between">
          <div>
            ${!isNew ? `<button class="btn btn-danger btn-small"
              onclick="settingsModule.deleteModule(${mod.id}, ${convId})">
              <i class="fas fa-trash"></i> Eliminar módulo
            </button>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-small"
              onclick="settingsModule.closeModal('_moduleModalDyn')">Cancelar</button>
            <button class="btn btn-primary" id="_mmSaveBtn" onclick="_patchSaveModule()">
              <i class="fas fa-save"></i> Guardar
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    settingsModule.showModal('_moduleModalDyn');
    modal.addEventListener('click', ev => {
      if (ev.target === modal) settingsModule.closeModal('_moduleModalDyn');
    });
    // Auto-sync icon
    _patchSyncModIcon();
  };

  /* ── Sync icon por tipo ── */
  window._patchSyncModIcon = function() {
    const typeEl = document.getElementById('_mmType');
    const iconEl = document.getElementById('_mmIcon');
    if (!typeEl || !iconEl || iconEl.value) return;
    const defaults = {
      workshop: 'fas fa-chalkboard-teacher',
      conference: 'fas fa-microphone-lines',
      custom: 'fas fa-star'
    };
    iconEl.value = defaults[typeEl.value] || 'fas fa-star';
  };

  /* ── Save módulo ── */
  window._patchSaveModule = async function() {
    const convId   = document.getElementById('_mmConvId').value;
    const moduleId = document.getElementById('_mmModuleId').value;
    const type     = document.getElementById('_mmType').value;
    const status   = document.getElementById('_mmStatus').value;
    const title    = document.getElementById('_mmTitle').value.trim();
    const desc     = document.getElementById('_mmDesc').value.trim();
    const icon     = document.getElementById('_mmIcon').value.trim() || 'fas fa-star';
    const sort     = parseInt(document.getElementById('_mmSortOrder').value) || 0;
    const role     = document.getElementById('_mmRole').value;
    const name     = document.getElementById('_mmRespName').value.trim();
    const email    = document.getElementById('_mmRespEmail').value.trim();
    const phone    = document.getElementById('_mmRespPhone').value.trim();
    const org      = document.getElementById('_mmRespOrg').value.trim();
    const uname    = document.getElementById('_mmRespUser').value.trim();
    const bio      = document.getElementById('_mmRespBio').value.trim();
    const cfgRaw   = document.getElementById('_mmConfig').value.trim();

    if (!title) return settingsModule.toast('El título del módulo es obligatorio', 'error');

    let configJson = null;
    if (cfgRaw) {
      try { configJson = JSON.stringify(JSON.parse(cfgRaw)); }
      catch { return settingsModule.toast('El JSON de configuración no es válido', 'error'); }
    }

    const moduleKey = `${type}_${title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}_${moduleId || Date.now()}`;

    const fd = new FormData();
    fd.append('action', 'save_convocatoria_module');
    fd.append('convocatoria_id', convId);
    if (moduleId) fd.append('id', moduleId);
    fd.append('module_key', moduleKey);
    fd.append('module_type', type);
    fd.append('title', title);
    fd.append('description', desc);
    fd.append('icon', icon);
    fd.append('status', status);
    fd.append('sort_order', sort);
    fd.append('responsible_role', role);
    fd.append('responsible_name', name);
    fd.append('responsible_email', email);
    fd.append('responsible_phone', phone);
    fd.append('responsible_username', uname);
    // Extra: org y bio van en config_json si el backend no tiene columna propia
    const extraConfig = { org, bio, ...(configJson ? JSON.parse(configJson) : {}) };
    if (org || bio || cfgRaw) fd.append('config_json', JSON.stringify(extraConfig));

    const btn = document.getElementById('_mmSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      const res  = await fetch('/app/api/admin-settings.php', { method:'POST', body:fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error al guardar');
      settingsModule.toast(json.message || 'Módulo guardado', 'success');
      settingsModule.closeModal('_moduleModalDyn');
      await settingsModule.loadData();
    } catch (err) {
      settingsModule.toast('Error: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
  };

  /* ── Foto de perfil del responsable ── */
  window._patchPickResponsiblePhoto = function(convId, modId) {
    if (!modId) {
      settingsModule.toast('Guarda el módulo primero para subir la foto del responsable.', 'info');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        settingsModule.toast('La imagen supera 5 MB', 'error'); return;
      }
      const fd = new FormData();
      fd.append('action', 'upload_module_responsible_photo');
      fd.append('module_id', modId);
      fd.append('convocatoria_id', convId);
      fd.append('photo', file);
      settingsModule.toast('Subiendo foto...', 'info');
      try {
        const res  = await fetch('/app/api/admin-settings.php', { method:'POST', body:fd });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Error');
        settingsModule.toast('Foto actualizada', 'success');
        // Actualizar thumb en el modal
        const thumb = document.getElementById('_respPhotoThumb') || document.querySelector('.resp-photo-thumb');
        if (thumb) {
          thumb.innerHTML = `<img id="_respPhotoImg" src="${json.url}?t=${Date.now()}" alt="Foto">`;
        }
      } catch(err) {
        settingsModule.toast('Error al subir foto: ' + err.message, 'error');
      }
    };
    input.click();
  };

  window._patchRemoveResponsiblePhoto = function() {
    const img = document.getElementById('_respPhotoImg');
    if (img) {
      img.parentElement.innerHTML = '<i class="fas fa-user"></i>';
    }
    settingsModule.toast('La foto se quitará al guardar.', 'info');
  };

  /* ── Fotos galería del módulo ── */
  window._patchPickModuleImage = function(convId, modId) {
    if (!modId) {
      settingsModule.toast('Guarda el módulo primero para subir imágenes de galería.', 'info');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.multiple = true;
    input.onchange = async (ev) => {
      const files = Array.from(ev.target.files).slice(0, 8);
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { settingsModule.toast('Una imagen supera 5 MB', 'error'); continue; }
        const fd = new FormData();
        fd.append('action', 'upload_module_image');
        fd.append('module_id', modId);
        fd.append('convocatoria_id', convId);
        fd.append('image', file);
        try {
          const res  = await fetch('/app/api/admin-settings.php', { method:'POST', body:fd });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Error');
          // Agregar a la galería
          const gallery = document.getElementById('_mmGallery');
          const plusEl  = gallery?.querySelector('div[onclick]');
          const item = document.createElement('div');
          item.className = 'mod-gallery-item';
          item.innerHTML = `<img src="${json.url}" alt=""><button class="del-img-btn"
            onclick="_patchDeleteModImage(${json.id})" title="Eliminar"><i class="fas fa-trash"></i></button>`;
          if (plusEl) gallery.insertBefore(item, plusEl);
          else gallery?.appendChild(item);
        } catch(err) {
          settingsModule.toast('Error al subir imagen: ' + err.message, 'error');
        }
      }
    };
    input.click();
  };

  window._patchDeleteModImage = async function(imgId) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    const fd = new FormData();
    fd.append('action', 'delete_module_image');
    fd.append('id', imgId);
    try {
      const res  = await fetch('/app/api/admin-settings.php', { method:'POST', body:fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error');
      // Remover del DOM
      document.querySelectorAll('.mod-gallery-item').forEach(el => {
        if (el.querySelector(`[onclick*="${imgId}"]`)) el.remove();
      });
      settingsModule.toast('Imagen eliminada', 'success');
    } catch(err) {
      settingsModule.toast('Error: ' + err.message, 'error');
    }
  };

  console.log('[admin-settings-patch] ✓ openConvModal y openModuleModal actualizados');
});
