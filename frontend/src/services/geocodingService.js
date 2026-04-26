/**
 * Geocoding service using OpenStreetMap's Nominatim API
 * Converts between coordinates and addresses
 */

// Reverse geocoding: Convert lat/lng to address
export const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'HyperLocalNetwork/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Return a readable address from the response
    const address = 
      data.address?.village ||
      data.address?.town ||
      data.address?.city ||
      data.address?.county ||
      data.address?.district ||
      data.display_name?.split(',')[0] ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    return {
      address,
      displayName: data.display_name,
      lat,
      lng
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Return coordinates as fallback
    return {
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      displayName: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng
    };
  }
};

// Get user's current location with address
export const getCurrentLocationWithAddress = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locationData = await getAddressFromCoordinates(latitude, longitude);
          resolve(locationData);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(new Error('Unable to get current location: ' + error.message));
      }
    );
  });
};
