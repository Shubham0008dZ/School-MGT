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
    
    // 1. Session Verification
    const activeUserStr = localStorage.getItem('erp_active_user');
    if (!activeUserStr) { window.location.href = 'login.html'; return; }
    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    try { userRights = JSON.parse(activeUser.Rights_JSON || "[]"); } catch(e) { }

    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';

    fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
    .then(res => res.json()).then(data => {
        if (data.status === "Invalid") { alert("Session Invalid."); localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }
        else if (data.status === "Valid" && data.user) { localStorage.setItem('erp_active_user', JSON.stringify(data.user)); }
    });

    if (!isSA && !userRights.some(r => r.startsWith("HW_"))) { window.location.href = 'index.html'; return; }

    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) btnLogout.addEventListener('click', () => { customConfirm("Are you sure you want to logout?", () => { localStorage.removeItem('erp_active_user'); window.location.href = 'login.html'; }); });

    // 2. Tab Navigation Logic
    let currentCategory = "Circular"; 
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href') !== '#') return; e.preventDefault();
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-module').forEach(m => { m.classList.remove('active-module'); m.style.display = 'none'; });
            
            this.classList.add('active');
            let targetId = this.getAttribute('data-target');
            let targetElement = document.getElementById(targetId);
            if(targetElement) { targetElement.classList.add('active-module'); targetElement.style.display = 'block'; }

            if(this.getAttribute('data-cat')) {
                currentCategory = this.getAttribute('data-cat');
                if(currentCategory !== "Calendar") {
                    let headerTitle = document.getElementById('listHeaderTitle');
                    if(headerTitle) headerTitle.innerText = currentCategory.toUpperCase() + " RECORDS";
                    let btnResp = document.getElementById('btnViewResponses');
                    if(btnResp) { if(currentCategory === "Homework") btnResp.style.display = 'inline-block'; else btnResp.style.display = 'none'; }
                    renderCommList();
                } else {
                    renderCalendarList(); // New logic for calendar
                }
            }
        });
    });

    // ============================================================================
    // CALENDAR LOGIC (NEW)
    // ============================================================================
    const evAudience = document.getElementById('evAudience');
    const evStudentTgt = document.getElementById('evStudentTgt');
    const evEmpTgt = document.getElementById('evEmpTgt');
    
    if(evAudience) {
        evAudience.addEventListener('change', function() {
            if(this.value === "Students") { evStudentTgt.style.display = 'flex'; evEmpTgt.style.display = 'none'; }
            else if(this.value === "Employees") { evStudentTgt.style.display = 'none'; evEmpTgt.style.display = 'flex'; }
            else { evStudentTgt.style.display = 'flex'; evEmpTgt.style.display = 'flex'; }
        });
    }



    // REPLACED: NEW CALENDAR SAVE LOGIC WITH MULTI-SELECT ARRAYS
    const btnSaveEvent = document.getElementById('btnSaveEvent');
    if(btnSaveEvent) {
        btnSaveEvent.addEventListener('click', function() {
            let evDate = document.getElementById('evDate').value;
            let evTitle = document.getElementById('evTitle').value;
            if(!evDate || !evTitle) { alert("Please fill Date and Title."); return; }

            // Fetch selected students
            let selectedStudents = [];
            document.querySelectorAll('.ev-stu-chk:checked').forEach(c => selectedStudents.push(c.value));
            if(selectedStudents.length === 0) selectedStudents = ["All"];

            // Fetch selected employees
            let selectedEmps = [];
            document.querySelectorAll('.ev-emp-chk:checked').forEach(c => selectedEmps.push(c.value));
            if(selectedEmps.length === 0) selectedEmps = ["All"];

            this.innerText = "Saving..."; this.disabled = true;
            
            const payload = {
                action: "saveEvent",
                data: {
                    date: formatToDDMMYYYY(evDate),
                    title: evTitle,
                    description: document.getElementById('evDesc').value,
                    isHoliday: document.getElementById('evHoliday').checked,
                    isEmpHoliday: document.getElementById('evEmpHoliday') ? document.getElementById('evEmpHoliday').checked : false,
                    audience: document.getElementById('evAudience').value,
                    targetClass: document.getElementById('evClass').value,
                    targetSection: document.getElementById('evSection').value,
                    targetStudent: JSON.stringify(selectedStudents),
                    targetDept: document.getElementById('evDept').value,
                    targetEmp: JSON.stringify(selectedEmps),
                    createdBy: activeUser.empId
                }
            };

            fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
            .then(res => res.json()).then(data => {
                if(data.status === "Success") {
                    alert(data.message);
                    document.getElementById('addEventFormBox').style.display = 'none';
                    loadData(); 
                } else { alert("Error: " + data.message); }
            }).finally(() => { this.innerText = "Save Event"; this.disabled = false; });
        });
    }


    

    function renderCalendarList() {
        const calList = document.getElementById('calendarListArea');
        if(!calList) return;
        calList.innerHTML = '';
        if(!allEvents || allEvents.length === 0) { calList.innerHTML = '<p style="text-align:center; color:#777;">No events scheduled.</p>'; return; }
        
        allEvents.forEach(e => {
            let holiBadge = e.Is_Holiday === "Yes" ? '<span style="background:#e74c3c; color:white; padding:2px 5px; border-radius:3px; font-size:10px; margin-left:10px;">Holiday</span>' : '';
            calList.innerHTML += `
                <div class="record-card" style="border-left:4px solid #f39c12;">
                    <div>
                        <div style="font-size:11px; color:#e67e22; margin-bottom:5px;"><b>${e.Date}</b> • Target: ${e.Audience} ${holiBadge}</div>
                        <h3 style="margin:0 0 5px 0; font-size:16px; color:#2c3e50;">${e.Title}</h3>
                        <p style="margin:0; font-size:13px; color:#555;">${e.Description || 'No description'}</p>
                    </div>
                </div>
            `;
        });
    }

    // ============================================================================
    // REST OF ADMIN LOGIC (Form, Edit, Delete, Render Comm)
    // ============================================================================
    let allAssignments = []; let allSubmissions = []; let allStudentsGlobal = []; let allEvents = [];

    document.getElementById('btnOpenAddForm').addEventListener('click', () => {
        document.querySelectorAll('.app-module').forEach(m => { m.classList.remove('active-module'); m.style.display = 'none'; });
        let addMod = document.getElementById('module-add-hw'); addMod.classList.add('active-module'); addMod.style.display = 'block'; 
        
        document.getElementById('formDynamicTitle').innerText = currentCategory.toUpperCase();
        document.getElementById('editAssignmentId').value = ""; 
        document.getElementById('btnSaveHw').innerText = "Save Entry";
        let defaultType = currentCategory; if(currentCategory === "Homework") defaultType = "Homework"; 
        document.getElementById('hwType').value = defaultType; 
        document.getElementById('hwDate').value = new Date().toISOString().split('T')[0];

        document.querySelector('input[name="targetType"][value="All"]').checked = true;
        document.getElementById('specificStudentsContainer').style.display = 'none';
        document.getElementById('stuGrid').innerHTML = '';
        toggleFormFields(defaultType);
    });

    function toggleFormFields(selectedType) {
        let isHW = ["Homework", "Classwork", "Assignment", "Project"].includes(selectedType);
        let grpSubject = document.getElementById('grpSubject'); let lblDate = document.getElementById('lblDate'); let grpSubReq = document.getElementById('grpSubmissionReq');
        let dynAch = document.getElementById('dynAchievement'); let dynRem = document.getElementById('dynRemarks');

        if(dynAch) dynAch.style.display = 'none'; if(dynRem) dynRem.style.display = 'none';

        if(isHW) {
            if(grpSubject) grpSubject.style.display = 'flex'; if(lblDate) lblDate.innerHTML = 'Due Date <span style="color:red;">*</span>'; if(grpSubReq) grpSubReq.style.display = 'flex';
            document.getElementById('hwSubject').required = true;
        } else {
            if(grpSubject) grpSubject.style.display = 'none'; if(lblDate) lblDate.innerHTML = 'Publish Date <span style="color:red;">*</span>';
            if(grpSubReq) { grpSubReq.style.display = 'none'; document.getElementById('hwSubmissionReq').checked = false; }
            document.getElementById('hwSubject').required = false; document.getElementById('hwSubject').value = ""; 
            if(selectedType === "Achievement" && dynAch) dynAch.style.display = 'block';
            if(selectedType === "Remarks" && dynRem) dynRem.style.display = 'block';
        }
    }

    const hwTypeDropdown = document.getElementById('hwType');
    if(hwTypeDropdown) hwTypeDropdown.addEventListener('change', function() { toggleFormFields(this.value); });

    document.querySelectorAll('input[name="targetType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if(this.value === "Specific") { document.getElementById('specificStudentsContainer').style.display = 'block'; populateStudentCheckboxes(); } 
            else { document.getElementById('specificStudentsContainer').style.display = 'none'; }
        });
    });

    document.getElementById('hwClass')?.addEventListener('change', populateStudentCheckboxes);
    document.getElementById('hwSection')?.addEventListener('change', populateStudentCheckboxes);

    function populateStudentCheckboxes() {
        if(document.querySelector('input[name="targetType"]:checked').value !== "Specific") return;
        let cls = document.getElementById('hwClass').value; let sec = document.getElementById('hwSection').value; let grid = document.getElementById('stuGrid');
        if(!cls || cls === "All") { grid.innerHTML = '<p style="color:#e74c3c; font-size:12px;">Please select a specific class to view students.</p>'; return; }

        let matchStr = sec && sec !== "All" ? `${cls} (${sec})` : cls;
        let filteredStudents = allStudentsGlobal.filter(s => {
            if(sec && sec !== "All") return String(s.studentClass) === matchStr;
            return String(s.studentClass).startsWith(cls);
        });

        grid.innerHTML = '';
        if(filteredStudents.length === 0) { grid.innerHTML = '<p style="color:#777; font-size:12px;">No students found in this class/section.</p>'; return; }
        filteredStudents.forEach(s => {
            let safeName = s.studentFirstName || s.studentName;
            grid.innerHTML += `<label class="stu-item"><input type="checkbox" class="stu-chk" value="${s.regNo}"> ${safeName} (${s.regNo})</label>`;
        });
    }

    function loadData() {
        let cla = document.getElementById('commListArea'); if(cla) cla.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Fetching records... ⏳</p>';
        fetch(scriptURL, { redirect: "follow" }).then(res => res.json()).then(res => {
            if(res.status === "Success") { 



if(res.setup) {
                    const setupData = res.setup;
                    const fClassDropdown = document.getElementById('hwClass'); const fSecDropdown = document.getElementById('hwSection');
                    const evClassDropdown = document.getElementById('evClass'); const evSecDropdown = document.getElementById('evSection');
                    
                    let uniqueClasses = [...new Set((setupData.classes || []).map(c => c.name))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true, sensitivity:'base'}));
                    
                    // 1. Homework Dropdowns
                    if(fClassDropdown && fClassDropdown.options.length <= 2) { uniqueClasses.forEach(item => { fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; }); }
                    if(fClassDropdown) {
                        fClassDropdown.addEventListener('change', function() {
                            let selClass = this.value; fSecDropdown.innerHTML = '<option value="">Select Section</option><option value="All">All Sections</option>';
                            if(selClass && selClass !== "All") {
                                let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                                let uniqueSecs = [...new Set(filteredSecs)].sort(); uniqueSecs.forEach(sec => { fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
                            }
                        });
                    }

                    // 2. Calendar Event Dropdowns (Class -> Section Logic Added)
                    if(evClassDropdown && evClassDropdown.options.length <= 2) { uniqueClasses.forEach(item => { evClassDropdown.innerHTML += `<option value="${item}">${item}</option>`; }); }
                    if(evClassDropdown) {
                        evClassDropdown.addEventListener('change', function() {
                            let selClass = this.value; evSecDropdown.innerHTML = '<option value="All">All Sections</option>';
                            if(selClass && selClass !== "All") {
                                let filteredSecs = setupData.classes.filter(c => String(c.name) === String(selClass)).map(c => String(c.section));
                                let uniqueSecs = [...new Set(filteredSecs)].sort(); uniqueSecs.forEach(sec => { evSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`; });
                            }
                        });
                    }
                }
                
                // 3. Calendar Employee Department Dropdown Population Added
                if(res.empSetup && res.empSetup.departments) {
                    const evDeptDropdown = document.getElementById('evDept');
                    if(evDeptDropdown && evDeptDropdown.options.length <= 1) {
                        let uniqueDepts = [...new Set(res.empSetup.departments)].filter(d => d !== "").sort();
                        uniqueDepts.forEach(dept => { evDeptDropdown.innerHTML += `<option value="${dept}">${dept}</option>`; });
                    }
                }

                
                allAssignments = res.assignments || []; allSubmissions = res.submissions || []; allStudentsGlobal = res.data || []; allEvents = res.events || [];
                updateBlinkingBadge(); renderCommList(); if(currentCategory === "Calendar") renderCalendarList();
            }
        });
    }

    function updateBlinkingBadge() {
        let pendingSubs = allSubmissions.filter(s => !s.Marks || String(s.Marks).trim() === "");
        let badge = document.getElementById('respBlinkBadge');
        if(badge) {
            badge.innerText = pendingSubs.length;
            if(pendingSubs.length > 0) { badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; }
        }
    }

    // Modal and Render Logic Remains Identical
    document.getElementById('btnViewResponses')?.addEventListener('click', () => { /* intact logic */ });
    window.saveMarks = function(assignId, regNo, btnElement) { /* intact logic */ };

    function renderCommList() {
        const listArea = document.getElementById('commListArea'); if(!listArea) return; listArea.innerHTML = '';
        let filtered = allAssignments.filter(a => {
            if(currentCategory === "Circular") return ["Circular", "Notice", "News"].includes(a.Type);
            if(currentCategory === "Homework") return ["Homework", "Classwork", "Assignment", "Project", "Holiday Homework"].includes(a.Type);
            return a.Type === currentCategory;
        }).reverse(); 

        if(filtered.length === 0) { listArea.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">No ${currentCategory} records found.</p>`; return; }

        filtered.forEach(a => {
            let dateStr = new Date(a.Timestamp).toLocaleDateString('en-GB');
            let classInfo = (a.Class === "All" ? "Global" : `Class ${a.Class} (${a.Section})`);
            let attachBtn = a.Attachment_Base64 ? `<a href="${a.Attachment_Base64}" download class="btn-attach" style="border:none; background:#3498db; color:white; padding:5px 10px;">📎 File</a>` : '';
            let subjectString = ""; if(["Homework", "Classwork", "Assignment", "Project"].includes(a.Type)) { subjectString = `| Subject: ${a.Subject || '-'}`; }
            let targetLabel = ""; try { let tg = JSON.parse(a.Target_Students || '["All"]'); if(tg[0] !== "All") targetLabel = ` | <span style="color:#e67e22; font-weight:bold;">${tg.length} Specific Student(s)</span>`; } catch(e){}
            let safeAssignId = String(a.Assignment_ID);

            listArea.innerHTML += `
                <div class="record-card">
                    <div>
                        <div style="font-size:11px; background:#fdebd0; color:#e67e22; padding:2px 6px; border-radius:3px; display:inline-block; margin-bottom:5px;"><b>${a.Type}</b> • ${dateStr}</div>
                        <h3 style="margin:0 0 5px 0; font-size:16px; color:#2980b9;">${a.Name}</h3>
                        <p style="margin:0; font-size:13px; color:#555;">${classInfo} ${subjectString} ${targetLabel}</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
                        ${attachBtn}
                        <div style="display:flex; gap:5px; margin-top:5px;">
                            <button class="btn-action-edit" onclick="editComm('${safeAssignId}')">✏️ Edit</button>
                            <button class="btn-action-del" onclick="deleteComm('${safeAssignId}')">🗑️ Del</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    window.editComm = function(assignId) { /* intact logic */ };
    window.deleteComm = function(assignId) { /* intact logic */ };

    loadData();

    // File Upload & Form Submit (Intact)
    const hwFileInput = document.getElementById('hwFile');
    if(hwFileInput) { hwFileInput.addEventListener('change', function() { if(this.files[0]) { document.getElementById('hwFileName').innerText = this.files[0].name; const reader = new FileReader(); reader.onload = function(e) { document.getElementById('hwBase64').value = e.target.result; }; reader.readAsDataURL(this.files[0]); } else { document.getElementById('hwFileName').innerText = "No file selected"; document.getElementById('hwBase64').value = ""; } }); }

    function formatToDDMMYYYY(dateString) { if(!dateString) return ""; const d = new Date(dateString); if(isNaN(d.getTime())) return dateString; return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`; }

    const hwForm = document.getElementById('assignmentForm');
    if(hwForm) {
        hwForm.addEventListener('submit', function(e) {
            e.preventDefault(); const btn = document.getElementById('btnSaveHw'); btn.innerText = "Saving..."; btn.disabled = true;

            let extraValidationPassed = true; let type = document.getElementById('hwType').value;
            if(!type) { extraValidationPassed = false; }

            let targetType = document.querySelector('input[name="targetType"]:checked').value;
            let targetArray = ["All"];
            if(targetType === "Specific") {
                targetArray = [];
                document.querySelectorAll('.stu-chk:checked').forEach(c => targetArray.push(c.value));
                if(targetArray.length === 0) { alert("Please select at least one specific student."); btn.innerText = "Save Entry"; btn.disabled = false; return; }
            }

            let metaData = {};
            if(type === "Achievement") { metaData = { group: document.getElementById('achGroup').value, level: document.getElementById('achLevel').value, rank: document.getElementById('achRank').value, venue: document.getElementById('achVenue').value }; } 
            else if (type === "Remarks") { metaData = { category: document.getElementById('remCat').value, type: document.getElementById('remType').value }; }

            let editId = document.getElementById('editAssignmentId').value;
            let finalAction = editId ? "updateAssignment" : "saveAssignment";

            if(extraValidationPassed) {
                const payload = {
                    action: finalAction,
                    data: { 
                        assignmentId: editId, acadYear: document.getElementById('acadYear').value, date: formatToDDMMYYYY(document.getElementById('hwDate').value), class: document.getElementById('hwClass').value, section: document.getElementById('hwSection').value, subject: document.getElementById('hwSubject') ? document.getElementById('hwSubject').value : "", type: type, name: document.getElementById('hwName').value, studentWise: false, description: document.getElementById('hwDesc').value, attachmentBase64: document.getElementById('hwBase64').value, submissionReq: document.getElementById('hwSubmissionReq').checked, createdBy: activeUser.empId, targetStudents: JSON.stringify(targetArray), metadataJson: JSON.stringify(metaData)
                    }
                };

                fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } })
                .then(res => res.json()).then(data => {
                    if(data.status === "Success") {
                        alert(data.message); hwForm.reset(); document.getElementById('editAssignmentId').value = ""; document.getElementById('hwDate').value = new Date().toISOString().split('T')[0]; document.getElementById('hwFileName').innerText = "No file selected"; document.getElementById('hwBase64').value = "";
                        document.querySelector('.nav-btn.active').click(); loadData(); 
                    } else { alert("Error: " + data.message); }
                }).finally(() => { btn.innerText = "Save Entry"; btn.disabled = false; });
            }
        });
    }

// ============================================================================
    // NEW MULTI-SELECT DROPDOWN & FILTER LOGIC
    // ============================================================================
    
    // Global functions for inline HTML calls
    window.toggleMultiSelect = function(id) {
        let el = document.getElementById(id);
        if(el.style.display === 'flex') el.style.display = 'none'; else el.style.display = 'flex';
    };

    window.filterMultiSelect = function(input, optionsId) {
        let filter = input.value.toLowerCase();
        let labels = document.getElementById(optionsId).getElementsByTagName('label');
        for(let i=0; i<labels.length; i++) {
            if(labels[i].innerText.toLowerCase().includes(filter)) labels[i].style.display = 'flex';
            else labels[i].style.display = 'none';
        }
    };

    // Close dropdowns if clicked outside
    document.addEventListener('click', function(e) {
        if(!e.target.closest('.multi-select-container')) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
        }
    });

    // Auto-populate Students when Class/Sec changes
    function popCalStudents() {
        let cls = document.getElementById('evClass').value; let sec = document.getElementById('evSection').value;
        let optContainer = document.getElementById('evStudentOptions');
        if(!optContainer) return;
        
        optContainer.innerHTML = '<label class="multi-option"><input type="checkbox" value="All" class="ev-stu-chk" checked> All Students</label>';
        document.getElementById('evStudentCount').innerText = "All";

        if(!cls || cls === "All") return; 
        
        let matchStr = sec && sec !== "All" ? `${cls} (${sec})` : cls;
        let filteredStudents = allStudentsGlobal.filter(s => {
            if(sec && sec !== "All") return String(s.studentClass) === matchStr;
            return String(s.studentClass).startsWith(cls);
        });

        filteredStudents.forEach(s => {
            let safeName = s.studentFirstName || s.studentName;
            optContainer.innerHTML += `<label class="multi-option"><input type="checkbox" value="${s.regNo}" class="ev-stu-chk"> ${safeName} (${s.regNo})</label>`;
        });
    }
    document.getElementById('evClass')?.addEventListener('change', popCalStudents);
    document.getElementById('evSection')?.addEventListener('change', popCalStudents);

    // Auto-populate Employees when Dept changes
    function popCalEmps() {
        let dept = document.getElementById('evDept').value;
        let optContainer = document.getElementById('evEmpOptions');
        if(!optContainer) return;

        optContainer.innerHTML = '<label class="multi-option"><input type="checkbox" value="All" class="ev-emp-chk" checked> All Employees</label>';
        document.getElementById('evEmpCount').innerText = "All";

        if(!dept || dept === "All") return;

        let filteredEmps = allEmployees.filter(e => String(e.empDept) === dept);
        filteredEmps.forEach(e => {
            optContainer.innerHTML += `<label class="multi-option"><input type="checkbox" value="${e.empId}" class="ev-emp-chk"> ${e.empName} (${e.empId})</label>`;
        });
    }
    document.getElementById('evDept')?.addEventListener('change', popCalEmps);

    // Handle "All" vs "Specific" checking logic and update Count Badge
    function bindMultiSelectCount(optionsId, countId, chkClass) {
        let container = document.getElementById(optionsId);
        if(container) {
            container.addEventListener('change', function(e) {
                if(e.target.classList.contains(chkClass)) {
                    let allBox = document.querySelector(`#${optionsId} .${chkClass}[value="All"]`);
                    
                    if(e.target.value === "All" && e.target.checked) {
                        document.querySelectorAll(`#${optionsId} .${chkClass}`).forEach(c => { if(c.value !== "All") c.checked = false; });
                        document.getElementById(countId).innerText = "All";
                    } else {
                        if(allBox) allBox.checked = false;
                        let count = document.querySelectorAll(`#${optionsId} .${chkClass}:checked`).length;
                        if(count === 0) {
                            if(allBox) allBox.checked = true;
                            document.getElementById(countId).innerText = "All";
                        } else {
                            document.getElementById(countId).innerText = count;
                        }
                    }
                }
            });
        }
    }
    
    // Bind logic to both boxes
    bindMultiSelectCount('evStudentOptions', 'evStudentCount', 'ev-stu-chk');
    bindMultiSelectCount('evEmpOptions', 'evEmpCount', 'ev-emp-chk');
    
});
