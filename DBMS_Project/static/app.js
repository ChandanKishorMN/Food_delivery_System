// App State
const API_BASE = window.location.origin.includes('5500') || window.location.protocol === 'file:'
    ? 'http://127.0.0.1:5000'
    : '';

let currentTab = 'section-dashboard';
let customersList = [];
let foodItemsList = [];
let appsList = [];
let ordersList = [];
let agentsList = [];

// DOM Elements
const sidebarItems = document.querySelectorAll('.menu-item');
const sections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const globalActionButton = document.getElementById('btn-global-action');
const globalActionText = document.getElementById('btn-global-text');

// Modal Elements
const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const dynamicForm = document.getElementById('dynamic-form');
const formFieldsContainer = document.getElementById('form-fields-container');

// Search Inputs
const searchCustomers = document.getElementById('search-customers');
const searchFood = document.getElementById('search-food');
const searchApps = document.getElementById('search-apps');
const searchOrders = document.getElementById('search-orders');
const searchAgents = document.getElementById('search-agents');

// ==================== NAVIGATION ====================
sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Remove active class from all sidebar items
        sidebarItems.forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Hide all sections and show selected
        const targetSectionId = item.getAttribute('data-target');
        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetSectionId).classList.add('active');

        currentTab = targetSectionId;
        updateHeaderUI();
        loadTabData(targetSectionId);
    });
});

// Link Recent Orders View All
document.querySelector('[data-go-to="section-orders"]').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-target="section-orders"]').click();
});

function updateHeaderUI() {
    switch (currentTab) {
        case 'section-dashboard':
            pageTitle.innerText = 'Dashboard Overview';
            pageSubtitle.innerText = 'System diagnostics and real-time summaries';
            globalActionText.innerText = 'New Order';
            globalActionButton.style.display = 'inline-flex';
            break;
        case 'section-customers':
            pageTitle.innerText = 'Customer Profiles';
            pageSubtitle.innerText = 'Manage customers, phone numbers, and addresses';
            globalActionText.innerText = 'Add Customer';
            globalActionButton.style.display = 'inline-flex';
            break;
        case 'section-food':
            pageTitle.innerText = 'Food Items Menu';
            pageSubtitle.innerText = 'Manage recipes, prices, and availability';
            globalActionText.innerText = 'Add Food Item';
            globalActionButton.style.display = 'inline-flex';
            break;
        case 'section-apps':
            pageTitle.innerText = 'Delivery Platforms';
            pageSubtitle.innerText = 'Monitor channel connections and customer ratings';
            globalActionText.innerText = 'Add Platform';
            globalActionButton.style.display = 'inline-flex';
            break;
        case 'section-orders':
            pageTitle.innerText = 'Orders Directory';
            pageSubtitle.innerText = 'Track order amounts, statuses, and assignees';
            globalActionText.innerText = 'Place Order';
            globalActionButton.style.display = 'inline-flex';
            break;
        case 'section-agents':
            pageTitle.innerText = 'Delivery Fleet';
            pageSubtitle.innerText = 'Monitor delivery agents and assignment statuses';
            globalActionText.innerText = 'Add Agent';
            globalActionButton.style.display = 'inline-flex';
            break;
    }
}

// ==================== DATA FETCHING & RENDERING ====================
async function loadTabData(sectionId) {
    // Refresh relational background lists for dropdown selects
    await fetchRelations();

    if (sectionId === 'section-dashboard') {
        renderDashboard();
    } else if (sectionId === 'section-customers') {
        renderCustomers();
    } else if (sectionId === 'section-food') {
        renderFoodItems();
    } else if (sectionId === 'section-apps') {
        renderApps();
    } else if (sectionId === 'section-orders') {
        renderOrders();
    } else if (sectionId === 'section-agents') {
        renderAgents();
    }
}

// Fetch all lists for foreign-key operations and dashboard stats
async function fetchRelations() {
    try {
        const [cRes, fRes, aRes, oRes, agRes] = await Promise.all([
            fetch(API_BASE + '/api/customers').then(r => r.json()),
            fetch(API_BASE + '/api/food_items').then(r => r.json()),
            fetch(API_BASE + '/api/apps').then(r => r.json()),
            fetch(API_BASE + '/api/orders').then(r => r.json()),
            fetch(API_BASE + '/api/delivery_persons').then(r => r.json())
        ]);

        customersList = Array.isArray(cRes) ? cRes : [];
        foodItemsList = Array.isArray(fRes) ? fRes : [];
        appsList = Array.isArray(aRes) ? aRes : [];
        ordersList = Array.isArray(oRes) ? oRes : [];
        agentsList = Array.isArray(agRes) ? agRes : [];
    } catch (err) {
        console.error('Error fetching relational data:', err);
    }
}

