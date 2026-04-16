import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchCriticalRequests,
  approveCriticalRequest,
  rejectCriticalRequest,
  claimCriticalRequest,
  fulfillCriticalRequest,
} from '../services/requestService';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  fulfilled: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const urgencyStyles = {
  Low: 'bg-slate-100 text-slate-800',
  Medium: 'bg-sky-100 text-sky-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-rose-100 text-rose-800',
};

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'no_helper', label: 'Already helped' },
];

const RequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCriticalRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    try {
      await approveCriticalRequest(requestId);
      setActionMessage('Request approved. It is now visible to helpers.');
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to approve request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    try {
      await rejectCriticalRequest(requestId);
      setActionMessage('Request rejected.');
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleClaim = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    try {
      await claimCriticalRequest(requestId);
      setActionMessage('Thank you! You are now helping this request.');
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to claim request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFulfill = async (requestId) => {
    setProcessingId(requestId);
    setActionMessage('');
    try {
      await fulfillCriticalRequest(requestId);
      setActionMessage('Request marked fulfilled. Thank you for closing the loop.');
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fulfill request.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const activeRequests = requests.filter(
    (request) => request.status !== 'pending' && request.status !== 'rejected',
  );

  const approvedRequests = activeRequests.filter((request) => request.status === 'approved');
  const inProgressRequests = activeRequests.filter((request) => request.status === 'in_progress');
  const fulfilledRequests = activeRequests.filter((request) => request.status === 'fulfilled');
  const noHelperRequests = approvedRequests.filter((request) => !request.helper);

  const filteredRequests = activeRequests.filter((request) => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'approved') return request.status === 'approved';
    if (currentFilter === 'in_progress') return request.status === 'in_progress';
    if (currentFilter === 'fulfilled') return request.status === 'fulfilled';
    if (currentFilter === 'no_helper') return request.status === 'approved' && !request.helper;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Community Request Feed</h1>
              <p className="mt-2 text-sm text-slate-600">
                View approved urgent help requests from the community, claim a help request, or mark a request fulfilled once assistance is complete.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/requests/new')}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create new request
            </button>
          </div>

          {actionMessage && (
            <div className="mt-6 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">
              {actionMessage}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          )}

          <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCurrentFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    currentFilter === filter.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-slate-500">
              Showing {filteredRequests.length} of {activeRequests.length} active requests.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200 text-slate-600">
            Loading requests...
          </div>
        ) : (
          <div className="space-y-6">
            {user?.isAdmin && pendingRequests.length > 0 && (
              <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Pending approval</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Admins can approve or reject requests before they are visible to helpers.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {pendingRequests.map((request) => (
                    <article
                      key={request._id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{request.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{request.description}</p>
                        </div>
                        <div className="space-y-2 text-right">
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${urgencyStyles[request.urgency]}`}>
                            {request.urgency}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusStyles[request.status]}`}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Requested by</p>
                          <p className="mt-1 text-sm text-slate-800">{request.postedBy?.name || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                          <p className="mt-1 text-sm text-slate-800">{new Date(request.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleApprove(request._id)}
                          disabled={processingId === request._id}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(request._id)}
                          disabled={processingId === request._id}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Available community requests</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    These requests are approved, in-progress, or fulfilled. You can offer help on approved requests if you are not the requester.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {activeRequests.length} visible requests
                </span>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-slate-700">
                  No requests match this filter. Try a different status or create a new request.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {filteredRequests.map((request) => {
                    const isRequester = request.postedBy?._id === user?._id;
                    const canHelp =
                      request.status === 'approved' && !isRequester && !request.helper;
                    const canFulfill =
                      request.status === 'in_progress' && isRequester;

                    return (
                      <article
                        key={request._id}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{request.title}</h3>
                            <p className="mt-2 text-sm text-slate-600">{request.description}</p>
                          </div>
                          <div className="space-y-2 text-right">
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${urgencyStyles[request.urgency]}`}>
                              {request.urgency}
                            </span>
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusStyles[request.status]}`}>
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Requester</p>
                            <p className="mt-1 text-sm text-slate-800">{request.postedBy?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Helper</p>
                            <p className="mt-1 text-sm text-slate-800">
                              {request.helper?.name || (request.status === 'approved' ? 'Not assigned yet' : 'TBD')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                            <p className="mt-1 text-sm text-slate-800">{new Date(request.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Location</p>
                            <p className="mt-1 text-sm text-slate-800">{request.location}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Exact location</p>
                            <p className="mt-1 text-sm text-slate-800">{request.exactLocation}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                          <p className="mt-1 text-sm text-slate-800">{request.contactNumber}</p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          {isRequester && (
                            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                              Your request
                            </span>
                          )}
                          {canHelp && (
                            <button
                              onClick={() => handleClaim(request._id)}
                              disabled={processingId === request._id}
                              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingId === request._id ? 'Processing...' : 'Help this request'}
                            </button>
                          )}
                          {canFulfill && (
                            <button
                              onClick={() => handleFulfill(request._id)}
                              disabled={processingId === request._id}
                              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingId === request._id ? 'Processing...' : 'Mark fulfilled'}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
