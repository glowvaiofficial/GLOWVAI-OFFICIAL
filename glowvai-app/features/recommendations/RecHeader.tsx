import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/useApp';

interface RecHeaderProps {
  title: string;
  eyebrow?: string;
}

// Shared header for the routine and ingredient guides: back button, small eyebrow and the page title.
export const RecHeader = ({ title, eyebrow }: RecHeaderProps) => {
  const { goBack } = useApp();
  return (
    <header className="rec-header">
      <button type="button" className="rec-icon-button" onClick={goBack} aria-label="Go back">
        <ArrowLeft size={20} strokeWidth={2.2} />
      </button>
      <div className="rec-header-copy">
        {eyebrow && <span className="rec-header-eyebrow">{eyebrow}</span>}
        <h1 className="rec-header-title">{title}</h1>
      </div>
    </header>
  );
};
