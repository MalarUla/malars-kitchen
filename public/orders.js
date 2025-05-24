let ordersData = [];
let editedRows = []; // To track rows that have been edited
let hasUnsavedChanges = false;

const todayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US');
};

function manageOrders() {
    console.log("enter manageOrders....")
    document.getElementById('expenseTrackingSection').style.display = 'none';
    document.getElementById('adminControlsSection').style.display = 'none';
    document.getElementById('ordersManagementSection').style.display = 'block'
    document.getElementById('statsSection').style.display = 'none'
    document.getElementById("updateOrderBtn").disabled = true;
    // Fetch orders only once, if not loaded
    if (ordersData.length === 0) {
        fetchAndRenderOrders();
    } else {
        filteredOrders();
    }
    console.log("exit manageOrders....")
}

async function fetchAndRenderOrders() {

    console.log("enter fetchAndRenderOrders....")
    try {
    const snapshot = await db.collection('Orders').get();
    ordersData = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id; // Add document ID to data
        ordersData.push(data);
    });

    console.log(ordersData)

    renderOrdersToTable(ordersData); 

    filteredOrders(); // Render table based on default filters (e.g., "Ordered" status)

    } catch (error) {
        console.error("Error fetching orders:", error);
    }

    console.log("exit fetchAndRenderOrders....")
}

function renderOrdersToTable(orders) {
    console.log("enter renderOrdersToTable....")
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
      const priceNumber = parseFloat(order.price);
      const price = !isNaN(priceNumber) ? '$' + priceNumber.toFixed(2) : '';

      row.dataset.id = order.id || '';

      row.innerHTML = `
        <td><input type="checkbox" class="rowCheckbox" data-index="${order.id}"></td>
        <td data-key="name">${order.name || ''}</td>
        <td data-key="phone">${order.phone || ''}</td>
        <td data-key="email">${order.email || ''}</td>
        <td data-key="item">${order.item || ''}</td>
        <td data-key="quantity">${order.quantity || ''}</td>
        <td data-key="price">${price}</td>
        <td class="order-status">${getSelectHTML("order-status", ["Ordered", "In Prep", "Ready", "Delivered", "Cancelled"], order.orderStatus)}</td>
        <td data-key="orderDate">${orderDate}</td>
        <td class="payment-status">${getSelectHTML("payment-status", ["Pending", "Partially Received", "Fully Received"], order.paymentStatus)}</td>
        <td class="payment-received-date" data-key="paymentReceivedDate">${payRecDate}</td>
        <td class="payment-method">${getSelectHTML("payment-method", ["", "Cash", "Bank Transfer"], order.paymentMethod)}</td>
        <td class="payment-reference" contenteditable="true" data-key="paymentReference">${order.paymentReference || ''}</td>
        <td data-key="comments">${order.comments || ''}</td>
        <td class="additional-details" contenteditable="true" data-key="additionalDetails">${order.additionalDetails || ''}</td>
        <td data-key="discount">${order.discount || ''}</td>
        <td data-key="discountPrice">${order.discountPrice || ''}</td>
     `;
      tableBody.appendChild(row);
    });

    console.log(tableBody)

    // 🔥 Enable editing behavior and tracking after rows are rendered
    enableInCellEditing();

    calculateOrderIncomeSummaries(orders);

    console.log("exit renderOrdersToTable....")
}

function getSelectHTML(className, options, selectedValue) {
    console.log("enter getSelectHTML....")
    let html = `<select class="${className}">`;
    options.forEach(opt => {
        const selected = opt === selectedValue ? 'selected' : '';
        html += `<option value="${opt}" ${selected}>${opt}</option>`;
    });
    html += '</select>';
    console.log("exit getSelectHTML....")
    return html;
}

function getDateInputHTML(className, dateValue) {
    const input = document.createElement("input");
    input.type = "date";
    input.className = className;

    const maxDate = new Date().toISOString().split("T")[0]; // today
    input.max = maxDate;

    if (dateValue instanceof Date) {
        input.value = dateValue.toISOString().split("T")[0]; // format as yyyy-mm-dd
    } else if (typeof dateValue === 'string') {
        input.value = dateValue;
    }

    return input.outerHTML;
}


