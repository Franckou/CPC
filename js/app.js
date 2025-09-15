// Configuración
let devices = [];
let lastSelected = null;

const TOLERANCIA_DIMENSIONAL = 1.0; // mm de diferencia permitida en alto y ancho
const TOLERANCIA_CURVATURA = 0.5; // mm de diferencia permitida en curvatura
const ESCALA_VISUAL = 2.5; // Escala fija para visualización

// Variable para activar/desactivar debug
const DEBUG_MODE = true; // Cambiar a false cuando no necesites el debug

window.onload = function () {
  const aviso = document.createElement("div");
  aviso.textContent = "REALIZANDO CAMBIOS: Estamos realizando cambios y corrigiendo errores. La página estará inhabilitada hasta el 16/09.";
  aviso.style.position = "fixed";
  aviso.style.top = "0";
  aviso.style.left = "0";
  aviso.style.width = "100%";
  aviso.style.padding = "15px";
  aviso.style.backgroundColor = "#ff4444";
  aviso.style.color = "#fff";
  aviso.style.fontFamily = "Arial, sans-serif";
  aviso.style.fontSize = "16px";
  aviso.style.textAlign = "center";
  aviso.style.zIndex = "9999";

  document.body.appendChild(aviso);
};

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

// Función de debug para diagnosticar problemas de filtrado
function debugFilter(selected, devices) {
  if (!DEBUG_MODE) return;

  console.log("=== DEBUG COMPARACIÓN ===");
  console.log("Teléfono seleccionado:", `${selected.brand} ${selected.model}`);
  console.log(
    `Dimensiones: ${selected.height_mm}mm x ${selected.width_mm}mm x ${selected.curvatura_mm}mm`
  );
  console.log("Tolerancias:", {
    dimensional: TOLERANCIA_DIMENSIONAL,
    curvatura: TOLERANCIA_CURVATURA,
  });

  let compatiblesCount = 0;

  devices.forEach((d) => {
    // Saltar el teléfono seleccionado
    if (d.brand === selected.brand && d.model === selected.model) return;

    // Validar que tenga datos numéricos válidos
    const tieneAlturaValida =
      typeof d.height_mm === "number" && !isNaN(d.height_mm);
    const tieneAnchoValido =
      typeof d.width_mm === "number" && !isNaN(d.width_mm);
    const tieneCurvaturaValida =
      typeof d.curvatura_mm === "number" && !isNaN(d.curvatura_mm);

    if (!tieneAlturaValida || !tieneAnchoValido || !tieneCurvaturaValida) {
      console.log(`❌ ${d.brand} ${d.model} - Datos inválidos:`, {
        altura: d.height_mm,
        ancho: d.width_mm,
        curvatura: d.curvatura_mm,
      });
      return;
    }

    const altoDiff = Math.abs(d.height_mm - selected.height_mm);
    const anchoDiff = Math.abs(d.width_mm - selected.width_mm);
    const curvaturaDiff = Math.abs(d.curvatura_mm - selected.curvatura_mm);

    const pasaFiltroAlto = altoDiff <= TOLERANCIA_DIMENSIONAL;
    const pasaFiltroAncho = anchoDiff <= TOLERANCIA_DIMENSIONAL;
    const pasaFiltroCurvatura = curvaturaDiff <= TOLERANCIA_CURVATURA;
    const pasaFiltroCompleto =
      pasaFiltroAlto && pasaFiltroAncho && pasaFiltroCurvatura;

    if (pasaFiltroCompleto) {
      compatiblesCount++;
      console.log(`✅ ${d.brand} ${d.model} - COMPATIBLE`);
    } else {
      console.log(`❌ ${d.brand} ${d.model} - NO compatible:`);
    }

    console.log(
      `   Dimensiones: ${d.height_mm}mm x ${d.width_mm}mm x ${d.curvatura_mm}mm`
    );
    console.log(
      `   Diferencias: Alto=${altoDiff.toFixed(2)}mm ${
        pasaFiltroAlto ? "✅" : "❌"
      }, Ancho=${anchoDiff.toFixed(2)}mm ${
        pasaFiltroAncho ? "✅" : "❌"
      }, Curvatura=${curvaturaDiff.toFixed(2)}mm ${
        pasaFiltroCurvatura ? "✅" : "❌"
      }`
    );
    console.log("   ---");
  });

  console.log(`Total compatibles encontrados: ${compatiblesCount}`);
  console.log("==================");
}

