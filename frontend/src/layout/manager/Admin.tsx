import { useState } from "react";
import {
  Mail,
  Phone,
  Pencil,
  Plus,
  Trash2,
  X,
  User,
  Lock,
  Shield,
  ChevronDown,
} from "lucide-react";
import { ChangePasswordForm } from "@/forms/ChangePasswordForm";

type Role = "Super Admin" | "Manager";

interface Admin {
  id: number;
  name: string;
  email: string;
  phone: string;
  image: string;
  role: Role;
}

const initialAdmins: Admin[] = [
  {
    id: 1,
    name: "Maria Santos",
    email: "maria.santos@tolsbarbers...",
    phone: "+63 917 123 4567",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    role: "Super Admin",
  },
  {
    id: 2,
    name: "Antonio Cruz",
    email: "antonio.cruz@tolsbarbers...",
    phone: "+63 928 234 5678",
    image: "https://randomuser.me/api/portraits/men/22.jpg",
    role: "Manager",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    email: "elena.rodriguez@tolsbarb...",
    phone: "+63 939 345 6789",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    role: "Manager",
  },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  image: "",
  role: "Manager" as Role,
};

export function Admin() {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [showModal, setShowModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    setAdmins((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        image: form.image,
        role: form.role,
      },
    ]);
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  };

  const openChangePasswordModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowChangePassword(true);
  };

  const closeChangePasswordModal = () => {
    setShowChangePassword(false);
    setSelectedAdmin(null);
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admins
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Manage administrative users
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span className="hidden xs:inline">Add Admin</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col items-center"
          >
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 bg-gray-200 shrink-0">
              {admin.image ? (
                <img
                  src={admin.image}
                  alt={admin.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>

            {/* Name & Role */}
            <p className="font-bold text-gray-900 text-base sm:text-lg text-center">
              {admin.name}
            </p>
            <span className="flex items-center gap-1.5 mt-1.5 mb-4 bg-purple-100 text-purple-500 text-xs font-medium px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" strokeWidth={2} />
              {admin.role}
            </span>

            {/* Contact Info */}
            <div className="w-full space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Mail className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{admin.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Phone className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                <span>{admin.phone}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors">
                  <Pencil className="w-4 h-4" strokeWidth={2} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(admin.id)}
                  className="bg-red-500 hover:bg-red-600 transition-colors text-white rounded-lg p-2"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
              <button
                onClick={() => openChangePasswordModal(admin)}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <Lock className="w-4 h-4" strokeWidth={2} />
                Change Password
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-lg shadow-xl relative max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Add New Admin
            </h2>
            <p className="text-gray-500 text-sm mt-0.5 mb-6">
              Fill in the admin information
            </p>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-500 outline-none"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="+63 912 345 6789"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-500 outline-none"
                />
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  Profile Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-500 outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as Role })
                    }
                    className="w-full appearance-none bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="border border-gray-200 rounded-xl px-5 sm:px-6 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl px-5 sm:px-6 py-2.5 text-sm"
              >
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordForm
        open={showChangePassword}
        onClose={closeChangePasswordModal}
        title={
          selectedAdmin
            ? `Change Password for ${selectedAdmin.name}`
            : "Change Password"
        }
        subtitle="Set a temporary password and share it securely with the admin user."
      />
    </div>
  );
}