function enableInCellEditing() {
    console.log("enter enableInCellEditing....")
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
                    const referenceCell = row.querySelector('[data-key="paymentReference"]');
                    if (referenceCell) referenceCell.textContent = 'NA';
                }

                if (select.classList.contains('payment-status')) {
                    const val = select.value;
                    const payDateCell = row.querySelector('[data-key="paymentReceivedDate"]');
                
                    if ((val === 'Partially Received' || val === 'Fully Received') && payDateCell) {
                        payDateCell.textContent = todayDateString();
                    } else if (payDateCell ) {
                        payDateCell.textContent = '';  // Clear date if user changes back to Pending
                    }
                }
                markRowAsEdited(row);
                
            });
        });
    });

    // Attach editable behavior to paymentReceivedDate
    Array.from(rows).forEach(row => {
        const dateCell = row.querySelector('[data-key="paymentReceivedDate"]');
        if (!dateCell) return;

        dateCell.addEventListener('click', () => {
            // Prevent multiple inputs
            if (dateCell.querySelector("input")) return;

            const currentDateText = dateCell.textContent.trim();
            const currentDate = currentDateText ? new Date(currentDateText) : new Date();
            const formatted = currentDate.toISOString().split("T")[0];

            const input = document.createElement("input");
            input.type = "date";
            input.className = "date-input";
            input.max = new Date().toISOString().split("T")[0];  // disallow future dates
            input.value = formatted;

            dateCell.textContent = '';
            dateCell.appendChild(input);
            input.focus();

            input.addEventListener("blur", () => {
                const selected = input.value;
                if (selected) {
                    const display = new Date(selected).toLocaleDateString();
                    dateCell.textContent = display;
                    dateCell.setAttribute("data-date-value", selected);  // save raw value
                } else {
                    dateCell.textContent = '';
                    dateCell.removeAttribute("data-date-value");
                }
                markRowAsEdited(row);
            });
        });
    });

    // Inject dropdowns in place of plain text
    makeTableEditable();
    console.log("exit enableInCellEditing....")
}

function markRowAsEdited(row) {

    console.log("enter markRowAsEdited....")
    row.querySelector('input[type="checkbox"]').checked = true;
    row.classList.add('edited-row'); // add a class for styling

    if (!editedRows.includes(row)) {
        editedRows.push(row);
    }
    console.log("editedRows", editedRows)
    hasUnsavedChanges = true;
    document.getElementById("saveBtn").disabled = false;

    console.log("exit markRowAsEdited....")
}

function makeTableEditable() {
    console.log("enter makeTableEditable....")
    const tableBody = document.getElementById("ordersManagementTableBody");
    const rows = tableBody.getElementsByTagName("tr");

    Array.from(rows).forEach(row => {
        // Set contenteditable attributes for editable fields
        const editableClasses = ['payment-received-date', 'payment-reference', 'additional-details'];
        editableClasses.forEach(cls => {
            const cell = row.querySelector(`.${cls}`);
            if (cell) {
                cell.setAttribute('contenteditable', 'true');
                cell.addEventListener('input', () => markRowAsEdited(row));
            }
        });

        // Attach dropdown change listeners (already initialized by getSelectHTML)
        const selectElements = row.querySelectorAll('select');
        selectElements.forEach(select => {
            select.addEventListener('change', () => {
                const referenceCell = row.querySelector('[data-key="paymentReference"]');
                if (select.classList.contains('payment-method')) {
                    if (select.value === 'Cash') {
                        if (referenceCell) referenceCell.textContent = 'NA';
                    } else {
                        if (referenceCell) referenceCell.textContent = '';
                    }
                }
                
                if (select.classList.contains('payment-status')) {
                    const val = select.value;
                    const payDateCell = row.querySelector('[data-key="paymentReceivedDate"]');
                
                    if ((val === 'Partially Received' || val === 'Fully Received') && payDateCell) {
                        payDateCell.textContent = todayDateString();
                    } else if (payDateCell ) {
                        payDateCell.textContent = '';  // Clear date if user changes back to Pending
                    }
                }
                markRowAsEdited(row);
            });
        });
    });

    console.log("exit makeTableEditable....")
}

