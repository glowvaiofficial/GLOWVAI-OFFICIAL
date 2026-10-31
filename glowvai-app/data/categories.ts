export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'cat-skincare',
    name: 'Skin Care',
    slug: 'skincare',
    description: 'Targeted serums, sunscreens, cleansers & derm-backed actives',
    subcategories: [
      'All Skin Care',
      'Face Wash & Cleansers',
      'Moisturisers & Creams',
      'Sunscreens (SPF)',
      'Serums & Treatments',
      'Toners & Mists',
      'Lip Care',
    ],
  },
  {
    id: 'cat-cosmetics',
    name: 'Cosmetics',
    slug: 'cosmetics',
    description: 'Everyday face makeup, lip shades, and gentle removers',
    subcategories: [
      'All Cosmetics',
      'Foundation & Concealer',
      'Lipsticks & Tints',
      'Eye Makeup',
      'Makeup Removers',
    ],
  },
  {
    id: 'cat-accessories',
    name: 'Beauty Accessories',
    slug: 'accessories',
    description: 'Facial rollers, applicators, and blending tools',
    subcategories: [
      'All Accessories',
      'Facial Rollers & Gua Sha',
      'Applicators & Sponges',
      'Hair Bands & Clips',
    ],
  },
];
