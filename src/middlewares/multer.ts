import * as multer from 'multer'

// to keep code clean better to extract this function into separate file
export const fileUploadOptionsArticle = () => ({
  storage: multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      console.log(file)
    },
    filename: (req: any, file: any, cb: any) => {
    }
  }),
  fileFilter: (req: any, file: any, cb: any) => {
  },
  limits: {
    fieldNameSize: 255,
    fileSize: 1024 * 1024 * 2
  }
});