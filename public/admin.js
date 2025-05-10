function showAdminControls() {
    // Hide other sections if necessary
    document.getElementById('expenseTrackingSection').style.display = 'none';
    document.getElementById('ordersManagementSection').style.display = 'none';
    document.getElementById('adminControlsSection').style.display = 'block';
  
    // Fetch and render tables
    fetchFoodItems();
    fetchExpenseCategory();
}


async function fetchFoodItems() {
    const tableBody = document.getElementById('foodItemsTableBody');
    tableBody.innerHTML = ''; // Clear previous
  
    try {
      const snapshot = await db.collection('FoodItems').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = `
          <tr>
            <td>${data.name || ''}</td>
            <td>${data.price != null ? `$${parseFloat(data.price).toFixed(2)}` : ''}</td>
          </tr>
        `;
        tableBody.innerHTML += row;
      });
    } catch (error) {
      console.error("Error fetching food items:", error);
    }
}

  
async function fetchExpenseCategory() {
    const tableBody = document.getElementById('expenseItemsTableBody');
    tableBody.innerHTML = ''; // Clear previous
  
    try {
      const snapshot = await db.collection('ItemCategoryMaster').get();
      const expenseItems = [];
  
      snapshot.forEach(doc => {
        const data = doc.data();
        expenseItems.push({
          item: data.item || '',
          category: data.category || ''
        });
      });
  
      // Sort the array by category
      expenseItems.sort((a, b) => a.category.localeCompare(b.category));
  
      // Now populate the table
      expenseItems.forEach(item => {
        const row = `
          <tr>
            <td>${item.item}</td>
            <td>${item.category}</td>
          `;
        tableBody.innerHTML += row;
      });
  
    } catch (error) {
      console.error("Error fetching expense items:", error);
    }
}
  
