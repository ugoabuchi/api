import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

export enum PublishStatus {
    UNPUBLISHED = 'unpublished',
    PUBLISHED = 'published',
};


export enum FeedItemType {
    PAGE = 'page',
    DOCUMENT = 'document',
    ARTICLE = 'article',
};


const FeedItemSchema = new Schema({
    objectId: {
        type: String,
        index: true,
        unique: true,
    },
    status: {
        type: String,
        enum: [PublishStatus.UNPUBLISHED, PublishStatus.PUBLISHED],
        required: true,
        default: PublishStatus.UNPUBLISHED
    },
    type: {
        type: String,
        enum: [FeedItemType.PAGE, FeedItemType.DOCUMENT, FeedItemType.ARTICLE],
        required: true
    },
    siteGroup: {
        type: ObjectId,
        ref: "SiteGroup",
        index: true
    },
    siteId: {
        type: String,
        index: true
    },
    driveId: {
        type: String
    },
    name: {
        type: String
    },
    title: {
        type: String
    },
    webUrl: {
        type: String,
        index: true
    },
    url: {
        type: String,
        index: true
    },
    body: {
        type: String
    },
    summary: {
        type: String
    },
    pageLayout: {
        type: String
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

                ret.siteGroup = mongoose.Types.ObjectId.isValid(ret.siteGroup) ? ret.siteGroup.toHexString() : ret.siteGroup

                delete ret.__v;
            }
        }
    });

FeedItemSchema.pre('save', async function (next) {
    (this as any).updatedAt = Date.now();
    next();
});

FeedItemSchema.pre('findOneAndUpdate', function (next) {
    var update = this.getUpdate();
    update.updatedAt = Date.now();
    next();
});

export default FeedItemSchema;