import { useEffect, useMemo, useState } from "react";
import { BookOpen, FolderPlus, Grid3X3, ImagePlus, List, Search, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import MobileActionButton from "@/components/MobileActionButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

export default function Cookbooks() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { recipeFolders, savedApiRecipes, likedRecipes, createCookbook, deleteFolder, updateFolderCover, displayName: storeDisplayName } = useStore();
  const [displayName, setDisplayName] = useState<string | null>(storeDisplayName || null);
  const [showNewCookbook, setShowNewCookbook] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newCookbookRecipeIds, setNewCookbookRecipeIds] = useState<string[]>([]);
  const [newCookbookCover, setNewCookbookCover] = useState<string | undefined>();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const savedRecipes = useMemo(
    () => likedRecipes.map((id) => savedApiRecipes[id]).filter(Boolean),
    [likedRecipes, savedApiRecipes],
  );

  const filteredCookbooks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipeFolders;

    return recipeFolders.filter((folder) => {
      const nameMatch = folder.name.toLowerCase().includes(term);
      const recipeMatch = folder.recipeIds.some((id) =>
        String(savedApiRecipes[id]?.name || "").toLowerCase().includes(term)
      );
      return nameMatch || recipeMatch;
    });
  }, [recipeFolders, savedApiRecipes, search]);

  useEffect(() => {
    const loadName = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", userId).single();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    void loadName();
  }, []);

  const onUploadCover = (folderId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cover = typeof reader.result === "string" ? reader.result : "";
      updateFolderCover(folderId, cover);
      toast.success("Cookbook cover updated");
    };
    reader.readAsDataURL(file);
  };

  const onCreateCookbook = () => {
    if (!newFolderName.trim()) return;
    createCookbook(newFolderName.trim(), newCookbookRecipeIds, newCookbookCover);
    setNewFolderName("");
    setNewCookbookRecipeIds([]);
    setNewCookbookCover(undefined);
    setShowNewCookbook(false);
    toast.success("Cookbook created");
  };

  const onNewCoverUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewCookbookCover(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-full" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: "#FFFAF5" }}>
      <div
        className="border-b px-4 pt-4 pb-0 sm:px-6 sm:pt-6"
        style={{ background: "linear-gradient(135deg,#FFF7ED 0%,#FFFAF5 100%)", borderColor: "rgba(249,115,22,0.12)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 flex flex-col gap-4 sm:mb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Your collection</p>
              <h1 className="text-xl font-bold text-stone-900 sm:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {displayName ? `${displayName}'s Cookbooks` : "Cookbooks"}
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                {recipeFolders.length} cookbook{recipeFolders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2" data-tutorial="recipes-nav">
              <button
                onClick={() => navigate('/saved')}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] font-semibold text-stone-600 sm:flex-none sm:text-xs"
              >
                Recipes
              </button>
              <button className="min-w-0 flex-1 rounded-xl bg-orange-500 px-3 py-2 text-[11px] font-semibold text-white sm:flex-none sm:text-xs">
                Cookbooks
              </button>
            <button
              onClick={() => setShowNewCookbook((prev) => !prev)}
              className={`min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] font-semibold text-stone-600 inline-flex items-center justify-center gap-1.5 sm:flex-none sm:justify-start sm:text-xs ${isMobile ? "hidden" : ""}`}
            >
              <FolderPlus size={12} /> Add Cookbook
            </button>
            <button
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:border-orange-300 hover:text-orange-500 transition-colors ml-1"
              aria-label="Toggle cookbook layout"
            >
              {view === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">

        {recipeFolders.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-orange-200 p-6 text-center sm:p-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
              <BookOpen />
            </div>
            <p className="text-lg font-semibold text-stone-800">Add your first cookbook</p>
            <p className="text-sm text-stone-500 mt-1">Create a collection for favorite meals, weekly staples, or anything you want to keep together.</p>
            <button
              onClick={() => setShowNewCookbook(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FolderPlus size={14} /> Add Cookbook
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your cookbooks..."
                className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-10 text-sm text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-orange-300"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 transition-colors hover:text-stone-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {filteredCookbooks.length === 0 ? (
              <div className="rounded-2xl bg-white border border-dashed border-orange-200 p-6 text-center sm:p-8">
                <p className="text-stone-700 font-semibold">No cookbooks match your search</p>
              </div>
            ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCookbooks.map((folder) => (
              <div key={folder.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                <button className="w-full text-left" onClick={() => navigate(`/cookbooks/${folder.id}`)}>
                  <div className="h-36 bg-stone-100 flex items-center justify-center">
                    {folder.coverImage ? (
                      <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="text-stone-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-stone-800">{folder.name}</p>
                    <p className="text-xs text-stone-400 mt-1">{folder.recipeIds.length} recipes</p>
                  </div>
                </button>
                <div className="px-3 pb-3 flex items-center gap-2">
                  <label className="text-xs px-2 py-1 rounded-lg border border-stone-200 text-stone-600 cursor-pointer inline-flex items-center gap-1">
                    <ImagePlus size={12} /> Update Cover
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onUploadCover(folder.id, e.target.files?.[0] ?? null)} />
                  </label>
                  <button onClick={() => deleteFolder(folder.id)} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 inline-flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCookbooks.map((folder) => (
              <div key={folder.id} className="rounded-2xl bg-white border border-stone-200 p-3 flex items-center gap-3">
                <button className="w-20 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0" onClick={() => navigate(`/cookbooks/${folder.id}`)}>
                  {folder.coverImage ? (
                    <img src={folder.coverImage} alt={folder.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BookOpen className="text-stone-300" /></div>
                  )}
                </button>
                <button className="text-left flex-1 min-w-0" onClick={() => navigate(`/cookbooks/${folder.id}`)}>
                  <p className="font-semibold text-stone-800 truncate">{folder.name}</p>
                  <p className="text-xs text-stone-400 mt-1">{folder.recipeIds.length} recipes</p>
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-xs px-2 py-1 rounded-lg border border-stone-200 text-stone-600 cursor-pointer inline-flex items-center gap-1">
                    <ImagePlus size={12} /> Update Cover
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onUploadCover(folder.id, e.target.files?.[0] ?? null)} />
                  </label>
                  <button onClick={() => deleteFolder(folder.id)} className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 inline-flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      <Dialog open={showNewCookbook} onOpenChange={setShowNewCookbook}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle>Create a Cookbook</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 space-y-5 sm:px-6 sm:pb-6">
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Cookbook details</p>
                    <p className="mt-1 text-sm text-stone-500">Group favorite meals, weekly staples, or themed recipes into one collection.</p>
                  </div>
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Weeknight dinners"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                  />
                  <label className="inline-flex w-fit items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 cursor-pointer hover:border-orange-300 hover:text-orange-600 transition-colors">
                    <ImagePlus size={14} /> {newCookbookCover ? "Replace cover" : "Upload cover"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onNewCoverUpload(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div className="w-full md:w-40 shrink-0">
                  <div className="aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-sm">
                    {newCookbookCover ? (
                      <img src={newCookbookCover} alt="New cookbook cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-stone-400 bg-gradient-to-br from-orange-50 to-stone-50">
                        <BookOpen size={28} />
                        <span className="text-xs font-semibold uppercase tracking-wide">Cover preview</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Choose recipes</p>
                  <p className="mt-1 text-xs text-stone-500">Select any saved recipes you want to include from the start.</p>
                </div>
              </div>

              {savedRecipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-stone-700">No saved recipes yet</p>
                  <p className="mt-1 text-xs text-stone-500">Save recipes first, then come back to build a cookbook around them.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {savedRecipes.map((recipe) => {
                    const checked = newCookbookRecipeIds.includes(recipe.id);
                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() =>
                          setNewCookbookRecipeIds((prev) =>
                            checked ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id],
                          )
                        }
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                          checked
                            ? "border-orange-300 bg-orange-50"
                            : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300 bg-white"}`}>
                          {checked ? "✓" : ""}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-800">{recipe.name}</p>
                          <p className="mt-0.5 text-xs text-stone-500">{recipe.cook_time || "30 min"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowNewCookbook(false);
                  setNewFolderName("");
                  setNewCookbookRecipeIds([]);
                  setNewCookbookCover(undefined);
                }}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateCookbook}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                disabled={!newFolderName.trim()}
              >
                Create Cookbook
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MobileActionButton label="Add Cookbook" onClick={() => setShowNewCookbook(true)} />
    </div>
  );
}
