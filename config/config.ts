let convict = require('convict');
let path = require('path');

// Define a schema
var config = convict({
	env: {
		doc: "The application environment.",
		format: ["local", "development", "production"],
		default: "development",
		env: "NODE_ENV"
	},
	mail: {
		user: "mfatiu09@gmail.com",
		password: "bolakale"
	},
	server: {
		ip: {
			doc: "The IP address to bind.",
			format: String,
			default: "127.0.0.1",
			env: "IP_ADDRESS"
		},
		port: {
			doc: "The port to bind.",
			format: "port",
			default: 3001,
			env: "PORT",
			arg: "port"
		}
	},
	auth: {
		jsonWebTokenSecret: {
			format: String,
			default: ""
		}
	},
	db: {
		mongo: {
			uri: {
				format: String,
				default: "mongodb://tsapp:xchp9@localhost:27017/javat365"
			},
			dbName: {
				format: String,
				default: "javat365"
			}
		},
	},
	app: {
		clientId: {
			doc: "App client Id.",
			format: String,
			default: "",
		},
		clientSecret: {
			doc: "App client secret.",
			format: String,
			default: "",
		}
	},
	firebase: {
		type: {
			format: String,
			default: ""
		},
		project_id: {
			format: String,
			default: ""
		},
		private_key_id: {
			format: String,
			default: ""
		},
		private_key: {
			format: String,
			default: ""
		},
		client_email: {
			format: String,
			default: ""
		},
		client_id: {
			format: String,
			default: ""
		},
		auth_uri: {
			format: String,
			default: ""
		},
		token_uri: {
			format: String,
			default: ""
		},
		auth_provider_x509_cert_url: {
			format: String,
			default: ""
		},
		client_x509_cert_url: {
			format: String,
			default: ""
		}
	}
});

// Load environment dependent configuration
var env = config.get('env');

console.log('enviroment is ' + env)
config.loadFile(`${__dirname}/${env}.json`);

// Perform validation
config.validate({ allowed: 'strict' });

export default config;