let ordersData = [];
let editedRows = []; // To track rows that have been edited
let hasUnsavedChanges = false;


document.addEventListener("DOMContentLoaded", function () {
    // Set default "Ordered" status
    document.getElementById("filterStatusTop").value = "Ordered";

    initOrderTableSort();
    document.getElementById("ordersSearchBtn").addEventListener("click", filteredOrders);
    document.getElementById("ordersResetBtn").addEventListener("click", resetFilters);

    // Ensure the save button is present and set up the event listener
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    if (saveBtn) {
        saveBtn.addEventListener("click", function() {
            // Loop through edited rows and get the edited values
            const updatedData = editedRows.map(row => {
                return {
                    id: row.dataset.id, 
                    orderStatus: row.cells[1].innerText.trim(),
                    paymentStatus: row.cells[2].innerText.trim(),
                    paymentReceivedDate: row.cells[3].innerText.trim(),
                    paymentMethod: row.cells[4].innerText.trim(),
                    paymentReference: row.cells[5].innerText.trim(),
                    additionalDetails: row.cells[6].innerText.trim(),
                };
            });

            // Save data to backend
            saveDataToBackend(updatedData);
            
            // Refresh the table after saving
            refreshTable();

            editedRows = [];
            hasUnsavedChanges = false;
            saveBtn.disabled = true;
        });
    } else {
        console.error("Save button not found!");
    }
});

function initOrderTableSort() {
    const headers = document.querySelectorAll("#ordersTable thead th[data-key]");
    headers.forEach((header) => {
        header.addEventListener("click", function () {
        const key = this.getAttribute("data-key");
        const isAsc = this.classList.toggle("asc");
        headers.forEach(h => h !== this && h.classList.remove("asc", "desc"));
        this.classList.toggle("desc", !isAsc);
        sortOrderTableByKey(key, isAsc);
        });
    });
}

function sortOrderTableByKey(key, ascending = true) {
    const tbody = document.getElementById("ordersManagementTableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.sort((a, b) => {
        const valA = a.querySelector(`[data-key="${key}"]`)?.textContent?.trim() || "";
        const valB = b.querySelector(`[data-key="${key}"]`)?.textContent?.trim() || "";
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));
}

function filteredOrders() {
    const statusElem = document.getElementById("filterStatusTop");
    const paymentStatusElem = document.getElementById("filterPaymentStatusTop");
    const dateFromElem = document.getElementById("filterDateFromTop");
    const dateToElem = document.getElementById("filterDateToTop");

    const status = statusElem ? [statusElem.value] : [];
    const paymentStatus = paymentStatusElem ? [paymentStatusElem.value] : [];
    const dateFrom = dateFromElem ? dateFromElem.value : '';
    const dateTo = dateToElem ? dateToElem.value : '';

    const rows = document.querySelectorAll("#ordersManagementTableBody tr");

    rows.forEach(row => {
        const rowStatus = row.querySelector('[data-key="orderStatus"]')?.textContent?.trim();
        const rowPaymentStatus = row.querySelector('[data-key="paymentStatus"]')?.textContent?.trim();
        const rowDate = row.querySelector('[data-key="orderDate"]')?.textContent?.trim();

        let isVisible = true;

        if (status.length && status[0] && status[0] !== rowStatus) isVisible = false;
        if (paymentStatus.length && paymentStatus[0] && paymentStatus[0] !== rowPaymentStatus) isVisible = false;
        if (dateFrom && new Date(rowDate) <= new Date(dateFrom)) isVisible = false;
        if (dateTo && new Date(rowDate) >= new Date(dateTo)) isVisible = false;

        row.style.display = isVisible ? "" : "none";
    });
}

function resetFilters() {
    document.getElementById("filterStatusTop").value = "Ordered";
    document.getElementById("filterPaymentStatusTop").selectedIndex = 0;
    document.getElementById("filterDateFromTop").value = "";
    document.getElementById("filterDateToTop").value = "";

    filteredOrders(); // re-show all rows
}


function manageOrders() {
    document.getElementById('expenseTrackingSection').style.display = 'none';
    document.getElementById('adminControlsSection').style.display = 'none';
    document.getElementById('ordersManagementSection').style.display = 'block'
    // Fetch orders only once, if not loaded
    if (ordersData.length === 0) {
        fetchAndRenderOrders();
    } else {
        filteredOrders();
    }
}


