// ============================================================================
// GLOBAL VARIABLES & INITIALIZATION
// ============================================================================
const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

let studentData = null;
let globalDbData = null;

let currDate = new Date();
let attMap = {}; 

window.switchView = function(viewId) {
    document.querySelectorAll('.portal-tab').forEach(b => b.classList.remove('active'));
    let tabToActive = document.querySelector(`.portal-tab[data-target="${viewId}"]`);
    if(tabToActive) tabToActive.classList.add('active');

    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    let target = document.getElementById(viewId);
    if(target) target.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    
    const studentStr = localStorage.getItem('erp_active_student');
    if(!studentStr) { window.location.href = 'login.html'; return; }
    
    studentData = JSON.parse(studentStr);
    
    if(document.getElementById('dashName')) document.getElementById('dashName').innerText = (studentData.studentFirstName || "") + " " + (studentData.studentLastName || "");
    if(document.getElementById('dashRegNo')) document.getElementById('dashRegNo').innerText = studentData.regNo || "N/A";
    if(document.getElementById('dashMobile')) document.getElementById('dashMobile').innerText = studentData.mobile || "N/A";
    
    if(document.getElementById('dashDob')) {
        document.getElementById('dashDob').innerText = studentData.dob ? new Date(studentData.dob).toLocaleDateString('en-GB') : "-";
    }
    
    let sClass = "-"; let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { sClass = match[1].trim() + " (" + match[2].trim() + ")"; sSecRaw = match[2].trim(); } 
        else { sClass = studentData.studentClass; }
    }
    if(document.getElementById('dashClass')) document.getElementById('dashClass').innerText = sClass;
    if(document.getElementById('dashAvatar') && studentData.studentPhotoBase64 && studentData.studentPhotoBase64.startsWith('data:image')) {
        document.getElementById('dashAvatar').src = studentData.studentPhotoBase64;
    }

    document.querySelectorAll('.portal-tab').forEach(btn => {
        btn.addEventListener('click', function() { switchView(this.getAttribute('data-target')); });
    });

    // INNER PILL NAVIGATION FOR COMMUNICATION VIEW
    document.querySelectorAll('.comm-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.comm-pill').forEach(p => p.classList.remove('active-pill'));
            this.classList.add('active-pill');
            let filter = this.getAttribute('data-filter');
            if(globalDbData) {
                renderFullComm(globalDbData.assignments, filter);
            }
        });
    });

    document.getElementById('btnStudentLogout').addEventListener('click', () => {
        if(confirm("Are you sure you want to log out?")) { localStorage.removeItem('erp_active_student'); window.location.href = 'login.html'; }
    });

    // FETCHING DATA WITH EXPLICIT ERROR HANDLING
    fetch(scriptURL, { redirect: "follow" }).then(res => res.json()).then(data => {
        if(data.status === "Success") {
            globalDbData = data;
            
            try { processAssignments(data.assignments, data.submissions); } catch(e) { console.error("Error in processAssignments:", e); }
            try { renderFullComm(data.assignments, "All"); } catch(e) { console.error("Error in renderFullComm:", e); }
            try { processAttendance(data.attendance); } catch(e) { console.error("Error in processAttendance:", e); }
            try { processFeeLedger(data.receipts, data.setup, data.feeHeads); } catch(e) { console.error("Error in processFeeLedger:", e); }
            
        } else {
            console.error("Backend returned error status:", data.message);
        }
    }).catch(err => {
        console.error("Critical Fetch Error:", err);
    });

    document.getElementById('calPrevMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('calNextMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() + 1); renderCalendar(); });
    document.getElementById('bigCalPrevMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('bigCalNextMonth')?.addEventListener('click', () => { currDate.setMonth(currDate.getMonth() + 1); renderCalendar(); });
});


