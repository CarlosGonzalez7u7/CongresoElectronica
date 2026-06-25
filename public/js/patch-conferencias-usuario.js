(function () {
  "use strict";

  const esc = (s) => {
    const d = document.createElement("div");
    d.textContent = String(s || "");
    return d.innerHTML;
  };

  const FALLBACK_IMG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%23475569'%3ESin imagen%3C/text%3E%3C/svg%3E";

  function fmt2(t) {
    if (!t) return "--:--";
    const p = t.split(":");
    return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
  }

  function fmtDate(d) {
    if (!d) return "Sin fecha";
    const dt = new Date(String(d).replace(/-/g, "/"));
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getSession() {
    const raw =
      sessionStorage.getItem("renovatec_user_session_v1") ||
      localStorage.getItem("renovatec_user_session_v1");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  let _confPaidConvs = [];
  let _confCanEnroll = false;

  async function refreshConferenceState() {
    const session = getSession();
    if (!session) return;
    const userId = session.id || session.userId || session.user_id;
    try {
      const res = await fetch(
        `/app/api/conference-enroll.php?userId=${encodeURIComponent(userId)}`,
        { credentials: "include" },
      ).then((r) => r.json());
      if (res.success) {
        _confPaidConvs = (res.paid_convocatorias || []).map(Number);
        _confCanEnroll = !!res.can_enroll;
        window.userEnrolledConferenceIds = (
          res.enrolled_conference_ids || []
        ).map(Number);
      }
    } catch (e) {
      console.warn(
        "[patch-conf] No se pudo refrescar estado de conferencias",
        e,
      );
    }
  }

  // Llamar al cargar
  refreshConferenceState();

  // ── Verificar si el usuario puede inscribirse a UNA conferencia específica ──
  function userCanEnrollConference(conference) {
    if (!_confCanEnroll && _confPaidConvs.length === 0) return false;
    const convId = Number(conference.convocatoria_id || 0);
    // Si la conferencia no tiene convocatoria asignada (congreso por defecto)
    if (convId === 0) return _confCanEnroll;
    // Verificar si tiene la convocatoria pagada
    return _confPaidConvs.includes(convId) || _confCanEnroll;
  }

  // ── Inscribir a conferencia (llamable desde botones inline) ─────────────────
  window.patchInscribirConferencia = async function (conferenceId) {
    const btn = document.getElementById("patchBtnEnrollConf_" + conferenceId);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscribiendo...';
    }

    const session = getSession();
    if (!session) {
      alert("Debes iniciar sesión primero.");
      return;
    }

    try {
      const res = await fetch("/app/api/conference-enroll.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enroll",
          conferenceId,
          userId: session.id || session.userId || session.user_id,
        }),
      }).then((r) => r.json());

      if (res.success) {
        _showNotif("¡Inscripción exitosa a la conferencia!", "success");
        await refreshConferenceState();
        // Cerrar modal si está abierto
        const dynModal = document.getElementById("dynamicDetailsModal");
        if (dynModal) dynModal.classList.add("hidden");
        // Recargar tarjetas
        if (typeof cargarTalleres === "function") cargarTalleres();
      } else {
        throw new Error(res.error || "Error al inscribirse.");
      }
    } catch (err) {
      _showNotif(err.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="fas fa-user-plus"></i> Inscribirme a esta conferencia';
      }
    }
  };

  // ── Dar de baja de conferencia (llamable desde botones inline) ───────────────
  window.patchDarBajaConferencia = async function (conferenceId) {
    if (!confirm("¿Seguro que deseas darte de baja de esta conferencia?"))
      return;
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch("/app/api/conference-enroll.php", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unenroll",
          conferenceId,
          userId: session.id || session.userId || session.user_id,
        }),
      }).then((r) => r.json());

      if (res.success) {
        _showNotif(res.message || "Baja exitosa.", "success");
        await refreshConferenceState();
        const dynModal = document.getElementById("dynamicDetailsModal");
        if (dynModal) dynModal.classList.add("hidden");
        if (typeof cargarTalleres === "function") cargarTalleres();
      } else {
        throw new Error(res.error || "Error al darse de baja.");
      }
    } catch (err) {
      _showNotif(err.message, "error");
    }
  };

  // ── Monkey-patch: mostrarDetalleConferencia ──────────────────────────────────
  // Sobreescribimos la función original para agregar el botón de inscripción
  // con la lógica correcta (pago verificado por convocatoria, no solo congreso).
  const _originalMostrarDetalleConferencia = window.mostrarDetalleConferencia;

  window.mostrarDetalleConferencia = function (id) {
    const c = window.conferenceDataCache?.find((conf) => conf.id === id);
    if (!c) {
      if (_originalMostrarDetalleConferencia)
        _originalMostrarDetalleConferencia(id);
      return;
    }

    const isEnrolled = (window.userEnrolledConferenceIds || []).includes(
      Number(c.id),
    );
    const isFull = c.capacity > 0 && (c.enrolled_count || 0) >= c.capacity;
    const canEnroll = userCanEnrollConference(c);
    const session = getSession();

    let enrollmentHtml = "";

    if (isEnrolled) {
      enrollmentHtml = `
        <div style="margin-top:1.5rem; padding:1rem; background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); border-radius:8px; text-align:center;">
          <p style="color:#10b981; font-weight:bold; margin:0;"><i class="fas fa-check-circle"></i> ¡Estás inscrito en esta conferencia!</p>
          <button class="btn btn-danger" style="margin-top:10px; padding:8px 16px; border-radius:8px;"
            onclick="patchDarBajaConferencia(${c.id})">
            <i class="fas fa-right-from-bracket"></i> Darme de baja
          </button>
        </div>`;
    } else if (!session) {
      enrollmentHtml = `
        <div style="margin-top:1.5rem; text-align:center;">
          <button class="btn btn-primary" style="width:100%; padding:12px; font-size:1rem; border-radius:8px;"
            onclick="window.location.href='acceso.html'">
            <i class="fas fa-sign-in-alt"></i> Inicia sesión para inscribirte
          </button>
        </div>`;
    } else if (!canEnroll) {
      enrollmentHtml = `
        <div style="margin-top:1.5rem; padding:1rem; background:rgba(30,41,59,.6); border:1px solid rgba(148,163,184,.15); border-radius:8px; text-align:center;">
          <i class="fas fa-lock" style="color:#f2a900; font-size:1.4rem; display:block; margin-bottom:8px;"></i>
          <p style="color:#94a3b8; font-size:0.92rem; margin:0;">Para inscribirte a esta conferencia debes tener tu inscripción a la convocatoria <strong style="color:#e2e8f0;">aprobada y pagada</strong>.</p>
          <a href="tramite.html" style="display:inline-block; margin-top:12px; padding:7px 18px; border-radius:8px; background:rgba(242,169,0,.15); border:1px solid rgba(242,169,0,.3); color:#f2a900; font-size:0.85rem; font-weight:700; text-decoration:none;">
            <i class="fas fa-rocket"></i> Ir a mi trámite
          </a>
        </div>`;
    } else if (isFull) {
      enrollmentHtml = `
        <div style="margin-top:1.5rem; padding:1rem; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); border-radius:8px; text-align:center;">
          <p style="color:#ef4444; font-weight:bold; margin:0;"><i class="fas fa-ban"></i> Esta conferencia ya no tiene cupo.</p>
        </div>`;
    } else {
      enrollmentHtml = `
        <div style="margin-top:1.5rem; text-align:center;">
          <button id="patchBtnEnrollConf_${c.id}" class="btn btn-primary"
            style="width:100%; padding:12px; font-size:1rem; border-radius:8px;"
            onclick="patchInscribirConferencia(${c.id})">
            <i class="fas fa-user-plus"></i> Inscribirme a esta conferencia
          </button>
          <p style="color:rgba(148,163,184,0.7); font-size:0.78rem; margin-top:8px;">
            <i class="fas fa-shield-check"></i> El sistema verificará que no haya choque de horario con tus otras actividades.
          </p>
        </div>`;
    }

    let tags = [];
    try {
      tags = typeof c.tags === "string" ? JSON.parse(c.tags) : c.tags || [];
    } catch {
      tags = [];
    }
    if (!Array.isArray(tags)) tags = [];

    const cover = c.cover_image_url
      ? c.cover_image_url.startsWith("/uploads/")
        ? "/app" + c.cover_image_url
        : c.cover_image_url
      : "";

    const capacityHtml =
      c.capacity > 0
        ? `<div><strong style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:rgba(237,242,255,.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-users" style="color:#f2a900;"></i> Cupo</strong><span style="font-weight:600;color:${isFull ? "#ef4444" : "#34d399"};">${c.enrolled_count || 0} / ${c.capacity}</span></div>`
        : "";

    const html = `
      <div style="text-align:left;color:#eef4ff;">
        ${cover ? `<img src="${esc(cover)}" style="width:100%;height:220px;object-fit:cover;border-radius:12px;margin-bottom:1.5rem;box-shadow:0 4px 10px rgba(0,0,0,.3);" onerror="this.src='${FALLBACK_IMG}'">` : ""}

        <h3 style="margin:0 0 1rem;color:#eef4ff;font-size:1.5rem;font-weight:800;">${esc(c.name)}</h3>

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid rgba(255,255,255,.09);">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(56,189,248,.1);display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:1.5rem;flex-shrink:0;">
            <i class="fas fa-microphone-alt"></i>
          </div>
          <div style="flex:1;">
            <p style="color:#fff;font-weight:bold;font-size:1.1rem;margin:0;">${esc(c.speaker_name || "Por definir")}</p>
            ${c.speaker_title || c.speaker_org ? `<p style="color:rgba(237,242,255,.6);font-size:.9rem;margin:4px 0 0;">${esc(c.speaker_title || "")}${c.speaker_org ? " - " + esc(c.speaker_org) : ""}</p>` : ""}
          </div>
        </div>

        <p style="margin-bottom:2rem;line-height:1.6;color:rgba(237,242,255,.85);font-size:1.05rem;">${esc(c.description || "Sin descripción.")}</p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:2rem;background:rgba(255,255,255,.03);padding:1.25rem;border-radius:12px;border:1px solid rgba(255,255,255,.09);">
          <div>
            <strong style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:rgba(237,242,255,.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-calendar" style="color:#f2a900;"></i> Fecha</strong>
            <span style="font-weight:600;color:#eef4ff;">${fmtDate(c.conference_date)}</span>
          </div>
          <div>
            <strong style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:rgba(237,242,255,.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-clock" style="color:#f2a900;"></i> Horario</strong>
            <span style="font-weight:600;color:#eef4ff;">${fmt2(c.time_start)} – ${fmt2(c.time_end)}</span>
          </div>
          <div>
            <strong style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:rgba(237,242,255,.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-map-marker-alt" style="color:#f2a900;"></i> Lugar</strong>
            <span style="font-weight:600;color:#eef4ff;">${esc(c.location || "Por definir")}</span>
          </div>
          <div>
            <strong style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:rgba(237,242,255,.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-language" style="color:#f2a900;"></i> Idioma</strong>
            <span style="font-weight:600;color:#eef4ff;">${esc(c.language || "Español")}</span>
          </div>
          ${capacityHtml}
        </div>

        ${tags.length ? `<div style="margin-bottom:1.5rem;"><h4 style="font-size:1.1rem;margin-bottom:.75rem;color:var(--primary-blue,#38bdf8);display:flex;align-items:center;gap:8px;"><i class="fas fa-tags"></i> Etiquetas</h4><div style="display:flex;flex-wrap:wrap;gap:.5rem;">${tags.map((t) => `<span style="padding:4px 12px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);border-radius:99px;color:#38bdf8;font-size:.8rem;">${esc(typeof t === "string" ? t : t.tag_name || t.name || "")}</span>`).join("")}</div></div>` : ""}

        ${enrollmentHtml}
      </div>`;

    if (typeof mostrarModalDinamico === "function") {
      mostrarModalDinamico("Detalles de Conferencia", html);
    }
  };

  // ── Helper notificaciones ─────────────────────────────────────────────────────
  function _showNotif(msg, tipo) {
    if (typeof mostrarNotificacion === "function") {
      mostrarNotificacion(msg, tipo);
      return;
    }
    // fallback
    const n = document.createElement("div");
    n.style.cssText = `position:fixed;bottom:30px;right:30px;padding:14px 22px;border-radius:12px;font-weight:600;z-index:99999;background:${tipo === "success" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)"};color:${tipo === "success" ? "#34d399" : "#f87171"};border:1px solid ${tipo === "success" ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"};`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
  }
})();
