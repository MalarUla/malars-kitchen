let foodPrices = {};
const db = firebase.firestore();

function loadFoodItems() {
  const foodSelect = document.getElementById("foodItem");
  const menuData = [];

  foodSelect.innerHTML = `<option value="">Select</option>`;
  foodPrices = {}; // Reset prices

  db.collection("fooditems")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
      console.error("Error fetching food items: ", error);
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
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('Order submitted successfully!', 'success');

    // Optionally reset form fields
    document.getElementById('orderForm').reset();
  } catch (error) {
    console.error('Error submitting order:', error);
    showToast('Failed to submit order. Please try again later.', 'error');
  }
}


document.getElementById('toggleTheme').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

document.getElementById('menuFilter').addEventListener('input', function () {
  const keyword = this.value.toLowerCase();
  document.querySelectorAll('.menu-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(keyword) ? 'block' : 'none';
  });
});

window.onload = loadFoodItems;