// ============================================================================
// 1. SPLIT LOGIC (DASHBOARD + HOMEWORK)
// ============================================================================
function processAssignments(assignments, submissions) {
    const circCont = document.getElementById('circularListContainer');
    const hwBody = document.getElementById('hwTableBody');
    const achCont = document.getElementById('achievementContainer');
    const hwFullList = document.getElementById('hwFullListContainer');

    if(circCont) circCont.innerHTML = ''; 
    if(hwBody) hwBody.innerHTML = ''; 
    if(achCont) achCont.innerHTML = ''; 
    if(hwFullList) hwFullList.innerHTML = '';

    if(!assignments || assignments.length === 0) { 
        let msg = '<p style="text-align:center; color:#777; font-size:12px;">No items found.</p>';
        if(circCont) circCont.innerHTML = msg; 
        if(hwBody) hwBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No assignments.</td></tr>';
        if(achCont) achCont.innerHTML = '🏆 No achievements recorded yet.'; 
        if(hwFullList) hwFullList.innerHTML = msg; 
        return; 
    }

    let sClassRaw = ""; let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { sClassRaw = match[1].trim(); sSecRaw = match[2].trim(); } else { sClassRaw = studentData.studentClass; }
    }

    let myItems = assignments.filter(a => {
        let matchClass = String(a.Class) === String(sClassRaw) || String(a.Class) === "All" || !a.Class;
        let matchSec = String(a.Section) === String(sSecRaw) || String(a.Section) === "All" || !a.Section;
        
        let targets = ["All"];
        try { 
            if(a.Target_Students && a.Target_Students.trim() !== "") {
                targets = JSON.parse(a.Target_Students); 
            }
        } catch(e){
            console.warn("Invalid Target JSON for assignment:", a.Assignment_ID);
        }
        let matchTarget = targets.includes("All") || targets.includes(String(studentData.regNo));

        return matchClass && matchSec && matchTarget;
    }).reverse();

    let hwCount = 0; let circCount = 0; let achCount = 0;

    myItems.forEach(a => {
        let type = a.Type || "";
        let dateFormatted = new Date(a.Timestamp).toLocaleDateString('en-GB');
        
        // Dashboard Small Cards logic
        if(["Circular", "Notice", "News", "PTM"].includes(type)) {
            circCount++;
            if(circCont) {
                circCont.innerHTML += `
                    <div class="circular-item">
                        <span class="circ-date">📅 ${dateFormatted}</span><span class="circ-tag">${type}</span>
                        <a href="#" class="circ-title" onclick="switchView('view-comm')">${a.Name}</a>
                        <p class="circ-desc">${a.Description || 'Click to view details.'}</p>
                    </div>`;
            }
        }
        else if(type === "Achievement") {
            achCount++;
            if(achCount === 1 && achCont) achCont.innerHTML = '';
            
            let metaHtml = "";
            try {
                if(a.Metadata_JSON && a.Metadata_JSON.trim() !== "") {
                    let meta = JSON.parse(a.Metadata_JSON);
                    if(meta.rank) metaHtml += `<span style="background:#e74c3c; color:white; padding:2px 5px; border-radius:3px; font-size:10px; margin-left:5px;">${meta.rank}</span>`;
                }
            } catch(e){}

            if(achCont) {
                achCont.innerHTML += `<div style="background:#fff3e0; padding:10px; border-left:4px solid #f39c12; margin-bottom:10px; text-align:left; border-radius:4px; font-size:14px;"><b>⭐ ${a.Name}</b> ${metaHtml}<br><span style="font-size:12px; color:#555;">${a.Description}</span></div>`;
            }
        }
        else if(["Homework", "Classwork", "Assignment", "Project"].includes(type)) {
            hwCount++;
            let deadlineStr = a.Date ? a.Date : '-';
            let mySub = (submissions || []).find(s => String(s.Assignment_ID) === String(a.Assignment_ID) && String(s.Reg_No) === String(studentData.regNo));
            
            let statusLabel = "Pending"; let statusClass = "pill-pending"; let dashStatusClass = "status-pending";
            if(mySub) {
                if(mySub.Marks && String(mySub.Marks).trim() !== "") { statusLabel = "Checked"; statusClass = "pill-checked"; dashStatusClass = "status-done"; } 
                else { statusLabel = "Submitted"; statusClass = "pill-submitted"; dashStatusClass = "status-done"; }
            }
            
            if(hwBody) {
                hwBody.innerHTML += `<tr style="cursor:pointer;" onclick="switchView('view-homework')"><td><span class="hw-icon">📗</span> <b>${a.Subject || 'General'}</b><br><span style="font-size:10px;color:#777;">${a.Name}</span></td><td>${dateFormatted}</td><td><b style="color:#c0392b;">${deadlineStr}</b></td><td><span class="${dashStatusClass}">${statusLabel}</span></td></tr>`;
            }

            let attachHtml = a.Attachment_Base64 ? `<a href="${a.Attachment_Base64}" download class="btn-download">📎 File</a>` : `<span style="color:#ccc; font-size:12px;">--</span>`;
            let aDataStr = JSON.stringify(a).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            let subDataStr = mySub ? JSON.stringify(mySub).replace(/'/g, "&#39;").replace(/"/g, "&quot;") : "null";
            
            if(hwFullList) {
                hwFullList.innerHTML += `
                    <div class="hw-list-row">
                        <div class="hw-icon-title"><div class="h-icon">🎙️</div><div><div style="font-weight:bold; color:#2c3e50;">${a.Subject || 'General'}</div><div style="font-size:11px; color:#7f8c8d;">${a.Type} • ${a.Name}</div></div></div>
                        <div><span class="status-pill ${statusClass}">${statusLabel}</span></div>
                        <div style="font-weight:bold; color:#555;">${deadlineStr}</div>
                        <div class="desc-text">${a.Description || '--'}</div>
                        <div>${attachHtml}</div>
                        <div style="text-align:center;"><button class="btn-eye" onclick='openHwModal(${aDataStr}, ${subDataStr})'>👁️</button></div>
                    </div>`;
            }
        }
    });

    if(circCount === 0 && circCont) circCont.innerHTML = '<p style="text-align:center; color:#777; font-size:12px;">No circulars found.</p>';
    if(hwCount === 0) { 
        if(hwBody) hwBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No assignments.</td></tr>'; 
        if(hwFullList) hwFullList.innerHTML = '<p style="text-align:center; color:#777;">No homework assigned yet.</p>'; 
    }
}


