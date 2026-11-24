import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiMapPin, FiPlus, FiTrash2, FiStar, FiCamera } from "react-icons/fi";
import { updateProfile, addAddress, setDefaultAddress, deleteAddress, uploadProfileImage, removeProfileImage } from "../features/auth/authSlice";
import { ROLE_LABELS, ROLE_STYLES, isEmployee } from "../utils/roles";
import Avatar from "../components/common/Avatar";
import AccountSecurity from "../components/auth/AccountSecurity";
import ConnectedAccounts from "../components/auth/ConnectedAccounts";
import authService from "../features/auth/authService";
import { getErrorMessage } from "../services/api";
import Modal from "../components/common/Modal";
import Seo from "../components/common/Seo";
import VerifyEmailBanner from "../components/auth/VerifyEmailBanner";
import PasswordInput from "../components/common/PasswordInput";
import { optimizeImage } from "../utils/image";

const EMPTY_ADDRESS = { label: "Home", line1: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

export default function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  // Validates type and size in the browser first. The server checks both again.
  const pickImage = (kind) => async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return toast.error("Choose a JPG, PNG or WEBP image");
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be smaller than 3 MB");
    try {
      await dispatch(uploadProfileImage({ kind, file })).unwrap();
      toast.success(kind === "avatar" ? "Profile picture updated" : "Cover image updated");
    } catch (message) {
      toast.error(message);
    }
  };

  const dropImage = (kind) => async () => {
    try {
      await dispatch(removeProfileImage(kind)).unwrap();
      toast.success("Image removed");
    } catch (message) {
      toast.error(message);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10 digit mobile number");
    setSavingProfile(true);
    try {
      await dispatch(updateProfile({ name, phone })).unwrap();
      toast.success("Profile updated");
    } catch (message) {
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirm) return toast.error("New passwords do not match");
    setSavingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setSavingAddress(true);
    try {
      await dispatch(addAddress(address)).unwrap();
      toast.success("Address saved");
      setAddressOpen(false);
      setAddress(EMPTY_ADDRESS);
    } catch (message) {
      toast.error(message);
    } finally {
      setSavingAddress(false);
    }
  };

  const removeAddress = async (id) => {
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success("Address removed");
    } catch (message) {
      toast.error(message);
    }
  };

  const makeDefault = async (id) => {
    try {
      await dispatch(setDefaultAddress(id)).unwrap();
    } catch (message) {
      toast.error(message);
    }
  };

  const field = (key) => (event) => setAddress((a) => ({ ...a, [key]: event.target.value }));

  return (
    <div className="container-page py-8">
      <Seo title="My profile" />
      {user.role === "CUSTOMER" && <VerifyEmailBanner />}
      <div className="card mb-6 overflow-hidden">
        <div className="relative h-40 sm:h-52" style={{ background: user.cover ? undefined : "linear-gradient(135deg, #ffa94d, #ff7a00 55%, #e56a00)" }}>
          {user.cover && <img src={optimizeImage(user.cover)} alt="" className="h-full w-full object-cover object-center" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
          <div className="absolute right-3 top-3 flex gap-2">
            <label className="btn-dark btn-sm cursor-pointer !bg-black/55 !text-white backdrop-blur">
              <FiCamera /> {user.cover ? "Change cover" : "Add cover"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage("cover")} />
            </label>
            {user.cover && <button type="button" className="btn-dark btn-sm !bg-black/55 !text-white backdrop-blur" onClick={dropImage("cover")}>Remove</button>}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <div className="relative -mt-12">
            <Avatar user={user} size={96} className="ring-4 ring-[var(--surface)]" />
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow" title="Change profile picture">
              <FiCamera size={14} /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage("avatar")} />
            </label>
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="truncate text-2xl font-bold text-choco">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${ROLE_STYLES[user.role]}`}>{ROLE_LABELS[user.role]}</span>
            {user.avatar && <button type="button" className="btn-ghost btn-sm" onClick={dropImage("avatar")}>Remove picture</button>}
          </div>
        </div>
        {isEmployee(user) && (
          <dl className="grid gap-4 px-6 pb-6 text-sm sm:grid-cols-3" style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Designation</dt><dd className="font-semibold text-choco">{user.designation || "Not set"}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Role</dt><dd className="font-semibold text-choco">{ROLE_LABELS[user.role]}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-gray-500">Member since</dt><dd className="font-semibold text-choco">{new Date(user.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-choco">Personal details</h2>
            <span className="badge bg-accent/15 text-accent">
              <FiStar /> {user.loyaltyPoints} points
            </span>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" value={user.email} disabled />
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input id="phone" className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </div>
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </form>
          <p className="text-xs text-gray-500">Earn loyalty points on every delivered order. 1 point is worth Rs. 1 at checkout.</p>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-choco">Change password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="label" htmlFor="current">Current password</label>
              <PasswordInput id="current" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} required autoComplete="current-password" />
            </div>
            <div>
              <label className="label" htmlFor="new">New password</label>
              <PasswordInput id="new" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} required autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm new password</label>
              <PasswordInput id="confirm" minLength={8} value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} required autoComplete="new-password" />
            </div>
            <button type="submit" className="btn-dark" disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>

        <section className="card space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-choco">Saved addresses</h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => setAddressOpen(true)} disabled={user.addresses.length >= 5}>
              <FiPlus /> Add address
            </button>
          </div>

          {user.addresses.length === 0 ? (
            <p className="text-sm text-gray-500">You have not saved any address yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {user.addresses.map((a) => (
                <div key={a._id} className="flex gap-3 rounded-2xl border border-gray-200 p-4">
                  <FiMapPin className="mt-1 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-choco">
                      {a.label} {a.isDefault && <span className="badge ml-1 bg-green-100 text-green-700">Default</span>}
                    </p>
                    <p className="text-gray-600">
                      {[a.line1, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {!a.isDefault && (
                        <button type="button" className="btn-ghost btn-sm" onClick={() => makeDefault(a._id)}>Make default</button>
                      )}
                      <button type="button" className="btn-danger btn-sm" onClick={() => removeAddress(a._id)}>
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-bold text-choco">Security</h2>
      <div className="mb-6"><ConnectedAccounts /></div>
      <AccountSecurity />

      <Modal open={addressOpen} onClose={() => setAddressOpen(false)} title="Add a new address">
        <form onSubmit={saveAddress} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="label">Label</label>
            <input id="label" className="input" value={address.label} onChange={field("label")} placeholder="Home, Work..." />
          </div>
          <div>
            <label className="label" htmlFor="pincode">Pincode</label>
            <input id="pincode" className="input" inputMode="numeric" value={address.pincode} onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="line1">Address</label>
            <input id="line1" className="input" value={address.line1} onChange={field("line1")} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="landmark">Landmark (optional)</label>
            <input id="landmark" className="input" value={address.landmark} onChange={field("landmark")} />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" className="input" value={address.city} onChange={field("city")} required />
          </div>
          <div>
            <label className="label" htmlFor="state">State</label>
            <input id="state" className="input" value={address.state} onChange={field("state")} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="accent-brand" checked={address.isDefault} onChange={(e) => setAddress((a) => ({ ...a, isDefault: e.target.checked }))} />
            Make this my default address
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-ghost" onClick={() => setAddressOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingAddress}>
              {savingAddress ? "Saving..." : "Save address"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
