import React, { useState } from 'react';
import { ArrowRight, ChevronRight, GraduationCap, HelpCircle, LogIn, LogOut, MapPin, PackageCheck, ScanFace, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddressModal } from '../components/common/AddressModal';
import '../responsive/account.css';

export const ProfileScreen: React.FC = () => {
  const { user, customerDetails, logout, deleteAccount, navigate, currentAddress, orders, streaks, skinReports } = useApp();
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const name = customerDetails?.fullName || user?.name || 'Add your name';
  const phone = customerDetails?.phoneNumber || user?.phoneNumber || 'Contact details not added';

  const row = (icon: React.ReactNode, title: string, note: string, action: () => void, danger = false) => <button className={danger ? 'profile-row is-danger' : 'profile-row'} onClick={action}><span>{icon}</span><p><b>{title}</b><small>{note}</small></p><ChevronRight size={17} /></button>;

  // Wrapper columns are display: contents on phone and become the two desktop columns (responsive/account.css).
  return <main className="profile-v3">
    <div className="profile-v3-side">
    <header><div className="profile-avatar">{customerDetails ? customerDetails.fullName.slice(0, 1).toUpperCase() : <UserRound size={25} />}</div><div><small>YOUR ACCOUNT</small><h1>{name}</h1><p>{phone}</p></div><button onClick={() => navigate('customer-details', { from: 'profile' })} aria-label={customerDetails ? 'Edit contact details' : 'Add contact details'}>{customerDetails ? 'Edit' : 'Add'}</button></header>

    {!customerDetails && <button className="profile-complete" onClick={() => navigate('customer-details', { from: 'profile' })}><span><UserRound size={20} /></span><p><b>Complete your delivery profile</b><small>Save your name, phone and receipt email</small></p><ArrowRight size={18} /></button>}

    <section className="profile-quick-stats"><button onClick={() => navigate('order-history')}><b>{orders.length}</b><span>Orders</span></button><button onClick={() => navigate('skin-report')}><b>{skinReports.length}</b><span>Skin reports</span></button><button onClick={() => navigate('streak-tracking')}><b>{streaks.length}</b><span>Active routines</span></button></section>

    <section className="profile-address-card"><div><MapPin size={19} /><p><small>DELIVERING TO {currentAddress.label.toUpperCase()}</small><b>{currentAddress.street}, {currentAddress.area}</b><span>{currentAddress.city} · {currentAddress.pincode}</span></p></div><button onClick={() => setAddressModalOpen(true)}>Change</button></section>
    </div>

    <div className="profile-v3-main">
    <h2>Shopping</h2>
    <section className="profile-list">
      {row(<PackageCheck size={19} />, 'Your orders', orders.length ? `${orders.length} recent order${orders.length === 1 ? '' : 's'}` : 'Track, reorder or get help', () => navigate('order-history'))}
      {row(<ScanFace size={19} />, 'Skin reports', skinReports.length ? `${skinReports.length} report${skinReports.length === 1 ? '' : 's'} saved` : 'Scan or review recommendations', () => navigate('skin-report'))}
      {row(<ShieldCheck size={19} />, 'Suitability cover', streaks.length ? `${streaks.length} active routine${streaks.length === 1 ? '' : 's'}` : 'No covered products yet', () => navigate('streak-tracking'))}
    </section>

    <h2>Support and community</h2>
    <section className="profile-list">
      {row(<HelpCircle size={19} />, 'Help and support', 'Orders, payments and product concerns', () => navigate('support'))}
      {row(<GraduationCap size={19} />, 'Student programme', 'How campus ambassadors join', () => navigate('student-referral'))}
    </section>

    <h2>Account</h2>
    <section className="profile-list">
      {user
        ? row(<LogOut size={19} />, 'Log out', 'Sign out on this device', logout)
        : row(<LogIn size={19} />, 'Sign in', 'Use your phone number to sign in', () => navigate('login'))}
      {row(<Trash2 size={19} />, 'Delete account data', 'Remove saved details, reports and orders', () => setDeleteConfirmOpen(true), true)}
    </section>
    <footer>glowvai · Vijayawada</footer>
    </div>

    <AddressModal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)} />
    {deleteConfirmOpen && <div className="profile-dialog-backdrop"><div className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span><Trash2 size={22} /></span><h3 id="delete-title">Delete your account data?</h3><p>This signs you out and removes your saved contact details, skin reports, orders, cart and routine progress from this shop. It cannot be undone.</p><button onClick={() => setDeleteConfirmOpen(false)}>Keep my data</button><button className="is-danger" onClick={() => { setDeleteConfirmOpen(false); deleteAccount(); }}>Delete my data</button></div></div>}
  </main>;
};
