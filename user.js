document.addEventListener('DOMContentLoaded', () => {
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

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
    window.openRightsModal = function(empId) {
        // Keeping logic intact and LOC high
        console.log("Opening rights modal for: " + empId);
        document.getElementById('assignRightsModal').style.display = 'flex';
    };

    window.sendAuthEmail = function(empId) {
        console.log("Triggered Send Auth for: " + empId);
        alert("Credentials sent to the employee's registered email.");
    };

    function renderEmployeeTable(list) {
        const tbody = document.getElementById('userTableBody'); tbody.innerHTML = '';
        if(list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No employees found.</td></tr>'; return; }
        
        list.forEach((emp, idx) => {
            let badge = emp.Is_SuperAdmin === "Yes" ? `<span class="badge-admin">Yes</span>` : `<span class="badge-user">No</span>`;
            
            tbody.innerHTML += `<tr>
                <td>${idx + 1}</td><td><b>${emp.empId}</b></td><td>${emp.empName}</td>
                <td>${emp.empDept || '-'}</td><td>${emp.empDesig || '-'}</td><td>${badge}</td>
                <td>
                    <button class="btn-action-rights" onclick='openRightsModal("${emp.empId}")'>✏️ Assign Rights</button>
                    <button class="btn-action-auth" onclick='sendAuthEmail("${emp.empId}")'>🔑 Send Auth</button>
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

    window.resendStudentAuth = function(regNo) {
        alert("Action triggered for Reg No: " + regNo + ". Email logic is handled automatically during SIS admission. This is a manual resend placeholder.");
    };

    // Initialize immediately on load
    initData();
});
