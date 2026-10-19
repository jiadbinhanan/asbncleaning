'use client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, Mail, ShieldAlert, Calendar, Edit2, Save, Trash2, Camera } from 'lucide-react';
import { updateEmployeeAction, getCloudinarySignature } from '@/app/admin/employees/actions';
import Image from 'next/image';
import DotsLoader from '@/components/common/DotsLoader';
import Kbd from '@/components/common/Kbd';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Define a specific type for the employee profile
interface Profile {
  id: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'agent' | 'supervisor' | 'driver';
  phone: string | null;
}

interface FormData {
    id: string;
    created_at: string;
    username: string;
    full_name: string;
    avatar_url: string;
    role: 'agent' | 'supervisor' | 'driver';
    phone: string;
}

// Props Definition using the Profile type
interface ProfileProps {
  employee: Profile;
  onClose: () => void;
  onUpdate: () => void; // Parent component কে রিফ্রেশ করার জন্য
  onDelete: (id: string) => void;
}

export default function ProfileSlideOver({ employee, onClose, onUpdate, onDelete }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({ 
      ...employee,
      full_name: employee.full_name || '',
      avatar_url: employee.avatar_url || '',
      phone: employee.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      ...employee,
      full_name: employee.full_name || '',
      avatar_url: employee.avatar_url || '',
      phone: employee.phone || '',
    });
  }, [employee]);

  // --- Image Resizing & Upload Logic ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) return alert('File too large! Max 5MB.'); // Raw check

    setUploading(true);

    try {
      // 1. Resize Image using Canvas (1:1 Ratio, Max 500px)
      const resizedImageBlob = await resizeImage(file, 500, 500);

      // 2. Get Signature from Server
      const { signature, timestamp, apiKey, cloudName } = await getCloudinarySignature();

      // 3. Upload to Cloudinary
      const uploadData = new FormData();
      uploadData.append('file', resizedImageBlob);
      uploadData.append('api_key', apiKey!);
      uploadData.append('timestamp', timestamp.toString());
      uploadData.append('signature', signature);
      uploadData.append('folder', 'avatars');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();

      if (data.secure_url) {
        // 4. Update Profile in Supabase
        await updateEmployeeAction(employee.id, { avatar_url: data.secure_url });
        setFormData({ ...formData, avatar_url: data.secure_url });
        onUpdate(); // Refresh parent
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Image upload failed!');
    } finally {
      setUploading(false);
    }
  };

  // Helper: Resize Image
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;

        // Force 1:1 Crop Logic (Center Crop)
        const minDimension = Math.min(width, height);
        const sx = (width - minDimension) / 2;
        const sy = (height - minDimension) / 2;

        canvas.width = maxWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, maxWidth, maxHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas blob error'));
          },
          'image/jpeg',
          0.8
        ); // 80% Quality to keep under 1MB
      };
    });
  };

  // --- Save Profile Updates ---
  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await updateEmployeeAction(employee.id, {
      full_name: formData.full_name,
      phone: formData.phone,
      role: formData.role,
    });

    if (!error) {
      setIsEditing(false);
      onUpdate();
    } else {
      alert('Failed to update profile');
    }
    setIsSaving(false);
  };

  useKeyboardShortcuts([
    {
      combo: 'Escape',
      description: 'Close profile slide-over',
      category: 'Modals',
      handler: onClose,
    },
    {
      combo: 'Ctrl+S',
      description: 'Save profile changes',
      category: 'Actions',
      handler: () => {
        if (isEditing) handleSave();
      },
    },
    {
      combo: 'Alt+E',
      description: 'Edit profile',
      category: 'Actions',
      handler: () => {
        if (!isEditing) setIsEditing(true);
      },
    },
  ]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-[#0c1427] z-50 shadow-2xl overflow-y-auto border-l border-transparent dark:border-slate-800"
      >
        {/* Header Color Block */}
        <div className="relative h-44 bg-gray-900 p-6 flex justify-end items-start">
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md flex items-center gap-1.5" title="Close (Esc)">
            <X size={20} />
            <Kbd variant="glass" size="xs">Esc</Kbd>
          </button>
        </div>

        <div className="px-8 pb-10 -mt-20">
          {/* Avatar Section */}
          <div className="relative w-40 h-40 mx-auto mb-6 group">
            <div className="w-full h-full bg-white dark:bg-[#0c1427] rounded-full p-1.5 shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800">
              <div className="w-full h-full rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                {formData.avatar_url ? (
                  <Image src={formData.avatar_url} alt="Profile" fill className="object-cover" />
                ) : (
                  <User size={60} className="text-gray-400 dark:text-slate-500" />
                )}

                {/* Upload Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <DotsLoader size="sm" variant="white" label="Uploading..." />
                  </div>
                )}
              </div>
            </div>

            {/* Camera Icon Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-2 right-2 p-2.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110"
            >
              <Camera size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          {/* Name & Role */}
          <div className="text-center mb-8">
            {isEditing ? (
              <input
                className="text-2xl font-bold text-center border-b-2 border-blue-500 outline-none w-full pb-1 mb-2 text-gray-800 dark:text-white bg-transparent"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formData.full_name}</h2>
            )}

            <div className="flex items-center justify-center gap-2 mt-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${formData.role === 'supervisor' ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'}`}>
                {formData.role}
              </span>
              <span className="text-gray-400 dark:text-slate-500">•</span>
              <span className="text-gray-500 dark:text-slate-400 font-mono text-sm">@{formData.username}</span>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex gap-3 mb-8">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <DotsLoader size="sm" variant="white" label="Saving..." />
                ) : (
                  <>
                    <Save size={18} /> Save Changes
                    <Kbd variant="dark" size="xs" className="bg-green-800 text-green-200 border-green-700">Ctrl+S</Kbd>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-blue-500 transition-colors"
              >
                <Edit2 size={18} /> Edit Profile
                <Kbd variant="glass" size="xs">Alt+E</Kbd>
              </button>
            )}
            <button onClick={() => onDelete(employee.id)} className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-transparent dark:border-red-900/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors">
              <Trash2 size={20} />
            </button>
          </div>

          {/* Details Grid */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider ml-1">Contact Details</label>
            <div className="bg-gray-50 dark:bg-[#070b14] rounded-2xl p-2 border border-transparent dark:border-slate-800">
              <div className="flex items-center gap-4 p-3 border-b border-gray-100 dark:border-slate-800">
                <Phone className="text-gray-400 dark:text-slate-500" size={20} />
                {isEditing ? (
                  <input
                    className="bg-white dark:bg-[#0c1427] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 w-full text-gray-800 dark:text-white outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <span className="font-medium text-gray-700 dark:text-slate-200">{formData.phone || 'N/A'}</span>
                )}
              </div>
              <div className="flex items-center gap-4 p-3">
                <Mail className="text-gray-400 dark:text-slate-500" size={20} />
                <span className="font-medium text-gray-700 dark:text-slate-200">{formData.username}@btm.com</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 mt-6">
            <label className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider ml-1">System Info</label>
            <div className="bg-gray-50 dark:bg-[#070b14] rounded-2xl p-2 border border-transparent dark:border-slate-800">
              <div className="flex items-center gap-4 p-3 border-b border-gray-100 dark:border-slate-800">
                <ShieldAlert className="text-gray-400 dark:text-slate-500" size={20} />
                {isEditing ? (
                  <select
                    className="bg-white dark:bg-[#0c1427] p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 w-full text-gray-800 dark:text-white outline-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'agent' | 'supervisor' })}
                  >
                    <option value="agent">Agent</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                ) : (
                  <span className="font-medium text-gray-700 dark:text-slate-200 capitalize">{formData.role}</span>
                )}
              </div>
              <div className="flex items-center gap-4 p-3">
                <Calendar className="text-gray-400 dark:text-slate-500" size={20} />
                <span className="font-medium text-gray-700 dark:text-slate-200">Joined: {new Date(formData.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
