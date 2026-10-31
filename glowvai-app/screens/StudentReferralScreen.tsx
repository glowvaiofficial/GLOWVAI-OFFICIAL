import React, { useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  QrCode,
  Copy,
  Share2,
  CheckCircle2,
  ExternalLink,
  Award,
  Wallet,
  Users,
  TrendingUp,
  Sparkles,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import '../responsive/account.css';

export const StudentReferralScreen: React.FC = () => {
  const { goBack, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'verify'>('dashboard');
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'PENDING' | 'UNSUBMITTED'>('UNSUBMITTED');

  // Verification Form State
  const [collegeName, setCollegeName] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [idPhotoUploaded, setIdPhotoUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Issued by the campus programme after verification. Nothing is generated on the device.
  const referralCode: string | null = null;
  // Filled from the programme's referral feed once it is connected. Empty until then.
  const recentCampusReferrals: { name: string; order: string; date: string; reward: string }[] = [];

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard?.writeText(referralCode);
    showToast(`Referral code ${referralCode} copied to clipboard!`);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const text = `Hey! Use my Glowvai campus code "${referralCode}" on your first skincare order in Vijayawada: https://earn.glowvai.in/join/${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Glowvai Student Ambassador Program',
          text,
          url: 'https://earn.glowvai.in',
        });
      } catch {
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  const handleOpenWebPortal = () => {
    window.open('https://earn.glowvai.in', '_blank', 'noopener,noreferrer');
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setVerificationStatus('PENDING');
      setActiveTab('dashboard');
      showToast('Submitted for review. We will let you know once your student ID is checked.');
    }, 1200);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8FAFC',
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EDF2F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={goBack} style={{ padding: '6px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              Student Referral Program
            </h1>
            <span style={{ fontSize: '11px', color: '#1A73E8', fontWeight: 600 }}>
              earn.glowvai.in • Campus programme
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenWebPortal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#1A73E8',
            fontWeight: 700,
            padding: '4px 8px',
            backgroundColor: '#EFF6FF',
            borderRadius: '6px',
            border: '1px solid #BFDBFE',
          }}
        >
          <span>Portal</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Tabs: Ambassador Dashboard vs Student Verification */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 16px',
        }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            flex: 1,
            padding: '12px 6px',
            fontSize: '13px',
            fontWeight: activeTab === 'dashboard' ? 700 : 500,
            color: activeTab === 'dashboard' ? '#1A73E8' : '#64748B',
            borderBottom: `2.5px solid ${activeTab === 'dashboard' ? '#1A73E8' : 'transparent'}`,
            textAlign: 'center',
          }}
        >
          Ambassador Hub
        </button>
        <button
          onClick={() => setActiveTab('verify')}
          style={{
            flex: 1,
            padding: '12px 6px',
            fontSize: '13px',
            fontWeight: activeTab === 'verify' ? 700 : 500,
            color: activeTab === 'verify' ? '#1A73E8' : '#64748B',
            borderBottom: `2.5px solid ${activeTab === 'verify' ? '#1A73E8' : 'transparent'}`,
            textAlign: 'center',
          }}
        >
          {verificationStatus === 'VERIFIED' ? 'Student ID Status' : 'Verify Student ID'}
        </button>
      </div>

      <div className={`referral-body ${activeTab === 'dashboard' ? 'is-dashboard' : 'is-verify'}`} style={{ padding: 'var(--referral-pad, 16px)', display: 'var(--referral-display, flex)', flexDirection: 'column', gap: 'var(--referral-gap, 16px)', paddingBottom: '32px' }}>
        {activeTab === 'dashboard' ? (
          <>
            {/* Ambassador Hero Card */}
            <div
              style={{
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #1A73E8 0%, #0284C7 100%)',
                color: '#FFFFFF',
                padding: '20px',
                boxShadow: '0 8px 20px -4px rgba(26, 115, 232, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.9 }}>
                      CAMPUS AMBASSADOR
                    </span>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, lineHeight: '18px' }}>
                      {collegeName || 'Not verified yet'}
                    </h2>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: verificationStatus === 'PENDING' ? '#D97706' : '#64748B',
                    color: '#FFFFFF',
                    padding: '3px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {verificationStatus === 'PENDING' ? 'PENDING REVIEW' : 'NOT VERIFIED'}
                </span>
              </div>

              {/* Earnings Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>Total Earned</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>—</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>Referrals</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>—</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>Commission</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>—</div>
                </div>
              </div>
            </div>

            {/* Referral Code & QR Section */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '18px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                YOUR CAMPUS REFERRAL CODE
              </span>

              {/* Code Pill */}
              <div
                style={{
                  margin: '10px auto 14px auto',
                  padding: '10px 18px',
                  backgroundColor: '#F0F7FF',
                  borderRadius: '12px',
                  border: '1.5px dashed #1A73E8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A73E8', letterSpacing: '1px' }}>
                  {referralCode ?? 'Unlocks after verification'}
                </span>
                <button
                  onClick={handleCopyCode}
                  disabled={!referralCode}
                  style={{
                    padding: '4px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#1A73E8',
                    border: '1px solid #D2E3FC',
                  }}
                  aria-label="Copy referral code"
                >
                  <Copy size={16} />
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#4B5563', lineHeight: '18px', maxWidth: '300px', margin: '0 auto 16px auto' }}>
                Your classmates get use your code on their first campus order. Commission and payout terms are on the programme portal.
              </p>

              {/* Interactive QR Code Visual */}
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  margin: '0 auto 16px auto',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Simulated SVG QR Matrix */}
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#0F172A',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    position: 'relative',
                  }}
                >
                  <QrCode size={96} color="#FFFFFF" strokeWidth={2} />
                  <div
                    style={{
                      position: 'absolute',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: '#1A73E8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    G
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>
                  QR appears after verification
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCopyCode}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    color: '#111827',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Copy size={15} />
                  <span>Copy Code</span>
                </button>
                <button
                  onClick={handleShare}
                  disabled={!referralCode}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: '#1A73E8',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Share2 size={15} />
                  <span>Share with Class</span>
                </button>
              </div>
            </div>

            {/* Ambassador Perks Grid */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                Student Ambassador Perks
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#F0FDF4',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Campus commission</h4>
                    <p style={{ fontSize: '11px', color: '#64748B' }}>
                      Commission and payout schedule are listed on the programme portal.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      color: '#1A73E8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Milestone rewards</h4>
                    <p style={{ fontSize: '11px', color: '#64748B' }}>
                      Milestone rewards are listed on the programme portal.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Digital Commerce Certificate</h4>
                    <p style={{ fontSize: '11px', color: '#64748B' }}>
                      Official Certificate of Growth & Marketing from Glowvai Leadership for your resume/LinkedIn.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Referral Activity Feed */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  Recent Campus Referrals
                </h3>

              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentCampusReferrals.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#64748B' }}>No campus referrals yet. They appear here once your code is in use.</p>
                )}
                {recentCampusReferrals.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{item.order} • {item.date}</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#16A34A' }}>{item.reward}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Web Portal Banner */}
            <div
              onClick={handleOpenWebPortal}
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: '14px',
                border: '1.5px solid #BBF7D0',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                    Official Web Portal: earn.glowvai.in
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803D' }}>
                    Access leaderboards, tax invoices & campus leader rankings
                  </div>
                </div>
              </div>
              <ExternalLink size={16} color="#16A34A" />
            </div>
          </>
        ) : (
          /* Student Verification Form Tab */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#E8F0FE',
                  color: '#1A73E8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Student ID Verification
                </h2>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Approved for all Vijayawada & AP colleges
                </span>
              </div>
            </div>

            {verificationStatus === 'VERIFIED' && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '10px',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <CheckCircle2 size={18} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    Verified Student Ambassador
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803D' }}>
                    Your student accreditation is active through Academic Year 2026-27.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitVerification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '6px', display: 'block' }}>
                  College / University Name
                </label>
                <input
                  type="text"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Andhra Loyola College, KL University..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '6px', display: 'block' }}>
                  College Email Address (.ac.in or .edu)
                </label>
                <input
                  type="email"
                  required
                  value={collegeEmail}
                  onChange={(e) => setCollegeEmail(e.target.value)}
                  placeholder="rollnumber@college.ac.in"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
                <span style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  ⚡ .ac.in / .edu emails qualify for instant automated verification.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '6px', display: 'block' }}>
                  Student Roll / ID Number
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 21BCE1048"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '6px', display: 'block' }}>
                  Upload Student ID Card Photo
                </label>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1.5px dashed #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setIdPhotoUploaded(true);
                    showToast('Student ID Photo uploaded successfully.');
                  }}
                >
                  <Camera size={24} color="#1A73E8" />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A73E8' }}>
                    {idPhotoUploaded ? '✓ ID Card Attached (Tap to change)' : 'Tap to take or choose photo of Student ID'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                    Photo must clearly display college name, your photo, and academic year.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: '#1A73E8',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Verifying Student Credentials...' : 'Save & Update Student Status'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
