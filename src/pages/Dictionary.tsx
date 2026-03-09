import { useState, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { cookingDictionary, type DictionaryEntry } from '@/lib/cookingDictionary';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['All', ...Array.from(new Set(cookingDictionary.map(e => e.category))).sort()];

export default function Dictionary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    let list = cookingDictionary;
    if (category !== 'All') list = list.filter(e => e.category === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.term.includes(q) || e.definition.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.term.localeCompare(b.term));
  }, [search, category]);

  return (
    <div className="min-h-full bg-muted/30">
      <div className="bg-background border-b border-border px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-orange-500">Cooking Dictionary</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {cookingDictionary.length} essential cooking terms — hover over highlighted words during Cook Mode!
          </p>
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted border border-transparent rounded-xl focus:outline-none focus:bg-background focus:border-orange-300 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="bg-background border-b border-border px-6 py-2.5">
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                category === cat
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No terms found</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(entry => (
              <div
                key={entry.term}
                className="bg-background rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-foreground capitalize">{entry.term}</h3>
                  <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
