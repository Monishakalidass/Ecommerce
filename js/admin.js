const firebaseConfig = {
  apiKey: "AIzaSyBUjpoBiFazICI4nRU1cW43SFqHJb0LVvU",
  authDomain: "e-commerce-cfeee.firebaseapp.com",
  projectId: "e-commerce-cfeee",
  storageBucket: "e-commerce-cfeee.firebasestorage.app",
  messagingSenderId: "436189438642",
  appId: "1:436189438642:web:1db6650fdedd4008fc9fab",
  measurementId: "G-62H3BBJXNW"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentAdminCategory = 'all';
let editingProductId = null;
let currentAdminPage = 1;
const itemsPerPage = 6;

const ADMIN_EMAIL = 'admin@shopsphere.com';
const ADMIN_PASSWORD = 'admin123';

const specLabels = {
  electronics: { spec1: { label: "Screen Size", placeholder: "e.g., 6.5 inches" }, spec2: { label: "Processor", placeholder: "e.g., Snapdragon 8 Gen 1" }, spec3: { label: "Battery Life", placeholder: "e.g., 4500 mAh" } },
  fashion: { spec1: { label: "Material", placeholder: "e.g., Cotton" }, spec2: { label: "Size", placeholder: "e.g., Medium" }, spec3: { label: "Color", placeholder: "e.g., Blue" } },
  furniture: { spec1: { label: "Material", placeholder: "e.g., Wood" }, spec2: { label: "Dimensions", placeholder: "e.g., 120x60x75 cm" }, spec3: { label: "Color", placeholder: "e.g., Brown" } },
  cosmetics: { spec1: { label: "Type", placeholder: "e.g., Lipstick" }, spec2: { label: "Shade", placeholder: "e.g., Red" }, spec3: { label: "Volume", placeholder: "e.g., 30 mL" } },
  foodAndHealth: { spec1: { label: "Type", placeholder: "e.g., Organic" }, spec2: { label: "Weight", placeholder: "e.g., 500 g" }, spec3: { label: "Expiry Date", placeholder: "e.g., 2025-12-31" } }
};

function updateSpecLabels() {
  const category = document.getElementById('productCategory').value;
  const labels = specLabels[category] || specLabels.electronics;
  document.getElementById('spec1Label').innerText = labels.spec1.label;
  document.getElementById('spec1').placeholder = labels.spec1.placeholder;
  document.getElementById('spec2Label').innerText = labels.spec2.label;
  document.getElementById('spec2').placeholder = labels.spec2.placeholder;
  document.getElementById('spec3Label').innerText = labels.spec3.label;
  document.getElementById('spec3').placeholder = labels.spec3.placeholder;
}

async function updateProfileSection() {
  try {
    if (!document.getElementById('userName')) {
      console.warn("DOM element #userName not found. Waiting for DOM...");
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      console.log("No valid admin user:", currentUser ? currentUser.email : "No user");
      return;
    }

    console.log("Fetching user data for UID:", currentUser.uid);
    const doc = await db.collection('users').doc(currentUser.uid).get();

    if (doc.exists) {
      const userData = doc.data();
      console.log("User data:", userData);
      document.getElementById('userName').innerText = userData.name || 'Admin';
    } else {
      console.warn(`No user document found for UID: ${currentUser.uid}`);
      document.getElementById('userName').innerText = 'Admin';
    }
  } catch (err) {
    console.error("Error in updateProfileSection:", err.message);
    document.getElementById('userName').innerText = 'Admin';
  }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    Swal.fire({ position: "top-end", icon: "success", title: "Logged out successfully.", showConfirmButton: false, timer: 1500 })
      .then(() => window.location.href = 'index.html');
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function filterAdminProducts(category) {
  currentAdminCategory = category;
  currentAdminPage = 1;
  loadAdminProducts();
}

function clearForm() {
  document.getElementById('crudForm').reset();
  document.getElementById('crudMessage').innerText = '';
  editingProductId = null;
  document.getElementById('crudForm').onsubmit = addProduct;
  updateSpecLabels();
}

function loadAdminProducts() {
  document.getElementById('analyticsSection').style.display = 'none';
  document.getElementById('usersSection').style.display = 'none';
  document.getElementById('crudForm').style.display = 'block';
  const productListDiv = document.getElementById('adminProductList');
  productListDiv.style.display = 'grid';
  productListDiv.innerHTML = "Loading products...";
  let query = db.collection('products');
  if (currentAdminCategory !== 'all') query = query.where('category', '==', currentAdminCategory);
  query.get()
    .then(snapshot => {
      productListDiv.innerHTML = '';
      if (snapshot.empty) {
        productListDiv.innerHTML = "No products available.";
        return;
      }
      let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalPages = Math.ceil(products.length / itemsPerPage);
      const startIndex = (currentAdminPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = products.slice(startIndex, endIndex);

      paginatedProducts.forEach(prod => {
        const productId = prod.id;
        const specifications = Array.isArray(prod.specifications) ? prod.specifications.join(', ') : prod.specifications || 'N/A';
        const prodDiv = document.createElement('div');
        prodDiv.classList.add('product');
        prodDiv.innerHTML = `
          <img src="${prod.imageURLs?.[0] || 'https://via.placeholder.com/200'}" alt="${prod.name}" onerror="this.src='https://via.placeholder.com/200'">
          <h4>${prod.name}</h4>
          <p>Product ID: ${prod.productId || 'N/A'}</p>
          <p>Price: $${prod.price || 'N/A'} | Credits: ${prod.credit || 0}</p>
          <p>Stock: ${prod.stock || 0}</p>
          <p>Status: ${prod.isActive ? 'Active' : 'Deactive'}</p>
          <p>Specs: ${specifications}</p>
          <button class="edit-btn" onclick="editProduct('${productId}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="delete-btn" onclick="deleteProduct('${productId}')"><i class="fas fa-trash"></i> Delete</button>
        `;
        productListDiv.appendChild(prodDiv);
      });

      document.getElementById('adminPagination').innerHTML = `
        <button onclick="prevAdminPage()" ${currentAdminPage === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${currentAdminPage} of ${totalPages}</span>
        <button onclick="nextAdminPage()" ${currentAdminPage === totalPages ? 'disabled' : ''}>Next</button>
      `;
    })
    .catch(err => {
      console.error("Error loading products:", err);
      productListDiv.innerHTML = "Error loading products.";
    });
}

function prevAdminPage() {
  if (currentAdminPage > 1) {
    currentAdminPage--;
    loadAdminProducts();
  }
}

function nextAdminPage() {
  currentAdminPage++;
  loadAdminProducts();
}

function editProduct(productId) {
  editingProductId = productId;
  db.collection('products').doc(productId).get()
    .then(doc => {
      if (doc.exists) {
        const prod = doc.data();
        document.getElementById('productName').value = prod.name || '';
        document.getElementById('productCategory').value = prod.category || 'electronics';
        document.getElementById('productPrice').value = prod.price || '';
        document.getElementById('productCredit').value = prod.credit || 0;
        document.getElementById('productImage').value = prod.imageURLs?.[0] || '';
        document.getElementById('productId').value = prod.productId || '';
        document.getElementById('productStock').value = prod.stock || 0;
        document.getElementById('isActive').value = prod.isActive ? 'true' : 'false';
        updateSpecLabels();
        const specs = Array.isArray(prod.specifications) ? prod.specifications : [];
        document.getElementById('spec1').value = specs[0] || '';
        document.getElementById('spec2').value = specs[1] || '';
        document.getElementById('spec3').value = specs[2] || '';
        document.getElementById('crudForm').onsubmit = updateProduct;
      }
    })
    .catch(err => console.error("Error fetching product:", err));
}

function updateProduct(e) {
  e.preventDefault();
  if (!editingProductId) return;
  const specifications = [document.getElementById('spec1').value, document.getElementById('spec2').value, document.getElementById('spec3').value].filter(spec => spec.trim() !== '');
  const productData = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value) || 0,
    credit: parseFloat(document.getElementById('productCredit').value) || 0,
    imageURLs: [document.getElementById('productImage').value],
    productId: document.getElementById('productId').value,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    isActive: document.getElementById('isActive').value === 'true',
    specifications: specifications,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  Swal.fire({ title: "Save changes?", showDenyButton: true, showCancelButton: true, confirmButtonText: "Save", denyButtonText: "Don't save" })
    .then((result) => {
      if (result.isConfirmed) {
        db.collection('products').doc(editingProductId).update(productData)
          .then(() => {
            Swal.fire({ position: "top-end", icon: "success", title: "Product updated!", showConfirmButton: false, timer: 1500 });
            loadAdminProducts();
            clearForm();
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error: ' + err.message, showConfirmButton: false, timer: 1500 }));
      } else if (result.isDenied) {
        Swal.fire({ position: "top-end", icon: "info", title: "Changes not saved", showConfirmButton: false, timer: 1500 });
      }
    });
}

function addProduct(e) {
  e.preventDefault();
  const specifications = [document.getElementById('spec1').value, document.getElementById('spec2').value, document.getElementById('spec3').value].filter(spec => spec.trim() !== '');
  const productData = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value) || 0,
    credit: parseFloat(document.getElementById('productCredit').value) || 0,
    imageURLs: [document.getElementById('productImage').value],
    productId: document.getElementById('productId').value,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    isActive: document.getElementById('isActive').value === 'true',
    specifications: specifications,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection('products').add(productData)
    .then(() => {
      Swal.fire({ position: "top-end", icon: "success", title: "Product added!", showConfirmButton: false, timer: 1500 });
      loadAdminProducts();
      clearForm();
    })
    .catch(err => Swal.fire({ icon: 'error', title: 'Error: ' + err.message, showConfirmButton: false, timer: 1500 }));
}

function deleteProduct(productId) {
  Swal.fire({ title: "Delete this product?", showDenyButton: true, showCancelButton: true, confirmButtonText: "Delete", denyButtonText: "Cancel" })
    .then((result) => {
      if (result.isConfirmed) {
        db.collection('products').doc(productId).delete()
          .then(() => {
            Swal.fire({ position: "top-end", icon: "success", title: "Product deleted!", showConfirmButton: false, timer: 1500 });
            loadAdminProducts();
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error: ' + err.message, showConfirmButton: false, timer: 1500 }));
      }
    });
}

function showAnalytics(type) {
  document.getElementById('crudForm').style.display = 'none';
  document.getElementById('adminProductList').style.display = 'none';
  document.getElementById('usersSection').style.display = 'none';
  const analyticsDiv = document.getElementById('analyticsSection');
  analyticsDiv.style.display = 'block';

  if (type === 'products') {
    analyticsDiv.innerHTML = `
      <h3><i class="fas fa-chart-bar"></i> Product Analytics</h3>
      <div class="analytics-filters">
        <button class="btn-primary" onclick="downloadCostEstimationReport()">Download Report</button>
      </div>
      <div id="topProducts"></div>
      <div id="bottomProducts"></div>
      <div class="chart-container"><canvas id="salesBarChart"></canvas></div>
      <div class="chart-container"><canvas id="categoryPieChart"></canvas></div>
    `;
    loadAnalytics('products');
  } else if (type === 'cost') {
    analyticsDiv.innerHTML = `
      <h3><i class="fas fa-dollar-sign"></i> Cost Estimation Report</h3>
      <div class="analytics-filters">
        <button class="btn-primary" onclick="downloadCostEstimationReport()">Download Report</button>
      </div>
      <div id="costTable"></div>
      <div class="chart-container"><canvas id="costPieChart"></canvas></div>
      <div class="chart-container"><canvas id="costBarChart"></canvas></div>
    `;
    loadAnalytics('cost');
  } else if (type === 'inventory') {
    analyticsDiv.innerHTML = `
      <h3><i class="fas fa-warehouse"></i> Inventory Report</h3>
      <div class="analytics-filters">
        <button class="btn-primary" onclick="downloadInventoryReport()">Download Report</button>
      </div>
      <table id="inventoryTable" class="analytics-table">
        <thead><tr><th>S.No</th><th>Product Name</th><th>Category</th><th>Stock</th><th>Price ($)</th></tr></thead>
        <tbody></tbody>
      </table>
      <div class="chart-container"><canvas id="inventoryPieChart"></canvas></div>
      <div class="chart-container"><canvas id="inventoryBarChart"></canvas></div>
    `;
    loadAnalytics('inventory');
  } else if (type === 'customers') {
    analyticsDiv.innerHTML = `
      <h3><i class="fas fa-user-friends"></i> Customer Report</h3>
      <div class="analytics-filters">
        <button class="btn-primary" onclick="downloadCustomerReport()">Download Report</button>
      </div>
      <table id="customerTable" class="analytics-table">
        <thead><tr><th>S.No</th><th>Name</th><th>Email</th><th>Total Orders</th><th>Total Spent ($)</th></tr></thead>
        <tbody></tbody>
      </table>
    `;
    loadAnalytics('customers');
  }
}

function showUsers() {
  document.getElementById('crudForm').style.display = 'none';
  document.getElementById('adminProductList').style.display = 'none';
  document.getElementById('analyticsSection').style.display = 'none';
  const usersDiv = document.getElementById('usersSection');
  usersDiv.style.display = 'block';
  usersDiv.innerHTML = `
    <h3><i class="fas fa-users"></i> All Users</h3>
    <div id="usersTable"></div>
  `;
  updateUsersList();
}

function loadAnalytics(type) {
  db.collection('orders').get().then(orderSnapshot => {
    const productSales = {};
    const categorySales = {};
    const costByCategory = {};

    orderSnapshot.forEach(doc => {
      const order = doc.data();
      order.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        const cost = item.quantity * item.price;
        db.collection('products').doc(item.productId).get().then(prodDoc => {
          if (prodDoc.exists) {
            const category = prodDoc.data().category || 'Uncategorized';
            categorySales[category] = (categorySales[category] || 0) + item.quantity;
            costByCategory[category] = (costByCategory[category] || 0) + cost;
          }
        });
      });
    });

    if (type === 'products') {
      const topProductsDiv = document.getElementById('topProducts');
      topProductsDiv.innerHTML = "<h4>Top 10 Selling Products</h4>";
      const topTable = document.createElement('table');
      topTable.classList.add('analytics-table');
      topTable.innerHTML = `
        <thead><tr><th>S.No</th><th>Product Name</th><th>Category</th><th>Units Sold</th></tr></thead>
        <tbody></tbody>
      `;
      const topTbody = topTable.querySelector('tbody');
      const sortedTopProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 10);
      Promise.all(sortedTopProducts.map(([prodId], index) =>
        db.collection('products').doc(prodId).get().then(doc => {
          if (doc.exists) {
            const prod = doc.data();
            return { name: prod.name, category: prod.category, qty: productSales[prodId], index: index + 1 };
          }
          return null;
        })
      )).then(products => {
        products.filter(p => p).sort((a, b) => a.category.localeCompare(b.category) || b.qty - a.qty).forEach(prod => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${prod.index}</td>
            <td>${prod.name}</td>
            <td>${prod.category}</td>
            <td>${prod.qty}</td>
          `;
          topTbody.appendChild(row);
        });
      });
      topProductsDiv.appendChild(topTable);

      const bottomProductsDiv = document.getElementById('bottomProducts');
      bottomProductsDiv.innerHTML = "<h4>Bottom 10 Selling Products</h4>";
      const bottomTable = document.createElement('table');
      bottomTable.classList.add('analytics-table');
      bottomTable.innerHTML = `
        <thead><tr><th>S.No</th><th>Product Name</th><th>Category</th><th>Units Sold</th></tr></thead>
        <tbody></tbody>
      `;
      const bottomTbody = bottomTable.querySelector('tbody');
      const sortedBottomProducts = Object.entries(productSales).sort((a, b) => a[1] - b[1]).slice(0, 10);
      Promise.all(sortedBottomProducts.map(([prodId], index) =>
        db.collection('products').doc(prodId).get().then(doc => {
          if (doc.exists) {
            const prod = doc.data();
            return { name: prod.name, category: prod.category, qty: productSales[prodId], index: index + 1 };
          }
          return null;
        })
      )).then(products => {
        products.filter(p => p).sort((a, b) => a.category.localeCompare(b.category) || a.qty - b.qty).forEach(prod => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${prod.index}</td>
            <td>${prod.name}</td>
            <td>${prod.category}</td>
            <td>${prod.qty}</td>
          `;
          bottomTbody.appendChild(row);
        });
      });
      bottomProductsDiv.appendChild(bottomTable);

      const barCtx = document.getElementById('salesBarChart').getContext('2d');
      if (window.salesBarChart && typeof window.salesBarChart.destroy === 'function') window.salesBarChart.destroy();
      window.salesBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(productSales),
          datasets: [{
            label: 'Units Sold',
            data: Object.values(productSales),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
          plugins: { title: { display: true, text: 'Product Sales', font: { size: 16 } } }
        }
      });

      const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
      if (window.categoryPieChart && typeof window.categoryPieChart.destroy === 'function') window.categoryPieChart.destroy();
      window.categoryPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: Object.keys(categorySales),
          datasets: [{
            data: Object.values(categorySales),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Category Distribution', font: { size: 16 } } }
        }
      });
    } else if (type === 'cost') {
      const costTableDiv = document.getElementById('costTable');
      costTableDiv.innerHTML = "<h4>Cost Estimation by Category</h4>";
      const costTable = document.createElement('table');
      costTable.classList.add('analytics-table');
      costTable.innerHTML = `
        <thead><tr><th>Category</th><th>Total Cost ($)</th></tr></thead>
        <tbody></tbody>
      `;
      const costTbody = costTable.querySelector('tbody');
      let totalCost = 0;
      for (const [category, cost] of Object.entries(costByCategory)) {
        totalCost += cost;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${category}</td><td>${cost.toFixed(2)}</td>`;
        costTbody.appendChild(row);
      }
      const totalRow = document.createElement('tr');
      totalRow.innerHTML = `<td><strong>Total</strong></td><td><strong>${totalCost.toFixed(2)}</strong></td>`;
      costTbody.appendChild(totalRow);
      costTableDiv.appendChild(costTable);

      const pieCtx = document.getElementById('costPieChart');
      if (!pieCtx) {
        console.error('Canvas #costPieChart not found in DOM');
        return;
      }
      const pieContext = pieCtx.getContext('2d');
      if (window.costPieChart && typeof window.costPieChart.destroy === 'function') {
        window.costPieChart.destroy();
      }
      window.costPieChart = new Chart(pieContext, {
        type: 'pie',
        data: {
          labels: Object.keys(costByCategory),
          datasets: [{
            data: Object.values(costByCategory),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Cost Distribution by Category', font: { size: 16 } } }
        }
      });

      const barCtx = document.getElementById('costBarChart');
      if (!barCtx) {
        console.error('Canvas #costBarChart not found in DOM');
        return;
      }
      const barContext = barCtx.getContext('2d');
      if (window.costBarChart && typeof window.costBarChart.destroy === 'function') {
        window.costBarChart.destroy();
      }
      window.costBarChart = new Chart(barContext, {
        type: 'bar',
        data: {
          labels: Object.keys(costByCategory),
          datasets: [{
            label: 'Total Cost ($)',
            data: Object.values(costByCategory),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
          plugins: { title: { display: true, text: 'Cost by Category', font: { size: 16 } } }
        }
      });
    } else if (type === 'inventory') {
      const inventoryTbody = document.getElementById('inventoryTable').querySelector('tbody');
      inventoryTbody.innerHTML = '';
      const stockByCategory = {};
      db.collection('products').get().then(snapshot => {
        const products = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          ...doc.data(),
          index: index + 1
        })).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        products.forEach(prod => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${prod.index}</td>
            <td>${prod.name}</td>
            <td>${prod.category}</td>
            <td>${prod.stock}</td>
            <td>$${prod.price.toFixed(2)}</td>
          `;
          inventoryTbody.appendChild(row);
          stockByCategory[prod.category] = (stockByCategory[prod.category] || 0) + (prod.stock || 0);
        });

        const pieCtx = document.getElementById('inventoryPieChart').getContext('2d');
        if (window.inventoryPieChart && typeof window.inventoryPieChart.destroy === 'function') window.inventoryPieChart.destroy();
        window.inventoryPieChart = new Chart(pieCtx, {
          type: 'pie',
          data: {
            labels: Object.keys(stockByCategory),
            datasets: [{
              data: Object.values(stockByCategory),
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Inventory Distribution by Category', font: { size: 16 } } }
          }
        });

        const barCtx = document.getElementById('inventoryBarChart').getContext('2d');
        if (window.inventoryBarChart && typeof window.inventoryBarChart.destroy === 'function') window.inventoryBarChart.destroy();
        window.inventoryBarChart = new Chart(barCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(stockByCategory),
            datasets: [{
              label: 'Total Stock',
              data: Object.values(stockByCategory),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { title: { display: true, text: 'Inventory by Category', font: { size: 16 } } }
          }
        });
      });
    } else if (type === 'customers') {
      const customerTbody = document.getElementById('customerTable').querySelector('tbody');
      customerTbody.innerHTML = '';
      db.collection('users').get().then(userSnapshot => {
        userSnapshot.forEach((userDoc, index) => {
          const user = userDoc.data();
          db.collection('orders').where('userId', '==', userDoc.id).get().then(orderSnapshot => {
            const totalOrders = orderSnapshot.size;
            const totalSpent = orderSnapshot.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${index + 1}</td>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${totalOrders}</td>
              <td>$${totalSpent.toFixed(2)}</td>
            `;
            customerTbody.appendChild(row);
          });
        });
      });
    }
  }).catch(err => console.error("Error loading analytics:", err));
}

function updateUsersList() {
  const tableDiv = document.getElementById('usersTable');
  tableDiv.innerHTML = 'Loading...';

  db.collection('users').get().then(snapshot => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    tableDiv.innerHTML = `
      <table class="analytics-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Credits</th></tr></thead>
        <tbody>${users.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.phone || 'N/A'}</td><td>${u.credit || 0}</td></tr>`).join('')}</tbody>
      </table>
    `;
  });
}

function downloadCostEstimationReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("ShopSphere Cost Estimation Report", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

  doc.text("Cost Estimation by Category", 20, 40);
  doc.autoTable({
    startY: 50,
    head: [['Category', 'Total Cost ($)']],
    body: Array.from(document.getElementById('costTable')?.querySelector('tbody')?.rows || []).map(row => [
      row.cells[0].innerText,
      row.cells[1].innerText
    ])
  });

  doc.save('cost_estimation_report.pdf');
}

function downloadInventoryReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("ShopSphere Inventory Report", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

  doc.autoTable({
    startY: 40,
    head: [['S.No', 'Product Name', 'Category', 'Stock', 'Price ($)']],
    body: Array.from(document.getElementById('inventoryTable')?.querySelector('tbody')?.rows || []).map(row => [
      row.cells[0].innerText,
      row.cells[1].innerText,
      row.cells[2].innerText,
      row.cells[3].innerText,
      row.cells[4].innerText
    ])
  });

  doc.save('inventory_report.pdf');
}

function downloadCustomerReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("ShopSphere Customer Report", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

  doc.autoTable({
    startY: 40,
    head: [['S.No', 'Name', 'Email', 'Total Orders', 'Total Spent ($)']],
    body: Array.from(document.getElementById('customerTable')?.querySelector('tbody')?.rows || []).map(row => [
      row.cells[0].innerText,
      row.cells[1].innerText,
      row.cells[2].innerText,
      row.cells[3].innerText,
      row.cells[4].innerText
    ])
  });

  doc.save('customer_report.pdf');
}

document.getElementById('crudForm').addEventListener('submit', addProduct);

auth.onAuthStateChanged(async user => {
  currentUser = user;
  await updateProfileSection();
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      loadAdminProducts();
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    } else {
      window.location.href = 'index.html';
    }
  } else {
    window.location.href = 'index.html';
  }
});

document.querySelector('.sidebar ul:last-child li:nth-child(2) a').onclick = () => showUsers();