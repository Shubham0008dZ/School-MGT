window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
};

document.addEventListener('DOMContentLoaded', () => {
    
    // SECURITY & RBAC
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    // REPLACE WITH ACTUAL SCRIPT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    // VERIFY SESSION
    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => console.log("Background sync paused.", err));

    // CHECK RIGHTS FOR HOMEWORK (Using HW prefix)
    if (!isSA && !userRights.some(r => r.startsWith("HW_"))) { window.location.href = 'index.html'; return; }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { customConfirm("Are you sure you want to logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });
    }

    // SET DEFAULT DATE
    document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];

    // FETCH CLASSES AND SECTIONS FROM DB
    function loadSetupData() {
        fetch(scriptURL, { redirect: "follow" })
        .then(res => res.json())
        .then(res => {
            if(res.status === "Success" && res.setup) { 
                const setupData = res.setup;
                
                const fClassDropdown = document.getElementById('hwClass');
                const fSecDropdown = document.getElementById('hwSection');
                
                let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))];
                uniqueClasses.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
                
                fClassDropdown.innerHTML = '<option value="">Select Class</option>';
                uniqueClasses.forEach(item => { fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; });

                fClassDropdown.addEventListener('change', function() {
                    let selClass = this.value;
                    fSecDropdown.innerHTML = '<option value="">Select Section</option>';
                    if(selClass) {
                        let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                        let uniqueSecs = [...new Set(filteredSecs)].sort(); 
                        uniqueSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
                    }
                });
            }
        });
    }

    loadSetupData();

    // FILE ATTACHMENT TO BASE64
    const hwFileInput = document.getElementById('hwFile');
    if(hwFileInput) {
        hwFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                document.getElementById('hwFileName').innerText = file.name;
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('hwBase64').value = e.target.result;
                }
                reader.readAsDataURL(file);
            } else {
                document.getElementById('hwFileName').innerText = "No file selected";
                document.getElementById('hwBase64').value = "";
            }
        });
    }

    // DATE FORMATTER (Strict Rule)
    function formatToDDMMYYYY(dateString) {
        if(!dateString) return ""; const d = new Date(dateString); if(isNaN(d.getTime())) return dateString;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    }

    // FORM SUBMISSION
    const hwForm = document.getElementById('assignmentForm');
    if(hwForm) {
        hwForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSaveHw');
            btn.innerText = "Saving..."; btn.disabled = true;

            const payload = {
                action: "saveAssignment",
                data: {
                    acadYear: document.getElementById('acadYear').value,
                    date: formatToDDMMYYYY(document.getElementById('hwDate').value),
                    class: document.getElementById('hwClass').value,
                    section: document.getElementById('hwSection').value,
                    subject: document.getElementById('hwSubject').value,
                    type: document.getElementById('hwType').value,
                    name: document.getElementById('hwName').value,
                    studentWise: document.getElementById('hwStudentWise').checked,
                    description: document.getElementById('hwDesc').value,
                    attachmentBase64: document.getElementById('hwBase64').value,
                    submissionReq: document.getElementById('hwSubmissionReq').checked,
                    createdBy: activeUser.empId
                }
            };

            fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    alert(data.message);
                    hwForm.reset();
                    document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];
                    document.getElementById('hwFileName').innerText = "No file selected";
                    document.getElementById('hwBase64').value = "";
                } else {
                    alert("Error: " + data.message);
                }
            }).catch(err => {
                alert("Failed to save assignment. Please check connection.");
            }).finally(() => {
                btn.innerText = "Save Assignment"; btn.disabled = false;
            });
        });
    }
});
