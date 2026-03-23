const express = require('express');
const videoController = require('./video.controller');
const { authenticate, authorize } = require('../../common/auth.middleware');

// ─── Admin Video Routes (/api/v1/admin/videos) ───────────
const adminRouter = express.Router();
adminRouter.use(authenticate, authorize('admin', 'superadmin'));

adminRouter.post('/', videoController.createVideo);
adminRouter.get('/', videoController.getVideos);
adminRouter.get('/:id', videoController.getVideo);
adminRouter.put('/:id', videoController.updateVideo);
adminRouter.delete('/:id', videoController.deleteVideo);

// ─── Admin Video Series Routes (/api/v1/admin/video-series)
const adminSeriesRouter = express.Router();
adminSeriesRouter.use(authenticate, authorize('admin', 'superadmin'));

adminSeriesRouter.post('/', videoController.createSeries);
adminSeriesRouter.get('/', videoController.getSeriesList);
adminSeriesRouter.put('/:id', videoController.updateSeries);

// ─── Reader Video Routes (/api/v1/reader/videos) ─────────
const readerRouter = express.Router();
readerRouter.get('/', videoController.getVideos);
readerRouter.get('/:id', videoController.getVideo);

module.exports = { adminRouter, adminSeriesRouter, readerRouter };
