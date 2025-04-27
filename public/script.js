
let foodPrices = {};
let allOrdersData = [];
let sortColumn = null;
let sortDirection = 1; // 1 for ascending, -1 for descending


function showLoginForm() {
  console.log("Showing login form...");
  document.getElementById('loginFormDiv').style.display = 'block';
}

function hideLoginForm() {
  console.log("Hiding login form...");
  document.getElementById('loginFormDiv').style.display = 'none';
  clearLoginFields();
}

function clearLoginFields() {
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").style.display = "none";
}

async function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    showToast('Please fill in both username and password.', 'error');
    return;
  }

  try {
    const querySnapshot = await db.collection('Users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      showLoginError('User not found.');
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const passwordMatch = await dcodeIO.bcrypt.compare(password, userData.hashedPassword);
    if (passwordMatch) {
      localStorage.setItem('loggedInUser', username);
      showToast('Login successful!', 'success');

      hideLoginForm(); // ✅ Close modal after successful login

      document.getElementById("logoutBtn").style.display = 'block';
      document.getElementById('loginBtn').style.display = 'none';
      
      // Show admin menu only
      document.querySelector('.form-section').style.display = 'none';
      document.querySelector('.menu-section').style.display = 'none';
      document.getElementById('adminMenu').style.display = 'block';

        // 👉 Hide the footer after login
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = 'none';
      }

    } else {
      showToast('Invalid credentials.', 'error');
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast('Login failed. Try again later.', 'error');
  }
}

function logoutUser() {
  localStorage.removeItem('loggedInUser');
  document.getElementById("loginBtn").style.display = 'block';
  document.getElementById("logoutBtn").style.display = 'none';

  // Reset UI on logout
  document.querySelector('.form-section').style.display = 'block';    
  document.querySelector('.menu-section').style.display = 'block';
  document.getElementById('adminMenu').style.display = 'none';    

  document.getElementById('manageOrdersSection').style.display = 'none';
  document.getElementById('expenseTrackingSection').style.display = 'none';
  document.getElementById('adminControlsSection').style.display = 'none';

  // 👉 Hide the footer after login
  const footer = document.querySelector('footer');
  if (footer) {
    footer.style.display = 'block';
  }

  showToast('Logged out successfully.', 'success');
}

function showManageOrders() {
  document.getElementById("manageOrdersSection").style.display = 'block';
  document.getElementById('expenseTrackingSection').style.display = 'none';
  document.getElementById('adminControlsSection').style.display = 'none';
  // Fetch orders only once, if not loaded
  if (allOrdersData.length === 0) {
    fetchAndRenderOrders();
  } else {
    renderFilteredOrders();
  }
}

async function fetchAndRenderOrders() {
  try {
    const snapshot = await db.collection('Orders').get();
    allOrdersData = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("Fetched order:", data);
      allOrdersData.push(data);
    });

    setupFilters(); // Initialize filters
    renderFilteredOrders(); // Render table based on default filters (e.g., "Ordered" status)

  } catch (error) {
    console.error("Error fetching orders:", error);
  }
}

function setupFilters() {
  // Remove input event listeners, handled by Search button now
  document.getElementById("filterStatus").addEventListener("change", renderFilteredOrders);
}

function resetAllFilters() {
  document.getElementById("filterCustomer").value = '';
  document.getElementById("filterPhone").value = '';
  document.getElementById("filterItem").value = '';
  document.getElementById("filterStatus").selectedIndex = -1;
  document.getElementById("filterDateFrom").value = '';
  document.getElementById("filterDateTo").value = '';
  document.getElementById("filterPaymentStatus").selectedIndex = -1;
  renderFilteredOrders();
}

function renderFilteredOrders() {
  
  const name = document.getElementById("filterCustomer").value.toLowerCase();
  const phone = document.getElementById("filterPhone").value.toLowerCase();
  const item = document.getElementById("filterItem").value.toLowerCase();
  const dateFrom = document.getElementById("filterDateFrom").value;
  const dateTo = document.getElementById("filterDateTo").value;
  const selectedStatuses = Array.from(document.getElementById("filterStatus").selectedOptions).map(o => o.value);
  const selectedPaymentStatuses = Array.from(document.getElementById("filterPaymentStatus").selectedOptions).map(o => o.value);
  
  const filtered = allOrdersData.filter(order => {
    const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : null;

    return (
      (!name || order.name.toLowerCase().includes(name)) &&
      (!phone || order.phone.toLowerCase().includes(phone)) &&
      (!item || order.item.toLowerCase().includes(item)) &&
      (selectedStatuses.length === 0 || selectedStatuses.includes(order.orderStatus)) &&
      (!dateFrom || (orderDate && new Date(orderDate) >= new Date(dateFrom))) &&
      (!dateTo || (orderDate && new Date(orderDate) <= new Date(dateTo))) &&
      (selectedPaymentStatuses.length === 0 || selectedPaymentStatuses.includes(order.paymentStatus))
    );
  });

  renderOrdersTable(filtered);
  //renderOrdersTable(allOrdersData)
}

