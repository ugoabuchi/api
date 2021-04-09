import { JsonController, Get, Post, Authorized, CurrentUser, Param, OnUndefined, BodyParam, Put, HttpCode, Body, QueryParam, Delete, UploadedFile } from 'routing-controllers';
// var parse = require('csv-parse');
import * as parse from 'csv-parse'
import * as neatCsv from 'neat-csv'
import * as fs from "fs"
import * as path from "path"
import "isomorphic-fetch";
import GraphUtil from '../utils/Graph';
import User from '../models/User';
import { IUser } from '../models/User';
import FeedItem from '../models/FeedItem';
import SiteGroup from '../models/SiteGroup';
import Firebase from '../utils/Firebase';
import { ConflictError, NotFoundError } from '../utils/Errors';
import * as mongoose from 'mongoose';
import { Duplex } from 'stream'
import { csvUpload } from '../middlewares/upload';
import * as randomize from 'randomatic';
import { sendEmail } from '../utils/nodemailer';



@JsonController("/users")
export default class UserController {


	@Authorized('admin')
	@Get("/")
	async list(@QueryParam("query") query: string, @QueryParam("page") page: number = 0, @QueryParam("limit") limit: number = 20,
		@QueryParam("orderBy") orderBy: string, @QueryParam("order") order: string, @CurrentUser({ required: true }) currentUser?: IUser) {

		let sort: any = {};
		let search: any = {};
		if (query) {
			let queryString = decodeURIComponent(query);
			search = {
				$and: [{
					email: { $regex: `.*${queryString.replace('+', '\\+')}.*`, $options: 'i' }
				}, {
					firstName: { $regex: `.*${queryString}.*`, $options: 'i' }
				}, {
					lastName: { $regex: `.*${queryString}.*`, $options: 'i' }
				}, { tenantId: currentUser.tenantId }]
			};
		}
		if (orderBy) {
			sort[orderBy] = (order == 'desc') ? -1 : 1;
		}
		// let results = await User.find(search, '-password').sort(sort).limit(limit).skip(page * limit);
		let results = await User.getAllPopulatedRows({ tenantId: currentUser.tenantId });
		let totalCount = await User.countDocuments({});

		let data = results.map(function (p) {
			return p.toJSON()
		});

		console.log(data.length)
		return {
			users: data,
			page,
			limit,
			totalCount
		}
	}

