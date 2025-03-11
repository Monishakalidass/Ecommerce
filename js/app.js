// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let currentOrder = null;
let currentCategory = 'all';
let currentPage = 1;
const itemsPerPage = 6;
let filterPriceRange = { min: 0, max: Infinity };
let searchQuery = '';

const ADMIN_EMAIL = 'admin@shopsphere.com';
const ADMIN_PASSWORD = 'admin123';

// Minimalist SweetAlert Configuration
function showMinimalSwal(options) {
  Swal.fire({
    ...options,
    width: '300px',
    padding: '1rem',
    position: 'center',
    showConfirmButton: false,
    timer: 1500,
    background: '#fff',
    customClass: {
      popup: 'minimal-swal'
    }
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function showSection(sectionId) {
  // Hide all sections by default
  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none'; // Explicitly hide all sections
  });

  // Show the selected section
  const activeSection = document.getElementById(sectionId);
  activeSection.style.display = 'block'; // Show the active section
  activeSection.classList.add('active');

  const header = document.getElementById('mainHeader');
  const sidebar = document.getElementById('sidebar');
  const footer = document.getElementById('mainFooter');
  const searchLogin = document.getElementById('searchLogin');
  const mainNav = document.getElementById('mainNav');
  const pageContainer = document.getElementById('pageContainer');

  // Reset page container background for all sections
  pageContainer.style.background = 'none';

  if (sectionId === 'home') {
    header.style.display = 'block';
    sidebar.style.display = 'none'; // Hide sidebar for home
    footer.style.display = 'block';
    searchLogin.style.display = 'none'; // Hide search bar and cart
    mainNav.style.display = 'flex';
    updateNavAfterLogin();
  } else if (sectionId === 'login' || sectionId === 'register') {
    header.style.display = 'block';
    sidebar.style.display = 'none';
    footer.style.display = 'none'; // Hide footer for login/signup
    searchLogin.style.display = 'none';
    mainNav.style.display = 'flex';
  } else if (sectionId === 'products') {
    header.style.display = 'block';
    sidebar.style.display = 'block'; // Show sidebar with categories
    footer.style.display = 'block';
    searchLogin.style.display = 'flex';
    mainNav.style.display = 'flex';
    updateNavAfterLogin();
    loadProducts();
  } else {
    header.style.display = 'block';
    sidebar.style.display = 'none';
    footer.style.display = 'block';
    searchLogin.style.display = 'flex';
    mainNav.style.display = 'flex';
    updateNavAfterLogin();
  }

  // Load section-specific content
  if (sectionId === 'cart') { loadCart(); updateCartCount(); }
  if (sectionId === 'wishlist') loadWishlist();
  if (sectionId === 'profile') showProfileDetails();
  if (sectionId === 'orders') loadOrdersHistory();
}
function updateNavAfterLogin() {
  const loginNav = document.getElementById('loginNav');
  const logoutNav = document.getElementById('logoutNav');
  const profileNav = document.getElementById('profileNav');
  const ordersNav = document.getElementById('ordersNav');
  const profileNavDetails = document.getElementById('profileNavDetails');

  if (currentUser) {
    loginNav.style.display = 'none';
    logoutNav.style.display = 'inline-flex';
    profileNav.style.display = 'inline-flex';
    ordersNav.style.display = 'inline-flex';
    
    db.collection('users').doc(currentUser.uid).get()
      .then(doc => {
        const userData = doc.data();
        profileNavDetails.innerText = `${userData.name || 'User'} (${userData.credit || 0} credits)`;
      });
  } else {
    loginNav.style.display = 'inline-flex';
    logoutNav.style.display = 'none';
    profileNav.style.display = 'none';
    ordersNav.style.display = 'none';
    profileNavDetails.innerText = 'Profile';
  }
}

function showProfileDetails() {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  db.collection('users').doc(currentUser.uid).get()
    .then(doc => {
      const userData = doc.data();
      document.getElementById('profileName').innerText = userData.name || 'N/A';
      document.getElementById('profileEmail').innerText = currentUser.email || 'N/A';
      document.getElementById('profilePhone').innerText = userData.phone || 'N/A';
      document.getElementById('profileCredit').innerText = userData.credit || 0;
      const createdAt = userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A';
      document.getElementById('profileCreatedAt').innerText = createdAt;
    });
  showSection('profile');
}

function toggleRegisterForm() {
  const loginSection = document.getElementById('login');
  const registerSection = document.getElementById('register');
  loginSection.style.display = loginSection.style.display === 'none' ? 'block' : 'none';
  registerSection.style.display = registerSection.style.display === 'none' ? 'block' : 'none';
  loginSection.classList.toggle('active');
  registerSection.classList.toggle('active');
}

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    showMinimalSwal({ icon: 'error', title: 'Admin credentials cannot be used for registration!' });
    return;
  }
  const userData = {
    name: document.getElementById('regName').value,
    phone: document.getElementById('regPhone').value,
    email: email,
    credit: 5,
    cart: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      return db.collection('users').doc(currentUser.uid).set(userData);
    })
    .then(() => {
      updateNavAfterLogin();
      showSection('home');
      showMinimalSwal({ icon: 'success', title: 'Registration successful! You have 5 credits.' });
    })
    .catch(err => {
      showMinimalSwal({ icon: 'error', title: err.message });
    });
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        showMinimalSwal({ icon: 'success', title: 'Admin login successful! Redirecting...' })
          .then(() => window.location.href = 'admin.html');
      } else {
        showMinimalSwal({ icon: 'success', title: 'Login successful!' });
        updateNavAfterLogin();
        showSection('home');
      }
    })
    .catch(err => {
      showMinimalSwal({ icon: 'error', title: err.message });
    });
});

function continueWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      currentUser = result.user;
      const userData = {
        name: result.user.displayName || 'Google User',
        email: result.user.email,
        phone: result.user.phoneNumber || '',
        credit: 5,
        cart: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      return db.collection('users').doc(currentUser.uid).set(userData, { merge: true });
    })
    .then(() => {
      updateNavAfterLogin();
      showSection('home');
      showMinimalSwal({ icon: 'success', title: 'Logged in with Google!' });
    })
    .catch(err => {
      showMinimalSwal({ icon: 'error', title: err.message });
    });
}

function updateCartCount() {
  if (!currentUser) {
    document.getElementById('cartCount').innerText = '0';
    return;
  }
  db.collection('users').doc(currentUser.uid).collection('cart').get()
    .then(snapshot => {
      const totalItems = snapshot.docs.reduce((sum, doc) => sum + doc.data().quantity, 0);
      document.getElementById('cartCount').innerText = totalItems;
    });
}

function filterProducts(category) {
  currentCategory = category;
  currentPage = 1;
  loadProducts();
}

function applyFilters() {
  const priceRange = document.getElementById('filterPrice').value.split('-');
  const sortBy = document.getElementById('sortBy').value;

  filterPriceRange.min = parseFloat(priceRange[0]);
  filterPriceRange.max = priceRange[1] === 'Infinity' ? Infinity : parseFloat(priceRange[1]);

  currentPage = 1;
  loadProducts(sortBy);
}

function searchProducts(event) {
  if (event.key === 'Enter') {
    searchQuery = document.getElementById('searchBar').value.toLowerCase();
    currentPage = 1;
    loadProducts();
  }
}

function loadProducts(sortBy = 'price-asc') {
  const productsListDiv = document.getElementById('productsList');
  productsListDiv.innerHTML = "Loading products...";
  let query = db.collection('products').where('isActive', '==', true);
  if (currentCategory !== 'all') {
    query = query.where('category', '==', currentCategory);
  }
  query.get()
    .then(snapshot => {
      let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(prod => {
          const price = prod.price || 0;
          const name = prod.name.toLowerCase();
          return price >= filterPriceRange.min && price <= filterPriceRange.max &&
                 (searchQuery === '' || name.includes(searchQuery));
        });

      if (sortBy === 'price-asc') products.sort((a, b) => (a.price || 0) - (b.price || 0));
      if (sortBy === 'price-desc') products.sort((a, b) => (b.price || 0) - (a.price || 0));

      productsListDiv.innerHTML = "";
      if (products.length === 0) {
        productsListDiv.innerHTML = "No products available.";
        return;
      }
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = products.slice(startIndex, endIndex);
      paginatedProducts.forEach(prod => {
        const productId = prod.id;
        const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
        const specifications = Array.isArray(prod.specifications) ? prod.specifications.join(', ') : prod.specifications || 'N/A';
        const prodDiv = document.createElement('div');
        prodDiv.classList.add('product');
        if (prod.stock === 0) prodDiv.classList.add('frozen');
        prodDiv.innerHTML = `
          <img src="${imageUrl}" alt="${prod.name}" onerror="this.src='https://via.placeholder.com/200'">
          <h4>${prod.name}</h4>
          <p>Product ID: ${prod.productId || 'N/A'}</p>
          <p>$${prod.price || 'N/A'} | Credits: ${prod.credit || 0}</p>
          <p>Stock: ${prod.stock || 0}</p>
          <p>Specs: ${specifications}</p>
          <button onclick="addToCart('${productId}', '${prod.name}', ${prod.stock})"><i class="fas fa-cart-plus"></i> Add to Cart</button>
          <button onclick="addToWishlist('${productId}', '${prod.name}')"><i class="fas fa-heart"></i> Add to Wishlist</button>
        `;
        productsListDiv.appendChild(prodDiv);
      });
      const totalPages = Math.ceil(products.length / itemsPerPage);
      document.getElementById('pagination').innerHTML = `
        <button onclick="prevPage()" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
      `;
    })
    .catch(err => {
      console.error("Error loading products:", err);
      productsListDiv.innerHTML = "Error loading products.";
    });
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
}

