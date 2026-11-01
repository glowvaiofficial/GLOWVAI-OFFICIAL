import React from 'react';
import { ChevronDown, ChevronLeft, MapPin, Search, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showLocation?: boolean;
  showSearch?: boolean;
  onLocationClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  showLocation = true,
  showSearch = true,
  onLocationClick,
}) => {
  const { goBack, currentAddress, navigate, cartItemCount } = useApp();

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ minHeight: 66, padding: '9px 16px 8px', display: 'flex', alignItems: 'center', gap: 11 }}>
        {showBack && (
          <button className="icon-button" onClick={goBack} aria-label="Go back">
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {title ? (
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 750, letterSpacing: '-.25px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
          ) : showLocation ? (
            <button onClick={onLocationClick} style={{ width: '100%', textAlign: 'left' }} aria-label="Change delivery location">
              <span style={{ display: 'block', color: currentAddress.serviceable ? 'var(--success)' : 'var(--warning)', fontSize: 11, fontWeight: 800, letterSpacing: '.15px' }}>
                {currentAddress.serviceable ? `Delivery in ${currentAddress.deliveryMinutes} minutes` : 'Standard delivery'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={14} color="var(--primary)" fill="var(--primary-light)" />
                <strong className="line-clamp-1" style={{ maxWidth: 190, fontSize: 14 }}>{currentAddress.area}, Vijayawada</strong>
                <ChevronDown size={15} color="var(--text-secondary)" />
              </span>
            </button>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {showSearch && (
            <button className="icon-button" onClick={() => navigate('search')} aria-label="Search products">
              <Search size={19} />
            </button>
          )}
          <button className="icon-button" onClick={() => navigate('cart')} aria-label={`Cart with ${cartItemCount} items`} style={{ position: 'relative' }}>
            <ShoppingBag size={19} />
            {cartItemCount > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, display: 'grid', minWidth: 19, height: 19, placeItems: 'center', padding: '0 4px', border: '2px solid #fff', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 800 }}>{cartItemCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
