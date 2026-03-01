import { useState } from "react";
import { useCountries, addDocument, updateDocument, deleteDocument } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

const CountryManager = () => {
  const { data: countries } = useCountries();
  const [form, setForm] = useState({ name: "", code: "", flag: "🏳️", order: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    try {
      if (editId) {
        await updateDocument("countries", editId, form);
      } else {
        await addDocument("countries", form);
      }
      toast.success("Saved");
      setForm({ name: "", code: "", flag: "🏳️", order: 0 }); setEditId(null); setShowForm(false);
    } catch { toast.error("Error"); }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => { setShowForm(true); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Plus className="w-4 h-4" /> Add Country
      </button>

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Country</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Code (BD)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Flag emoji" value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input type="number" placeholder="Order" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      )}

      <div className="space-y-2">
        {countries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No countries</p>
        ) : countries.map((c) => (
          <div key={c.id} className="glass-card p-4 flex items-center justify-between">
            <span className="text-sm text-foreground">{c.flag} {c.name} ({c.code})</span>
            <div className="flex gap-2">
              <button onClick={() => { setForm({ name: c.name, code: c.code, flag: c.flag, order: c.order }); setEditId(c.id); setShowForm(true); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Edit className="w-4 h-4" /></button>
              <button onClick={() => deleteDocument("countries", c.id).then(() => toast.success("Deleted"))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountryManager;
