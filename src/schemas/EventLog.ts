import * as mongoose from 'mongoose';

let Schema = mongoose.Schema,
	ObjectId = Schema.Types.ObjectId;

export enum EventLogAction {
	UNPUBLISHED = 'published',
	PUBLISHED = 'published'
};


const EventLogSchema = new Schema({
	title: {
		type: String
	},
	action: {
		type: String,
		enum: [EventLogAction.UNPUBLISHED, EventLogAction.PUBLISHED],
		required: true,
	},
	user: {
		type: ObjectId,
		ref: "User",
		index: true
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

				ret.user = mongoose.Types.ObjectId.isValid(ret.user) ? ret.user.toHexString() : ret.user

				delete ret._id;
				delete ret.__v;
			}
		}
	});


EventLogSchema.pre('save', async function (next) {
	(this as any).updatedAt = Date.now();
	next();
});

EventLogSchema.pre('findOneAndUpdate', function (next) {
	var update = this.getUpdate();
	update.updatedAt = Date.now();
	next();
});

export default EventLogSchema;