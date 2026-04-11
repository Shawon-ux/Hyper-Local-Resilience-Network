import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Panel from '../components/Panel';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import { Box, UploadCloud, Clock, MapPin } from 'lucide-react';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:9457', {
  autoConnect: false,
});

const units = ['items', 'packs', 'liters', 'bottles', 'boxes'];

export default function ResourcesPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState({
    resourceName: '',
    quantity: 1,
    unit: 'items',
    availabilityStart: '',
    availabilityEnd: '',
    usageConstraints: '',
    community: user?.address || '',
    phone: user?.phone || '',
    latitude: user?.location?.lat ?? '',
    longitude: user?.location?.lng ?? '',
    photoData: '',
    photoName: '',
  });

  const stats = useMemo(() => {
    const available = offers.filter((offer) => offer.status === 'Available').length;
    const reserved = offers.filter((offer) => offer.status === 'Reserved').length;
    const unavailable = offers.filter((offer) => offer.status === 'Unavailable').length;

    return {
      total: offers.length,
      available,
      reserved,
      unavailable,
    };
  }, [offers]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__resourceToastTimer);
    window.__resourceToastTimer = window.setTimeout(() => setToast(''), 3000);
  };

  const fetchOffers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/resources');
      setOffers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load resource offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      community: prev.community || user?.address || '',
      phone: prev.phone || user?.phone || '',
      latitude: prev.latitude || user?.location?.lat || '',
      longitude: prev.longitude || user?.location?.lng || '',
    }));
  }, [user]);

  useEffect(() => {
    socket.connect();

    const refresh = () => fetchOffers().catch(() => {});
    const events = ['resourceCreated', 'resourceUpdated', 'resourceDeleted'];

    events.forEach((event) => socket.on(event, refresh));

    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setForm((prev) => ({ ...prev, photoData: '', photoName: '' }));
      setPreviewUrl('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        photoData: reader.result,
        photoName: file.name,
      }));
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.resourceName.trim()) {
      setError('Resource name is required.');
      return;
    }

    if (!form.community.trim()) {
      setError('Community is required.');
      return;
    }

    if (!form.availabilityStart || !form.availabilityEnd) {
      setError('Availability window must be specified.');
      return;
    }

    if (!form.latitude || !form.longitude) {
      setError('Latitude and longitude are required.');
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        userName: user?.name || 'Unknown',
        phone: form.phone || user?.phone || '',
        community: form.community,
        resourceName: form.resourceName,
        quantity: Number(form.quantity),
        unit: form.unit,
        availabilityStart: form.availabilityStart,
        availabilityEnd: form.availabilityEnd,
        usageConstraints: form.usageConstraints,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        photoData: form.photoData,
        photoName: form.photoName,
      };

      await api.post('/resources', body);
      showToast('Resource offer submitted successfully.');
      setForm((prev) => ({
        ...prev,
        resourceName: '',
        quantity: 1,
        unit: 'items',
        availabilityStart: '',
        availabilityEnd: '',
        usageConstraints: '',
        photoData: '',
        photoName: '',
      }));
      setPreviewUrl('');
      fetchOffers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit resource offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Resource Sharing"
      subtitle="Offer spare resources with quantity, availability windows, usage constraints, and an optional photo."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value="Available" />
          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700">
            <Box className="h-4 w-4" />
            Available resources
          </span>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[420px,1fr]">
        <Panel title="Offer a resource">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField
              label="Resource name"
              name="resourceName"
              value={form.resourceName}
              onChange={handleChange}
              placeholder="Spare generator"
              required
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Quantity"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                min={1}
                required
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Unit</span>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Available from</span>
                <input
                  type="datetime-local"
                  name="availabilityStart"
                  value={form.availabilityStart}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Available until</span>
                <input
                  type="datetime-local"
                  name="availabilityEnd"
                  value={form.availabilityEnd}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>
            </div>

            <FormField
              label="Community"
              name="community"
              value={form.community}
              onChange={handleChange}
              placeholder="Your neighbourhood or hub"
              required
            />

            <FormField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1234567890"
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Latitude"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="23.8103"
                required
              />
              <FormField
                label="Longitude"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="90.4125"
                required
              />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Usage constraints (optional)</span>
              <textarea
                name="usageConstraints"
                value={form.usageConstraints}
                onChange={handleChange}
                rows="3"
                placeholder="Only for emergency use, do not lend outside area, etc."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Photo (optional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              />
            </label>

            {previewUrl && (
              <div className="rounded-3xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-700">Preview</p>
                <img src={previewUrl} alt="Offer preview" className="h-48 w-full rounded-3xl object-cover" />
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Publish resource offer'}
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Total offers</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Available</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.available}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Reserved / Unavailable</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{stats.reserved + stats.unavailable}</p>
            </div>
          </div>

          <Panel title="Live resource feed">
            <div className="space-y-4">
              {loading ? (
                <div className="grid min-h-[220px] place-items-center rounded-3xl border border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-500">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No resource offers are available yet.
                </div>
              ) : (
                offers.map((offer) => (
                  <article key={offer._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[200px,1fr]">
                      <div className="min-h-[200px] bg-slate-100">
                        {offer.photoUrl ? (
                          <img
                            src={offer.photoUrl}
                            alt={offer.resourceName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <UploadCloud className="h-12 w-12" />
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{offer.resourceName}</h3>
                            <p className="mt-1 text-sm text-slate-500">{offer.community}</p>
                          </div>
                          <StatusBadge value={offer.status || 'Available'} />
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">Qty:</span> {offer.quantity} {offer.unit}
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">Available</span>
                            <br />
                            {new Date(offer.availabilityStart).toLocaleString()} - {new Date(offer.availabilityEnd).toLocaleString()}
                          </div>
                        </div>

                        {offer.usageConstraints ? (
                          <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">Usage constraints:</span> {offer.usageConstraints}
                          </p>
                        ) : null}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                            <MapPin className="mr-2 inline-block h-4 w-4" />
                            {offer.latitude?.toFixed(4)}, {offer.longitude?.toFixed(4)}
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-600">
                            <Clock className="mr-2 inline-block h-4 w-4" />
                            Shared by {offer.userName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Toast message={toast} />
    </Layout>
  );
}