function nextPage() {
  currentPage++;
  loadProducts();
}

function addToCart(productId, name, stock) {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  if (stock === 0) {
    showMinimalSwal({ icon: 'error', title: 'Out of Stock!' });
    return;
  }
  db.collection('products').doc(productId).get()
    .then(doc => {
      const prod = doc.data();
      const price = prod.price || 0;
      const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
      const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
      cartRef.where('productId', '==', productId).get()
        .then(snapshot => {
          if (snapshot.empty) {
            cartRef.add({
              productId: productId,
              name: name,
              price: price,
              quantity: 1,
              imageUrl: imageUrl,
              addedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              showMinimalSwal({ icon: 'success', title: `${name} added to cart.` });
              loadCart();
              updateCartCount();
            });
          } else {
            const doc = snapshot.docs[0];
            cartRef.doc(doc.id).update({
              quantity: doc.data().quantity + 1
            }).then(() => {
              showMinimalSwal({ icon: 'success', title: `${name} quantity updated in cart.` });
              loadCart();
              updateCartCount();
            });
          }
        });
    });
}

function loadCart() {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  const cartListDiv = document.getElementById('cartList');
  cartListDiv.innerHTML = "";
  db.collection('users').doc(currentUser.uid).collection('cart').get()
    .then(snapshot => {
      if (snapshot.empty) {
        cartListDiv.innerHTML = "Your cart is empty.";
        return;
      }
      snapshot.forEach(doc => {
        const item = doc.data();
        const totalPrice = item.price * item.quantity;
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');
        itemDiv.innerHTML = `
          <img src="${item.imageUrl || 'https://via.placeholder.com/200'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200'">
          <div class="item-details">
            <strong>${item.name} x${item.quantity}</strong>
            <p>ID: ${item.productId}</p>
            <p>Total Price: $${totalPrice}</p>
          </div>
          <div class="item-actions">
            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
          </div>
        `;
        cartListDiv.appendChild(itemDiv);
      });
    });
}

function updateCartQuantity(docId, newQuantity) {
  const cartRef = db.collection('users').doc(currentUser.uid).collection('cart').doc(docId);
  if (newQuantity <= 0) {
    cartRef.delete().then(() => {
      loadCart();
      updateCartCount();
    });
  } else {
    cartRef.update({ quantity: newQuantity }).then(() => {
      loadCart();
      updateCartCount();
    });
  }
}

function addToWishlist(productId, name) {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  const wishlistRef = db.collection('wishlist').doc(`${currentUser.uid}_${productId}`);
  db.collection('products').doc(productId).get().then(prodDoc => {
    const prod = prodDoc.data();
    const imageUrl = prod.imageURLs?.[0] || 'https://via.placeholder.com/200';
    wishlistRef.get().then(doc => {
      if (doc.exists) {
        wishlistRef.update({
          quantity: doc.data().quantity + 1,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          showMinimalSwal({ icon: 'success', title: `${name} quantity updated in wishlist.` });
          loadWishlist();
        });
      } else {
        wishlistRef.set({
          userId: currentUser.uid,
          productId: productId,
          name: name,
          quantity: 1,
          imageUrl: imageUrl,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          showMinimalSwal({ icon: 'success', title: `${name} added to wishlist.` });
          loadWishlist();
        });
      }
    });
  });
}

function loadWishlist() {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  const wishlistListDiv = document.getElementById('wishlistList');
  wishlistListDiv.innerHTML = "";
  db.collection('wishlist').where("userId", "==", currentUser.uid).get()
    .then(snapshot => {
      if (snapshot.empty) wishlistListDiv.innerHTML = "Your wishlist is empty.";
      snapshot.forEach(doc => {
        const item = doc.data();
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('wishlist-item');
        itemDiv.innerHTML = `
          <img src="${item.imageUrl || 'https://via.placeholder.com/200'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200'">
          <br><strong>${item.name} x${item.quantity}</strong> (ID: ${item.productId})
        `;
        wishlistListDiv.appendChild(itemDiv);
      });
    });
}

