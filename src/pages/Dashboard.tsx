import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UtensilsCrossed,
  Heart,
  ShoppingCart,
  CalendarDays,
  ChefHat,
  Flame,
  ArrowRight,
  User,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const { pantryList, likedRecipes, savedApiRecipes } = useStore();
  const { data: dbRecipes = [] } = useDbRecipes();
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth', { replace: true });
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const savedCount = likedRecipes.length;
  const pantryCount = pantryList.length;

  const quickActions = [
    {
      label: 'Browse Recipes',
      icon: Flame,
      path: '/swipe',
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'My Pantry',
      icon: UtensilsCrossed,
      path: '/pantry',
      color: 'bg-accent/20 text-accent-foreground',
    },
    {
      label: 'Saved Recipes',
      icon: Heart,
      path: '/saved',
      color: 'bg-destructive/10 text-destructive',
    },
    {
      label: 'Meal Prep',
      icon: CalendarDays,
      path: '/meal-prep',
      color: 'bg-success/10 text-foreground',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-8 pb-4 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">Munch</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <User className="h-5 w-5" />
          </Button>
        </div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting},
          </h1>
          <p className="font-display text-3xl font-bold text-primary">
            {displayName} 👋
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            What are we cooking today?
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <motion.div variants={item}>
            <Card className="text-center border-border">
              <CardContent className="py-4 px-2">
                <UtensilsCrossed className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{pantryCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pantry Items</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="text-center border-border">
              <CardContent className="py-4 px-2">
                <Heart className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{savedCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saved</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="text-center border-border">
              <CardContent className="py-4 px-2">
                <ChefHat className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{dbRecipes.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-3 mb-8"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
          {quickActions.map((action) => (
            <motion.div key={action.path} variants={item}>
              <button
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-foreground flex-1 text-left">{action.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Browse CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={() => navigate('/swipe')}
            className="w-full h-14 text-base font-semibold gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Start Browsing Recipes
          </Button>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
