let loadPromise = null;

export default function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load payment gateway'));
      };
      document.body.appendChild(script);
    });
  }

  return loadPromise;
}