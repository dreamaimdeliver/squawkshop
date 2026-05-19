// Slick Slider inspired with
/*!
 * Copyright (c) 2024 by Pedro Castro (https://codepen.io/aspeddro/pen/zqyJBr)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
 * and associated documentation files (the "Software"), to deal in the Software without restriction, 
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies 
 * or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *  * Modified by: Mana Themes
 * Changes:
 * - The JavaScript has been extensively rewritten to enhance functionality and adapt it for the theme's specific requirements.
 * - The Liquid files have been customized to align with the theme's design and layout needs.
 */

class SlickSlider extends HTMLElement {
    constructor() {
      super();
      this.current = 0;
      this.autoUpdate = false;
      this.timeTrans = 4000;
      this.slides = null;
    }
  
    connectedCallback() {
      this.initSlider();
    }
  
  initSlider() {
    const slickMain = this.closest(".slick-main");
    if (slickMain) {
      const enableAutoplay = slickMain.getAttribute("data-enable-autoplay");
      const autoplaySpeed = slickMain.getAttribute("data-autoplay-speed");
      this.autoUpdate = enableAutoplay === "true";
      this.timeTrans = autoplaySpeed ? parseInt(autoplaySpeed) * 1000 : 4000;
    }
  
    this.slides = this.querySelectorAll("li");
  
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
    }
  
    const existingNav = this.querySelector(".nav_arrows");
    if (existingNav) existingNav.remove();
  
    if (this.slides.length > 1) {
      const nav = document.createElement("slick-nav");
      nav.className = "nav_arrows";
  
      const prevBtn = document.createElement("button");
      prevBtn.className = "prev";
      prevBtn.setAttribute("aria-label", "Prev");
  
      const nextBtn = document.createElement("button");
      nextBtn.className = "next";
      nextBtn.setAttribute("aria-label", "Next");
  
      const counter = document.createElement("div");
      counter.className = "slick-counter";
      counter.innerHTML = `<span>1</span><span>${this.slides.length}</span>`;
  
      nav.appendChild(prevBtn);
      nav.appendChild(counter);
      nav.appendChild(nextBtn);
      this.appendChild(nav);
  
      this.slides[this.current].classList.add("current");
      this.slides[this.slides.length - 1].classList.add("prev_slide");
  
      prevBtn.addEventListener("click", () => this.navigate("left"));
      nextBtn.addEventListener("click", () => this.navigate("right"));
  
      if (this.autoUpdate) {
        this.autoUpdateInterval = setInterval(() => {
          this.navigate("right");
        }, this.timeTrans);
      }
  
      this.addEventListener("mouseenter", () => {
        if (this.autoUpdateInterval) clearInterval(this.autoUpdateInterval);
      });
  
      this.addEventListener("mouseleave", () => {
        if (this.autoUpdate && !this.autoUpdateInterval) {
          this.autoUpdateInterval = setInterval(() => {
            this.navigate("right");
          }, this.timeTrans);
        }
      });
  
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowLeft") this.navigate("left");
        if (ev.key === "ArrowRight") this.navigate("right");
      });
  
      this.addEventListener("touchstart", (ev) => this.handleTouchStart(ev), false);
      this.addEventListener("touchmove", (ev) => this.handleTouchMove(ev), false);
    }
  }
  
    navigate(direction) {
      this.slides.forEach((slide) => {
        slide.classList.remove("current", "prev_slide");
      });
  
      if (direction === "right") {
        this.current =
          this.current < this.slides.length - 1 ? this.current + 1 : 0;
      } else {
        this.current =
          this.current > 0 ? this.current - 1 : this.slides.length - 1;
      }
  
      const nextCurrent =
        this.current < this.slides.length - 1 ? this.current + 1 : 0;
      const prevCurrent =
        this.current > 0 ? this.current - 1 : this.slides.length - 1;
  
      this.slides[this.current].classList.add("current");
      this.slides[prevCurrent].classList.add("prev_slide");
  
      this.querySelector(".slick-counter span:first-child").textContent =
        this.current + 1;
    }
    handleTouchStart(evt) {
      this.xDown = evt.touches[0].clientX;
      this.yDown = evt.touches[0].clientY;
    }
  
    handleTouchMove(evt) {
      if (!this.xDown || !this.yDown) return;
  
      const xUp = evt.touches[0].clientX;
      const yUp = evt.touches[0].clientY;
  
      const xDiff = this.xDown - xUp;
      const yDiff = this.yDown - yUp;
  
      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) this.navigate("right");
        else this.navigate("left");
      }
  
      this.xDown = null;
      this.yDown = null;
    }
    disconnectedCallback() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
   }
  }
  
  customElements.define("slick-slider", SlickSlider);

  document.addEventListener('shopify:section:load', (event) => {
  const sliders = event.target.querySelectorAll('slick-slider');
  sliders.forEach(slider => slider.initSlider());
});