function filteredOrders() {
    console.log("enter filteredOrders....")

    const statusElem = document.getElementById("filterStatusTop");
    const paymentStatusElem = document.getElementById("filterPaymentStatusTop");
    const dateFromElem = document.getElementById("filterDateFromTop");
    const dateToElem = document.getElementById("filterDateToTop");

    const status = statusElem ? [statusElem.value] : [];
    const paymentStatus = paymentStatusElem ? [paymentStatusElem.value] : [];
    const dateFrom = dateFromElem ? dateFromElem.value : '';
    const dateTo = dateToElem ? dateToElem.value : '';

    console.log("Status Filter:", status);
    console.log("Payment Status Filter:", paymentStatus);

    const rows = document.querySelectorAll("#ordersManagementTableBody tr");

    rows.forEach(row => {
        let rowStatus = '';
        let rowPaymentStatus = '';

        // 🔁 Handle dropdown cells
        const statusSelect = row.querySelector('.order-status select');
        const paymentStatusSelect = row.querySelector('.payment-status select');

        if (statusSelect) {
            rowStatus = statusSelect.value.trim();
        } else {
            rowStatus = row.querySelector('[data-key="orderStatus"]')?.textContent?.trim() || '';
        }

        if (paymentStatusSelect) {
            rowPaymentStatus = paymentStatusSelect.value.trim();
        } else {
            rowPaymentStatus = row.querySelector('[data-key="paymentStatus"]')?.textContent?.trim() || '';
        }

        const rowDate = row.querySelector('[data-key="orderDate"]')?.textContent?.trim();

        let isVisible = true;

        if (status.length && status[0] && status[0] !== rowStatus) isVisible = false;
        if (paymentStatus.length && paymentStatus[0] && paymentStatus[0] !== rowPaymentStatus) isVisible = false;
        if (dateFrom && new Date(rowDate) <= new Date(dateFrom)) isVisible = false;
        if (dateTo && new Date(rowDate) >= new Date(dateTo)) isVisible = false;

        row.style.display = isVisible ? "" : "none";
    });

    console.log("exit filteredOrders....")
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("entering addEventListener....")
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
                    paymentReceivedDate: getFormattedFirestoreDate(row.cells[3].innerText.trim()),
                    paymentMethod: row.cells[4].innerText.trim(),
                    paymentReference: row.cells[5].innerText.trim(),
                    additionalDetails: row.cells[6].innerText.trim(),
                };
            });

            // Save data to backend
            saveDataToBackend(updatedData);
            
            // Refresh the table after saving
            //refreshTable();

            editedRows = [];
            hasUnsavedChanges = false;
            saveBtn.disabled = true;
        });
    } else {
        console.error("Save button not found!");
    }

    // ✅ Setup logic for updateOrderBtn
    const updateOrderBtn = document.getElementById("updateOrderBtn");
    updateOrderBtn.disabled = true;
    if (updateOrderBtn) {
        // Function to check selected checkboxes
        function updateUpdateOrderBtnState() {
            const checkboxes = document.querySelectorAll('#ordersManagementTableBody input[type="checkbox"]:checked');
            updateOrderBtn.disabled = (checkboxes.length !== 1);
        }

        // Listen to any checkbox changes
        document.addEventListener("change", function (e) {
            if (e.target.matches('#ordersManagementTableBody input[type="checkbox"]')) {
                updateUpdateOrderBtnState();
            }
        });

        // Optionally check initial state (if any checkboxes are preloaded)
        updateUpdateOrderBtnState();
    }


    console.log("exit addEventListener....")
});

function initOrderTableSort() {
    console.log("entering initOrderTableSort....")
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

    console.log("exit initOrderTableSort....")
}

function getFormattedFirestoreDate(dateStr) {
    console.log("entering getFormattedFirestoreDate....")
    if (!dateStr) return null;
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate)) return null;
    return firebase.firestore.Timestamp.fromDate(parsedDate);
    console.log("exit getFormattedFirestoreDate....")
}

function sortOrderTableByKey(key, ascending = true) {
    console.log("entering sortOrderTableByKey....")
    const tbody = document.getElementById("ordersManagementTableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.sort((a, b) => {
        const valA = a.querySelector(`[data-key="${key}"]`)?.textContent?.trim() || "";
        const valB = b.querySelector(`[data-key="${key}"]`)?.textContent?.trim() || "";
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));
    console.log("exit sortOrderTableByKey....")
}

