import * as path from 'path'
import * as fs from 'fs'

export const fileUpload = (photo: any[], request: any) => {
  const photos = photo[0]
  if (photo.length < 1) return null
    const { name: fileName, size, type, thumbUrl: image } = photos
  var data = image.replace(/^data:image\/\w+;base64,/, '');

  fs.writeFile(path.join(__dirname, '../uploads', fileName), data, { encoding: 'base64' }, (err) => {
    if (err) {
      console.log('error: ', err)
      throw err
    }
    else {
      console.log('upload success')
    }
  });
  const newPhoto: string = `${request.protocol}://${request.get('host')}/uploads/${fileName}`
  return newPhoto;
}

export const csvUpload = (file: any) => {
  // const csv = file
  console.log(file)
  const { fieldname, originalname, encoding, buffer } = file
  // const { name: fileName, size, type, buffer: csv } = photos
  // var data = .replace(/^data:image\/\w+;base64,/, '');

  fs.writeFile(path.join(__dirname, '../uploads', originalname), buffer, { encoding: 'base64' }, (err) => {
    if (err) {
      console.log('error: ', err)
      throw err
    }
    else {
      console.log('upload success')
    }
  });
  const newfile: string = `/uploads/${originalname}`
  // const newPhoto: string = `${request.protocol}://${request.get('host')}/uploads/${fileName}`
  return newfile;
}