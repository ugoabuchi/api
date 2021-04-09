import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

const SiteGroupSchema = new Schema({
    _id:{
        type: ObjectId
    },
    objectId: {
        type: String,
        // index: true,
        // unique: true,
        sparse: true
    },
    tenantId: {
        type: String,
        // index: true,
    },
    siteId: {
        type: String
    },
    siteWebUrl: {
        type: String
    },
    driveId: {
        type: String
    },
    driveWebUrl: {
        type: String
    },
    displayName: {
        type: String
    },
    description: {
        type: String
    },
    visibility: {
        type: String
    },
    groupTypes: {
        type: [String]
    },
    ownerObjectIds: {
        type: [String]
    },
    owners: {
		type: [{ type: ObjectId, ref: "User" }],
		default: []
	},
    photo: {
        type: String
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isRejected: {
        type: Boolean,
        default: false
    },
    rejectionComment: {
        type: String,
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

                if (ret.owners) {
					ret.owners = ret.owners.map(g => mongoose.Types.ObjectId.isValid(g) ? g.toHexString() : g);
				}
                
                //delete ret.ownerObjectIds
                delete ret._id;
                delete ret.__v;
            }
        }
    });

SiteGroupSchema.pre('save', async function (next) {
    (this as any).updatedAt = Date.now();
    next();
});

SiteGroupSchema.pre('findOneAndUpdate', function (next) {
    var update = this.getUpdate();
    update.updatedAt = Date.now();
    next();
});

export default SiteGroupSchema;