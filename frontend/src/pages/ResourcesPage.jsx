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
  AlertCircle,
  Box,
  CheckCircle2,
  Clock,
  Filter,
  HandHeart,
  ImagePlus,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  XCircle,
} from 'lucide-react';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:9457', {
  autoConnect: false,
});

const units = ['items', 'packs', 'liters', 'bottles', 'boxes'];

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'Available', label: 'Available' },
  { id: 'Reserved', label: 'Reserved' },
  { id: 'Unavailable', label: 'Unavailable' },
  { id: 'mine', label: 'My offers' },
];

function getOwnerId(offer) {
  if (!offer?.postedBy) return null;
  return typeof offer.postedBy === 'string' ? offer.postedBy : offer.postedBy._id;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.resources)) return data.resources;
  if (Array.isArray(data?.offers)) return data.offers;
  return [];
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
}

function getStatusTone(status) {
  if (status === 'Available') return 'emerald';
  if (status === 'Reserved') return 'amber';
  if (status === 'Unavailable') return 'rose';
  return 'blue';
}

function getStatusPillClass(status) {
  const tone = getStatusTone(status);

  if (tone === 'emerald') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }

  if (tone === 'amber') {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }

  if (tone === 'rose') {
    return 'bg-rose-50 text-rose-700 ring-rose-100';
  }

  return 'bg-blue-50 text-blue-700 ring-blue-100';
}

