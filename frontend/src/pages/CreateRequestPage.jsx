import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCriticalRequest } from '../services/requestService';
import { MapPin } from 'lucide-react';

const urgencyOptions = ['Low', 'Medium', 'High', 'Critical'];

const CreateRequestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('High');
  const [exactLocation, setExactLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const captureLocation = () => {
    if ('geolocation' in navigator) {
      setGeoStatus('Capturing location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setGeoStatus('✓ Location captured successfully for proximity matching.');
        },
        (error) => {
          console.error(error);
          setGeoStatus('✗ Failed to capture location. Please enable location permissions.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoStatus('Geolocation not supported in your browser.');
    }
  };

  useEffect(() => {
    if (user?.phone) {
      setContactNumber(user.phone);
    }
    if (user?.location) {
      setLocation(user.location);
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setGeoStatus('Location captured for proximity matching.');
        },
        () => {
          setGeoStatus('Auto location capture failed. Click the location icon to capture manually.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoStatus('Geolocation not available. Click the location icon if your browser supports it.');
    }
  }, [user]);



  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim() || !location.trim() || !exactLocation.trim() || !contactNumber.trim()) {
      setError('Please fill all fields, including location, exact location and contact number.');
      return;
    }

    setLoading(true);

    try {
      await createCriticalRequest({
        title,
        description,
        urgency,
        exactLocation,
        contactNumber,
        location,
        latitude,
        longitude,
      });
      setSuccess('Your request was submitted and is pending admin approval.');
      setTitle('');
      setDescription('');
      setExactLocation('');
      setUrgency('High');
      setLocation('');
      setContactNumber(user?.phone || '');
      setTimeout(() => navigate('/requests'), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to submit your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">Request Critical Help</h1>
          <p className="mt-2 text-sm text-slate-600">
            Provide a precise location and contact number so helpers can respond quickly and safely.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Request Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Need evacuation assistance for elderly parents"
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Need evacuation assistance for elderly parents living on the second floor. They cannot walk down stairs safely without help."
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Contact Phone Number</label>
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Enter the best number helpers can use"
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Exact Location</label>
            <input
              type="text"
              value={exactLocation}
              onChange={(e) => setExactLocation(e.target.value)}
              placeholder="123 Main St, Apt 4, Springfield"
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700">Location Name</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Dhaka Meherpur"
                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Urgency Level</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {urgencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {(!geoStatus.includes('✓')) && (
            <div className="rounded-3xl border-2 border-orange-300 bg-orange-50 p-4 text-sm font-medium text-orange-800">
              ⚠️ <strong>Important:</strong> Click the location icon to capture your coordinates for proximity matching with resources and helpers.
            </div>
          )}
          {geoStatus && (
            <div className={`rounded-3xl p-4 text-sm ${
              geoStatus.includes('✓') 
                ? 'bg-emerald-50 text-emerald-700' 
                : geoStatus.includes('✗') 
                ? 'bg-rose-50 text-rose-700' 
                : 'bg-blue-50 text-blue-700'
            }`}>
              {geoStatus}
            </div>
          )}

          {error && <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Submitting request...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage;