function resetFilters() {
    document.getElementById("filterStatusTop").value = "Ordered";
    document.getElementById("filterPaymentStatusTop").selectedIndex = 0;
    document.getElementById("filterDateFromTop").value = "";
    document.getElementById("filterDateToTop").value = "";

    filteredOrders(); // re-show all rows
}

function getValue(className, row) {
    console.log("enter getValue....", className)
    const cell = row.querySelector(`.${className}`);
    console.log("cell....", cell)
    if (!cell) return '';

    const input = cell.querySelector("input, select");
    console.log("input....", input)
    if (input) {
        console.log("inputval", input.value)
        console.log("exit getValue....")
        return input.value;
    }
    
    // 🔥 Special case for payment-received-date with raw date stored in attribute
    if (className === "payment-received-date") {
        const raw = cell.getAttribute("data-date-value");
        console.log("raw date attribute:", raw);
        return raw || cell.textContent.trim(); // fallback to visible text if no attribute
    }

    console.log("cell content", cell.textContent.trim())
    return cell.textContent.trim();
}


function saveDataToBackend() {
    console.log("enter saveDataToBackend....")
    const batch = db.batch();
    let hasError = false;

    try {
        for (let row of editedRows) {
            const docId = row.dataset.id;

            const paymentDateRaw = getValue("payment-received-date", row);

            const updatedData = {
                orderStatus: getValue("order-status", row),
                paymentStatus: getValue("payment-status", row),
                paymentReceivedDate: paymentDateRaw ? firebase.firestore.Timestamp.fromDate(new Date(paymentDateRaw)) : null,
                paymentMethod: getValue("payment-method", row),
                paymentReference: getValue("payment-reference", row),
                additionalDetails: getValue("additional-details", row)
            };

            // Check if orderStatus exists before proceeding
            if (!updatedData.orderStatus) {
                hasError = true;
                continue; // Skip this entry if missing orderStatus
            }

            const docRef = db.collection("Orders").doc(docId);
            batch.update(docRef, updatedData);
        }

        if (!hasError) {
            batch.commit()
                .then(() => {
                    alert("Saved successfully.");
                    
                    // Uncheck checkboxes and reset selection
                    for (let row of editedRows) {
                        const checkbox = row.querySelector('input[type="checkbox"]');
                        if (checkbox) checkbox.checked = false;
                        row.classList.remove('edited-row');  // <-- Remove highlight class
                    }

                    editedRows = [];
                    document.getElementById("saveBtn").disabled = true;
                    //refreshTable();

                    // 👇 Fetch orders and render the full table
                    fetchAndRenderOrders()

                })
                .catch(error => console.error("Error saving data:", error));
        }
    } catch (error) {
        console.error("Error in saveDataToBackend:", error);
    }

    console.log("exit saveDataToBackend....")
}

