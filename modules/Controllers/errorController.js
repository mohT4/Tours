const AppError = require('../../utils/appError');

const handleDuplicateErrorDb = (err) => {
  const value = `/${err.keyValue.name}/`; //err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  console.log(value);

  const message = `duplicate field value : ${value}. please user another value`;

  return new AppError(message, 400);
};

const handleCastErrorDb = (err) => {
  console.log(err.kind);
  const message = `invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleValidationErrorDb = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTErrorDb = () =>
  new AppError('invalid token. please log in again! ', 401);

const handleTokenExpiredErrorDb = () =>
  new AppError('your token expired. please log in again!', 401);

// DEV AND PROD ERRORS
const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrProd = (err, res) => {
  //operational, trusted Error : send message to client

  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    console.error(err.message);

    //  programming or other unknown error : don't send message to client
  } else {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (err.kind === 'ObjectId') error = handleCastErrorDb(error);
    if (err.code === 11000) error = handleDuplicateErrorDb(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDb(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTErrorDb();
    if (err.name === 'TokenExpiredError') error = handleTokenExpiredErrorDb();
    sendErrProd(error, res);
  }
};
