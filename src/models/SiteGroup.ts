import * as mongoose from 'mongoose';
import SiteGroupSchema from '../schemas/SiteGroup';
import * as moment from 'moment'

export interface ISiteGroup extends mongoose.Document {
    objectId: string
    tenantId: string
    siteId: string
    siteWebUrl: string
    driveId: string,
    driveWebUrl: string,
    displayName: string
    description: string
    visibility: string
    groupTypes: string[]
    ownerObjectIds: string[]
    owners: mongoose.Types.ObjectId[]
    photo: string
    isApproved: boolean
    isRejected: boolean
    rejectionComment: string
    createdDateTime: Date
    createdAt?: Date,
    updatedAt?: Date
}

interface ISiteGroupModel extends mongoose.Model<ISiteGroup> {
    getAllPopulatedRows(query?: any): Promise<ISiteGroup[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<ISiteGroup[]>
    getPopulatedRow(query?: any): Promise<ISiteGroup>
    checkSiteGroup(query?: any): Promise<boolean>
    mapObject(obj: any): ISiteGroup
}

SiteGroupSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<ISiteGroup[]> {
    let results = await SiteGroup.getPopulatedRows(query, { createdDateTime: -1 }, undefined, undefined);
    return results
}

SiteGroupSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<ISiteGroup[]> {
    let results = await SiteGroup.find(query).sort(sort).limit(limit).skip(page * limit);

    return results
}

SiteGroupSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<ISiteGroup> {
    const results = await SiteGroup.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

SiteGroupSchema.statics.checkSiteGroup = async function (query: any = {}): Promise<boolean> {
    const results = await SiteGroup.findOne(query, undefined, undefined, undefined).countDocuments()
    return results > 0 ? true : false
}

SiteGroupSchema.statics.mapObject = function (obj: any): ISiteGroup {
    //console.log("site group mapObject", obj)
    return {
        objectId: obj.id,
        tenantId: obj.tenantId,
        siteId: obj.siteId,
        siteWebUrl: obj.siteWebUrl,
        driveId: obj.driveId,
        driveWebUrl: obj.driveWebUrl,
        photo: `https://graph.microsoft.com/v1.0/groups/${obj.id}/photo/$value`,
        displayName: obj.displayName,
        description: obj.description,
        visibility: obj.visibility,
        groupTypes: obj.groupTypes,
        createdDateTime: moment(obj.createdDateTime).toDate()
    } as ISiteGroup
}

const SiteGroup = mongoose.model<ISiteGroup, ISiteGroupModel>('SiteGroup', SiteGroupSchema);
export default SiteGroup;
