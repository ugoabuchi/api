import AuthUtil from './Auth';
import { ISiteGroup } from '../models/SiteGroup';
import FeedItem, { IFeedItem } from '../models/FeedItem';
import User, { IUser } from '../models/User';
import SiteGroup from '../models/SiteGroup';
import config from '../../config/config';
import Tenant from '../models/Tenant';
import * as moment from 'moment'
import { IAccessToken, ITenant } from '../models/Tenant';
import { UnauthorizedError, ForbiddenError } from 'routing-controllers';
import { IContentCache } from '../models/ContentCache';

const axios = require('axios');
const qs = require('querystring')


const groupFields = 'id,createdDateTime,displayName,description,visibility,groupTypes'
const feedItemFields = 'id,parentReference,name,title,folder,webParts,webUrl,pageLayout,createdDateTime,lastModifiedDateTime'

export default class GraphUtil {
    private static accessToken: string = ""

    public static init(accessToken: string) {
        this.accessToken = accessToken
        //console.log("GraphUtil INIT", this.accessToken)
    }

    public static stripToken(accessToken: string) {
        return accessToken.split("Bearer ").pop();
    }

    public static async registerTenant(tenantId: string): Promise<ITenant> {
        console.log("registerTenant", tenantId)
        let tenant = new Tenant({
            objectId: tenantId
        });
        await tenant.save();
        tenant.accessToken = await GraphUtil.refreshTenantToken(tenant.objectId)

        return tenant;
    }

