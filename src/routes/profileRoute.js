import express from 'express';
import {
  createProfile,
  getProfile,
  getProfiles,
  searchProfiles,
  deleteProfile,
} from '../controller/profileController.js';

const router = express.Router();

router.post('/profiles', createProfile);
router.get('/profiles', getProfiles);
router.get('/profiles/search', searchProfiles);
router.get('/profiles/:id', getProfile);
router.delete('/profiles/:id', deleteProfile);

export default router;