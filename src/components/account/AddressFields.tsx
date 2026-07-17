"use client";

import { INDIA_STATES } from "@/lib/india-states";

export interface AddressValues {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  stateCode: string;
  pincode: string;
}

export const EMPTY_ADDRESS: AddressValues = {
  fullName: "", phone: "", line1: "", line2: "", city: "", stateCode: "", pincode: "",
};

export const toAddressPayload = (v: AddressValues) => ({
  fullName: v.fullName,
  phone: v.phone,
  line1: v.line1,
  line2: v.line2 || undefined,
  city: v.city,
  state: INDIA_STATES.find((s) => s.code === v.stateCode)?.name ?? v.stateCode,
  stateCode: v.stateCode,
  pincode: v.pincode,
});

const input =
  "w-full px-4 py-2.5 rounded-lg border border-ivory-300 bg-white text-ink-950 text-sm focus:border-gold-600";
const label = "block text-sm text-ink-700 mb-1.5";

export function AddressFields({
  values,
  onChange,
}: {
  values: AddressValues;
  onChange: (v: AddressValues) => void;
}) {
  const set = (k: keyof AddressValues, val: string) => onChange({ ...values, [k]: val });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={label} htmlFor="addr-name">Full name</label>
        <input id="addr-name" required className={input} value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="addr-phone">Mobile</label>
        <input id="addr-phone" required inputMode="numeric" maxLength={10} className={input} value={values.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="md:col-span-2">
        <label className={label} htmlFor="addr-line1">Address line 1</label>
        <input id="addr-line1" required className={input} value={values.line1} onChange={(e) => set("line1", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className={label} htmlFor="addr-line2">Address line 2 (optional)</label>
        <input id="addr-line2" className={input} value={values.line2} onChange={(e) => set("line2", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="addr-city">City</label>
        <input id="addr-city" required className={input} value={values.city} onChange={(e) => set("city", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="addr-state">State</label>
        <select id="addr-state" required className={input} value={values.stateCode} onChange={(e) => set("stateCode", e.target.value)}>
          <option value="">Select state…</option>
          {INDIA_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="addr-pincode">Pincode</label>
        <input id="addr-pincode" required inputMode="numeric" maxLength={6} className={input} value={values.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
      </div>
    </div>
  );
}
