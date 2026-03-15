// State Management
let transactions = JSON.parse(localStorage.getItem('budget_transactions')) || [];
const STORAGE_KEY = 'budget_transactions';

let subscriptions = JSON.parse(localStorage.getItem('budget_subscriptions')) || [];
const STORAGE_KEY_SUBS = 'budget_subscriptions';

// DOM Elements
const views = document.querySelectorAll('.view-section');
const navItems = document.querySelectorAll('.nav-item');

// Stats Elements
const statBalance = document.getElementById('stat-balance');
const statIncome = document.getElementById('stat-income');
const statExpenses = document.getElementById('stat-expenses');
const statSavings = document.getElementById('stat-savings');

// Tables
const incomeTableBody = document.getElementById('income-table-body');
const expenseTableBody = document.getElementById('expense-table-body');
const recentTransactionsList = document.getElementById('recent-transactions-list');
const categorySummaryList = document.getElementById('category-summary-list');

// Forms
const incomeForm = document.getElementById('income-form');
const expenseForm = document.getElementById('expense-form');

// Chart Instances
let expensePieChartInstance = null;
let summaryBarChartInstance = null;

// Categories Colors
const categoryColors = {
    'Food': '#ef4444',     // Red
    'Rent': '#3b82f6',     // Blue
    'Travel': '#f59e0b',   // Orange
    'Shopping': '#ec4899', // Pink
    'Bills': '#8b5cf6',    // Purple
    'Savings': '#10b981',  // Green
    'Other': '#94a3b8'     // Gray
};

// Initialize App
function init() {
    setupNavigation();
    setupForms();
    setupTheme();
    setupProfile();
    setupBudgetPlan();
    setupFixedExpenses();
    setupFixedIncomes();
    setupFinancialBot();
    setupSubscriptions();
    document.getElementById('reset-data').addEventListener('click', resetData);

    // Restore last active section (default: dashboard)
    const hashTarget = window.location.hash ? window.location.hash.substring(1) : '';
    const savedSection = hashTarget || localStorage.getItem('budget_active_section') || 'dashboard';
    navigateTo(savedSection, false); // false = don't update hash if already set

    updateUI();
}

// Theme Toggle
function setupTheme() {
    const THEME_KEY = 'budget_theme';
    const body = document.body;
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = toggleBtn.querySelector('i');

    // Apply saved theme
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);

    toggleBtn.addEventListener('click', () => {
        const current = body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        // Re-render charts to adopt correct label colors
        setTimeout(renderCharts, 50);
    });

    function applyTheme(theme) {
        if (theme === 'light') {
            body.setAttribute('data-theme', 'light');
            icon.className = 'fa-solid fa-sun';
        } else {
            body.removeAttribute('data-theme');
            icon.className = 'fa-solid fa-moon';
        }
        // Update Chart.js default label color
        Chart.defaults.color = theme === 'light' ? '#64748b' : '#94a3b8';
    }
}

// ── Navigation helper (used by clickable stat cards & avatar) ──
const NAV_SECTION_KEY = 'budget_active_section';

function navigateTo(targetId, updateHash = true) {
    // Persist so refresh restores the same section
    localStorage.setItem(NAV_SECTION_KEY, targetId);

    // Update the hash so the back button stays inside the app
    if (updateHash && window.location.hash !== '#' + targetId) {
        window.location.hash = targetId;
    }

    // Update nav highlight
    navItems.forEach(nav => nav.classList.remove('active'));
    const navLink = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (navLink) navLink.classList.add('active');

    // Switch views
    views.forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add('active');

    // Update header title
    const titles = { dashboard: 'Overview', income: 'Income Management', expenses: 'Expense Tracking', summary: 'Monthly Summary', profile: 'My Profile', 'budget-plan': 'Smart Budget Plan', subscriptions: 'Subscriptions' };
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = titles[targetId] || '';

    // Re-render charts if navigating to chart pages
    if (targetId === 'dashboard' || targetId === 'summary') {
        setTimeout(renderCharts, 100);
    }
    if (targetId === 'budget-plan') {
        setTimeout(renderBpChart, 100);
    }
}

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const section = window.location.hash ? window.location.hash.substring(1) : 'dashboard';
    navigateTo(section, false); // false = don't push another history entry
});

// ── Profile Management ─────────────────────────────────────────
const PROFILE_KEY = 'budget_profile';

function setupProfile() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    // Load saved profile
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    if (saved.firstName) document.getElementById('profile-first-name').value = saved.firstName;
    if (saved.lastName) document.getElementById('profile-last-name').value = saved.lastName;
    if (saved.email) document.getElementById('profile-email').value = saved.email;
    if (saved.phone) document.getElementById('profile-phone').value = saved.phone;
    if (saved.currency) document.getElementById('profile-currency').value = saved.currency;

    // Apply to UI right away
    applyProfileToUI(saved);

    // Save on submit
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const profile = {
            firstName: document.getElementById('profile-first-name').value.trim(),
            lastName: document.getElementById('profile-last-name').value.trim(),
            email: document.getElementById('profile-email').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(),
            currency: document.getElementById('profile-currency').value
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        applyProfileToUI(profile);

        // Show toast
        const toast = document.getElementById('profile-save-toast');
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    });
}

function applyProfileToUI(profile) {
    const first = profile.firstName || '';
    const last = profile.lastName || '';
    const fullName = [first, last].filter(Boolean).join(' ') || 'User';
    const initials = ([first[0], last[0]].filter(Boolean).join('') || 'U').toUpperCase();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=4F46E5&color=fff`;
    const avatarUrlBig = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=4F46E5&color=fff&size=128`;

    // Header avatar & greeting
    const avatarImg = document.getElementById('avatar-img');
    if (avatarImg) avatarImg.src = avatarUrl;
    const greeting = document.getElementById('header-greeting');
    if (greeting) greeting.textContent = fullName !== 'User' ? `Welcome back, ${first || fullName}! 👋` : '';

    // Profile page card
    const bigAvatar = document.getElementById('profile-avatar-big');
    if (bigAvatar) bigAvatar.src = avatarUrlBig;
    const displayName = document.getElementById('profile-display-name');
    if (displayName) displayName.textContent = fullName;
    const displayEmail = document.getElementById('profile-display-email');
    if (displayEmail) displayEmail.textContent = profile.email || '—';
}

function updateProfileStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const psIncome = document.getElementById('ps-income');
    const psExpenses = document.getElementById('ps-expenses');
    const psBalance = document.getElementById('ps-balance');
    if (psIncome) psIncome.textContent = formatCurrency(income);
    if (psExpenses) psExpenses.textContent = formatCurrency(expenses);
    if (psBalance) psBalance.textContent = formatCurrency(balance);
}

// Navigation
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            navigateTo(targetId);
        });
    });
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    if (modalId === 'income-modal') {
        document.getElementById('income-date').value = today;
    } else if (modalId === 'expense-modal') {
        document.getElementById('expense-date').value = today;
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');

    // Reset form
    if (modalId === 'income-modal') {
        incomeForm.reset();
        document.getElementById('income-id').value = '';
        document.getElementById('income-modal-title').textContent = 'Add Income';
    } else if (modalId === 'expense-modal') {
        expenseForm.reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-modal-title').textContent = 'Add Expense';
    }
}

// Setup Forms
function setupForms() {
    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('income');
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction('expense');
    });
}

// CRUD Operations
function saveTransaction(type) {
    const isEdit = document.getElementById(`${type}-id`).value !== '';
    const id = isEdit ? document.getElementById(`${type}-id`).value : generateId();

    const transaction = {
        id,
        type,
        description: document.getElementById(`${type}-desc`).value,
        amount: parseFloat(document.getElementById(`${type}-amount`).value),
        date: document.getElementById(`${type}-date`).value,
        category: document.getElementById(`${type}-category`).value
    };

    if (isEdit) {
        transactions = transactions.map(t => t.id === id ? transaction : t);
    } else {
        transactions.push(transaction);
        // Sort transactions by date descending
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Save to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

    // Update UI and Close Modal
    updateUI();
    closeModal(`${type}-modal`);
}

function editTransaction(id, type) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Populate form
    document.getElementById(`${type}-id`).value = transaction.id;
    document.getElementById(`${type}-desc`).value = transaction.description;
    document.getElementById(`${type}-amount`).value = transaction.amount;
    document.getElementById(`${type}-date`).value = transaction.date;
    document.getElementById(`${type}-category`).value = transaction.category;

    document.getElementById(`${type}-modal-title`).textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    openModal(`${type}-modal`);
}

function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this specific entry?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        updateUI();
    }
}

function resetData() {
    if (confirm('Are you absolutely sure you want to delete all data? This cannot be undone.')) {
        // Clear all app data from localStorage
        transactions = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        localStorage.removeItem(FIXED_EXP_KEY);
        localStorage.removeItem(FIXED_INC_KEY);
        localStorage.removeItem(BP_STORAGE_KEY);
        localStorage.removeItem(PROFILE_KEY);
        
        subscriptions = [];
        localStorage.removeItem(STORAGE_KEY_SUBS);
        
        // Also clear any other local storage items apart from theme or bot api key
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('budget_') && key !== 'budget_theme' && key !== 'budget_bot_apikey') {
                localStorage.removeItem(key);
            }
        });
        
        // Ensure browser hard reload to wipe memory variables
        window.location.hash = 'dashboard';
        window.location.reload();
    }
}

// Utilities
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

// Update UI
function updateUI() {
    updateStats();
    renderTables();
    renderRecentTransactions();
    renderCategorySummary();
    renderCharts();
    updateProfileStats();
    checkOverspending();
    renderMonthlyOverview();
    checkFixedExpensePrompt();
    checkFixedIncomePrompt();
    if (typeof renderSubscriptions === 'function') renderSubscriptions();
    if (typeof checkSubscriptionReminders === 'function') checkSubscriptionReminders();
}

