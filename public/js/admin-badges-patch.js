/* ═══════════════════════════════════════════════════════════════════
   admin-badges-patch.js  —  RENOVATEC 2026  v20260607-3
   Parche para generateBadgesPdf y congressModule.printBadges

   QR: se obtiene del endpoint /app/api/get-qr.php que ya existe
       en el servidor → se convierte a base64 → se embebe en el HTML.
       Esto es 100% confiable sin depender de libs browser.
═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ────────────────────────────────────────────────────────────
     ESCAPE HTML
  ──────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ────────────────────────────────────────────────────────────
     QR — usa el endpoint PHP del propio servidor
     /app/api/get-qr.php?text=FOLIO&size=200
     Descarga la imagen y la convierte a data:image/png;base64,...
  ──────────────────────────────────────────────────────────── */
  async function makeQrDataUrl(text) {
    if (!text) return null;
    try {
      var url =
        "/app/api/get-qr.php?text=" +
        encodeURIComponent(String(text)) +
        "&size=200";
      var res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var blob = await res.blob();
      return await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("[badges-patch] QR fetch falló:", e);
      return null;
    }
  }

  /* ────────────────────────────────────────────────────────────
     BLOQUE HTML del QR (con fallback si no hay imagen)
  ──────────────────────────────────────────────────────────── */
  function qrBlock(dataUrl, folio) {
    if (dataUrl) {
      return `
        <div style="text-align:center;margin:10px auto 6px;">
          <div style="display:inline-block;padding:6px;
               border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;">
            <img src="${dataUrl}"
                 alt="QR ${esc(folio)}"
                 style="width:120px;height:120px;display:block;">
          </div>
        </div>`;
    }
    return `
      <div style="text-align:center;margin:10px auto 6px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;
             width:120px;height:120px;background:#f1f5f9;
             border:1.5px solid #e2e8f0;border-radius:10px;
             font-size:10px;color:#94a3b8;text-align:center;padding:8px;
             box-sizing:border-box;flex-direction:column;gap:4px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#cbd5e1" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
          </svg>
          <span style="font-size:9px;font-family:monospace;">${esc(folio)}</span>
        </div>
      </div>`;
  }

  /* ────────────────────────────────────────────────────────────
     CSS EMBEBIDO EN LA VENTANA DE IMPRESIÓN
  ──────────────────────────────────────────────────────────── */
  var BADGE_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f0f4f8;
      padding: 24px;
      color: #0f172a;
    }
    h1.print-title {
      text-align: center;
      font-size: .9rem;
      color: #334155;
      margin-bottom: 20px;
      font-weight: 700;
      font-family: Helvetica, Arial, sans-serif;
    }
    .badges-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
    }
    /* ── GAFETE ── */
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
    .badge-header {
      background: #0c1b33;
      padding: 13px 16px 10px;
      text-align: center;
      border-bottom: 3px solid #f2a900;
    }
    .bh-title {
      font-size: 12px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .bh-sub {
      font-size: 9px;
      color: #00c6f8;
      letter-spacing: .5px;
      margin-top: 2px;
    }
    .badge-body {
      padding: 14px 14px 8px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .b-name {
      font-size: 16.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0c1b33;
      text-align: center;
      line-height: 1.15;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .b-role {
      font-size: 10px;
      font-weight: 800;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: .7px;
      text-align: center;
      margin-bottom: 3px;
    }
    .b-school {
      font-size: 9px;
      color: #475569;
      font-weight: 600;
      text-align: center;
      margin-bottom: 4px;
      word-break: break-word;
    }
    /* ── Accesos ── */
    .b-accesos {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px 10px;
      margin-top: 6px;
    }
    .b-accesos-title {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #0284c7;
      font-weight: 800;
      text-align: center;
      margin-bottom: 5px;
    }
    .b-convo {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 5px;
    }
    .b-convo:last-child { margin-bottom: 0; }
    .b-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #0284c7;
      flex-shrink: 0;
      margin-top: 3px;
    }
    .b-convo-name  { font-size: 9.5px; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .b-convo-mods  { font-size: 8px; color: #64748b; margin-top: 1px; }
    .b-convo-ws    { font-size: 8px; color: #475569; font-style: italic; margin-top: 1px; }
    /* ── Capitán ref (integrantes) ── */
    .b-captain-ref {
      font-size: 8.5px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 5px;
      margin-top: 6px;
      width: 100%;
    }
    /* ── Footer ── */
    .badge-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      padding: 5px 10px;
      font-size: 8px;
      color: #94a3b8;
      font-family: monospace;
      letter-spacing: .5px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .badge { box-shadow: none; border: 1px solid #cbd5e1; border-radius: 10px; }
    }
    @page { size: A4; margin: 1cm; }
  `;

  /* ────────────────────────────────────────────────────────────
     CONSTRUIR HTML DE UN GAFETE
  ──────────────────────────────────────────────────────────── */
  function buildBadgeHtml(opts) {
    var name = opts.name || "Participante";
    var role = opts.role || "Participante";
    var school = opts.school || "";
    var folio = opts.folio || "";
    var qrDataUrl = opts.qrDataUrl || null;
    var convos = opts.convos || [];
    var captainRef = opts.captainRef || null;

    /* Renderizar convocatorias */
    var convosHtml = convos.length
      ? convos
          .map(function (c) {
            var mods = "";
            if (c.mods && c.mods.length) {
              mods = `<div class="b-convo-mods">Incluye: ${c.mods.map(esc).join(" · ")}</div>`;
            }
            var ws = "";
            if (c.workshopName) {
              ws += `<div class="b-convo-ws">🎓 Taller: ${esc(c.workshopName)}</div>`;
            }
            if (c.conferenceName) {
              ws += `<div class="b-convo-ws">🎤 Conferencia: ${esc(c.conferenceName)}</div>`;
            }
            return `<div class="b-convo">
            <span class="b-dot"></span>
            <div>
              <div class="b-convo-name">${esc(c.title)}</div>
              ${mods}${ws}
            </div>
          </div>`;
          })
          .join("")
      : `<div style="font-size:8.5px;color:#94a3b8;text-align:center;
              font-style:italic;">Sin convocatorias asignadas</div>`;

    var captainLine = captainRef
      ? `<div class="b-captain-ref">👤 ${esc(captainRef)}</div>`
      : "";

    return `
    <div class="badge">
      <div class="badge-header">
        <div class="bh-title">RENOVATEC 2026</div>
        <div class="bh-sub">CONGRESO INTERNACIONAL DE ELECTRÓNICA</div>
      </div>
      <div class="badge-body">
        <div class="b-name">${esc(name)}</div>
        <div class="b-role">${esc(role)}</div>
        <div class="b-school">${esc(school)}</div>
        ${qrBlock(qrDataUrl, folio)}
        <div class="b-accesos">
          <div class="b-accesos-title">Accesos Autorizados</div>
          ${convosHtml}
        </div>
        ${captainLine}
      </div>
      <div class="badge-footer">FOLIO: ${esc(folio)} &nbsp;·&nbsp; Pase Personal e Intransferible</div>
    </div>`;
  }

  /* ────────────────────────────────────────────────────────────
     CACHÉ DE CONVOCATORIAS
  ──────────────────────────────────────────────────────────── */
  var _convosCache = null;
  async function fetchConvos() {
    if (_convosCache) return _convosCache;
    try {
      var r = await fetch("/app/api/public-landing.php", {
        credentials: "include",
      });
      var j = await r.json();
      _convosCache =
        j.success && j.data && j.data.convocatorias ? j.data.convocatorias : [];
    } catch (_) {
      _convosCache = [];
    }
    return _convosCache;
  }

  /** Devuelve [{title, mods[], workshopName?, conferenceName?}] */
  async function resolveConvos(request) {
    var db = await fetchConvos();
    var out = [];

    var ids = [];
    try {
      if (request.selected_convocatorias_json) {
        var p = JSON.parse(request.selected_convocatorias_json);
        if (Array.isArray(p)) ids = p.map(Number);
      }
    } catch (_) {}

    ids.forEach(function (cId) {
      var dbC = db.find(function (c) {
        return Number(c.id) === cId;
      });
      if (!dbC) return;
      var mods = [],
        wsName = null,
        cfName = null;
      try {
        var m = JSON.parse(dbC.included_modules || "{}");
        if (m.congress) mods.push("Congreso");
        if (m.workshops) mods.push("Talleres");
        if (m.conferences) mods.push("Conferencias");
        if (m.robotics) mods.push("Robótica");
        if (m.camp) mods.push("Campamento");
        if (m.custom && Array.isArray(m.custom)) {
          m.custom.forEach(function (x) {
            mods.push(x.label || x.name || "Extra");
          });
        }
        if (m.workshops && request.workshop_name)
          wsName = request.workshop_name;
        if (m.conferences && request.conference_name)
          cfName = request.conference_name;
      } catch (_) {}
      out.push({
        title: dbC.titulo || "Convocatoria #" + cId,
        mods: mods,
        workshopName: wsName,
        conferenceName: cfName,
      });
    });

    /* Fallback si no hay IDs */
    if (!out.length) {
      if (request.includes_congress) {
        var mods2 = [];
        if (request.workshop_name) mods2.push("Talleres");
        if (request.conference_name) mods2.push("Conferencias");
        out.push({
          title: "Congreso Internacional de Electrónica",
          mods: mods2,
          workshopName: request.workshop_name || null,
          conferenceName: request.conference_name || null,
        });
      }
      if (request.includes_robotics)
        out.push({
          title: "Torneo de Robótica",
          mods: [],
          workshopName: null,
          conferenceName: null,
        });
      if (request.includes_camp)
        out.push({
          title: "Campamento RENOVATEC",
          mods: [],
          workshopName: null,
          conferenceName: null,
        });
    }
    return out;
  }

  /* ────────────────────────────────────────────────────────────
     ABRIR VENTANA DE IMPRESIÓN CON EL HTML FINAL
  ──────────────────────────────────────────────────────────── */
  function openPrintWindow(badgesHtml, totalBadges) {
    var win = window.open("", "_blank");
    if (!win) {
      window.showBadgeToast &&
        window.showBadgeToast(
          "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio.",
          "error",
        );
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Gafetes RENOVATEC 2026</title>
  <style>${BADGE_CSS}</style>
</head>
<body>
  <h1 class="print-title">RENOVATEC 2026 — ${totalBadges} gafete${totalBadges !== 1 ? "s" : ""}</h1>
  <div class="badges-grid">${badgesHtml}</div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 1800);
    });
  <\/script>
</body>
</html>`);
    win.document.close();
  }

  /* ────────────────────────────────────────────────────────────
     GENERAR TODOS LOS GAFETES para una solicitud
  ──────────────────────────────────────────────────────────── */
  async function badgesForRequest(request) {
    var convos = await resolveConvos(request);
    var hasRobotics = !!(
      request.includes_robotics ||
      convos.some(function (c) {
        return /rob[oó]tica/i.test(c.title);
      })
    );

    var folio = request.request_folio || request.team_folio || "";
    var name = request.full_name || request.email || "Participante";
    var school = request.school || "Sin institución";
    var role = hasRobotics
      ? "Capitán — Torneo de Robótica"
      : request.includes_congress
        ? "Participante — Congreso"
        : "Participante";

    /* QR del titular */
    var qrMain = await makeQrDataUrl(folio);

    var html = buildBadgeHtml({
      name: name,
      role: role,
      school: school,
      folio: folio,
      qrDataUrl: qrMain,
      convos: convos,
      captainRef: null,
    });
    var count = 1;

    /* Gafetes de integrantes (robótica) */
    if (hasRobotics && Array.isArray(request.members)) {
      var nonCaptains = request.members.filter(function (m) {
        return !m.is_captain && (m.member_name || m.name);
      });
      for (var i = 0; i < nonCaptains.length; i++) {
        var mName =
          nonCaptains[i].member_name || nonCaptains[i].name || "Integrante";
        var qrMem = await makeQrDataUrl(folio);
        html += buildBadgeHtml({
          name: mName,
          role: "Integrante del Torneo de Robótica",
          school: school,
          folio: folio,
          qrDataUrl: qrMem,
          convos: [
            {
              title: "Torneo de Robótica",
              mods: [],
              workshopName: null,
              conferenceName: null,
            },
          ],
          captainRef: "Capitán: " + name + " (" + folio + ")",
        });
        count++;
      }
    }
    return { html: html, count: count };
  }

  /* ────────────────────────────────────────────────────────────
     REEMPLAZAR window.generateBadgesPdf  (botón "Gafetes PDF")
  ──────────────────────────────────────────────────────────── */
  async function generateBadgesPdfPatched() {
    var btn = document.getElementById("btnGenerateBadges");
    var setBtn = function (loading) {
      if (!btn) return;
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i> Generando…'
        : '<i class="fas fa-id-badge"></i> Gafetes PDF';
    };
    setBtn(true);

    try {
      var res = await fetch(
        "/app/api/admin-congress-requests.php?status=approved",
        {
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
        },
      );
      var data = await res.json();
      if (!data.success) throw new Error("Error al obtener solicitudes");

      var approved = data.data || [];
      if (!approved.length) {
        window.showBadgeToast &&
          window.showBadgeToast(
            "No hay participantes aprobados para generar gafetes.",
            "warning",
          );
        setBtn(false);
        return;
      }

      var allHtml = "",
        total = 0;
      for (var i = 0; i < approved.length; i++) {
        var result = await badgesForRequest(approved[i]);
        allHtml += result.html;
        total += result.count;
      }

      openPrintWindow(allHtml, total);
      window.showBadgeToast &&
        window.showBadgeToast(
          total +
            " gafete" +
            (total !== 1 ? "s" : "") +
            " generado" +
            (total !== 1 ? "s" : "") +
            ".",
          "success",
        );
    } catch (err) {
      console.error("[badges-patch]", err);
      window.showBadgeToast &&
        window.showBadgeToast(
          "Error al generar los gafetes: " + (err.message || err),
          "error",
        );
    } finally {
      setBtn(false);
    }
  }

  /* ────────────────────────────────────────────────────────────
     PARCHEAR congressModule.printBadges  (botón individual)
  ──────────────────────────────────────────────────────────── */
  function patchCongressPrint() {
    if (
      typeof window.congressModule === "undefined" ||
      typeof window.congressModule.printBadges !== "function"
    ) {
      setTimeout(patchCongressPrint, 300);
      return;
    }
    var orig = window.congressModule.printBadges;
    window.congressModule.printBadges = async function (requestId) {
      var requests = window.congressModule._getRequests
        ? window.congressModule._getRequests()
        : [];
      var r = requests.find(function (x) {
        return x.request_id === requestId;
      });
      if (!r) {
        orig(requestId);
        return;
      }

      try {
        var result = await badgesForRequest(r);
        openPrintWindow(result.html, result.count);
      } catch (e) {
        orig(requestId);
      }
    };
  }

  /* ────────────────────────────────────────────────────────────
     INIT
  ──────────────────────────────────────────────────────────── */
  function init() {
    window.generateBadgesPdf = generateBadgesPdfPatched;
    patchCongressPrint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
