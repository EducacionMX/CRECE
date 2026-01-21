async function buscarConstancias() {
  const input = document.getElementById("curp");
  const curp = input.value.trim().toUpperCase();

  if (!curp) {
    alert("Por favor, ingresa tu CURP.");
    input.focus();
    return;
  }

  // Validación básica de CURP (longitud y formato general)
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
  if (!curpRegex.test(curp)) {
    alert("El CURP ingresado no tiene un formato válido.");
    input.focus();
    return;
  }

  // === SHEET CRECE (nuevo) ===
  const sheetId = "1ToHqHBcKRMVL7t6Ud2gdiqC9PX6OVDKGnp7fLoE5pjw";

  const curpSafe = curp.replace(/'/g, "\\'");
  const query = `select * where I contains '${curpSafe}'`;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tq=${encodeURIComponent(query)}`;

  // Índices de columnas (0-based)
  const COL = {
    FOLIO: 1,   // B
    NOMBRE: 5,  // F
    CURSO: 9,   // J
    URL: 13     // N
  };

  const table = document.getElementById("resultados");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  table.style.display = "none";

  try {
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows || [];

    if (rows.length === 0) {
      alert("No se encontraron constancias asociadas al CURP ingresado.");
      return;
    }

    rows.forEach(row => {
      if (!row.c) return;

      const c = row.c;
      const folio = c[COL.FOLIO]?.v ?? "N/D";
      const nombre = c[COL.NOMBRE]?.v ?? "N/D";
      const curso = c[COL.CURSO]?.v ?? "N/D";
      const urlConstancia = c[COL.URL]?.v ?? null;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${nombre}</td>
        <td>${curso}</td>
        <td>${folio}</td>
      `;

      if (urlConstancia) {
        const td = document.createElement("td");
        td.innerHTML = `<a href="${urlConstancia}" target="_blank" rel="noopener">Ver constancia</a>`;
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    table.style.display = "table";

  } catch (error) {
    console.error("Error al consultar constancias:", error);
    alert("Ocurrió un error al consultar la información. Intenta más tarde.");
  }
}
