import Tenant from '../models/Tenant';
import GraphUtil from './Graph';
import ContentCache from '../models/ContentCache';


export default class SyncUtil {
    public static init() {


    }

    public static async cacheContentAll() {
        console.log("start cacheContentAll")
        let tenant = await Tenant.findOne({ objectId: "67c3c1a6-c22b-4835-9532-a3d5b47318de" })
        const accessToken = await tenant.getAccessToken()
        GraphUtil.init(accessToken.token)

        const sites = await GraphUtil.fetchSites()
        
        let docs = []
        let pages = []
        await Promise.all(sites.map(async site => {
            const feedItems = await GraphUtil.fetchDocumentsBySite(site)
            docs = [ ...docs, ...feedItems]
        }));
        await Promise.all(sites.map(async site => {
            const feedItems = await GraphUtil.fetchPagesBySite(site)
            pages = [ ...pages, ...feedItems]
        }));
    
        //console.log("pages", pages)
        
        await Promise.all(docs.map(async doc => {
            //find exisiting cache
            let contentCache = await ContentCache.findOne({ objectId: doc.objectId })
            if (!contentCache) {
                contentCache = new ContentCache(doc)
                await contentCache.save()
            }
            else {
                console.log("cache", doc.objectId, "already exist")
            }            
        }));
    
        await Promise.all(pages.map(async page => {
            //find exisiting cache
            let contentCache = await ContentCache.findOne({ objectId: page.objectId })
            if (!contentCache) {
                console.log("page", page)

                console.log("create new cache for", page.objectId)
                contentCache = new ContentCache(page)
                await contentCache.save()
            }
            else {
                console.log("cache", page.objectId, "already exist")
            }            
        }));
    }

}