async function fetchAndRenderOrders() {
    try {
      const snapshot = await db.collection('Orders').get();
      ordersData = [];
  
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id; // Add document ID to data
        ordersData.push(data);
      });

      renderOrdersToTable(ordersData); 
  
      filteredOrders(); // Render table based on default filters (e.g., "Ordered" status)
  
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
}


function renderOrdersToTable(orders) {
    const tableBody = document.getElementById("ordersManagementTableBody");
    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }
    tableBody.innerHTML = '';
  
    orders.forEach((order, index) => {
      const row = document.createElement('tr');
      const orderDate = order.orderDate?.toDate ? order.orderDate.toDate().toLocaleDateString() : '';
      const payRecDate = order.paymentReceivedDate?.toDate ? order.paymentReceivedDate.toDate().toLocaleDateString() : '';
      const price = order.price ? '$' + order.price.toFixed(2) : '';

      row.dataset.id = order.id || '';

      row.innerHTML = `
        <td><input type="checkbox" class="rowCheckbox" data-index="${order.id}"></td>
        <td data-key="name">${order.name || ''}</td>
        <td data-key="phone">${order.phone || ''}</td>
        <td data-key="email">${order.email || ''}</td>
        <td data-key="item">${order.item || ''}</td>
        <td data-key="quantity">${order.quantity || ''}</td>
        <td data-key="price">${price}</td>
        <td contenteditable="true" data-key="orderStatus">${order.orderStatus || ''}</td>
        <td data-key="orderDate">${orderDate}</td>
        <td contenteditable="true" data-key="paymentStatus">${order.paymentStatus || ''}</td>
        <td contenteditable="true" data-key="paymentReceivedDate">${payRecDate}</td>
        <td contenteditable="true" data-key="paymentMethod">${order.paymentMethod || ''}</td>
        <td contenteditable="true" data-key="paymentReference">${order.paymentReference || ''}</td>
        <td data-key="comments">${order.comments || ''}</td>
        <td contenteditable="true" data-key="additionalDetails">${order.additionalDetails || ''}</td>
     `;
      tableBody.appendChild(row);
    });

    // 🔥 Enable editing behavior and tracking after rows are rendered
    enableInCellEditing();
}

function enableInCellEditing() {
    const tableBody = document.getElementById("ordersManagementTableBody");
    const rows = tableBody.getElementsByTagName("tr");

    Array.from(rows).forEach(row => {
        const editableCells = row.querySelectorAll('[contenteditable="true"]');
        editableCells.forEach(cell => {
            cell.addEventListener('input', () => {
                markRowAsEdited(row);
            });
        });

        // Attach event listeners to select dropdowns
        const selectElements = row.querySelectorAll('select');
        selectElements.forEach(select => {
            select.addEventListener('change', (e) => {
                // If paymentMethod changes to 'Cash', auto-set paymentReference to 'NA'
                if (select.classList.contains('payment-method') && select.value === 'Cash') {
                    const referenceCell = row.querySelector('.payment-reference');
                    if (referenceCell) referenceCell.textContent = 'NA';
                }

                markRowAsEdited(row);
            });
        });
    });

    // Inject dropdowns in place of plain text
    makeTableEditable();
}

function markRowAsEdited(row) {
    row.querySelector('input[type="checkbox"]').checked = true;
    if (!editedRows.includes(row)) {
        editedRows.push(row);
    }
    hasUnsavedChanges = true;
    document.getElementById("saveBtn").disabled = false;
}

function makeTableEditable() {
    const tableBody = document.getElementById("ordersManagementTableBody");
    const rows = tableBody.getElementsByTagName("tr");

    Array.from(rows).forEach(row => {
        setSelectCell(row, 'order-status', ["Ordered", "In Prep", "Ready", "Delivered", "Cancelled"]);
        setSelectCell(row, 'payment-status', ["Pending", "Partially Received", "Fully Received"]);
        setSelectCell(row, 'payment-method', ["Cash", "Bank Transfer"]);

        const editableClasses = ['payment-received-date', 'payment-reference', 'additional-details'];
        editableClasses.forEach(cls => {
            const cell = row.querySelector(`.${cls}`);
            if (cell) {
                cell.setAttribute('contenteditable', 'true');
                cell.addEventListener('input', () => markRowAsEdited(row));
            }
        });
    });
}

