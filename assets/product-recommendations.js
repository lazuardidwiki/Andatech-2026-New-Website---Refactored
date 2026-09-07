class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
    // Cart drawer recommendations: fetch immediately so they're ready when the
    // drawer opens (the drawer is hidden, so IntersectionObserver never fires
    // until it's open, causing a visible pause). Other recommendations keep
    // lazy behaviour so we don't pay for them until they scroll into view.
    if (this.id === 'cart-recommendations') {
      this.init();
    } else {
      window.initLazyScript(this, this.init.bind(this), 500);
    }
  }

  async init() {
    const { productId } = this.dataset;
    if (!productId) return;

    try {
      const response = await fetch(`${this.dataset.url}&product_id=${productId}`);
      if (!response.ok) throw new Error(response.status);

      const tmpl = document.createElement('template');
      tmpl.innerHTML = await response.text();

      const el = tmpl.content.querySelector('product-recommendations');
      if (el && el.hasChildNodes()) {
        this.innerHTML = el.innerHTML;
      }
    } catch (error) {
      console.log(error); // eslint-disable-line
    }
  }
}

customElements.define('product-recommendations', ProductRecommendations);
