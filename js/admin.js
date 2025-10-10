// Supabase Phones - Versión recomendada con auth dinámica
// ========================================
// CONFIGURACIÓN INICIAL (coloca aquí tu proyecto)
// ========================================
const SUPABASE_URL = "https://pvlodyxttslpxbndmthm.supabase.co"; // <- reemplaza por tu URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bG9keXh0dHNscHhibmRtdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjAwOTAsImV4cCI6MjA3NDgzNjA5MH0.Szl3sOIzkY5Lc4UV-qUuK7lgp7Av_56gl0PK1HpiEwI"; // <- reemplaza por tu anon key (NO service_role)

// ========================================
// Estado global
// ========================================
let supabase = null;
let phoneData = [];
let isEditing = false;
let currentUserUUID = null; // ahora mantenido desde supabase.auth
let session = null;

// ========================================
// HELPERS
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
    user_id: rawPhone.user_id || null,
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

function showMessage(type, text) {
  const element = document.getElementById(type + "Message");
  if (!element) {
    // Fallback console if no UI element
    console[type === "error" ? "error" : "log"](text);
    return;
  }
  element.textContent = text;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

// ========================================
// INICIALIZACIÓN y AUTH
// ========================================
window.addEventListener("DOMContentLoaded", async () => {
  initSupabaseClient();
  attachAuthListeners();
  await restoreSessionAndLoad();
});

function initSupabaseClient() {
  // Usamos el SDK global window.supabase que provee @supabase/supabase-js en el HTML
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true },
  });
  console.info("Supabase client inicializado");
}

function attachAuthListeners() {
  // Escuchar cambios de sesión (login/logout)
  supabase.auth.onAuthStateChange((event, newSession) => {
    console.log("Auth event:", event);
    session = newSession;
    currentUserUUID = session?.user?.id ?? null;
    updateAuthUI();
    // Si hay sesión activa, recargar datos
    if (session?.user) loadData().catch((e) => console.error(e));
  });
}

async function restoreSessionAndLoad() {
  try {
    // Obtener sesión actual (según versión de supabase-js)
    // En versiones más nuevas: supabase.auth.getSession()
    const maybeSession =
      (await supabase.auth.getSession?.())?.data?.session ??
      supabase.auth.session?.();
    session = maybeSession ?? null;
    currentUserUUID = session?.user?.id ?? null;

    updateAuthUI();

    // Conectar y probar lectura pública (SELECT)
    const success = await testConnection();
    if (success) await loadData();
  } catch (error) {
    console.error("Error restaurando sesión:", error);
  }
}

function updateAuthUI() {
  const loggedIn = !!currentUserUUID;
  const userIdElem = document.getElementById("userId");
  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("appSection");

  if (userIdElem)
    userIdElem.textContent = loggedIn ? currentUserUUID : "No autenticado";
  if (authSection) authSection.style.display = loggedIn ? "none" : "block";
  if (appSection) appSection.style.display = loggedIn ? "block" : "none";

  updateConnectionStatus(!!supabase);
}

// ========================================
// CONEXIÓN A SUPABASE (prueba simple SELECT head)
// ========================================
async function testConnection() {
  if (!supabase) {
    showMessage("error", "⚠️ Cliente Supabase no inicializado");
    return false;
  }

  try {
    // Prueba de lectura (HEAD) para verificar conexión
    const { data, error } = await supabase
      .from("phones")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    showMessage("success", "✅ Conexión exitosa a Supabase (lectura)");
    updateConnectionStatus(true);
    return true;
  } catch (error) {
    console.error("Error de conexión:", error);
    showMessage("error", "❌ Error de conexión: " + (error.message || error));
    updateConnectionStatus(false);
    return false;
  }
}

function updateConnectionStatus(connected) {
  const status = document.getElementById("connectionStatus");
  if (!status) return;
  if (connected) {
    status.className = "connection-status connected";
    status.textContent = "✅ Conectado a Supabase";
  } else {
    status.className = "connection-status disconnected";
    status.textContent = "❌ Desconectado";
  }
}

// ========================================
// AUTENTICACIÓN: Login / Logout
// - Magic link (email) y Sign out
// ========================================
async function signInWithEmail() {
  const email = document.getElementById("authEmail")?.value?.trim();
  if (!email) {
    showMessage("error", "⚠️ Ingresa un email para iniciar sesión");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    showMessage(
      "success",
      `✅ Link de acceso enviado a ${email}. Revisa tu correo.`
    );
  } catch (error) {
    console.error("Error signIn:", error);
    showMessage("error", "❌ Error al iniciar sesión: " + error.message);
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    showMessage("success", "✅ Sesión cerrada");
    currentUserUUID = null;
    phoneData = [];
    updateDisplay();
    updateAuthUI();
  } catch (error) {
    console.error("Error signOut:", error);
    showMessage("error", "❌ Error al cerrar sesión: " + error.message);
  }
}

// ========================================
// CARGA DE DATOS
// ========================================
async function loadData() {
  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return;
  }

  document.getElementById("loadingIndicator").style.display = "block";

  try {
    // Para mostrar todo (SELECT público) usamos la policy existente.
    // Si cambias SELECT a owner-only, cambia esta consulta por `.eq('user_id', currentUserUUID)` si quieres solo datos del usuario
    const { data, error } = await supabase
      .from("phones")
      .select("*")
      .order("brand", { ascending: true });

    if (error) throw error;

    phoneData = (data || []).map(normalizePhoneData);

    updateDisplay();
    updateStats();
    showMessage(
      "success",
      `✅ ${phoneData.length} modelos cargados desde Supabase`
    );
  } catch (error) {
    console.error("Error al cargar datos:", error);
    showMessage(
      "error",
      "❌ Error al cargar datos: " + (error.message || error)
    );
    phoneData = [];
  } finally {
    document.getElementById("loadingIndicator").style.display = "none";
  }
}

