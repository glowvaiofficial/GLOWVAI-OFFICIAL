import React, { useState } from 'react';
import { AlertCircle, Building2, CheckSquare, FileCheck2, GraduationCap, Mail, ShieldCheck, Sparkles, Square, UploadCloud } from 'lucide-react';
import { useApp } from '../../context/useApp';
import { AuthShell } from './components/AuthShell';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type FormErrors = Partial<Record<'email' | 'collegeName' | 'file', string>>;

export const StudentVerificationScreen: React.FC = () => {
  const { navigate, goBack } = useApp();
  const [email, setEmail] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (key: keyof FormErrors) => setErrors((prev) => ({ ...prev, [key]: undefined }));

  // Web upload: accepts an image or PDF up to 5 MB
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setErrors((prev) => ({ ...prev, file: 'File must be 5 MB or smaller.' }));
      return;
    }
    setUploadedFile(file);
    clearError('file');
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim() || !email.includes('@')) {
      nextErrors.email = 'Please enter a valid college email address.';
    }
    if (!collegeName.trim()) {
      nextErrors.collegeName = 'Please enter your college or university name.';
    }
    if (!uploadedFile) {
      nextErrors.file = 'Please upload a valid college ID.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      navigate('profile-referrals');
    }, 800);
  };

  return (
    <AuthShell
      onBack={goBack}
      footer={
        <>
          <p className="auth-hint auth-center">Usually reviewed within 24 hours</p>
          <button type="button" className="auth-primary-button" onClick={handleSubmit} disabled={!confirmed || isSubmitting}>
            {isSubmitting ? <span className="auth-spinner" aria-label="Submitting" /> : 'Submit for Verification →'}
          </button>
        </>
      }
    >
      <div className="auth-hero-icon" aria-hidden="true">
        <GraduationCap />
        <span className="auth-hero-pill">
          <Sparkles /> Student Perks Active
        </span>
      </div>

      <h1 className="auth-title auth-center">Unlock your student glow perks</h1>
      <p className="auth-subtitle auth-center">Verify once to unlock student-only offers.</p>

      <span className="auth-section-label">Verification Details</span>

      <div className="auth-form-group">
        <label className="auth-label" htmlFor="auth-student-email">College / University email *</label>
        <div className={`auth-field${errors.email ? ' has-error' : ''}`}>
          <Mail aria-hidden="true" />
          <input
            id="auth-student-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="name@college.edu"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError('email');
            }}
          />
        </div>
        {errors.email && <FieldError message={errors.email} />}
      </div>

      <div className="auth-form-group">
        <label className="auth-label" htmlFor="auth-student-college">College name *</label>
        <div className={`auth-field${errors.collegeName ? ' has-error' : ''}`}>
          <Building2 aria-hidden="true" />
          <input
            id="auth-student-college"
            placeholder="Enter your college or university name"
            value={collegeName}
            onChange={(event) => {
              setCollegeName(event.target.value);
              clearError('collegeName');
            }}
          />
        </div>
        {errors.collegeName && <FieldError message={errors.collegeName} />}
      </div>

      <div className="auth-form-group">
        <span className="auth-label">Upload College ID *</span>
        {uploadedFile ? (
          <div className="auth-uploaded">
            <FileCheck2 aria-hidden="true" />
            <div>
              <strong>{uploadedFile.name}</strong>
              <p>Ready for submission</p>
            </div>
            <label className="auth-text-button auth-replace">
              Replace
              <input className="sr-only" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <label className={`auth-upload${errors.file ? ' has-error' : ''}`}>
            <UploadCloud aria-hidden="true" />
            <strong>Tap to upload or take a photo</strong>
            <span>JPG, PNG, PDF · Max 5 MB</span>
            <input className="sr-only" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
          </label>
        )}
        {errors.file && <FieldError message={errors.file} />}
      </div>

      <div className="auth-privacy-card auth-privacy-card-compact">
        <ShieldCheck aria-hidden="true" />
        <span>Your documents are reviewed securely and used only for verification.</span>
      </div>

      <button type="button" className="auth-checkbox-row" onClick={() => setConfirmed(!confirmed)}>
        {confirmed ? <CheckSquare aria-hidden="true" /> : <Square aria-hidden="true" />}
        <span>I confirm these details are mine</span>
      </button>
    </AuthShell>
  );
};

const FieldError: React.FC<{ message: string }> = ({ message }) => (
  <div className="auth-field-error" role="alert">
    <AlertCircle aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export default StudentVerificationScreen;
