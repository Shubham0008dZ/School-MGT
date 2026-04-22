document.addEventListener('DOMContentLoaded', () => {
    // API URL - KEEP YOUR DEPLOYMENT URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyDv3nOs6E9OQOSXBywbYHJPpl_V8frIegpSmTCZFRlsh1xis6iS-SMZxEWxIqJ6s-aEw/exec';
    
    const loginView = document.getElementById('loginView');
    const setupView = document.getElementById('setupView');
    const loginForm = document.getElementById('loginForm');
    const setupForm = document.getElementById('setupForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');

    // CHECK URL FOR SETUP LINK
    const urlParams = new URLSearchParams(window.location.search);
    const isSetup = urlParams.get('setup') === 'true';
    const targetUid = urlParams.get('uid');

    if (isSetup && targetUid) {
        loginView.style.display = 'none';
        setupView.style.display = 'block';
        document.getElementById('setupUserId').value = targetUid;
        localStorage.removeItem('erp_active_user'); // Clear any existing session
    } else {
        // Normal Login Mode: Check if already logged in
        if (localStorage.getItem('erp_active_user')) {
            window.location.href = 'index.html';
        }
    }

    // ==========================================
    // LOGIN LOGIC
    // ==========================================
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value.trim();
        if(!userId || !password) return;

        errorBox.style.display = 'none'; successBox.style.display = 'none';
        const btnLogin = document.getElementById('btnLogin');
        let originalText = btnLogin.innerText;
        btnLogin.innerText = 'Authenticating...';
        btnLogin.disabled = true;

        fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ action: "login", userId: userId, password: password })
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
    // SET NEW PASSWORD LOGIC
    // ==========================================
    setupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPass = document.getElementById('newPassword').value.trim();
        const confPass = document.getElementById('confirmPassword').value.trim();
        
        errorBox.style.display = 'none'; successBox.style.display = 'none';

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
            body: JSON.stringify({ action: "setNewPassword", loginId: targetUid, newPassword: newPass })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === "Success") {
                successBox.innerText = data.message;
                successBox.style.display = 'block';
                // Switch back to login view after success
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
