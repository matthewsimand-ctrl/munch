import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="app-section mb-6 flex items-center gap-3 px-4 py-3">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
        <UtensilsCrossed className="h-6 w-6 text-primary" />
        <span className="font-display text-xl font-bold text-foreground">{title}</span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/settings')}>
          <User className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
