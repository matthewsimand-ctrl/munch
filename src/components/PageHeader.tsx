import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

interface Props {
  title: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
        <UtensilsCrossed className="h-6 w-6 text-primary" />
        <span className="font-display text-xl font-bold text-foreground">{title}</span>
      </button>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