function loadOrdersHistory() {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  const ordersListDiv = document.getElementById('ordersList');
  ordersListDiv.innerHTML = "Loading orders...";
  db.collection('orders').where('userId', '==', currentUser.uid).get()
    .then(snapshot => {
      ordersListDiv.innerHTML = '';
      if (snapshot.empty) {
        ordersListDiv.innerHTML = "No orders found.";
        return;
      }
      snapshot.forEach(doc => {
        const order = doc.data();
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order-item');
        const uniqueItems = [];
        order.items.forEach(item => {
          if (!uniqueItems.some(i => i.productId === item.productId)) {
            uniqueItems.push(item);
          }
        });
        orderDiv.innerHTML = `
          <strong>Order ID: ${doc.id}</strong>
          <p>Total Amount: $${order.totalAmount}</p>
          <p>Status: ${order.status}</p>
          ${uniqueItems.map(item => `
            <div style="display: flex; align-items: center; margin: 5px 0;">
              <img src="${item.imageUrl || 'https://via.placeholder.com/200'}" alt="${item.name}" width="80" onerror="this.src='https://via.placeholder.com/200'">
              <span style="margin-left: 10px;">${item.name} x${item.quantity}</span>
            </div>
          `).join('')}
        `;
        ordersListDiv.appendChild(orderDiv);
      });
    });
}

function placeOrder() {
  if (!currentUser) {
    showMinimalSwal({ icon: 'warning', title: 'Please login first!' });
    showSection('login');
    return;
  }
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  userCartRef.get().then(snapshot => {
    if (snapshot.empty) {
      showMinimalSwal({ icon: 'info', title: 'Your cart is empty!' });
      return;
    }
    let cartItems = [];
    snapshot.forEach(doc => cartItems.push({ id: doc.id, ...doc.data() }));
    
    const stockPromises = cartItems.map(item =>
      db.collection('products').doc(item.productId).get()
        .then(prodDoc => {
          const prod = prodDoc.data();
          if (!prod || typeof prod.stock === 'undefined') {
            console.error(`Product data missing or invalid for ${item.productId}`);
            return { item, prod: { stock: 0 }, prodDoc };
          }
          return { item, prod, prodDoc };
        })
    );
    
    Promise.all(stockPromises)
      .then(results => {
        const validItems = results.filter(({ item, prod }) => prod.stock >= item.quantity);
        if (validItems.length === 0) {
          showMinimalSwal({ icon: 'error', title: 'No items with sufficient stock in your cart!' });
          return;
        }
        
        const variants = validItems.map(({ item }) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          imageUrl: item.imageUrl,
          credit: item.credit || 0
        }));
        
        let totalAmount = variants.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        db.collection('users').doc(currentUser.uid).get().then(doc => {
          const userCredit = doc.data().credit || 0;
          Swal.fire({
            title: `You have ${userCredit} credits. Apply them?`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Yes',
            denyButtonText: 'No'
          }).then((result) => {
            let creditsToUse = 0;
            if (result.isConfirmed) {
              creditsToUse = Math.min(userCredit, totalAmount);
              totalAmount = Math.max(0, totalAmount - creditsToUse);
            }
            
            return db.collection('orders').add({
              userId: currentUser.uid,
              items: variants,
              totalAmount: totalAmount,
              creditsUsed: creditsToUse,
              status: 'pending',
              paymentStatus: 'pending',
              orderDate: firebase.firestore.FieldValue.serverTimestamp()
            }).then(orderRef => {
              currentOrder = { 
                id: orderRef.id, 
                totalAmount, 
                creditsUsed: creditsToUse,
                cartItems: snapshot.docs, 
                results: validItems 
              };
              document.getElementById('paymentAmount').innerText = totalAmount;
              document.getElementById('creditUse').value = creditsToUse;
              document.getElementById('paymentModal').style.display = 'flex';
            });
          });
        });
      })
      .catch(err => {
        showMinimalSwal({ icon: 'error', title: err.message });
      });
  });
}

