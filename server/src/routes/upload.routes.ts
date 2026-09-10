import { Router } from 'express';
import { uploadController } from '#controllers';
import { uploadImage } from '#middleware';

export const uploadRouter = Router();

uploadRouter.post('/', uploadImage, uploadController.postUpload);
