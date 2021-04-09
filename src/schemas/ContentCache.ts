import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

export enum PublishStatus {
    UNPUBLISHED = 'unpublished',
    PUBLISHED = 'published',
};


export enum ContentCacheType {
    PAGE = 'page',
    DOCUMENT = 'document',
};


const ContentCacheSchema = new Schema({
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
        enum: [ContentCacheType.PAGE, ContentCacheType.DOCUMENT],
        required: true
    },
    siteGroup: {
        type: ObjectId,
        ref: "SiteGroup",
        index: true
    },
    siteId: {
        type: String
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
        type: String
    },
    url: {
        type: String
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

                delete ret._id;
                delete ret.__v;
            }
        }
    });

ContentCacheSchema.pre('save', async function (next) {
    (this as any).updatedAt = Date.now();
    next();
});

ContentCacheSchema.pre('findOneAndUpdate', function (next) {
    var update = this.getUpdate();
    update.updatedAt = Date.now();
    next();
});

export default ContentCacheSchema;