    public static async refreshTenantToken(tenantId: string): Promise<IAccessToken> {
        console.log("refreshToken", tenantId)
        let p = new Promise<IAccessToken>(async function (resolve, reject) {
            let tenant = await Tenant.findOne({ objectId: tenantId });
            if (!tenant) {
                throw new Error("tenant not found")
            }

            let axiosConfig = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Host": "login.microsoftonline.com"
                }
            }
            const data = {
                client_id: config.get('app').clientId,
                scope: "https://graph.microsoft.com/.default",
                client_secret: config.get('app').clientSecret,
                grant_type: "client_credentials"
            }
            axios.default.post(`https://login.microsoftonline.com/${tenant.objectId}/oauth2/v2.0/token`, qs.stringify(data), axiosConfig)
                .then(async response => {
                    const accessToken = {
                        tokenType: response.data.token_type,
                        expiresAt: moment().add(response.data.expires_in, "seconds").toDate(),
                        token: response.data.access_token
                    }
                    console.log("accessToken", accessToken)
                    resolve(accessToken);
                })
                .catch(error => {
                    console.log("Error 1", error)
                    reject(error);
                });
        });

        return p;

    }

    public static async fetchCurrentUser(): Promise<IUser> {
        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            const obj = await client.api('/me').get();
            const tenantObj = await client.api('/organization?$select=id').get();
            if (tenantObj && tenantObj.value && tenantObj.value.length > 0) {
                return User.mapObject({ ...obj, tenantId: tenantObj.value[0].id })
            }

        }
        catch (e) {
            console.log("fetchCurrentUser - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

    public static async fetchSites(): Promise<ISiteGroup[]> {
        //accessToken = GraphUtil.stripToken(accessToken)
        console.log("GraphUtil.accessToken", GraphUtil.accessToken)
        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        try {
            //const groupResults = await client.api(`groups?$filter=groupTypes/any(c:c+eq+'Unified')&$select=${groupFields}`).get();
            const groupResults = await client.api(`sites`).get();
            let results: ISiteGroup[] = []
            await Promise.all(groupResults.value.map(async obj => {
                try {
                    //const rootSite = await client.api(`https://graph.microsoft.com/beta/groups/${obj.id}/sites/root`).get();
                    const defaultDrive = await client.api(`https://graph.microsoft.com/beta/sites/${obj.sharepointIds.siteId}/drive?$filter=driveType eq 'documentLibrary'`).get();

                    const siteGroup = SiteGroup.mapObject({
                        ...obj,
                        siteId: obj.sharepointIds.siteId,
                        siteWebUrl: obj.sharepointIds.siteUrl,
                        driveId: defaultDrive.id,
                        driveWebUrl: defaultDrive.webUrl
                    })
                    results.push(siteGroup)
                }
                catch (e) {
                    console.log("fetchSites - error", e.message)
                }
            }))

            return results
        }
        catch (e) {
            console.log("error", e.message)
            throw new ForbiddenError("Operation not permited")
        }


    }

    public static async fetchGroupOwners(groupObjectId: string): Promise<string[]> {        
        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        // console.log(GraphUtil.accessToken)

        try {
            let groupOwnerResults = await client.api(`groups/${groupObjectId}/owners?$select=id`).get();
            groupOwnerResults = groupOwnerResults.value.filter(obj => obj["@odata.type"] == "#microsoft.graph.user")
            const results = groupOwnerResults.map(obj => obj.id)
            return results

        } catch (e) {
            console.log("fetchGroupOwners - error", e.message)
            return []
        }

    }

    public static async fetchUserGroupIds(): Promise<string[]> {
        console.log("fetchUserGroupIds")
        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            const groupResults = await client.api("/me/memberOf").get();
            //console.log("groupResults", groupResults)

            const filtered = groupResults.value.filter(v => v["@odata.type"] == '#microsoft.graph.group')
            let results: string[] = []

            await Promise.all(filtered.map(async obj => {
                results.push(obj.id)
            }))

            return results

        } catch (e) {
            console.log("fetchUserGroupIds - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

    public static async fetchUserRoles(): Promise<string[]> {
        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            const groupResults = await client.api(`/me/memberOf?$select = ${groupFields}`).get();

            const filtered = groupResults.value.filter(v => v["@odata.type"] == '#microsoft.graph.directoryRole')
            if (filtered && filtered.length > 0) {
                return ["member", "admin"]
            }
            else {
                return ["member"]
            }

        } catch (e) {
            console.log("fetchUserRoles - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }



    public static async fetchUserGroupsIds(): Promise<ISiteGroup[]> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        try {
            const results = await client.api(`/me/memberOf?$select=id`).get();
            const groupIds: ISiteGroup[] = results.value.map(obj => obj.id);
            return groupIds

        } catch (e) {
            console.log("fetchUserGroupsIds - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

    public static async addUserToGroup(userId: string, groupId: string): Promise<void> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        console.log("response", userId, groupId)

        try {
            await client.api(`/groups/${groupId}/members/$ref`).post({
                "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
            })

        } catch (e) {
            console.log("addUserToGroup - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

    public static async removeUserFromGroup(userId: string, groupId: string): Promise<void> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            await client.api(`/groups/${groupId}/members/$ref`).delete();

        } catch (e) {
            console.log("removeUserFromGroup - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

    public static async createGroup(displayName: string, description: string): Promise<ISiteGroup> {
        const mailNickname = displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const data = {
            displayName,
            description,
            groupTypes: ["Unified"],
            mailEnabled: true,
            mailNickname: mailNickname,
            securityEnabled: false
        }

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        // console.log(GraphUtil.accessToken)

        try {
            const obj = await client.api(`groups`).post(data);
            const siteGroupObj = SiteGroup.mapObject(obj)

            return siteGroupObj

        } catch (e) {
            console.log("createGroup - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }

    }

 

    public static async createGroupPage(siteGroup: ISiteGroup, title: string, body: string): Promise<IFeedItem> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        const data = {
            "name": `${title}.aspx`,
            "title": title,
            "publishingState": {
                "level": "published",
                "versionId": "0.1"
            },
            "webParts": [{
                "type": "rte",
                "data": {
                    "innerHTML": body
                }
            }]
        }

        try {
            const obj = await client.api(`https://graph.microsoft.com/beta/sites/${siteGroup.siteId}/pages`).post(data);
            const feedItem = FeedItem.mapPageObject(obj)
            return feedItem

        } catch (e) {
            console.log("createGroupPage - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }




    public static async fetchPagesBySite(siteGroup: ISiteGroup): Promise<IFeedItem[]> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        let results: IFeedItem[] = []
        try {
            // console.log(siteGroup)
            const children = await client.api(`https://graph.microsoft.com/beta/sites/${siteGroup.siteId}/pages?$filter=pageLayout eq 'Article'&$select=${feedItemFields}`).get();
            // const children = await client.api(`https://graph.microsoft.com/beta/sites/root/pages?$filter=pageLayout eq 'Article'&$select=${feedItemFields}`).get();

            await Promise.all(children.value.map(async obj => {
                const feedItem = FeedItem.mapPageObject({ ...obj,  siteId: siteGroup.objectId, groupObjectId: siteGroup.objectId, siteWebUrl: siteGroup.siteWebUrl, photo: siteGroup.photo })
                results.push(feedItem)
            }));

        } catch (e) {
            console.log("fetchPagesBySite - error", e.message)
//            throw new ForbiddenError("Operation not permited")
        }
        return results
    }


    public static async fetchDocumentsBySite(siteGroup: ISiteGroup): Promise<IFeedItem[]> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        let results: IFeedItem[] = []
        try {
            const children = await client.api(`https://graph.microsoft.com/beta/drives/${siteGroup.driveId}/root/children`).get();
            // const children = await client.api(`https://graph.microsoft.com/beta/me/drive/root/`).get()[0];
            await Promise.all(children.value.map(async obj => {
                if (obj.file) {
                    const feedItem = FeedItem.mapDocumentObject({ ...obj, siteId: siteGroup.objectId, groupObjectId: siteGroup.objectId, siteWebUrl: siteGroup.siteWebUrl, photo: siteGroup.photo })
                    results.push(feedItem)
                }
            }));

        } catch (e) {
            console.log("fetchDocumentsBySite - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
        return results
    }

       public static async fetchPageByCache(cache: IContentCache, siteGroup: ISiteGroup): Promise<IFeedItem> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            const obj = await client.api(`https://graph.microsoft.com/beta/sites/${cache.siteId}/pages/${cache.objectId}?$select=${feedItemFields}`).get();
            const data = { ...obj, siteGroup: siteGroup._id, siteWebUrl: siteGroup.siteWebUrl, photo: siteGroup.photo }

            const feedItem = FeedItem.mapPageObject(data)
            return feedItem

        } catch (e) {
            console.log("fetchPageById- error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }

    public static async fetchDocumentByCache(cache: IContentCache, siteGroup: ISiteGroup): Promise<IFeedItem> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)

        try {
            const obj = await client.api(`https://graph.microsoft.com/beta/drives/${cache.driveId}/items/${cache.objectId}`).get();
            const data = { ...obj, siteGroup: siteGroup._id, siteWebUrl: siteGroup.siteWebUrl, photo: siteGroup.photo }

            const feedItem = FeedItem.mapDocumentObject(data)
            return feedItem

        } catch (e) {
            console.log("fetchDocumentById - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }


    public static async fetchOrganizationSiteIdAndURL(): Promise<any> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        // console.log('client: ' + GraphUtil.accessToken)
        try {
            const siteData = await client.api(`https://graph.microsoft.com/beta/sites/root`).get();
            const { webUrl, id: siteId } = siteData
            // const { siteId } = parentReference
            return {
                siteId,
                siteWebUrl: webUrl
            }

        } catch (e) {
            console.log("fetchOrganizationDrive - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }
    public static async fetchOrganizationDriveIdAndURL(userId: string): Promise<any> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        try {
            const driveData = await client.api(`https://graph.microsoft.com/beta/users/${userId}/drive/root`).get();
            // const children = await client.api(`https://graph.microsoft.com/beta/me/drive/root/`).get()[0];
            const { webUrl, parentReference } = driveData
            const { driveId } = parentReference
            return {
                driveId,
                driveWebUrl: webUrl
            }
        } catch (e) {
            console.log("fetchOrganizationDrive - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }
    public static async fetchAdminUers(): Promise<any> {

        const client = AuthUtil.getGraphAuthClient(GraphUtil.accessToken)
        try {
            const users = await client.api(`https://graph.microsoft.com/v1.0/users`).get();
            const { webUrl, parentReference } = users
            const { driveId } = parentReference
            return {
                driveId,
                driveWebUrl: webUrl
            }
        } catch (e) {
            console.log("fetchOrganizationDrive - error", e.message)
            throw new ForbiddenError("Operation not permited")
        }
    }
}

