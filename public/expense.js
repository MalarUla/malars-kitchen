let allExpenseData = [];
let editedExpenseIds = new Set();
let itemCategoryMap = {}; // to hold item -> category mapping

function showExpenseTracking() {
    document.getElementById('expenseTrackingSection').style.display = 'block';
    document.getElementById('adminControlsSection').style.display = 'none';
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

    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;

    const table = document.getElementById("expenseTableBody");
    const rows = table.getElementsByTagName("tr");

    const batch = db.batch();
    let updatesMade = false;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName("td");

        const originalComment = allExpenseData[i]?.comments || '';
        const newComment = cells[6].innerText.trim();

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
        saveButton.disabled = false;
    }
}

/*function saveExpenses() {
    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;

    const updates = [];

    editedExpenseIds.forEach(docId => {
        const row = document.querySelector(`tr[data-id="${docId}"]`);
        const comments = row.cells[6].innerText.trim();

        updates.push(updateDoc(doc(db, 'Expense', docId), { comments }));
    });

    Promise.all(updates)
        .then(() => {
            editedExpenseIds.clear();
            loadExpenses(); // refresh table
        })
        .catch(error => {
            console.error("Error saving expenses:", error);
            saveButton.disabled = false;
        });
}*/


// Function to make table cell editable
document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('expenseTable');
    if (table) {
        table.addEventListener('click', (event) => {
            const cell = event.target;

            // Only allow editing of the 7th column (index 6, i.e. 'Comments')
            const columnIndex = cell.cellIndex;
            if (cell.tagName === 'TD' && columnIndex === 6 && !cell.hasAttribute('contenteditable')) {
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

    // ✅ Add export and Google Sheet refresh button event listeners here:
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportExpensesToCSV);
    }

    const refreshSheetBtn = document.getElementById('refreshGoogleSheetBtn');
    if (refreshSheetBtn) {
        refreshSheetBtn.addEventListener('click', refreshGoogleSheet);
    }
});

// Save edited value back to the cell
function saveCellValue(input, cell) {
    const newValue = input.value.trim();
    const row = cell.closest('tr');
    const docId = row.getAttribute('data-id');

    if (cell.innerText !== newValue) {
        editedExpenseIds.add(docId);
        document.getElementById('saveButton').disabled = false;
    }

    cell.innerHTML = newValue;
}


function openAddExpensePopup() {
  const modal = document.getElementById("addExpenseModal");
  const overlay = document.getElementById("modalOverlay");

  modal.style.display = "block";
  overlay.style.display = "block";

  setTimeout(() => {
    modal.classList.add('show');
  }, 10); // small delay to trigger transition

  if (Object.keys(itemCategoryMap).length === 0) {
    loadItemCategoryMaster();
  }
}


function closeAddExpensePopup() {
  const modal = document.getElementById("addExpenseModal");
  const overlay = document.getElementById("modalOverlay");

  // Start fade-out animation
  modal.classList.remove('show');

  setTimeout(() => {
      modal.style.display = "none";
      overlay.style.display = "none";

      // Clear form fields AFTER closing
      const addItemInput = document.getElementById("addItem") || document.getElementById("addItemSearch");
      if (addItemInput) addItemInput.value = '';

      document.getElementById("addCategory").value = '';
      document.getElementById("addAmount").value = '';
      document.getElementById("addStore").value = '';
      document.getElementById("addComments").value = '';

      // Refresh the table from backend
      fetchAndRenderExpenses();
  }, 400); // Wait for fade-out transition to finish
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
    
function exportExpensesToCSV() {
    if (allExpenseData.length === 0) {
      alert("No expense data available to export.");
      return;
    }
  
    const headers = ["Purchase Date", "Item", "Category", "Amount", "Store", "Comments"];
    const rows = allExpenseData.map(expense => [
      expense.purchaseDate?.toDate ? expense.purchaseDate.toDate().toLocaleDateString() : '',
      expense.item || '',
      expense.category || '',
      expense.amount ? expense.amount.toFixed(2) : '',
      expense.store || '',
      expense.comments || ''
    ]);
  
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.map(field => `"${field.replace(/"/g, '""')}"`).join(",")).join("\n");
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "malarskitchen_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


async function refreshGoogleSheet() {
    if (allExpenseData.length === 0) {
      alert("No expense data available to export.");
      return;
    }
  
    const dataToSend = allExpenseData.map(expense => ({
      purchaseDate: expense.purchaseDate?.toDate ? expense.purchaseDate.toDate().toLocaleDateString() : '',
      item: expense.item || '',
      category: expense.category || '',
      amount: expense.amount ? expense.amount.toFixed(2) : '',
      store: expense.store || '',
      comments: expense.comments || ''
    }));
  
    try {
      const response = await fetch("YOUR_WEB_APP_URL", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(dataToSend)
      });
  
      if (response.ok) {
        alert("Google Sheet updated successfully.");
      } else {
        alert("Failed to update Google Sheet.");
      }
    } catch (error) {
      console.error("Error updating Google Sheet:", error);
      alert("An error occurred while updating Google Sheet.");
    }
}


function loadItemCategoryMaster() {
  const itemSelect = document.getElementById('addItem');
  itemSelect.innerHTML = '<option value="">-- Select Item --</option>'; // reset dropdown

  db.collection("ItemCategoryMaster")
      .get()
      .then(snapshot => {
          snapshot.forEach(doc => {
              const data = doc.data();
              itemCategoryMap[data.item] = data.category;

              const option = document.createElement('option');
              option.value = data.item;
              option.textContent = data.item;
              itemSelect.appendChild(option);
          });
      })
      .catch(error => {
          console.error("Error loading ItemCategoryMaster:", error);
      });
}

function populateCategory() {
    const itemSelect = document.getElementById('addItem');
    const categoryInput = document.getElementById('addCategory');
    const selectedItem = itemSelect.value;

    categoryInput.value = itemCategoryMap[selectedItem] || '';
}
