const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    isActive: { 
        type: Boolean, 
        default: false 
    },
    type: { 
        type: String, 
        required: true, 
        enum: ['Flood', 'Storm', 'Earthquake', 'Fire', 'None'] 
    },
    area: { 
        type: String, 
        required: true 
    },
    severity: { 
        type: String, 
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    message: {
        type: String,
        default: '',
        trim: true
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Emergency', emergencySchema);
