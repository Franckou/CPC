// Configuración
let devices = [];
let lastSelected = null;

const TOLERANCIA_DIMENSIONAL = 0.9; // mm de diferencia permitida en alto y ancho
const TOLERANCIA_CURVATURA = 0.5;   // mm de diferencia permitida en curvatura
const ESCALA_VISUAL = 2;            // Escala fija para visualización

// Cargar datos desde JSON
async function loadPhones() {
  try {
    const res = await fetch("data/phones.json");
    if (!res.ok) throw new Error("No se pudo cargar el archivo");
    devices = await res.json();
    console.log("Datos cargados:", devices);
  } catch (err) {
    console.error("Error al cargar los datos:", err);
  }
}

// Comparar teléfonos similares
function comparePhones(selected) {
  lastSelected = selected;

  const canvas = document.getElementById("canvas");
  const list = document.getElementById("list");
  if (!canvas || !list) {
    console.error("Faltan elementos #canvas o #list en el DOM");
    return;
  }

  canvas.innerHTML = "";
  list.innerHTML = "";

  // Validar que el seleccionado tenga los 3 campos
  if (
    typeof selected.height_mm !== "number" ||
    typeof selected.width_mm !== "number" ||
    typeof selected.curvatura_mm !== "number"
  ) {
    canvas.innerHTML = "<p>Faltan datos para comparar este modelo.</p>";
    return;
  }

  // Filtrar por tolerancias y ordenar por distancia (similitud)
  const similares = devices
    .filter(
      (d) =>
        typeof d.height_mm === "number" &&
        typeof d.width_mm === "number" &&
        typeof d.curvatura_mm === "number" &&
        Math.abs(d.height_mm - selected.height_mm) <= TOLERANCIA_DIMENSIONAL &&
        Math.abs(d.width_mm - selected.width_mm) <= TOLERANCIA_DIMENSIONAL &&
        Math.abs(d.curvatura_mm - selected.curvatura_mm) <= TOLERANCIA_CURVATURA
    )
    .sort((a, b) => {
      const distA =
        Math.pow(a.height_mm - selected.height_mm, 2) +
        Math.pow(a.width_mm - selected.width_mm, 2) +
        Math.pow(a.curvatura_mm - selected.curvatura_mm, 2);
      const distB =
        Math.pow(b.height_mm - selected.height_mm, 2) +
        Math.pow(b.width_mm - selected.width_mm, 2) +
        Math.pow(b.curvatura_mm - selected.curvatura_mm, 2);
      return distA - distB;
    });

  // Poner primero el seleccionado y luego los similares (sin duplicarlo)
  const ordenados = [
    selected,
    ...similares.filter((d) => d.brand !== selected.brand || d.model !== selected.model),
  ];

  // Estilos del canvas (por si no están en CSS)
  canvas.style.display = "flex";
  canvas.style.alignItems = "flex-end";
  canvas.style.justifyContent = "flex-start";
  canvas.style.gap = "25px";
  canvas.style.maxHeight = "500px";
  canvas.style.padding = "10px 20px 30px 20px";
  canvas.style.overflowX = "auto";
  canvas.style.scrollSnapType = "x mandatory";
  canvas.style.position = "relative";
  canvas.style.boxSizing = "border-box";

  // Renderizar teléfonos
  ordenados.forEach((d) => {
    const phone = document.createElement("div");
    phone.className = "phone";
    phone.style.height = `${d.height_mm * ESCALA_VISUAL}px`;
    phone.style.width = `${d.width_mm * ESCALA_VISUAL}px`;
    phone.style.border = `2px solid ${d.model === selected.model ? "red" : "blue"}`;
    phone.style.borderRadius = `${d.curvatura_mm}px`;
    phone.style.flexShrink = "0";
    phone.style.display = "flex";
    phone.style.flexDirection = "column";
    phone.style.alignItems = "center";
    phone.style.justifyContent = "flex-end";
    phone.style.position = "relative";
    phone.style.boxSizing = "border-box";
    // Ojo: comillas correctas
    phone.style.margin = "30px 20px 35px 20px";

    const label = document.createElement("div");
    label.className = "phone-label";
    label.textContent = `${d.brand} ${d.model}`;
    label.style.fontSize = "14px";
    label.style.marginTop = "4px";
    label.style.textAlign = "center";

    phone.appendChild(label);
    canvas.appendChild(phone);

    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model}`;
    list.appendChild(li);
  });
}

// Buscador interactivo
const buscador = document.getElementById("buscador");
const sugerencias = document.getElementById("sugerencias");

function setupSearch() {
  if (!buscador || !sugerencias) {
    console.error("Faltan elementos #buscador o #sugerencias en el DOM");
    return;
  }

  buscador.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    sugerencias.innerHTML = "";

    const resultados = query
      ? devices.filter((d) => `${d.brand} ${d.model}`.toLowerCase().includes(query))
      : devices;

    resultados.forEach((d) => {
      const div = document.createElement("div");
      div.textContent = `${d.brand} ${d.model}`;
      div.onclick = () => {
        buscador.value = div.textContent;
        sugerencias.innerHTML = "";
        comparePhones(d);
      };
      sugerencias.appendChild(div);
    });
  });

  buscador.addEventListener("blur", () => {
    setTimeout(() => (sugerencias.innerHTML = ""), 200);
  });
}

// Inicializar
loadPhones().then(() => {
  setupSearch();
});