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

// Global Arrays
let allStudents = [];
let setupClasses = [];
let rawAttendanceData = []; 
let currentRoster = [];
let schoolCode = "";

document.addEventListener('DOMContentLoaded', () => {
    
    // UI Navigation
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active'); 
        });
    });

    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    const activeUser = JSON.parse(activeUserStr);
    schoolCode = localStorage.getItem('erp_school_code') || activeUser.schoolCode;

    // Navbar Setup
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

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm("Are you sure you want to logout?", () => { 
                auth.signOut().then(() => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; });
            });
        });
    }

    function formatToDDMMYYYY(dateString) {
        if(!dateString) return "";
        const d = new Date(dateString);
        if(isNaN(d.getTime())) return dateString;
        let day = d.getDate().toString().padStart(2, '0');
        let month = (d.getMonth() + 1).toString().padStart(2, '0');
        let year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    const today = new Date();
    document.getElementById('currentDateFilter').innerText = formatToDDMMYYYY(today);

    // ==========================================
    // AUTO LOAD SYNC (FIRESTORE INTEGRATION)
    // ==========================================
    window.initData = async function() {
        const tbody = document.getElementById('historyTableBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Fetching Database... ⏳</td></tr>';

        try {
            // 1. Fetch Classes Setup
            let setupDoc = await db.collection("setups").doc(schoolCode).get().catch(() => null);
            if(setupDoc && setupDoc.exists && setupDoc.data().classes) {
                setupClasses = setupDoc.data().classes;
                populateClassDropdown();
            }

            // 2. Fetch All Students
            let studentSnap = await db.collection("students").where("schoolCode", "==", schoolCode).get().catch(() => ({ docs: [] }));
            allStudents = [];
            if(studentSnap.forEach) { studentSnap.forEach(doc => { allStudents.push(doc.data()); }); }

            // 3. Fetch Attendance History (Single document per session)
            let attSnap = await db.collection("attendance").where("schoolCode", "==", schoolCode).get().catch(() => ({ docs: [] }));
            rawAttendanceData = [];
            if(attSnap.forEach) { attSnap.forEach(doc => { rawAttendanceData.push(doc.data()); }); }

            renderHistory();

        } catch (error) {
            console.error("Firebase Sync Error:", error);
            if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color:red;">Database Error: ${error.message} <button onclick="initData()">Retry</button></td></tr>`;
        }
    }

    document.getElementById('btnSyncAtt')?.addEventListener('click', initData);

    function populateClassDropdown() {
        const selOld = document.getElementById('attClassSelect');
        const selPre = document.getElementById('preAttClass');
        
        if(selOld) selOld.innerHTML = '<option value="">Select Class</option>';
        if(selPre) selPre.innerHTML = '<option value="">--Select Class-Section--</option>';
        
        setupClasses.forEach(c => {
            let val = `${c.name} (${c.section})`;
            if(selOld) selOld.innerHTML += `<option value="${val}">${val}</option>`;
            if(selPre) selPre.innerHTML += `<option value="${val}">${val}</option>`;
        });
    }

    const viewHistory = document.getElementById('view-history');
    const viewPreMark = document.getElementById('view-pre-mark');
    const viewMark = document.getElementById('view-mark');

    function showView(viewElement) {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        viewElement.classList.add('active-module');
    }

    document.getElementById('sideMarkAtt').addEventListener('click', (e) => {
        e.preventDefault(); showView(viewHistory); initData();
    });

    document.getElementById('btn-open-mark').addEventListener('click', () => {
        showView(viewPreMark);
        document.getElementById('preAttDate').value = new Date().toISOString().split('T')[0];
    });

    document.getElementById('btn-proceed-mark').addEventListener('click', () => {
        const cls = document.getElementById('preAttClass').value;
        const date = document.getElementById('preAttDate').value;

        if(!cls || !date) { alert("Please select Class-Section and Date"); return; }

        document.getElementById('attClassSelect').value = cls; document.getElementById('attDateSelect').value = date;
        document.getElementById('displayClass').innerText = cls; document.getElementById('displayDate').innerText = formatToDDMMYYYY(date);

        currentRoster = allStudents.filter(s => s.studentClass === cls);
        renderAttendanceRoster(); 
        showView(viewMark);
    });

    function renderHistory() {
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';
        
        // Sort by timestamp descending
        rawAttendanceData.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

        if(rawAttendanceData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No attendance history found.</td></tr>';
            return;
        }

        rawAttendanceData.forEach((record, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><b>${record.Class_Section}</b></td>
                    <td>${record.Date}</td>
                    <td><span style="background:#d4edda; color:#155724; padding:3px 8px; border-radius:4px;">Marked</span></td>
                    <td>${record.Timestamp ? new Date(record.Timestamp).toLocaleString() : '-'}</td>
                    <td>
                        <button class="btn-edit" onclick="editAttendance('${record.Session_ID}')">✏️</button>
                        <button class="btn-red" style="padding:4px 8px;" onclick="deleteAttendance('${record.Session_ID}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    window.deleteAttendance = function(sessionID) {
        if(confirm("Are you sure you want to DELETE attendance for this class session?")) {
            db.collection("attendance").doc(sessionID).delete().then(() => {
                customAlert("Attendance Deleted Successfully!");
                initData(); 
            }).catch(err => {
                customAlert("Error deleting: " + err.message);
            });
        }
    }

    window.editAttendance = function(sessionID) {
        let sessionRec = rawAttendanceData.find(r => r.Session_ID === sessionID);
        if(!sessionRec) return;

        let cls = sessionRec.Class_Section;
        let dateRaw = sessionRec.Date; 
        
        // Ensure Date format compatibility for HTML input
        let dateParts = dateRaw.split('-');
        let htmlFormatDate = dateRaw;
        if(dateParts.length === 3 && dateParts[2].length === 4) {
            htmlFormatDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        }

        document.getElementById('attClassSelect').value = cls; 
        document.getElementById('attDateSelect').value = htmlFormatDate; 
        document.getElementById('displayClass').innerText = cls; 
        document.getElementById('displayDate').innerText = dateRaw;

        currentRoster = allStudents.filter(s => s.studentClass === cls);
        renderAttendanceRoster(sessionRec.Records); // Pass existing records array
        showView(viewMark);
    }

    function renderAttendanceRoster(existingRecordsArray = null) {
        const tbody = document.getElementById('studentAttList');
        tbody.innerHTML = '';

        if(currentRoster.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color:red;">No students found in this class.</td></tr>';
            return;
        }

        const statuses = ['P', 'AB', 'L', 'SUS', 'RS', 'HD', 'EG', 'LC', 'NA'];
        const defaultStatus = document.getElementById('preAttStatus').value || 'P'; 

        currentRoster.forEach((student, index) => {
            let sName = student.studentFirstName || student.studentName || '-';
            let studentEmail = student.primaryEmail || '';
            let sReg = student.regNo || '-';
            
            let stVal = defaultStatus;
            let rmVal = "";
            if(existingRecordsArray) {
                let found = existingRecordsArray.find(r => r.regNo == sReg);
                if(found) { stVal = found.status; rmVal = found.remarks || ""; }
            }
            
            let statusHTML = '<div class="status-options">';
            statuses.forEach(st => {
                let checked = (st === stVal) ? 'checked' : ''; 
                let rId = `st_${index}_${st}`;
                statusHTML += `
                    <input type="radio" id="${rId}" name="status_${index}" value="${st}" class="status-radio" ${checked}>
                    <label for="${rId}" class="status-label">${st}</label>
                `;
            });
            statusHTML += '</div>';

            tbody.innerHTML += `
                <tr class="att-row" data-reg="${sReg}" data-name="${sName}" data-email="${studentEmail}">
                    <td>${index + 1}</td>
                    <td>${sReg}</td>
                    <td><b>${sName}</b></td>
                    <td>${statusHTML}</td>
                    <td><input type="text" class="remark-input" value="${rmVal}" placeholder="Remarks..."></td>
                </tr>
            `;
        });
    }

    const emailModal = document.getElementById('emailOptionsModal');
    
    document.getElementById('btnSaveAttendance').addEventListener('click', () => triggerSaveModal('save'));
    document.getElementById('btnSaveAndNew').addEventListener('click', () => triggerSaveModal('savenew'));
    document.getElementById('btnSaveAndClose').addEventListener('click', () => triggerSaveModal('saveclose'));

    function triggerSaveModal(actionType) {
        document.getElementById('pendingSaveAction').value = actionType;
        emailModal.classList.add('active');
    }

    document.getElementById('closeEmailModalBtn').addEventListener('click', () => emailModal.classList.remove('active'));
    document.getElementById('btnCancelEmailModal').addEventListener('click', () => emailModal.classList.remove('active'));

    document.getElementById('btnConfirmSave').addEventListener('click', () => {
        emailModal.classList.remove('active');
        let actionType = document.getElementById('pendingSaveAction').value;
        executeFinalSave(actionType);
    });

    async function executeFinalSave(actionType) {
        const cls = document.getElementById('attClassSelect').value;
        const rawDate = document.getElementById('attDateSelect').value;
        
        if(!cls || !rawDate) { alert("Class and Date missing!"); return; }

        let formattedDate = rawDate;
        if(rawDate.includes('-') && rawDate.split('-')[0].length === 4) formattedDate = formatToDDMMYYYY(rawDate);
        
        const mailOpt = document.querySelector('input[name="modalMailOpt"]:checked').value;

        let records = [];
        document.querySelectorAll('.att-row').forEach((row, idx) => {
            records.push({
                regNo: row.getAttribute('data-reg'), 
                name: row.getAttribute('data-name'),
                email: row.getAttribute('data-email'),
                status: document.querySelector(`input[name="status_${idx}"]:checked`).value,
                remarks: row.querySelector('.remark-input').value
            });
        });

        document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '0.5');

        let sessionID = `${schoolCode}_${formattedDate.replace(/\//g, '-')}_${cls.replace(/[^a-zA-Z0-9]/g, '')}`;

        let payload = {
            schoolCode: schoolCode,
            Session_ID: sessionID,
            Date: formattedDate,
            Class_Section: cls,
            Timestamp: new Date().toISOString(),
            Records: records
        };

        try {
            await db.collection("attendance").doc(sessionID).set(payload, { merge: true });
            document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '1'); 
            
            if (mailOpt !== 'none') { console.log(`Triggering emails for ${mailOpt} students...`); }
            
            customAlert("Attendance Saved Successfully!");
            
            if(actionType === 'savenew') {
                showView(viewPreMark);
                document.getElementById('preAttDate').value = new Date().toISOString().split('T')[0];
            } else if(actionType === 'saveclose') {
                showView(viewHistory); 
                initData(); 
            }

        } catch (error) {
            document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '1'); 
            customAlert("Error saving attendance: " + error.message);
        }
    }

    // Call init to fetch data immediately
    setTimeout(() => { initData(); }, 100);
});
