document.addEventListener('DOMContentLoaded', () => {
    // 1. SECURITY CHECK: Ensure user is logged in
    const activeUser = localStorage.getItem('erp_active_user');
    if (!activeUser) {
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // 2. LOGOUT LOGIC
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem('erp_active_user');
                window.location.href = 'login.html';
            }
        });
    }
});