// ========================================
// FORM SUBMIT (INSERT / UPDATE)
// ========================================
async function handleSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return;
  }

  const authUserId = supabase.auth.user()?.id;
  if (!authUserId) {
    showMessage("error", "⚠️ Debes iniciar sesión para realizar cambios");
    return;
  }

  const formData = new FormData(event.target);
  const editingId = document.getElementById("editingId").value;

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
    user_id: authUserId, // <-- usamos auth user id dinámico
  };

  try {
    if (editingId) {
      // Verificamos localmente que el registro pertenezca al usuario antes de intentar actualizar
      const existing = phoneData.find(
        (p) => String(p.id) === String(editingId)
      );
      if (existing && existing.user_id && existing.user_id !== authUserId) {
        showMessage("error", "❌ No autorizado para editar este registro");
        return;
      }

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
    console.error("Error en submit:", error);

    // Detectar problema RLS/permiso
    const errMsg = error?.message ?? JSON.stringify(error);
    if (
      errMsg.includes("policy") ||
      errMsg.includes("permission") ||
      error?.code === "42501"
    ) {
      showMessage(
        "error",
        "❌ UUID no autorizado. Verifica que estés logueado con el usuario correcto."
      );
    } else {
      showMessage("error", "❌ Error: " + errMsg);
    }
  }
}

// ========================================
// DELETE
// ========================================
async function deleteModel(id, brand, model) {
  if (!supabase) {
    showMessage("error", "⚠️ Primero configura la conexión a Supabase");
    return;
  }

  const authUserId = supabase.auth.user()?.id;
  if (!authUserId) {
    showMessage("error", "⚠️ Debes iniciar sesión para eliminar");
    return;
  }

  if (!confirm(`¿Estás seguro de eliminar ${brand} ${model}?`)) return;

  try {
    // Verificamos localmente propiedad
    const existing = phoneData.find((p) => String(p.id) === String(id));
    if (existing && existing.user_id && existing.user_id !== authUserId) {
      showMessage("error", "❌ No autorizado para eliminar este registro");
      return;
    }

    const { error } = await supabase.from("phones").delete().eq("id", id);

    if (error) throw error;

    showMessage("success", `✅ ${brand} ${model} eliminado`);
    await loadData();
  } catch (error) {
    console.error("Error al eliminar:", error);
    const errMsg = error?.message ?? JSON.stringify(error);
    if (
      errMsg.includes("policy") ||
      errMsg.includes("permission") ||
      error?.code === "42501"
    ) {
      showMessage(
        "error",
        "❌ UUID no autorizado para eliminar este registro."
      );
    } else {
      showMessage("error", "❌ Error: " + errMsg);
    }
  }
}

// ========================================
// EDIT / CLEAR FORM
// ========================================
function editModel(phone) {
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
  const form = document.getElementById("modelForm");
  if (form) form.reset();
  const editingInput = document.getElementById("editingId");
  if (editingInput) editingInput.value = "";
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.textContent = "AGREGAR MODELO";
}

// ========================================
// UI: renderización de cards y stats
// ========================================
function updateDisplay() {
  const grid = document.getElementById("modelsGrid");
  if (!grid) return;
  const searchTerm = (
    document.getElementById("searchBox")?.value || ""
  ).toLowerCase();

  const filteredPhones = phoneData.filter(
    (phone) =>
      (phone.brand || "").toLowerCase().includes(searchTerm) ||
      (phone.model || "").toLowerCase().includes(searchTerm)
  );

  if (filteredPhones.length === 0) {
    grid.innerHTML =
      '<p style="text-align: center; color: #666; padding: 40px;">No se encontraron modelos</p>';
    return;
  }

  grid.innerHTML = filteredPhones
    .map((phone) => {
      const safeBrand = (phone.brand || "").replace(/'/g, "\\'");
      const safeModel = (phone.model || "").replace(/'/g, "\\'");
      const payload = JSON.stringify(phone).replace(/'/g, "&#39;");
      return `
        <div class="model-card" data-phone='${payload}'>
          <h3>${phone.brand} ${phone.model}</h3>
          …          
          <div class="model-actions">
            <button class="btn btn-secondary btn-small js-edit">Editar</button>
            <button class="btn btn-danger btn-small js-delete"
              data-id="${phone.id}"
              data-brand="${safeBrand}"
              data-model="${safeModel}">
              Eliminar
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// Helper para llamar editModel desde el HTML generado (evita problemas con JSON en onclick)
window.__editModelFromCard = function (phone) {
  editModel(phone);
};

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

// ========================================
// EXPORTS (si los necesitas) o attach events
// ========================================
// Conectar el form submit
document.addEventListener("submit", function (e) {
  if (e.target && e.target.id === "modelForm") {
    handleSubmit(e);
  }
});

// Botones de auth (si existen en DOM)
document.addEventListener("click", function (e) {
  const id = e.target?.id;
  if (id === "btnSignIn") signInWithEmail();
  if (id === "btnSignOut") signOut();
  if (id === "btnRefresh") loadData();
});
