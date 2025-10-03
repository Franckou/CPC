// ========================================
// CONFIGURACIÓN INICIAL
// ========================================

let supabase = null;
let phoneData = [];
let isEditing = false;
// Credenciales por defecto (fallback)
const DEFAULT_URL = " ";
const DEFAULT_KEY = " ";

// ========================================
// FUNCIÓN HELPER: NORMALIZAR DATOS
// ========================================

function normalizePhoneData(rawPhone) {
  if (!rawPhone) return null;

  return {
    id: rawPhone.id,
    brand: rawPhone.brand || "",
    model: rawPhone.model || "",
    height_mm: parseFloat(rawPhone.height_mm) || 0,
    width_mm: parseFloat(rawPhone.width_mm) || 0,
    curvatura_mm: parseFloat(rawPhone.curvatura_mm) || 0,
    // Campos planos para compatibilidad con Supabase
    notch_type: rawPhone.notch_type || "none",
    notch_width_mm: parseFloat(rawPhone.notch_width_mm) || 0,
    notch_height_mm: parseFloat(rawPhone.notch_height_mm) || 0,
    notch_offset_top: parseFloat(rawPhone.notch_offset_top) || 0,
    notch_offset_left: rawPhone.notch_offset_left
      ? parseFloat(rawPhone.notch_offset_left)
      : null,
    notch_radius: rawPhone.notch_radius
      ? parseFloat(rawPhone.notch_radius)
      : null,
    // Objeto anidado para facilitar acceso en UI
    notch: {
      type: rawPhone.notch_type || "none",
      width: parseFloat(rawPhone.notch_width_mm) || 0,
      height: parseFloat(rawPhone.notch_height_mm) || 0,
      offsetTop: parseFloat(rawPhone.notch_offset_top) || 0,
      offsetLeft: rawPhone.notch_offset_left
        ? parseFloat(rawPhone.notch_offset_left)
        : null,
      radius: rawPhone.notch_radius ? parseFloat(rawPhone.notch_radius) : null,
    },
  };
}

// ========================================
// INICIALIZACIÓN
// ========================================

window.addEventListener("DOMContentLoaded", function () {
  loadConfig();
});

// ========================================
// CONFIGURACIÓN
// ========================================

function loadConfig() {
  const url = localStorage.getItem("supabaseUrl") || DEFAULT_URL;
  const key = localStorage.getItem("supabaseKey") || DEFAULT_KEY;

  if (url && key) {
    document.getElementById("supabaseUrl").value = url;
    document.getElementById("supabaseKey").value = key;
    document.getElementById("configUrl").value = url;
    document.getElementById("configKey").value = key;

    // Conectar automáticamente
    setTimeout(() => {
      connectSupabase();
    }, 500);
  }
}

function saveConfig() {
  const url = document.getElementById("configUrl").value.trim();
  const key = document.getElementById("configKey").value.trim();

  if (!url || !key) {
    showMessage("error", "⚠️ Por favor completa ambos campos");
    return;
  }

  document.getElementById("supabaseUrl").value = url;
  document.getElementById("supabaseKey").value = key;

  connectSupabase();
}

function toggleConfig() {
  const section = document.getElementById("configSection");
  section.style.display = section.style.display === "none" ? "block" : "none";
}

// ========================================
// CONEXIÓN A SUPABASE
// ========================================

async function connectSupabase() {
  const url =
    document.getElementById("supabaseUrl").value.trim() ||
    document.getElementById("configUrl").value.trim();
  const key =
    document.getElementById("supabaseKey").value.trim() ||
    document.getElementById("configKey").value.trim();

  if (!url || !key) {
    showMessage("error", "⚠️ Por favor ingresa la URL y la Key de Supabase");
    updateConnectionStatus(false);
    return;
  }

  try {
    supabase = window.supabase.createClient(url, key);

    // Guardar en localStorage
    localStorage.setItem("supabaseUrl", url);
    localStorage.setItem("supabaseKey", key);

    const success = await testConnection();

    if (success) {
      document.getElementById("configSection").style.display = "none";
      await loadData();
    }
  } catch (error) {
    console.error("Error al conectar:", error);
    showMessage("error", "❌ Error al conectar: " + error.message);
    updateConnectionStatus(false);
  }
}

