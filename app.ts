import "reflect-metadata";
import { createExpressServer, useContainer, Action, useExpressServer } from "routing-controllers";

import config from './config/config';
import * as mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import * as express from 'express'

import ApiController from "./src/controllers/Api";
import AuthController from "./src/controllers/Auth";
import UserController from "./src/controllers/User";
import GroupController from "./src/controllers/Group";
import FeedController from "./src/controllers/Feed";
import TenantController from "./src/controllers/Tenant";
import EventLogController from "./src/controllers/EventLog";


import { ErrorHandler } from "./src/middlewares/Error"
import { LoggingHandler } from "./src/middlewares/Logging"
import { CORSMiddleware } from "./src/middlewares/cors"
import User from './src/models/User';
import Firebase from './src/utils/Firebase';
import DbUtil from './src/utils/Db';
import Tenant from './src/models/Tenant';
import GraphUtil from './src/utils/Graph';
import SyncUtil from './src/utils/Sync';

var uploadPath = path.join(__dirname, 'src/uploads');
var cron = require('node-cron');
// const expressApp = express()
// expressApp.use('uploads/', express.static(uploadPath))
// expressApp.use('/', (req: any, res: any) => {
//     res.send('hello')
// })



const app = createExpressServer({
    controllers: [ApiController, AuthController, UserController, GroupController, FeedController, TenantController, EventLogController,],
    middlewares: [LoggingHandler, CORSMiddleware, ErrorHandler],
    authorizationChecker: async (action: Action, roles?: string[]) => {
        // Get `Authorization` header and parse out the Bearer Token.		
        let token = action.request.headers["authorization"];
        if (token == undefined || token == null) {
            return false
        }
        const jsonWebToken = token.split(' ')[1];
        var decoded: any = jwt.verify(jsonWebToken, config.get('auth').jsonWebTokenSecret, { algorithms: ['HS256'] });
        if (!decoded.userGroup || !decoded.userId || !DbUtil.isObjectId(decoded.userId)) return null;

        let user = await User.findById(decoded.userId);
        if (!user) return false;

        const tenant = await Tenant.findOne({ objectId: user.tenantId })
        const accessToken = (await tenant.getAccessToken()).token
        GraphUtil.init(accessToken)

        action.request.userId = decoded.userId; //assign the userid to the request
        action.request.userGroup = user.userGroup
        if (user && !roles.length)
            return true;
        if (user && roles.find(role => user.roles.indexOf(role) != -1))
            return true;

        return false;
    },

    currentUserChecker: async (action: Action) => {
        const token = action.request.headers["authorization"];
        if (token == undefined || token == null) {
            return null
        }
        const jsonWebToken = token.split(' ')[1];
        const decoded: any = jwt.verify(jsonWebToken, config.get('auth').jsonWebTokenSecret);

        if (!decoded.userGroup || !decoded.userId || !DbUtil.isObjectId(decoded.userId)) return null;

        const user = await User.findById(decoded.userId)
        console.log('-----', '*' + user.userGroup + '*', user.email);

        return user;
    }

});

app.use('/uploads', express.static(uploadPath))

async function start() {
    try {

        console.log("starting app")
        console.log('connecting to database', config.get('db').mongo.dbName, "uri", config.get('db').mongo.uri)
        mongoose.set('useFindAndModify', false);
        await mongoose.connect(config.get('db').mongo.uri, { dbName: config.get('db').mongo.dbName, useNewUrlParser: true, useUnifiedTopology: true });
        (<any>mongoose).Promise = require('q').Promise;
        //SyncUtil.syncAll()

        //run every hour
        cron.schedule('15 * * * *', () => {
            console.log('running a task 15 minute');
            SyncUtil.cacheContentAll()
        });

        Firebase.init()

    } catch (error) {
        console.log(error.message)
    }
}

start().then(() => {
    app.listen(config.get('server').port); // run express app
    console.log("Server is up and running at port " + config.get('server').port);
});