function processPayment() {
  if (!currentOrder || !currentUser) return;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const creditsToUse = parseInt(document.getElementById('creditUse').value) || 0;
  
  db.collection('users').doc(currentUser.uid).get().then(doc => {
    const userCredit = doc.data().credit || 0;
    const maxCredits = Math.min(creditsToUse, userCredit, currentOrder.totalAmount);
    const finalAmount = Math.max(0, currentOrder.totalAmount - maxCredits);
    const transactionId = `TXN${Date.now()}`;
    const totalCreditsEarned = currentOrder.results.reduce((sum, { item, prod }) => sum + (prod.credit || 0) * item.quantity, 0);

    setTimeout(() => {
      db.collection('payments').add({
        userId: currentUser.uid,
        orderId: currentOrder.id,
        amount: finalAmount,
        creditsUsed: maxCredits,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        status: 'completed',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        const batch = db.batch();
        currentOrder.results.forEach(({ item, prod, prodDoc }) => {
          batch.update(db.collection('products').doc(item.productId), {
            stock: prod.stock - item.quantity
          });
          batch.delete(db.collection('users').doc(currentUser.uid).collection('cart').doc(item.id));
        });
        batch.update(db.collection('users').doc(currentUser.uid), {
          credit: firebase.firestore.FieldValue.increment(-maxCredits + totalCreditsEarned)
        });
        batch.update(db.collection('orders').doc(currentOrder.id), {
          status: 'confirmed',
          paymentStatus: 'paid'
        });
        batch.commit().then(() => {
          showMinimalSwal({ icon: 'success', title: `Payment successful! $${finalAmount} paid + ${maxCredits} credits used.` })
            .then(() => {
              generateInvoice(finalAmount, maxCredits, paymentMethod, transactionId);
              closePaymentModal();
              loadCart();
              updateCartCount();
              currentOrder = null;
              loadProducts();
            });
        });
      });
    }, 1000);
  });
}

function generateInvoice(finalAmount, creditsUsed, paymentMethod, transactionId) {
  const order = currentOrder;
  const items = order.results.map(({ item, prod }) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    total: item.quantity * item.price,
    creditsEarned: (prod.credit || 0) * item.quantity
  }));
  const totalAmountBeforeDiscount = items.reduce((sum, item) => sum + item.total, 0);
  const discount = creditsUsed;
  const totalAmount = finalAmount;

  const invoiceHTML = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .invoice { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { color: #ff6f61; }
        .items-list { margin-bottom: 20px; }
        .item { padding: 10px; border-bottom: 1px solid #ddd; }
        .item:last-child { border-bottom: none; }
        .item span { display: block; margin: 5px 0; }
        .footer { text-align: right; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>ShopSphere Invoice</h1>
          <p>Order ID: ${order.id}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>Transaction ID: ${transactionId}</p>
        </div>
        <div class="items-list">
          ${items.map(item => `
            <div class="item">
              <span><strong>Item:</strong> ${item.name}</span>
              <span><strong>Quantity:</strong> ${item.quantity}</span>
              <span><strong>Price:</strong> $${item.price}</span>
              <span><strong>Total:</strong> $${item.total}</span>
              <span><strong>Credits Earned:</strong> ${item.creditsEarned}</span>
            </div>
          `).join('')}
        </div>
        <div class="footer">
          <p>Total Before Discount: $${totalAmountBeforeDiscount.toFixed(2)}</p>
          <p>Credits Used: ${creditsUsed}</p>
          <p>Final Amount Paid: $${finalAmount.toFixed(2)}</p>
          <p>Payment Method: ${paymentMethod}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([invoiceHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${order.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    showMinimalSwal({ icon: 'success', title: 'Logged out successfully.' });
    updateNavAfterLogin();
    showSection('home');
  });
}

document.querySelector('.subscribe-btn').addEventListener('click', () => {
  const emailInput = document.querySelector('.footer-column input[type="email"]');
  const email = emailInput.value.trim();
  const isSubscribed = document.querySelector('.footer-column input[type="checkbox"]').checked;

  if (!email) {
    showMinimalSwal({ icon: 'warning', title: 'Please enter an email!' });
    return;
  }

  if (currentUser) {
    db.collection('users').doc(currentUser.uid).update({
      subscriptions: firebase.firestore.FieldValue.arrayUnion(email),
      newsletter: isSubscribed
    }).then(() => {
      showMinimalSwal({ icon: 'success', title: 'Subscribed successfully!' });
      emailInput.value = '';
    }).catch(err => {
      showMinimalSwal({ icon: 'error', title: 'Error: ' + err.message });
    });
  } else {
    showMinimalSwal({ icon: 'success', title: 'Subscribed successfully!' });
    emailInput.value = '';
  }
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateNavAfterLogin();
  updateCartCount();
  if (user && user.email === ADMIN_EMAIL && window.location.pathname.includes('index.html')) {
    window.location.href = 'admin.html';
  } else if (!user) {
    showSection('login');
  }
});

window.addEventListener('load', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  showSection('home');
});