function setSelectCell(row, className, options, selectedValue = '') {
    const cell = row.querySelector(`.${className}`);
    if (!cell) return;

    const select = document.createElement("select");
    select.className = className;

    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        markRowAsEdited(row);
        if (className === "payment-method" && select.value === "Cash") {
            const refCell = row.querySelector(".payment-reference");
            if (refCell) refCell.textContent = "NA";
        }
    });

    cell.innerHTML = "";
    cell.appendChild(select);
}


function markRowAsEdited(row) {
    row.querySelector('input[type="checkbox"]').checked = true;
    if (!editedRows.includes(row)) {
        editedRows.push(row);
    }
    hasUnsavedChanges = true;
    document.getElementById("saveBtn").disabled = false;
}

function saveDataToBackend() {
    const batch = db.batch();
    let hasError = false;

    try {
        for (let row of editedRows) {
            const docId = row.dataset.id;

            const getValue = (cls) => {
                const cell = row.querySelector(`.${cls}`);
                if (!cell) return '';
                const select = cell.querySelector('select');
                return select ? select.value : cell.textContent.trim();
            };

            const updatedData = {
                orderStatus: getValue("order-status"),
                paymentStatus: getValue("payment-status"),
                paymentReceivedDate: getValue("payment-received-date"),
                paymentMethod: getValue("payment-method"),
                paymentReference: getValue("payment-reference"),
                additionalDetails: getValue("additional-details")
            };

            // Check if orderStatus exists before proceeding
            if (!updatedData.orderStatus) {
                console.error(`Missing orderStatus for ${docId}`);
                hasError = true;
                continue; // Skip this entry if missing orderStatus
            }

            const docRef = db.collection("orders").doc(docId);
            batch.update(docRef, updatedData);
        }

        if (!hasError) {
            batch.commit()
                .then(() => {
                    alert("Saved successfully.");
                    editedRows = [];
                    document.getElementById("saveBtn").disabled = true;
                    refreshTable();
                })
                .catch(error => console.error("Error saving data:", error));
        }
    } catch (error) {
        console.error("Error in saveDataToBackend:", error);
    }
}


function refreshTable() {
    db.collection('orders').get().then(snapshot => {
        const tableBody = document.getElementById("ordersManagementTableBody");
        tableBody.innerHTML = "";

        snapshot.forEach(doc => {
            const order = doc.data();
            const row = document.createElement("tr");
            row.dataset.id = doc.id;

            row.innerHTML = `<td><input type="checkbox" class="select-row"></td>`;

            // Create dropdown cells
            const orderStatusCell = createSelectCell("order-status", ["Ordered", "In Prep", "Ready", "Delivered", "Cancelled"], order.orderStatus);
            const paymentStatusCell = createSelectCell("payment-status", ["Pending", "Partially Received", "Fully Received"], order.paymentStatus);
            const paymentMethodCell = createSelectCell("payment-method", ["Cash", "Bank Transfer"], order.paymentMethod);

            // Text-editable cells
            const receivedDateCell = createEditableCell("payment-received-date", order.paymentReceivedDate || '');
            const referenceCell = createEditableCell("payment-reference", order.paymentReference || '');
            const additionalDetailsCell = createEditableCell("additional-details", order.additionalDetails || '');

            row.appendChild(orderStatusCell);
            row.appendChild(paymentStatusCell);
            row.appendChild(receivedDateCell);
            row.appendChild(paymentMethodCell);
            row.appendChild(referenceCell);
            row.appendChild(additionalDetailsCell);

            // Add change tracking
            markEditable(row);
            tableBody.appendChild(row);
        });
    }).catch(err => console.error("Error refreshing table:", err));
}

function createSelectCell(className, options, selectedValue = '') {
    const cell = document.createElement("td");
    cell.className = className;

    const select = document.createElement("select");
    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        if (opt === selectedValue) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        markRowAsEdited(cell.closest("tr"));
        if (className === "payment-method" && select.value === "Cash") {
            const refCell = cell.closest("tr").querySelector(".payment-reference");
            if (refCell) refCell.textContent = "NA";
        }
    });

    cell.appendChild(select);
    return cell;
}

