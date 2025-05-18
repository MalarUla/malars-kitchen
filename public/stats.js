let monthlyComparisonChartInstance = null;

function initStats() {
    document.getElementById('ordersManagementSection').style.display = 'none'
    document.getElementById('expenseTrackingSection').style.display = 'none';
    document.getElementById('adminControlsSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'block'

    console.log("initStats")
    /*// Delay loadStatsAndCharts to let DOM render
    setTimeout(() => {
        loadStatsAndCharts();
    }, 100); // Small delay ensures canvas is in DOM and visible*/
    console.log("tab", document.getElementById('financialTab'))
    //if (!document.getElementById('financialTab')) {
        console.log("even coming here")
        //statsSection.innerHTML = renderStatsTabsHTML(); // injects tab HTML if not already present
        setupStatsTabs(); // binds event handlers
    //}
}

function loadStatsAndCharts() {
    fetchOrderData().then(data => {
        const orderStatusCounts = countByStatus(data, 'orderStatus');
        const paymentStatusCounts = countByStatus(data, 'paymentStatus');

        renderPieChart('orderStatusChart', 'Order Status Distribution', orderStatusCounts);
        renderPieChart('paymentStatusChart', 'Payment Status Distribution', paymentStatusCounts);
    });
}

async function fetchOrderData() {
    const snapshot = await db.collection('Orders').get();
    return snapshot.docs.map(doc => doc.data());
}
  
function countByStatus(data, key) {
    return data.reduce((acc, item) => {
        const value = item[key] || 'Unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}
  
function renderPieChart(canvasId, title, dataObj) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = Object.keys(dataObj);
    const values = Object.values(dataObj);
  
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          }
        }
      }
    });
}

//Monthly Reports


function loadMonthlySummary() {
    const year = document.getElementById('summaryYear').value;
    const type = document.getElementById('chartType').value;
    document.getElementById('noDataMessage').style.display = 'none';
  
    Promise.all([
      db.collection('Orders').get(),
      db.collection('Expense').get()
    ]).then(([ordersSnap, expensesSnap]) => {
      const orders = ordersSnap.docs.map(doc => doc.data());
      const expenses = expensesSnap.docs.map(doc => doc.data());

      console.log("Order", orders)
      console.log("Expense", expenses)
  
      const summary = buildMonthlySummaryData(orders, expenses, year);

      console.log("summary", summary)
  
      if (summary.totalOrders.every(val => val === 0) &&
          Object.values(summary.statusCounts).every(arr => arr.every(val => val === 0)) &&
          Object.values(summary.expenseByCategory).every(arr => arr.every(val => val === 0))) {
        document.getElementById('monthlySummaryChart').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'block';
        return;
      }
  
      document.getElementById('monthlySummaryChart').style.display = 'block';
      renderMonthlySummaryChart('monthlySummaryChart', summary, type);
    });
}

function buildMonthlySummaryData(orders, expenses, year) {
    const months = Array.from({ length: 12 }, (_, i) => i); // 0 = Jan, 11 = Dec
  
    const totalOrders = Array(12).fill(0);
    
    console.log("totalOrders", totalOrders)

    const statusCounts = {
      Ordered: Array(12).fill(0),
      'In Prep': Array(12).fill(0),
      Ready: Array(12).fill(0),
      Delivered: Array(12).fill(0),
      Cancelled: Array(12).fill(0)
    };
  
    const expenseByCategory = {}; // { Groceries: [], Packaging: [], etc. }
  
    // Process orders
    orders.forEach(o => {
      let date;
      if (o.orderDate && typeof o.orderDate.toDate === 'function') {
        date = o.orderDate.toDate(); // Firestore Timestamp
      } else {
        date = new Date(o.orderDate); // Fallback for string
      }

      if (date.getFullYear() === parseInt(year)) {
        const month = date.getMonth();
        totalOrders[month]++;
        const status = o.orderStatus || 'Unknown';
        if (statusCounts[status]) {
          statusCounts[status][month]++;
        }
      }
    });
  
    // Process expenses
    expenses.forEach(e => {
      let date;
      if (e.purchaseDate && typeof e.purchaseDate.toDate === 'function') {
        date = e.purchaseDate.toDate(); // Firestore Timestamp
      } else {
        date = new Date(e.purchaseDate); // Fallback for string
      }

      if (date.getFullYear() === parseInt(year)) {
        const month = date.getMonth();
        const cat = e.category || 'Unknown';
        const amt = parseFloat(e.amount) || 0;
        console.log("month", month)
        console.log("cat", cat)
        console.log("amt", amt)
        if (!expenseByCategory[cat]) {
          expenseByCategory[cat] = Array(12).fill(0);
        }
        expenseByCategory[cat][month] += amt;
      }
    });
  
    return { totalOrders, statusCounts, expenseByCategory };
}