function refreshTable() {
    console.log("enter refreshTable....")
    db.collection('Orders').get().then(snapshot => {
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
            const paymentMethodCell = createSelectCell("payment-method", ["", "Cash", "Bank Transfer"], order.paymentMethod);

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

    console.log("exit refreshTable....")
}

function createSelectCell(className, options, selectedValue = '') {
    console.log("enter createSelectCell....")
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
    console.log("exit createSelectCell....")
    return cell;
}

function createEditableCell(className, value) {
    console.log("enter createEditableCell....")
    const cell = document.createElement("td");
    cell.className = className;

    if (className === "payment-received-date") {
        const input = document.createElement("input");
        input.type = "date";
        input.max = new Date().toISOString().split("T")[0]; // today's date
        input.value = value;

        input.addEventListener("change", () => {
            markRowAsEdited(cell.closest("tr"));
        });

        cell.appendChild(input);
    } else {
        cell.contentEditable = true;
        cell.textContent = value;

        cell.addEventListener("input", () => {
            markRowAsEdited(cell.closest("tr"));
        });
    }

    console.log("exit createEditableCell....")
    return cell;
}


function markEditable(row) {
    console.log("enter markEditable....")
    const classes = ['payment-received-date', 'payment-reference', 'additional-details'];
    classes.forEach(cls => {
        const cell = row.querySelector(`.${cls}`);
        if (cell) {
            cell.addEventListener('input', () => markRowAsEdited(row));
        }
    });
    console.log("exit markEditable....")
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

    // Reset discount checkbox and input
    const discountCheckbox = document.getElementById("modalDiscountCheckbox");
    const discountInput = document.getElementById("modalDiscountPriceInput");

    if (discountCheckbox) discountCheckbox.checked = false;
    if (discountInput) {
        discountInput.style.display = "none";
        discountInput.value = "";
    }
    
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
        const rowData = Array.from(cells).map(cell => {
        const select = cell.querySelector("select");
        if (select) {
            // Get only selected option text
            return select.options[select.selectedIndex].text.trim();
        }
        return cell.textContent.trim();
        });
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

function openUpdateOrderPopup() {
    const modal = document.getElementById("updateOrderModal");
    const overlay = document.getElementById("orderModalOverlay");

    const selectedCheckbox = document.querySelector('#ordersManagementTableBody input[type="checkbox"]:checked');
    if (!selectedCheckbox) {
        alert("Please select a row to update.");
        return;
    }

    const row = selectedCheckbox.closest("tr");
    const rowIndex = row.rowIndex - 1; // exclude header row
    document.getElementById("updateOrderRowIndex").value = rowIndex;

    modal.style.display = "block";
    overlay.style.display = "block";

    setTimeout(() => {
        modal.classList.add("show");
    }, 10);

    // Reset the form first
    document.getElementById("updateOrderForm").reset();
    document.getElementById("updatePrice").value = "";

    // Prefill form fields from row
    document.getElementById("updateCustomerName").value = row.querySelector('[data-key="name"]').textContent.trim();
    document.getElementById("updateContactPhone").value = row.querySelector('[data-key="phone"]').textContent.trim();
    document.getElementById("updateContactEmail").value = row.querySelector('[data-key="email"]').textContent.trim();
    document.getElementById("updateQuantity").value = row.querySelector('[data-key="quantity"]').textContent.trim();
    document.getElementById("updatePrice").value = row.querySelector('[data-key="price"]').textContent.trim();
    const rawDate = row.querySelector('[data-key="orderDate"]').textContent.trim();
    document.getElementById("updateOrderDate").value = formatDateForInput(rawDate);

    document.getElementById("updateComments").value = row.querySelector('[data-key="comments"]').textContent.trim();

    const selectedItem = row.querySelector('[data-key="item"]').textContent.trim();
    window.menuItems = window.menuItems || [];

    if (window.menuItems.length === 0) {
        console.log("📭 menuItems empty. Calling loadFoodItems...");
        loadFoodItems({
            skipRenderMenu: true,
            targetSelectId: "updateFoodItem",
            selectedValue: selectedItem
        });
    } else {
        populateFoodItems("updateFoodItem", window.menuItems, selectedItem);
    }

    // 🔽 New logic for discount prefill
    const discountCell = row.querySelector('[data-key="discount"]');
    const discountPriceCell = row.querySelector('[data-key="discountPrice"]');
    
    const discountValue = discountCell ? discountCell.textContent.trim() : "N";
    const discountPriceValue = discountPriceCell ? discountPriceCell.textContent.trim() : "";

    const discountCheckbox = document.getElementById("updateDiscountCheckbox");
    const discountInput = document.getElementById("updateDiscountPriceInput");

    if (discountValue === "Y") {
        discountCheckbox.checked = true;
        discountInput.style.display = "inline-block";
        discountInput.value = discountPriceValue || "";
    } else {
        discountCheckbox.checked = false;
        discountInput.style.display = "none";
        discountInput.value = "";
    }
}

function populateFoodItems(selectId, items, selectedValue = "") {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select</option>';
    items.forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        if (item.name === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function formatDateForInput(dateStr) {
    // Try to parse human-readable format like '15 May 2025'
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate)) return "";
  
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
  
    return `${year}-${month}-${day}`; // For <input type="date">
}  

function submitUpdatedOrder() {
    const rowIndex = parseInt(document.getElementById("updateOrderRowIndex").value);
    const tableBody = document.getElementById("ordersManagementTableBody");
    const row = tableBody.rows[rowIndex];

    if (!row) {
        alert("Could not find the selected row.");
        return;
    }

    const orderId = row.getAttribute("data-id"); // or data-order-id
    if (!orderId) {
        alert("Missing order ID. Cannot update backend.");
        return;
    }

    let uPrice = document.getElementById("updatePrice").value;
    let numericPrice = parseFloat(uPrice.replace(/[^\d.]/g, ''));
    const orderDateStr = document.getElementById("updateOrderDate").value;
    let orderDateObj;
    if (orderDateStr) {
        const [year, month, day] = orderDateStr.split('-').map(Number);
        orderDateObj = new Date(year, month - 1, day); // month is 0-indexed
        console.log("Corrected order date:", orderDateObj);
    }

    const isDiscountChecked = document.getElementById("updateDiscountCheckbox").checked;
    const discountPrice = isDiscountChecked? parseFloat(document.getElementById("updateDiscountPriceInput").value || "0"): 0.0;

    const updatedData = {
        name: document.getElementById("updateCustomerName").value,
        phone: document.getElementById("updateContactPhone").value,
        email: document.getElementById("updateContactEmail").value,
        item: document.getElementById("updateFoodItem").value,
        quantity: parseInt(document.getElementById("updateQuantity").value),
        price: numericPrice,
        orderDate: firebase.firestore.Timestamp.fromDate(orderDateObj),
        updatedDate: firebase.firestore.FieldValue.serverTimestamp(),
        comments: document.getElementById("updateComments").value,
        discount: isDiscountChecked ? "Y" : "N",
        discountPrice: discountPrice
    };

    const db = firebase.firestore();
    db.collection("Orders").doc(orderId).update(updatedData)
        .then(() => {
            console.log("✅ Order updated in Firestore:", orderId);
            closeModal("updateOrderModal");
        
            // Refresh the entire table
            fetchAndRenderOrders(); // Replace with your actual function to reload table
            document.getElementById("updateOrderBtn").disabled = true;
        })
        .catch((error) => {
            console.error("❌ Error updating order:", error);
            alert("Failed to update the order. Please try again.");
        });
}

function formatDateForDisplay(dateStr) {
    // yyyy-mm-dd → dd-mm-yyyy
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    document.getElementById("orderModalOverlay").style.display = "none";
}

function updateUpdateOrderButtonState() {
    const checkboxes = document.querySelectorAll('#ordersManagementTableBody input[type="checkbox"]:checked');
    const updateButton = document.getElementById("updateOrderBtn");

    if (checkboxes.length === 1) {
        updateButton.disabled = false;
    } else {
        updateButton.disabled = true;
    }
}

function toggleDiscount(checkbox) {
    const prefix = checkbox.id.startsWith("modal") ? "modal" : "update";
    const discountInput = document.getElementById(`${prefix}DiscountPriceInput`);
    const foodSelect = document.getElementById(`${prefix}FoodItem`);
  
    if (checkbox.checked) {
      // Show field
      discountInput.style.display = "inline-block";
  
      // Autofill discount price from menu
      const foodId = foodSelect.value;
      //const foodItem = foodMenu.find(item => item.id === foodId);
      const foodItem = window.menuItems.find(item => item.id === foodId);
      if (foodItem && foodItem.discountPrice) {
        discountInput.value = foodItem.discountPrice;
      }
    } else {
      // Hide field and reset
      discountInput.style.display = "none";
      discountInput.value = '';
    }
  
    // Recalculate price
    calculatePrice(foodSelect);
}

function calculateOrderIncomeSummaries(orders) {
    let totalIncome = 0;
    let currentMonthIncome = 0;
  
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
  
    orders.forEach(order => {
      const price = parseFloat(order.price) || 0;
      totalIncome += price;
  
      const orderDate = order.paymentReceivedDate?.toDate?.() || new Date(order.paymentReceivedDate);
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        currentMonthIncome += price;
      }
    });
  
    document.getElementById("totalOrderIncome").textContent = totalIncome.toFixed(2);
    document.getElementById("currentMonthOrderIncome").textContent = currentMonthIncome.toFixed(2);
}
  
  