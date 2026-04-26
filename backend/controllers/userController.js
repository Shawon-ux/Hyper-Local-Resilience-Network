const User = require('../models/User');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, phone, address, location } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (location) {
      if (location.lat !== undefined) user.location.lat = location.lat;
      if (location.lng !== undefined) user.location.lng = location.lng;
      // Also update address if it's part of location object in some contexts
      if (location.address) user.address = location.address;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        location: updatedUser.location,
        isAdmin: updatedUser.isAdmin,
        crisisAlertActive: updatedUser.crisisAlertActive,
        skills: updatedUser.skills || [],
        reputationScore: updatedUser.reputationScore || 0,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};