// ============================================================================
// 1.5 COMMUNICATION SPECIFIC PROCESSING (Sub-tabs)
// ============================================================================
function renderFullComm(assignments, filterCat) {
    const commFullList = document.getElementById('commFullListContainer');
    if(!commFullList) return;
    
    commFullList.innerHTML = '';

    if(!assignments || assignments.length === 0) { 
        commFullList.innerHTML = '<p style="text-align:center; color:#777; font-size:12px;">No items found.</p>'; return; 
    }

    let sClassRaw = ""; let sSecRaw = "";
    if(studentData.studentClass) {
        let match = studentData.studentClass.match(/(.*?)\s*\((.*?)\)/);
        if(match) { sClassRaw = match[1].trim(); sSecRaw = match[2].trim(); } else { sClassRaw = studentData.studentClass; }
    }

    let myItems = assignments.filter(a => {
        let matchClass = String(a.Class) === String(sClassRaw) || String(a.Class) === "All" || !a.Class;
        let matchSec = String(a.Section) === String(sSecRaw) || String(a.Section) === "All" || !a.Section;
        
        let targets = ["All"];
        try { 
            if(a.Target_Students && a.Target_Students.trim() !== "") {
                targets = JSON.parse(a.Target_Students); 
            }
        } catch(e){}
        
        let matchTarget = targets.includes("All") || targets.includes(String(studentData.regNo));

        // Sub Tab Filter Logic
        let isNonHw = ["Circular", "Notice", "News", "PTM", "Feedback", "Achievement", "Remarks"].includes(a.Type);
        let matchCat = true;
        if(filterCat === "Circulars") matchCat = ["Circular", "Notice", "News"].includes(a.Type);
        if(filterCat === "Achievements") matchCat = ["Achievement"].includes(a.Type);
        if(filterCat === "Remarks") matchCat = ["Remarks", "Feedback"].includes(a.Type);
        if(filterCat === "PTM") matchCat = ["PTM"].includes(a.Type);

        return matchClass && matchSec && matchTarget && isNonHw && matchCat;
    }).reverse();

    if(myItems.length === 0) { 
        commFullList.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">No communications found in this category.</p>'; 
        return; 
    }

    myItems.forEach(a => {
        let dateFormatted = new Date(a.Timestamp).toLocaleDateString('en-GB');
        let colorCode = a.Type === "Achievement" ? "#f39c12" : (["Feedback", "Remarks"].includes(a.Type) ? "#27ae60" : "#3498db");
        let attachHtml = a.Attachment_Base64 ? `<a href="${a.Attachment_Base64}" download class="btn-download">📎 Attachment</a>` : '<span style="color:#ccc;">--</span>';
        
        // Metadata Parsing for Rich UI
        let metaHtml = "";
        try {
            if(a.Metadata_JSON && a.Metadata_JSON.trim() !== "") {
                let meta = JSON.parse(a.Metadata_JSON);
                if(a.Type === "Achievement") {
                    if(meta.level) metaHtml += `<span style="font-size:11px; background:#fef5e7; color:#d35400; padding:2px 5px; border:1px solid #fad7a1; margin-right:5px; border-radius:3px;">Level: ${meta.level}</span>`;
                    if(meta.rank) metaHtml += `<span style="font-size:11px; background:#fdf2e9; color:#e67e22; padding:2px 5px; border:1px solid #f8c471; margin-right:5px; border-radius:3px;">Rank: ${meta.rank}</span>`;
                    if(meta.venue) metaHtml += `<br><span style="font-size:11px; color:#7f8c8d; margin-top:5px; display:inline-block;">Venue: ${meta.venue}</span>`;
                } else if (a.Type === "Remarks") {
                    if(meta.type) metaHtml += `<span style="font-size:11px; background:#e8f8f5; color:#27ae60; padding:2px 5px; border:1px solid #a3e4d7; margin-right:5px; border-radius:3px;">${meta.type}</span>`;
                }
            }
        } catch(e){}

        commFullList.innerHTML += `
            <div style="display:grid; grid-template-columns:1fr 3fr 1.5fr; padding:15px 20px; border-bottom:1px solid #eee; background:white; align-items:center;">
                <div><span style="font-size:10px; background:${colorCode}; color:white; padding:3px 6px; border-radius:3px; font-weight:bold;">${a.Type}</span><br><span style="font-size:11px; color:#777; margin-top:5px; display:inline-block;">${dateFormatted}</span></div>
                <div><b style="color:#2c3e50;">${a.Name}</b><br><span style="font-size:13px; color:#555; display:inline-block; margin-top:4px;">${a.Description || ''}</span><div style="margin-top:6px;">${metaHtml}</div></div>
                <div>${attachHtml}</div>
            </div>`;
    });
}


