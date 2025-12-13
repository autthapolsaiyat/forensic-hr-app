// Shared Header Component - สพฐ.ตร.

function renderHeader(activePage) {
    const pages = [
        { id: 'summary', href: 'summary.html', icon: '📊', text: 'สรุป', class: 'btn-summary' },
        { id: 'org', href: 'organization.html', icon: '🏗️', text: 'โครงสร้าง', class: 'btn-org' },
        { id: 'search', href: 'search.html', icon: '🔍', text: 'ค้นหา', class: 'btn-search' },
        { id: 'map', href: 'map.html', icon: '🗺️', text: 'แผนที่', class: 'btn-map' },
    ];

    const menuButtons = pages.map(page => {
        const isActive = page.id === activePage ? 'active' : '';
        return `<a href="${page.href}" class="btn ${page.class} ${isActive}">${page.icon} <span class="btn-text">${page.text}</span></a>`;
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
            <a href="dashboard.html" class="btn btn-back">← <span class="btn-text">กลับ</span></a>
            ${menuButtons}
            <button class="btn btn-export" onclick="exportExcel ? exportExcel() : alert('กำลังพัฒนา...')">📥 <span class="btn-text">Export</span></button>
        </div>
    </header>
    `;
}

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
