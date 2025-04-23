let foodPrices = {};
let allOrdersData = [];

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
      showToast('User not found.', 'error');
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    const passwordMatch = await dcodeIO.bcrypt.compare(password, userData.hashedPassword);
    if (passwordMatch) {
      localStorage.setItem('loggedInUser', username);
      showToast('Login successful!', 'success');

      document.getElementById("loginForm").style.display = 'none';
      document.getElementById("logoutBtn").style.display = 'block';
      
      // Show admin menu only
      document.querySelector('.form-section').style.display = 'none';
      document.querySelector('.menu-section').style.display = 'none';
      document.getElementById('adminMenu').style.display = 'block';

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
  document.getElementById("loginForm").style.display = 'block';
  document.getElementById("logoutBtn").style.display = 'none';

  // Reset UI on logout
  document.querySelector('.form-section').style.display = 'block';    
  document.querySelector('.menu-section').style.display = 'block';
  document.getElementById('adminMenu').style.display = 'none';    
  document.getElementById('manageOrdersSection').style.display = 'none';

  showToast('Logged out successfully.', 'success');
}

function showManageOrders() {
  document.getElementById("manageOrdersSection").style.display = 'block';
  fetchAndRenderOrders();
}

async function fetchAndRenderOrders() {
  try {
    const snapshot = await db.collection('Orders').get();
    allOrdersData = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      allOrdersData.push(data);
    });

    renderFilteredOrders();
    setupFilters();

  } catch (error) {
    console.error("Error fetching orders:", error);
  }
}

function setupFilters() {
  const inputs = [
    "filterCustomer",
    "filterPhone",
    "filterItem",
    "filterDateFrom",
    "filterDateTo"
  ];

  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', renderFilteredOrders);
  });

  document.getElementById("filterStatus").addEventListener("change", renderFilteredOrders);
}

function resetAllFilters() {
  document.getElementById("filterCustomer").value = '';
  document.getElementById("filterPhone").value = '';
  document.getElementById("filterItem").value = '';
  document.getElementById("filterStatus").selectedIndex = -1;
  document.getElementById("filterDateFrom").value = '';
  document.getElementById("filterDateTo").value = '';
  renderFilteredOrders();
}

function renderFilteredOrders() {
  const name = document.getElementById("filterCustomer").value.toLowerCase();
  const phone = document.getElementById("filterPhone").value.toLowerCase();
  const item = document.getElementById("filterItem").value.toLowerCase();
  const dateFrom = document.getElementById("filterDateFrom").value;
  const dateTo = document.getElementById("filterDateTo").value;
  const selectedStatuses = Array.from(document.getElementById("filterStatus").selectedOptions).map(o => o.value);

  const filtered = allOrdersData.filter(order => {
    const orderDate = order.orderDate ? order.orderDate.toDate() : null;

    return (
      (!name || order.name.toLowerCase().includes(name)) &&
      (!phone || order.phone.toLowerCase().includes(phone)) &&
      (!item || order.item.toLowerCase().includes(item)) &&
      (selectedStatuses.length === 0 || selectedStatuses.includes(order.orderStatus)) &&
      (!dateFrom || (orderDate && new Date(orderDate) >= new Date(dateFrom))) &&
      (!dateTo || (orderDate && new Date(orderDate) <= new Date(dateTo)))
    );
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tableBody = document.getElementById("ordersTableBody");
  tableBody.innerHTML = '';

  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.name}</td>
      <td>${order.phone}</td>
      <td>${order.item}</td>
      <td>${order.quantity}</td>
      <td>₹${order.price.toFixed(2)}</td>
      <td>${order.orderStatus}</td>
      <td>${order.orderDate ? order.orderDate.toDate().toLocaleDateString() : ''}</td>
    `;
    tableBody.appendChild(row);
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
  
  // Check if Firestore is available before calling loadFoodItems
  if (window.db) {
    loadFoodItems(); // Proceed with loading food items
  } else {
    console.error("❌ Firebase or Firestore not initialized.");
  }

  // auto-toggle UI based on login
  const user = localStorage.getItem('loggedInUser');
  if (user) {
    document.getElementById("loginForm").style.display = 'none';
    document.getElementById("logoutBtn").style.display = 'block';

    // Show admin menu only
    document.querySelector('.form-section').style.display = 'none';
    document.querySelector('.menu-section').style.display = 'none';
    document.getElementById('adminMenu').style.display = 'block';
  }

  // Setup theme toggle
  document.getElementById('toggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  // Filter menu items
  document.getElementById('menuFilter').addEventListener('input', function () {
    const keyword = this.value.toLowerCase();
    document.querySelectorAll('.menu-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(keyword) ? 'block' : 'none';
    });
  });
});
