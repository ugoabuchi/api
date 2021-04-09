import * as mongoose from 'mongoose';
import TenantSchema from '../schemas/Tenant';
import * as moment from 'moment'
import GraphUtil from '../utils/Graph';
import SiteGroup from './SiteGroup';
import FeedItem from './FeedItem';
import { ISiteGroup } from './SiteGroup';
import { IFeedItem } from './FeedItem';
import EventLog from './Event';
import { IUser } from './User';

export interface IAccessToken {
    tokenType: boolean
    expiresAt: Date
    token: string
}


export interface ITenant extends mongoose.Document {
    active: boolean
    objectId: string
    displayName?: string
    accessToken?: IAccessToken
    createdAt?: Date
    updatedAt?: Date
    hasValidToken(): boolean
    getAccessToken(): Promise<IAccessToken>
    syncGroups(): Promise<boolean>
    fetchFeedItems(): Promise<boolean>

}

interface ITenantModel extends mongoose.Model<ITenant> {
    getAllPopulatedRows(query?: any): Promise<ITenant[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<ITenant[]>
    getPopulatedRow(query?: any): Promise<ITenant>
}

TenantSchema.methods.hasValidToken = function (): boolean {
    if (!this.accessToken) return false
    return moment().isBefore(this.accessToken.expiresAt)
}

TenantSchema.methods.getAccessToken = async function (): Promise<IAccessToken> {
    if (this.hasValidToken()) {
        return this.accessToken
    }
    else {
        const accessToken = await GraphUtil.refreshTenantToken(this.objectId)
        this.accessToken = accessToken
        await this.save()
        return this.accessToken
    }
}

TenantSchema.methods.syncGroups = async function (): Promise<boolean> {
    // const groups = await GraphUtil.fetchSites()


    // await Promise.all(groups.map(async group => {
    //     let siteGroup = await SiteGroup.findOne({ objectId: group.objectId })
    //     let groupOwners = await GraphUtil.fetchGroupOwners(group.objectId)
    //     const data = { ...group, tenantId: this.objectId, ownerObjectIds: groupOwners }
    //     if (!siteGroup) {
    //         siteGroup = new SiteGroup(data)
    //         await siteGroup.save()
    //     }
    //     else {
    //         await SiteGroup.findOneAndUpdate({ _id: siteGroup._id }, data, { runValidators: true });
    //     }
    // }))

    // return true

    // groups.forEach(async group => {
    //     let siteGroup = await SiteGroup.findOne({ objectId: group.objectId })
    //     let groupOwners = await GraphUtil.fetchGroupOwners(group.objectId)
    //     const data = { ...group, tenantId: this.objectId, ownerObjectIds: groupOwners }
    //     if (!siteGroup) {
    //         siteGroup = new SiteGroup(data)
    //         await siteGroup.save()
    //     }
    //     else {
    //         await SiteGroup.findOneAndUpdate({ _id: siteGroup._id }, data, { runValidators: true });
    //     }
    // });
     return true
}

TenantSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<ITenant[]> {
    let results = await Tenant.getPopulatedRows(query, undefined, undefined, undefined);
    return results
}

TenantSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<ITenant[]> {
    let results = await Tenant.find(query).sort(sort).limit(limit).skip(page * limit);

    return results
}

TenantSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<ITenant> {
    const results = await Tenant.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

TenantSchema.index({ objectId: 1 }, { unique: true });

const Tenant = mongoose.model<ITenant, ITenantModel>('Tenant', TenantSchema);
export default Tenant;
