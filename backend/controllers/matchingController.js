const MicroTask = require('../models/MicroTask');
const User = require('../models/User');
const ResourceOffer = require('../models/ResourceOffer');
const CriticalRequest = require('../models/CriticalRequest');
const Notification = require('../models/Notification');

const DEFAULT_MATCH_RADIUS_METERS = Number(process.env.MATCH_RADIUS_METERS) || 500;

const urgencyPriority = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
};

const isOfferCurrentlyAvailable = (offer) => {
  const now = new Date();
  return (
    offer.status === 'Available' &&
    offer.remainingQuantity > 0 &&
    new Date(offer.availabilityStart) <= now &&
    new Date(offer.availabilityEnd) >= now
  );
};

const buildMatchScore = (request, offer, radiusMeters) => {
  const distance = getDistanceMeters(
    request.latitude,
    request.longitude,
    offer.latitude,
    offer.longitude
  );
  const distanceScore = Math.max(0, 1 - distance / radiusMeters);
  const urgencyScore = (urgencyPriority[request.urgency] || 0) / 4;
  const availabilityScore = isOfferCurrentlyAvailable(offer) ? 1 : 0;

  const score = distanceScore * 0.5 + availabilityScore * 0.3 + urgencyScore * 0.2;

  return {
    distance,
    score,
    distanceScore,
    urgencyScore,
    availabilityScore,
  };
};

