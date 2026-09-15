import React, { useState, useEffect } from 'react';
import {
  EmergencyContact,
  getEmergencyContacts,
  saveEmergencyContact,
  deleteEmergencyContact,
} from '../services/triageApi';
import { Phone, UserPlus, Trash2, X, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await getEmergencyContacts();
      setContacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (contacts.length >= 2) {
      setError('You can save up to 2 emergency contacts.');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setError('Please enter both name and a valid contact phone number.');
      return;
    }

    try {
      setLoading(true);
      const saved = await saveEmergencyContact({ name, phone, relationship });
      if (saved) {
        setName('');
        setPhone('');
        setSuccess('Emergency contact registered successfully.');
        await loadContacts();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setLoading(false);
    }
  };

  const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const handlePickDeviceContact = async () => {
    setError(null);
    try {
      const selected = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      if (selected && selected.length > 0) {
        const c = selected[0];
        const pickedName = (c.name && c.name[0]) || '';
        const pickedTel = (c.tel && c.tel[0]) || '';
        if (pickedName) setName(pickedName);
        if (pickedTel) setPhone(pickedTel);
      }
    } catch (err: any) {
      console.info('Contact picker cancelled or unsupported:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmergencyContact(id);
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/50 flex items-center justify-center text-teal-200">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Emergency Contacts</h3>
              <p className="text-[11px] text-teal-200/80">Auto-alerted during acute medical emergencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              When an <strong>Emergency (ESI 1/2)</strong> assessment is reached, the system can dispatch an
              automated AI voice summary directly to these phone numbers.
            </p>
          </div>

          {/* Current Contacts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Saved Contacts ({contacts.length}/2)</span>
            </div>

            {contacts.length === 0 && !loading && (
              <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No emergency contacts added yet.
              </p>
            )}

            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {c.phone} &bull; <span className="font-sans text-slate-600 font-medium">{c.relationship}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(c.id)}
                  title="Remove contact"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Form */}
          {contacts.length < 2 && (
            <form onSubmit={handleAddContact} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-700" />
                  <span>Add Emergency Contact</span>
                </h4>
                {hasContactPicker && (
                  <button
                    type="button"
                    onClick={handlePickDeviceContact}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Import Device Contact
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Friend">Friend / Caregiver</option>
                    <option value="Doctor">Primary Doctor</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
              {success && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Contact'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100/80 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
