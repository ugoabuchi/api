import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

export let AccessTokenSchema = new Schema({
	tokenType: {
		type: String
	},
	expiresAt: {
		type: Date
	},
	token: {
		type: String
	},
}, { _id: false });

const TenantSchema = new Schema({
	active: {
		type: Boolean,
		default: true,
		required: true
	},
	objectId: {
		type: String,
		index: true,
		required: true,
		unique: true,
	},
	accessToken: {
		type: AccessTokenSchema
	},
	displayName: {
		type: String
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

				delete ret._id;
				delete ret.password;
				delete ret.__v;
			}
		}
	});


TenantSchema.pre('save', async function (next) {
	(this as any).updatedAt = Date.now();
	next();
});

TenantSchema.pre('findOneAndUpdate', function (next) {
	var update = this.getUpdate();
	update.updatedAt = Date.now();
	next();
});

export default TenantSchema;