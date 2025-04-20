let foodPrices = {};
let foodImages = {};



async function loadFoodItems() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbxgdlsUUuLDCWCJukv_B_aVY1caasSMaCEUievN9y_jgc2aM60or58bc10rHYA9hdrlfA/exec');
  const data = await res.json();

  const foodItemSelect = document.getElementById('foodItem');
  const menuContainer = document.getElementById('menu');

  foodItemSelect.innerHTML = '<option value="">Select</option>';
  menuContainer.innerHTML = '';

  data.forEach(item => {
    const nameKey = item.name.replace(/\s+/g, '_').toLowerCase();
    foodPrices[item.name] = item.price;
    foodImages[item.name] = `images/${nameKey}.jpg`;

    // Populate dropdown
    const option = document.createElement('option');
    option.value = item.name;
    option.text = item.name;
    foodItemSelect.appendChild(option);

    // Create menu card
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="${foodImages[item.name]}" alt="${item.name}" class="menu-img" />
      <div class="menu-info">
        <h3>${item.name}</h3>
        <p>₹${item.price}</p>
      </div>
    `;
    menuContainer.appendChild(card);
  });

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

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function submitOrder() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const item = document.getElementById('foodItem').value;
  const quantity = document.getElementById('quantity').value;

  if (!name || !phone || !item || !quantity) {
    alert('Please fill all required fields.');
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    alert('Contact phone must be a 10-digit number.');
    return;
  }

  const payload = {
    name,
    email: document.getElementById('contactEmail').value,
    phone,
    item,
    quantity,
    price: document.getElementById('price').value,
    comments: document.getElementById('comments').value
  };

  fetch('https://script.google.com/macros/s/AKfycbxgdlsUUuLDCWCJukv_B_aVY1caasSMaCEUievN9y_jgc2aM60or58bc10rHYA9hdrlfA/exec', {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(r => r.text()).then(() => {
    showToast('Order submitted successfully!');
    clearForm();
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