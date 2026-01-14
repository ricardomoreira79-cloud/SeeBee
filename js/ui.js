export const ui = {
    // Screens
    screenLogin: document.querySelector("#auth-screen"),
    screenApp: document.querySelector("#app-screen"),
    sideMenu: document.querySelector("#side-menu"),
    openMenu: document.querySelector("#open-menu"),
    closeMenu: document.querySelector("#close-menu"),
    btnLogout: document.querySelector("#btnLogout"),
    
    // Auth
    email: document.querySelector("#email"),
    password: document.querySelector("#password"),
    btnLogin: document.querySelector("#btnLogin"),
    btnSignup: document.querySelector("#btnSignup"),
    btnGoogle: document.querySelector("#btnGoogle"),
    authMsg: document.querySelector("#authMsg"),
    
    // Profile
    userRole: document.querySelector("#userRole"),
    meliponicultorFields: document.querySelector("#meliponicultor-fields"),
    personType: document.querySelector("#personType"),
    cnpjField: document.querySelector("#cnpj-field"),
    menuEmailDisplay: document.querySelector("#menu-email-display"),
    menuAvatarChar: document.querySelector("#menu-avatar-char"),

    // Trails
    btnStartRoute: document.querySelector("#btnStartRoute"),
    btnFinishRoute: document.querySelector("#btnFinishRoute"),
    btnMarkNest: document.querySelector("#btnMarkNest"),
    distanceText: document.querySelector("#distanceText"),
    nestsCountText: document.querySelector("#nestsCountText"),
    routeHint: document.querySelector("#routeHint"),
    trailsSummary: document.querySelector("#trailsSummary"),

    // Modal
    modalNest: document.querySelector("#nest-modal"),
    nestNote: document.querySelector("#nestNote"),
    nestPhoto: document.querySelector("#nestPhoto"),
    btnConfirmNest: document.querySelector("#btnConfirmNest"),
    nestCancel: document.querySelector("#nestCancel"),

    // Status
    onlineDot: document.querySelector("#onlineDot"),
    onlineText: document.querySelector("#onlineText"),
    statusPill: document.querySelector("#statusPill")
};

export function switchTab(targetId) {
    document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden"));
    document.getElementById(targetId)?.classList.remove("hidden");
    
    document.querySelectorAll(".menu-item").forEach(m => {
        m.classList.toggle("active", m.dataset.target === targetId);
    });
}

export function toast(el, msg) {
    el.textContent = msg;
    el.className = "hint-box ok";
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
}

export function closeNestModal() {
    ui.modalNest.style.display = "none";
    ui.nestNote.value = "";
    ui.nestPhoto.value = "";
}