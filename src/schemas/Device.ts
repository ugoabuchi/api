import { Schema, model, Document, Types } from 'mongoose';

export enum DeviceType {
    iOS = 'ios',
    Android = 'android'
};

export let DeviceSchema = new Schema({
    fcmToken: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [DeviceType.Android, DeviceType.iOS],
        required: true
    }
}, { _id: false });
