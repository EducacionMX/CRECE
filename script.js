async function buscarConstancias() {
  const curp = document.getElementById("curp").value.trim();
  if (!curp) {
    alert("Por favor, ingresa un CURP válido.");
    return;
  }

  // === NUEVO SHEET ===
  const sheetId = "1dma2vRLu997qt7KbfTkj1iN0IDTuemGXfgcv-_DkIHs";

  // Escapar comillas por seguridad en la consulta
  const curpSafe = curp.replace(/'/g, "\\'");
  // CURP ahora está en la COLUMNA I
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tq=${encodeURIComponent(
    `select * where I contains '${curpSafe}'`
  )}`;

  // Índices 0-based según nuevas columnas:
  // B = 1  (Folio)
  // F = 5  (Nombre)
  // I = 8  (CURP – solo para filtro, no se muestra)
  // J = 9  (Curso/Diplomado)
  // N = 13 (URL constancia)
  const COL = {
    FOLIO: 1,
    NOMBRE: 5,
    CURSO: 9,
    URL: 13
  };

  try {
    const response = await fetch(url);
    const text = await response.text();

    // La respuesta de GViz viene envuelta; se extrae el JSON
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows || [];

    const table = document.getElementById("resultados");
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = ""; // limpiar resultados previos

    if (rows.length === 0) {
      alert("No se encontraron constancias para el CURP ingresado.");
      table.style.display = "none";
      return;
    }

    rows.forEach((row, index) => {
      if (!row.c) return;

      const c = row.c;
      const folio = c[COL.FOLIO]?.v ?? "N/A";
      const nombre = c[COL.NOMBRE]?.v ?? "N/A";
      const curso = c[COL.CURSO]?.v ?? "N/A";
      const urlConstancia = c[COL.URL]?.v ?? "#";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${folio}</td>
        <td>${nombre}</td>
        <td>${curso}</td>
        <td><a href="${urlConstancia}" target="_blank" rel="noopener">Ver Constancia</a></td>
      `;
      tbody.appendChild(tr);
    });

    table.style.display = "table";
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    alert("Hubo un error al buscar las constancias.");
  }
}
