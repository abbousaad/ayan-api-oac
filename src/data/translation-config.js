const TRANSLATION_CONFIG = {
  defaultLocale: 'en',
  activeLocales: ['en', 'fr', 'ar'],
  translations: {
    en: {
      'nav.about': 'About',
      'nav.products': 'Products',
      'nav.cart': 'Cart',
      'cart.checkout': 'Checkout',
      'cart.continue': 'Continue Shopping',
      'cart.empty': 'Your cart is empty',
      'product.addToCart': 'Add to Cart',
      'product.price': 'Price',
      'product.stock': 'In Stock',
      'home.welcome': 'Welcome',
      'home.featured': 'Featured Products',
      'button.login': 'Login',
      'button.logout': 'Logout',
      'button.register': 'Register'
    },
    fr: {
      'nav.about': 'À propos',
      'nav.products': 'Produits',
      'nav.cart': 'Panier',
      'cart.checkout': 'Commander',
      'cart.continue': 'Continuer vos achats',
      'cart.empty': 'Votre panier est vide',
      'product.addToCart': 'Ajouter au panier',
      'product.price': 'Prix',
      'product.stock': 'En stock',
      'home.welcome': 'Bienvenue',
      'home.featured': 'Produits en vedette',
      'button.login': 'Connexion',
      'button.logout': 'Déconnexion',
      'button.register': 'S\'inscrire'
    },
    ar: {
      'nav.about': 'لوح',
      'nav.products': 'المنتجات',
      'nav.cart': 'العربة',
      'cart.checkout': 'عفدلا',
      'cart.continue': 'متابعة التسوق',
      'cart.empty': 'عربتك فارغة',
      'product.addToCart': 'أضف إلى العربة',
      'product.price': 'السعر',
      'product.stock': 'في المخزن',
      'home.welcome': 'أهلا وسهلا',
      'home.featured': 'المنتجات المميزة',
      'button.login': 'الدخول',
      'button.logout': 'الخروج',
      'button.register': 'يسجل'
    }
  }
};

const getTranslationConfigStore = () => ({ ...TRANSLATION_CONFIG });

module.exports = { getTranslationConfigStore };
