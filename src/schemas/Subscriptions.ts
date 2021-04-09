import * as mongoose from 'mongoose';

let Schema = mongoose.Schema;
const SubscriptionSchema = new Schema({
  email: {
    type: String
  },
  siteGroupID: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});



export default SubscriptionSchema;
