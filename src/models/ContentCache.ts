import * as mongoose from 'mongoose';
import { PublishStatus, ContentCacheType } from '../schemas/ContentCache';
import ContentCacheSchema from '../schemas/ContentCache';
import * as moment from 'moment'
var striptags = require('striptags');

export interface IContentCache extends mongoose.Document {
    siteId: string
    driveId: string
    objectId: string
    type: string
    name: string
    title: string
    webUrl?: string
    url?: string
    siteWebUrl?: string
    photo?: string
    body?: string
    summary?: string
    mimeType?: string,
    size?: number,
    pageLayout: string
    createdDateTime: Date
    siteGroup?: mongoose.Types.ObjectId
    status?: PublishStatus
    createdAt?: Date,
    updatedAt?: Date
}

interface IContentCacheModel extends mongoose.Model<IContentCache> {
    getAllPopulatedRows(query?: any): Promise<IContentCache[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<IContentCache[]>
    getPopulatedRow(query?: any): Promise<IContentCache>
    mapPageObject(obj: any): IContentCache
    mapDocumentObject(obj: any): IContentCache
}

ContentCacheSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<IContentCache[]> {
    let results = await ContentCache.getPopulatedRows(query, undefined, undefined, undefined);
    return results
}

ContentCacheSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<IContentCache[]> {
    let results = await ContentCache.find(query).sort(sort).limit(limit).skip(page * limit)
        .populate({
            path: 'siteGroup',
            //select: 'title createdAt updatedAt trackNumber subtitle type releaseDate media published',
            match: { _id: { $ne: null } }
        });

    return results
}

ContentCacheSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<IContentCache> {
    const results = await ContentCache.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

ContentCacheSchema.statics.mapPageObject = function (obj: any): IContentCache {

    const innerHTML = obj.webParts.map(p => {
        return p.data && p.data.innerHTML ? p.data.innerHTML : ""
    }).join(" ")
    const cleanText = striptags(innerHTML)

    return {
        type: ContentCacheType.PAGE,
        objectId: obj.id,
        siteId: obj.parentReference ? obj.parentReference.siteId : null,
        name: obj.name,
        title: obj.title,
        webUrl: obj.webUrl,
        siteWebUrl: obj.siteWebUrl,
        photo: obj.photo,
        body: innerHTML,
        url: `${obj.siteWebUrl}/${obj.webUrl}`,
        summary: cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText,
        pageLayout: obj.pageLayout,
        createdDateTime: moment(obj.createdDateTime || obj.lastModifiedDateTime).toDate(),
    } as IContentCache
}

ContentCacheSchema.statics.mapDocumentObject = function (obj: any): IContentCache {

    return {
        type: ContentCacheType.DOCUMENT,
        objectId: obj.id,
        driveId: obj.parentReference ? obj.parentReference.driveId : null,
        name: obj.name,
        title: obj.name,
        webUrl: obj.webUrl,
        mimeType: obj.file ? obj.file.mimeType : null,
        siteWebUrl: obj.siteWebUrl,
        url: `${obj.siteWebUrl}/${obj.webUrl}`,
        photo: obj.photo,
        createdDateTime: moment(obj.createdDateTime || obj.lastModifiedDateTime).toDate(),
    } as IContentCache
}

const ContentCache = mongoose.model<IContentCache, IContentCacheModel>('ContentCache', ContentCacheSchema);
export default ContentCache;

