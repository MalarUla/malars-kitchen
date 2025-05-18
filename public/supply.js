// supply.js

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

function initFoodSupplySchedule() {
  document.getElementById('ordersManagementSection').style.display = 'none';
  document.getElementById('expenseTrackingSection').style.display = 'none';
  document.getElementById('adminControlsSection').style.display = 'none';
  document.getElementById('statsSection').style.display = 'none';
  document.getElementById('supplyScheduleSection').style.display = 'block';

  renderCalendar(currentMonth, currentYear);
  setupSupplyModal();
  setupMonthNavigation();
}

function renderCalendar(month, year) {
    const calendarBody = document.getElementById("calendarBody");
    const calendarMonthYear = document.getElementById("calendarMonthYear");
    calendarBody.innerHTML = "";
    const monthName = new Date(year, month).toLocaleString("default", { month: "long" });
    calendarMonthYear.textContent = `${monthName} ${year}`;
  
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Shift Sunday to end
    const daysInMonth = new Date(year, month + 1, 0).getDate();
  
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weekdaysRow = document.createElement("tr");
    weekdays.forEach(day => {
      const th = document.createElement("th");
      th.textContent = day;
      weekdaysRow.appendChild(th);
    });
    calendarBody.appendChild(weekdaysRow);
  
    let date = 1;
    for (let i = 0; i < 6; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 7; j++) {
        const cell = document.createElement("td");
  
        const cellIndex = i * 7 + j;
        if (cellIndex < firstDay || date > daysInMonth) {
          cell.innerHTML = "";
        } else {
          const cellDate = new Date(year, month, date);
          cell.classList.add("date-cell");
          cell.innerHTML = `<div class="date-number">${date}</div>`;
  
          if (isToday(cellDate)) {
            cell.classList.add("today");
          }
  
          cell.addEventListener("click", () => {
            openSupplyModal(cellDate, cell);
          });
  
          loadSupplyItemsForDate(cell, cellDate);
  
          date++;
        }
  
        row.appendChild(cell);
      }
      calendarBody.appendChild(row);
  
      if (date > daysInMonth) break;
    }
}


function setupMonthNavigation() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    renderCalendar(currentMonth, currentYear);
  });
}

function setupSupplyModal() {
  document.getElementById('closeModal').addEventListener('click', closeSupplyModal);
  document.getElementById('cancelSupplySelection').addEventListener('click', closeSupplyModal);

  document.getElementById('submitSupplySelection').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[name="foodItem"]:checked');
    const selectedItems = Array.from(checkboxes).map(cb => cb.value);

    if (selectedDate) {
      const dateKey = selectedDate.toISOString().split('T')[0];
      db.collection('FoodSupply').doc(dateKey).set({ items: selectedItems }).then(() => {
        renderCalendar(currentMonth, currentYear);
        closeSupplyModal();
      });
    }
  });
}

function openSupplyModal(date, cell) {
  selectedDate = date;
  document.getElementById('modalDate').textContent = date.toDateString();
  document.getElementById('supplyModal').style.display = 'flex';

  db.collection('MenuItems').get().then(snapshot => {
    const items = snapshot.docs.map(doc => doc.id);
    const list = document.getElementById('foodItemList');
    list.innerHTML = '';

    const dateKey = date.toISOString().split('T')[0];
    db.collection('FoodSupply').doc(dateKey).get().then(doc => {
      const selectedItems = doc.exists ? doc.data().items || [] : [];

      items.forEach(item => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'foodItem';
        checkbox.value = item;
        checkbox.checked = selectedItems.includes(item);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + item));
        list.appendChild(label);
        list.appendChild(document.createElement('br'));
      });
    });
  });
}

function closeSupplyModal() {
  document.getElementById('supplyModal').style.display = 'none';
  selectedDate = null;
}

function loadSupplyItemsForDate(cell, dateObj) {
  const dateKey = dateObj.toISOString().split('T')[0];

  db.collection('FoodSupply').doc(dateKey).get().then(doc => {
    if (doc.exists && doc.data().items.length > 0) {
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'selected-items';
      itemsDiv.innerText = doc.data().items.join(', ');
      cell.appendChild(itemsDiv);
    }
  });
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}
