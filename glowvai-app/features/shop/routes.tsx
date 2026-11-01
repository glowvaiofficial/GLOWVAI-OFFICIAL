import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import './shop.css';
import { ShopHomeScreen } from './screens/ShopHomeScreen';
import { ShopBrowseScreen } from './screens/ShopBrowseScreen';
import { ShopCategoryScreen } from './screens/ShopCategoryScreen';
import { ShopProductScreen } from './screens/ShopProductScreen';
import { ShopProductReviewsScreen } from './screens/ShopProductReviewsScreen';
import { ShopSearchFiltersScreen } from './screens/ShopSearchFiltersScreen';
import { ShopWishlistScreen } from './screens/ShopWishlistScreen';
import '../../responsive/shop-ported.css';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'shop-home': ShopHomeScreen,
  'shop-browse': ShopBrowseScreen,
  'shop-category': ShopCategoryScreen,
  'shop-product': ShopProductScreen,
  'shop-product-reviews': ShopProductReviewsScreen,
  'shop-search-filters': ShopSearchFiltersScreen,
  'shop-wishlist': ShopWishlistScreen,
};
