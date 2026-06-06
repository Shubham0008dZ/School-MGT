window.customAlert = function(message) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#333;margin-bottom:20px;font-size:15px;font-weight:bold;">${message}</p><button onclick="this.parentElement.parentElement.remove()" style="padding:8px 25px;background:#e67e22;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">OK</button></div>`;
    document.body.appendChild(overlay);
};

window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
};

function runNetworkDiagnostics(currentUrl) {
    let diagnostics = { isDummyUrl: false, isBrowserOnline: navigator.onLine, timestamp: new Date().toISOString() };
    if(currentUrl.includes("YOUR_NEW_DEPLOYMENT_ID_HERE")) { diagnostics.isDummyUrl = true; console.error("CRITICAL ERROR: Dummy URL detected."); }
    console.log("Network Diagnostics Run: ", diagnostics); return diagnostics;
}

document.addEventListener('DOMContentLoaded', () => {
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('appSidebar');
    if(sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); });
    }

    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    const scriptURL = '/api/backend';
    const activeSchoolName = localStorage.getItem('erp_school_name');
    if(!activeSchoolName) { window.location.href = 'login.html'; }

    try {
        let savedName = localStorage.getItem('erp_school_name');
        let savedLogo = localStorage.getItem('erp_school_logo');
        let navNameEl = document.getElementById('dynamicNavName');
        let navLogoImg = document.getElementById('dynamicNavLogo');
        let navLogoDefault = document.getElementById('defaultNavLogo');
        
        if(savedName && navNameEl) navNameEl.innerText = savedName; 
        if(savedLogo && savedLogo.startsWith('http') && navLogoImg) {
            navLogoImg.src = savedLogo; navLogoImg.style.display = 'inline-block';
            if(navLogoDefault) navLogoDefault.style.display = 'none';
        }
    } catch(error) { console.error("Navbar logic failed:", error); }
    
    const networkHealth = runNetworkDiagnostics(scriptURL);

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), headers: { "Content-Type": "application/json" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => console.log("Background sync paused.", err));

    if (!isSA && !userRights.some(r => r.startsWith("HR_"))) { window.location.href = 'index.html'; return; }

    if (!isSA) {
        if(!userRights.includes("HR_Add")) { let addBtn = document.getElementById('btn-open-add-emp'); if(addBtn) addBtn.remove(); }
        if(!userRights.includes("HR_Inactive")) { let inactNav = document.querySelector('.nav-btn[data-target="module-manage-employee"]'); if(inactNav) inactNav.remove(); }
        if(!userRights.includes("HR_Setup")) { let setupNav = document.querySelector('.nav-btn[data-target="module-emp-setup"]'); if(setupNav) setupNav.remove(); }
    }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { customConfirm("Are you sure you want to logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });
    }

    let allEmployees = [];
    let empSetup = { departments: [], designations: [], staffTypes: [], bloodGroups: [], maritalStatus: [], religions: [], genders: [], userTypes: [], wings: [], reportingAuths: [], accountTypes: [], courseTypes: [], qualNames: [] };
    const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/128/3135/3135715.png';
    const DEFAULT_SIGN = 'https://cdn-icons-png.flaticon.com/512/3597/3597088.png';

    function showView(targetId) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById(targetId).classList.add('active-module');
    }

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault(); document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); const targetId = this.getAttribute('data-target'); if(targetId) showView(targetId);
        });
    });

    const formTabs = document.querySelectorAll('.erp-tab-btn');
    const tabContents = document.querySelectorAll('.erp-tab-content');
    formTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault(); formTabs.forEach(t => t.classList.remove('active')); tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active'); document.getElementById(tab.getAttribute('data-target')).classList.add('active');
        });
    });

    window.syncWithDatabase = function() {
        const tbody = document.getElementById('empTableBody'); 
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; font-weight:bold; padding:20px;">Syncing with Database... ⏳</td></tr>';
        
        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "getEmployees" }), headers: { "Content-Type": "application/json" } })
        .then(res => { if(!res.ok) throw new Error("HTTP Status: " + res.status); return res.json(); })
        .then(res => {
            if(res.status === "Success") {
                allEmployees = res.employees || [];
                if(res.empSetup) { Object.keys(empSetup).forEach(k => { empSetup[k] = res.empSetup[k] || []; }); }
                populateSetupDropdowns(); renderSetupDisplay(); renderEmployeesTable(allEmployees); populateInactiveDropdown(); renderInactiveEmployeesTable(); 
            } else {
                tbody.innerHTML = `<tr><td colspan="10" style="color:red; text-align:center;"><b>Error:</b> ${res.message}</td></tr>`; 
            }
        }).catch(e => {
            tbody.innerHTML = `<tr><td colspan="10" style="color:#c0392b; text-align:center;">⚠️ API Connection Failed. <button onclick="syncWithDatabase()">Retry</button></td></tr>`; 
        });
    }

    // ==========================================
    // CROPPER & PHOTO UPLOAD LOGIC
    // ==========================================
    let cropper = null;
    const fileInput = document.getElementById('empPhotoUploadNew');
    
    function togglePhotoButtons(show) {
        const btnRem = document.getElementById('btnRemove_empPhoto');
        const btnEdit = document.getElementById('btnEdit_empPhoto');
        const btnDl = document.getElementById('btnDownload_empPhoto');
        if(btnRem) btnRem.style.display = show ? 'inline-block' : 'none';
        if(btnEdit) btnEdit.style.display = show ? 'inline-block' : 'none';
        if(btnDl) btnDl.style.display = show ? 'inline-block' : 'none';
    }

    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            if(this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    document.getElementById('cropImageTarget').src = evt.target.result;
                    document.getElementById('cropModalOverlay').classList.add('active');
                    if(cropper) { cropper.destroy(); }
                    cropper = new Cropper(document.getElementById('cropImageTarget'), { aspectRatio: NaN, viewMode: 1, autoCropArea: 1 });
                }
                reader.readAsDataURL(this.files[0]);
            }
            this.value = ''; 
        });
    }

    document.getElementById('btnEdit_empPhoto')?.addEventListener('click', function() {
        const currentSrc = document.getElementById('empPhotoPreview').src;
        if(currentSrc && currentSrc !== DEFAULT_AVATAR) {
            document.getElementById('cropImageTarget').src = currentSrc;
            document.getElementById('cropModalOverlay').classList.add('active');
            if(cropper) { cropper.destroy(); }
            cropper = new Cropper(document.getElementById('cropImageTarget'), { aspectRatio: NaN, viewMode: 1, autoCropArea: 1 });
        }
    });

    document.getElementById('btnDownload_empPhoto')?.addEventListener('click', function() {
        const currentSrc = document.getElementById('empPhotoPreview').src;
        if(currentSrc && currentSrc !== DEFAULT_AVATAR) {
            const empId = document.getElementById('empId').value || 'Employee';
            const link = document.createElement('a');
            link.href = currentSrc;
            link.download = `${empId}_Photo.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    document.getElementById('btnRemove_empPhoto')?.addEventListener('click', function() {
        document.getElementById('empPhotoBase64').value = '';
        document.getElementById('empPhotoPreview').src = DEFAULT_AVATAR;
        togglePhotoButtons(false);
    });

    document.getElementById('btnApplyCrop')?.addEventListener('click', () => {
        if(cropper) {
            const canvas = cropper.getCroppedCanvas({ maxWidth: 200, maxHeight: 200 }); 
            if(canvas) {
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('empPhotoBase64').value = base64;
                document.getElementById('empPhotoPreview').src = base64;
                togglePhotoButtons(true);
            }
            document.getElementById('cropModalOverlay').classList.remove('active');
            cropper.destroy(); cropper = null;
        }
    });
    
    document.getElementById('btnCancelCrop')?.addEventListener('click', () => {
        document.getElementById('cropModalOverlay').classList.remove('active');
        if(cropper) { cropper.destroy(); cropper = null; }
    });

    // ==========================================
    // SIGNATURE UPLOAD LOGIC
    // ==========================================
    const signInput = document.getElementById('empSignUpload');
    if(signInput) {
        signInput.addEventListener('change', function(e) {
            if(this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const base64 = evt.target.result;
                    document.getElementById('empSignBase64').value = base64;
                    document.getElementById('empSignPreview').src = base64;
                    let btnRemSign = document.getElementById('btnRemove_empSign');
                    if(btnRemSign) btnRemSign.style.display = 'inline-block';
                }
                reader.readAsDataURL(this.files[0]);
            }
            this.value = ''; 
        });
    }

    document.getElementById('btnRemove_empSign')?.addEventListener('click', function() {
        document.getElementById('empSignBase64').value = '';
        document.getElementById('empSignPreview').src = DEFAULT_SIGN;
        this.style.display = 'none';
    });

    // ==========================================
    // AGE CALCULATOR
    // ==========================================
    document.getElementById('empDob')?.addEventListener('change', function() {
        if(!this.value) { document.getElementById('empAge').value = ''; return; }
        const dob = new Date(this.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }
        document.getElementById('empAge').value = age + " Years";
    });

    // ==========================================
    // FILTER AND SEARCH LOGIC
    // ==========================================
    const categoryMapping = { 'departments': 'empDept', 'designations': 'empDesig', 'staffTypes': 'empType', 'bloodGroups': 'empBlood', 'maritalStatus': 'empMarital', 'religions': 'empRel', 'genders': 'empGender', 'userTypes': 'empUserType', 'wings': 'empWing', 'reportingAuths': 'empRepAuth', 'accountTypes': 'empAccType' };

    function fillFilterSelect(id, array, defaultLabel) {
        const el = document.getElementById(id); if(!el) return;
        el.innerHTML = `<option value="">${defaultLabel}</option>`;
        if(array) { array.forEach(item => { el.innerHTML += `<option value="${item}">${item}</option>`; }); }
    }

    function populateSetupDropdowns() {
        Object.keys(categoryMapping).forEach(setupKey => {
            let selectId = categoryMapping[setupKey]; let el = document.getElementById(selectId);
            if(el) { el.innerHTML = '<option value="">-Select-</option>'; if(empSetup[setupKey]) { empSetup[setupKey].forEach(d => { el.innerHTML += `<option value="${d}">${d}</option>`; }); } }
        });
        
        fillFilterSelect('fEmpType', empSetup.staffTypes, 'Select Employee Type');
        fillFilterSelect('fDept', empSetup.departments, 'Select Department');
        fillFilterSelect('fDesig', empSetup.designations, 'Select Designation');
        fillFilterSelect('fWing', empSetup.wings, 'Select Wing');
    }

    function applyAllFilters() {
        const fName = document.getElementById('searchEmpName').value.toLowerCase();
        const fId = document.getElementById('fEmpId').value.toLowerCase();
        const fDept = document.getElementById('fDept') ? document.getElementById('fDept').value : "";
        const fDesig = document.getElementById('fDesig') ? document.getElementById('fDesig').value : "";
        const fType = document.getElementById('fEmpType') ? document.getElementById('fEmpType').value : "";
        const fWing = document.getElementById('fWing') ? document.getElementById('fWing').value : "";

        let filtered = allEmployees.filter(e => {
            let mName = fName === "" || (e.empName || "").toLowerCase().includes(fName);
            let mId = fId === "" || (e.empId || "").toLowerCase().includes(fId);
            let mDept = fDept === "" || e.empDept === fDept;
            let mDesig = fDesig === "" || e.empDesig === fDesig;
            let mType = fType === "" || e.empType === fType;
            let mWing = fWing === "" || e.empWing === fWing;
            return mName && mId && mDept && mDesig && mType && mWing;
        });
        renderEmployeesTable(filtered);
        document.getElementById('filterDropdownPanel').style.display = 'none';
    }

    document.getElementById('btn-apply-filter')?.addEventListener('click', applyAllFilters);
    document.getElementById('searchEmpName')?.addEventListener('keydown', function(e) { if(e.key === 'Enter') { e.preventDefault(); applyAllFilters(); } });

    const btnToggleFilters = document.getElementById('btn-toggle-filters');
    const filterPanel = document.getElementById('filterDropdownPanel');
    if(btnToggleFilters && filterPanel) {
        btnToggleFilters.addEventListener('click', (e) => { e.stopPropagation(); filterPanel.style.display = filterPanel.style.display === 'block' ? 'none' : 'block'; });
        document.addEventListener('click', (e) => { if (filterPanel.style.display === 'block' && !filterPanel.contains(e.target) && !btnToggleFilters.contains(e.target)) { filterPanel.style.display = 'none'; } });
    }

    function renderEmployeesTable(dataList) {
        const tbody = document.getElementById('empTableBody'); tbody.innerHTML = '';
        let activeEmps = dataList.filter(e => e.Status !== "Inactive");
        if(activeEmps.length === 0) { tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No Active Employees found.</td></tr>'; return; }

        activeEmps.forEach((emp, idx) => {
            let safeEmp = JSON.stringify(emp).replace(/'/g, "&#39;");
            let actionHtml = "";
            if (isSA || userRights.includes("HR_Add")) { actionHtml = `<button class="btn-action edit" onclick='editEmp(${safeEmp})'>✏️</button>`; }

            let photoUrl = emp.empPhotoBase64 && emp.empPhotoBase64.startsWith('data:image') ? emp.empPhotoBase64 : DEFAULT_AVATAR;

            tbody.innerHTML += `<tr><td>${idx + 1}</td>
                <td style="text-align:center;"><img src="${photoUrl}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid #ccc;"></td>
                <td><b>${emp.empId}</b></td><td>${emp.empSalutation || ''}</td><td>${emp.empName}</td><td>${emp.empDept || '-'}</td><td>${emp.empDesig || '-'}</td><td>${emp.empMobile || '-'}</td><td>${emp.empBio || '-'}</td><td>${actionHtml}</td></tr>`;
        });
    }

    // ==========================================
    // ADD / EDIT FORM LOGIC
    // ==========================================
    const addEmpBtn = document.getElementById('btn-open-add-emp');
    if(addEmpBtn) {
        addEmpBtn.addEventListener('click', () => {
            document.getElementById('employeeForm').reset(); document.getElementById('editEmpMode').value = "false"; document.getElementById('empId').readOnly = false;
            document.getElementById('qualTableBody').innerHTML = ''; document.getElementById('expTableBody').innerHTML = '';
            
            document.getElementById('empPhotoBase64').value = ''; document.getElementById('empPhotoPreview').src = DEFAULT_AVATAR; 
            togglePhotoButtons(false);
            
            document.getElementById('empSignBase64').value = ''; document.getElementById('empSignPreview').src = DEFAULT_SIGN;
            if(document.getElementById('btnRemove_empSign')) document.getElementById('btnRemove_empSign').style.display = 'none';
            
            addQualRow(); addExpRow(); 
            if(formTabs.length > 0) formTabs[0].click(); 
            showView('module-add-employee');
        });
    }

    document.getElementById('btn-back-to-emps')?.addEventListener('click', () => showView('module-employees-list'));
    document.getElementById('btn-back-to-emps2')?.addEventListener('click', () => showView('module-employees-list'));

    // ==========================================
    // BIDIRECTIONAL ADDRESS COPY LOGIC
    // ==========================================
    function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ''; }
    function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

    const chkSameAsCorr = document.getElementById('chkSameAsCorr'); // Toggle in Perm section
    const chkSameAsPerm = document.getElementById('chkSameAsPerm'); // Toggle in Corr section

    if (chkSameAsCorr) {
        chkSameAsCorr.addEventListener('change', function() {
            if (this.checked) {
                setVal('empPermAdd', getVal('empCorrAdd')); setVal('empPermCity', getVal('empCorrCity'));
                setVal('empPermState', getVal('empCorrState')); setVal('empPermCountry', getVal('empCorrCountry')); setVal('empPermPin', getVal('empCorrPin'));
                if (chkSameAsPerm) chkSameAsPerm.checked = false; // Prevent loop
            } else {
                setVal('empPermAdd', ''); setVal('empPermCity', ''); setVal('empPermState', ''); setVal('empPermCountry', ''); setVal('empPermPin', '');
            }
        });
    }

    if (chkSameAsPerm) {
        chkSameAsPerm.addEventListener('change', function() {
            if (this.checked) {
                setVal('empCorrAdd', getVal('empPermAdd')); setVal('empCorrCity', getVal('empPermCity'));
                setVal('empCorrState', getVal('empPermState')); setVal('empCorrCountry', getVal('empPermCountry')); setVal('empCorrPin', getVal('empPermPin'));
                if (chkSameAsCorr) chkSameAsCorr.checked = false; // Prevent loop
            } else {
                setVal('empCorrAdd', ''); setVal('empCorrCity', ''); setVal('empCorrState', ''); setVal('empCorrCountry', ''); setVal('empCorrPin', '');
            }
        });
    }

    function getOptionsHTML(arr, selectedVal) {
        let html = '<option value="">-Select-</option>';
        if(arr) { arr.forEach(item => { let sel = (item === selectedVal) ? 'selected' : ''; html += `<option value="${item}" ${sel}>${item}</option>`; }); }
        return html;
    }

    // ==========================================
    // EDUCATION TABLE (FIXED: Removed Ref and Unv)
    // ==========================================
    function addQualRow(data = {}) {
        const tbody = document.getElementById('qualTableBody'); if(!tbody) return;
        const srNo = tbody.children.length + 1; const tr = document.createElement('tr');
        let cTypeOpts = getOptionsHTML(empSetup.courseTypes, data.type); let qNameOpts = getOptionsHTML(empSetup.qualNames, data.name);
        
        // Exact 8 input columns (Ref and Unv removed from DOM entirely)
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
        `;
        tbody.appendChild(tr);
    }

    // ==========================================
    // EXPERIENCE TABLE (FIXED: Removed Exclude and simplified)
    // ==========================================
    function addExpRow(data = {}) {
        const tbody = document.getElementById('expTableBody'); if(!tbody) return;
        const srNo = tbody.children.length + 1; const tr = document.createElement('tr');
        
        // Exact 5 input columns based on your screenshot
        tr.innerHTML = `
            <td class="e-sr">${srNo}</td>
            <td><input type="text" class="e-org" value="${data.org || ''}"></td>
            <td><input type="text" class="e-add" value="${data.add || ''}"></td>
            <td><input type="text" class="e-desig" value="${data.desig || ''}"></td>
            <td><input type="date" class="e-from" value="${data.from || ''}"></td>
            <td><input type="date" class="e-to" value="${data.to || ''}"></td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('btnAddQualRow')?.addEventListener('click', () => addQualRow());
    document.getElementById('btnDelQualRow')?.addEventListener('click', () => { const tbody = document.getElementById('qualTableBody'); if(tbody && tbody.children.length > 1) tbody.removeChild(tbody.lastChild); });
    document.getElementById('btnAddExpRow')?.addEventListener('click', () => addExpRow());
    document.getElementById('btnDelExpRow')?.addEventListener('click', () => { const tbody = document.getElementById('expTableBody'); if(tbody && tbody.children.length > 1) tbody.removeChild(tbody.lastChild); });

    window.editEmp = function(e) {
        showView('module-add-employee'); document.getElementById('editEmpMode').value = "true"; 
        if(formTabs.length > 0) formTabs[0].click(); 
        
        setVal('empId', e.empId); if(document.getElementById('empId')) document.getElementById('empId').readOnly = true;
        setVal('empSalutation', e.empSalutation); setVal('empName', e.empName); setVal('empDept', e.empDept); setVal('empDesig', e.empDesig);
        setVal('empGender', e.empGender); setVal('empBlood', e.empBlood); setVal('empDob', e.empDob ? new Date(e.empDob).toISOString().split('T')[0] : '');
        setVal('empAge', e.empAge); setVal('empJoinDate', e.empJoinDate ? new Date(e.empJoinDate).toISOString().split('T')[0] : '');
        setVal('empType', e.empType); setVal('empUserType', e.empUserType); setVal('empRepAuth', e.empRepAuth);
        setVal('empOffPhone', e.empOffPhone); setVal('empOffEmail', e.empOffEmail); setVal('empLoginId', e.empLoginId);
        setVal('empRel', e.empRel); setVal('empMarital', e.empMarital); setVal('empRoles', e.empRoles);
        
        setVal('empMobile', e.empMobile); setVal('empEmail', e.empEmail);
        setVal('empCorrAdd', e.empCorrAdd); setVal('empCorrCity', e.empCorrCity); setVal('empCorrState', e.empCorrState); setVal('empCorrCountry', e.empCorrCountry); setVal('empCorrPin', e.empCorrPin);
        setVal('empPermAdd', e.empPermAdd); setVal('empPermCity', e.empPermCity); setVal('empPermState', e.empPermState); setVal('empPermCountry', e.empPermCountry); setVal('empPermPin', e.empPermPin);
        
        // Reset Toggles
        if (chkSameAsCorr) chkSameAsCorr.checked = false;
        if (chkSameAsPerm) chkSameAsPerm.checked = false;

        setVal('empBio', e.empBio); setVal('empSubjects', e.empSubjects); setVal('empConfDate', e.empConfDate ? new Date(e.empConfDate).toISOString().split('T')[0] : ''); setVal('empRetireDate', e.empRetireDate ? new Date(e.empRetireDate).toISOString().split('T')[0] : '');
        setVal('empWing', e.empWing); setVal('empClassIncharge', e.empClassIncharge); setVal('empSeqNo', e.empSeqNo); setVal('empRFID', e.empRFID); setVal('empAadhaar', e.empAadhaar); setVal('empPan', e.empPan);
        
        setVal('empFatherName', e.empFatherName); setVal('empFatherMobile', e.empFatherMobile); setVal('empFatherProf', e.empFatherProf);
        setVal('empMotherName', e.empMotherName); setVal('empMotherMobile', e.empMotherMobile); setVal('empMotherProf', e.empMotherProf);
        setVal('empSpouseName', e.empSpouseName); setVal('empSpouseMobile', e.empSpouseMobile); setVal('empSpouseProf', e.empSpouseProf); setVal('empSpouseDesig', e.empSpouseDesig);
        
        setVal('empSalMode', e.empSalMode); setVal('empAccNo', e.empAccNo); setVal('empIfsc', e.empIfsc); setVal('empAccType', e.empAccType);
        setVal('empBank', e.empBank); setVal('empPf', e.empPf); setVal('empEsi', e.empEsi); setVal('empUan', e.empUan);

        setVal('empPhotoBase64', e.empPhotoBase64); 
        if(document.getElementById('empPhotoPreview')) document.getElementById('empPhotoPreview').src = e.empPhotoBase64 || DEFAULT_AVATAR;
        if(e.empPhotoBase64 && e.empPhotoBase64 !== DEFAULT_AVATAR) {
            togglePhotoButtons(true);
        } else {
            togglePhotoButtons(false);
        }

        setVal('empSignBase64', e.empSignBase64); 
        if(document.getElementById('empSignPreview')) document.getElementById('empSignPreview').src = e.empSignBase64 || DEFAULT_SIGN;
        let btnRemSign = document.getElementById('btnRemove_empSign');
        if(btnRemSign) { if(e.empSignBase64 && e.empSignBase64 !== DEFAULT_SIGN) btnRemSign.style.display = 'inline-block'; else btnRemSign.style.display = 'none'; }

        if(document.getElementById('qualTableBody')) document.getElementById('qualTableBody').innerHTML = ''; 
        if(document.getElementById('expTableBody')) document.getElementById('expTableBody').innerHTML = '';
        
        try { let qData = JSON.parse(e.empQual); if(Array.isArray(qData) && qData.length > 0) qData.forEach(d => addQualRow(d)); else addQualRow(); } catch(err) { addQualRow(); }
        try { let eData = JSON.parse(e.empExp); if(Array.isArray(eData) && eData.length > 0) eData.forEach(d => addExpRow(d)); else addExpRow(); } catch(err) { addExpRow(); }
    }

    document.getElementById('employeeForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); const btn = document.getElementById('btnSaveEmp'); const isEdit = document.getElementById('editEmpMode').value === "true";
        btn.textContent = 'Syncing...'; btn.disabled = true;

        let qualArr = [];
        document.querySelectorAll('#qualTableBody tr').forEach(tr => { 
            // Removed ref and unv extraction
            qualArr.push({ 
                type: tr.querySelector('.q-type').value, 
                name: tr.querySelector('.q-name').value, 
                inst: tr.querySelector('.q-inst').value, 
                uni: tr.querySelector('.q-uni').value, 
                dur: tr.querySelector('.q-dur').value, 
                year: tr.querySelector('.q-year').value, 
                perc: tr.querySelector('.q-perc').value, 
                sub: tr.querySelector('.q-sub').value 
            }); 
        });
        
        let expArr = [];
        document.querySelectorAll('#expTableBody tr').forEach(tr => { 
            // Removed exclude and other hidden columns extraction
            expArr.push({ 
                org: tr.querySelector('.e-org').value, 
                add: tr.querySelector('.e-add').value, 
                desig: tr.querySelector('.e-desig').value,
                from: tr.querySelector('.e-from').value, 
                to: tr.querySelector('.e-to').value 
            }); 
        });

        const payload = {
            action: isEdit ? "updateEmployee" : "saveEmployee",
            data: { 
                empId: getVal('empId'), empSalutation: getVal('empSalutation'), empName: getVal('empName'), empDept: getVal('empDept'), empDesig: getVal('empDesig'),
                empGender: getVal('empGender'), empBlood: getVal('empBlood'), empDob: getVal('empDob'), empAge: getVal('empAge'), empJoinDate: getVal('empJoinDate'),
                empType: getVal('empType'), empUserType: getVal('empUserType'), empRepAuth: getVal('empRepAuth'), empOffPhone: getVal('empOffPhone'), empOffEmail: getVal('empOffEmail'),
                empLoginId: getVal('empLoginId'), empRel: getVal('empRel'), empMarital: getVal('empMarital'), empRoles: getVal('empRoles'),
                empMobile: getVal('empMobile'), empEmail: getVal('empEmail'), 
                empCorrAdd: getVal('empCorrAdd'), empCorrCity: getVal('empCorrCity'), empCorrState: getVal('empCorrState'), empCorrCountry: getVal('empCorrCountry'), empCorrPin: getVal('empCorrPin'),
                empPermAdd: getVal('empPermAdd'), empPermCity: getVal('empPermCity'), empPermState: getVal('empPermState'), empPermCountry: getVal('empPermCountry'), empPermPin: getVal('empPermPin'),
                empBio: getVal('empBio'), empSubjects: getVal('empSubjects'), empConfDate: getVal('empConfDate'), empRetireDate: getVal('empRetireDate'),
                empWing: getVal('empWing'), empClassIncharge: getVal('empClassIncharge'), empSeqNo: getVal('empSeqNo'), empRFID: getVal('empRFID'), empAadhaar: getVal('empAadhaar'), empPan: getVal('empPan'),
                empFatherName: getVal('empFatherName'), empFatherMobile: getVal('empFatherMobile'), empFatherProf: getVal('empFatherProf'),
                empMotherName: getVal('empMotherName'), empMotherMobile: getVal('empMotherMobile'), empMotherProf: getVal('empMotherProf'),
                empSpouseName: getVal('empSpouseName'), empSpouseMobile: getVal('empSpouseMobile'), empSpouseProf: getVal('empSpouseProf'), empSpouseDesig: getVal('empSpouseDesig'),
                empSalMode: getVal('empSalMode'), empAccNo: getVal('empAccNo'), empIfsc: getVal('empIfsc'), empAccType: getVal('empAccType'),
                empBank: getVal('empBank'), empPf: getVal('empPf'), empEsi: getVal('empEsi'), empUan: getVal('empUan'),
                empQual: JSON.stringify(qualArr), empExp: JSON.stringify(expArr), empPhotoBase64: getVal('empPhotoBase64'), empSignBase64: getVal('empSignBase64') 
            }
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }).then(res => res.json()).then(data => {
            if(data.status === "Success") { alert(data.message); showView('module-employees-list'); syncWithDatabase(); } else alert("Error: " + data.message);
        }).finally(() => { btn.textContent = 'Save & Close'; btn.disabled = false; });
    });

    // ==========================================
    // INACTIVE EMPLOYEES LOGIC
    // ==========================================
    function populateInactiveDropdown() {
        const sel = document.getElementById('inactiveEmpSelect'); if(!sel) return;
        sel.innerHTML = '<option value="">--Select Active Employee--</option>';
        allEmployees.forEach(e => { if(e.Status !== "Inactive") { sel.innerHTML += `<option value="${e.empId}">${e.empId} - ${e.empName}</option>`; } });
    }

    document.getElementById('btnMarkInactive')?.addEventListener('click', () => {
        const empId = document.getElementById('inactiveEmpSelect').value; const date = document.getElementById('inactiveDate').value; const reason = document.getElementById('inactiveReason').value;
        if(!empId || !date || !reason) { alert("Please fill all fields."); return; }
        if(confirm(`Are you sure you want to mark ${empId} as Inactive?`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "inactiveEmployee", empId: empId, date: date, reason: reason }), headers: { "Content-Type": "application/json" } }).then(res => res.json()).then(data => {
                if(data.status === "Success") { alert(data.message); document.getElementById('inactiveDate').value = ""; document.getElementById('inactiveReason').value = ""; syncWithDatabase(); }
            });
        }
    });

    function renderInactiveEmployeesTable() {
        const tbody = document.getElementById('inactiveEmpTableBody'); if(!tbody) return;
        tbody.innerHTML = '';
        let inactiveEmps = allEmployees.filter(e => e.Status === "Inactive");
        if(inactiveEmps.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No Inactive Employees found.</td></tr>'; return; }
        inactiveEmps.forEach((emp, idx) => {
            let reasonRaw = emp.LeaveReason || ""; let relDate = "-"; let reasonStr = reasonRaw;
            if(reasonRaw.includes(" | ")) { let parts = reasonRaw.split(" | "); reasonStr = parts[0]; relDate = parts[1]; }
            tbody.innerHTML += `<tr><td>${idx + 1}</td><td><b>${emp.empId}</b></td><td>${emp.empName}</td><td>${emp.empDept || '-'}</td><td>${emp.empDesig || '-'}</td><td><span style="color:#e74c3c; font-weight:bold;">${relDate}</span></td><td>${reasonStr}</td></tr>`;
        });
    }

    // ==========================================
    // MASTER SETUP INTEGRATION
    // ==========================================
    function renderSetupDisplay() {
        const disp = document.getElementById('esDisplay'); if(!disp) return;
        disp.innerHTML = '';
        let displayNames = { 'departments': 'Departments', 'designations': 'Designations', 'staffTypes': 'Staff Types', 'bloodGroups': 'Blood Groups', 'maritalStatus': 'Marital Status', 'religions': 'Religions', 'genders': 'Genders', 'userTypes': 'User Types', 'wings': 'Wings', 'reportingAuths': 'Reporting Auths', 'accountTypes': 'Account Types', 'courseTypes': 'Course Types', 'qualNames': 'Qualification Names' };
        let html = '';
        Object.keys(empSetup).forEach(key => {
            if(empSetup[key] && empSetup[key].length > 0) {
                html += `<div style="border:1px solid #eee; border-radius:4px; padding:15px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e67e22; padding-bottom:5px;"><h4 style="margin:0; color:#2c3e50; text-transform:uppercase;">${displayNames[key] || key}</h4><button class="btn-purple" onclick="openBulkManage('${key}')">⚙️ Bulk Manage</button></div><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">`;
                empSetup[key].forEach((item, index) => { 
                    html += `<div style="background:#e67e22; color:white; padding:5px 12px; border-radius:20px; font-size:13px; display:flex; align-items:center; gap:8px;"><span>${item}</span><span style="cursor:pointer; font-weight:bold; color:#f1c40f;" onclick="editES('${key}', ${index})" title="Edit">✏️</span><span style="cursor:pointer; font-weight:bold; color:#ffcccc;" onclick="deleteES('${key}', ${index})" title="Delete">✕</span></div>`; 
                });
                html += `</div></div>`;
            }
        });
        disp.innerHTML = html;
    }

    const empSetupForm = document.getElementById('empSetupForm');
    if(empSetupForm) {
        empSetupForm.addEventListener('submit', function(e) {
            e.preventDefault(); const cat = document.getElementById('esCategory').value; const val = document.getElementById('esValue').value.trim(); const editIndex = document.getElementById('esEditIndex').value;
            if(!empSetup[cat]) empSetup[cat] = [];
            if(editIndex !== "-1") { empSetup[cat][editIndex] = val; } 
            else { if(!empSetup[cat].includes(val)) empSetup[cat].push(val); }
            saveEmpSetupToDB();
        });
    }

    function saveEmpSetupToDB() {
        const btn = document.getElementById('btnSaveES'); let oldText = btn.textContent; btn.textContent = 'Saving...'; btn.disabled = true;
        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "saveEmpSetup", data: empSetup }), headers: { "Content-Type": "application/json" } }).then(res => res.json()).then(data => { 
            if(data.status === "Success") { 
                customAlert("Master Setup Synced!"); document.getElementById('empSetupForm').reset(); document.getElementById('esEditIndex').value = "-1";
                document.getElementById('btnSaveES').innerText = "Add Entry"; document.getElementById('btnSaveES').style.background = "#27ae60"; document.getElementById('btnCancelESEdit').style.display = "none";
                document.getElementById('esCategory').dispatchEvent(new Event('change')); renderSetupDisplay(); populateSetupDropdowns();
            } 
        }).finally(() => { btn.textContent = oldText; btn.disabled = false; });
    }

    window.editES = function(cat, index) {
        const item = empSetup[cat][index]; document.getElementById('esCategory').value = cat; document.getElementById('esEditIndex').value = index; document.getElementById('esValue').value = item;
        const btn = document.getElementById('btnSaveES'); btn.textContent = 'Update Entry'; btn.style.background = '#f39c12'; document.getElementById('btnCancelESEdit').style.display = 'block';
    };

    window.deleteES = function(cat, index) { customConfirm("Are you sure you want to delete this option?", () => { empSetup[cat].splice(index, 1); saveEmpSetupToDB(); }); };

    document.getElementById('btnCancelESEdit')?.addEventListener('click', () => {
        document.getElementById('empSetupForm').reset(); document.getElementById('esEditIndex').value = "-1";
        const btn = document.getElementById('btnSaveES'); btn.textContent = 'Add Entry'; btn.style.background = '#5cb85c'; document.getElementById('btnCancelESEdit').style.display = 'none';
    });

    window.openBulkManage = function(cat) {
        document.getElementById('bulkCatTitle').innerText = cat.toUpperCase(); document.getElementById('bulkCatTitle').dataset.cat = cat;
        const tbody = document.getElementById('bulkTableBody'); tbody.innerHTML = '';
        if(empSetup[cat] && empSetup[cat].length > 0) { empSetup[cat].forEach(val => addBulkRow(val)); } else { addBulkRow(''); }
        document.getElementById('bulkManageModal').classList.add('active');
    };

    function addBulkRow(val='') {
        const tbody = document.getElementById('bulkTableBody'); const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="blk-val" value="${val}" placeholder="Value"></td><td><button type="button" class="btn-red" onclick="this.closest('tr').remove()">🗑️</button></td>`;
        tbody.appendChild(tr);
    }

    document.getElementById('btnAddBulkRow')?.addEventListener('click', () => addBulkRow(''));
    document.getElementById('closeBulkModal')?.addEventListener('click', () => document.getElementById('bulkManageModal').classList.remove('active'));
    document.getElementById('btnCancelBulk')?.addEventListener('click', () => document.getElementById('bulkManageModal').classList.remove('active'));

    document.getElementById('btnSaveBulk')?.addEventListener('click', () => {
        const cat = document.getElementById('bulkCatTitle').dataset.cat; const rows = document.querySelectorAll('#bulkTableBody tr'); let newData = [];
        rows.forEach(tr => { let v = tr.querySelector('.blk-val').value.trim(); if(v) newData.push(v); });
        empSetup[cat] = newData; document.getElementById('bulkManageModal').classList.remove('active'); saveEmpSetupToDB();
    });

    setTimeout(() => { syncWithDatabase(); }, 100);
});
