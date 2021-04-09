import * as mongoose from 'mongoose';
import { IUser } from './User';
import EventLogSchema from '../schemas/EventLog';
import { EventLogAction } from '../schemas/EventLog';

export interface IEvent extends mongoose.Document {
    title?: string
    user: mongoose.Types.ObjectId
    createdAt?: Date
    updatedAt?: Date
}

interface IEventModel extends mongoose.Model<IEvent> {
    getAllPopulatedRows(query?: any): Promise<IEvent[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<IEvent[]>
    getPopulatedRow(query?: any): Promise<IEvent>

    logEvent(action: EventLogAction, title: string, user: IUser): Promise<void>
}

EventLogSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<IEvent[]> {
    let results = await EventLog.getPopulatedRows(query, { createdAt: -1 }, undefined, undefined);
    return results
}

EventLogSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<IEvent[]> {
    let results = await EventLog.find(query).sort(sort).limit(limit).skip(page * limit);

    return results
}

EventLogSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<IEvent> {
    const results = await EventLog.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

EventLogSchema.statics.logEvent = async function (action: EventLogAction, title: string, user: IUser): Promise<void> {
    const event = new EventLog({
        action: action,
        title: title,
        user: user._id
    })
    await event.save()
}

const EventLog = mongoose.model<IEvent, IEventModel>('EventLog', EventLogSchema);

export default EventLog;