// ── Monthly Income & Expenses Overview ──────────────────────────
function renderMonthlyOverview() {
    const container = document.getElementById('monthly-overview-container');
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:2rem">No transaction data yet</div>`;
        return;
    }

    // Build month map: key = 'YYYY-MM'
    const map = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[key]) map[key] = { income: 0, expenses: 0 };
        if (t.type === 'income') map[key].income += t.amount;
        else map[key].expenses += t.amount;
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sortedKeys = Object.keys(map).sort((a, b) => b.localeCompare(a)); // newest first

    const rows = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        const label = new Date(+year, +month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const { income, expenses } = map[key];
        const net = income - expenses;
        const pct = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : (expenses > 0 ? 100 : 0);
        const isCurrent = key === currentKey;
        const netClass = net >= 0 ? 'mo-net-pos' : 'mo-net-neg';
        const barClass = pct >= 90 ? 'mo-bar-danger' : pct >= 70 ? 'mo-bar-warn' : 'mo-bar-ok';

        return `
        <div class="mo-row ${isCurrent ? 'mo-row-current' : ''}">
            <div class="mo-month">
                ${isCurrent ? '<span class="mo-current-badge">This Month</span>' : ''}
                <span class="mo-month-name">${label}</span>
            </div>
            <div class="mo-income">
                <span class="mo-label">Income</span>
                <span class="mo-val mo-inc-val">+${formatCurrency(income)}</span>
            </div>
            <div class="mo-expenses">
                <span class="mo-label">Expenses</span>
                <span class="mo-val mo-exp-val">-${formatCurrency(expenses)}</span>
            </div>
            <div class="mo-net">
                <span class="mo-label">Net</span>
                <span class="mo-val ${netClass}">${net >= 0 ? '+' : ''}${formatCurrency(net)}</span>
            </div>
            <div class="mo-bar-col">
                <div class="mo-bar-track">
                    <div class="mo-bar-fill ${barClass}" style="width:${pct}%"></div>
                </div>
                <span class="mo-bar-pct">${pct}% spent</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="mo-list">${rows}</div>`;
}

function updateStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    // Considering 'Savings' category in expenses as actual savings
    const explicitSavings = transactions
        .filter(t => t.type === 'expense' && t.category === 'Savings')
        .reduce((sum, t) => sum + t.amount, 0);

    // Real expenses don't include explicit savings transfers
    const trueExpenses = expenses - explicitSavings;
    const balance = income - expenses; // Remaining balance

    statIncome.textContent = formatCurrency(income);
    statExpenses.textContent = formatCurrency(trueExpenses);
    statBalance.textContent = formatCurrency(balance);
    statSavings.textContent = formatCurrency(explicitSavings);
}

// ── Overspending Alert ────────────────────────────────────────
function checkOverspending() {
    const alertEl = document.getElementById('overspend-alert');
    const msgEl = document.getElementById('overspend-message');
    if (!alertEl || !msgEl) return;

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    if (transactions.length === 0) {
        alertEl.style.display = 'none';
        return;
    }

    if (expenses > income) {
        const over = formatCurrency(expenses - income);
        msgEl.textContent = `You have overspent by ${over}. Review your expenses to get back on track.`;
        alertEl.style.display = 'block';
        // Re-trigger animation each time it appears
        alertEl.style.animation = 'none';
        requestAnimationFrame(() => { alertEl.style.animation = ''; });
    } else if (income > 0 && expenses / income >= 0.9) {
        const pct = ((expenses / income) * 100).toFixed(1);
        msgEl.textContent = `Warning: You've used ${pct}% of your income. You're close to your limit!`;
        alertEl.style.display = 'block';
        alertEl.style.animation = 'none';
        requestAnimationFrame(() => { alertEl.style.animation = ''; });
    } else {
        alertEl.style.display = 'none';
    }
}

// ── Export PDF ────────────────────────────────────────────────
function exportPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { alert('PDF library not loaded. Please check your internet connection.'); return; }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const profile = JSON.parse(localStorage.getItem('budget_profile')) || {};
    const userName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';
    const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 595, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FinSavvy — Monthly Report', 40, 38);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated for: ${userName}   |   Date: ${now}`, 40, 52);

    // Summary stats
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 40, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Income:    ${formatCurrency(income)}`, 40, 102);
    doc.text(`Total Expenses:  ${formatCurrency(expenses)}`, 40, 116);
    doc.text(`Remaining Balance: ${formatCurrency(balance)}`, 40, 130);

    // Transactions table
    const rows = transactions.map(t => [
        formatDate(t.date),
        t.description,
        t.category,
        t.type === 'income' ? 'Income' : 'Expense',
        (t.type === 'income' ? '+' : '-') + formatCurrency(t.amount)
    ]);

    doc.autoTable({
        startY: 150,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 40, right: 40 }
    });

    doc.save(`FinSavvy_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Export Excel ──────────────────────────────────────────────
