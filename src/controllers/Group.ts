import { JsonController, Body, Req, Res, Get, Post, QueryParam, Authorized, HttpCode, UploadedFile, CurrentUser, Param, HeaderParam, NotFoundError, UnauthorizedError, BodyParam, OnUndefined, InternalServerError, Put, Delete, UseBefore } from 'routing-controllers';

import * as path from 'path'
import * as fs from 'fs';
import "isomorphic-fetch";
import AuthUtil from '../utils/Auth';
import { ISiteGroup } from '../models/SiteGroup';
import GraphUtil from '../utils/Graph';
import { IFeedItem } from '../models/FeedItem';
import { IUser } from '../models/User';
import SiteGroup from '../models/SiteGroup';
import Tenant from '../models/Tenant';
import FeedItem from '../models/FeedItem';
import { PublishStatus, FeedItemType } from '../schemas/FeedItem';
import { ValidationError } from '../utils/Errors';
import { fileUpload } from '../middlewares/upload';
import ContentCache from '../models/ContentCache';
import DbUtil from '../utils/Db';

@JsonController("/siteGroups")
export default class GroupController {

    @Authorized(['admin', 'superAdmin', 'member'])
    @Get("/")
    async groups(@CurrentUser({ required: true }) currentUser?: IUser) {

        const siteGroups = await SiteGroup.find({ tenantId: currentUser.tenantId }).populate({ path: 'owners' });
        // const siteGroups = await SiteGroup.getAllPopulatedRows({ tenantId: currentUser.tenantId});

        const results = await Promise.all(siteGroups.map(async g => {
            const isMember = currentUser.isMember(g._id.toHexString())
            return {
                ...g.toJSON(),
                isMember
            }
        }));

        // const results = await SiteGroup.find({ tenantId: currentUser.tenantId })
        //     .populate({
        //         path: 'owners'
        //     })
        return {
            results: results
        }
    }

    @Authorized(['admin'])
    @Get("/autocomplete")
    async autocomplete(@QueryParam("query") query: string) {
        console.log(query)
        const search: any = {
            $or: [
                { name: { $regex: query, $options: "i" } },
                { ttile: { $regex: query, $options: "i" } },
                { url: { $regex: query, $options: "i" } }
            ]
        }

        const results = await ContentCache.getPopulatedRows(search, {}, 5)
        const data = await Promise.all(results.map(async c => {
            return {
                ...c.toJSON(),
            }
        }))

        return data
    }

    @Authorized(['admin'])
    @Get("/:id")
    async getById(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const isOwner = currentUser.isOwner(siteGroup)
        return {
            ...siteGroup.toJSON(),
            //...siteGroup,
            isOwner
        };
    }

    @Authorized(['admin'])
    @Post("/")
    @OnUndefined(201)
    async createGroup(@Req() request: any, @Body() data: any, @UploadedFile("photo") file: any, @CurrentUser({ required: true }) currentUser?: IUser) {
        console.log(data)
        let photo: string
        let { photo: photos, name: displayName, desc: description, visibility, owners } = data
        if (photos !== undefined && photos !== null && photos.length > 0) {
            photo = await fileUpload(photos, request)
        }
        displayName = displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const isApproved = false
            , isRejected = false
            , rejectionComment = ""


        data = { displayName, description, visibility, photo, objectId: currentUser.objectId, owners: [currentUser._id], ownerObjectIds: [...owners], isApproved, isRejected, rejectionComment }
        const siteGroup = new SiteGroup({ ...data, tenantId: currentUser.tenantId })
        await siteGroup.save()
        const isOwner = currentUser.isOwner(siteGroup)
        return {
            ...siteGroup.toJSON(),
            isOwner,
            data
        };
    }


    @Authorized('admin')
    @Put("/:id")
    @OnUndefined(204)
    async update(@Param("id") id: String, @Body() data: any, @UploadedFile("photo") file: any, @Req() request: any, @CurrentUser({ required: true }) currentUser?: IUser) {
        var siteGroup = await SiteGroup.findOne({ _id: id })
        if (!siteGroup) throw new NotFoundError('Group not found.');
        // console.log(data)
        let photo: string;
        photo = siteGroup.photo
        let { photo: photos, name: displayName, desc: description, visibility, owners, isApproved = siteGroup.isApproved, isRejected = siteGroup.isRejected, rejectionComment = siteGroup.rejectionComment } = data
        console.log(photos)
        if (photos !== undefined && photos !== null) {
            photo = await fileUpload(photos, request)
        }
        displayName = displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        console.log(data)

        data = {
            displayName,
            description,
            visibility,
            photo,
            objectId: currentUser.objectId,
            owners: [currentUser._id],
            ownerObjectIds: [...owners],
            isApproved,
            isRejected,
            rejectionComment,
            // ...siteGroup
        }

        siteGroup = await SiteGroup.findOneAndUpdate({ _id: id }, { $set: data }, { runValidators: true, new: true });

        return siteGroup.toJSON();
    }

    @Authorized('admin')
    @Put("/:id/photo")
    @OnUndefined(204)
    async updatePhoto(@Param("id") id: String, @Body() data: any, @UploadedFile("photo") file: any, @Req() request: any, @CurrentUser({ required: true }) currentUser?: IUser) {
        console.log(id, data, file)
        var siteGroup = await SiteGroup.findOne({ _id: id })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const { originalname: fileName, size, mimetype, buffer: image } = file
        var data = image
        // .replace(/^data:image\/\w+;base64,/, '');

        fs.writeFile(path.join(__dirname, '../uploads', fileName), data, { encoding: 'base64' }, (err) => {
            if (err) {
                console.log('error: ', err)
                throw err
            }
            else {
                console.log('upload success')
            }
        });
        const newPhoto: string = `${request.protocol}://${request.get('host')}/uploads/${fileName}`
        // console.log(newPhoto)
        siteGroup.photo = newPhoto
        siteGroup = await SiteGroup.findOneAndUpdate({ _id: id }, { $set: siteGroup }, { runValidators: true, new: true });

        return siteGroup.toJSON();
    }

