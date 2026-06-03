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
    
    // SIDEBAR TOGGLE
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
    

    



    
    const networkHealth = runNetworkDiagnostics(scriptURL);

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => console.log("Background sync paused.", err));

    const topRightSpans = document.querySelectorAll('.top-right span');
    if(topRightSpans.length > 0) { topRightSpans[0].innerHTML = `👤 Welcome, <b>${activeUser.empName}</b>`; }

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

    const formTabs = document.querySelectorAll('.form-tabs .tab');
    const tabContents = document.querySelectorAll('.form-tab-content');
    formTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault(); formTabs.forEach(t => t.classList.remove('active')); tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active'); document.getElementById(tab.getAttribute('data-target')).classList.add('active');
        });
    });

    // ==========================================
    // AUTO LOAD SYNC WITH ADVANCED ERROR LOGGER
    // ==========================================
    window.syncWithDatabase = function() {
        const tbody = document.getElementById('empTableBody'); 
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; font-weight:bold; padding:20px;">Syncing with Database... ⏳<br><span style="font-size:11px; color:#777;">Please wait, fetching records.</span></td></tr>';
        
        fetch(scriptURL, { redirect: "follow" })
        .then(res => { if(!res.ok) throw new Error("HTTP Status: " + res.status); return res.json(); })
        .then(res => {
            if(res.status === "Success") {
                allEmployees = res.employees || [];
                if(res.empSetup) { Object.keys(empSetup).forEach(k => { empSetup[k] = res.empSetup[k] || []; }); }
                populateSetupDropdowns(); renderSetupDisplay(); renderEmployeesTable(allEmployees); populateInactiveDropdown(); renderInactiveEmployeesTable(); 
            } else {
                tbody.innerHTML = `<tr><td colspan="10" style="color:red; text-align:center; padding:20px;"><b>Error:</b> ${res.message}</td></tr>`; 
            }
        }).catch(e => {
            let detailedError = e.message || e.toString();
            let extraWarning = networkHealth.isDummyUrl ? `<div style="background:#f39c12; color:white; padding:10px; border-radius:4px; margin-bottom:15px; font-weight:bold;">🚨 DUMMY URL DETECTED.</div>` : "";
            tbody.innerHTML = `<tr><td colspan="10" style="color:#c0392b; text-align:center; padding:30px; background:#fdf0ed;">${extraWarning}<span style="font-size:20px; font-weight:bold;">⚠️ API Connection Failed</span><br><br><span style="font-size:14px; color:#333;"><b>Reason:</b> ERR_CONNECTION_CLOSED / ${detailedError}</span><br><br><div style="background:white; border:1px solid #e74c3c; border-radius:5px; padding:15px; display:inline-block; text-align:left; color:#555; font-size:13px;"><b style="color:#e74c3c;">Troubleshooting Steps:</b><br><br>1. Ensure access is "Anyone".<br>2. Disable <b>AdBlocker/Antivirus</b>.<br>3. Change network.</div><br><br><button onclick="syncWithDatabase()" style="background:#e74c3c; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:14px;">🔄 Retry Connection</button></td></tr>`; 
        });
    }

    // ==========================================
    // CROPPER JS LOGIC (FOR EMPLOYEE PHOTO)
    // ==========================================
    let cropper = null;
    const fileInput = document.getElementById('empPhotoUploadNew');
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            if(this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    document.getElementById('cropImageTarget').src = evt.target.result;
                    document.getElementById('cropModalOverlay').classList.add('active');
                    if(cropper) { cropper.destroy(); }
                    cropper = new Cropper(document.getElementById('cropImageTarget'), {
                        aspectRatio: NaN, viewMode: 1, autoCropArea: 1,
                    });
                }
                reader.readAsDataURL(this.files[0]);
            }
            this.value = ''; 
        });
    }

    document.getElementById('btnRemove_empPhoto')?.addEventListener('click', function() {
        document.getElementById('empPhotoBase64').value = '';
        document.getElementById('empPhotoPreview').src = DEFAULT_AVATAR;
        this.style.display = 'none';
    });

    document.getElementById('btnApplyCrop')?.addEventListener('click', () => {
        if(cropper) {
            const canvas = cropper.getCroppedCanvas({ maxWidth: 200, maxHeight: 200 }); 
            if(canvas) {
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('empPhotoBase64').value = base64;
                document.getElementById('empPhotoPreview').src = base64;
                document.getElementById('btnRemove_empPhoto').style.display = 'inline-block';
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
    // FILTER AND SEARCH LOGIC
    // ==========================================
    const categoryMapping = { 'departments': 'empDept', 'designations': 'empDesig', 'staffTypes': 'empStaffType', 'bloodGroups': 'empBlood', 'maritalStatus': 'empMarital', 'religions': 'empRel', 'genders': 'empGender', 'userTypes': 'empUserType', 'wings': 'empWing', 'reportingAuths': 'empRepAuth', 'accountTypes': 'empAccType' };

    function fillFilterSelect(id, array) {
        const el = document.getElementById(id); if(!el) return;
        el.innerHTML = '<option value="">All</option>';
        if(array) { array.forEach(item => { el.innerHTML += `<option value="${item}">${item}</option>`; }); }
    }

    function populateSetupDropdowns() {
        Object.keys(categoryMapping).forEach(setupKey => {
            let selectId = categoryMapping[setupKey]; let el = document.getElementById(selectId);
            if(el) { el.innerHTML = '<option value="">-Select-</option>'; if(empSetup[setupKey]) { empSetup[setupKey].forEach(d => { el.innerHTML += `<option value="${d}">${d}</option>`; }); } }
        });
        
        // Populate Filter Dropdowns
        fillFilterSelect('fStaffType', empSetup.staffTypes);
        fillFilterSelect('fGender', empSetup.genders);
        fillFilterSelect('fBlood', empSetup.bloodGroups);
        fillFilterSelect('fDept', empSetup.departments);
        fillFilterSelect('fDesig', empSetup.designations);
        fillFilterSelect('fMarital', empSetup.maritalStatus);
        fillFilterSelect('fRel', empSetup.religions);
        fillFilterSelect('fUserType', empSetup.userTypes);
    }

    function applyAllFilters() {
        const fName = document.getElementById('searchEmpName').value.toLowerCase();
        const fId = document.getElementById('fEmpId').value.toLowerCase();
        const fPOB = document.getElementById('fPOB').value.toLowerCase();
        const fNat = document.getElementById('fNat').value.toLowerCase();
        const fStaff = document.getElementById('fStaffType').value;
        const fGen = document.getElementById('fGender').value;
        const fBlood = document.getElementById('fBlood').value;
        const fDept = document.getElementById('fDept').value;
        const fDesig = document.getElementById('fDesig').value;
        const fMarital = document.getElementById('fMarital').value;
        const fRel = document.getElementById('fRel').value;
        const fUser = document.getElementById('fUserType').value;
        const fFrom = document.getElementById('fJoinFrom').value;
        const fTo = document.getElementById('fJoinTo').value;

        let filtered = allEmployees.filter(e => {
            let mName = fName === "" || (e.empName || "").toLowerCase().includes(fName);
            let mId = fId === "" || (e.empId || "").toLowerCase().includes(fId);
            let mPOB = fPOB === "" || (e.empPOB || "").toLowerCase().includes(fPOB);
            let mNat = fNat === "" || (e.empNat || "").toLowerCase().includes(fNat);
            
            let mStaff = fStaff === "" || fStaff === "All" || e.empStaffType === fStaff;
            let mGen = fGen === "" || fGen === "All" || e.empGender === fGen;
            let mBlood = fBlood === "" || fBlood === "All" || e.empBlood === fBlood;
            let mDept = fDept === "" || fDept === "All" || e.empDept === fDept;
            let mDesig = fDesig === "" || fDesig === "All" || e.empDesig === fDesig;
            let mMarital = fMarital === "" || fMarital === "All" || e.empMarital === fMarital;
            let mRel = fRel === "" || fRel === "All" || e.empRel === fRel;
            let mUser = fUser === "" || fUser === "All" || e.empUserType === fUser;

            let mDate = true;
            if(fFrom || fTo) {
                if(!e.empJoinDate) { mDate = false; }
                else {
                    let jDate = new Date(e.empJoinDate);
                    if(fFrom) { let fromD = new Date(fFrom); if(jDate < fromD) mDate = false; }
                    if(fTo) { let toD = new Date(fTo); if(jDate > toD) mDate = false; }
                }
            }
            return mName && mId && mPOB && mNat && mStaff && mGen && mBlood && mDept && mDesig && mMarital && mRel && mUser && mDate;
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

            // NEW: Fallback for empty image
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
            document.getElementById('empPhotoBase64').value = ''; document.getElementById('empPhotoPreview').src = DEFAULT_AVATAR; document.getElementById('btnRemove_empPhoto').style.display = 'none';
            addQualRow(); addExpRow(); formTabs[0].click(); showView('module-add-employee');
        });
    }

    document.getElementById('btn-back-to-emps').addEventListener('click', () => showView('module-employees-list'));

    function getOptionsHTML(arr, selectedVal) {
        let html = '<option value="">-Select-</option>';
        if(arr) { arr.forEach(item => { let sel = (item === selectedVal) ? 'selected' : ''; html += `<option value="${item}" ${sel}>${item}</option>`; }); }
        return html;
    }

    function addQualRow(data = {}) {
        const tbody = document.getElementById('qualTableBody'); const srNo = tbody.children.length + 1; const tr = document.createElement('tr');
        let cTypeOpts = getOptionsHTML(empSetup.courseTypes, data.type); let qNameOpts = getOptionsHTML(empSetup.qualNames, data.name);
        tr.innerHTML = `<td>${srNo}</td><td><select class="q-type">${cTypeOpts}</select></td><td><select class="q-name">${qNameOpts}</select></td><td><input type="text" class="q-inst" value="${data.inst || ''}"></td><td><input type="text" class="q-uni" value="${data.uni || ''}"></td><td><input type="number" class="q-dur" value="${data.dur || ''}"></td><td><input type="text" class="q-year" value="${data.year || ''}"></td><td><input type="text" class="q-perc" value="${data.perc || ''}"></td><td><input type="text" class="q-sub" value="${data.sub || ''}"></td><td><input type="text" class="q-ref" value="${data.ref || ''}"></td><td><input type="checkbox" class="q-unv" ${data.unv ? 'checked' : ''}></td>`;
        tbody.appendChild(tr);
    }

    function addExpRow(data = {}) {
        const tbody = document.getElementById('expTableBody'); const srNo = tbody.children.length + 1; const tr = document.createElement('tr');
        tr.innerHTML = `<td class="e-sr">${srNo}</td><td><input type="text" class="e-org" value="${data.org || ''}"></td><td><input type="text" class="e-add" value="${data.add || ''}"></td><td><input type="date" class="e-from" value="${data.from || ''}"></td><td><input type="date" class="e-to" value="${data.to || ''}"></td><td><input type="text" class="e-dept" value="${data.dept || ''}"></td><td><input type="text" class="e-desig" value="${data.desig || ''}"></td><td><input type="text" class="e-resp" value="${data.resp || ''}"></td><td><input type="checkbox" class="e-del" title="Check to exclude on save"></td>`;
        tbody.appendChild(tr);
    }

    document.getElementById('btnAddQualRow')?.addEventListener('click', () => addQualRow());
    document.getElementById('btnDelQualRow')?.addEventListener('click', () => { const tbody = document.getElementById('qualTableBody'); if(tbody.children.length > 1) tbody.removeChild(tbody.lastChild); });
    document.getElementById('btnAddExpRow')?.addEventListener('click', () => addExpRow());

    function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ''; }
    function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

    window.editEmp = function(e) {
        showView('module-add-employee'); document.getElementById('editEmpMode').value = "true"; formTabs[0].click(); 
        setVal('empId', e.empId); document.getElementById('empId').readOnly = true;
        setVal('empSalutation', e.empSalutation); setVal('empName', e.empName); setVal('empMobile', e.empMobile); setVal('empPOB', e.empPOB); setVal('empNat', e.empNat); setVal('empStaffType', e.empStaffType); setVal('empJoinDate', e.empJoinDate ? new Date(e.empJoinDate).toISOString().split('T')[0] : ''); setVal('empEmail', e.empEmail); setVal('empOffEmail', e.empOffEmail); setVal('empGender', e.empGender); setVal('empBlood', e.empBlood); setVal('empDept', e.empDept); setVal('empDob', e.empDob ? new Date(e.empDob).toISOString().split('T')[0] : ''); setVal('empBio', e.empBio); setVal('empDesig', e.empDesig); setVal('empMarital', e.empMarital); setVal('empRel', e.empRel); setVal('empUserType', e.empUserType); setVal('empWing', e.empWing); setVal('empRepAuth', e.empRepAuth); setVal('empPan', e.empPan); setVal('empAadhaar', e.empAadhaar); setVal('empMarDate', e.empMarDate ? new Date(e.empMarDate).toISOString().split('T')[0] : ''); setVal('empBank', e.empBank); setVal('empBranch', e.empBranch); setVal('empAccNo', e.empAccNo); setVal('empIfsc', e.empIfsc); setVal('empPf', e.empPf); setVal('empEsi', e.empEsi); setVal('empAccType', e.empAccType);

        // Load image base64
        setVal('empPhotoBase64', e.empPhotoBase64); 
        document.getElementById('empPhotoPreview').src = e.empPhotoBase64 || DEFAULT_AVATAR;
        if(e.empPhotoBase64) document.getElementById('btnRemove_empPhoto').style.display = 'inline-block'; else document.getElementById('btnRemove_empPhoto').style.display = 'none';

        document.getElementById('qualTableBody').innerHTML = ''; document.getElementById('expTableBody').innerHTML = '';
        try { let qData = JSON.parse(e.empQual); if(Array.isArray(qData) && qData.length > 0) qData.forEach(d => addQualRow(d)); else addQualRow(); } catch(err) { addQualRow(); }
        try { let eData = JSON.parse(e.empExp); if(Array.isArray(eData) && eData.length > 0) eData.forEach(d => addExpRow(d)); else addExpRow(); } catch(err) { addExpRow(); }
    }

    document.getElementById('employeeForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); const btn = document.getElementById('btnSaveEmp'); const isEdit = document.getElementById('editEmpMode').value === "true";
        btn.textContent = 'Syncing...'; btn.disabled = true;

        let qualArr = [];
        document.querySelectorAll('#qualTableBody tr').forEach(tr => { qualArr.push({ type: tr.querySelector('.q-type').value, name: tr.querySelector('.q-name').value, inst: tr.querySelector('.q-inst').value, uni: tr.querySelector('.q-uni').value, dur: tr.querySelector('.q-dur').value, year: tr.querySelector('.q-year').value, perc: tr.querySelector('.q-perc').value, sub: tr.querySelector('.q-sub').value, ref: tr.querySelector('.q-ref').value, unv: tr.querySelector('.q-unv').checked }); });
        let expArr = [];
        document.querySelectorAll('#expTableBody tr').forEach(tr => { if(!tr.querySelector('.e-del').checked) { expArr.push({ org: tr.querySelector('.e-org').value, add: tr.querySelector('.e-add').value, from: tr.querySelector('.e-from').value, to: tr.querySelector('.e-to').value, dept: tr.querySelector('.e-dept').value, desig: tr.querySelector('.e-desig').value, resp: tr.querySelector('.e-resp').value }); } });

        const payload = {
            action: isEdit ? "updateEmployee" : "saveEmployee",
            data: { empId: getVal('empId'), empSalutation: getVal('empSalutation'), empName: getVal('empName'), empMobile: getVal('empMobile'), empPOB: getVal('empPOB'), empNat: getVal('empNat'), empStaffType: getVal('empStaffType'), empJoinDate: getVal('empJoinDate'), empEmail: getVal('empEmail'), empOffEmail: getVal('empOffEmail'), empGender: getVal('empGender'), empBlood: getVal('empBlood'), empDept: getVal('empDept'), empDob: getVal('empDob'), empBio: getVal('empBio'), empDesig: getVal('empDesig'), empMarital: getVal('empMarital'), empRel: getVal('empRel'), empUserType: getVal('empUserType'), empWing: getVal('empWing'), empRepAuth: getVal('empRepAuth'), empPan: getVal('empPan'), empAadhaar: getVal('empAadhaar'), empMarDate: getVal('empMarDate'), empBank: getVal('empBank'), empBranch: getVal('empBranch'), empAccNo: getVal('empAccNo'), empIfsc: getVal('empIfsc'), empPf: getVal('empPf'), empEsi: getVal('empEsi'), empAccType: getVal('empAccType'), empQual: JSON.stringify(qualArr), empExp: JSON.stringify(expArr), empPhotoBase64: getVal('empPhotoBase64') }
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(res => res.json()).then(data => {
            if(data.status === "Success") { alert(data.message); showView('module-employees-list'); syncWithDatabase(); } else alert("Error: " + data.message);
        }).finally(() => { btn.textContent = '💾 Save Employee'; btn.disabled = false; });
    });

    // ==========================================
    // INACTIVE EMPLOYEES LOGIC
    // ==========================================
    function populateInactiveDropdown() {
        const sel = document.getElementById('inactiveEmpSelect'); sel.innerHTML = '<option value="">--Select Active Employee--</option>';
        allEmployees.forEach(e => { if(e.Status !== "Inactive") { sel.innerHTML += `<option value="${e.empId}">${e.empId} - ${e.empName}</option>`; } });
    }

    document.getElementById('btnMarkInactive')?.addEventListener('click', () => {
        const empId = document.getElementById('inactiveEmpSelect').value; const date = document.getElementById('inactiveDate').value; const reason = document.getElementById('inactiveReason').value;
        if(!empId || !date || !reason) { alert("Please fill all fields."); return; }
        if(confirm(`Are you sure you want to mark ${empId} as Inactive?`)) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "inactiveEmployee", empId: empId, date: date, reason: reason }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(res => res.json()).then(data => {
                if(data.status === "Success") { alert(data.message); document.getElementById('inactiveDate').value = ""; document.getElementById('inactiveReason').value = ""; syncWithDatabase(); }
            });
        }
    });

    function renderInactiveEmployeesTable() {
        const tbody = document.getElementById('inactiveEmpTableBody'); tbody.innerHTML = '';
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
        const disp = document.getElementById('esDisplay'); disp.innerHTML = '';
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
        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "saveEmpSetup", data: empSetup }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(res => res.json()).then(data => { 
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

    // BULK MANAGE LOGIC FOR EMPLOYEE SETUP
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








// ==========================================
// EMPLOYEE MODAL TAB SWITCHING LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.emp-tab-btn');
    const tabContents = document.querySelectorAll('.emp-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and content
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding tab content
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
});
