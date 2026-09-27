document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. SESSION & SECURITY INITIALIZATION
    // ==========================================
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { 
        window.location.href = 'login.html'; 
        return; 
    }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    
    try { 
        userRights = JSON.parse(activeUser.Rights_JSON || "[]"); 
    } catch(e) {
        console.error("Failed to parse user rights:", e);
    }

    // REPLACE WITH YOUR ACTUAL GOOGLE SCRIPT URL
// DYNAMIC SCRIPT URL FROM MULTI-TENANT LOGIN
const scriptURL = localStorage.getItem('erp_school_url');
if(!scriptURL) { window.location.href = 'login.html'; }







// DYNAMIC NAVBAR UPDATE LOGIC (Immediate Execution Fix)
try {
    let savedName = localStorage.getItem('erp_school_name');
    let savedLogo = localStorage.getItem('erp_school_logo');
    
    let navNameEl = document.getElementById('dynamicNavName');
    let navLogoImg = document.getElementById('dynamicNavLogo');
    let navLogoDefault = document.getElementById('defaultNavLogo');
    
    // School Name Update
    if(savedName && navNameEl) {
        navNameEl.innerText = savedName; 
    }
    
    // School Logo Update
    if(savedLogo && savedLogo.startsWith('http') && navLogoImg) {
        navLogoImg.src = savedLogo;
        navLogoImg.style.display = 'inline-block';
        if(navLogoDefault) navLogoDefault.style.display = 'none';
    }
} catch(error) {
    console.error("Navbar logic failed:", error);
}


    

    
    if (!isSA && !userRights.some(r => r.startsWith("SUPER"))) { 
        window.location.href = 'index.html'; 
        return; 
    }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { 
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem('erp_active_user'); 
                window.location.href = 'login.html'; 
            }
        });
    }

    let allEmployees = [];
    let allStudents = [];

    // ==========================================
    // 2. NAVIGATION TABS LOGIC
    // ==========================================
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; 
            e.preventDefault();
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); 
            
            const targetId = this.getAttribute('data-target'); 
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            document.getElementById(targetId).classList.add('active-module');
        });
    });

    // ==========================================
    // 3. DATA FETCH & INITIALIZATION
    // ==========================================
    function initData() {
        document.getElementById('userTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        document.getElementById('studentUserTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        
        fetch(scriptURL, { redirect: "follow" })
        .then(res => res.json())
        .then(res => {
            if(res.status === "Success") {
                allEmployees = res.employees || [];
                allStudents = res.data || [];
                renderEmployeeTable(allEmployees);
                renderStudentTable(allStudents);
            } else {
                console.error("Database sync failed.", res.message);
                alert("Failed to sync database: " + res.message);
            }
        }).catch(err => {
            console.error("Network issue during sync.", err);
        });
    }

    if(document.getElementById('btnSyncUsers')) {
        document.getElementById('btnSyncUsers').addEventListener('click', initData);
    }

    // ==========================================
    // 4. EMPLOYEE TABLE RENDER & SEARCH
    // ==========================================
    function renderEmployeeTable(list) {
        const tbody = document.getElementById('userTableBody'); 
        tbody.innerHTML = '';
        
        if(list.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No employees found.</td></tr>'; 
            return; 
        }
        
        list.forEach((emp, idx) => {
            let badge = emp.Is_SuperAdmin === "Yes" ? `<span class="badge-admin">Yes</span>` : `<span class="badge-user">No</span>`;
            
            // Explicitly converting empId to String to ensure HTML template literals do not break on numbers
            let safeEmpId = String(emp.empId).trim();
            
            tbody.innerHTML += `<tr>
                <td>${idx + 1}</td>
                <td><b>${safeEmpId}</b></td>
                <td>${emp.empName}</td>
                <td>${emp.empDept || '-'}</td>
                <td>${emp.empDesig || '-'}</td>
                <td>${badge}</td>
                <td>
                    <button class="btn-action-rights" onclick='openDetailedRightsModal("${safeEmpId}")'>✏️ Assign Rights</button>
                    <button class="btn-action-auth" onclick='openDetailedAuthModal("${safeEmpId}")'>🔑 Send Auth</button>
                </td>
            </tr>`;
        });
    }

    // FIXED: Search filter crashing on numbers bug resolved via explicit String conversion
    if(document.getElementById('searchEmpUser')) {
        document.getElementById('searchEmpUser').addEventListener('input', function() {
            let filterText = this.value.toLowerCase();
            let filteredList = allEmployees.filter(e => {
                let nameMatch = String(e.empName || "").toLowerCase().includes(filterText);
                let idMatch = String(e.empId || "").toLowerCase().includes(filterText);
                return nameMatch || idMatch;
            });
            renderEmployeeTable(filteredList);
        });
    }

    // =======================================================
    // 5. COMPLEX ASSIGN RIGHTS LOGIC (CAPSULES & ARRAYS)
    // =======================================================
    let currentRightsEmpId = null;

    window.openDetailedRightsModal = function(empId) {
        // FIXED: Universal Type Caster to support both old numeric IDs and new string IDs
        let targetIdStr = String(empId).trim();
        
        let emp = allEmployees.find(e => String(e.empId).trim() === targetIdStr);
        
        if(!emp) {
            console.error("Modal Error: Employee not found in dataset for ID:", targetIdStr);
            alert("Error: Employee data could not be found.");
            return;
        }

        currentRightsEmpId = emp.empId; // Preserve original type for backend
        
        document.getElementById('rightsEmpId').innerText = String(emp.empId);
        document.getElementById('rightsEmpName').innerText = emp.empName || "Unknown";

        // Reset all toggles safely
        document.getElementById('toggleSuperAdmin').checked = false;
        document.querySelectorAll('.right-chk').forEach(chk => {
            chk.checked = false;
            chk.disabled = false;
        });

        // Set Super Admin Status Override
        if(emp.Is_SuperAdmin === "Yes") {
            document.getElementById('toggleSuperAdmin').checked = true;
            document.querySelectorAll('.right-chk').forEach(chk => { 
                chk.checked = true; 
                chk.disabled = true; 
            }); 
        }

        // Set Granular Array Rights
        try {
            let currentRights = JSON.parse(emp.Rights_JSON || "[]");
            if(Array.isArray(currentRights)) {
                document.querySelectorAll('.right-chk').forEach(chk => {
                    if(currentRights.includes(chk.value)) {
                        chk.checked = true;
                    }
                });
            }
        } catch(e) {
            console.error("Rights parsing error:", e);
        }

        document.getElementById('assignRightsModal').style.display = 'flex';
    };

    // Super Admin Toggle override behavior
    let toggleSuperAdminEl = document.getElementById('toggleSuperAdmin');
    if(toggleSuperAdminEl) {
        toggleSuperAdminEl.addEventListener('change', function() {
            let isSuper = this.checked;
            document.querySelectorAll('.right-chk').forEach(chk => {
                if(isSuper) { 
                    chk.checked = true; 
                    chk.disabled = true; 
                } else { 
                    chk.checked = false; 
                    chk.disabled = false; 
                }
            });
        });
    }

    let btnSaveRightsEl = document.getElementById('btnSaveRights');
    if(btnSaveRightsEl) {
        btnSaveRightsEl.addEventListener('click', function() {
            if(!currentRightsEmpId) {
                alert("Missing Employee ID context.");
                return;
            }
            
            let isSuper = document.getElementById('toggleSuperAdmin').checked;
            let selectedRights = [];
            
            if(!isSuper) {
                document.querySelectorAll('.right-chk:checked').forEach(chk => {
                    selectedRights.push(chk.value);
                });
            }

            this.innerText = "Saving..."; 
            this.disabled = true;

            fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "saveUserRights",
                    empId: currentRightsEmpId,
                    isSuperAdmin: isSuper,
                    rights: selectedRights
                }),
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" }
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    alert(data.message);
                    document.getElementById('assignRightsModal').style.display = 'none';
                    initData(); // Refresh table to show updated status
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(err => {
                console.error("Error saving rights:", err);
                alert("Network error occurred while saving rights.");
            })
            .finally(() => { 
                this.innerText = "💾 Save Rights"; 
                this.disabled = false; 
            });
        });
    }

    // =======================================================
    // 6. COMPLEX SEND AUTH LOGIC (2 OPTIONS)
    // =======================================================
    window.openDetailedAuthModal = function(empId) {
        // FIXED: Universal Type Caster applied here as well
        let targetIdStr = String(empId).trim();
        
        let emp = allEmployees.find(e => String(e.empId).trim() === targetIdStr);
        
        if(!emp) {
            console.error("Auth Modal Error: Employee not found for ID:", targetIdStr);
            alert("Error: Employee data could not be found.");
            return;
        }
        
        if(!emp.empEmail || String(emp.empEmail).trim() === "") {
            alert("Error: This employee does not have a registered Email ID in the system.");
            return;
        }

        document.getElementById('authEmpName').innerText = emp.empName;
        document.getElementById('authTargetId').value = emp.empId; // Original format
        document.getElementById('authTargetEmail').value = emp.empEmail;
        
        // Reset modal fields strictly
        let autoOpt = document.querySelector('input[name="authOpt"][value="auto"]');
        if(autoOpt) autoOpt.checked = true;
        
        document.getElementById('customUid').value = "";
        document.getElementById('customPass').value = "";
        
        // Explicitly call toggle to hide manual inputs
        if(typeof toggleManualAuthInputs === 'function') {
            toggleManualAuthInputs();
        }

        document.getElementById('authModal').style.display = 'flex';
    };

    let btnSendAuthNowEl = document.getElementById('btnSendAuthNow');
    if(btnSendAuthNowEl) {
        btnSendAuthNowEl.addEventListener('click', function() {
            const rawEmpId = document.getElementById('authTargetId').value;
            
            // Re-verify existence using string matching
            const emp = allEmployees.find(e => String(e.empId).trim() === String(rawEmpId).trim());
            if(!emp) return;

            let checkedOpt = document.querySelector('input[name="authOpt"]:checked');
            if(!checkedOpt) return;
            
            const authOptValue = checkedOpt.value;
            let selectedOptionId = (authOptValue === "auto") ? 2 : 1; 
            
            let customUid = "";
            let customPass = "";

            if(authOptValue === "manual") {
                customUid = document.getElementById('customUid').value.trim();
                customPass = document.getElementById('customPass').value.trim();
                if(!customUid || !customPass) {
                    alert("Validation Error: Please fill both Custom User ID and Custom Password.");
                    return;
                }
            }

            this.innerText = "Sending..."; 
            this.disabled = true;

            const loginUrl = window.location.origin + window.location.pathname.replace('user.html', 'login.html');

            const payload = {
                action: "sendUserCredentials",
                empId: emp.empId,
                empName: emp.empName,
                empEmail: emp.empEmail,
                option: selectedOptionId,
                customUid: customUid,
                customPass: customPass,
                loginUrl: loginUrl
            };

            fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify(payload),
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" }
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    alert(data.message);
                    document.getElementById('authModal').style.display = 'none';
                    initData(); 
                } else {
                    alert("Server Error: " + data.message);
                }
            })
            .catch(err => {
                console.error("Auth send error:", err);
                alert("Network Error: Could not send credentials.");
            })
            .finally(() => { 
                this.innerText = "✉️ Send Credentials"; 
                this.disabled = false; 
            });
        });
    }

    // ==========================================
    // 7. STUDENT TABLE RENDER & SEARCH
    // ==========================================
    function renderStudentTable(list) {
        const tbody = document.getElementById('studentUserTableBody'); 
        tbody.innerHTML = '';
        
        if(list.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No students found in SIS.</td></tr>'; 
            return; 
        }
        
        list.forEach((st, idx) => {
            let uid = st.Login_ID || `<span style="color:#e74c3c;">Pending Sync</span>`;
            let pin = st.Password || `---`;
            let maskPin = pin !== `---` ? `********` : `---`;
            
            let sClass = "-";
            if(st.studentClass) {
                let match = String(st.studentClass).match(/(.*?)\s*\((.*?)\)/);
                if(match) { 
                    sClass = match[1].trim() + " (" + match[2].trim() + ")"; 
                } else { 
                    sClass = st.studentClass; 
                }
            }

            let safeRegNo = String(st.regNo).trim();

            tbody.innerHTML += `<tr>
                <td>${idx + 1}</td>
                <td><b>${safeRegNo}</b></td>
                <td>${st.studentFirstName || st.studentName}</td>
                <td>${sClass}</td>
                <td><b style="color:#2980b9;">${uid}</b></td>
                <td><span style="letter-spacing:1px; background:#f1f1f1; padding:3px 6px; border:1px solid #ddd;">${maskPin}</span></td>
                <td>
                    <button style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:3px; cursor:pointer; font-weight:bold;" onclick='resendStudentAuth("${safeRegNo}")'>🔑 Resend Credentials</button>
                </td>
            </tr>`;
        });
    }

    // FIXED: Search filter crashing on numbers bug resolved via explicit String conversion
    if(document.getElementById('searchStudentUser')) {
        document.getElementById('searchStudentUser').addEventListener('input', function() {
            let filterText = this.value.toLowerCase();
            let filteredList = allStudents.filter(s => {
                let nameMatch = String(s.studentFirstName || s.studentName || "").toLowerCase().includes(filterText);
                let loginMatch = String(s.Login_ID || "").toLowerCase().includes(filterText);
                let regMatch = String(s.regNo || "").toLowerCase().includes(filterText);
                return nameMatch || loginMatch || regMatch;
            });
            renderStudentTable(filteredList);
        });
    }

    // Student Credentials Resend Logic (Uses same API concept as SIS admission)
    window.resendStudentAuth = function(regNo) {
        let safeRegNo = String(regNo).trim();
        alert("Action triggered for Reg No: " + safeRegNo + ". Auto-emailing capabilities are handled strictly inside the SIS add/update flow to prevent accidental spam.");
    };

    // Trigger initial data load
    initData();
});
