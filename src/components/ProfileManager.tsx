import React, { useState } from 'react';
import { UserCheck, Plus, X, Activity, Edit2, Trash2, Lock } from 'lucide-react';
import { ChildProfile, DietaryPreference } from '../types';

interface ProfileManagerProps {
  profiles: ChildProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<ChildProfile[]>>;
  activeProfileId: string | null;
  setActiveProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  onClose: () => void;
  onGenerateReport: (profile: ChildProfile) => void;
  isPremium: boolean;
}

export default function ProfileManager({ profiles, setProfiles, activeProfileId, setActiveProfileId, onClose, onGenerateReport, isPremium }: ProfileManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newProfile, setNewProfile] = useState<Partial<ChildProfile>>({
    name: '',
    age: 5,
    weight: 20,
    foodCategories: 'Any / No Restriction',
    allergies: []
  });

  const [allergyInput, setAllergyInput] = useState('');

  const handleAddAllergy = () => {
    if (allergyInput.trim()) {
      setNewProfile({ ...newProfile, allergies: [...(newProfile.allergies || []), allergyInput.trim()] });
      setAllergyInput('');
    }
  };

  const startEditProfile = (e: React.MouseEvent, p: ChildProfile) => {
    e.stopPropagation();
    setNewProfile(p);
    setEditingProfileId(p.id);
    setIsAdding(true);
  };

  const removeProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // In iframe environments window.confirm can be blocked, so we remove it directly
    setProfiles(profiles.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  };

  const handleSaveProfile = () => {
    if (newProfile.name) {
      if (editingProfileId) {
        setProfiles(profiles.map(p => p.id === editingProfileId ? {
          ...p,
          name: newProfile.name!,
          age: newProfile.age || 5,
          weight: newProfile.weight || 20,
          foodCategories: newProfile.foodCategories as DietaryPreference || 'Any / No Restriction',
          allergies: newProfile.allergies || []
        } : p));
      } else {
        const created: ChildProfile = {
          id: Date.now().toString(),
          name: newProfile.name,
          age: newProfile.age || 5,
          weight: newProfile.weight || 20,
          foodCategories: newProfile.foodCategories as DietaryPreference || 'Any / No Restriction',
          allergies: newProfile.allergies || []
        };
        setProfiles([...profiles, created]);
        setActiveProfileId(created.id);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingProfileId(null);
    setNewProfile({ name: '', age: 5, weight: 20, foodCategories: 'Any / No Restriction', allergies: [] });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-[#4ECDC4] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#4ECDC4]" /> NutriPeds Profiles
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {!isAdding ? (
          <div>
            {profiles.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 rounded-2xl mb-4 border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No profiles added yet.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {profiles.map(p => (
                  <div key={p.id} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeProfileId === p.id ? 'bg-teal-50 border-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-200'}`} onClick={() => setActiveProfileId(p.id)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {p.name} {activeProfileId === p.id && <span className="bg-teal-100 text-teal-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">Active</span>}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium">{p.age} yrs • {p.weight}kg • {p.foodCategories}</p>
                        {p.allergies && p.allergies.length > 0 && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1 bg-rose-50 inline-block px-2 py-0.5 rounded-md">⛔ Alerts: {p.allergies.join(", ")}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {activeProfileId === p.id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onGenerateReport(p); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border ${isPremium ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-pointer'}`}
                          >
                            {isPremium ? <Activity className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {isPremium ? 'Report' : 'Report 🔒'}
                          </button>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <button onClick={(e) => startEditProfile(e, p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors" title="Edit Profile">
                             <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => removeProfile(e, p.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" title="Remove Profile">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl border border-amber-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Child Profile
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg mb-4">{editingProfileId ? 'Edit Profile' : 'New Profile'}</h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Child's Name</label>
              <input type="text" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#4ECDC4] outline-none" placeholder="e.g. Leo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Age (Years)</label>
                <input type="number" min="1" max="15" value={newProfile.age} onChange={e => setNewProfile({...newProfile, age: Number(e.target.value)})} className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#4ECDC4] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Weight (kg)</label>
                <input type="number" min="5" max="80" value={newProfile.weight} onChange={e => setNewProfile({...newProfile, weight: Number(e.target.value)})} className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#4ECDC4] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dietary Category</label>
              <select value={newProfile.foodCategories} onChange={e => setNewProfile({...newProfile, foodCategories: e.target.value as DietaryPreference})} className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#4ECDC4] outline-none">
                {['Any / No Restriction', 'Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Jain'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
              <label className="block text-xs font-bold text-rose-800 uppercase mb-2">⛔ Zero-Tolerance Allergies</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={allergyInput} 
                  onChange={e => setAllergyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddAllergy()}
                  className="w-full p-2 rounded-xl border border-rose-200 focus:border-rose-400 outline-none text-sm" 
                  placeholder="e.g. Peanuts, Dairy..." 
                />
                <button onClick={handleAddAllergy} className="px-3 bg-rose-200 hover:bg-rose-300 text-rose-800 rounded-xl font-bold text-sm">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newProfile.allergies?.map((allergy, i) => (
                  <span key={i} className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg border border-rose-200 text-xs font-bold flex items-center gap-1">
                    {allergy}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setNewProfile({...newProfile, allergies: newProfile.allergies!.filter((_, idx) => idx !== i)})} />
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveProfile} disabled={!newProfile.name} className="flex-1 py-3 bg-[#4ECDC4] hover:bg-teal-500 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50">Save Profile</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
