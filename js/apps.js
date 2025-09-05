// Configuracion
let devices = [];
let lastSelected = null;

const TOLERANCIA_DIMENSIONAL = 0.5; // mm de diferencia permitida en alto y ancho
// refiriendose a curvatura como el radio de curvatura de las esquinas, no como el "Edge"
const TOLERANCIA_CURVATURA = 0.5;   // mm de diferencia permitida en curvatura
const ESCALA_VISUAL = 2; // Escala fija para visualizacion

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

// Comparar telefonos similares
function comparePhones(selected) {
  lastSelected = selected;

  const canvas = document.getElementById("canvas");
  const list = document.getElementById("list");
  canvas.innerHTML = "";
  list.innerHTML = "";

  if (!selected.height_mm || !selected.width_mm || selected.curvatura_mm === undefined) {
    canvas.innerHTML = "<p>Faltan datos para comparar este modelo.</p>";
    return;
  }

  const similares = devices.filter((d) =>
    d.height_mm &&
    d.width_mm &&
    d.curvatura_mm !== undefined &&
    Math.abs(d.height_mm - selected.height_mm) <= TOLERANCIA_DIMENSIONAL &&
    Math.abs(d.width_mm - selected.width_mm) <= TOLERANCIA_DIMENSIONAL &&
    Math.abs(d.curvatura_mm - selected.curvatura_mm) <= TOLERANCIA_CURVATURA
  );

  const ordenados = [selected, ...similares.filter((d) => d.model !== selected.model)];

  // Configurar canvas
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

  // Renderizar telefonos
  ordenados.forEach((d, i) => {
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
    phone.style.margin = "30px 20px 35px 20px";

    // Nombre del modelo
    const label = document.createElement("div");
    label.className = "phone-label";
    label.textContent = `${d.brand} ${d.model}`;
    label.style.fontSize = "14px";
    label.style.marginTop = "4px";
    label.style.textAlign = "center";

    phone.appendChild(label);
    canvas.appendChild(phone);

    // Lista lateral
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
  buscador.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    sugerencias.innerHTML = "";

    if (!query) {
    // Mostrar todos los dispositivos si no hay texto
    const resultados = devices;
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
    return;
}


    const resultados = devices.filter((d) =>
      `${d.brand} ${d.model}`.toLowerCase().includes(query)
    );

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