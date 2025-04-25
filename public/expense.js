let allExpenseData = [];


function showExpenseTracking() {
    document.getElementById('expenseTrackingSection').style.display = 'block';
    document.getElementById('manageOrdersSection').style.display = 'none';

    // Fetch orders only once, if not loaded
    if (allExpenseData.length === 0) {
        fetchAndRenderExpenses();
    } else {
        renderFilteredExpenses();
    }

}

async function fetchAndRenderExpenses() {
    try {
      const snapshot = await db.collection('Expense').get();
      allExpenseData = [];
  
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id; // Add document ID to data
        allExpenseData.push(data);
      });
  
      renderFilteredExpenses();
  
    } catch (error) {
      console.error("Error fetching expense:", error);
    }
}

function renderFilteredExpenses() {
  
    /*const name = document.getElementById("filterCustomer").value.toLowerCase();
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
  
    renderOrdersTable(filtered);*/
    renderExpenseTable(allExpenseData)
}

function renderExpenseTable(expense) {
    const tableBody = document.getElementById("expenseTableBody");
    tableBody.innerHTML = '';
  
    expense.forEach((expense, index) => {
      const row = document.createElement('tr');
      const purchaseDate = expense.purchaseDate?.toDate ? expense.purchaseDate.toDate().toLocaleDateString() : '';
      const amount = expense.amount ? '$' + expense.amount.toFixed(2) : '';
  
      row.innerHTML = `
        <td>${purchaseDate}</td>
        <td>${expense.item || ''}</td>
        <td>${expense.category || ''}</td>
        <td>${amount}</td>
        <td>${expense.store || ''}</td>
        <td>${expense.comments || ''}</td>
      `;
      tableBody.appendChild(row);
    });
}

// Function to save the changes to Firestore
async function saveExpenses() {
    const table = document.getElementById("expenseTableBody");
    const rows = table.getElementsByTagName("tr");

    const updatedExpenses = [];

    // Loop through each row and extract the updated data
    for (let row of rows) {
        const cells = row.getElementsByTagName("td");
        
        const updatedExpense = {
            purchaseDate: cells[0].innerText, // assuming first cell is the purchase date
            item: cells[1].innerText,
            category: cells[2].innerText,
            amount: parseFloat(cells[3].innerText.replace('$', '').trim()), // Convert to float, remove "$"
            store: cells[4].innerText,
            comments: cells[5].innerText
        };

        updatedExpenses.push(updatedExpense);
    }

    // Now save the updated data back to Firestore
    try {
        const batch = db.batch(); // Batch writes are more efficient when making multiple updates

        updatedExpenses.forEach((expense, index) => {
            const expenseRef = db.collection('Expense').doc(allExpenseData[index].id); // Assuming `id` exists in your data
            batch.update(expenseRef, expense);
        });

        await batch.commit(); // Commit the batch update to Firestore
        alert("Expenses saved successfully!");
    } catch (error) {
        console.error("Error saving expenses:", error);
        alert("Error saving expenses.");
    }
}

// Function to make table cell editable
document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('expenseTable');
    if (table) {
      table.addEventListener('click', (event) => {
        const cell = event.target;
        if (cell.tagName === 'TD' && !cell.hasAttribute('contenteditable')) {
          const originalText = cell.innerText;
          const input = document.createElement('input');
          input.type = 'text';
          input.value = originalText;
          input.style.width = '100%';  // Make input match the cell size
          input.addEventListener('blur', () => saveCellValue(input, cell));  // Save value when focus is lost
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              saveCellValue(input, cell);
            }
          });
          
          // Replace cell content with input field
          cell.innerHTML = '';
          cell.appendChild(input);
          input.focus();
        }
      });
    } else {
      console.error("Table not found!");
    }
});

// Save edited value back to the cell
function saveCellValue(input, cell) {
    const newValue = input.value.trim();
    if (newValue !== '') {
        cell.innerText = newValue;
    } else {
        cell.innerText = '';  // If input is empty, reset to original text
    }
}  