// Comparar teléfonos similares (versión mejorada)
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

  // Validar que el teléfono seleccionado tenga datos válidos
  if (
    typeof selected.height_mm !== "number" ||
    typeof selected.width_mm !== "number" ||
    typeof selected.curvatura_mm !== "number" ||
    isNaN(selected.height_mm) ||
    isNaN(selected.width_mm) ||
    isNaN(selected.curvatura_mm)
  ) {
    canvas.innerHTML = "<p>Faltan datos válidos para comparar este modelo.</p>";
    console.error("Datos inválidos en teléfono seleccionado:", selected);
    return;
  }

  // Ejecutar debug si está activado
  debugFilter(selected, devices);

  // Filtro mejorado con validación estricta
  const similares = devices
    .filter((d) => {
      // Saltar el teléfono seleccionado
      if (d.brand === selected.brand && d.model === selected.model)
        return false;

      // Validación estricta de tipos y valores
      if (typeof d.height_mm !== "number" || isNaN(d.height_mm)) return false;
      if (typeof d.width_mm !== "number" || isNaN(d.width_mm)) return false;
      if (typeof d.curvatura_mm !== "number" || isNaN(d.curvatura_mm))
        return false;

      // Cálculo de diferencias
      const altoDiff = Math.abs(d.height_mm - selected.height_mm);
      const anchoDiff = Math.abs(d.width_mm - selected.width_mm);
      const curvaturaDiff = Math.abs(d.curvatura_mm - selected.curvatura_mm);

      // Aplicar tolerancias
      return (
        altoDiff <= TOLERANCIA_DIMENSIONAL &&
        anchoDiff <= TOLERANCIA_DIMENSIONAL &&
        curvaturaDiff <= TOLERANCIA_CURVATURA
      );
    })
    .sort((a, b) => {
      // Ordenar por similitud (distancia euclidiana)
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

  // Crear lista ordenada con el seleccionado primero
  const ordenados = [selected, ...similares];

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

  // Scroll horizontal con rueda del mouse
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        canvas.scrollLeft += e.deltaY;
      }
    },
    { passive: false }
  );

  // Renderizar teléfonos
  ordenados.forEach((d, index) => {
    const phone = document.createElement("div");
    phone.className = "phone";
    phone.style.height = `${d.height_mm * ESCALA_VISUAL}px`;
    phone.style.width = `${d.width_mm * ESCALA_VISUAL}px`;
    phone.style.border = `2px solid ${index === 0 ? "red" : "blue"}`; // Primero es rojo (seleccionado)
    phone.style.borderRadius = `${d.curvatura_mm * ESCALA_VISUAL}px`; // Curvatura también escalada
    phone.style.flexShrink = "0";
    phone.style.display = "flex";
    phone.style.flexDirection = "column";
    phone.style.alignItems = "center";
    phone.style.justifyContent = "space-between";
    phone.style.position = "relative";
    phone.style.boxSizing = "border-box";
    phone.style.margin = "30px 20px 35px 20px";
    phone.style.backgroundColor =
      index === 0 ? "rgba(255,0,0,0.1)" : "rgba(0,0,255,0.1)";

    // Etiqueta del teléfono
    const label = document.createElement("div");
    label.className = "phone-label";
    label.textContent = `${d.brand} ${d.model}`;
    label.style.fontSize = "12px";
    label.style.marginTop = "4px";
    label.style.textAlign = "center";
    label.style.fontWeight = index === 0 ? "bold" : "normal";

    // Dimensiones como texto
    const dimensions = document.createElement("div");
    dimensions.className = "phone-dimensions";
    dimensions.textContent = `${d.height_mm}×${d.width_mm}×${d.curvatura_mm}mm`;
    dimensions.style.fontSize = "10px";
    dimensions.style.color = "#666";
    dimensions.style.textAlign = "center";
    dimensions.style.marginTop = "2px";

    phone.appendChild(label);
    phone.appendChild(dimensions);
    canvas.appendChild(phone);

    // Lista de resultados
    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model} (${d.height_mm}×${d.width_mm}×${d.curvatura_mm}mm)`;
    li.style.fontWeight = index === 0 ? "bold" : "normal";
    li.style.color = index === 0 ? "red" : "inherit";
    list.appendChild(li);
  });

  // Mostrar estadísticas
  console.log(
    `Comparación completada: ${similares.length} teléfonos compatibles encontrados`
  );
}

// Función para limpiar la comparación
function clearComparison() {
  const canvas = document.getElementById("canvas");
  const list = document.getElementById("list");

  if (canvas) canvas.innerHTML = "";
  if (list) list.innerHTML = "";

  lastSelected = null;

  console.log("Comparación limpiada");
}

// Buscador interactivo con botón de borrar
const buscador = document.getElementById("buscador");
const sugerencias = document.getElementById("sugerencias");

function setupSearch() {
  if (!buscador || !sugerencias) {
    console.error("Faltan elementos #buscador o #sugerencias en el DOM");
    return;
  }

  const clearBtn = document.getElementById("clear-search");

  buscador.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    sugerencias.innerHTML = "";

    if (clearBtn) clearBtn.style.display = query ? "block" : "none";

    // Si no hay búsqueda, limpiar comparación y no mostrar sugerencias
    if (!query) {
      clearComparison();
      return;
    }

    // Filtrar dispositivos según la búsqueda
    const resultados = devices.filter((d) =>
      `${d.brand} ${d.model}`.toLowerCase().includes(query)
    );

    // Mostrar sugerencias
    resultados.forEach((d) => {
      const div = document.createElement("div");
      div.textContent = `${d.brand} ${d.model}`;
      div.onclick = () => {
        buscador.value = div.textContent;
        sugerencias.innerHTML = "";
        if (clearBtn) clearBtn.style.display = "block";
        comparePhones(d);
      };
      sugerencias.appendChild(div);
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      buscador.value = "";
      sugerencias.innerHTML = "";
      clearBtn.style.display = "none";
      clearComparison(); // Limpiar también la comparación
      buscador.focus();
    });
  }

  buscador.addEventListener("blur", () => {
    setTimeout(() => (sugerencias.innerHTML = ""), 200);
  });
}

// Botón de modo oscuro
const toggleBtn = document.getElementById("toggle-dark");

if (toggleBtn) {
  if (localStorage.getItem("dark-mode") === "true") {
    document.body.classList.add("dark-mode");
    toggleBtn.textContent = "Modo claro";
    toggleBtn.setAttribute("aria-label", "Alternar modo claro");
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    toggleBtn.textContent = isDark ? "Modo claro" : "Modo oscuro";
    toggleBtn.setAttribute(
      "aria-label",
      isDark ? "Alternar modo claro" : "Alternar modo oscuro"
    );
    localStorage.setItem("dark-mode", isDark);
  });
}

// Inicializar
loadPhones().then(() => {
  setupSearch();
});


