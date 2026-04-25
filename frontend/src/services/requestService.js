import api from "./api";

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

const normalizeSingleResponse = (data) => {
  return data?.request || data?.data || data;
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const cleanRequestPayload = (requestData = {}) => {
  return {
    title: requestData.title,
    description: requestData.description,
    urgency: requestData.urgency,
    exactLocation: requestData.exactLocation,
    contactNumber: requestData.contactNumber,
    location: requestData.location,
    latitude: requestData.latitude,
    longitude: requestData.longitude,
  };
};

// POST /api/requests
export const createCriticalRequest = async (requestData) => {
  try {
    const response = await api.post("/requests", cleanRequestPayload(requestData));
    return normalizeSingleResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create request."));
  }
};

// GET /api/requests
export const fetchCriticalRequests = async () => {
  try {
    const response = await api.get("/requests");
    return normalizeListResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load requests."));
  }
};

// GET /api/requests/my-requests
export const fetchMyCriticalRequests = async () => {
  try {
    const response = await api.get("/requests/my-requests");
    return normalizeListResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load your requests."));
  }
};

// PATCH /api/requests/:id/approve
export const approveCriticalRequest = async (requestId) => {
  try {
    const response = await api.patch(`/requests/${requestId}/approve`);
    return normalizeSingleResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to approve request."));
  }
};

// PATCH /api/requests/:id/reject
export const rejectCriticalRequest = async (requestId) => {
  try {
    const response = await api.patch(`/requests/${requestId}/reject`);
    return normalizeSingleResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to reject request."));
  }
};

// PATCH /api/requests/:id/claim
export const claimCriticalRequest = async (requestId) => {
  try {
    const response = await api.patch(`/requests/${requestId}/claim`);
    return normalizeSingleResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to claim request."));
  }
};

// PATCH /api/requests/:id/fulfill
export const fulfillCriticalRequest = async (requestId) => {
  try {
    const response = await api.patch(`/requests/${requestId}/fulfill`);
    return normalizeSingleResponse(response.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fulfill request."));
  }
};