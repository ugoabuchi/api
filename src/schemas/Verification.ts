import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
  ObjectId = Schema.Types.ObjectId;

const VerificationSchema = new Schema({
  code: {
        type: String
      },
  email: {
    type: String
  },
  siteGroupID: {
    type: ObjectId
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date
  }
});



export default VerificationSchema;
