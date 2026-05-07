/* ═══════════════════════════════════════════════════════════
   admin-improvements.js  —  RENOVATEC 2026
   Mejoras:
   · Scanner QR como overlay pantalla completa
   · Historial de llegadas paginado y con chips de robots
   · Seguridad: tabla paginada, borrado por rango de tiempo
   · Respaldo manual / automático (JSON descargable)
   Cargar AL FINAL del <body>, después de admin.js
   v20260506
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   A. SCANNER QR — OVERLAY PANTALLA COMPLETA
══════════════════════════════════════════════════════════ */

(function patchScanner() {
  // Inyectar el overlay en el DOM una sola vez
  function buildScannerOverlay() {
    if (document.getElementById('scannerFsOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'scannerFsOverlay';
    overlay.className = 'scanner-fullscreen-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="scanner-fs-header">
        <h4><i class="fas fa-camera"></i> Escáner QR Activo</h4>
        <button id="scannerFsCancelBtn" class="btn btn-danger btn-small" type="button">
          <i class="fas fa-xmark"></i> Cancelar
        </button>
      </div>
      <div class="scanner-fs-video-wrap">
        <video id="adminScannerVideoFs" autoplay playsinline muted></video>
        <div class="scanner-fs-viewfinder">
          <div class="scanner-fs-corner-tr"></div>
          <div class="scanner-fs-corner-bl"></div>
          <div class="scanner-fs-line"></div>
        </div>
      </div>
      <p class="scanner-fs-tip">
        <i class="fas fa-info-circle"></i>
        Apunta la cámara al código QR del equipo. La detección es automática.
      </p>
    `;
    document.body.appendChild(overlay);

    // Cancelar desde el botón
    document.getElementById('scannerFsCancelBtn').addEventListener('click', () => {
      closeScannerOverlay();
      // Llamar al stopScanner original si existe
      if (typeof stopScanner === 'function') stopScanner();
    });

    // Cancelar tocando el fondo (fuera del contenido)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeScannerOverlay();
        if (typeof stopScanner === 'function') stopScanner();
      }
    });

    // Tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.style.display !== 'none') {
        closeScannerOverlay();
        if (typeof stopScanner === 'function') stopScanner();
      }
    });
  }

  function openScannerOverlay() {
    buildScannerOverlay();
    const overlay = document.getElementById('scannerFsOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // El video de la pantalla completa toma el stream
    // El video original del DOM se mantiene oculto/en uso por el código existente
    // Sincronizamos el srcObject después de que el stream esté disponible
    syncFsVideoStream();
  }

  function closeScannerOverlay() {
    const overlay = document.getElementById('scannerFsOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    // Limpiar el video del overlay
    const fsVideo = document.getElementById('adminScannerVideoFs');
    if (fsVideo) { fsVideo.srcObject = null; }
  }

  function syncFsVideoStream() {
    // Redirigir el stream al video del overlay
    const originalVideo = document.getElementById('adminScannerVideo');
    const fsVideo = document.getElementById('adminScannerVideoFs');
    if (!originalVideo || !fsVideo) return;

    const trySync = () => {
      if (originalVideo.srcObject) {
        fsVideo.srcObject = originalVideo.srcObject;
        fsVideo.play().catch(() => {});
      } else {
        setTimeout(trySync, 150);
      }
    };
    trySync();
  }

  // Parche: interceptar cuando el scanner box nativo se muestra
  function patchScannerBoxObserver() {
    const origScannerBox = document.getElementById('scannerBox');
    const congressScannerBox = document.getElementById('congressScannerBox');

    const handleShow = (box) => {
      if (!box) return;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style') {
            const visible = box.style.display !== 'none';
            if (visible) {
              // Mostrar overlay en lugar de la caja nativa
              box.style.display = 'none';
              openScannerOverlay();
            } else {
              closeScannerOverlay();
            }
          }
        });
      });
      observer.observe(box, { attributes: true });
    };

    // Esperar a que el DOM esté completamente cargado
    if (origScannerBox) handleShow(origScannerBox);
    if (congressScannerBox) handleShow(congressScannerBox);

    // También parchear los botones de cancelar originales
    ['scannerCancelBtn', 'congressScannerCancelBtn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          closeScannerOverlay();
        });
      }
    });
  }

  // También parchar el botón "Escanear QR" del congreso
  function patchCongressScanQrBtn() {
    const btn = document.getElementById('congressScanQrBtn');
    if (!btn || btn.dataset.fsPatch === '1') return;
    btn.dataset.fsPatch = '1';
    btn.addEventListener('click', () => {
      // Pequeña espera para que el código original active el box
      setTimeout(() => {
        const box = document.getElementById('congressScannerBox');
        if (box && box.style.display !== 'none') {
          box.style.display = 'none';
          openScannerOverlay();
          // Sincronizar el video del congreso
          const origVideo = document.getElementById('congressScannerVideo');
          const fsVideo = document.getElementById('adminScannerVideoFs');
          if (origVideo && fsVideo) {
            const trySync = () => {
              if (origVideo.srcObject) {
                fsVideo.srcObject = origVideo.srcObject;
                fsVideo.play().catch(() => {});
              } else {
                setTimeout(trySync, 150);
              }
            };
            trySync();
          }
        }
      }, 200);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildScannerOverlay();
    patchScannerBoxObserver();
    patchCongressScanQrBtn();
  });

  // Exponer por si se llama desde fuera
  window.openScannerOverlay = openScannerOverlay;
  window.closeScannerOverlay = closeScannerOverlay;
})();

/* ══════════════════════════════════════════════════════════
   B. HISTORIAL DE LLEGADAS — PAGINACIÓN + CHIPS ROBOTS
══════════════════════════════════════════════════════════ */

(function patchHistoryPanel() {
  const PAGE_SIZE = 25;
  let _historyPage = 1;
  let _historyData = [];

  // Sobreescribir renderHistoryPanel cuando esté disponible
  function patchWhenReady() {
    if (typeof window.renderHistoryPanel !== 'function') {
      setTimeout(patchWhenReady, 300);
      return;
    }

    window.renderHistoryPanel = function renderHistoryPanelImproved(teams) {
      const container = document.getElementById('historyTeamsList');
      if (!container) return;

      if (!teams || !teams.length) {
        container.innerHTML = `
          <div class="history-empty">
            <i class="fas fa-inbox"></i>
            Sin equipos registrados aún.
          </div>`;
        return;
      }

      const ordered = typeof sortTeamsByStageThenDate === 'function'
        ? sortTeamsByStageThenDate(teams, 'created_at', 'asc')
        : teams;

      _historyData = ordered;
      _historyPage = 1;

      renderHistoryStats(ordered);
      renderHistoryPage();
      bindHistoryFilters();
    };

    // Reimplantar también applyHistoryFilters
    window.applyHistoryFilters = function applyHistoryFiltersImproved() {
      const statusFilter = document.getElementById('historyStatusFilter');
      const searchInput = document.getElementById('historySearchInput');
      if (!statusFilter || !searchInput) return;

      const statusValue = statusFilter.value || 'all';
      const searchValue = String(searchInput.value || '').trim().toLowerCase();

      const allTeams = window.allTeams || [];
      let filtered = allTeams;

      if (statusValue !== 'all') {
        filtered = filtered.filter((team) => {
          const arrival = typeof getArrivalSummary === 'function'
            ? getArrivalSummary(team) : { status: 'missing' };
          return arrival.status === statusValue;
        });
      }

      if (searchValue) {
        filtered = filtered.filter((team) => {
          const robots = (team.robots || []).map((r) => r.robot_name || '').join(' ');
          const text = `${team.folio || ''} ${team.captain_name || ''} ${team.school_name || ''} ${robots}`.toLowerCase();
          return text.includes(searchValue);
        });
      }

      _historyData = filtered;
      _historyPage = 1;
      renderHistoryStats(filtered);
      renderHistoryPage();
    };
  }

  function renderHistoryStats(teams) {
    const bar = document.getElementById('historyStatsBar');
    if (!bar) return;

    let arrived = 0, partial = 0, missing = 0;
    teams.forEach((team) => {
      const s = typeof getArrivalSummary === 'function'
        ? getArrivalSummary(team).status : 'missing';
      if (s === 'arrived') arrived++;
      else if (s === 'partial') partial++;
      else missing++;
    });

    bar.innerHTML = `
      <div class="hstat total"><i class="fas fa-users"></i><div>Total<br><strong>${teams.length}</strong></div></div>
      <div class="hstat arrived"><i class="fas fa-check-circle"></i><div>Llegaron<br><strong>${arrived}</strong></div></div>
      <div class="hstat partial"><i class="fas fa-adjust"></i><div>Parcial<br><strong>${partial}</strong></div></div>
      <div class="hstat missing"><i class="fas fa-times-circle"></i><div>Sin llegar<br><strong>${missing}</strong></div></div>
    `;
  }

  function renderHistoryPage() {
    const container = document.getElementById('historyTeamsList');
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(_historyData.length / PAGE_SIZE));
    if (_historyPage > totalPages) _historyPage = totalPages;

    const start = (_historyPage - 1) * PAGE_SIZE;
    const slice = _historyData.slice(start, start + PAGE_SIZE);

    if (!slice.length) {
      container.innerHTML = `
        <div class="history-empty">
          <i class="fas fa-filter"></i>
          Sin resultados para los filtros aplicados.
        </div>`;
      renderHistoryPagination(0, 0);
      return;
    }

    const html = slice.map((team) => {
      const arrival = typeof getArrivalSummary === 'function'
        ? getArrivalSummary(team) : { status: 'missing', label: 'Sin info', detail: '-' };
      const stage = typeof getStageDefinition === 'function'
        ? getStageDefinition(team.registration_stage) : { shortLabel: '-' };
      const stageState = typeof getStageState === 'function'
        ? getStageState(team.registration_stage) : '';
      const robots = team.robots || [];

      const robotChips = robots.map((r) => {
        const cls = r.arrived ? 'arrived' : 'missing';
        const icon = r.arrived ? 'check' : 'xmark';
        const name = (r.robot_name || 'Sin nombre').substring(0, 22);
        return `<span class="history-robot-chip ${cls}"><i class="fas fa-${icon}"></i>${escHtml(name)}</span>`;
      }).join('');

      const paymentBadge = typeof mapPaymentBadge === 'function'
        ? mapPaymentBadge(team.payment_status).text : team.payment_status || '-';
      const checkinStr = team.checkin_at
        ? (typeof formatDateTime === 'function' ? formatDateTime(team.checkin_at) : team.checkin_at)
        : '-';

      return `
        <article class="history-item"
          data-history-arrival="${arrival.status}"
          data-history-search="${escHtml(`${team.folio} ${team.captain_name || ''} ${team.school_name || ''} ${robots.map(r=>r.robot_name||'').join(' ')}`).toLowerCase()}">
          <div class="history-item-head">
            <span class="history-item-folio">${escHtml(team.folio || '-')}</span>
            <span class="stage-chip ${stageState}">${escHtml(stage.shortLabel)}</span>
            <span class="attendance-chip ${arrival.status}">${escHtml(arrival.label)}</span>
          </div>
          <div class="history-item-body">
            <span><strong>Capitán:</strong> ${escHtml(team.captain_name || '-')}</span>
            <span><strong>Escuela:</strong> ${escHtml(team.school_name || '-')}</span>
            <span><strong>Check-in:</strong> ${checkinStr}</span>
            <span><strong>Pago:</strong> ${paymentBadge}</span>
            <span><strong>Robots registrados:</strong> ${robots.length}</span>
            <span><strong>Estado:</strong> ${escHtml(arrival.detail)}</span>
            ${robotChips ? `<div class="history-item-robots">${robotChips}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = html;
    renderHistoryPagination(_historyData.length, totalPages);
  }

  function renderHistoryPagination(total, totalPages) {
    let pag = document.getElementById('historyPagination');
    if (!pag) {
      // Insertar la paginación después del contenedor
      const container = document.getElementById('historyTeamsList');
      if (!container) return;
      pag = document.createElement('div');
      pag.id = 'historyPagination';
      pag.className = 'history-pagination';
      container.after(pag);
    }

    if (totalPages <= 1) {
      pag.style.display = 'none';
      return;
    }
    pag.style.display = 'flex';

    const from = (_historyPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(_historyPage * PAGE_SIZE, total);

    const maxBtns = 7;
    let pages = [];
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages = [1];
      const around = [_historyPage - 1, _historyPage, _historyPage + 1].filter(p => p > 1 && p < totalPages);
      if (around[0] > 2) pages.push('…');
      pages = pages.concat(around);
      if (around[around.length - 1] < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }

    pag.innerHTML = `
      <span style="font-size:0.75rem; color:var(--text-mute);">
        Mostrando ${from}–${to} de ${total} equipos
      </span>
      <div class="history-pagination-btns">
        <button class="history-page-btn" id="histPrev" ${_historyPage === 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        ${pages.map((p) => p === '…'
          ? `<button class="history-page-btn" disabled>…</button>`
          : `<button class="history-page-btn ${p === _historyPage ? 'active' : ''}" data-history-goto="${p}">${p}</button>`
        ).join('')}
        <button class="history-page-btn" id="histNext" ${_historyPage === totalPages ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

    pag.querySelector('#histPrev')?.addEventListener('click', () => { _historyPage--; renderHistoryPage(); });
    pag.querySelector('#histNext')?.addEventListener('click', () => { _historyPage++; renderHistoryPage(); });
    pag.querySelectorAll('[data-history-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        _historyPage = parseInt(btn.dataset.historyGoto);
        renderHistoryPage();
      });
    });
  }

  function bindHistoryFilters() {
    ['historyStatusFilter', 'historySearchInput'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.improved) {
        el.dataset.improved = '1';
        el.addEventListener('input', window.applyHistoryFilters);
        el.addEventListener('change', window.applyHistoryFilters);
      }
    });
  }

  function injectHistoryStatsBar() {
    const card = document.querySelector('.checkin-history-card');
    if (!card || document.getElementById('historyStatsBar')) return;
    const toolbar = card.querySelector('.history-toolbar');
    if (!toolbar) return;
    const bar = document.createElement('div');
    bar.id = 'historyStatsBar';
    bar.className = 'history-stats-bar';
    toolbar.after(bar);
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectHistoryStatsBar();
    patchWhenReady();
  });
})();

