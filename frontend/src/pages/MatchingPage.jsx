import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock,
  Compass,
  HandHeart,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';

import { fetchMyRequestMatches } from '../services/matchingService';
import Layout from '../components/Layout';
import Panel from '../components/Panel';

function normalizeMatches(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.matches)) return data.matches;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDistance(value) {
  const distance = Number(value);

  if (!Number.isFinite(distance)) return 'Unknown distance';

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`;
  }

  return `${Math.round(distance)} m`;
}

function StatTile({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
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

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="h-5 w-56 rounded-full bg-slate-200" />
              <div className="h-4 w-80 max-w-full rounded-full bg-slate-100" />
              <div className="h-4 w-64 max-w-full rounded-full bg-slate-100" />
            </div>
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="h-32 rounded-3xl bg-slate-100" />
            <div className="h-32 rounded-3xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
        <Compass className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function MatchingPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadMatches = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await fetchMyRequestMatches();
      setMatches(normalizeMatches(data));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load proximity matches.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const stats = useMemo(() => {
    const totalRequests = matches.length;
    const totalOffers = matches.reduce(
      (sum, item) => sum + (Array.isArray(item.matches) ? item.matches.length : 0),
      0
    );
    const matchedRequests = matches.filter(
      (item) => Array.isArray(item.matches) && item.matches.length > 0
    ).length;
    const missingCoordinates = matches.filter(
      (item) => !Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))
    ).length;

    return {
      totalRequests,
      totalOffers,
      matchedRequests,
      missingCoordinates,
    };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return matches;

    return matches.filter((item) => {
      const requestText = [
        item.title,
        item.urgency,
        item.location,
        item.community,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const offerText = (item.matches || [])
        .map((offer) =>
          [
            offer.resourceName,
            offer.ownerName,
            offer.ownerPhone,
            offer.areaName,
            offer.community,
          ]
            .filter(Boolean)
            .join(' ')
        )
        .join(' ')
        .toLowerCase();

      return requestText.includes(search) || offerText.includes(search);
    });
  }, [matches, query]);

  return (
    <Layout
      title="Proximity Matching"
      subtitle="See nearby resource offers that fit your approved requests and receive automatic notifications when matches are found."
      right={
        <button
          type="button"
          onClick={() => loadMatches({ silent: true })}
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
      }
    >
      <section className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.35fr,0.65fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
              <Sparkles className="h-4 w-4" />
              Smart resource matching
            </div>

            <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Find the closest available help for your approved requests.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              The system compares your request location with nearby resource offers and shows
              the most relevant matches for quick community support.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/15">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Total matches</p>
                <p className="text-3xl font-bold">{stats.totalOffers}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Matched requests</p>
                <p className="mt-1 text-3xl font-bold text-emerald-200">
                  {stats.matchedRequests}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-blue-100">Tracked requests</p>
                <p className="mt-1 text-3xl font-bold text-amber-200">
                  {stats.totalRequests}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Requests checked"
          value={stats.totalRequests}
          hint="Approved requests scanned"
          icon={Boxes}
          tone="blue"
        />
        <StatTile
          label="Matched requests"
          value={stats.matchedRequests}
          hint="Requests with nearby offers"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatTile
          label="Nearby offers"
          value={stats.totalOffers}
          hint="Total resource matches"
          icon={HandHeart}
          tone="violet"
        />
        <StatTile
          label="Missing coordinates"
          value={stats.missingCoordinates}
          hint="Requests needing location data"
          icon={AlertCircle}
          tone="amber"
        />
      </section>

      {error ? (
        <div className="mb-6 flex gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search request title, resource name, owner, area, or community..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <p className="mt-3 text-sm text-slate-500">
          Showing {filteredMatches.length} of {matches.length} request match groups.
        </p>
      </section>

      <Panel title="Intelligent match results">
        {loading ? (
          <LoadingSkeleton />
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            title="No matches found"
            description="No approved requests with proximity matches were found. Create a request and allow location access to enable matching."
          />
        ) : (
          <div className="space-y-6">
            {filteredMatches.map((item) => {
              const requestMatches = Array.isArray(item.matches) ? item.matches : [];
              const hasCoordinates =
                Number.isFinite(Number(item.latitude)) &&
                Number.isFinite(Number(item.longitude));

              return (
                <article
                  key={item.requestId || item._id || item.title}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                          Request
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                          {item.urgency || 'Unknown urgency'}
                        </span>
                        {hasCoordinates ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                            Location ready
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                            Missing coordinates
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-2xl font-bold text-slate-900">
                        {item.title || 'Untitled request'}
                      </h2>

                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        {item.location || item.community || 'Location not provided'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-slate-900">
                        {requestMatches.length}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Match{requestMatches.length === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <InfoPill
                      icon={Zap}
                      label="Urgency"
                      value={item.urgency || 'N/A'}
                    />
                    <InfoPill
                      icon={MapPin}
                      label="Location"
                      value={item.location || 'N/A'}
                    />
                    <InfoPill
                      icon={Compass}
                      label="Coordinates"
                      value={
                        hasCoordinates
                          ? `${Number(item.latitude).toFixed(4)}, ${Number(
                              item.longitude
                            ).toFixed(4)}`
                          : 'Missing'
                      }
                    />
                  </div>

                  {requestMatches.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                      No nearby offers were identified within the configured proximity radius.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {requestMatches.map((offer) => (
                        <div
                          key={offer.offerId || `${offer.resourceName}-${offer.ownerName}`}
                          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {offer.resourceName || 'Unnamed resource'}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {offer.areaName || 'Area N/A'}, {offer.community || 'Community N/A'}
                              </p>
                            </div>

                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                              {formatDistance(offer.distance)}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3">
                            <InfoPill
                              icon={UserRound}
                              label="Owner"
                              value={offer.ownerName || 'Unknown'}
                            />
                            <InfoPill
                              icon={Clock}
                              label="Phone"
                              value={offer.ownerPhone || 'N/A'}
                            />
                            <InfoPill
                              icon={Boxes}
                              label="Quantity available"
                              value={offer.remainingQuantity ?? 'N/A'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </Layout>
  );
}