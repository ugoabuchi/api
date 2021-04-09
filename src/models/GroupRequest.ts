import * as mongoose from 'mongoose';
import GroupRequestSchema from '../schemas/GroupRequest';


const GroupRequest = mongoose.model("Request", GroupRequestSchema, "grouprequest")
export default GroupRequest;