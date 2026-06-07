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

  function makeQrDataUrl(text) {
    return new Promise(function (resolve) {
      if (!text) {
        resolve(null);
        return;
      }

      // ── Intento 1: API estática (Node build cargado en browser vía CDN)
      if (
        typeof window.QRCode !== "undefined" &&
        typeof window.QRCode.toDataURL === "function"
      ) {
        window.QRCode.toDataURL(
          String(text),
          {
            errorCorrectionLevel: "H",
            margin: 1,
            width: 200,
            color: { dark: "#0c1b33", light: "#ffffff" },
          },
          function (err, url) {
            if (!err && url) {
              resolve(url);
              return;
            }
            resolve(_qrViaGenerator(text, resolve));
          },
        );
        return;
      }

      // ── Intento 2: qrcode-generator (lib alternativa expuesta como qrcode)
      _qrViaGenerator(text, resolve);
    });
  }

  /** Genera QR con qrcode-generator (window.qrcode) → canvas → dataURL */
  function _qrViaGenerator(text, resolve) {
    try {
      if (typeof window.qrcode === "function") {
        // qrcode-generator API
        var qr = window.qrcode(0, "H");
        qr.addData(String(text));
        qr.make();
        var moduleCount = qr.getModuleCount();
        var cellSize = Math.max(2, Math.floor(200 / moduleCount));
        var canvas = document.createElement("canvas");
        var size = cellSize * moduleCount;
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#0c1b33";
        for (var row = 0; row < moduleCount; row++) {
          for (var col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
          }
        }
        resolve(canvas.toDataURL("image/png"));
        return;
      }
    } catch (e) {}

    // ── Intento 3: QRCode constructor (otra variante browser)
    try {
      if (typeof window.QRCode === "function") {
        var div = document.createElement("div");
        div.style.cssText = "position:absolute;left:-9999px;visibility:hidden;";
        document.body.appendChild(div);
        new window.QRCode(div, {
          text: String(text),
          width: 200,
          height: 200,
          colorDark: "#0c1b33",
          colorLight: "#ffffff",
          correctLevel: (window.QRCode.CorrectLevel || {}).H || 1,
        });
        setTimeout(function () {
          try {
            var img = div.querySelector("img");
            var cv = div.querySelector("canvas");
            if (cv) {
              resolve(cv.toDataURL("image/png"));
            } else if (img && img.src) {
              resolve(img.src);
            } else {
              resolve(null);
            }
          } catch (_) {
            resolve(null);
          }
          if (div.parentNode) div.parentNode.removeChild(div);
        }, 120);
        return;
      }
    } catch (e) {}

    resolve(null); // Ningún método disponible
  }

  /** HTML del bloque QR (con fallback visual si no hay data URL) */
  function qrBlock(dataUrl, folio) {
    if (dataUrl) {
      return `<div style="text-align:center;margin:10px auto;">
        <div style="display:inline-block;padding:6px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;">
          <img src="${dataUrl}" alt="QR ${esc(folio)}"
               style="width:120px;height:120px;display:block;">
        </div>
      </div>`;
    }
    // Fallback: rectángulo gris con texto
    return `<div style="text-align:center;margin:10px auto;">
      <div style="display:inline-flex;align-items:center;justify-content:center;
        width:120px;height:120px;background:#f1f5f9;border:1.5px solid #e2e8f0;
        border-radius:10px;font-size:11px;color:#94a3b8;text-align:center;
        padding:8px;box-sizing:border-box;">
        QR no disponible<br><small style="font-size:9px;">${esc(folio)}</small>
      </div>
    </div>`;
  }

  /* ──────────────────────────────────────────────────────────────
     CSS DEL GAFETE (inyectado en la ventana de impresión)
  ────────────────────────────────────────────────────────────── */
  var BADGE_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f0f4f8;
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
      font-size: 9.5px;
      color: #00c6f8;
      letter-spacing: .6px;
      margin-top: 2px;
    }
    .badge-body {
      padding: 14px 14px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .badge-name {
      font-size: 17px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0c1b33;
      text-align: center;
      line-height: 1.15;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .badge-role {
      font-size: 10.5px;
      font-weight: 800;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: .7px;
      text-align: center;
      margin-bottom: 3px;
    }
    .badge-school {
      font-size: 9.5px;
      color: #475569;
      font-weight: 600;
      text-align: center;
      margin-bottom: 6px;
      word-break: break-word;
    }
    .badge-accesos {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px 10px;
      margin: 6px 0 4px;
      font-size: 9.5px;
      color: #334155;
    }
    .badge-accesos-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #0284c7;
      font-weight: 800;
      text-align: center;
      margin-bottom: 5px;
    }
    .badge-convo-item {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 4px;
    }
    .badge-convo-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #0284c7;
      flex-shrink: 0;
      margin-top: 3px;
    }
    .badge-convo-text { line-height: 1.4; }
    .badge-convo-name { font-weight: 700; color: #0f172a; }
    .badge-convo-mods { font-size: 8.5px; color: #64748b; margin-top: 1px; }
    .badge-convo-sub  { font-size: 8.5px; color: #475569; font-style: italic; }
    .badge-captain-ref {
      font-size: 9px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 5px;
      margin-top: 5px;
      width: 100%;
    }
    .badge-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      padding: 5px 10px;
      font-size: 8.5px;
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

  /* ──────────────────────────────────────────────────────────────
     CONSTRUCCIÓN DE UN GAFETE HTML
  ────────────────────────────────────────────────────────────── */
  function buildBadgeHtml(opts) {
    var name = opts.name || "Participante";
    var role = opts.role || "Participante";
    var school = opts.school || "";
    var folio = opts.folio || "";
    var qrDataUrl = opts.qrDataUrl || null;
    var convos = opts.convos || [];
    var captainRef = opts.captainRef || null;

    var convosHtml = "";
    if (convos.length) {
      convosHtml = convos
        .map(function (c) {
          var modsLine = "";
          if (c.mods && c.mods.length) {
            modsLine = `<div class="badge-convo-mods">Incluye: ${c.mods.map(esc).join(" · ")}</div>`;
          }
          // Sub-items: taller o conferencia específica
          var subLine = "";
          if (c.workshopName) {
            subLine += `<div class="badge-convo-sub">🎓 Taller: ${esc(c.workshopName)}</div>`;
          }
          if (c.conferenceName) {
            subLine += `<div class="badge-convo-sub">🎤 Conferencia: ${esc(c.conferenceName)}</div>`;
          }
          return `<div class="badge-convo-item">
          <span class="badge-convo-dot"></span>
          <div class="badge-convo-text">
            <div class="badge-convo-name">${esc(c.title)}</div>
            ${modsLine}${subLine}
          </div>
        </div>`;
        })
        .join("");
    } else {
      convosHtml = `<div style="color:#94a3b8;font-style:italic;font-size:9px;text-align:center;">
        Sin convocatorias asignadas</div>`;
    }

    var captainLine = captainRef
      ? `<div class="badge-captain-ref">👤 ${esc(captainRef)}</div>`
      : "";

    return `<div class="badge">
      <div class="badge-header">
        <div class="badge-header-title">RENOVATEC 2026</div>
        <div class="badge-header-sub">CONGRESO INTERNACIONAL DE ELECTRÓNICA</div>
      </div>
      <div class="badge-body">
        <div class="badge-name">${esc(name)}</div>
        <div class="badge-role">${esc(role)}</div>
        <div class="badge-school">${esc(school)}</div>
        ${qrBlock(qrDataUrl, folio)}
        <div class="badge-accesos">
          <div class="badge-accesos-title">Accesos Autorizados</div>
          ${convosHtml}
        </div>
        ${captainLine}
      </div>
      <div class="badge-footer">FOLIO: ${esc(folio)} &nbsp;·&nbsp; Pase Personal e Intransferible</div>
    </div>`;
  }

  /* ──────────────────────────────────────────────────────────────
     CACHÉ DE CONVOCATORIAS
  ────────────────────────────────────────────────────────────── */
  var _convosCache = null;

  function fetchConvos() {
    if (_convosCache) return Promise.resolve(_convosCache);
    return fetch("/app/api/public-landing.php", { credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        if (json.success && json.data && json.data.convocatorias) {
          _convosCache = json.data.convocatorias;
        } else {
          _convosCache = [];
        }
        return _convosCache;
      })
      .catch(function () {
        _convosCache = [];
        return [];
      });
  }

  /**
   * Resuelve las convocatorias de una solicitud aprobada.
   * También extrae taller/conferencia específicos del request.
   * Devuelve Array<{title, mods[], workshopName?, conferenceName?}>
   */
  async function resolveConvos(request) {
    var convosDB = await fetchConvos();
    var result = [];

    // IDs de convocatorias seleccionadas
    var selectedIds = [];
    try {
      if (request.selected_convocatorias_json) {
        var parsed = JSON.parse(request.selected_convocatorias_json);
        if (Array.isArray(parsed)) selectedIds = parsed.map(Number);
      }
    } catch (_) {}

    if (selectedIds.length > 0) {
      selectedIds.forEach(function (cId) {
        var dbConv = convosDB.find(function (c) {
          return Number(c.id) === cId;
        });
        if (!dbConv) return;

        var mods = [];
        var workshopName = null;
        var conferenceName = null;

        try {
          var m = JSON.parse(dbConv.included_modules || "{}");
          if (m.congress) mods.push("Congreso");
          if (m.workshops) mods.push("Talleres");
          if (m.conferences) mods.push("Conferencias");
          if (m.robotics) mods.push("Robótica");
          if (m.camp) mods.push("Campamento");
          if (m.custom && Array.isArray(m.custom)) {
            m.custom.forEach(function (cm) {
              mods.push(cm.label || cm.name || "Extra");
            });
          }

          // Si la convocatoria incluye talleres y el request tiene workshop asignado
          if (m.workshops && request.workshop_name) {
            workshopName = request.workshop_name;
          }
          // Si la convocatoria incluye conferencias y el request tiene conference asignado
          if (m.conferences && request.conference_name) {
            conferenceName = request.conference_name;
          }
        } catch (_) {}

        result.push({
          title: dbConv.titulo || "Convocatoria #" + cId,
          mods: mods,
          workshopName: workshopName,
          conferenceName: conferenceName,
        });
      });
    }

    // Fallback: flags booleanos si no hay IDs
    if (result.length === 0) {
      if (request.includes_congress) {
        var mods = [];
        if (request.workshop_name) mods.push("Talleres");
        if (request.conference_name) mods.push("Conferencias");
        result.push({
          title: "Congreso Internacional de Electrónica",
          mods: mods,
          workshopName: request.workshop_name || null,
          conferenceName: request.conference_name || null,
        });
      }
      if (request.includes_robotics) {
        result.push({
          title: "Torneo de Robótica",
          mods: [],
          workshopName: null,
          conferenceName: null,
        });
      }
      if (request.includes_camp) {
        result.push({
          title: "Campamento RENOVATEC",
          mods: [],
          workshopName: null,
          conferenceName: null,
        });
      }
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────
     FUNCIÓN PRINCIPAL — reemplaza window.generateBadgesPdf
  ────────────────────────────────────────────────────────────── */
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
      if (!data.success)
        throw new Error("Error al obtener solicitudes aprobadas");

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

      var badgesHtml = "";
      var totalBadges = 0;

      for (var i = 0; i < approved.length; i++) {
        var request = approved[i];
        var convos = await resolveConvos(request);
        var hasRobotics = !!(
          request.includes_robotics ||
          convos.some(function (c) {
            return (
              c.title.toLowerCase().includes("robótica") ||
              c.title.toLowerCase().includes("robotica")
            );
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

        var qrTitular = await makeQrDataUrl(folio);

        badgesHtml += buildBadgeHtml({
          name: name,
          role: role,
          school: school,
          folio: folio,
          qrDataUrl: qrTitular,
          convos: convos,
          captainRef: null,
        });
        totalBadges++;

        // Gafetes de integrantes (solo si tiene robótica)
        if (
          hasRobotics &&
          Array.isArray(request.members) &&
          request.members.length
        ) {
          var members = request.members.filter(function (m) {
            return !m.is_captain && (m.member_name || m.name);
          });
          for (var j = 0; j < members.length; j++) {
            var m = members[j];
            var mName = m.member_name || m.name || "Integrante";
            var qrMem = await makeQrDataUrl(folio);
            badgesHtml += buildBadgeHtml({
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
            totalBadges++;
          }
        }
      }

      /* Abrir ventana de impresión */
      var printWin = window.open("", "_blank");
      if (!printWin) {
        window.showBadgeToast &&
          window.showBadgeToast(
            "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.",
            "error",
          );
        setBtn(false);
        return;
      }

      printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Gafetes RENOVATEC 2026</title>
  <style>${BADGE_CSS}</style>
</head>
<body>
  <p style="text-align:center;font-family:Helvetica,Arial,sans-serif;
     font-size:.9rem;color:#334155;margin-bottom:20px;font-weight:700;">
    RENOVATEC 2026 — ${totalBadges} gafete${totalBadges !== 1 ? "s" : ""}
  </p>
  <div class="badges-grid">${badgesHtml}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},1500);}<\/script>
</body>
</html>`);
      printWin.document.close();

      window.showBadgeToast &&
        window.showBadgeToast(
          totalBadges +
            " gafete" +
            (totalBadges !== 1 ? "s" : "") +
            " generado" +
            (totalBadges !== 1 ? "s" : "") +
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

  /* ──────────────────────────────────────────────────────────────
     También parchamos congressModule.printBadges (botón individual)
  ────────────────────────────────────────────────────────────── */
  function patchCongressModulePrintBadges() {
    if (
      typeof window.congressModule === "undefined" ||
      typeof window.congressModule.printBadges !== "function"
    ) {
      setTimeout(patchCongressModulePrintBadges, 300);
      return;
    }

    var origPrint = window.congressModule.printBadges;
    window.congressModule.printBadges = async function (requestId) {
      var requests = window.congressModule._getRequests
        ? window.congressModule._getRequests()
        : [];
      var r = requests.find(function (x) {
        return x.request_id === requestId;
      });
      if (!r) {
        origPrint(requestId);
        return;
      }

      var convos = await resolveConvos(r);
      var hasRobotics = !!(
        r.includes_robotics ||
        convos.some(function (c) {
          return (
            c.title.toLowerCase().includes("robótica") ||
            c.title.toLowerCase().includes("robotica")
          );
        })
      );

      var folio = r.request_folio || r.team_folio || "";
      var name = r.full_name || r.email || "Participante";
      var school = r.school || "Sin institución";
      var role = hasRobotics
        ? "Capitán — Torneo de Robótica"
        : r.includes_congress
          ? "Participante — Congreso"
          : "Participante";

      var qrTitular = await makeQrDataUrl(folio);
      var badgesHtml = buildBadgeHtml({
        name: name,
        role: role,
        school: school,
        folio: folio,
        qrDataUrl: qrTitular,
        convos: convos,
        captainRef: null,
      });

      if (hasRobotics && Array.isArray(r.members) && r.members.length) {
        var members = r.members.filter(function (m) {
          return !m.is_captain && (m.member_name || m.name);
        });
        for (var i = 0; i < members.length; i++) {
          var m = members[i];
          var mName = m.member_name || m.name || "Integrante";
          var qrM = await makeQrDataUrl(folio);
          badgesHtml += buildBadgeHtml({
            name: mName,
            role: "Integrante del Torneo de Robótica",
            school: school,
            folio: folio,
            qrDataUrl: qrM,
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
        }
      }

      var printWin = window.open("", "_blank");
      if (!printWin) {
        origPrint(requestId);
        return;
      }

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

  function init() {
    window.generateBadgesPdf = generateBadgesPdfPatched;
    patchCongressModulePrintBadges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})();