/* ══════════════════════════════════════════════════════════
   C. SEGURIDAD — TABLA PAGINADA + BORRADO POR RANGO
══════════════════════════════════════════════════════════ */

(function patchSecurityPanel() {
  const SEC_PAGE_SIZE = 50;
  let _secPage = 1;
  let _secFiltered = [];

  function patchWhenReady() {
    if (typeof window.renderSecurityActivityTable !== 'function') {
      setTimeout(patchWhenReady, 300);
      return;
    }

    window.renderSecurityActivityTable = function renderSecurityTableImproved() {
      const body = document.getElementById('securityActivityBody');
      if (!body) return;

      const searchValue = String(document.getElementById('securitySearchInput')?.value || '')
        .trim().toLowerCase();
      const sourceFilter = document.getElementById('securitySourceFilter')?.value || 'all';

      let filtered = [...(window.securityActivityEvents || [])];

      if (sourceFilter !== 'all') {
        filtered = filtered.filter((item) => item.source === sourceFilter);
      }

      if (searchValue) {
        filtered = filtered.filter((item) => {
          const text = `${item.timestamp||''} ${item.action||''} ${item.ip||''} ${item.browser||''} ${item.device||''} ${item.detail||''}`.toLowerCase();
          return text.includes(searchValue);
        });
      }

      _secFiltered = filtered;
      _secPage = 1;
      renderSecPage();
    };
  }

  function renderSecPage() {
    const body = document.getElementById('securityActivityBody');
    const countEl = document.getElementById('securityTableCount');
    if (!body) return;

    const total = _secFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / SEC_PAGE_SIZE));
    if (_secPage > totalPages) _secPage = totalPages;

    const start = (_secPage - 1) * SEC_PAGE_SIZE;
    const slice = _secFiltered.slice(start, start + SEC_PAGE_SIZE);

    if (countEl) {
      countEl.textContent = total ? `${total} evento${total !== 1 ? 's' : ''}` : '';
    }

    if (!slice.length) {
      body.innerHTML = '<tr><td colspan="7" class="sec-table-empty"><i class="fas fa-inbox"></i><br>Sin actividad para los filtros seleccionados.</td></tr>';
      renderSecPagination(0, 0);
      return;
    }

    body.innerHTML = slice.map((item) => {
      const sourceBadge = item.source === 'admin'
        ? '<span class="badge-status badge-verified">Admin</span>'
        : '<span class="badge-status badge-pending">Registro</span>';

      const fmtDate = typeof formatDateTime === 'function'
        ? formatDateTime(item.timestamp) : (item.timestamp || '-');

      const detail = escHtml(item.detail || '-');

      return `
        <tr>
          <td class="ts">${fmtDate}</td>
          <td>${sourceBadge}</td>
          <td>${escHtml(item.action || '-')}</td>
          <td><span class="sec-ip-badge">${escHtml(item.ip || '-')}</span></td>
          <td>${escHtml(item.browser || '-')}</td>
          <td>${escHtml(item.device || '-')}</td>
          <td class="sec-detail-cell" title="${detail}">${detail}</td>
        </tr>`;
    }).join('');

    renderSecPagination(total, totalPages);
  }

  function renderSecPagination(total, totalPages) {
    const info = document.getElementById('secPaginationInfo');
    const btnsContainer = document.getElementById('secPaginationBtns');
    if (!info || !btnsContainer) return;

    if (totalPages <= 1) {
      info.textContent = total ? `${total} evento${total !== 1 ? 's' : ''}` : '—';
      btnsContainer.innerHTML = '';
      return;
    }

    const from = (_secPage - 1) * SEC_PAGE_SIZE + 1;
    const to = Math.min(_secPage * SEC_PAGE_SIZE, total);
    info.textContent = `Mostrando ${from}–${to} de ${total}`;

    const maxBtns = 7;
    let pages = [];
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages = [1];
      const around = [_secPage - 1, _secPage, _secPage + 1].filter(p => p > 1 && p < totalPages);
      if (around[0] > 2) pages.push('…');
      pages = pages.concat(around);
      if (around[around.length - 1] < totalPages - 1) pages.push('…');
      pages.push(totalPages);
    }

    btnsContainer.innerHTML = `
      <button class="history-page-btn" id="secPrev" ${_secPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
      ${pages.map((p) => p === '…'
        ? `<button class="history-page-btn" disabled>…</button>`
        : `<button class="history-page-btn ${p === _secPage ? 'active' : ''}" data-sec-goto="${p}">${p}</button>`
      ).join('')}
      <button class="history-page-btn" id="secNext" ${_secPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;

    btnsContainer.querySelector('#secPrev')?.addEventListener('click', () => { _secPage--; renderSecPage(); });
    btnsContainer.querySelector('#secNext')?.addEventListener('click', () => { _secPage++; renderSecPage(); });
    btnsContainer.querySelectorAll('[data-sec-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        _secPage = parseInt(btn.dataset.secGoto);
        renderSecPage();
      });
    });
  }

  function initSecurityDeleteBtn() {
    const btn = document.getElementById('securityDeleteBtn');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', async () => {
      const rangeEl = document.getElementById('securityDeleteRange');
      const range = rangeEl?.value || '';
      if (!range) {
        setSecMsg('Selecciona un rango de tiempo para borrar.', 'error');
        return;
      }

      const rangeLabels = {
        '15min': 'últimos 15 minutos',
        '24h': 'últimas 24 horas',
        '1week': 'última semana',
        '1month': 'último mes',
        '1year': 'último año',
        'all': 'TODO el historial',
      };

      const label = rangeLabels[range] || range;
      if (!confirm(`¿Borrar registros de actividad de los ${label}?\nEsta acción no se puede deshacer.`)) return;

      // Filtrar localmente (el borrado real requeriría una API en el servidor)
      const now = Date.now();
      const rangeMs = {
        '15min': 15 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '1week': 7 * 24 * 60 * 60 * 1000,
        '1month': 30 * 24 * 60 * 60 * 1000,
        '1year': 365 * 24 * 60 * 60 * 1000,
        'all': Infinity,
      };

      const ms = rangeMs[range];
      const cutoff = now - ms;

      const before = (window.securityActivityEvents || []).length;

      if (ms === Infinity) {
        window.securityActivityEvents = [];
      } else {
        window.securityActivityEvents = (window.securityActivityEvents || []).filter((ev) => {
          const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : 0;
          return ts < cutoff; // conservar los que son MÁS VIEJOS que el corte
        });
      }

      const after = (window.securityActivityEvents || []).length;
      const removed = before - after;

      // Actualizar KPIs
      const totalEl = document.getElementById('securityTotalEvents');
      if (totalEl) totalEl.textContent = String(after);

      if (typeof renderSecurityActivityTable === 'function') {
        renderSecurityActivityTable();
      }

      rangeEl.value = '';
      setSecMsg(`Se eliminaron ${removed} registro${removed !== 1 ? 's' : ''} de los ${label}.`, 'success');
    });
  }

  function setSecMsg(msg, type) {
    if (typeof setSecurityMessage === 'function') {
      setSecurityMessage(msg, type);
    } else {
      const el = document.getElementById('securityMessage');
      if (el) { el.textContent = msg; el.className = `security-message ${type}`; }
    }
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    patchWhenReady();
    setTimeout(initSecurityDeleteBtn, 500);

    // Re-intentar binding si la sección de seguridad se renderiza tarde
    const secRefreshBtn = document.getElementById('refreshSecurityBtn');
    if (secRefreshBtn && !secRefreshBtn.dataset.bound) {
      secRefreshBtn.dataset.bound = '1';
      secRefreshBtn.addEventListener('click', () => {
        if (typeof loadSecurityActivity === 'function') loadSecurityActivity();
      });
    }
  });
})();

/* ══════════════════════════════════════════════════════════
   D. RESPALDO DEL SISTEMA
══════════════════════════════════════════════════════════ */

(function initBackupSystem() {
  const BACKUP_HISTORY_KEY = 'renovatec_backup_history';
  const BACKUP_AUTO_KEY = 'renovatec_backup_auto';
  let autoBackupTimer = null;

  function getBackupHistory() {
    try {
      return JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
    } catch { return []; }
  }

  function saveBackupHistory(history) {
    try {
      localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
    } catch {}
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function renderBackupHistory() {
    const container = document.getElementById('backupHistory');
    if (!container) return;
    const history = getBackupHistory();
    if (!history.length) {
      container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-mute); margin-top:6px;">Sin respaldos previos en esta sesión.</p>';
      return;
    }
    container.innerHTML = history.map((entry) => `
      <div class="backup-history-item">
        <span><i class="fas fa-file-zipper" style="color:var(--green);"></i> ${entry.filename}</span>
        <span class="backup-ts">${entry.ts}</span>
        <span class="backup-size">${entry.size}</span>
        <span style="font-size:0.7rem; color:var(--text-mute);">${entry.type === 'auto' ? 'Automático' : 'Manual'}</span>
      </div>`).join('');
  }

  async function generateBackup(type = 'manual') {
    const progress = document.getElementById('backupProgress');
    const progressMsg = document.getElementById('backupProgressMsg');
    if (progress) progress.classList.add('visible');
    if (progressMsg) progressMsg.textContent = 'Obteniendo datos del sistema…';

    try {
      // Recopilar datos del sistema
      const data = {
        meta: {
          version: '1.0',
          system: 'RENOVATEC 2026',
          generated_at: new Date().toISOString(),
          type,
        },
        teams: window.allTeams || [],
        category_stats: window.categoryStats || [],
      };

      if (progressMsg) progressMsg.textContent = 'Serializando datos…';

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const sizeStr = formatBytes(blob.size);

      if (progressMsg) progressMsg.textContent = 'Generando archivo…';

      const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const filename = `renovatec_backup_${date}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Registrar en historial
      const history = getBackupHistory();
      history.unshift({
        filename,
        ts: new Date().toLocaleString('es-MX'),
        size: sizeStr,
        type,
      });
      saveBackupHistory(history);
      renderBackupHistory();

      if (typeof setSecurityMessage === 'function') {
        setSecurityMessage(`Respaldo generado: ${filename} (${sizeStr})`, 'success');
      }
    } catch (err) {
      if (typeof setSecurityMessage === 'function') {
        setSecurityMessage(`Error al generar respaldo: ${err.message}`, 'error');
      }
    } finally {
      if (progress) progress.classList.remove('visible');
    }
  }

  function isAutoBackupEnabled() {
    return localStorage.getItem(BACKUP_AUTO_KEY) === '1';
  }

  function updateAutoBackupBtn() {
    const btn = document.getElementById('backupAutoToggleBtn');
    const label = document.getElementById('backupAutoLabel');
    if (!btn || !label) return;
    const enabled = isAutoBackupEnabled();
    label.textContent = enabled
      ? 'Desactivar respaldo automático (diario)'
      : 'Activar respaldo automático (diario)';
    btn.style.background = enabled ? 'var(--rose-dim)' : 'var(--green-dim)';
    btn.style.borderColor = enabled ? 'var(--rose)' : 'var(--green)';
    btn.style.color = enabled ? 'var(--rose)' : 'var(--green)';
  }

  function scheduleAutoBackup() {
    if (autoBackupTimer) clearInterval(autoBackupTimer);
    if (!isAutoBackupEnabled()) return;
    // Cada 24h (86400000 ms). En producción esto se complementaría con cron en el servidor.
    autoBackupTimer = setInterval(() => {
      generateBackup('auto');
    }, 86400000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderBackupHistory();
    updateAutoBackupBtn();
    scheduleAutoBackup();

    const manualBtn = document.getElementById('backupManualBtn');
    if (manualBtn && !manualBtn.dataset.bound) {
      manualBtn.dataset.bound = '1';
      manualBtn.addEventListener('click', () => generateBackup('manual'));
    }

    const autoBtn = document.getElementById('backupAutoToggleBtn');
    if (autoBtn && !autoBtn.dataset.bound) {
      autoBtn.dataset.bound = '1';
      autoBtn.addEventListener('click', () => {
        const current = isAutoBackupEnabled();
        localStorage.setItem(BACKUP_AUTO_KEY, current ? '0' : '1');
        updateAutoBackupBtn();
        scheduleAutoBackup();
        if (typeof setSecurityMessage === 'function') {
          setSecurityMessage(
            current ? 'Respaldo automático desactivado.' : 'Respaldo automático activado. Se ejecutará cada 24h mientras el panel esté abierto.',
            'success',
          );
        }
      });
    }
  });
})();
