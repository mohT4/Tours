const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');

const globalErrorHandler = require(`${__dirname}/modules/Controllers/errorController.js`);
const tourRouter = require(`${__dirname}/modules/Routers/tourRouter.js`);
const UserRouter = require(`${__dirname}/modules/Routers/userRouter.js`);
const reviewsRouter = require(`${__dirname}/modules/Routers/reviewsRouter.js`);
const app = express();

//GLOBAL MIDLEWARES
//set security HTTP headers
app.use(helmet());

//Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
console.log(process.env.NODE_ENV);

//limit requests from same api
const appLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'too many requests from this ip, please try again in an hour.',
});
app.use('/api', appLimiter);

//body parser, reding data from body
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

//data sanitization against NoSql query injection
app.use(mongoSanitize());
//data sanitization against xss attacks
app.use(xssClean());

app.use(hpp());

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', UserRouter);
app.use('/api/v1/reviews', reviewsRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(`can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
