import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
  ObjectId = Schema.Types.ObjectId;

const CommentSchema = new Schema({
  feedItem: {
    type: ObjectId,
    ref: "FeedItem",
    index: true
  },
  comment: {
    type: String
  },
  userId: {
    type: ObjectId,
    ref: "User",
    index: true
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

CommentSchema.pre('save', async function (next) {
  (this as any).updatedAt = Date.now();
  next();
});

CommentSchema.pre('findOneAndUpdate', function (next) {
  var update = this.getUpdate();
  update.updatedAt = Date.now();
  next();
});

export default CommentSchema;
