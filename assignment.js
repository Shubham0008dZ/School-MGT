// ============================================================================
// CUSTOM CONFIRM MODAL LOGIC
// ============================================================================
window.customConfirm = function(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.position = "fixed"; overlay.style.top = "0"; overlay.style.left = "0"; overlay.style.width = "100%"; overlay.style.height = "100%"; overlay.style.background = "rgba(0,0,0,0.6)"; overlay.style.zIndex = "9999"; overlay.style.display = "flex"; overlay.style.alignItems = "center"; overlay.style.justifyContent = "center";
    overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button></div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cc-cancel').addEventListener('click', () => { overlay.remove(); });
    document.getElementById('cc-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
};

document.addEventListener('DOMContentLoaded', () => {
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) {}

    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") { alert("Session Invalid."); localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }
        else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    });

    if (!isSA && !userRights.some(r => r.startsWith("HW_"))) { window.location.href = 'index.html'; return; }

    document.getElementById('btnLogout')?.addEventListener('click', () => { customConfirm("Logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });

    // =======================================================
    // 1. DYNAMIC FORM FIELDS LOGIC (HIDE/SHOW CATEGORY WISE)
    // =======================================================
    function toggleFormFields(selectedType) {
        let isHW = ["Homework", "Classwork", "Assignment", "Project"].includes(selectedType);
        
        let grpSubject = document.getElementById('grpSubject');
        let grpDate = document.getElementById('grpDate');
        let lblDate = document.getElementById('lblDate');
        let grpSubReq = document.getElementById('grpSubmissionReq');

        if(isHW) {
            // Show all options for Homework
            if(grpSubject) grpSubject.style.display = 'flex';
            if(grpDate) grpDate.style.display = 'flex';
            if(lblDate) lblDate.innerHTML = 'Due Date <span style="color:red;">*</span>';
            if(grpSubReq) grpSubReq.style.display = 'flex';
            // Also ensure hwSubject is mandatory
            document.getElementById('hwSubject').required = true;
        } else {
            // Hide specific fields for Circular/Feedback/Etc
            if(grpSubject) grpSubject.style.display = 'none';
            // Circulars don't need a due date, but maybe a Publish Date. Let's keep date but change label.
            if(lblDate) lblDate.innerHTML = 'Publish Date <span style="color:red;">*</span>';
            if(grpSubReq) { 
                grpSubReq.style.display = 'none'; 
                document.getElementById('hwSubmissionReq').checked = false; // Reset toggle
            }
            document.getElementById('hwSubject').required = false;
            document.getElementById('hwSubject').value = ""; // Clear value
        }
    }

    // Bind change event to Type dropdown
    const hwTypeDropdown = document.getElementById('hwType');
    if(hwTypeDropdown) {
        hwTypeDropdown.addEventListener('change', function() {
            toggleFormFields(this.value);
        });
    }

    let allAssignments = [];
    let allSubmissions = []; // To store student submissions
    let currentCategory = "Circular"; // Default

    // =======================================================
    // 2. SIDEBAR CATEGORY CLICK LOGIC
    // =======================================================
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault();
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
            
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-target')).classList.add('active');

            if(this.getAttribute('data-cat')) {
                currentCategory = this.getAttribute('data-cat');
                document.getElementById('listHeaderTitle').innerText = currentCategory.toUpperCase() + " RECORDS";
                
                // Show Responses Button ONLY if Homework tab is selected
                if(currentCategory === "Homework") {
                    document.getElementById('btnViewResponses').style.display = 'inline-block';
                } else {
                    document.getElementById('btnViewResponses').style.display = 'none';
                }

                renderCommList();
            }
        });
    });

    // OPEN ADD FORM PRE-FILLED & DYNAMIC
    document.getElementById('btnOpenAddForm').addEventListener('click', () => {
        document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active-module'));
        document.getElementById('module-add-hw').classList.add('active-module');
        
        document.getElementById('formDynamicTitle').innerText = currentCategory.toUpperCase();
        
        // Auto-select type based on category
        let defaultType = currentCategory;
        if(currentCategory === "Homework") defaultType = "Homework"; // Default inside Homework tab
        
        document.getElementById('hwType').value = defaultType; 
        document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];

        // Trigger dynamic fields logic
        toggleFormFields(defaultType);
    });

    // =======================================================
    // 3. FETCH AND RENDER DATA (Includes Submissions)
    // =======================================================
    function loadData() {
        document.getElementById('commListArea').innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Fetching records... ⏳</p>';
        fetch(scriptURL, { redirect: "follow" }).then(res => res.json()).then(res => {
            if(res.status === "Success") { 
                if(res.setup) {
                    const setupData = res.setup;
                    const fClassDropdown = document.getElementById('hwClass'); const fSecDropdown = document.getElementById('hwSection');
                    let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))];
                    uniqueClasses.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
                    
                    if(fClassDropdown.options.length <= 2) { uniqueClasses.forEach(item => { fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; }); }
                    fClassDropdown.addEventListener('change', function() {
                        let selClass = this.value; fSecDropdown.innerHTML = '<option value="">Select Section</option><option value="All">All Sections</option>';
                        if(selClass && selClass !== "All") {
                            let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                            let uniqueSecs = [...new Set(filteredSecs)].sort(); uniqueSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
                        }
                    });
                }
                allAssignments = res.assignments || [];
                allSubmissions = res.submissions || []; // Store submissions
                
                updateBlinkingBadge();
                renderCommList();
            }
        });
    }

    // =======================================================
    // 4. RESPONSES BADGE & MODAL LOGIC
    // =======================================================
    function updateBlinkingBadge() {
        // Count submissions that have NO marks yet (Pending evaluation)
        let pendingSubs = allSubmissions.filter(s => !s.Marks || String(s.Marks).trim() === "");
        let badge = document.getElementById('respBlinkBadge');
        if(badge) {
            badge.innerText = pendingSubs.length;
            if(pendingSubs.length > 0) {
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none'; // Hide if 0
            }
        }
    }

    document.getElementById('btnViewResponses')?.addEventListener('click', () => {
        const tbody = document.getElementById('respTableBody');
        tbody.innerHTML = '';

        let pendingSubs = allSubmissions.filter(s => !s.Marks || String(s.Marks).trim() === "");
        
        if(pendingSubs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">All caught up! No pending submissions.</td></tr>';
        } else {
            pendingSubs.forEach(sub => {
                // Find associated assignment to get Name
                let assign = allAssignments.find(a => String(a.Assignment_ID) === String(sub.Assignment_ID));
                let assignName = assign ? assign.Name : "Unknown Assignment";
                
                let attachLink = sub.Attachment_Base64 ? `<a href="${sub.Attachment_Base64}" download class="btn-attach" style="background:#3498db; color:white; border:none; padding:4px 8px; font-size:11px;">📎 File</a>` : 'No file';
                
                tbody.innerHTML += `
                    <tr>
                        <td><b>${sub.Student_Name}</b><br><span style="font-size:10px;color:#777;">${sub.Reg_No}</span></td>
                        <td>${assignName}</td>
                        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sub.Answer_Text || ''}">${sub.Answer_Text || '--'} <br> ${attachLink}</td>
                        <td><input type="text" id="marks_${sub.Assignment_ID}_${sub.Reg_No}" class="marks-input" placeholder="e.g. 8/10"></td>
                        <td><input type="text" id="rem_${sub.Assignment_ID}_${sub.Reg_No}" class="remarks-input" placeholder="Good work..."></td>
                        <td><button style="background:#27ae60; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; font-weight:bold;" onclick="saveMarks('${sub.Assignment_ID}', '${sub.Reg_No}', this)">✅ Save</button></td>
                    </tr>
                `;
            });
        }
        document.getElementById('responsesModal').style.display = 'flex';
    });

    window.saveMarks = function(assignId, regNo, btnElement) {
        let marksVal = document.getElementById(`marks_${assignId}_${regNo}`).value;
        let remVal = document.getElementById(`rem_${assignId}_${regNo}`).value;
        
        if(!marksVal) {
            alert("Please enter marks to evaluate."); return;
        }

        btnElement.innerText = "Saving..."; btnElement.disabled = true;

        const payload = {
            action: "gradeHomework",
            data: {
                assignmentId: assignId,
                regNo: regNo,
                marks: marksVal,
                remarks: remVal
            }
        };

        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                // Remove row from UI
                let tr = btnElement.closest('tr');
                if(tr) tr.remove();
                
                // Update local array to stop badge from counting it
                let subObj = allSubmissions.find(s => String(s.Assignment_ID) === String(assignId) && String(s.Reg_No) === String(regNo));
                if(subObj) { subObj.Marks = marksVal; }
                
                updateBlinkingBadge();
                alert(data.message);
            } else { alert("Error: " + data.message); btnElement.innerText = "✅ Save"; btnElement.disabled = false; }
        });
    };

    function renderCommList() {
        const listArea = document.getElementById('commListArea'); listArea.innerHTML = '';
        
        let filtered = allAssignments.filter(a => {
            if(currentCategory === "Circular") return ["Circular", "News", "Notice"].includes(a.Type);
            if(currentCategory === "Homework") return ["Homework", "Classwork", "Assignment", "Project", "Holiday Homework"].includes(a.Type);
            return a.Type === currentCategory;
        });

        filtered.reverse(); 

        if(filtered.length === 0) { listArea.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">No ${currentCategory} records found.</p>`; return; }

        filtered.forEach(a => {
            let dateStr = new Date(a.Timestamp).toLocaleDateString('en-GB');
            let classInfo = (a.Class === "All" ? "Global" : `Class ${a.Class} (${a.Section})`);
            let attachBtn = a.Attachment_Base64 ? `<a href="${a.Attachment_Base64}" download class="btn-attach" style="border:none; background:#3498db; color:white; padding:5px 10px;">📎 File</a>` : '';

            // FIXED: Only show Subject string if it's a Homework type
            let subjectString = "";
            if(["Homework", "Classwork", "Assignment", "Project"].includes(a.Type)) {
                subjectString = `| Subject: ${a.Subject || '-'}`;
            }

            listArea.innerHTML += `
                <div class="record-card">
                    <div>
                        <div style="font-size:11px; background:#fdebd0; color:#e67e22; padding:2px 6px; border-radius:3px; display:inline-block; margin-bottom:5px;"><b>${a.Type}</b> • ${dateStr}</div>
                        <h3 style="margin:0 0 5px 0; font-size:16px; color:#2980b9;">${a.Name}</h3>
                        <p style="margin:0; font-size:13px; color:#555;">${classInfo} ${subjectString}</p>
                    </div>
                    <div>${attachBtn}</div>
                </div>
            `;
        });
    }

    loadData();

    // =======================================================
    // 5. FILE UPLOAD & FORM SUBMISSION
    // =======================================================
    const hwFileInput = document.getElementById('hwFile');
    if(hwFileInput) {
        hwFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) { document.getElementById('hwFileName').innerText = file.name; const reader = new FileReader(); reader.onload = function(e) { document.getElementById('hwBase64').value = e.target.result; }; reader.readAsDataURL(file); } 
            else { document.getElementById('hwFileName').innerText = "No file selected"; document.getElementById('hwBase64').value = ""; }
        });
    }

    function formatToDDMMYYYY(dateString) { if(!dateString) return ""; const d = new Date(dateString); if(isNaN(d.getTime())) return dateString; return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`; }

    const hwForm = document.getElementById('assignmentForm');
    if(hwForm) {
        hwForm.addEventListener('submit', function(e) {
            e.preventDefault(); const btn = document.getElementById('btnSaveHw'); btn.innerText = "Saving..."; btn.disabled = true;

            let extraValidationPassed = true;
            if(!document.getElementById('hwType').value) { extraValidationPassed = false; }

            if(extraValidationPassed) {
                const payload = {
                    action: "saveAssignment",
                    data: { 
                        acadYear: document.getElementById('acadYear').value, 
                        date: formatToDDMMYYYY(document.getElementById('hwDate').value), 
                        class: document.getElementById('hwClass').value, 
                        section: document.getElementById('hwSection').value, 
                        subject: document.getElementById('hwSubject') ? document.getElementById('hwSubject').value : "", 
                        type: document.getElementById('hwType').value, 
                        name: document.getElementById('hwName').value, 
                        studentWise: document.getElementById('hwStudentWise').checked, 
                        description: document.getElementById('hwDesc').value, 
                        attachmentBase64: document.getElementById('hwBase64').value, 
                        submissionReq: document.getElementById('hwSubmissionReq').checked, 
                        createdBy: activeUser.empId 
                    }
                };

                fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
                .then(res => res.json()).then(data => {
                    if(data.status === "Success") {
                        alert(data.message); 
                        hwForm.reset(); 
                        document.getElementById('hwDate').value = new Date().toISOString().split('T')[0]; 
                        document.getElementById('hwFileName').innerText = "No file selected"; 
                        document.getElementById('hwBase64').value = "";
                        document.querySelector('.nav-btn.active').click(); // Go back to list
                        loadData(); 
                    } else { alert("Error: " + data.message); }
                }).finally(() => { btn.innerText = "Save Entry"; btn.disabled = false; });
            }
        });
    }
});
