import * as mongoose from 'mongoose';
import config from '../../config/config';

class DbUtil {

	static connect = () => {
		console.log('connecting to database... ' + config.get('db').mongo.uri)
		mongoose.connect(config.get('db').mongo.uri, {
			dbName: config.get('db').mongo.dbName,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true
		});
		(<any>mongoose).Promise = require('q').Promise;
	};

	static isObjectId = (o: any): o is mongoose.Types.ObjectId => {
		return mongoose.Types.ObjectId.isValid(o);
	};

	static uuid = () => {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	};

	static genPassword() {
		return this.uuid();
	}
}


export const toObjectId = (id: string) => {
	return mongoose.Types.ObjectId(id);
};

export default DbUtil;