function createEditableCell(className, value) {
    const cell = document.createElement("td");
    cell.className = className;
    cell.contentEditable = true;
    cell.textContent = value;
    return cell;
}


function markEditable(row) {
    const classes = ['payment-received-date', 'payment-reference', 'additional-details'];
    classes.forEach(cls => {
        const cell = row.querySelector(`.${cls}`);
        if (cell) {
            cell.addEventListener('input', () => markRowAsEdited(row));
        }
    });
}

// Function to export table data to CSV
function exportOrdersToCSV() {
    const rows = document.querySelectorAll("#ordersTable tbody tr");
    let csvContent = "data:text/csv;charset=utf-8,";
  
    // Add table headers
    const headers = Array.from(document.querySelectorAll("#ordersTable thead th")).map(th => th.textContent);
    csvContent += headers.join(",") + "\n";
  
    // Add table rows
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      const rowData = Array.from(cells).map(cell => cell.textContent.trim());
      csvContent += rowData.join(",") + "\n";
    });
  
    // Create a downloadable link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "malarskitchen_orders.csv");
    link.click();
  }
  
  // Function to refresh data in the Google Sheet (you need to integrate Google Sheets API)
  function refreshOrdersGoogleSheet() {
    // Example logic for refreshing the Google Sheet (implement with Google Sheets API)
    console.log("Refreshing Google Sheet...");
  
    // Your Google Sheets API integration will go here
    // If you're using Firebase, for example, you can sync the table data to Google Sheets
  
    // Example: Update data to Google Sheets using Google Sheets API (this is a placeholder)
    const googleSheetData = [
      ["Name", "Phone", "Email", "Item", "Quantity", "Price", "Order Status", "Order Date", "Payment Status", "Payment Method", "Payment Reference", "Comments", "Additional Details"]
      // Add rows here as you need
    ];
  
    // Assuming you have a Sheets API call to update the Google Sheet
    // This would need your Google Sheets API key and OAuth flow for authentication
    // Update the sheet here with googleSheetData
  
    alert("Google Sheet refreshed!");
  }



  function openAddOrderPopup() {
    const modal = document.getElementById("addOrderModal");
    const overlay = document.getElementById("orderModalOverlay");
  
    modal.style.display = "block";
    overlay.style.display = "block";
  
    setTimeout(() => {
      modal.classList.add('show');
    }, 10); // trigger transition after slight delay
  
    // Reset form fields if needed
    document.getElementById("orderForm").reset();
    document.getElementById("modalPrice").value = "";
    
    window.menuItems = [];

    // Populate food items if not already loaded
    if (window.menuItems.length === 0) {
        console.log("📭 menuItems empty. Calling loadFoodItems...");
        loadFoodItems({ skipRenderMenu: true, targetSelectId: "modalFoodItem" });
    }
  }
  

  function closeAddOrderPopup() {
    const modal = document.getElementById("addOrderModal");
    const overlay = document.getElementById("orderModalOverlay");
  
    // Start fade-out animation
    modal.classList.remove('show');
  
    setTimeout(() => {
      modal.style.display = "none";
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";  // Ensure overlay doesn't block
      document.body.style.overflow = "auto"; // Re-enable scrolling if disabled
      
      // If you disabled interactivity on the main section, re-enable it
      const mainContent = document.getElementById("mainContent");
      if (mainContent) {
        mainContent.style.pointerEvents = "auto";
        mainContent.style.filter = "none";
      }

      // Remove modal-related classes if any
      document.body.classList.remove("modal-open");
        
      // Clear form fields AFTER closing
      document.getElementById("modalCustomerName").value = '';
      document.getElementById("modalContactEmail").value = '';
      document.getElementById("modalContactPhone").value = '';
      document.getElementById("modalFoodItem").value = '';
      document.getElementById("modalQuantity").value = '1';
      document.getElementById("modalPrice").value = '';
      document.getElementById("modalComments").value = '';
  
      // Optionally refresh orders table
      fetchAndRenderOrders();
    }, 400);
  }