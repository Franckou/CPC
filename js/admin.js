// ========================================
// ADMIN.JS - DisplaySync con Supabase Auth
// ========================================

(function () {
  "use strict";

  // ========================================
  // CONFIGURACIÓN INICIAL
  // ========================================

  let supabase = null;
  let phoneData = [];
  let currentUser = null;

  const SUPABASE_URL = "https://pvlodyxttslpxbndmthm.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2bG9keXh0dHNscHhibmRtdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjAwOTAsImV4cCI6MjA3NDgzNjA5MH0.Szl3sOIzkY5Lc4UV-qUuK7lgp7Av_56gl0PK1HpiEwI";

  // ========================================
  // SELECTORES DOM
  // ========================================

  const elements = {
    // Pantallas
    loginScreen: document.getElementById("loginScreen"),
    mainScreen: document.getElementById("mainScreen"),

    // Login
    loginForm: document.getElementById("loginForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    btnLogin: document.getElementById("btnLogin"),
    loginError: document.getElementById("loginError"),

    // Header
    userEmail: document.getElementById("userEmail"),
    btnLogout: document.getElementById("btnLogout"),
    connectionStatus: document.getElementById("connectionStatus"),

    // Mensajes
    successMessage: document.getElementById("successMessage"),
    errorMessage: document.getElementById("errorMessage"),

    // Tabs
    tabs: document.querySelectorAll(".tab"),
    tabContents: document.querySelectorAll(".tab-content"),

    // Formulario
    modelForm: document.getElementById("modelForm"),
    brand: document.getElementById("brand"),
    model: document.getElementById("model"),
    width: document.getElementById("width"),
    height: document.getElementById("height"),
    bisel: document.getElementById("bisel"), // ✅ CAMBIO: curvatura → bisel
    inches: document.getElementById("inches"),
    notchType: document.getElementById("notchType"),
    notchPosition: document.getElementById("notchPosition"), // ✅ NUEVO
    editingId: document.getElementById("editingId"),
    submitBtn: document.getElementById("submitBtn"),
    btnClearForm: document.getElementById("btnClearForm"),

    // Lista y búsqueda
    searchBox: document.getElementById("searchBox"),
    modelsGrid: document.getElementById("modelsGrid"),
    loadingIndicator: document.getElementById("loadingIndicator"),

    // Estadísticas
    totalModels: document.getElementById("totalModels"),
    totalBrands: document.getElementById("totalBrands"),
    totalSizes: document.getElementById("totalSizes"),

    // Perfil
    profileEmail: document.getElementById("profileEmail"),
    profileUUID: document.getElementById("profileUUID"),
    profileLoginTime: document.getElementById("profileLoginTime"),
  };

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
      bisel: parseFloat(rawPhone.bisel) || 0, // ✅ CAMBIO: curvatura_mm → bisel
      inches: parseFloat(rawPhone.inches) || 0,
      notch_type: rawPhone.notch_type || "none",
      notch_position: rawPhone.notch_position || 2, // ✅ NUEVO
      user_id: rawPhone.user_id || null,
    };
  }

  // ========================================
  // MENSAJES
  // ========================================

  function showMessage(type, text) {
    const element =
      type === "success" ? elements.successMessage : elements.errorMessage;

    element.textContent = text;
    element.style.display = "block";

    setTimeout(() => {
      element.style.display = "none";
    }, 4000);
  }

  function showLoginError(text) {
    elements.loginError.textContent = text;
    elements.loginError.style.display = "block";

    setTimeout(() => {
      elements.loginError.style.display = "none";
    }, 5000);
  }

  // ========================================
  // AUTENTICACIÓN
  // ========================================

  async function handleLogin(event) {
    event.preventDefault();

    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;

    if (!email || !password) {
      showLoginError("Por favor completa todos los campos");
      return;
    }

    elements.btnLogin.disabled = true;
    elements.btnLogin.textContent = "Iniciando sesión...";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      console.log("✅ Login exitoso:", data.user.email);

      currentUser = data.user;
      await showMainScreen();
    } catch (error) {
      console.error("❌ Error en login:", error);

      if (error.message.includes("Invalid login credentials")) {
        showLoginError("❌ Email o contraseña incorrectos");
      } else if (error.message.includes("Email not confirmed")) {
        showLoginError("⚠️ Por favor confirma tu email primero");
      } else {
        showLoginError("❌ Error: " + error.message);
      }
    } finally {
      elements.btnLogin.disabled = false;
      elements.btnLogin.textContent = "🔐 INICIAR SESIÓN";
    }
  }

  async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      currentUser = null;
      showLoginScreen();
      console.log("✅ Sesión cerrada");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      showMessage("error", "Error al cerrar sesión");
    }
  }

  async function checkSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session && session.user) {
        console.log("✅ Sesión activa encontrada:", session.user.email);
        currentUser = session.user;
        await showMainScreen();
      } else {
        console.log("⚠️ No hay sesión activa");
        showLoginScreen();
      }
    } catch (error) {
      console.error("Error al verificar sesión:", error);
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    elements.loginScreen.style.display = "flex";
    elements.mainScreen.style.display = "none";
    elements.loginForm.reset();
  }

  async function showMainScreen() {
    elements.loginScreen.style.display = "none";
    elements.mainScreen.style.display = "block";

    // Actualizar info del usuario
    elements.userEmail.textContent = currentUser.email;
    elements.profileEmail.textContent = currentUser.email;
    elements.profileUUID.textContent = currentUser.id;
    elements.profileLoginTime.textContent = new Date().toLocaleString();

    // Cargar datos
    await loadData();
  }

  // ========================================
  // GESTIÓN DE DATOS
  // ========================================

  async function loadData() {
    if (!supabase || !currentUser) {
      showMessage("error", "⚠️ No hay sesión activa");
      return;
    }

    elements.loadingIndicator.style.display = "block";

    try {
      const { data, error } = await supabase
        .from("phones")
        .select("*")
        .order("brand", { ascending: true });

      if (error) throw error;

      phoneData = (data || []).map(normalizePhoneData);

      updateDisplay();
      updateStats();
      console.log(`✅ ${phoneData.length} modelos cargados`);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      showMessage("error", "❌ Error al cargar datos: " + error.message);
      phoneData = [];
    } finally {
      elements.loadingIndicator.style.display = "none";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supabase || !currentUser) {
      showMessage("error", "⚠️ No hay sesión activa");
      return;
    }

    const formData = new FormData(event.target);
    const editingId = elements.editingId.value;

    const height = parseFloat(formData.get("height"));
    const width = parseFloat(formData.get("width"));
    const bisel = parseFloat(formData.get("bisel")); // ✅ CAMBIO: curvatura → bisel
    const inches = parseFloat(formData.get("inches"));

    if (height <= 0 || width <= 0 || bisel < 0) {
      showMessage("error", "❌ Las dimensiones deben ser valores positivos");
      return;
    }

    if (inches <= 0) {
      showMessage("error", "❌ Las pulgadas deben ser un valor positivo");
      return;
    }

    const phoneModel = {
      brand: formData.get("brand").trim(),
      model: formData.get("model").trim(),
      height_mm: height,
      width_mm: width,
      bisel: bisel, // ✅ CAMBIO: curvatura_mm → bisel
      inches: inches,
      notch_type: formData.get("notchType"),
      notch_position: parseInt(formData.get("notchPosition")) || 2, // ✅ NUEVO
      user_id: currentUser.id,
    };

    console.log("📤 Enviando modelo:", phoneModel);

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

      if (
        error.message.includes("policy") ||
        error.message.includes("permission") ||
        error.code === "42501"
      ) {
        showMessage(
          "error",
          "❌ No tienes permisos. Verifica que hayas iniciado sesión correctamente."
        );
      } else {
        showMessage("error", "❌ Error: " + error.message);
      }
    }
  }

  async function deleteModel(id, brand, model) {
    if (!currentUser) {
      showMessage("error", "⚠️ Debes iniciar sesión");
      return;
    }

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

      if (
        error.message.includes("policy") ||
        error.message.includes("permission") ||
        error.code === "42501"
      ) {
        showMessage(
          "error",
          "❌ No puedes eliminar este registro (no eres el creador)."
        );
      } else {
        showMessage("error", "❌ Error: " + error.message);
      }
    }
  }

  function editModel(phone) {
    elements.brand.value = phone.brand;
    elements.model.value = phone.model;
    elements.width.value = phone.width_mm;
    elements.height.value = phone.height_mm;
    elements.bisel.value = phone.bisel; // ✅ CAMBIO: curvatura → bisel
    elements.inches.value = phone.inches;
    elements.notchType.value = phone.notch_type;
    elements.editingId.value = phone.id;

    // ✅ NUEVO: Mostrar selector de posición si es punch-hole
    if (phone.notch_type === 'punch-hole') {
      const notchPositionGroup = document.getElementById('notchPositionGroup');
      if (notchPositionGroup) {
        notchPositionGroup.style.display = 'block';
        elements.notchPosition.value = phone.notch_position || 2;
      }
    } else {
      const notchPositionGroup = document.getElementById('notchPositionGroup');
      if (notchPositionGroup) {
        notchPositionGroup.style.display = 'none';
      }
    }

    elements.submitBtn.textContent = "ACTUALIZAR MODELO";

    showMessage("success", "📝 Modo edición activado");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    elements.modelForm.reset();
    elements.editingId.value = "";
    elements.submitBtn.textContent = "AGREGAR MODELO";
    
    // ✅ NUEVO: Ocultar selector de posición al limpiar
    const notchPositionGroup = document.getElementById('notchPositionGroup');
    if (notchPositionGroup) {
      notchPositionGroup.style.display = 'none';
    }
  }

  // ========================================
  // INTERFAZ
  // ========================================

  function updateDisplay() {
    const searchTerm = elements.searchBox.value.toLowerCase();

    const filteredPhones = phoneData.filter(
      (phone) =>
        phone.brand.toLowerCase().includes(searchTerm) ||
        phone.model.toLowerCase().includes(searchTerm)
    );

    if (filteredPhones.length === 0) {
      elements.modelsGrid.innerHTML =
        '<p style="text-align: center; color: #666; padding: 40px;">No se encontraron modelos</p>';
      return;
    }

    elements.modelsGrid.innerHTML = filteredPhones
      .map(
        (phone) => `
        <div class="model-card">
            <h3>${phone.brand} ${phone.model}</h3>
            <div class="model-info">
                <p><strong>Ancho:</strong> <span>${phone.width_mm} mm</span></p>
                <p><strong>Alto:</strong> <span>${phone.height_mm} mm</span></p>
                <p><strong>Bisel:</strong> <span>${phone.bisel} mm</span></p>
                <p><strong>Pulgadas:</strong> <span>${phone.inches}"</span></p>
                <p><strong>Notch:</strong> <span>${phone.notch_type}</span></p>
                ${phone.notch_type === 'punch-hole' ? `<p><strong>Posición:</strong> <span>${phone.notch_position === 1 ? '⬅️ Izquierda' : phone.notch_position === 3 ? '➡️ Derecha' : '⬆️ Centro'}</span></p>` : ''}
                <p><strong>ID:</strong> <span>#${phone.id}</span></p>
            </div>
            <div class="model-actions">
                <button class="btn btn-secondary btn-small btn-edit" data-phone='${JSON.stringify(
                  phone
                ).replace(/'/g, "&#39;")}'>Editar</button>
                <button class="btn btn-danger btn-small btn-delete" data-id="${
                  phone.id
                }" data-brand="${phone.brand.replace(
          /'/g,
          "&#39;"
        )}" data-model="${phone.model.replace(/'/g, "&#39;")}">Eliminar</button>
            </div>
        </div>
    `
      )
      .join("");
  }

  function updateStats() {
    elements.totalModels.textContent = phoneData.length;

    const brands = [...new Set(phoneData.map((phone) => phone.brand))];
    elements.totalBrands.textContent = brands.length;

    const sizes = [
      ...new Set(
        phoneData.map((phone) => `${phone.width_mm}x${phone.height_mm}`)
      ),
    ];
    elements.totalSizes.textContent = sizes.length;
  }

  function showTab(tabName) {
    elements.tabContents.forEach((content) => {
      content.classList.remove("active");
    });

    elements.tabs.forEach((tab) => {
      tab.classList.remove("active");
    });

    const targetContent = document.getElementById(tabName);
    if (targetContent) {
      targetContent.classList.add("active");
    }

    elements.tabs.forEach((tab) => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add("active");
      }
    });
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  // Login
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.btnLogout.addEventListener("click", handleLogout);

  // Formulario
  elements.modelForm.addEventListener("submit", handleSubmit);
  elements.btnClearForm.addEventListener("click", clearForm);

  // Búsqueda
  elements.searchBox.addEventListener("input", updateDisplay);

  // Tabs
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.dataset.tab;
      showTab(tabName);
    });
  });

  // Delegación de eventos para botones en la grilla
  elements.modelsGrid.addEventListener("click", function (e) {
    // Botón Editar
    if (e.target.classList.contains("btn-edit")) {
      try {
        const phoneData = JSON.parse(e.target.dataset.phone);
        editModel(phoneData);
      } catch (error) {
        console.error("Error al parsear datos del teléfono:", error);
        showMessage("error", "❌ Error al cargar datos para edición");
      }
    }

    // Botón Eliminar
    if (e.target.classList.contains("btn-delete")) {
      const id = parseInt(e.target.dataset.id);
      const brand = e.target.dataset.brand;
      const model = e.target.dataset.model;
      deleteModel(id, brand, model);
    }
  });

  // ✅ NUEVO: Mostrar/ocultar selector de posición según tipo de notch
  if (elements.notchType) {
    elements.notchType.addEventListener('change', function() {
      const notchPositionGroup = document.getElementById('notchPositionGroup');
      if (notchPositionGroup) {
        if (this.value === 'punch-hole') {
          notchPositionGroup.style.display = 'block';
        } else {
          notchPositionGroup.style.display = 'none';
        }
      }
    });
  }

  // ========================================
  // LISTENER DE CAMBIOS DE AUTENTICACIÓN
  // ========================================

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Escuchar cambios en el estado de autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔐 Auth event:", event);

    if (event === "SIGNED_IN" && session) {
      currentUser = session.user;
      console.log("✅ Usuario autenticado:", currentUser.email);
    } else if (event === "SIGNED_OUT") {
      currentUser = null;
      showLoginScreen();
      console.log("🚪 Usuario desconectado");
    } else if (event === "TOKEN_REFRESHED") {
      console.log("🔄 Token renovado");
    }
  });

  // ========================================
  // INICIALIZACIÓN
  // ========================================

  async function init() {
    console.log("🚀 Inicializando DisplaySync Admin Panel...");

    // Verificar sesión existente
    await checkSession();

    console.log("✅ DisplaySync Admin Panel inicializado");
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exponer funciones necesarias globalmente (solo para debugging)
  window.displaySyncAdmin = {
    reloadData: loadData,
    showTab: showTab,
    getCurrentUser: () => currentUser,
  };
})();