let monthlySummaryChartInstance;

function renderMonthlySummaryChart(canvasId, data, type) {
  const ctx = document.getElementById(canvasId).getContext('2d');

  if (monthlySummaryChartInstance) {
    monthlySummaryChartInstance.destroy();
  }

  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const datasets = [
    {
      label: 'Total Orders',
      data: data.totalOrders,
      borderColor: '#007bff',
      backgroundColor: 'rgba(0,123,255,0.5)',
      type: type.includes('line') ? 'line' : 'bar',
      fill: false
    },
    ...Object.entries(data.statusCounts).map(([status, values], idx) => ({
      label: `Orders - ${status}`,
      data: values,
      backgroundColor: ['#28a745', '#ffc107', '#17a2b8'][idx],
      stack: type.includes('stacked') ? 'orderStatus' : undefined
    })),
    ...Object.entries(data.expenseByCategory).map(([cat, values], idx) => ({
      label: `Expenses - ${cat}`,
      data: values,
      backgroundColor: `hsl(${(idx * 70) % 360}, 70%, 60%)`,
      type: 'bar',
      stack: type.includes('stacked') ? 'expenses' : undefined
    }))
  ];

  monthlySummaryChartInstance = new Chart(ctx, {
    type: type.includes('line') ? 'line' : 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Orders and Expenses Summary'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          stacked: type.includes('stacked')
        },
        y: {
          stacked: type.includes('stacked')
        }
      }
    }
  });
}

  
//======New One======
// stats.js
let activeChartInstances = {};

function setupStatsTabs() {
    console.log("setupStatsTabs")
    const financialTab = document.getElementById('financialTab');
    const operationalTab = document.getElementById('operationalTab');
    const yearDropdown = document.getElementById('statsYear');
    console.log("financialTab", financialTab)
    console.log("operationalTab", operationalTab)
    console.log("yearDropdown", yearDropdown)
  
    financialTab.addEventListener('click', () => {
      switchTab('financial');
      const year = parseInt(yearDropdown.value);
      loadAllStats(year);
    });
  
    operationalTab.addEventListener('click', () => {
      switchTab('operational');
      const year = parseInt(yearDropdown.value);
      loadAllStats(year);
    });
  
    // 🔄 Trigger chart reload when year changes
    if (yearDropdown) {
      yearDropdown.addEventListener('change', () => {
        const year = parseInt(yearDropdown.value);
        loadAllStats(year);
      });
    }
} 

function switchTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

function loadAllStats(year) {
    console.log("in loadAllStats", year)
  Promise.all([
    db.collection('Orders').get(),
    db.collection('Expense').get()
  ]).then(([ordersSnap, expenseSnap]) => {
    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const expenses = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("orders", orders)
    console.log("exp", expenses)

    renderRevenueVsExpenseChart(orders, expenses, year);
    renderProfitLossChart(orders, expenses, year);
    renderOrderVolumeStatusChart(orders, year);
    renderExpensesByCategoryChart(expenses, year);
  });
}

function clearChart(chartId) {
  if (activeChartInstances[chartId]) {
    activeChartInstances[chartId].destroy();
  }
}

function renderRevenueVsExpenseChart(orders, expenses, year) {
  const revenue = Array(12).fill(0);
  const expense = Array(12).fill(0);

  orders.forEach(o => {
    //const d = new Date(o.orderdDate);
    const d = o.orderDate.toDate();
    if (d.getFullYear() === year) {
      revenue[d.getMonth()] += parseFloat(o.price || 0);
    }
  });

  expenses.forEach(e => {
    //const d = new Date(e.purchaseDate);
    const d =  e.purchaseDate.toDate();
    if (d.getFullYear() === year) {
      expense[d.getMonth()] += parseFloat(e.amount || 0);
    }
  });

  const ctx = document.getElementById('revenueVsExpenseChart').getContext('2d');
  clearChart('revenueVsExpenseChart');
  activeChartInstances['revenueVsExpenseChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: getMonthLabels(),
      datasets: [
        { label: 'Revenue', data: revenue, backgroundColor: '#28a745' },
        { label: 'Expenses', data: expense, backgroundColor: '#dc3545' }
      ]
    },
    options: {
      responsive: true,
      onClick: (evt, item) => {
        if (item.length > 0) {
          const month = item[0].index;
          showDrilldownTable(orders, 'orderdDate', year, month);
        }
      }
    }
  });
}

