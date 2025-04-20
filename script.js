let foodPrices = {};

async function loadFoodItems() {
  const res = await fetch('YOUR_GOOGLE_SCRIPT_URL?type=food');
  const data = await res.json();
  const foodItemSelect = document.getElementById('foodItem');

  data.forEach(item => {
    foodPrices[item.name] = item.price;
    const option = document.createElement('option');
    option.value = item.name;
    option.text = item.name;
    foodItemSelect.appendChild(option);
  });
  calculatePrice();
}

function calculatePrice() {
  const item = document.getElementById('foodItem').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const price = quantity * (foodPrices[item] || 0);
  document.getElementById('price').value = price.toFixed(2);
}

function submitOrder() {
  const name = document.getElementById('customerName').value;
  const phone = document.getElementById('contactPhone').value;
  const item = document.getElementById('foodItem').value;
  const quantity = document.getElementById('quantity').value;

  if (!name || !phone || !item || !quantity) {
    alert('Please fill all required fields.');
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

  fetch('YOUR_GOOGLE_SCRIPT_URL?type=submit', {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(r => r.text()).then(alert);
}

window.onload = loadFoodItems;