import { JsonController, Get, Authorized, CurrentUser } from 'routing-controllers';

import "isomorphic-fetch";
import { IUser } from '../models/User';
import EventLog from '../models/Event';

@JsonController("/eventLogs")
export default class EventLogController {
    @Authorized(['admin'])
    @Get("/")
    async eventLogs() {
        const eventLogs = await EventLog.getAllPopulatedRows();

        let results = eventLogs.map(function (p) {
            return p.toJSON()
        });

        return {
            results: results
        }
    }
}