import React, { useState } from 'react';
import { X, Check, MapPin, Plus, Navigation } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VIJAYAWADA_AREAS } from '../../data/serviceability';
import { Address } from '../../types';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({ isOpen, onClose }) => {
  const { currentAddress, savedAddresses, selectAddress, addAddress } = useApp();
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New address form state
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [selectedArea, setSelectedArea] = useState(VIJAYAWADA_AREAS[0].name);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [instructions, setInstructions] = useState('');

  if (!isOpen) return null;

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) return;

    const areaMatch = VIJAYAWADA_AREAS.find((a) => a.name === selectedArea) || VIJAYAWADA_AREAS[0];

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      label,
      street: street.trim(),
      landmark: landmark.trim() || undefined,
      area: areaMatch.name,
      city: 'Vijayawada',
      pincode: areaMatch.pincode,
      serviceable: true,
      deliveryMinutes: areaMatch.estimatedMinutes,
      isDefault: false,
      deliveryInstructions: instructions.trim() || undefined,
    };

    addAddress(newAddr);
    setIsAddingNew(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          padding: '20px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#161A22', fontFamily: 'var(--font-heading)' }}>
              {isAddingNew ? 'Add Delivery Address' : 'Select Delivery Location'}
            </h2>
            <p style={{ fontSize: '12px', color: '#687080' }}>Vijayawada, Andhra Pradesh</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '999px',
              backgroundColor: '#F0F2F6',
              color: '#687080',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {!isAddingNew ? (
          <div>
            {/* List of saved addresses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {savedAddresses.map((addr) => {
                const isSelected = addr.id === currentAddress.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      selectAddress(addr);
                      onClose();
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isSelected ? '#2854C5' : '#E2E5EB'}`,
                      backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div
                        style={{
                          marginTop: '2px',
                          color: isSelected ? '#2854C5' : '#687080',
                        }}
                      >
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#161A22' }}>
                            {addr.label}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#19734F',
                              backgroundColor: '#F0FDF4',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ⚡ {addr.deliveryMinutes} mins
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#545B69', marginTop: '3px' }}>
                          {addr.street}, {addr.area}
                        </p>
                        {addr.landmark && (
                          <p style={{ fontSize: '11px', color: '#818896' }}>Landmark: {addr.landmark}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#2854C5" strokeWidth={2.5} />}
                  </div>
                );
              })}
            </div>

            {/* Add new address button */}
            <button
              onClick={() => setIsAddingNew(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px dashed #CBD5E1',
                backgroundColor: '#F7F8FB',
                color: '#2854C5',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              <span>Add New Address in Vijayawada</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveNewAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Label chips */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                Address Type
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['Home', 'Work', 'Other'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLabel(l)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1px solid ${label === l ? '#2854C5' : '#E2E5EB'}`,
                      backgroundColor: label === l ? '#F0F7FF' : '#FFFFFF',
                      color: label === l ? '#2854C5' : '#545B69',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                Vijayawada Locality
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#161A22',
                  fontSize: '13px',
                }}
              >
                {VIJAYAWADA_AREAS.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} (PIN: {a.pincode} • {a.quickCommerceAvailable ? `${a.estimatedMinutes}m express` : 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Street Address */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                House / Flat / Street Details *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flat 301, Royal Plaza, Near Vijaya Dairy"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Landmark */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                Landmark (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite Municipal Water Tank"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Delivery Instructions */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#545B69', marginBottom: '6px', display: 'block' }}>
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Ring bell, do not call if before 9 AM"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E5EB',
                  backgroundColor: '#FFFFFF',
                  color: '#687080',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Back
              </button>
              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#2854C5',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Save & Deliver Here
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
