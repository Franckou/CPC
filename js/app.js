// ========================================
// CONFIGURACIÓN DE SUPABASE
// ========================================
const SUPABASE_URL =
  localStorage.getItem("supabaseUrl") ||
  "https://pvlodyxttslpxbndmthm.supabase.co";
const SUPABASE_ANON_KEY =
  localStorage.getItem("supabaseKey") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bG9keXh0dHNscHhibmRtdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjAwOTAsImV4cCI6MjA3NDgzNjA5MH0.Szl3sOIzkY5Lc4UV-qUuK7lgp7Av_56gl0PK1HpiEwI";

let supabase = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "❌ Faltan credenciales de Supabase. Configúralas en admin.html"
    );
    return false;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Cliente Supabase inicializado");
    return true;
  } catch (error) {
    console.error("❌ Error al inicializar Supabase:", error);
    return false;
  }
}

// ========================================
// CONFIGURACIÓN VISUAL Y TOLERANCIAS
// ========================================

let devices = [];
let lastSelected = null;

const TOLERANCIA_DIMENSIONAL = 1.0;
const TOLERANCIA_CURVATURA = 0.5;
const ESCALA_VISUAL = 2.5;
const DEBUG_MODE = true;

// ========================================
// FUNCIÓN HELPER: NORMALIZAR DATOS
// ========================================

function normalizePhoneData(rawPhone) {
  if (!rawPhone) return null;

  const height =
    rawPhone.height_mm !== undefined && rawPhone.height_mm !== null
      ? Number(rawPhone.height_mm)
      : NaN;
  const width =
    rawPhone.width_mm !== undefined && rawPhone.width_mm !== null
      ? Number(rawPhone.width_mm)
      : NaN;
  const curv =
    rawPhone.curvatura_mm !== undefined && rawPhone.curvatura_mm !== null
      ? Number(rawPhone.curvatura_mm)
      : NaN;
  const inches =
    rawPhone.inches !== undefined && rawPhone.inches !== null
      ? Number(rawPhone.inches)
      : NaN;

  return {
    ...rawPhone,
    brand: rawPhone.brand ? String(rawPhone.brand).trim() : "",
    model: rawPhone.model ? String(rawPhone.model).trim() : "",
    height_mm: isNaN(height) ? null : height,
    width_mm: isNaN(width) ? null : width,
    curvatura_mm: isNaN(curv) ? null : curv,
    inches: isNaN(inches) ? null : inches,
    notch_type: rawPhone.notch_type || "none",
    brandModelLower: `${rawPhone.brand || ""} ${
      rawPhone.model || ""
    }`.toLowerCase(),
  };
}

// ========================================
// CARGA DE DATOS - VERSIÓN SUPABASE
// ========================================

async function loadPhones() {
  try {
    console.log("🔄 Cargando teléfonos desde Supabase...");

    if (!supabase) {
      console.error("❌ Supabase no está inicializado");
      devices = [];
      showNoDataMessage();
      return;
    }

    const { data, error } = await supabase
      .from("phones")
      .select("*")
      .order("brand", { ascending: true });

    if (error) {
      console.error("❌ Error al cargar desde Supabase:", error);
      devices = [];
      showNoDataMessage();
      return;
    }

    devices = (data || []).map(normalizePhoneData);

    console.log(`✅ ${devices.length} dispositivos cargados desde Supabase`);

    const incompletos = devices.filter(
      (x) =>
        x.height_mm === null || 
        x.width_mm === null || 
        x.curvatura_mm === null ||
        x.inches === null
    );

    if (incompletos.length > 0) {
      console.warn(
        `⚠️ ${incompletos.length} dispositivos con datos incompletos`
      );
      if (DEBUG_MODE) console.log("Ej: ", incompletos.slice(0, 5));
    }
  } catch (err) {
    console.error("❌ Error inesperado al cargar datos:", err);
    devices = [];
    showNoDataMessage();
  }
}

