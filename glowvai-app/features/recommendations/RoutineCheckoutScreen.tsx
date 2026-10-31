import React from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { INDIAN_SKINCARE_CATALOG } from '../../core/data/indianSkincareCatalog';
import { useCartStore } from '../../core/state/cartStore';
import { formatRupee, getProductImageUrl } from '../shop/shared/shopUtils';

// The three routine steps, as real catalogue products. Prices and stock come from the catalogue, not from this file.
const ROUTINE_PRODUCT_IDS = ['prod-17', 'prod-01', 'prod-12'];

export const RoutineCheckoutScreen: React.FC = () => {
  const { goBack, navigate } = useApp();
  const addItem = useCartStore((state) => state.addItem);
  const products = ROUTINE_PRODUCT_IDS.map((id) => INDIAN_SKINCARE_CATALOG.find((p) => p.id === id)).filter(
    (p): p is (typeof INDIAN_SKINCARE_CATALOG)[number] => Boolean(p)
  );
  const total = products.reduce((sum, product) => sum + product.price, 0);

  const addRoutineToCart = () => {
    products.forEach((product) =>
      addItem({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: getProductImageUrl(product),
        price: product.price,
        mrp: product.originalPrice,
      })
    );
    navigate('cart-tab');
  };

  return (
    <main className="rec-screen rec-checkout">
      <header className="rec-header">
        <button className="rec-back" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Shop this routine</h1>
          <p>Three steps, added to your cart together</p>
        </div>
      </header>

      <div className="rec-body">
        <section className="rec-card rec-checkout-list" aria-label="Routine products">
          {products.map((product) => (
            <article key={product.id} className="rec-checkout-item">
              {product.official_brand_image_url && <img src={getProductImageUrl(product)} alt="" />}
              <div>
                <small>{product.brand}</small>
                <b>{product.name}</b>
                <p>{product.volume}</p>
              </div>
              <strong>{formatRupee(product.price)}</strong>
            </article>
          ))}
        </section>

        <section className="rec-card rec-checkout-total">
          <div>
            <span>Routine total</span>
            <b>{formatRupee(total)}</b>
          </div>
          <p>Delivery and any offers are calculated in your cart before you pay.</p>
        </section>
      </div>

      <footer className="rec-sticky-bar">
        <button className="rec-primary" onClick={addRoutineToCart} disabled={products.length === 0}>
          <ShoppingBag size={18} />
          Add routine to cart
        </button>
      </footer>
    </main>
  );
};