async function testConnection() {
  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("phones")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    showMessage("success", "✅ Conexión exitosa a Supabase");
    updateConnectionStatus(true);
    return true;
  } catch (error) {
    console.error("Error de conexión:", error);
    showMessage("error", "❌ Error de conexión: " + error.message);
    updateConnectionStatus(false);
    return false;
  }
}

function updateConnectionStatus(connected) {
  const status = document.getElementById("connectionStatus");
  if (connected) {
    status.className = "connection-status connected";
    status.textContent = "✅ Conectado a Supabase";
  } else {
    status.className = "connection-status disconnected";
    status.textContent = "❌ Desconectado";
  }
}

// ========================================
// GESTIÓN DE DATOS
// ========================================

async function loadData() {
  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return;
  }

  document.getElementById("loadingIndicator").style.display = "block";

  try {
    const { data, error } = await supabase
      .from("phones")
      .select("*")
      .order("brand", { ascending: true });

    if (error) throw error;

    // ✅ CORRECCIÓN: Normalizar todos los datos
    phoneData = (data || []).map(normalizePhoneData);

    updateDisplay();
    updateStats();
    showMessage(
      "success",
      `✅ ${phoneData.length} modelos cargados desde Supabase`
    );
  } catch (error) {
    console.error("Error al cargar datos:", error);
    showMessage("error", "❌ Error al cargar datos: " + error.message);
    phoneData = [];
  } finally {
    document.getElementById("loadingIndicator").style.display = "none";
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return;
  }

  const formData = new FormData(event.target);
  const editingId = document.getElementById("editingId").value;

  // ✅ VALIDACIÓN: Verificar que las dimensiones sean positivas
  const height = parseFloat(formData.get("height"));
  const width = parseFloat(formData.get("width"));
  const curvatura = parseFloat(formData.get("curvatura"));
  const notchHeight = parseFloat(formData.get("notchHeight"));
  const notchWidth = parseFloat(formData.get("notchWidth"));

  if (height <= 0 || width <= 0 || curvatura < 0) {
    showMessage("error", "❌ Las dimensiones deben ser valores positivos");
    return;
  }

  if (notchHeight < 0 || notchWidth < 0) {
    showMessage(
      "error",
      "❌ Las dimensiones del notch no pueden ser negativas"
    );
    return;
  }

  // ✅ VALIDACIÓN: El notch no puede ser más grande que la pantalla
  if (notchHeight > height || notchWidth > width) {
    showMessage("error", "❌ El notch no puede ser más grande que la pantalla");
    return;
  }

  const phoneModel = {
    brand: formData.get("brand").trim(),
    model: formData.get("model").trim(),
    height_mm: height,
    width_mm: width,
    curvatura_mm: curvatura,
    notch_type: formData.get("notchType"),
    notch_height_mm: notchHeight,
    notch_width_mm: notchWidth,
    notch_offset_top: parseFloat(formData.get("notchOffsetTop")) || 0,
    notch_offset_left: formData.get("notchOffsetLeft")
      ? parseFloat(formData.get("notchOffsetLeft"))
      : null,
    notch_radius: formData.get("notchRadius")
      ? parseFloat(formData.get("notchRadius"))
      : null,
  };

  try {
    if (editingId) {
      const { data, error } = await supabase
        .from("phones")
        .update(phoneModel)
        .eq("id", editingId)
        .select();

      if (error) throw error;

      showMessage(
        "success",
        `✅ ${phoneModel.brand} ${phoneModel.model} actualizado`
      );
    } else {
      const { data, error } = await supabase
        .from("phones")
        .insert([phoneModel])
        .select();

      if (error) throw error;

      showMessage(
        "success",
        `✅ ${phoneModel.brand} ${phoneModel.model} agregado`
      );
    }

    clearForm();
    await loadData();
  } catch (error) {
    console.error("Error:", error);
    showMessage("error", "❌ Error: " + error.message);
  }
}

