/**
 * patch-cronograma-perfil.js
 *
 * Parche para perfil.js / perfil.html  — sección "Mi Cronograma".
 *
 * Qué hace:
 *  - Extiende la carga de datos del cronograma para incluir:
 *      · Conferencias en las que el usuario está inscrito (de conference-enroll.php)
 *      · Talleres inscritos (de workshop-enroll.php, con enrolled_workshop_ids)
 *  - Reemplaza el renderizado de la tarjeta "Conferencias" para mostrar
 *    SOLO las conferencias a las que el usuario se inscribió.
 *  - Agrega una sección "Mi Agenda" encima de las tarjetas con todas las
 *    actividades del usuario ordenadas cronológicamente (pasadas, actuales, futuras).
 *
 * Cargar al final de <body> DESPUÉS de perfil.js:
 *   <script src="js/patch-cronograma-perfil.js?v=1"></script>
 */

(function () {
  'use strict';

  // ── Utilidades ────────────────────────────────────────────────────────────────
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s || '');
    return d.innerHTML;
  }

  function fmt2(t) {
    if (!t) return '--:--';
    const p = t.split(':');
    return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
  }

  function fmtDateLong(d) {
    if (!d) return 'Sin fecha';
    const dt = new Date(String(d).replace(/-/g, '/'));
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function fmtDateShort(d) {
    if (!d) return 'Sin fecha';
    const dt = new Date(String(d).replace(/-/g, '/'));
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  function getSession() {
    const raw = sessionStorage.getItem('renovatec_user_session_v1') ||
                localStorage.getItem('renovatec_user_session_v1');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function getApiUrl(endpoint) { return `/app/api/${endpoint}`; }

  /** Convierte fecha+hora de BD en un timestamp numérico para ordenar */
  function toTs(dateStr, timeStr) {
    if (!dateStr) return Infinity;
    const d = String(dateStr).replace(/-/g, '/');
    const t = timeStr ? String(timeStr) : '00:00:00';
    return new Date(`${d} ${t}`).getTime() || Infinity;
  }

  /** Tiempo relativo a ahora */
  function activityStatus(dateStr, startTime, endTime) {
    if (!dateStr) return 'future';
    const now   = Date.now();
    const start = toTs(dateStr, startTime);
    const end   = toTs(dateStr, endTime || startTime);
    if (now > end)    return 'past';
    if (now >= start) return 'now';
    return 'future';
  }

  // ── Colores y etiquetas por tipo ──────────────────────────────────────────────
  const TYPE_CONFIG = {
    taller:      { color: '#38bdf8', bg: 'rgba(56,189,248,.12)',  border: 'rgba(56,189,248,.25)',  icon: 'fas fa-chalkboard-user', label: 'Taller' },
    conferencia: { color: '#a78bfa', bg: 'rgba(167,139,250,.12)', border: 'rgba(167,139,250,.25)', icon: 'fas fa-microphone-lines', label: 'Conferencia' },
    torneo:      { color: '#f2a900', bg: 'rgba(242,169,0,.12)',   border: 'rgba(242,169,0,.25)',   icon: 'fas fa-robot',          label: 'Torneo de Robótica' },
    campamento:  { color: '#22c55e', bg: 'rgba(34,197,94,.12)',   border: 'rgba(34,197,94,.25)',   icon: 'fas fa-campground',     label: 'Campamento' },
  };

  const STATUS_CONFIG = {
    past:   { label: 'Actividad pasada',   dot: '#64748b', banner: 'rgba(100,116,139,.08)', textCol: '#94a3b8' },
    now:    { label: '¡En este momento!',  dot: '#22c55e', banner: 'rgba(34,197,94,.10)',   textCol: '#86efac' },
    future: { label: 'Próxima actividad',  dot: '#f2a900', banner: 'rgba(242,169,0,.07)',   textCol: '#fbbf24' },
  };

  // ── Renderizar agenda ──────────────────────────────────────────────────────────
  function renderAgenda(activities) {
    const cardsEl = document.getElementById('profileProgramCards');
    if (!cardsEl) return;

    // Ordenar: pasadas al final, las actuales/futuras primero por fecha
    const sorted = [...activities].sort((a, b) => {
      const sa = activityStatus(a.date, a.start, a.end);
      const sb = activityStatus(b.date, b.start, b.end);
      // Orden: now → future → past
      const order = { now: 0, future: 1, past: 2 };
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return toTs(a.date, a.start) - toTs(b.date, b.start);
    });

    if (!sorted.length) return;

    // Insertar sección de agenda ANTES de las tarjetas de módulos
    const agendaSection = document.createElement('div');
    agendaSection.id = 'patchAgendaSection';
    agendaSection.style.cssText = 'margin-bottom: 28px;';

    const now   = sorted.filter(a => activityStatus(a.date, a.start, a.end) === 'now');
    const future = sorted.filter(a => activityStatus(a.date, a.start, a.end) === 'future');
    const past   = sorted.filter(a => activityStatus(a.date, a.start, a.end) === 'past');

    function buildItem(act, st) {
      const cfg  = TYPE_CONFIG[act.type]  || TYPE_CONFIG.taller;
      const scfg = STATUS_CONFIG[st] || STATUS_CONFIG.future;
      const isNow  = st === 'now';
      const isPast = st === 'past';

      return `
        <div style="
          display:flex; gap:0; border-radius:14px; overflow:hidden;
          border:1px solid ${isPast ? 'rgba(100,116,139,.2)' : cfg.border};
          background:${isPast ? 'rgba(15,20,35,.4)' : cfg.bg};
          opacity:${isPast ? '.72' : '1'};
          ${isNow ? 'box-shadow:0 0 0 2px ' + cfg.color + '55, 0 8px 24px rgba(0,0,0,.25);' : ''}
          margin-bottom:10px;
        ">
          <!-- Franja lateral de tipo -->
          <div style="width:5px; background:${isPast ? '#334155' : cfg.color}; flex-shrink:0;"></div>

          <!-- Hora / fecha columna -->
          <div style="
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            padding:14px 16px; min-width:70px; flex-shrink:0;
            border-right:1px solid rgba(255,255,255,.07);
            background:rgba(0,0,0,.18);
            text-align:center;
          ">
            <span style="font-size:.72rem; color:rgba(148,163,184,.8); text-transform:uppercase; letter-spacing:.06em;">${fmtDateShort(act.date)}</span>
            <span style="font-size:1.1rem; font-weight:800; color:${isPast ? '#64748b' : cfg.color}; margin:4px 0 2px; font-variant-numeric:tabular-nums;">${fmt2(act.start)}</span>
            <span style="font-size:.72rem; color:rgba(148,163,184,.6);">${act.end ? '– ' + fmt2(act.end) : ''}</span>
          </div>

          <!-- Contenido principal -->
          <div style="padding:14px 16px; flex:1; min-width:0;">
            <!-- Tipo + estado -->
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="
                display:inline-flex; align-items:center; gap:5px;
                padding:3px 8px; border-radius:999px; font-size:.7rem; font-weight:700;
                background:${isPast ? 'rgba(100,116,139,.12)' : 'rgba(0,0,0,.25)'};
                color:${isPast ? '#64748b' : cfg.color};
                border:1px solid ${isPast ? 'rgba(100,116,139,.18)' : cfg.border};
              "><i class="${cfg.icon}"></i> ${cfg.label}</span>
              ${isNow ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:800;background:rgba(34,197,94,.18);color:#4ade80;border:1px solid rgba(34,197,94,.3);animation:patchPulse 2s ease-in-out infinite;"><i class="fas fa-circle" style="font-size:.5rem;"></i> AHORA</span>` : ''}
              ${isPast ? `<span style="font-size:.7rem;color:#64748b;"><i class="fas fa-check"></i> Finalizado</span>` : ''}
            </div>

            <!-- Nombre -->
            <p style="margin:0 0 4px; font-size:1rem; font-weight:700; color:${isPast ? '#94a3b8' : '#eef4ff'}; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(act.name)}</p>

            <!-- Sub-info -->
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:6px;">
              ${act.speaker ? `<span style="font-size:.8rem;color:rgba(148,163,184,.8);"><i class="fas fa-user" style="color:${cfg.color};margin-right:3px;"></i>${esc(act.speaker)}</span>` : ''}
              ${act.location ? `<span style="font-size:.8rem;color:rgba(148,163,184,.8);"><i class="fas fa-map-marker-alt" style="color:${cfg.color};margin-right:3px;"></i>${esc(act.location)}</span>` : ''}
            </div>

            <!-- Descripción del estado -->
            ${!isPast ? `<p style="margin:8px 0 0;font-size:.78rem;font-weight:600;color:${scfg.textCol};"><i class="fas fa-arrow-right" style="margin-right:4px;"></i> ${scfg.label}</p>` : ''}
          </div>
        </div>`;
    }

    let html = '';

    // Encabezado
    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <span style="width:36px;height:36px;border-radius:10px;background:rgba(242,169,0,.15);border:1px solid rgba(242,169,0,.25);color:#f2a900;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;"><i class="fas fa-route"></i></span>
          <div>
            <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#f8fbff;">Mi Agenda del Evento</h3>
            <p style="margin:0;font-size:.82rem;color:rgba(148,163,184,.8);">${sorted.length} actividad${sorted.length !== 1 ? 'es' : ''} en tu cronograma</p>
          </div>
        </div>
      </div>`;

    // Actividades en curso
    if (now.length) {
      html += `<div style="margin-bottom:4px;"><span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4ade80;"><i class="fas fa-circle" style="font-size:.5rem;margin-right:4px;"></i>En este momento</span></div>`;
      html += now.map(a => buildItem(a, 'now')).join('');
    }

    // Próximas
    if (future.length) {
      html += `<div style="margin:${now.length ? '14px' : '0'} 0 4px;"><span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fbbf24;"><i class="fas fa-clock" style="margin-right:4px;"></i>Próximas actividades</span></div>`;
      html += future.map(a => buildItem(a, 'future')).join('');
    }

    // Pasadas (colapsadas)
    if (past.length) {
      html += `
        <div style="margin-top:14px;">
          <button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'; this.querySelector('i').classList.toggle('fa-chevron-down'); this.querySelector('i').classList.toggle('fa-chevron-up');"
            style="background:none;border:none;color:rgba(148,163,184,.7);font-size:.78rem;font-weight:600;cursor:pointer;padding:0;display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <i class="fas fa-chevron-down"></i> Ver actividades pasadas (${past.length})
          </button>
          <div style="display:none;">
            ${past.map(a => buildItem(a, 'past')).join('')}
          </div>
        </div>`;
    }

    agendaSection.innerHTML = html;

    // Insertar antes del primer hijo de cardsEl
    cardsEl.insertBefore(agendaSection, cardsEl.firstChild);
  }

  // ── CSS de animación pulso ─────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes patchPulse {
      0%,100% { opacity:1; box-shadow: 0 0 0 0 rgba(34,197,94,.4); }
      50%      { opacity:.85; box-shadow: 0 0 0 6px rgba(34,197,94,0); }
    }
  `;
  document.head.appendChild(style);

  // ── Monkey-patch: renderProgramSection de perfil.js ───────────────────────────
  // Se espera a que el DOM esté listo y perfil.js haya definido renderProgramSection.
  function installPatch() {
    const original = window.renderProgramSection;
    if (typeof original !== 'function') {
      // Reintentar en 300ms si aún no está cargado
      setTimeout(installPatch, 300);
      return;
    }

    window.renderProgramSection = async function (data) {
      // 1. Ejecutar el render original
      original(data);

      // 2. Si no hay inscripción aprobada, salir
      const request = data?.request;
      const status  = String(request?.status || '').toLowerCase();
      const approved = status === 'approved' || status === 'paid';
      if (!request || !approved) return;

      // 3. Cargar datos adicionales: conferencias inscritas + talleres inscritos
      const session = getSession();
      if (!session) return;
      const userId = session.id || session.userId || session.user_id;
      if (!userId) return;

      try {
        const [resConfEnroll, resWsEnroll] = await Promise.all([
          fetch(getApiUrl(`conference-enroll.php?userId=${encodeURIComponent(userId)}`), { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
          fetch(getApiUrl(`workshop-enroll.php?userId=${encodeURIComponent(userId)}`),  { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
        ]);

        const enrolledConfIds = (resConfEnroll?.enrolled_conference_ids || []).map(Number);
        const enrolledWsIds   = (resWsEnroll?.enrolled_workshop_ids    || []).map(Number);

        // ── Actualizar tarjeta de Conferencias ────────────────────────────────
        const allConfs = (data?.conferences || []).filter(
          c => c.status === 'published' || c.status === 'full'
        );
        const myConfs = allConfs.filter(c => enrolledConfIds.includes(Number(c.id)));

        // Reemplazar tarjeta "Conferencias" original con la de solo las inscritas
        const cardsEl = document.getElementById('profileProgramCards');
        if (cardsEl) {
          const confCard = cardsEl.querySelector('.prog-card--conf');
          if (confCard) {
            const hasEnrolled = myConfs.length > 0;
            // Actualizar textos de la tarjeta existente
            const titleEl   = confCard.querySelector('.prog-card-title');
            const subEl     = confCard.querySelector('.prog-card-sub');
            const metaEl    = confCard.querySelector('.prog-card-meta');
            const stateEl   = confCard.querySelector('.prog-card-state');
            const footerEl  = confCard.querySelector('.prog-card-footer');

            if (titleEl) titleEl.textContent = hasEnrolled ? `Mis Conferencias (${myConfs.length})` : 'Conferencias';
            if (stateEl) stateEl.textContent = hasEnrolled ? `${myConfs.length} inscrita${myConfs.length !== 1 ? 's' : ''}` : 'Sin inscripciones aún';
            if (subEl) subEl.textContent = hasEnrolled
              ? `Tienes ${myConfs.length} conferencia${myConfs.length !== 1 ? 's' : ''} en tu agenda.`
              : 'Aún no te has inscrito a ninguna conferencia. Ve a la sección de talleres/conferencias.';

            if (metaEl) {
              metaEl.innerHTML = (hasEnrolled ? myConfs : allConfs)
                .slice(0, 3)
                .map(c => `<span><i class="fas fa-circle-dot"></i> ${esc(c.name || 'Conferencia')}</span>`)
                .join('');
            }

            if (footerEl) {
              footerEl.innerHTML = `<span><i class="fas fa-circle-check"></i> ${hasEnrolled ? 'Disponible' : allConfs.length ? 'Disponibles – ¡Inscríbete!' : 'No disponible'}</span>
              ${(hasEnrolled || allConfs.length) ? '<span class="prog-card-cta">Ver detalle <i class="fas fa-arrow-right"></i></span>' : ''}`;
            }

            // Actualizar onClick para abrir solo las conferencias inscritas
            const targetConfs = hasEnrolled ? myConfs : allConfs;
            confCard.onclick = () => _openModalMisConferencias(myConfs, allConfs);
            if (hasEnrolled) {
              confCard.classList.remove('prog-card--locked');
            }
          }
        }

        // ── Construir lista de actividades para la agenda ─────────────────────
        const activities = [];

        // Talleres inscritos
        const allWs = data?.workshops || [];
        const myWs  = allWs.filter(w => enrolledWsIds.includes(Number(w.id)));
        myWs.forEach(w => {
          activities.push({
            type:     'taller',
            name:     w.name || 'Taller',
            date:     w.schedule_date,
            start:    w.schedule_start || w.time_start,
            end:      w.schedule_end   || w.time_end,
            location: w.location,
            speaker:  w.instructor_name,
          });
        });

        // Conferencias inscritas
        myConfs.forEach(c => {
          activities.push({
            type:     'conferencia',
            name:     c.name || 'Conferencia',
            date:     c.conference_date,
            start:    c.time_start,
            end:      c.time_end,
            location: c.location,
            speaker:  c.speaker_name,
          });
        });

        // Torneo de robótica (si aplica)
        if (request.includes_robotics) {
          activities.push({
            type:     'torneo',
            name:     'Torneo de Robótica – RENOVATEC 2026',
            date:     '2026-10-23',
            start:    '09:00',
            end:      '17:00',
            location: 'Área de competencia ITSU',
            speaker:  null,
          });
        }

        // Campamento (si aplica)
        if (request.includes_camp) {
          activities.push({
            type:     'campamento',
            name:     'Campamento RENOVATEC 2026',
            date:     '2026-10-22',
            start:    '18:00',
            end:      null,
            location: 'Instalaciones ITSU',
            speaker:  null,
          });
        }

        // Eliminar agenda anterior si existía y re-renderizar
        const old = document.getElementById('patchAgendaSection');
        if (old) old.remove();

        if (activities.length > 0) {
          renderAgenda(activities);
        }

      } catch (e) {
        console.warn('[patch-cronograma] Error al cargar datos de agenda:', e);
      }
    };

    console.log('[patch-cronograma-perfil] Instalado correctamente.');
  }

  // ── Modal mejorado de conferencias (propias + disponibles) ────────────────────
  function _openModalMisConferencias(misConfs, todasConfs) {
    const myConfs = misConfs.sort((a, b) =>
      (toTs(a.conference_date, a.time_start) - toTs(b.conference_date, b.time_start))
    );
    const disponibles = todasConfs
      .filter(c => !misConfs.find(m => m.id === c.id))
      .sort((a, b) => toTs(a.conference_date, a.time_start) - toTs(b.conference_date, b.time_start));

    function buildConfRow(c, enrolled) {
      const st = activityStatus(c.conference_date, c.time_start, c.time_end);
      const isPast = st === 'past';
      const isNow  = st === 'now';
      return `
        <div style="
          display:flex; align-items:flex-start; gap:12px;
          padding:12px 14px; border-radius:10px; margin-bottom:8px;
          background:${enrolled ? 'rgba(167,139,250,.1)' : 'rgba(255,255,255,.03)'};
          border:1px solid ${enrolled ? 'rgba(167,139,250,.25)' : 'rgba(255,255,255,.07)'};
          opacity:${isPast ? '.7' : '1'};
        ">
          <!-- Hora -->
          <div style="min-width:52px; text-align:center; flex-shrink:0;">
            <span style="display:block; font-size:.72rem; color:rgba(148,163,184,.7);">${fmtDateShort(c.conference_date)}</span>
            <span style="display:block; font-size:.95rem; font-weight:800; color:${enrolled ? '#a78bfa' : '#64748b'}; font-variant-numeric:tabular-nums;">${fmt2(c.time_start)}</span>
            <span style="display:block; font-size:.7rem; color:rgba(148,163,184,.6);">${c.time_end ? '–' + fmt2(c.time_end) : ''}</span>
          </div>
          <!-- Info -->
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px; flex-wrap:wrap;">
              ${enrolled ? '<span style="font-size:.68rem;font-weight:800;color:#a78bfa;text-transform:uppercase;letter-spacing:.05em;"><i class="fas fa-check-circle"></i> Inscrito</span>' : ''}
              ${isNow ? '<span style="font-size:.68rem;font-weight:800;color:#4ade80;text-transform:uppercase;"><i class="fas fa-circle" style="font-size:.45rem;"></i> En curso</span>' : ''}
              ${isPast && enrolled ? '<span style="font-size:.68rem;color:#64748b;"><i class="fas fa-check"></i> Finalizado</span>' : ''}
            </div>
            <p style="margin:0 0 4px; font-size:.92rem; font-weight:700; color:${enrolled ? '#e2e8f0' : '#94a3b8'}; line-height:1.3;">${esc(c.name || 'Conferencia')}</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px;">
              ${c.speaker_name ? `<span style="font-size:.75rem;color:rgba(148,163,184,.75);"><i class="fas fa-user" style="color:#a78bfa;margin-right:3px;"></i>${esc(c.speaker_name)}</span>` : ''}
              ${c.location ? `<span style="font-size:.75rem;color:rgba(148,163,184,.75);"><i class="fas fa-map-marker-alt" style="color:#a78bfa;margin-right:3px;"></i>${esc(c.location)}</span>` : ''}
            </div>
          </div>
        </div>`;
    }

    const myHtml = myConfs.length
      ? myConfs.map(c => buildConfRow(c, true)).join('')
      : '<p style="color:rgba(148,163,184,.5);font-size:.88rem;padding:8px 0;">Aún no te has inscrito a ninguna conferencia.</p>';

    const disponiblesHtml = disponibles.length
      ? disponibles.map(c => buildConfRow(c, false)).join('')
      : '';

    const html = `
      <div>
        <div class="prog-modal-header">
          <div class="prog-modal-icon prog-modal-icon--conf"><i class="fas fa-microphone-lines"></i></div>
          <div class="prog-modal-title-block">
            <p class="prog-modal-kicker">Mi Programa Académico</p>
            <h2 class="prog-modal-title">Conferencias</h2>
          </div>
        </div>
        <div class="prog-modal-body">

          ${myConfs.length ? `
          <div class="prog-note prog-note--info" style="background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.25);color:#c4b5fd;">
            <i class="fas fa-calendar-check"></i>
            Tienes <strong>${myConfs.length}</strong> conferencia${myConfs.length !== 1 ? 's' : ''} en tu agenda. Están ordenadas cronológicamente.
          </div>` : `
          <div class="prog-note" style="background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2);color:#fcd34d;">
            <i class="fas fa-info-circle"></i>
            Aún no te has inscrito a conferencias. Desde la página principal puedes explorar el catálogo.
          </div>`}

          <div class="prog-modal-section">
            <div class="prog-modal-section-head"><i class="fas fa-user-check"></i> Mis conferencias inscritas</div>
            <div class="prog-modal-section-body">${myHtml}</div>
          </div>

          ${disponiblesHtml ? `
          <div class="prog-modal-section" style="margin-top:16px;">
            <div class="prog-modal-section-head" style="color:rgba(148,163,184,.7);"><i class="fas fa-list"></i> Otras conferencias disponibles</div>
            <div class="prog-modal-section-body" style="opacity:.75;">${disponiblesHtml}</div>
          </div>` : ''}

          <div style="margin-top:18px;text-align:center;">
            <a href="usuario.html" style="display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:10px;background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3);color:#a78bfa;font-weight:700;text-decoration:none;font-size:.9rem;">
              <i class="fas fa-arrow-right"></i> Ver catálogo completo e inscribirme
            </a>
          </div>

        </div>
      </div>`;

    if (typeof openProgramModal === 'function') {
      openProgramModal(html);
    }
  }

  // Iniciar con delay para que perfil.js esté completamente cargado
  setTimeout(installPatch, 200);

})();
