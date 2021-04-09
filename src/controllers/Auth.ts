import { JsonController, Body, Post, OnUndefined, BodyParam, HttpCode } from "routing-controllers";
import config from '../../config/config';

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import User from '../models/User';
import { UnauthorizedError } from '../utils/Errors';
import GraphUtil from '../utils/Graph';

@JsonController("/auth")
export default class AuthController {

	@Post("/token/login")
	@OnUndefined(200)
	async verifyLogin(@BodyParam('msalToken') msalToken: string) {
		if (!msalToken || msalToken == "") throw new UnauthorizedError(`Token is required`);
		
		GraphUtil.init(msalToken)
		const userObj = await GraphUtil.fetchCurrentUser()
		if (!userObj) throw new UnauthorizedError(`User not found`);

		const roles = await GraphUtil.fetchUserRoles()
		const data = { ...userObj, roles: roles, userGroup: "member" }

		let user = await User.findOne({email: data.email })
		if (!user) {
			// user = new User(data)
			// user = await user.save()
		}
		else {
			user = await User.findOneAndUpdate({ _id: user._id }, data, { runValidators: true, new: true });
		}

		const jsonWebToken = jwt.sign({ userGroup: user.userGroup, userId: user._id, tempToken: false }, config.get('auth').jsonWebTokenSecret);

		return {
			user: user.toJSON(),
			token: jsonWebToken
		};

	}

	@Post("/signin")
	@OnUndefined(UnauthorizedError)
	async login(@Body() data: any) {
		// Users can't login if they have been deleted.
		let query = {
			active: { $ne: false },
		}

		if (data.email) {
			query['email'] = {
				$regex: `^${data.email.replace('+', '\\+')}$`,
				$options: 'i'
			}
		}

		const user = await User.findOne(query);

		// If the user does not exist, return '404 Not Found'. 
		if (!user) throw new UnauthorizedError(`User not found`);

		if (!user.password) throw new UnauthorizedError(`User does not have a password.`);

		// Verify password.
		const result = await bcrypt.compare(data.password, user.password);

		if (!result) throw new UnauthorizedError(`Invalid password`);
		
		// const jwtOption = {
		// 	expiresIn: '1h',
		// }
		// Create a JSON Web Token for continued authentication.
		const jsonWebToken = jwt.sign({ userGroup: 'user', userId: user._id }, config.get('auth').jsonWebTokenSecret);
		return {
			...user.toJSON(),
			token: jsonWebToken
		}
	}

	@Post("/logins")
	@OnUndefined(UnauthorizedError)
	async logins(@Body() data: any) {
		// Users can't login if they have been deleted.
		let query = {
			active: { $ne: false },
		}

		if (data.email) {
			query['email'] = {
				$regex: `^${data.email.replace('+', '\\+')}$`,
				$options: 'i'
			}
		}

		const user = await User.findOne(query);

		// If the user does not exist, return '404 Not Found'. 
		if (!user) throw new UnauthorizedError(`User not found`);

		if (!user.password) throw new UnauthorizedError(`User does not have a password.`);

		// Verify password.
		const result = await bcrypt.compare(data.password, user.password);

		if (!result) throw new UnauthorizedError(`Invalid password`);
		
		// const jwtOption = {
		// 	expiresIn: '1h',
		// }
		// Create a JSON Web Token for continued authentication.
		const jsonWebToken = jwt.sign({ userGroup: 'user', userId: user._id }, config.get('auth').jsonWebTokenSecret);
		return {
			...user.toJSON(),
			token: jsonWebToken
		}
	}



}