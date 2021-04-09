import * as mongoose from 'mongoose';
import UserSchema from '../schemas/User';
import GraphUtil from '../utils/Graph';
import SiteGroup from './SiteGroup';
import { ISiteGroup } from './SiteGroup';

export interface IUser extends mongoose.Document {
    active: boolean; 
    objectId?: string
    tenantId: string
    displayName?: string
    firstName?: string
    lastName?: string
    picture?: string
    email?: string
    password?: string,
    siteGroups?: mongoose.Types.ObjectId[]
    roles?: string[]
    userGroup?: string
    code?: number
    isExpired: boolean
    expires?: Date,
    devices?: [any]
    createdAt?: Date,
    updatedAt?: Date,
    syncUserGroups(): Promise<boolean>
    isMember(groupId): Promise<boolean>
    isOwner(siteGroup: ISiteGroup): boolean
}

interface IUserModel extends mongoose.Model<IUser> {
    getAllPopulatedRows(query?: any): Promise<IUser[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<IUser[]>
    getPopulatedRow(query?: any): Promise<IUser>
    mapObject(obj: any): IUser
    getCurrentUser(): Promise<IUser>

}

UserSchema.methods.isMember = function (groupId: string): boolean {
    const ids = this.siteGroups.map(v => v.toHexString())
    return ids.includes(groupId);
}

UserSchema.methods.isOwner = async function (siteGroup: ISiteGroup): Promise<boolean> {
    const g = await SiteGroup.findOne({ _id: siteGroup._id, owners: this._id })
    return g ? true : false
}

UserSchema.methods.syncUserGroups = async function (): Promise<IUser> {
    const groupIds = await GraphUtil.fetchUserGroupIds()
    let siteGroupIds: any[] = []
    for (const groupId of groupIds) {
        let siteGroup = await SiteGroup.findOne({ objectId: groupId })
        if (siteGroup) {
            siteGroupIds.push(siteGroup._id)
        }
    }
    this.siteGroups = siteGroupIds
    const user = await this.save()

    return user
}

UserSchema.statics.getCurrentUser = async function (): Promise<IUser> {
    const userObj = await GraphUtil.fetchCurrentUser()
    const roles = await GraphUtil.fetchUserRoles()
    const data = { ...userObj, roles: roles }

    let user = await User.findOne({ objectId: data.objectId })
    if (!user) {
        user = new User(data)
        user = await user.save()
        //sync all content
    }
    else {
        user = await User.findOneAndUpdate({ _id: user._id }, data, { runValidators: true, new: true });
    }

    user.syncUserGroups()

    return user
}

UserSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<IUser[]> {
    let results = await User.getPopulatedRows(query, undefined, undefined, undefined);
    return results
}

UserSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<IUser[]> {
    let results = await User.find(query).sort(sort).limit(limit).skip(page * limit)
        .populate({
            path: 'siteGroups',
            //select: 'title createdAt updatedAt trackNumber subtitle type releaseDate media published',
            match: { _id: { $ne: null } }
        });

    return results
}

UserSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<IUser> {
    const results = await User.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

// UserSchema.statics.updateAll = async function (query: any = {}): Promise<IUser> {
//     const results = await User.updateMany(filter: any = {}, update, option)
//     return results.length > 0 ? results[0] : null
// }

UserSchema.statics.mapObject = function (obj: any): IUser {
    return {
        objectId: obj.id,
        tenantId: obj.tenantId,
        displayName: obj.displayName,
        firstName: obj.givenName,
        lastName: obj.surname,
        picture: `https://graph.microsoft.com/beta/me/photo/$value`,
        email: obj.mail
    } as IUser
}

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);
export default User;
