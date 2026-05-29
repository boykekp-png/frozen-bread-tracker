let currentUser = null;
let currentTypes = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    currentUser = JSON.parse(localStorage.getItem('user'));

    // Refresh user info from server to ensure we have the latest name
    try {
        const verified = await api.verifyToken();
        if (verified && verified.user) {
            currentUser = { ...currentUser, ...verified.user };
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
    } catch (e) {
        // Ignore — use whatever is in localStorage
    }

    if (currentUser) {
        const displayName = currentUser.name || '';
        document.getElementById('user-email').textContent = displayName
            ? `Welcome back, ${displayName}!`
            : 'Welcome back!';
    }

    initAutoLogout();
    applyRoleUI();
    initDatePicker();
    await loadBreadTypes();
    setupEventListeners();
});

function initDatePicker() {
    const dateInput = document.getElementById('selected-date');
    dateInput.value = getTodayDate();
    dateInput.addEventListener('change', () => renderTypes());
}

function isAdmin() {
    return currentUser?.isAdmin === true;
}

function applyRoleUI() {
    const admin = isAdmin();
    document.getElementById('admin-badge').style.display = admin ? 'inline-flex' : 'none';
    document.getElementById('manage-users-link').style.display = admin ? 'inline-flex' : 'none';
    document.getElementById('non-admin-note').style.display = admin ? 'none' : 'block';
    document.getElementById('bread-type-form-section').style.display = admin ? 'block' : 'block'; // show for all, but disable for non-admin
    document.getElementById('bread-type-form').style.opacity = admin ? '1' : '0.65';
    Array.from(document.querySelectorAll('#bread-type-form input, #bread-type-form button')).forEach(el => {
        if (!admin && el.id !== 'cancel-btn') el.disabled = true;
    });
}

async function loadBreadTypes() {
    const container = document.getElementById('types-container');
    try {
        currentTypes = await api.getBreadTypes();
        renderTypes();
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load bread types. Please try again.</p>';
    }
}

function getExpirationDateForType(type) {
    const selectedDate = document.getElementById('selected-date').value;
    if (!selectedDate) return '-';
    const base = new Date(selectedDate + 'T00:00:00');
    base.setDate(base.getDate() + (type.expiration_days - 1));
    return base.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderTypes() {
    const container = document.getElementById('types-container');
    container.innerHTML = '';
    if (!currentTypes.length) {
        container.innerHTML = '<p class="no-entries">No bread types found.</p>';
        return;
    }

    const admin = isAdmin();
    const table = document.createElement('table');
    table.className = 'entries-table';
    table.innerHTML = `<thead><tr>
      <th>SKU</th><th>Bread Name</th><th>Expiration Days</th><th>Expiration Date</th>${admin ? '<th>Actions</th>' : ''}
    </tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    currentTypes.forEach(type => {
        const expDate = getExpirationDateForType(type);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${type.sku}</td>
          <td>${type.name}</td>
          <td>${type.expiration_days} days</td>
          <td>${expDate}</td>
          ${admin ? `<td class="actions">
            <button class="btn btn-small btn-edit" data-id="${type.id}" data-sku="${type.sku}" data-name="${type.name}" data-days="${type.expiration_days}">Edit</button>
            <button class="btn btn-small btn-delete" data-id="${type.id}">Delete</button>
          </td>` : ''}`;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('bread-type-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-btn').addEventListener('click', resetForm);
    document.getElementById('types-container').addEventListener('click', handleTypeActions);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Initialize theme button icon
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.getElementById('theme-toggle').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!isAdmin()) return showNotification('Only admin can modify bread types.', 'error');

    const editId = document.getElementById('edit-type-id').value;
    const sku = document.getElementById('bread-sku').value.trim();
    const name = document.getElementById('bread-name').value.trim();
    const expirationDays = parseInt(document.getElementById('bread-expiration-days').value);

    try {
        if (editId) {
            await api.updateBreadType(editId, sku, name, expirationDays);
            showNotification('Bread type updated successfully!', 'success');
        } else {
            await api.createBreadType(sku, name, expirationDays);
            showNotification('Bread type created successfully!', 'success');
        }
        resetForm();
        await loadBreadTypes();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function resetForm() {
    document.getElementById('bread-type-form').reset();
    document.getElementById('edit-type-id').value = '';
    document.getElementById('form-heading').textContent = 'Add New Bread Type';
    document.getElementById('submit-btn').textContent = 'Add Bread Type';
    document.getElementById('cancel-btn').style.display = 'none';
}

function handleTypeActions(e) {
    if (!isAdmin()) return;
    const target = e.target;

    if (target.classList.contains('btn-edit')) {
        document.getElementById('edit-type-id').value = target.dataset.id;
        document.getElementById('bread-sku').value = target.dataset.sku;
        document.getElementById('bread-name').value = target.dataset.name;
        document.getElementById('bread-expiration-days').value = target.dataset.days;
        document.getElementById('form-heading').textContent = 'Edit Bread Type';
        document.getElementById('submit-btn').textContent = 'Update Bread Type';
        document.getElementById('cancel-btn').style.display = 'inline-flex';
        document.getElementById('bread-sku').focus();
    }

    if (target.classList.contains('btn-delete')) {
        if (confirm('Are you sure you want to delete this bread type?')) {
            deleteType(target.dataset.id);
        }
    }
}

async function deleteType(typeId) {
    try {
        await api.deleteBreadType(typeId);
        showNotification('Bread type deleted successfully!', 'success');
        await loadBreadTypes();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showNotification(message, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;background:${type === 'success' ? '#16a34a' : '#dc2626'};color:#fff;border-radius:6px;z-index:9999;`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}