// ============================================================================
// MODAL INTERACTION: EYE BUTTON LOGIC (Rest remains identically strict)
// ============================================================================
let currentHwSelection = null;
window.openHwModal = function(hwData, subData) {
    currentHwSelection = hwData;
    document.getElementById('modHwTitle').innerText = hwData.Name; document.getElementById('modHwSub').innerText = hwData.Subject || 'General'; document.getElementById('modHwDue').innerText = hwData.Date || 'No Deadline'; document.getElementById('modHwDesc').innerText = hwData.Description || 'No description attached.';

    const subArea = document.getElementById('submissionArea'); subArea.innerHTML = '';
    if(hwData.Submission_Required === "Yes") {
        if(!subData) {
            subArea.innerHTML = `<h4 style="color:#2c3e50; margin-bottom:10px;">Submit Your Work</h4><textarea id="stuAnsText" class="sub-textarea" placeholder="Type your answer here..."></textarea><div style="margin-top:10px;"><label style="font-size:12px; font-weight:bold; color:#555;">Attach File (Optional)</label><br><input type="file" id="stuAnsFile" style="margin-top:5px; font-size:12px;"><input type="hidden" id="stuAnsBase64"></div><button id="btnActualSubmit" class="btn-submit-hw" onclick="submitHwToDb()">Submit Homework</button>`;
            setTimeout(() => { let fileInp = document.getElementById('stuAnsFile'); if(fileInp) fileInp.addEventListener('change', function() { if(this.files[0]) { const r = new FileReader(); r.onload = function(e) { document.getElementById('stuAnsBase64').value = e.target.result; }; r.readAsDataURL(this.files[0]); } }); }, 200);
        } else if (subData && (!subData.Marks || String(subData.Marks).trim() === "")) {
            subArea.innerHTML = `<div style="background:#e8f4f8; border:1px solid #bde0ef; padding:15px; border-radius:5px; text-align:center;"><h3 style="color:#2980b9; margin:0 0 5px 0;">Status: Submitted</h3><p style="font-size:13px; color:#555; margin:0;">Waiting for teacher's review.</p></div>`;
        } else if (subData && subData.Marks) {
            subArea.innerHTML = `<div style="background:#e8f5e9; border:1px solid #c8e6c9; padding:15px; border-radius:5px;"><h3 style="color:#27ae60; margin:0 0 10px 0;">Status: Evaluated ✅</h3><div style="display:flex; justify-content:space-between; font-size:14px;"><div><b>Marks Awarded:</b> <span style="font-size:18px; color:#e74c3c; font-weight:bold; margin-left:5px;">${subData.Marks}</span></div></div><div style="margin-top:10px; font-size:13px; color:#555;"><b>Teacher Remarks:</b> ${subData.Teacher_Remarks || 'Good work.'}</div></div>`;
        }
    } else {
        subArea.innerHTML = `<p style="text-align:center; color:#95a5a6; font-size:13px; font-weight:bold;">No online submission required for this assignment.</p>`;
    }
    let modal = document.getElementById('hwModal');
    if(modal) modal.classList.add('active');
};

