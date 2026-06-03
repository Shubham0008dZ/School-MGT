window.customConfirm = function (message, onConfirm) {
  let overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.innerHTML = `<div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;"><p style="color:#555;margin-bottom:20px;">${message}</p><div style="display:flex;justify-content:center;gap:10px;"><button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button><button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Confirm</button></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById("cc-cancel").addEventListener("click", () => {
    overlay.remove();
  });
  document.getElementById("cc-ok").addEventListener("click", () => {
    overlay.remove();
    onConfirm();
  });
};

window.toggleMultiSelect = function (id) {
  let el = document.getElementById(id);
  if (el) {
    if (el.style.display === "flex") el.style.display = "none";
    else el.style.display = "flex";
  }
};
window.filterMultiSelect = function (input, optionsId) {
  let filter = input.value.toLowerCase();
  let labels = document.getElementById(optionsId).getElementsByTagName("label");
  for (let i = 0; i < labels.length; i++) {
    if (labels[i].innerText.toLowerCase().includes(filter))
      labels[i].style.display = "flex";
    else labels[i].style.display = "none";
  }
};
document.addEventListener("click", function (e) {
  if (!e.target.closest(".multi-select-container")) {
    document
      .querySelectorAll(".multi-select-dropdown")
      .forEach((d) => (d.style.display = "none"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const activeUserStr = localStorage.getItem("erp_active_user");
  if (!activeUserStr) {
    window.location.href = "login.html";
    return;
  }
  const activeUser = JSON.parse(activeUserStr);

  
// DYNAMIC SCRIPT URL FROM MULTI-TENANT LOGIN
const scriptURL = localStorage.getItem('erp_school_url');
if(!scriptURL) { window.location.href = 'login.html'; }




// DYNAMIC NAVBAR UPDATE LOGIC (Multi-Tenant UI)
document.addEventListener('DOMContentLoaded', () => {
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
        navLogoImg.style.display = 'inline-block'; // Show dynamic image
        if(navLogoDefault) navLogoDefault.style.display = 'none'; // Hide default emoji
    }
});


  









  
  fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify({ action: "verifySession", empId: activeUser.empId }),
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "Invalid") {
        alert("Session Invalid.");
        localStorage.removeItem("erp_active_user");
        window.location.href = "login.html";
      }
    });
  if (document.getElementById("btnLogout"))
    document.getElementById("btnLogout").addEventListener("click", () => {
      customConfirm("Logout?", () => {
        localStorage.removeItem("erp_active_user");
        window.location.href = "login.html";
      });
    });

  let allAssignments = [];
  let allSubmissions = [];
  let allStudentsGlobal = [];
  let allEvents = [];
  let allEmployees = [];
  let currentCategory = "Circular";

  // =========================================================
  // HARD REFRESH LOGIC (Session Storage)
  // =========================================================
  let savedTab = sessionStorage.getItem("activeAdminCommTab");
  if (savedTab) {
    currentCategory = savedTab;
    document.querySelectorAll(".nav-btn").forEach((b) => {
      b.classList.remove("active");
      if (b.getAttribute("data-cat") === savedTab) b.classList.add("active");
    });
    document
      .querySelectorAll(".app-module")
      .forEach((m) => (m.style.display = "none"));
    let targetId = document
      .querySelector(`.nav-btn[data-cat="${savedTab}"]`)
      ?.getAttribute("data-target");
    let targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.classList.add("active-module");
      targetElement.style.display = "block";
    }
    if (currentCategory !== "Calendar") {
      let headerTitle = document.getElementById("listHeaderTitle");
      if (headerTitle)
        headerTitle.innerText = currentCategory.toUpperCase() + " RECORDS";
      let btnResp = document.getElementById("btnViewResponses");
      if (btnResp)
        btnResp.style.display =
          currentCategory === "Homework" ? "inline-block" : "none";
    }
  }

  document.querySelectorAll(".nav-btn").forEach((link) => {
    link.addEventListener("click", function (e) {
      if (this.getAttribute("href") !== "#") return;
      e.preventDefault();
      let cat = this.getAttribute("data-cat");
      if (cat) {
        sessionStorage.setItem("activeAdminCommTab", cat);
        window.location.reload(); // HARD REFRESH TRIGGERED
      }
    });
  });

  // =========================================================
  function loadData() {
    let cla = document.getElementById("commListArea");
    if (cla)
      cla.innerHTML =
        '<p style="text-align:center; padding:20px; color:#777;">Fetching records... ⏳</p>';
    fetch(scriptURL, { redirect: "follow" })
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "Success") {
          if (res.setup) {
            const fClassDropdown = document.getElementById("hwClass");
            const fSecDropdown = document.getElementById("hwSection");
            const evClassDropdown = document.getElementById("evClass");
            const evSecDropdown = document.getElementById("evSection");
            let uniqueClasses = [
              ...new Set((res.setup.classes || []).map((c) => c.name)),
            ].sort((a, b) =>
              String(a).localeCompare(String(b), undefined, {
                numeric: true,
                sensitivity: "base",
              }),
            );

            if (fClassDropdown && fClassDropdown.options.length <= 2) {
              uniqueClasses.forEach((item) => {
                fClassDropdown.innerHTML += `<option value="${item}">${item}</option>`;
              });
            }
            if (fClassDropdown)
              fClassDropdown.addEventListener("change", function () {
                let selClass = this.value;
                fSecDropdown.innerHTML =
                  '<option value="">Select Section</option><option value="All">All Sections</option>';
                if (selClass && selClass !== "All") {
                  let filteredSecs = res.setup.classes
                    .filter((c) => String(c.name) === String(selClass))
                    .map((c) => String(c.section));
                  let uniqueSecs = [...new Set(filteredSecs)].sort();
                  uniqueSecs.forEach((sec) => {
                    fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`;
                  });
                }
              });

            if (evClassDropdown && evClassDropdown.options.length <= 2) {
              uniqueClasses.forEach((item) => {
                evClassDropdown.innerHTML += `<option value="${item}">${item}</option>`;
              });
            }
            if (evClassDropdown)
              evClassDropdown.addEventListener("change", function () {
                let selClass = this.value;
                evSecDropdown.innerHTML =
                  '<option value="All">All Sections</option>';
                if (selClass && selClass !== "All") {
                  let filteredSecs = res.setup.classes
                    .filter((c) => String(c.name) === String(selClass))
                    .map((c) => String(c.section));
                  let uniqueSecs = [...new Set(filteredSecs)].sort();
                  uniqueSecs.forEach((sec) => {
                    evSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`;
                  });
                }
              });
          }
          if (res.empSetup && res.empSetup.departments) {
            const evDeptDropdown = document.getElementById("evDept");
            if (evDeptDropdown && evDeptDropdown.options.length <= 1) {
              let uniqueDepts = [...new Set(res.empSetup.departments)]
                .filter((d) => d !== "")
                .sort();
              uniqueDepts.forEach((dept) => {
                evDeptDropdown.innerHTML += `<option value="${dept}">${dept}</option>`;
              });
            }
          }
          allAssignments = res.assignments || [];
          allSubmissions = res.submissions || [];
          allStudentsGlobal = res.data || [];
          allEvents = res.events || [];
          allEmployees = res.employees || [];
          updateBlinkingBadge();
          renderCommList();
          if (currentCategory === "Calendar") renderCalendarList();
        }
      });
  }

  // =========================================================
  // DUE DATE TOGGLE
  // =========================================================
  let hwSubReq = document.getElementById("hwSubmissionReq");
  if (hwSubReq) {
    hwSubReq.addEventListener("change", function () {
      let dueBox = document.getElementById("grpSubDueDate");
      if (dueBox) dueBox.style.display = this.checked ? "flex" : "none";
    });
  }

  // CALENDAR MODULE LOGIC
  const evAudience = document.getElementById("evAudience");
  const evStudentTgt = document.getElementById("evStudentTgt");
  const evEmpTgt = document.getElementById("evEmpTgt");
  if (evAudience)
    evAudience.addEventListener("change", function () {
      if (this.value === "Students") {
        if (evStudentTgt) evStudentTgt.style.display = "flex";
        if (evEmpTgt) evEmpTgt.style.display = "none";
      } else if (this.value === "Employees") {
        if (evStudentTgt) evStudentTgt.style.display = "none";
        if (evEmpTgt) evEmpTgt.style.display = "flex";
      } else {
        if (evStudentTgt) evStudentTgt.style.display = "flex";
        if (evEmpTgt) evEmpTgt.style.display = "flex";
      }
    });

  function popCalStudents() {
    let cls = document.getElementById("evClass").value;
    let sec = document.getElementById("evSection").value;
    let optContainer = document.getElementById("evStudentOptions");
    if (!optContainer) return;
    optContainer.innerHTML =
      '<label class="multi-option"><input type="checkbox" value="All" class="ev-stu-chk" checked> All Students</label>';
    let cntEl = document.getElementById("evStudentCount");
    if (cntEl) cntEl.innerText = "All";
    if (!cls || cls === "All") return;
    let matchStr = sec && sec !== "All" ? `${cls} (${sec})` : cls;
    let filteredStudents = allStudentsGlobal.filter((s) => {
      if (sec && sec !== "All") return String(s.studentClass) === matchStr;
      return String(s.studentClass).startsWith(cls);
    });
    filteredStudents.forEach((s) => {
      let safeName = s.studentFirstName || s.studentName;
      optContainer.innerHTML += `<label class="multi-option"><input type="checkbox" value="${s.regNo}" class="ev-stu-chk"> ${safeName} (${s.regNo})</label>`;
    });
  }
  document
    .getElementById("evClass")
    ?.addEventListener("change", popCalStudents);
  document
    .getElementById("evSection")
    ?.addEventListener("change", popCalStudents);

  function popCalEmps() {
    let dept = document.getElementById("evDept").value;
    let optContainer = document.getElementById("evEmpOptions");
    if (!optContainer) return;
    optContainer.innerHTML =
      '<label class="multi-option"><input type="checkbox" value="All" class="ev-emp-chk" checked> All Employees</label>';
    let cntEl = document.getElementById("evEmpCount");
    if (cntEl) cntEl.innerText = "All";
    if (!dept || dept === "All") return;
    let filteredEmps = allEmployees.filter(
      (e) => String(e.Department || e.empDept) === dept,
    );
    filteredEmps.forEach((e) => {
      let empName = e["Employee Name"] || e.empName || "Unknown";
      let empId = e["Employee Id"] || e.empId || "N/A";
      optContainer.innerHTML += `<label class="multi-option"><input type="checkbox" value="${empId}" class="ev-emp-chk"> ${empName} (${empId})</label>`;
    });
  }
  document.getElementById("evDept")?.addEventListener("change", popCalEmps);

  function bindMultiSelectCount(optionsId, countId, chkClass) {
    let container = document.getElementById(optionsId);
    if (container) {
      container.addEventListener("change", function (e) {
        if (e.target.classList.contains(chkClass)) {
          let allBox = document.querySelector(
            `#${optionsId} .${chkClass}[value="All"]`,
          );
          if (e.target.value === "All" && e.target.checked) {
            document
              .querySelectorAll(`#${optionsId} .${chkClass}`)
              .forEach((c) => {
                if (c.value !== "All") c.checked = false;
              });
            document.getElementById(countId).innerText = "All";
          } else {
            if (allBox) allBox.checked = false;
            let count = document.querySelectorAll(
              `#${optionsId} .${chkClass}:checked`,
            ).length;
            if (count === 0) {
              if (allBox) allBox.checked = true;
              document.getElementById(countId).innerText = "All";
            } else {
              document.getElementById(countId).innerText = count;
            }
          }
        }
      });
    }
  }
  bindMultiSelectCount("evStudentOptions", "evStudentCount", "ev-stu-chk");
  bindMultiSelectCount("evEmpOptions", "evEmpCount", "ev-emp-chk");

  document
    .getElementById("btnSaveEvent")
    ?.addEventListener("click", function () {
      let evDate = document.getElementById("evDate").value;
      let evTitle = document.getElementById("evTitle").value;
      if (!evDate || !evTitle) {
        alert("Please fill Event Date and Title.");
        return;
      }
      let selectedStudents = [];
      document
        .querySelectorAll(".ev-stu-chk:checked")
        .forEach((c) => selectedStudents.push(c.value));
      if (selectedStudents.length === 0) selectedStudents = ["All"];
      let selectedEmps = [];
      document
        .querySelectorAll(".ev-emp-chk:checked")
        .forEach((c) => selectedEmps.push(c.value));
      if (selectedEmps.length === 0) selectedEmps = ["All"];
      let editId = document.getElementById("editEventId")
        ? document.getElementById("editEventId").value
        : "";
      let finalAction = editId ? "updateEvent" : "saveEvent";
      this.innerText = "Saving...";
      this.disabled = true;
      const payload = {
        action: finalAction,
        data: {
          eventId: editId,
          date: formatToDDMMYYYY(evDate),
          title: evTitle,
          description: document.getElementById("evDesc").value,
          isHoliday: document.getElementById("evHoliday").checked,
          isEmpHoliday: document.getElementById("evEmpHoliday")
            ? document.getElementById("evEmpHoliday").checked
            : false,
          audience: document.getElementById("evAudience").value,
          targetClass: document.getElementById("evClass").value,
          targetSection: document.getElementById("evSection").value,
          targetStudent: JSON.stringify(selectedStudents),
          targetDept: document.getElementById("evDept").value,
          targetEmp: JSON.stringify(selectedEmps),
          createdBy: activeUser.empId,
        },
      };
      fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify(payload),
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "Success") {
            alert(data.message);
            document.getElementById("addEventFormBox").style.display = "none";
            loadData();
          } else {
            alert("Error: " + data.message);
          }
        })
        .finally(() => {
          this.innerText = "Save Event";
          this.disabled = false;
        });
    });

  window.renderCalendarList = function () {
    const calList = document.getElementById("calendarListArea");
    if (!calList) return;
    calList.innerHTML = "";
    if (!allEvents || allEvents.length === 0) {
      calList.innerHTML =
        '<p style="text-align:center; color:#777;">No events scheduled.</p>';
      return;
    }
    allEvents
      .slice()
      .reverse()
      .forEach((e) => {
        let holiBadge =
          e.Is_Holiday === "Yes"
            ? '<span style="background:#e74c3c; color:white; padding:2px 5px; border-radius:3px; font-size:10px; margin-left:10px;">Std. Holiday</span>'
            : "";
        let empHoliBadge =
          e.Is_Emp_Holiday === "Yes"
            ? '<span style="background:#8e44ad; color:white; padding:2px 5px; border-radius:3px; font-size:10px; margin-left:5px;">Emp. Holiday</span>'
            : "";
        calList.innerHTML += `<div class="record-card" style="border-left:4px solid #f39c12; display:flex; justify-content:space-between; align-items:center;"><div><div style="font-size:11px; color:#e67e22; margin-bottom:5px;"><b>${e.Date}</b> • Target: ${e.Audience} ${holiBadge} ${empHoliBadge}</div><h3 style="margin:0 0 5px 0; font-size:16px; color:#2c3e50;">${e.Title}</h3><p style="margin:0; font-size:13px; color:#555;">${e.Description || "No description"}</p></div><div style="display:flex; gap:5px; flex-direction:column;"><button class="btn-action-edit" onclick="editEvent('${e.Event_ID}')">✏️ Edit</button><button class="btn-action-del" onclick="deleteEvent('${e.Event_ID}')">🗑️ Del</button></div></div>`;
      });
  };

  window.editEvent = function (eventId) {
    let ev = allEvents.find((e) => String(e.Event_ID) === String(eventId));
    if (!ev) return;
    document.getElementById("editEventId").value = ev.Event_ID;
    document.getElementById("addEventFormBox").style.display = "block";
    if (ev.Date) {
      let parts = ev.Date.split("-");
      if (parts.length === 3)
        document.getElementById("evDate").value =
          `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    document.getElementById("evTitle").value = ev.Title;
    document.getElementById("evDesc").value = ev.Description || "";
    document.getElementById("evHoliday").checked = ev.Is_Holiday === "Yes";
    if (document.getElementById("evEmpHoliday"))
      document.getElementById("evEmpHoliday").checked =
        ev.Is_Emp_Holiday === "Yes";
    document.getElementById("evAudience").value = ev.Audience;
    document.getElementById("evAudience").dispatchEvent(new Event("change"));
    document.getElementById("evClass").value = ev.Target_Class || "All";
    document.getElementById("evClass").dispatchEvent(new Event("change"));
    setTimeout(() => {
      document.getElementById("evSection").value = ev.Target_Section || "All";
      document.getElementById("evSection").dispatchEvent(new Event("change"));
    }, 100);
    document.getElementById("evDept").value = ev.Target_Dept || "All";
    document.getElementById("evDept").dispatchEvent(new Event("change"));
    setTimeout(() => {
      try {
        let stuTgt = JSON.parse(ev.Target_Student || '["All"]');
        if (stuTgt[0] === "All") {
          let sAllBox = document.querySelector('.ev-stu-chk[value="All"]');
          if (sAllBox) sAllBox.checked = true;
          let sCount = document.getElementById("evStudentCount");
          if (sCount) sCount.innerText = "All";
        } else {
          let sAllBox = document.querySelector('.ev-stu-chk[value="All"]');
          if (sAllBox) sAllBox.checked = false;
          document.querySelectorAll(".ev-stu-chk").forEach((chk) => {
            if (stuTgt.includes(chk.value)) chk.checked = true;
          });
          let sCount = document.getElementById("evStudentCount");
          if (sCount) sCount.innerText = stuTgt.length;
        }
        let empTgt = JSON.parse(ev.Target_Emp || '["All"]');
        if (empTgt[0] === "All") {
          let eAllBox = document.querySelector('.ev-emp-chk[value="All"]');
          if (eAllBox) eAllBox.checked = true;
          let eCount = document.getElementById("evEmpCount");
          if (eCount) eCount.innerText = "All";
        } else {
          let eAllBox = document.querySelector('.ev-emp-chk[value="All"]');
          if (eAllBox) eAllBox.checked = false;
          document.querySelectorAll(".ev-emp-chk").forEach((chk) => {
            if (empTgt.includes(chk.value)) chk.checked = true;
          });
          let eCount = document.getElementById("evEmpCount");
          if (eCount) eCount.innerText = empTgt.length;
        }
      } catch (e) {}
    }, 300);
    let saveBtn = document.getElementById("btnSaveEvent");
    if (saveBtn) saveBtn.innerText = "Update Event";
  };

  window.deleteEvent = function (eventId) {
    customConfirm("Are you sure you want to delete this event?", () => {
      fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify({ action: "deleteEvent", eventId: eventId }),
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "Success") {
            alert("Event Deleted!");
            loadData();
          } else {
            alert("Error: " + data.message);
          }
        });
    });
  };

  // COMMUNICATION / ASSIGNMENT MODULE LOGIC
  document.getElementById("btnOpenAddForm")?.addEventListener("click", () => {
    document.querySelectorAll(".app-module").forEach((m) => {
      m.classList.remove("active-module");
      m.style.display = "none";
    });
    let addMod = document.getElementById("module-add-hw");
    if (addMod) {
      addMod.classList.add("active-module");
      addMod.style.display = "block";
    }
    let dynTitle = document.getElementById("formDynamicTitle");
    if (dynTitle) dynTitle.innerText = currentCategory.toUpperCase();
    let editFld = document.getElementById("editAssignmentId");
    if (editFld) editFld.value = "";
    let saveBtn = document.getElementById("btnSaveHw");
    if (saveBtn) saveBtn.innerText = "Save Entry";

    let defaultType = currentCategory;
    if (currentCategory === "Homework") defaultType = "Homework";
    let hwTypeEl = document.getElementById("hwType");
    if (hwTypeEl) hwTypeEl.value = defaultType;
    let hwDateEl = document.getElementById("hwDate");
    if (hwDateEl) hwDateEl.value = new Date().toISOString().split("T")[0];

    let targetAll = document.querySelector(
      'input[name="targetType"][value="All"]',
    );
    if (targetAll) targetAll.checked = true;
    let specificCont = document.getElementById("specificStudentsContainer");
    if (specificCont) specificCont.style.display = "none";
    let sGrid = document.getElementById("stuGrid");
    if (sGrid) sGrid.innerHTML = "";

    let dueBox = document.getElementById("grpSubDueDate");
    if (dueBox) dueBox.style.display = "none";
    let subReq = document.getElementById("hwSubmissionReq");
    if (subReq) subReq.checked = false;

    toggleFormFields(defaultType);
  });



function toggleFormFields(selectedType) {
        let isHW = ["Homework", "Classwork", "Assignment", "Project", "Holiday Homework", "Other"].includes(selectedType);
        let grpType = document.getElementById('grpType');
        let grpSubject = document.getElementById('grpSubject'); let lblDate = document.getElementById('lblDate'); let grpSubReq = document.getElementById('grpSubmissionReq');
        let dynAch = document.getElementById('dynAchievement'); let dynRem = document.getElementById('dynRemarks');
        let hwTypeEl = document.getElementById('hwType'); // Get Type Element

        if(dynAch) dynAch.style.display = 'none'; if(dynRem) dynRem.style.display = 'none';

        if(currentCategory === "Homework") {
            if(grpType) grpType.style.display = 'flex';
            if(hwTypeEl) hwTypeEl.required = true; // Make Required when visible
            if(grpSubject) grpSubject.style.display = 'flex'; 
            if(lblDate) lblDate.innerHTML = 'Publish Date <span style="color:red;">*</span>'; 
            if(grpSubReq) grpSubReq.style.display = 'flex';
            let hwSubEl = document.getElementById('hwSubject'); if(hwSubEl) hwSubEl.required = true;
        } else {
            if(grpType) grpType.style.display = 'none';
            if(hwTypeEl) hwTypeEl.required = false; // FIX: Remove required when hidden
            if(grpSubject) grpSubject.style.display = 'none'; 
            if(lblDate) lblDate.innerHTML = 'Publish Date <span style="color:red;">*</span>';
            if(grpSubReq) { grpSubReq.style.display = 'none'; let hwSubReqEl = document.getElementById('hwSubmissionReq'); if(hwSubReqEl) hwSubReqEl.checked = false; }
            let dueBox = document.getElementById('grpSubDueDate'); if(dueBox) dueBox.style.display = 'none';
            let hwSubEl = document.getElementById('hwSubject'); if(hwSubEl) { hwSubEl.required = false; hwSubEl.value = ""; }
            
            if(selectedType === "Achievement" && dynAch) dynAch.style.display = 'block';
            if(selectedType === "Remarks" && dynRem) dynRem.style.display = 'block';
        }
    }


  

  const hwTypeDropdown = document.getElementById("hwType");
  if (hwTypeDropdown)
    hwTypeDropdown.addEventListener("change", function () {
      toggleFormFields(this.value);
    });

  document.querySelectorAll('input[name="targetType"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      let specCont = document.getElementById("specificStudentsContainer");
      if (this.value === "Specific") {
        if (specCont) specCont.style.display = "block";
        populateCommStudentCheckboxes();
      } else {
        if (specCont) specCont.style.display = "none";
      }
    });
  });

  document
    .getElementById("hwClass")
    ?.addEventListener("change", populateCommStudentCheckboxes);
  document
    .getElementById("hwSection")
    ?.addEventListener("change", populateCommStudentCheckboxes);
  function populateCommStudentCheckboxes() {
    let tgtCheck = document.querySelector('input[name="targetType"]:checked');
    if (!tgtCheck || tgtCheck.value !== "Specific") return;
    let cls = document.getElementById("hwClass").value;
    let sec = document.getElementById("hwSection").value;
    let grid = document.getElementById("stuGrid");
    if (!grid) return;
    if (!cls || cls === "All") {
      grid.innerHTML =
        '<p style="color:#e74c3c; font-size:12px;">Please select a specific class to view students.</p>';
      return;
    }
    let matchStr = sec && sec !== "All" ? `${cls} (${sec})` : cls;
    let filteredStudents = allStudentsGlobal.filter((s) => {
      if (sec && sec !== "All") return String(s.studentClass) === matchStr;
      return String(s.studentClass).startsWith(cls);
    });
    grid.innerHTML = "";
    if (filteredStudents.length === 0) {
      grid.innerHTML =
        '<p style="color:#777; font-size:12px;">No students found in this class/section.</p>';
      return;
    }
    filteredStudents.forEach((s) => {
      let safeName = s.studentFirstName || s.studentName;
      grid.innerHTML += `<label class="stu-item"><input type="checkbox" class="stu-chk" value="${s.regNo}"> ${safeName} (${s.regNo})</label>`;
    });
  }

  function renderCommList() {
    const listArea = document.getElementById("commListArea");
    if (!listArea) return;
    listArea.innerHTML = "";
    let filtered = allAssignments
      .filter((a) => {
        if (currentCategory === "Circular")
          return ["Circular", "Notice", "News"].includes(a.Type);
        if (currentCategory === "Homework")
          return [
            "Homework",
            "Classwork",
            "Assignment",
            "Project",
            "Holiday Homework",
            "Other",
          ].includes(a.Type);
        return a.Type === currentCategory;
      })
      .reverse();

    if (filtered.length === 0) {
      listArea.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">No ${currentCategory} records found.</p>`;
      return;
    }
    filtered.forEach((a) => {
      let dateStr = new Date(a.Timestamp).toLocaleDateString("en-GB");
      let classInfo =
        a.Class === "All" ? "Global" : `Class ${a.Class} (${a.Section})`;
      let attachBtn = a.Attachment_Base64
        ? `<a href="${a.Attachment_Base64}" download class="btn-attach" style="border:none; background:#3498db; color:white; padding:5px 10px;">📎 File</a>`
        : "";
      let subjectString = "";
      if (
        [
          "Homework",
          "Classwork",
          "Assignment",
          "Project",
          "Holiday Homework",
          "Other",
        ].includes(a.Type)
      ) {
        subjectString = `| Subject: ${a.Subject || "-"}`;
      }
      let targetLabel = "";
      try {
        let tg = JSON.parse(a.Target_Students || '["All"]');
        if (tg[0] !== "All")
          targetLabel = ` | <span style="color:#e67e22; font-weight:bold;">${tg.length} Specific Student(s)</span>`;
      } catch (e) {}
      let safeAssignId = String(a.Assignment_ID);

      listArea.innerHTML += `<div class="record-card"><div><div style="font-size:11px; background:#fdebd0; color:#e67e22; padding:2px 6px; border-radius:3px; display:inline-block; margin-bottom:5px;"><b>${a.Type}</b> • ${dateStr}</div><h3 style="margin:0 0 5px 0; font-size:16px; color:#2980b9;">${a.Name}</h3><p style="margin:0; font-size:13px; color:#555;">${classInfo} ${subjectString} ${targetLabel}</p></div><div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">${attachBtn}<div style="display:flex; gap:5px; margin-top:5px;"><button class="btn-action-edit" onclick="editComm('${safeAssignId}')">✏️ Edit</button><button class="btn-action-del" onclick="deleteComm('${safeAssignId}')">🗑️ Del</button></div></div></div>`;
    });
  }

  window.editComm = function (assignId) {
    let a = allAssignments.find(
      (item) => String(item.Assignment_ID) === String(assignId),
    );
    if (!a) return;
    document.getElementById("editAssignmentId").value = a.Assignment_ID;
    document.querySelectorAll(".app-module").forEach((m) => {
      m.classList.remove("active-module");
      m.style.display = "none";
    });
    let formMod = document.getElementById("module-add-hw");
    if (formMod) {
      formMod.classList.add("active-module");
      formMod.style.display = "block";
    }
    let dynTitle = document.getElementById("formDynamicTitle");
    if (dynTitle) dynTitle.innerText = "EDIT " + a.Type.toUpperCase();

    if (a.Date) {
      let parts = a.Date.split("-");
      if (parts.length === 3) {
        let hwD = document.getElementById("hwDate");
        if (hwD) hwD.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    let hwClassEl = document.getElementById("hwClass");
    if (hwClassEl) hwClassEl.value = a.Class;
    let fSecDropdown = document.getElementById("hwSection");
    if (fSecDropdown) {
      fSecDropdown.innerHTML =
        '<option value="">Select Section</option><option value="All">All Sections</option>';
      if (a.Class && a.Class !== "All") {
        fetch(scriptURL, { redirect: "follow" })
          .then((res) => res.json())
          .then((res) => {
            if (res.setup) {
              let filteredSecs = res.setup.classes
                .filter((c) => String(c.name) === String(a.Class))
                .map((c) => String(c.section));
              let uniqueSecs = [...new Set(filteredSecs)].sort();
              uniqueSecs.forEach((sec) => {
                fSecDropdown.innerHTML += `<option value="${sec}">${sec}</option>`;
              });
              fSecDropdown.value = a.Section;
            }
          });
      }
    }

    let hwSub = document.getElementById("hwSubject");
    if (hwSub) hwSub.value = a.Subject || "";
    let hwType = document.getElementById("hwType");
    if (hwType) hwType.value = a.Type;
    let hwName = document.getElementById("hwName");
    if (hwName) hwName.value = a.Name;
    let hwDesc = document.getElementById("hwDesc");
    if (hwDesc) hwDesc.value = a.Description;
    let hwSubReq = document.getElementById("hwSubmissionReq");
    if (hwSubReq) hwSubReq.checked = a.Submission_Required === "Yes";

    let dueBox = document.getElementById("grpSubDueDate");
    if (dueBox)
      dueBox.style.display = a.Submission_Required === "Yes" ? "flex" : "none";
    let dueInp = document.getElementById("hwSubDueDate");
    if (dueInp && a.Submission_Due_Date) {
      let p = a.Submission_Due_Date.split("-");
      if (p.length === 3) dueInp.value = `${p[2]}-${p[1]}-${p[0]}`;
    }

    let hwB64 = document.getElementById("hwBase64");
    if (hwB64) hwB64.value = a.Attachment_Base64 || "";
    let hwFileN = document.getElementById("hwFileName");
    if (hwFileN)
      hwFileN.innerText = a.Attachment_Base64
        ? "Existing Attachment Loaded"
        : "No file selected";

    try {
      let tg = JSON.parse(a.Target_Students || '["All"]');
      let tAll = document.querySelector(
        'input[name="targetType"][value="All"]',
      );
      let tSpec = document.querySelector(
        'input[name="targetType"][value="Specific"]',
      );
      let sCont = document.getElementById("specificStudentsContainer");
      if (tg[0] === "All") {
        if (tAll) tAll.checked = true;
        if (sCont) sCont.style.display = "none";
      } else {
        if (tSpec) tSpec.checked = true;
        if (sCont) sCont.style.display = "block";
        setTimeout(() => {
          populateCommStudentCheckboxes();
          setTimeout(() => {
            document.querySelectorAll(".stu-chk").forEach((chk) => {
              if (tg.includes(chk.value)) chk.checked = true;
            });
          }, 500);
        }, 500);
      }
    } catch (e) {}
    try {
      let meta = JSON.parse(a.Metadata_JSON || "{}");
      if (a.Type === "Achievement") {
        let ag = document.getElementById("achGroup");
        if (ag) ag.value = meta.group || "";
        let al = document.getElementById("achLevel");
        if (al) al.value = meta.level || "";
        let ar = document.getElementById("achRank");
        if (ar) ar.value = meta.rank || "";
        let av = document.getElementById("achVenue");
        if (av) av.value = meta.venue || "";
      } else if (a.Type === "Remarks") {
        let rc = document.getElementById("remCat");
        if (rc) rc.value = meta.category || "";
        let rt = document.getElementById("remType");
        if (rt) rt.value = meta.type || "";
      }
    } catch (e) {}

    let sBtn = document.getElementById("btnSaveHw");
    if (sBtn) sBtn.innerText = "Update Entry";
    toggleFormFields(a.Type);
  };

  window.deleteComm = function (assignId) {
    customConfirm(
      "Are you sure you want to delete this record permanently?",
      () => {
        const payload = { action: "deleteAssignment", assignmentId: assignId };
        fetch(scriptURL, {
          method: "POST",
          body: JSON.stringify(payload),
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "Success") {
              alert("Record Deleted!");
              loadData();
            } else {
              alert("Error: " + data.message);
            }
          });
      },
    );
  };

  // RESPONSES & TEACHER GRADING
  function updateBlinkingBadge() {
    let pendingSubs = allSubmissions.filter(
      (s) => !s.Marks || String(s.Marks).trim() === "",
    );
    let badge = document.getElementById("respBlinkBadge");
    if (badge) {
      badge.innerText = pendingSubs.length;
      if (pendingSubs.length > 0) {
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  }
  document.getElementById("btnViewResponses")?.addEventListener("click", () => {
    const tbody = document.getElementById("respTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    let pendingSubs = allSubmissions.filter(
      (s) => !s.Marks || String(s.Marks).trim() === "",
    );
    if (pendingSubs.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; padding:20px; color:#777;">All caught up! No pending submissions.</td></tr>';
    } else {
      pendingSubs.forEach((sub) => {
        let assign = allAssignments.find(
          (a) => String(a.Assignment_ID) === String(sub.Assignment_ID),
        );
        let assignName = assign ? assign.Name : "Unknown Assignment";
        let attachLink = sub.Attachment_Base64
          ? `<a href="${sub.Attachment_Base64}" download class="btn-attach" style="background:#3498db; color:white; border:none; padding:4px 8px; font-size:11px;">📎 File</a>`
          : "No file";
        tbody.innerHTML += `<tr><td><b>${sub.Student_Name}</b><br><span style="font-size:10px;color:#777;">${sub.Reg_No}</span></td><td>${assignName}</td><td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sub.Answer_Text || ""}">${sub.Answer_Text || "--"} <br> ${attachLink}</td><td><input type="text" id="marks_${sub.Assignment_ID}_${sub.Reg_No}" class="marks-input" placeholder="e.g. 8/10"></td><td><input type="text" id="rem_${sub.Assignment_ID}_${sub.Reg_No}" class="remarks-input" placeholder="Good work..."></td><td><button style="background:#27ae60; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; font-weight:bold;" onclick="saveMarks('${sub.Assignment_ID}', '${sub.Reg_No}', this)">✅ Save</button></td></tr>`;
      });
    }
    let mod = document.getElementById("responsesModal");
    if (mod) mod.style.display = "flex";
  });





  window.saveMarks = function(assignId, regNo, btnElement) {
        let marksVal = document.getElementById(`marks_${assignId}_${regNo}`).value;
        let remVal = document.getElementById(`rem_${assignId}_${regNo}`).value;
        if(!marksVal) { alert("Please enter marks to evaluate."); return; }
        btnElement.innerText = "Saving..."; btnElement.disabled = true;

        // FIX: Added single quote to force String format in Google Sheets
        let safeMarksVal = "'" + marksVal; 
        
        const payload = { action: "gradeHomework", data: { assignmentId: assignId, regNo: regNo, marks: safeMarksVal, remarks: remVal } };
        fetch(scriptURL, { method: 'POST', body: JSON.stringify(payload), redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" } }).then(res => res.json()).then(data => {
            if(data.status === "Success") {
                let tr = btnElement.closest('tr'); if(tr) tr.remove();
                let subObj = allSubmissions.find(s => String(s.Assignment_ID) === String(assignId) && String(s.Reg_No) === String(regNo));
                if(subObj) { subObj.Marks = marksVal; }
                updateBlinkingBadge(); alert(data.message);
            } else { alert("Error: " + data.message); btnElement.innerText = "✅ Save"; btnElement.disabled = false; }
        });
    };









  

  // UTILS & FORM SUBMISSION
  const hwFileInput = document.getElementById("hwFile");
  if (hwFileInput) {
    hwFileInput.addEventListener("change", function () {
      const file = this.files[0];
      let nameEl = document.getElementById("hwFileName");
      let b64El = document.getElementById("hwBase64");
      if (file) {
        if (nameEl) nameEl.innerText = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
          if (b64El) b64El.value = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        if (nameEl) nameEl.innerText = "No file selected";
        if (b64El) b64El.value = "";
      }
    });
  }

  function formatToDDMMYYYY(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
  }

  const hwForm = document.getElementById("assignmentForm");
  if (hwForm) {
    hwForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const btn = document.getElementById("btnSaveHw");
      if (btn) {
        btn.innerText = "Saving...";
        btn.disabled = true;
      }

      let typeEl = document.getElementById("hwType");
      let type = currentCategory;
      if (currentCategory === "Homework")
        type = typeEl ? typeEl.value : "Homework";

      if (!type) {
        alert("Type is required");
        if (btn) {
          btn.innerText = "Save Entry";
          btn.disabled = false;
        }
        return;
      }

      let targetTypeEl = document.querySelector(
        'input[name="targetType"]:checked',
      );
      let targetType = targetTypeEl ? targetTypeEl.value : "All";
      let targetArray = ["All"];
      if (targetType === "Specific") {
        targetArray = [];
        document
          .querySelectorAll(".stu-chk:checked")
          .forEach((c) => targetArray.push(c.value));
        if (targetArray.length === 0) {
          alert("Please select at least one specific student.");
          if (btn) {
            btn.innerText = "Save Entry";
            btn.disabled = false;
          }
          return;
        }
      }

      let metaData = {};
      if (type === "Achievement") {
        metaData = {
          group: document.getElementById("achGroup")
            ? document.getElementById("achGroup").value
            : "",
          level: document.getElementById("achLevel")
            ? document.getElementById("achLevel").value
            : "",
          rank: document.getElementById("achRank")
            ? document.getElementById("achRank").value
            : "",
          venue: document.getElementById("achVenue")
            ? document.getElementById("achVenue").value
            : "",
        };
      } else if (type === "Remarks") {
        metaData = {
          category: document.getElementById("remCat")
            ? document.getElementById("remCat").value
            : "",
          type: document.getElementById("remType")
            ? document.getElementById("remType").value
            : "",
        };
      }

      let editIdEl = document.getElementById("editAssignmentId");
      let editId = editIdEl ? editIdEl.value : "";
      let finalAction = editId ? "updateAssignment" : "saveAssignment";

      const payload = {
        action: finalAction,
        data: {
          assignmentId: editId,
          acadYear: document.getElementById("acadYear")
            ? document.getElementById("acadYear").value
            : "",
          date: formatToDDMMYYYY(
            document.getElementById("hwDate")
              ? document.getElementById("hwDate").value
              : "",
          ),
          class: document.getElementById("hwClass")
            ? document.getElementById("hwClass").value
            : "",
          section: document.getElementById("hwSection")
            ? document.getElementById("hwSection").value
            : "",
          subject: document.getElementById("hwSubject")
            ? document.getElementById("hwSubject").value
            : "",
          type: type,
          name: document.getElementById("hwName")
            ? document.getElementById("hwName").value
            : "",
          studentWise: false,
          description: document.getElementById("hwDesc")
            ? document.getElementById("hwDesc").value
            : "",
          attachmentBase64: document.getElementById("hwBase64")
            ? document.getElementById("hwBase64").value
            : "",
          submissionReq: document.getElementById("hwSubmissionReq")
            ? document.getElementById("hwSubmissionReq").checked
            : false,
          submissionDueDate: formatToDDMMYYYY(
            document.getElementById("hwSubDueDate")
              ? document.getElementById("hwSubDueDate").value
              : "",
          ),
          createdBy: activeUser.empId,
          targetStudents: JSON.stringify(targetArray),
          metadataJson: JSON.stringify(metaData),
        },
      };

      fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify(payload),
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "Success") {
            alert(data.message);
            hwForm.reset();
            if (editIdEl) editIdEl.value = "";
            let actBtn = document.querySelector(".nav-btn.active");
            if (actBtn) {
              sessionStorage.setItem(
                "activeAdminCommTab",
                actBtn.getAttribute("data-cat"),
              );
              window.location.reload();
            }
          } else {
            alert("Error: " + data.message);
          }
        })
        .finally(() => {
          if (btn) {
            btn.innerText = "Save Entry";
            btn.disabled = false;
          }
        });
    });
  }

  loadData();
});