async function deleteModel(id, brand, model) {
  if (!confirm(`¿Estás seguro de eliminar ${brand} ${model}?`)) {
    return;
  }

  try {
    const { error } = await supabase.from("phones").delete().eq("id", id);

    if (error) throw error;

    showMessage("success", `✅ ${brand} ${model} eliminado`);
    await loadData();
  } catch (error) {
    console.error("Error al eliminar:", error);
    showMessage("error", "❌ Error: " + error.message);
  }
}

// ✅ CORRECCIÓN BUG #1: editModel() ahora accede correctamente a los campos
function editModel(phone) {
  // Usar campos planos directamente (ya normalizados)
  document.getElementById("brand").value = phone.brand;
  document.getElementById("model").value = phone.model;
  document.getElementById("width").value = phone.width_mm;
  document.getElementById("height").value = phone.height_mm;
  document.getElementById("curvatura").value = phone.curvatura_mm;
  document.getElementById("notchType").value = phone.notch_type;
  document.getElementById("notchWidth").value = phone.notch_width_mm;
  document.getElementById("notchHeight").value = phone.notch_height_mm;
  document.getElementById("notchOffsetTop").value = phone.notch_offset_top;
  document.getElementById("notchOffsetLeft").value =
    phone.notch_offset_left || "";
  document.getElementById("notchRadius").value = phone.notch_radius || "";
  document.getElementById("editingId").value = phone.id;

  document.getElementById("submitBtn").textContent = "ACTUALIZAR MODELO";

  showMessage("success", "📝 Modo edición activado");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  document.getElementById("modelForm").reset();
  document.getElementById("editingId").value = "";
  document.getElementById("submitBtn").textContent = "AGREGAR MODELO";
}

// ========================================
// INTERFAZ
// ========================================

// ✅ CORRECCIÓN BUG #2: updateDisplay() ahora usa campos normalizados
function updateDisplay() {
  const grid = document.getElementById("modelsGrid");
  const searchTerm = document.getElementById("searchBox").value.toLowerCase();

  const filteredPhones = phoneData.filter(
    (phone) =>
      phone.brand.toLowerCase().includes(searchTerm) ||
      phone.model.toLowerCase().includes(searchTerm)
  );

  if (filteredPhones.length === 0) {
    grid.innerHTML =
      '<p style="text-align: center; color: #666; padding: 40px;">No se encontraron modelos</p>';
    return;
  }

  grid.innerHTML = filteredPhones
    .map(
      (phone) => `
        <div class="model-card">
            <h3>${phone.brand} ${phone.model}</h3>
            <div class="model-info">
                <p><strong>Ancho:</strong> <span>${phone.width_mm} mm</span></p>
                <p><strong>Alto:</strong> <span>${phone.height_mm} mm</span></p>
                <p><strong>Curvatura:</strong> <span>${
                  phone.curvatura_mm
                } mm</span></p>
                <p><strong>Notch:</strong> <span>${phone.notch_type}</span></p>
                <p><strong>Notch Size:</strong> <span>${phone.notch_width_mm}x${
        phone.notch_height_mm
      } mm</span></p>
                <p><strong>ID:</strong> <span>#${phone.id}</span></p>
            </div>
            <div class="model-actions">
                <button class="btn btn-secondary btn-small" onclick='editModel(${JSON.stringify(
                  phone
                ).replace(/'/g, "&#39;")})'>Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteModel(${
                  phone.id
                }, '${phone.brand.replace(
        /'/g,
        "\\'"
      )}', '${phone.model.replace(/'/g, "\\'")}')">Eliminar</button>
            </div>
        </div>
    `
    )
    .join("");
}

function updateStats() {
  document.getElementById("totalModels").textContent = phoneData.length;

  const brands = [...new Set(phoneData.map((phone) => phone.brand))];
  document.getElementById("totalBrands").textContent = brands.length;

  const sizes = [
    ...new Set(
      phoneData.map((phone) => `${phone.width_mm}x${phone.height_mm}`)
    ),
  ];
  document.getElementById("totalSizes").textContent = sizes.length;
}

function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.getElementById(tabName).classList.add("active");
  event.target.classList.add("active");
}

function showMessage(type, text) {
  const element = document.getElementById(type + "Message");
  element.textContent = text;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 4000);
}
