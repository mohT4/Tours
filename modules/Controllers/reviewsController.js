const Reviews = require('../models/reviewsModel');
const catchAsync = require('../../utils/catchAsync');

exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.tourID) filter = { tour: req.params.tourID };

  const reviews = await Reviews.find(filter);
  res.status(200).json({
    status: 'success',
    review: reviews,
  });
  next();
});

exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourID;
  if (!req.body.user) req.body.user = req.user.id;

  const review = await Reviews.create(req.body);
  res.status(200).json({
    status: 'success',
    results: review.length,
    review: review,
  });
});
