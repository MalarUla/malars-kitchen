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
        <td><input type="checkbox" class="expenseCheckbox" data-id="${expense.id}" onchange="toggleDeleteButton()"></td>
        <td>${purchaseDate}</td>
        <td>${expense.item || ''}</td>
        <td>${expense.category || ''}</td>
        <td>${amount}</td>
        <td>${expense.store || ''}</td>
        <td>${expense.comments || ''}</td>
      `;
      tableBody.appendChild(row);
    });

    toggleDeleteButton();
}

// Function to save the changes to Firestore
async function saveExpenses() {
    const table = document.getElementById("expenseTableBody");
    const rows = table.getElementsByTagName("tr");

    const batch = db.batch();
    let updatesMade = false;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName("td");

        const originalComment = allExpenseData[i]?.comments || '';
        const newComment = cells[5].innerText.trim();

        // Only update if comment changed
        if (originalComment !== newComment) {
            const docId = allExpenseData[i]?.id;
            if (docId) {
                const expenseRef = db.collection('Expense').doc(docId);
                batch.update(expenseRef, { comments: newComment });
                updatesMade = true;
            } else {
                console.warn(`Skipping row ${i} — missing document ID.`);
            }
        }
    }

    if (!updatesMade) {
        alert("No changes to save.");
        return;
    }

    try {
        await batch.commit();
        alert("Comments updated successfully!");
    } catch (error) {
        console.error("Error saving comments:", error);
        alert("Error saving comments.");
    }
}

// Function to make table cell editable
document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('expenseTable');
    if (table) {
        table.addEventListener('click', (event) => {
            const cell = event.target;

            // Only allow editing of the 6th column (index 5, i.e. 'Comments')
            const columnIndex = cell.cellIndex;
            if (cell.tagName === 'TD' && columnIndex === 5 && !cell.hasAttribute('contenteditable')) {
                const originalText = cell.innerText;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = originalText;
                input.style.width = '100%';

                input.addEventListener('blur', () => saveCellValue(input, cell));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveCellValue(input, cell);
                    }
                });

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


function openAddExpensePopup() {
    document.getElementById("addExpenseModal").style.display = "block";
    document.getElementById("modalOverlay").style.display = "block";
}

function closeAddExpensePopup() {
    document.getElementById("addExpenseModal").style.display = "none";
    document.getElementById("modalOverlay").style.display = "none";

    // Clear form fields
    document.getElementById("addItem").value = '';
    document.getElementById("addCategory").value = '';
    document.getElementById("addAmount").value = '';
    document.getElementById("addStore").value = '';
    document.getElementById("addComments").value = '';

    // Refresh the table from backend
    fetchAndRenderExpenses();
}

async function submitNewExpense() {
    const item = document.getElementById("addItem").value.trim();
    const category = document.getElementById("addCategory").value.trim();
    const amount = parseFloat(document.getElementById("addAmount").value);
    const store = document.getElementById("addStore").value.trim();
    const comments = document.getElementById("addComments").value.trim();

    if (!item || !category || isNaN(amount)) {
        alert("Item, Category and valid Amount are required.");
        return;
    }

    try {
        await db.collection('Expense').add({
            item,
            category,
            amount,
            store,
            comments,
            purchaseDate: firebase.firestore.Timestamp.fromDate(new Date())
        });

        // Clear the fields for next entry but keep modal open
        document.getElementById("addItem").value = '';
        document.getElementById("addCategory").value = '';
        document.getElementById("addAmount").value = '';
        document.getElementById("addStore").value = '';
        document.getElementById("addComments").value = '';

        // Refresh table
        await fetchAndRenderExpenses();

    } catch (error) {
        console.error("Error adding expense:", error);
        alert("Failed to add expense.");
    }
}

function toggleDeleteButton() {
    const checkboxes = document.querySelectorAll('.expenseCheckbox:checked');
    const deleteBtn = document.getElementById('deleteExpenseButton');
    deleteBtn.disabled = checkboxes.length === 0;
}  

function confirmDeleteExpenses() {
    if (confirm("Are you sure you want to delete the expense(s)?")) {
      deleteSelectedExpenses();
    }
}

async function deleteSelectedExpenses() {
    const checkboxes = document.querySelectorAll('.expenseCheckbox:checked');
    const idsToDelete = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
  
    try {
      const batch = db.batch();
      idsToDelete.forEach(id => {
        const ref = db.collection('Expense').doc(id);
        batch.delete(ref);
      });
  
      await batch.commit();
      alert("Selected expenses deleted successfully.");
      fetchAndRenderExpenses(); // Refresh table
    } catch (error) {
      console.error("Error deleting expenses:", error);
      alert("Failed to delete selected expenses.");
    }  
}
    
