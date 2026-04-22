// CUSTOM NON-NATIVE CONFIRM MODAL (NO BROWSER PROMPTS)
function customConfirm(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;">
            <h3 style="margin-top:0;color:#2c3e50;">Confirm Action</h3>
            <p style="color:#555;margin-bottom:20px;">${message}</p>
            <div style="display:flex;justify-content:center;gap:10px;">
                <button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button>
                <button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Yes, Logout</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('cc-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('cc-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. SECURITY CHECK: Verify Session
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) {
        window.location.href = 'login.html';
        return;
    }

    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    // 2. ENFORCE RBAC (ROLE BASED ACCESS CONTROL) ON DASHBOARD
    if (!isSA) {
        document.querySelectorAll('.module-card').forEach(card => {
            const reqMod = card.getAttribute('data-req-module');
            if (reqMod) {
                if (reqMod === "SUPER") {
                    // Only Super Admins can see this
                    card.style.display = 'none';
                } else {
                    // Hide if user doesn't have ANY right starting with the module code
                    const hasAccess = userRights.some(r => r.startsWith(reqMod + "_"));
                    if(!hasAccess) {
                        card.style.display = 'none';
                    }
                }
            }
        });
    }

    // 3. LOGOUT LOGIC
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm("Are you sure you want to logout securely?", () => {
                localStorage.removeItem('erp_active_user');
                window.location.href = 'login.html';
            });
        });
    }
});
