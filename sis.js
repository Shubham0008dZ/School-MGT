window.customAlert = function(message) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#333;margin-bottom:20px;font-size:15px;font-weight:bold;">${message}</p><button onclick="this.parentElement.parentElement.remove()" style="padding:8px 25px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">OK</button></div>`;
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

// ==========================================
// 0. ADVANCED NETWORK & URL DIAGNOSTICS
// ==========================================
function runNetworkDiagnostics(currentUrl) {
    let diagnostics = {
        isDummyUrl: false,
        isBrowserOnline: navigator.onLine,
        timestamp: new Date().toISOString()
    };
    if(currentUrl.includes("YOUR_NEW_DEPLOYMENT_ID_HERE")) {
        diagnostics.isDummyUrl = true;
        console.error("CRITICAL ERROR: Dummy URL detected.");
    }
    console.log("Network Diagnostics Run: ", diagnostics);
    return diagnostics;
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

    // =========================================================================
    // USER PROVIDED EXACT SCRIPT URL
    // =========================================================================
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    const networkHealth = runNetworkDiagnostics(scriptURL);

    fetch(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }),
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" }
    })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") {
            alert("Session Invalid: Your account was deleted or marked inactive.");
            localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
        } else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    }).catch(err => {
        console.log("Background sync paused due to network/cors block.", err);
        let sessionRetry = false;
        if(sessionRetry) console.log("Retrying session sync...");
    });

    const topRightSpans = document.querySelectorAll('.top-right span');
    if(topRightSpans.length > 0) { topRightSpans[0].innerHTML = `👤 Welcome, <b>${activeUser.empName}</b>`; }

    if (!isSA && !userRights.some(r => r.startsWith("SIS_"))) { window.location.href = 'index.html'; return; }

    if (!isSA) {
        if(!userRights.includes("SIS_Add")) { let addBtn = document.getElementById('btn-add-student'); if(addBtn) addBtn.remove(); }
        if(!userRights.includes("SIS_Setup")) { let setupLink = document.getElementById('setupLinkBtn'); if(setupLink) setupLink.remove(); }
    }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => { customConfirm("Are you sure you want to logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });
    }
    
    let appData = []; let setupData = null; let feeHeads = []; let feeReceipts = [];  
    let charts = { class: null, blood: null, cat: null, rel: null, house: null, age: null };
    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    // ==========================================
    // IMAGE PREVIEW LOGIC FOR ALL 3 PHOTOS
    // ==========================================
    function handleImagePreview(inputId, imgId) {
        const input = document.getElementById(inputId);
        const img = document.getElementById(imgId);
        if(input && img) {
            input.addEventListener('change', function() {
                const file = this.files[0];
                if(file) {
                    const reader = new FileReader();
                    reader.onload = function(e) { img.src = e.target.result; }
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    handleImagePreview('photoUpload', 'photoPreview');
    handleImagePreview('fatherPhotoUpload', 'fatherPhotoPreview');
    handleImagePreview('motherPhotoUpload', 'motherPhotoPreview');

    const formTabs = document.querySelectorAll('.form-tabs .tab');
    const tabContents = document.querySelectorAll('.form-tab-content');
    formTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            formTabs.forEach(t => t.classList.remove('active')); tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active'); document.getElementById(tab.getAttribute('data-target')).classList.add('active');
        });
    });

    document.getElementById('dob').addEventListener('change', function() {
        let dob = new Date(this.value); let today = new Date();
        let age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
        document.getElementById('ageAsOnToday').value = age > 0 ? age + " Years" : "";
    });

    document.getElementById('sameAddress').addEventListener('change', function() {
        if(this.checked) {
            document.getElementById('permAddress').value = document.getElementById('corrAddress').value; document.getElementById('permCity').value = document.getElementById('corrCity').value; document.getElementById('permState').value = document.getElementById('corrState').value; document.getElementById('permCountry').value = document.getElementById('corrCountry').value; document.getElementById('permPincode').value = document.getElementById('corrPincode').value;
        } else {
            document.getElementById('permAddress').value = ""; document.getElementById('permCity').value = ""; document.getElementById('permState').value = ""; document.getElementById('permCountry').value = ""; document.getElementById('permPincode').value = "";
        }
    });

    function updateNextRegNo() {
        let maxReg = 0; appData.forEach(s => { let num = parseInt(s.regNo, 10); if(!isNaN(num) && num > maxReg) maxReg = num; });
        document.getElementById('lastRegNoDisplay').innerText = maxReg;
        if(document.getElementById('editMode').value === "false") document.getElementById('regNo').value = maxReg + 1;
    }

    // ==========================================
    // AUTO LOAD SYNC WITH ADVANCED ERROR LOGGER
    // ==========================================
    window.syncWithDatabase = function() {
        const tbody = document.getElementById('studentTableBody'); 
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; font-weight:bold; padding:20px;">Syncing with Database... ⏳<br><span style="font-size:11px; color:#777;">Please wait, fetching records.</span></td></tr>';
        
        fetch(scriptURL, { redirect: "follow" })
        .then(res => {
            if(!res.ok) throw new Error("HTTP Status: " + res.status);
            return res.json();
        })
        .then(res => {
            if(res.status === "Success") { 
                appData = res.data; setupData = res.setup; feeHeads = res.feeHeads || []; feeReceipts = res.receipts || []; 
                loadSetupDropdowns(); renderTable(appData); renderDashboard(); updateNextRegNo(); renderMasterSetup(); 
            } else { 
                tbody.innerHTML = `<tr><td colspan="9" style="color:red; text-align:center; padding:20px;"><b>Error:</b> ${res.message}</td></tr>`; 
            }
        }).catch(e => { 
            let detailedError = e.message || e.toString();
            console.error("Fetch Error Details: ", e);
            
            let extraWarning = "";
            if (networkHealth.isDummyUrl) {
                extraWarning = `<div style="background:#f39c12; color:white; padding:10px; border-radius:4px; margin-bottom:15px; font-weight:bold;">🚨 YOU FORGOT TO UPDATE THE SCRIPT URL IN SIS.JS! PLEASE PASTE YOUR ACTUAL DEPLOYMENT ID.</div>`;
            }

            tbody.innerHTML = `<tr><td colspan="9" style="color:#c0392b; text-align:center; padding:30px; background:#fdf0ed;">
                ${extraWarning}
                <span style="font-size:20px; font-weight:bold;">⚠️ API Connection Failed</span><br><br>
                <span style="font-size:14px; color:#333;"><b>Reason:</b> ${detailedError}</span><br><br>
                <div style="background:white; border:1px solid #e74c3c; border-radius:5px; padding:15px; display:inline-block; text-align:left; color:#555; font-size:13px;">
                    <b style="color:#e74c3c;">Troubleshooting Steps:</b><br><br>
                    1. Ensure the Google Script deployment access is set to "Anyone".<br>
                    2. Disable your <b>AdBlocker</b> or <b>Antivirus</b> temporarily (They block script.google.com).<br>
                    3. Connect to a different network/Mobile Hotspot.
                </div><br><br>
                <button onclick="syncWithDatabase()" style="background:#e74c3c; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow:0 2px 4px rgba(0,0,0,0.2);">🔄 Retry Connection</button>
            </td></tr>`; 
        });
    }

    function fillSelectWithAll(id, array, isObj = false) { 
        const el = document.getElementById(id); if(!el) return; el.innerHTML = '<option value="">All</option>'; 
        if(array) { array.forEach(item => { let val = isObj ? `${item.name} (${item.section})` : item; el.innerHTML += `<option value="${val}">${val}</option>`; }); } 
    }

    function fillSalutations() {
        const fSal = document.getElementById('fatherSalutation'); const mSal = document.getElementById('motherSalutation');
        if(fSal) fSal.innerHTML = '<option value="">Select</option>'; if(mSal) mSal.innerHTML = '<option value="">Select</option>';
        if(setupData && setupData.salutations) {
            setupData.salutations.forEach(item => {
                let match = item.match(/(.*?)\s*\((.*?)\)/);
                if(match) {
                    let title = match[1].trim(); let gender = match[2].trim().toLowerCase();
                    if(gender === 'male' && fSal) fSal.innerHTML += `<option value="${title}">${title}</option>`;
                    if(gender === 'female' && mSal) mSal.innerHTML += `<option value="${title}">${title}</option>`;
                } else {
                    if(fSal) fSal.innerHTML += `<option value="${item}">${item}</option>`;
                }
            });
        }
    }

    // ==========================================
    // CASCADING FILTERS WITH ALPHABETICAL SORT (CRASH FIXED)
    // ==========================================
    function loadSetupDropdowns() {
        if(!setupData) return; 
        function fillSelect(id, array, isObj = false) { const el = document.getElementById(id); if(!el) return; el.innerHTML = '<option value="">Select</option>'; if(array) { array.forEach(item => { let val = isObj ? `${item.name} (${item.section})` : item; el.innerHTML += `<option value="${val}">${val}</option>`; }); } }
        
        fillSelect('studentClass', setupData.classes, true); fillSelect('gender', setupData.genders); fillSelect('category', setupData.categories); fillSelect('bloodGroup', setupData.bloodGroups); fillSelect('house', setupData.houses); fillSelect('religion', setupData.religions);
        
        let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))];
        
        // BUG FIX: Wrapped a and b in String() to prevent "a.localeCompare is not a function" when names are numbers.
        // This preserves the exact sorting functionality requested previously but safely.
        uniqueClasses.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
        
        fillSelectWithAll('filterClass', uniqueClasses);
        
        // Ensure section sorting handles raw numbers securely too
        let uniqueSections = [...new Set((setupData.classes || []).map(c => String(c.section)))].sort();
        fillSelectWithAll('filterSection', uniqueSections);

        fillSelectWithAll('filterGender', setupData.genders);
        fillSelectWithAll('filterCategory', setupData.categories);
        fillSelectWithAll('filterBloodGroup', setupData.bloodGroups);
        fillSelectWithAll('filterHouse', setupData.houses);
        fillSelectWithAll('filterReligion', setupData.religions);

        fillSalutations();
    }

    const fClassDropdown = document.getElementById('filterClass');
    const fSecDropdown = document.getElementById('filterSection');
    if(fClassDropdown && fSecDropdown) {
        fClassDropdown.addEventListener('change', function() {
            let selClass = this.value;
            fSecDropdown.innerHTML = '<option value="">All</option>';
            if(selClass && selClass !== "All" && setupData && setupData.classes) {
                let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                let uniqueSecs = [...new Set(filteredSecs)].sort(); 
                uniqueSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
            } else if (setupData && setupData.classes) {
                let allSecs = [...new Set(setupData.classes.map(c => String(c.section)))].sort();
                allSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
            }
        });
    }

    function renderTable(dataToRender) {
        const tbody = document.getElementById('studentTableBody'); tbody.innerHTML = '';
        if(dataToRender.length === 0) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No records found.</td></tr>'; return; }
        
        dataToRender.forEach(student => {
            const tr = document.createElement('tr'); const studentJson = JSON.stringify(student).replace(/'/g, "&#39;");
            let btnHTML = "";
            if(isSA || userRights.includes("SIS_Edit")) btnHTML += `<button style="background:#f39c12; color:white; border:none; padding:5px; cursor:pointer;" onclick='editStudent(${studentJson})'>✏️ Edit</button> `;
            if(isSA || userRights.includes("SIS_Delete")) btnHTML += `<button style="background:#e74c3c; color:white; border:none; padding:5px; cursor:pointer;" onclick="deleteStudent('${student.regNo}')">🗑️ Del</button>`;
            
            let sClass = "-", sSec = "-";
            if(student.studentClass) {
                let match = student.studentClass.match(/(.*?)\s*\((.*?)\)/);
                if(match) { sClass = match[1].trim(); sSec = match[2].trim(); } else { sClass = student.studentClass; }
            }

            tr.innerHTML = `<td>${student.regNo || '-'}</td><td>${sClass}</td><td>${sSec}</td><td><a href="#" class="student-ledger-link" onclick="openLedger('${student.regNo}')" title="View Fee Ledger">${student.studentFirstName || student.studentName || '-'}</a></td><td>${student.gender || '-'}</td><td>${student.category || '-'}</td><td>${student.bloodGroup || '-'}</td><td>${student.house || '-'}</td><td>${btnHTML}</td>`;
            tbody.appendChild(tr);
        });
    }

    const btnApplyFilter = document.getElementById('btn-apply-filter');
    const searchNameInput = document.getElementById('searchName');

    function applyAllFilters() {
        const fClass = document.getElementById('filterClass').value; 
        const fSec = document.getElementById('filterSection').value;
        const fGender = document.getElementById('filterGender').value; 
        const fHouse = document.getElementById('filterHouse').value;
        const fCat = document.getElementById('filterCategory').value;
        const fBlood = document.getElementById('filterBloodGroup').value;
        const fRel = document.getElementById('filterReligion').value;
        const fName = searchNameInput.value.toLowerCase();
        
        let filtered = appData.filter(s => {
            let sClass = "", sSec = "";
            if(s.studentClass) {
                let match = s.studentClass.match(/(.*?)\s*\((.*?)\)/);
                if(match) { sClass = match[1].trim(); sSec = match[2].trim(); } else { sClass = s.studentClass; }
            }

            let matchClass = fClass === "" || fClass === "All" || String(sClass) === String(fClass); 
            let matchSec = fSec === "" || fSec === "All" || String(sSec) === String(fSec);
            let matchGender = fGender === "" || fGender === "All" || s.gender === fGender;
            let matchHouse = fHouse === "" || fHouse === "All" || s.house === fHouse;
            let matchCat = fCat === "" || fCat === "All" || s.category === fCat;
            let matchBlood = fBlood === "" || fBlood === "All" || s.bloodGroup === fBlood;
            let matchRel = fRel === "" || fRel === "All" || s.religion === fRel;
            
            let sNameStr = (s.studentFirstName || s.studentName || "").toLowerCase(); 
            let matchName = fName === "" || sNameStr.includes(fName);
            
            return matchClass && matchSec && matchGender && matchHouse && matchCat && matchBlood && matchRel && matchName;
        });
        
        renderTable(filtered);
        document.getElementById('filterDropdownPanel').style.display = 'none';
    }

    if(btnApplyFilter) btnApplyFilter.addEventListener('click', applyAllFilters);
    
    if(searchNameInput) {
        searchNameInput.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') { e.preventDefault(); applyAllFilters(); }
        });
    }

    const btnToggleFilters = document.getElementById('btn-toggle-filters');
    const filterPanel = document.getElementById('filterDropdownPanel');
    if(btnToggleFilters && filterPanel) {
        btnToggleFilters.addEventListener('click', (e) => {
            e.stopPropagation();
            filterPanel.style.display = filterPanel.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (filterPanel.style.display === 'block' && !filterPanel.contains(e.target) && !btnToggleFilters.contains(e.target)) { filterPanel.style.display = 'none'; }
        });
    }

    document.getElementById('btn-refresh-data').addEventListener('click', syncWithDatabase);

    function calculateAgeForGraph(dobStr) { if(!dobStr) return "N/A"; let diff = new Date() - new Date(dobStr); return Math.floor(diff / 31557600000); }

    function renderDashboard() {
        document.getElementById('dash-total-count').textContent = appData.length; document.getElementById('dash-male-count').textContent = appData.filter(s => s.gender === 'Male').length; document.getElementById('dash-female-count').textContent = appData.filter(s => s.gender === 'Female').length;
        let counts = { class: {}, blood: {}, cat: {}, rel: {}, house: {}, age: {"0-10":0, "11-15":0, "16-20":0, "20+":0} };
        appData.forEach(s => {
            counts.class[s.studentClass || 'NA'] = (counts.class[s.studentClass || 'NA'] || 0) + 1; counts.blood[s.bloodGroup || 'NA'] = (counts.blood[s.bloodGroup || 'NA'] || 0) + 1; counts.cat[s.category || 'NA'] = (counts.cat[s.category || 'NA'] || 0) + 1; counts.rel[s.religion || 'NA'] = (counts.rel[s.religion || 'NA'] || 0) + 1; counts.house[s.house || 'NA'] = (counts.house[s.house || 'NA'] || 0) + 1;
            let age = calculateAgeForGraph(s.dob);
            if(age !== "N/A") { if(age <= 10) counts.age["0-10"]++; else if(age <= 15) counts.age["11-15"]++; else if(age <= 20) counts.age["16-20"]++; else counts.age["20+"]++; }
        });
        function createChart(id, ctxId, dataObj, color) {
            const ctx = document.getElementById(ctxId).getContext('2d'); if(charts[id]) charts[id].destroy();
            charts[id] = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(dataObj), datasets: [{ label: 'Students', data: Object.values(dataObj), backgroundColor: color }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }
        Chart.defaults.font.family = 'Arial';
        createChart('class', 'chartClass', counts.class, '#64b5f6'); createChart('blood', 'chartBlood', counts.blood, '#e57373'); createChart('cat', 'chartCat', counts.cat, '#ffb74d'); createChart('rel', 'chartRel', counts.rel, '#ba68c8'); createChart('house', 'chartHouse', counts.house, '#4dd0e1'); createChart('age', 'chartAge', counts.age, '#aed581');
    }

    function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ''; }
    function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

    window.editStudent = function(s) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module')); document.getElementById('module-admission').classList.add('active-module');
        document.getElementById('formTitle').innerText = "Edit Student Profile"; document.getElementById('saveSubmitBtn').innerText = "Update Record in DB"; document.getElementById('saveSubmitBtn').style.background = "#f39c12"; document.getElementById('editMode').value = "true"; formTabs[0].click(); 
        setVal('regNo', s.regNo); document.getElementById('regNo').readOnly = true; setVal('adminDate', s.adminDate ? new Date(s.adminDate).toISOString().split('T')[0] : ''); setVal('studentFirstName', s.studentFirstName || s.studentName); setVal('studentLastName', s.studentLastName); setVal('primaryEmail', s.primaryEmail); setVal('dob', s.dob ? new Date(s.dob).toISOString().split('T')[0] : ''); if(s.dob) document.getElementById('dob').dispatchEvent(new Event('change'));
        setVal('mobile', s.mobile); setVal('placeOfBirth', s.placeOfBirth); setVal('motherTongue', s.motherTongue); setVal('studentClass', s.studentClass); setVal('gender', s.gender); setVal('bloodGroup', s.bloodGroup); setVal('category', s.category); setVal('house', s.house); setVal('religion', s.religion); setVal('udiseNo', s.udiseNo); setVal('apaarId', s.apaarId); setVal('aadhaarNo', s.aadhaarNo); setVal('prevSchool', s.prevSchool);
        setVal('fatherName', s.fatherName); setVal('fatherSalutation', s.fatherSalutation); setVal('fatherContact', s.fatherContact); setVal('fatherWhatsapp', s.fatherWhatsapp); setVal('fatherProfession', s.fatherProfession); setVal('fatherQualification', s.fatherQualification); setVal('fatherDesignation', s.fatherDesignation); setVal('fatherIncome', s.fatherIncome); setVal('fatherOfficeName', s.fatherOfficeName); setVal('fatherOfficeContact', s.fatherOfficeContact); setVal('fatherOfficeAddress', s.fatherOfficeAddress); setVal('fatherAadhaar', s.fatherAadhaar);
        setVal('motherName', s.motherName); setVal('motherSalutation', s.motherSalutation); setVal('motherContact', s.motherContact); setVal('motherWhatsapp', s.motherWhatsapp); setVal('motherProfession', s.motherProfession); setVal('motherQualification', s.motherQualification); setVal('motherDesignation', s.motherDesignation); setVal('motherIncome', s.motherIncome); setVal('motherOfficeName', s.motherOfficeName); setVal('motherOfficeContact', s.motherOfficeContact); setVal('motherOfficeAddress', s.motherOfficeAddress); setVal('motherAadhaar', s.motherAadhaar);
        setVal('corrAddress', s.corrAddress); setVal('corrCity', s.corrCity); setVal('corrState', s.corrState); setVal('corrCountry', s.corrCountry); setVal('corrPincode', s.corrPincode); setVal('permAddress', s.permAddress); setVal('permCity', s.permCity); setVal('permState', s.permState); setVal('permCountry', s.permCountry); setVal('permPincode', s.permPincode);
    };

    window.deleteStudent = function(regNo) {
        customConfirm(`Are you sure you want to delete Reg No: ${regNo} from Database?`, () => {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "delete", regNo: regNo }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
            .then(res => res.json()).then(data => { if(data.status === "Success") { customAlert(data.message || "Deleted from DB!"); syncWithDatabase(); } });
        });
    };

    document.getElementById('admissionForm').addEventListener('submit', function(e) {
        e.preventDefault(); const submitBtn = document.getElementById('saveSubmitBtn'); const isEdit = document.getElementById('editMode').value === "true"; submitBtn.textContent = 'Syncing...'; submitBtn.disabled = true;
        const studentData = {
            regNo: getVal('regNo'), adminDate: getVal('adminDate'), studentFirstName: getVal('studentFirstName'), studentLastName: getVal('studentLastName'), primaryEmail: getVal('primaryEmail'), dob: getVal('dob'), mobile: getVal('mobile'), placeOfBirth: getVal('placeOfBirth'), motherTongue: getVal('motherTongue'), studentClass: getVal('studentClass'), gender: getVal('gender'), bloodGroup: getVal('bloodGroup'), category: getVal('category'), house: getVal('house'), religion: getVal('religion'), udiseNo: getVal('udiseNo'), apaarId: getVal('apaarId'), aadhaarNo: getVal('aadhaarNo'), prevSchool: getVal('prevSchool'), fatherName: getVal('fatherName'), fatherSalutation: getVal('fatherSalutation'), fatherContact: getVal('fatherContact'), fatherWhatsapp: getVal('fatherWhatsapp'), fatherProfession: getVal('fatherProfession'), fatherQualification: getVal('fatherQualification'), fatherDesignation: getVal('fatherDesignation'), fatherIncome: getVal('fatherIncome'), fatherOfficeName: getVal('fatherOfficeName'), fatherOfficeContact: getVal('fatherOfficeContact'), fatherOfficeAddress: getVal('fatherOfficeAddress'), fatherAadhaar: getVal('fatherAadhaar'), motherName: getVal('motherName'), motherSalutation: getVal('motherSalutation'), motherContact: getVal('motherContact'), motherWhatsapp: getVal('motherWhatsapp'), motherProfession: getVal('motherProfession'), motherQualification: getVal('motherQualification'), motherDesignation: getVal('motherDesignation'), motherIncome: getVal('motherIncome'), motherOfficeName: getVal('motherOfficeName'), motherOfficeContact: getVal('motherOfficeContact'), motherOfficeAddress: getVal('motherOfficeAddress'), motherAadhaar: getVal('motherAadhaar'), corrAddress: getVal('corrAddress'), corrCity: getVal('corrCity'), corrState: getVal('corrState'), corrCountry: getVal('corrCountry'), corrPincode: getVal('corrPincode'), permAddress: getVal('permAddress'), permCity: getVal('permCity'), permState: getVal('permState'), permCountry: getVal('permCountry'), permPincode: getVal('permPincode')
        };
        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: isEdit ? "update" : "add", data: studentData }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
        .then(res => res.json()).then(data => {
            if(data.status === "Success") { customAlert(data.message || (isEdit ? "Updated in DB!" : "Added to DB!")); document.getElementById('btn-back-to-profiles').click(); syncWithDatabase(); } else { customAlert("Error: " + data.message); }
        }).finally(() => { submitBtn.textContent = 'Save Record to DB'; submitBtn.disabled = false; });
    });

    const btnAddStudent = document.getElementById('btn-add-student');
    if(btnAddStudent) {
        btnAddStudent.addEventListener('click', () => {
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module')); document.getElementById('module-admission').classList.add('active-module');
            document.getElementById('admissionForm').reset(); document.getElementById('formTitle').innerText = "Student Admission Form"; document.getElementById('saveSubmitBtn').innerText = "Save Record to DB"; document.getElementById('saveSubmitBtn').style.background = "#5cb85c"; document.getElementById('editMode').value = "false"; document.getElementById('regNo').readOnly = false; formTabs[0].click(); updateNextRegNo(); 
        });
    }

    document.getElementById('btn-back-to-profiles').addEventListener('click', () => { document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module')); document.getElementById('module-profiles').classList.add('active-module'); });

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            this.classList.add('active'); const targetId = this.getAttribute('data-target');
            if(targetId) { document.getElementById(targetId).classList.add('active-module'); if(targetId === 'module-dashboard') { setTimeout(() => { Object.values(charts).forEach(c => { if(c) c.resize(); }); }, 100); } }
        });
    });

    // EXPORT DROPDOWN LOGIC
    const exportToggle = document.getElementById('btnExportStudentsToggle');
    const exportMenu = document.getElementById('studentsExportMenu');
    if(exportToggle && exportMenu) {
        exportToggle.addEventListener('click', (e) => { e.stopPropagation(); exportMenu.style.display = exportMenu.style.display === 'flex' ? 'none' : 'flex'; });
        document.addEventListener('click', () => { exportMenu.style.display = 'none'; });
    }

    document.getElementById('exportStudentsPdfBtn').addEventListener('click', () => {
        let element = document.getElementById('studentsExportArea');
        let opt = { margin: 0.3, filename: "Student_Profiles_Export.pdf", image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } };
        let originalBg = element.style.background; element.style.background = "#fff";
        html2pdf().set(opt).from(element).save().then(() => { element.style.background = originalBg; });
    });

    document.getElementById('exportStudentsExcelBtn').addEventListener('click', () => {
        let exportDiv = document.getElementById('studentsExportArea').cloneNode(true);
        exportDiv.querySelectorAll('th:last-child, td:last-child').forEach(el => el.remove());
        let htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #2c3e50; color: white; font-weight: bold; }</style></head><body>${exportDiv.innerHTML}</body></html>`;
        let blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; a.download = "Student_Profiles_Export.xls"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    // ==========================================
    // MASTER SETUP INTEGRATION
    // ==========================================
    const msCategoryEl = document.getElementById('msCategory');
    if(msCategoryEl) {
        msCategoryEl.addEventListener('change', function() {
            const valInput = document.getElementById('msValue'); const classExtra = document.getElementById('msClassExtra'); const salExtra = document.getElementById('msSalutationExtra'); const cat = this.value;
            classExtra.style.display = 'none'; salExtra.style.display = 'none';
            document.getElementById('msSection').required = false; document.getElementById('msFee').required = false;
            if(cat === 'classes') { valInput.placeholder = "e.g., Class X (or 10)"; classExtra.style.display = 'block'; document.getElementById('msSection').required = true; document.getElementById('msFee').required = true; } 
            else if(cat === 'salutations') { valInput.placeholder = "e.g., Mr., Mrs., Dr."; salExtra.style.display = 'block'; } 
            else {
                if(cat === 'genders') valInput.placeholder = "e.g., Male, Female";
                else if(cat === 'categories') valInput.placeholder = "e.g., General, OBC, SC";
                else if(cat === 'bloodGroups') valInput.placeholder = "e.g., A+, O-";
                else if(cat === 'houses') valInput.placeholder = "e.g., Red House, Blue House";
                else if(cat === 'religions') valInput.placeholder = "e.g., Hindu, Muslim";
            }
        });
    }

    const masterSetupForm = document.getElementById('masterSetupForm');
    if(masterSetupForm) {
        masterSetupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const cat = document.getElementById('msCategory').value; const val = document.getElementById('msValue').value.trim(); const editIndex = document.getElementById('msEditIndex').value;
            if(!setupData) setupData = { classes: [], genders: [], categories: [], bloodGroups: [], houses: [], religions: [], salutations: [] };
            if(!setupData[cat]) setupData[cat] = [];
            
            if(editIndex !== "-1") {
                if(cat === 'classes') { setupData[cat][editIndex] = { name: val, section: document.getElementById('msSection').value.trim(), fee: document.getElementById('msFee').value.trim() }; } 
                else if(cat === 'salutations') { const gender = document.querySelector('input[name="salGender"]:checked').value; setupData[cat][editIndex] = `${val} (${gender})`; } 
                else { setupData[cat][editIndex] = val; }
            } else {
                if(cat === 'classes') {
                    const sec = document.getElementById('msSection').value.trim(); const fee = document.getElementById('msFee').value.trim();
                    const exists = setupData.classes.some(c => String(c.name).toLowerCase() === String(val).toLowerCase() && String(c.section).toLowerCase() === String(sec).toLowerCase());
                    if(exists) { customAlert("Class and Section already exists!"); return; }
                    setupData.classes.push({ name: val, section: sec, fee: fee });
                } else if(cat === 'salutations') {
                    const gender = document.querySelector('input[name="salGender"]:checked').value; const fullVal = `${val} (${gender})`;
                    if(setupData[cat].includes(fullVal)) { customAlert("Value already exists!"); return; }
                    setupData[cat].push(fullVal);
                } else {
                    if(setupData[cat].includes(val)) { customAlert("Value already exists!"); return; }
                    setupData[cat].push(val);
                }
            }
            saveMasterSetupToDB();
        });
    }

    function saveMasterSetupToDB() {
        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "saveSetup", data: setupData }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
        .then(res => res.json()).then(data => {
            if(data.status === "Success") {
                customAlert("Master Setup Synced Successfully!"); document.getElementById('masterSetupForm').reset(); document.getElementById('msEditIndex').value = "-1"; document.getElementById('btnSaveMasterSetup').innerText = "Save Entry"; document.getElementById('btnSaveMasterSetup').style.background = "#27ae60"; document.getElementById('btnCancelEdit').style.display = "none"; document.getElementById('msCategory').dispatchEvent(new Event('change')); renderMasterSetup(); loadSetupDropdowns(); 
            }
        });
    }

    window.editMasterSetup = function(cat, index) {
        const item = setupData[cat][index]; document.getElementById('seCat').value = cat; document.getElementById('seIndex').value = index;
        document.getElementById('seClassExtra').style.display = 'none'; document.getElementById('seSection').required = false; document.getElementById('seFee').required = false; document.getElementById('seSalutationExtra').style.display = 'none';
        if(cat === 'classes') { document.getElementById('seValue').value = item.name; document.getElementById('seSection').value = item.section; document.getElementById('seFee').value = item.fee; document.getElementById('seClassExtra').style.display = 'block'; document.getElementById('seSection').required = true; document.getElementById('seFee').required = true; } 
        else if(cat === 'salutations') { let match = item.match(/(.*?)\s*\((.*?)\)/); if(match) { document.getElementById('seValue').value = match[1].trim(); let gen = match[2].trim().toLowerCase(); document.querySelector(`input[name="seSalGender"][value="${gen === 'male' ? 'Male' : 'Female'}"]`).checked = true; } else { document.getElementById('seValue').value = item; } document.getElementById('seSalutationExtra').style.display = 'block'; } 
        else { document.getElementById('seValue').value = item; }
        document.getElementById('singleEditModal').classList.add('active');
    };

    document.getElementById('closeSingleEditModal').addEventListener('click', () => { document.getElementById('singleEditModal').classList.remove('active'); });
    document.getElementById('btnCancelSingleEdit').addEventListener('click', () => { document.getElementById('singleEditModal').classList.remove('active'); });

    document.getElementById('singleEditForm').addEventListener('submit', function(e) {
        e.preventDefault(); const cat = document.getElementById('seCat').value; const idx = document.getElementById('seIndex').value; const val = document.getElementById('seValue').value.trim();
        if(cat === 'classes') { setupData[cat][idx] = { name: val, section: document.getElementById('seSection').value.trim(), fee: document.getElementById('seFee').value.trim() }; } 
        else if (cat === 'salutations') { const gender = document.querySelector('input[name="seSalGender"]:checked').value; setupData[cat][idx] = `${val} (${gender})`; } 
        else { setupData[cat][idx] = val; }
        document.getElementById('singleEditModal').classList.remove('active'); saveMasterSetupToDB();
    });

    window.openBulkManage = function(cat) {
        document.getElementById('bulkCatTitle').innerText = cat.toUpperCase(); document.getElementById('bulkCatTitle').dataset.cat = cat;
        const thead = document.getElementById('bulkTableHeader'); const tbody = document.getElementById('bulkTableBody'); thead.innerHTML = ''; tbody.innerHTML = '';
        if(cat === 'classes') {
            thead.innerHTML = '<tr><th>Class Name</th><th>Section</th><th>Fee (₹)</th><th style="width:50px;">Action</th></tr>';
            if(setupData[cat] && setupData[cat].length > 0) { setupData[cat].forEach(c => addBulkRow(cat, c.name, c.section, c.fee)); } else { addBulkRow(cat, '', '', ''); }
        } else if (cat === 'salutations') {
            thead.innerHTML = '<tr><th>Salutation</th><th>Gender (Male/Female)</th><th style="width:50px;">Action</th></tr>';
            if(setupData[cat] && setupData[cat].length > 0) { setupData[cat].forEach(val => { let match = val.match(/(.*?)\s*\((.*?)\)/); if(match) addBulkRow(cat, match[1].trim(), match[2].trim()); else addBulkRow(cat, val, ''); }); } else { addBulkRow(cat, '', ''); }
        } else {
            thead.innerHTML = '<tr><th>Name / Value</th><th style="width:50px;">Action</th></tr>';
            if(setupData[cat] && setupData[cat].length > 0) { setupData[cat].forEach(val => addBulkRow(cat, val)); } else { addBulkRow(cat, ''); }
        }
        document.getElementById('bulkManageModal').classList.add('active');
    };

    function addBulkRow(cat, val1='', val2='', val3='') {
        const tbody = document.getElementById('bulkTableBody'); const tr = document.createElement('tr');
        if(cat === 'classes') { tr.innerHTML = `<td><input type="text" class="blk-val1" value="${val1}" placeholder="Class"></td><td><input type="text" class="blk-val2" value="${val2}" placeholder="Section"></td><td><input type="number" class="blk-val3" value="${val3}" placeholder="Fee"></td><td><button type="button" class="btn-red" onclick="this.closest('tr').remove()">🗑️</button></td>`; } 
        else if (cat === 'salutations') { tr.innerHTML = `<td><input type="text" class="blk-val1" value="${val1}" placeholder="e.g. Mr."></td><td><input type="text" class="blk-val2" value="${val2}" placeholder="Male or Female"></td><td><button type="button" class="btn-red" onclick="this.closest('tr').remove()">🗑️</button></td>`; } 
        else { tr.innerHTML = `<td><input type="text" class="blk-val1" value="${val1}" placeholder="Value"></td><td><button type="button" class="btn-red" onclick="this.closest('tr').remove()">🗑️</button></td>`; }
        tbody.appendChild(tr);
    }

    document.getElementById('btnAddBulkRow').addEventListener('click', () => { const cat = document.getElementById('bulkCatTitle').dataset.cat; addBulkRow(cat); });
    document.getElementById('closeBulkModal').addEventListener('click', () => { document.getElementById('bulkManageModal').classList.remove('active'); });
    document.getElementById('btnCancelBulk').addEventListener('click', () => { document.getElementById('bulkManageModal').classList.remove('active'); });

    document.getElementById('btnSaveBulk').addEventListener('click', () => {
        const cat = document.getElementById('bulkCatTitle').dataset.cat; const rows = document.querySelectorAll('#bulkTableBody tr'); let newData = [];
        rows.forEach(tr => {
            if(cat === 'classes') { let n = tr.querySelector('.blk-val1').value.trim(); let s = tr.querySelector('.blk-val2').value.trim(); let f = tr.querySelector('.blk-val3').value.trim(); if(n && s) newData.push({name: n, section: s, fee: f || 0}); } 
            else if(cat === 'salutations') { let t = tr.querySelector('.blk-val1').value.trim(); let g = tr.querySelector('.blk-val2').value.trim(); if(t && g) newData.push(`${t} (${g})`); } 
            else { let v = tr.querySelector('.blk-val1').value.trim(); if(v) newData.push(v); }
        });
        setupData[cat] = newData; document.getElementById('bulkManageModal').classList.remove('active'); saveMasterSetupToDB();
    });

    window.deleteMasterSetup = function(cat, index) { customConfirm("Delete this setup entry?", () => { setupData[cat].splice(index, 1); saveMasterSetupToDB(); }); }

    function renderMasterSetup() {
        const area = document.getElementById('msDisplayArea'); if(!area) return; area.innerHTML = ''; if(!setupData) return;
        const titles = { classes: "CLASSES", genders: "GENDERS", categories: "CATEGORIES", bloodGroups: "BLOOD GROUPS", houses: "HOUSES", religions: "RELIGIONS", salutations: "SALUTATIONS" };
        
        Object.keys(titles).forEach(key => {
            let html = `<div style="border:1px solid #eee; border-radius:4px; padding:15px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #3498db; padding-bottom:5px;"><h4 style="margin:0; color:#2c3e50; text-transform:uppercase;">${titles[key]}</h4><button class="btn-purple" onclick="openBulkManage('${key}')">⚙️ Bulk Manage</button></div><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">`;
            if(setupData[key] && setupData[key].length > 0) {
                setupData[key].forEach((item, idx) => {
                    let displayTxt = "";
                    if(key === 'classes') displayTxt = `${item.name} (${item.section}) - ₹${item.fee}`; else displayTxt = item;
                    html += `<div style="background:#3498db; color:white; padding:5px 12px; border-radius:20px; font-size:13px; display:flex; align-items:center; gap:8px;"><span>${displayTxt}</span><span style="cursor:pointer; font-weight:bold; color:#f1c40f;" onclick="editMasterSetup('${key}', ${idx})" title="Edit">✏️</span><span style="cursor:pointer; font-weight:bold; color:#ffcccc;" onclick="deleteMasterSetup('${key}', ${idx})" title="Delete">✕</span></div>`;
                });
            } else { html += `<span style="color:#999; font-size:12px;">No entries found.</span>`; }
            html += `</div></div>`; area.innerHTML += html;
        });
    }

    // ==========================================
    // 8. THE "KUNDLI" - STUDENT FEE LEDGER (RESTORED)
    // ==========================================
    window.openLedger = function(regNo) {
        let student = appData ? appData.find(s => String(s.regNo) === String(regNo)) : null;
        let sName = "Unknown (Deleted)"; let sClass = "-"; let sFather = "-";

        if (student) { sName = student.studentFirstName || student.studentName || 'N/A'; sClass = student.studentClass || '-'; sFather = student.fatherName || '-'; } 
        else { let rec = feeReceipts.find(r => String(r.Reg_No) === String(regNo)); if(rec) { sName = rec.Student_Name; sClass = rec.Class_Section; } }
        
        document.getElementById('l-name').innerText = sName; document.getElementById('l-reg').innerText = regNo; document.getElementById('l-class').innerText = sClass; document.getElementById('l-father').innerText = sFather;
        
        let classFeeAmount = 0;
        if(student && student.studentClass && setupData && setupData.classes) { let cSetup = setupData.classes.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass); if(cSetup && cSetup.fee) { classFeeAmount = parseFloat(cSetup.fee); } }
        
        let paidMap = {}; let histBody = document.getElementById('ledgerHistoryBody'); histBody.innerHTML = '';
        
        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(regNo).trim()) {
                let particularsStr = "";
                try { 
                    let rawHeads = String(r.Paid_Heads || "").trim(); let rawSummary = String(r.Receipt_Summary || "").trim();
                    if(rawHeads !== "" && rawHeads !== "[]" && rawHeads.startsWith("[")) {
                        let details = JSON.parse(rawHeads); let pList = [];
                        details.forEach(d => { 
                            let pName = d.head || "Fee";
                            if(d.period && d.period !== "Monthly" && d.period !== "Annually" && d.period !== "One Time" && d.period !== "Quarterly") { pName += ` (${d.period})`; } 
                            else if (d.period) { pName += ` (${d.period})`; }
                            pList.push(`• ${pName}: ₹${parseFloat(d.paid || 0).toFixed(2)}`);
                            let uid = d.head + "_" + d.period; paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0);
                        }); 
                        particularsStr = pList.join("<br>");
                        if (particularsStr === "") { particularsStr = rawSummary || "Fee Payment"; }
                    } else if (rawSummary !== "") { particularsStr = rawSummary; } else { particularsStr = "Fee Payment"; }
                } catch(e){ particularsStr = r.Receipt_Summary || "Details Unavailable"; }
                
                let rNo = String(r.Receipt_No).replace("'", ""); let rDate = String(r.Date).replace("'", "");
                histBody.innerHTML += `<tr><td style="padding:10px; border:1px solid #ccc;">${rDate}</td><td style="padding:10px; border:1px solid #ccc;">${rNo}</td><td style="padding:10px; border:1px solid #ccc;">${r.Payment_Mode}</td><td style="padding:10px; border:1px solid #ccc; text-align:left; line-height:1.4; font-size:11px;">${particularsStr}</td><td style="padding:10px; border:1px solid #ccc; color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td></tr>`;
            }
        });
        
        if(histBody.innerHTML === '') { histBody.innerHTML = '<tr><td colspan="5" style="padding:10px; border:1px solid #ccc; text-align:center;">No payment history found.</td></tr>'; }
        
        let tbody = document.getElementById('ledgerTableBody'); tbody.innerHTML = ''; let totalDue = 0, totalPaid = 0;
        
        academicMonths.forEach(month => {
            let tAmt = classFeeAmount; let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0; let tBal = tAmt - tPaid; totalDue += tAmt; totalPaid += tPaid;
            let rowBg = (tAmt > 0 && tBal <= 0) ? 'background-color:#e8f5e9;' : ''; let tStyle = tBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
            tbody.innerHTML += `<tr style="${rowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>Monthly Tuition Fee (${month})</b></td><td style="padding:10px; border:1px solid #ccc;">₹${tAmt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${tPaid.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${tStyle} font-weight:bold;">₹${tBal.toFixed(2)}</td></tr>`;
            
            feeHeads.forEach(fh => {
                if(fh.Frequency === "Monthly") {
                    let fhAmt = parseFloat(fh.Amount) || 0; let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0; let fhBal = fhAmt - fhPaid; totalDue += fhAmt; totalPaid += fhPaid;
                    let subRowBg = (fhAmt > 0 && fhBal <= 0) ? 'background-color:#e8f5e9;' : ''; let fhStyle = fhBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                    tbody.innerHTML += `<tr style="${subRowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>${fh.Head_Name} (${month})</b></td><td style="padding:10px; border:1px solid #ccc;">₹${fhAmt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${fhPaid.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${fhStyle} font-weight:bold;">₹${fhBal.toFixed(2)}</td></tr>`;
                }
            });
        });
        
        feeHeads.forEach(fh => {
            if(fh.Frequency === "Annually" || fh.Frequency === "One Time (Annually)") {
                let amt = parseFloat(fh.Amount) || 0; let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0; let bal = amt - pd; totalDue += amt; totalPaid += pd;
                let anRowBg = (amt > 0 && bal <= 0) ? 'background-color:#e8f5e9;' : ''; let balStyle = bal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                tbody.innerHTML += `<tr style="${anRowBg}"><td style="padding:10px; border:1px solid #ccc;"><b>${fh.Head_Name} (Annual)</b></td><td style="padding:10px; border:1px solid #ccc;">₹${amt.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; color:#2980b9;">₹${pd.toFixed(2)}</td><td style="padding:10px; border:1px solid #ccc; ${balStyle} font-weight:bold;">₹${bal.toFixed(2)}</td></tr>`;
            }
        });
        
        document.getElementById('l-tot-due').innerText = "₹" + totalDue.toFixed(2); document.getElementById('l-tot-paid').innerText = "₹" + totalPaid.toFixed(2); document.getElementById('l-tot-bal').innerText = "₹" + (totalDue - totalPaid).toFixed(2);
        document.getElementById('ledgerModal').classList.add('active');
    }
    
    document.getElementById('closeLedgerBtn').addEventListener('click', () => { document.getElementById('ledgerModal').classList.remove('active'); });

    // Initial Trigger
    setTimeout(() => { syncWithDatabase(); }, 100);
});