// 1. Render Dashboard Overview
function renderDashboard() {
    document.getElementById('stat-orders').innerText = ordersList.length;
    document.getElementById('stat-customers').innerText = customersList.length;
    document.getElementById('stat-apps').innerText = appsList.length;
    document.getElementById('stat-agents').innerText = agentsList.length;

    const recentBody = document.getElementById('dashboard-recent-orders');
    recentBody.innerHTML = '';

    // Slice last 5 orders
    const recents = ordersList.slice(0, 5);
    if (recents.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No orders found.</td></tr>`;
        return;
    }

    recents.forEach(o => {
        const statusBadge = getStatusBadgeClass(o.order_status);
        recentBody.innerHTML += `
            <tr>
                <td>#${o.order_id}</td>
                <td>${o.customer_name || 'Deleted Customer'}</td>
                <td>${o.food_name || 'Deleted Item'}</td>
                <td>₹${parseFloat(o.order_amount).toFixed(2)}</td>
                <td><span class="badge ${statusBadge}">${o.order_status}</span></td>
            </tr>
        `;
    });
}

// 2. Render Customers
function renderCustomers(filter = '') {
    const body = document.getElementById('table-body-customers');
    body.innerHTML = '';

    const filtered = customersList.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.phone_number.includes(filter) ||
        c.address.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No customers found.</td></tr>`;
        return;
    }

    filtered.forEach(c => {
        body.innerHTML += `
            <tr>
                <td>#${c.customer_id}</td>
                <td class="fw-semibold">${c.name}</td>
                <td>${c.phone_number}</td>
                <td>${c.address}</td>
                <td class="actions-col">
                    <div class="row-actions">
                        <button class="btn btn-edit" onclick="openEditModal('customer', ${c.customer_id})"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn btn-delete" onclick="deleteEntity('customer', ${c.customer_id})"><i class="bx bx-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 3. Render Food Items
function renderFoodItems(filter = '') {
    const body = document.getElementById('table-body-food');
    body.innerHTML = '';

    const filtered = foodItemsList.filter(f =>
        f.food_name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No menu items found.</td></tr>`;
        return;
    }

    filtered.forEach(f => {
        const isAvail = f.availability_status === 'Available';
        const badgeClass = isAvail ? 'badge-available' : 'badge-unavailable';
        body.innerHTML += `
            <tr>
                <td>#${f.food_id}</td>
                <td class="fw-semibold">${f.food_name}</td>
                <td>₹${parseFloat(f.price).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${f.availability_status}</span></td>
                <td class="actions-col">
                    <div class="row-actions">
                        <button class="btn btn-edit" onclick="openEditModal('food_item', ${f.food_id})"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn btn-delete" onclick="deleteEntity('food_item', ${f.food_id})"><i class="bx bx-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 4. Render Apps
function renderApps(filter = '') {
    const body = document.getElementById('table-body-apps');
    body.innerHTML = '';

    const filtered = appsList.filter(a =>
        a.app_name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No apps found.</td></tr>`;
        return;
    }

    filtered.forEach(a => {
        body.innerHTML += `
            <tr>
                <td>#${a.app_id}</td>
                <td class="fw-semibold">${a.app_name}</td>
                <td>${a.contact_number}</td>
                <td><i class="bx bxs-star text-orange"></i> ${parseFloat(a.ratings).toFixed(1)} / 5.0</td>
                <td class="actions-col">
                    <div class="row-actions">
                        <button class="btn btn-edit" onclick="openEditModal('app', ${a.app_id})"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn btn-delete" onclick="deleteEntity('app', ${a.app_id})"><i class="bx bx-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 5. Render Orders
function renderOrders(filter = '') {
    const body = document.getElementById('table-body-orders');
    body.innerHTML = '';

    const filtered = ordersList.filter(o => {
        const cName = o.customer_name ? o.customer_name.toLowerCase() : '';
        const fName = o.food_name ? o.food_name.toLowerCase() : '';
        const aName = o.app_name ? o.app_name.toLowerCase() : '';
        const q = filter.toLowerCase();
        return cName.includes(q) || fName.includes(q) || aName.includes(q) || o.order_status.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No orders found.</td></tr>`;
        return;
    }

    filtered.forEach(o => {
        const statusBadge = getStatusBadgeClass(o.order_status);
        const orderDate = new Date(o.order_date).toLocaleString();
        body.innerHTML += `
            <tr>
                <td>#${o.order_id}</td>
                <td class="text-muted font-sm">${orderDate}</td>
                <td>
                    <div class="fw-semibold">${o.customer_name || 'Deleted Customer'}</div>
                    <div class="text-muted font-xs">${o.customer_phone || ''}</div>
                </td>
                <td>${o.food_name || 'Deleted Food Item'}</td>
                <td><span class="text-purple fw-semibold">${o.app_name || 'App Removed'}</span></td>
                <td>₹${parseFloat(o.order_amount).toFixed(2)}</td>
                <td><span class="badge ${statusBadge}">${o.order_status}</span></td>
                <td class="actions-col">
                    <div class="row-actions">
                        <button class="btn btn-edit" onclick="openEditModal('order', ${o.order_id})"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn btn-delete" onclick="deleteEntity('orders', ${o.order_id})"><i class="bx bx-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 6. Render Delivery Agents
function renderAgents(filter = '') {
    const body = document.getElementById('table-body-agents');
    body.innerHTML = '';

    const filtered = agentsList.filter(a =>
        a.name.toLowerCase().includes(filter.toLowerCase()) ||
        a.vehicle_type.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No delivery agents found.</td></tr>`;
        return;
    }

    filtered.forEach(a => {
        const assignedOrder = a.order_id ? `#${a.order_id} (${a.customer_name || 'N/A'})` : '<span class="text-muted">Unassigned</span>';
        const orderStatus = a.order_status ? `<span class="badge ${getStatusBadgeClass(a.order_status)}">${a.order_status}</span>` : '<span class="text-muted">-</span>';

        body.innerHTML += `
            <tr>
                <td>#${a.delivery_id}</td>
                <td class="fw-semibold">${a.name}</td>
                <td>${a.phone_number}</td>
                <td><i class="bx bx-purchase-tag-alt"></i> ${a.vehicle_type}</td>
                <td>${assignedOrder}</td>
                <td>${orderStatus}</td>
                <td class="actions-col">
                    <div class="row-actions">
                        <button class="btn btn-edit" onclick="openEditModal('delivery_person', ${a.delivery_id})"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn btn-delete" onclick="deleteEntity('delivery_person', ${a.delivery_id})"><i class="bx bx-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Helper: Badge classes based on order statuses
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Pending': return 'badge-pending';
        case 'Preparing': return 'badge-preparing';
        case 'Out for Delivery': return 'badge-transit';
        case 'Delivered': return 'badge-delivered';
        case 'Cancelled': return 'badge-cancelled';
        default: return 'badge-pending';
    }
}

// ==================== SEARCH LISTENERS ====================
if (searchCustomers) searchCustomers.addEventListener('input', (e) => renderCustomers(e.target.value));
if (searchFood) searchFood.addEventListener('input', (e) => renderFoodItems(e.target.value));
if (searchApps) searchApps.addEventListener('input', (e) => renderApps(e.target.value));
if (searchOrders) searchOrders.addEventListener('input', (e) => renderOrders(e.target.value));
if (searchAgents) searchAgents.addEventListener('input', (e) => renderAgents(e.target.value));


// ==================== MODAL LOGIC (ADD / EDIT) ====================
let formAction = 'add'; // 'add' or 'edit'
let formEntityType = ''; // 'customer', 'food_item', etc.
let editEntityId = null;

// Global top-right Action Button
globalActionButton.addEventListener('click', () => {
    if (currentTab === 'section-dashboard') {
        // Redirect dashboard action to creating an order
        openAddModal('order');
    } else if (currentTab === 'section-customers') {
        openAddModal('customer');
    } else if (currentTab === 'section-food') {
        openAddModal('food_item');
    } else if (currentTab === 'section-apps') {
        openAddModal('app');
    } else if (currentTab === 'section-orders') {
        openAddModal('order');
    } else if (currentTab === 'section-agents') {
        openAddModal('delivery_person');
    }
});

// Open Add Modals
function openAddModal(type) {
    formAction = 'add';
    formEntityType = type;
    editEntityId = null;
    modalTitle.innerText = `Add New ${formatEntityType(type)}`;

    generateFormFields(type);
    modalContainer.classList.add('active');
}

// Open Edit Modals
function openEditModal(type, id) {
    formAction = 'edit';
    formEntityType = type;
    editEntityId = id;
    modalTitle.innerText = `Edit ${formatEntityType(type)} #${id}`;

    generateFormFields(type, id);
    modalContainer.classList.add('active');
}

// Close Modal functions
modalClose.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);
modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) closeModal();
});

function closeModal() {
    modalContainer.classList.remove('active');
    dynamicForm.reset();
}

function formatEntityType(type) {
    if (type === 'food_item') return 'Food Item';
    if (type === 'delivery_person') return 'Delivery Agent';
    if (type === 'app') return 'Delivery Platform';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

// Generate dynamic form fields based on entity type
function generateFormFields(type, id = null) {
    formFieldsContainer.innerHTML = '';
    let html = '';

    if (type === 'customer') {
        const item = id ? customersList.find(x => x.customer_id === id) : null;
        html = `
            <div class="form-group">
                <label for="c_name">Name</label>
                <input type="text" id="c_name" class="form-control" value="${item ? item.name : ''}" required pattern="[A-Za-z ]+" title="Name must contain only letters and spaces" oninput="this.value = this.value.replace(/[^A-Za-z ]/g, '')">
            </div>
            <div class="form-group">
                <label for="c_phone">Phone Number</label>
                <input type="tel" id="c_phone" class="form-control" value="${item ? item.phone_number : ''}" required pattern="[0-9]{10}" maxlength="10" title="Phone number must be exactly 10 digits" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            </div>
            <div class="form-group">
                <label for="c_address">Address</label>
                <textarea id="c_address" class="form-control" rows="3" required>${item ? item.address : ''}</textarea>
            </div>
        `;
    }

    else if (type === 'food_item') {
        const item = id ? foodItemsList.find(x => x.food_id === id) : null;
        html = `
            <div class="form-group">
                <label for="f_name">Food Name</label>
                <input type="text" id="f_name" class="form-control" value="${item ? item.food_name : ''}" required pattern="[A-Za-z ]+" title="Food name must contain only letters and spaces" oninput="this.value = this.value.replace(/[^A-Za-z ]/g, '')">
            </div>
            <div class="form-group">
                <label for="f_price">Price (₹)</label>
                <input type="number" id="f_price" class="form-control" step="0.01" min="0" value="${item ? item.price : ''}" required>
            </div>
            <div class="form-group">
                <label for="f_status">Availability Status</label>
                <select id="f_status" class="form-control">
                    <option value="Available" ${item && item.availability_status === 'Available' ? 'selected' : ''}>Available</option>
                    <option value="Unavailable" ${item && item.availability_status === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
                </select>
            </div>
        `;
    }

    else if (type === 'app') {
        const item = id ? appsList.find(x => x.app_id === id) : null;
        html = `
            <div class="form-group">
                <label for="a_name">App Name</label>
                <input type="text" id="a_name" class="form-control" value="${item ? item.app_name : ''}" required pattern="[A-Za-z ]+" title="App name must contain only letters and spaces" oninput="this.value = this.value.replace(/[^A-Za-z ]/g, '')">
            </div>
            <div class="form-group">
                <label for="a_phone">Contact Number</label>
                <input type="tel" id="a_phone" class="form-control" value="${item ? item.contact_number : ''}" required pattern="[0-9]{10}" maxlength="10" title="Contact number must be exactly 10 digits" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            </div>
            <div class="form-group">
                <label for="a_rating">Rating (0.0 - 5.0)</label>
                <input type="number" id="a_rating" class="form-control" min="0" max="5" step="0.1" value="${item ? item.ratings : '0.0'}" required>
            </div>
        `;
    }

    else if (type === 'order') {
        const item = id ? ordersList.find(x => x.order_id === id) : null;

        // Build Dropdowns for Foreign Keys
        let customerOptions = `<option value="" disabled selected>Select Customer</option>`;
        customersList.forEach(c => {
            customerOptions += `<option value="${c.customer_id}" ${item && item.customer_id === c.customer_id ? 'selected' : ''}>${c.name} (#${c.customer_id})</option>`;
        });

        let foodOptions = `<option value="" disabled selected>Select Food Item</option>`;
        foodItemsList.forEach(f => {
            foodOptions += `<option value="${f.food_id}" data-price="${f.price}" ${item && item.food_id === f.food_id ? 'selected' : ''}>${f.food_name} (₹${parseFloat(f.price).toFixed(2)})</option>`;
        });

        let appOptions = `<option value="" disabled selected>Select Delivery App</option>`;
        appsList.forEach(a => {
            appOptions += `<option value="${a.app_id}" ${item && item.app_id === a.app_id ? 'selected' : ''}>${a.app_name}</option>`;
        });

        html = `
            <div class="form-group">
                <label for="o_customer">Customer</label>
                <select id="o_customer" class="form-control" required>
                    ${customerOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="o_food">Food Item</label>
                <select id="o_food" class="form-control" onchange="autoCalculateAmount()" required>
                    ${foodOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="o_app">Delivery App Connection</label>
                <select id="o_app" class="form-control" required>
                    ${appOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="o_amount">Order Amount (₹)</label>
                <input type="number" id="o_amount" class="form-control" step="0.01" min="0" value="${item ? item.order_amount : ''}" required>
            </div>
            <div class="form-group">
                <label for="o_status">Order Status</label>
                <select id="o_status" class="form-control">
                    <option value="Pending" ${item && item.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Confirmed" ${item && item.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="Preparing" ${item && item.order_status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="Out for Delivery" ${item && item.order_status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${item && item.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${item && item.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        `;
    }

    else if (type === 'delivery_person') {
        const item = id ? agentsList.find(x => x.delivery_id === id) : null;

        // Build Dropdown for Order IDs (allow unassigned)
        let orderOptions = `<option value="None">None (Unassigned)</option>`;
        ordersList.forEach(o => {
            orderOptions += `<option value="${o.order_id}" ${item && item.order_id === o.order_id ? 'selected' : ''}>Order #${o.order_id} (Customer: ${o.customer_name})</option>`;
        });

        html = `
            <div class="form-group">
                <label for="dp_name">Agent Name</label>
                <input type="text" id="dp_name" class="form-control" value="${item ? item.name : ''}" required pattern="[A-Za-z ]+" title="Agent name must contain only letters and spaces" oninput="this.value = this.value.replace(/[^A-Za-z ]/g, '')">
            </div>
            <div class="form-group">
                <label for="dp_phone">Phone Number</label>
                <input type="tel" id="dp_phone" class="form-control" value="${item ? item.phone_number : ''}" required pattern="[0-9]{10}" maxlength="10" title="Phone number must be exactly 10 digits" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            </div>
            <div class="form-group">
                <label for="dp_vehicle">Vehicle Type</label>
                <select id="dp_vehicle" class="form-control" required>
                    <option value="Bike" ${item && item.vehicle_type === 'Bike' ? 'selected' : ''}>Bike</option>
                    <option value="Scooter" ${item && item.vehicle_type === 'Scooter' ? 'selected' : ''}>Scooter</option>
                    <option value="Cycle" ${item && item.vehicle_type === 'Cycle' ? 'selected' : ''}>Cycle</option>
                </select>
            </div>
            <div class="form-group">
                <label for="dp_order">Assigned Order</label>
                <select id="dp_order" class="form-control">
                    ${orderOptions}
                </select>
            </div>
        `;
    }

    formFieldsContainer.innerHTML = html;
}

// Auto Calculate price based on select item
window.autoCalculateAmount = function () {
    const foodSelect = document.getElementById('o_food');
    const amountInput = document.getElementById('o_amount');

    if (foodSelect && amountInput) {
        const selectedOption = foodSelect.options[foodSelect.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        if (price) {
            amountInput.value = parseFloat(price).toFixed(2);
        }
    }
};

// ==================== SUBMIT FORM LOGIC (ADD / UPDATE) ====================
dynamicForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let payload = {};
    let url = '';
    let method = formAction === 'add' ? 'POST' : 'PUT';

    const validateName = (val) => /^[A-Za-z ]+$/.test(val);
    const validatePhone = (val) => /^[0-9]{10}$/.test(val);
    const validateNumber = (val, min = 0, max = null) => {
        const num = parseFloat(val);
        if (isNaN(num)) return false;
        if (num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    };

    // Build payload according to form types
    if (formEntityType === 'customer') {
        const name = document.getElementById('c_name').value;
        const phone = document.getElementById('c_phone').value;
        const address = document.getElementById('c_address').value;

        if (!validateName(name)) {
            alert('Invalid name. Name must contain only alphabetical characters and spaces.');
            return;
        }
        if (!validatePhone(phone)) {
            alert('Invalid phone number. Phone number must be exactly 10 digits.');
            return;
        }

        payload = { name, phone_number: phone, address };
        url = formAction === 'add' ? '/api/customers' : `/api/customers/${editEntityId}`;
    }

    else if (formEntityType === 'food_item') {
        const food_name = document.getElementById('f_name').value;
        const price = document.getElementById('f_price').value;
        const availability_status = document.getElementById('f_status').value;

        if (!validateName(food_name)) {
            alert('Invalid food name. Food name must contain only alphabetical characters and spaces.');
            return;
        }
        if (!validateNumber(price, 0)) {
            alert('Invalid price. Price must be a positive number.');
            return;
        }

        payload = {
            food_name,
            price: parseFloat(price),
            availability_status
        };
        url = formAction === 'add' ? '/api/food_items' : `/api/food_items/${editEntityId}`;
    }

    else if (formEntityType === 'app') {
        const app_name = document.getElementById('a_name').value;
        const contact_number = document.getElementById('a_phone').value;
        const ratings = document.getElementById('a_rating').value;

        if (!validateName(app_name)) {
            alert('Invalid app name. App name must contain only alphabetical characters and spaces.');
            return;
        }
        if (!validatePhone(contact_number)) {
            alert('Invalid contact number. Contact number must be exactly 10 digits.');
            return;
        }
        if (!validateNumber(ratings, 0, 5)) {
            alert('Invalid ratings. Ratings must be a number between 0.0 and 5.0.');
            return;
        }

        payload = {
            app_name,
            contact_number,
            ratings: parseFloat(ratings)
        };
        url = formAction === 'add' ? '/api/apps' : `/api/apps/${editEntityId}`;
    }

    else if (formEntityType === 'order') {
        const customer_id = document.getElementById('o_customer').value;
        const food_id = document.getElementById('o_food').value;
        const app_id = document.getElementById('o_app').value;
        const order_amount = document.getElementById('o_amount').value;
        const order_status = document.getElementById('o_status').value;

        if (!validateNumber(order_amount, 0)) {
            alert('Invalid order amount. Amount must be a positive number.');
            return;
        }

        payload = {
            customer_id: parseInt(customer_id),
            food_id: parseInt(food_id),
            app_id: parseInt(app_id),
            order_amount: parseFloat(order_amount),
            order_status
        };
        url = formAction === 'add' ? '/api/orders' : `/api/orders/${editEntityId}`;
    }

    else if (formEntityType === 'delivery_person') {
        const name = document.getElementById('dp_name').value;
        const phone = document.getElementById('dp_phone').value;
        const vehicle_type = document.getElementById('dp_vehicle').value;
        const orderIdVal = document.getElementById('dp_order').value;

        if (!validateName(name)) {
            alert('Invalid name. Name must contain only alphabetical characters and spaces.');
            return;
        }
        if (!validatePhone(phone)) {
            alert('Invalid phone number. Phone number must be exactly 10 digits.');
            return;
        }

        payload = {
            name,
            phone_number: phone,
            vehicle_type,
            order_id: orderIdVal === 'None' ? null : parseInt(orderIdVal)
        };
        url = formAction === 'add' ? '/api/delivery_persons' : `/api/delivery_persons/${editEntityId}`;
    }

    try {
        const response = await fetch(API_BASE + url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            loadTabData(currentTab);
        } else {
            const errData = await response.json();
            alert(`Error: ${errData.error || 'Request failed'}`);
        }
    } catch (err) {
        console.error('Submission error:', err);
        alert('Could not submit form. Please check network/console.');
    }
});

// ==================== DELETE LOGIC ====================
window.deleteEntity = async function (type, id) {
    if (!confirm(`Are you sure you want to delete this ${type.replace('_', ' ')}?`)) {
        return;
    }

    let url = '';
    // Map internal types to correct api deletion paths
    if (type === 'customer') url = `/api/customers/${id}`;
    else if (type === 'food_item') url = `/api/food_items/${id}`;
    else if (type === 'app') url = `/api/apps/${id}`;
    else if (type === 'orders') url = `/api/orders/${id}`;
    else if (type === 'delivery_person') url = `/api/delivery_persons/${id}`;

    try {
        const response = await fetch(API_BASE + url, { method: 'DELETE' });
        if (response.ok) {
            loadTabData(currentTab);
        } else {
            const errData = await response.json();
            alert(`Error: ${errData.error || 'Delete failed'}`);
        }
    } catch (err) {
        console.error('Delete network error:', err);
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch of dashboard diagnostics data
    loadTabData('section-dashboard');
});
