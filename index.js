function customConfirm(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><h3 style="margin-top:0;color:#2c3e50;">Confirm Action</h3><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Yes, Logout</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => { overlay.remove(); });
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
}

const nukeUnwantedModules = () => {
    document.querySelectorAll('a, .module-card, div').forEach(el => {
        const txt = el.textContent || "";
        if ((txt.includes("Library Management") || txt.includes("Employee Attendance")) && !el.hasAttribute('data-status') && el.tagName !== "SCRIPT" && el.id !== "mainModulesGrid" && el.tagName !== "BODY" && el.tagName !== "HTML") {
            el.remove(); 
        }
    });
};
const observer = new MutationObserver((mutations) => { nukeUnwantedModules(); });
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', () => {
    nukeUnwantedModules();
    document.querySelectorAll('.module-card').forEach(card => {
        let textCheck = card.textContent || card.innerText || "";
        if (textCheck.indexOf("Library") !== -1 || textCheck.indexOf("Employee Attendance") !== -1) { card.parentNode.removeChild(card); }
    });

    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }

    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    // REAL-TIME SESSION VERIFICATION (KICKS OUT DELETED USERS)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ action: "verifySession", empId: activeUser.empId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user');
            window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) {
            localStorage.setItem('erp_active_user', JSON.stringify(data.user)); // Silent sync
        }
    }).catch(err => console.log("Background sync paused."));

    const dashHeader = document.querySelector('.dashboard-header');
    if(dashHeader) {
        let nameBadge = document.createElement('div');
        nameBadge.style.cssText = "color:white; font-size:16px; font-weight:bold; margin-right:auto; margin-left:30px; background:#e67e22; padding:5px 15px; border-radius:4px;";
        nameBadge.innerHTML = `👤 Welcome, ${activeUser.empName}`;
        dashHeader.insertBefore(nameBadge, document.getElementById('btnLogout'));
    }

    if (!isSA) {
        document.querySelectorAll('.module-card').forEach(card => {
            const reqMod = card.getAttribute('data-req-module');
            if (reqMod) {
                if (reqMod === "SUPER") { card.style.display = 'none'; } 
                else {
                    const hasAccess = userRights.some(r => r.startsWith(reqMod + "_"));
                    if(!hasAccess) { card.style.display = 'none'; }
                }
            }
        });
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm("Are you sure you want to logout securely?", () => {
                localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
            });
        });
    }
});
