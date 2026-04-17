import { useEffect, useState } from 'react';
import { fetchMyRequestMatches } from '../services/matchingService';
import Layout from '../components/Layout';
import Panel from '../components/Panel';

export default function MatchingPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchMyRequestMatches();
        setMatches(data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load proximity matches.');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  return (
    <Layout
      title="Proximity Matching"
      subtitle="See nearby resource offers that fit your approved requests and receive automatic notifications when matches are found."
    >
      <div className="grid gap-6 lg:grid-cols-1">
        <Panel title="Intelligent match results">
          {loading ? (
            <p className="text-sm text-slate-500">Loading proximity matches...</p>
          ) : error ? (
            <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-slate-500">
              No approved requests with proximity matches were found. Create a request and allow location access to enable matching.
            </p>
          ) : (
            <div className="space-y-6">
              {matches.map((item) => (
                <div key={item.requestId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">Urgency: {item.urgency}</p>
                      <p className="mt-1 text-sm text-slate-500">Location: {item.location}</p>
                      {item.latitude && item.longitude ? (
                        <p className="mt-1 text-sm text-slate-500">Coordinates: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</p>
                      ) : (
                        <p className="mt-1 text-sm text-rose-600">Coordinate data is missing for this request. Matching is limited.</p>
                      )}
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      {item.matches.length} match{item.matches.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  {item.matches.length === 0 ? (
                    <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                      No nearby offers were identified within the configured proximity radius.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {item.matches.map((offer) => (
                        <div key={offer.offerId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-sm font-semibold text-slate-900">{offer.resourceName}</h3>
                          <p className="mt-2 text-sm text-slate-600">Owner: {offer.ownerName}</p>
                          <p className="text-sm text-slate-600">Phone: {offer.ownerPhone}</p>
                          <p className="mt-2 text-sm text-slate-600">Available at: {offer.areaName}, {offer.community}</p>
                          <p className="mt-2 text-sm text-slate-600">Distance: {offer.distance} meters</p>
                          <p className="mt-1 text-sm text-slate-600">Quantity available: {offer.remainingQuantity}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Layout>
  );
}
