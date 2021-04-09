import * as mongoose from 'mongoose';
import { DeviceSchema } from './Device';
import * as bcrypt from 'bcrypt';

let Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

const UserSchema = new Schema({
	active: {
		type: Boolean,
		default: false,
		required: true
	},
	objectId: {
		type: String,
		index: true,
		unique: true,
		sparse: true
	},
	tenantId: {
		type: String,
		index: true
	},
	displayName: {
		type: String
	},
	firstName: {
		type: String,
	},
	lastName: {
		type: String
	},
	email: {
		type: String,
		index: true,
		unique: true,
	},
	password: {
		type: String
	},
	picture: {
		type: String
	},
	code: {
		type: Number
	},
	isExpired: {
		type: Boolean
	},
	expires: {
		type: Date,
		default: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
	},
	devices: {
		type: [DeviceSchema],
		default: []
	},
	siteGroups: {
		type: [{ type: ObjectId, ref: "SiteGroup" }],
		default: [],
		index: true
	},
	roles: {
		type: [String],
		required: true,
		default: ['member']
	},
	userGroup: {
		type: String,
		default: "member"
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

				if (ret.siteGroups) {
					ret.siteGroups = ret.siteGroups.map(g => mongoose.Types.ObjectId.isValid(g) ? g.toHexString() : g);
				}

				ret.isExternal = ret.objectId && ret.objectId.length > 0 ? true : false;

				delete ret._id;
				//delete ret.password;
				delete ret.__v;
			}
		}
	});


UserSchema.pre('save', async function (next) {
	(this as any).updatedAt = Date.now();
	if (this.isModified('password')) {
		// Hash the password before it is saved.
		let salt = await bcrypt.genSalt(10);
		let pwHash = await bcrypt.hash((this as any).password, salt);
		(this as any).password = pwHash;
	}
	next();
});

UserSchema.pre('findOneAndUpdate', function (next) {
	var update = this.getUpdate();
	update.updatedAt = Date.now();
	next();
});

export default UserSchema;