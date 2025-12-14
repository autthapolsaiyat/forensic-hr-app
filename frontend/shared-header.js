// Shared Header Component - สพฐ.ตร.
// Auto-inject header when page loads

// Theme Functions
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Load saved theme immediately
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();
// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
}

// Display username in header
function displayUsername() {
    const user = getCurrentUser();
    const userDisplay = document.getElementById("userDisplay");
    if (user && userDisplay) {
        userDisplay.textContent = user.full_name || user.username || "ผู้ใช้งาน";
    }
}


// Get current page for menu highlight
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('summary')) return 'summary';
    if (path.includes('organization')) return 'org';
    if (path.includes('search')) return 'search';
    if (path.includes('map')) return 'map';
    if (path.includes('vehicles')) return 'vehicles';
    if (path.includes('department')) return 'dept';
    return '';
}

// Render header HTML
function getHeaderHTML() {
    const activePage = getCurrentPage();
    
    const menuItems = [
        { id: 'summary', href: 'summary.html', icon: '📊', text: 'สรุป', class: 'btn-summary' },
        { id: 'org', href: 'organization.html', icon: '🏗️', text: 'โครงสร้าง', class: 'btn-org' },
        { id: 'vehicles', href: 'vehicles.html', icon: '🚗', text: 'ยานพาหนะ', class: 'btn-vehicles' },
        { id: 'search', href: 'search.html', icon: '🔍', text: 'ค้นหา', class: 'btn-search' },
        { id: 'map', href: 'map.html', icon: '🗺️', text: 'แผนที่', class: 'btn-map' },
    ];

    const menuButtons = menuItems.map(item => {
        const isActive = item.id === activePage ? 'active' : '';
        return `<a href="${item.href}" class="btn ${item.class} ${isActive}">${item.icon} <span class="btn-text">${item.text}</span></a>`;
    }).join('');

    return `
    <header class="header">
        <div class="header-left">
            <img src="logo/logo.png" alt="Logo" class="logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="logo-fallback" style="display:none;">🏛️</div>
            <div class="header-title">
                <h1>Management | 4M – สพฐ.ตร.</h1>
                <p>Dashboard</p>
            </div>
        </div>
        <div class="header-buttons">
            <button class="btn btn-theme" onclick="toggleTheme()" title="สลับธีม">🌓</button>
            <a href="intro.html" class="btn btn-back">← <span class="btn-text">กลับ</span></a>
            ${menuButtons}
            <button class="btn btn-export" onclick="typeof exportExcel === 'function' ? exportExcel() : alert('กรุณาติดต่อ พล.ต.ต. เชิดพงษ์ ชิวปรีชา
โทร 086-903-6666')">📥 <span class="btn-text">Export</span></button>
            <span class="user-info" id="userDisplay"></span>
            <button class="btn btn-danger" onclick="logout()" title="ออกจากระบบ">🚪 <span class="btn-text">Logout</span></button>
        </div>
    </header>
    `;
}

// Auto-inject header
document.addEventListener('DOMContentLoaded', function() {
    // Find existing header
    const oldHeader = document.querySelector('.header');
    if (oldHeader) {
        // Replace with new header
        oldHeader.outerHTML = getHeaderHTML();
    } else {
        // Insert at beginning of body
        document.body.insertAdjacentHTML('afterbegin', getHeaderHTML());
    }
    // Display username after header loaded
    setTimeout(displayUsername, 100);
});