function renderOrdersTable(orders) {
  const tableBody = document.getElementById("ordersTableBody");
  tableBody.innerHTML = '';

  orders.forEach((order, index) => {
    const row = document.createElement('tr');
    const orderDate = order.orderDate?.toDate ? order.orderDate.toDate().toLocaleDateString() : '';
    const price = order.price ? '$' + order.price.toFixed(2) : '';

    row.innerHTML = `
      <td><input type="checkbox" class="rowCheckbox" data-index="${index}"></td>
      <td>${order.name || ''}</td>
      <td>${order.phone || ''}</td>
      <td>${order.email || ''}</td>
      <td>${order.item || ''}</td>
      <td>${order.quantity || ''}</td>
      <td>${price}</td>
      <td>${order.orderStatus || ''}</td>
      <td>${orderDate}</td>
      <td>${order.paymentStatus || ''}</td>
      <td>${order.paymentReceivedDate || ''}</td>
      <td>${order.paymentMethod || ''}</td>
      <td>${order.paymentReference || ''}</td>
      <td>${order.comments || ''}</td>
      <td>${order.additionalDetails || ''}</td>
    `;
    tableBody.appendChild(row);
  });

  addSortableHeaders(); // New sorting logic
}

function addSortableHeaders() {
  document.querySelectorAll("#ordersTable thead th[data-key]").forEach(header => {
    header.addEventListener('click', () => {
      const key = header.getAttribute("data-key");

      // Toggle direction
      if (sortColumn === key) {
        sortDirection *= -1;
      } else {
        sortColumn = key;
        sortDirection = 1;
      }

      // Sort the data
      filteredOrders.sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        if (aVal?.toDate) aVal = aVal.toDate();
        if (bVal?.toDate) bVal = bVal.toDate();

        aVal = aVal ?? '';
        bVal = bVal ?? '';

        return aVal > bVal ? sortDirection : aVal < bVal ? -sortDirection : 0;
      });

      renderOrdersTable(filteredOrders);
      updateSortIcons();
    });
  });
}

function updateSortIcons() {
  document.querySelectorAll("#ordersTable thead th").forEach(th => {
    const arrow = th.querySelector(".sort-arrow");
    if (arrow) arrow.textContent = '';
  });

  const activeTh = document.querySelector(`#ordersTable thead th[data-key="${sortColumn}"] .sort-arrow`);
  if (activeTh) {
    activeTh.textContent = sortDirection === 1 ? '↑' : '↓';
  }
}


function toggleAllCheckboxes(masterCheckbox) {
  document.querySelectorAll('.rowCheckbox').forEach(cb => {
    cb.checked = masterCheckbox.checked;
  });
}


function loadFoodItems() {
  const foodSelect = document.getElementById("foodItem");
  const menuData = [];

  foodSelect.innerHTML = `<option value="">Select</option>`;
  foodPrices = {}; // Reset prices

  db.collection("FoodItems")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("🔹 Food item fetched:", data);
        const name = data.name;
        const price = data.price;

        // Populate dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} - ₹${price}`;
        foodSelect.appendChild(option);

        // Store in foodPrices map
        foodPrices[name] = price;

        // Push to menu list for rendering cards
        menuData.push({ name, price });
      });

      // Now render the menu cards
      renderMenuCards(menuData);
    })
    .catch((error) => {
      console.error("❌ Error fetching food items: ", error);
    });
}

function renderMenuCards(data) {
  const container = document.getElementById('menuCards');
  container.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `<strong>${item.name}</strong><br>₹${item.price}`;
    container.appendChild(card);
  });
}

function calculatePrice() {
  const item = document.getElementById('foodItem').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const price = quantity * (foodPrices[item] || 0);
  document.getElementById('price').value = price.toFixed(2);
}

function clearForm() {
  document.getElementById('orderForm').reset();
  document.getElementById('price').value = '';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;

  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3000);
}

async function submitOrder() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const item = document.getElementById('foodItem').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const email = document.getElementById('contactEmail').value.trim();
  const comments = document.getElementById('comments').value;

  // Validate inputs
  if (!name || !phone || !item || !quantity) {
    showToast('Please fill all required fields.', 'error');
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    showToast('Contact phone must be a 10-digit number.', 'error');
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  const price = quantity * (foodPrices[item] || 0);

  try {
    await db.collection('Orders').add({
      name,
      phone,
      email,
      item,
      quantity,
      price,
      comments,
      orderDate: firebase.firestore.FieldValue.serverTimestamp(),
      orderStatus: 'Ordered',
      paymentStatus: 'Pending',
      paymentReceivedDate: null,
      paymentMethod: '',
      paymentReference: '',
      updatedDate: firebase.firestore.FieldValue.serverTimestamp(),
      additionalDetails: ''
    });

    showToast('Order submitted successfully!', 'success');
    clearForm();
  } catch (error) {
    showToast('Failed to submit order. Please try again later.', 'error');
  }
}

window.addEventListener('load', () => {
  console.log("Page loaded. Checking for logged-in user...");
  
  // Check if Firestore is available before calling loadFoodItems
  if (window.db) {
    loadFoodItems(); // Proceed with loading food items
  } else {
    console.error("❌ Firebase or Firestore not initialized.");
  }

  // auto-toggle UI based on login
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    console.log("User is logged in:", user);
    document.getElementById("loginBtn").style.display = 'none';
    document.getElementById("logoutBtn").style.display = 'block';

    // Show admin menu only
    document.querySelector('.form-section').style.display = 'none';
    document.querySelector('.menu-section').style.display = 'none';
    document.getElementById('adminMenu').style.display = 'block';
  }

  // Setup theme toggle
  /*document.getElementById('toggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });*/

  // Filter menu items
  document.getElementById('menuFilter').addEventListener('input', function () {
    const keyword = this.value.toLowerCase();
    document.querySelectorAll('.menu-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(keyword) ? 'block' : 'none';
    });
  });
});