window.submitHwToDb = function() {
    if(!currentHwSelection) return;
    const btn = document.getElementById('btnActualSubmit'); btn.innerText = "Submitting..."; btn.disabled = true;

    const payload = { action: "submitHomework", data: { assignmentId: currentHwSelection.Assignment_ID, regNo: studentData.regNo, studentName: studentData.studentFirstName || studentData.studentName, answerText: document.getElementById('stuAnsText') ? document.getElementById('stuAnsText').value : "", attachmentBase64: document.getElementById('stuAnsBase64') ? document.getElementById('stuAnsBase64').value : "" } };
    fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if(data.status === "Success") { 
            alert(data.message); 
            let modal = document.getElementById('hwModal');
            if(modal) modal.classList.remove('active'); 
            window.location.reload(); 
        } else { alert("Error: " + data.message); }
    }).finally(() => { btn.innerText = "Submit Homework"; btn.disabled = false; });
};

// ============================================================================
// 2. ATTENDANCE MODULE
// ============================================================================
function processAttendance(records) {
    if(!records) return; let totP = 0; let totA = 0; let totL = 0;
    records.forEach(r => {
        if(String(r.Reg_No) === String(studentData.regNo)) {
            let parts = String(r.Date).split('-');
            if(parts.length === 3) { let isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; attMap[isoDate] = r.Status; if(r.Status === 'P') totP++; else if(r.Status === 'AB') totA++; else if(r.Status === 'LC') totL++; }
        }
    });
    if(document.getElementById('attTotalP')) document.getElementById('attTotalP').innerText = totP; 
    if(document.getElementById('attTotalA')) document.getElementById('attTotalA').innerText = totA; 
    if(document.getElementById('attTotalL')) document.getElementById('attTotalL').innerText = totL;
    renderCalendar();
}
function renderCalendar() {
    const year = currDate.getFullYear(); const month = currDate.getMonth();
    
    let calT1 = document.getElementById('calMonthTitle');
    let calT2 = document.getElementById('bigCalMonthTitle');
    if(calT1) calT1.innerText = currDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if(calT2) calT2.innerText = currDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calGrid = document.getElementById('bigCalGrid'); const smallCalGrid = document.getElementById('smallCalGrid');
    
    let htmlBig = `<div class="cal-day-header">Su</div><div class="cal-day-header">Mo</div><div class="cal-day-header">Tu</div><div class="cal-day-header">We</div><div class="cal-day-header">Th</div><div class="cal-day-header">Fr</div><div class="cal-day-header">Sa</div>`;
    let htmlSmall = htmlBig;

    for(let i = 0; i < firstDay; i++) { htmlBig += `<div class="big-cal-cell" style="background:none; border:none;"></div>`; htmlSmall += `<div></div>`; }
    
    for(let i = 1; i <= daysInMonth; i++) {
        let isoDate = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let status = attMap[isoDate]; let dotHtml = ''; let smallDot = '';
        if(status === 'P') { dotHtml = `<div class="dot p"></div>`; smallDot = `<div class="cal-dot" style="background:#27ae60;"></div>`;} 
        else if(status === 'AB') { dotHtml = `<div class="dot a"></div>`; smallDot = `<div class="cal-dot" style="background:#e74c3c;"></div>`;} 
        else if(status === 'LC') { dotHtml = `<div class="dot l" style="background:#f39c12;"></div>`; smallDot = `<div class="cal-dot" style="background:#f39c12;"></div>`; }

        let isToday = isoDate === new Date().toISOString().split('T')[0] ? "today" : "";
        htmlBig += `<div class="big-cal-cell ${isToday}">${i}${dotHtml}</div>`;
        htmlSmall += `<div class="cal-cell ${isToday}">${i}${smallDot}</div>`;
    }
    
    if(calGrid) calGrid.innerHTML = htmlBig;
    if(smallCalGrid) smallCalGrid.innerHTML = htmlSmall;
}

