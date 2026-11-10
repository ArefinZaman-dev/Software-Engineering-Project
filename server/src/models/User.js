const mongoose = require('mongoose');
const {
  ROLES,
  USER_STATUS,
  AVAILABILITY,
  ORGANIZATION_TYPES,
} = require('../constants');
const { getProfileCompletion } = require('../utils/profileCompletion');

// Profile data lives inside the User document (embedded), because a profile is always
// read together with its user and never shared between users. See docs/DECISIONS.md.
const studentProfileSchema = new mongoose.Schema(
  {
    university: { type: String, trim: true, maxlength: 120, default: '' },
    department: { type: String, trim: true, maxlength: 120, default: '' },
    skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    availability: {
      type: String,
      enum: Object.values(AVAILABILITY),
      default: AVAILABILITY.FLEXIBLE,
    },
    experience: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: false }
);

const posterProfileSchema = new mongoose.Schema(
  {
    organizationType: {
      type: String,
      enum: Object.values(ORGANIZATION_TYPES),
      default: ORGANIZATION_TYPES.INDIVIDUAL,
    },
    organizationName: { type: String, trim: true, maxlength: 120, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // select:false keeps the hash out of every query unless we explicitly ask for it.
    passwordHash: { type: String, required: true, select: false },
    // immutable: a role can never be changed after the account is created.
    role: { type: String, enum: Object.values(ROLES), required: true, immutable: true },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    location: { type: String, trim: true, maxlength: 100, default: '' },
    // For students this is their bio; for posters it is the business / personal description.
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    studentProfile: { type: studentProfileSchema, default: undefined },
    posterProfile: { type: posterProfileSchema, default: undefined },
    // Updated by the review module (Increment 5). Never set from user input.
    ratingSummary: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Included in the owner's own JSON (not in the public profile).
userSchema.virtual('profileCompletion').get(function profileCompletion() {
  return getProfileCompletion(this);
});

// What other users are allowed to see. No email, no account status, no login times.
userSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this.id,
    name: this.name,
    role: this.role,
    location: this.location,
    bio: this.bio,
    studentProfile: this.studentProfile ? this.studentProfile.toObject() : undefined,
    posterProfile: this.posterProfile ? this.posterProfile.toObject() : undefined,
    ratingSummary: this.ratingSummary,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
