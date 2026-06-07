/* ═══════════════════════════════════════════════════════════════════
   admin-badges-patch.js  —  RENOVATEC 2026
   Parche completo para generateBadgesPdf

   MEJORAS:
   1. QR siempre generado (usando la lib qrcode.js ya cargada)
   2. Muestra el nombre de cada convocatoria inscrita
   3. Si la convocatoria incluye módulos extras (talleres, conferencias…)
      los lista en el gafete
   4. Si tiene inscripción al torneo de robótica:
      - Al titular/capitán le agrega "Capitán — Torneo de Robótica"
      - Genera un gafete adicional por cada integrante del equipo
        con su nombre, rol "Integrante del Torneo de Robótica" y
        el folio + nombre del capitán al pie

   Cargar AL FINAL del <body>, después de admin.js
   v20260607
═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ──────────────────────────────────────────────────────────────
     UTILIDADES
  ────────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Genera una Data URL de QR usando la lib qrcode.js (ya incluida en admin.html) */
  async function makeQrDataUrl(text) {
    if (!text) return null;
    try {
      // qrcode.js expone `QRCode` en window
      if (typeof window.QRCode !== "undefined" && window.QRCode.toDataURL) {
        return await window.QRCode.toDataURL(String(text), {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 200,
          color: { dark: "#0c1b33", light: "#ffffff" },
        });
      }
    } catch (e) {
      console.warn("[badges-patch] QRCode.toDataURL falló:", e);
    }
    return null;
  }

  /** Convierte una data URL a <img> HTML inline */
  function qrImg(dataUrl) {
    if (!dataUrl) {
      // Fallback: caja gris con texto
      return `<div style="width:120px;height:120px;background:#e2e8f0;display:flex;
        align-items:center;justify-content:center;border-radius:8px;
        font-size:10px;color:#94a3b8;text-align:center;margin:0 auto;">
        QR no disponible</div>`;
    }
    return `<img src="${dataUrl}" alt="QR" style="width:120px;height:120px;display:block;margin:0 auto;border-radius:6px;">`;
  }

  /* ──────────────────────────────────────────────────────────────
     CSS DEL GAFETE  (inyectado en la ventana de impresión)
  ────────────────────────────────────────────────────────────── */
  const BADGE_CSS = `
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f0f4f8;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }
    .badges-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
    }
    .badge {
      width: 8.5cm;
      min-height: 11cm;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,.12);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    /* ── Cabecera del gafete ── */
    .badge-header {
      background: #0c1b33;
      padding: 14px 16px 10px;
      text-align: center;
      border-bottom: 3px solid #f2a900;
    }
    .badge-header-title {
      font-size: 13px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .badge-header-sub {
      font-size: 10px;
      color: #00c6f8;
      letter-spacing: .8px;
      margin-top: 2px;
    }
    /* ── Cuerpo ── */
    .badge-body {
      padding: 16px 14px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .badge-name {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0c1b33;
      text-align: center;
      line-height: 1.15;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .badge-role {
      font-size: 11px;
      font-weight: 800;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: .8px;
      text-align: center;
      margin-bottom: 4px;
    }
    .badge-school {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      text-align: center;
      margin-bottom: 10px;
      word-break: break-word;
    }
    /* ── QR ── */
    .badge-qr-wrap {
      margin: 8px auto;
      padding: 6px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      display: inline-block;
    }
    /* ── Convocatorias ── */
    .badge-convos {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px 10px;
      margin: 10px 0 4px;
      font-size: 10px;
      color: #334155;
      text-align: center;
      line-height: 1.55;
    }
    .badge-convos strong {
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #0284c7;
      margin-bottom: 3px;
    }
    .badge-convo-item {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      text-align: left;
      margin-bottom: 3px;
    }
    .badge-convo-item .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #0284c7;
      flex-shrink: 0;
      margin-top: 3px;
    }
    .badge-convo-mods {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    /* ── Captain ref (integrantes) ── */
    .badge-captain-ref {
      font-size: 9.5px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
      margin-top: 4px;
      width: 100%;
    }
    /* ── Pie ── */
    .badge-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      padding: 6px 10px;
      font-size: 9px;
      color: #94a3b8;
      font-family: monospace;
      letter-spacing: .5px;
    }
    /* ── Impresión ── */
    @media print {
      body { background: #fff; padding: 0; }
      .badge {
        box-shadow: none;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
      }
    }
    @page { size: A4; margin: 1cm; }
  `;

  /* ──────────────────────────────────────────────────────────────
     CONSTRUCCIÓN DE UN GAFETE HTML
  ────────────────────────────────────────────────────────────── */

  /**
   * Construye el HTML de un gafete individual.
   * @param {object} opts
   * @param {string} opts.name
   * @param {string} opts.role          — rol principal
   * @param {string} opts.school
   * @param {string} opts.folio
   * @param {string|null} opts.qrDataUrl
   * @param {Array<{title:string, mods:string[]}>} opts.convos
   * @param {string|null} opts.captainRef — para integrantes: "Capitán: Nombre (FOLIO)"
   */
  function buildBadgeHtml(opts) {
    const { name, role, school, folio, qrDataUrl, convos, captainRef } = opts;

    const convosHtml = convos && convos.length
      ? convos
          .map((c) => {
            const modsLine = c.mods && c.mods.length
              ? `<div class="badge-convo-mods">Incluye: ${c.mods.join(" • ")}</div>`
              : "";
            return `<div class="badge-convo-item">
              <span class="dot"></span>
              <div>
                <span>${esc(c.title)}</span>
                ${modsLine}
              </div>
            </div>`;
          })
          .join("")
      : `<div style="color:#94a3b8;font-style:italic;">Sin convocatorias asignadas</div>`;

    const captainLine = captainRef
      ? `<div class="badge-captain-ref"><i>👤 ${esc(captainRef)}</i></div>`
      : "";

    return `
      <div class="badge">
        <div class="badge-header">
          <div class="badge-header-title">RENOVATEC 2026</div>
          <div class="badge-header-sub">CONGRESO INTERNACIONAL DE ELECTRÓNICA</div>
        </div>
        <div class="badge-body">
          <div class="badge-name">${esc(name)}</div>
          <div class="badge-role">${esc(role)}</div>
          <div class="badge-school">${esc(school)}</div>
          <div class="badge-qr-wrap">${qrImg(qrDataUrl)}</div>
          <div class="badge-convos">
            <strong>Accesos Autorizados</strong>
            ${convosHtml}
          </div>
          ${captainLine}
        </div>
        <div class="badge-footer">FOLIO: ${esc(folio)} &nbsp;|&nbsp; Pase Personal e Intransferible</div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────────────────────────
     OBTENER CONVOCATORIAS DE LA BD (cache por sesión)
  ────────────────────────────────────────────────────────────── */
  let _convosCache = null;

  async function fetchConvos() {
    if (_convosCache) return _convosCache;
    try {
      const res  = await fetch("/app/api/public-landing.php", { credentials: "include" });
      const json = await res.json();
      if (json.success && json.data && json.data.convocatorias) {
        _convosCache = json.data.convocatorias;
        return _convosCache;
      }
    } catch (e) {}
    return [];
  }

  /**
   * Dada una solicitud devuelve [{title, mods[]}] con todas las convocatorias
   * a las que está inscrito, enriquecidas con sus módulos.
   */
  async function resolveConvos(request) {
    const convosDB = await fetchConvos();
    const result   = [];

    // Convocatorias seleccionadas explícitamente
    let selectedIds = [];
    try {
      if (request.selected_convocatorias_json) {
        const parsed = JSON.parse(request.selected_convocatorias_json);
        if (Array.isArray(parsed)) selectedIds = parsed.map(Number);
      }
    } catch (_) {}

    if (selectedIds.length > 0) {
      selectedIds.forEach((cId) => {
        const dbConv = convosDB.find((c) => Number(c.id) === cId);
        if (!dbConv) return;

        const mods = [];
        try {
          const m = JSON.parse(dbConv.included_modules || "{}");
          if (m.congress)     mods.push("Congreso");
          if (m.workshops)    mods.push("Talleres");
          if (m.conferences)  mods.push("Conferencias");
          if (m.robotics)     mods.push("Robótica");
          if (m.camp)         mods.push("Campamento");
          if (m.custom && Array.isArray(m.custom)) {
            m.custom.forEach((cm) => mods.push(cm.label || cm.name || "Extra"));
          }
        } catch (_) {}

        result.push({ title: dbConv.titulo || `Convocatoria #${cId}`, mods });
      });
    }

    // Fallback: flags booleanos del registro si no hay convocatorias explícitas
    if (result.length === 0) {
      if (request.includes_congress) {
        const mods = [];
        if (request.includes_workshops)   mods.push("Talleres");
        if (request.includes_conferences) mods.push("Conferencias");
        result.push({ title: "Congreso Internacional de Electrónica", mods });
      }
      if (request.includes_robotics) {
        result.push({ title: "Torneo de Robótica", mods: [] });
      }
      if (request.includes_camp) {
        result.push({ title: "Campamento RENOVATEC", mods: [] });
      }
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────
     FUNCIÓN PRINCIPAL — reemplaza window.generateBadgesPdf
  ────────────────────────────────────────────────────────────── */
  async function generateBadgesPdfPatched() {
    const btn = document.getElementById("btnGenerateBadges");
    const setBtnState = (loading) => {
      if (!btn) return;
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i> Generando…'
        : '<i class="fas fa-id-badge"></i> Gafetes PDF';
    };

    setBtnState(true);

    try {
      /* 1 — Obtener solicitudes aprobadas */
      const res  = await fetch("/app/api/admin-congress-requests.php?status=approved", {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error("Error al obtener solicitudes aprobadas");

      const approved = data.data || [];
      if (!approved.length) {
        window.showBadgeToast("No hay alumnos aprobados para generar gafetes.", "warning");
        setBtnState(false);
        return;
      }

      /* 2 — Construir todos los gafetes */
      let badgesHtml = "";

      for (const request of approved) {
        const convos = await resolveConvos(request);
        const hasRobotics = !!(
          request.includes_robotics ||
          convos.some((c) => c.title.toLowerCase().includes("robótica") || c.title.toLowerCase().includes("robotica"))
        );

        // Rol del titular
        let titleRole = "Participante";
        if (hasRobotics) {
          titleRole = "Capitán — Torneo de Robótica";
        } else if (request.includes_congress) {
          titleRole = "Participante — Congreso";
        }

        const folio  = request.request_folio || request.team_folio || "";
        const name   = request.full_name || request.email || "Participante";
        const school = request.school || "Sin institución";

        // QR para el titular — codifica el folio del congreso
        const qrTitular = await makeQrDataUrl(folio);

        // Gafete del TITULAR
        badgesHtml += buildBadgeHtml({
          name,
          role:   titleRole,
          school,
          folio,
          qrDataUrl: qrTitular,
          convos,
          captainRef: null,
        });

        // Gafetes de INTEGRANTES (si tiene equipo de robótica)
        if (hasRobotics && Array.isArray(request.members) && request.members.length) {
          const members = request.members.filter(
            (m) => !m.is_captain && (m.member_name || m.name),
          );

          for (const member of members) {
            const memberName = member.member_name || member.name || "Integrante";
            // El QR del integrante apunta al mismo folio del equipo
            const qrMember = await makeQrDataUrl(folio);

            badgesHtml += buildBadgeHtml({
              name:     memberName,
              role:     "Integrante del Torneo de Robótica",
              school,
              folio,
              qrDataUrl: qrMember,
              convos:   [{ title: "Torneo de Robótica", mods: [] }],
              captainRef: `Capitán: ${name} (${folio})`,
            });
          }
        }
      }

      /* 3 — Abrir ventana de impresión */
      const printWin = window.open("", "_blank");
      if (!printWin) {
        window.showBadgeToast(
          "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.",
          "error",
        );
        setBtnState(false);
        return;
      }

      const totalBadges = approved.reduce((acc, r) => {
        const hasR = !!(r.includes_robotics);
        const memberCount = hasR && Array.isArray(r.members)
          ? r.members.filter((m) => !m.is_captain && (m.member_name || m.name)).length
          : 0;
        return acc + 1 + memberCount;
      }, 0);

      printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Gafetes RENOVATEC 2026</title>
  <style>${BADGE_CSS}</style>
</head>
<body>
  <h2 style="text-align:center;color:#0c1b33;font-size:1rem;margin-bottom:20px;font-family:Helvetica,Arial,sans-serif;">
    RENOVATEC 2026 — ${totalBadges} gafete${totalBadges !== 1 ? "s" : ""}
  </h2>
  <div class="badges-grid">
    ${badgesHtml}
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 1500);
    };
  <\/script>
</body>
</html>`);
      printWin.document.close();

      window.showBadgeToast(
        `${totalBadges} gafete${totalBadges !== 1 ? "s" : ""} generado${totalBadges !== 1 ? "s" : ""} correctamente.`,
        "success",
      );
    } catch (err) {
      console.error("[badges-patch]", err);
      window.showBadgeToast("Error al generar los gafetes: " + (err.message || err), "error");
    } finally {
      setBtnState(false);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     También parchamos printBadges del congressModule para que use
     la misma lógica de QR y módulos mejorada
  ────────────────────────────────────────────────────────────── */
  function patchCongressModulePrintBadges() {
    // congressModule es un IIFE — expone printBadges si está en el objeto público
    if (
      typeof window.congressModule === "undefined" ||
      typeof window.congressModule.printBadges !== "function"
    ) {
      setTimeout(patchCongressModulePrintBadges, 300);
      return;
    }

    const origPrint = window.congressModule.printBadges;
    window.congressModule.printBadges = async function (requestId) {
      // Buscar la solicitud en la lista interna del módulo
      const requests = window.congressModule._getRequests
        ? window.congressModule._getRequests()
        : [];
      const r = requests.find((x) => x.request_id === requestId);
      if (!r) { origPrint(requestId); return; }

      const convos   = await resolveConvos(r);
      const hasRobotics = !!(
        r.includes_robotics ||
        convos.some((c) => c.title.toLowerCase().includes("robótica") || c.title.toLowerCase().includes("robotica"))
      );

      const folio  = r.request_folio || r.team_folio || "";
      const name   = r.full_name || r.email || "Participante";
      const school = r.school || "Sin institución";

      let role = "Participante";
      if (hasRobotics) role = "Capitán — Torneo de Robótica";
      else if (r.includes_congress) role = "Participante — Congreso";

      const qrTitular = await makeQrDataUrl(folio);
      let badgesHtml  = buildBadgeHtml({ name, role, school, folio, qrDataUrl: qrTitular, convos, captainRef: null });

      if (hasRobotics && Array.isArray(r.members) && r.members.length) {
        for (const m of r.members) {
          if (m.is_captain) continue;
          const mName = m.member_name || m.name || "Integrante";
          const qrM   = await makeQrDataUrl(folio);
          badgesHtml += buildBadgeHtml({
            name:      mName,
            role:      "Integrante del Torneo de Robótica",
            school,
            folio,
            qrDataUrl: qrM,
            convos:    [{ title: "Torneo de Robótica", mods: [] }],
            captainRef:`Capitán: ${name} (${folio})`,
          });
        }
      }

      const printWin = window.open("", "_blank");
      if (!printWin) { origPrint(requestId); return; }

      printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Gafete — ${esc(folio)}</title>
  <style>${BADGE_CSS}</style>
</head>
<body>
  <div class="badges-grid">${badgesHtml}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},1500);}<\/script>
</body>
</html>`);
      printWin.document.close();
    };
  }

  /* ──────────────────────────────────────────────────────────────
     INIT — esperar a que el DOM y las libs estén listas
  ────────────────────────────────────────────────────────────── */
  function init() {
    // Reemplazar la función global de gafetes masivos
    window.generateBadgesPdf = generateBadgesPdfPatched;

    // Parchear el printBadges individual del congressModule
    patchCongressModulePrintBadges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