const findMatchesForRequest = async (request, radiusMeters = DEFAULT_MATCH_RADIUS_METERS) => {
  if (!request.latitude || !request.longitude) {
    return [];
  }

  const now = new Date();
  const offers = await ResourceOffer.find({
    status: 'Available',
    remainingQuantity: { $gt: 0 },
    availabilityStart: { $lte: now },
    availabilityEnd: { $gte: now },
  }).populate('postedBy', 'name phone email');

  const scored = offers
    .map((offer) => {
      const { distance, score } = buildMatchScore(request, offer, radiusMeters);
      return distance <= radiusMeters
        ? {
            offerId: offer._id,
            resourceName: offer.resourceName,
            ownerId: offer.postedBy?._id,
            ownerName: offer.ownerName,
            ownerPhone: offer.phone,
            ownerEmail: offer.postedBy?.email,
            community: offer.community,
            areaName: offer.areaName,
            remainingQuantity: offer.remainingQuantity,
            availabilityStart: offer.availabilityStart,
            availabilityEnd: offer.availabilityEnd,
            distance: Number(distance.toFixed(0)),
            score,
            latitude: offer.latitude,
            longitude: offer.longitude,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
};

const findMatchesForOffer = async (offer, radiusMeters = DEFAULT_MATCH_RADIUS_METERS) => {
  if (!offer.latitude || !offer.longitude || !isOfferCurrentlyAvailable(offer)) {
    return [];
  }

  const requests = await CriticalRequest.find({
    status: 'approved',
    helper: null,
    latitude: { $ne: null },
    longitude: { $ne: null },
  }).populate('postedBy', 'name phone email location');

  const scored = requests
    .map((request) => {
      const { distance, score } = buildMatchScore(request, offer, radiusMeters);
      return distance <= radiusMeters
        ? {
            requestId: request._id,
            requesterId: request.postedBy?._id,
            title: request.title,
            urgency: request.urgency,
            requesterName: request.postedBy?.name,
            requesterPhone: request.postedBy?.phone,
            requesterEmail: request.postedBy?.email,
            location: request.location,
            exactLocation: request.exactLocation,
            distance: Number(distance.toFixed(0)),
            score,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
};

const alreadyNotified = async (userId, type, meta) => {
  if (!userId) return false;
  const query = { user: userId, type };

  if (meta.requestId) query['meta.requestId'] = meta.requestId;
  if (meta.resourceId) query['meta.resourceId'] = meta.resourceId;

  return Notification.exists(query);
};

const createMatchNotification = async ({ userId, type, title, message, meta }) => {
  if (!userId) return null;
  if (await alreadyNotified(userId, type, meta)) {
    return null;
  }

  return Notification.create({
    user: userId,
    type,
    title,
    message,
    isRead: false,
    meta,
  });
};

const notifyProximityMatchesForRequest = async (request, io) => {
  if (!request.latitude || !request.longitude) {
    return [];
  }

  const matches = await findMatchesForRequest(request);
  const created = [];

  for (const match of matches) {
    const requesterNotification = await createMatchNotification({
      userId: request.postedBy,
      type: 'PROXIMITY_MATCH_FOUND_FOR_REQUESTER',
      title: 'Nearby resource match found',
      message: `A nearby resource offer for ${match.resourceName} was found within ${match.distance} meters of your request.`,
      meta: {
        requestId: request._id,
        resourceId: match.offerId,
      },
    });
    if (requesterNotification) created.push(requesterNotification);

    const ownerNotification = await createMatchNotification({
      userId: match.ownerId || null,
      type: 'PROXIMITY_MATCH_FOUND_FOR_OWNER',
      title: 'Potential urgent request match',
      message: `A nearby urgent request (${request.title}) was identified within ${match.distance} meters of your resource offer.`,
      meta: {
        requestId: request._id,
        resourceId: match.offerId,
      },
    });
    if (ownerNotification) created.push(ownerNotification);
  }

  if (io && created.length > 0) {
    io.emit('proximityMatchesUpdated', { requestId: request._id, matches });
  }

  return matches;
};

const notifyProximityMatchesForOffer = async (offer, io) => {
  if (!offer.latitude || !offer.longitude) {
    return [];
  }

  const matches = await findMatchesForOffer(offer);
  const created = [];

  for (const match of matches) {
    const ownerNotification = await createMatchNotification({
      userId: offer.postedBy,
      type: 'PROXIMITY_MATCH_FOUND_FOR_OWNER',
      title: 'Nearby urgent request found',
      message: `An approved urgent help request (${match.title}) is within ${match.distance} meters of your offered resource.`,
      meta: {
        requestId: match.requestId,
        resourceId: offer._id,
      },
    });
    if (ownerNotification) created.push(ownerNotification);

    const requesterNotification = await createMatchNotification({
      userId: match.requesterId || null,
      type: 'PROXIMITY_MATCH_FOUND_FOR_REQUESTER',
      title: 'Resource offer found nearby',
      message: `A nearby available resource offer (${offer.resourceName}) was found within ${match.distance} meters of your request.`,
      meta: {
        requestId: match.requestId,
        resourceId: offer._id,
      },
    });
    if (requesterNotification) created.push(requesterNotification);
  }

  if (io && created.length > 0) {
    io.emit('proximityMatchesUpdatedForOffer', { resourceId: offer._id, matches });
  }

  return matches;
};

// Helper for OSRM distance calculation
const getRealDistanceMeters = async (lat1, lng1, lat2, lng2) => {
  try {
    const response = await fetch(`http://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].distance; // Distance in meters
    }
  } catch (err) {
    console.error('OSRM API error:', err.message);
  }
  return getDistanceMeters(lat1, lng1, lat2, lng2); // fallback
};

// Helper to normalize skills for fuzzy matching (stemming)
const normalizeSkill = (s) => {
  if (!s) return "";
  return s.toLowerCase()
    .trim()
    .replace(/ing$/, '')
    .replace(/er$/, '')
    .replace(/s$/, '')
    .replace(/es$/, '');
};

// @desc    Get top matching volunteers for a specific micro-task
// @route   GET /api/matching/microtask/:taskId
// @access  Private
exports.matchVolunteersForTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.taskId).populate('postedBy', 'location');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const maxDistanceMeters = 20000; // Increased to 20km to accommodate user test coordinates
    const queryRadiusMeters = 25000; // 25km buffer for query
    const earthRadius = 6371000; // in meters
    const latDelta = (queryRadiusMeters / earthRadius) * (180 / Math.PI);
    const lngDelta = (queryRadiusMeters / earthRadius) * (180 / Math.PI) / Math.cos(task.location.lat * Math.PI / 180);
    
    const potentialHelpers = await User.find({
      _id: { $ne: task.postedBy._id },
      "location.lat": { $gte: task.location.lat - latDelta, $lte: task.location.lat + latDelta },
      "location.lng": { $gte: task.location.lng - lngDelta, $lte: task.location.lng + lngDelta },
    });

    // Combine AI suggested skills and user selected skills for matching
    const taskSkills = Array.from(new Set([
      ...(task.suggestedSkills || []),
      ...(task.selectedSkills || [])
    ]));

    // Calculate skill density (how many people on the platform have each skill)
    const skillDensity = {};
    if (taskSkills.length > 0) {
      await Promise.all(taskSkills.map(async (skill) => {
        const normalizedTarget = normalizeSkill(skill);
        const count = await User.countDocuments({ 
          $or: [
            { "skills.name": { $regex: new RegExp(`^${normalizedTarget}`, "i") } },
            { "skills.category": { $regex: new RegExp(`^${normalizedTarget}`, "i") } }
          ]
        });
        skillDensity[skill] = count;
      }));
    }

    const scoredPromises = potentialHelpers.map(async (helper) => {
      // Check if helper is available and has location
      if (helper.availabilityStatus === false || !helper.location?.lat) return null;

      const distance = await getRealDistanceMeters(
        task.location.lat,
        task.location.lng,
        helper.location.lat,
        helper.location.lng
      );
      
      if (distance > maxDistanceMeters) return null;

      const distanceScore = Math.max(0, 1 - distance / maxDistanceMeters);

      let skillOverlap = 0;
      let skillReputationBonus = 0;
      
      if (taskSkills.length > 0) {
        // Only consider skills that are marked as 'available: true'
        const helperNormalizedSkills = new Set();
        helper.skills.forEach(s => {
          if (s.available !== false) {
            if (s.name) helperNormalizedSkills.add(normalizeSkill(s.name));
            if (s.category) helperNormalizedSkills.add(normalizeSkill(s.category));
          }
        });
          
        const matchedSkills = taskSkills.filter((skill) =>
          helperNormalizedSkills.has(normalizeSkill(skill))
        );
        
        // Strict filtering: if it doesn't match the skill, don't show
        if (matchedSkills.length === 0) return null;

        skillOverlap = matchedSkills.length / taskSkills.length;
        
        // Add bonus for skill-specific endorsements
        if (helper.reputation?.skillEndorsements) {
          const skillBonuses = matchedSkills.map((skill) => {
            const skillEndorsement = helper.reputation.skillEndorsements.get(skill);
            if (skillEndorsement) {
              // Average rating contributes to score (0-5 scale normalized to 0-1)
              return (skillEndorsement.averageRating / 5) * 0.3; // 30% bonus max per skill
            }
            return 0;
          });
          skillReputationBonus = Math.min(0.3, skillBonuses.reduce((a, b) => a + b, 0) / matchedSkills.length);
        }
      }

      // Enhanced reputation scoring with new reputation object
      let reputationScore = 0;
      if (helper.reputation?.trustScore) {
        reputationScore = Math.min(1, helper.reputation.trustScore / 100); // Trust score normalized
      } else if (helper.reputationScore) {
        reputationScore = Math.min(1, helper.reputationScore / 100); // Legacy support
      }

      // Final score: distance (30%) + skill overlap (50%) + reputation (20%)
      // + skill-specific reputation bonus
      const totalScore = Math.round(
        (distanceScore * 0.30) * 100 + 
        (skillOverlap * 0.50) * 100 + 
        (reputationScore * 0.20) * 100 +
        (skillReputationBonus * 100)
      );

      return {
        userId: helper._id,
        name: helper.name,
        location: helper.location,
        skills: helper.skills,
        reputation: {
          reputationScore: helper.reputationScore,
          trustScore: helper.reputation?.trustScore || 0,
          totalVouches: helper.reputation?.totalVouches || 0,
          averageRating: helper.reputation?.averageRating || 0,
          skillEndorsements: helper.reputation?.skillEndorsements || new Map(),
        },
        distance: Number(distance.toFixed(0)),
        score: Math.min(100, totalScore), // Cap at 100
      };
    });

    let scored = (await Promise.all(scoredPromises)).filter(Boolean);
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);

    const io = req.app.get("io");
    if (io && top5.length > 0) {
      io.emit("newTaskNearby", {
        task: {
          _id: task._id,
          title: task.title,
          description: task.description,
          location: task.location,
          urgency: task.urgency
        },
        targetUserIds: top5.map(h => h.userId)
      });
    }

    res.json({ taskId: task._id, matches: top5, skillDensity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get top matching offers for a specific request
// @route   GET /api/matching/request/:requestId/offers
// @access  Private
exports.matchOffersForRequest = async (req, res) => {
  try {
    const request = await CriticalRequest.findById(req.params.requestId).populate('postedBy', 'name email location');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!req.user.isAdmin && request.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view matches for this request.' });
    }

    const matches = await findMatchesForRequest(request);
    res.json({ requestId: request._id, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get matches for the current user's open requests
// @route   GET /api/matching/my-requests
// @access  Private
exports.matchOffersForMyRequests = async (req, res) => {
  try {
    const requests = await CriticalRequest.find({
      postedBy: req.user._id,
      status: 'approved',
      helper: null,
    }).populate('postedBy', 'name email location');

    const result = await Promise.all(
      requests.map(async (request) => ({
        requestId: request._id,
        title: request.title,
        urgency: request.urgency,
        status: request.status,
        location: request.location,
        exactLocation: request.exactLocation,
        latitude: request.latitude,
        longitude: request.longitude,
        matches: await findMatchesForRequest(request),
      }))
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.notifyProximityMatchesForRequest = notifyProximityMatchesForRequest;
exports.notifyProximityMatchesForOffer = notifyProximityMatchesForOffer;
