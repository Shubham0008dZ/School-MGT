document.addEventListener('DOMContentLoaded', () => {
    // API URL - REPLACE WITH YOUR DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    let allEmployees = [];

    // ==========================================
    // 1. DATA FETCHING & VIEW MANAGEMENT
    // ==========================================
    function initData() {
        document.getElementById('userTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        
        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success") {
                    allEmployees = res.employees || [];
                    renderUsersTable();
                }
            });
    }

    function showView(targetId) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById(targetId).classList.add('active-module');
    }

    document.getElementById('btn-back-to-users').addEventListener('click', () => showView('module-user-list'));
    document.getElementById('btnSyncUsers').addEventListener('click', initData);

    // ==========================================
    // 2. RENDER USER TABLE
    // ==========================================
    function renderUsersTable() {
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';
        
        let activeEmps = allEmployees.filter(e => e.Status !== "Inactive");

        if(activeEmps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No Users Found.</td></tr>';
            return;
        }

        activeEmps.forEach((emp, idx) => {
            let isSA = emp.Is_SuperAdmin === "Yes";
            let badge = isSA ? `<span class="badge badge-yes">Yes</span>` : `<span class="badge badge-no">No</span>`;
            let safeEmp = JSON.stringify(emp).replace(/'/g, "&#39;");

            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${emp.empId}</b></td>
                    <td>${emp.empName}</td>
                    <td>${emp.empDept || '-'}</td>
                    <td>${emp.empDesig || '-'}</td>
                    <td>${badge}</td>
                    <td><button class="btn-action" title="Edit Rights" onclick='openRights(${safeEmp})'>✏️ Assign Rights</button></td>
                </tr>
            `;
        });
    }

    // ==========================================
    // 3. LOGIC FOR MODULE RIGHTS (TREE BEHAVIOR)
    // ==========================================
    const superAdminToggle = document.getElementById('isSuperAdmin');
    const modulesTree = document.getElementById('modulesTree');
    const allCheckboxes = document.querySelectorAll('.modules-tree input[type="checkbox"]');
    const parentCheckboxes = document.querySelectorAll('.mod-parent');
    const childCheckboxes = document.querySelectorAll('.mod-child');

    superAdminToggle.addEventListener('change', function() {
        if(this.checked) {
            modulesTree.classList.add('disabled');
            allCheckboxes.forEach(cb => cb.checked = true); 
        } else {
            modulesTree.classList.remove('disabled');
            allCheckboxes.forEach(cb => cb.checked = false); 
        }
    });

    parentCheckboxes.forEach(parent => {
        parent.addEventListener('change', function() {
            let pVal = this.value;
            document.querySelectorAll(`.mod-child[data-parent="${pVal}"]`).forEach(child => {
                child.checked = this.checked;
            });
        });
    });

    childCheckboxes.forEach(child => {
        child.addEventListener('change', function() {
            let pVal = this.getAttribute('data-parent');
            let parentCb = document.querySelector(`.mod-parent[value="${pVal}"]`);
            if(this.checked) {
                parentCb.checked = true;
            } else {
                let siblings = document.querySelectorAll(`.mod-child[data-parent="${pVal}"]`);
                let anyChecked = Array.from(siblings).some(sib => sib.checked);
                if(!anyChecked) parentCb.checked = false;
            }
        });
    });

    // ==========================================
    // 4. OPEN RIGHTS EDITOR
    // ==========================================
    window.openRights = function(emp) {
        document.getElementById('displayEmpName').innerText = `${emp.empName} (${emp.empId})`;
        document.getElementById('currentEditEmpId').value = emp.empId;
        
        superAdminToggle.checked = false;
        modulesTree.classList.remove('disabled');
        allCheckboxes.forEach(cb => cb.checked = false);

        if(emp.Is_SuperAdmin === "Yes") {
            superAdminToggle.checked = true;
            superAdminToggle.dispatchEvent(new Event('change')); 
        } else if(emp.Rights_JSON) {
            try {
                let savedRights = JSON.parse(emp.Rights_JSON);
                savedRights.forEach(val => {
                    let cb = document.querySelector(`.modules-tree input[value="${val}"]`);
                    if(cb) cb.checked = true;
                });
            } catch(e) {}
        }
        
        showView('module-assign-rights');
    }

    // ==========================================
    // 5. SAVE RIGHTS TO DB
    // ==========================================
    document.getElementById('btnSaveRights').addEventListener('click', function() {
        const empId = document.getElementById('currentEditEmpId').value;
        const isSA = superAdminToggle.checked;
        
        let rightsArray = [];
        if(!isSA) {
            allCheckboxes.forEach(cb => {
                if(cb.checked) rightsArray.push(cb.value);
            });
        }

        const payload = {
            action: "saveUserRights",
            empId: empId,
            isSuperAdmin: isSA,
            rights: rightsArray
        };

        let oldText = this.innerText;
        this.innerText = "Saving Rights...";
        this.disabled = true;

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                alert(data.message);
                initData(); 
                showView('module-user-list');
            } else {
                alert("Error: " + data.message);
            }
        }).finally(() => {
            this.innerText = oldText;
            this.disabled = false;
        });
    });

    initData();
});