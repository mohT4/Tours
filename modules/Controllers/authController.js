const crypto = require('crypto');
const User = require('./../models/userModel.js');
const catchAsync = require('./../../utils/catchAsync.js');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/appError.js');
const { promisify } = require('util');
const sendMail = require('../../utils/email.js');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV == 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.singUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation,
    role: req.body.role,
  });

  createToken(newUser, 200, res);
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1)  check if email and password exists

  if (!email || !password) {
    return next(new AppError('please enter email and password', 400));
  }

  //2) check if user exist and password and email are correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('invalid password or email', 404));
  }

  //3) if everythis is ok send data and token to client
  createToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) check check token and check if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    console.error(req.headers);
    return next(
      new AppError(
        'you are not logged in! Please login first to get access',
        401
      )
    );
  }

  //2) verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3) check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) return next(new AppError('user does not exist anymore', 401));

  //4) if user changed password after jwt was issued
  const changedPassword = freshUser.changedPasswordAfter(decoded.iat);

  if (changedPassword) {
    return next(new AppError('the user currently changed password', 401));
  }

  req.user = freshUser;
  //console.log(req.user);
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  //1) check if the user exist
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('Please enter your email address', 401));
  }

  //2) generate the reset password token
  const resetToken = user.createPasswordResetToken();
  user.save({ validateBeforeSave: false });

  //3) send it to user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/resetPassword/${resetToken}`;
  const message = `We wanted to let you know that you can change your password at any time to keep your account secure. To reset your password, please click on the following link:
  ${resetURL}`;
  try {
    await sendMail({
      email: user.email,
      subject: 'your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email successfully!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    console.log(error);
    return next(
      new AppError(
        'there was a problem sending the email. try again later',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) check if token has expired
  if (!user) {
    return next(
      new AppError('Token is invalid or has expired. Please try again!', 400)
    );
  }
  //3) updade password
  user.password = req.body.password;
  user.passwordConfirmation = req.body.passwordConfirmation;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2) check if current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('invalid password', 401));
  }
  //3) id so update password
  user.password = req.body.password;
  user.passwordConfirmation = req.body.passwordConfirmation;
  await user.save();

  //4)log in, send jwt
  createToken(user, 200, res);
});
