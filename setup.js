document.addEventListener('DOMContentLoaded', () => {
    // API URL - KEEP YOUR DEPLOYMENT URL HERE
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    let masterData = {
        classes: [], genders: ["Male", "Female", "Other"], categories: ["General", "OBC", "SC", "ST"],
        bloodGroups: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], houses: ["Red", "Blue", "Green", "Yellow"],
        religions: ["Hindu", "Muslim", "Sikh", "Christian", "Jain", "Buddhist"]
    };

    const container = document.getElementById('configDisplay');
    const categorySelect = document.getElementById('setupCategory');
    const classExtraFields = document.getElementById('classExtraFields');

    // ==========================================
    // 1. DATA LOADING AND SYNCING
    // ==========================================
    function loadMasterData() {
        container.innerHTML = '<p>Syncing Setup with Database... ⏳</p>';
        fetch(scriptURL)
            .then(res => res.json())
            .then(res => {
                if(res.status === "Success" && res.setup) {
                    masterData = res.setup; 
                    localStorage.setItem('erp_master_setup', JSON.stringify(masterData)); 
                }
                renderDisplay();
            })
            .catch(() => {
                container.innerHTML = '<p style="color:red;">API Error. Using cached data.</p>';
                const cached = localStorage.getItem('erp_master_setup');
                if(cached) masterData = JSON.parse(cached);
                renderDisplay();
            });
    }

    function syncMasterDataToDB() {
        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: "saveSetup", data: masterData })
        }).then(() => {
            localStorage.setItem('erp_master_setup', JSON.stringify(masterData));
            renderDisplay();
        });
    }

    categorySelect.addEventListener('change', (e) => {
        if(e.target.value === 'classes') classExtraFields.style.display = 'block';
        else classExtraFields.style.display = 'none';
    });

    // ==========================================
    // 2. SINGLE ADD LOGIC (Left Form - Fixed Panel)
    // ==========================================
    document.getElementById('masterSetupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const cat = categorySelect.value;
        const val = document.getElementById('setupValue').value.trim();
        
        // Backward compatibility preservation
        const editIndex = document.getElementById('editSetupIndex').value;
        const editCategory = document.getElementById('editSetupCategory').value;

        let newItem;
        if (cat === 'classes') {
            const sec = document.getElementById('setupSection').value.trim();
            const fee = document.getElementById('setupFee').value || 0;
            newItem = { name: val, section: sec, fee: fee };
        } else {
            newItem = val;
        }

        if (editIndex !== "-1") {
            // Old Edit logic preserved just in case
            if (editCategory === cat) masterData[cat][editIndex] = newItem;
            else { masterData[editCategory].splice(editIndex, 1); masterData[cat].push(newItem); }
        } else {
            // Standard Add from Left Panel
            if (cat !== 'classes' && masterData[cat].includes(val)) {
                alert("This value already exists in the selected category.");
                return;
            }
            masterData[cat].push(newItem);
        }

        syncMasterDataToDB();
        document.getElementById('masterSetupForm').reset();
        classExtraFields.style.display = 'block'; 
        categorySelect.value = 'classes';
        
        // Ensure button says Save Entry for left panel
        document.getElementById('btnSaveEntry').innerText = "Save Entry";
        alert('Entry Added & Syncing with DB...');
    });

    // ==========================================
    // 3. CENTER MODAL LOGIC (BULK EDIT/ADD/DEL)
    // ==========================================
    let currentModalCategory = "";
    let isSingleEdit = false;
    let singleEditIndex = -1;

    // Single Edit (Opens Modal instead of top form)
    window.editItem = function(category, index) {
        currentModalCategory = category;
        isSingleEdit = true;
        singleEditIndex = index;
        openCenterModal();
    }

    // Bulk Edit/Delete (Opens Modal with ALL items)
    window.bulkManage = function(category) {
        currentModalCategory = category;
        isSingleEdit = false;
        singleEditIndex = -1;
        openCenterModal();
    }

    // Single Delete (Preserved logic)
    window.deleteItem = function(category, index) {
        if(confirm("Are you sure you want to delete this entry from Database?")) {
            masterData[category].splice(index, 1);
            syncMasterDataToDB();
            renderDisplay(); 
        }
    }

    // Function to construct and show the Modal (Removed Comma Box, Added Proper Inputs)
    function openCenterModal() {
        const body = document.getElementById('modalBodyContent');
        body.innerHTML = '';
        
        let titleName = currentModalCategory.toUpperCase();
        document.getElementById('modalTitle').innerText = isSingleEdit ? `Edit ${titleName}` : `Bulk Manage ${titleName}`;

        let itemsToShow = isSingleEdit ? [masterData[currentModalCategory][singleEditIndex]] : masterData[currentModalCategory];

        let html = '<div class="bulk-list">';
        
        // Generate Existing Rows dynamically
        if (currentModalCategory === 'classes') {
            itemsToShow.forEach((item, i) => {
                html += `
                <div class="bulk-row">
                    <input type="text" class="bulk-cls-name" value="${item.name}" placeholder="Class Name">
                    <input type="text" class="bulk-cls-sec" value="${item.section}" placeholder="Section">
                    <input type="number" class="bulk-cls-fee" value="${item.fee}" placeholder="Monthly Fee">
                    ${!isSingleEdit ? '<label class="bulk-check-label"><input type="checkbox" class="bulk-del"> Delete</label>' : ''}
                </div>`;
            });
        } else {
            itemsToShow.forEach((item, i) => {
                html += `
                <div class="bulk-row">
                    <input type="text" class="bulk-val" value="${item}" placeholder="Value Name">
                    ${!isSingleEdit ? '<label class="bulk-check-label"><input type="checkbox" class="bulk-del"> Delete</label>' : ''}
                </div>`;
            });
        }
        html += '</div>';

        // Add Bulk ADD Form Fields at the bottom (Only in Bulk Manage mode)
        if (!isSingleEdit) {
            html += `
            <div style="margin-top: 25px; border-top: 2px dashed #ddd; padding-top: 15px;">
                <h4 style="margin-bottom:10px; color:#2c3e50;">Add New Entry to List</h4>
                <div class="bulk-add-new-row" style="display:flex; gap:10px; align-items:center;">
            `;
            if (currentModalCategory === 'classes') {
                html += `
                    <input type="text" id="newBulkClassName" placeholder="Class Name" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <input type="text" id="newBulkClassSec" placeholder="Section" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <input type="number" id="newBulkClassFee" placeholder="Monthly Fee" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                `;
            } else {
                html += `
                    <input type="text" id="newBulkValue" placeholder="Enter New Value" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;">
                `;
            }
            html += `
                    <button type="button" class="btn-save" id="btnAddNewToBulk" style="width:auto; padding:8px 15px; background-color:#3498db;">Add to List</button>
                </div>
            </div>`;
        }

        body.innerHTML = html;
        
        // Dynamic Button Text Logic based on context
        document.getElementById('btnSaveModal').innerText = isSingleEdit ? "Update Entry" : "Update All Changes";

        // Show Modal
        document.getElementById('setupModal').classList.add('active');

        // Attach event listener for the new "Add to List" button (Inside Modal)
        if (!isSingleEdit) {
            document.getElementById('btnAddNewToBulk').addEventListener('click', function() {
                let list = document.querySelector('.bulk-list');
                
                if (currentModalCategory === 'classes') {
                    let n = document.getElementById('newBulkClassName').value.trim();
                    let s = document.getElementById('newBulkClassSec').value.trim();
                    let f = document.getElementById('newBulkClassFee').value.trim();
                    
                    if(!n) { alert("Class Name is required"); return; }
                    
                    list.insertAdjacentHTML('beforeend', `
                        <div class="bulk-row new-added-row">
                            <input type="text" class="bulk-cls-name" value="${n}" placeholder="Class Name">
                            <input type="text" class="bulk-cls-sec" value="${s}" placeholder="Section">
                            <input type="number" class="bulk-cls-fee" value="${f}" placeholder="Monthly Fee">
                            <label class="bulk-check-label"><input type="checkbox" class="bulk-del"> Delete</label>
                        </div>
                    `);
                    // Clear inputs after appending
                    document.getElementById('newBulkClassName').value = '';
                    document.getElementById('newBulkClassSec').value = '';
                    document.getElementById('newBulkClassFee').value = '';
                } else {
                    let v = document.getElementById('newBulkValue').value.trim();
                    if(!v) { alert("Value is required"); return; }
                    
                    list.insertAdjacentHTML('beforeend', `
                        <div class="bulk-row new-added-row">
                            <input type="text" class="bulk-val" value="${v}" placeholder="Value Name">
                            <label class="bulk-check-label"><input type="checkbox" class="bulk-del"> Delete</label>
                        </div>
                    `);
                    // Clear input after appending
                    document.getElementById('newBulkValue').value = '';
                }
            });
        }
    }

    // Modal Action Buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    
    function closeModal() {
        document.getElementById('setupModal').classList.remove('active');
    }

    // Update / Save Changes from Modal
    document.getElementById('btnSaveModal').addEventListener('click', function() {
        const cat = currentModalCategory;
        const rows = document.querySelectorAll('.bulk-row');
        
        if (isSingleEdit) {
            // Processing Single Edit from Modal
            let row = rows[0];
            if (cat === 'classes') {
                masterData[cat][singleEditIndex] = {
                    name: row.querySelector('.bulk-cls-name').value,
                    section: row.querySelector('.bulk-cls-sec').value,
                    fee: row.querySelector('.bulk-cls-fee').value
                };
            } else {
                masterData[cat][singleEditIndex] = row.querySelector('.bulk-val').value;
            }
        } else {
            // Processing Bulk Edit/Delete/Add from Modal List
            let newArray = [];
            rows.forEach(row => {
                let isDel = row.querySelector('.bulk-del').checked;
                if (!isDel) { // Keep if NOT marked for delete
                    if (cat === 'classes') {
                        newArray.push({
                            name: row.querySelector('.bulk-cls-name').value.trim(),
                            section: row.querySelector('.bulk-cls-sec').value.trim(),
                            fee: row.querySelector('.bulk-cls-fee').value || 0
                        });
                    } else {
                        let val = row.querySelector('.bulk-val').value.trim();
                        if(val !== "") newArray.push(val);
                    }
                }
            });
            
            // Replace old array with processed new array
            masterData[cat] = newArray;
        }

        syncMasterDataToDB();
        closeModal();
        renderDisplay();
        alert("Changes Saved & Synced to Database!");
    });

    // ==========================================
    // 4. DISPLAY RENDERING
    // ==========================================
    function renderDisplay() {
        container.innerHTML = '';
        Object.keys(masterData).forEach(key => {
            
            let html = `
            <div class="config-category">
                <div class="cat-header-box">
                    <h4>${key.replace(/([A-Z])/g, ' $1')}</h4>
                    <button class="btn-bulk" onclick="bulkManage('${key}')">⚙️ Bulk Manage</button>
                </div>
                <div>`;
            
            if(key === 'classes') {
                masterData[key].forEach((c, index) => {
                    html += `<div class="config-badge">
                                ${c.name} (${c.section}) - ₹${c.fee} 
                                <div class="badge-actions">
                                    <span class="action-edit" onclick="editItem('${key}', ${index})" title="Edit">✎</span>
                                    <span class="action-delete" onclick="deleteItem('${key}', ${index})" title="Delete">x</span>
                                </div>
                             </div>`;
                });
            } else {
                masterData[key].forEach((item, index) => {
                    html += `<div class="config-badge">
                                ${item} 
                                <div class="badge-actions">
                                    <span class="action-edit" onclick="editItem('${key}', ${index})" title="Edit">✎</span>
                                    <span class="action-delete" onclick="deleteItem('${key}', ${index})" title="Delete">x</span>
                                </div>
                             </div>`;
                });
            }
            html += `</div></div>`;
            container.innerHTML += html;
        });
    }

    // Initial load call
    loadMasterData();
});