// ✅ NUEVA FUNCIÓN: Mostrar mensaje cuando no hay datos
function showNoDataMessage() {
  const canvas = document.getElementById("canvas");
  if (canvas) {
    canvas.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p style="font-size: 1.2em; margin-bottom: 10px;">⚠️ No se pudieron cargar los datos</p>
        <p>Verifica la conexión a Supabase en admin.html</p>
      </div>
    `;
  }
}

// ========================================
// ✅ NUEVA: COMPATIBILIDAD POR PULGADAS
// ========================================

function displayInchesCompatibility(selected) {
  const listaInches = document.getElementById("lista-inches");
  
  if (!listaInches) {
    console.error("Elemento #lista-inches no encontrado");
    return;
  }

  listaInches.innerHTML = "";

  if (selected.inches === null || isNaN(selected.inches)) {
    listaInches.innerHTML = `
      <p style="text-align: center; padding: 20px; color: #999;">
        Este modelo no tiene información de pulgadas
      </p>
    `;
    return;
  }

  // Filtrar solo los que tienen las MISMAS pulgadas
  const compatibles = devices.filter((d) => {
    if (d.inches === null || isNaN(d.inches)) return false;
    return Math.abs(d.inches - selected.inches) < 0.1; // Tolerancia mínima
  });

  if (compatibles.length === 0) {
    listaInches.innerHTML = `
      <p style="text-align: center; padding: 20px; color: #999;">
        No se encontraron modelos compatibles de ${selected.inches}"
      </p>
    `;
    return;
  }

  // Crear grid simple
  listaInches.style.display = "grid";
  listaInches.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
  listaInches.style.gap = "15px";
  listaInches.style.padding = "20px";

  compatibles.forEach((d) => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: white;
      border: 2px solid ${d.brand === selected.brand && d.model === selected.model ? '#e74c3c' : '#e0e0e0'};
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    card.innerHTML = `
      <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.1em;">${d.brand}</h3>
      <p style="margin: 0 0 8px 0; color: #666; font-size: 0.95em;">${d.model}</p>
      <p style="margin: 0; color: #3498db; font-weight: bold; font-size: 1.2em;">${d.inches}"</p>
    `;

    // Efecto hover
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-3px)";
      card.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
    });

    // Click para comparar por tamaño
    card.addEventListener("click", () => {
      comparePhones(d);
      window.scrollTo({ 
        top: document.getElementById("comparacion").offsetTop - 20, 
        behavior: "smooth" 
      });
    });

    listaInches.appendChild(card);
  });

  console.log(`✅ ${compatibles.length} modelos compatibles de ${selected.inches}"`);
}

// ========================================
// FUNCIONES DE COMPARACIÓN
// ========================================

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

  devices.forEach((d) => {
    if (d.brand === selected.brand && d.model === selected.model) return;

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
    }
  });
}

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

  // ✅ AGREGAR: Mostrar compatibilidad por pulgadas
  displayInchesCompatibility(selected);

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

  debugFilter(selected, devices);

  const similares = devices
    .filter((d) => {
      if (d.brand === selected.brand && d.model === selected.model)
        return false;

      if (typeof d.height_mm !== "number" || isNaN(d.height_mm)) return false;
      if (typeof d.width_mm !== "number" || isNaN(d.width_mm)) return false;
      if (typeof d.curvatura_mm !== "number" || isNaN(d.curvatura_mm))
        return false;

      const altoDiff = Math.abs(d.height_mm - selected.height_mm);
      const anchoDiff = Math.abs(d.width_mm - selected.width_mm);
      const curvaturaDiff = Math.abs(d.curvatura_mm - selected.curvatura_mm);

      return (
        altoDiff <= TOLERANCIA_DIMENSIONAL &&
        anchoDiff <= TOLERANCIA_DIMENSIONAL &&
        curvaturaDiff <= TOLERANCIA_CURVATURA
      );
    })
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

  const ordenados = [selected, ...similares];

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

  ordenados.forEach((d, index) => {
    const phone = document.createElement("div");
    phone.className = "phone";

    phone.style.height = `${d.height_mm * ESCALA_VISUAL}px`;
    phone.style.width = `${d.width_mm * ESCALA_VISUAL}px`;
    phone.style.border = `3px solid ${index === 0 ? "#e74c3c" : "#3498db"}`;
    phone.style.borderRadius = `${d.curvatura_mm * ESCALA_VISUAL}px`;
    phone.style.backgroundColor =
      index === 0 ? "rgba(231, 76, 60, 0.1)" : "rgba(52, 152, 219, 0.1)";
    phone.style.position = "relative";
    phone.style.overflow = "hidden";

    // ✅ SIMPLIFICADO: Solo renderizar notch básico según tipo
    if (d.notch_type && d.notch_type !== "none") {
      const notch = document.createElement("div");
      notch.className = "phone-notch";
      notch.style.position = "absolute";
      notch.style.backgroundColor = index === 0 ? "rgb(231, 76, 60)" : "rgb(52, 152, 219)";
      notch.style.top = "5px";
      notch.style.left = "50%";
      notch.style.transform = "translateX(-50%)";

      switch (d.notch_type) {
        case "infinity-v":
          notch.style.width = "40px";
          notch.style.height = "20px";
          notch.style.clipPath = "polygon(0 0, 50% 100%, 100% 0)";
          break;

        case "waterdrop":
          notch.style.width = "20px";
          notch.style.height = "20px";
          notch.style.borderRadius = "50% 50% 50% 50% / 60% 60% 40% 40%";
          break;

        case "punch-hole":
          notch.style.width = "15px";
          notch.style.height = "15px";
          notch.style.borderRadius = "50%";
          notch.style.left = "20px";
          notch.style.transform = "none";
          break;

        case "dynamic-island":
          notch.style.width = "80px";
          notch.style.height = "25px";
          notch.style.borderRadius = "20px";
          break;

        case "notch":
          notch.style.width = "100px";
          notch.style.height = "25px";
          notch.style.borderRadius = "0 0 15px 15px";
          break;
      }

      phone.appendChild(notch);
    }

    const label = document.createElement("div");
    label.className = "phone-label";
    label.textContent = `${d.brand} ${d.model}`;

    if (index === 0) {
      label.style.fontWeight = "bold";
      label.style.color = "#e74c3c";
    }

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

    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model} (${d.height_mm}×${d.width_mm}×${d.curvatura_mm}mm)`;

    if (index === 0) {
      li.classList.add("active");
      li.style.color = "#e74c3c";
    }

    list.appendChild(li);
  });

  console.log(
    `Comparación completada: ${similares.length} teléfonos compatibles encontrados`
  );
}

function clearComparison() {
  const canvas = document.getElementById("canvas");
  const list = document.getElementById("list");
  const listaInches = document.getElementById("lista-inches");

  if (canvas) canvas.innerHTML = "";
  if (list) list.innerHTML = "";
  if (listaInches) listaInches.innerHTML = "";

  lastSelected = null;

  console.log("Comparación limpiada");
}

// ========================================
// BUSCADOR - ✅ VERSIÓN CORREGIDA
// ========================================

function setupSearch() {
  const buscador = document.getElementById("buscador");
  const sugerencias = document.getElementById("sugerencias");
  const clearBtn = document.getElementById("clear-search");

  if (!buscador || !sugerencias) {
    console.error("Faltan elementos #buscador o #sugerencias en el DOM");
    return;
  }

  let clickingOnSuggestion = false;

  buscador.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    sugerencias.innerHTML = "";

    if (clearBtn) {
      clearBtn.style.display = query ? "block" : "none";
    }

    if (!query) {
      clearComparison();
      sugerencias.style.display = "none";
      return;
    }

    const resultados = devices.filter((d) => {
      return d.brandModelLower.includes(query);
    });

    if (resultados.length > 0) {
      sugerencias.style.display = "block";

      resultados.slice(0, 10).forEach((d) => {
        const div = document.createElement("div");
        div.textContent = `${d.brand} ${d.model}`;

        div.addEventListener("mousedown", () => {
          clickingOnSuggestion = true;
        });

        div.addEventListener("click", () => {
          buscador.value = `${d.brand} ${d.model}`;
          sugerencias.innerHTML = "";
          sugerencias.style.display = "none";
          if (clearBtn) clearBtn.style.display = "block";
          comparePhones(d);
          clickingOnSuggestion = false;
        });

        sugerencias.appendChild(div);
      });
    } else {
      sugerencias.style.display = "block";
      sugerencias.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #999;">
          No se encontraron resultados para "${e.target.value}"
        </div>
      `;
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

  buscador.addEventListener("blur", () => {
    setTimeout(() => {
      if (!clickingOnSuggestion) {
        sugerencias.innerHTML = "";
        sugerencias.style.display = "none";
      }
      clickingOnSuggestion = false;
    }, 300);
  });

  buscador.addEventListener("focus", () => {
    if (buscador.value.trim()) {
      buscador.dispatchEvent(new Event("input"));
    }
  });

  console.log("✅ Buscador configurado correctamente");
}

// ========================================
// MODO OSCURO
// ========================================

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

// ========================================
// INICIALIZACIÓN
// ========================================

async function initialize() {
  try {
    console.log("🚀 Inicializando aplicación...");

    const supabaseOK = initSupabase();

    if (!supabaseOK) {
      console.error("❌ No se pudo inicializar Supabase");
      console.error("💡 Configura las credenciales en admin.html primero");
      showNoDataMessage();
      return;
    }

    await loadPhones();
    setupSearch();

    console.log("✅ Aplicación inicializada correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar la aplicación:", error);
    showNoDataMessage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// ========================================
// BONUS: Recargar datos
// ========================================

async function reloadData() {
  console.log("🔄 Recargando datos...");
  await loadPhones();
  console.log("✅ Datos recargados");

  if (lastSelected) {
    const actualizado = devices.find(
      (d) => d.brand === lastSelected.brand && d.model === lastSelected.model
    );
    if (actualizado) {
      comparePhones(actualizado);
    }
  }
}

window.reloadPhoneData = reloadData;