    @Authorized('admin')
    @Delete("/:id")
    @OnUndefined(204)
    async delete(@Param("id") id: string) {
        let rCount = await FeedItem.countDocuments({ siteGroup: id })
        if (rCount > 0) {
            throw new ValidationError("Cannot delete group with content");
        }

        await SiteGroup.deleteOne({ _id: id });
    }

    @Authorized(['admin'])
    @Post("/:id/feedItems")
    @OnUndefined(201)
    async createFeedItem(@Param("id") id: string, @BodyParam("title") title: string, @BodyParam("body") body: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        console.log(title, body)
        let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const isOwner = currentUser.isOwner(siteGroup)
        if (!isOwner) {
            throw new UnauthorizedError('Invalid operation.');
        }

        // const feedItemObject = await GraphUtil.createGroupPage(siteGroup, title, body)
        // if (!feedItemObject) {
        //     throw new InternalServerError('Unable to process request.');
        // }
    }

    @Authorized(['admin'])
    @Post("/:id/importContent")
    @OnUndefined(201)
    async importContent(@Param("id") id: string, @BodyParam("query") query: string, @BodyParam("body") body: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const contentCache = await ContentCache.findOne({
            url: new RegExp(query)
        })

        if (!contentCache) throw new NotFoundError("Content cache not found")

        await FeedItem.publishCacheContent(contentCache, siteGroup, currentUser)

    }

    @Authorized(['admin'])
    @Post("/:id/importContent/validate")
    @OnUndefined(201)
    async importContentValidate(@Param("id") id: string, @BodyParam("query") query: string, @BodyParam("body") body: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        console.log(query)
        let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const contentCache = await ContentCache.findOne({
            url: new RegExp(query)
        })

        if (!contentCache) return new NotFoundError("Content cache not found")

        return contentCache.toJSON()

    }


    @Authorized(['admin'])
    @Get("/:id/feedItems")
    async feedItems(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {

        const siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const feedItems = await FeedItem.getAllPopulatedRows({ siteGroup: siteGroup._id })
        let results = feedItems.map(function (p) {
            return p.toJSON()
        });
        return {
            results: results
        }
    }


    @Authorized(['admin', 'superAdmin'])
    @Post("/:id/article")
    @OnUndefined(201)
    async createArticle(@Param("id") id: string, @Req() request: any, @Body() data: any, @UploadedFile("photo") file: any, @CurrentUser({ required: true }) currentUser?: IUser) {

        const objectId = DbUtil.uuid()
        const pageLayout = 'Article'

        const siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) return new NotFoundError('Group not found.');

        let { title, body, } = data

        const newRecord = { title, body, siteGroup: id, type: FeedItemType.ARTICLE, objectId, status: PublishStatus.PUBLISHED }
        const feedItem = new FeedItem(newRecord)

        // console.log(newRecord)
        await feedItem.save()

        // console.log(result)
        return true
    }

    @Authorized(['admin', 'superAdmin'])
    @Get("/:id/contents")
    async getArticle(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        console.log(id)
        // let res = results.map(function (p) {
        //     return p.toJSON()
        // })
        // console.log(results)
        // return results
    }


    @Authorized(['admin'])
    @Get("/:id/content")
    async content(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {

        const siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) throw new NotFoundError('Group not found.');

        const feedItems = await FeedItem.find({ siteGroup: siteGroup._id })
        let results = feedItems.map(function (p) {
            return p.toJSON()
        });
        return {
            results: results
        }
    }

    // @Authorized(['admin'])
    // @Post("/:id/publish/:type")
    // async publish(@Param("id") id: string, @Param("type") type: FeedItemType,
    //     @BodyParam("objectId") objectId: string,
    //     @BodyParam("groupId") groupId: string,
    //     @CurrentUser({ required: true }) currentUser?: IUser) {

    //     let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
    //     if (!siteGroup) {
    //         throw new NotFoundError("Group not found")
    //     }

    //     const publishGroup = await SiteGroup.findOne({ _id: groupId })
    //     if (!publishGroup) {
    //         throw new NotFoundError("Destination group not found")
    //     }

    //     await FeedItem.publishFeedItem(type, objectId, publishGroup, currentUser)

    //     return {
    //         success: true
    //     }
    // }

    @Authorized(['admin'])
    @Post("/:id/unpublish")
    async unpublish(@Param("id") id: string, @BodyParam("objectId") objectId: string, @CurrentUser({ required: true }) currentUser?: IUser) {
        let siteGroup = await SiteGroup.findOne({ _id: id, tenantId: currentUser.tenantId })
        if (!siteGroup) {
            return new NotFoundError("Group not found")
        }

        let feedItem = await FeedItem.findOne({ objectId: objectId, siteGroup: siteGroup._id })
        if (!feedItem) {
            return new NotFoundError("Content not found")
        }
        // const pub = 

        if (feedItem.status === PublishStatus.PUBLISHED) {
            console.log(true)
            feedItem.status = PublishStatus.UNPUBLISHED
        }
        else {
            console.log(false)
            feedItem.status = PublishStatus.PUBLISHED
        }

        await FeedItem.unPublishFeedItem(feedItem, currentUser)

        console.log(feedItem.status)

        const result = await FeedItem.findOneAndUpdate({ _id: feedItem.id }, feedItem)

        return {
            success: true
        }
    }

}