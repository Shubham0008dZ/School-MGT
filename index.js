// CUSTOM NON-NATIVE CONFIRM MODAL (NO BROWSER PROMPTS)
function customConfirm(message, onConfirm) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
        <div style="background:#fff;padding:25px;border-radius:8px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,0.3);min-width:300px;">
            <h3 style="margin-top:0;color:#2c3e50;">Confirm Action</h3>
            <p style="color:#555;margin-bottom:20px;">${message}</p>
            <div style="display:flex;justify-content:center;gap:10px;">
                <button id="cc-cancel" style="padding:8px 20px;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Cancel</button>
                <button id="cc-ok" style="padding:8px 20px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Yes, Logout</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('cc-cancel').addEventListener('click', () => {
        overlay.remove();
    });
    
    document.getElementById('cc-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
}

// ==========================================
// 0. ULTIMATE SAFEGUARD: INTERVAL SNIPER (FIXED)
// ==========================================
setInterval(() => {
    document.querySelectorAll('.module-card').forEach(card => {
        let txt = card.textContent || card.innerText || "";
        if (txt.includes("Library") || txt.includes("Employee Attendance")) {
            let isSafeToRemove = true;
            if(isSafeToRemove) {
                card.remove(); 
            }
        }
    });
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    
    // Immediate cleanup on load
    document.querySelectorAll('.module-card').forEach(card => {
        let txt = card.textContent || card.innerText || "";
        if (txt.includes("Library") || txt.includes("Employee Attendance")) {
            let safeguardCheck = true;
            if(safeguardCheck) {
                card.remove(); 
            }
        }
    });

    // ==========================================
    // 1. SECURITY CHECK: Verify Session
    // ==========================================
    const activeUserStr = localStorage.getItem('erp_active_user');
    
    if (!activeUserStr) {
        window.location.href = 'login.html';
        return; 
    }

    const activeUser = JSON.parse(activeUserStr);
    const isSA = activeUser.Is_SuperAdmin === "Yes";
    let userRights = [];
    
    try { 
        userRights = JSON.parse(activeUser.Rights_JSON || "[]"); 
    } catch(e) {
        console.error("Error parsing user rights:", e);
    }

    // ==========================================
    // 2. DYNAMIC USER NAME INJECTION
    // ==========================================
    const dashHeader = document.querySelector('.dashboard-header');
    if(dashHeader) {
        let nameBadge = document.createElement('div');
        nameBadge.style.cssText = "color:white; font-size:16px; font-weight:bold; margin-right:auto; margin-left:30px; background:#e67e22; padding:5px 15px; border-radius:4px;";
        nameBadge.innerHTML = `👤 Welcome, ${activeUser.empName}`;
        dashHeader.insertBefore(nameBadge, document.getElementById('btnLogout'));
    }

    // ==========================================
    // 3. ENFORCE RBAC ON DASHBOARD MODULE CARDS
    // ==========================================
    if (!isSA) {
        document.querySelectorAll('.module-card').forEach(card => {
            const reqMod = card.getAttribute('data-req-module');
            
            if (reqMod) {
                if (reqMod === "SUPER") {
                    card.style.display = 'none';
                } else {
                    const hasAccess = userRights.some(r => r.startsWith(reqMod + "_"));
                    if(!hasAccess) {
                        card.style.display = 'none';
                    }
                }
            }
        });
    }

    // ==========================================
    // 4. LOGOUT LOGIC (FIREBASE INTEGRATED)
    // ==========================================
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm("Are you sure you want to logout securely?", () => {
                // Firebase se logout karo
                auth.signOut().then(() => {
                    localStorage.removeItem('erp_active_user');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error("Logout error: ", error);
                    // Agar Firebase error deta hai, tab bhi local session clear karo
                    localStorage.removeItem('erp_active_user');
                    window.location.href = 'login.html';
                });
            });
        });
    }
});








