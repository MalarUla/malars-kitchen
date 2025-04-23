let foodPrices = {};

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

    const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);
    if (passwordMatch) {
      localStorage.setItem('loggedInUser', username);
      showToast('Login successful!', 'success');
      document.getElementById("loginForm").style.display = 'none';
      document.getElementById("logoutBtn").style.display = 'block';
      // Optionally show/hide parts of app based on login
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
  showToast('Logged out successfully.', 'success');
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
