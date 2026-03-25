import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/data/recipes';
import { normalizeRecipe } from '@/lib/normalizeRecipe';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChefHat, Clock, Grid3X3, Link as LinkIcon, List, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import RecipePreviewDialog from '@/components/RecipePreviewDialog';
import { applyRecipeImageFallback, getRecipeImageSrc } from '@/lib/recipeImage';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import munchLogo from '@/assets/munch-logo.webp';
import { MUNCH_CHEF_NAME, MUNCH_OFFICIAL_USER_ID } from '@/lib/munchIdentity';
import { Input } from '@/components/ui/input';
import { isMunchAuthoredRecipe, shouldShowChefAttribution } from '@/lib/recipeAttribution';

interface ChefProfileModalProps {
    chefId: string | null;
    chefName: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChefProfileModal({ chefId, chefName, open, onOpenChange }: ChefProfileModalProps) {
    const navigate = useNavigate();
    const { likeRecipe, likedRecipes } = useStore();
    const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const isKnownMunchChef = (chefName || '').trim().toLowerCase() === MUNCH_CHEF_NAME || chefId === MUNCH_OFFICIAL_USER_ID;

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['chef-profile', chefId],
        queryFn: async () => {
            if (!chefId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('display_name, avatar_url, username')
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
                .select('id, name, image, cook_time, difficulty, ingredients, instructions, tags, source, source_url, cuisine, chef, created_by, servings')
                .eq('created_by', chefId)
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            const normalized = (data || []).map((r: any) => normalizeRecipe(r));
            return normalized.filter((recipe) => (
                isKnownMunchChef
                    ? isMunchAuthoredRecipe(recipe)
                    : shouldShowChefAttribution(recipe)
            ));
        },
        enabled: !!chefId && open,
    });

    const isMunchChef = (profile?.display_name || chefName || '').trim().toLowerCase() === MUNCH_CHEF_NAME || chefId === MUNCH_OFFICIAL_USER_ID;
    const displayName = profile?.display_name || chefName || (isMunchChef ? MUNCH_CHEF_NAME : 'Chef');
    const isLoading = loadingProfile || loadingRecipes;
    const likedSet = useMemo(() => new Set(likedRecipes), [likedRecipes]);
    const filteredRecipes = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return recipes;

        return recipes.filter((recipe) => {
            const haystack = [
                recipe.name,
                recipe.cuisine,
                recipe.chef,
                recipe.cook_time,
                ...(recipe.tags || []),
                ...(recipe.ingredients || []),
                ...(recipe.instructions || []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [recipes, search]);

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden bg-background rounded-[1.75rem] border-border">
                <div className="p-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 mb-6">
                        {isMunchChef ? (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-200 bg-white p-2">
                                <img src={munchLogo} alt="munch" className="h-full w-full object-contain" />
                            </div>
                        ) : profile?.avatar_url ? (
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
                            {(profile as any)?.username && (
                                <p className="text-xs text-stone-400 mb-1">@{(profile as any).username}</p>
                            )}
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
                        <div className="mb-4 flex items-center gap-3">
                            {isMunchChef ? (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white p-1.5">
                                    <img src={munchLogo} alt="munch" className="h-full w-full object-contain" />
                                </div>
                            ) : profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={displayName}
                                    className="h-10 w-10 rounded-full object-cover border border-orange-200"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50">
                                    <ChefHat className="h-5 w-5 text-orange-500" />
                                </div>
                            )}
                            <div>
                                <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                                    {displayName}'s Recipes
                                </h3>
                                <p className="text-xs text-stone-500">{displayName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setView((current) => current === 'grid' ? 'list' : 'grid')}
                                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-500"
                                aria-label="Toggle chef recipe layout"
                            >
                                {view === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={`Search ${displayName}'s recipes`}
                                className="h-11 rounded-2xl border-orange-100 bg-white pl-10"
                            />
                        </div>

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
                            ) : filteredRecipes.length === 0 ? (
                                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50">
                                    <p className="text-sm font-semibold text-stone-600 mb-1">No matching recipes</p>
                                    <p className="text-xs text-stone-400">Try a recipe name, cuisine, or ingredient.</p>
                                </div>
                            ) : (
                                <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4' : 'space-y-1'}>
                                    {filteredRecipes.map((recipe, i) => (
                                        view === 'grid' ? (
                                            <motion.button
                                                key={recipe.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                onClick={() => setPreviewRecipe(recipe)}
                                                className="rounded-xl overflow-hidden bg-white border border-stone-100 text-left hover:border-orange-300 hover:shadow-sm transition-all group"
                                            >
                                                <div className="aspect-square overflow-hidden relative">
                                                    <img
                                                        src={getRecipeImageSrc(recipe.image)}
                                                        alt={recipe.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        onError={applyRecipeImageFallback}
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
                                        ) : (
                                            <motion.button
                                                key={recipe.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => setPreviewRecipe(recipe)}
                                                className="flex w-full items-center gap-4 rounded-2xl border border-transparent bg-white px-4 py-3 text-left transition-colors hover:border-orange-100 hover:bg-orange-50/40"
                                            >
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                                                    <img
                                                        src={getRecipeImageSrc(recipe.image)}
                                                        alt={recipe.name}
                                                        className="h-full w-full object-cover"
                                                        onError={applyRecipeImageFallback}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="truncate text-sm font-semibold text-stone-900" style={{ fontFamily: "'Fraunces', serif" }}>
                                                        {recipe.name}
                                                    </h4>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                                                        {recipe.cook_time && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5 text-orange-500" />
                                                                {recipe.cook_time}
                                                            </span>
                                                        )}
                                                        {recipe.difficulty && <span>{recipe.difficulty}</span>}
                                                        {recipe.cuisine && <span>{recipe.cuisine}</span>}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        <RecipePreviewDialog
            recipe={previewRecipe}
            match={null}
            open={!!previewRecipe}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) setPreviewRecipe(null);
            }}
            chefName={previewRecipe && shouldShowChefAttribution(previewRecipe) ? displayName : null}
            chefId={previewRecipe && shouldShowChefAttribution(previewRecipe) ? chefId : null}
            mode="explore"
            isSaved={previewRecipe ? likedSet.has(previewRecipe.id) : false}
            onSave={(recipe) => {
                likeRecipe(recipe.id, recipe);
                toast.success(likedSet.has(recipe.id) ? `${recipe.name} is already in your recipes` : `Saved ${recipe.name}`);
                setPreviewRecipe(null);
            }}
        />
        </>
    );
}
