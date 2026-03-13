import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import { normalizeRecipe } from '@/lib/normalizeRecipe';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChefHat, Loader2, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ChefProfileModalProps {
    chefId: string | null;
    chefName: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChefProfileModal({ chefId, chefName, open, onOpenChange }: ChefProfileModalProps) {
    const navigate = useNavigate();

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['chef-profile', chefId],
        queryFn: async () => {
            if (!chefId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('user_id', chefId)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!chefId && open,
    });

    const { data: recipes = [], isLoading: loadingRecipes } = useQuery<Recipe[]>({
        queryKey: ['chef-recipes', chefId],
        queryFn: async () => {
            if (!chefId) return [];
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('created_by', chefId)
                .eq('is_public', true)
                .not('chef', 'is', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []).map((r: any) => normalizeRecipe(r));
        },
        enabled: !!chefId && open,
    });

    const displayName = profile?.display_name || chefName || 'Chef';
    const firstName = displayName.split(' ')[0];
    const isLoading = loadingProfile || loadingRecipes;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-background rounded-2xl border-border">
                <div className="p-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 mb-6">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="h-16 w-16 rounded-full object-cover border-2 border-orange-200"
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-200">
                                <ChefHat className="h-8 w-8 text-orange-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="font-display text-2xl font-bold text-stone-900 leading-none mb-1">
                                {displayName}
                            </h2>
                            <p className="text-sm font-medium text-stone-500">
                                {isLoading ? (
                                    <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Fetching recipes...</span>
                                ) : (
                                    `${recipes.length} public recipe${recipes.length !== 1 ? 's' : ''}`
                                )}
                            </p>
                        </div>

                        {!isLoading && recipes.length > 0 && (
                            <button
                                onClick={() => {
                                    onOpenChange(false);
                                    navigate(`/chef/${chefId}`);
                                }}
                                className="ml-auto w-10 h-10 rounded-full bg-stone-50 hover:bg-orange-50 text-stone-400 hover:text-orange-500 border border-stone-200 hover:border-orange-300 transition-colors flex items-center justify-center"
                                title="Open full profile"
                            >
                                <LinkIcon size={16} />
                            </button>
                        )}
                    </div>

                    <DialogTitle className="sr-only">Chef Profile for {displayName}</DialogTitle>

                    {/* Recipes Grid */}
                    <div className="mt-2">
                        <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                            {firstName}'s Cookbook
                        </h3>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center absolute opacity-50"><Loader2 size={20} className="text-orange-400 animate-spin" /></div>
                                </div>
                            ) : recipes.length === 0 ? (
                                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50">
                                    <p className="text-sm font-semibold text-stone-600 mb-1">No public recipes</p>
                                    <p className="text-xs text-stone-400">This chef hasn't shared any recipes yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {recipes.map((recipe, i) => (
                                        <motion.button
                                            key={recipe.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => {
                                                onOpenChange(false);
                                                navigate(`/explore?chef=${chefId}`);
                                            }}
                                            className="rounded-xl overflow-hidden bg-white border border-stone-100 text-left hover:border-orange-300 hover:shadow-sm transition-all group"
                                        >
                                            <div className="aspect-square overflow-hidden relative">
                                                <img
                                                    src={recipe.image || '/placeholder.svg'}
                                                    alt={recipe.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-8">
                                                    <h4 className="font-display font-bold text-xs text-white leading-tight line-clamp-2" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                                                        {recipe.name}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="p-2.5 flex items-center gap-2 text-[10px] font-semibold text-stone-500">
                                                {recipe.cook_time && <span className="bg-stone-50 px-1.5 py-0.5 rounded">{recipe.cook_time}</span>}
                                                {recipe.difficulty && <span className={`px-1.5 py-0.5 rounded uppercase ${recipe.difficulty === 'easy' ? 'text-emerald-600 bg-emerald-50' : recipe.difficulty === 'medium' ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'}`}>{recipe.difficulty}</span>}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
