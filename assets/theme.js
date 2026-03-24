document.addEventListener('DOMContentLoaded', function() {

  // ============================================================================
  // 1. CART MODULE (AJAX Cart API)
  // ============================================================================

  const CartModule = (() => {
    const CART_API = '/cart';

    /**
     * Fetch current cart via /cart.js
     */
    async function fetchCart() {
      try {
        const response = await fetch(CART_API + '.js');
        if (!response.ok) throw new Error('Failed to fetch cart');
        return await response.json();
      } catch (error) {
        console.error('Cart fetch error:', error);
        return null;
      }
    }

    /**
     * Add item to cart via POST /cart/add.js
     * @param {number} variantId - Shopify variant ID
     * @param {number} quantity - Quantity (default 1)
     */
    async function addToCart(variantId, quantity = 1) {
      try {
        const response = await fetch(CART_API + '/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: variantId, quantity: quantity }]
          })
        });
        if (!response.ok) throw new Error('Failed to add to cart');
        const cart = await response.json();
        refreshCartDrawer();
        return cart;
      } catch (error) {
        console.error('Add to cart error:', error);
        return null;
      }
    }

    /**
     * Change line item quantity via POST /cart/change.js
     * @param {number} line - Line index (1-based)
     * @param {number} quantity - New quantity
     */
    async function changeLineQuantity(line, quantity) {
      try {
        const response = await fetch(CART_API + '/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: line, quantity: quantity })
        });
        if (!response.ok) throw new Error('Failed to update cart');
        const cart = await response.json();
        refreshCartDrawer();
        return cart;
      } catch (error) {
        console.error('Change quantity error:', error);
        return null;
      }
    }

    /**
     * Remove line item (quantity 0)
     * @param {number} line - Line index (1-based)
     */
    function removeLineItem(line) {
      return changeLineQuantity(line, 0);
    }

    /**
     * Render cart drawer HTML and update cart count
     */
    async function refreshCartDrawer() {
      const cart = await fetchCart();
      if (!cart) return;

      const drawerEl = document.getElementById('cart-drawer');
      if (!drawerEl) return;

      const contentEl = drawerEl.querySelector('[data-cart-content]');
      if (!contentEl) return;

      // Update cart count badge
      const countBadges = document.querySelectorAll('[data-cart-count]');
      countBadges.forEach(badge => {
        badge.textContent = cart.item_count;
      });

      // Render empty state or items
      if (cart.items.length === 0) {
        contentEl.innerHTML = `
          <div class="flex flex-col items-center justify-center py-12">
            <svg class="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <p class="text-muted-foreground text-center">Your cart is empty</p>
          </div>
        `;
      } else {
        let itemsHTML = '<div class="space-y-4">';

        cart.items.forEach((item, index) => {
          const lineNumber = index + 1;
          const image = item.image ? `<img src="${item.image}" alt="${item.title}" class="w-16 h-16 object-cover rounded">` : '';
          const variantTitle = item.variant_title ? `<span class="text-xs text-muted-foreground">${item.variant_title}</span>` : '';
          const price = (item.price / 100).toFixed(2);

          itemsHTML += `
            <div class="flex gap-3 border-b pb-4">
              ${image}
              <div class="flex-1">
                <p class="font-medium text-sm">${item.title}</p>
                ${variantTitle}
                <p class="text-sm font-semibold mt-1">$${price}</p>
              </div>
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-1 border border-border rounded">
                  <button data-line="${lineNumber}" data-action="decrease" class="px-2 py-1 text-xs hover:bg-muted">−</button>
                  <span class="px-2 text-xs font-medium">${item.quantity}</span>
                  <button data-line="${lineNumber}" data-action="increase" class="px-2 py-1 text-xs hover:bg-muted">+</button>
                </div>
                <button data-line="${lineNumber}" data-action="remove" class="text-xs text-destructive hover:underline">Remove</button>
              </div>
            </div>
          `;
        });

        itemsHTML += '</div>';
        contentEl.innerHTML = itemsHTML;

        // Attach line item event listeners
        contentEl.querySelectorAll('[data-action="increase"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const line = parseInt(btn.dataset.line);
            const item = cart.items[line - 1];
            if (item) changeLineQuantity(line, item.quantity + 1);
          });
        });

        contentEl.querySelectorAll('[data-action="decrease"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const line = parseInt(btn.dataset.line);
            const item = cart.items[line - 1];
            if (item && item.quantity > 1) changeLineQuantity(line, item.quantity - 1);
          });
        });

        contentEl.querySelectorAll('[data-action="remove"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const line = parseInt(btn.dataset.line);
            removeLineItem(line);
          });
        });
      }

      // Render footer with total and checkout button
      const footerEl = drawerEl.querySelector('[data-cart-footer]');
      if (footerEl && cart.items.length > 0) {
        const total = (cart.total_price / 100).toFixed(2);
        footerEl.innerHTML = `
          <div class="border-t pt-4 space-y-3">
            <div class="flex justify-between font-semibold">
              <span>Total:</span>
              <span>$${total}</span>
            </div>
            <a href="/cart" class="block w-full bg-primary text-primary-foreground py-2 rounded text-center font-medium hover:opacity-90">
              Checkout
            </a>
          </div>
        `;
      } else if (footerEl) {
        footerEl.innerHTML = '';
      }
    }

    /**
     * Initialize cart drawer events
     */
    function init() {
      // Cart toggle button
      const toggleBtns = document.querySelectorAll('[data-cart-toggle]');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const drawer = document.getElementById('cart-drawer');
          const overlay = document.getElementById('cart-overlay');
          if (!drawer || !overlay) return;
          drawer.classList.toggle('is-open');
          overlay.classList.toggle('is-open');
        });
      });

      // Cart overlay close
      const overlay = document.getElementById('cart-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => {
          const drawer = document.getElementById('cart-drawer');
          if (drawer) {
            drawer.classList.remove('is-open');
            overlay.classList.remove('is-open');
          }
        });
      }

      // Add to cart buttons
      const addBtns = document.querySelectorAll('.btn-add-to-cart');
      addBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const variantId = btn.dataset.variantId;
          if (!variantId) return;
          addToCart(parseInt(variantId), 1).then(() => {
            const drawer = document.getElementById('cart-drawer');
            const overlay = document.getElementById('cart-overlay');
            if (drawer && overlay) {
              drawer.classList.add('is-open');
              overlay.classList.add('is-open');
            }
          });
        });
      });

      // Initial cart count
      fetchCart().then(cart => {
        if (cart) {
          const countBadges = document.querySelectorAll('[data-cart-count]');
          countBadges.forEach(badge => {
            badge.textContent = cart.item_count;
          });
        }
      });
    }

    return { init, fetchCart, addToCart, changeLineQuantity, removeLineItem, refreshCartDrawer };
  })();


  // ============================================================================
  // 2. HEADER — STICKY SCROLL SHRINK
  // ============================================================================

  const HeaderModule = (() => {
    function init() {
      const header = document.getElementById('site-header');
      if (!header) return;

      const handleScroll = () => {
        if (window.scrollY > 60) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return { init };
  })();


  // ============================================================================
  // 3. MOBILE MENU
  // ============================================================================

  const MobileMenuModule = (() => {
    function init() {
      const menuOpenBtns = document.querySelectorAll('[data-menu-open]');
      const menuCloseBtns = document.querySelectorAll('[data-menu-close]');
      const overlay = document.querySelector('.mobile-nav-overlay');

      if (!overlay) return;

      const open = () => {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      };

      const close = () => {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      };

      menuOpenBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          open();
        });
      });

      menuCloseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          close();
        });
      });

      // Close on resize to desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
          close();
        }
      });
    }

    return { init };
  })();


  // ============================================================================
  // 4. SCROLL REVEAL (IntersectionObserver)
  // ============================================================================

  const ScrollRevealModule = (() => {
    function init() {
      const reveals = document.querySelectorAll('[data-reveal]');
      if (reveals.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const el = entry.target;
              const delay = el.dataset.revealDelay || '0ms';
              el.style.transitionDelay = delay;
              el.classList.add('is-visible');
              observer.unobserve(el);
            }
          });
        },
        { threshold: 0.15 }
      );

      reveals.forEach(el => observer.observe(el));
    }

    return { init };
  })();


  // ============================================================================
  // 5. TESTIMONIALS CAROUSEL (mobile only)
  // ============================================================================

  const TestimonialsCarouselModule = (() => {
    let currentIndex = 0;
    let autoPlayTimeout;
    let container;
    let cards;
    let dots;

    function showCard(index) {
      if (!cards || cards.length === 0) return;

      currentIndex = (index + cards.length) % cards.length;

      cards.forEach((card, i) => {
        if (i === currentIndex) {
          card.style.display = '';
          card.classList.add('animate-crossfade-in');
        } else {
          card.style.display = 'none';
          card.classList.remove('animate-crossfade-in');
        }
      });

      updateDots();
      resetAutoPlay();
    }

    function updateDots() {
      if (!dots) return;
      dots.forEach((dot, i) => {
        if (i === currentIndex) {
          dot.style.backgroundColor = 'var(--color-primary, #000)';
          dot.style.transform = 'scale(1.25)';
        } else {
          dot.style.backgroundColor = 'var(--color-border, #ddd)';
          dot.style.transform = 'scale(1)';
        }
      });
    }

    function resetAutoPlay() {
      clearTimeout(autoPlayTimeout);
      autoPlayTimeout = setTimeout(() => {
        showCard(currentIndex + 1);
      }, 5000);
    }

    function init() {
      container = document.querySelector('[data-testimonials-carousel]');
      if (!container) return;

      cards = container.querySelectorAll('[data-testimonial-card]');
      dots = container.querySelectorAll('[data-carousel-dot]');

      if (cards.length === 0) return;

      // Prev/Next buttons
      const prevBtns = container.querySelectorAll('[data-carousel-prev]');
      const nextBtns = container.querySelectorAll('[data-carousel-next]');

      prevBtns.forEach(btn => {
        btn.addEventListener('click', () => showCard(currentIndex - 1));
      });

      nextBtns.forEach(btn => {
        btn.addEventListener('click', () => showCard(currentIndex + 1));
      });

      // Dot buttons
      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => showCard(i));
      });

      // Touch/Swipe
      let touchStartX = 0;
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        clearTimeout(autoPlayTimeout);
      });

      container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (diff > 50) {
          showCard(currentIndex + 1);
        } else if (diff < -50) {
          showCard(currentIndex - 1);
        }
        resetAutoPlay();
      });

      // Initial setup
      showCard(0);
    }

    return { init };
  })();


  // ============================================================================
  // 6. PRODUCT GALLERY (thumbnail switcher)
  // ============================================================================

  const ProductGalleryModule = (() => {
    function init() {
      const mainImage = document.getElementById('product-main-image');
      const thumbs = document.querySelectorAll('[data-thumb]');

      if (!mainImage || thumbs.length === 0) return;

      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const src = thumb.dataset.src;
          const isBottle = thumb.dataset.isBottle === 'true';

          if (!src) return;

          // Update main image
          mainImage.src = src;
          mainImage.dataset.bottleView = isBottle;

          // Update active state on thumbnails
          thumbs.forEach(t => {
            if (t === thumb) {
              t.style.borderColor = 'var(--color-foreground, #000)';
              t.style.transform = 'scale(1.03)';
            } else {
              t.style.borderColor = 'var(--color-border, #ddd)';
              t.style.transform = 'scale(1)';
            }
          });
        });
      });

      // Set first thumbnail as active by default
      if (thumbs.length > 0) {
        thumbs[0].click();
      }
    }

    return { init };
  })();


  // ============================================================================
  // 7. FLAVOR BARS (IntersectionObserver)
  // ============================================================================

  const FlavorBarsModule = (() => {
    function init() {
      const bars = document.querySelectorAll('[data-flavor-bar]');
      if (bars.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const bar = entry.target;
              const value = parseInt(bar.dataset.value) || 0;
              const delay = bar.dataset.delay || '0ms';
              const fill = bar.querySelector('.flavor-bar-fill');

              if (fill) {
                fill.style.transitionDelay = delay;
                fill.style.width = ((value / 5) * 100) + '%';
              }

              observer.unobserve(bar);
            }
          });
        },
        { threshold: 0.3 }
      );

      bars.forEach(bar => observer.observe(bar));
    }

    return { init };
  })();


  // ============================================================================
  // 8. BEAT BOX / FREESTYLER PICKER
  // ============================================================================

  const BundlePickerModule = (() => {
    function init() {
      const pickers = document.querySelectorAll('[data-bundle-picker]');
      if (pickers.length === 0) return;

      pickers.forEach(picker => {
        const pickCount = parseInt(picker.dataset.pickCount) || 0;
        const options = picker.querySelectorAll('[data-sauce-option]');
        const submitBtn = picker.querySelector('[data-bundle-submit]');
        let selections = [];
        const selectionCounts = {};

        if (!submitBtn) return;

        const updateSubmitBtn = () => {
          submitBtn.disabled = selections.length !== pickCount;
        };

        options.forEach(option => {
          const sauceId = option.dataset.sauceId;
          const variantId = option.dataset.variantId;

          option.addEventListener('click', () => {
            const index = selections.indexOf(variantId);

            if (index > -1) {
              // Already selected, remove
              selections.splice(index, 1);
              selectionCounts[sauceId] = (selectionCounts[sauceId] || 1) - 1;
              if (selectionCounts[sauceId] <= 0) {
                delete selectionCounts[sauceId];
              }
              option.style.borderColor = 'var(--color-border, #ddd)';
              option.style.backgroundColor = '';
            } else {
              // Not selected yet
              if (selections.length < pickCount) {
                selections.push(variantId);
                selectionCounts[sauceId] = (selectionCounts[sauceId] || 0) + 1;
                option.style.borderColor = 'var(--color-primary, #000)';
                option.style.backgroundColor = 'rgba(var(--color-primary-rgb, 0, 0, 0), 0.1)';
              }
            }

            // Update count badge
            const countBadge = option.querySelector('[data-count-badge]');
            if (countBadge) {
              const count = selectionCounts[sauceId] || 0;
              countBadge.textContent = count;
              countBadge.style.display = count > 0 ? 'inline-block' : 'none';
            }

            updateSubmitBtn();
          });
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
          if (selections.length !== pickCount) return;

          for (const variantId of selections) {
            await CartModule.addToCart(parseInt(variantId), 1);
          }

          const drawer = document.getElementById('cart-drawer');
          const overlay = document.getElementById('cart-overlay');
          if (drawer && overlay) {
            drawer.classList.add('is-open');
            overlay.classList.add('is-open');
          }
        });

        updateSubmitBtn();
      });
    }

    return { init };
  })();


  // ============================================================================
  // 9. PROMO POPUP
  // ============================================================================

  const PromoPopupModule = (() => {
    function init() {
      const popup = document.getElementById('promo-popup');
      if (!popup) return;

      setTimeout(() => {
        if (!localStorage.getItem('promo-dismissed')) {
          popup.classList.add('is-open');
        }
      }, 3000);

      const closeBtn = popup.querySelector('#promo-popup-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          popup.classList.remove('is-open');
          localStorage.setItem('promo-dismissed', 'true');
        });
      }

      // Backdrop click
      const backdrop = popup.querySelector('.promo-popup-overlay');
      if (backdrop) {
        backdrop.addEventListener('click', () => {
          popup.classList.remove('is-open');
          localStorage.setItem('promo-dismissed', 'true');
        });
      }

      // Form submit
      const form = popup.querySelector('form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          popup.classList.remove('is-open');
          localStorage.setItem('promo-dismissed', 'true');
        });
      }
    }

    return { init };
  })();


  // ============================================================================
  // 10. COLLECTION FILTER TABS
  // ============================================================================

  const CollectionFilterModule = (() => {
    function init() {
      const tabs = document.querySelectorAll('[data-filter-tab]');
      const cards = document.querySelectorAll('[data-product-card]');

      if (tabs.length === 0 || cards.length === 0) return;

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const filter = tab.dataset.filter;

          // Update tab active states
          tabs.forEach(t => {
            if (t === tab) {
              t.style.backgroundColor = 'var(--color-primary, #000)';
              t.style.color = 'var(--color-primary-foreground, #fff)';
              t.style.borderColor = 'var(--color-primary, #000)';
            } else {
              t.style.color = 'var(--color-muted-foreground, #666)';
              t.style.borderColor = 'var(--color-border, #ddd)';
              t.style.backgroundColor = '';
            }
          });

          // Filter cards
          cards.forEach(card => {
            const cardType = card.dataset.type;
            if (filter === 'all' || cardType === filter) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });

      // Set first tab as active by default
      if (tabs.length > 0) {
        tabs[0].click();
      }
    }

    return { init };
  })();


  // ============================================================================
  // INITIALIZE ALL MODULES
  // ============================================================================

  CartModule.init();
  HeaderModule.init();
  MobileMenuModule.init();
  ScrollRevealModule.init();
  TestimonialsCarouselModule.init();
  ProductGalleryModule.init();
  FlavorBarsModule.init();
  BundlePickerModule.init();
  PromoPopupModule.init();
  CollectionFilterModule.init();

});
