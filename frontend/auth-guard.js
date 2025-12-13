// Auth Guard - ตรวจสอบสิทธิ์ก่อนเข้าใช้งาน

(function() {
    // หน้าที่ต้อง login ก่อน
    const protectedPages = [
        'summary.html',
        'organization.html', 
        'search.html',
        'map.html',
        'department.html',
        'intro.html'
    ];
    
    // หน้าปัจจุบัน
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // ตรวจสอบว่าเป็นหน้าที่ต้อง login หรือไม่
    const isProtected = protectedPages.some(page => currentPage.includes(page));
    
    if (isProtected) {
        // ตรวจสอบ token
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            // ยังไม่ login - redirect ไปหน้า login
            window.location.href = '/login.html';
        }
    }
})();

// Function สำหรับ logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Function ดึงข้อมูล user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Function ตรวจสอบว่า login แล้วหรือยัง
function isLoggedIn() {
    return !!localStorage.getItem('token');
}
