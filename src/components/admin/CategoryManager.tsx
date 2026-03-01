import { useState } from "react";
import { useCategories, addDocument, updateDocument, deleteDocument, Category } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

const CategoryManager = () => {
  const { data: categories } = useCategories();
  const [form, setForm] = useState({ name: "", icon: "📺", order: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    try {
      if (editId) {
        await updateDocument("categories", editId, form);
        toast.success("Updated");
      } else {
        await addDocument("categories", form);
        toast.success("Added");
      }
      setForm({ name: "", icon: "📺", order: 0 }); setEditId(null); setShowForm(false);
    } catch { toast.error("Error"); }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", icon: "📺", order: 0 }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Plus className="w-4 h-4" /> Add Category
      </button>

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Category</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Icon emoji" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input type="number" placeholder="Order" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No categories</p>
        ) : categories.map((cat) => (
          <div key={cat.id} className="glass-card p-4 flex items-center justify-between">
            <span className="text-sm text-foreground">{cat.icon} {cat.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setForm({ name: cat.name, icon: cat.icon, order: cat.order }); setEditId(cat.id); setShowForm(true); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-4 h-4" /></button>
              <button onClick={() => deleteDocument("categories", cat.id).then(() => toast.success("Deleted"))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