// =======================================================
// ONE-CLICK FIREBASE DATABASE SETUP (TEMPORARY DEV TOOL)
// =======================================================
document.getElementById('btnSetupDatabase')?.addEventListener('click', async () => {
    
    // Check if db is properly initialized
    if (typeof db === 'undefined') {
        alert("Firebase is not initialized yet. Please wait a few seconds and try again.");
        return;
    }

    const btn = document.getElementById('btnSetupDatabase');
    btn.innerText = "⏳ Creating Database... Please Wait!";
    btn.disabled = true;
    
    const schoolCode = "VIS"; 

    try {
        console.log("Starting Firebase Database Setup...");

        // 1. SETUP
        await db.collection("setups").doc(schoolCode).set({
            classes: [
                { name: "Class 10", section: "A", fee: "2500" },
                { name: "Class 10", section: "B", fee: "2500" },
                { name: "Class 12", section: "Sci", fee: "3500" }
            ],
            bloodGroups: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
            categories: ["General", "OBC", "SC", "ST"],
            genders: ["Male", "Female", "Other"],
            houses: ["Red House", "Blue House", "Green House", "Yellow House"],
            religions: ["Hindu", "Muslim", "Sikh", "Christian", "Other"],
            salutations: ["Mr. (Male)", "Mrs. (Female)", "Ms. (Female)", "Dr. (Male)"],
            feeHeads: [
                { Head_Name: "Monthly Tuition Fee", Frequency: "Monthly", Amount: "2500" },
                { Head_Name: "Annual Charges", Frequency: "Annually", Amount: "5000" },
                { Head_Name: "Computer Fee", Frequency: "Monthly", Amount: "300" }
            ]
        }, { merge: true });

        // 2. STUDENT
        await db.collection("students").doc(`${schoolCode}_VIS-STU-001`).set({
            schoolCode: schoolCode,
            regNo: "VIS/STU/001",
            rollNo: "1",
            portalId: "visstu001",
            password: "password123",
            pin: "1234",
            studentFirstName: "Rahul",
            studentLastName: "Sharma",
            studentClass: "Class 10 (A)",
            gender: "Male",
            bloodGroup: "B+",
            category: "General",
            fatherName: "Rajesh Sharma",
            motherName: "Sita Sharma",
            mobile: "9876543210",
            primaryEmail: "rahul@test.com",
            Status: "Active"
        }, { merge: true });

        // 3. EMPLOYEE
        await db.collection("employees").doc(`${schoolCode}_VIS-EMP-001`).set({
            schoolCode: schoolCode,
            empId: "VIS/EMP/001",
            empName: "Amit Kumar",
            empDept: "Teaching",
            empDesig: "TGT Math",
            empMobile: "9988776655",
            empType: "Permanent",
            Status: "Active"
        }, { merge: true });

        // 4. FEE RECEIPT
        let dummyPaidHeads = [
            { head: "Monthly Tuition Fee", period: "Apr, 26", paid: "2500" },
            { head: "Annual Charges", period: "Annually", paid: "5000" }
        ];
        
        await db.collection("fee_receipts").doc(`${schoolCode}_2026-27-1`).set({
            schoolCode: schoolCode,
            Receipt_No: "2026-27/1",
            Reg_No: "VIS/STU/001",
            Student_Name: "Rahul Sharma",
            Class_Section: "Class 10 (A)",
            Installment: "Apr, 26",
            Amount: "7500",
            Payment_Mode: "Cash",
            Date: "05-04-2026",
            Bank_Name: "-",
            Ref_No: "-",
            Paid_Heads: JSON.stringify(dummyPaidHeads),
            Timestamp: new Date().toISOString()
        }, { merge: true });

        // 5. ASSIGNMENT (HW)
        await db.collection("assignments").doc(`${schoolCode}_HW-001`).set({
            schoolCode: schoolCode,
            Type: "Homework",
            Name: "Maths Trigonometry Setup",
            Subject: "Maths",
            Description: "Complete exercise 8.1 and 8.2 from NCERT.",
            Class: "Class 10 (A)",
            Target_Students: '["All"]',
            Date: "10-04-2026",
            Submission_Required: "Yes",
            Timestamp: new Date().toISOString()
        }, { merge: true });

        // 6. EVENT (Notice)
        await db.collection("events").doc(`${schoolCode}_EVT-001`).set({
            schoolCode: schoolCode,
            Title: "Welcome to New Session",
            Description: "Welcome all students to the academic year 2026-27. Please check your timetable.",
            Date: "01-04-2026",
            Is_Holiday: "No",
            Audience: "Students",
            Target_Class: "All"
        }, { merge: true });

        btn.innerText = "✅ DATABASE CREATED SUCCESSFULLY!";
        btn.style.background = "#27ae60";
        alert("Boom! All Collections & Dummy Data created perfectly in Firebase! Now you can test SIS, Fees, and Dashboard.");

    } catch (error) {
        console.error("Firebase Setup Error:", error);
        btn.innerText = "❌ ERROR (Check Console)";
        btn.style.background = "#e74c3c";
        alert("Error occurred: " + error.message);
    }
});
