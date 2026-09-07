if (!customElements.get('cart-age-confirm')) {
  class CartAgeConfirm extends HTMLElement {
    constructor() {
      super();
      this.ageCheckbox = this.querySelector('.js-cart-age-checkbox');
      this.form = document.getElementById(this.ageCheckbox.getAttribute('form'));
      this.submitHandler = this.handleSubmit.bind(this);

      // Catch both form submit and checkout button click
      this.form.addEventListener('submit', this.submitHandler);

      const checkoutButton = this.form.querySelector('button[name="checkout"]');
      if (checkoutButton) {
        checkoutButton.addEventListener('click', this.submitHandler);
      }
    }

    disconnectedCallback() {
      this.form.removeEventListener('submit', this.submitHandler);
    }

    handleSubmit(evt) {
      if (!this.ageCheckbox.checked) {
        evt.preventDefault();
        evt.stopPropagation();
        alert("Please confirm that you are above 18 years old to receive the Andatech Multitool.");
        return false;
      }
    }
  }

  customElements.define('cart-age-confirm', CartAgeConfirm);
}
