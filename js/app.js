// Configuración
let devices = [];
let lastSelected = null;

const TOLERANCIA_DIMENSIONAL = 1.0; // mm de diferencia permitida en alto y ancho
const TOLERANCIA_CURVATURA = 0.5; // mm de diferencia permitida en curvatura
const ESCALA_VISUAL = 2.5; // Escala fija para visualización

// Variable para activar/desactivar debug
const DEBUG_MODE = true; // Cambiar a false cuando no necesites el debug

// Cargar datos desde JSON
async function loadPhones() {
  try {
    const res = await fetch("data/phones.json");
    if (!res.ok) throw new Error("No se pudo cargar el archivo");
    devices = await res.json();
    console.log("Datos cargados:", devices.length, "dispositivos");
  } catch (err) {
    console.error("Error al cargar los datos:", err);
  }
}

// Función de debug para diagnosticar problemas de filtrado
function debugFilter(selected, devices) {
  if (!DEBUG_MODE) return;

  console.log("=== DEBUG ===");
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

    //--- muestra en la consola la los telefenos compatibles y los que no ---//

    // if (pasaFiltroCompleto) {
    //   compatiblesCount++;
    //   console.log(`✅ ${d.brand} ${d.model} - COMPATIBLE`);
    // } else {
    //   console.log(`❌ ${d.brand} ${d.model} - NO compatible:`);
    // }

    // console.log(
    //   `   Dimensiones: ${d.height_mm}mm x ${d.width_mm}mm x ${d.curvatura_mm}mm`
    // );
    // console.log(
    //   `   Diferencias: Alto=${altoDiff.toFixed(2)}mm ${
    //     pasaFiltroAlto ? "✅" : "❌"
    //   }, Ancho=${anchoDiff.toFixed(2)}mm ${
    //     pasaFiltroAncho ? "✅" : "❌"
    //   }, Curvatura=${curvaturaDiff.toFixed(2)}mm ${
    //     pasaFiltroCurvatura ? "✅" : "❌"
    //   }`
    // );
  });
}

// Comparar teléfonos similares - CORREGIDO para usar los IDs del HTML
function comparePhones(selected) {
  lastSelected = selected;

  // CORREGIDO: Usar los IDs correctos del HTML
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

    // Estilos específicos para JS
    phone.style.height = `${d.height_mm * ESCALA_VISUAL}px`;
    phone.style.width = `${d.width_mm * ESCALA_VISUAL}px`;
    phone.style.border = `3px solid ${index === 0 ? "#e74c3c" : "#3498db"}`;
    phone.style.borderRadius = `${d.curvatura_mm * ESCALA_VISUAL}px`;
    phone.style.backgroundColor =
      index === 0 ? "rgba(231, 76, 60, 0.1)" : "rgba(52, 152, 219, 0.1)";

    // Etiqueta del teléfono
    const label = document.createElement("div");
    label.className = "phone-label";
    label.textContent = `${d.brand} ${d.model}`;

    if (index === 0) {
      label.style.fontWeight = "bold";
      label.style.color = "#e74c3c";
    }

    // Dimensiones como texto
    const dimensions = document.createElement("div");
    dimensions.className = "phone-dimensions";
    dimensions.textContent = `${d.height_mm}×${d.width_mm}×${d.curvatura_mm}mm`;

    if (index === 0) {
      dimensions.style.color = "#c0392b";
      dimensions.style.fontWeight = "600";
    }

    phone.appendChild(label);
    phone.appendChild(dimensions);
    canvas.appendChild(phone);

    // Lista de resultados
    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model} (${d.height_mm}×${d.width_mm}×${d.curvatura_mm}mm)`;

    if (index === 0) {
      li.classList.add("active");
      li.style.color = "#e74c3c";
    }

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

// Buscador interactivo con botón de borrar - CORREGIDO
function setupSearch() {
  const buscador = document.getElementById("buscador");
  const sugerencias = document.getElementById("sugerencias");

  if (!buscador || !sugerencias) {
    console.error("Faltan elementos #buscador o #sugerencias en el DOM");
    return;
  }

  const clearBtn = document.getElementById("clear-search");

  buscador.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    sugerencias.innerHTML = "";

    if (clearBtn) clearBtn.style.display = query ? "block" : "none";

    // Si no hay búsqueda, limpiar comparación y ocultar sugerencias
    if (!query) {
      clearComparison();
      sugerencias.style.display = "none";
      return;
    }

    // Filtrar dispositivos según la búsqueda
    const resultados = devices.filter((d) =>
      `${d.brand} ${d.model}`.toLowerCase().includes(query)
    );

    // Mostrar sugerencias si hay resultados
    if (resultados.length > 0) {
      sugerencias.style.display = "block";

      // Limitar a 10 resultados
      resultados.slice(0, 10).forEach((d) => {
        const div = document.createElement("div");
        div.textContent = `${d.brand} ${d.model}`;
        div.onclick = () => {
          buscador.value = div.textContent;
          sugerencias.innerHTML = "";
          sugerencias.style.display = "none";
          if (clearBtn) clearBtn.style.display = "block";
          comparePhones(d);
        };
        sugerencias.appendChild(div);
      });
    } else {
      sugerencias.style.display = "none";
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      buscador.value = "";
      sugerencias.innerHTML = "";
      sugerencias.style.display = "none";
      clearBtn.style.display = "none";
      clearComparison();
      buscador.focus();
    });
  }

  // Mejor manejo del blur
  buscador.addEventListener("blur", () => {
    setTimeout(() => {
      sugerencias.innerHTML = "";
      sugerencias.style.display = "none";
    }, 200);
  });

  // Mostrar sugerencias al hacer focus si hay contenido
  buscador.addEventListener("focus", () => {
    if (buscador.value.trim()) {
      // Trigger input event para mostrar sugerencias
      buscador.dispatchEvent(new Event("input"));
    }
  });
}

// Botón de modo oscuro
const toggleBtn = document.getElementById("toggle-dark");

if (toggleBtn) {
  // Verificar estado inicial
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

// Inicialización mejorada
async function initialize() {
  try {
    console.log("Inicializando aplicación...");
    await loadPhones();
    setupSearch();
    console.log("Aplicación inicializada correctamente");
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
