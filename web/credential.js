(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const names = JSON.parse($("ccpc-data").textContent).states;
  const state = $("credential-state");
  const layout = document.querySelector(".credential-layout");
  state.append(new Option("Elige un estado", ""));
  for (const [code, name] of Object.entries(names)) state.append(new Option(name, code));
  for (const tab of document.querySelectorAll("[data-credential-tab]")) tab.addEventListener("click", () => {
    layout.dataset.view = tab.dataset.credentialTab;
    for (const item of document.querySelectorAll("[data-credential-tab]")) item.setAttribute("aria-pressed", String(item === tab));
  });
  const photo = $("credential-photo-preview");
  const status = $("credential-status");

  function birthday() {
    const value = $("credential-birth").value;
    return value ? new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—";
  }

  function update() {
    $("credential-name-preview").textContent = $("credential-name").value.trim() || "Tu nombre";
    $("credential-birth-preview").textContent = birthday();
    $("credential-state-preview").textContent = state.selectedOptions[0]?.value ? state.selectedOptions[0].textContent : "—";
    $("credential-curp-preview").textContent = $("credential-curp").value.trim().toUpperCase() || "—";
  }

  $("credential-form").addEventListener("input", update);
  $("credential-form").addEventListener("change", update);
  $("credential-curp").addEventListener("input", event => {
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    update();
  });
  $("credential-photo").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000) {
      event.target.value = "";
      status.textContent = "Elige una imagen PNG, JPG o WebP de hasta 5 MB.";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      photo.src = String(reader.result);
      photo.hidden = false;
      $("credential-photo-placeholder").hidden = true;
      status.textContent = "Fotografía añadida al ejemplo.";
    };
    reader.readAsDataURL(file);
  });
  $("credential-form").addEventListener("reset", () => {
    requestAnimationFrame(() => {
      photo.removeAttribute("src");
      photo.hidden = true;
      $("credential-photo-placeholder").hidden = false;
      status.textContent = "Datos borrados.";
      update();
    });
  });

  function fit(ctx, value, width, size) {
    let fontSize = size;
    do {
      ctx.font = `700 ${fontSize}px Jakarta, sans-serif`;
      fontSize -= 2;
    } while (ctx.measureText(value).width > width && fontSize > 18);
    return value;
  }

  $("credential-download").addEventListener("click", async () => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 750;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fbf4f7";
    ctx.fillRect(0, 0, 1200, 750);
    ctx.fillStyle = "#61236f";
    ctx.fillRect(0, 0, 1200, 165);
    ctx.fillStyle = "#fff8e9";
    ctx.font = "700 28px Jakarta, sans-serif";
    ctx.fillText("CAMARADAS DE LA NACIÓN", 54, 60);
    ctx.font = "800 48px Jakarta, sans-serif";
    ctx.fillText("CREDENCIAL CÍVICA", 54, 125);
    ctx.fillStyle = "#e9d7e4";
    ctx.fillRect(54, 205, 300, 370);
    if (photo.complete && photo.naturalWidth) {
      const scale = Math.max(300 / photo.naturalWidth, 370 / photo.naturalHeight);
      const width = photo.naturalWidth * scale;
      const height = photo.naturalHeight * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(54, 205, 300, 370);
      ctx.clip();
      ctx.drawImage(photo, 54 + (300 - width) / 2, 205 + (370 - height) / 2, width, height);
      ctx.restore();
    } else {
      ctx.fillStyle = "#9b6b99";
      ctx.font = "700 125px Jakarta, sans-serif";
      ctx.fillText("◇", 155, 425);
    }
    const lines = [
      ["NOMBRE", $("credential-name-preview").textContent],
      ["NACIMIENTO", $("credential-birth-preview").textContent],
      ["ENTIDAD DE NACIMIENTO", $("credential-state-preview").textContent],
      ["CURP", $("credential-curp-preview").textContent]
    ];
    lines.forEach(([label, value], index) => {
      const y = 245 + index * 92;
      ctx.fillStyle = "#725473";
      ctx.font = "700 20px JetBrains, monospace";
      ctx.fillText(label, 405, y);
      ctx.fillStyle = "#293c43";
      ctx.fillText(fit(ctx, value, 735, 32), 405, y + 38);
    });
    ctx.fillStyle = "#a52c78";
    ctx.fillRect(0, 645, 1200, 105);
    ctx.fillStyle = "#fff8e9";
    ctx.font = "700 27px JetBrains, monospace";
    ctx.fillText("MUESTRA EDUCATIVA · NO ES IDENTIFICACIÓN OFICIAL", 54, 710);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "mi-credencial-civica-ejemplo.png";
    link.click();
    status.textContent = "Imagen descargada en tu dispositivo.";
    CivicAchievements.award("credential_download");
  });
})();
