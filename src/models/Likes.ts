import * as mongoose from 'mongoose';


export interface IFeedAction extends mongoose.Document {
  FeedItem: mongoose.Types.ObjectId
  likes: number
  views: number
  userId: mongoose.Types.ObjectId
  createdDateTime: Date
  createdAt?: Date
  updatedAt?: Date
}