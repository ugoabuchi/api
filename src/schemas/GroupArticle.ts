import * as mongoose from 'mongoose';
import { PublishStatus } from './FeedItem';

let Schema = mongoose.Schema,
  ObjectId = Schema.Types.ObjectId;

const GroupArticleSchema = new Schema({
  title: {
    type: String
  },
  body: {
    type: String
  },
  createdBy: {
    type: ObjectId,
    ref: "User",
    index: true
  },
  siteGroup: {
    type: ObjectId,
    ref: "SiteGroup",
    index: true
  },
  status: {
    type: String,
    enum: [PublishStatus.UNPUBLISHED, PublishStatus.PUBLISHED],
    required: true,
    default: PublishStatus.UNPUBLISHED
  },
  photo:{
    type: [String],
  },
  type: {
    type: String,
    default: 'article',
    required: true
  },
  createdDateTime: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  updatedAt: {
    type: Date
  }
},
  {
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toHexString();

        ret.feedItem = mongoose.Types.ObjectId.isValid(ret.feedItem) ? ret.feedItem.toHexString() : ret.feedItem

        delete ret._id;
        delete ret.__v;
      }
    }
  });

GroupArticleSchema.pre('save', async function (next) {
  (this as any).updatedAt = Date.now();
  next();
});

GroupArticleSchema.pre('findOneAndUpdate', function (next) {
  var update = this.getUpdate();
  update.updatedAt = Date.now();
  next();
});

export default GroupArticleSchema;