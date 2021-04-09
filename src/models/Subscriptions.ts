import * as mongoose from 'mongoose';
import SubscriptionSchema from '../schemas/Subscriptions';


const Subscriptions = mongoose.model("Subscribe", SubscriptionSchema, "subscriptions")
export default Subscriptions;