let devices = [];
const SCALE = 2; // Escala para los teléfonos
const GAP = 100; // Separación horizontal entre teléfonos
const BASE_PHONE_HEIGHT = 400; // Altura deseada para el seleccionado
const TOLERANCIA_MM = 1; // Ajustar tolerancia para mayor congruencia
const TOLERANCIA_CURVA = 0; // Tolerancia específica para la curvatura de bordes

async function loadData() {
  try {
    const res = await fetch("data/phones.json");
    if (!res.ok) {
      throw new Error(`Error al cargar datos: ${res.status} ${res.statusText}`);
    }
    devices = await res.json();
    console.log("Datos cargados correctamente:", devices);
  } catch (error) {
    console.error("Error al cargar el archivo phones.json:", error);
  }
}

// función principal para renderizar la comparación
function renderComparison(selected) {
  const canvas = document.getElementById("canvas");
  const list = document.getElementById("list");
  canvas.innerHTML = "";
  list.innerHTML = "";

  console.log("Teléfono seleccionado:", selected);

  // Validar que el teléfono seleccionado tenga datos completos
  if (
    !selected.height_mm ||
    !selected.width_mm ||
    !selected.aspect_ratio ||
    !selected.screen_inches
  ) {
    canvas.innerHTML =
      "<p>Error: El teléfono seleccionado no tiene datos completos.</p>";
    return;
  }

  // Filtrar modelos similares con tolerancia ajustada
  const similars = devices.filter(
    (d) =>
      d.height_mm &&
      d.width_mm &&
      Math.abs(d.height_mm - selected.height_mm) <= TOLERANCIA_MM &&
      Math.abs(d.width_mm - selected.width_mm) <= TOLERANCIA_MM &&
      d.aspect_ratio === selected.aspect_ratio &&
      Math.abs(d.screen_inches - selected.screen_inches) <= 0.1 &&
      Math.abs(d.curvatura_mm - selected.curvatura_mm) <= TOLERANCIA_CURVA
  );

  console.log("Teléfonos similares encontrados:", similars);

  if (similars.length === 0) {
    canvas.innerHTML = "<p>No se encontraron teléfonos similares.</p>";
    return;
  }

  // Reorganizar para que el teléfono seleccionado aparezca primero
  const orderedSimilars = [
    selected,
    ...similars.filter((d) => d.model !== selected.model),
  ];

  // Calcular escala para los teléfonos
  const scaleBase = BASE_PHONE_HEIGHT / selected.height_mm;

  // Ajustar el canvas para permitir desplazamiento horizontal
  canvas.style.overflowX = "auto";
  canvas.style.whiteSpace = "nowrap";
  canvas.style.paddingTop = "40px"; // Margen superior para separar los teléfonos del borde

  // Renderizar teléfonos similares en el canvas
  orderedSimilars.forEach((d, i) => {
    const phone = document.createElement("div");
    phone.className = "phone";
    phone.style.height = `${d.height_mm * scaleBase}px`;
    phone.style.width = `${d.width_mm * scaleBase}px`;
    phone.style.border = `${d.curvatura_mm}px solid ${
      d.model === selected.model ? "red" : "blue"
    }`; // Resaltar seleccionado
    phone.style.position = "relative";
    phone.style.display = "inline-block"; // Para alinearlos horizontalmente
    phone.style.marginLeft = `${i === 0 ? 40 : GAP}px`; // Espaciado inicial y entre teléfonos
    phone.style.marginBottom = "20px"; // Margen inferior

    // Nombre del teléfono con tamaño ajustado
    const label = document.createElement("div");
    label.className = "phone-label";
    label.style.fontSize = "14px"; // Ajustar tamaño de fuente
    label.textContent = `${d.brand} ${d.model}`;
    phone.appendChild(label);

    canvas.appendChild(phone);
  });

  // Renderizar lista lateral de modelos
  orderedSimilars.forEach((d) => {
    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model}`;
    li.onmouseenter = () => {
      const phones = canvas.querySelectorAll(".phone");
      phones.forEach((phone) => {
        if (phone.textContent.includes(`${d.brand} ${d.model}`)) {
          phone.style.opacity = 1;
        }
      });
    };
    li.onmouseleave = () => {
      const phones = canvas.querySelectorAll(".phone");
      phones.forEach((phone) => {
        phone.style.opacity = 0.6;
      });
    };
    list.appendChild(li);
  });
}

// Buscador
const buscador = document.getElementById("buscador");
const sugerencias = document.getElementById("sugerencias");

buscador.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  sugerencias.innerHTML = "";
  if (!query) return;

  const results = devices.filter((d) =>
    `${d.brand} ${d.model}`.toLowerCase().includes(query)
  );

  results.forEach((d) => {
    const div = document.createElement("div");
    div.textContent = `${d.brand} ${d.model}`;
    div.onclick = () => {
      console.log("Objeto seleccionado:", d); // Depuración
      buscador.value = `${d.brand} ${d.model}`;
      sugerencias.innerHTML = "";
      renderComparison(d);
    };
    sugerencias.appendChild(div);
  });
});

// Ocultar sugerencias al perder foco
buscador.addEventListener("blur", () => {
  setTimeout(() => (sugerencias.innerHTML = ""), 200);
});

loadData();
