// CUSTOM NON-NATIVE ALERT MODAL (NO BROWSER PROMPTS)
window.customAlert = function(message) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;">
            <p style="color:#333;margin-bottom:20px;font-size:15px;font-weight:bold;">${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" style="padding:8px 25px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">OK</button>
        </div>
    `;
    document.body.appendChild(overlay);
};

// CUSTOM NON-NATIVE CONFIRM MODAL
window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;">
            <p style="color:#555;margin-bottom:20px;">${message}</p>
            <div style="display:flex;justify-content:center;gap:10px;">
                <button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button>
                <button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => overlay.remove());
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
};

document.addEventListener('DOMContentLoaded', () => {
    // 0. SECURITY CHECK & RBAC ENFORCEMENT
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    // Check module-level access
    if (!isSA && !userRights.some(r => r.startsWith("SIS_"))) {
        window.location.href = 'index.html'; return; // Kick back to dash if no rights at all
    }

    // Apply Granular Controls inside SIS
    if (!isSA) {
        if(!userRights.includes("SIS_Add")) {
            let addBtn = document.getElementById('btn-add-student');
            if(addBtn) addBtn.style.display = 'none';
        }
        if(!userRights.includes("SIS_Setup")) {
            let setupLink = document.querySelector('a[href="setup.html"]');
            if(setupLink) setupLink.style.display = 'none';
        }
    }

    // LOGOUT LOGIC
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm("Are you sure you want to logout?", () => {
                localStorage.removeItem('erp_active_user'); window.location.href = 'login.html';
            });
        });
    }

    // API URL - REPLACE THIS WITH YOUR NEW DEPLOYMENT URL!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    let appData = []; 
    let setupData = null;
    let feeHeads = [];     
    let feeReceipts = [];  
    let charts = { class: null, blood: null, cat: null, rel: null, house: null, age: null };
    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    // ==========================================
    // 0. FORM TABS & UI HELPERS
    // ==========================================
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

    document.getElementById('dob').addEventListener('change', function() {
        let dob = new Date(this.value);
        let today = new Date();
        let age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
        document.getElementById('ageAsOnToday').value = age > 0 ? age + " Years" : "";
    });

    document.getElementById('sameAddress').addEventListener('change', function() {
        if(this.checked) {
            document.getElementById('permAddress').value = document.getElementById('corrAddress').value;
            document.getElementById('permCity').value = document.getElementById('corrCity').value;
            document.getElementById('permState').value = document.getElementById('corrState').value;
            document.getElementById('permCountry').value = document.getElementById('corrCountry').value;
            document.getElementById('permPincode').value = document.getElementById('corrPincode').value;
        } else {
            document.getElementById('permAddress').value = ""; document.getElementById('permCity').value = "";
            document.getElementById('permState').value = ""; document.getElementById('permCountry').value = "";
            document.getElementById('permPincode').value = "";
        }
    });

    function updateNextRegNo() {
        let maxReg = 0;
        appData.forEach(s => {
            let num = parseInt(s.regNo, 10);
            if(!isNaN(num) && num > maxReg) maxReg = num;
        });
        document.getElementById('lastRegNoDisplay').innerText = maxReg;
        if(document.getElementById('editMode').value === "false") {
            document.getElementById('regNo').value = maxReg + 1;
        }
    }

    // ==========================================
    // 1. FETCH SYNC FROM DB
    // ==========================================
    function syncWithDatabase() {
        const tbody = document.getElementById('studentTableBody');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; font-weight:bold;">Syncing with Database... ⏳</td></tr>';

        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success") {
                    appData = res.data;
                    setupData = res.setup; 
                    feeHeads = res.feeHeads || [];
                    feeReceipts = res.receipts || [];
                    
                    loadSetupDropdowns();
                    renderTable(appData); 
                    renderDashboard();
                    updateNextRegNo(); 
                } else {
                    tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Error: ${res.message}</td></tr>`;
                }
            }).catch(e => tbody.innerHTML = '<tr><td colspan="8" style="color:red; text-align:center;">API Connection Failed</td></tr>');
    }

    // ==========================================
    // 2. SETUP DROPDOWNS
    // ==========================================
    function loadSetupDropdowns() {
        if(!setupData) return; 
        function fillSelect(id, array, isObj = false) {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = '<option value="">Select</option>';
            if(array) {
                array.forEach(item => {
                    let val = isObj ? `${item.name} (${item.section})` : item;
                    el.innerHTML += `<option value="${val}">${val}</option>`;
                });
            }
        }
        fillSelect('studentClass', setupData.classes, true); fillSelect('gender', setupData.genders);
        fillSelect('category', setupData.categories); fillSelect('bloodGroup', setupData.bloodGroups);
        fillSelect('house', setupData.houses); fillSelect('religion', setupData.religions);
        fillSelect('filterClass', setupData.classes, true);
    }

    // ==========================================
    // 3. TABLE RENDERING (WITH LEDGER LINK)
    // ==========================================
    function renderTable(dataToRender) {
        const tbody = document.getElementById('studentTableBody');
        tbody.innerHTML = '';
        if(dataToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No records found in DB.</td></tr>';
            return;
        }

        dataToRender.forEach(student => {
            const tr = document.createElement('tr');
            const studentJson = JSON.stringify(student).replace(/'/g, "&#39;");
            
            // Edit & Delete Buttons RBAC rendering
            let btnHTML = "";
            if(isSA || userRights.includes("SIS_Edit")) {
                btnHTML += `<button style="background:#f39c12; color:white; border:none; padding:5px; cursor:pointer;" onclick='editStudent(${studentJson})'>✏️ Edit</button> `;
            }
            if(isSA || userRights.includes("SIS_Delete")) {
                btnHTML += `<button style="background:#e74c3c; color:white; border:none; padding:5px; cursor:pointer;" onclick="deleteStudent('${student.regNo}')">🗑️ Del</button>`;
            }

            tr.innerHTML = `
                <td>${student.regNo || '-'}</td>
                <td>${student.studentClass || '-'}</td>
                <td><a href="#" class="student-ledger-link" onclick="openLedger('${student.regNo}')" title="View Fee Ledger">${student.studentFirstName || student.studentName || '-'}</a></td>
                <td>${student.gender || '-'}</td>
                <td>${student.category || '-'}</td>
                <td>${student.bloodGroup || '-'}</td>
                <td>${student.house || '-'}</td>
                <td>${btnHTML}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('btn-apply-filter').addEventListener('click', () => {
        const fClass = document.getElementById('filterClass').value;
        const fGender = document.getElementById('filterGender').value;
        const fName = document.getElementById('searchName').value.toLowerCase();

        let filtered = appData.filter(s => {
            let matchClass = fClass === "" || s.studentClass === fClass;
            let matchGender = fGender === "" || s.gender === fGender;
            let sName = (s.studentFirstName || s.studentName || "").toLowerCase();
            let matchName = fName === "" || sName.includes(fName);
            return matchClass && matchGender && matchName;
        });
        renderTable(filtered);
    });

    document.getElementById('btn-refresh-data').addEventListener('click', syncWithDatabase);

    // ==========================================
    // 4. DASHBOARD LOGIC
    // ==========================================
    function calculateAgeForGraph(dobStr) {
        if(!dobStr) return "N/A";
        let diff = new Date() - new Date(dobStr);
        return Math.floor(diff / 31557600000); 
    }

    function renderDashboard() {
        document.getElementById('dash-total-count').textContent = appData.length;
        document.getElementById('dash-male-count').textContent = appData.filter(s => s.gender === 'Male').length;
        document.getElementById('dash-female-count').textContent = appData.filter(s => s.gender === 'Female').length;

        let counts = { class: {}, blood: {}, cat: {}, rel: {}, house: {}, age: {"0-10":0, "11-15":0, "16-20":0, "20+":0} };

        appData.forEach(s => {
            counts.class[s.studentClass || 'NA'] = (counts.class[s.studentClass || 'NA'] || 0) + 1;
            counts.blood[s.bloodGroup || 'NA'] = (counts.blood[s.bloodGroup || 'NA'] || 0) + 1;
            counts.cat[s.category || 'NA'] = (counts.cat[s.category || 'NA'] || 0) + 1;
            counts.rel[s.religion || 'NA'] = (counts.rel[s.religion || 'NA'] || 0) + 1;
            counts.house[s.house || 'NA'] = (counts.house[s.house || 'NA'] || 0) + 1;
            
            let age = calculateAgeForGraph(s.dob);
            if(age !== "N/A") {
                if(age <= 10) counts.age["0-10"]++;
                else if(age <= 15) counts.age["11-15"]++;
                else if(age <= 20) counts.age["16-20"]++;
                else counts.age["20+"]++;
            }
        });

        function createChart(id, ctxId, dataObj, color) {
            const ctx = document.getElementById(ctxId).getContext('2d');
            if(charts[id]) charts[id].destroy();
            charts[id] = new Chart(ctx, {
                type: 'bar',
                data: { labels: Object.keys(dataObj), datasets: [{ label: 'Students', data: Object.values(dataObj), backgroundColor: color }] },
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
        Chart.defaults.font.family = 'Arial';
        createChart('class', 'chartClass', counts.class, '#64b5f6'); createChart('blood', 'chartBlood', counts.blood, '#e57373');
        createChart('cat', 'chartCat', counts.cat, '#ffb74d'); createChart('rel', 'chartRel', counts.rel, '#ba68c8');
        createChart('house', 'chartHouse', counts.house, '#4dd0e1'); createChart('age', 'chartAge', counts.age, '#aed581');
    }

    // ==========================================
    // 5. ADD / EDIT / DELETE LOGIC
    // ==========================================
    function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ''; }
    function setVal(id, val) { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }

    window.editStudent = function(s) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById('module-admission').classList.add('active-module');
        document.getElementById('formTitle').innerText = "Edit Student Profile";
        document.getElementById('saveSubmitBtn').innerText = "Update Record in DB";
        document.getElementById('saveSubmitBtn').style.background = "#f39c12";
        document.getElementById('editMode').value = "true";
        formTabs[0].click(); 

        setVal('regNo', s.regNo); document.getElementById('regNo').readOnly = true; 
        setVal('adminDate', s.adminDate ? new Date(s.adminDate).toISOString().split('T')[0] : '');
        setVal('studentFirstName', s.studentFirstName || s.studentName); 
        setVal('studentLastName', s.studentLastName); setVal('primaryEmail', s.primaryEmail);
        setVal('dob', s.dob ? new Date(s.dob).toISOString().split('T')[0] : '');
        if(s.dob) document.getElementById('dob').dispatchEvent(new Event('change'));

        setVal('mobile', s.mobile); setVal('placeOfBirth', s.placeOfBirth); setVal('motherTongue', s.motherTongue);
        setVal('studentClass', s.studentClass); setVal('gender', s.gender); setVal('bloodGroup', s.bloodGroup);
        setVal('category', s.category); setVal('house', s.house); setVal('religion', s.religion);
        setVal('udiseNo', s.udiseNo); setVal('apaarId', s.apaarId); setVal('aadhaarNo', s.aadhaarNo); setVal('prevSchool', s.prevSchool);

        setVal('fatherName', s.fatherName); setVal('fatherSalutation', s.fatherSalutation); setVal('fatherContact', s.fatherContact);
        setVal('fatherWhatsapp', s.fatherWhatsapp); setVal('fatherProfession', s.fatherProfession); setVal('fatherQualification', s.fatherQualification);
        setVal('fatherDesignation', s.fatherDesignation); setVal('fatherIncome', s.fatherIncome); setVal('fatherOfficeName', s.fatherOfficeName);
        setVal('fatherOfficeContact', s.fatherOfficeContact); setVal('fatherOfficeAddress', s.fatherOfficeAddress); setVal('fatherAadhaar', s.fatherAadhaar);

        setVal('motherName', s.motherName); setVal('motherSalutation', s.motherSalutation); setVal('motherContact', s.motherContact);
        setVal('motherWhatsapp', s.motherWhatsapp); setVal('motherProfession', s.motherProfession); setVal('motherQualification', s.motherQualification);
        setVal('motherDesignation', s.motherDesignation); setVal('motherIncome', s.motherIncome); setVal('motherOfficeName', s.motherOfficeName);
        setVal('motherOfficeContact', s.motherOfficeContact); setVal('motherOfficeAddress', s.motherOfficeAddress); setVal('motherAadhaar', s.motherAadhaar);

        setVal('corrAddress', s.corrAddress); setVal('corrCity', s.corrCity); setVal('corrState', s.corrState);
        setVal('corrCountry', s.corrCountry); setVal('corrPincode', s.corrPincode);
        setVal('permAddress', s.permAddress); setVal('permCity', s.permCity); setVal('permState', s.permState);
        setVal('permCountry', s.permCountry); setVal('permPincode', s.permPincode);
    };

    window.deleteStudent = function(regNo) {
        customConfirm(`Are you sure you want to delete Reg No: ${regNo} from Database?`, () => {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "delete", regNo: regNo }) })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    customAlert(data.message || "Deleted from DB!");
                    syncWithDatabase(); 
                }
            });
        });
    };

    document.getElementById('admissionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('saveSubmitBtn');
        const isEdit = document.getElementById('editMode').value === "true";
        submitBtn.textContent = 'Syncing...'; submitBtn.disabled = true;

        const studentData = {
            regNo: getVal('regNo'), adminDate: getVal('adminDate'),
            studentFirstName: getVal('studentFirstName'), studentLastName: getVal('studentLastName'),
            primaryEmail: getVal('primaryEmail'), dob: getVal('dob'),
            mobile: getVal('mobile'), placeOfBirth: getVal('placeOfBirth'), motherTongue: getVal('motherTongue'),
            studentClass: getVal('studentClass'), gender: getVal('gender'), bloodGroup: getVal('bloodGroup'), 
            category: getVal('category'), house: getVal('house'), religion: getVal('religion'),
            udiseNo: getVal('udiseNo'), apaarId: getVal('apaarId'), aadhaarNo: getVal('aadhaarNo'), prevSchool: getVal('prevSchool'),
            fatherName: getVal('fatherName'), fatherSalutation: getVal('fatherSalutation'), fatherContact: getVal('fatherContact'), 
            fatherWhatsapp: getVal('fatherWhatsapp'), fatherProfession: getVal('fatherProfession'), fatherQualification: getVal('fatherQualification'),
            fatherDesignation: getVal('fatherDesignation'), fatherIncome: getVal('fatherIncome'), fatherOfficeName: getVal('fatherOfficeName'), 
            fatherOfficeContact: getVal('fatherOfficeContact'), fatherOfficeAddress: getVal('fatherOfficeAddress'), fatherAadhaar: getVal('fatherAadhaar'),
            motherName: getVal('motherName'), motherSalutation: getVal('motherSalutation'), motherContact: getVal('motherContact'), 
            motherWhatsapp: getVal('motherWhatsapp'), motherProfession: getVal('motherProfession'), motherQualification: getVal('motherQualification'),
            motherDesignation: getVal('motherDesignation'), motherIncome: getVal('motherIncome'), motherOfficeName: getVal('motherOfficeName'), 
            motherOfficeContact: getVal('motherOfficeContact'), motherOfficeAddress: getVal('motherOfficeAddress'), motherAadhaar: getVal('motherAadhaar'),
            corrAddress: getVal('corrAddress'), corrCity: getVal('corrCity'), corrState: getVal('corrState'), corrCountry: getVal('corrCountry'), corrPincode: getVal('corrPincode'),
            permAddress: getVal('permAddress'), permCity: getVal('permCity'), permState: getVal('permState'), permCountry: getVal('permCountry'), permPincode: getVal('permPincode')
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: isEdit ? "update" : "add", data: studentData }) })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                customAlert(data.message || (isEdit ? "Updated in DB!" : "Added to DB!"));
                document.getElementById('btn-back-to-profiles').click();
                syncWithDatabase();
            } else customAlert("Error: " + data.message);
        })
        .finally(() => { submitBtn.textContent = 'Save Record to DB'; submitBtn.disabled = false; });
    });

    document.getElementById('btn-add-student').addEventListener('click', () => {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById('module-admission').classList.add('active-module');
        document.getElementById('admissionForm').reset();
        document.getElementById('formTitle').innerText = "Student Admission Form";
        document.getElementById('saveSubmitBtn').innerText = "Save Record to DB";
        document.getElementById('saveSubmitBtn').style.background = "#5cb85c";
        document.getElementById('editMode').value = "false";
        document.getElementById('regNo').readOnly = false; 
        formTabs[0].click(); 
        updateNextRegNo(); 
    });

    document.getElementById('btn-back-to-profiles').addEventListener('click', () => {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById('module-profiles').classList.add('active-module');
    });

    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            
            this.classList.add('active');
            const targetId = this.getAttribute('data-target');
            if(targetId) {
                document.getElementById(targetId).classList.add('active-module');
                if(targetId === 'module-dashboard') {
                    setTimeout(() => { Object.values(charts).forEach(c => { if(c) c.resize(); }); }, 100);
                }
            }
        });
    });

    // ==========================================
    // 7. THE "KUNDLI" - STUDENT FEE LEDGER (SIS)
    // ==========================================
    window.openLedger = function(regNo) {
        let student = appData.find(s => String(s.regNo) === String(regNo));
        if(!student) return;

        document.getElementById('l-name').innerText = student.studentFirstName || student.studentName || 'N/A';
        document.getElementById('l-reg').innerText = student.regNo;
        document.getElementById('l-class').innerText = student.studentClass || '-';
        document.getElementById('l-father').innerText = student.fatherName || '-';

        let classFeeAmount = 0;
        if(student.studentClass && setupData && setupData.classes) {
            let cSetup = setupData.classes.find(c => `${c.name} (${c.section})` === student.studentClass || c.name === student.studentClass);
            if(cSetup && cSetup.fee) classFeeAmount = parseFloat(cSetup.fee);
        }

        let paidMap = {};
        let histBody = document.getElementById('ledgerHistoryBody');
        histBody.innerHTML = '';

        feeReceipts.forEach(r => {
            if(String(r.Reg_No).trim() === String(regNo).trim()) {
                try {
                    let details = JSON.parse(r.Paid_Heads || "[]");
                    details.forEach(d => {
                        let uid = d.head + "_" + d.period;
                        paidMap[uid] = (paidMap[uid] || 0) + parseFloat(d.paid || 0);
                    });
                } catch(e){}
                
                let rNo = String(r.Receipt_No).replace("'", ""); 
                let rDate = String(r.Date).replace("'", "");
                histBody.innerHTML += `<tr><td>${rDate}</td><td>${rNo}</td><td>${r.Payment_Mode}</td><td style="color:#27ae60; font-weight:bold;">₹${parseFloat(r.Amount).toFixed(2)}</td></tr>`;
            }
        });

        if(histBody.innerHTML === '') histBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No payment history found.</td></tr>';

        let tbody = document.getElementById('ledgerTableBody');
        tbody.innerHTML = '';
        let totalDue = 0, totalPaid = 0;

        academicMonths.forEach(month => {
            let tAmt = classFeeAmount;
            let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0;
            let tBal = tAmt - tPaid;
            totalDue += tAmt; totalPaid += tPaid;
            
            let tStyle = tBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
            tbody.innerHTML += `<tr><td><b>Monthly Tuition Fee (${month})</b></td><td>₹${tAmt.toFixed(2)}</td><td style="color:#2980b9;">₹${tPaid.toFixed(2)}</td><td style="${tStyle} font-weight:bold;">₹${tBal.toFixed(2)}</td></tr>`;

            feeHeads.forEach(fh => {
                if(fh.Frequency === "Monthly") {
                    let fhAmt = parseFloat(fh.Amount) || 0;
                    let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0;
                    let fhBal = fhAmt - fhPaid;
                    totalDue += fhAmt; totalPaid += fhPaid;
                    
                    let fhStyle = fhBal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                    tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (${month})</b></td><td>₹${fhAmt.toFixed(2)}</td><td style="color:#2980b9;">₹${fhPaid.toFixed(2)}</td><td style="${fhStyle} font-weight:bold;">₹${fhBal.toFixed(2)}</td></tr>`;
                }
            });
        });

        feeHeads.forEach(fh => {
            if(fh.Frequency === "Annually" || fh.Frequency === "One Time (Annually)") {
                let amt = parseFloat(fh.Amount) || 0;
                let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0;
                let bal = amt - pd;
                totalDue += amt; totalPaid += pd;
                
                let balStyle = bal > 0 ? 'color:#e74c3c;' : 'color:#27ae60;';
                tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (Annual)</b></td><td>₹${amt.toFixed(2)}</td><td style="color:#2980b9;">₹${pd.toFixed(2)}</td><td style="${balStyle} font-weight:bold;">₹${bal.toFixed(2)}</td></tr>`;
            }
        });

        document.getElementById('l-tot-due').innerText = "₹" + totalDue.toFixed(2);
        document.getElementById('l-tot-paid').innerText = "₹" + totalPaid.toFixed(2);
        document.getElementById('l-tot-bal').innerText = "₹" + (totalDue - totalPaid).toFixed(2);

        document.getElementById('ledgerModal').classList.add('active');
    }

    document.getElementById('closeLedgerBtn').addEventListener('click', () => {
        document.getElementById('ledgerModal').classList.remove('active');
    });

    syncWithDatabase();
});
