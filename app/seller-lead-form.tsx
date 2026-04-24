"use client";

import { useState } from "react";

type FormState = {
  name: string;
  phone: string;
  address: string;
  timeline: string;
  details: string;
};

const INITIAL_STATE: FormState = {
  name: "",
  phone: "",
  address: "",
  timeline: "",
  details: "",
};

export default function SellerLeadForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public-seller-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not submit your request.");
      }

      setSuccess(
        "Thanks. Your information was sent successfully and we will follow up shortly."
      );
      setForm(INITIAL_STATE);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-700">
            Full name
          </span>
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-black"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-700">
            Phone number
          </span>
          <input
            required
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-black"
            placeholder="Best number to reach you"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-700">
          Property address
        </span>
        <input
          required
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-black"
          placeholder="123 Main St, City, State"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-700">
          Ideal timeline
        </span>
        <input
          value={form.timeline}
          onChange={(event) => updateField("timeline", event.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-black"
          placeholder="ASAP, 30 days, just exploring, etc."
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-700">
          Tell us about the property
        </span>
        <textarea
          rows={5}
          value={form.details}
          onChange={(event) => updateField("details", event.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-black"
          placeholder="Repairs needed, situation, tenants, inherited property, foreclosure, or anything else you want us to know."
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
      >
        {isSubmitting ? "Sending..." : "Get My Cash Offer"}
      </button>

      <p className="text-xs leading-5 text-neutral-500">
        No pressure. No obligation. Just a quick conversation about your
        options.
      </p>
    </form>
  );
}
