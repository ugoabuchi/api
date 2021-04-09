import { JsonController, Get, Authorized, Param, NotFoundError, OnUndefined, QueryParam } from 'routing-controllers';

import "isomorphic-fetch";
import GraphUtil from '../utils/Graph';
import SiteGroup from '../models/SiteGroup';
import Tenant from '../models/Tenant';
import User from '../models/User';
import FeedItem from '../models/FeedItem';

@JsonController("/tenants")
export default class TenantController {


    @Get("/register")
    @OnUndefined(201)
    async register(@QueryParam("tenant") tenantId: string, @QueryParam("state") state: string, @QueryParam("admin_consent") admin_consent: string) {
        if (!tenantId || !state || !admin_consent) {
            throw new Error("Illegal operation")
        }
        try {

            let tenant = await Tenant.findOne({ objectId: tenantId })
            if (!tenant) {
                tenant = await GraphUtil.registerTenant(tenantId)
            }
            const accessToken = await tenant.getAccessToken()
            GraphUtil.init(accessToken.token)
            await tenant.syncGroups()

        }
        catch (e) {
            throw new Error("Illegal operation")
        }
    }

    @Get("/stats")
    @Authorized(['admin'])
    async stats() {

        const totalUsers = await User.countDocuments({})
        const totalContent = await FeedItem.countDocuments({})

        const totalNotification = totalUsers * totalContent

        return {
            totalUsers,
            totalContent,
            totalNotification
        }

    }


}

//    
