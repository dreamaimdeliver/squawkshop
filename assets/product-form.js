if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        this.form.querySelector("[name=id]").disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        if (document.querySelector("cart-drawer"))
          this.submitButton.setAttribute("aria-haspopup", "dialog");
      }

      refreshCartSections() {
        if (!this.cart) return Promise.resolve();

        const sectionIds = this.cart
          .getSectionsToRender()
          .map((s) => s.id)
          .join(",");

        const url =
          `${window.routes.cart_url}?sections=${sectionIds}` +
          `&sections_url=${encodeURIComponent(window.location.pathname)}`;

        return fetch(url, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
          .then((r) => r.json())
          .then((sections) => {
            this.cart.renderContents({ sections });
            publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form" });
          })
          .catch((e) => console.error(e));
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;

        this.handleErrorMessage();
        this.submitButton.setAttribute("aria-disabled", true);

        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.handleErrorMessage(response.description);

              const soldOutMessage =
                this.submitButton.querySelector(".sold-out-message");

              if (soldOutMessage) {
                this.submitButton.setAttribute("aria-disabled", true);
                this.submitButton.querySelector("span")?.classList.add("hidden");
                soldOutMessage.classList.remove("hidden");
              }

              this.error = true;

              if (!this.cart) {
                const cartUrl = window.routes?.cart_url || "/cart";
                if (window.location.pathname === cartUrl) {
                  window.location.reload();
                } else {
                  window.location.href = cartUrl;
                }
                return;
              }

              if (response.sections) {
                this.cart.renderContents(response);
                publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form" });
              } else {
                return this.refreshCartSections();
              }

              return;
            }

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form" });
            this.error = false;

            const quickAddModal = this.closest("quick-add-modal");
            if (quickAddModal) {
              document.body.addEventListener(
                "modalClosed",
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
              if (typeof AOS !== "undefined") AOS.init();
            } else {
              this.cart.renderContents(response);
              if (typeof AOS !== "undefined") AOS.init();
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove("loading");
            if (this.cart && this.cart.classList.contains("is-empty"))
              this.cart.classList.remove("is-empty");
            if (!this.error) this.submitButton.removeAttribute("aria-disabled");
            if (typeof AOS !== "undefined") AOS.init();
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;

        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          if (typeof errorMessage === "object") {
            const formattedMessage = Object.entries(errorMessage)
              .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
              .join(" | ");
            this.errorMessage.textContent = formattedMessage;
          } else {
            this.errorMessage.textContent = errorMessage;
          }
        }
      }
    }
  );

  let removedElements = {
    mobile: [],
    desktop: [],
  };

  function removeElementsByScreenSize(container = document) {
    if (window.matchMedia("(max-width: 990px)").matches) {
      document.querySelectorAll(".hide-mobile").forEach((el) => {
        removedElements.desktop.push({
          parent: el.parentNode,
          element: el,
          nextSibling: el.nextSibling,
        });
        el.remove();
      });

      removedElements.mobile.forEach(({ parent, element, nextSibling }) => {
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(element, nextSibling);
        } else {
          parent.appendChild(element);
        }
      });
      removedElements.mobile = [];
    } else {
      document.querySelectorAll(".hide-desktop").forEach((el) => {
        removedElements.mobile.push({
          parent: el.parentNode,
          element: el,
          nextSibling: el.nextSibling,
        });
        el.remove();
      });
      removedElements.desktop.forEach(({ parent, element, nextSibling }) => {
        if (nextSibling && nextSibling.parentNode === parent) {
          parent.insertBefore(element, nextSibling);
        } else {
          parent.appendChild(element);
        }
      });
      removedElements.desktop = [];
    }
  }

  removeElementsByScreenSize();
  window.addEventListener("resize", removeElementsByScreenSize);
  window.addEventListener("shopify:section:select", removeElementsByScreenSize);
}

class StickyAddToCart extends HTMLElement {
  constructor() {
    super();
    this._handleResize = this._debounce(
      this.initStickyAddToCart.bind(this),
      200
    );
  }

  connectedCallback() {
    this.initStickyAddToCart();
    window.addEventListener("resize", this._handleResize);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._handleResize);
  }

  initStickyAddToCart() {
    const img = this.querySelector(".product-content img");
    const selectField = this.querySelector('select[name="id"]');
    const addButton = this.querySelector('button[name="add"]');
    const productForm = document.querySelector(".product-form");

    if (!selectField || !addButton || !productForm) return;

    const addToCartText = addButton.getAttribute("data-add-to-cart");
    const soldOutText = addButton.getAttribute("data-sold-out");

    const checkVisibility = () => {
      const formRect = productForm.getBoundingClientRect();
      const footer = document.querySelector("footer");
      const footerRect = footer?.getBoundingClientRect();

      const isOutOfView = formRect.bottom <= 0;
      const isFooterVisible = footerRect && footerRect.top < window.innerHeight;

      if (isOutOfView && !isFooterVisible) {
        this.classList.add("show");
        document.documentElement.style.paddingBottom = `${this.clientHeight}px`;
      } else {
        this.classList.remove("show");
        document.documentElement.style.paddingBottom = "0";
      }
    };

    checkVisibility();
    window.addEventListener("scroll", checkVisibility);

    selectField.addEventListener("change", () => {
      const selectedOption = selectField.options[selectField.selectedIndex];

      if (selectedOption.dataset.img) {
        img.setAttribute("src", selectedOption.dataset.img);
      }

      if (selectedOption.getAttribute("data-available") === "false") {
        addButton.setAttribute("disabled", "true");
        addButton.querySelector("span").textContent = soldOutText;
      } else {
        addButton.removeAttribute("disabled");
        addButton.querySelector("span").textContent = addToCartText;
      }
    });

    document
      .querySelector('.product-form [name="id"]')
      ?.addEventListener("change", (e) => {
        const value = Number(e.target.value);
        if (value) selectField.value = value;
      });
  }

  _debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

customElements.define("sticky-add-to-cart", StickyAddToCart);

// Nutritional info

class IngredientDetails extends HTMLElement {
  constructor() {
      super();
  }
  connectedCallback() {
      let content = this.innerHTML;

      content = content.replace(/<\/?p>/g, '');
      content = content.replace(/<br\s*\/?>/g, '|||BR|||');

      let rows = content.split("|||BR|||").map(row => row.trim()).filter(row => row.length > 0);

      this.innerHTML = '';

      rows.forEach((row, index) => {
          setTimeout(() => { 
              let isIndented = false;

              if (row.startsWith('-')) {
                  row = row.substring(1).trim();
                  isIndented = true;
              }

      const element = document.querySelector('[data-ingredient-format]');
      const useAlternativeFormat = element.dataset.ingredientFormat === "true";

      let columns = row.split(useAlternativeFormat ? "#" : ",").map(col => col.trim());

              let rowElement = document.createElement("span");
              rowElement.classList.add("ingredient-details-content");

              if (isIndented) {
                  rowElement.classList.add("indented");
              }

              columns.forEach(col => {
                  let colElement = document.createElement("span");
                  colElement.innerHTML = col;
                  rowElement.appendChild(colElement);
              });

              this.appendChild(rowElement);
          }, index * 30); 
      });
  }
}

customElements.define("ingredient-details", IngredientDetails);