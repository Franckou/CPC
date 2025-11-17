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
const TOLERANCIA_BISEL = 0.5;
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
  const bisel =
    rawPhone.bisel !== undefined && rawPhone.bisel !== null
      ? Number(rawPhone.bisel)
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
    bisel: isNaN(bisel) ? null : bisel,
    inches: isNaN(inches) ? null : inches,
    notch_type: rawPhone.notch_type || "none",
    notch_position: rawPhone.notch_position || 2, // 1=izq, 2=centro, 3=der
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
        x.bisel === null ||
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

  // Filtrar solo los que tienen EXACTAMENTE las mismas pulgadas
  const compatibles = devices.filter((d) => {
    if (d.inches === null || isNaN(d.inches)) return false;
    return d.inches === selected.inches;
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
    // Detectar modo oscuro
    const isDarkMode = document.body.classList.contains('dark-mode');
    const isSelected = d.brand === selected.brand && d.model === selected.model;
    
    const card = document.createElement("div");
    card.style.cssText = `
      background: ${
        isDarkMode 
          ? (isSelected ? 'rgba(231, 76, 60, 0.2)' : '#2a2a2a')
          : (isSelected ? 'rgba(231, 76, 60, 0.1)' : '#f8f9fa')
      };
      border: 2px solid ${isSelected ? '#e74c3c' : (isDarkMode ? '#444' : '#e0e0e0')};
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,${isDarkMode ? '0.3' : '0.1'});
    `;

    card.innerHTML = `
      <h3 style="margin: 0 0 8px 0; color: ${isDarkMode ? '#e0e0e0' : '#2c3e50'}; font-size: 1.1em;">${d.brand}</h3>
      <p style="margin: 0 0 8px 0; color: ${isDarkMode ? '#b0b0b0' : '#666'}; font-size: 0.95em;">${d.model}</p>
      <p style="margin: 0; color: #3498db; font-weight: bold; font-size: 1.2em;">${d.inches}"</p>
    `;

    // Efecto hover
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-3px)";
      card.style.boxShadow = `0 8px 16px rgba(0,0,0,${isDarkMode ? '0.5' : '0.15'})`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = `0 2px 8px rgba(0,0,0,${isDarkMode ? '0.3' : '0.1'})`;
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
    `Dimensiones: ${selected.height_mm}mm x ${selected.width_mm}mm x ${selected.bisel}mm`
  );
  console.log("Tolerancias:", {
    dimensional: TOLERANCIA_DIMENSIONAL,
    bisel: TOLERANCIA_BISEL,
  });

  devices.forEach((d) => {
    if (d.brand === selected.brand && d.model === selected.model) return;

    const tieneAlturaValida =
      typeof d.height_mm === "number" && !isNaN(d.height_mm);
    const tieneAnchoValido =
      typeof d.width_mm === "number" && !isNaN(d.width_mm);
    const tieneBiselValido =
      typeof d.bisel === "number" && !isNaN(d.bisel);

    if (!tieneAlturaValida || !tieneAnchoValido || !tieneBiselValido) {
      console.log(`❌ ${d.brand} ${d.model} - Datos inválidos:`, {
        altura: d.height_mm,
        ancho: d.width_mm,
        bisel: d.bisel,
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
    typeof selected.bisel !== "number" ||
    isNaN(selected.height_mm) ||
    isNaN(selected.width_mm) ||
    isNaN(selected.bisel)
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
      if (typeof d.bisel !== "number" || isNaN(d.bisel))
        return false;

      const altoDiff = Math.abs(d.height_mm - selected.height_mm);
      const anchoDiff = Math.abs(d.width_mm - selected.width_mm);
      const biselDiff = Math.abs(d.bisel - selected.bisel);

      return (
        altoDiff <= TOLERANCIA_DIMENSIONAL &&
        anchoDiff <= TOLERANCIA_DIMENSIONAL &&
        biselDiff <= TOLERANCIA_BISEL
      );
    })
    .sort((a, b) => {
      // Prioridad 1: Diferencia en altura
      const altoDiffA = Math.abs(a.height_mm - selected.height_mm);
      const altoDiffB = Math.abs(b.height_mm - selected.height_mm);
      
      if (altoDiffA !== altoDiffB) {
        return altoDiffA - altoDiffB;
      }
      
      // Prioridad 2: Diferencia en ancho
      const anchoDiffA = Math.abs(a.width_mm - selected.width_mm);
      const anchoDiffB = Math.abs(b.width_mm - selected.width_mm);
      
      if (anchoDiffA !== anchoDiffB) {
        return anchoDiffA - anchoDiffB;
      }
      
      // Prioridad 3: Diferencia en bisel
      const biselDiffA = Math.abs(a.bisel - selected.bisel);
      const biselDiffB = Math.abs(b.bisel - selected.bisel);
      
      return biselDiffA - biselDiffB;
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
    phone.style.borderRadius = `${d.bisel * ESCALA_VISUAL}px`;
    phone.style.backgroundColor =
      index === 0 ? "rgba(231, 76, 60, 0.1)" : "rgba(52, 152, 219, 0.1)";
    phone.style.position = "relative";
    phone.style.overflow = "hidden";

    // ✅ RENDERIZADO DEL NOTCH (versión mejorada con adaptación a modo oscuro)
    if (d.notch_type && d.notch_type !== "none") {
      const notch = document.createElement("div");
      notch.className = "phone-notch";
      
      // Detectar modo oscuro
      const isDarkMode = document.body.classList.contains('dark-mode');
      const canvasColor = isDarkMode ? '#121212' : '#ffffff';
      
      // Color del borde según si es seleccionado o no
      const borderColor = index === 0 ? "#e74c3c" : "#3498db";
      
      // Estilos base
      notch.style.position = "absolute";
      notch.style.backgroundColor = canvasColor; // Mismo color que el fondo del canvas
      notch.style.border = `3px solid ${borderColor}`; // Mismo borde que el teléfono
      notch.style.zIndex = "10";
      notch.style.transition = "all 0.3s ease";

      // Aplicar forma según tipo
      switch (d.notch_type) {
        case "infinity-v":
          notch.style.width = "30px";
          notch.style.height = "30px";
          notch.style.top = "0";
          notch.style.left = "50%";
          notch.style.transform = "translateX(-50%)";
          notch.style.clipPath = "polygon(0 0, 50% 100%, 100% 0)";
          notch.style.borderRadius = "0";
          break;

        case "waterdrop":
          notch.style.width = "25px";
          notch.style.height = "25px";
          notch.style.top = "-11px";
          notch.style.left = "50%";
          notch.style.transform = "translateX(-50%)";
          notch.style.borderRadius = "50%";
          break;

        case "punch-hole":
          notch.style.width = "15px";
          notch.style.height = "15px";
          notch.style.top = "8px";
          notch.style.borderRadius = "50%";
          
          // Posición según notch_position: 1=izq, 2=centro, 3=der
          const position = d.notch_position || 2;
          if (position === 1) {
            notch.style.left = "15px";
            notch.style.transform = "none";
          } else if (position === 3) {
            notch.style.right = "15px";
            notch.style.transform = "none";
          } else {
            notch.style.left = "50%";
            notch.style.transform = "translateX(-50%)";
          }
          break;

        case "dynamic-island":
          notch.style.width = "80px";
          notch.style.height = "25px";
          notch.style.top = "5px";
          notch.style.left = "50%";
          notch.style.transform = "translateX(-50%)";
          notch.style.borderRadius = "20px";
          break;

        case "notch":
          notch.style.width = "100px";
          notch.style.height = "25px";
          notch.style.top = "0";
          notch.style.left = "50%";
          notch.style.transform = "translateX(-50%)";
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
    dimensions.textContent = `${d.height_mm}×${d.width_mm}mm`;

    if (index === 0) {
      dimensions.style.color = "#c0392b";
      dimensions.style.fontWeight = "600";
    }

    phone.appendChild(label);
    phone.appendChild(dimensions);
    canvas.appendChild(phone);

    const li = document.createElement("div");
    li.className = "list-item";
    li.textContent = `${d.brand} ${d.model}`;

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

