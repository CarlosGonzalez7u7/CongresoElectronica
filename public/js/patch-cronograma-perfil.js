/**
 * patch-cronograma-perfil.js
 *
 * Lógica para renderizar el cronograma del usuario en perfil.html
 * y generar el PDF correspondiente.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Esta función se llama desde perfil.js cuando los datos del perfil están listos
  window.initScheduleSection = async function (user, requests) {
    const programSection = document.getElementById("section-programa");
    if (!programSection) return;

    const loadingEl = document.getElementById("profileProgramLoading");
    const emptyEl = document.getElementById("profileProgramEmpty");
    const contentEl = document.getElementById("cronogramaContainer");
    const downloadBtn = document.getElementById("btnDownloadSchedulePdf");

    const isApproved = requests.some(
      (r) => r.status === "approved" || r.status === "paid",
    );

    if (!isApproved) {
      if (loadingEl) loadingEl.style.display = "none";
      if (emptyEl) emptyEl.style.display = "flex";
      if (contentEl) contentEl.style.display = "none";
      if (downloadBtn) downloadBtn.style.display = "none";
      return;
    }

    if (loadingEl) loadingEl.style.display = "flex";
    if (emptyEl) emptyEl.style.display = "none";

    try {
      const [
        workshopsRes,
        conferencesRes,
        enrolledWorkshopsRes,
        enrolledConferencesRes,
      ] = await Promise.all([
        fetch("/app/api/admin-workshops.php?action=list").then((r) => r.json()),
        fetch("/app/api/admin-workshops.php?action=list_conferences").then(
          (r) => r.json(),
        ),
        fetch(`/app/api/workshop-enroll.php?userId=${user.id}`).then((r) =>
          r.json(),
        ),
        fetch(`/app/api/conference-enroll.php?userId=${user.id}`).then((r) =>
          r.json(),
        ),
      ]);

      const allWorkshops = workshopsRes.data || [];
      const allConferences = conferencesRes.data || [];
      const enrolledWorkshopIds =
        enrolledWorkshopsRes.enrolled_workshop_ids || [];
      const enrolledConferenceIds =
        enrolledConferencesRes.enrolled_conference_ids || [];

      let schedule = [];

      enrolledWorkshopIds.forEach((id) => {
        const ws = allWorkshops.find((w) => w.id === id);
        if (ws) {
          schedule.push({
            type: "Taller",
            name: ws.name,
            date: ws.schedule_date,
            start: ws.schedule_start,
            end: ws.schedule_end,
            location: ws.location || "Por definir",
            speaker: ws.instructor_name || "Por definir",
            icon: "fa-chalkboard-user",
          });
        }
      });

      enrolledConferenceIds.forEach((id) => {
        const conf = allConferences.find((c) => c.id === id);
        if (conf) {
          schedule.push({
            type: "Conferencia",
            name: conf.name,
            date: conf.conference_date,
            start: conf.time_start,
            end: conf.time_end,
            location: conf.location || "Por definir",
            speaker: conf.speaker_name || "Por definir",
            icon: "fa-microphone-alt",
          });
        }
      });

      const hasRobotics = requests.some(
        (r) =>
          r.includes_robotics &&
          (r.status === "approved" || r.status === "paid"),
      );
      if (hasRobotics) {
        schedule.push({
          type: "Competencia",
          name: "Torneo de Robótica",
          date: "2026-10-23", // Hardcoded date, should be dynamic if possible
          start: "09:00:00",
          end: "17:00:00",
          location: "Área de competencia principal",
          speaker: "Todos los equipos",
          icon: "fa-robot",
        });
      }

      if (schedule.length === 0) {
        if (emptyEl) {
          emptyEl.style.display = "flex";
          emptyEl.innerHTML = `
            <i class="fas fa-calendar-plus"></i>
            <div>
                <strong>Aún no tienes actividades en tu agenda.</strong>
                <p>Ve al <a href="/usuario.html" style="color:var(--accent); font-weight:bold;">Panel Principal</a> para inscribirte a talleres y conferencias.</p>
            </div>`;
        }
        if (downloadBtn) downloadBtn.style.display = "none";
        return;
      }

      // Sort and group by date
      schedule.sort(
        (a, b) =>
          new Date(`${a.date}T${a.start}`) - new Date(`${b.date}T${b.start}`),
      );

      const groupedByDay = schedule.reduce((acc, item) => {
        const day = item.date;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
      }, {});

      let html = "";
      for (const day in groupedByDay) {
        const dateObj = new Date(day + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        html += `<h3 class="schedule-day-header">${dayName}</h3>`;
        html += '<div class="schedule-day-grid">';
        groupedByDay[day].forEach((item) => {
          html += `
            <div class="schedule-item-card">
              <div class="schedule-item-time">
                <i class="far fa-clock"></i>
                ${item.start.substring(0, 5)} - ${item.end.substring(0, 5)}
              </div>
              <div class="schedule-item-type" data-type="${item.type.toLowerCase()}">
                <i class="fas ${item.icon}"></i> ${item.type}
              </div>
              <h4 class="schedule-item-title">${item.name}</h4>
              <div class="schedule-item-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
                <span><i class="fas fa-user-tie"></i> ${item.speaker}</span>
              </div>
            </div>
          `;
        });
        html += "</div>";
      }

      if (contentEl) {
        contentEl.innerHTML = html;
        contentEl.style.display = "block";
      }
      if (downloadBtn) {
        downloadBtn.style.display = "inline-flex";
        downloadBtn.onclick = () => generateSchedulePdf(user, schedule);
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      if (emptyEl) {
        emptyEl.style.display = "flex";
        emptyEl.innerHTML =
          "Ocurrió un error al cargar tu cronograma. Intenta de nuevo más tarde.";
      }
    } finally {
      if (loadingEl) loadingEl.style.display = "none";
    }
  };

  async function generateSchedulePdf(user, schedule) {
    if (
      typeof window.jspdf === "undefined" ||
      typeof window.jspdf.jsPDF === "undefined"
    ) {
      if (typeof showToast === "function") {
        showToast(
          "No se pudo generar el PDF. Un bloqueador de anuncios podría estar impidiendo la carga de la librería necesaria. Por favor, desactívalo para este sitio y vuelve a intentarlo.",
          "error",
        );
      } else {
        alert(
          "No se pudo generar el PDF. Un bloqueador de anuncios podría estar impidiendo la carga de la librería necesaria. Por favor, desactívalo para este sitio y vuelve a intentarlo.",
        );
      }
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Mi Cronograma - RENOVATEC 2026", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(user.full_name || "Participante", 105, 30, { align: "center" });

    let y = 45;

    const groupedByDay = schedule.reduce((acc, item) => {
      const day = item.date;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});

    for (const day in groupedByDay) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const dateObj = new Date(day + "T00:00:00");
      const dayName = dateObj.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(dayName, 14, y);
      y += 8;

      doc.setDrawColor(200);
      doc.line(14, y - 2, 196, y - 2);

      groupedByDay[day].forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(
          `${item.start.substring(0, 5)} - ${item.end.substring(0, 5)}`,
          14,
          y,
        );
        doc.setFont("helvetica", "bold");
        doc.text(`[${item.type}] ${item.name}`, 50, y);

        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Lugar: ${item.location}`, 50, y);
        y += 5;
        doc.text(`Ponente: ${item.speaker}`, 50, y);
        doc.setTextColor(0);
        y += 8;
      });
      y += 5;
    }

    doc.save(`cronograma-renovatec-${user.id}.pdf`);
  }

  // Check for URL param to switch tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("section") === "programa") {
    const tabButton = document.querySelector(
      '.nav-tab[data-section="programa"]',
    );
    if (tabButton) {
      // Defer to allow perfil.js to set up its own tab switching
      setTimeout(() => tabButton.click(), 100);
    }
  }
});
