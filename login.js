document.addEventListener('DOMContentLoaded', () => {
    // API URL - KEEP YOUR DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    // UI Elements Selection
    const loginView = document.getElementById('loginView');
    const setupView = document.getElementById('setupView');
    const loginForm = document.getElementById('loginForm');
    const setupForm = document.getElementById('setupForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');

    // ==========================================
    // 1. CHECK URL FOR SETUP OR FORCE LOGOUT
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const isSetup = urlParams.get('setup') === 'true';
    const forceLogout = urlParams.get('force_logout') === 'true';
    const targetUid = urlParams.get('uid');

    // If email link contains force_logout, destroy any existing session immediately
    if (forceLogout) {
        localStorage.removeItem('erp_active_user');
    }

    if (isSetup && targetUid) {
        // Show setup view
        loginView.style.display = 'none';
        setupView.style.display = 'block';
        document.getElementById('setupUserId').value = targetUid;
    } else {
        // Pre-fill user ID if it's passed via URL from email
        if(targetUid) {
            document.getElementById('userId').value = targetUid;
        }

        // Normal Login Mode: Check if already logged in
        if (localStorage.getItem('erp_active_user')) {
            window.location.href = 'index.html';
        }
    }

    // ==========================================
    // 2. STANDARD LOGIN SUBMISSION LOGIC
    // ==========================================
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if(!userId || !password) return;

        errorBox.style.display = 'none'; 
        successBox.style.display = 'none';
        
        const btnLogin = document.getElementById('btnLogin');
        let originalText = btnLogin.innerText;
        btnLogin.innerText = 'Authenticating...';
        btnLogin.disabled = true;

        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "login", 
                userId: userId, 
                password: password 
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                localStorage.setItem('erp_active_user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                errorBox.innerText = data.message;
                errorBox.style.display = 'block';
                btnLogin.innerText = originalText;
                btnLogin.disabled = false;
            }
        }).catch(err => {
            errorBox.innerText = "Connection Error. Try Again.";
            errorBox.style.display = 'block';
            btnLogin.innerText = originalText;
            btnLogin.disabled = false;
        });
    });

    // ==========================================
    // 3. SET NEW PASSWORD LOGIC
    // ==========================================
    setupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPass = document.getElementById('newPassword').value.trim();
        const confPass = document.getElementById('confirmPassword').value.trim();
        
        errorBox.style.display = 'none'; 
        successBox.style.display = 'none';

        if(newPass !== confPass) {
            errorBox.innerText = "Passwords do not match!";
            errorBox.style.display = 'block';
            return;
        }

        const btnSetup = document.getElementById('btnSetup');
        let originalText = btnSetup.innerText;
        btnSetup.innerText = 'Updating...';
        btnSetup.disabled = true;

        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "setNewPassword", 
                loginId: targetUid, 
                newPassword: newPass 
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                successBox.innerText = data.message;
                successBox.style.display = 'block';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2500);
            } else {
                errorBox.innerText = data.message;
                errorBox.style.display = 'block';
                btnSetup.innerText = originalText;
                btnSetup.disabled = false;
            }
        }).catch(err => {
            errorBox.innerText = "Connection Error. Try Again.";
            errorBox.style.display = 'block';
            btnSetup.innerText = originalText;
            btnSetup.disabled = false;
        });
    });
});
