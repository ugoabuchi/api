import { JsonController, Body, Req, Res, Get, Post, QueryParam, Authorized, HttpCode, UploadedFile, CurrentUser, Param, HeaderParam, UnauthorizedError, NotFoundError, BodyParam } from 'routing-controllers';

import "isomorphic-fetch";
import GraphUtil from '../utils/Graph';
import { IFeedItem } from '../models/FeedItem';
import FeedItem from '../models/FeedItem';
import Tenant from '../models/Tenant';
import SiteGroup from '../models/SiteGroup';
import EventLog from '../models/Event';
import { IUser } from '../models/User';
import ContentCache from '../models/ContentCache';
import SyncUtil from '../utils/Sync';

@JsonController("/feedItems")
export default class FeedController {

@Authorized(['admin'])
    @Get("/generateCache")
    async cacheContent(@CurrentUser({ required: true }) currentUser?: IUser) {

    
        SyncUtil.cacheContentAll()
    
        return true
    }
}