import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import Panel from '../components/Panel';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import {
  Box,
  UploadCloud,
  Clock,
  MapPin,
  HandHeart,
  Trash2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:9457', {
  autoConnect: false,
});

const units = ['items', 'packs', 'liters', 'bottles', 'boxes'];

function getOwnerId(offer) {
  if (!offer?.postedBy) return null;
  return typeof offer.postedBy === 'string' ? offer.postedBy : offer.postedBy._id;
}

export default function ResourcesPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [pendingAdminOffers, setPendingAdminOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [applyMessages, setApplyMessages] = useState({});

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
    const { data } = await api.get('/resources');
    setOffers(data);
  };

  const fetchPendingAdminOffers = async () => {
    if (!user?.isAdmin) {
      setPendingAdminOffers([]);
      return;
    }

    const { data } = await api.get('/resources/admin/pending-applications');
    setPendingAdminOffers(data);
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');

    try {
      await Promise.all([fetchOffers(), fetchPendingAdminOffers()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load resource offers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?.isAdmin]);

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

    const refresh = () => {
      loadAll().catch(() => {});
    };

    const events = [
      'resourceCreated',
      'resourceUpdated',
      'resourceDeleted',
      'resourceApplicationCreated',
    ];

    events.forEach((event) => socket.on(event, refresh));

    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
  }, [user?.isAdmin]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleApplyMessageChange = (offerId, value) => {
    setApplyMessages((prev) => ({
      ...prev,
      [offerId]: value,
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
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit resource offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (offerId) => {
    try {
      setActionLoading(`apply-${offerId}`);
      await api.post(`/resources/${offerId}/apply`, {
        message: applyMessages[offerId] || '',
      });
      showToast('Application sent to admin for review.');
      setApplyMessages((prev) => ({ ...prev, [offerId]: '' }));
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to apply.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (offerId) => {
    const confirmed = window.confirm('Delete this resource?');
    if (!confirmed) return;

    try {
      setActionLoading(`delete-${offerId}`);
      await api.delete(`/resources/${offerId}`);
      showToast('Your resource was deleted.');
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete resource.');
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = async (resourceId, applicationId) => {
    try {
      setActionLoading(`approve-${applicationId}`);
      await api.patch(`/resources/${resourceId}/applications/${applicationId}/approve`);
      showToast('Application approved.');
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve application.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (resourceId, applicationId) => {
    try {
      setActionLoading(`reject-${applicationId}`);
      await api.patch(`/resources/${resourceId}/applications/${applicationId}/reject`);
      showToast('Application rejected.');
      await loadAll();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject application.');
    } finally {
      setActionLoading('');
    }
  };

  const hasApplied = (offer) =>
    Array.isArray(offer?.applications) &&
    offer.applications.some(
      (app) =>
        (typeof app.applicant === 'string' ? app.applicant : app.applicant?._id) === user?._id
    );

  return (
    <Layout
      title="Resource Sharing"
      subtitle="Offer spare resources with quantity, availability windows, usage constraints, and an optional photo."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value="Available" />
          {user?.isAdmin && <StatusBadge value="Verified" />}
          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700">
            <Box className="h-4 w-4" />
            Available resources
          </span>
        </div>
      }
    >
      {user?.isAdmin && (
        <div className="mb-6">
          <Panel title="Admin application review">
            {pendingAdminOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No pending applications right now.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAdminOffers.map((offer) => {
                  const pendingApplications = offer.applications.filter((app) => app.status === 'Pending');

                  return (
                    <div key={offer._id} className="rounded-3xl border border-slate-200 p-4">
                      <h3 className="text-lg font-bold text-slate-900">{offer.resourceName}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Owner: {offer.ownerName} • Community: {offer.community}
                      </p>

                      <div className="mt-4 space-y-3">
                        {pendingApplications.map((app) => (
                          <div key={app._id} className="rounded-2xl bg-slate-50 p-4">
                            <p className="font-semibold text-slate-900">{app.applicantName}</p>
                            <p className="text-sm text-slate-600">{app.applicantPhone}</p>
                            {app.message ? (
                              <p className="mt-2 text-sm text-slate-700">Message: {app.message}</p>
                            ) : null}
                            <p className="mt-2 text-xs text-slate-400">
                              Applied at: {new Date(app.appliedAt).toLocaleString()}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(offer._id, app._id)}
                                disabled={actionLoading === `approve-${app._id}`}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                {actionLoading === `approve-${app._id}` ? 'Approving...' : 'Approve'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReject(offer._id, app._id)}
                                disabled={actionLoading === `reject-${app._id}`}
                                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                              >
                                <XCircle className="h-4 w-4" />
                                {actionLoading === `reject-${app._id}` ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

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
              required
            />

            <FormField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Latitude"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                required
              />
              <FormField
                label="Longitude"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
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
                offers.map((offer) => {
                  const ownerId = getOwnerId(offer);
                  const isOwner = ownerId === user?._id;
                  const alreadyApplied =
                    Array.isArray(offer?.applications) &&
                    offer.applications.some(
                      (app) =>
                        (typeof app.applicant === 'string' ? app.applicant : app.applicant?._id) === user?._id
                    );
                  const canApply = !isOwner && offer.status === 'Available' && !alreadyApplied;

                  return (
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

                          {offer.status === 'Reserved' && offer.assignedApplicantName ? (
                            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                              Assigned to: <strong>{offer.assignedApplicantName}</strong>
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-col gap-3">
                            {canApply && (
                              <>
                                <textarea
                                  value={applyMessages[offer._id] || ''}
                                  onChange={(e) => handleApplyMessageChange(offer._id, e.target.value)}
                                  rows="2"
                                  placeholder="Optional message for admin"
                                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleApply(offer._id)}
                                  disabled={actionLoading === `apply-${offer._id}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                >
                                  <HandHeart className="h-4 w-4" />
                                  {actionLoading === `apply-${offer._id}` ? 'Applying...' : 'Apply'}
                                </button>
                              </>
                            )}

                            {alreadyApplied && (
                              <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-700">
                                You already applied. Waiting for admin review.
                              </div>
                            )}

                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleDelete(offer._id)}
                                disabled={actionLoading === `delete-${offer._id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                {actionLoading === `delete-${offer._id}` ? 'Deleting...' : 'Delete my resource'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Toast message={toast} />
    </Layout>
  );
}