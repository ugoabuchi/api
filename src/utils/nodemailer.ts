import * as nodemailer from 'nodemailer';
import config from '../../config/config';

let transporter = nodemailer.createTransport({
  // host: "smtp.ethereal.email",
  host: "smtp.gmail.com",
  service: 'gmail',
  // port: 587,
  secure: false,
  // true for 465, false for other ports
  auth: {
    user: config.get('mail').user, // generated ethereal user
    pass: config.get('mail').password, // generated ethereal password
  },
});

export const sendEmail = (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: 'mfatiu09@gmail.com',
    to,
    subject,
    html,
  }

  const send = transporter.sendMail(mailOptions).then(res => console.log(res)).catch(err => console.log(err.message))
  // transporter.close()
  return send
}