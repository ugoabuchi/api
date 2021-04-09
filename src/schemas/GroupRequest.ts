import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
  ObjectId = Schema.Types.ObjectId;

const GroupRequestSchema = new Schema({
  email: {
    type: String
  },
  siteGroupID: {
    type: String
  },
  createdAt: {
    type: Date
  }
});



export default GroupRequestSchema;