function exportExcel() {
    if (!window.XLSX) { alert('Excel library not loaded. Please check your internet connection.'); return; }

    const profile = JSON.parse(localStorage.getItem('budget_profile')) || {};
    const userName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: All Transactions
    const txData = [
        ['Date', 'Description', 'Category', 'Type', 'Amount (₹)'],
        ...transactions.map(t => [
            formatDate(t.date),
            t.description,
            t.category,
            t.type === 'income' ? 'Income' : 'Expense',
            t.type === 'income' ? t.amount : -t.amount
        ])
    ];
    const txSheet = XLSX.utils.aoa_to_sheet(txData);
    txSheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

    // ── Sheet 2: Summary
    const summaryData = [
        ['FinSavvy — Monthly Summary'],
        ['Generated for', userName],
        ['Date', new Date().toLocaleDateString('en-IN')],
        [],
        ['Metric', 'Amount (₹)'],
        ['Total Income', income],
        ['Total Expenses', expenses],
        ['Balance', income - expenses],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    XLSX.writeFile(wb, `FinSavvy_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function renderTables() {
    const incomes = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    // ── Render Income (Month-wise grouped) ────────────────────────
    if (incomes.length === 0) {
        incomeTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No income entries found.</td></tr>`;
    } else {
        // Group by YYYY-MM key, sorted most-recent first
        const groups = {};
        incomes.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)); // newest first
        let html = '';

        sortedKeys.forEach((key, groupIdx) => {
            const [year, month] = key.split('-');
            const monthLabel = new Date(+year, +month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const groupEntries = groups[key];
            const monthTotal = groupEntries.reduce((s, t) => s + t.amount, 0);
            const rowCount = groupEntries.length;
            const groupId = `income-group-${key}`;

            // Month header row (clickable toggle)
            html += `
            <tr class="month-group-header" onclick="toggleMonthGroup('${groupId}')" title="Click to expand/collapse ${monthLabel}">
                <td colspan="5">
                    <div class="month-group-header-inner">
                        <div class="month-group-left">
                            <span class="month-group-toggle" id="${groupId}-icon"><i class="fa-solid fa-chevron-down"></i></span>
                            <span class="month-group-name">
                                <i class="fa-solid fa-calendar-days"></i>
                                ${monthLabel}
                            </span>
                            <span class="month-group-count">${rowCount} ${rowCount === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        <div class="month-group-total">
                            <span class="month-total-label">Month Total</span>
                            <span class="month-total-value">+${formatCurrency(monthTotal)}</span>
                        </div>
                    </div>
                </td>
            </tr>`;

            // Data rows for this month
            groupEntries.forEach(t => {
                const isFixed = t.fromFixed ? `<span class="fixed-pin-badge inc-pin-badge" title="Generated from Fixed Income"><i class="fa-solid fa-thumbtack"></i> Fixed</span>` : '';
                html += `
                <tr class="month-group-row" data-group="${groupId}">
                    <td>${formatDate(t.date)}</td>
                    <td>${t.description}${isFixed}</td>
                    <td><span class="tag">${t.category}</span></td>
                    <td class="amount-positive">+${formatCurrency(t.amount)}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-pin-inc" title="Mark as Fixed Income" onclick="event.stopPropagation();openFixedIncomeFromTx('${t.id}')"><i class="fa-solid fa-thumbtack"></i></button>
                        <button class="btn btn-sm btn-edit" onclick="event.stopPropagation();editTransaction('${t.id}', 'income')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteTransaction('${t.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        });

        incomeTableBody.innerHTML = html;
    }

    // ── Render Expenses (Month-wise grouped) ──────────────────────
    if (expenses.length === 0) {
        expenseTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No expense entries found.</td></tr>`;
    } else {
        const expGroups = {};
        expenses.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!expGroups[key]) expGroups[key] = [];
            expGroups[key].push(t);
        });

        const expSortedKeys = Object.keys(expGroups).sort((a, b) => b.localeCompare(a));
        let expHtml = '';

        expSortedKeys.forEach(key => {
            const [year, month] = key.split('-');
            const monthLabel = new Date(+year, +month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const groupEntries = expGroups[key];
            const monthTotal = groupEntries.reduce((s, t) => s + t.amount, 0);
            const rowCount = groupEntries.length;
            const groupId = `expense-group-${key}`;

            expHtml += `
            <tr class="month-group-header exp-group-header" onclick="toggleMonthGroup('${groupId}')" title="Click to expand/collapse ${monthLabel}">
                <td colspan="5">
                    <div class="month-group-header-inner exp-header-inner">
                        <div class="month-group-left">
                            <span class="month-group-toggle" id="${groupId}-icon"><i class="fa-solid fa-chevron-down"></i></span>
                            <span class="month-group-name">
                                <i class="fa-solid fa-calendar-days"></i>
                                ${monthLabel}
                            </span>
                            <span class="month-group-count exp-count">${rowCount} ${rowCount === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        <div class="month-group-total">
                            <span class="month-total-label">Month Total</span>
                            <span class="month-total-value exp-total-value">-${formatCurrency(monthTotal)}</span>
                        </div>
                    </div>
                </td>
            </tr>`;

            groupEntries.forEach(t => {
                const isFixed = t.fromFixed ? `<span class="fixed-pin-badge" title="Generated from Fixed Expense"><i class="fa-solid fa-thumbtack"></i> Fixed</span>` : '';
                expHtml += `
                <tr class="month-group-row" data-group="${groupId}">
                    <td>${formatDate(t.date)}</td>
                    <td>${t.description}${isFixed}</td>
                    <td><span class="tag">${t.category}</span></td>
                    <td class="amount-negative">-${formatCurrency(t.amount)}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-pin" title="Mark as Fixed Expense" onclick="event.stopPropagation();openFixedFromExpense('${t.id}')"><i class="fa-solid fa-thumbtack"></i></button>
                        <button class="btn btn-sm btn-edit" onclick="event.stopPropagation();editTransaction('${t.id}', 'expense')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteTransaction('${t.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        });

        expenseTableBody.innerHTML = expHtml;
    }
}

// Toggle month group visibility
function toggleMonthGroup(groupId) {
    const rows = document.querySelectorAll(`.month-group-row[data-group="${groupId}"]`);
    const iconEl = document.getElementById(`${groupId}-icon`);
    const isHidden = rows.length > 0 && rows[0].style.display === 'none';
    rows.forEach(r => r.style.display = isHidden ? '' : 'none');
    if (iconEl) {
        iconEl.innerHTML = isHidden
            ? '<i class="fa-solid fa-chevron-down"></i>'
            : '<i class="fa-solid fa-chevron-right"></i>';
    }
}

// ══════════════════════════════════════════════════════
// FIXED EXPENSES — Recurring Templates
// ══════════════════════════════════════════════════════
const FIXED_EXP_KEY = 'budget_fixed_expenses';

function getFixedExpenses() {
    return JSON.parse(localStorage.getItem(FIXED_EXP_KEY) || '[]');
}
function saveFixedExpenses(list) {
    localStorage.setItem(FIXED_EXP_KEY, JSON.stringify(list));
}

// Open add-fixed modal (optionally pre-filled from an existing expense)
function openFixedExpenseModal(id) {
    const modal = document.getElementById('fixed-expense-modal');
    const titleEl = document.getElementById('fixed-modal-title');
    document.getElementById('fixed-exp-id').value = id || '';
    if (id) {
        const fe = getFixedExpenses().find(f => f.id === id);
        if (fe) {
            document.getElementById('fixed-exp-desc').value = fe.description;
            document.getElementById('fixed-exp-amount').value = fe.amount;
            document.getElementById('fixed-exp-category').value = fe.category;
            document.getElementById('fixed-exp-day').value = fe.dayOfMonth;
            titleEl.textContent = 'Edit Fixed Expense';
        }
    } else {
        document.getElementById('fixed-expense-form').reset();
        document.getElementById('fixed-exp-day').value = 1;
        titleEl.textContent = 'Add Fixed Expense';
    }
    modal.classList.add('active');
}

// Pre-fill fixed modal from an existing expense row
function openFixedFromExpense(txId) {
    const t = transactions.find(x => x.id === txId);
    if (!t) return;
    const modal = document.getElementById('fixed-expense-modal');
    document.getElementById('fixed-modal-title').textContent = 'Mark as Fixed Expense';
    document.getElementById('fixed-exp-id').value = '';
    document.getElementById('fixed-exp-desc').value = t.description;
    document.getElementById('fixed-exp-amount').value = t.amount;
    document.getElementById('fixed-exp-category').value = t.category;
    const day = new Date(t.date).getDate();
    document.getElementById('fixed-exp-day').value = day;
    modal.classList.add('active');
}

function closeFixedExpenseModal() {
    document.getElementById('fixed-expense-modal').classList.remove('active');
    document.getElementById('fixed-expense-form').reset();
}

function saveFixedExpense(e) {
    e.preventDefault();
    const id = document.getElementById('fixed-exp-id').value || generateId();
    const fe = {
        id,
        description: document.getElementById('fixed-exp-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-exp-amount').value),
        category: document.getElementById('fixed-exp-category').value,
        dayOfMonth: parseInt(document.getElementById('fixed-exp-day').value) || 1
    };
    let list = getFixedExpenses();
    const idx = list.findIndex(f => f.id === id);
    if (idx >= 0) list[idx] = fe; else list.push(fe);
    saveFixedExpenses(list);
    closeFixedExpenseModal();
    renderFixedExpensesPanel();
    checkFixedExpensePrompt();
}

function deleteFixedExpense(id) {
    if (!confirm('Remove this fixed expense template?')) return;
    saveFixedExpenses(getFixedExpenses().filter(f => f.id !== id));
    renderFixedExpensesPanel();
    checkFixedExpensePrompt();
}

// Apply all fixed expenses for a given YYYY-MM (skips if already applied)
function applyFixedExpensesForMonth(yearMonth) {
    const list = getFixedExpenses();
    if (list.length === 0) { alert('No fixed expenses configured yet.'); return; }

    const [year, month] = yearMonth.split('-').map(Number);
    let applied = 0;
    let skipped = 0;

    list.forEach(fe => {
        // Guard: already applied this template this month?
        // Use slice(0,7) for reliable YYYY-MM comparison (avoids any string-prefix edge cases)
        const alreadyExists = transactions.some(t =>
            t.type === 'expense' &&
            t.fromFixed === fe.id &&
            typeof t.date === 'string' &&
            t.date.slice(0, 7) === yearMonth
        );
        if (alreadyExists) { skipped++; return; }

        const day = Math.min(fe.dayOfMonth, new Date(year, month, 0).getDate()); // clamp to last day
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

        transactions.push({
            id: generateId(),
            type: 'expense',
            description: fe.description,
            amount: fe.amount,
            date: dateStr,
            category: fe.category,
            fromFixed: fe.id
        });
        applied++;
    });

    if (applied === 0 && skipped > 0) {
        showFixedToast(`All ${skipped} fixed expense${skipped > 1 ? 's' : ''} already applied for this month.`, false);
    } else if (applied === 0 && skipped === 0) {
        showFixedToast('No fixed expenses to apply.', false);
    } else {
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const skipNote = skipped > 0 ? ` (${skipped} already applied, skipped)` : '';
        showFixedToast(`✓ ${applied} fixed expense${applied > 1 ? 's' : ''} applied for ${monthLabel}.${skipNote}`, true);
        updateUI();
    }
    checkFixedExpensePrompt();
}

function showFixedToast(msg, success) {
    let toast = document.getElementById('fixed-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'fixed-toast ' + (success ? 'fixed-toast-ok' : 'fixed-toast-warn');
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// Render the fixed expenses panel inside the Expenses section
function renderFixedExpensesPanel() {
    const panel = document.getElementById('fixed-expenses-panel');
    if (!panel) return;
    const list = getFixedExpenses();

    if (list.length === 0) {
        panel.querySelector('.fixed-exp-list').innerHTML = `<div class="empty-state" style="padding:1.5rem">No fixed expenses yet. Click <strong>+ Add Fixed</strong> to create one.</div>`;
        return;
    }

    panel.querySelector('.fixed-exp-list').innerHTML = list.map(fe => `
        <div class="fixed-exp-item">
            <div class="fixed-exp-icon"><i class="fa-solid fa-thumbtack"></i></div>
            <div class="fixed-exp-details">
                <div class="fixed-exp-name">${fe.description}</div>
                <div class="fixed-exp-meta"><span class="tag">${fe.category}</span> &nbsp;·&nbsp; Day ${fe.dayOfMonth} of every month</div>
            </div>
            <div class="fixed-exp-amount">-${formatCurrency(fe.amount)}</div>
            <div class="fixed-exp-actions">
                <button class="btn btn-sm btn-edit" title="Edit" onclick="openFixedExpenseModal('${fe.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-danger" title="Delete" onclick="deleteFixedExpense('${fe.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// Show/hide the "apply fixed" prompt banner for the current month
function checkFixedExpensePrompt() {
    const banner = document.getElementById('fixed-prompt-banner');
    if (!banner) return;
    const list = getFixedExpenses();
    if (list.length === 0) { banner.style.display = 'none'; return; }

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const allApplied = list.every(fe =>
        transactions.some(t => t.type === 'expense' && t.fromFixed === fe.id && typeof t.date === 'string' && t.date.slice(0, 7) === ym)
    );

    if (allApplied) {
        banner.style.display = 'none';
    } else {
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const pending = list.filter(fe =>
            !transactions.some(t => t.type === 'expense' && t.fromFixed === fe.id && typeof t.date === 'string' && t.date.slice(0, 7) === ym)
        ).length;
        banner.querySelector('#fixed-prompt-text').textContent =
            `${pending} fixed expense${pending > 1 ? 's' : ''} not yet applied for ${monthName}.`;
        banner.dataset.ym = ym;
        banner.style.display = 'flex';
    }
}

function setupFixedExpenses() {
    const form = document.getElementById('fixed-expense-form');
    if (form) form.addEventListener('submit', saveFixedExpense);
    renderFixedExpensesPanel();
    checkFixedExpensePrompt();
}

function getCurrentYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toggleFixedPanel() {
    const list = document.querySelector('.fixed-exp-list');
    const chevron = document.getElementById('fixed-panel-chevron');
    if (!list) return;
    const isHidden = list.style.display === 'none';
    list.style.display = isHidden ? '' : 'none';
    if (chevron) chevron.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
}

// ══════════════════════════════════════════════════════
// FIXED INCOMES — Recurring Templates
// ══════════════════════════════════════════════════════
const FIXED_INC_KEY = 'budget_fixed_incomes';

function getFixedIncomes() {
    return JSON.parse(localStorage.getItem(FIXED_INC_KEY) || '[]');
}
function saveFixedIncomes(list) {
    localStorage.setItem(FIXED_INC_KEY, JSON.stringify(list));
}

function openFixedIncomeModal(id) {
    const modal = document.getElementById('fixed-income-modal');
    const titleEl = document.getElementById('fixed-income-modal-title');
    document.getElementById('fixed-inc-id').value = id || '';
    if (id) {
        const fi = getFixedIncomes().find(f => f.id === id);
        if (fi) {
            document.getElementById('fixed-inc-desc').value = fi.description;
            document.getElementById('fixed-inc-amount').value = fi.amount;
            document.getElementById('fixed-inc-category').value = fi.category;
            document.getElementById('fixed-inc-day').value = fi.dayOfMonth;
            titleEl.textContent = 'Edit Fixed Income';
        }
    } else {
        document.getElementById('fixed-income-form').reset();
        document.getElementById('fixed-inc-day').value = 1;
        titleEl.textContent = 'Add Fixed Income';
    }
    modal.classList.add('active');
}

function openFixedIncomeFromTx(txId) {
    const t = transactions.find(x => x.id === txId);
    if (!t) return;
    const modal = document.getElementById('fixed-income-modal');
    document.getElementById('fixed-income-modal-title').textContent = 'Mark as Fixed Income';
    document.getElementById('fixed-inc-id').value = '';
    document.getElementById('fixed-inc-desc').value = t.description;
    document.getElementById('fixed-inc-amount').value = t.amount;
    document.getElementById('fixed-inc-category').value = t.category;
    document.getElementById('fixed-inc-day').value = new Date(t.date).getDate();
    modal.classList.add('active');
}

function closeFixedIncomeModal() {
    document.getElementById('fixed-income-modal').classList.remove('active');
    document.getElementById('fixed-income-form').reset();
}

function saveFixedIncome(e) {
    e.preventDefault();
    const id = document.getElementById('fixed-inc-id').value || generateId();
    const fi = {
        id,
        description: document.getElementById('fixed-inc-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-inc-amount').value),
        category: document.getElementById('fixed-inc-category').value,
        dayOfMonth: parseInt(document.getElementById('fixed-inc-day').value) || 1
    };
    let list = getFixedIncomes();
    const idx = list.findIndex(f => f.id === id);
    if (idx >= 0) list[idx] = fi; else list.push(fi);
    saveFixedIncomes(list);
    closeFixedIncomeModal();
    renderFixedIncomesPanel();
    checkFixedIncomePrompt();
}

function deleteFixedIncome(id) {
    if (!confirm('Remove this fixed income template?')) return;
    saveFixedIncomes(getFixedIncomes().filter(f => f.id !== id));
    renderFixedIncomesPanel();
    checkFixedIncomePrompt();
}

function applyFixedIncomesForMonth(yearMonth) {
    const list = getFixedIncomes();
    if (list.length === 0) { alert('No fixed incomes configured yet.'); return; }

    const [year, month] = yearMonth.split('-').map(Number);
    let applied = 0;
    let skipped = 0;

    list.forEach(fi => {
        // Use slice(0,7) for reliable YYYY-MM comparison
        const alreadyExists = transactions.some(t =>
            t.type === 'income' &&
            t.fromFixed === fi.id &&
            typeof t.date === 'string' &&
            t.date.slice(0, 7) === yearMonth
        );
        if (alreadyExists) { skipped++; return; }

        const day = Math.min(fi.dayOfMonth, new Date(year, month, 0).getDate());
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;

        transactions.push({
            id: generateId(),
            type: 'income',
            description: fi.description,
            amount: fi.amount,
            date: dateStr,
            category: fi.category,
            fromFixed: fi.id
        });
        applied++;
    });

    if (applied === 0 && skipped > 0) {
        showIncomeToast(`All ${skipped} fixed income${skipped > 1 ? 's' : ''} already applied for this month.`, false);
    } else if (applied === 0 && skipped === 0) {
        showIncomeToast('No fixed incomes to apply.', false);
    } else {
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const skipNote = skipped > 0 ? ` (${skipped} already applied, skipped)` : '';
        showIncomeToast(`✓ ${applied} fixed income${applied > 1 ? 's' : ''} applied for ${monthLabel}.${skipNote}`, true);
        updateUI();
    }
    checkFixedIncomePrompt();
}

function showIncomeToast(msg, success) {
    const toast = document.getElementById('fixed-income-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'fixed-toast ' + (success ? 'fixed-toast-ok' : 'fixed-toast-warn');
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function renderFixedIncomesPanel() {
    const panel = document.getElementById('fixed-incomes-panel');
    if (!panel) return;
    const list = getFixedIncomes();

    if (list.length === 0) {
        panel.querySelector('.fixed-inc-list').innerHTML = `<div class="empty-state" style="padding:1.5rem">No fixed incomes yet. Click <strong>+ Add Fixed</strong> to create one.</div>`;
        return;
    }

    panel.querySelector('.fixed-inc-list').innerHTML = list.map(fi => `
        <div class="fixed-inc-item">
            <div class="fixed-inc-icon"><i class="fa-solid fa-thumbtack"></i></div>
            <div class="fixed-inc-details">
                <div class="fixed-inc-name">${fi.description}</div>
                <div class="fixed-inc-meta"><span class="tag">${fi.category}</span> &nbsp;·&nbsp; Day ${fi.dayOfMonth} of every month</div>
            </div>
            <div class="fixed-inc-amount">+${formatCurrency(fi.amount)}</div>
            <div class="fixed-inc-actions">
                <button class="btn btn-sm btn-edit" title="Edit" onclick="openFixedIncomeModal('${fi.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-danger" title="Delete" onclick="deleteFixedIncome('${fi.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function checkFixedIncomePrompt() {
    const banner = document.getElementById('fixed-income-prompt-banner');
    if (!banner) return;
    const list = getFixedIncomes();
    if (list.length === 0) { banner.style.display = 'none'; return; }

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const allApplied = list.every(fi =>
        transactions.some(t => t.type === 'income' && t.fromFixed === fi.id && typeof t.date === 'string' && t.date.slice(0, 7) === ym)
    );

    if (allApplied) {
        banner.style.display = 'none';
    } else {
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const pending = list.filter(fi =>
            !transactions.some(t => t.type === 'income' && t.fromFixed === fi.id && typeof t.date === 'string' && t.date.slice(0, 7) === ym)
        ).length;
        banner.querySelector('#fixed-income-prompt-text').textContent =
            `${pending} fixed income${pending > 1 ? 's' : ''} not yet applied for ${monthName}.`;
        banner.dataset.ym = ym;
        banner.style.display = 'flex';
    }
}

function toggleFixedIncomePanel() {
    const list = document.querySelector('.fixed-inc-list');
    const chevron = document.getElementById('fixed-income-panel-chevron');
    if (!list) return;
    const isHidden = list.style.display === 'none';
    list.style.display = isHidden ? '' : 'none';
    if (chevron) chevron.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
}

function setupFixedIncomes() {
    const form = document.getElementById('fixed-income-form');
    if (form) form.addEventListener('submit', saveFixedIncome);
    renderFixedIncomesPanel();
    checkFixedIncomePrompt();
}

function renderRecentTransactions() {
    const recent = transactions.slice(0, 5); // Get top 5

    if (recent.length === 0) {
        recentTransactionsList.innerHTML = `<div class="empty-state">No transactions yet</div>`;
        return;
    }

    recentTransactionsList.innerHTML = recent.map(t => {
        const isIncome = t.type === 'income';
        const iconClass = isIncome ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const itemClass = isIncome ? 'tx-income' : 'tx-expense';
        const prefix = isIncome ? '+' : '-';

        return `
            <div class="transaction-item ${itemClass}">
                <div class="tx-info">
                    <div class="tx-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="tx-details">
                        <h4>${t.description}</h4>
                        <p>${formatDate(t.date)} • ${t.category}</p>
                    </div>
                </div>
                <div class="tx-amount">${prefix}${formatCurrency(t.amount)}</div>
            </div>
        `;
    }).join('');
}

function renderCategorySummary() {
    const expensesByCategory = getExpensesByCategory();
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);

    if (totalExpenses === 0) {
        categorySummaryList.innerHTML = `<div class="empty-state">Add expenses to see category summary</div>`;
        return;
    }

    // Sort by amount descending
    const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

    categorySummaryList.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
        const color = categoryColors[category] || categoryColors['Other'];

        return `
            <div class="category-item">
                <div class="cat-header">
                    <div class="cat-name">
                        <span class="dot" style="background-color: ${color}"></span>${category}
                    </div>
                    <div>${formatCurrency(amount)} (${percentage}%)</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                </div>
            </div>
        `;
    }).join('');
}

function getExpensesByCategory() {
    const expenses = transactions.filter(t => t.type === 'expense');
    return expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});
}

// Chart Configurations
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Outfit', sans-serif";

function renderCharts() {
    const dashboardActive = document.getElementById('dashboard').classList.contains('active');
    const summaryActive = document.getElementById('summary').classList.contains('active');

    if (dashboardActive) {
        renderExpensePieChart();
    }
    if (summaryActive) {
        renderSummaryBarChart();
    }

    // Check if initial load where charts could be requested but views aren't correctly handled
    if (!dashboardActive && !summaryActive && document.querySelector('.view-section.active')?.id === 'dashboard') {
        renderExpensePieChart();
    }
}

function renderExpensePieChart() {
    const ctx = document.getElementById('expensePieChart');
    const emptyState = document.getElementById('expense-empty-state');
    if (!ctx) return;

    if (expensePieChartInstance) {
        expensePieChartInstance.destroy();
    }

    const expensesByCategory = getExpensesByCategory();
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    const colors = labels.map(label => categoryColors[label] || categoryColors['Other']);

    if (data.length === 0 || data.reduce((a, b) => a + b, 0) === 0) {
        ctx.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    ctx.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    expensePieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#f8fafc', padding: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderSummaryBarChart() {
    const ctx = document.getElementById('summaryBarChart');
    const emptyState = document.getElementById('summary-empty-state');
    if (!ctx) return;

    if (summaryBarChartInstance) {
        summaryBarChartInstance.destroy();
    }

    // Group by month
    const monthlyData = {};

    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0 };
        }

        if (t.type === 'income') {
            monthlyData[monthYear].income += t.amount;
        } else {
            monthlyData[monthYear].expense += t.amount;
        }
    });

    // If no data, show empty state
    if (Object.keys(monthlyData).length === 0) {
        ctx.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    ctx.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Sort chronologically
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
    const recentMonths = sortedMonths.slice(-6); // Show last 6 months

    const incomeData = recentMonths.map(m => monthlyData[m].income);
    const expenseData = recentMonths.map(m => monthlyData[m].expense);

    summaryBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: recentMonths,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981', // green
                    borderRadius: 6
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#ef4444', // red
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f8fafc' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: function (value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

// ══════════════════════════════════════════════════════
// BUDGET PLAN — 50/30/20 Smart Recommendation System
// ══════════════════════════════════════════════════════

let bpDonutChartInstance = null;
const BP_STORAGE_KEY = 'budget_plan_state';

function setupBudgetPlan() {
    const incomeInput = document.getElementById('bp-income-input');
    const needsSlider = document.getElementById('bp-needs-slider');
    const wantsSlider = document.getElementById('bp-wants-slider');
    const savingsSlider = document.getElementById('bp-savings-slider');
    const useActualBtn = document.getElementById('bp-use-actual-btn');
    const presetTabs = document.querySelectorAll('.bp-preset-tab');

    if (!incomeInput) return;

    // Restore saved state
    const saved = JSON.parse(localStorage.getItem(BP_STORAGE_KEY) || '{}');
    if (saved.income != null) incomeInput.value = saved.income;
    if (saved.needs != null) needsSlider.value = saved.needs;
    if (saved.wants != null) wantsSlider.value = saved.wants;
    if (saved.savings != null) savingsSlider.value = saved.savings;

    refreshPresetTabActive();
    updateBpUI();

    // Income input – live update
    incomeInput.addEventListener('input', () => { saveBpState(); updateBpUI(); });

    // "Use Actual Income" – fill from recorded transactions
    useActualBtn.addEventListener('click', () => {
        const actualIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0);
        incomeInput.value = actualIncome.toFixed(0);
        saveBpState();
        updateBpUI();
        incomeInput.style.transition = 'box-shadow 0.3s ease';
        incomeInput.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.4)';
        setTimeout(() => { incomeInput.style.boxShadow = ''; }, 800);
    });

    // Preset tabs
    presetTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            presetTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.id === 'bp-custom-tab') return; // just enable free-drag mode
            needsSlider.value = parseInt(tab.dataset.needs);
            wantsSlider.value = parseInt(tab.dataset.wants);
            savingsSlider.value = parseInt(tab.dataset.savings);
            saveBpState();
            updateBpUI();
        });
    });

    // Sliders – proportional clamping
    [needsSlider, wantsSlider, savingsSlider].forEach(slider => {
        slider.addEventListener('input', () => {
            clampOtherSliders(slider);
            saveBpState();
            updateBpUI();
            refreshPresetTabActive();
        });
    });
}

function clampOtherSliders(changedSlider) {
    const sliders = [
        document.getElementById('bp-needs-slider'),
        document.getElementById('bp-wants-slider'),
        document.getElementById('bp-savings-slider')
    ];
    const others = sliders.filter(s => s !== changedSlider);
    const newVal = parseInt(changedSlider.value);
    const remaining = 100 - newVal;

    if (remaining < 0) { changedSlider.value = 100; others.forEach(s => s.value = 0); return; }

    const otherTotal = others.reduce((s, o) => s + parseInt(o.value), 0);
    if (otherTotal === 0) {
        const half = Math.floor(remaining / 2);
        others[0].value = half;
        others[1].value = remaining - half;
    } else {
        others.forEach(s => { s.value = Math.round((parseInt(s.value) / otherTotal) * remaining); });
        // Fix rounding drift
        const allSliders = [document.getElementById('bp-needs-slider'), document.getElementById('bp-wants-slider'), document.getElementById('bp-savings-slider')];
        const drift = 100 - allSliders.reduce((s, sl) => s + parseInt(sl.value), 0);
        if (drift !== 0) {
            const largest = others.reduce((a, b) => parseInt(a.value) >= parseInt(b.value) ? a : b);
            largest.value = Math.max(0, parseInt(largest.value) + drift);
        }
    }
}

function refreshPresetTabActive() {
    const n = parseInt(document.getElementById('bp-needs-slider')?.value) || 0;
    const w = parseInt(document.getElementById('bp-wants-slider')?.value) || 0;
    const sv = parseInt(document.getElementById('bp-savings-slider')?.value) || 0;
    const presetTabs = document.querySelectorAll('.bp-preset-tab');
    let anyMatch = false;

    presetTabs.forEach(tab => {
        if (tab.id === 'bp-custom-tab') return;
        const match = parseInt(tab.dataset.needs) === n && parseInt(tab.dataset.wants) === w && parseInt(tab.dataset.savings) === sv;
        tab.classList.toggle('active', match);
        if (match) anyMatch = true;
    });

    const customTab = document.getElementById('bp-custom-tab');
    if (customTab) customTab.classList.toggle('active', !anyMatch);
}

function saveBpState() {
    localStorage.setItem(BP_STORAGE_KEY, JSON.stringify({
        income: document.getElementById('bp-income-input')?.value || 0,
        needs: document.getElementById('bp-needs-slider')?.value || 50,
        wants: document.getElementById('bp-wants-slider')?.value || 30,
        savings: document.getElementById('bp-savings-slider')?.value || 20
    }));
}

function updateBpUI() {
    const income = parseFloat(document.getElementById('bp-income-input')?.value) || 0;
    const needsPct = parseInt(document.getElementById('bp-needs-slider')?.value) || 0;
    const wantsPct = parseInt(document.getElementById('bp-wants-slider')?.value) || 0;
    const savingsPct = parseInt(document.getElementById('bp-savings-slider')?.value) || 0;
    const total = needsPct + wantsPct + savingsPct;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    // Warning
    const warning = document.getElementById('bp-pct-warning');
    if (warning) warning.style.display = total !== 100 ? 'flex' : 'none';

    // Total label
    const totalLabel = document.getElementById('bp-total-pct-label');
    if (totalLabel) totalLabel.innerHTML = `Total: <strong style="color:${total === 100 ? 'var(--success)' : 'var(--danger)'}">${total}%</strong>`;

    // Slider % labels
    setTxt('bp-needs-pct-val', `${needsPct}%`);
    setTxt('bp-wants-pct-val', `${wantsPct}%`);
    setTxt('bp-savings-pct-val', `${savingsPct}%`);

    // Amounts
    const needsAmt = income * needsPct / 100;
    const wantsAmt = income * wantsPct / 100;
    const savingsAmt = income * savingsPct / 100;

    setTxt('bp-needs-amount', fmt(needsAmt));
    setTxt('bp-wants-amount', fmt(wantsAmt));
    setTxt('bp-savings-amount', fmt(savingsAmt));

    // Cards
    setTxt('bp-needs-card-amt', fmt(needsAmt));
    setTxt('bp-wants-card-amt', fmt(wantsAmt));
    setTxt('bp-savings-card-amt', fmt(savingsAmt));

    // Card labels (dynamic %)
    const needsLbl = document.querySelector('.bp-needs-card .bp-rc-label');
    const wantsLbl = document.querySelector('.bp-wants-card .bp-rc-label');
    const savingsLbl = document.querySelector('.bp-savings-card .bp-rc-label');
    if (needsLbl) needsLbl.textContent = `Needs (${needsPct}%)`;
    if (wantsLbl) wantsLbl.textContent = `Wants (${wantsPct}%)`;
    if (savingsLbl) savingsLbl.textContent = `Savings (${savingsPct}%)`;

    // Chart center
    setTxt('bp-chart-income-label', income > 0 ? fmt(income) : '₹0');

    renderBpChart(income, needsPct, wantsPct, savingsPct);
}

function renderBpChart(income, needsPct, wantsPct, savingsPct) {
    const ctx = document.getElementById('bpDonutChart');
    if (!ctx) return;

    // Called from navigateTo with no args — read current values
    if (income === undefined) {
        income = parseFloat(document.getElementById('bp-income-input')?.value) || 0;
        needsPct = parseInt(document.getElementById('bp-needs-slider')?.value) || 50;
        wantsPct = parseInt(document.getElementById('bp-wants-slider')?.value) || 30;
        savingsPct = parseInt(document.getElementById('bp-savings-slider')?.value) || 20;
    }

    const needsAmt = income * needsPct / 100;
    const wantsAmt = income * wantsPct / 100;
    const savingsAmt = income * savingsPct / 100;

    const data = income > 0 ? [needsAmt, wantsAmt, savingsAmt] : [50, 30, 20];
    const alpha = income > 0 ? 1 : 0.25;
    const colors = [`rgba(249,115,22,${alpha})`, `rgba(59,130,246,${alpha})`, `rgba(16,185,129,${alpha})`];

    if (bpDonutChartInstance) {
        bpDonutChartInstance.data.datasets[0].data = data;
        bpDonutChartInstance.data.datasets[0].backgroundColor = colors;
        bpDonutChartInstance.update('active');
        return;
    }

    const capturedNeedsPct = needsPct;
    const capturedWantsPct = wantsPct;
    const capturedSavingsPct = savingsPct;

    bpDonutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Needs', 'Wants', 'Savings'],
            datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
                            // Read live from DOM so tooltips are always up-to-date
                            const livePcts = [
                                parseInt(document.getElementById('bp-needs-slider')?.value) || capturedNeedsPct,
                                parseInt(document.getElementById('bp-wants-slider')?.value) || capturedWantsPct,
                                parseInt(document.getElementById('bp-savings-slider')?.value) || capturedSavingsPct
                            ];
                            return ` ${context.label}: ${fmt(context.raw)} (${livePcts[context.dataIndex]}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ══════════════════════════════════════════════════════
// SPENDING PREDICTIONS — Advanced Weighted Regression
// ══════════════════════════════════════════════════════

let predictionChartInstance = null;
let predCategoryChartInstance = null;
let predMoMChartInstance = null;

// ─── Core prediction engine ───────────────────────────
// Compute a weighted linear regression forecast.
// Weights: oldest=1x, middle=2x, newest=3x (more recent = more influential)
function computeWeightedForecast(values) {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const n = values.length;
    const weights = values.map((_, i) => i + 1); // 1, 2, 3 ...
    const wSum = weights.reduce((a, b) => a + b, 0);

    // Weighted mean of x and y
    const xBar = weights.reduce((s, w, i) => s + w * i, 0) / wSum;
    const yBar = weights.reduce((s, w, i) => s + w * values[i], 0) / wSum;

    // Weighted slope
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += weights[i] * (i - xBar) * (values[i] - yBar);
        den += weights[i] * (i - xBar) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yBar - slope * xBar;
    const predicted = intercept + slope * n;
    return Math.max(0, predicted);
}

// Compute a 0-100 confidence score based on data quantity and consistency
function computeConfidence(values) {
    if (values.length === 0) return 0;
    if (values.length === 1) return 20;

    // Coefficient of variation (lower = more consistent = higher confidence)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // 0 = perfect consistency

    const dataPenalty = Math.min(values.length / 6, 1); // 6 months = full score
    const consistencyScore = Math.max(0, 1 - cv);
    return Math.round(dataPenalty * 0.5 * 100 + consistencyScore * 0.5 * 100);
}

function renderPredictions() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    const emptyEl = document.getElementById('pred-empty-state');
    const contentEl = document.getElementById('pred-content');

    if (expenses.length === 0) {
        document.getElementById('projected-total').textContent = '₹0.00';
        document.getElementById('average-spend').textContent = '₹0.00';
        document.getElementById('pred-confidence-fill').style.width = '0%';
        document.getElementById('pred-confidence-val').textContent = '0%';
        if (emptyEl) emptyEl.style.display = 'flex';
        if (contentEl) contentEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

    // ── Group expenses by YYYY-MM ──
    const monthlySpending = {};
    expenses.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySpending[key] = (monthlySpending[key] || 0) + t.amount;
    });

    const allMonthKeys = Object.keys(monthlySpending).sort();
    const historyKeys = allMonthKeys.slice(-6);  // up to last 6 months
    const historyValues = historyKeys.map(k => monthlySpending[k]);
    const last3Keys = historyKeys.slice(-3);
    const last3Values = last3Keys.map(k => monthlySpending[k]);

    // ── Compute forecast & stats ──
    const predicted = computeWeightedForecast(historyValues);
    const avg3 = last3Values.reduce((a, b) => a + b, 0) / (last3Values.length || 1);
    const confidence = computeConfidence(historyValues);

    // Trend direction from last two months
    let trendDirection = 'stable';
    let trendPct = 0;
    if (historyValues.length >= 2) {
        const prev = historyValues[historyValues.length - 2];
        const curr = historyValues[historyValues.length - 1];
        trendPct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
        if (trendPct > 3) trendDirection = 'up';
        else if (trendPct < -3) trendDirection = 'down';
    }

    // ── Update stat cards ──
    document.getElementById('projected-total').textContent = formatCurrency(predicted);
    document.getElementById('average-spend').textContent = formatCurrency(avg3);

    // Confidence bar
    const confFill = document.getElementById('pred-confidence-fill');
    const confVal = document.getElementById('pred-confidence-val');
    if (confFill) {
        confFill.style.width = confidence + '%';
        confFill.style.background = confidence >= 70 ? 'var(--gradient-green)' :
            confidence >= 40 ? 'linear-gradient(135deg,#f59e0b,#d97706)' :
                'var(--gradient-red)';
    }
    if (confVal) confVal.textContent = confidence + '%';

    // Trend badge
    const trendBadge = document.getElementById('pred-trend-badge');
    if (trendBadge) {
        const abs = Math.abs(trendPct).toFixed(1);
        if (trendDirection === 'up') {
            trendBadge.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> +${abs}% vs last month`;
            trendBadge.className = 'pred-trend-badge trend-up';
        } else if (trendDirection === 'down') {
            trendBadge.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> -${abs}% vs last month`;
            trendBadge.className = 'pred-trend-badge trend-down';
        } else {
            trendBadge.innerHTML = `<i class="fa-solid fa-minus"></i> Stable`;
            trendBadge.className = 'pred-trend-badge trend-stable';
        }
    }

    // What-if balance
    updateWhatIfBalance(predicted, income);

    // ── Render all charts ──
    renderPredictionTrendChart(historyKeys, historyValues, predicted);
    renderPredictedCategoryRadar(expenses, predicted);
    renderMoMComparisonChart(historyKeys, historyValues, predicted);
    renderPredictedCategoryList(expenses, predicted);
    renderPredictionInsights(historyValues, predicted, trendDirection, trendPct, confidence, income);
}

// ─── Chart 1: Trend Line + Forecast ───────────────────
function renderPredictionTrendChart(histKeys, histValues, predicted) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;
    if (predictionChartInstance) { predictionChartInstance.destroy(); predictionChartInstance = null; }

    // Prepare labels (nice month names) + predicted month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextLabel = nextMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const labels = histKeys.map(k => {
        const [y, m] = k.split('-');
        return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    labels.push(nextLabel + ' ✦');

    const historicalData = [...histValues, null]; // null = gap before prediction
    const predictedData = new Array(histValues.length).fill(null);
    predictedData.push(predicted);

    // Smooth trend line (rolling avg)
    const trendLineData = histValues.map((_, i, arr) => {
        const slice = arr.slice(Math.max(0, i - 1), i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
    trendLineData.push(predicted);

    predictionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Actual Spending',
                    data: historicalData,
                    backgroundColor: histValues.map((_, i) =>
                        `rgba(79,70,229,${0.45 + (i / histValues.length) * 0.4})`),
                    borderColor: 'rgba(79,70,229,1)',
                    borderWidth: 0,
                    borderRadius: 8,
                    order: 2
                },
                {
                    label: 'Predicted',
                    data: predictedData,
                    backgroundColor: 'rgba(16,185,129,0.75)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 8,
                    order: 2
                },
                {
                    label: 'Trend',
                    data: trendLineData,
                    type: 'line',
                    borderColor: 'rgba(245,158,11,0.9)',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    borderDash: [6, 3],
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(245,158,11,1)',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: Chart.defaults.color, padding: 16, boxWidth: 12, borderRadius: 4, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: c => {
                            if (c.raw === null) return null;
                            return ` ${c.dataset.label}: ${formatCurrency(c.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: { callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v), color: Chart.defaults.color }
                },
                x: { grid: { display: false }, ticks: { color: Chart.defaults.color } }
            }
        }
    });
}

// ─── Chart 2: Predicted Category Radar (or bar if few cats) ─
function renderPredictedCategoryRadar(expenses, totalPredicted) {
    const ctx = document.getElementById('predCategoryChart');
    if (!ctx) return;
    if (predCategoryChartInstance) { predCategoryChartInstance.destroy(); predCategoryChartInstance = null; }

    const catTotals = {};
    expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const totalHist = Object.values(catTotals).reduce((a, b) => a + b, 0);
    const cats = Object.keys(catTotals);
    const colors = cats.map(c => categoryColors[c] || categoryColors['Other']);
    const predAmounts = cats.map(c => totalPredicted * (catTotals[c] / totalHist));

    const useRadar = cats.length >= 3;
    predCategoryChartInstance = new Chart(ctx, {
        type: useRadar ? 'radar' : 'bar',
        data: {
            labels: cats,
            datasets: [{
                label: 'Predicted Spend',
                data: predAmounts,
                backgroundColor: useRadar ? 'rgba(79,70,229,0.25)' : colors.map(c => c + 'cc'),
                borderColor: useRadar ? 'rgba(79,70,229,0.9)' : colors,
                borderWidth: 2,
                pointBackgroundColor: colors,
                pointRadius: 4,
                borderRadius: useRadar ? undefined : 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ` ${formatCurrency(c.raw)}`
                    }
                }
            },
            scales: useRadar ? {
                r: {
                    grid: { color: 'rgba(148,163,184,0.15)' },
                    pointLabels: { color: Chart.defaults.color, font: { size: 11 } },
                    ticks: { display: false }
                }
            } : {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: { callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v), color: Chart.defaults.color }
                },
                x: { grid: { display: false }, ticks: { color: Chart.defaults.color } }
            }
        }
    });
}

// ─── Chart 3: Month-over-Month comparison bar ─────────
function renderMoMComparisonChart(histKeys, histValues, predicted) {
    const ctx = document.getElementById('predMoMChart');
    if (!ctx) return;
    if (predMoMChartInstance) { predMoMChartInstance.destroy(); predMoMChartInstance = null; }

    const now = new Date();
    const nextLabel = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const labels = [
        ...histKeys.map(k => {
            const [y, m] = k.split('-');
            return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }),
        nextLabel + ' ✦'
    ];

    const allValues = [...histValues, predicted];
    const maxVal = Math.max(...allValues);
    const colors = allValues.map((v, i) => {
        if (i === allValues.length - 1) return 'rgba(16,185,129,0.8)'; // predicted = green
        return v >= maxVal * 0.9 ? 'rgba(239,68,68,0.75)' :   // near-high = red
            v <= maxVal * 0.5 ? 'rgba(16,185,129,0.75)' :  // low = green
                'rgba(79,70,229,0.65)';                          // mid = purple
    });

    predMoMChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Spending',
                data: allValues,
                backgroundColor: colors,
                borderRadius: 10,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${formatCurrency(c.raw)}` } }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: { callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v), color: Chart.defaults.color }
                },
                y: { grid: { display: false }, ticks: { color: Chart.defaults.color } }
            }
        }
    });
}

// ─── Category list ────────────────────────────────────
function renderPredictedCategoryList(expenses, totalPredicted) {
    const catList = document.getElementById('predicted-category-list');
    if (!catList) return;

    const catTotals = {};
    expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const totalHistorical = Object.values(catTotals).reduce((a, b) => a + b, 0);
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    catList.innerHTML = sortedCats.map(([cat, amt]) => {
        const pct = amt / totalHistorical;
        const predAmt = totalPredicted * pct;
        const color = categoryColors[cat] || categoryColors['Other'];

        return `
            <div class="category-item">
                <div class="cat-header">
                    <div class="cat-name"><span class="dot" style="background-color:${color}"></span>${cat}</div>
                    <div>${formatCurrency(predAmt)} <span style="color:var(--text-muted);font-size:0.8rem">(${(pct * 100).toFixed(1)}%)</span></div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct * 100}%;background-color:${color};transition:width 0.8s ease"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Insight cards ────────────────────────────────────
function renderPredictionInsights(histValues, predicted, trendDir, trendPct, confidence, income) {
    const container = document.getElementById('pred-insight-cards');
    if (!container) return;

    const avg = histValues.reduce((a, b) => a + b, 0) / (histValues.length || 1);
    const projectedBalance = income - predicted;
    const cards = [];

    // Card 1: trend
    if (trendDir === 'up') {
        cards.push({
            icon: 'fa-arrow-trend-up', color: '#ef4444', title: 'Spending Rising',
            text: `Your spending has gone up by ${Math.abs(trendPct).toFixed(1)}% over the last month. Consider reviewing discretionary expenses.`
        });
    } else if (trendDir === 'down') {
        cards.push({
            icon: 'fa-arrow-trend-down', color: '#10b981', title: 'Spending Dropping',
            text: `Great news! Your spending is down by ${Math.abs(trendPct).toFixed(1)}% vs last month. Keep up the good habit.`
        });
    } else {
        cards.push({
            icon: 'fa-equals', color: '#3b82f6', title: 'Spending Stable',
            text: `Your spending pattern is consistent. A stable budget is a healthy budget.`
        });
    }

    // Card 2: projected balance
    if (income > 0) {
        const balClass = projectedBalance >= 0 ? '#10b981' : '#ef4444';
        const balIcon = projectedBalance >= 0 ? 'fa-piggy-bank' : 'fa-triangle-exclamation';
        cards.push({
            icon: balIcon, color: balClass,
            title: projectedBalance >= 0 ? 'Projected Savings' : 'Projected Overspend',
            text: `Based on predicted spending of ${formatCurrency(predicted)}, you are likely to have ${formatCurrency(Math.abs(projectedBalance))} ${projectedBalance >= 0 ? 'left over' : 'in deficit'} next month.`
        });
    }

    // Card 3: data confidence
    const confLabel = confidence >= 70 ? 'High' : confidence >= 40 ? 'Moderate' : 'Low';
    const confColor = confidence >= 70 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444';
    cards.push({
        icon: 'fa-circle-info', color: confColor, title: `${confLabel} Confidence (${confidence}%)`,
        text: `This forecast is based on ${histValues.length} month(s) of data. Add more transactions across multiple months for higher accuracy.`
    });

    container.innerHTML = cards.map(c => `
        <div class="pred-insight-card glass-panel">
            <div class="pred-insight-icon" style="background:${c.color}20;color:${c.color}">
                <i class="fa-solid ${c.icon}"></i>
            </div>
            <div class="pred-insight-body">
                <h4>${c.title}</h4>
                <p>${c.text}</p>
            </div>
        </div>
    `).join('');
}

// ─── What-if income slider ─────────────────────────────
function updateWhatIfBalance(predicted, actualIncome) {
    const slider = document.getElementById('whatif-income-slider');
    const valEl = document.getElementById('whatif-income-value');
    const balEl = document.getElementById('whatif-balance');
    const pctEl = document.getElementById('whatif-spend-pct');
    if (!slider || !valEl || !balEl) return;

    // Set slider bounds
    const maxIncome = Math.max(actualIncome * 2, predicted * 3, 100000);
    slider.min = 0;
    slider.max = Math.round(maxIncome);
    slider.step = Math.round(maxIncome / 200);
    if (!slider.dataset.userSet) {
        slider.value = Math.round(actualIncome || predicted * 1.5);
    }

    const refresh = () => {
        const income = parseFloat(slider.value) || 0;
        valEl.textContent = formatCurrency(income);
        const balance = income - predicted;
        balEl.textContent = formatCurrency(Math.abs(balance));
        balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
        balEl.previousElementSibling.textContent = balance >= 0 ? 'Projected Savings:' : 'Projected Deficit:';
        if (pctEl) {
            const pct = income > 0 ? Math.min((predicted / income) * 100, 999) : 0;
            pctEl.textContent = pct.toFixed(1) + '% of income spent';
            pctEl.style.color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
        }
    };

    slider.removeEventListener('input', slider._handler);
    slider._handler = () => { slider.dataset.userSet = '1'; refresh(); };
    slider.addEventListener('input', slider._handler);
    refresh();
}

// Start application
document.addEventListener('DOMContentLoaded', init);


// ══════════════════════════════════════════════════════════════════
//  AI FINANCIAL ADVISOR BOT — FinBot AI (Groq Powered)
// ══════════════════════════════════════════════════════════════════
const BOT_KEY_STORE     = 'finbot_groq_key';
const BOT_HISTORY_STORE = 'finbot_history';
const GROQ_ENDPOINT     = 'https://api.groq.com/openai/v1/chat/completions';
// Models tried in order — all free on Groq
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',   // best quality, free tier
    'llama-3.1-8b-instant',      // faster fallback
    'mixtral-8x7b-32768'         // last resort
];

// 🔑 OWNER: Replace this with your Groq API key (get free at console.groq.com)
// Once set, NO user will ever see an API key prompt — the bot opens directly.
const BOT_API_KEY = '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';

// Returns whichever key is available: hardcoded owner key takes priority
function getActiveKey(){
    if (BOT_API_KEY && !BOT_API_KEY.includes('PUT_YOUR')) return BOT_API_KEY;
    return localStorage.getItem(BOT_KEY_STORE) || '';
}

let botConversation = []; // [{role:'user'|'assistant', content: string}]
let botPanelOpen = false;

// ── Setup ──────────────────────────────────────────────────────
function setupFinancialBot() {
    // Restore conversation history
    try {
        botConversation = JSON.parse(localStorage.getItem(BOT_HISTORY_STORE) || '[]');
    } catch { botConversation = []; }
    renderStoredMessages();
    checkBotAlerts();
}

// ── Panel toggle ───────────────────────────────────────────────
function toggleBotPanel() {
    const panel = document.getElementById('bot-panel');
    botPanelOpen = !botPanelOpen;
    panel.classList.toggle('bot-panel-open', botPanelOpen);

    if (botPanelOpen) {
        const key = getActiveKey();
        if (!key) {
            showBotApiKeyScreen(true);
        } else {
            showBotApiKeyScreen(false);
            if (botConversation.length === 0) showWelcomeMessage();
        }
        setTimeout(() => document.getElementById('bot-input').focus(), 300);
    }
}

function showBotApiKeyScreen(show) {
    document.getElementById('bot-apikey-screen').style.display = show ? 'flex' : 'none';
}

function saveBotApiKey() {
    const key = document.getElementById('bot-apikey-input').value.trim();
    const errEl = document.getElementById('bot-apikey-err');
    if (!key.startsWith('gsk_')) {
        errEl.textContent = '⚠ That doesn\'t look like a valid Groq API key (should start with gsk_…)';
        errEl.style.display = 'block';
        return;
    }
    localStorage.setItem(BOT_KEY_STORE, key);
    errEl.style.display = 'none';
    showBotApiKeyScreen(false);
    showWelcomeMessage();
}

function resetBotApiKey() {
    localStorage.removeItem(BOT_KEY_STORE);
    document.getElementById('bot-apikey-input').value = '';
    document.getElementById('bot-apikey-err').style.display = 'none';
    showBotApiKeyScreen(true);
}

function showWelcomeMessage() {
    appendBotBubble('bot', `👋 **Hello! I'm FinBot AI, your personal financial advisor.**\n\nI can see your transaction data and I'm ready to help you:\n- 📊 Analyze your spending patterns\n- 🔮 Predict next month's expenses\n- 💰 Suggest smart savings strategies\n- 📈 Recommend investment options\n- 💪 Calculate your Financial Health Score\n\nTap one of the quick buttons below or just ask me anything!`);
}

// ── Send message ───────────────────────────────────────────────
function sendBotQuick(text) {
    document.getElementById('bot-input').value = text;
    sendBotMessage();
}

async function sendBotMessage() {
    const input = document.getElementById('bot-input');
    const text = input.value.trim();
    if (!text) return;

    const apiKey = getActiveKey();
    if (!apiKey) { showBotApiKeyScreen(true); return; }

    input.value = '';
    input.disabled = true;

    appendBotBubble('user', text);
    // Groq uses OpenAI format: role = 'user' | 'assistant'
    botConversation.push({ role: 'user', content: text });

    const typingId = showBotTyping();

    try {
        const reply = await callGroqAPI(apiKey, buildSystemPrompt(), botConversation);
        removeTyping(typingId);
        appendBotBubble('bot', reply);
        botConversation.push({ role: 'assistant', content: reply });
        if (botConversation.length > 40) botConversation = botConversation.slice(-40);
        localStorage.setItem(BOT_HISTORY_STORE, JSON.stringify(botConversation));
    } catch (err) {
        removeTyping(typingId);
        const isQuota = err.message.includes('rate') || err.message.includes('quota') || err.message.includes('limit');
        if (isQuota) {
            appendBotBubble('bot',
                `⏳ **Rate limit hit — please wait a moment.**\n\n` +
                `Groq free tier: 30 requests/minute, 500/day.\n` +
                `Wait 30 seconds and try again.\n\n` +
                `If you keep seeing this, click the **🔑 key icon** to re-check your key.`);
        } else {
            appendBotBubble('bot', `⚠️ **Error:** ${err.message}`);
        }
    }

    input.disabled = false;
    input.focus();
}

// ── Groq API call (OpenAI-compatible, model fallback) ─────────
async function callGroqAPI(apiKey, systemPrompt, conversation) {
    let lastError = null;
    for (const model of GROQ_MODELS) {
        try {
            const res = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversation  // already {role, content} format
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            const data = await res.json();

            if (!res.ok) {
                const msg = data?.error?.message || `HTTP ${res.status}`;
                // Skip on model not found or rate limit
                const skip = res.status === 404 || res.status === 503 ||
                             msg.includes('model') || msg.includes('not found');
                if (skip) { lastError = `[${model}] ${msg}`; continue; }
                throw new Error(msg);
            }

            return data.choices?.[0]?.message?.content || '(No response)';
        } catch (err) {
            if (err.message.includes('model') || err.message.includes('not found')) {
                lastError = err.message; continue;
            }
            throw err;
        }
    }
    throw new Error(`All Groq models failed. Last: ${lastError}`);
}

// ── Build compact system prompt (minimise token usage) ────────
function buildSystemPrompt() {
    const now = new Date();
    const cur = '₹';

    // Monthly aggregates — last 6 months only to save tokens
    const monthMap = {};
    transactions.forEach(t => {
        const d   = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!monthMap[key]) monthMap[key] = { inc: 0, exp: 0, cat: {} };
        if (t.type === 'income') { monthMap[key].inc += t.amount; }
        else { monthMap[key].exp += t.amount; monthMap[key].cat[t.category] = (monthMap[key].cat[t.category]||0) + t.amount; }
    });

    const last6  = Object.keys(monthMap).sort().slice(-6);
    const mLines = last6.map(k => {
        const { inc, exp, cat } = monthMap[k];
        const label = new Date(k+'-01').toLocaleDateString('en-US',{month:'short',year:'numeric'});
        const cats  = Object.entries(cat).map(([c,v])=>`${c[0]}:${cur}${v.toFixed(0)}`).join(',');
        return `${label}|Inc:${cur}${inc.toFixed(0)}|Exp:${cur}${exp.toFixed(0)}|Sav:${cur}${(inc-exp).toFixed(0)}|${cats}`;
    }).join('\n');

    const totInc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const totExp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const savRate = totInc>0 ? ((totInc-totExp)/totInc*100).toFixed(1) : 0;

    const catTot = {};
    transactions.filter(t=>t.type==='expense').forEach(t=>{ catTot[t.category]=(catTot[t.category]||0)+t.amount; });
    const catStr = Object.entries(catTot).map(([c,v])=>`${c}:${cur}${v.toFixed(0)}`).join(',');

    const fixE = (JSON.parse(localStorage.getItem('budget_fixed_expenses')||'[]')).map(f=>`${f.description}:${cur}${f.amount}`).join(',') || 'none';
    const fixI = (JSON.parse(localStorage.getItem('budget_fixed_incomes')||'[]')).map(f=>`${f.description}:${cur}${f.amount}`).join(',') || 'none';

    return `You are FinBot AI, a personal financial advisor for an Indian budget app. Be concise and practical.
DATE:${now.toLocaleDateString('en-IN')}
SNAPSHOT:TotalInc=${cur}${totInc.toFixed(0)},TotalExp=${cur}${totExp.toFixed(0)},Savings=${cur}${(totInc-totExp).toFixed(0)},SavingsRate=${savRate}%
CATEGORIES:${catStr||'none'}
FIXED_EXP:${fixE}
FIXED_INC:${fixI}
MONTHLY(last6):
${mLines||'no data'}
RULES:Use exact numbers. Use ${cur}. India-specific advice. Structured output with tables and bullets. Be encouraging.`;
}

// ── Financial Health Score (client-side) ──────────────────────
function computeHealthScore() {
    const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    if (totalIncome === 0) return 0;
    const savingsRate = (totalIncome - totalExpenses) / totalIncome;
    const score = Math.min(100, Math.round(
        (Math.min(savingsRate / 0.3, 1) * 40) +     // savings: 40 pts (target 30%)
        (Math.max(0, 1 - ((totalExpenses / totalIncome) - 0.5)) * 30) + // expense control: 30 pts
        20 +  // base reliability points
        10    // base investment points
    ));
    return Math.max(0, score);
}

// ── Smart alerts ───────────────────────────────────────────────
function checkBotAlerts() {
    const now = new Date();
    const ymNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthExpenses = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(ymNow))
        .reduce((s,t) => s+t.amount, 0);
    const monthIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(ymNow))
        .reduce((s,t) => s+t.amount, 0);

    if (monthIncome > 0 && monthExpenses / monthIncome > 0.9) {
        showBotAlertBanner(`⚠️ <strong>FinBot Alert:</strong> You've spent ${Math.round((monthExpenses/monthIncome)*100)}% of this month's income. Consider reducing discretionary spending.`);
    }
}

function showBotAlertBanner(html) {
    const existing = document.getElementById('finbot-alert-banner');
    if (existing) return; // Only show once
    const banner = document.createElement('div');
    banner.id = 'finbot-alert-banner';
    banner.className = 'finbot-alert-banner';
    banner.innerHTML = `<span>${html}</span><button onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
    document.querySelector('.main-content')?.prepend(banner);
}

// ── Render helpers ─────────────────────────────────────────────
function appendBotBubble(role, text) {
    const msgs = document.getElementById('bot-messages');
    const div = document.createElement('div');
    div.className = `bot-msg bot-msg-${role}`;

    if (role === 'bot') {
        div.innerHTML = `
            <div class="bot-avatar-xs"><i class="fa-solid fa-robot"></i></div>
            <div class="bot-bubble bot-bubble-bot">${markdownToHtml(text)}</div>`;
    } else {
        div.innerHTML = `<div class="bot-bubble bot-bubble-user">${escapeHtml(text)}</div>`;
    }

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function renderStoredMessages() {
    botConversation.forEach(turn => {
        const role = turn.role === 'model' ? 'bot' : 'user';
        appendBotBubble(role, turn.parts[0].text);
    });
}

function showBotTyping() {
    const msgs = document.getElementById('bot-messages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'bot-msg bot-msg-bot';
    div.id = id;
    div.innerHTML = `
        <div class="bot-avatar-xs"><i class="fa-solid fa-robot"></i></div>
        <div class="bot-bubble bot-bubble-bot bot-typing">
            <span></span><span></span><span></span>
        </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return id;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}

function clearBotChat() {
    botConversation = [];
    localStorage.removeItem(BOT_HISTORY_STORE);
    document.getElementById('bot-messages').innerHTML = '';
    showWelcomeMessage();
}

// ── Markdown → HTML converter ──────────────────────────────────
function markdownToHtml(text) {
    let html = escapeHtml(text);

    // Tables: | h1 | h2 | → <table>
    html = html.replace(/(\|[^\n]+\|\n)((?:\|[-:| ]+\|\n))((?:\|[^\n]+\|\n?)+)/g, (match) => {
        const rows = match.trim().split('\n').filter(r => r.trim());
        const headers = rows[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
        const bodyRows = rows.slice(2).map(r =>
            '<tr>' + r.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
        ).join('');
        return `<div class="bot-table-wrap"><table class="bot-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    });

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers: ## text
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    // Bullet lists: - item
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');
    // Numbered: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    if (!html.startsWith('<')) html = '<p>' + html + '</p>';

    return html;
}

// ══════════════════════════════════════════════════════
// SUBSCRIPTIONS MANAGEMENT
// ══════════════════════════════════════════════════════
function setupSubscriptions() {
    const subForm = document.getElementById('subscription-form');
    if (subForm) {
        subForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSubscription();
        });
    }
}

function saveSubscription() {
    const isEdit = document.getElementById('subscription-id').value !== '';
    const id = isEdit ? document.getElementById('subscription-id').value : generateId();

    const sub = {
        id,
        description: document.getElementById('subscription-desc').value.trim(),
        amount: parseFloat(document.getElementById('subscription-amount').value),
        category: document.getElementById('subscription-category').value,
        billingDay: parseInt(document.getElementById('subscription-day').value) || 1
    };

    if (isEdit) {
        subscriptions = subscriptions.map(s => s.id === id ? sub : s);
    } else {
        subscriptions.push(sub);
    }
    
    // sort by billing day
    subscriptions.sort((a, b) => a.billingDay - b.billingDay);
    localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(subscriptions));

    updateUI();
    closeModal('subscription-modal');
}

function editSubscription(id) {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    document.getElementById('subscription-id').value = sub.id;
    document.getElementById('subscription-desc').value = sub.description;
    document.getElementById('subscription-amount').value = sub.amount;
    document.getElementById('subscription-day').value = sub.billingDay;
    document.getElementById('subscription-category').value = sub.category;

    document.getElementById('subscription-modal-title').textContent = 'Edit Subscription';
    openModal('subscription-modal');
}

function deleteSubscription(id) {
    if (confirm('Are you sure you want to delete this subscription?')) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY_SUBS, JSON.stringify(subscriptions));
        updateUI();
    }
}

function renderSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    const costText = document.getElementById('subs-total-cost');
    if (!container) return;

    const totalCost = subscriptions.reduce((sum, s) => sum + s.amount, 0);
    if(costText) costText.textContent = formatCurrency(totalCost);

    if (subscriptions.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">No active subscriptions found.</div>';
        return;
    }

    let html = '';
    subscriptions.forEach(s => {
        let iconMarkup = '<i class="fa-solid fa-repeat"></i>';
        if(s.category === 'Entertainment') iconMarkup = '<i class="fa-solid fa-film"></i>';
        else if(s.category === 'Software') iconMarkup = '<i class="fa-solid fa-code"></i>';
        else if(s.category === 'Utilities') iconMarkup = '<i class="fa-solid fa-bolt"></i>';
        
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        let nextBilling = new Date(currentYear, currentMonth, s.billingDay);
        
        if (today.getDate() > s.billingDay) {
            nextBilling = new Date(currentYear, currentMonth + 1, s.billingDay);
        }
        const options = { month: 'short', day: 'numeric' };
        const nextBillingFormatted = nextBilling.toLocaleDateString('en-US', options);

        html += `
        <div class="glass-panel subscription-card">
            <div class="sub-header">
                <div class="sub-icon">${iconMarkup}</div>
                <div class="sub-actions">
                    <button class="btn btn-sm btn-edit" onclick="editSubscription('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSubscription('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="sub-body">
                <h4>${s.description}</h4>
                <p class="sub-cat">${s.category}</p>
                <div class="sub-cost">${formatCurrency(s.amount)}<span>/mo</span></div>
                <div class="sub-billing"><i class="fa-regular fa-calendar-check"></i> Next bill: ${nextBillingFormatted}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function checkSubscriptionReminders() {
    const banner = document.getElementById('subs-reminder-banner');
    const textEl = document.getElementById('subs-reminder-text');
    if (!banner || !textEl) return;

    if (subscriptions.length === 0) {
        banner.style.display = 'none';
        return;
    }

    const today = new Date();
    const upcoming = [];
    subscriptions.forEach(s => {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        let nextBilling = new Date(currentYear, currentMonth, s.billingDay);
        
        if (today.getDate() > s.billingDay) {
            nextBilling = new Date(currentYear, currentMonth + 1, s.billingDay);
        }
        
        const diffTime = nextBilling - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays >= 0 && diffDays <= 3) {
            upcoming.push(s);
        }
    });

    if (upcoming.length > 0) {
        const names = upcoming.map(s => s.description).join(', ');
        textEl.innerHTML = `Upcoming subscriptions within 3 days: <strong>${names}</strong>`;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