	@Authorized(['member'])
	@Get("/:id")
	async getById(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {
		if (id == 'me') id = currentUser._id.toHexString()

		let user = await User.findOne({
			_id: id,
		});
		return user.toJSON();
	}

	@Authorized(['admin', 'member'])
	@Get("/:id/member")
	async getMemberById(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {
		if (id == 'me') id = currentUser._id.toHexString()

		let user = await User.findOne({
			_id: id,
		});
		return user.toJSON();
	}

	@Authorized('admin')
	@Post("/")
	@HttpCode(201)
	async create(@Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {
		// console.log(data)
		let admin
		const user = await User.findOne({ email: data.mail });
		// console.log("user", user)
		// const count = await User.countDocuments({ email: data.mail });
		if (user) {
			(user.roles.includes("admin")) ? user : user.roles.push("admin")
			admin = await User.findByIdAndUpdate({ _id: user._id }, user)

			return admin
		}
		// return new ConflictError(`User already exist.`);

		admin = new User({
			active: false,
			firstName: data.givenName,
			lastName: data.surname,
			phone: data.mobilePhone,
			email: data.mail,
			status: data.status,
			userGroup: 'admin',
			roles: ['admin'],
			objectId: data.id,
			tenantId: currentUser.tenantId
		});

		await admin.save();

		return admin.toJSON(); //will return code 201
	}

	@Authorized('admin')
	@Post("/:id/member")
	@HttpCode(201)
	async addMember(@Param("id") id: string, @Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {

		// const count = await User.countDocuments({ email: data.email });
		// mongoose.Types.ObjectId(id)
		// , siteGroups: { $in: [mongoose.Types.ObjectId(id)] } 
		const existingUser = await User.findOne({ email: data.email, tenantId: currentUser.tenantId }).populate({ path: 'siteGroups' });
		const sGroup = existingUser ? existingUser.siteGroups.filter((item: any = {}) => item._id.toString() === mongoose.Types.ObjectId(id).toString()) : null
		// console.log(await res)ß
		if (existingUser && sGroup.length > 0) return new ConflictError(`User already exist.`);

		console.log("res", existingUser)
		console.log("sGroup", sGroup)

		const code = randomize('0', 6);
		// console.log(code)
		let member
		let messageBody
		// res.siteGroups.includes(mongoose.Types.ObjectId(id))
		if (existingUser && sGroup.length == 0) {
			// console.log('update')
			messageBody = `
			<p> Hello ${existingUser.firstName}, </p> <br />
			<p>You have been invited to join Group </p>
	
			Regards, <br /> <br />
			Javat365 Team
			`
			sendEmail(existingUser.email, 'Javat365 group notification', messageBody);

			member = await User.findOneAndUpdate({ _id: existingUser.id }, {
				siteGroups: [mongoose.Types.ObjectId(id), ...existingUser.siteGroups]
			})
			return member.toJSON();
		}

		console.log('create')
		const newMember = {
			active: false,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			status: data.status,
			userGroup: 'member',
			roles: ['member'],
			code,
			tenantId: currentUser.tenantId,
			//objectId: currentUser.objectId,
			siteGroups: [
				id,
				...(existingUser ? existingUser.siteGroups : [])
			]
		}

		newMember.siteGroups = [id]
		member = new User(newMember);

		messageBody = `
    <p> Hello ${data.firstNAme}, </p> <br /> <br />
    <p>You have been invited to join Javat365 and your 6 digit code is <b>${code}</b>.</p>

    Regards, <br /> <br />
    Javat365 Team
    `
		sendEmail(data.email, 'Javat365 verification', messageBody);

		await member.save();


		return member.toJSON(); //will return code 201
	}

	@Authorized('admin')
	@Get("/:id/members")
	@HttpCode(200)
	async members(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {
		// const siteGroups = await SiteGroup.getAllPopulatedRows({ })
		// const users = User.getAllPopulatedRows({ siteGroups: { $in: id } });
		// const users = User.find({ userGroup: "member", siteGroup: { $in: [id] } });
		const users = User.getAllPopulatedRows({ userGroup: "member", siteGroups: { $in: id } });
		const results = await Promise.all((await users).map(async g => {
			return {
				...g.toJSON(),
			}
		}));
		return results
	}

	@Authorized('admin')
	@Post("/import")
	@HttpCode(201)
	async import(@UploadedFile("file") file: any, @Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {

		console.log(data)
		try {
			const filePath = csvUpload(file)
			// console.log(filePath)

			// console.log(file, data)
			// const { fieldname, originalname, encoding, buffer } = file
			let importedUsers = []
			let users: any
			// var parser = parse({ columns: true }, function (err, records) {
			// 	if (err) console.log(err.message)
			// 	console.log(records);
			// });

			// const bufferToStream = (myBuffer) => {
			// 	let tmp = new Duplex();
			// 	tmp.push(myBuffer);
			// 	tmp.push(null);
			// 	return tmp;
			// }
			// const myBuffer = bufferToStream(buffer)
			// console.log(myBuffer)

			// fs.createReadStream(buffer)
			// 	.pipe(csv())
			// 	.on('data', (row) => {
			// 		// console.log(row);
			// 		importedUsers.push(row)
			// 	})
			// 	.on('end', () => {
			// 		console.log('CSV file successfully processed');
			// 	});

			// const createStr = fs.createReadStream(path.join(filePath) , { encoding: 'utf-8' }).pipe(parser);

			// let geFile = await fs.readFile(path.join(__dirname, `..${filePath}`)
			// users = await neatCsv(geFile)
			// console.log(users)

			fs.readFile(path.join(__dirname, `..${filePath}`),
				async (err, res) => {
					if (err) {
						console.error(err)
						return
					}
					// console.log(await neatCsv(res))
					importedUsers = await neatCsv(res)
					importedUsers = importedUsers.map(user => ({
						...user, siteGroups: [data.id], userGroup: 'member',
						roles: ['member'],
						tenantId: currentUser.tenantId
					}))
					// console.log(importedUsers)
					users = await User.insertMany(importedUsers)
					return users
				})

			// console.log(await importedUsers)


			// console.log(users)

			// 	console.log(importedUsers)

			// console.log(data, file)
			// return data
			// const count = await User.find({ email: data.email });
			// // const filered  = count.filter(item =>  item.email )
			// if (count.length > 0) throw new ConflictError(`User already exist.`);

			// let admin = new User({
			// 	active: true,
			// 	email: data.email,
			// 	status: data.status,
			// 	userGroup: 'admin',
			// 	roles: ['admin']
			// });

			// await admin.save();

			// return admin.toJSON(); //will return code 201
			return true
		} catch (error) {
			return error.message
		}
	}

	@Authorized(['admin', 'user'])
	@Put("/:id/member")
	@OnUndefined(200)
	async updateMemberById(@Param("id") id: string, @Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {
		if (id == 'me') id = currentUser._id.toHexString()

		let user = await User.findOne({ _id: id })
		if (!user) throw new NotFoundError('Track not found.');

		console.log(data)
		if (data.active === undefined) {
			return user = await User.findOneAndUpdate({ _id: id }, { $set: { ...data } }, { runValidators: true, new: true });
		}
		console.log('reached here')
		user.active = data.active
		// console.log(user, data)

		user = await User.findOneAndUpdate({ _id: id }, { $set: { ...user } }, { runValidators: true, new: true });
		if (!user) throw new NotFoundError("User not found!");

		return user.toJSON();
	}


	@Authorized(['admin', 'user'])
	@Put("/:id")
	@OnUndefined(200)
	async updateById(@Param("id") id: string, @Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {
		if (id == 'me') id = currentUser._id.toHexString()

		let user = await User.findOne({ _id: id })
		if (!user) throw new NotFoundError('Track not found.');
		user = await User.findOneAndUpdate({ _id: id }, { $set: { ...data } }, { runValidators: true, new: true });
		if (!user) throw new NotFoundError("User not found!");

		return user.toJSON();
	}


	@Authorized(['admin', 'user'])
	@Post("/members")
	@OnUndefined(200)
	async bulkUpdateById(@Body() data: any, @CurrentUser({ required: true }) currentUser?: IUser) {

		console.log(data)
		// const serializedData = data
		const ids = data.ids
		const status = data.active

		// data = data.map(({ key: id, ...rest }) => ({ id, ...rest }));


		// const bulk = User.collection.initializeOrderedBulkOp()

		// const fetchAll = await bulk.find({ _id: { $in: ids } }).update({ $set: { ...data } })

		const updateAll = await User.updateMany({ _id: ids }, { $set: { active: status } })
		// let updateAll = []

		// const updateAll = User.updateMany({ _id: { $in: ids } }, { $set: { active: status } })
		// let results = await User.getAllPopulatedRows({ _id: { $in: ids.map(id => mongoose.Types.ObjectId(id)) } });

		// let res = results.map(function (p) {
		// 	return p.toJSON()
		// });

		// return res;

		console.log(updateAll)
		return updateAll
	}

	@Authorized(['admin', 'user'])
	@Delete("/:id")
	@OnUndefined(200)
	async deleteById(@Param("id") id: string, @CurrentUser({ required: true }) currentUser?: IUser) {

		console.log(id);
		const user = await User.findByIdAndRemove({ _id: id })

		return user;

	}

	@Authorized(['member'])
	@Post("/me/siteGroups/:id/subscribe")
	@OnUndefined(204)
	async subscribe(@Param("id") groupObjectId: string, @CurrentUser({ required: true }) currentUser?: IUser) {
		await GraphUtil.addUserToGroup(currentUser.objectId, groupObjectId)
	}

	@Authorized(['member'])
	@Post("/me/siteGroups/:id/unsubscribe")
	@OnUndefined(204)
	async unsubscribe(@Param("id") groupObjectId: string, @CurrentUser({ required: true }) currentUser?: IUser) {
		await GraphUtil.removeUserFromGroup(currentUser.objectId, groupObjectId)
	}

	@Authorized(['member'])
	@Get("/me/siteGroups")
	async groups(@CurrentUser({ required: true }) currentUser?: IUser) {
		const siteGroups = await SiteGroup.getAllPopulatedRows({ _id: { $in: currentUser.siteGroups }, tenantId: currentUser.tenantId });

		let results = siteGroups.map(function (p) {
			return p.toJSON()
		});

		return {
			results: results
		}
	}

	@Authorized(['member'])
	@Get("/me/feedItems")
	async all(@CurrentUser({ required: true }) currentUser?: IUser) {
		const feedItems = await FeedItem.getAllPopulatedRows({ siteGroup: { $in: currentUser.siteGroups } });

		let results = feedItems.map(function (p) {
			return p.toJSON()
		});

		return {
			results: results
		}

	}

	@Authorized(['member', 'admin'])
	@Put("/:id/devices")
	@OnUndefined(204)
	async updateDeviceId(@Param("id") id: string, @BodyParam("fcmToken") fcmToken: string,
		@BodyParam("type") type: string, @CurrentUser({ required: true }) user: IUser) {

		if (id == 'me') id = user._id.toHexString()

		await User.updateOne({ _id: id }, { $addToSet: { devices: [{ fcmToken, type }] } });

		await Firebase.subscribeToTopic("content", fcmToken)

	}


}