function StatTile({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InfoPill({ icon: Icon, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
      {Icon ? <Icon className="mr-2 inline-block h-4 w-4 text-slate-400" /> : null}
      {children}
    </div>
  );
}

function ResourceImage({ offer }) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageSrc = offer?.photoUrl
    ? offer.photoUrl.startsWith('http') ||
      offer.photoUrl.startsWith('data:') ||
      offer.photoUrl.startsWith('/uploads')
      ? offer.photoUrl
      : `/${offer.photoUrl}`
    : '';

  if (!imageSrc || imageFailed) {
    return (
      <div className="relative flex h-full min-h-[260px] items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-100">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-blue-200/50 blur-2xl" />
        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-indigo-200/60 blur-2xl" />

        <div className="relative text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
            <PackageOpen className="h-8 w-8" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No preview image
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Resource photo unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[260px] overflow-hidden bg-slate-100">
      <img
        src={imageSrc}
        alt={offer.resourceName || 'Resource'}
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover transition duration-500 hover:scale-105"
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4">
        <p className="text-sm font-semibold text-white">
          {offer.resourceName || 'Resource'}
        </p>
        <p className="mt-1 text-xs text-slate-200">
          {offer.community || 'Community not specified'}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
        >
          <div className="grid gap-0 lg:grid-cols-[260px,1fr]">
            <div className="h-64 bg-slate-100" />
            <div className="p-6">
              <div className="flex justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-5 w-48 rounded-full bg-slate-200" />
                  <div className="h-4 w-64 rounded-full bg-slate-100" />
                </div>
                <div className="h-8 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="h-28 rounded-3xl bg-slate-100" />
                <div className="h-28 rounded-3xl bg-slate-100" />
              </div>
              <div className="mt-4 h-16 rounded-3xl bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <PackageOpen className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function ResourcesPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [pendingAdminOffers, setPendingAdminOffers] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [applyForm, setApplyForm] = useState({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalQuantities, setApprovalQuantities] = useState({});

  const [form, setForm] = useState({
    resourceName: '',
    quantity: 1,
    unit: 'items',
    availabilityStart: '',
    availabilityEnd: '',
    usageConstraints: '',
    community: user?.address || '',
    areaName: user?.address || '',
    phone: user?.phone || '',
    photoData: '',
    photoName: '',
  });

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');

  const isAdmin = Boolean(user?.isAdmin || user?.role === 'admin');

  const stats = useMemo(() => {
    const available = offers.filter((offer) => offer.status === 'Available').length;
    const reserved = offers.filter((offer) => offer.status === 'Reserved').length;
    const unavailable = offers.filter((offer) => offer.status === 'Unavailable').length;
    const mine = offers.filter((offer) => getOwnerId(offer) === user?._id).length;

    return {
      total: offers.length,
      available,
      reserved,
      unavailable,
      mine,
    };
  }, [offers, user?._id]);

  const filteredOffers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return offers.filter((offer) => {
      const ownerId = getOwnerId(offer);
      const isOwner = ownerId === user?._id;

      const matchesStatus =
        statusFilter === 'all' ||
        offer.status === statusFilter ||
        (statusFilter === 'mine' && isOwner);

      const searchableText = [
        offer.resourceName,
        offer.community,
        offer.areaName,
        offer.userName,
        offer.phone,
        offer.unit,
        offer.status,
        offer.usageConstraints,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [offers, query, statusFilter, user?._id]);

  const pendingApplicationCount = useMemo(() => {
    return pendingAdminOffers.reduce((count, offer) => {
      return (
        count +
        (offer.applications || []).filter((app) => app.status === 'Pending').length
      );
    }, 0);
  }, [pendingAdminOffers]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(window.__resourceToastTimer);
    window.__resourceToastTimer = window.setTimeout(() => setToast(''), 3000);
  };

  const fetchOffers = async () => {
    const { data } = await api.get('/resources');
    setOffers(normalizeList(data));
  };

  const fetchPendingAdminOffers = async () => {
    if (!isAdmin) {
      setPendingAdminOffers([]);
      return;
    }

    const { data } = await api.get('/resources/admin/pending-applications');
    setPendingAdminOffers(normalizeList(data));
  };

  const fetchMyApplications = async () => {
    const { data } = await api.get('/resources/my-applications');
    setMyApplications(normalizeList(data));
  };

  const loadAll = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      await Promise.all([
        fetchOffers(),
        fetchPendingAdminOffers(),
        fetchMyApplications(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load resource data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      community: prev.community || user?.address || '',
      areaName: prev.areaName || user?.address || '',
      phone: prev.phone || user?.phone || '',
    }));

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setGeoStatus('Location captured for proximity matching.');
        },
        () => {
          setGeoStatus(
            'Auto location capture failed. Use the location button to capture manually.'
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoStatus('Geolocation is not available in this browser.');
    }
  }, [user]);

  useEffect(() => {
    socket.connect();

    const refresh = () => {
      loadAll({ silent: true }).catch(() => {});
    };

    const events = [
      'resourceCreated',
      'resourceUpdated',
      'resourceDeleted',
      'requestApproved',
    ];

    events.forEach((event) => socket.on(event, refresh));

    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('Geolocation is not supported in your browser.');
      return;
    }

    setGeoStatus('Capturing location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGeoStatus('Location captured successfully for proximity matching.');
      },
      (err) => {
        console.error(err);
        setGeoStatus('Failed to capture location. Please enable location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const handleApplyFieldChange = (offerId, field, value) => {
    setApplyForm((prev) => ({
      ...prev,
      [offerId]: {
        ...(prev[offerId] || {
          requestedQuantity: 1,
          applicantAddress: user?.address || '',
          message: '',
        }),
        [field]: value,
      },
    }));
  };

  const handleApprovalQuantityChange = (applicationId, value) => {
    setApprovalQuantities((prev) => ({
      ...prev,
      [applicationId]: value,
    }));
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

    if (!form.areaName.trim()) {
      setError('Area name is required.');
      return;
    }

    if (!form.availabilityStart || !form.availabilityEnd) {
      setError('Availability window must be specified.');
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        phone: form.phone || user?.phone || '',
        community: form.community,
        areaName: form.areaName,
        resourceName: form.resourceName,
        quantity: Number(form.quantity),
        unit: form.unit,
        availabilityStart: form.availabilityStart,
        availabilityEnd: form.availabilityEnd,
        usageConstraints: form.usageConstraints,
        latitude: latitude !== null ? latitude : undefined,
        longitude: longitude !== null ? longitude : undefined,
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
        community: user?.address || '',
        areaName: user?.address || '',
        photoData: '',
        photoName: '',
      }));

      setPreviewUrl('');
      await loadAll({ silent: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit resource offer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (offerId) => {
    const current = applyForm[offerId] || {
      requestedQuantity: 1,
      applicantAddress: user?.address || '',
      message: '',
    };

    try {
      setActionLoading(`apply-${offerId}`);
      await api.post(`/resources/${offerId}/apply`, {
        requestedQuantity: Number(current.requestedQuantity),
        applicantAddress: current.applicantAddress,
        message: current.message,
      });

      showToast('Application sent to admin.');
      await loadAll({ silent: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to apply.');
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = async (resourceId, applicationId, fallbackQuantity) => {
    const approvedQuantity = approvalQuantities[applicationId] || fallbackQuantity;

    try {
      setActionLoading(`approve-${applicationId}`);
      await api.patch(`/resources/${resourceId}/applications/${applicationId}/approve`, {
        approvedQuantity: Number(approvedQuantity),
      });

      showToast('Application approved.');
      await loadAll({ silent: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (resourceId, applicationId) => {
    try {
      setActionLoading(`reject-${applicationId}`);
      await api.patch(`/resources/${resourceId}/applications/${applicationId}/reject`);
      showToast('Application rejected.');
      await loadAll({ silent: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (offerId) => {
    if (!window.confirm('Delete this resource?')) return;

    try {
      setActionLoading(`delete-${offerId}`);
      await api.delete(`/resources/${offerId}`);
      showToast('Your resource was deleted.');
      await loadAll({ silent: true });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete.');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <Layout
      title="Resource Board"
      subtitle="Offer spare resources, request available supplies, and help your community coordinate essentials."
      right={
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value="Available" />

          <button
            type="button"
            onClick={() => loadAll({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      }
    >
      <section className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.35fr,0.65fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
              <Sparkles className="h-4 w-4" />
              Community resource exchange
            </div>

            <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Share what you can spare, request what your community needs.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Publish available supplies with location, quantity, photos, and availability windows.
              Community members can apply, while admins review allocation requests.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById('resource-offer-form')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <PackageCheck className="h-4 w-4" />
                Offer a resource
              </button>

              <button
                type="button"
                onClick={captureLocation}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <MapPin className="h-4 w-4" />
                Capture location
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700">
                <Box className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Live resource offers</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Available</p>
                <p className="mt-1 text-3xl font-bold text-emerald-200">
                  {stats.available}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">My offers</p>
                <p className="mt-1 text-3xl font-bold text-amber-200">
                  {stats.mine}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total offers"
          value={stats.total}
          hint="All shared resources"
          icon={Package}
          tone="blue"
        />
        <StatTile
          label="Available"
          value={stats.available}
          hint="Ready to request"
          icon={PackageCheck}
          tone="emerald"
        />
        <StatTile
          label="Reserved"
          value={stats.reserved}
          hint="Allocated or in process"
          icon={Clock}
          tone="amber"
        />
        <StatTile
          label="Unavailable"
          value={stats.unavailable}
          hint="No longer available"
          icon={XCircle}
          tone="rose"
        />
      </section>

      {error ? (
        <div className="mb-6 flex gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-6">
        <Panel title="My resource requests">
          {myApplications.length === 0 ? (
            <EmptyState
              title="No resource requests yet"
              description="When you apply for a shared resource, your application status will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {myApplications.map((item, idx) => (
                <article
                  key={`${item.resourceId}-${idx}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {item.resourceName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Owner: {item.ownerName || 'Unknown'} • Community:{' '}
                        {item.community || 'N/A'}
                      </p>
                    </div>

                    <StatusBadge value={item.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoPill icon={Package}>
                      Requested: {item.requestedQuantity} {item.unit}
                    </InfoPill>
                    <InfoPill icon={MapPin}>
                      {item.applicantAddress || 'No address provided'}
                    </InfoPill>
                  </div>

                  {item.status === 'Approved' ? (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Approved: {item.approvedQuantity} {item.unit} of{' '}
                      <strong>{item.resourceName}</strong> will be handed over as soon as possible.
                    </div>
                  ) : item.status === 'Rejected' ? (
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                      Your request was rejected.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                      Your request is pending admin review.
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {isAdmin ? (
        <div className="mb-6">
          <Panel
            title="Admin application review"
            actions={
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                {pendingApplicationCount} pending
              </span>
            }
          >
            {pendingAdminOffers.length === 0 || pendingApplicationCount === 0 ? (
              <EmptyState
                title="No pending applications"
                description="Resource applications needing admin review will appear here."
              />
            ) : (
              <div className="space-y-4">
                {pendingAdminOffers.map((offer) => {
                  const pendingApps = (offer.applications || []).filter(
                    (app) => app.status === 'Pending'
                  );

                  if (pendingApps.length === 0) return null;

                  return (
                    <div
                      key={offer._id}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {offer.resourceName}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {offer.remainingQuantity} {offer.unit} remaining •{' '}
                            {pendingApps.length} pending application
                            {pendingApps.length === 1 ? '' : 's'}
                          </p>
                        </div>

                        <StatusBadge value={offer.status || 'Available'} />
                      </div>

                      <div className="mt-4 space-y-3">
                        {pendingApps.map((app) => {
                          const maxQty = Math.min(
                            app.requestedQuantity,
                            offer.remainingQuantity
                          );
                          const currentQty =
                            approvalQuantities[app._id] ?? app.requestedQuantity;

                          return (
                            <div
                              key={app._id}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-center">
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {app.applicantName}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-600">
                                    Phone: {app.applicantPhone || 'N/A'}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Address: {app.applicantAddress || 'N/A'}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Requested: {app.requestedQuantity} {offer.unit}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                  <input
                                    type="number"
                                    min="1"
                                    max={maxQty}
                                    value={currentQty}
                                    onChange={(event) =>
                                      handleApprovalQuantityChange(
                                        app._id,
                                        event.target.value
                                      )
                                    }
                                    className="w-28 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleApprove(
                                        offer._id,
                                        app._id,
                                        app.requestedQuantity
                                      )
                                    }
                                    disabled={actionLoading === `approve-${app._id}`}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleReject(offer._id, app._id)}
                                    disabled={actionLoading === `reject-${app._id}`}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-[430px,1fr]">
        <Panel title="Offer a resource">
          <form id="resource-offer-form" className="space-y-4" onSubmit={handleSubmit}>
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

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Unit
                </span>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Available from
                </span>
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
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Available until
                </span>
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

            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormField
                    label="Area name"
                    name="areaName"
                    value={form.areaName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={captureLocation}
                  className="mb-0 flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-white transition hover:bg-blue-700"
                  title="Capture current location"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              </div>

              {geoStatus ? (
                <div
                  className={`mt-3 rounded-2xl border p-3 text-sm font-medium ${
                    geoStatus.toLowerCase().includes('failed') ||
                    geoStatus.toLowerCase().includes('not available') ||
                    geoStatus.toLowerCase().includes('not supported')
                      ? 'border-rose-100 bg-rose-50 text-rose-700'
                      : geoStatus.toLowerCase().includes('captured')
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border-blue-100 bg-blue-50 text-blue-700'
                  }`}
                >
                  {geoStatus}
                </div>
              ) : null}

              {latitude !== null && longitude !== null ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoPill icon={MapPin}>Lat: {Number(latitude).toFixed(5)}</InfoPill>
                  <InfoPill icon={MapPin}>Lng: {Number(longitude).toFixed(5)}</InfoPill>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700">
                  Capture location to enable proximity matching.
                </div>
              )}
            </div>

            <FormField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Usage constraints optional
              </span>
              <textarea
                name="usageConstraints"
                value={form.usageConstraints}
                onChange={handleChange}
                rows="3"
                placeholder="Example: Available for families only, return after 24 hours, bring your own container..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Photo optional
              </span>
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 ring-1 ring-slate-200">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Upload resource photo
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG, or WebP supported.
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
              </div>
            </label>

            {previewUrl ? (
              <div className="rounded-3xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">Preview</p>
                <img
                  src={previewUrl}
                  alt="Offer preview"
                  className="h-48 w-full rounded-3xl object-cover"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <PackageCheck className="h-4 w-4" />
                  Publish resource offer
                </>
              )}
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr,220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search resources, community, owner, area..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="relative block">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  {statusFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Showing {filteredOffers.length} of {offers.length} resource offers.
            </p>
          </section>

          <Panel title="Live resource feed">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredOffers.length === 0 ? (
              <EmptyState
                title="No resources found"
                description="Try changing the search/filter, or publish the first resource offer for your community."
              />
            ) : (
              <div className="space-y-5">
                {filteredOffers.map((offer) => {
                  const ownerId = getOwnerId(offer);
                  const isOwner = ownerId === user?._id;
                  const canApply =
                    !isOwner &&
                    Number(offer.remainingQuantity) > 0 &&
                    offer.status === 'Available';

                  const currentApply = applyForm[offer._id] || {
                    requestedQuantity: 1,
                    applicantAddress: user?.address || '',
                    message: '',
                  };

                  const totalQty = Number(offer.quantity || 0);
                  const remainingQty = Number(offer.remainingQuantity || 0);
                  const remainingPercent =
                    totalQty > 0
                      ? Math.max(6, Math.min(100, (remainingQty / totalQty) * 100))
                      : 0;

                  return (
                    <article
                      key={offer._id}
                      className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                    >
                      <div className="grid gap-0 lg:grid-cols-[260px,1fr]">
                        <ResourceImage offer={offer} />

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                                  <Box className="h-3.5 w-3.5" />
                                  Resource offer
                                </span>

                                {isOwner ? (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                                    Your offer
                                  </span>
                                ) : null}
                              </div>

                              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                                {offer.resourceName || 'Unnamed resource'}
                              </h3>

                              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                {offer.community || 'Unknown community'}
                              </p>
                            </div>

                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <StatusBadge value={offer.status || 'Available'} />

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusPillClass(
                                  offer.status
                                )}`}
                              >
                                {remainingQty > 0
                                  ? `${remainingQty} ${offer.unit} left`
                                  : 'Fully reserved'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                Quantity
                              </p>

                              <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-500">Total</p>
                                  <p className="text-lg font-bold text-slate-900">
                                    {offer.quantity} {offer.unit}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-sm text-slate-500">Remaining</p>
                                  <p
                                    className={`text-lg font-bold ${
                                      remainingQty > 0
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {offer.remainingQuantity} {offer.unit}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    remainingQty > 0
                                      ? 'bg-emerald-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${remainingPercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                Availability
                              </p>

                              <div className="mt-3 space-y-2 text-sm text-slate-700">
                                <p className="flex items-start gap-2">
                                  <Clock className="mt-0.5 h-4 w-4 text-blue-500" />
                                  <span>
                                    <span className="font-semibold text-slate-900">
                                      From:
                                    </span>{' '}
                                    {formatDate(offer.availabilityStart)}
                                  </span>
                                </p>

                                <p className="flex items-start gap-2">
                                  <Clock className="mt-0.5 h-4 w-4 text-indigo-500" />
                                  <span>
                                    <span className="font-semibold text-slate-900">
                                      Until:
                                    </span>{' '}
                                    {formatDate(offer.availabilityEnd)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {offer.usageConstraints ? (
                            <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                              <p className="font-bold text-amber-900">
                                Usage constraints
                              </p>
                              <p className="mt-1 leading-6">
                                {offer.usageConstraints}
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoPill icon={MapPin}>
                              {offer.areaName || 'Area not provided'}
                            </InfoPill>

                            <InfoPill icon={UserRound}>
                              Shared by {offer.userName || 'Unknown'}
                            </InfoPill>
                          </div>

                          {offer.phone ? (
                            <div className="mt-3">
                              <InfoPill icon={Phone}>{offer.phone}</InfoPill>
                            </div>
                          ) : null}

                          {canApply ? (
                            <div className="mt-5 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                              <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white">
                                  <HandHeart className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-blue-950">
                                    Apply for this resource
                                  </p>
                                  <p className="text-xs text-blue-700">
                                    Send a request for admin review.
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={offer.remainingQuantity}
                                  value={currentApply.requestedQuantity}
                                  onChange={(e) =>
                                    handleApplyFieldChange(
                                      offer._id,
                                      'requestedQuantity',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Requested quantity"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />

                                <input
                                  type="text"
                                  value={currentApply.applicantAddress}
                                  onChange={(e) =>
                                    handleApplyFieldChange(
                                      offer._id,
                                      'applicantAddress',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Your address"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                              </div>

                              <textarea
                                value={currentApply.message}
                                onChange={(e) =>
                                  handleApplyFieldChange(
                                    offer._id,
                                    'message',
                                    e.target.value
                                  )
                                }
                                rows="2"
                                placeholder="Optional message for admin"
                                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              />

                              <button
                                type="button"
                                onClick={() => handleApply(offer._id)}
                                disabled={actionLoading === `apply-${offer._id}`}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `apply-${offer._id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <HandHeart className="h-4 w-4" />
                                )}
                                Apply for resource
                              </button>
                            </div>
                          ) : null}

                          {isOwner ? (
                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  You posted this resource
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  You can remove it if it is no longer available.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(offer._id)}
                                disabled={actionLoading === `delete-${offer._id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `delete-${offer._id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Toast message={toast} />
    </Layout>
  );
}