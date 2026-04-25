import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  HandHeart,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  fetchCriticalRequests,
  approveCriticalRequest,
  rejectCriticalRequest,
  claimCriticalRequest,
  fulfillCriticalRequest,
} from '../services/requestService';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  approved: 'bg-blue-50 text-blue-700 ring-blue-100',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
};

const urgencyStyles = {
  Low: 'bg-slate-100 text-slate-800 ring-slate-200',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-100',
  High: 'bg-orange-50 text-orange-700 ring-orange-100',
  Critical: 'bg-rose-50 text-rose-700 ring-rose-100',
};

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'no_helper', label: 'Not helped yet' },
];

function formatStatus(status) {
  if (!status) return 'Unknown';
  return status.replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString();
}

function getUserId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return null;
}

function getErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
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

      {hint && <p className="mt-3 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function InfoItem({ label, children, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full space-y-3">
              <div className="h-5 w-2/5 rounded-full bg-slate-200" />
              <div className="h-4 w-4/5 rounded-full bg-slate-100" />
              <div className="h-4 w-3/5 rounded-full bg-slate-100" />
            </div>
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-20 rounded-2xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <HandHeart className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

const RequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const userId = getUserId(user);
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'admin');

  const loadRequests = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await fetchCriticalRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load requests.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    setError('');

    try {
      await approveCriticalRequest(requestId);
      setActionMessage('Request approved. It is now visible to helpers.');
      await loadRequests({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to approve request.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    setError('');

    try {
      await rejectCriticalRequest(requestId);
      setActionMessage('Request rejected.');
      await loadRequests({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reject request.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleClaim = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    setError('');

    try {
      await claimCriticalRequest(requestId);
      setActionMessage('Thank you! You are now helping this request.');
      await loadRequests({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to claim request.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleFulfill = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    setError('');

    try {
      await fulfillCriticalRequest(requestId);
      setActionMessage('Request marked fulfilled. Thank you for closing the loop.');
      await loadRequests({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to fulfill request.'));
    } finally {
      setProcessingId(null);
    }
  };

  const {
    pendingRequests,
    activeRequests,
    approvedRequests,
    inProgressRequests,
    fulfilledRequests,
    noHelperRequests,
  } = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending');
    const active = requests.filter(
      (request) => request.status !== 'pending' && request.status !== 'rejected'
    );
    const approved = active.filter((request) => request.status === 'approved');
    const inProgress = active.filter((request) => request.status === 'in_progress');
    const fulfilled = active.filter((request) => request.status === 'fulfilled');
    const noHelper = approved.filter((request) => !request.helper);

    return {
      pendingRequests: pending,
      activeRequests: active,
      approvedRequests: approved,
      inProgressRequests: inProgress,
      fulfilledRequests: fulfilled,
      noHelperRequests: noHelper,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return activeRequests.filter((request) => {
      const matchesFilter =
        currentFilter === 'all' ||
        (currentFilter === 'approved' && request.status === 'approved') ||
        (currentFilter === 'in_progress' && request.status === 'in_progress') ||
        (currentFilter === 'fulfilled' && request.status === 'fulfilled') ||
        (currentFilter === 'no_helper' &&
          request.status === 'approved' &&
          !request.helper);

      const searchableText = [
        request.title,
        request.description,
        request.urgency,
        request.status,
        request.location,
        request.exactLocation,
        request.contactNumber,
        request.postedBy?.name,
        request.helper?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      return matchesFilter && matchesSearch;
    });
  }, [activeRequests, currentFilter, searchQuery]);

  const filterCounts = {
    all: activeRequests.length,
    approved: approvedRequests.length,
    in_progress: inProgressRequests.length,
    fulfilled: fulfilledRequests.length,
    no_helper: noHelperRequests.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.35fr,0.65fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
                <Sparkles className="h-4 w-4" />
                Community help center
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                Find urgent community requests and help where it matters most.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
                View approved help requests, claim requests you can support, and close the loop
                once assistance is complete.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/requests/new')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" />
                  Create new request
                </button>

                <button
                  type="button"
                  onClick={() => loadRequests({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700">
                  <HandHeart className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Visible requests</p>
                  <p className="text-3xl font-bold">{activeRequests.length}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-blue-100">Need helper</p>
                  <p className="mt-1 text-3xl font-bold text-amber-200">
                    {noHelperRequests.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-blue-100">In progress</p>
                  <p className="mt-1 text-3xl font-bold text-indigo-200">
                    {inProgressRequests.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Approved"
            value={approvedRequests.length}
            hint="Ready for helpers"
            icon={ShieldCheck}
            tone="blue"
          />
          <StatCard
            label="Not helped yet"
            value={noHelperRequests.length}
            hint="Approved with no helper"
            icon={AlertCircle}
            tone="amber"
          />
          <StatCard
            label="In progress"
            value={inProgressRequests.length}
            hint="Someone is helping"
            icon={UsersRound}
            tone="indigo"
          />
          <StatCard
            label="Fulfilled"
            value={fulfilledRequests.length}
            hint="Completed requests"
            icon={CheckCircle2}
            tone="emerald"
          />
        </section>

        {actionMessage && (
          <div className="flex gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{actionMessage}</p>
          </div>
        )}

        {error && (
          <div className="flex gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, location, requester, helper, phone, or urgency..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              Showing {filteredRequests.length} of {activeRequests.length}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setCurrentFilter(filter.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  currentFilter === filter.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {filter.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    currentFilter === filter.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {filterCounts[filter.id]}
                </span>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {isAdmin && pendingRequests.length > 0 && (
              <section className="rounded-[2rem] border border-amber-100 bg-amber-50/60 p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Pending approval
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Admins can approve or reject requests before helpers see them.
                    </p>
                  </div>

                  <Badge className="bg-amber-100 text-amber-700 ring-amber-200">
                    {pendingRequests.length} pending
                  </Badge>
                </div>

                <div className="mt-5 grid gap-4">
                  {pendingRequests.map((request) => (
                    <article
                      key={request._id}
                      className="rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-3xl">
                          <h3 className="text-xl font-bold text-slate-900">
                            {request.title || 'Untitled request'}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {request.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Badge
                            className={
                              urgencyStyles[request.urgency] ||
                              urgencyStyles.Medium
                            }
                          >
                            {request.urgency || 'Medium'}
                          </Badge>
                          <Badge
                            className={
                              statusStyles[request.status] ||
                              'bg-slate-100 text-slate-700 ring-slate-200'
                            }
                          >
                            {formatStatus(request.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <InfoItem label="Requested by" icon={UserRound}>
                          {request.postedBy?.name || 'Unknown'}
                        </InfoItem>
                        <InfoItem label="Created" icon={Clock}>
                          {formatDate(request.createdAt)}
                        </InfoItem>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(request._id)}
                          disabled={processingId === request._id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {processingId === request._id ? 'Processing...' : 'Approve'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(request._id)}
                          disabled={processingId === request._id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Available community requests
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Approved, in-progress, and fulfilled help requests from the community.
                  </p>
                </div>

                <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                  {activeRequests.length} visible
                </Badge>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No requests found"
                    description="No requests match your current search or filter. Try clearing the search, changing the filter, or creating a new help request."
                    actionLabel="Create request"
                    onAction={() => navigate('/requests/new')}
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {filteredRequests.map((request) => {
                    const requesterId = getUserId(request.postedBy);
                    const isRequester = requesterId && userId && requesterId === userId;
                    const canHelp =
                      request.status === 'approved' && !isRequester && !request.helper;
                    const canFulfill =
                      request.status === 'in_progress' && isRequester;

                    return (
                      <article
                        key={request._id}
                        className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                className={
                                  urgencyStyles[request.urgency] ||
                                  urgencyStyles.Medium
                                }
                              >
                                {request.urgency || 'Medium'}
                              </Badge>
                              <Badge
                                className={
                                  statusStyles[request.status] ||
                                  'bg-slate-100 text-slate-700 ring-slate-200'
                                }
                              >
                                {formatStatus(request.status)}
                              </Badge>
                              {request.status === 'approved' && !request.helper ? (
                                <Badge className="bg-rose-50 text-rose-700 ring-rose-100">
                                  Not helped yet
                                </Badge>
                              ) : null}
                            </div>

                            <h3 className="mt-4 text-xl font-bold text-slate-900">
                              {request.title || 'Untitled request'}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {request.description || 'No description provided.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {isRequester ? (
                              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                                <UserRound className="h-4 w-4" />
                                Your request
                              </span>
                            ) : null}

                            {canHelp ? (
                              <button
                                type="button"
                                onClick={() => handleClaim(request._id)}
                                disabled={processingId === request._id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <HandHeart className="h-4 w-4" />
                                {processingId === request._id
                                  ? 'Processing...'
                                  : 'Help this request'}
                              </button>
                            ) : null}

                            {canFulfill ? (
                              <button
                                type="button"
                                onClick={() => handleFulfill(request._id)}
                                disabled={processingId === request._id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {processingId === request._id
                                  ? 'Processing...'
                                  : 'Mark fulfilled'}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <InfoItem label="Requester" icon={UserRound}>
                            {request.postedBy?.name || 'Unknown'}
                          </InfoItem>

                          <InfoItem label="Helper" icon={UsersRound}>
                            {request.helper?.name ||
                              (request.status === 'approved'
                                ? 'Not assigned yet'
                                : 'TBD')}
                          </InfoItem>

                          <InfoItem label="Created" icon={Clock}>
                            {formatDate(request.createdAt)}
                          </InfoItem>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <InfoItem label="Location" icon={MapPin}>
                            {request.location || 'Not provided'}
                          </InfoItem>

                          <InfoItem label="Exact location" icon={MapPin}>
                            {request.exactLocation || 'Not provided'}
                          </InfoItem>
                        </div>

                        <div className="mt-3">
                          <InfoItem label="Contact" icon={Phone}>
                            {request.contactNumber || 'Not provided'}
                          </InfoItem>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default RequestsPage;