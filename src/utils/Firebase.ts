
import * as firebaseAdmin from 'firebase-admin'
import config from '../../config/config';


export default class Firebase {

    static init() {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(config.get('firebase')),
        })
    }

    static async sendToDevice(token: string, message: any, options?: any): Promise<any> {
        let p = new Promise<any>(function (resolve, reject) {
            firebaseAdmin.messaging().sendToDevice(token, message, options)
                .then(response => {
                    resolve(response);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return p
    }

    static async pushToToken(message: any, dryRun?: boolean): Promise<any> {
        let p = new Promise<any>(function (resolve, reject) {
            firebaseAdmin.messaging().send(message, dryRun)
                .then(response => {
                    resolve(response);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return p
    }

    static async pushToTopic(topic: string, message: any): Promise<any> {
        let p = new Promise<any>(function (resolve, reject) {
            firebaseAdmin.messaging().sendToTopic(topic, message)
                .then(response => {
                    resolve(response);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return p
    }


    static async subscribeToTopic(topic: any, token: string): Promise<any> {
        let p = new Promise<any>(function (resolve, reject) {
            firebaseAdmin.messaging().subscribeToTopic(token, topic)
                .then(response => {
                    resolve(response);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return p
    }

    static async unSubscribeToTopic(topic: any, token: string): Promise<any> {
        let p = new Promise<any>(function (resolve, reject) {
            firebaseAdmin.messaging().unsubscribeFromTopic([token], topic)
                .then(response => {
                    resolve(response);
                })
                .catch(error => {
                    reject(error);
                });
        });
        return p
    }
}
