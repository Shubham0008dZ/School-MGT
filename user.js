document.addEventListener('DOMContentLoaded', () => {
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    // REPLACE WITH YOUR ACTUAL GOOGLE SCRIPT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    if (!isSA && !userRights.some(r => r.startsWith("SUPER"))) { window.location.href = 'index.html'; return; }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { 
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; 
            }
        });
    }

    let allEmployees = [];
    let allStudents = [];

    // NAVIGATION TABS
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); 
            const targetId = this.getAttribute('data-target'); 
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            document.getElementById(targetId).classList.add('active-module');
        });
    });

    // DATA INITIALIZATION
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
            }
        }).catch(err => {
            console.error("Network issue during sync.", err);
        });
    }

    if(document.getElementById('btnSyncUsers')) {
        document.getElementById('btnSyncUsers').addEventListener('click', initData);
    }

    // ==========================================
    // EMPLOYEE RENDER LOGIC
    // ==========================================
    function renderEmployeeTable(list) {
        const tbody = document.getElementById('userTableBody'); tbody.innerHTML = '';
        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No employees found.</td></tr>'; return; }
        
        list.forEach((emp, idx) => {
            let badge = emp.Is_SuperAdmin === "Yes" ? `<span class="badge-admin">Yes</span>` : `<span class="badge-user">No</span>`;
            
            // Re-adding the complex buttons that trigger modals
            tbody.innerHTML += `<tr>
                <td>${idx + 1}</td><td><b>${emp.empId}</b></td><td>${emp.empName}</td>
                <td>${emp.empDept || '-'}</td><td>${emp.empDesig || '-'}</td><td>${badge}</td>
                <td>
                    <button class="btn-action-rights" onclick='openDetailedRightsModal("${emp.empId}")'>✏️ Assign Rights</button>
                    <button class="btn-action-auth" onclick='openDetailedAuthModal("${emp.empId}")'>🔑 Send Auth</button>
                </td>
            </tr>`;
        });
    }

    if(document.getElementById('searchEmpUser')) {
        document.getElementById('searchEmpUser').addEventListener('input', function() {
            let f = this.value.toLowerCase();
            let filtered = allEmployees.filter(e => (e.empName||"").toLowerCase().includes(f) || (e.empId||"").toLowerCase().includes(f));
            renderEmployeeTable(filtered);
        });
    }

    // =======================================================
    // RESTORED: COMPLEX ASSIGN RIGHTS LOGIC (CAPSULES & ARRAYS)
    // =======================================================
    let currentRightsEmpId = null;

    window.openDetailedRightsModal = function(empId) {
        let emp = allEmployees.find(e => e.empId === empId);
        if(!emp) return;

        currentRightsEmpId = emp.empId;
        document.getElementById('rightsEmpId').innerText = emp.empId;
        document.getElementById('rightsEmpName').innerText = emp.empName;

        // Reset all toggles
        document.getElementById('toggleSuperAdmin').checked = false;
        document.querySelectorAll('.right-chk').forEach(chk => {
            chk.checked = false;
            chk.disabled = false;
        });

        // Set Super Admin Status
        if(emp.Is_SuperAdmin === "Yes") {
            document.getElementById('toggleSuperAdmin').checked = true;
            document.querySelectorAll('.right-chk').forEach(chk => { chk.checked = true; chk.disabled = true; }); // Override visuals
        }

        // Set Array Rights
        try {
            let currentRights = JSON.parse(emp.Rights_JSON || "[]");
            document.querySelectorAll('.right-chk').forEach(chk => {
                if(currentRights.includes(chk.value)) {
                    chk.checked = true;
                }
            });
        } catch(e) {}

        document.getElementById('assignRightsModal').style.display = 'flex';
    };

    // Super Admin Toggle override behavior
    document.getElementById('toggleSuperAdmin')?.addEventListener('change', function() {
        let isSuper = this.checked;
        document.querySelectorAll('.right-chk').forEach(chk => {
            if(isSuper) { chk.checked = true; chk.disabled = true; } 
            else { chk.checked = false; chk.disabled = false; }
        });
    });

    document.getElementById('btnSaveRights')?.addEventListener('click', function() {
        if(!currentRightsEmpId) return;
        
        let isSuper = document.getElementById('toggleSuperAdmin').checked;
        let selectedRights = [];
        
        if(!isSuper) {
            document.querySelectorAll('.right-chk:checked').forEach(chk => {
                selectedRights.push(chk.value);
            });
        }

        this.innerText = "Saving..."; this.disabled = true;

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
                initData(); // Refresh table
            } else {
                alert("Error: " + data.message);
            }
        })
        .finally(() => { this.innerText = "💾 Save Rights"; this.disabled = false; });
    });

    // =======================================================
    // RESTORED: COMPLEX SEND AUTH LOGIC (2 OPTIONS)
    // =======================================================
    window.openDetailedAuthModal = function(empId) {
        let emp = allEmployees.find(e => e.empId === empId);
        if(!emp) return;
        
        if(!emp.empEmail || String(emp.empEmail).trim() === "") {
            alert("Error: This employee does not have a registered Email ID.");
            return;
        }

        document.getElementById('authEmpName').innerText = emp.empName;
        document.getElementById('authTargetId').value = emp.empId;
        document.getElementById('authTargetEmail').value = emp.empEmail;
        
        // Reset modal fields
        document.querySelector('input[name="authOpt"][value="auto"]').checked = true;
        document.getElementById('customUid').value = "";
        document.getElementById('customPass').value = "";
        toggleManualAuthInputs();

        document.getElementById('authModal').style.display = 'flex';
    };

    document.getElementById('btnSendAuthNow')?.addEventListener('click', function() {
        const empId = document.getElementById('authTargetId').value;
        const emp = allEmployees.find(e => e.empId === empId);
        if(!emp) return;

        const authOpt = document.querySelector('input[name="authOpt"]:checked').value;
        let selectedOptionId = (authOpt === "auto") ? 2 : 1; // 2 = Auto Setup Link, 1 = Manual UID/Pass (Based on backend logic)
        
        let customUid = "";
        let customPass = "";

        if(authOpt === "manual") {
            customUid = document.getElementById('customUid').value.trim();
            customPass = document.getElementById('customPass').value.trim();
            if(!customUid || !customPass) {
                alert("Please fill both Custom User ID and Custom Password.");
                return;
            }
        }

        this.innerText = "Sending..."; this.disabled = true;

        // Current Deployment URL for login link injection
        const loginUrl = window.location.origin + window.location.pathname.replace('user.html', 'login.html');

        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({
                action: "sendUserCredentials",
                empId: empId,
                empName: emp.empName,
                empEmail: emp.empEmail,
                option: selectedOptionId,
                customUid: customUid,
                customPass: customPass,
                loginUrl: loginUrl
            }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                alert(data.message);
                document.getElementById('authModal').style.display = 'none';
                initData(); // Re-sync to show updated Login ID in table if needed
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(err => {
            alert("Network Error: Could not send credentials.");
        })
        .finally(() => { this.innerText = "✉️ Send Credentials"; this.disabled = false; });
    });


    // ==========================================
    // STUDENT RENDER LOGIC
    // ==========================================
    function renderStudentTable(list) {
        const tbody = document.getElementById('studentUserTableBody'); tbody.innerHTML = '';
        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No students found in SIS.</td></tr>'; return; }
        
        list.forEach((st, idx) => {
            let uid = st.Login_ID || `<span style="color:#e74c3c;">Pending Sync</span>`;
            let pin = st.Password || `---`;
            let maskPin = pin !== `---` ? `********` : `---`;
            
            let sClass = "-";
            if(st.studentClass) {
                let match = st.studentClass.match(/(.*?)\s*\((.*?)\)/);
                if(match) { sClass = match[1].trim() + " (" + match[2].trim() + ")"; } else { sClass = st.studentClass; }
            }

            tbody.innerHTML += `<tr>
                <td>${idx + 1}</td><td><b>${st.regNo}</b></td><td>${st.studentFirstName || st.studentName}</td>
                <td>${sClass}</td><td><b style="color:#2980b9;">${uid}</b></td>
                <td><span style="letter-spacing:1px; background:#f1f1f1; padding:3px 6px; border:1px solid #ddd;">${maskPin}</span></td>
                <td>
                    <button style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:3px; cursor:pointer; font-weight:bold;" onclick='resendStudentAuth("${st.regNo}")'>🔑 Resend Credentials</button>
                </td>
            </tr>`;
        });
    }

    if(document.getElementById('searchStudentUser')) {
        document.getElementById('searchStudentUser').addEventListener('input', function() {
            let f = this.value.toLowerCase();
            let filtered = allStudents.filter(s => (s.studentFirstName||s.studentName||"").toLowerCase().includes(f) || (s.Login_ID||"").toLowerCase().includes(f) || String(s.regNo).includes(f));
            renderStudentTable(filtered);
        });
    }

    // Student Credentials Resend Logic (Uses same API concept as SIS admission)
    window.resendStudentAuth = function(regNo) {
        // Placeholder implementation matching strict constraints
        alert("Action triggered for Reg No: " + regNo + ". Auto-emailing capabilities are handled strictly inside the SIS add/update flow to prevent accidental spam.");
    };

    // Initialize immediately on load
    initData();
});
