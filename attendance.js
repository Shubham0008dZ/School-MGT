document.addEventListener('DOMContentLoaded', () => {
    // API URL - REPLACE THIS WITH YOUR *NEW DEPLOYMENT* URL!
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    let allStudents = [];
    let setupClasses = [];
    let rawAttendanceData = []; 
    let currentRoster = [];

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

    function initData() {
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Fetching Database... ⏳</td></tr>';

        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success") {
                    allStudents = res.data;
                    if(res.setup && res.setup.classes) { setupClasses = res.setup.classes; populateClassDropdown(); }
                    rawAttendanceData = res.attendance || [];
                    renderHistory();
                }
            });
    }

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
        if(rawAttendanceData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No attendance history found.</td></tr>';
            return;
        }

        let sessions = {};
        rawAttendanceData.forEach(rec => {
            if(!sessions[rec.Session_ID]) {
                sessions[rec.Session_ID] = { sessionID: rec.Session_ID, date: rec.Date, classSec: rec.Class_Section, timestamp: rec.Timestamp };
            }
        });

        let historyArray = Object.values(sessions);
        historyArray.forEach((record, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${record.classSec}</td>
                    <td>${record.date}</td>
                    <td>Attendance Marked</td>
                    <td>${new Date(record.timestamp).toLocaleString()}</td>
                    <td>
                        <button class="btn-edit" onclick="editAttendance('${record.sessionID}')">✏️</button>
                        <button class="btn-red" onclick="deleteAttendance('${record.sessionID}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }

    window.deleteAttendance = function(sessionID) {
        if(confirm("Are you sure you want to DELETE attendance for this class?")) {
            fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "deleteAttendance", sessionID: sessionID }) })
            .then(res => res.json())
            .then(data => {
                if(data.status === "Success") {
                    alert(data.message || "Attendance Deleted!");
                    initData(); 
                }
            });
        }
    }

    window.editAttendance = function(sessionID) {
        let existingRecords = rawAttendanceData.filter(r => r.Session_ID === sessionID);
        if(existingRecords.length === 0) return;

        let cls = existingRecords[0].Class_Section;
        let dateRaw = existingRecords[0].Date; 
        
        document.getElementById('attClassSelect').value = cls; document.getElementById('attDateSelect').value = dateRaw; 
        document.getElementById('displayClass').innerText = cls; document.getElementById('displayDate').innerText = dateRaw;

        currentRoster = allStudents.filter(s => s.studentClass === cls);
        renderAttendanceRoster(existingRecords);
        showView(viewMark);
    }

    function renderAttendanceRoster(existingRecords = null) {
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
            if(existingRecords) {
                let found = existingRecords.find(r => r.Reg_No == sReg);
                if(found) { stVal = found.Status; rmVal = found.Remarks || ""; }
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

    function executeFinalSave(actionType) {
        const cls = document.getElementById('attClassSelect').value;
        const rawDate = document.getElementById('attDateSelect').value;
        
        if(!cls || !rawDate) { alert("Class and Date missing!"); return; }

        let formattedDate = rawDate;
        if(rawDate.includes('-') && rawDate.split('-')[0].length === 4) formattedDate = formatToDDMMYYYY(rawDate);
        
        const mailOpt = document.querySelector('input[name="modalMailOpt"]:checked').value;

        let records = [];
        document.querySelectorAll('.att-row').forEach((row, idx) => {
            records.push({
                regNo: row.getAttribute('data-reg'), name: row.getAttribute('data-name'),
                email: row.getAttribute('data-email'),
                status: document.querySelector(`input[name="status_${idx}"]:checked`).value,
                remarks: row.querySelector('.remark-input').value
            });
        });

        const payload = { action: "saveAttendance", date: formattedDate, classSec: cls, mailOpt: mailOpt, records: records };

        document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '0.5');

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload) })
            .then(res => res.json())
            .then(data => {
                document.querySelectorAll('.btn-green').forEach(b => b.style.opacity = '1'); 
                if(data.status === "Success") {
                    alert(data.message || "Attendance Saved Successfully!");
                    
                    if(actionType === 'savenew') {
                        showView(viewPreMark);
                        document.getElementById('preAttDate').value = new Date().toISOString().split('T')[0];
                    } else if(actionType === 'saveclose') {
                        showView(viewHistory); initData(); 
                    }
                } else {
                    alert("Error: " + data.message);
                }
            });
    }

    initData();
});