function renderProfitLossChart(orders, expenses, year) {
  const profit = Array(12).fill(0);

  orders.forEach(o => {
    //const d = new Date(o.orderdDate);
    const d = o.orderDate.toDate();
    if (d.getFullYear() === year) {
      profit[d.getMonth()] += parseFloat(o.price || 0);
    }
  });

  expenses.forEach(e => {
    //const d = new Date(e.purchaseDate);
    const d =  e.purchaseDate.toDate();
    if (d.getFullYear() === year) {
      profit[d.getMonth()] -= parseFloat(e.amount || 0);
    }
  });

  const ctx = document.getElementById('profitLossChart').getContext('2d');
  clearChart('profitLossChart');
  activeChartInstances['profitLossChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getMonthLabels(),
      datasets: [{ label: 'Profit / Loss', data: profit, borderColor: '#007bff', fill: false }]
    },
    options: {
      responsive: true,
      onClick: (evt, item) => {
        if (item.length > 0) {
          const month = item[0].index;
          showDrilldownTable([...orders, ...expenses], 'mixed', year, month);
        }
      }
    }
  });
}

function renderOrderVolumeStatusChart(orders, year) {
  const statusMap = {};
  const labels = getMonthLabels();

  orders.forEach(o => {
    //const d = new Date(o.orderdDate);
    const d = o.orderDate.toDate();
    const status = o.orderStatus || 'Unknown';
    if (d.getFullYear() === year) {
      if (!statusMap[status]) statusMap[status] = Array(12).fill(0);
      statusMap[status][d.getMonth()]++;
    }
  });

  const datasets = Object.entries(statusMap).map(([status, data]) => ({
    label: status,
    data,
    backgroundColor: randomColor()
  }));

  const ctx = document.getElementById('orderVolumeStatusChart').getContext('2d');
  clearChart('orderVolumeStatusChart');
  activeChartInstances['orderVolumeStatusChart'] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true
    }
  });
}

function renderExpensesByCategoryChart(expenses, year) {
  const categoryMap = {};

  expenses.forEach(e => {
    //const d = new Date(e.purchaseDate);
    const d =  e.purchaseDate.toDate();
    if (d.getFullYear() === year) {
      const cat = e.category || 'Unknown';
      categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(e.amount || 0);
    }
  });

  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);

  const ctx = document.getElementById('expensesByCategoryChart').getContext('2d');
  clearChart('expensesByCategoryChart');
  activeChartInstances['expensesByCategoryChart'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: labels.map(() => randomColor()) }]
    },
    options: {
      responsive: true,
      onClick: (evt, item) => {
        if (item.length > 0) {
          const cat = labels[item[0].index];
          showDrilldownTable(expenses.filter(e => e.itemCategory === cat), null);
        }
      }
    }
  });
}

function showDrilldownTable(data, dateField, year = null, month = null) {
  const container = document.getElementById('drilldownTableContainer');
  const tableDiv = document.getElementById('drilldownTable');
  container.style.display = 'block';
  tableDiv.innerHTML = '';

  const table = document.createElement('table');
  table.border = 1;
  table.style.width = '100%';

  if (!data.length) {
    tableDiv.innerHTML = '<p>No data available.</p>';
    return;
  }

  const keys = Object.keys(data[0]);
  const header = table.insertRow();
  keys.forEach(k => header.insertCell().textContent = k);

  data.forEach(d => {
    if (dateField === 'mixed' || !dateField ||
        (year && month !== null && new Date(d[dateField]).getFullYear() === year && new Date(d[dateField]).getMonth() === month)) {
      const row = table.insertRow();
      keys.forEach(k => row.insertCell().textContent = d[k]);
    }
  });

  tableDiv.appendChild(table);
}

function getMonthLabels() {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
}

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}
  