// ============================================================================
// 3. FEES MODULE
// ============================================================================
function processFeeLedger(receipts, setupData, feeHeads) {
    let classFeeAmount = 0;
    if(studentData.studentClass && setupData && setupData.classes) { let cSetup = setupData.classes.find(c => `${c.name} (${c.section})` === studentData.studentClass || c.name === studentData.studentClass); if(cSetup && cSetup.fee) classFeeAmount = parseFloat(cSetup.fee); }
    let paidMap = {}; let myReceipts = (receipts||[]).filter(r => String(r.Reg_No) === String(studentData.regNo));
    myReceipts.forEach(r => { try { let rawHeads = String(r.Paid_Heads || "").trim(); if(rawHeads !== "" && rawHeads.startsWith("[")) { JSON.parse(rawHeads).forEach(d => { paidMap[d.head + "_" + d.period] = (paidMap[d.head + "_" + d.period] || 0) + parseFloat(d.paid || 0); }); } } catch(e) { } });

    let tbody = document.getElementById('feeStatementBody'); 
    if(!tbody) return;
    
    tbody.innerHTML = ''; 
    let totalDue = 0; let totalPaid = 0;
    const academicMonths = ["Apr, 26", "May, 26", "Jun, 26", "Jul, 26", "Aug, 26", "Sep, 26", "Oct, 26", "Nov, 26", "Dec, 26", "Jan, 27", "Feb, 27", "Mar, 27"];

    academicMonths.forEach(month => {
        let tAmt = classFeeAmount; let tPaid = paidMap["Monthly Tuition Fee_" + month] || 0; let tBal = tAmt - tPaid; totalDue += tAmt; totalPaid += tPaid;
        let tStatus = tBal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
        tbody.innerHTML += `<tr><td><b>Monthly Tuition Fee (${month})</b></td><td>₹${tAmt.toFixed(2)}</td><td>₹${tPaid.toFixed(2)}</td><td>${tStatus}</td></tr>`;
        (feeHeads||[]).forEach(fh => {
            if(fh.Frequency === "Monthly") {
                let fhAmt = parseFloat(fh.Amount) || 0; let fhPaid = paidMap[fh.Head_Name + "_" + month] || 0; let fhBal = fhAmt - fhPaid; totalDue += fhAmt; totalPaid += fhPaid;
                let fhStatus = fhBal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
                tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (${month})</b></td><td>₹${fhAmt.toFixed(2)}</td><td>₹${fhPaid.toFixed(2)}</td><td>${fhStatus}</td></tr>`;
            }
        });
    });
    
    (feeHeads||[]).forEach(fh => {
        if(fh.Frequency === "Annually" || fh.Frequency === "One Time (Annually)") {
            let amt = parseFloat(fh.Amount) || 0; let pd = paidMap[fh.Head_Name + "_" + fh.Frequency] || paidMap[fh.Head_Name + "_Annually"] || 0; let bal = amt - pd; totalDue += amt; totalPaid += pd;
            let anStatus = bal <= 0 ? `<span style="color:#27ae60; font-weight:bold;">Paid</span>` : `<span style="color:#e74c3c; font-weight:bold;">Due</span>`;
            tbody.innerHTML += `<tr><td><b>${fh.Head_Name} (Annual)</b></td><td>₹${amt.toFixed(2)}</td><td>₹${pd.toFixed(2)}</td><td>${anStatus}</td></tr>`;
        }
    });

    if(document.getElementById('feeTotApplicable')) document.getElementById('feeTotApplicable').innerText = "₹" + totalDue.toFixed(2); 
    if(document.getElementById('feeTotPaid')) document.getElementById('feeTotPaid').innerText = "₹" + totalPaid.toFixed(2); 
    if(document.getElementById('feeTotDue')) document.getElementById('feeTotDue').innerText = "₹" + (totalDue - totalPaid).toFixed(2);
}
