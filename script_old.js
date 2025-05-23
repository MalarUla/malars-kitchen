let foodPrices = {};

async function loadFoodItems() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbxgdlsUUuLDCWCJukv_B_aVY1caasSMaCEUievN9y_jgc2aM60or58bc10rHYA9hdrlfA/exec');
  const data = await res.json();
  const foodItemSelect = document.getElementById('foodItem');

  foodItemSelect.innerHTML = '<option value="">Select</option>';
  data.forEach(item => {
    foodPrices[item.name] = item.price;
    const option = document.createElement('option');
    option.value = item.name;
    option.text = item.name;
    foodItemSelect.appendChild(option);
  });

  renderMenuCards(data);
  calculatePrice();
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

function submitOrder() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const item = document.getElementById('foodItem').value;
  const quantity = document.getElementById('quantity').value;
  const email = document.getElementById('contactEmail').value.trim();

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

  const payload = {
    name,
    email,
    phone,
    item,
    quantity,
    price: document.getElementById('price').value,
    comments: document.getElementById('comments').value
  };

  fetch('https://script.google.com/macros/s/AKfycbxgdlsUUuLDCWCJukv_B_aVY1caasSMaCEUievN9y_jgc2aM60or58bc10rHYA9hdrlfA/exec', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(r => {
    if (!r.ok) throw new Error('Server responded with an error.');
    return r.text();
  })
  .then(() => {
    showToast('Order submitted successfully!', 'success');
    clearForm();
  })
  .catch(err => {
    console.error(err);
    showToast('Failed to submit order. Please try again.', 'error');
  });
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
