import * as mongoose from 'mongoose';


export interface IFeedAction extends mongoose.Document {
  FeedItem: mongoose.Types.ObjectId
  comment: string
  userId: mongoose.Types.ObjectId
  createdDateTime: Date
  createdAt?: Date
  updatedAt?: Date
}