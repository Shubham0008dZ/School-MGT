document.addEventListener('DOMContentLoaded', () => {
    // API URL - KEEP YOUR DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    // ==========================================
    // 0. SECURITY & LOGOUT LOGIC
    // ==========================================
    const activeUser = localStorage.getItem('erp_active_user');
    if (!activeUser) {
        window.location.href = 'login.html'; // Kick out if not logged in
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
    let empSetup = { 
        departments: [], designations: [], staffTypes: [], bloodGroups: [], maritalStatus: [],
        religions: [], genders: [], userTypes: [], wings: [], reportingAuths: [], accountTypes: [],
        courseTypes: [], qualNames: []
    };

    // ==========================================
    // 1. DATA FETCHING & INITIALIZATION
    // ==========================================
    function initData() {
        document.getElementById('empTableBody').innerHTML = '<tr><td colspan="10" style="text-align: center;">Fetching Database... ⏳</td></tr>';
        
        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success") {
                    allEmployees = res.employees || [];
                    if(res.empSetup) {
                        Object.keys(empSetup).forEach(k => {
                            empSetup[k] = res.empSetup[k] || [];
                        });
                    }
                    
                    populateSetupDropdowns();
                    renderSetupDisplay();
                    renderEmployeesTable();
                    populateInactiveDropdown();
                    renderInactiveEmployeesTable(); 
                }
            });
    }

    // ==========================================
    // 2. VIEW MANAGEMENT & TABS
    // ==========================================
    function showView(targetId) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById(targetId).classList.add('active-module');
    }

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; 
            e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            if(targetId) showView(targetId);
        });
    });

    document.getElementById('btn-open-add-emp').addEventListener('click', () => {
        document.getElementById('employeeForm').reset();
        document.getElementById('editEmpMode').value = "false";
        document.getElementById('empId').readOnly = false;
        
        document.getElementById('qualTableBody').innerHTML = '';
        document.getElementById('expTableBody').innerHTML = '';
        addQualRow(); addExpRow();

        formTabs[0].click(); 
        showView('module-add-employee');
    });

    document.getElementById('btn-back-to-emps').addEventListener('click', () => showView('module-employees-list'));

    const formTabs = document.querySelectorAll('.form-tabs .tab');
    const tabContents = document.querySelectorAll('.form-tab-content');
    formTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            formTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-target')).classList.add('active');
        });
    });

    // ==========================================
    // 3. DYNAMIC TABLES LOGIC (QUAL & EXP)
    // ==========================================
    function getOptionsHTML(arr, selectedVal) {
        let html = '<option value="">-Select-</option>';
        if(arr) {
            arr.forEach(item => {
                let sel = (item === selectedVal) ? 'selected' : '';
                html += `<option value="${item}" ${sel}>${item}</option>`;
            });
        }
        return html;
    }

    function addQualRow(data = {}) {
        const tbody = document.getElementById('qualTableBody');
        const srNo = tbody.children.length + 1;
        const tr = document.createElement('tr');
        
        let cTypeOpts = getOptionsHTML(empSetup.courseTypes, data.type);
        let qNameOpts = getOptionsHTML(empSetup.qualNames, data.name);

        tr.innerHTML = `
            <td>${srNo}</td>
            <td><select class="q-type">${cTypeOpts}</select></td>
            <td><select class="q-name">${qNameOpts}</select></td>
            <td><input type="text" class="q-inst" value="${data.inst || ''}"></td>
            <td><input type="text" class="q-uni" value="${data.uni || ''}"></td>
            <td><input type="number" class="q-dur" value="${data.dur || ''}"></td>
            <td><input type="text" class="q-year" value="${data.year || ''}"></td>
            <td><input type="text" class="q-perc" value="${data.perc || ''}"></td>
            <td><input type="text" class="q-sub" value="${data.sub || ''}"></td>
            <td><input type="text" class="q-ref" value="${data.ref || ''}"></td>
            <td><input type="checkbox" class="q-unv" ${data.unv ? 'checked' : ''}></td>
        `;
        tbody.appendChild(tr);
    }

    function addExpRow(data = {}) {
        const tbody = document.getElementById('expTableBody');
        const srNo = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="e-sr">${srNo}</td>
            <td><input type="text" class="e-org" value="${data.org || ''}"></td>
            <td><input type="text" class="e-add" value="${data.add || ''}"></td>
            <td><input type="date" class="e-from" value="${data.from || ''}"></td>
            <td><input type="date" class="e-to" value="${data.to || ''}"></td>
            <td><input type="text" class="e-dept" value="${data.dept || ''}"></td>
            <td><input type="text" class="e-desig" value="${data.desig || ''}"></td>
            <td><input type="text" class="e-resp" value="${data.resp || ''}"></td>
            <td><input type="checkbox" class="e-del" title="Check to exclude on save"></td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('btnAddQualRow').addEventListener('click', () => addQualRow());
    document.getElementById('btnDelQualRow').addEventListener('click', () => {
        const tbody = document.getElementById('qualTableBody');
        if(tbody.children.length > 1) tbody.removeChild(tbody.lastChild);
    });

    document.getElementById('btnAddExpRow').addEventListener('click', () => addExpRow());


    // ==========================================
    // 4. EMPLOYEE LIST & EDIT
    // ==========================================
    function renderEmployeesTable() {
        const tbody = document.getElementById('empTableBody');
        tbody.innerHTML = '';
        let activeEmps = allEmployees.filter(e => e.Status !== "Inactive");

        if(activeEmps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No Active Employees found.</td></tr>';
            return;
        }

        activeEmps.forEach((emp, idx) => {
            let safeEmp = JSON.stringify(emp).replace(/'/g, "&#39;");
            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><img src="https://via.placeholder.com/30" style="border-radius:50%;"></td>
                    <td><b>${emp.empId}</b></td>
                    <td>${emp.empSalutation || ''}</td>
                    <td>${emp.empName}</td>
                    <td>${emp.empDept || '-'}</td>
                    <td>${emp.empDesig || '-'}</td>
                    <td>${emp.empMobile || '-'}</td>
                    <td>${emp.empBio || '-'}</td>
                    <td><button class="btn-action edit" onclick='editEmp(${safeEmp})'>✏️</button></td>
                </tr>
            `;
        });
    }

    function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ''; }
    function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

    window.editEmp = function(e) {
        showView('module-add-employee');
        document.getElementById('editEmpMode').value = "true";
        formTabs[0].click(); 

        setVal('empId', e.empId); document.getElementById('empId').readOnly = true;
        setVal('empSalutation', e.empSalutation); setVal('empName', e.empName); setVal('empMobile', e.empMobile);
        setVal('empPOB', e.empPOB); setVal('empNat', e.empNat); setVal('empStaffType', e.empStaffType);
        setVal('empJoinDate', e.empJoinDate ? new Date(e.empJoinDate).toISOString().split('T')[0] : '');
        setVal('empEmail', e.empEmail); setVal('empOffEmail', e.empOffEmail); setVal('empGender', e.empGender);
        setVal('empBlood', e.empBlood); setVal('empDept', e.empDept); 
        setVal('empDob', e.empDob ? new Date(e.empDob).toISOString().split('T')[0] : '');
        setVal('empBio', e.empBio); setVal('empDesig', e.empDesig); setVal('empMarital', e.empMarital); 
        setVal('empRel', e.empRel); setVal('empUserType', e.empUserType); setVal('empWing', e.empWing); 
        setVal('empRepAuth', e.empRepAuth);

        setVal('empPan', e.empPan); setVal('empAadhaar', e.empAadhaar); 
        setVal('empMarDate', e.empMarDate ? new Date(e.empMarDate).toISOString().split('T')[0] : '');
        setVal('empBank', e.empBank); setVal('empBranch', e.empBranch); setVal('empAccNo', e.empAccNo); 
        setVal('empIfsc', e.empIfsc); setVal('empPf', e.empPf); setVal('empEsi', e.empEsi); setVal('empAccType', e.empAccType);

        document.getElementById('qualTableBody').innerHTML = '';
        document.getElementById('expTableBody').innerHTML = '';

        try {
            let qData = JSON.parse(e.empQual);
            if(Array.isArray(qData) && qData.length > 0) qData.forEach(d => addQualRow(d));
            else addQualRow();
        } catch(err) { addQualRow(); }

        try {
            let eData = JSON.parse(e.empExp);
            if(Array.isArray(eData) && eData.length > 0) eData.forEach(d => addExpRow(d));
            else addExpRow();
        } catch(err) { addExpRow(); }
    }

    // ==========================================
    // 5. SAVE EMPLOYEE 
    // ==========================================
    document.getElementById('employeeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSaveEmp');
        const isEdit = document.getElementById('editEmpMode').value === "true";
        btn.textContent = 'Syncing...'; btn.disabled = true;

        let qualArr = [];
        document.querySelectorAll('#qualTableBody tr').forEach(tr => {
            qualArr.push({
                type: tr.querySelector('.q-type').value, name: tr.querySelector('.q-name').value,
                inst: tr.querySelector('.q-inst').value, uni: tr.querySelector('.q-uni').value,
                dur: tr.querySelector('.q-dur').value, year: tr.querySelector('.q-year').value,
                perc: tr.querySelector('.q-perc').value, sub: tr.querySelector('.q-sub').value,
                ref: tr.querySelector('.q-ref').value, unv: tr.querySelector('.q-unv').checked
            });
        });

        let expArr = [];
        document.querySelectorAll('#expTableBody tr').forEach(tr => {
            if(!tr.querySelector('.e-del').checked) {
                expArr.push({
                    org: tr.querySelector('.e-org').value, add: tr.querySelector('.e-add').value,
                    from: tr.querySelector('.e-from').value, to: tr.querySelector('.e-to').value,
                    dept: tr.querySelector('.e-dept').value, desig: tr.querySelector('.e-desig').value,
                    resp: tr.querySelector('.e-resp').value
                });
            }
        });

        const payload = {
            action: isEdit ? "updateEmployee" : "saveEmployee",
            data: {
                empId: getVal('empId'), empSalutation: getVal('empSalutation'), empName: getVal('empName'), empMobile: getVal('empMobile'),
                empPOB: getVal('empPOB'), empNat: getVal('empNat'), empStaffType: getVal('empStaffType'), empJoinDate: getVal('empJoinDate'),
                empEmail: getVal('empEmail'), empOffEmail: getVal('empOffEmail'), empGender: getVal('empGender'), empBlood: getVal('empBlood'),
                empDept: getVal('empDept'), empDob: getVal('empDob'), empBio: getVal('empBio'), empDesig: getVal('empDesig'), 
                empMarital: getVal('empMarital'), empRel: getVal('empRel'), empUserType: getVal('empUserType'), empWing: getVal('empWing'),
                empRepAuth: getVal('empRepAuth'),
                
                empPan: getVal('empPan'), empAadhaar: getVal('empAadhaar'), empMarDate: getVal('empMarDate'), empBank: getVal('empBank'), 
                empBranch: getVal('empBranch'), empAccNo: getVal('empAccNo'), empIfsc: getVal('empIfsc'), empPf: getVal('empPf'), 
                empEsi: getVal('empEsi'), empAccType: getVal('empAccType'),
                
                empQual: JSON.stringify(qualArr), empExp: JSON.stringify(expArr)
            }
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                alert(data.message); showView('module-employees-list'); initData();
            } else alert("Error: " + data.message);
        }).finally(() => { btn.textContent = '💾 Save Employee'; btn.disabled = false; });
    });

    // ==========================================
    // 6. MANAGE EMPLOYEE (INACTIVE LOGIC & HISTORY)
    // ==========================================
    function populateInactiveDropdown() {
        const sel = document.getElementById('inactiveEmpSelect');
        sel.innerHTML = '<option value="">--Select Active Employee--</option>';
        allEmployees.forEach(e => {
            if(e.Status !== "Inactive") {
                sel.innerHTML += `<option value="${e.empId}">${e.empId} - ${e.empName}</option>`;
            }
        });
    }

    document.getElementById('btnMarkInactive').addEventListener('click', () => {
        const empId = document.getElementById('inactiveEmpSelect').value;
        const date = document.getElementById('inactiveDate').value;
        const reason = document.getElementById('inactiveReason').value;

        if(!empId || !date || !reason) { alert("Please fill all fields."); return; }

        if(confirm(`Are you sure you want to mark ${empId} as Inactive? They will be removed from the main list.`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "inactiveEmployee", empId: empId, date: date, reason: reason }) })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    alert(data.message);
                    document.getElementById('inactiveDate').value = "";
                    document.getElementById('inactiveReason').value = "";
                    initData(); 
                }
            });
        }
    });

    function renderInactiveEmployeesTable() {
        const tbody = document.getElementById('inactiveEmpTableBody');
        tbody.innerHTML = '';
        let inactiveEmps = allEmployees.filter(e => e.Status === "Inactive");

        if(inactiveEmps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No Inactive Employees found.</td></tr>';
            return;
        }

        inactiveEmps.forEach((emp, idx) => {
            let reasonRaw = emp.LeaveReason || "";
            let relDate = "-";
            let reasonStr = reasonRaw;
            
            if(reasonRaw.includes(" | ")) {
                let parts = reasonRaw.split(" | ");
                reasonStr = parts[0];
                relDate = parts[1];
            }

            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${emp.empId}</b></td>
                    <td>${emp.empName}</td>
                    <td>${emp.empDept || '-'}</td>
                    <td>${emp.empDesig || '-'}</td>
                    <td><span style="color:#e74c3c; font-weight:bold;">${relDate}</span></td>
                    <td>${reasonStr}</td>
                </tr>
            `;
        });
    }

    // ==========================================
    // 7. EMPLOYEE SETUP 
    // ==========================================
    const categoryMapping = {
        'departments': 'empDept', 'designations': 'empDesig', 'staffTypes': 'empStaffType',
        'bloodGroups': 'empBlood', 'maritalStatus': 'empMarital', 'religions': 'empRel',
        'genders': 'empGender', 'userTypes': 'empUserType', 'wings': 'empWing',
        'reportingAuths': 'empRepAuth', 'accountTypes': 'empAccType'
    };

    function populateSetupDropdowns() {
        Object.keys(categoryMapping).forEach(setupKey => {
            let selectId = categoryMapping[setupKey];
            let el = document.getElementById(selectId);
            if(el) {
                el.innerHTML = '<option value="">-Select-</option>';
                if(empSetup[setupKey]) {
                    empSetup[setupKey].forEach(d => { el.innerHTML += `<option value="${d}">${d}</option>`; });
                }
            }
        });
    }

    function renderSetupDisplay() {
        const disp = document.getElementById('esDisplay');
        disp.innerHTML = '';
        
        let displayNames = {
            'departments': 'Departments', 'designations': 'Designations', 'staffTypes': 'Staff Types',
            'bloodGroups': 'Blood Groups', 'maritalStatus': 'Marital Status', 'religions': 'Religions',
            'genders': 'Genders', 'userTypes': 'User Types', 'wings': 'Wings', 'reportingAuths': 'Reporting Auths',
            'accountTypes': 'Account Types', 'courseTypes': 'Course Types', 'qualNames': 'Qualification Names'
        };

        let html = '';
        Object.keys(empSetup).forEach(key => {
            if(empSetup[key] && empSetup[key].length > 0) {
                html += `<div class="config-box" style="flex:1 1 100%;"><h4>${displayNames[key] || key}</h4><div>`;
                empSetup[key].forEach((item, index) => {
                    html += `
                        <div class="config-badge" style="display:inline-flex; align-items:center; background:#ecf0f1; border:1px solid #ccc; color:#333; margin:4px; padding:6px 12px; border-radius:3px;">
                            ${item}
                            <span style="margin-left:10px; border-left:1px solid #aaa; padding-left:10px; cursor:pointer; color:#f39c12;" onclick="editES('${key}', ${index})" title="Edit">✏️</span>
                            <span style="margin-left:5px; cursor:pointer; color:#e74c3c;" onclick="deleteES('${key}', ${index})" title="Delete">🗑️</span>
                        </div>`;
                });
                html += `</div></div>`;
            }
        });
        disp.innerHTML = html;
    }

    window.editES = function(category, index) {
        document.getElementById('esCategory').value = category;
        document.getElementById('esValue').value = empSetup[category][index];
        document.getElementById('esEditCategory').value = category;
        document.getElementById('esEditIndex').value = index;
        
        const btn = document.getElementById('btnSaveES');
        btn.textContent = 'Update Entry';
        btn.style.background = '#f39c12';
        document.getElementById('btnCancelESEdit').style.display = 'block';
    };

    window.deleteES = function(category, index) {
        if(confirm("Are you sure you want to delete this option?")) {
            empSetup[category].splice(index, 1);
            saveEmpSetupToDB();
        }
    };

    document.getElementById('btnCancelESEdit').addEventListener('click', resetESForm);

    function resetESForm() {
        document.getElementById('empSetupForm').reset();
        document.getElementById('esEditIndex').value = "-1";
        document.getElementById('esEditCategory').value = "";
        
        const btn = document.getElementById('btnSaveES');
        btn.textContent = 'Add Entry';
        btn.style.background = '#5cb85c';
        document.getElementById('btnCancelESEdit').style.display = 'none';
    }

    document.getElementById('empSetupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const cat = document.getElementById('esCategory').value;
        const val = document.getElementById('esValue').value.trim();
        const editIndex = document.getElementById('esEditIndex').value;
        const editCategory = document.getElementById('esEditCategory').value;
        
        if(!empSetup[cat]) empSetup[cat] = [];

        if(editIndex !== "-1") {
            if(editCategory === cat) { empSetup[cat][editIndex] = val; } 
            else { empSetup[editCategory].splice(editIndex, 1); empSetup[cat].push(val); }
        } else {
            if(!empSetup[cat].includes(val)) empSetup[cat].push(val);
        }

        saveEmpSetupToDB();
        resetESForm();
    });

    function saveEmpSetupToDB() {
        const btn = document.getElementById('btnSaveES');
        let oldText = btn.textContent;
        btn.textContent = 'Saving...'; btn.disabled = true;

        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "saveEmpSetup", data: empSetup }) })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") { initData(); }
        }).finally(() => { btn.textContent = oldText; btn.disabled = false; });
    }

    initData();
});