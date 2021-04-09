import * as mongoose from 'mongoose';
import { PublishStatus, FeedItemType } from '../schemas/FeedItem';
import FeedItemSchema from '../schemas/FeedItem';
import * as moment from 'moment'
import GraphUtil from '../utils/Graph';
import EventLog from './Event';
import { ISiteGroup } from './SiteGroup';
import { IUser } from './User';
import { EventLogAction } from '../schemas/EventLog';
import { NotFoundError } from 'routing-controllers';
import Firebase from '../utils/Firebase';
import { IContentCache } from './ContentCache';
import ContentCache from './ContentCache';

export interface IFeedItem extends mongoose.Document {
    siteId?: string
    driveId?: string
    objectId: string
    type: string
    name?: string
    title: string
    webUrl?: string
    siteWebUrl?: string
    url?: string
    photo?: string
    body?: string
    summary?: string
    mimeType?: string,
    size?: number,
    pageLayout?: string
    createdDateTime: Date
    siteGroup?: mongoose.Types.ObjectId
    status?: PublishStatus
    createdAt?: Date,
    updatedAt?: Date
}

interface IFeedItemModel extends mongoose.Model<IFeedItem> {
    getAllPopulatedRows(query?: any): Promise<IFeedItem[]>
    getPopulatedRows(query?: any, sort?: any, limit?: number, page?: number): Promise<IFeedItem[]>
    getPopulatedRow(query?: any): Promise<IFeedItem>
    mapPageObject(obj: any): IFeedItem
    mapDocumentObject(obj: any): IFeedItem
    publishCacheContent(cache: IContentCache, iteGroup: ISiteGroup, user: IUser): Promise<boolean>
    unPublishFeedItem(feedItem: IFeedItem, user: IUser): Promise<boolean>

}

FeedItemSchema.statics.getAllPopulatedRows = async function (query: any = {}): Promise<IFeedItem[]> {
    let results = await FeedItem.getPopulatedRows(query, undefined, undefined, undefined);
    return results
}

FeedItemSchema.statics.getPopulatedRows = async function (query: any = {}, sort: any = {}, limit: number = undefined, page: number = 0): Promise<IFeedItem[]> {
    let results = await FeedItem.find(query).sort(sort).limit(limit).skip(page * limit)
        .populate({
            path: 'siteGroup',
            //select: 'title createdAt updatedAt trackNumber subtitle type releaseDate media published',
            match: { _id: { $ne: null } }
        });

    return results
}

FeedItemSchema.statics.getPopulatedRow = async function (query: any = {}): Promise<IFeedItem> {
    const results = await FeedItem.getPopulatedRows(query, undefined, undefined, undefined)
    return results.length > 0 ? results[0] : null
}

FeedItemSchema.statics.publishCacheContent = async function (cache:IContentCache, siteGroup: ISiteGroup, user: IUser): Promise<boolean> {

    const feedItemsObj = cache.type == FeedItemType.PAGE ? await GraphUtil.fetchPageByCache(cache, siteGroup) : await GraphUtil.fetchDocumentByCache(cache, siteGroup)
    
    if (!feedItemsObj) throw new NotFoundError("Document not found or is not accessible by user") 
    
    let feedItem = await FeedItem.findOne({ objectId: feedItemsObj.objectId })
    if (!feedItem) {
        console.log("create feeditem")
        feedItem = new FeedItem({ ...feedItemsObj, siteGroup: siteGroup._id, status: PublishStatus.PUBLISHED })
        await feedItem.save()
        await EventLog.logEvent(EventLogAction.PUBLISHED, feedItem.title, user)
    }
    else {
        console.log("update feeditem")
        await FeedItem.findOneAndUpdate({ _id: feedItem._id }, { ...feedItemsObj, status: PublishStatus.PUBLISHED }, { runValidators: true });
    }

    const tags = user.siteGroups.map(id => id.toHexString())
    var chunks = function (array, size) {
        var results = [];
        while (array.length) {
            results.push(array.splice(0, size));
        }
        return results;
    };

    const message = {
        notification: {
            title: siteGroup.displayName,
            body: "New content is available"
        },
        condition: null
    };
    const parts = chunks(tags, 10)
    for (const ids of parts) { 
        // await Firebase.pushToTopic("content", message)
    }

    return true
}

FeedItemSchema.statics.unPublishFeedItem = async function (feedItem: IFeedItem, user: IUser): Promise<boolean> {

    await EventLog.logEvent(EventLogAction.UNPUBLISHED, feedItem.title, user)
    // await feedItem.remove()

    return true
}

FeedItemSchema.statics.mapPageObject = function (obj: any): IFeedItem {

    const innerHTML = obj.webParts.map(p => {
        return p.data && p.data.innerHTML ? p.data.innerHTML : ""
    }).join(" ")
    const cleanText = innerHTML.replace(/<\/?[^>]+(>|$)/g, "")

    return {
        type: FeedItemType.PAGE,
        objectId: obj.id,
        siteId: obj.siteId,
        name: obj.name,
        title: obj.title,
        webUrl: obj.webUrl,
        url: `${obj.siteWebUrl}/${obj.webUrl}`,
        siteWebUrl: obj.siteWebUrl,
        photo: obj.photo,
        body: innerHTML,
        summary: cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText,
        pageLayout: obj.pageLayout,
        createdDateTime: moment(obj.createdDateTime || obj.lastModifiedDateTime).toDate(),
    } as IFeedItem
}

FeedItemSchema.statics.mapDocumentObject = function (obj: any): IFeedItem {

    return {
        type: FeedItemType.DOCUMENT,
        objectId: obj.id,
        siteId: obj.siteId,
        driveId: obj.parentReference ? obj.parentReference.driveId : null,
        name: obj.name,
        title: obj.name,
        webUrl: obj.webUrl,
        url: obj.webUrl,
        mimeType: obj.file ? obj.file.mimeType : null,
        siteWebUrl: obj.siteWebUrl,
        photo: obj.photo,
        createdDateTime: moment(obj.createdDateTime || obj.lastModifiedDateTime).toDate(),
    } as IFeedItem
}

const FeedItem = mongoose.model<IFeedItem, IFeedItemModel>('FeedItem', FeedItemSchema);
export default FeedItem;

