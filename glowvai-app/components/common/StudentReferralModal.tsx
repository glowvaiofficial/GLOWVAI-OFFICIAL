import React from 'react';
import { X, ExternalLink, GraduationCap, Award, QrCode } from 'lucide-react';

interface StudentReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentReferralModal: React.FC<StudentReferralModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpenStudentPortal = () => {
    window.open('https://earn.glowvai.in', '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '6px',
            borderRadius: '999px',
            backgroundColor: '#F0F2F6',
            color: '#687080',
          }}
        >
          <X size={16} />
        </button>

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#EDF2FF',
            color: '#2854C5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <GraduationCap size={28} />
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#161A22', fontFamily: 'var(--font-heading)' }}>
          Student Ambassador & Referral Programme
        </h3>

        <p style={{ fontSize: '13px', color: '#545B69', marginTop: '8px', lineHeight: '20px' }}>
          Are you a college student in Vijayawada? Verify your student ID on our official campus portal to receive your unique referral QR code and unlock student ambassador commissions on skincare purchases.
        </p>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
            <Award size={15} color="#19734F" />
            <span>Campus Ambassador commission on every order</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
            <QrCode size={15} color="#2854C5" />
            <span>Generate your personalized referral QR code</span>
          </div>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '10px 12px',
            backgroundColor: '#F7F8FB',
            borderRadius: '8px',
            border: '1px solid #E2E5EB',
            fontSize: '11px',
            color: '#687080',
          }}
        >
          Official portal: <strong style={{ color: '#2854C5' }}>earn.glowvai.in</strong>. College verification is managed securely on the portal.
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #E2E5EB',
              color: '#545B69',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleOpenStudentPortal}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#2854C5',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>Open earn.glowvai.in</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
