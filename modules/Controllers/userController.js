const AppError = require('../../utils/appError');
const User = require('./../models/userModel.js');
const catchAsync = require('./../../utils/catchAsync.js');

const filterObj = (body, ...allowedFields) => {
  const newObj = {};
  Object.keys(body).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = body[el];
    }
  });

  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    users: users,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not available yet',
  });
};

exports.getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    status: 'success',
    user: user,
  });
});

exports.updateMe = catchAsync(async (req, res) => {
  // 1) check if there are passwords POSTs
  if (req.body.password || req.body.passwordConfirmation)
    return next(new AppError('this route is not for updating password', 400));

  //2) update user documents
  const filterBody = filterObj(req.body, 'name', 'email');
  console.log(req.user);
  const user = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    message: 'you have successfully updated your data ',
    user,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
});

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not available yet',
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not available yet',
  });
};
