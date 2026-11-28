import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { updateSettings } from "../../features/settings/settingsSlice";
import Toggle from "../../components/admin/Toggle";
import Seo from "../../components/common/Seo";

export default function Settings() {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings.data);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ ...settings, servicePincodes: settings.servicePincodes.join(", ") });
    }
  }, [settings, form]);

  if (!form) return null;

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = async (body, message = "Settings saved") => {
    setSaving(true);
    try {
      await dispatch(updateSettings(body)).unwrap();
      toast.success(message);
    } catch (error) {
      toast.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { _id, __v, key, createdAt, updatedAt, ...body } = form;
    save(body);
  };

  // Opening or closing the restaurant takes effect immediately.
  const handleOpenToggle = async (value) => {
    setForm((f) => ({ ...f, isOpen: value }));
    await save({ isOpen: value }, value ? "Restaurant is now open for orders" : "Restaurant is now closed for orders");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Seo title="Settings" />
      <h1 className="text-2xl font-bold text-choco">Restaurant settings</h1>

      <section className={`card flex items-center justify-between gap-4 p-5 ${form.isOpen ? "" : "border-red-200 bg-red-50"}`}>
        <div>
          <p className="font-semibold text-choco">{form.isOpen ? "Restaurant is open" : "Restaurant is closed"}</p>
          <p className="text-sm text-gray-500">When closed, customers can browse the menu but cannot place new orders.</p>
        </div>
        <Toggle checked={form.isOpen} onChange={handleOpenToggle} disabled={saving} label="Accepting orders" />
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-3">
          <div className="sm:col-span-3"><h2 className="font-semibold text-choco">Social profiles</h2><p className="mt-1 text-xs text-gray-500">Add your real public profile URLs. Links appear in the website footer.</p></div>
          {[["facebook", "Facebook"], ["instagram", "Instagram"], ["linkedin", "LinkedIn"]].map(([key, label]) => <div key={key}><label className="label" htmlFor={`social-${key}`}>{label} URL</label><input id={`social-${key}`} type="url" className="input" value={form.socialLinks?.[key] || ""} onChange={(event) => setForm((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: event.target.value } }))} placeholder="https://" /></div>)}
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold text-choco sm:col-span-2">Restaurant details</h2>
          <div>
            <label className="label" htmlFor="restaurantName">Restaurant name</label>
            <input id="restaurantName" className="input" value={form.restaurantName} onChange={set("restaurantName")} required />
          </div>
          <div>
            <label className="label" htmlFor="tagline">Tagline</label>
            <input id="tagline" className="input" value={form.tagline} onChange={set("tagline")} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className="label" htmlFor="whatsappNumber">WhatsApp number (with country code)</label>
            <input id="whatsappNumber" className="input" value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="919876543210" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label" htmlFor="gstNumber">GSTIN (shown on invoices)</label>
            <input id="gstNumber" className="input" value={form.gstNumber} onChange={set("gstNumber")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address">Address</label>
            <textarea id="address" rows={2} className="input" value={form.address} onChange={set("address")} />
          </div>
          <div>
            <label className="label" htmlFor="openTime">Opens at</label>
            <input id="openTime" type="time" className="input" value={form.openTime} onChange={set("openTime")} />
          </div>
          <div>
            <label className="label" htmlFor="closeTime">Closes at</label>
            <input id="closeTime" type="time" className="input" value={form.closeTime} onChange={set("closeTime")} />
          </div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold text-choco sm:col-span-2">Charges and rewards</h2>
          <div>
            <label className="label" htmlFor="taxPercent">Tax / GST (%)</label>
            <input id="taxPercent" type="number" min={0} max={100} step="0.01" className="input" value={form.taxPercent} onChange={set("taxPercent")} />
          </div>
          <div>
            <label className="label" htmlFor="minOrderAmount">Minimum order amount (Rs.)</label>
            <input id="minOrderAmount" type="number" min={0} className="input" value={form.minOrderAmount} onChange={set("minOrderAmount")} />
          </div>
          <div>
            <label className="label" htmlFor="deliveryCharge">Delivery charge (Rs.)</label>
            <input id="deliveryCharge" type="number" min={0} className="input" value={form.deliveryCharge} onChange={set("deliveryCharge")} />
          </div>
          <div>
            <label className="label" htmlFor="freeDeliveryAbove">Free delivery above (Rs., 0 = never free)</label>
            <input id="freeDeliveryAbove" type="number" min={0} className="input" value={form.freeDeliveryAbove} onChange={set("freeDeliveryAbove")} />
          </div>
          <div>
            <label className="label" htmlFor="loyaltyPercent">Loyalty points earned (% of bill)</label>
            <input id="loyaltyPercent" type="number" min={0} max={100} step="0.1" className="input" value={form.loyaltyPercent} onChange={set("loyaltyPercent")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="servicePincodes">Delivery pincodes (comma separated, empty = deliver everywhere)</label>
            <input id="servicePincodes" className="input" value={form.servicePincodes} onChange={set("servicePincodes")} placeholder="243001, 243005" />
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-8" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
        </div>
      </form>
    </div>
  );
}
