import { useMemo, useState } from "react";
import { BookOpen, ImagePlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function Cookbooks() {
  const navigate = useNavigate();
  const { recipeFolders, savedApiRecipes, deleteFolder, updateFolderCover } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedCookbook = useMemo(
    () => recipeFolders.find((folder) => folder.id === selectedId) ?? null,
    [recipeFolders, selectedId],
  );

  const selectedRecipes = useMemo(() => {
    if (!selectedCookbook) return [];
    return selectedCookbook.recipeIds.map((id) => savedApiRecipes[id]).filter(Boolean);
  }, [selectedCookbook, savedApiRecipes]);

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

  return (
    <div className="min-h-full px-6 py-6" style={{ background: "#FFFAF5" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Your collection</p>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Cookbooks</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/saved')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-600">My Recipes</button>
            <button className="px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white">Cookbooks</button>
            <button onClick={() => navigate('/swipe')} className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-600">Find Recipes</button>
          </div>
        </div>

        {recipeFolders.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-orange-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
              <BookOpen />
            </div>
            <p className="text-lg font-semibold text-stone-800">No cookbooks yet</p>
            <p className="text-sm text-stone-500 mt-1">Create your first cookbook from My Recipes.</p>
            <button
              onClick={() => navigate('/saved?newCookbook=1')}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600"
            >
              Create Cookbook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipeFolders.map((folder) => (
              <div key={folder.id} className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                <button className="w-full text-left" onClick={() => setSelectedId(folder.id)}>
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
        )}

        {selectedCookbook && (
          <div className="mt-8 rounded-2xl bg-white border border-stone-200 p-4">
            <h2 className="text-lg font-bold text-stone-800 mb-3">{selectedCookbook.name} Recipes</h2>
            {selectedRecipes.length === 0 ? (
              <p className="text-sm text-stone-400">No recipes in this cookbook yet.</p>
            ) : (
              <div className="space-y-2">
                {selectedRecipes.map((recipe) => (
                  <div key={recipe.id} className="text-sm text-stone-700 border-b border-stone-100 pb-2 last:border-0">
                    {recipe.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
