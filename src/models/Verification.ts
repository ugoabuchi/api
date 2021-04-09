import * as mongoose from 'mongoose';
import VerificationSchema from '../schemas/Verification';


const Verification = mongoose.model("Model", VerificationSchema, "verification")
export default Verification;