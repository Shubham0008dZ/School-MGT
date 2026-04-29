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

    document.getElementById('cc-cancel').addEventListener('click', () => {
        overlay.remove();
    });
    
    document.getElementById('cc-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

// ==========================================
// 0. ULTIMATE SAFEGUARD: INTERVAL SNIPER
// ==========================================
// If Vercel Service Workers or aggressive caching brings back the ghost HTML,
// this interval will mercilessly hunt it down and delete it from the DOM every 1 second.
setInterval(() => {
    document.querySelectorAll('.module-card').forEach(card => {
        let txt = card.textContent || card.innerText || "";
        if (txt.includes("Library") || txt.includes("Employee Attendance")) {
            card.remove(); 
        }
    });
}, 1000);


document.addEventListener('DOMContentLoaded', () => {
    
    // Immediate cleanup on load just to be absolutely sure
    document.querySelectorAll('.module-card').forEach(card => {
        let txt = card.textContent || card.innerText || "";
        if (txt.includes("Library") || txt.includes("Employee Attendance")) {
            card.remove(); 
        }
    });

    // ==========================================
    // 1. SECURITY CHECK: Verify Session
    // ==========================================
    const activeUserStr = localStorage.getItem('erp_active_user');
    
    if (!activeUserStr) {
        // If not logged in, force redirect to login page immediately
        window.location.href = 'login.html';
        return; 
    }

    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    
    try { 
        userRights = JSON.parse(activeUser.Rights_JSON || "[]"); 
    } catch(e) {
        console.error("Error parsing user rights:", e);
    }

    // ==========================================
    // 2. DYNAMIC USER NAME INJECTION
    // ==========================================
    const dashHeader = document.querySelector('.dashboard-header');
    if(dashHeader) {
        let nameBadge = document.createElement('div');
        nameBadge.style.cssText = "color:white; font-size:16px; font-weight:bold; margin-right:auto; margin-left:30px; background:#e67e22; padding:5px 15px; border-radius:4px;";
        nameBadge.innerHTML = `👤 Welcome, ${activeUser.empName}`;
        dashHeader.insertBefore(nameBadge, document.getElementById('btnLogout'));
    }

    // ==========================================
    // 3. ENFORCE RBAC ON DASHBOARD MODULE CARDS
    // ==========================================
    if (!isSA) {
        document.querySelectorAll('.module-card').forEach(card => {
            const reqMod = card.getAttribute('data-req-module');
            
            if (reqMod) {
                if (reqMod === "SUPER") {
                    // Only Super Admins can see this module (User Management)
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

    // ==========================================
    // 4. LOGOUT LOGIC
    // ==========================================
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
