/**
 * Firebase Auth Error Code Mapping Table for GlowVAI V2
 * Converts raw Firebase exception codes into human-readable headlines,
 * friendly body descriptions, icons, and primary action text.
 */

export interface FormattedError {
  errorCode: string;
  headline: string;
  body: string;
  primaryCtaText: string;
  iconType: 'alert' | 'wifi-off';
  isNetworkError: boolean;
  showSupportLink: boolean;
}

export const mapFirebaseError = (errorCode?: string | null): FormattedError => {
  const code = errorCode || 'generic/unknown';

  switch (code) {
    case 'auth/invalid-verification-code':
    case 'invalid-verification-code':
      return {
        errorCode: code,
        headline: 'Incorrect Code',
        body: "The OTP you entered doesn't match. Please check and try again.",
        primaryCtaText: 'Try Again',
        iconType: 'alert',
        isNetworkError: false,
        showSupportLink: false,
      };

    case 'auth/code-expired':
    case 'code-expired':
      return {
        errorCode: code,
        headline: 'Code Expired',
        body: 'This OTP has expired. Request a new one to continue.',
        primaryCtaText: 'Resend Code',
        iconType: 'alert',
        isNetworkError: false,
        showSupportLink: false,
      };

    case 'auth/network-request-failed':
    case 'network-request-failed':
    case 'NETWORK_ERROR':
      return {
        errorCode: code,
        headline: 'Connection Lost',
        body: 'Check your internet connection and try again.',
        primaryCtaText: 'Try Again',
        iconType: 'wifi-off',
        isNetworkError: true,
        showSupportLink: true,
      };

    case 'auth/too-many-requests':
    case 'too-many-requests':
      return {
        errorCode: code,
        headline: 'Too Many Attempts',
        body: 'Please wait a few minutes before trying again.',
        primaryCtaText: 'Try again in 4:32',
        iconType: 'alert',
        isNetworkError: false,
        showSupportLink: true,
      };

    default:
      return {
        errorCode: code,
        headline: 'Something Went Wrong',
        body: "We couldn't complete that action. Please try again.",
        primaryCtaText: 'Try Again',
        iconType: 'alert',
        isNetworkError: false,
        showSupportLink: true,
      };
  }
};
