import config from '../../config/config'
import { Client } from "@microsoft/microsoft-graph-client";

export default class AuthUtil {
    public static init() {
    }

    public static getGraphAuthClient(accessToken: string): any {
        // Initialize Graph client
        const client = Client.init({
            // Use the provided access token to authenticate
            // requests
            authProvider: (done) => {
                done(null, accessToken);
            }
        });

        return client;
    }

}
